import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, AlertTriangle } from 'lucide-react';
import { useTitle } from '../hooks/useTitle';

const NotFoundPage: React.FC = () => {
  useTitle('404');
  const navigate = useNavigate();

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--text-primary)',
      fontFamily: 'var(--font-family)',
      padding: '20px',
      textAlign: 'center'
    }}>
      <AlertTriangle size={64} color="#f59e0b" style={{ marginBottom: '24px' }} />
      <h1 style={{ fontSize: '48px', margin: '0 0 16px 0' }}>404</h1>
      <h2 style={{ fontSize: '24px', margin: '0 0 32px 0', opacity: 0.8 }}>Page Not Found</h2>
      <p style={{ maxWidth: '400px', margin: '0 0 48px 0', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
        The page you are looking for doesn't exist or has been moved.
        If this was a short URL, it might be disabled or deleted.
      </p>
      <button 
        onClick={() => navigate('/workspace')}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '12px 24px',
          backgroundColor: 'var(--accent-primary)',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          fontSize: '16px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'transform 0.2s'
        }}
        onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
      >
        <Home size={20} /> Back to Workspace
      </button>
    </div>
  );
};

export default NotFoundPage;
