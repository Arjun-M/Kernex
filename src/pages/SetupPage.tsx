import React, { useState } from 'react';
import { useAuth } from '../app/AuthContext';
import { useTitle } from '../hooks/useTitle';

const SetupPage: React.FC = () => {
  useTitle('Setup');
  const { login } = useAuth();
  const [formData, setFormData] = useState({ username: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: formData.username,
          password: formData.password
        })
      });

      if (res.ok) {
        const data = await res.json();
        login(data.sessionId);
      } else {
        const data = await res.json();
        setError(data.error || 'Setup failed');
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100vw', backgroundColor: 'var(--bg-primary)' }}>
      <div className="card" style={{ width: '400px', padding: '30px' }}>
        <div style={{ textAlign: 'center', marginBottom: '15px' }}>
          <img src="/kernex.png" alt="Kernex Logo" style={{ width: '64px', height: '64px', borderRadius: '12px' }} />
        </div>
        <h2 style={{ marginBottom: '10px', textAlign: 'center', fontWeight: 700 }}>Initialize Kernex</h2>
        <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13px', marginBottom: '24px' }}>
          Kernex is your personal programmable runtime. Set your credentials to begin.
        </p>
        
        {error && (
          <div style={{ backgroundColor: '#ef444420', color: '#ef4444', padding: '10px', borderRadius: '6px', marginBottom: '20px', fontSize: '13px', textAlign: 'center', border: '1px solid #ef444440' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Root Username</label>
            <input 
              type="text" 
              required
              value={formData.username} 
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Password</label>
            <input 
              type="password" 
              required
              value={formData.password} 
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Confirm Password</label>
            <input 
              type="password" 
              required
              value={formData.confirmPassword} 
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              style={{ padding: '10px', borderRadius: '6px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className="btn-primary" 
            style={{ marginTop: '10px', height: '42px', fontWeight: 600 }}
          >
            {loading ? 'Setting up...' : 'Create Account & Login'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default SetupPage;