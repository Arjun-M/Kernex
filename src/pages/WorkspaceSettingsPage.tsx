import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTitle } from '../hooks/useTitle';
import UnifiedSidebar, { type SidebarItem } from '../components/layout/UnifiedSidebar';
import { 
  AlertTriangle, 
  Trash2, RefreshCw, FileText, ArrowLeft, Layout, Info, Database, Save
} from 'lucide-react';
import { workspaceApi } from '../api/workspace';
import { authFetch } from '../app/authFetch';
import { useToast } from '../app/ToastContext';
import { useSettings } from '../app/SettingsContext';
import { IconPicker } from '../components/IconPicker';

const WorkspaceSettingsPage: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  useTitle(`Settings - ${workspaceId}`);
  const navigate = useNavigate();
  const { success, error } = useToast();
  const { sidebarCollapsed, setSidebarCollapsed } = useSettings();
  
  // Data State
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('box');
  
  // Logs State
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Tab State
  const [activeTab, setActiveTab] = useState('general');

  useEffect(() => {
    // Fetch workspace details
    workspaceApi.list().then(list => {
        const ws = list.find(w => w.id === workspaceId);
        if (ws) {
            setName(ws.name);
            setDescription(ws.description || '');
            setIcon(ws.icon || 'box');
        }
    });
  }, [workspaceId]);

  const handleSave = async () => {
    if (!workspaceId || !name) return;
    setLoading(true);
    try {
        const res = await authFetch(`/api/workspaces/${workspaceId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, description, icon })
        });
        if (res.ok) {
            success('Saved successfully');
        } else {
            error('Failed to save');
        }
    } catch (e) {
        console.error(e);
        error('Network error');
    } finally {
        setLoading(false);
    }
  };

  const fetchLogs = useCallback(async () => {
      setLogsLoading(true);
      try {
          // Filter logs for this workspace (client-side filtering for now as API returns all)
          // Ideally backend should support filtering by metadata->workspaceId
          const res = await authFetch('/api/logs?limit=200');
          if (res.ok) {
              const allLogs = await res.json();
              const wsLogs = allLogs.filter((l: any) => 
                  l.metadata && l.metadata.workspaceId === workspaceId
              );
              setLogs(wsLogs);
          }
      } catch (e) {
          console.error(e);
      } finally {
          setLogsLoading(false);
      }
  }, [workspaceId]);

  useEffect(() => {
      if (activeTab === 'logs') {
          fetchLogs();
      }
  }, [activeTab, fetchLogs]);

  const handleClearStates = async () => {
    if (!window.confirm('Clear all plugin states? This will reset your workspace layout and plugin sessions.')) return;
    setLoading(true);
    try {
        const res = await authFetch(`/api/workspace-state/${workspaceId}`, { method: 'DELETE' });
        if (res.ok) success('Plugin states cleared');
        else error('Failed to clear states');
    } catch { error('Network error'); }
    finally { setLoading(false); }
  };

  const handleVacuum = async () => {
      setLoading(true);
      try {
          const res = await authFetch(`/api/workspaces/${workspaceId}/maintenance/vacuum`, {
              method: 'POST'
          });
          if (res.ok) {
              success('Database optimized (VACUUM)');
          } else {
              error('Optimization failed');
          }
      } catch {
          error('Network error');
      } finally {
          setLoading(false);
      }
  };

  const handleDelete = async () => {
      const confirmStr = prompt(`To delete this workspace, type "${name}" to confirm:`);
      if (confirmStr !== name) return;

      setLoading(true);
      try {
          const res = await authFetch(`/api/workspaces/${workspaceId}`, {
              method: 'DELETE'
          });
          if (res.ok) {
              success('Workspace deleted');
              navigate('/workspace');
          } else {
              error('Failed to delete');
          }
      } catch {
          error('Network error');
      } finally {
          setLoading(false);
      }
  };

  const sidebarItems: SidebarItem[] = [
      { id: 'back', label: 'Back to Workspace', icon: <ArrowLeft size={20} />, action: () => navigate(`/workspace/${workspaceId}`) },
      { isDivider: true, groupLabel: 'Settings' },
      { id: 'general', label: 'General', icon: <Layout size={20} />, action: () => setActiveTab('general') },
      { id: 'advanced', label: 'Advanced', icon: <Database size={20} />, action: () => setActiveTab('advanced') },
      { id: 'logs', label: 'Logs', icon: <FileText size={20} />, action: () => setActiveTab('logs') },
      { isDivider: true, groupLabel: 'Danger' },
      { id: 'danger', label: 'Danger Zone', icon: <AlertTriangle size={20} />, action: () => setActiveTab('danger') },
  ];

  const renderContent = () => {
      switch (activeTab) {
          case 'general':
              return (
                <div className="card" style={{ maxWidth: '600px' }}>
                    <h3 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Info size={18} /> General Information
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div>
                            <label className="label-sm">Workspace Name</label>
                            <input className="input" value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div>
                            <label className="label-sm">Description</label>
                            <textarea className="input" rows={3} value={description} onChange={e => setDescription(e.target.value)} />
                        </div>
                        <div>
                            <label className="label-sm">Icon</label>
                            <div style={{ background: 'var(--bg-tertiary)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
                                <IconPicker selectedIcon={icon} onSelect={setIcon} mode="grid" />
                            </div>
                        </div>
                        <button className="btn-primary" onClick={handleSave} disabled={loading} style={{ alignSelf: 'flex-start', display: 'flex', gap: '8px', alignItems: 'center' }}>
                            <Save size={16} /> Save Changes
                        </button>
                    </div>
                </div>
              );
          case 'advanced':
              return (
                  <div className="card" style={{ maxWidth: '600px' }}>
                      <h3 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Database size={18} /> Maintenance
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '6px' }}>
                              <div>
                                  <div style={{ fontWeight: 600 }}>Optimize Database</div>
                                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Run VACUUM to reclaim space and optimize indices.</div>
                              </div>
                              <button className="btn-secondary" onClick={handleVacuum} disabled={loading}>
                                  <RefreshCw size={14} style={{ marginRight: 6 }} /> Optimize
                              </button>
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: 'var(--bg-tertiary)', borderRadius: '6px' }}>
                              <div>
                                  <div style={{ fontWeight: 600 }}>Clear Plugin States</div>
                                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Reset all plugin sessions and workspace layout data.</div>
                              </div>
                              <button className="btn-secondary" onClick={handleClearStates} disabled={loading}>
                                  <Trash2 size={14} style={{ marginRight: 6 }} /> Clear State
                              </button>
                          </div>
                      </div>
                  </div>
              );
           case 'logs':
              return (
                  <div className="card">
                       <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                          <h3 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
                              <FileText size={18} /> Workspace Logs
                          </h3>
                          <button className="icon-btn" onClick={fetchLogs} title="Refresh"><RefreshCw size={16}/></button>
                       </div>
                       
                       <div style={{ height: '400px', overflowY: 'auto', background: '#1e1e1e', borderRadius: '6px', padding: '10px', fontFamily: 'monospace', fontSize: '12px' }}>
                           {logsLoading && <div style={{ color: 'var(--text-secondary)' }}>Loading logs...</div>}
                           {!logsLoading && logs.length === 0 && <div style={{ color: 'var(--text-secondary)' }}>No logs found for this workspace.</div>}
                           {logs.map((log, i) => (
                               <div key={i} style={{ marginBottom: '4px', borderBottom: '1px solid #333', paddingBottom: '4px' }}>
                                   <span style={{ color: '#888' }}>{new Date(log.timestamp).toLocaleTimeString()}</span>
                                   <span style={{ margin: '0 8px', color: log.level === 'error' ? '#f87171' : log.level === 'warn' ? '#fbbf24' : '#34d399' }}>[{log.level.toUpperCase()}]</span>
                                   <span style={{ color: '#ccc' }}>{log.message}</span>
                               </div>
                           ))}
                       </div>
                  </div>
              );
          case 'danger':
              return (
                  <div className="card" style={{ maxWidth: '600px', borderColor: '#ef4444' }}>
                      <h3 style={{ fontSize: '18px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
                          <AlertTriangle size={18} /> Danger Zone
                      </h3>
                      <div style={{ padding: '16px', background: '#ef444410', borderRadius: '6px', border: '1px solid #ef444440' }}>
                          <div style={{ fontWeight: 600, marginBottom: '8px' }}>Delete Workspace</div>
                          <p style={{ fontSize: '13px', marginBottom: '16px', color: 'var(--text-secondary)' }}>
                              This action cannot be undone. All files, databases, and settings associated with <b>{name}</b> will be permanently deleted.
                          </p>
                          <button 
                              className="btn-primary" 
                              onClick={handleDelete} 
                              disabled={loading}
                              style={{ backgroundColor: '#ef4444', border: 'none' }}
                          >
                              <Trash2 size={16} style={{ marginRight: 6 }} /> Delete Workspace
                          </button>
                      </div>
                  </div>
              );
          default:
              return null;
      }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)', overflow: 'hidden' }}>
       <UnifiedSidebar 
           items={sidebarItems} 
           activeItem={activeTab} 
           isCollapsed={sidebarCollapsed}
           onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
       />
       
       <div style={{ flex: 1, overflowY: 'auto' }}>
           <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px', animation: 'fadeIn 0.2s ease-out' }}>
               <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '24px' }}>Workspace Settings</h1>
               {renderContent()}
           </div>
       </div>
    </div>
  );
};

export default WorkspaceSettingsPage;