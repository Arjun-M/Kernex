import type { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import getDb from '../utils/db.js';

export default async function (fastify: FastifyInstance) {
  
  const withDb = (handler: (db: any, request: any, reply: any) => Promise<any>) => 
    async (request: any, reply: any) => {
      const { workspaceId } = request.params as { workspaceId: string };
      if (!workspaceId) {
        return reply.code(400).send({ message: 'Workspace ID is required' });
      }
      const db = getDb(workspaceId);
      try {
        return await handler(db, request, reply);
      } finally {
        db.close();
      }
  };

  fastify.post('/:workspaceId/execute', withDb(async (db, request, reply) => {
    const { method, url, headers, body, saveHistory } = request.body as any;

    try {
      if (!url) {
        return reply.code(400).send({ message: 'URL is required' });
      }
      
      const fetchOptions: any = {
        method,
        headers: headers || {},
      };

      if (body && body.type !== 'none' && body.content) {
        if (body.type === 'json') {
          try {
             JSON.parse(body.content);
          } catch(e) {
             return reply.code(400).send({ message: 'Invalid JSON body' });
          }
          fetchOptions.headers['Content-Type'] = 'application/json';
          fetchOptions.body = body.content;
        } else if (body.type === 'form') {
           fetchOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
           fetchOptions.body = body.content;
        } else {
           fetchOptions.body = body.content;
        }
      }

      const startTime = Date.now();
      const response = await fetch(url, fetchOptions);
      const endTime = Date.now();
      const timeMs = endTime - startTime;
      const responseText = await response.text();
      
      let responseBody: any = responseText;
      try {
        responseBody = JSON.parse(responseText);
      } catch (e) {}

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });
      
      const result = {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseBody,
        timeMs,
        size: new Blob([responseText]).size 
      };

      if (saveHistory !== false) {
          const historyId = crypto.randomUUID();
          db.prepare(`
            INSERT INTO http_history (id, method, url, status, duration, timestamp, request_data)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `).run(
            historyId,
            method,
            url,
            response.status,
            timeMs,
            Date.now(),
            JSON.stringify({ headers, body })
          );
      }

      return result;

    } catch (error: any) {
      return reply.code(500).send({ message: error.message || 'Internal Server Error' });
    }
  }));

  fastify.get('/:workspaceId/collections', withDb(async (db) => {
    return db.prepare('SELECT * FROM http_collections ORDER BY name ASC').all();
  }));

  fastify.post('/:workspaceId/collections', withDb(async (db, request, reply) => {
    const { name, description } = request.body as any;
    if (!name) return reply.code(400).send({ message: 'Name is required' });
    
    const id = crypto.randomUUID();
    const now = Date.now();
    
    db.prepare(`
      INSERT INTO http_collections (id, name, description, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, name, description || '', now, now);

    return { id, name, description, created_at: now, updated_at: now };
  }));

  fastify.delete('/:workspaceId/collections/:id', withDb(async (db, request) => {
    const { id } = request.params as any;
    db.prepare('DELETE FROM http_collections WHERE id = ?').run(id);
    return { success: true };
  }));

  fastify.get('/:workspaceId/collections/:id/requests', withDb(async (db, request) => {
      const { id } = request.params as any;
      const requests = db.prepare('SELECT * FROM http_requests WHERE collection_id = ? ORDER BY name ASC').all(id);
      return requests.map((r: any) => ({
          ...r,
          headers: JSON.parse(r.headers || '{}'),
          params: JSON.parse(r.params || '[]'),
          body: JSON.parse(r.body || '{}'),
          auth: JSON.parse(r.auth || '{}')
      }));
  }));

  fastify.post('/:workspaceId/requests', withDb(async (db, request, reply) => {
      const { collection_id, name, method, url, headers, params, body, auth } = request.body as any;
      
      if (!collection_id || !name || !method || !url) {
          return reply.code(400).send({ message: 'Missing required fields' });
      }

      const id = crypto.randomUUID();
      const now = Date.now();

      db.prepare(`
        INSERT INTO http_requests (id, collection_id, name, method, url, headers, params, body, auth, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
          id, 
          collection_id, 
          name, 
          method, 
          url, 
          JSON.stringify(headers || {}), 
          JSON.stringify(params || []), 
          JSON.stringify(body || {}), 
          JSON.stringify(auth || {}), 
          now, 
          now
      );

      return { id };
  }));

  fastify.put('/:workspaceId/requests/:id', withDb(async (db, request) => {
      const { id } = request.params as any;
      const { name, method, url, headers, params, body, auth } = request.body as any;
      
      const now = Date.now();
      
      db.prepare(`
        UPDATE http_requests 
        SET name = ?, method = ?, url = ?, headers = ?, params = ?, body = ?, auth = ?, updated_at = ?
        WHERE id = ?
      `).run(
          name, 
          method, 
          url, 
          JSON.stringify(headers || {}), 
          JSON.stringify(params || []), 
          JSON.stringify(body || {}), 
          JSON.stringify(auth || {}), 
          now, 
          id
      );

      return { success: true };
  }));

  fastify.delete('/:workspaceId/requests/:id', withDb(async (db, request) => {
      const { id } = request.params as any;
      db.prepare('DELETE FROM http_requests WHERE id = ?').run(id);
      return { success: true };
  }));

  fastify.get('/:workspaceId/history', withDb(async (db, request) => {
      const { limit = 50 } = request.query as any;
      const history = db.prepare('SELECT * FROM http_history ORDER BY timestamp DESC LIMIT ?').all(limit);
      return history.map((h: any) => ({
          ...h,
          request_data: JSON.parse(h.request_data || '{}')
      }));
  }));

  fastify.delete('/:workspaceId/history', withDb(async (db) => {
      db.prepare('DELETE FROM http_history').run();
      return { success: true };
  }));

  fastify.get('/:workspaceId/environments', withDb(async (db) => {
      const envs = db.prepare('SELECT * FROM http_environments ORDER BY name ASC').all();
      return envs.map((e: any) => ({
          ...e,
          variables: JSON.parse(e.variables || '[]')
      }));
  }));

  fastify.post('/:workspaceId/environments', withDb(async (db, request, reply) => {
      const { name, variables } = request.body as any;
      if (!name) return reply.code(400).send({ message: 'Name is required' });

      const id = crypto.randomUUID();
      const now = Date.now();

      db.prepare(`
        INSERT INTO http_environments (id, name, variables, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
      `).run(id, name, JSON.stringify(variables || []), now, now);

      return { id };
  }));

  fastify.put('/:workspaceId/environments/:id', withDb(async (db, request) => {
      const { id } = request.params as any;
      const { name, variables } = request.body as any;
      const now = Date.now();

      db.prepare(`
        UPDATE http_environments
        SET name = ?, variables = ?, updated_at = ?
        WHERE id = ?
      `).run(name, JSON.stringify(variables || []), now, id);

      return { success: true };
  }));

  fastify.delete('/:workspaceId/environments/:id', withDb(async (db, request) => {
      const { id } = request.params as any;
      db.prepare('DELETE FROM http_environments WHERE id = ?').run(id);
      return { success: true };
  }));
}
