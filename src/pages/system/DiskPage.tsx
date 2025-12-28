import React, { useEffect, useState, useCallback } from 'react';
import FileManager from '../../plugins/files/FileManager';
import { HardDrive, RefreshCw, Activity } from 'lucide-react';
import { authFetch } from '../../app/authFetch';
import { useTitle } from '../../hooks/useTitle';

const DiskPage: React.FC = () => {
  useTitle('Disk');
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchMetrics = useCallback(() => {
    setLoading(true);
    authFetch('/api/system/metrics')
      .then(res => res.json())
      .then(data => {
        setMetrics(data);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
        fetchMetrics();
    }, 0);
    const interval = setInterval(fetchMetrics, 5000);
    return () => {
        clearTimeout(timer);
        clearInterval(interval);
    };
  }, [fetchMetrics]);

  const formatBytes = (bytes: number | undefined | null) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', gap: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Disk Manager</h1>
        <button 
          onClick={fetchMetrics} 
          disabled={loading}
          style={{ 
            display: 'flex', alignItems: 'center', gap: 8, padding: '8px 16px', 
            borderRadius: 8, border: 'none', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)', cursor: 'pointer' 
          }}
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} /> Refresh
        </button>
      </div>

      {/* Filesystems */}
      <div className="card">
        <h3 style={{ marginTop: 0, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, fontSize: 16 }}>
          <HardDrive size={18} color="var(--accent-primary)" /> Connected Drives
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          {(metrics?.storage || []).map((disk: any, i: number) => (
            <div key={i} style={{ padding: 16, backgroundColor: 'var(--bg-tertiary)', borderRadius: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>{disk.mount}</span>
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{disk.type}</span>
              </div>
              <div style={{ height: 6, backgroundColor: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ width: `${disk.use}%`, height: '100%', backgroundColor: disk.use > 90 ? '#ef4444' : 'var(--accent-primary)' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-secondary)' }}>
                <span>{formatBytes(disk.used)} / {formatBytes(disk.size)}</span>
                <span>{disk.use.toFixed(1)}% full</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden', minHeight: 400 }}>
        <div style={{ padding: '15px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <Activity size={18} />
          <h3 style={{ margin: 0, fontSize: 16 }}>File Browser</h3>
        </div>
        <div style={{ flex: 1 }}>
            <FileManager /> 
        </div>
      </div>

      <style>{`
        .card {
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 20px;
        }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default DiskPage;