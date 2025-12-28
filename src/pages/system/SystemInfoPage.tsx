import React, { useEffect, useState, useCallback } from 'react';
import { 
  Monitor, Activity, 
  Database, Cpu as CpuIcon,
  Server, RefreshCw, AlertCircle, Cpu, HardDrive, Network
} from 'lucide-react';
import { authFetch } from '../../app/authFetch';
import { useTitle } from '../../hooks/useTitle';

interface SystemInfo {
  os: {
    platform: string;
    release: string;
    hostname: string;
    kernel: string;
    distro: string;
    arch: string;
  };
  cpu: {
    brand: string;
    speed: number;
    cores: number;
    physicalCores: number;
    model: string;
    manufacturer: string;
  };
  hardware: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    system: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    bios: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    baseboard: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gpu: any[];
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  network: any[];
  nodeVersion: string;
  appVersion: string;
}

interface SystemMetrics {
  timestamp: number;
  uptime: {
    system: number;
    process: number;
  };
  memory: {
    total: number;
    free: number;
    used: number;
    active: number;
    available: number;
    swaptotal: number;
    swapused: number;
    swapfree: number;
  };
  appMemory: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
  };
  cpu: {
    currentLoad: number;
    cpus: { load: number }[];
    temp: { main: number | null };
    voltage: number | null;
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  storage: any[];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  disksIO: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  networkTraffic: any[];
  processes: {
    all: number;
    running: number;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    list: any[];
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  battery: any;
}

const formatBytes = (bytes: number | undefined | null) => {
  if (bytes === undefined || bytes === null || isNaN(Number(bytes))) return 'N/A';
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatUptime = (seconds: number | undefined | null) => {
  if (seconds === undefined || seconds === null || isNaN(Number(seconds))) return 'N/A';
  const d = Math.floor(seconds / (3600 * 24));
  const h = Math.floor((seconds % (3600 * 24)) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${d}d ${h}h ${m}m ${s}s`;
};

const MetricBar: React.FC<{ label: string, value: number, total: number, color?: string }> = ({ label, value, total, color = 'var(--accent-primary)' }) => {
  const safeValue = isNaN(value) ? 0 : value;
  const safeTotal = isNaN(total) || total === 0 ? 1 : total;
  const percentage = Math.min(100, Math.max(0, (safeValue / safeTotal) * 100));
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
        <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
        <span>{percentage.toFixed(1)}%</span>
      </div>
      <div style={{ height: 6, backgroundColor: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${percentage}%`, height: '100%', backgroundColor: color, transition: 'width 0.3s ease' }} />
      </div>
    </div>
  );
};

const InfoRow: React.FC<{ label: string, value: any }> = ({ label, value }) => (
  <tr>
    <td style={{ padding: '6px 0', color: 'var(--text-secondary)', fontSize: 13, width: '40%' }}>{label}</td>
    <td style={{ padding: '6px 0', fontSize: 13, fontWeight: 500 }}>{value ?? <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>N/A</span>}</td>
  </tr>
);

