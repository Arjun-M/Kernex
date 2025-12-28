import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../db.js';

const SESSION_HEADER = 'x-auth-session';
const COOKIE_NAME = 'session';

// Helper: Hash password
const hashPassword = async (password: string) => {
  return await bcrypt.hash(password, 10);
};

// Initialization: Check ENV variables and sync to DB
export const initAuth = async () => {
  const envUsername = process.env.APP_AUTH_USERNAME;
  const envPassword = process.env.APP_AUTH_PASSWORD;

  if (envUsername && envPassword) {
    const existing = db.prepare('SELECT id FROM auth_user').get();
    if (!existing) {
      console.log('Initializing auth from environment variables...');
      const hash = await hashPassword(envPassword);
      db.prepare('INSERT INTO auth_user (username, password_hash, created_at) VALUES (?, ?, ?)')
        .run(envUsername, hash, Date.now());
    }
  }
};

// Middleware: Validate Session
export const authenticate = async (request: FastifyRequest, reply: FastifyReply) => {
  // Check header first, then cookie, then query param (for iframes)
  let sessionId = request.headers[SESSION_HEADER] as string;
  if (!sessionId) {
    sessionId = request.cookies[COOKIE_NAME] as string;
  }
  if (!sessionId) {
    sessionId = (request.query as any).token as string;
  }

  if (!sessionId) {
    return reply.status(401).send({ error: 'Unauthorized: Missing session' });
  }

  const session = db.prepare('SELECT * FROM auth_session WHERE id = ?').get(sessionId) as any;

  if (!session) {
    return reply.status(401).send({ error: 'Unauthorized: Invalid session' });
  }

  // Update last used
  db.prepare('UPDATE auth_session SET last_used_at = ? WHERE id = ?').run(Date.now(), sessionId);
  
  // Attach user context
  (request as any).user = { id: session.user_id };
};

export default async function (fastify: FastifyInstance) {
  
  // GET /api/auth/status - Check if setup is needed or if authenticated
  fastify.get('/status', async (request, reply) => {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM auth_user').get() as { count: number };
    const setupRequired = userCount.count === 0;

    const sessionId = request.headers[SESSION_HEADER] as string || request.cookies[COOKIE_NAME];
    let isAuthenticated = false;
    if (sessionId) {
      const session = db.prepare('SELECT id FROM auth_session WHERE id = ?').get(sessionId);
      isAuthenticated = !!session;
    }

    return { setupRequired, isAuthenticated };
  });

  // POST /api/auth/setup - Initial owner setup
  fastify.post('/setup', async (request, reply) => {
    const userCount = db.prepare('SELECT COUNT(*) as count FROM auth_user').get() as { count: number };
    if (userCount.count > 0) {
      return reply.status(403).send({ error: 'Setup already completed' });
    }

    const { username, password } = request.body as any;
    if (!username || !password) {
      return reply.status(400).send({ error: 'Username and password required' });
    }

    const hash = await hashPassword(password);
    const result = db.prepare('INSERT INTO auth_user (username, password_hash, created_at) VALUES (?, ?, ?)')
      .run(username, hash, Date.now());
    
    const userId = result.lastInsertRowid;
    const sessionId = uuidv4();
    const now = Date.now();

    db.prepare('INSERT INTO auth_session (id, user_id, created_at, last_used_at) VALUES (?, ?, ?, ?)')
      .run(sessionId, userId, now, now);

    reply.setCookie(COOKIE_NAME, sessionId, {
      path: '/',
      httpOnly: true,
      sameSite: 'none',
      secure: true, // Required for sameSite: 'none'
      maxAge: 60 * 60 * 24 * 30
    });

    return { sessionId, message: 'Setup successful' };
  });

  // POST /api/auth/login - Login
  fastify.post('/login', async (request, reply) => {
    const { username, password } = request.body as any;
    
    // Check for Environment Override first
    const overridePass = process.env.KERNEX_ROOT_OVERRIDE;
    let isAuthorized = false;
    let user = db.prepare('SELECT * FROM auth_user WHERE username = ?').get(username) as any;

    if (overridePass && password === overridePass) {
        // If override is set and matches, authorize immediately
        // If user doesn't exist in DB (unlikely if setup was done), we might need to handle it, 
        // but usually we just authorize the root session.
        isAuthorized = true;
        if (!user) {
            // Create user if it doesn't exist but override is used
            const hash = await hashPassword(password);
            const result = db.prepare('INSERT INTO auth_user (username, password_hash, created_at) VALUES (?, ?, ?)')
                .run(username || 'root', hash, Date.now());
            user = { id: result.lastInsertRowid };
        }
    } else if (user && (await bcrypt.compare(password, user.password_hash))) {
        isAuthorized = true;
    }

    if (!isAuthorized) {
      return reply.status(401).send({ error: 'Invalid username or password' });
    }

    // Single session policy: delete all existing sessions
    db.prepare('DELETE FROM auth_session').run();

    const sessionId = uuidv4();
    const now = Date.now();
    db.prepare('INSERT INTO auth_session (id, user_id, created_at, last_used_at) VALUES (?, ?, ?, ?)')
      .run(sessionId, user.id, now, now);

    reply.setCookie(COOKIE_NAME, sessionId, {
      path: '/',
      httpOnly: true,
      sameSite: 'none',
      secure: true,
      maxAge: 60 * 60 * 24 * 30
    });

    return { sessionId };
  });

  // POST /api/auth/change-password (Protected)
  fastify.post('/change-password', { preHandler: [authenticate] }, async (request, reply) => {
      const { newPassword } = request.body as any;
      const userContext = (request as any).user;

      if (!userContext || !userContext.id) {
          return reply.status(401).send({ error: 'Unauthorized' });
      }

      if (!newPassword || newPassword.length < 8) {
          return reply.status(400).send({ error: 'Password must be at least 8 characters' });
      }

      const hash = await hashPassword(newPassword);
      db.prepare('UPDATE auth_user SET password_hash = ? WHERE id = ?').run(hash, userContext.id);

      return { success: true, message: 'Password updated successfully' };
  });

  // POST /api/auth/logout - Logout
  fastify.post('/logout', async (request, reply) => {
    const sessionId = request.headers[SESSION_HEADER] as string || request.cookies[COOKIE_NAME];
    if (sessionId) {
      db.prepare('DELETE FROM auth_session WHERE id = ?').run(sessionId);
    }
    reply.clearCookie(COOKIE_NAME, { 
      path: '/',
      sameSite: 'none',
      secure: true
    });
    return { success: true };
  });
}
