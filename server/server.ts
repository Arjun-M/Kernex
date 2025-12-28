import Fastify from 'fastify';
import path from 'path';
import { fileURLToPath } from 'url';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import iframeRoutes from './iframeRoutes.js'; 

import httpTesterRoutes from './api/httpTester.js';
import notesRoutes from './api/notes.js';
import canvasRoutes from './api/canvas.js';
import filesRoutes from './api/files.js';
import systemRoutes from './api/system.js';
import settingsRoutes from './api/settings.js';
import diskRoutes from './api/disk.js';
import tasksRoutes from './api/tasks.js';
import secretsRoutes from './api/secrets.js';
import searchRoutes from './api/search.js';
import terminalRoutes from './api/terminal.js';
import dbManagerRoutes from './api/dbManager.js';
import shortUrlRoutes from './api/shortUrls.js';
import utilsRoutes from './api/utils.js';
import dataUtilsRoutes from './api/dataUtils.js';
import authRoutes, { initAuth, authenticate } from './api/auth.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const fastify = Fastify({
  logger: true
});

// Register plugins
fastify.register(fastifyCors, {
  origin: true,
  credentials: true
});
fastify.register(fastifyCookie);
fastify.register(fastifyWebsocket);

// Register iframe routes
fastify.register(iframeRoutes);

// Register AUTH routes (Unprotected)
fastify.register(authRoutes, { prefix: '/api/auth' });

// Register TERMINAL routes separately (Auth handled internally via token query param)
fastify.register(terminalRoutes, { prefix: '/api/term' });

// Register API routes (Protected)
const registerProtected = async (instance: any) => {
  instance.addHook('preHandler', authenticate);
  instance.register(httpTesterRoutes, { prefix: '/http' });
  instance.register(notesRoutes, { prefix: '/notes' });
  instance.register(canvasRoutes, { prefix: '/canvas' });
  instance.register(filesRoutes, { prefix: '/files' });
  instance.register(systemRoutes, { prefix: '/system' });
  instance.register(settingsRoutes, { prefix: '/settings' });
  instance.register(diskRoutes, { prefix: '/disk' });
  instance.register(tasksRoutes, { prefix: '/tasks' });
  instance.register(secretsRoutes, { prefix: '/secrets' });
  instance.register(searchRoutes, { prefix: '/search' });
  instance.register(dbManagerRoutes, { prefix: '/db' });
  instance.register(utilsRoutes, { prefix: '/utils' });
  instance.register(dataUtilsRoutes, { prefix: '/data' });
};

fastify.register(registerProtected, { prefix: '/api' });

// Special case for short URLs - public
fastify.register(shortUrlRoutes); 

// Health check
fastify.get('/health', async (request, reply) => {
  return { status: 'ok' };
});

const start = async () => {
  try {
    // Initialize Auth from ENV if needed
    await initAuth();

    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Server listening on http://localhost:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
