import React, { useState, useEffect } from 'react';
import './HttpTester.css';
import { Sidebar } from './components/Sidebar';
import { RequestPanel } from './components/RequestPanel';
import { ResponsePanel } from './components/ResponsePanel';
import { EnvironmentManager } from './components/EnvironmentManager';
import { Plus, X, Settings, PanelLeft } from 'lucide-react';
import type { HttpRequest, HttpResponse, Collection, Environment } from './types';
import { pluginFetch } from '../authHelper';

const HttpTester = () => {
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [tabs, setTabs] = useState<HttpRequest[]>([{
    id: '1',
    name: 'New Request',
    method: 'GET',
    url: 'https://jsonplaceholder.typicode.com/todos/1',
    headers: [{ key: '', value: '', enabled: true }],
    params: [{ key: '', value: '', enabled: true }],
    body: { type: 'none', content: '' },
    auth: { type: 'none' }
  }]);
  
  const [activeTabId, setActiveTabId] = useState<string>('1');
  const [responses, setResponses] =useState<Record<string, HttpResponse | null>>({});
  const [loadings, setLoadings] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [collections, setCollections] = useState<Collection[]>([]);
  
  // Environment State
  const [environments, setEnvironments] = useState<Environment[]>([]);
  const [activeEnvId, setActiveEnvId] = useState<string>('none');
  const [isEnvManagerOpen, setIsEnvManagerOpen] = useState(false);
  
  // Resizing state
  const [splitPos, setSplitPos] = useState(50); // percentage
  const [isResizing, setIsResizing] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const workspaceId = urlParams.get('workspaceId');

  // Fetch initial data
  const fetchData = async () => {
      try {
          const [colsRes, envsRes] = await Promise.all([
              pluginFetch(`/api/http/${workspaceId}/collections`),
              pluginFetch(`/api/http/${workspaceId}/environments`)
          ]);
          setCollections(await colsRes.json());
          setEnvironments(await envsRes.json());
      } catch (e) {
          console.error('Failed to fetch initial data', e);
      }
  };

  useEffect(() => {
      if(workspaceId) fetchData();
  }, [workspaceId]);

  const handleMouseDown = (e: React.MouseEvent) => {
      e.preventDefault();
      setIsResizing(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
      if (!isResizing) return;
      
      const container = e.currentTarget.getBoundingClientRect();
      const newPos = ((e.clientX - container.left) / container.width) * 100;
      
      // Limit constraints (min 20%, max 80%)
      if (newPos > 20 && newPos < 80) {
          setSplitPos(newPos);
      }
  };

  const handleMouseUp = () => {
      setIsResizing(false);
  };

  const activeReq = tabs.find(t => t.id === activeTabId);
  const activeEnv = environments.find(e => e.id === activeEnvId);

  const addTab = () => {
    const newId = Date.now().toString();
    setTabs([...tabs, {
      id: newId,
      name: 'New Request',
      method: 'GET',
      url: '',
      headers: [{ key: '', value: '', enabled: true }],
      params: [{ key: '', value: '', enabled: true }],
      body: { type: 'none', content: '' },
      auth: { type: 'none' }
    }]);
    setActiveTabId(newId);
  };

  const closeTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (tabs.length === 1) return; 
    const newTabs = tabs.filter(t => t.id !== id);
    setTabs(newTabs);
    if (activeTabId === id) {
      setActiveTabId(newTabs[newTabs.length - 1].id!);
    }
  };

  const updateRequest = (req: HttpRequest) => {
    setTabs(tabs.map(t => t.id === req.id ? req : t));
  };

  const handleLoadRequest = (req: HttpRequest) => {
    const newId = Date.now().toString();
    setTabs([...tabs, { ...req, id: newId }]);
    setActiveTabId(newId);
  };

  const replaceVariables = (str: string) => {
      if (!activeEnv || !str) return str;
      let result = str;
      activeEnv.variables.forEach(v => {
          if (v.key) {
              const regex = new RegExp(`{{${v.key}}}`, 'g');
              result = result.replace(regex, v.value);
          }
      });
      return result;
  };

  const handleSend = async () => {
    if (!activeReq || !workspaceId) return;
    const reqId = activeReq.id!;
    
    setLoadings(prev => ({ ...prev, [reqId]: true }));
    setErrors(prev => ({ ...prev, [reqId]: null }));
    setResponses(prev => ({ ...prev, [reqId]: null }));

    try {
      // Build query params
      const activeParams = activeReq.params.filter(p => p.enabled && p.key);
      const queryString = activeParams.map(p => {
          const key = replaceVariables(p.key);
          const val = replaceVariables(p.value);
          return `${encodeURIComponent(key)}=${encodeURIComponent(val)}`;
      }).join('&');
      
      const baseUrl = replaceVariables(activeReq.url);
      const finalUrl = queryString ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}${queryString}` : baseUrl;

      // Build headers
      const activeHeaders = activeReq.headers.reduce((acc, h) => {
        if (h.enabled && h.key) {
            const key = replaceVariables(h.key);
            const val = replaceVariables(h.value);
            acc[key] = val;
        }
        return acc;
      }, {} as Record<string, string>);

      // Handle Auth
      if (activeReq.auth.type === 'basic' && activeReq.auth.username) {
          const user = replaceVariables(activeReq.auth.username);
          const pass = replaceVariables(activeReq.auth.password || '');
          const creds = btoa(`${user}:${pass}`);
          activeHeaders['Authorization'] = `Basic ${creds}`;
      } else if (activeReq.auth.type === 'bearer' && activeReq.auth.token) {
          const token = replaceVariables(activeReq.auth.token);
          activeHeaders['Authorization'] = `Bearer ${token}`;
      }

      const payload = {
        method: activeReq.method,
        url: finalUrl,
        headers: activeHeaders,
        body: activeReq.body.type === 'none' ? undefined : { 
            type: activeReq.body.type, 
            content: replaceVariables(activeReq.body.content) 
        },
        saveHistory: true
      };

      const res = await pluginFetch(`/api/http/${workspaceId}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (res.status >= 400 && data.message) throw new Error(data.message);
      
      setResponses(prev => ({ ...prev, [reqId]: data }));
    } catch (err: any) {
      setErrors(prev => ({ ...prev, [reqId]: err.message || 'Request Failed' }));
    } finally {
      setLoadings(prev => ({ ...prev, [reqId]: false }));
    }
  };

  return (
    <div className={`http-tester-layout ${!sidebarVisible ? 'sidebar-hidden' : ''}`}>
      <div className="sidebar-container">
        <Sidebar onLoadRequest={handleLoadRequest} />
      </div>
      
      <div className="main-area">
        <div className="top-toolbar">
            <div className="tabs-bar">
              <button className="sidebar-toggle-btn" onClick={() => setSidebarVisible(!sidebarVisible)}>
                <PanelLeft size={16} />
              </button>
                {tabs.map(tab => (
                    <div 
                        key={tab.id} 
                        className={`request-tab ${activeTabId === tab.id ? 'active' : ''}`}
                        onClick={() => setActiveTabId(tab.id!)}
                    >
                    <span className={`method-dot ${tab.method.toLowerCase()}`}></span>
                    <span className="tab-name">{tab.name}</span>
                    <button className="close-tab" onClick={(e) => closeTab(e, tab.id!)}><X size={12}/></button>
                    </div>
                ))}
                <button className="add-tab-btn" onClick={addTab}><Plus size={14}/></button>
            </div>
            
            <div className="env-toolbar">
                <select 
                    value={activeEnvId} 
                    onChange={e => setActiveEnvId(e.target.value)}
                    className="env-select"
                >
                    <option value="none">No Environment</option>
                    {environments.map(env => (
                        <option key={env.id} value={env.id}>{env.name}</option>
                    ))}
                </select>
                <button className="env-settings-btn" onClick={() => setIsEnvManagerOpen(true)}>
                    <Settings size={16}/>
                </button>
            </div>
        </div>

        <div className="workspace-split" onMouseMove={handleMouseMove} onMouseUp={handleMouseUp} onMouseLeave={handleMouseUp}>
           {activeReq && (
               <>
                 <div className="request-pane" style={{ width: `${splitPos}%` }}>
                    <RequestPanel 
                       request={activeReq} 
                       onRequestChange={updateRequest} 
                       onSend={handleSend}
                       loading={loadings[activeReq.id!] || false}
                       collections={collections}
                    />
                 </div>
                 
                 <div className="resize-handle" onMouseDown={handleMouseDown} />

                 <div className="response-pane" style={{ width: `${100 - splitPos}%` }}>
                    <ResponsePanel 
                       response={responses[activeReq.id!] || null} 
                       loading={loadings[activeReq.id!] || false}
                       error={errors[activeReq.id!] || null}
                    />
                 </div>
               </>
           )}
        </div>
      </div>

      <EnvironmentManager 
        isOpen={isEnvManagerOpen} 
        onClose={() => setIsEnvManagerOpen(false)} 
        onEnvironmentChanged={fetchData}
      />
    </div>
  );
};

export default HttpTester;
