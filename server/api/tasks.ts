import { FastifyInstance } from 'fastify';
import process from 'process';

export default async function (fastify: FastifyInstance) {
  fastify.get('/', async (request, reply) => {
    // Real process info
    const memory = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // In a real app with a Worker Pool, we would query the pool here.
    const workers: any[] = []; 

    return {
      mainProcess: {
        pid: process.pid,
        uptime: process.uptime(),
        memory: {
          rss: memory.rss,
          heapTotal: memory.heapTotal,
          heapUsed: memory.heapUsed,
          external: memory.external
        },
        cpu: cpuUsage
      },
      workers: workers,
      // Mock background jobs for UI demo if needed, but keeping it strict to real data means empty if none.
      backgroundJobs: []
    };
  });
}
