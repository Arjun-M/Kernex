import type { FastifyInstance, FastifyRequest } from 'fastify';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';

const BASE_ROOT = process.cwd();

const getWorkspaceRoot = (request: FastifyRequest) => {
  const query = request.query as any;
  const workspaceId = query.workspaceId || (request.body as any)?.workspaceId;
  
  if (workspaceId) {
    if (workspaceId.includes('..') || workspaceId.includes('/') || workspaceId.includes('\\')) {
        throw new Error('Invalid workspace ID');
    }
    return path.join(BASE_ROOT, 'workspace', workspaceId);
  }
  return BASE_ROOT;
};

const resolvePath = async (root: string, relativePath: string) => {
  const resolved = path.resolve(root, relativePath.replace(/^\//, ''));
  const realRoot = await fs.realpath(root).catch(() => root);

  if (!resolved.startsWith(realRoot)) {
    throw new Error('Path traversal detected');
  }

  try {
      const realPath = await fs.realpath(resolved);
      if (!realPath.startsWith(realRoot)) {
         throw new Error('Symlink escape detected');
      }
      return realPath;
  } catch (e: any) {
      if (e.code === 'ENOENT') {
          // Verify parent exists and is safe
          const parent = path.dirname(resolved);
          const realParent = await fs.realpath(parent).catch(() => null);
          if (!realParent || !realParent.startsWith(realRoot)) {
              throw new Error('Invalid path');
          }
          return resolved; 
      }
      throw e;
  }
};

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

const buildTree = async (root: string, dir: string, relativeRoot: string): Promise<FileNode[]> => {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const nodes: FileNode[] = [];

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;

    const relativePath = path.join(relativeRoot, entry.name);
    const node: FileNode = {
      name: entry.name,
      path: relativePath,
      type: entry.isDirectory() ? 'folder' : 'file'
    };

    if (entry.isDirectory()) {
      node.children = await buildTree(root, path.join(dir, entry.name), relativePath);
    }
    nodes.push(node);
  }
  
  return nodes.sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'folder' ? -1 : 1;
  });
};

