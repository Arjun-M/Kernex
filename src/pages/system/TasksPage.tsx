import { useEffect, useState } from 'react';
import { Activity, Server, Search } from 'lucide-react';
import { authFetch } from '../../app/authFetch';
import { useTitle } from '../../hooks/useTitle';

const TasksPage = () => {
  useTitle('Tasks');
  const [appTasks, setAppTasks] = useState<any>(null);
  const [systemMetrics, setSystemMetrics] = useState<any>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchAll = () => {
      authFetch('/api/tasks').then(res => res.json()).then(setAppTasks).catch(err => console.error('Tasks fetch failed', err));
      authFetch('/api/system/metrics').then(res => res.json()).then(setSystemMetrics).catch(err => console.error('Metrics fetch failed', err));
    };

    fetchAll();
    const interval = setInterval(fetchAll, 3000);
    return () => clearInterval(interval);
  }, []);

  const formatBytes = (bytes: number | undefined | null) => {
    if (bytes === undefined || bytes === null || isNaN(Number(bytes))) return '0 MB';
    return (Number(bytes) / 1024 / 1024).toFixed(2) + ' MB';
  };

  const filteredProcesses = (systemMetrics?.processes?.list || []).filter((p: any) => {
    if (!p) return false;
    const name = p.name || '';
    const pid = p.pid?.toString() || '';
    const user = p.user || '';
    const s = search.toLowerCase();
    return name.toLowerCase().includes(s) || pid.includes(s) || user.toLowerCase().includes(s);
  });

  return (
    <div>
      <h1 style={{ marginBottom: 24, fontSize: 24, fontWeight: 700 }}>Task Manager</h1>

      {/* App Internals */}
      <section style={{ marginBottom: 40 }}>
        <h2 style={{ fontSize: 18, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Server size={20} color="var(--accent-primary)" /> Application Runtime
        </h2>
        {appTasks?.mainProcess ? (
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
              <div className="card">
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Main PID</div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{appTasks.mainProcess.pid || 'N/A'}</div>
              </div>
              <div className="card">
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>RSS Memory</div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{formatBytes(appTasks.mainProcess.memory?.rss)}</div>
              </div>
              <div className="card">
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Heap Used</div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{formatBytes(appTasks.mainProcess.memory?.heapUsed)}</div>
              </div>
              <div className="card">
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>Uptime</div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{appTasks.mainProcess.uptime ? Math.floor(appTasks.mainProcess.uptime) : 0}s</div>
              </div>
           </div>
        ) : <p style={{ color: 'var(--text-secondary)' }}>Loading runtime data...</p>}
      </section>

      {/* Host Processes */}
      <section>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ fontSize: 18, margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Activity size={20} color="#ef4444" /> Host Processes
          </h2>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
            <input 
              type="text" 
              placeholder="Search processes..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ padding: '6px 10px 6px 30px', borderRadius: 6, border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', fontSize: 13, color: 'var(--text-primary)' }}
            />
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', backgroundColor: 'var(--bg-tertiary)' }}>
                  <th style={{ padding: '12px 16px' }}>PID</th>
                  <th style={{ padding: '12px 16px' }}>Name</th>
                  <th style={{ padding: '12px 16px' }}>User</th>
                  <th style={{ padding: '12px 16px' }}>CPU%</th>
                  <th style={{ padding: '12px 16px' }}>Mem%</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredProcesses.map((p: any, i: number) => {
                  if (!p) return null;
                  const pcpu = typeof p.pcpu === 'number' ? p.pcpu : 0;
                  const pmem = typeof p.pmem === 'number' ? p.pmem : 0;
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--bg-tertiary)' }}>
                      <td style={{ padding: '10px 16px', color: 'var(--text-secondary)' }}>{p.pid || 'N/A'}</td>
                      <td style={{ padding: '10px 16px', fontWeight: 600 }}>{p.name || 'Unknown'}</td>
                      <td style={{ padding: '10px 16px' }}>{p.user || 'Unknown'}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 40, height: 4, backgroundColor: 'var(--bg-tertiary)', borderRadius: 2 }}>
                            <div style={{ width: `${Math.min(100, pcpu)}%`, height: '100%', backgroundColor: pcpu > 50 ? '#ef4444' : '#10b981', borderRadius: 2 }} />
                          </div>
                          {pcpu.toFixed(1)}%
                        </div>
                      </td>
                      <td style={{ padding: '10px 16px' }}>{pmem.toFixed(1)}%</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ 
                          fontSize: 11, 
                          padding: '2px 6px', 
                          borderRadius: 10, 
                          backgroundColor: p.state === 'running' ? '#10b98120' : '#66620',
                          color: p.state === 'running' ? '#10b981' : 'var(--text-secondary)',
                          border: `1px solid ${p.state === 'running' ? '#10b98140' : '#66640'}`
                        }}>
                          {p.state || 'unknown'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredProcesses.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>
              {systemMetrics ? 'No matching processes found.' : 'Loading host processes...'}
            </div>
          )}
        </div>
      </section>

      <style>{`
        .card {
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 16px;
        }
      `}</style>
    </div>
  );
};

export default TasksPage;