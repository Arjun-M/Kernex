import Fastify, { type FastifyInstance } from 'fastify';
import path from 'path';
import fs from 'fs';
import fastifyWebsocket from '@fastify/websocket';
import fastifyCors from '@fastify/cors';
import fastifyCookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import iframeRoutes from './iframeRoutes.js'; 
import { logEmitter } from './logEmitter.js';
import pretty from 'pino-pretty';
import multipart from '@fastify/multipart';

// API Imports
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
import workspaceRoutes from './api/workspaces.js';
import logsRoutes from './api/logs.js';
import docsRoutes from './api/docs.js';
import authRoutes, { initAuth, authenticate } from './api/auth.js';
import ftpRoutes from './api/ftp.js';
import ftpClientRoutes from './api/ftpClient.js';
import workspaceStateRoutes from './api/workspaceState.js';
import extractorRoutes from './api/extractor.js';
import urlTracerRoutes from './api/urlTracer.js';
import { ftpManager } from './ftpServer.js';

// Create custom logger stream
const prettyStream = pretty({
  translateTime: 'SYS:standard',
  ignore: 'pid,hostname,reqId',
  colorize: true
});

const originalWrite = prettyStream.write.bind(prettyStream);
prettyStream.write = (chunk: any) => {
    logEmitter.emit('log', chunk.toString());
    return originalWrite(chunk);
};

const fastify = Fastify({
  logger: {
      level: 'info',
      stream: prettyStream
  },
  disableRequestLogging: true 
});

// Custom request logging
fastify.addHook('onRequest', (req, _reply, done) => {
    if (!req.url.startsWith('/api/term/ws') && !req.url.startsWith('/api/logs/ws')) {
        req.log.info(`${req.method} ${req.url}`);
    }
    done();
});

// Register plugins
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : true;

fastify.register(fastifyCors, {
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-auth-session', 'x-workspace-id'],
});

fastify.register(fastifyCookie);
fastify.register(fastifyWebsocket);
fastify.register(multipart);

// Register iframe routes (Plugins)
fastify.register(iframeRoutes);

// Register AUTH routes (Unprotected)
fastify.register(authRoutes, { prefix: '/api/auth' });

// Register TERMINAL routes separately
fastify.register(terminalRoutes, { prefix: '/api/term' });

// Register LOGS routes separately
fastify.register(logsRoutes, { prefix: '/api/logs' });

// Register DOCS routes
fastify.register(docsRoutes, { prefix: '/api/docs' });

// Register API routes (Protected)
const registerProtected = async (instance: FastifyInstance) => {
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
  instance.register(workspaceRoutes, { prefix: '/workspaces' });
  instance.register(workspaceStateRoutes, { prefix: '/workspace-state' });
  instance.register(extractorRoutes, { prefix: '/extractor' });
  instance.register(urlTracerRoutes, { prefix: '/url-tracer' });
  instance.register(ftpRoutes, { prefix: '/ftp' });
  instance.register(ftpClientRoutes, { prefix: '/ftp-client' });
};

fastify.register(registerProtected, { prefix: '/api' });

// Special case for short URLs - public
fastify.register(shortUrlRoutes); 

// Health check
fastify.get('/health', async () => {
  return { status: 'ok' };
});

// Serve Static Frontend (Production Only)
const distPath = path.join(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  console.log('Serving static files from:', distPath);
  
  fastify.register(fastifyStatic, {
    root: distPath,
    prefix: '/',
    decorateReply: false
  });

  // SPA Fallback
  fastify.setNotFoundHandler((request, reply) => {
    if (request.raw.url && request.raw.url.startsWith('/api')) {
      reply.status(404).send({ error: 'Endpoint not found' });
    } else {
      reply.sendFile('index.html');
    }
  });
}

const start = async () => {
  try {
    await initAuth();
    // Start FTP Server
    await ftpManager.start();
    
    await fastify.listen({ port: 3000, host: '0.0.0.0' });
    console.log('Server listening on http://localhost:3000');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();