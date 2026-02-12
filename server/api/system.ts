/* eslint-disable @typescript-eslint/no-explicit-any */
import type { FastifyInstance } from 'fastify';
import os from 'os';
import si from 'systeminformation';
import fs from 'fs';
import path from 'path';

// Cache for heavy metrics
let metricsCache: any = null;
let lastMetricsFetch = 0;
const CACHE_TTL = 2000; // 2 seconds

// Cache for update check
let updateCache: any = null;
let lastUpdateCheck = 0;
const UPDATE_CACHE_TTL = 1000 * 60 * 20; // 20 minutes

// Helper to wrap si calls and prevent total failure if one fails
async function safeSi<T>(promise: Promise<T>, defaultValue: T): Promise<T> {
  try {
    return await promise;
  } catch (e) { // eslint-disable-line @typescript-eslint/no-unused-vars
    console.error('SystemInformation call failed');
    return defaultValue;
  }
}

class UpdateCheckError extends Error {
  public cause: unknown;
  public isRetryable: boolean;
  
  constructor(message: string, cause: unknown, isRetryable: boolean) {
    super(message);
    this.cause = cause;
    this.isRetryable = isRetryable;
  }
}

function parseChangelog(yaml: string, currentVersion: string, latestVersion: string) {
    const lines = yaml.split('\n');
    const changelog: { added: string[], fixed: string[], breaking: string[] } = {
        added: [],
        fixed: [],
        breaking: []
    };

    let currentSection: 'added' | 'fixed' | 'breaking' | null = null;
    let recording = false;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Check for version header (e.g., "0.2.1:")
        const versionMatch = trimmed.match(/^"?(\d+\.\d+\.\d+)"?:/);
        if (versionMatch) {
            const version = versionMatch[1];
            if (version === latestVersion) {
                recording = true;
            } else if (version === currentVersion) {
                // Stop if we reached current version
                break;
            }
            continue;
        }

        if (!recording) continue;

        if (trimmed.startsWith('added:')) currentSection = 'added';
        else if (trimmed.startsWith('fixed:')) currentSection = 'fixed';
        else if (trimmed.startsWith('breaking:')) currentSection = 'breaking';
        else if (trimmed.startsWith('-') && currentSection) {
            changelog[currentSection].push(trimmed.replace(/^- /, ''));
        }
    }

    return changelog;
}

function parseFullChangelog(yaml: string) {
    const lines = yaml.split('\n');
    const changelog: Record<string, { added: string[], fixed: string[], breaking: string[] }> = {};
    
    let currentVersion: string | null = null;
    let currentSection: 'added' | 'fixed' | 'breaking' | null = null;

    for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        const versionMatch = trimmed.match(/^"?(\d+\.\d+\.\d+)"?:/);
        if (versionMatch) {
            currentVersion = versionMatch[1];
            changelog[currentVersion] = { added: [], fixed: [], breaking: [] };
            continue;
        }

        if (!currentVersion) continue;

        if (trimmed.startsWith('added:')) currentSection = 'added';
        else if (trimmed.startsWith('fixed:')) currentSection = 'fixed';
        else if (trimmed.startsWith('breaking:')) currentSection = 'breaking';
        else if (trimmed.startsWith('-') && currentSection) {
            changelog[currentVersion][currentSection].push(trimmed.replace(/^- /, ''));
        }
    }
    return changelog;
}

