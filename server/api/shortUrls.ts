import { FastifyInstance } from 'fastify';
import db from '../db.js';

export default async function (fastify: FastifyInstance) {
  // Public Redirect Route
  fastify.get('/u/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    try {
      const url = db.prepare('SELECT * FROM short_urls WHERE id = ? AND enabled = 1').get(id) as any;
      
      if (!url) {
        return reply.redirect('/notfound');
      }

      // Increment hit count
      db.prepare('UPDATE short_urls SET hit_count = hit_count + 1 WHERE id = ?').run(id);

      const target = url.target;
      
      // If it's an internal path (doesn't start with http/https), we might need to handle the origin
      // but reply.redirect(target) usually handles relative paths fine if the client is on the same host.
      return reply.redirect(target);
    } catch (e) {
      console.error('Redirect error:', e);
      return reply.redirect('/notfound');
    }
  });

  // Management APIs
  fastify.get('/api/short-urls', async (request, reply) => {
    try {
      const urls = db.prepare('SELECT * FROM short_urls ORDER BY updated_at DESC').all();
      return urls;
    } catch (e) {
      return reply.status(500).send({ error: 'Failed to list short URLs' });
    }
  });

  fastify.post('/api/short-urls', async (request, reply) => {
    const { id, target, enabled = true } = request.body as { id: string, target: string, enabled: boolean };
    
    if (!id || !target) {
      return reply.status(400).send({ error: 'ID and target are required' });
    }

    if (!/^[a-zA-Z0-9-_]+$/.test(id)) {
      return reply.status(400).send({ error: 'Invalid ID format' });
    }

    const now = Date.now();
    try {
      db.prepare(`
        INSERT INTO short_urls (id, target, enabled, hit_count, created_at, updated_at)
        VALUES (?, ?, ?, 0, ?, ?)
      `).run(id, target, enabled ? 1 : 0, now, now);
      
      return { id, target, enabled, hit_count: 0, created_at: now, updated_at: now };
    } catch (e: any) {
      if (e.message.includes('UNIQUE constraint failed')) {
        return reply.status(400).send({ error: 'Short URL ID already exists' });
      }
      return reply.status(500).send({ error: 'Failed to create short URL' });
    }
  });

  fastify.put('/api/short-urls/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { target, enabled } = request.body as { target?: string, enabled?: boolean };
    const now = Date.now();

    try {
      const existing = db.prepare('SELECT * FROM short_urls WHERE id = ?').get(id) as any;
      if (!existing) return reply.status(404).send({ error: 'Short URL not found' });

      const newTarget = target !== undefined ? target : existing.target;
      const newEnabled = enabled !== undefined ? (enabled ? 1 : 0) : existing.enabled;

      db.prepare(`
        UPDATE short_urls 
        SET target = ?, enabled = ?, updated_at = ?
        WHERE id = ?
      `).run(newTarget, newEnabled, now, id);

      return { success: true };
    } catch (e) {
      return reply.status(500).send({ error: 'Failed to update short URL' });
    }
  });

  fastify.delete('/api/short-urls/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      db.prepare('DELETE FROM short_urls WHERE id = ?').run(id);
      return { success: true };
    } catch (e) {
      return reply.status(500).send({ error: 'Failed to delete short URL' });
    }
  });
}