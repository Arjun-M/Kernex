import React, { useState } from 'react';
import './ResponsePanel.css';
import { Copy } from 'lucide-react';
import type { HttpResponse } from '../types';

interface ResponsePanelProps {
  response: HttpResponse | null;
  loading: boolean;
  error: string | null;
}

export const ResponsePanel: React.FC<ResponsePanelProps> = ({ response, loading, error }) => {
  const [activeTab, setActiveTab] = useState<'body' | 'headers'>('body');
  const [format, setFormat] = useState<'pretty' | 'raw' | 'preview'>('pretty');

  if (loading) {
    return (
      <div className="response-panel empty">
        <div className="loader"></div>
        <p>Sending Request...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="response-panel error">
        <h3>Error</h3>
        <p>{error}</p>
      </div>
    );
  }

  if (!response) {
    return (
      <div className="response-panel empty">
        <p>Response will appear here</p>
      </div>
    );
  }

  const isImage = response.headers['content-type']?.includes('image');
  const isHtml = response.headers['content-type']?.includes('text/html');

  const renderBody = () => {
    if (format === 'preview') {
       if (isImage) {
           return <div className="preview-msg">Image preview not supported in this version.</div>;
       }
       if (isHtml) {
           return (
             <iframe 
               srcDoc={response.body} 
               title="Preview" 
               className="html-preview"
               sandbox="allow-scripts"
             />
           );
       }
       return <div className="preview-msg">Preview not available for this content type.</div>;
    }

    if (format === 'raw') {
        return <pre className="raw-body">{typeof response.body === 'object' ? JSON.stringify(response.body) : response.body}</pre>;
    }

    // Pretty
    if (typeof response.body === 'object') {
        return <pre className="pretty-json">{JSON.stringify(response.body, null, 2)}</pre>;
    }
    
    // Try to prettify if string is JSON
    try {
        const obj = JSON.parse(response.body);
        return <pre className="pretty-json">{JSON.stringify(obj, null, 2)}</pre>;
    } catch {
        return <pre className="raw-body">{response.body}</pre>;
    }
  };

  const copyResponse = () => {
      const text = typeof response.body === 'object' ? JSON.stringify(response.body, null, 2) : response.body;
      navigator.clipboard.writeText(text);
  };

  return (
    <div className="response-panel">
      <div className="response-meta">
        <div className="status-group">
            <span className={`status-badge ${response.status >= 200 && response.status < 300 ? 'success' : 'error'}`}>
            {response.status} {response.statusText}
            </span>
            <span className="meta-item">{response.timeMs} ms</span>
            <span className="meta-item">{response.size} B</span>
        </div>
        <div className="actions">
            <button onClick={copyResponse} title="Copy Body"><Copy size={14}/></button>
        </div>
      </div>

      <div className="response-tabs">
        <button className={activeTab === 'body' ? 'active' : ''} onClick={() => setActiveTab('body')}>Body</button>
        <button className={activeTab === 'headers' ? 'active' : ''} onClick={() => setActiveTab('headers')}>Headers</button>
      </div>

      <div className="response-content">
        {activeTab === 'body' && (
           <>
             <div className="format-bar">
                <button className={format === 'pretty' ? 'active' : ''} onClick={() => setFormat('pretty')}>Pretty</button>
                <button className={format === 'raw' ? 'active' : ''} onClick={() => setFormat('raw')}>Raw</button>
                <button className={format === 'preview' ? 'active' : ''} onClick={() => setFormat('preview')}>Preview</button>
             </div>
             <div className="body-container">
                 {renderBody()}
             </div>
           </>
        )}

        {activeTab === 'headers' && (
          <div className="headers-list">
            {Object.entries(response.headers).map(([key, value]) => (
              <div key={key} className="header-row">
                <span className="key">{key}:</span>
                <span className="value">{value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
