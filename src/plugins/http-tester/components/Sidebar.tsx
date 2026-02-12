import React, { useState, useEffect } from 'react';
import './Sidebar.css';
import { Clock, Folder, Plus, Trash2, ChevronRight, ChevronDown, Search } from 'lucide-react';
import type { Collection, HistoryItem, HttpRequest } from '../types';
import { pluginFetch } from '../../authHelper';

interface SidebarProps {
  onLoadRequest: (req: HttpRequest) => void;
  currentRequest?: HttpRequest;
}

export const Sidebar: React.FC<SidebarProps> = ({ onLoadRequest }) => {
  const [activeTab, setActiveTab] = useState<'history' | 'collections'>('collections');
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [expandedCollections, setExpandedCollections] = useState<Record<string, boolean>>({});
  const [searchTerm, setSearchTerm] = useState('');

  const urlParams = new URLSearchParams(window.location.search);
  const workspaceId = urlParams.get('workspaceId');

  const fetchHistory = async () => {
    if (!workspaceId) return;
    try {
      const res = await pluginFetch(`/api/http/${workspaceId}/history`);
      const data = await res.json();
      setHistory(data);
    } catch (e) {
      console.error('Failed to fetch history', e);
    }
  };

  const fetchCollections = async () => {
    if (!workspaceId) return;
    try {
      const res = await pluginFetch(`/api/http/${workspaceId}/collections`);
      const data = await res.json();
      
      const collectionsWithRequests = await Promise.all(data.map(async (c: any) => {
          const reqsRes = await pluginFetch(`/api/http/${workspaceId}/collections/${c.id}/requests`);
          const reqs = await reqsRes.json();
          return { ...c, requests: reqs };
      }));
      
      setCollections(collectionsWithRequests);
    } catch (e) {
      console.error('Failed to fetch collections', e);
    }
  };

  useEffect(() => {
    if (workspaceId) {
        if (activeTab === 'history') fetchHistory();
        else fetchCollections();
    }
  }, [activeTab, workspaceId]);

  const toggleCollection = (id: string) => {
    setExpandedCollections(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const createCollection = async () => {
      if (!workspaceId) return;
      const name = prompt('Collection Name:');
      if (!name) return;
      
      try {
          await pluginFetch(`/api/http/${workspaceId}/collections`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name })
          });
          fetchCollections();
      } catch (e) {
          alert('Failed to create collection');
      }
  };

  const deleteCollection = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (!workspaceId) return;
      if (!confirm('Delete collection and all its requests?')) return;
      try {
          await pluginFetch(`/api/http/${workspaceId}/collections/${id}`, { method: 'DELETE' });
          fetchCollections();
      } catch (e) {
          alert('Failed to delete collection');
      }
  };

  const deleteRequest = async (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if (!workspaceId) return;
      if (!confirm('Delete request?')) return;
      try {
          await pluginFetch(`/api/http/${workspaceId}/requests/${id}`, { method: 'DELETE' });
          fetchCollections();
      } catch (e) {
          alert('Failed to delete request');
      }
  };
  
  const clearHistory = async () => {
      if (!workspaceId) return;
      if(!confirm('Clear all history?')) return;
      await pluginFetch(`/api/http/${workspaceId}/history`, { method: 'DELETE' });
      fetchHistory();
  };

  return (
    <div className="http-sidebar">
      <div className="sidebar-tabs">
        <button 
          className={`sidebar-tab ${activeTab === 'collections' ? 'active' : ''}`}
          onClick={() => setActiveTab('collections')}
        >
          <Folder size={16} /> Collections
        </button>
        <button 
          className={`sidebar-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <Clock size={16} /> History
        </button>
      </div>

      <div className="sidebar-search">
         <Search size={14} />
         <input 
            type="text" 
            placeholder="Filter..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
         />
      </div>

      <div className="sidebar-content">
        {activeTab === 'collections' && (
          <div className="collections-list">
             <div className="list-header">
                <span>Your Collections</span>
                <button onClick={createCollection} title="New Collection"><Plus size={16}/></button>
             </div>
             {collections.map(col => (
               <div key={col.id} className="collection-item">
                 <div className="collection-header" onClick={() => toggleCollection(col.id)}>
                   <span className="icon">
                     {expandedCollections[col.id] ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}
                   </span>
                   <span className="name">{col.name}</span>
                   <button className="delete-btn" onClick={(e) => deleteCollection(e, col.id)}>
                     <Trash2 size={12}/>
                   </button>
                 </div>
                 {expandedCollections[col.id] && (
                   <div className="collection-requests">
                     {col.requests?.map(req => (
                       <div key={req.id} className="request-item" onClick={() => onLoadRequest(req)}>
                         <span className={`method ${req.method.toLowerCase()}`}>{req.method}</span>
                         <span className="req-name">{req.name}</span>
                         <button className="delete-btn" onClick={(e) => deleteRequest(e, req.id!)}>
                            <Trash2 size={12}/>
                         </button>
                       </div>
                     ))}
                     {(!col.requests || col.requests.length === 0) && (
                         <div className="empty-collection">No requests</div>
                     )}
                   </div>
                 )}
               </div>
             ))}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="history-list">
             <div className="list-header">
                 <span>Recent</span>
                 <button onClick={clearHistory} title="Clear History"><Trash2 size={16}/></button>
             </div>
             {history.map(item => (
               <div key={item.id} className="history-item" onClick={() => {
                   // Convert history item to request
                   const req: HttpRequest = {
                       method: item.method,
                       url: item.url,
                       headers: Object.entries(item.request_data.headers || {}).map(([k, v]) => ({ key: k, value: v as string, enabled: true })),
                       params: [], // URL params are in URL
                       body: item.request_data.body || { type: 'none', content: '' },
                       auth: { type: 'none' },
                       name: 'History Item'
                   };
                   onLoadRequest(req);
               }}>
                 <span className={`method ${item.method.toLowerCase()}`}>{item.method}</span>
                 <div className="url" title={item.url}>{item.url}</div>
                 <span className={`status ${item.status >= 200 && item.status < 300 ? 'success' : 'error'}`}>{item.status}</span>
               </div>
             ))}
          </div>
        )}
      </div>
    </div>
  );
};
