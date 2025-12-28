import { FastifyInstance } from 'fastify';
import db from '../db.js';

export default async function (fastify: FastifyInstance) {
  fastify.get('/', async (_request, reply) => {
    try {
      const rows = db.prepare('SELECT key FROM secrets').all() as { key: string }[];
      return rows.map(r => ({ key: r.key }));
    } catch (e) {
      console.error('DB Error fetching secrets:', e);
      return [];
    }
  });

  fastify.post('/', async (request, reply) => {
    try {
      const { key, value } = request.body as { key: string, value: string };
      db.prepare('INSERT OR REPLACE INTO secrets (key, value) VALUES (?, ?)').run(key, value);
      return { success: true };
    } catch (e) {
      console.error('DB Error saving secret:', e);
      reply.status(500).send({ error: 'Failed to save secret' });
    }
  });

  fastify.delete('/:key', async (request, reply) => {
    try {
      const { key } = request.params as { key: string };
      db.prepare('DELETE FROM secrets WHERE key = ?').run(key);
      return { success: true };
    } catch (e) {
      console.error('DB Error deleting secret:', e);
      reply.status(500).send({ error: 'Failed to delete secret' });
    }
  });
}
