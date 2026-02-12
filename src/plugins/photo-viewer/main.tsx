import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { getSessionToken, getWorkspaceId } from '../authHelper';
import { Image as ImageIcon } from 'lucide-react';

const PhotoViewer = () => {
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const filePath = params.get('file');

    if (!filePath) {
      setLoading(false);
      setShowWelcome(true);
      return;
    }

    const token = getSessionToken();
    const workspaceId = getWorkspaceId();

    const url = `/api/files/raw?path=${encodeURIComponent(filePath)}&token=${token}&workspaceId=${workspaceId}`;
    setImageUrl(url);
    setLoading(false);
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#888', background: '#000' }}>
        Loading...
      </div>
    );
  }

  if (showWelcome) {
      return (
          <div style={{ 
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', 
              height: '100%', color: '#fff', background: '#111', fontFamily: 'system-ui, sans-serif' 
          }}>
              <ImageIcon size={64} style={{ marginBottom: 20, opacity: 0.5 }} />
              <h2 style={{ margin: 0, fontWeight: 500 }}>Photo Viewer</h2>
              <p style={{ color: '#888', marginTop: 10 }}>Open an image from the File Manager to view it here.</p>
          </div>
      );
  }

  if (error) {
    return (
      <div style={{ 
        display: 'flex', alignItems: 'center', justifyContent: 'center', 
        height: '100%', color: '#ff6b6b', padding: '20px', textAlign: 'center', background: '#000'
      }}>
        {error}
      </div>
    );
  }

  return (
    <div style={{ 
      width: '100%', height: '100%', display: 'flex', 
      alignItems: 'center', justifyContent: 'center', backgroundColor: '#000',
      overflow: 'hidden' 
    }}>
      {imageUrl && (
        <img 
          src={imageUrl} 
          alt="Viewer" 
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} 
          onError={() => setError('Failed to load image')}
        />
      )}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PhotoViewer />
  </React.StrictMode>
);