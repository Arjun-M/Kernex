import type { FastifyInstance } from 'fastify';
import path from 'path';
import fs from 'fs';
import getDb from '../utils/db.js';
import db from '../db.js';

export default async function (fastify: FastifyInstance) {
  fastify.get('/dbs', async (_request, _reply) => {
    const workspaceDir = path.join(process.cwd(), 'workspace');
    
    let dbs: any[] = [];
    
    try {
      // Scan workspace directories
      const items = fs.readdirSync(workspaceDir, { withFileTypes: true });
      for (const item of items) {
        if (item.isDirectory()) {
            const dbPath = path.join(workspaceDir, item.name, 'workspace.db');
            if (fs.existsSync(dbPath)) {
                const stats = fs.statSync(dbPath);
                dbs.push({
                    name: `${item.name}.db`, // Expose as "workspaceId.db"
                    size: stats.size,
                    lastModified: stats.mtime
                });
            }
        }
      }

      // Add System DB
      const dbPath = path.join(process.cwd(), 'data', 'system.db');
      if (fs.existsSync(dbPath)) {
          const stats = fs.statSync(dbPath);
          dbs.push({
            name: 'system.db',
            size: stats.size,
            lastModified: stats.mtime,
          });
      }
    } catch (e) {
      fastify.log.error(e);
    }

    return dbs;
  });

  fastify.get('/:dbName/info', async (request, reply) => {
    const { dbName } = request.params as { dbName: string };
    let dbInstance: any;

    try {
      if (dbName === 'system.db') {
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
      } else {
        const workspaceId = dbName.replace('.db', '');
        dbInstance = getDb(workspaceId); // This now looks in workspace/ID/workspace.db
        const dbPath = path.join(process.cwd(), 'workspace', workspaceId, 'workspace.db');
        
        let stats;
        try {
            stats = fs.statSync(dbPath);
        } catch {
            stats = { size: 0 };
        }

        const version = dbInstance.prepare('SELECT sqlite_version() as version').get() as { version: string };
        const tableCount = dbInstance.prepare("SELECT count(*) as count FROM sqlite_master WHERE type='table'").get() as { count: number };
        
        return {
          type: 'SQLite',
          path: dbPath,
          size: stats.size,
          tables: tableCount.count,
          version: version.version
        };
      }
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    } finally {
      if (dbInstance) {
        dbInstance.close();
      }
    }
  });

  fastify.get('/:dbName/tables', async (request, reply) => {
    const { dbName } = request.params as { dbName: string };
    let dbInstance: any;

    try {
      if (dbName === 'system.db') {
        dbInstance = db;
      } else {
        const workspaceId = dbName.replace('.db', '');
        dbInstance = getDb(workspaceId);
      }
      const tables = dbInstance.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).all() as { name: string }[];

      const tablesWithCount = tables.map(t => {
        const count = dbInstance.prepare(`SELECT count(*) as count FROM "${t.name}"`).get() as { count: number };
        return { name: t.name, rows: count.count };
      });

      return tablesWithCount;
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    } finally {
      if (dbInstance && dbName !== 'system.db') {
        dbInstance.close();
      }
    }
  });

  fastify.get('/:dbName/table/:name/schema', async (request, reply) => {
    const { dbName, name } = request.params as { dbName: string, name: string };
    let dbInstance: any;

    try {
      if (dbName === 'system.db') {
        dbInstance = db;
      } else {
        const workspaceId = dbName.replace('.db', '');
        dbInstance = getDb(workspaceId);
      }
      const columns = dbInstance.prepare(`PRAGMA table_info("${name}")`).all();
      const indexes = dbInstance.prepare(`PRAGMA index_list("${name}")`).all();
      const foreignKeys = dbInstance.prepare(`PRAGMA foreign_key_list("${name}")`).all();

      return { columns, indexes, foreignKeys };
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    } finally {
      if (dbInstance && dbName !== 'system.db') {
        dbInstance.close();
      }
    }
  });

  fastify.get('/:dbName/table/:name/rows', async (request, reply) => {
    const { dbName, name } = request.params as { dbName: string, name: string };
    const { limit = 50, offset = 0, sort, order = 'ASC' } = request.query as any;
    let dbInstance: any;
    
    try {
      if (dbName === 'system.db') {
        dbInstance = db;
      } else {
        const workspaceId = dbName.replace('.db', '');
        dbInstance = getDb(workspaceId);
      }
      let query = `SELECT * FROM "${name}"`;
      if (sort) {
        query += ` ORDER BY "${sort}" ${order}`;
      }
      query += ` LIMIT ? OFFSET ?`;
      
      const rows = dbInstance.prepare(query).all(limit, offset);
      return rows;
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    } finally {
      if (dbInstance && dbName !== 'system.db') {
        dbInstance.close();
      }
    }
  });

  fastify.post('/:dbName/query', async (request, reply) => {
    const { dbName } = request.params as { dbName: string };
    const { sql, params = [] } = request.body as { sql: string, params?: any[] };
    let dbInstance: any;
    
    if (!sql) return reply.status(400).send({ error: 'SQL is required' });

    if (sql.toUpperCase().includes('ATTACH')) {
      return reply.status(403).send({ error: 'ATTACH DATABASE is blocked' });
    }

    const start = Date.now();
    try {
      if (dbName === 'system.db') {
        dbInstance = db;
      } else {
        const workspaceId = dbName.replace('.db', '');
        dbInstance = getDb(workspaceId);
      }
      const isSelect = sql.trim().toUpperCase().startsWith('SELECT') || sql.trim().toUpperCase().startsWith('EXPLAIN') || sql.trim().toUpperCase().startsWith('PRAGMA');
      
      if (isSelect) {
        const rows = dbInstance.prepare(sql).all(...params);
        return {
          rows,
          executionTime: Date.now() - start,
          type: 'select'
        };
      } else {
        const result = dbInstance.prepare(sql).run(...params);
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
    } finally {
      if (dbInstance && dbName !== 'system.db') {
        dbInstance.close();
      }
    }
  });
}
