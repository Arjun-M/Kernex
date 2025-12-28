import { FastifyInstance } from 'fastify';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const ROOT_DIR = process.cwd(); // Restrict to project root

const resolvePath = (relativePath: string) => {
  const resolved = path.resolve(ROOT_DIR, relativePath.replace(/^\//, '')); // Remove leading slash
  if (!resolved.startsWith(ROOT_DIR)) {
    throw new Error('Path traversal detected');
  }
  return resolved;
};

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

const buildTree = async (dir: string, relativeRoot: string): Promise<FileNode[]> => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nodes: FileNode[] = [];

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue; // Skip hidden/node_modules

    const relativePath = path.join(relativeRoot, entry.name);
    const node: FileNode = {
      name: entry.name,
      path: relativePath,
      type: entry.isDirectory() ? 'folder' : 'file'
    };

    if (entry.isDirectory()) {
      node.children = await buildTree(path.join(dir, entry.name), relativePath);
    }
    nodes.push(node);
  }
  
  // Sort folders first
  return nodes.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'folder' ? -1 : 1;
  });
};

export default async function (fastify: FastifyInstance) {
  // GET /api/files/tree
  fastify.get('/tree', async (request, reply) => {
    try {
      const tree = await buildTree(ROOT_DIR, '');
      return tree;
    } catch (e: any) {
      return reply.code(500).send({ message: e.message });
    }
  });

  // GET /api/files/read?path=...
  fastify.get('/read', async (request, reply) => {
    const { path: relativePath } = request.query as any;
    if (!relativePath) return reply.code(400).send({ message: 'Path required' });

    try {
      const fullPath = resolvePath(relativePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      return { content };
    } catch (e: any) {
      return reply.code(500).send({ message: e.message });
    }
  });

  // POST /api/files/write
  fastify.post('/write', async (request, reply) => {
    const { path: relativePath, content } = request.body as any;
    if (!relativePath) return reply.code(400).send({ message: 'Path required' });

    try {
      const fullPath = resolvePath(relativePath);
      await fs.writeFile(fullPath, content, 'utf-8');
      return { success: true };
    } catch (e: any) {
      return reply.code(500).send({ message: e.message });
    }
  });
  
  // POST /api/files/create
  fastify.post('/create', async (request, reply) => {
      const { path: relativePath, type } = request.body as any;
      if (!relativePath || !type) return reply.code(400).send({ message: 'Path and type required' });
      
      try {
          const fullPath = resolvePath(relativePath);
          if (type === 'folder') {
              await fs.mkdir(fullPath, { recursive: true });
          } else {
              await fs.writeFile(fullPath, '', 'utf-8');
          }
          return { success: true };
      } catch (e: any) {
          return reply.code(500).send({ message: e.message });
      }
  });
  
  // POST /api/files/rename
  fastify.post('/rename', async (request, reply) => {
      const { oldPath, newPath } = request.body as any;
      if (!oldPath || !newPath) return reply.code(400).send({ message: 'Old and new path required' });
      
      try {
          const fullOld = resolvePath(oldPath);
          const fullNew = resolvePath(newPath);
          await fs.rename(fullOld, fullNew);
          return { success: true };
      } catch (e: any) {
          return reply.code(500).send({ message: e.message });
      }
  });
  
  // DELETE /api/files/delete
  fastify.delete('/delete', async (request, reply) => {
      const { path: relativePath } = request.body as any || request.query as any; // Allow query or body
      if (!relativePath) return reply.code(400).send({ message: 'Path required' });
      
      try {
          const fullPath = resolvePath(relativePath);
          await fs.rm(fullPath, { recursive: true, force: true });
          return { success: true };
      } catch (e: any) {
          return reply.code(500).send({ message: e.message });
      }
  });
}
