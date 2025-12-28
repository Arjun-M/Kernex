import React, { useEffect, useState, useCallback } from 'react';
import { Network, ArrowDown, ArrowUp, Globe, ShieldCheck } from 'lucide-react';
import { authFetch } from '../../app/authFetch';
import { useTitle } from '../../hooks/useTitle';

const NetworkPage: React.FC = () => {
  useTitle('Network');
  const [metrics, setMetrics] = useState<any>(null);
  const [info, setInfo] = useState<any>(null);
  const [, setLoading] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      authFetch('/api/system/info').then(res => res.json()),
      authFetch('/api/system/metrics').then(res => res.json())
    ]).then(([infoData, metricsData]) => {
      setInfo(infoData);
      setMetrics(metricsData);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
        fetchData();
    }, 0);
    const interval = setInterval(fetchData, 3000);
    return () => {
        clearTimeout(timer);
        clearInterval(interval);
    };
  }, [fetchData]);

  const formatBytes = (bytes: number | undefined | null) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Network Monitor</h1>

      {/* Real-time Traffic */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        {metrics?.networkTraffic?.map((iface: any, i: number) => (
          <div key={i} className="card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Network size={20} color="var(--accent-primary)" />
                <span style={{ fontWeight: 700 }}>{iface.iface}</span>
              </div>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, backgroundColor: iface.operstate === 'up' ? '#10b98120' : '#ef444420', color: iface.operstate === 'up' ? '#10b981' : '#ef4444' }}>
                {iface.operstate.toUpperCase()}
              </span>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4 }}>
                   <ArrowDown size={14} color="#10b981" /> Download
                </div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{formatBytes(iface.rx_sec)}/s</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Total: {formatBytes(iface.rx_bytes)}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)', marginBottom: 4, justifyContent: 'flex-end' }}>
                   Upload <ArrowUp size={14} color="#3b82f6" />
                </div>
                <div style={{ fontSize: 18, fontWeight: 600 }}>{formatBytes(iface.tx_sec)}/s</div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Total: {formatBytes(iface.tx_bytes)}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Interfaces & IP */}
      <div className="card">
        <h3 style={{ marginTop: 0, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, fontSize: 16 }}>
          <Globe size={18} color="#8b5cf6" /> Network Interfaces
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '12px 16px' }}>Interface</th>
                <th style={{ padding: '12px 16px' }}>Type</th>
                <th style={{ padding: '12px 16px' }}>IPv4 Address</th>
                <th style={{ padding: '12px 16px' }}>MAC Address</th>
                <th style={{ padding: '12px 16px' }}>Internal</th>
              </tr>
            </thead>
            <tbody>
              {info?.network?.map((iface: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--bg-tertiary)' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600 }}>{iface.iface}</td>
                  <td style={{ padding: '12px 16px' }}>{iface.type}</td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace' }}>{iface.ip4 || 'N/A'}</td>
                  <td style={{ padding: '12px 16px', fontFamily: 'monospace', fontSize: 11 }}>{iface.mac}</td>
                  <td style={{ padding: '12px 16px' }}>{iface.internal ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Active Connections */}
      <div className="card">
        <h3 style={{ marginTop: 0, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10, fontSize: 16 }}>
          <ShieldCheck size={18} color="#10b981" /> Active Connections
        </h3>
        <div style={{ overflowX: 'auto', maxHeight: 400 }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', position: 'sticky', top: 0, backgroundColor: 'var(--bg-secondary)' }}>
                <th style={{ padding: '10px 16px' }}>Proto</th>
                <th style={{ padding: '10px 16px' }}>Local Address</th>
                <th style={{ padding: '10px 16px' }}>Peer Address</th>
                <th style={{ padding: '10px 16px' }}>State</th>
                <th style={{ padding: '10px 16px' }}>Process</th>
              </tr>
            </thead>
            <tbody>
              {metrics?.networkConnections?.map((conn: any, i: number) => (
                <tr key={i} style={{ borderBottom: '1px solid var(--bg-tertiary)' }}>
                  <td style={{ padding: '8px 16px' }}>{conn.protocol.toUpperCase()}</td>
                  <td style={{ padding: '8px 16px', fontFamily: 'monospace' }}>{conn.localAddress}:{conn.localPort}</td>
                  <td style={{ padding: '8px 16px', fontFamily: 'monospace' }}>{conn.peerAddress || '*'}:{conn.peerPort || '*'}</td>
                  <td style={{ padding: '8px 16px' }}>
                    <span style={{ fontSize: 10, color: conn.state === 'ESTABLISHED' ? '#10b981' : 'var(--text-secondary)' }}>
                      {conn.state}
                    </span>
                  </td>
                  <td style={{ padding: '8px 16px' }}>{conn.process || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {(!metrics?.networkConnections || metrics.networkConnections.length === 0) && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>No active connections found.</div>
          )}
        </div>
      </div>

      <style>{`
        .card {
          background-color: var(--bg-secondary);
          border: 1px solid var(--border-color);
          border-radius: 12px;
          padding: 20px;
        }
      `}</style>
    </div>
  );
};

export default NetworkPage;