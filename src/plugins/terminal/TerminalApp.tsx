import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import './TerminalApp.css';
import { getSessionToken } from '../authHelper';

const TerminalApp: React.FC = () => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!terminalRef.current) return;

    // Initialize xterm
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1a1a1a',
        foreground: '#f0f0f0',
      },
      allowProposedApi: true,
      convertEol: true, 
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    term.open(terminalRef.current);
    
    const resizeObserver = new ResizeObserver(() => {
      try {
        fitAddon.fit();
      } catch (e) {
        console.error('Fit error:', e);
      }
    });
    resizeObserver.observe(terminalRef.current);

    // Initialize WebSocket
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const token = getSessionToken();
    const wsUrl = `${protocol}//${window.location.host}/api/term/ws?token=${token}`;
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('Terminal WebSocket connected');
      setStatus('connected');
      socket.send(JSON.stringify({
        type: 'init',
        sessionId: localStorage.getItem('terminal_sessionId') || undefined
      }));
    };

    socket.onerror = (error) => {
      console.error('Terminal WebSocket error:', error);
      setStatus('disconnected');
    };

    socket.onmessage = (event) => {
      const payload = JSON.parse(event.data);
      if (payload.type === 'ready') {
        setSessionId(payload.sessionId);
        localStorage.setItem('terminal_sessionId', payload.sessionId);
        term.write('\x1b[1;32mTerminal connected\x1b[0m\r\n');
        setTimeout(() => fitAddon.fit(), 100);
      } else if (payload.type === 'output') {
        term.write(payload.data);
      } else if (payload.type === 'exit') {
        term.writeln(`\r\n\x1b[1;31mProcess exited with code ${payload.code}\x1b[0m`);
        setStatus('disconnected');
      }
    };

    socket.onclose = () => {
      setStatus('disconnected');
      term.writeln('\r\n\x1b[1;31mWebSocket disconnected\x1b[0m');
    };

    term.onData((data) => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: 'input',
          sessionId: localStorage.getItem('terminal_sessionId'),
          data
        }));
      }
    });

    return () => {
      resizeObserver.disconnect();
      term.dispose();
      socket.close();
    };
  }, []);

  return (
    <div className="terminal-container">
      <div ref={terminalRef} className="xterm-wrapper" />
      {status === 'disconnected' && (
        <div className="disconnected-overlay">
          <button onClick={() => window.location.reload()}>Reconnect</button>
        </div>
      )}
    </div>
  );
};

export default TerminalApp;