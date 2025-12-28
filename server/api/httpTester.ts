import { FastifyInstance } from 'fastify';

export default async function (fastify: FastifyInstance) {
  fastify.post('/execute', async (request, reply) => {
    const { method, url, headers, body, settings } = request.body as any;

    try {
      // Basic validation
      if (!url) {
        return reply.code(400).send({ message: 'URL is required' });
      }
      
      const fetchOptions: any = {
        method,
        headers: headers || {},
      };

      if (body && body.type !== 'none' && body.content) {
        if (body.type === 'json') {
          // Validate JSON
          try {
             JSON.parse(body.content);
          } catch(e) {
             return reply.code(400).send({ message: 'Invalid JSON body' });
          }
          fetchOptions.headers['Content-Type'] = 'application/json';
          fetchOptions.body = body.content;
        } else if (body.type === 'form') {
           fetchOptions.headers['Content-Type'] = 'application/x-www-form-urlencoded';
           fetchOptions.body = body.content;
        } else {
           fetchOptions.body = body.content;
        }
      }

      const startTime = Date.now();
      
      // Use native fetch (Node 18+)
      const response = await fetch(url, fetchOptions);
      
      const endTime = Date.now();
      const timeMs = endTime - startTime;

      const responseText = await response.text();
      
      // Try parsing JSON response body
      let responseBody: any = responseText;
      try {
        responseBody = JSON.parse(responseText);
      } catch (e) {
        // keep as text
      }

      // Convert Headers object to plain object
      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        body: responseBody,
        timeMs,
        size: new Blob([responseText]).size 
      };

    } catch (error: any) {
      return reply.code(500).send({ message: error.message || 'Internal Server Error' });
    }
  });
}
