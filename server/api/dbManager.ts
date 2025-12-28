import { FastifyInstance } from 'fastify';
import db from '../db.js';
import path from 'path';
import fs from 'fs';

export default async function (fastify: FastifyInstance) {
  console.log('Registering DB Manager routes...');
  // Debug route
  fastify.get('/debug', async () => {
    return { message: 'DB Manager is active' };
  });

  // Database Info
  fastify.get('/info', async (request, reply) => {
    try {
      const dbPath = path.join(process.cwd(), 'data', 'system.db');
      const stats = fs.statSync(dbPath);
      const version = db.prepare('SELECT sqlite_version() as version').get() as { version: string };
      const tableCount = db.prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table'").get() as { count: number };
      
      return {
        type: 'SQLite',
        path: dbPath,
        size: stats.size,
        tables: tableCount.count,
        version: version.version
      };
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });

  // List Tables
  fastify.get('/tables', async (request, reply) => {
    try {
      const tables = db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).all() as { name: string }[];

      const tablesWithCount = tables.map(t => {
        const count = db.prepare(`SELECT count(*) as count FROM "${t.name}"`).get() as { count: number };
        return { name: t.name, rows: count.count };
      });

      return tablesWithCount;
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });

  // Table Schema
  fastify.get('/table/:name/schema', async (request, reply) => {
    const { name } = request.params as { name: string };
    try {
      const columns = db.prepare(`PRAGMA table_info("${name}")`).all();
      const indexes = db.prepare(`PRAGMA index_list("${name}")`).all();
      const foreignKeys = db.prepare(`PRAGMA foreign_key_list("${name}")`).all();

      return { columns, indexes, foreignKeys };
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });

  // Table Rows (Paginated)
  fastify.get('/table/:name/rows', async (request, reply) => {
    const { name } = request.params as { name: string };
    const { limit = 50, offset = 0, sort, order = 'ASC' } = request.query as any;
    
    try {
      let query = `SELECT * FROM "${name}"`;
      if (sort) {
        query += ` ORDER BY "${sort}" ${order}`;
      }
      query += ` LIMIT ? OFFSET ?`;
      
      const rows = db.prepare(query).all(limit, offset);
      return rows;
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });

  // Execute Raw Query
  fastify.post('/query', async (request, reply) => {
    const { sql, params = [] } = request.body as { sql: string, params?: any[] };
    
    if (!sql) return reply.status(400).send({ error: 'SQL is required' });

    // Security check: Block ATTACH
    if (sql.toUpperCase().includes('ATTACH')) {
      return reply.status(403).send({ error: 'ATTACH DATABASE is blocked' });
    }

    const start = Date.now();
    try {
      const isSelect = sql.trim().toUpperCase().startsWith('SELECT') || sql.trim().toUpperCase().startsWith('EXPLAIN') || sql.trim().toUpperCase().startsWith('PRAGMA');
      
      if (isSelect) {
        const rows = db.prepare(sql).all(...params);
        return {
          rows,
          executionTime: Date.now() - start,
          type: 'select'
        };
      } else {
        const result = db.prepare(sql).run(...params);
        return {
          changes: result.changes,
          lastInsertRowid: result.lastInsertRowid,
          executionTime: Date.now() - start,
          type: 'mutation'
        };
      }
    } catch (e: any) {
      return reply.status(500).send({ 
        error: e.message,
        executionTime: Date.now() - start
      });
    }
  });

  // Schema Management
  fastify.post('/table/drop', async (request, reply) => {
    const { name } = request.body as { name: string };
    try {
      db.prepare(`DROP TABLE "${name}"`).run();
      return { success: true };
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });
}
