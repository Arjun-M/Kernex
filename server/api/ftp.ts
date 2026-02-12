import type { FastifyInstance } from 'fastify';
import db from '../db.js';
import bcrypt from 'bcryptjs';
import { ftpManager } from '../ftpServer.js';

export default async function (fastify: FastifyInstance) {
  // GET /api/ftp/status
  fastify.get('/status', async (_request, _reply) => {
    return ftpManager.getStatus();
  });

  // POST /api/ftp/restart
  fastify.post('/restart', async (_request, reply) => {
    try {
      await ftpManager.restart();
      return ftpManager.getStatus();
    } catch (e: any) {
      return reply.code(500).send({ message: e.message });
    }
  });

  // GET /api/ftp/accounts
  fastify.get('/accounts', async (_request, reply) => {
    try {
      const accounts = db.prepare('SELECT id, username, root_dir, readonly, created_at FROM ftp_accounts').all();
      return accounts;
    } catch (e: any) {
      return reply.code(500).send({ message: e.message });
    }
  });

  // POST /api/ftp/accounts
  fastify.post('/accounts', async (request, reply) => {
    const { username, password, root_dir = '/' } = request.body as any;

    if (!username || !password) {
      return reply.code(400).send({ message: 'Username and password required' });
    }

    // Validate root_dir format
    if (root_dir.includes('..')) {
        return reply.code(400).send({ message: 'Invalid root path' });
    }

    try {
      const hash = await bcrypt.hash(password, 10);
      const now = Date.now();
      
      const stmt = db.prepare('INSERT INTO ftp_accounts (username, password_hash, root_dir, created_at, updated_at) VALUES (?, ?, ?, ?, ?)');
      stmt.run(username, hash, root_dir, now, now);

      return { success: true };
    } catch (e: any) {
      if (e.message.includes('UNIQUE constraint failed')) {
          return reply.code(409).send({ message: 'Username already exists' });
      }
      return reply.code(500).send({ message: e.message });
    }
  });

  // DELETE /api/ftp/accounts/:id
  fastify.delete('/accounts/:id', async (request, reply) => {
    const { id } = request.params as any;
    try {
      db.prepare('DELETE FROM ftp_accounts WHERE id = ?').run(id);
      return { success: true };
    } catch (e: any) {
      return reply.code(500).send({ message: e.message });
    }
  });
}
