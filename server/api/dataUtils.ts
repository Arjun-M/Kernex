import { FastifyInstance } from 'fastify';
import yaml from 'js-yaml';
import { parse as parseCsv } from 'csv-parse/sync';
import * as diff from 'diff';
import MarkdownIt from 'markdown-it';
import { XMLParser, XMLBuilder } from 'fast-xml-parser';

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true
});

export default async function (fastify: FastifyInstance) {
  
  // 1. JSON FORMATTER
  fastify.post('/json', async (request, reply) => {
    const { text, mode = 'pretty' } = request.body as any;
    if (!text) return reply.status(400).send({ error: 'Text required' });

    try {
      const obj = JSON.parse(text);
      const result = mode === 'pretty' ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
      return { result };
    } catch (e: any) {
      return reply.status(400).send({ error: `Invalid JSON: ${e.message}` });
    }
  });

  // 2. YAML ↔ JSON
  fastify.post('/yaml', async (request, reply) => {
    const { text, target } = request.body as any;
    if (!text || !target) return reply.status(400).send({ error: 'Text and target format required' });

    try {
      if (target === 'json') {
        const obj = yaml.load(text);
        return { result: JSON.stringify(obj, null, 2) };
      } else {
        const obj = JSON.parse(text);
        return { result: yaml.dump(obj) };
      }
    } catch (e: any) {
      return reply.status(400).send({ error: `Conversion failed: ${e.message}` });
    }
  });

  // 3. CSV VIEWER (Parse to JSON)
  fastify.post('/csv/parse', async (request, reply) => {
    const { text } = request.body as any;
    if (!text) return reply.status(400).send({ error: 'Text required' });

    try {
      const records = parseCsv(text, {
        columns: true,
        skip_empty_lines: true
      });
      return { records };
    } catch (e: any) {
      return reply.status(400).send({ error: `CSV Parse failed: ${e.message}` });
    }
  });

  // 4. DIFF VIEWER
  fastify.post('/diff', async (request) => {
    const { oldText, newText } = request.body as any;
    const result = diff.diffLines(oldText || '', newText || '');
    return { result };
  });

  // 5. REGEX TESTER
  fastify.post('/regex', async (request, reply) => {
    const { pattern, flags, testString } = request.body as any;
    try {
      const re = new RegExp(pattern, flags);
      const matches = [];
      let match;
      
      // Prevent infinite loop with empty matches
      let lastIndex = -1;
      
      if (flags.includes('g')) {
          while ((match = re.exec(testString)) !== null) {
              if (re.lastIndex === lastIndex) {
                  re.lastIndex++;
                  continue;
              }
              lastIndex = re.lastIndex;
              matches.push({
                  index: match.index,
                  text: match[0],
                  groups: match.slice(1)
              });
          }
      } else {
          match = re.exec(testString);
          if (match) {
              matches.push({
                  index: match.index,
                  text: match[0],
                  groups: match.slice(1)
              });
          }
      }
      
      return { matches, count: matches.length };
    } catch (e: any) {
      return reply.status(400).send({ error: `Invalid Regex: ${e.message}` });
    }
  });

  // 6. MARKDOWN PREVIEW
  fastify.post('/markdown', async (request) => {
    const { text } = request.body as any;
    const html = md.render(text || '');
    return { html };
  });

  // 7. LOG VIEWER (Basic Parsing)
  fastify.post('/logs/parse', async (request) => {
    const { text } = request.body as any;
    const lines = (text || '').split('\n');
    const parsed = lines.map((line: string, index: number) => {
        let level = 'INFO';
        if (line.match(/error|fail|exception|fatal/i)) level = 'ERROR';
        else if (line.match(/warn|alert/i)) level = 'WARN';
        else if (line.match(/debug|trace/i)) level = 'DEBUG';

        return { id: index, level, text: line };
    });
    return { logs: parsed };
  });

  // 8. XML FORMATTER
  fastify.post('/xml', async (request, reply) => {
    const { text, mode = 'pretty' } = request.body as any;
    if (!text) return reply.status(400).send({ error: 'Text required' });

    try {
      const parser = new XMLParser({
          ignoreAttributes: false,
          preserveOrder: true
      });
      const jsonObj = parser.parse(text);
      
      const builder = new XMLBuilder({
          format: mode === 'pretty',
          indentBy: '  ',
          ignoreAttributes: false,
          preserveOrder: true
      });
      const result = builder.build(jsonObj);
      return { result };
    } catch (e: any) {
      return reply.status(400).send({ error: `Invalid XML: ${e.message}` });
    }
  });
}
