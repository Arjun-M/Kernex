import type { FastifyInstance } from 'fastify';
import db from '../db.js';

interface SearchAction {
  kind: 'navigate' | 'open_canvas' | 'execute';
  target: string;
  data?: any;
}

interface SearchResult {
  id: string;
  type: 'page' | 'canvas' | 'command' | 'note';
  title: string;
  description: string;
  icon: string;
  action: SearchAction;
  score?: number;
}

const REGISTRY: SearchResult[] = [
  // System Pages
  { id: 'page-system', type: 'page', title: 'System', description: 'System overview and information', icon: 'monitor', action: { kind: 'navigate', target: '/system' } },
  { id: 'page-settings', type: 'page', title: 'Settings', description: 'Application preferences and configuration', icon: 'settings', action: { kind: 'navigate', target: '/settings' } },
  { id: 'page-disk', type: 'page', title: 'Disk Manager', description: 'Manage storage and partitions', icon: 'hard-drive', action: { kind: 'navigate', target: '/system/disk' } },
  { id: 'page-tasks', type: 'page', title: 'Task Manager', description: 'Monitor system processes and performance', icon: 'activity', action: { kind: 'navigate', target: '/system/tasks' } },
  { id: 'page-plugins', type: 'page', title: 'Plugins', description: 'Manage and install plugins', icon: 'package', action: { kind: 'navigate', target: '/system/plugins' } },
  { id: 'page-security', type: 'page', title: 'Security', description: 'Security and runtime settings', icon: 'shield', action: { kind: 'navigate', target: '/system/security' } },
  { id: 'page-update', type: 'page', title: 'System Update', description: 'Check for Kernex updates', icon: 'refresh-cw', action: { kind: 'navigate', target: '/settings/system-update' } },

  // Canvas Tools - Productivity
  { id: 'tool-notes', type: 'canvas', title: 'Notes', description: 'Rich text and markdown notes', icon: 'file-text', action: { kind: 'open_canvas', target: 'notes' } },
  
  // Canvas Tools - Development
  { id: 'tool-http', type: 'canvas', title: 'HTTP Tester', description: 'Send and inspect API requests', icon: 'zap', action: { kind: 'open_canvas', target: 'http-tester' } },
  { id: 'tool-terminal', type: 'canvas', title: 'Terminal', description: 'Host shell access', icon: 'terminal', action: { kind: 'open_canvas', target: 'terminal' } },
  { id: 'tool-db', type: 'canvas', title: 'SQL Viewer', description: 'Internal SQLite database explorer', icon: 'database', action: { kind: 'open_canvas', target: 'db-viewer' } },
  { id: 'tool-files', type: 'canvas', title: 'File Manager', description: 'Manage server-side files', icon: 'folder', action: { kind: 'open_canvas', target: 'files' } },
  { id: 'tool-urls', type: 'canvas', title: 'Short URLs', description: 'Manage custom redirects', icon: 'link', action: { kind: 'open_canvas', target: 'short-urls' } },

  // Canvas Tools - Data Formats
  { id: 'tool-json', type: 'canvas', title: 'JSON Tool', description: 'Format and validate JSON', icon: 'file-json', action: { kind: 'open_canvas', target: 'json' } },
  { id: 'tool-yaml', type: 'canvas', title: 'YAML Tool', description: 'YAML ↔ JSON conversion', icon: 'file-type', action: { kind: 'open_canvas', target: 'yaml' } },
  { id: 'tool-csv', type: 'canvas', title: 'CSV Viewer', description: 'Table view for CSV data', icon: 'table', action: { kind: 'open_canvas', target: 'csv' } },
  { id: 'tool-xml', type: 'canvas', title: 'XML Tool', description: 'XML formatter and validator', icon: 'layers', action: { kind: 'open_canvas', target: 'xml' } },

  // Canvas Tools - Utilities
  { id: 'tool-diff', type: 'canvas', title: 'Diff Tool', description: 'Text comparison utility', icon: 'split', action: { kind: 'open_canvas', target: 'diff' } },
  { id: 'tool-regex', type: 'canvas', title: 'Regex Tool', description: 'Regular expression tester', icon: 'search', action: { kind: 'open_canvas', target: 'regex' } },
  { id: 'tool-md', type: 'canvas', title: 'Markdown', description: 'GitHub-flavored markdown preview', icon: 'file-code', action: { kind: 'open_canvas', target: 'markdown' } },
  { id: 'tool-logs', type: 'canvas', title: 'Log Viewer', description: 'Log file highlighter and filter', icon: 'list', action: { kind: 'open_canvas', target: 'logs-viewer' } },

  // Canvas Tools - Cryptography & Security
  { id: 'tool-hash', type: 'canvas', title: 'Hash Generator', description: 'MD5, SHA, Bcrypt hashing', icon: 'hash', action: { kind: 'open_canvas', target: 'hash' } },
  { id: 'tool-base64', type: 'canvas', title: 'Base64 Tool', description: 'Base64 encoding and decoding', icon: 'file-text', action: { kind: 'open_canvas', target: 'base64' } },
  { id: 'tool-jwt', type: 'canvas', title: 'JWT Decoder', description: 'Inspect JWT headers and payloads', icon: 'shield', action: { kind: 'open_canvas', target: 'jwt' } },
  { id: 'tool-uuid', type: 'canvas', title: 'UUID Generator', description: 'Generate version 4 UUIDs', icon: 'zap', action: { kind: 'open_canvas', target: 'uuid' } },
  { id: 'tool-pass', type: 'canvas', title: 'Password Generator', description: 'Secure random password creation', icon: 'lock', action: { kind: 'open_canvas', target: 'password' } },
  { id: 'tool-hmac', type: 'canvas', title: 'HMAC Tool', description: 'Generate HMAC cryptographic signatures', icon: 'key', action: { kind: 'open_canvas', target: 'hmac' } },
  { id: 'tool-encrypt', type: 'canvas', title: 'Encryption Playground', description: 'AES-256-GCM/CBC encryption utility', icon: 'shield', action: { kind: 'open_canvas', target: 'encryption' } },

  // Commands
  { id: 'cmd-new-workspace', type: 'command', title: 'Create New Workspace', description: 'Initialize a clean project area', icon: 'plus-square', action: { kind: 'execute', target: 'create_workspace' } },
  { id: 'cmd-reload-plugins', type: 'command', title: 'Reload Plugins', description: 'Refresh all active plugins', icon: 'refresh-cw', action: { kind: 'execute', target: 'reload_plugins' } },
  { id: 'cmd-clear-cache', type: 'command', title: 'Clear Cache', description: 'Purge temporary data', icon: 'trash-2', action: { kind: 'execute', target: 'clear_cache' } },
  { id: 'cmd-restart-runtime', type: 'command', title: 'Restart Runtime', description: 'Reboot the execution engine (destructive)', icon: 'power', action: { kind: 'execute', target: 'restart_runtime' } },
];

