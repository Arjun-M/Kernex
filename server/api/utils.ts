import { FastifyInstance } from 'fastify';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

export default async function (fastify: FastifyInstance) {
  
  // 1. HASH GENERATOR
  fastify.post('/hash', async (request, reply) => {
    const { text, algorithm, saltRounds = 10 } = request.body as any;
    if (!text || !algorithm) return reply.status(400).send({ error: 'Text and algorithm required' });

    if (algorithm === 'bcrypt') {
      try {
        const hash = await bcrypt.hash(text, saltRounds);
        return { hash };
      } catch (e) {
        return reply.status(500).send({ error: 'Bcrypt hashing failed' });
      }
    } else {
      try {
        const hash = crypto.createHash(algorithm).update(text).digest('hex');
        return { hash };
      } catch (e) {
        return reply.status(400).send({ error: `Invalid or unsupported algorithm: ${algorithm}` });
      }
    }
  });

  // 2. BASE64 ENCODE / DECODE
  fastify.post('/base64', async (request, reply) => {
    const { text, mode } = request.body as any;
    if (text === undefined || !mode) return reply.status(400).send({ error: 'Text and mode required' });

    try {
      if (mode === 'encode') {
        return { result: Buffer.from(text).toString('base64') };
      } else {
        const result = Buffer.from(text, 'base64').toString('utf-8');
        return { result };
      }
    } catch (e) {
      return reply.status(400).send({ error: 'Base64 operation failed' });
    }
  });

  // 3. JWT DECODER
  fastify.post('/jwt/decode', async (request, reply) => {
    const { token } = request.body as any;
    if (!token) return reply.status(400).send({ error: 'Token required' });

    try {
      const parts = token.split('.');
      if (parts.length !== 3) return reply.status(400).send({ error: 'Malformed JWT: Must have 3 parts' });
      
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      
      return { header, payload };
    } catch (e) {
      return reply.status(400).send({ error: 'Failed to decode JWT' });
    }
  });

  // 4. UUID GENERATOR
  fastify.get('/uuid', async (request) => {
    const count = Math.min(100, Math.max(1, parseInt((request.query as any).count) || 1));
    const uuids = Array.from({ length: count }, () => crypto.randomUUID());
    return { uuids };
  });

  // 5. PASSWORD GENERATOR
  fastify.post('/password', async (request) => {
    const { length = 16, uppercase = true, lowercase = true, numbers = true, symbols = true } = request.body as any;
    
    const sets = [];
    if (lowercase) sets.push('abcdefghijklmnopqrstuvwxyz');
    if (uppercase) sets.push('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
    if (numbers) sets.push('0123456789');
    if (symbols) sets.push('!@#$%^&*()_+~`|}{[]:;?><,./-=');
    
    const chars = sets.join('');
    if (!chars) return { password: '' };

    let password = '';
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
      password += chars[bytes[i] % chars.length];
    }
    
    // Simple strength calculation
    let strength = 0;
    if (length > 8) strength++;
    if (length > 12) strength++;
    if (uppercase && lowercase) strength++;
    if (numbers) strength++;
    if (symbols) strength++;

    return { password, strength: Math.min(5, strength) };
  });

  // 6. HMAC TOOL
  fastify.post('/hmac', async (request, reply) => {
    const { text, secret, algorithm, outputFormat = 'hex' } = request.body as any;
    if (!text || !secret || !algorithm) return reply.status(400).send({ error: 'Missing required fields' });

    try {
      const hmac = crypto.createHmac(algorithm, secret).update(text).digest(outputFormat as any);
      return { hmac };
    } catch (e) {
      return reply.status(400).send({ error: 'HMAC generation failed' });
    }
  });

  // 7. ENCRYPTION PLAYGROUND
  fastify.post('/encryption', async (request, reply) => {
    const { text, key, iv, algorithm, mode, authTag } = request.body as any;
    if (!text || !key || !algorithm || !mode) return reply.status(400).send({ error: 'Missing parameters' });

    try {
      const keyBuffer = Buffer.from(key, 'hex');
      const ivBuffer = iv ? Buffer.from(iv, 'hex') : Buffer.alloc(0);

      if (mode === 'encrypt') {
        const actualIv = iv ? ivBuffer : crypto.randomBytes(algorithm.includes('gcm') ? 12 : 16);
        const cipher = crypto.createCipheriv(algorithm, keyBuffer, actualIv) as any;
        
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const result: any = {
          result: encrypted,
          iv: actualIv.toString('hex')
        };

        if (algorithm.includes('gcm')) {
          result.authTag = cipher.getAuthTag().toString('hex');
        }

        return result;
      } else {
        const decipher = crypto.createDecipheriv(algorithm, keyBuffer, ivBuffer) as any;
        if (algorithm.includes('gcm') && authTag) {
          decipher.setAuthTag(Buffer.from(authTag, 'hex'));
        }

        let decrypted = decipher.update(text, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return { result: decrypted };
      }
    } catch (e: any) {
      return reply.status(400).send({ error: `Operation failed: ${e.message}` });
    }
  });
}
