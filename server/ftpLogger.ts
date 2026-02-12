import pino from 'pino';
import { logEmitter } from './logEmitter.js';

const transport = pino.transport({
  target: 'pino-pretty',
  options: {
    translateTime: 'SYS:standard',
    ignore: 'pid,hostname,name', 
    messageFormat: '{levelLabel}: {msg}',
    colorize: true
  }
});

const originalWrite = transport.write.bind(transport);
transport.write = (chunk: any) => {
    logEmitter.emit('log', chunk.toString());
    return originalWrite(chunk);
};

export const ftpLogger = pino({
  level: 'info'
}, transport);