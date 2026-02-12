import React, { useState, useEffect } from 'react';
import { Server, Folder, File, ArrowLeft, RefreshCw, Upload, Download, Save, Trash, LogOut } from 'lucide-react';
import { pluginFetch } from '../authHelper';
import { useToast } from '../../app/ToastContext';

interface FtpItem {
  name: string;
  type: 'file' | 'folder';
  size: number;
  modifiedAt: string;
  raw?: any;
}

interface SavedConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  user: string;
  secure: boolean;
}

const formatSize = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleString();
  } catch {
    return dateStr;
  }
};

const FtpClientApp = () => {
  const { error, success } = useToast();
  
  // Connection Details
  const [host, setHost] = useState('localhost');
  const [port, setPort] = useState(2121);
  const [user, setUser] = useState('');
  const [password, setPassword] = useState('');
  const [secure, setSecure] = useState(false);
  
  const [savedConnections, setSavedConnections] = useState<SavedConnection[]>([]);
  const [connectionName, setConnectionName] = useState('');
  const [showSaveForm, setShowSaveForm] = useState(false);

  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentPath, setCurrentPath] = useState('/');
  const [items, setItems] = useState<FtpItem[]>([]);


  useEffect(() => {
    const saved = localStorage.getItem('ftp_saved_connections');
    if (saved) {
      try {
        setSavedConnections(JSON.parse(saved));
      } catch {}
    }
  }, []);

  const saveConnection = () => {
    if (!connectionName) return;
    const newConn: SavedConnection = {
      id: Date.now().toString(),
      name: connectionName,
      host, port, user, secure
    };
    const updated = [...savedConnections, newConn];
    setSavedConnections(updated);
    localStorage.setItem('ftp_saved_connections', JSON.stringify(updated));
    setShowSaveForm(false);
    setConnectionName('');
    success('Connection saved');
  };

  const loadConnection = (conn: SavedConnection) => {
    setHost(conn.host);
    setPort(conn.port);
    setUser(conn.user);
    setSecure(conn.secure);
    // Password is not saved for security, user must enter it
  };

  const deleteConnection = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = savedConnections.filter(c => c.id !== id);
    setSavedConnections(updated);
    localStorage.setItem('ftp_saved_connections', JSON.stringify(updated));
  };

  const connect = async () => {
    setLoading(true);
    await fetchList('/');
    setLoading(false);
  };

  const fetchList = async (path: string) => {
    try {
      const res = await pluginFetch('/api/ftp-client/list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ host, port, user, password, secure, path })
      });
      
      if (res.ok) {
        const data = await res.json();
        // Sort folders first
        data.sort((a: FtpItem, b: FtpItem) => {
          if (a.type === b.type) return a.name.localeCompare(b.name);
          return a.type === 'folder' ? -1 : 1;
        });
        setItems(data);
        setCurrentPath(path);
        setConnected(true);
      } else {
        const err = await res.json();
        error(err.message || 'Connection failed');
        if (path === '/') setConnected(false); // If root fails, we are not connected
      }
    } catch (e) {
      error('Network error');
      if (path === '/') setConnected(false);
    }
  };

  const handleItemClick = (item: FtpItem) => {
    if (item.type === 'folder') {
      const newPath = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`;
      setLoading(true);
      fetchList(newPath).finally(() => setLoading(false));
    }
  };

  const handleDownload = async (item: FtpItem, e: React.MouseEvent) => {
      e.stopPropagation();
      try {
          const remotePath = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`;
          
          const res = await pluginFetch('/api/ftp-client/download', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ host, port, user, password, secure, remotePath })
          });
          
          if (res.ok) {
              const blob = await res.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = item.name;
              document.body.appendChild(a);
              a.click();
              window.URL.revokeObjectURL(url);
              document.body.removeChild(a);
          } else {
              error('Download failed');
          }
      } catch {
          error('Download failed');
      }
  };

  const handleUp = () => {
    if (currentPath === '/') return;
    const parts = currentPath.split('/');
    parts.pop();
    const newPath = parts.join('/') || '/';
    setLoading(true);
    fetchList(newPath).finally(() => setLoading(false));
  };
  
  const handleDisconnect = () => {
      setConnected(false);
      setItems([]);
      setCurrentPath('/');
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files || e.target.files.length === 0) return;
      
      const file = e.target.files[0];
      const formData = new FormData();
      formData.append('host', host);
      formData.append('port', port.toString());
      formData.append('user', user);
      formData.append('password', password);
      formData.append('secure', String(secure));
      formData.append('remoteDir', currentPath);
      formData.append('file', file);
      
      setLoading(true);
      try {
          const res = await pluginFetch('/api/ftp-client/upload', {
              method: 'POST',
              body: formData,
              headers: {} 
          });
          
          if (res.ok) {
              success('Uploaded successfully');
              fetchList(currentPath);
          } else {
              error('Upload failed');
          }
      } catch {
          error('Upload failed');
      } finally {
          setLoading(false);
      }
  };

  // --- Render ---

  if (!connected) {
    return (
      <div style={{ padding: 40, maxWidth: 800, margin: '0 auto', color: 'var(--text-primary)', height: '100%', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 30 }}>
            <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 12 }}>
                <Server size={32} color="var(--accent-primary)" />
            </div>
            <div>
                <h2 style={{ margin: 0, fontSize: 24 }}>FTP Client</h2>
                <p style={{ margin: 0, color: 'var(--text-secondary)' }}>Connect to remote servers</p>
            </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 40 }}>
            {/* Connection Form */}
            <div>
                <h3 style={{ fontSize: 16, marginBottom: 20 }}>New Connection</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    <div>
                        <label className="label-sm">Host</label>
                        <input className="input" value={host} onChange={e => setHost(e.target.value)} placeholder="ftp.example.com" />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                        <div>
                            <label className="label-sm">Port</label>
                            <input className="input" type="number" value={port} onChange={e => setPort(Number(e.target.value))} />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-end', paddingBottom: 10 }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, cursor: 'pointer' }}>
                                <input type="checkbox" checked={secure} onChange={e => setSecure(e.target.checked)} />
                                Use FTPS (Secure)
                            </label>
                        </div>
                    </div>
                    <div>
                        <label className="label-sm">Username</label>
                        <input className="input" value={user} onChange={e => setUser(e.target.value)} placeholder="user" />
                    </div>
                    <div>
                        <label className="label-sm">Password</label>
                        <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" />
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                        <button onClick={connect} disabled={loading} className="btn-primary" style={{ flex: 1, display: 'flex', justifyContent: 'center', gap: 8 }}>
                            {loading && <RefreshCw className="spin" size={16} />}
                            {loading ? 'Connecting...' : 'Connect'}
                        </button>
                        <button onClick={() => setShowSaveForm(!showSaveForm)} className="btn-secondary" title="Save Connection">
                            <Save size={18} />
                        </button>
                    </div>
                    
                    {showSaveForm && (
                        <div style={{ padding: 12, background: 'var(--bg-secondary)', borderRadius: 8, marginTop: 10, animation: 'fadeIn 0.2s' }}>
                            <label className="label-sm">Connection Name</label>
                            <div style={{ display: 'flex', gap: 8 }}>
                                <input 
                                    className="input" 
                                    value={connectionName} 
                                    onChange={e => setConnectionName(e.target.value)} 
                                    placeholder="My Server" 
                                    autoFocus
                                />
                                <button onClick={saveConnection} className="btn-primary">Save</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Saved Connections */}
            <div>
                <h3 style={{ fontSize: 16, marginBottom: 20 }}>Saved Connections</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {savedConnections.length === 0 && (
                        <div style={{ color: 'var(--text-secondary)', fontSize: 13, fontStyle: 'italic' }}>No saved connections</div>
                    )}
                    {savedConnections.map(conn => (
                        <div key={conn.id} 
                             onClick={() => loadConnection(conn)}
                             style={{ 
                                 padding: 12, borderRadius: 8, background: 'var(--bg-secondary)', 
                                 cursor: 'pointer', border: '1px solid transparent',
                                 display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                 transition: 'all 0.2s'
                             }}
                             className="hover-border"
                        >
                            <div>
                                <div style={{ fontWeight: 600, fontSize: 14 }}>{conn.name}</div>
                                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                                    {conn.user}@{conn.host}
                                </div>
                            </div>
                            <button 
                                onClick={(e) => deleteConnection(conn.id, e)}
                                style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: 4 }}
                                className="hover-text-danger"
                            >
                                <Trash size={14} />
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
    );
  }

  // Connected View
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', color: 'var(--text-primary)' }}>
       {/* Top Bar */}
       <div style={{ 
           padding: '10px 16px', borderBottom: '1px solid var(--border-color)', 
           display: 'flex', alignItems: 'center', gap: 16, background: 'var(--bg-secondary)' 
       }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
               <button onClick={handleDisconnect} className="icon-btn text-danger" title="Disconnect">
                   <LogOut size={18} />
               </button>
               <div style={{ width: 1, height: 20, background: 'var(--border-color)' }}></div>
               <button onClick={handleUp} disabled={currentPath === '/'} className="icon-btn">
                   <ArrowLeft size={18} />
               </button>
               <button onClick={() => fetchList(currentPath)} className={`icon-btn ${loading ? 'spin' : ''}`}>
                   <RefreshCw size={18} />
               </button>
           </div>
           
           <div style={{ 
               flex: 1, background: 'var(--bg-input)', padding: '6px 12px', borderRadius: 4, 
               fontFamily: 'monospace', fontSize: 13, display: 'flex', alignItems: 'center',
               border: '1px solid var(--border-color)'
           }}>
               <span style={{ color: 'var(--accent-primary)', marginRight: 6 }}>ftp://{host}</span>
               {currentPath}
           </div>
           
           <label className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', height: 32 }}>
               <Upload size={14} /> Upload
               <input type="file" onChange={handleUpload} style={{ display: 'none' }} />
           </label>
       </div>
       
       {/* File List */}
       <div style={{ flex: 1, overflowY: 'auto', padding: 0 }}>
           {loading && items.length === 0 ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-secondary)' }}>Loading...</div>
           ) : (
               <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                   <thead style={{ position: 'sticky', top: 0, background: 'var(--bg-tertiary)', zIndex: 1, textAlign: 'left' }}>
                       <tr>
                           <th style={{ padding: '8px 16px', fontWeight: 600, color: 'var(--text-secondary)' }}>Name</th>
                           <th style={{ padding: '8px 16px', fontWeight: 600, color: 'var(--text-secondary)', width: 100 }}>Size</th>
                           <th style={{ padding: '8px 16px', fontWeight: 600, color: 'var(--text-secondary)', width: 180 }}>Modified</th>
                           <th style={{ padding: '8px 16px', width: 50 }}></th>
                       </tr>
                   </thead>
                   <tbody>
                       {items.length === 0 && (
                           <tr>
                               <td colSpan={4} style={{ padding: 30, textAlign: 'center', color: 'var(--text-muted)' }}>
                                   Empty directory
                               </td>
                           </tr>
                       )}
                       {items.map((item, i) => (
                           <tr 
                               key={i} 
                               onClick={() => handleItemClick(item)}
                               style={{ 
                                   borderBottom: '1px solid var(--border-color)', 
                                   cursor: 'pointer',
                                   transition: 'background 0.1s'
                               }}
                               className="tr-hover"
                           >
                               <td style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
                                    {item.type === 'folder' 
                                       ? <Folder size={18} color="#fbbf24" fill="#fbbf24" fillOpacity={0.2} /> 
                                       : <File size={18} color="#94a3b8" />
                                   }
                                   <span style={{ fontWeight: item.type === 'folder' ? 600 : 400 }}>{item.name}</span>
                               </td>
                               <td style={{ padding: '8px 16px', color: 'var(--text-secondary)' }}>
                                   {item.type === 'file' ? formatSize(item.size) : '-'}
                               </td>
                               <td style={{ padding: '8px 16px', color: 'var(--text-secondary)' }}>
                                   {formatDate(item.modifiedAt)}
                               </td>
                               <td style={{ padding: '8px 16px' }}>
                                   {item.type === 'file' && (
                                       <button 
                                           onClick={(e) => handleDownload(item, e)}
                                           className="icon-btn hover-text-accent" 
                                           title="Download"
                                       >
                                           <Download size={16} />
                                       </button>
                                   )}
                               </td>
                           </tr>
                       ))}
                   </tbody>
               </table>
           )}
       </div>
    </div>
  );
};

export default FtpClientApp;