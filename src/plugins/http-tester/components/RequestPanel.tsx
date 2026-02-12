import React, { useState } from 'react';
import './RequestPanel.css';
import { Play, Square, Plus, Trash2, Save, Code, Copy } from 'lucide-react';
import type { HttpRequest, Header, Param, Collection } from '../types';
import { pluginFetch } from '../../authHelper';

interface RequestPanelProps {
  request: HttpRequest;
  onRequestChange: (req: HttpRequest) => void;
  onSend: () => void;
  loading: boolean;
  collections: Collection[];
}

export const RequestPanel: React.FC<RequestPanelProps> = ({ request, onRequestChange, onSend, loading, collections }) => {
  const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'body' | 'auth'>('params');
  const [showCode, setShowCode] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  
  const urlParams = new URLSearchParams(window.location.search);
  const workspaceId = urlParams.get('workspaceId');

  // Helpers to update request
  const updateField = (field: keyof HttpRequest, value: any) => {
    onRequestChange({ ...request, [field]: value });
  };

  const updateHeader = (index: number, field: keyof Header, value: any) => {
    const newHeaders = [...request.headers];
    newHeaders[index] = { ...newHeaders[index], [field]: value };
    updateField('headers', newHeaders);
  };
  
  const addHeader = () => {
    updateField('headers', [...request.headers, { key: '', value: '', enabled: true }]);
  };

  const removeHeader = (index: number) => {
    updateField('headers', request.headers.filter((_, i) => i !== index));
  };

  const updateParam = (index: number, field: keyof Param, value: any) => {
    const newParams = [...request.params];
    newParams[index] = { ...newParams[index], [field]: value };
    updateField('params', newParams);
  };

  const addParam = () => {
    updateField('params', [...request.params, { key: '', value: '', enabled: true }]);
  };

  const removeParam = (index: number) => {
    updateField('params', request.params.filter((_, i) => i !== index));
  };

  const generateCode = (lang: 'curl' | 'fetch') => {
      // Basic implementation
      let code = '';
      if (lang === 'curl') {
          code = `curl -X ${request.method} "${request.url}"`;
          request.headers.forEach(h => {
              if (h.enabled && h.key) code += ` \
  -H "${h.key}: ${h.value}"`;
          });
          if (request.body.type === 'json' && request.body.content) {
              code += ` \
  -H "Content-Type: application/json"`;
              code += ` \
  -d '${request.body.content}'`;
          }
      } else if (lang === 'fetch') {
          const headers = request.headers.reduce((acc: any, h) => {
              if(h.enabled && h.key) acc[h.key] = h.value;
              return acc;
          }, {});
          if (request.body.type === 'json') headers['Content-Type'] = 'application/json';
          
          code = `fetch("${request.url}", {\n`;
          code += `  method: "${request.method}",\n`;
          code += `  headers: ${JSON.stringify(headers, null, 2).replace(/\n/g, '\n  ')},\n`;
          if (request.body.type !== 'none' && request.body.content) {
              code += `  body: ${JSON.stringify(request.body.content)}\n`;
          }
          code += `});`;
      }
      return code;
  };

  return (
    <div className="request-panel">
      <div className="top-bar">
        <select 
          value={request.method} 
          onChange={e => updateField('method', e.target.value)} 
          className={`method-select ${request.method.toLowerCase()}`}
        >
          {['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <input 
          type="text" 
          value={request.url} 
          onChange={e => updateField('url', e.target.value)} 
          placeholder="Enter request URL" 
          className="url-input"
        />
        <button className="icon-btn" title="Generate Code" onClick={() => setShowCode(!showCode)}>
            <Code size={18} />
        </button>
        <button className="icon-btn" title="Save Request" onClick={() => setShowSaveModal(true)}>
            <Save size={18} />
        </button>
        <button className="send-btn" onClick={onSend} disabled={loading}>
          {loading ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
          {loading ? 'Cancel' : 'Send'}
        </button>
      </div>

      {showCode && (
          <div className="code-preview">
              <div className="code-header">
                  <span>cURL</span>
                  <button onClick={() => navigator.clipboard.writeText(generateCode('curl'))}><Copy size={12}/></button>
              </div>
              <pre>{generateCode('curl')}</pre>
          </div>
      )}

      {showSaveModal && (
          <SaveModal 
            request={request} 
            collections={collections} 
            onClose={() => setShowSaveModal(false)} 
            onSave={(name: string, colId: string) => {
                if (!workspaceId) return;
                // Implement save logic via parent or API call
                pluginFetch(`/api/http/${workspaceId}/requests`, {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify({
                        collection_id: colId,
                        name: name,
                        method: request.method,
                        url: request.url,
                        headers: request.headers,
                        params: request.params,
                        body: request.body,
                        auth: request.auth
                    })
                }).then(() => {
                    setShowSaveModal(false);
                    alert('Saved!');
                }).catch(() => alert('Failed to save'));
            }}
          />
      )}

      <div className="editor-tabs">
        {['params', 'headers', 'body', 'auth'].map(tab => (
          <button 
            key={tab} 
            className={`editor-tab ${activeTab === tab ? 'active' : ''}`}
            onClick={() => setActiveTab(tab as any)}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
            {tab === 'headers' && ` (${request.headers.filter(h => h.enabled && h.key).length})`}
            {tab === 'params' && ` (${request.params.filter(p => p.enabled && p.key).length})`}
          </button>
        ))}
      </div>

      <div className="editor-content">
        {activeTab === 'params' && (
          <div className="kv-editor">
            {request.params.map((p, i) => (
              <div key={i} className="kv-row">
                <input type="checkbox" checked={p.enabled} onChange={e => updateParam(i, 'enabled', e.target.checked)} />
                <input type="text" placeholder="Key" value={p.key} onChange={e => updateParam(i, 'key', e.target.value)} />
                <input type="text" placeholder="Value" value={p.value} onChange={e => updateParam(i, 'value', e.target.value)} />
                <button onClick={() => removeParam(i)}><Trash2 size={14} /></button>
              </div>
            ))}
            <button className="add-btn" onClick={addParam}><Plus size={14} /> Add Param</button>
          </div>
        )}

        {activeTab === 'headers' && (
          <div className="kv-editor">
            {request.headers.map((h, i) => (
              <div key={i} className="kv-row">
                <input type="checkbox" checked={h.enabled} onChange={e => updateHeader(i, 'enabled', e.target.checked)} />
                <input type="text" placeholder="Key" value={h.key} onChange={e => updateHeader(i, 'key', e.target.value)} />
                <input type="text" placeholder="Value" value={h.value} onChange={e => updateHeader(i, 'value', e.target.value)} />
                <button onClick={() => removeHeader(i)}><Trash2 size={14} /></button>
              </div>
            ))}
            <button className="add-btn" onClick={addHeader}><Plus size={14} /> Add Header</button>
          </div>
        )}

        {activeTab === 'body' && (
          <div className="body-editor">
             <div className="body-options">
                 {['none', 'json', 'form', 'raw'].map(t => (
                     <label key={t}>
                         <input 
                            type="radio" 
                            name="bodyType" 
                            checked={request.body.type === t} 
                            onChange={() => updateField('body', { ...request.body, type: t })}
                         /> {t.toUpperCase()}
                     </label>
                 ))}
             </div>
             {request.body.type !== 'none' && (
                 <textarea 
                    value={request.body.content}
                    onChange={e => updateField('body', { ...request.body, content: e.target.value })}
                    placeholder="Enter body content..."
                 />
             )}
          </div>
        )}

        {activeTab === 'auth' && (
           <div className="auth-editor">
               <div className="auth-type">
                   <select 
                      value={request.auth.type} 
                      onChange={e => updateField('auth', { ...request.auth, type: e.target.value })}
                   >
                       <option value="none">No Auth</option>
                       <option value="basic">Basic Auth</option>
                       <option value="bearer">Bearer Token</option>
                   </select>
               </div>
               
               {request.auth.type === 'basic' && (
                   <div className="auth-fields">
                       <input 
                          type="text" 
                          placeholder="Username" 
                          value={request.auth.username || ''} 
                          onChange={e => updateField('auth', { ...request.auth, username: e.target.value })} 
                       />
                       <input 
                          type="password" 
                          placeholder="Password" 
                          value={request.auth.password || ''} 
                          onChange={e => updateField('auth', { ...request.auth, password: e.target.value })} 
                       />
                   </div>
               )}

               {request.auth.type === 'bearer' && (
                   <div className="auth-fields">
                       <input 
                          type="text" 
                          placeholder="Token" 
                          value={request.auth.token || ''} 
                          onChange={e => updateField('auth', { ...request.auth, token: e.target.value })} 
                       />
                   </div>
               )}
           </div>
        )}
      </div>
    </div>
  );
};

// Simple Modal for Saving
const SaveModal = ({ request, collections, onClose, onSave }: any) => {
    const [name, setName] = useState(request.name || 'New Request');
    const [collectionId, setCollectionId] = useState(collections[0]?.id || '');

    return (
        <div className="modal-overlay">
            <div className="modal">
                <h3>Save Request</h3>
                <label>Name</label>
                <input value={name} onChange={e => setName(e.target.value)} />
                <label>Collection</label>
                <select value={collectionId} onChange={e => setCollectionId(e.target.value)}>
                    {collections.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="modal-actions">
                    <button onClick={onClose}>Cancel</button>
                    <button onClick={() => onSave(name, collectionId)} disabled={!collectionId}>Save</button>
                </div>
            </div>
        </div>
    );
};
