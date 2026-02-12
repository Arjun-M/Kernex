import type { FastifyInstance } from 'fastify';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import crypto from 'crypto';
import { logActivity } from '../dbLogger.js';
import getDb from '../utils/db.js'; // Import the DB util

const WORKSPACE_ROOT = path.join(process.cwd(), 'workspace');

// Ensure workspace root exists
if (!fsSync.existsSync(WORKSPACE_ROOT)) {
  fsSync.mkdirSync(WORKSPACE_ROOT, { recursive: true });
}

interface WorkspaceMetadata {
  id: string;
  name: string;
  created: number;
  description?: string;
  icon?: string;
  lastOpened?: number;
  isProtected?: boolean;
  passwordHash?: string;
}

export default async function workspaceRoutes(fastify: FastifyInstance) {

  // List workspaces
  fastify.get('/', async (request, reply) => {
    try {
      const items = await fs.readdir(WORKSPACE_ROOT, { withFileTypes: true });
      const workspaces = await Promise.all(items
        .filter(item => item.isDirectory())
        .map(async (item) => {
          const workspacePath = path.join(WORKSPACE_ROOT, item.name);
          const metaPath = path.join(workspacePath, 'metadata.json');

          try {
            const metaContent = await fs.readFile(metaPath, 'utf-8');
            const meta = JSON.parse(metaContent) as WorkspaceMetadata;

            // Return public metadata only
            return {
              id: item.name,
              name: meta.name || item.name,
              path: workspacePath,
              description: meta.description,
              icon: meta.icon,
              created: meta.created,
              lastOpened: meta.lastOpened,
              isProtected: !!meta.passwordHash // Flag for UI
            };
          } catch {
            // If metadata is missing, create it for existing folders (migration)
            const meta: WorkspaceMetadata = { id: item.name, name: item.name, created: Date.now() };
            await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));

            return {
              id: item.name,
              name: item.name,
              path: workspacePath,
              created: meta.created
            };
          }
        }));

      // Sort by lastOpened desc, then created desc
      workspaces.sort((a, b) => {
        const timeA = a.lastOpened || a.created || 0;
        const timeB = b.lastOpened || b.created || 0;
        return timeB - timeA;
      });

      return workspaces;
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: 'Failed to list workspaces' });
    }
  });

  // Create workspace
  fastify.post('/', async (request, reply) => {
    const { name, description, icon, password } = request.body as {
      name: string, description?: string, icon?: string, password?: string
    };

    // Simple sanitization
    const safeName = (name || 'untitled').replace(/[^a-z0-9-_]/gi, '-').toLowerCase();
    const id = `${safeName}-${Date.now()}`; // Unique ID
    const workspacePath = path.join(WORKSPACE_ROOT, id);

    try {
      await fs.mkdir(workspacePath);

      // Initialize DB
      try {
        const db = getDb(id);
        db.close();
      } catch (e) {
        request.log.error({ err: e }, 'Failed to initialize workspace DB');
      }

      let passwordHash: string | undefined;
      if (password) {
        passwordHash = crypto.createHash('sha256').update(password).digest('hex');
      }

      // Create metadata
      const meta: WorkspaceMetadata = {
        id,
        name: name || id,
        created: Date.now(),
        lastOpened: Date.now(),
        description,
        icon,
        passwordHash,
        isProtected: !!passwordHash
      };

      await fs.writeFile(path.join(workspacePath, 'metadata.json'), JSON.stringify(meta, null, 2));
      
      logActivity('info', `Created workspace: ${meta.name}`, 'system', 'user', { workspaceId: id });

      // Return without sensitivity
      const { passwordHash: _passwordHash, ...publicMeta } = meta;
      return { ...publicMeta, path: workspacePath };
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: 'Failed to create workspace' });
    }
  });

  // Delete workspace
  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    // Safety check: prevent deleting root or going up
    if (!id || id.includes('..') || id.includes('/')) {
      return reply.status(400).send({ error: 'Invalid workspace ID' });
    }

    const workspacePath = path.join(WORKSPACE_ROOT, id);

    try {
      // Check if exists
      try {
        await fs.access(workspacePath);
      } catch {
        return reply.status(404).send({ error: 'Workspace not found' });
      }

      await fs.rm(workspacePath, { recursive: true, force: true });
      logActivity('warn', `Deleted workspace: ${id}`, 'system', 'user', { workspaceId: id });
      return { success: true };
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: 'Failed to delete workspace' });
    }
  });

  // Update workspace (Rename / Update metadata)
  fastify.put('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const updates = request.body as Partial<WorkspaceMetadata>;

    if (!id) return reply.status(400).send({ error: 'ID required' });

    const workspacePath = path.join(WORKSPACE_ROOT, id);
    const metaPath = path.join(workspacePath, 'metadata.json');

    try {
      // Read existing
      let meta: WorkspaceMetadata;
      try {
        const existing = await fs.readFile(metaPath, 'utf-8');
        meta = JSON.parse(existing);
      } catch {
        meta = { id, name: id, created: Date.now() };
      }

      // Apply updates
      meta = { ...meta, ...updates };

      await fs.writeFile(metaPath, JSON.stringify(meta, null, 2));

      logActivity('info', `Updated workspace: ${meta.name}`, 'system', 'user', { workspaceId: id, updates });

      return { success: true, workspace: { ...meta, path: workspacePath } };
    } catch (err) {
      request.log.error(err);
      return reply.status(500).send({ error: 'Failed to update workspace' });
    }
  });

  // Maintenance: Optimize DB
  fastify.post('/:id/maintenance/vacuum', async (request, reply) => {
    const { id } = request.params as { id: string };
    
    try {
        const db = getDb(id);
        db.pragma('vacuum');
        db.close();
        return { success: true };
    } catch (e: any) {
        return reply.status(500).send({ error: e.message });
    }
  });

  // Verify password
  fastify.post('/:id/verify', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { password } = request.body as { password?: string };

    if (!id) return reply.status(400).send({ error: 'ID required' });

    const workspacePath = path.join(WORKSPACE_ROOT, id);
    const metaPath = path.join(workspacePath, 'metadata.json');

    try {
      const content = await fs.readFile(metaPath, 'utf-8');
      const meta = JSON.parse(content) as WorkspaceMetadata;

      if (!meta.passwordHash) {
        return { success: true }; // Not protected
      }

      if (!password) {
        return reply.status(401).send({ error: 'Password required' });
      }

      const hash = crypto.createHash('sha256').update(password).digest('hex');

      if (hash === meta.passwordHash) {
        logActivity('info', `Access granted to protected workspace: ${meta.name}`, 'access', 'user', { workspaceId: id });
        return { success: true };
      } else {
        logActivity('warn', `Failed access attempt to workspace: ${meta.name}`, 'access', 'user', { workspaceId: id });
        return reply.status(401).send({ error: 'Incorrect password' });
      }
    } catch (err) {
      request.log.error(err);
      return reply.status(404).send({ error: 'Workspace not found' });
    }
  });
}