const SystemInfoPage: React.FC = () => {
  useTitle('System Info');
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(3000);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchInfo = useCallback(() => {
    authFetch('/api/system/info')
      .then(res => {
        if (!res.ok) throw new Error('Status: ' + res.status);
        return res.json();
      })
      .then(setInfo)
      .catch((e) => setError('Failed to fetch system info: ' + e.message));
  }, []);

  const fetchMetrics = useCallback(() => {
    setIsRefreshing(true);
    authFetch('/api/system/metrics')
      .then(res => {
        if (!res.ok) throw new Error('Status: ' + res.status);
        return res.json();
      })
      .then(setMetrics)
      .catch(err => {
        console.error('Failed to fetch metrics', err);
        // Don't set global error if we already have some data, just log it
      })
      .finally(() => setIsRefreshing(false));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
        fetchInfo();
        fetchMetrics();
    }, 0);
    return () => clearTimeout(timer);
  }, [fetchInfo, fetchMetrics]);

  useEffect(() => {
    const timer = setInterval(fetchMetrics, refreshInterval);
    return () => clearInterval(timer);
  }, [fetchMetrics, refreshInterval]);

  if (error) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <AlertCircle size={48} color="#ef4444" style={{ marginBottom: 16 }} />
        <h3>{error}</h3>
        <button onClick={() => { setError(null); fetchInfo(); fetchMetrics(); }} className="btn btn-primary" style={{ marginTop: 20 }}>
          Retry
        </button>
      </div>
    );
  }

  if (!info || !metrics) {
    return <div style={{ padding: 20, color: 'var(--text-secondary)' }}>Gathering system metrics...</div>;
  }

  // Safe access wrappers
  const os = info?.os || {};
  const cpuInfo = info?.cpu || {};
  const hardware = info?.hardware || { system: {}, bios: {}, baseboard: {}, gpu: [] };
  const netInterfaces = info?.network || [];
  
  const uptime = metrics?.uptime || { system: 0, process: 0 };
  const memory = metrics?.memory || { total: 0, free: 0, used: 0, active: 0, available: 0, swaptotal: 0, swapused: 0, swapfree: 0 };
  const appMemory = metrics?.appMemory || { rss: 0, heapTotal: 0, heapUsed: 0, external: 0 };
  const cpuMetrics = metrics?.cpu || { currentLoad: 0, cpus: [], temp: { main: null }, voltage: null };
  const storage = metrics?.storage || [];
  const networkTraffic = metrics?.networkTraffic || [];
  const processes = metrics?.processes || { all: 0, running: 0, list: [] };
  const battery = metrics?.battery || { hasBattery: false };

  return (
    <div style={{ paddingBottom: 40 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Kernex Runtime Monitor</h1>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
            Last updated: {metrics?.timestamp ? new Date(metrics.timestamp).toLocaleTimeString() : 'N/A'}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
            Refresh: 
            <select 
              value={refreshInterval} 
              onChange={(e) => setRefreshInterval(Number(e.target.value))}
              style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            >
              <option value={1000}>1s</option>
              <option value={3000}>3s</option>
              <option value={5000}>5s</option>
              <option value={10000}>10s</option>
            </select>
          </div>
          <button 
            onClick={fetchMetrics} 
            disabled={isRefreshing}
            style={{ 
              padding: '8px 12px', 
              borderRadius: 6, 
              border: 'none', 
              backgroundColor: 'var(--bg-tertiary)', 
              color: 'var(--text-primary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <RefreshCw size={14} className={isRefreshing ? 'spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 20 }}>
        
        {/* OS & Uptime */}
        <section className="card">
          <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 10, fontSize: 16 }}>
            <Monitor size={18} color="var(--accent-primary)" /> Operating System
          </h3>
          <table style={{ width: '100%' }}>
            <tbody>
              <InfoRow label="Distribution" value={os.distro} />
              <InfoRow label="Kernel" value={os.kernel} />
              <InfoRow label="Architecture" value={os.arch} />
              <InfoRow label="Hostname" value={os.hostname} />
              <InfoRow label="System Uptime" value={formatUptime(uptime.system)} />
              <InfoRow label="Process Uptime" value={formatUptime(uptime.process)} />
            </tbody>
          </table>
        </section>

        {/* CPU Performance */}
        <section className="card">
          <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 10, fontSize: 16 }}>
            <CpuIcon size={18} color="#f59e0b" /> CPU Performance
          </h3>
          <div style={{ marginBottom: 20 }}>
            <MetricBar label="Total CPU Load" value={cpuMetrics.currentLoad} total={100} color="#f59e0b" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: 8 }}>
            {(cpuMetrics.cpus || []).map((c, i) => (
              <div key={i} style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 10, color: 'var(--text-secondary)', marginBottom: 4 }}>#{i}</div>
                <div style={{ height: 40, backgroundColor: 'var(--bg-tertiary)', borderRadius: 3, position: 'relative', overflow: 'hidden' }}>
                  <div style={{ 
                    position: 'absolute', 
                    bottom: 0, 
                    left: 0, 
                    right: 0, 
                    height: `${c?.load || 0}%`, 
                    backgroundColor: '#fbbf24',
                    transition: 'height 0.3s ease'
                  }} />
                </div>
                <div style={{ fontSize: 9, marginTop: 4 }}>{c?.load?.toFixed(0) || 0}%</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between' }}>
             <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Temp</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{cpuMetrics.temp?.main ? `${cpuMetrics.temp.main}°C` : 'N/A'}</div>
             </div>
             <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Voltage</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{cpuMetrics.voltage ? `${cpuMetrics.voltage}V` : 'N/A'}</div>
             </div>
             <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Cores</div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>{cpuInfo.cores || 'N/A'}</div>
             </div>
          </div>
        </section>

        {/* Memory Usage */}
        <section className="card">
          <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 10, fontSize: 16 }}>
            <Activity size={18} color="#ec4899" /> Memory
          </h3>
          <MetricBar label="Physical Memory" value={memory.used} total={memory.total} color="#ec4899" />
          <MetricBar label="Swap Space" value={memory.swapused} total={memory.swaptotal} color="#8b5cf6" />
          
          <div style={{ marginTop: 20 }}>
            <h4 style={{ fontSize: 13, margin: '0 0 8px 0', color: 'var(--text-secondary)' }}>Application Memory (Heap)</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
                <span>{formatBytes(appMemory.heapUsed)} used of {formatBytes(appMemory.heapTotal)}</span>
            </div>
            <div style={{ height: 6, backgroundColor: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ 
                    width: `${appMemory.heapTotal > 0 ? (appMemory.heapUsed / appMemory.heapTotal) * 100 : 0}%`, 
                    height: '100%', 
                    backgroundColor: '#10b981' 
                }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>RSS</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{formatBytes(appMemory.rss)}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>Available</div>
              <div style={{ fontSize: 14, fontWeight: 500 }}>{formatBytes(memory.available)}</div>
            </div>
          </div>
        </section>

        {/* Storage */}
        <section className="card">
          <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 10, fontSize: 16 }}>
            <HardDrive size={18} color="#06b6d4" /> Storage
          </h3>
          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            {(storage || []).map((disk, i) => (
              <div key={i} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }}>
                  <span style={{ fontWeight: 500 }}>{disk?.mount || 'Unknown'} <span style={{ color: 'var(--text-secondary)', fontWeight: 400 }}>({disk?.type || 'N/A'})</span></span>
                  <span>{(disk?.use || 0).toFixed(1)}%</span>
                </div>
                <div style={{ height: 6, backgroundColor: 'var(--bg-tertiary)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ width: `${disk?.use || 0}%`, height: '100%', backgroundColor: (disk?.use || 0) > 90 ? '#ef4444' : '#06b6d4' }} />
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4 }}>
                  {formatBytes(disk?.used)} / {formatBytes(disk?.size)} free: {formatBytes(disk?.available)}
                </div>
              </div>
            ))}
            {(!storage || storage.length === 0) && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No storage info available</div>}
          </div>
        </section>

        {/* Network */}
        <section className="card">
          <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 10, fontSize: 16 }}>
            <Network size={18} color="#3b82f6" /> Network
          </h3>
          <div style={{ marginBottom: 20 }}>
            <h4 style={{ fontSize: 12, margin: '0 0 8px 0', color: 'var(--text-secondary)' }}>Active Traffic</h4>
            {(networkTraffic || []).map((net, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, backgroundColor: 'var(--bg-tertiary)', padding: 8, borderRadius: 6 }}>
                <span style={{ fontWeight: 600 }}>{net?.iface || 'Unknown'}</span>
                <span style={{ color: '#10b981' }}>↓ {formatBytes(net?.rx_sec)}/s</span>
                <span style={{ color: '#3b82f6' }}>↑ {formatBytes(net?.tx_sec)}/s</span>
              </div>
            ))}
            {(!networkTraffic || networkTraffic.length === 0) && <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>No active traffic data</div>}
          </div>
          <h4 style={{ fontSize: 12, margin: '0 0 8px 0', color: 'var(--text-secondary)' }}>Interfaces</h4>
          <div style={{ maxHeight: 150, overflowY: 'auto' }}>
            <table style={{ width: '100%', fontSize: 12 }}>
              <tbody>
                {(netInterfaces || []).filter(n => n?.ip4 || n?.ip6).map((n, i) => (
                  <tr key={i}>
                    <td style={{ padding: '4px 0', fontWeight: 600 }}>{n?.iface || 'N/A'}</td>
                    <td style={{ padding: '4px 0', color: 'var(--text-secondary)' }}>{n?.ip4 || n?.ip6}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Active Processes */}
        <section className="card">
          <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 10, fontSize: 16 }}>
            <Activity size={18} color="#ef4444" /> Top Processes
          </h3>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)' }}>
                  <th style={{ padding: '8px 4px' }}>PID</th>
                  <th style={{ padding: '8px 4px' }}>Name</th>
                  <th style={{ padding: '8px 4px' }}>CPU%</th>
                  <th style={{ padding: '8px 4px' }}>MEM%</th>
                </tr>
              </thead>
              <tbody>
                {(processes.list || []).map((p, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--bg-tertiary)' }}>
                    <td style={{ padding: '8px 4px', color: 'var(--text-secondary)' }}>{p?.pid || 'N/A'}</td>
                    <td style={{ padding: '8px 4px', fontWeight: 500, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p?.name || 'Unknown'}</td>
                    <td style={{ padding: '8px 4px' }}>{p?.pcpu?.toFixed(1) || 0}</td>
                    <td style={{ padding: '8px 4px' }}>{p?.pmem?.toFixed(1) || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 12, fontSize: 11, color: 'var(--text-secondary)', textAlign: 'center' }}>
            {processes.all || 0} processes total ({processes.running || 0} running)
          </div>
        </section>

        {/* Hardware Details */}
        <section className="card" style={{ gridColumn: '1 / -1' }}>
          <h3 style={{ margin: '0 0 16px 0', display: 'flex', alignItems: 'center', gap: 10, fontSize: 16 }}>
            <Server size={18} color="var(--text-primary)" /> Hardware Information
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 30 }}>
            <div>
              <h4 style={{ fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Cpu size={16} /> Processor
              </h4>
              <table style={{ width: '100%' }}>
                <tbody>
                  <InfoRow label="Model" value={cpuInfo.model} />
                  <InfoRow label="Manufacturer" value={cpuInfo.manufacturer} />
                  <InfoRow label="Base Speed" value={cpuInfo.speed ? `${cpuInfo.speed} GHz` : 'N/A'} />
                  <InfoRow label="Physical Cores" value={cpuInfo.physicalCores} />
                </tbody>
              </table>
            </div>
            <div>
              <h4 style={{ fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Database size={16} /> Motherboard & BIOS
              </h4>
              <table style={{ width: '100%' }}>
                <tbody>
                  <InfoRow label="Manufacturer" value={hardware.baseboard?.manufacturer} />
                  <InfoRow label="Model" value={hardware.baseboard?.model} />
                  <InfoRow label="BIOS Vendor" value={hardware.bios?.vendor} />
                  <InfoRow label="BIOS Version" value={hardware.bios?.version} />
                </tbody>
              </table>
            </div>
            <div>
              <h4 style={{ fontSize: 14, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Monitor size={16} /> Graphics & Power
              </h4>
              <table style={{ width: '100%' }}>
                <tbody>
                  {(hardware.gpu || []).map((g: any, i: number) => (
                    <InfoRow key={i} label={`GPU ${i}`} value={g?.model} />
                  ))}
                  {battery.hasBattery && (
                    <>
                      <InfoRow label="Battery" value={`${battery.percent}% (${battery.isCharging ? 'Charging' : 'Discharging'})`} />
                      <InfoRow label="Power Source" value={battery.isCharging ? 'AC' : 'Battery'} />
                    </>
                  )}
                  {!battery.hasBattery && <InfoRow label="Power" value="AC Power" />}
                </tbody>
              </table>
            </div>
          </div>
        </section>

      </div>
      
      <style>{`
        .card {
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SystemInfoPage;