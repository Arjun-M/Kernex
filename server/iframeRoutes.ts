import { FastifyInstance } from 'fastify';
import fastifyStatic from '@fastify/static';
import path from 'path';
import fs from 'fs';
import { authenticate } from './api/auth.js';

export default async function (fastify: FastifyInstance) {
  // Use a child instance to apply authenticate hook only to these static routes
  fastify.register(async (instance) => {
    instance.addHook('preHandler', authenticate);
    
    // Check if dist exists (production mode)
    const distPath = path.join(process.cwd(), 'dist', 'src', 'plugins');
    const srcPath = path.join(process.cwd(), 'src', 'plugins');
    const staticRoot = fs.existsSync(distPath) ? distPath : srcPath;

    instance.register(fastifyStatic, {
      root: staticRoot,
      prefix: '/i/', 
      decorateReply: false
    });
  });
}