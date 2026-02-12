import { useEffect, useState } from 'react';
import { 
  Activity, 
  Server, 
  Cpu, 
  HardDrive, 
  MemoryStick, 
  Wifi, 
  Clock, 
  Info,
  GitCommit,
  Shield,
  Zap,
  Layout,
  Terminal,
  FileText,
  Database
} from 'lucide-react';
import { authFetch } from '../app/authFetch';
import './KernexPage.css';

interface SystemMetrics {
  timestamp: number;
  uptime: { system: number; process: number };
  cpu: { currentLoad: number; temp: { main: number } };
  memory: { total: number; used: number; active: number };
  storage: Array<{ fs: string; size: number; used: number; use: number; mount: string }>;
  networkTraffic: Array<{ iface: string; rx_sec: number; tx_sec: number }>;
  battery: { hasBattery: boolean; percent: number; isCharging: boolean };
}

interface SystemInfo {
  os: { platform: string; distro: string; release: string; arch: string; hostname: string };
  cpu: { manufacturer: string; brand: string; cores: number; speed: number };
  hardware: { system: { model: string; manufacturer: string }; bios: { version: string } };
  nodeVersion: string;
}

const KernexPage = () => {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [info, setInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [changelog, setChangelog] = useState<any>(null);

  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const res = await authFetch('/api/system/info');
        if (res.ok) {
          setInfo(await res.json());
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchInfo();

    const fetchChangelog = async () => {
        try {
            const res = await authFetch('/api/system/changelog');
            if (res.ok) {
                setChangelog(await res.json());
            }
        } catch (e) {
            console.error(e);
        }
    };
    fetchChangelog();

    const fetchMetrics = async () => {
      try {
        const res = await authFetch('/api/system/metrics');
        if (res.ok) {
          setMetrics(await res.json());
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    
    fetchMetrics();
    const interval = setInterval(fetchMetrics, 2000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${d}d ${h}h ${m}m`;
  };

  if (loading && !info) {
    return (
        <div className="kernex-loading">
            <img src="/kernex.png" alt="Loading..." width="64" height="64" className="spinning-logo" />
            <div className="loading-text">
                <h3>Initializing Kernex OS...</h3>
                <p>Connecting to system metrics</p>
            </div>
        </div>
    );
  }

  return (
    <div className="kernex-page">
      <div className="kernex-container">
        <header className="kernex-header">
          <div className="header-title">
            <img src="/kernex.png" alt="Kernex" className="kernex-logo" />
            <h1>Kernex</h1>
            <span className="version-badge">v0.1.2</span>
          </div>
          <div className="header-controls">
              <nav className="kernex-nav">
                  <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>
                      <Activity size={16} /> Dashboard
                  </button>
                  <button className={activeTab === 'about' ? 'active' : ''} onClick={() => setActiveTab('about')}>
                      <Info size={16} /> About
                  </button>
                  <button className={activeTab === 'changelog' ? 'active' : ''} onClick={() => setActiveTab('changelog')}>
                      <GitCommit size={16} /> Changelog
                  </button>
              </nav>
          </div>
        </header>

        <div className="kernex-content">
          {activeTab === 'dashboard' && (
              <div className="dashboard-grid fade-in">
                  {/* Status Bar (Mobile) / Summary */}
                  <div className="status-bar-mobile">
                       <div className="status-item">
                          <Clock size={16} />
                          <span>Up: {metrics ? formatTime(metrics.uptime.system) : '-'}</span>
                      </div>
                      {info && (
                          <div className="status-item">
                              <Server size={16} />
                              <span>{info.os.hostname}</span>
                          </div>
                      )}
                  </div>

                  {/* CPU Card */}
                  <div className="metric-card">
                      <div className="card-header">
                          <Cpu size={20} />
                          <h3>CPU Load</h3>
                      </div>
                      <div className="card-body">
                          <div className="big-value">{metrics?.cpu.currentLoad.toFixed(1)}%</div>
                          <div className="progress-bar-bg">
                              <div 
                                  className="progress-bar-fill cpu" 
                                  style={{ width: `${metrics?.cpu.currentLoad}%` }}
                              />
                          </div>
                          <div className="sub-text">
                              {info?.cpu.brand} <br/>
                              {info?.cpu.cores} Cores @ {info?.cpu.speed}GHz
                          </div>
                      </div>
                  </div>

                  {/* Memory Card */}
                  <div className="metric-card">
                      <div className="card-header">
                          <MemoryStick size={20} />
                          <h3>Memory</h3>
                      </div>
                      <div className="card-body">
                          <div className="big-value">
                              {metrics ? ((metrics.memory.used / metrics.memory.total) * 100).toFixed(1) : 0}%
                          </div>
                          <div className="progress-bar-bg">
                              <div 
                                  className="progress-bar-fill memory" 
                                  style={{ width: `${metrics ? (metrics.memory.used / metrics.memory.total) * 100 : 0}%` }}
                              />
                          </div>
                          <div className="sub-text">
                              Used: {metrics ? formatBytes(metrics.memory.used) : '-'} <br/>
                              Total: {metrics ? formatBytes(metrics.memory.total) : '-'}
                          </div>
                      </div>
                  </div>

                  {/* Storage Card */}
                  <div className="metric-card">
                      <div className="card-header">
                          <HardDrive size={20} />
                          <h3>Storage (Root)</h3>
                      </div>
                      <div className="card-body">
                          {metrics?.storage[0] ? (
                              <>
                                  <div className="big-value">{metrics.storage[0].use.toFixed(1)}%</div>
                                  <div className="progress-bar-bg">
                                      <div 
                                          className="progress-bar-fill storage" 
                                          style={{ width: `${metrics.storage[0].use}%` }}
                                      />
                                  </div>
                                  <div className="sub-text">
                                      Free: {formatBytes(metrics.storage[0].size - metrics.storage[0].used)} <br/>
                                      Total: {formatBytes(metrics.storage[0].size)}
                                  </div>
                              </>
                          ) : (
                              <div className="sub-text">No storage info</div>
                          )}
                      </div>
                  </div>

                  {/* Network Card */}
                  <div className="metric-card">
                      <div className="card-header">
                          <Wifi size={20} />
                          <h3>Network</h3>
                      </div>
                      <div className="card-body">
                          <div className="network-stats">
                              <div className="net-row">
                                  <span>⬇ RX:</span>
                                  <span>{metrics ? formatBytes(metrics.networkTraffic[0]?.rx_sec || 0) : 0}/s</span>
                              </div>
                              <div className="net-row">
                                  <span>⬆ TX:</span>
                                  <span>{metrics ? formatBytes(metrics.networkTraffic[0]?.tx_sec || 0) : 0}/s</span>
                              </div>
                          </div>
                          <div className="sub-text">
                              IP: {info?.os.hostname}
                          </div>
                      </div>
                  </div>

                   <div className="info-section full-width">
                      <h2><Info size={20}/> System Details</h2>
                      <div className="info-table-wrapper">
                          <table className="info-table">
                              <tbody>
                                  <tr>
                                      <td>OS Platform</td>
                                      <td>{info?.os.distro} {info?.os.release} ({info?.os.arch})</td>
                                  </tr>
                                  <tr>
                                      <td>Kernel</td>
                                      <td>{info?.os.platform} {info?.os.release}</td>
                                  </tr>
                                  <tr>
                                      <td>System Model</td>
                                      <td>{info?.hardware.system.manufacturer} {info?.hardware.system.model}</td>
                                  </tr>
                                  <tr>
                                      <td>Node.js Version</td>
                                      <td>{info?.nodeVersion}</td>
                                  </tr>
                              </tbody>
                          </table>
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'about' && (
              <div className="about-section fade-in">
                  <div className="hero-banner">
                      <h2>Your Personal Programmable Workspace</h2>
                      <p>A self-hosted, infinite-canvas OS for your developer tools.</p>
                  </div>
                  
                  <div className="features-grid">
                      <div className="feature-item">
                          <Layout size={32} />
                          <h3>Infinite Canvas</h3>
                          <p>Pan, zoom, and organize tools spatially. No overlapping windows, just a pure, infinite workspace.</p>
                      </div>
                      <div className="feature-item">
                          <Terminal size={32} />
                          <h3>Integrated Terminal</h3>
                          <p>Full xterm.js shell access to your host machine. Secure, persistent, and context-aware.</p>
                      </div>
                      <div className="feature-item">
                          <Zap size={32} />
                          <h3>Plugin System</h3>
                          <p>Extensible via simple HTML/React plugins. Build your own tools or use the built-in suite.</p>
                      </div>
                      <div className="feature-item">
                          <FileText size={32} />
                          <h3>File Manager</h3>
                          <p>Browse, edit, and manage your server's filesystem directly from the browser.</p>
                      </div>
                      <div className="feature-item">
                          <Database size={32} />
                          <h3>SQLite Manager</h3>
                          <p>Built-in database management for workspace-specific data and system logs.</p>
                      </div>
                      <div className="feature-item">
                          <Shield size={32} />
                          <h3>Secure by Design</h3>
                          <p>Self-hosted, encrypted secrets, and no cloud dependencies. Your data stays with you.</p>
                      </div>
                  </div>
              </div>
          )}

          {activeTab === 'changelog' && (
              <div className="changelog-section fade-in">
                  <h2>Project Changelog</h2>
                  {changelog ? (
                      Object.keys(changelog).map(version => (
                          <div key={version} className="changelog-entry">
                              <div className="version-header">
                                  <h3>v{version}</h3>
                              </div>
                              <div className="version-content">
                                  {changelog[version].added?.length > 0 && (
                                      <div className="change-group added">
                                          <h4>Added</h4>
                                          <ul>
                                              {changelog[version].added.map((item: string, i: number) => (
                                                  <li key={i}>{item}</li>
                                              ))}
                                          </ul>
                                      </div>
                                  )}
                                  {changelog[version].fixed?.length > 0 && (
                                      <div className="change-group fixed">
                                          <h4>Fixed</h4>
                                          <ul>
                                              {changelog[version].fixed.map((item: string, i: number) => (
                                                  <li key={i}>{item}</li>
                                              ))}
                                          </ul>
                                      </div>
                                  )}
                                  {changelog[version].breaking?.length > 0 && (
                                      <div className="change-group breaking">
                                          <h4>Breaking</h4>
                                          <ul>
                                              {changelog[version].breaking.map((item: string, i: number) => (
                                                  <li key={i}>{item}</li>
                                              ))}
                                          </ul>
                                      </div>
                                  )}
                              </div>
                          </div>
                      ))
                  ) : (
                      <div className="loading-changelog">Loading changelog...</div>
                  )}
              </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default KernexPage;