export default async function (fastify: FastifyInstance) {

  // GET /api/system/changelog
  fastify.get('/changelog', async () => {
    try {
        const changelogPath = path.join(process.cwd(), 'changelog.yml');
        const yaml = fs.readFileSync(changelogPath, 'utf-8');
        return parseFullChangelog(yaml);
    } catch (e) {
        console.error('Failed to read changelog', e);
        return {};
    }
  });
  
  // GET /api/system/update-check
  fastify.get('/update-check', async () => {
    const now = Date.now();
    if (updateCache && (now - lastUpdateCheck < UPDATE_CACHE_TTL)) {
        return updateCache;
    }

    try {
        const pkgPath = path.join(process.cwd(), 'package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        const currentVersion = pkg.version;

        const headers = {
            'User-Agent': 'Kernex-Runtime-Updater'
        };

        // Use test repo for validation
        const repo = 'Arjun-M/Kernex';
        const baseUrl = `https://raw.githubusercontent.com/${repo}/main`;

        // Fetch release info from GitHub
        const releaseRes = await fetch(`${baseUrl}/release.json`, { headers });
        if (!releaseRes.ok) {
            throw new Error(`Failed to fetch release info (Status: ${releaseRes.status})`);
        }
        
        let releaseData;
        try {
            releaseData = await releaseRes.json();
        } catch (e) {
            const isRetryable = e instanceof SyntaxError;
            throw new UpdateCheckError('Failed to parse release JSON', e, isRetryable);
        }

        const latestVersion = (releaseData as any).version;
        const updateAvailable = latestVersion !== currentVersion;

        let changelog: { added: string[]; fixed: string[]; breaking: string[]; } = { added: [], fixed: [], breaking: [] };
        if (updateAvailable) {
            const changelogRes = await fetch(`${baseUrl}/changelog.yml`, { headers });
            if (changelogRes.ok) {
                const yaml = await changelogRes.text();
                changelog = parseChangelog(yaml, currentVersion, latestVersion);
            }
        }

        const result = {
            currentVersion,
            latestVersion,
            updateAvailable,
            breaking: (releaseData as any).breaking || false,
            releasedAt: (releaseData as any).releasedAt || new Date().toISOString().split('T')[0],
            changelog
        };

        updateCache = result;
        lastUpdateCheck = now;
        return result;
    } catch (error: any) {
        if (error instanceof UpdateCheckError) {
             console.error(`Update check failed (Retryable: ${error.isRetryable}):`, error.message);
        } else {
             console.error('Update check critical failure:', error);
        }
        
        // Fail silently or return basic info
        const pkgPath = path.join(process.cwd(), 'package.json');
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
        return {
            currentVersion: pkg.version,
            error: 'Unable to check for updates'
        };
    }
  });

  // GET /api/system/info - Static system information
  fastify.get('/info', async (_request, reply) => {
    try {
      const [
        cpu,
        osInfo,
        system,
        bios,
        baseboard,
        graphics,
        netInterfaces
      ] = await Promise.all([
        safeSi(si.cpu(), {} as any),
        safeSi(si.osInfo(), {} as any),
        safeSi(si.system(), {} as any),
        safeSi(si.bios(), {} as any),
        safeSi(si.baseboard(), {} as any),
        safeSi(si.graphics(), { controllers: [] } as any),
        safeSi(si.networkInterfaces(), [] as any)
      ]);

      return {
        timestamp: Date.now(),
        os: {
          platform: os.platform(),
          release: os.release(),
          hostname: os.hostname(),
          kernel: osInfo.kernel || 'Unknown',
          distro: osInfo.distro || 'Unknown',
          codename: osInfo.codename || '',
          arch: osInfo.arch || os.arch(),
        },
        cpu: {
          manufacturer: cpu.manufacturer || '',
          brand: cpu.brand || '',
          speed: cpu.speed || 0,
          cores: cpu.cores || 0,
          physicalCores: cpu.physicalCores || 0,
          processors: cpu.processors || 0,
          model: cpu.model || '',
        },
        hardware: {
          system: {
            manufacturer: system.manufacturer || '',
            model: system.model || '',
            version: system.version || '',
            serial: system.serial || '',
            uuid: system.uuid || '',
            sku: system.sku || '',
          },
          bios: {
            vendor: bios.vendor || '',
            version: bios.version || '',
            releaseDate: bios.releaseDate || '',
            revision: bios.revision || '',
          },
          baseboard: {
            manufacturer: baseboard.manufacturer || '',
            model: baseboard.model || '',
            version: baseboard.version || '',
            serial: baseboard.serial || '',
            assetTag: baseboard.assetTag || '',
          },
          gpu: (graphics.controllers || []).map((g: any) => ({
            model: g.model || '',
            vendor: g.vendor || '',
            vram: g.vram || 0,
            vramDynamic: g.vramDynamic || false,
          })),
        },
        network: (Array.isArray(netInterfaces) ? netInterfaces : []).map((iface: any) => ({
          iface: iface.iface || '',
          ip4: iface.ip4 || '',
          ip6: iface.ip6 || '',
          mac: iface.mac || '',
          internal: iface.internal || false,
          operstate: iface.operstate || '',
          type: iface.type || '',
        })),
        nodeVersion: process.version,
        appVersion: '0.1.0'
      };
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch system info' });
    }
  });

  // GET /api/system/metrics - Real-time system metrics
  fastify.get('/metrics', async (_request, reply) => {
    const now = Date.now();
    if (metricsCache && (now - lastMetricsFetch < CACHE_TTL)) {
      return metricsCache;
    }

    try {
      const [
        mem,
        currentLoad,
        cpuTemp,
        fsSize,
        disksIO,
        netStats,
        processes,
        battery,
        netConnections
      ] = await Promise.all([
        safeSi(si.mem(), { total: 0, free: 0, used: 0, active: 0, swaptotal: 0, swapused: 0, swapfree: 0 } as any),
        safeSi(si.currentLoad(), { currentLoad: 0, currentLoadUser: 0, currentLoadSystem: 0, currentLoadIdle: 0, cpus: [] } as any),
        safeSi(si.cpuTemperature(), { main: null, cores: [], max: null } as any),
        safeSi(si.fsSize(), [] as any),
        safeSi(si.disksIO(), { rIO_sec: 0, wIO_sec: 0 } as any),
        safeSi(si.networkStats(), [] as any),
        safeSi(si.processes(), { all: 0, running: 0, blocked: 0, sleeping: 0, list: [] } as any),
        safeSi(si.battery(), { hasBattery: false } as any),
        safeSi(si.networkConnections(), [] as any)
      ]);

      const appMemory = process.memoryUsage();

      const metrics = {
        timestamp: now,
        uptime: {
          system: os.uptime(),
          process: process.uptime()
        },
        memory: {
          total: mem.total || 0,
          free: mem.free || 0,
          used: mem.used || 0,
          active: mem.active || 0,
          available: mem.available || 0,
          buffcache: mem.buffcache || 0,
          swaptotal: mem.swaptotal || 0,
          swapused: mem.swapused || 0,
          swapfree: mem.swapfree || 0
        },
        appMemory: {
          rss: appMemory.rss,
          heapTotal: appMemory.heapTotal,
          heapUsed: appMemory.heapUsed,
          external: appMemory.external,
          arrayBuffers: appMemory.arrayBuffers
        },
        cpu: {
          currentLoad: currentLoad.currentLoad || 0,
          currentLoadUser: currentLoad.currentLoadUser || 0,
          currentLoadSystem: currentLoad.currentLoadSystem || 0,
          currentLoadIdle: currentLoad.currentLoadIdle || 0,
          cpus: (currentLoad.cpus || []).map((c: any) => ({ load: c.load || 0 })),
          temp: {
            main: cpuTemp.main,
            cores: cpuTemp.cores || [],
            max: cpuTemp.max
          },
          voltage: cpuTemp.voltage || null
        },
        storage: (Array.isArray(fsSize) ? fsSize : []).map((fs: any) => ({
          fs: fs.fs || '',
          type: fs.type || '',
          size: fs.size || 0,
          used: fs.used || 0,
          available: fs.available || 0,
          use: fs.use || 0,
          mount: fs.mount || ''
        })),
        disksIO: {
            rIO: disksIO.rIO || 0,
            wIO: disksIO.wIO || 0,
            tIO: disksIO.tIO || 0,
            rIO_sec: disksIO.rIO_sec || 0,
            wIO_sec: disksIO.wIO_sec || 0,
            tIO_sec: disksIO.tIO_sec || 0
        },
        networkTraffic: (Array.isArray(netStats) ? netStats : []).map((s: any) => ({
          iface: s.iface || '',
          operstate: s.operstate || '',
          rx_bytes: s.rx_bytes || 0,
          tx_bytes: s.tx_bytes || 0,
          rx_sec: s.rx_sec || 0,
          tx_sec: s.tx_sec || 0,
          ms: s.ms || 0
        })),
        networkConnections: (Array.isArray(netConnections) ? netConnections : []).map((c: any) => ({
          protocol: c.protocol,
          localAddress: c.localAddress,
          localPort: c.localPort,
          peerAddress: c.peerAddress,
          peerPort: c.peerPort,
          state: c.state,
          process: c.process
        })),
        processes: {
          all: processes.all || 0,
          running: processes.running || 0,
          blocked: processes.blocked || 0,
          sleeping: processes.sleeping || 0,
          list: (processes.list || []).slice(0, 100).map((p: any) => ({
            pid: p.pid || 0,
            name: p.name || '',
            pcpu: p.pcpu || 0,
            pmem: p.pmem || 0,
            user: p.user || '',
            state: p.state || ''
          }))
        },
        battery: {
          hasBattery: battery.hasBattery || false,
          cycleCount: battery.cycleCount || 0,
          isCharging: battery.isCharging || false,
          designedCapacity: battery.designedCapacity || 0,
          maxCapacity: battery.maxCapacity || 0,
          currentCapacity: battery.currentCapacity || 0,
          capacityUnit: battery.capacityUnit || '',
          percent: battery.percent || 0,
          type: battery.type || '',
          model: battery.model || '',
          manufacturer: battery.manufacturer || '',
          voltage: battery.voltage || null
        }
      };

      metricsCache = metrics;
      lastMetricsFetch = now;

      return metrics;
    } catch (error) {
      fastify.log.error(error);
      return reply.status(500).send({ error: 'Failed to fetch system metrics' });
    }
  });
}