export default async function (fastify: FastifyInstance) {
  fastify.get('/', async (request, _reply) => {
    const query = (request.query as any).q?.toLowerCase() || '';
    if (!query) return { results: [] };

    // 1. Static Registry Search
    const registryResults = REGISTRY.map(item => {
      let score = 0;
      const title = item.title.toLowerCase();
      const desc = item.description.toLowerCase();

      if (title === query) score = 100;
      else if (title.startsWith(query)) score = 80;
      else if (title.includes(query)) score = 60;
      else if (desc.includes(query)) score = 40;
      return { ...item, score };
    }).filter(item => item.score > 0);

    // 2. Database Notes Search
    let noteResults: SearchResult[] = [];
    try {
        const matchingNotes = db.prepare(`
            SELECT id, title, updated_at 
            FROM notes 
            WHERE title LIKE ? 
            LIMIT 5
        `).all(`%${query}%`) as any[];

        noteResults = matchingNotes.map(n => ({
            id: `note-${n.id}`,
            type: 'note',
            title: n.title,
            description: `Note updated ${new Date(n.updated_at).toLocaleDateString()}`,
            icon: 'file-text',
            action: { kind: 'open_canvas', target: 'notes', data: { noteId: n.id } },
            score: 70 // High priority for exact matches
        }));
    } catch (e) {
        console.error('Search DB error:', e);
    }

    // 3. Database Short URLs Search
    let shortUrlResults: SearchResult[] = [];
    try {
        const matchingUrls = db.prepare(`
            SELECT id, target, hit_count 
            FROM short_urls 
            WHERE id LIKE ? OR target LIKE ?
            LIMIT 5
        `).all(`%${query}%`, `%${query}%`) as any[];

        shortUrlResults = matchingUrls.map(u => ({
            id: `shorturl-${u.id}`,
            type: 'page', // Using page type for now, or could be 'link'
            title: `/u/${u.id}`,
            description: `Redirects to ${u.target} (${u.hit_count} hits)`,
            icon: 'link',
            action: { kind: 'open_canvas', target: 'short-urls', data: { shortUrlId: u.id } },
            score: 75
        }));
    } catch (e) {
        console.error('Search ShortUrls error:', e);
    }

    const allResults = [...registryResults, ...noteResults, ...shortUrlResults]
        .sort((a, b) => (b.score || 0) - (a.score || 0));

    return { query, results: allResults.slice(0, 10) };
  });
}