import React, { useState, useEffect } from 'react';
import { Link, Plus, Trash2, Copy, Check, ExternalLink, Power, PowerOff } from 'lucide-react';
import './ShortUrlsApp.css';
import { pluginFetch } from '../authHelper';

interface ShortUrl {
  id: string;
  target: string;
  enabled: number;
  hit_count: number;
  created_at: number;
  updated_at: number;
}

const ShortUrlsApp: React.FC = () => {
  console.log('Rendering ShortUrlsApp component');
  const [urls, setUrls] = useState<ShortUrl[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [isAdding, setIsAdding] = useState(false);
  const [newId, setNewId] = useState('');
  const [newTarget, setNewTarget] = useState('');
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTarget, setEditTarget] = useState('');

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchUrls = async () => {
    try {
      setLoading(true);
      const res = await pluginFetch('/api/short-urls');
      const data = await res.json();
      if (Array.isArray(data)) {
        setUrls(data);
      } else if (data.error) {
        setError(data.error);
      } else {
        setError('Unexpected response format');
      }
    } catch (e) {
      setError('Failed to fetch short URLs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUrls();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newId || !newTarget) return;

    try {
      const res = await pluginFetch('/api/short-urls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: newId, target: newTarget })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      setUrls([data, ...urls]);
      setNewId('');
      setNewTarget('');
      setIsAdding(false);
    } catch (e: any) {
      alert(e.message);
    }
  };

  const deleteShortUrl = async (id: string) => {
    if (!confirm('Delete this short URL?')) return;
    try {
      await pluginFetch(`/api/short-urls/${id}`, { 
        method: 'DELETE'
      });
      setUrls(urls.filter(u => u.id !== id));
    } catch (e) {
      alert('Failed to delete');
    }
  };

  const handleToggle = async (url: ShortUrl) => {
    try {
      const enabled = url.enabled === 1 ? 0 : 1;
      await pluginFetch(`/api/short-urls/${url.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !!enabled })
      });
      setUrls(urls.map(u => u.id === url.id ? { ...u, enabled } : u));
    } catch (e) {
      alert('Failed to update');
    }
  };

  const startEdit = (url: ShortUrl) => {
    setEditingId(url.id);
    setEditTarget(url.target);
  };

  const handleUpdate = async (id: string) => {
    try {
      await pluginFetch(`/api/short-urls/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target: editTarget })
      });
      setUrls(urls.map(u => u.id === id ? { ...u, target: editTarget, updated_at: Date.now() } : u));
      setEditingId(null);
    } catch (e) {
      alert('Failed to update');
    }
  };

  const copyToClipboard = (id: string) => {
    // Use the current top-level origin, not the iframe origin
    const fullUrl = `${window.location.origin}/u/${id}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="short-urls-app">
      <header className="app-header">
        <div className="title-section">
          <Link size={20} />
          <h2>Short URLs</h2>
        </div>
        <button className="add-btn" onClick={() => setIsAdding(!isAdding)}>
          <Plus size={18} /> {isAdding ? 'Cancel' : 'Create New'}
        </button>
      </header>

      {isAdding && (
        <form className="add-form" onSubmit={handleCreate}>
          <div className="form-group">
            <label>Short ID (e.g. docs)</label>
            <input 
              type="text" 
              value={newId} 
              onChange={e => setNewId(e.target.value)} 
              placeholder="docs" 
              pattern="[a-zA-Z0-9-_]+"
              required 
            />
          </div>
          <div className="form-group">
            <label>Target URL or Path</label>
            <input 
              type="text" 
              value={newTarget} 
              onChange={e => setNewTarget(e.target.value)} 
              placeholder="https://example.com or /system/docs" 
              required 
            />
          </div>
          <button type="submit" className="submit-btn">Create</button>
        </form>
      )}

      {error && <div className="error-msg">{error}</div>}

      <div className="url-list">
        {loading && <div className="loading">Loading...</div>}
        {!loading && urls.length === 0 && <div className="empty">No short URLs defined yet.</div>}
        
        {urls.map(url => (
          <div key={url.id} className={`url-card ${url.enabled ? '' : 'disabled'}`}>
            <div className="url-info">
              <div className="url-main">
                <span className="short-id">/u/{url.id}</span>
                <div className="url-actions">
                  <button onClick={() => copyToClipboard(url.id)} title="Copy URL">
                    {copiedId === url.id ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                  </button>
                  <a href={`/u/${url.id}`} target="_blank" rel="noopener noreferrer" title="Visit">
                    <ExternalLink size={14} />
                  </a>
                </div>
              </div>
              
              {editingId === url.id ? (
                <div className="edit-box">
                  <input 
                    value={editTarget} 
                    onChange={e => setEditTarget(e.target.value)} 
                    autoFocus
                  />
                  <button onClick={() => handleUpdate(url.id)}><Check size={14} /></button>
                  <button onClick={() => setEditingId(null)}><PowerOff size={14} /></button>
                </div>
              ) : (
                <div className="target-text" onClick={() => startEdit(url)}>
                  {url.target}
                </div>
              )}
            </div>

            <div className="url-stats">
              <span className="hit-count"><b>{url.hit_count}</b> hits</span>
              <span className="updated-at">
                {new Date(url.updated_at).toLocaleDateString()}
              </span>
            </div>

            <div className="card-controls">
              <button 
                className={`toggle-btn ${url.enabled ? 'on' : 'off'}`} 
                onClick={() => handleToggle(url)}
                title={url.enabled ? 'Disable' : 'Enable'}
              >
                {url.enabled ? <Power size={16} /> : <PowerOff size={16} />}
              </button>
              <button className="delete-btn" onClick={() => deleteShortUrl(url.id)}>
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ShortUrlsApp;