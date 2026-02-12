import React, { useState } from 'react';
import { Globe, Download, Folder, CheckCircle, Loader2 } from 'lucide-react';
import { pluginFetch, getWorkspaceId } from '../authHelper';
import { useToast } from '../../app/ToastContext';

const ExtractorApp = () => {
  const { error, success } = useToast();
  const [url, setUrl] = useState('');
  const [folderName, setFolderName] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ path: string } | null>(null);

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;

    setLoading(true);
    setResult(null);

    try {
      const workspaceId = getWorkspaceId();
      const res = await pluginFetch('/api/extractor/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, folderName, workspaceId })
      });

      const data = await res.json();

      if (res.ok) {
        setResult({ path: data.path });
        success('Extraction complete');
      } else {
        error(data.error || 'Extraction failed');
      }
    } catch (e) {
      error('Network error');
    } finally {
      setLoading(false);
    }
  };

  const openFileManager = () => {
    if (!result) return;
    // Post message to parent to open File Manager
    // We send the path as initialData.
    // The File Manager plugin needs to support `initialState` or we need to implement it.
    // Wait, FileManager uses usePluginState which persists selection. 
    // Ideally we want to force open a path. 
    // Let's send a message to open "files" app with data { path: result.path }
    // But FileManager doesn't read initialData from props to set state currently. 
    // It reads from DB. 
    // However, if we open a NEW instance (new node), we can pass initialData.
    // WorkspaceEnvironment passes data to iframe src or react component.
    // If iframe, it's harder unless we pass it in URL query params.
    // Let's assume for now we just open the app.
    
    window.parent.postMessage({
        type: 'OPEN_APP',
        appId: 'files',
        data: { 
            initialPath: `${result.path}/index.html`,
            scope: result.path 
        }
    }, '*');
  };

  return (
    <div style={{ 
        padding: '24px', 
        height: '100%', 
        background: 'var(--bg-primary)', 
        color: 'var(--text-primary)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
    }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
            <div style={{ 
                width: '64px', height: '64px', borderRadius: '16px', 
                background: 'var(--bg-secondary)', display: 'flex', 
                alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px auto',
                border: '1px solid var(--border-color)'
            }}>
                <Globe size={32} color="var(--accent-primary)" />
            </div>
            <h2 style={{ margin: 0, fontSize: '20px' }}>Website Extractor</h2>
            <p style={{ margin: '8px 0 0 0', color: 'var(--text-secondary)', fontSize: '14px' }}>
                Download source code and assets from any URL
            </p>
        </div>

        {!result ? (
            <form onSubmit={handleExtract} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                    <label className="label-sm">Target URL</label>
                    <div style={{ position: 'relative' }}>
                        <Globe size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--text-secondary)' }} />
                        <input 
                            className="input" 
                            style={{ paddingLeft: '34px' }}
                            placeholder="https://example.com" 
                            value={url}
                            onChange={e => setUrl(e.target.value)}
                            required
                            type="url"
                        />
                    </div>
                </div>
                
                <div>
                    <label className="label-sm">Folder Name (Optional)</label>
                    <input 
                        className="input" 
                        placeholder="my-site-copy" 
                        value={folderName}
                        onChange={e => setFolderName(e.target.value)}
                    />
                </div>

                <button 
                    type="submit" 
                    className="btn-primary" 
                    disabled={loading}
                    style={{ justifyContent: 'center', marginTop: '8px', height: '40px' }}
                >
                    {loading ? (
                        <><Loader2 size={18} className="spin" style={{ marginRight: '8px' }} /> Extracting...</>
                    ) : (
                        <><Download size={18} style={{ marginRight: '8px' }} /> Start Extraction</>
                    )}
                </button>
            </form>
        ) : (
            <div style={{ 
                background: 'var(--bg-secondary)', 
                padding: '24px', 
                borderRadius: '8px', 
                border: '1px solid var(--border-color)',
                textAlign: 'center'
            }}>
                <div style={{ color: '#10b981', marginBottom: '16px' }}>
                    <CheckCircle size={48} style={{ margin: '0 auto' }} />
                </div>
                <h3 style={{ margin: '0 0 8px 0' }}>Extraction Complete!</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
                    Files saved to <b>/{result.path}</b>
                </p>
                
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                        className="btn-secondary" 
                        onClick={() => setResult(null)}
                        style={{ flex: 1 }}
                    >
                        Extract Another
                    </button>
                    <button 
                        className="btn-primary" 
                        onClick={openFileManager}
                        style={{ flex: 1 }}
                    >
                        <Folder size={16} style={{ marginRight: '8px' }} /> View Files
                    </button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default ExtractorApp;
