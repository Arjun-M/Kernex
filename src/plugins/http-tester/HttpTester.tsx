import React, { useState } from 'react';
import './HttpTester.css';
import { Play, Square, Plus, Trash2 } from 'lucide-react';
import { pluginFetch } from '../authHelper';

interface Header {
  key: string;
  value: string;
  enabled: boolean;
}

interface Param {
  key: string;
  value: string;
  enabled: boolean;
}

type BodyType = 'none' | 'json' | 'form' | 'raw';

const HttpTester = () => {
  const [method, setMethod] = useState('GET');
  const [url, setUrl] = useState('https://jsonplaceholder.typicode.com/todos/1');
  const [activeTab, setActiveTab] = useState<'params' | 'headers' | 'body' | 'auth'>('params');
  const [headers, setHeaders] = useState<Header[]>([{ key: '', value: '', enabled: true }]);
  const [params, setParams] = useState<Param[]>([{ key: '', value: '', enabled: true }]);
  const [bodyType, setBodyType] = useState<BodyType>('none');
  const [bodyContent, setBodyContent] = useState('');
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    setLoading(true);
    setResponse(null);
    setError(null);

    try {
      // Build query params
      const activeParams = params.filter(p => p.enabled && p.key);
      const queryString = activeParams.map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`).join('&');
      const finalUrl = queryString ? `${url}${url.includes('?') ? '&' : '?'}${queryString}` : url;

      // Build headers
      const activeHeaders = headers.reduce((acc, h) => {
        if (h.enabled && h.key) acc[h.key] = h.value;
        return acc;
      }, {} as Record<string, string>);

      const payload = {
        method,
        url: finalUrl,
        headers: activeHeaders,
        body: bodyType === 'none' ? undefined : { type: bodyType, content: bodyContent }
      };

      const res = await pluginFetch('/api/http/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      setResponse(data);
    } catch (err: any) {
      setError(err.message || 'Request Failed');
    } finally {
      setLoading(false);
    }
  };

  const addRow = (setter: React.Dispatch<React.SetStateAction<any[]>>) => {
    setter(prev => [...prev, { key: '', value: '', enabled: true }]);
  };

  const removeRow = (index: number, setter: React.Dispatch<React.SetStateAction<any[]>>) => {
    setter(prev => prev.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: string, value: any, setter: React.Dispatch<React.SetStateAction<any[]>>) => {
    setter(prev => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  return (
    <div className="http-tester">
      <div className="top-bar">
        <select value={method} onChange={e => setMethod(e.target.value)} className="method-select">
          {['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <input 
          type="text" 
          value={url} 
          onChange={e => setUrl(e.target.value)} 
          placeholder="Enter request URL" 
          className="url-input"
        />
        <button className="send-btn" onClick={handleSend} disabled={loading}>
          {loading ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
          {loading ? 'Cancel' : 'Send'}
        </button>
      </div>

      <div className="main-content">
        <div className="request-panel">
          <div className="tabs">
            {['params', 'headers', 'body', 'auth'].map(tab => (
              <button 
                key={tab} 
                className={`tab-btn ${activeTab === tab ? 'active' : ''}`}
                onClick={() => setActiveTab(tab as any)}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          <div className="tab-content">
            {activeTab === 'params' && (
              <div className="key-value-editor">
                {params.map((param, i) => (
                  <div key={i} className="kv-row">
                    <input type="checkbox" checked={param.enabled} onChange={e => updateRow(i, 'enabled', e.target.checked, setParams)} />
                    <input type="text" placeholder="Key" value={param.key} onChange={e => updateRow(i, 'key', e.target.value, setParams)} />
                    <input type="text" placeholder="Value" value={param.value} onChange={e => updateRow(i, 'value', e.target.value, setParams)} />
                    <button onClick={() => removeRow(i, setParams)} className="icon-btn"><Trash2 size={14} /></button>
                  </div>
                ))}
                <button onClick={() => addRow(setParams)} className="add-row-btn"><Plus size={14} /> Add Param</button>
              </div>
            )}

            {activeTab === 'headers' && (
               <div className="key-value-editor">
                {headers.map((header, i) => (
                  <div key={i} className="kv-row">
                    <input type="checkbox" checked={header.enabled} onChange={e => updateRow(i, 'enabled', e.target.checked, setHeaders)} />
                    <input type="text" placeholder="Key" value={header.key} onChange={e => updateRow(i, 'key', e.target.value, setHeaders)} />
                    <input type="text" placeholder="Value" value={header.value} onChange={e => updateRow(i, 'value', e.target.value, setHeaders)} />
                    <button onClick={() => removeRow(i, setHeaders)} className="icon-btn"><Trash2 size={14} /></button>
                  </div>
                ))}
                <button onClick={() => addRow(setHeaders)} className="add-row-btn"><Plus size={14} /> Add Header</button>
              </div>
            )}

            {activeTab === 'body' && (
              <div className="body-editor">
                <div className="body-type-select">
                  {['none', 'json', 'raw', 'form'].map(t => (
                    <label key={t}><input type="radio" checked={bodyType === t} onChange={() => setBodyType(t as BodyType)} /> {t}</label>
                  ))}
                </div>
                {bodyType !== 'none' && (
                  <textarea 
                    value={bodyContent} 
                    onChange={e => setBodyContent(e.target.value)} 
                    placeholder="Request body..."
                  />
                )}
              </div>
            )}
            
            {activeTab === 'auth' && (
                <div className="auth-editor">
                    <p>Auth settings not implemented yet in prototype.</p>
                </div>
            )}
          </div>
        </div>

        <div className="response-panel">
          {error && <div className="error-banner">{error}</div>}
          {response && (
            <>
              <div className="response-meta">
                <span className={`status-badge ${response.status >= 200 && response.status < 300 ? 'success' : 'error'}`}>
                  {response.status} {response.statusText}
                </span>
                <span>{response.timeMs}ms</span>
                <span>{response.size}B</span>
              </div>
              <div className="response-body">
                <pre>{typeof response.body === 'object' ? JSON.stringify(response.body, null, 2) : response.body}</pre>
              </div>
            </>
          )}
          {!response && !loading && !error && (
            <div className="empty-state">Response will appear here</div>
          )}
          {loading && <div className="loading-state">Sending request...</div>}
        </div>
      </div>
    </div>
  );
};

export default HttpTester;