import { FastifyInstance } from 'fastify';
import { spawn, ChildProcessWithoutNullStreams } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';

interface TerminalSession {
  process: ChildProcessWithoutNullStreams;
  sessionId: string;
}

const sessions = new Map<string, TerminalSession & { lastActivity: number, inputBuffer: string }>();

// Cleanup inactive sessions every minute
setInterval(() => {
  const now = Date.now();
  const timeout = 30 * 60 * 1000; // 30 minutes
  for (const [id, session] of sessions.entries()) {
    if (now - session.lastActivity > timeout) {
      console.log(`[Terminal] Cleaning up inactive session: ${id}`);
      session.process.kill();
      sessions.delete(id);
    }
  }
}, 60000);

export default async function (fastify: FastifyInstance) {
  fastify.get('/ws', { websocket: true }, (connection: any, req) => {
    const socket = connection.socket || connection; 
    
    // Auth Check for WebSocket - use req.query which is pre-parsed by Fastify
    const query = req.query as any;
    const token = query?.token;
    
    console.log(`[Terminal] WS Connection attempt. URL: ${req.url}, Token found: ${!!token}`);

    if (!token) {
      console.error('[Terminal] WS Auth Failed: No token in query');
      socket.close(1008, 'Unauthorized: Missing token');
      return;
    }

    try {
      const sessionRow = db.prepare('SELECT id FROM auth_session WHERE id = ?').get(token);
      if (!sessionRow) {
        console.error(`[Terminal] WS Auth Failed: Invalid token "${token.substring(0, 8)}..."`);
        socket.close(1008, 'Unauthorized: Invalid token');
        return;
      }
    } catch (err) {
      console.error('[Terminal] Database error during auth:', err);
      socket.close(1011, 'Internal Server Error');
      return;
    }

    console.log('[Terminal] WS Connection authenticated successfully');

    let sessionId: string | null = null;

    socket.on('message', (message: any) => {
      try {
        const payload = JSON.parse(message.toString());

        if (payload.type === 'init') {
          // Use the auth token as the base for the terminal session if no specific one provided
          sessionId = payload.sessionId || `term-${uuidv4().substring(0, 8)}`;
          
          if (sessions.has(sessionId)) {
            const existing = sessions.get(sessionId)!;
            existing.lastActivity = Date.now();
            
            socket.send(JSON.stringify({ type: 'ready', sessionId }));

            const onData = (data: Buffer) => {
              if (socket.readyState === 1) { 
                socket.send(JSON.stringify({
                  type: 'output',
                  sessionId,
                  data: data.toString()
                }));
              }
            };

            existing.process.stdout.on('data', onData);
            existing.process.stderr.on('data', onData);

            socket.on('close', () => {
              existing.process.stdout.off('data', onData);
              existing.process.stderr.off('data', onData);
            });
            return;
          }

          const shell = process.platform === 'win32' ? 'powershell.exe' : (process.env.SHELL || 'bash');
          const args = shell.includes('bash') || shell.includes('sh') ? ['-i'] : [];
          
          let terminal: ChildProcessWithoutNullStreams;
          try {
            terminal = spawn(shell, args, {
              env: { ...process.env, TERM: 'xterm-256color' },
              cwd: process.cwd(),
            });
          } catch (err: any) {
            socket.send(JSON.stringify({
              type: 'output',
              sessionId,
              data: `\r\n\x1b[31mFailed to spawn shell: ${err.message}\x1b[0m\r\n`
            }));
            return;
          }

          sessions.set(sessionId, {
            process: terminal,
            sessionId,
            lastActivity: Date.now(),
            inputBuffer: ''
          });

          socket.send(JSON.stringify({ type: 'ready', sessionId }));

          const sendOutput = (data: Buffer) => {
            if (socket.readyState === 1) {
              socket.send(JSON.stringify({
                type: 'output',
                sessionId,
                data: data.toString()
              }));
            }
          };

          terminal.stdout.on('data', sendOutput);
          terminal.stderr.on('data', sendOutput);

          terminal.on('exit', (code) => {
            if (socket.readyState === 1) {
              socket.send(JSON.stringify({ type: 'exit', sessionId, code }));
            }
            sessions.delete(sessionId!);
          });

        } else if (payload.type === 'input') {
          const session = sessions.get(payload.sessionId);
          if (session) {
            session.lastActivity = Date.now();
            const input = payload.data;

            session.process.stdin.write(input);

            if (input === '\x03') { session.process.kill('SIGINT'); }
            else if (input === '\x1a') { session.process.kill('SIGTSTP'); }
            else if (input === '\x1c') { session.process.kill('SIGQUIT'); }

            if (input === '\r' || input === '\n') {
              const cmd = session.inputBuffer.trim().toLowerCase();
              if (cmd === 'exit' || cmd === 'logout') {
                socket.close();
              }
              session.inputBuffer = '';
            } else if (input === '\u007f') {
              session.inputBuffer = session.inputBuffer.slice(0, -1);
            } else {
              session.inputBuffer += input;
            }
          }
        }
      } catch (e) {
        console.error('[Terminal] WS Message processing error:', e);
      }
    });

    socket.on('error', (err: any) => {
      console.error('[Terminal] Socket error:', err);
    });

    socket.on('close', () => {
      console.log('[Terminal] WS Connection closed');
    });
  });
}