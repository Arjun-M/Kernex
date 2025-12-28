import React, { useEffect, useState, useCallback } from 'react';
import { RefreshCw, CheckCircle, AlertTriangle, ExternalLink, Github, Info } from 'lucide-react';
import { authFetch } from '../../app/authFetch';
import { useTitle } from '../../hooks/useTitle';

interface UpdateInfo {
  currentVersion: string;
  latestVersion?: string;
  updateAvailable?: boolean;
  breaking?: boolean;
  releasedAt?: string;
  changelog?: {
    added: string[];
    fixed: string[];
    breaking: string[];
  };
  error?: string;
}

const SystemUpdatePage: React.FC = () => {
  useTitle('System Update');
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const checkUpdates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authFetch('/api/system/update-check');
      const data = await res.json();
      setUpdateInfo(data);
    } catch (e) {
      console.error('Update check failed', e);
      setUpdateInfo({ currentVersion: '0.1.0', error: 'Unable to check for updates' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
        checkUpdates();
    }, 0);
    return () => clearTimeout(timer);
  }, [checkUpdates]);

  const renderChangelogSection = (title: string, items: string[], color: string) => {
    if (!items || items.length === 0) return null;
    return (
      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ fontSize: '14px', fontWeight: 600, color, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {title}
        </h4>
        <ul style={{ margin: 0, paddingLeft: '20px', color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.6' }}>
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: '800px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ margin: 0, fontSize: '24px', fontWeight: 700 }}>System Update</h1>
        <button 
          onClick={checkUpdates} 
          disabled={loading}
          style={{ 
            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', 
            borderRadius: '8px', border: 'none', backgroundColor: 'var(--bg-secondary)', 
            color: 'var(--text-primary)', cursor: loading ? 'default' : 'pointer',
            opacity: loading ? 0.6 : 1
          }}
        >
          <RefreshCw size={16} className={loading ? 'spin' : ''} /> 
          {loading ? 'Checking...' : 'Check for Updates'}
        </button>
      </div>

      {updateInfo?.error && (
        <div style={{ backgroundColor: '#ef444415', border: '1px solid #ef444433', borderRadius: '12px', padding: '20px', marginBottom: '30px', display: 'flex', gap: '15px', alignItems: 'flex-start' }}>
          <AlertTriangle color="#ef4444" size={24} />
          <div>
            <div style={{ fontWeight: 600, color: '#ef4444', marginBottom: '4px' }}>Update Check Failed</div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{updateInfo.error}. Please check your internet connection and try again later.</div>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: '30px', marginBottom: '30px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
          <div style={{ display: 'flex', gap: '20px' }}>
            <div style={{ textAlign: 'center', padding: '15px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '12px', minWidth: '120px' }}>
              <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '8px' }}>Current</div>
              <div style={{ fontSize: '20px', fontWeight: 700 }}>v{updateInfo?.currentVersion}</div>
            </div>
            {updateInfo?.updateAvailable && (
              <div style={{ textAlign: 'center', padding: '15px', backgroundColor: updateInfo.breaking ? '#ef444415' : 'var(--accent-primary)15', borderRadius: '12px', minWidth: '120px', border: `1px solid ${updateInfo.breaking ? '#ef444433' : 'var(--accent-primary)33'}` }}>
                <div style={{ fontSize: '11px', color: updateInfo.breaking ? '#ef4444' : 'var(--accent-primary)', textTransform: 'uppercase', marginBottom: '8px' }}>Latest</div>
                <div style={{ fontSize: '20px', fontWeight: 700 }}>v{updateInfo.latestVersion}</div>
              </div>
            )}
          </div>

          <div style={{ flex: 1, minWidth: '250px' }}>
            {loading ? (
              <div style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Verifying environment state...</div>
            ) : updateInfo?.updateAvailable ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: updateInfo.breaking ? '#ef4444' : 'var(--accent-primary)', fontWeight: 600, marginBottom: '8px' }}>
                  <AlertTriangle size={20} />
                  <span>A new version is available</span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
                  Kernex v{updateInfo.latestVersion} was released on {updateInfo.releasedAt}. 
                  {updateInfo.breaking && " This update contains breaking changes. Please read the changelog carefully before updating."}
                </div>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#10b981', fontWeight: 600, marginBottom: '8px' }}>
                  <CheckCircle size={20} />
                  <span>Kernex is up to date</span>
                </div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                  You are running the latest stable release of the Kernex runtime.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {updateInfo?.updateAvailable && updateInfo.changelog && (
        <div className="card" style={{ padding: '30px' }}>
          <h3 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Info size={20} color="var(--accent-primary)" /> Release Notes
          </h3>
          
          <div style={{ borderLeft: '2px solid var(--border-color)', paddingLeft: '20px', marginLeft: '5px' }}>
            {renderChangelogSection('Breaking Changes', updateInfo.changelog.breaking, '#ef4444')}
            {renderChangelogSection('Added Features', updateInfo.changelog.added, 'var(--accent-primary)')}
            {renderChangelogSection('Fixed Issues', updateInfo.changelog.fixed, '#10b981')}
          </div>

          <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid var(--border-color)', display: 'flex', gap: '20px' }}>
            <a 
              href="https://github.com/Arjun-M/Kernex" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-primary)', textDecoration: 'none' }}
            >
              <Github size={16} /> View Repository
            </a>
            <a 
              href="https://github.com/Arjun-M/Kernex/blob/main/changelog.yml" 
              target="_blank" 
              rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--text-primary)', textDecoration: 'none' }}
            >
              <ExternalLink size={16} /> Full Changelog
            </a>
          </div>
        </div>
      )}

      <div style={{ marginTop: '40px', padding: '20px', backgroundColor: 'var(--bg-tertiary)', borderRadius: '12px', fontSize: '12px', color: 'var(--text-secondary)', display: 'flex', gap: '15px' }}>
        <Info size={16} style={{ flexShrink: 0 }} />
        <p style={{ margin: 0, lineHeight: '1.6' }}>
          <b>Note:</b> Kernex update check is read-only. To apply updates, please follow the standard deployment 
          procedure for your host environment (e.g., <code>git pull</code> and <code>npm install</code>). 
          Always backup your <code>data/</code> directory before performing a system update.
        </p>
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default SystemUpdatePage;
