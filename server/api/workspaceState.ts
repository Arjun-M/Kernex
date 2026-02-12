import type { FastifyInstance } from 'fastify';
import getDb from '../utils/db.js';

export default async function (fastify: FastifyInstance) {
  // GET /api/workspace-state/:workspaceId
  // Returns all plugin states for a workspace
  fastify.get('/:workspaceId', async (request, reply) => {
    const { workspaceId } = request.params as any;
    
    try {
      const db = getDb(workspaceId);
      const rows = db.prepare('SELECT plugin_id, state FROM plugin_states').all();
      
      const states: Record<string, any> = {};
      for (const row of rows) {
          try {
            states[row.plugin_id] = JSON.parse(row.state);
          } catch {
            states[row.plugin_id] = null;
          }
      }
      db.close();
      return states;
    } catch (e: any) {
      return reply.code(500).send({ message: e.message });
    }
  });

  // GET /api/workspace-state/:workspaceId/:pluginId
  fastify.get('/:workspaceId/:pluginId', async (request, reply) => {
    const { workspaceId, pluginId } = request.params as any;

    try {
      const db = getDb(workspaceId);
      const row = db.prepare('SELECT state FROM plugin_states WHERE plugin_id = ?').get(pluginId) as any;
      db.close();

      if (row) {
        return JSON.parse(row.state);
      } else {
        return {};
      }
    } catch (e: any) {
      return reply.code(500).send({ message: e.message });
    }
  });

  // PUT /api/workspace-state/:workspaceId/:pluginId
  fastify.put('/:workspaceId/:pluginId', async (request, reply) => {
    const { workspaceId, pluginId } = request.params as any;
    const state = request.body;

    try {
      const db = getDb(workspaceId);
      const stmt = db.prepare('INSERT INTO plugin_states (plugin_id, state) VALUES (?, ?) ON CONFLICT(plugin_id) DO UPDATE SET state = excluded.state');
      stmt.run(pluginId, JSON.stringify(state));
      db.close();
      
      return { success: true };
    } catch (e: any) {
      return reply.code(500).send({ message: e.message });
    }
  });

  // DELETE /api/workspace-state/:workspaceId
  fastify.delete('/:workspaceId', async (request, reply) => {
    const { workspaceId } = request.params as any;
    try {
      const db = getDb(workspaceId);
      db.prepare('DELETE FROM plugin_states').run();
      db.close();
      return { success: true };
    } catch (e: any) {
      return reply.code(500).send({ message: e.message });
    }
  });
}
