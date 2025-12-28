import { FastifyInstance } from 'fastify';
import db from '../db.js';
import { v4 as uuidv4 } from 'uuid';

export default async function (fastify: FastifyInstance) {
  // List notes for a workspace
  fastify.get('/', async (request, reply) => {
    const { workspaceId } = request.query as { workspaceId: string };
    if (!workspaceId) {
      return reply.status(400).send({ error: 'workspaceId is required' });
    }

    try {
      const notes = db.prepare(`
        SELECT id, title, updated_at 
        FROM notes 
        WHERE workspace_id = ? 
        ORDER BY updated_at DESC
      `).all(workspaceId);
      return notes;
    } catch (e) {
      console.error('DB Error listing notes:', e);
      return reply.status(500).send({ error: 'Failed to list notes' });
    }
  });

  // Get a single note
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const note = db.prepare('SELECT * FROM notes WHERE id = ?').get(id);
      if (!note) return reply.status(404).send({ error: 'Note not found' });
      return note;
    } catch (e) {
      return reply.status(500).send({ error: 'Failed to fetch note' });
    }
  });

  // Create a new note
  fastify.post('/', async (request, reply) => {
    const { workspaceId, title, content } = request.body as { workspaceId: string, title: string, content: string };
    if (!workspaceId) return reply.status(400).send({ error: 'workspaceId is required' });

    const id = uuidv4();
    const now = Date.now();

    try {
      db.prepare(`
        INSERT INTO notes (id, workspace_id, title, content, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(id, workspaceId, title || 'Untitled Note', content || '', now, now);
      
      return { id, title, updated_at: now };
    } catch (e) {
      console.error('DB Error creating note:', e);
      return reply.status(500).send({ error: 'Failed to create note' });
    }
  });

  // Update a note
  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { title, content } = request.body as { title: string, content: string };
    const now = Date.now();

    try {
      const result = db.prepare(`
        UPDATE notes 
        SET title = ?, content = ?, updated_at = ?
        WHERE id = ?
      `).run(title, content, now, id);

      if (result.changes === 0) return reply.status(404).send({ error: 'Note not found' });
      return { success: true, updated_at: now };
    } catch (e) {
      return reply.status(500).send({ error: 'Failed to update note' });
    }
  });

  // Delete a note
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      db.prepare('DELETE FROM notes WHERE id = ?').run(id);
      return { success: true };
    } catch (e) {
      return reply.status(500).send({ error: 'Failed to delete note' });
    }
  });
}