import React, { useState } from 'react';
import { useAuth } from '../app/AuthContext';
import { useTitle } from '../hooks/useTitle';
import { HelpCircle, AlertCircle } from 'lucide-react';

const LoginPage: React.FC = () => {
  useTitle('Login');
  const { login } = useAuth();
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgot, setShowForgot] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        const data = await res.json();
        login(data.sessionId);
      } else {
        const data = await res.json();
        setError(data.error || 'Invalid credentials');
      }
    } catch (err) {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100vw', backgroundColor: 'var(--bg-primary)' }}>
      <div className="card" style={{ width: '360px', padding: '30px' }}>
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <img src="/kernex.png" alt="Kernex Logo" style={{ width: '64px', height: '64px', borderRadius: '12px' }} />
        </div>
        <h2 style={{ marginBottom: '24px', textAlign: 'center', fontWeight: 700 }}>Kernex Login</h2>
        
        {error && (
          <div style={{ backgroundColor: '#ef444420', color: '#ef4444', padding: '10px', borderRadius: '6px', marginBottom: '20px', fontSize: '13px', textAlign: 'center', border: '1px solid #ef444440' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Username</label>
            <input 
              type="text" 
              required
              value={formData.username} 
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Password</label>
            <input 
              type="password" 
              required
              value={formData.password} 
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary" 
            style={{ marginTop: '10px', height: '42px', fontWeight: 600 }}
          >
            {loading ? 'Logging in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <button 
            onClick={() => setShowForgot(!showForgot)}
            style={{ 
              background: 'none', 
              border: 'none', 
              color: 'var(--text-secondary)', 
              fontSize: '13px', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              margin: '0 auto'
            }}
          >
            <HelpCircle size={14} /> Forgot password?
          </button>
        </div>

        {showForgot && (
          <div style={{ 
            marginTop: '20px', 
            padding: '15px', 
            backgroundColor: 'var(--bg-tertiary)', 
            borderRadius: '8px', 
            border: '1px solid var(--border-color)',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <div style={{ display: 'flex', gap: '10px', marginBottom: '10px', color: 'var(--accent-primary)' }}>
              <AlertCircle size={18} />
              <span style={{ fontSize: '13px', fontWeight: 600 }}>Security Override</span>
            </div>
            <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              For security, please set a new password in the environment variable <code>KERNEX_ROOT_OVERRIDE</code> on your host machine to override the current database credentials.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LoginPage;