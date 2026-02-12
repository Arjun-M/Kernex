import type { FastifyInstance } from 'fastify';
import { getSetting, setSetting } from '../db.js';

const DEFAULT_SETTINGS = {
  // Appearance
  themeId: 'obsidian-black',
  fontSize: 14,
  uiDensity: 'normal',
  canvasGrid: true,
  canvasSnapToGrid: true,
  defaultNodeSize: { width: 400, height: 300 },

  // Workspace
  defaultWorkspaceId: 'default',
  autosaveIntervalSeconds: 30,
  maxUndoHistory: 50,
  snapshotFrequency: 'hourly',
  exportFormat: 'json',
  
  // Services
  ftpServerEnabled: false,
  ftpExternalIp: '', // Add explicit default for this too since we use it

  // Keyboard
  keybindings: {},
  dragSensitivity: 1.0,
  scrollZoomSpeed: 1.0,
  doubleClickAction: 'maximize',
  
  // Runtime (Security)
  scriptsEnabled: false,
  allowedLanguages: ['javascript', 'typescript'],
  outboundHttpEnabled: false,
  domainAllowlist: ['*.google.com', 'api.github.com'],
  requestTimeout: 5000,
  maxResponseSize: 1024 * 1024, // 1MB
  blockLocalNetwork: true,
  blockLocalhost: true,
  
  // Worker Limits
  maxWorkerTime: 86400000, // 1 day in ms
  maxWorkerMemory: 512, // MB
  maxConcurrentWorkers: 4,
  killOnTimeout: true,
  autoRestartOnCrash: true
};

export default async function (fastify: FastifyInstance) {
  fastify.get('/', async (_request, _reply) => {
    // Load all settings
    // In a real app with many settings, we might want to load them selectively or cache them.
    // For now, we iterate keys of DEFAULT_SETTINGS and fetch.
    const currentSettings: any = {};
    for (const key of Object.keys(DEFAULT_SETTINGS)) {
      currentSettings[key] = getSetting(key, (DEFAULT_SETTINGS as any)[key]);
    }
    return currentSettings;
  });

  fastify.post('/update', async (request, _reply) => {
    const updates = request.body as Record<string, any>;
    for (const [key, value] of Object.entries(updates)) {
      setSetting(key, value);
    }
    return { success: true };
  });
}
