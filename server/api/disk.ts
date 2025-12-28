import { FastifyInstance } from 'fastify';
import fs from 'fs/promises';
import path from 'path';

const ROOT_DIR = process.cwd();

async function getDiskUsage(dir: string): Promise<{ fileCount: number; folderCount: number }> {
  let fileCount = 0;
  let folderCount = 0;

  async function scan(directory: string) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === 'node_modules' || entry.name === '.git' || entry.name === '.DS_Store') continue;

      if (entry.isDirectory()) {
        folderCount++;
        await scan(path.join(directory, entry.name));
      } else {
        fileCount++;
      }
    }
  }

  try {
    await scan(dir);
  } catch (e) {
    console.error('Error scanning disk usage:', e);
  }

  return { fileCount, folderCount };
}

export default async function (fastify: FastifyInstance) {
  fastify.get('/overview', async (request, reply) => {
    try {
      // 1. Partition Stats (Node 18+)
      // Note: fs.statfs might not be available on all platforms/node versions in some environments, 
      // but "backend stack" includes "Native fs".
      // If statfs fails, fallback.
      let total = 0, free = 0, used = 0;
      
      try {
        // @ts-ignore - statfs types might be missing in older @types/node
        const stats = await fs.statfs(ROOT_DIR); 
        // bsize = block size, blocks = total blocks, bfree = free blocks, bavail = available to user
        total = stats.blocks * stats.bsize;
        free = stats.bavail * stats.bsize;
        used = total - free;
      } catch (e) {
        // Fallback or ignore if not supported
        console.warn('fs.statfs not supported or failed', e);
      }

      // 2. Workspace File Counts
      const usage = await getDiskUsage(ROOT_DIR);

      return {
        workspaceRootPath: ROOT_DIR,
        totalSize: total,
        usedSize: used,
        freeSize: free,
        fileCount: usage.fileCount,
        folderCount: usage.folderCount
      };
    } catch (e: any) {
      return reply.code(500).send({ message: e.message });
    }
  });
}