export default async function (fastify: FastifyInstance) {
  // GET /api/files/tree
  fastify.get('/tree', async (request, reply) => {
    try {
      const root = getWorkspaceRoot(request);
      try { await fs.access(root); } catch { return []; }
      
      const tree = await buildTree(root, root, '');
      return tree;
    } catch (e: any) {
      return reply.code(500).send({ message: e.message });
    }
  });

  // GET /api/files/scoped-tree
  fastify.get('/scoped-tree', async (request, reply) => {
    const { path: scopePath } = request.query as any;
    if (!scopePath) return reply.code(400).send({ message: 'Scope path required' });

    try {
      const root = getWorkspaceRoot(request);
      const targetDir = await resolvePath(root, scopePath);
      
      const stat = await fs.stat(targetDir);
      if (!stat.isDirectory()) return reply.code(400).send({ message: 'Not a directory' });

      // Build tree with paths relative to workspace root
      const relativeRoot = scopePath.replace(/^\//, '');
      const tree = await buildTree(root, targetDir, relativeRoot);
      return tree;
    } catch (e: any) {
      return reply.code(500).send({ message: e.message });
    }
  });

  // GET /api/files/stat
  fastify.get('/stat', async (request, reply) => {
    const { path: relativePath } = request.query as any;
    if (!relativePath) return reply.code(400).send({ message: 'Path required' });

    try {
      const root = getWorkspaceRoot(request);
      const fullPath = await resolvePath(root, relativePath);
      const stat = await fs.stat(fullPath);
      return {
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
        createdAt: stat.birthtime.toISOString(),
        isDirectory: stat.isDirectory()
      };
    } catch (e: any) {
      return reply.code(500).send({ message: e.message });
    }
  });

  // GET /api/files/read
  fastify.get('/read', async (request, reply) => {
    const { path: relativePath } = request.query as any;
    if (!relativePath) return reply.code(400).send({ message: 'Path required' });

    try {
      const root = getWorkspaceRoot(request);
      const fullPath = await resolvePath(root, relativePath);
      const content = await fs.readFile(fullPath, 'utf-8');
      return { content };
    } catch (e: any) {
      return reply.code(500).send({ message: e.message });
    }
  });

  // GET /api/files/raw (Stream file)
  fastify.get('/raw', async (request, reply) => {
    const { path: relativePath } = request.query as any;
    if (!relativePath) return reply.code(400).send({ message: 'Path required' });

    try {
      const root = getWorkspaceRoot(request);
      const fullPath = await resolvePath(root, relativePath);
      
      // Determine content type (basic)
      const ext = path.extname(fullPath).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.webp': 'image/webp',
        '.bmp': 'image/bmp',
        '.ico': 'image/x-icon',
        '.avif': 'image/avif',
        '.pdf': 'application/pdf',
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.mov': 'video/quicktime',
        '.m4v': 'video/x-m4v',
        '.avi': 'video/x-msvideo',
        '.mkv': 'video/x-matroska',
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.ogg': 'audio/ogg',
        '.m4a': 'audio/mp4',
        '.aac': 'audio/aac',
        '.flac': 'audio/flac',
        '.txt': 'text/plain',
        '.html': 'text/html',
        '.json': 'application/json',
        '.xml': 'application/xml',
        '.yaml': 'application/yaml',
        '.yml': 'application/yaml',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.md': 'text/markdown',
        '.csv': 'text/csv',
        '.sql': 'text/plain'
      };
      
      const type = mimeTypes[ext] || 'application/octet-stream';
      reply.type(type);
      
      return fsSync.createReadStream(fullPath);
    } catch (e: any) {
      return reply.code(500).send({ message: e.message });
    }
  });

  // POST /api/files/write
  fastify.post('/write', async (request, reply) => {
    const { path: relativePath, content, encoding = 'utf-8' } = request.body as any;
    if (!relativePath) return reply.code(400).send({ message: 'Path required' });

    try {
      const root = getWorkspaceRoot(request);
      const fullPath = await resolvePath(root, relativePath);
      await fs.writeFile(fullPath, content, encoding as BufferEncoding);
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
          const root = getWorkspaceRoot(request);
          const fullPath = await resolvePath(root, relativePath);
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

  // POST /api/files/upload
  fastify.post('/upload', async (request, reply) => {
    try {
      const data = await request.file();
      if (!data) return reply.code(400).send({ message: 'No file uploaded' });

      const root = getWorkspaceRoot(request);
      const query = request.query as any;
      const targetDir = query.targetDir || ''; 
      
      const fullDir = await resolvePath(root, targetDir);
      await fs.mkdir(fullDir, { recursive: true });
      
      const filename = data.filename;
      const savePath = path.join(fullDir, filename);
      
      if (!savePath.startsWith(fullDir)) {
          throw new Error('Invalid filename');
      }

      await pipeline(data.file, fsSync.createWriteStream(savePath));
      
      return { success: true, path: path.join(targetDir, filename) };
    } catch (e: any) {
      return reply.code(500).send({ message: e.message });
    }
  });
  
  // POST /api/files/rename (Secure)
  fastify.post('/rename', async (request, reply) => {
      const { oldPath, newPath } = request.body as any;
      if (!oldPath || !newPath) return reply.code(400).send({ message: 'Old and new path required' });
      
      try {
          const root = getWorkspaceRoot(request);
          const fullOld = await resolvePath(root, oldPath);
          const fullNew = await resolvePath(root, newPath);
          
          // TOCTOU mitigation: verify inode didn't change (simplistic but better)
          const oldStat = await fs.stat(fullOld);
          await fs.rename(fullOld, fullNew);
          
          try {
             const newStat = await fs.stat(fullNew);
             if (newStat.ino !== oldStat.ino) {
                 console.warn('File inode changed during rename operation');
             }
          } catch {
              // Ignore if verification fails, operation completed
          }

          return { success: true };
      } catch (e: any) {
          return reply.code(500).send({ message: e.message });
      }
  });
  
  // DELETE /api/files/delete
  fastify.delete('/delete', async (request, reply) => {
      const { path: relativePath } = request.body as any || request.query as any;
      if (!relativePath) return reply.code(400).send({ message: 'Path required' });
      
      try {
          const root = getWorkspaceRoot(request);
          const fullPath = await resolvePath(root, relativePath);
          await fs.rm(fullPath, { recursive: true, force: true });
          return { success: true };
      } catch (e: any) {
          return reply.code(500).send({ message: e.message });
      }
  });
}
