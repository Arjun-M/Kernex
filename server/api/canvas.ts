import { FastifyInstance } from 'fastify';
import fs from 'fs/promises';
import path from 'path';
import { atomicWriteFile } from '../utils/fileOps.js';

const DATA_DIR = path.join(process.cwd(), 'data');
const CANVAS_FILE = path.join(DATA_DIR, 'canvas.json');

const ensureDataDir = async () => {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (e) {
    // Ignore if exists
  }
};

const readCanvas = async (): Promise<any> => {
  try {
    const data = await fs.readFile(CANVAS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (e) {
    return null;
  }
};

const writeCanvas = async (state: any) => {
  await ensureDataDir();
  await atomicWriteFile(CANVAS_FILE, JSON.stringify(state, null, 2));
};

export default async function (fastify: FastifyInstance) {
  // GET /api/canvas?workspaceId=xxx
  fastify.get('/', async (request, reply) => {
    const { workspaceId } = request.query as any;
    const allStates = await readCanvas() || {};
    // Return empty state if not found
    return allStates[workspaceId || 'default'] || { 
      workspaceId: workspaceId || 'default',
      viewport: { x: 0, y: 0, zoom: 1 },
      nodes: [],
      updatedAt: Date.now()
    };
  });

  // POST /api/canvas
  fastify.post('/', async (request, reply) => {
    const { workspaceId, viewport, nodes } = request.body as any;
    const allStates = await readCanvas() || {};
    const id = workspaceId || 'default';
    
    allStates[id] = {
      workspaceId: id,
      viewport: viewport || { x: 0, y: 0, zoom: 1 },
      nodes: nodes || [],
      updatedAt: Date.now()
    };
    
    await writeCanvas(allStates);
    return allStates[id];
  });
}
