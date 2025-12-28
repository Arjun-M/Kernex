import React, { useEffect, useState } from 'react';
import { Shield, Key, Trash2, Plus, AlertTriangle, Zap, Lock, AlertCircle } from 'lucide-react';
import { authFetch } from '../../app/authFetch';
import { useTitle } from '../../hooks/useTitle';

interface Secret {
  key: string;
}

const SecurityPage: React.FC = () => {
  useTitle('Security');
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [newSecret, setNewSecret] = useState({ key: '', value: '' });
  const [loading, setLoading] = useState(true);
  
  // Runtime Settings State
  const [settings, setSettings] = useState<any>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Password Change State
  const [newPassword, setNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);

  const fetchSecrets = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await authFetch('/api/secrets');
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const data = await res.json();
      setSecrets(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (e) {
      console.error('Failed to fetch secrets:', e);
      setSecrets([]);
      setLoading(false);
    }
  }, []);

  const fetchSettings = React.useCallback(async () => {
    try {
      const res = await authFetch('/api/settings');
      const data = await res.json();
      setSettings(data);
    } catch (e) {
      console.error('Failed to fetch settings:', e);
    }
  }, []);

  useEffect(() => {
    fetchSecrets();
    fetchSettings();
  }, [fetchSecrets, fetchSettings]);

  const handleSettingChange = (key: string, value: any) => {
    setSettings((prev: any) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const handleSaveSettings = async () => {
    try {
      await authFetch('/api/settings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      setHasChanges(false);
      alert('Security settings updated successfully');
    } catch (e) {
      console.error(e);
      alert('Failed to update settings');
    }
  };

  const handleAddSecret = async () => {
    if (!newSecret.key || !newSecret.value) return;
    try {
      const res = await authFetch('/api/secrets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newSecret)
      });
      if (!res.ok) throw new Error('Failed to save secret');
      setNewSecret({ key: '', value: '' });
      fetchSecrets();
    } catch (e) {
      console.error('Add secret error:', e);
      alert('Failed to save secret');
    }
  };

  const handleDeleteSecret = async (key: string) => {
    if (!confirm(`Are you sure you want to delete secret "${key}"?`)) return;
    try {
      const res = await authFetch(`/api/secrets/${key}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete secret');
      fetchSecrets();
    } catch (e) {
      console.error('Delete secret error:', e);
      alert('Failed to delete secret');
    }
  };

  const handleChangePassword = async () => {
    if (!newPassword || newPassword.length < 8) {
        alert('Password must be at least 8 characters');
        return;
    }

    setPasswordLoading(true);
    try {
        const res = await authFetch('/api/auth/change-password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newPassword })
        });

        if (res.ok) {
            alert('Password updated successfully. Please ensure you remove the environment variable override to prevent unauthorized access.');
            setNewPassword('');
        } else {
            const err = await res.json();
            alert(err.error || 'Failed to update password');
        }
    } catch (e) {
        console.error('Change password error:', e);
        alert('Failed to change password');
    } finally {
        setPasswordLoading(false);
    }
  };

  const safeSecrets = Array.isArray(secrets) ? secrets : [];

  if (!settings) return <div style={{ padding: 20 }}>Loading security configuration...</div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
        <h1 style={{ margin: 0, fontSize: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          <Shield size={28} color="var(--accent-primary)" /> Security & Secrets
        </h1>
        {hasChanges && (
          <button className="btn-primary" onClick={handleSaveSettings} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Zap size={16} /> Save Changes
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: 24 }}>
        
        {/* Worker Limits */}
        <div className="card">
          <h3 style={{ marginTop: 0, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Zap size={20} /> Execution Limits
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Max Execution Time (ms)</label>
              <input 
                type="number" 
                value={settings.maxWorkerTime} 
                onChange={e => handleSettingChange('maxWorkerTime', Number(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Memory Limit (MB)</label>
                <input 
                  type="number" 
                  value={settings.maxWorkerMemory} 
                  onChange={e => handleSettingChange('maxWorkerMemory', Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Max Concurrency</label>
                <input 
                  type="number" 
                  value={settings.maxConcurrentWorkers} 
                  onChange={e => handleSettingChange('maxConcurrentWorkers', Number(e.target.value))}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px', backgroundColor: 'var(--bg-tertiary)', borderRadius: 8 }}>
              <span style={{ fontSize: 13 }}>Kill on Timeout</span>
              <button 
                onClick={() => handleSettingChange('killOnTimeout', !settings.killOnTimeout)}
                style={{
                  width: 36, height: 18, borderRadius: 9,
                  backgroundColor: settings.killOnTimeout ? 'var(--accent-primary)' : '#444',
                  position: 'relative',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <div style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: 'white', position: 'absolute', top: 2, left: settings.killOnTimeout ? 20 : 2, transition: 'all 0.2s' }} />
              </button>
            </div>
          </div>
        </div>

        {/* Secrets Management */}
        <div className="card">
          <h3 style={{ marginTop: 0, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Key size={20} /> Secrets & Environment
          </h3>
          
          <div style={{ marginBottom: 16, padding: 12, backgroundColor: 'var(--bg-tertiary)', borderRadius: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: 8, alignItems: 'end' }}>
              <div>
                <input 
                  value={newSecret.key}
                  onChange={e => setNewSecret({...newSecret, key: e.target.value})}
                  placeholder="Key"
                  style={{ width: '100%', fontSize: 12 }}
                />
              </div>
              <div>
                <input 
                  type="password"
                  value={newSecret.value}
                  onChange={e => setNewSecret({...newSecret, value: e.target.value})}
                  placeholder="Value"
                  style={{ width: '100%', fontSize: 12 }}
                />
              </div>
              <button className="btn-primary" onClick={handleAddSecret} style={{ height: 32, padding: '0 8px' }}>
                <Plus size={14} />
              </button>
            </div>
          </div>

          <div style={{ maxHeight: 200, overflowY: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {safeSecrets.map(s => (
                  <tr key={s.key} style={{ borderBottom: '1px solid var(--border-color)' }}>
                    <td style={{ padding: '8px', fontFamily: 'monospace', fontSize: 12 }}>{s.key}</td>
                    <td style={{ padding: '8px', textAlign: 'right' }}>
                      <button onClick={() => handleDeleteSecret(s.key)} style={{ color: '#ff4444', border: 'none', background: 'none', cursor: 'pointer' }}>
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
                {safeSecrets.length === 0 && !loading && (
                  <tr><td colSpan={2} style={{ padding: 10, textAlign: 'center', fontSize: 12, color: 'var(--text-secondary)' }}>No secrets</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Change Password */}
        <div className="card">
          <h3 style={{ marginTop: 0, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Lock size={20} /> Change Root Password
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>New Root Password</label>
              <input 
                type="password" 
                value={newPassword} 
                onChange={e => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                style={{ width: '100%' }}
              />
            </div>
            <button 
                className="btn-primary" 
                onClick={handleChangePassword} 
                disabled={passwordLoading}
                style={{ width: 'fit-content' }}
            >
                {passwordLoading ? 'Updating...' : 'Change Password'}
            </button>

            <div style={{ 
                marginTop: '10px', 
                padding: '12px', 
                backgroundColor: '#f59e0b15', 
                borderRadius: '8px', 
                border: '1px solid #f59e0b33',
                display: 'flex',
                gap: '10px',
                alignItems: 'flex-start'
            }}>
                <AlertCircle size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                <p style={{ margin: 0, fontSize: '12px', color: '#d97706', lineHeight: '1.5' }}>
                    <b>Security Notice:</b> After resetting your password, ensure you remove the <code>KERNEX_ROOT_OVERRIDE</code> environment variable from your host environment to prevent future credential bypass.
                </p>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="card" style={{ border: '1px solid #ff444433' }}>
          <h3 style={{ marginTop: 0, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10, color: '#ff4444', fontSize: 16 }}>
            <AlertTriangle size={18} /> Danger Zone
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Immediately terminates all running workers and clears the execution cache.</div>
            <button 
              className="btn-primary" 
              style={{ backgroundColor: '#ff4444', fontSize: 12 }}
              onClick={() => confirm('Are you sure you want to restart the runtime?')}
            >
              Restart Runtime
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
export default SecurityPage;