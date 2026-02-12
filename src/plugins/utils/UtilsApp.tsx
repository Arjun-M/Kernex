import React, { useState, useEffect, useCallback } from 'react';
import { Copy, RefreshCw, AlertCircle, Check, Lock, Key, Shield, FileText, Hash as HashIcon, Zap, Play, Settings } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { pluginFetch } from '../authHelper';

type ToolId = 'hash' | 'base64' | 'jwt' | 'uuid' | 'password' | 'hmac' | 'encryption';

interface UtilsAppProps {
  tool: ToolId;
}

const UtilsApp: React.FC<UtilsAppProps> = ({ tool }) => {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState<any>('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [algo, setAlgorithm] = useState(tool === 'encryption' ? 'aes-256-gcm' : 'sha256');
  const [mode, setMode] = useState(tool === 'base64' ? 'encode' : 'encrypt');
  const [saltRounds, setSaltRounds] = useState(10);
  const [secret, setSecret] = useState('');
  const [iv, setIv] = useState('');
  const [authTag, setAuthTag] = useState('');
  const [count, setCount] = useState(1);
  const [passOptions, setPassOptions] = useState({ length: 24, upper: true, lower: true, nums: true, syms: true });

  const copyToClipboard = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const executeAction = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      let res;
      switch (tool) {
        case 'hash':
          res = await pluginFetch('/api/utils/hash', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: input, algorithm: algo, saltRounds })
          });
          break;
        case 'base64':
          res = await pluginFetch('/api/utils/base64', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: input, mode })
          });
          break;
        case 'jwt':
          res = await pluginFetch('/api/utils/jwt/decode', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: input })
          });
          break;
        case 'uuid':
          res = await pluginFetch(`/api/utils/uuid?count=${count}`);
          break;
        case 'password':
          res = await pluginFetch('/api/utils/password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                length: passOptions.length, 
                uppercase: passOptions.upper, 
                lowercase: passOptions.lower, 
                numbers: passOptions.nums, 
                symbols: passOptions.syms 
            })
          });
          break;
        case 'hmac':
          res = await pluginFetch('/api/utils/hmac', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: input, secret, algorithm: algo })
          });
          break;
        case 'encryption':
          res = await pluginFetch('/api/utils/encryption', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: input, key: secret, iv, algorithm: algo, mode, authTag })
          });
          break;
      }

      if (res && res.ok) {
        const data = await res.json();
        if (tool === 'uuid') setOutput(data.uuids.join('\n'));
        else if (tool === 'password') setOutput(data.password);
        else if (tool === 'hash') setOutput(data.hash);
        else if (tool === 'base64') setOutput(data.result);
        else if (tool === 'jwt') setOutput(JSON.stringify(data, null, 2));
        else if (tool === 'hmac') setOutput(data.hmac);
        else if (tool === 'encryption') {
            setOutput(data.result);
            if (mode === 'encrypt') {
                if (data.iv) setIv(data.iv);
                if (data.authTag) setAuthTag(data.authTag);
            }
        }
      } else {
        const err = await res?.json();
        setError(err?.error || 'Operation failed');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [tool, input, algo, mode, saltRounds, secret, iv, authTag, count, passOptions]);

  useEffect(() => {
    if (tool === 'uuid' || tool === 'password') executeAction();
  }, [tool]);

  const hasInput = !['uuid', 'password'].includes(tool);

  return (
    <div className="modern-utils-container">
      <header className="modern-header">
        <div className="tool-identity">{getToolIcon(tool)}
          <div className="tool-info">
            <h2 className="tool-name">{getToolTitle(tool)}</h2>
            <span className="tool-tag">Runtime Infrastructure</span>
          </div>
        </div>
        <div className="tool-actions">
            <button className="run-btn" onClick={executeAction} disabled={loading}>
                {loading ? <RefreshCw size={14} className="spin" /> : <Play size={14} />}
                <span>Execute</span>
            </button>
            <button className="action-btn" onClick={() => copyToClipboard(output)}>
                {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                <span>Copy Result</span>
            </button>
        </div>
      </header>

      <div className="modern-layout">
        {/* Settings Sidebar */}
        <aside className="settings-sidebar">
            <div className="sidebar-header">
                <Settings size={12} />
                <span>Configuration</span>
            </div>
            <div className="settings-content">
                {tool === 'hash' && (
                    <div className="setting-group">
                        <label>Algorithm</label>
                        <select value={algo} onChange={(e) => setAlgorithm(e.target.value)}>
                            <option value="md5">MD5</option>
                            <option value="sha1">SHA1</option>
                            <option value="sha256">SHA256</option>
                            <option value="sha512">SHA512</option>
                            <option value="bcrypt">bcrypt</option>
                        </select>
                        {algo === 'bcrypt' && (
                            <div style={{ marginTop: '15px' }}>
                                <label>Salt Rounds ({saltRounds})</label>
                                <input type="range" min={4} max={14} value={saltRounds} onChange={e => setSaltRounds(Number(e.target.value))} />
                            </div>
                        )}
                    </div>
                )}

                {tool === 'base64' && (
                    <div className="setting-group">
                        <label>Mode</label>
                        <div className="segment-control">
                            <button className={mode === 'encode' ? 'active' : ''} onClick={() => setMode('encode')}>Encode</button>
                            <button className={mode === 'decode' ? 'active' : ''} onClick={() => setMode('decode')}>Decode</button>
                        </div>
                    </div>
                )}

                {(tool === 'hmac' || tool === 'encryption') && (
                    <div className="setting-group">
                        <label>Algorithm</label>
                        <select value={algo} onChange={(e) => setAlgorithm(e.target.value)}>
                            {tool === 'hmac' ? (
                                <><option value="sha256">SHA256</option><option value="sha512">SHA512</option></>
                            ) : (
                                <><option value="aes-256-gcm">AES-256-GCM</option><option value="aes-256-cbc">AES-256-CBC</option></>
                            )}
                        </select>
                        
                        <div style={{ marginTop: '15px' }}>
                            <label>Secret Key (hex)</label>
                            <input type="password" value={secret} onChange={(e) => setSecret(e.target.value)} placeholder="001122..." className="sidebar-input" />
                        </div>

                        {tool === 'encryption' && (
                            <>
                                <div className="segment-control" style={{ marginTop: '15px' }}>
                                    <button className={mode === 'encrypt' ? 'active' : ''} onClick={() => setMode('encrypt')}>Encrypt</button>
                                    <button className={mode === 'decrypt' ? 'active' : ''} onClick={() => setMode('decrypt')}>Decrypt</button>
                                </div>
                                <div style={{ marginTop: '15px' }}>
                                    <label>IV (hex)</label>
                                    <input type="text" value={iv} onChange={(e) => setIv(e.target.value)} className="sidebar-input" />
                                </div>
                                {algo.includes('gcm') && mode === 'decrypt' && (
                                    <div style={{ marginTop: '15px' }}>
                                        <label>Auth Tag (hex)</label>
                                        <input type="text" value={authTag} onChange={(e) => setAuthTag(e.target.value)} className="sidebar-input" />
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {tool === 'uuid' && (
                    <div className="setting-group">
                        <label>Bulk Count</label>
                        <input type="number" min={1} max={100} value={count} onChange={e => setCount(Number(e.target.value))} className="sidebar-input" />
                    </div>
                )}

                {tool === 'password' && (
                    <div className="setting-group">
                        <label>Length ({passOptions.length})</label>
                        <input type="range" min={8} max={64} value={passOptions.length} onChange={e => setPassOptions({...passOptions, length: Number(e.target.value)})} />
                        
                        <div className="checkbox-list" style={{ marginTop: '15px' }}>
                            <label className="checkbox-item"><input type="checkbox" checked={passOptions.upper} onChange={e => setPassOptions({...passOptions, upper: e.target.checked})} /> A-Z</label>
                            <label className="checkbox-item"><input type="checkbox" checked={passOptions.lower} onChange={e => setPassOptions({...passOptions, lower: e.target.checked})} /> a-z</label>
                            <label className="checkbox-item"><input type="checkbox" checked={passOptions.nums} onChange={e => setPassOptions({...passOptions, nums: e.target.checked})} /> 0-9</label>
                            <label className="checkbox-item"><input type="checkbox" checked={passOptions.syms} onChange={e => setPassOptions({...passOptions, syms: e.target.checked})} /> !@#</label>
                        </div>
                    </div>
                )}
            </div>
        </aside>

        {/* Main Work Area */}
        <div className="work-area">
            {hasInput && (
                <div className="input-frame">
                    <div className="frame-bar">Input</div>
                    <div className="editor-box">
                        <Editor
                            height="100%"
                            language={tool === 'jwt' ? 'json' : 'plaintext'}
                            value={input}
                            theme="vs-dark"
                            onChange={(val) => setInput(val || '')}
                            options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false, lineNumbers: 'off', folding: false }}
                        />
                    </div>
                </div>
            )}

            <div className={`output-frame ${!hasInput ? 'full' : ''}`}>
                <div className="frame-bar">Result</div>
                <div className="editor-box">
                    <Editor
                        height="100%"
                        language={tool === 'jwt' ? 'json' : 'plaintext'}
                        value={output}
                        theme="vs-dark"
                        options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false, lineNumbers: 'off', folding: tool === 'jwt' }}
                    />
                </div>
                {error && (
                    <div className="error-overlay">
                        <AlertCircle size={20} />
                        <span>{error}</span>
                    </div>
                )}
            </div>
        </div>
      </div>

      <style>{`
        .modern-utils-container {
            --u-border: color-mix(in srgb, var(--border-color) 58%, #3c4656);
            --u-surface: color-mix(in srgb, var(--bg-secondary) 86%, #121821);
            --u-elev: color-mix(in srgb, var(--bg-tertiary) 84%, #151d28);
            --u-accent-soft: color-mix(in srgb, var(--accent-primary) 16%, transparent);

            display: flex;
            flex-direction: column;
            height: 100%;
            background:
              radial-gradient(circle at 0% 0%, color-mix(in srgb, var(--accent-primary) 10%, transparent), transparent 44%),
              var(--bg-primary);
            color: var(--text-primary);
            overflow: hidden;
        }
        .modern-header {
            min-height: 64px;
            padding: 10px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--u-border);
            background: linear-gradient(180deg, color-mix(in srgb, var(--bg-secondary) 88%, #101824), var(--bg-secondary));
            gap: 10px;
        }
        .tool-identity { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .tool-icon-bg {
            width: 40px;
            height: 40px;
            border-radius: 12px;
            border: 1px solid var(--u-border);
            background-color: var(--u-elev);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--accent-primary);
        }
        .tool-name { margin: 0; font-size: 16px; font-weight: 700; line-height: 1.2; }
        .tool-tag { font-size: 10px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.08em; }

        .tool-actions { display: flex; gap: 8px; flex-wrap: wrap; justify-content: flex-end; }
        .run-btn, .action-btn {
            height: 34px;
            padding: 0 12px;
            border-radius: 8px;
            border: 1px solid var(--u-border);
            background-color: var(--u-elev);
            color: var(--text-primary);
            font-size: 12px;
            display: inline-flex;
            align-items: center;
            gap: 7px;
            cursor: pointer;
            transition: transform 0.16s ease, opacity 0.16s ease;
        }
        .run-btn {
            background: linear-gradient(90deg, color-mix(in srgb, var(--accent-primary) 90%, #4567d8), color-mix(in srgb, var(--accent-primary) 72%, #2e4f9f));
            border-color: color-mix(in srgb, var(--accent-primary) 55%, #2e4f9f);
            color: #fff;
            font-weight: 600;
        }
        .run-btn:hover, .action-btn:hover { transform: translateY(-1px); }

        .modern-layout { flex: 1; display: grid; grid-template-columns: 280px minmax(0, 1fr); overflow: hidden; }
        .settings-sidebar {
            background: linear-gradient(180deg, color-mix(in srgb, var(--bg-secondary) 88%, #121923), var(--bg-secondary));
            border-right: 1px solid var(--u-border);
            display: flex;
            flex-direction: column;
            min-width: 240px;
        }
        .sidebar-header {
            height: 34px;
            padding: 0 14px;
            background-color: color-mix(in srgb, var(--bg-tertiary) 84%, #1a2333);
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 10px;
            font-weight: 700;
            text-transform: uppercase;
            color: var(--text-secondary);
            border-bottom: 1px solid var(--u-border);
            letter-spacing: 0.08em;
        }
        .settings-content { padding: 14px; flex: 1; overflow-y: auto; }
        .setting-group {
            margin-bottom: 12px;
            border: 1px solid var(--u-border);
            background: var(--u-surface);
            border-radius: 10px;
            padding: 10px;
        }
        .setting-group label { display: block; font-size: 11px; color: var(--text-secondary); margin-bottom: 8px; font-weight: 600; }

        .sidebar-input, select {
            width: 100%;
            background-color: var(--bg-primary);
            border: 1px solid var(--u-border);
            color: var(--text-primary);
            padding: 7px 9px;
            border-radius: 8px;
            font-size: 12px;
            outline: none;
        }
        .sidebar-input:focus, select:focus { border-color: var(--accent-primary); }

        .segment-control {
            display: flex;
            background-color: var(--bg-primary);
            padding: 2px;
            border-radius: 8px;
            border: 1px solid var(--u-border);
        }
        .segment-control button {
            flex: 1; padding: 5px 6px; border: none; background: none; color: var(--text-secondary); font-size: 11px; font-weight: 600; cursor: pointer; border-radius: 6px;
        }
        .segment-control button.active { background-color: var(--u-accent-soft); color: var(--text-primary); }

        .checkbox-list { display: flex; flex-direction: column; gap: 8px; }
        .checkbox-item { display: flex; align-items: center; gap: 9px; color: var(--text-primary); font-size: 12px; cursor: pointer; }

        input[type="range"] { width: 100%; height: 4px; background: var(--u-border); border-radius: 2px; appearance: none; outline: none; }
        input[type="range"]::-webkit-slider-thumb { appearance: none; width: 12px; height: 12px; background: var(--accent-primary); border-radius: 50%; cursor: pointer; }

        .work-area { display: grid; grid-template-rows: minmax(140px, 1fr) minmax(160px, 1fr); min-width: 0; }
        .input-frame, .output-frame { display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
        .input-frame { border-bottom: 1px solid var(--u-border); }
        .output-frame { position: relative; }
        .output-frame.full { grid-row: 1 / -1; }

        .frame-bar { height: 32px; padding: 0 12px; background-color: color-mix(in srgb, var(--bg-tertiary) 85%, #172031); font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); display: flex; align-items: center; border-bottom: 1px solid var(--u-border); letter-spacing: 0.08em; }
        .editor-box { flex: 1; min-height: 0; background-color: var(--bg-primary); }

        .error-overlay {
            position: absolute; bottom: 12px; left: 12px; right: 12px; padding: 10px 12px; background-color: color-mix(in srgb, #ef4444 20%, transparent); border: 1px solid color-mix(in srgb, #ef4444 40%, transparent); border-radius: 10px; color: #ffb4b4; font-size: 12px; display: flex; align-items: center; gap: 10px;
        }

        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        @media (max-width: 980px) {
            .modern-layout { grid-template-columns: 1fr; grid-template-rows: auto minmax(0, 1fr); }
            .settings-sidebar { min-width: 100%; border-right: none; border-bottom: 1px solid var(--u-border); max-height: 40vh; }
        }

        @media (max-width: 720px) {
            .modern-header { flex-wrap: wrap; align-items: flex-start; }
            .tool-actions { width: 100%; justify-content: flex-start; }
            .run-btn span, .action-btn span { font-size: 11px; }
            .work-area { grid-template-rows: minmax(180px, 1fr) minmax(180px, 1fr); }
        }
      `}</style>
    </div>
  );
};

const getToolTitle = (id: ToolId) => {
    switch(id) {
        case 'hash': return 'Hash Vault';
        case 'base64': return 'Base64 Processor';
        case 'jwt': return 'JWT Inspector';
        case 'uuid': return 'Entropy UUID Gen';
        case 'password': return 'Cipher Password Gen';
        case 'hmac': return 'HMAC Forge';
        case 'encryption': return 'Encryption Lab';
    }
};

const getToolIcon = (id: ToolId) => {
    switch(id) {
        case 'hash': return <HashIcon size={18} />;
        case 'base64': return <FileText size={18} />;
        case 'jwt': return <Shield size={18} />;
        case 'uuid': return <Zap size={18} />;
        case 'password': return <Lock size={18} />;
        case 'hmac': return <Key size={18} />;
        case 'encryption': return <Shield size={18} />;
    }
};

export default UtilsApp;
