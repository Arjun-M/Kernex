import { FtpSrv } from 'ftp-srv';
import db, { getSetting } from './db.js';
import fs from 'fs/promises';
import path from 'path';
import bcrypt from 'bcryptjs';
import { logEmitter } from './logEmitter.js';
import { ftpLogger } from './ftpLogger.js';

const FTP_PORT = 2121;
const WORKSPACE_ROOT = path.join(process.cwd(), 'workspace');

export class FtpServerManager {
  private ftpServer: FtpSrv | null = null;
  private isRunning = false;

  constructor() {
    // Lazy initialization in start()
  }

  private initServer() {
    const externalIp = getSetting<string>('ftpExternalIp', '') || '127.0.0.1';

    this.ftpServer = new FtpSrv({
      url: `ftp://0.0.0.0:${FTP_PORT}`,
      pasv_min: 30000,
      pasv_max: 30100,
      pasv_url: externalIp,
      greeting: 'Welcome to Kernex FTP',
      anonymous: false, // Disable anonymous login
      log: ftpLogger // Use custom logger
    } as any);

    this.setupAuth();
  }

  private setupAuth() {
    if (!this.ftpServer) return;

    this.ftpServer.on('login', async ({ connection: _connection, username, password }, resolve, reject) => {
      try {
        const row = db.prepare('SELECT * FROM ftp_accounts WHERE username = ?').get(username) as any;

        if (!row) {
          return reject(new Error('Invalid username or password'));
        }

        const valid = await bcrypt.compare(password, row.password_hash);
        if (!valid) {
          return reject(new Error('Invalid username or password'));
        }

        // Determine user's root directory
        // Security: Ensure it's within WORKSPACE_ROOT
        let userRoot = path.join(WORKSPACE_ROOT, row.root_dir.replace(/^\//, ''));

        // Prevent traversal above WORKSPACE_ROOT
        if (!userRoot.startsWith(WORKSPACE_ROOT)) {
          userRoot = WORKSPACE_ROOT;
        }

        // Ensure directory exists
        await fs.mkdir(userRoot, { recursive: true });

        logEmitter.emit('log', `FTP Login: ${username}`);

        resolve({
          root: userRoot,
          cwd: '/', // Initial current working directory
          blacklist: ['node_modules', '.git'], // Prevent access to sensitive folders
        });

      } catch (err) {
        ftpLogger.error({ msg: 'FTP Auth Error', error: err });
        reject(err as Error);
      }
    });

    this.ftpServer.on('client-error', ({ connection: _connection, context: _context, error }) => {
      // Suppress annoying "Socket not writable" errors or handle gracefully
      if (error.message && error.message.includes('Socket not writable')) {
          return;
      }
      ftpLogger.error({ msg: 'FTP Client Error', error });
    });
  }

  public async start() {
    const enabled = getSetting<boolean>('ftpServerEnabled', false);
    
    if (!enabled) {
      if (this.isRunning) {
        await this.stop();
      }
      return;
    }

    if (this.isRunning) {
      return; // Already running
    }

    try {
      this.initServer();
      if (this.ftpServer) {
        await this.ftpServer.listen();
        this.isRunning = true;
        ftpLogger.info(`FTP Server running on ftp://0.0.0.0:${FTP_PORT}`);
      }
    } catch (err: any) {
      ftpLogger.error(`Failed to start FTP server: ${err.message}`);
      this.isRunning = false;
    }
  }

  public async stop() {
    if (this.ftpServer && this.isRunning) {
      try {
        await this.ftpServer.close();
        this.ftpServer = null;
        this.isRunning = false;
        ftpLogger.info('FTP Server stopped');
      } catch (err: any) {
        ftpLogger.error(`Error stopping FTP server: ${err.message}`);
      }
    }
  }

  public async restart() {
    await this.stop();
    await this.start();
  }

  public getStatus() {
    return {
      running: this.isRunning,
      port: FTP_PORT
    };
  }
}

export const ftpManager = new FtpServerManager();
