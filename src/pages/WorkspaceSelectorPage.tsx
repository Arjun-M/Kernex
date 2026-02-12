import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { workspaceApi } from '../api/workspace';
import type { Workspace } from '../types';
import { useTitle } from '../hooks/useTitle';
import { 
  Plus, Trash2, Settings, Shield, Clock, Home,
  ChevronDown, FileText, HelpCircle,
  Github, Lock, Unlock, Eye, EyeOff, X, Upload,
  Package, Loader2
} from 'lucide-react';
import '../canvas/Node.css';
import './WorkspaceSelector.css';
import Modal from '../components/Modal';
import UnifiedSidebar, { type SidebarItem } from '../components/layout/UnifiedSidebar';
import { IconPicker, getIcon } from '../components/IconPicker';
import { authFetch } from '../app/authFetch';
import { useToast } from '../app/ToastContext';

const WorkspaceSelectorPage: React.FC = () => {
  useTitle('My Workspaces');
  const navigate = useNavigate();
  const { error } = useToast();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  
  // Create Overlay State
  const [showCreateOverlay, setShowCreateOverlay] = useState(false);
  const [createStep, setCreateStep] = useState<'select' | 'form'>('select');
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [newWorkspaceDesc, setNewWorkspaceDesc] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string>('Terminal');
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [workspacePassword, setWorkspacePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [workspaceToDelete, setWorkspaceToDelete] = useState<string | null>(null);

  // Password Prompt State
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [targetWorkspace, setTargetWorkspace] = useState<Workspace | null>(null);
  const [accessPassword, setAccessPassword] = useState('');
  const [verifying, setVerifying] = useState(false);

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      const data = await workspaceApi.list();
      setWorkspaces(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const MAX_WORKSPACE_NAME = 40;
  const MAX_WORKSPACE_DESC = 140;
  const MIN_PASSWORD_LENGTH = 6;

  const trimmedWorkspaceName = newWorkspaceName.trim();
  const trimmedWorkspacePassword = workspacePassword.trim();
  const trimmedWorkspaceDescription = newWorkspaceDesc.trim();

  const nameError =
    trimmedWorkspaceName.length === 0
      ? 'Workspace name is required.'
      : trimmedWorkspaceName.length < 3
        ? 'Use at least 3 characters.'
        : undefined;

  const passwordError =
    isPasswordProtected && trimmedWorkspacePassword.length > 0 && trimmedWorkspacePassword.length < MIN_PASSWORD_LENGTH
      ? `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
      : undefined;

  const canCreateWorkspace =
    !isCreating &&
    !nameError &&
    (!isPasswordProtected || (!!trimmedWorkspacePassword && !passwordError));

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  useEffect(() => {
    if (!showCreateOverlay) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') resetCreateForm();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [showCreateOverlay]);

  const handleCreateSubmit = async () => {
    if (!canCreateWorkspace) {
      if (nameError) error(nameError);
      if (!nameError && passwordError) error(passwordError);
      return;
    }

    setIsCreating(true);
    try {
      await workspaceApi.create(
          trimmedWorkspaceName, 
          trimmedWorkspaceDescription, 
          selectedIcon,
          isPasswordProtected ? trimmedWorkspacePassword : undefined
      );
      await fetchWorkspaces();
      resetCreateForm();
    } catch {
      error('Failed to create workspace');
    } finally {
      setIsCreating(false);
    }
  };

  const resetCreateForm = () => {
    setShowCreateOverlay(false);
    setCreateStep('select');
    setNewWorkspaceName('');
    setNewWorkspaceDesc('');
    setSelectedIcon('Terminal');
    setIsPasswordProtected(false);
    setWorkspacePassword('');
    setShowPassword(false);
    setIsCreating(false);
  };

  const handleDeleteConfirm = async () => {
    if (workspaceToDelete) {
      try {
        await workspaceApi.delete(workspaceToDelete);
        fetchWorkspaces();
        setShowDeleteModal(false);
        setWorkspaceToDelete(null);
      } catch {
        error('Failed to delete workspace');
      }
    }
  };

  const openDeleteModal = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setWorkspaceToDelete(id);
    setShowDeleteModal(true);
  };

  const handleWorkspaceClick = async (ws: Workspace) => {
      if (ws.isProtected) {
          setTargetWorkspace(ws);
          setAccessPassword('');
          setShowPasswordPrompt(true);
          return;
      }
      openWorkspace(ws.id);
  };

  const verifyAndOpen = async () => {
      if (!targetWorkspace || !accessPassword) return;
      setVerifying(true);
      try {
          // Verify password via API
          const res = await authFetch(`/api/workspaces/${targetWorkspace.id}/verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ password: accessPassword })
          });
          
          if (res.ok) {
              openWorkspace(targetWorkspace.id);
              setShowPasswordPrompt(false);
              setTargetWorkspace(null);
          } else {
              error('Incorrect password');
          }
      } catch (e) {
          console.error(e);
          error('Verification failed');
      } finally {
          setVerifying(false);
      }
  };

  const openWorkspace = async (id: string) => {
      // Optimistically navigate
      navigate(`/workspace/${id}`);
      
      // Update last opened in background
      try {
          await workspaceApi.update(id, { lastOpened: Date.now() });
      } catch (e) {
          console.error("Failed to update last opened", e);
      }
  };

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return 'Never opened';
    return new Intl.DateTimeFormat('en-US', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(new Date(timestamp));
  };

  const sidebarItems: SidebarItem[] = [
      { id: 'create-ws', label: 'New Workspace', icon: <Plus size={20} />, action: () => setShowCreateOverlay(true) },
      { id: 'home', label: 'Home', icon: <Home size={20} />, action: () => {} },
      { isDivider: true },
      { id: 'security', label: 'Security', icon: <Shield size={20} />, action: () => navigate('/system/security') },
      { id: '/system/plugins', label: 'Plugins', icon: <Package size={20} />, action: () => navigate('/system/plugins') },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} />, action: () => navigate('/settings') },
      
  ];

  const footerItems: SidebarItem[] = [
      { id: 'docs', label: 'Documentation', icon: <HelpCircle size={20} />, action: () => window.open('/docs', '_blank') },
      { id: 'github', label: 'GitHub', icon: <Github size={20} />, action: () => window.open('https://github.com/Arjun-M/Kernex', '_blank') },
  ];

  // Filter logic
  const filteredWorkspaces = workspaces.filter(ws => {
      if (activeTab === 'recent') {
          return ws.lastOpened && (Date.now() - ws.lastOpened < 7 * 24 * 60 * 60 * 1000); // Last 7 days
      }
      return true;
  });

  return (
    <div className="workspace-page">
       <UnifiedSidebar 
          items={sidebarItems} 
          footerItems={footerItems}
          isCollapsed={true} 
       />

      {/* Main Content */}
      <div className="workspace-content">
        
        <div className="personal-header">
            <div className="header-top">
                <div className="header-title-section">
                    <h1>My Workspaces</h1>
                    <div className="header-subtitle">
                        Manage and launch your personal development environments
                    </div>
                </div>
                <button 
                    className="create-workspace-btn" 
                    onClick={() => setShowCreateOverlay(true)}
                >
                    Create Workspace <ChevronDown size={16} style={{ marginLeft: 4 }}/>
                </button>
            </div>
            
            <div className="header-tabs">
                <div 
                    className={`header-tab ${activeTab === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveTab('all')}
                >
                    All Workspaces
                </div>
                <div 
                    className={`header-tab ${activeTab === 'recent' ? 'active' : ''}`}
                    onClick={() => setActiveTab('recent')}
                >
                    Recent
                </div>
            </div>
        </div>

        {loading ? (
            <div className="loading-state">
                <div>Loading workspaces...</div>
            </div>
        ) : (
            <div className="content-area">
                {workspaces.length === 0 ? (
                    <div className="empty-state-container">
                        <div className="welcome-message">👋 Welcome to Kernex!</div>
                        <div className="welcome-sub">Create your first workspace to get started</div>
                        
                        <div 
                            className="start-scratch-card"
                            onClick={() => setShowCreateOverlay(true)}
                        >
                            <div className="scratch-icon">
                                <Plus size={40} strokeWidth={1} />
                            </div>
                            <div className="scratch-text">New Empty Workspace</div>
                        </div>
                    </div>
                ) : (
                    <div className="workspace-grid">
                        {filteredWorkspaces.map(ws => (
                            <div 
                                key={ws.id} 
                                className="workspace-card"
                                onClick={() => handleWorkspaceClick(ws)}
                            >
                                <div style={{ flex: 1 }}>
                                    <div className="workspace-card-icon">
                                        {ws.isProtected ? <Lock size={28} /> : getIcon(ws.icon || 'Terminal', 28)}
                                    </div>
                                    <div className="workspace-info">
                                        <h3>
                                            {ws.name}
                                            {ws.isProtected && <Lock size={14} style={{ marginLeft: 8, color: 'var(--accent-primary)', verticalAlign: 'middle' }} />}
                                        </h3>
                                        <p className="workspace-desc">{ws.description || 'No description provided.'}</p>
                                    </div>
                                </div>

                                <div className="workspace-meta">
                                    <div className="last-opened" title={ws.lastOpened ? new Date(ws.lastOpened).toLocaleString() : ''}>
                                        <Clock size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                                        {ws.lastOpened ? `Opened ${formatDate(ws.lastOpened)}` : 'Created recently'}
                                    </div>
                                    <button 
                                        className="delete-btn"
                                        onClick={(e) => openDeleteModal(ws.id, e)}
                                        title="Delete Workspace"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))}
                         {/* Add "Create New" card to grid as well if workspaces exist */}
                         <div 
                            className="workspace-card create-card-mini"
                            onClick={() => setShowCreateOverlay(true)}
                        >
                            <Plus size={24} />
                            <span>New Workspace</span>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* Password Prompt Modal */}
        <Modal
            isOpen={showPasswordPrompt}
            onClose={() => { setShowPasswordPrompt(false); setTargetWorkspace(null); }}
            title="Protected Workspace"
            footer={
                <>
                    <button className="btn-secondary" onClick={() => setShowPasswordPrompt(false)}>Cancel</button>
                    <button 
                        className="btn-primary" 
                        onClick={verifyAndOpen} 
                        disabled={verifying || !accessPassword}
                    >
                        {verifying ? 'Verifying...' : 'Access'}
                    </button>
                </>
            }
        >
             <div className="form-group">
                <div style={{ textAlign: 'center', marginBottom: 20 }}>
                    <div style={{ 
                        width: 64, height: 64, borderRadius: '50%', 
                        backgroundColor: 'var(--bg-tertiary)', margin: '0 auto 16px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <Lock size={32} color="var(--accent-primary)" />
                    </div>
                    <p style={{ color: 'var(--text-secondary)' }}>
                        Enter the password to access <strong>{targetWorkspace?.name}</strong>
                    </p>
                </div>
                <div className="modern-input-wrapper">
                    <input 
                        type="password" 
                        className="modern-input"
                        value={accessPassword} 
                        onChange={(e) => setAccessPassword(e.target.value)}
                        placeholder="Password"
                        autoFocus
                        onKeyDown={(e) => e.key === 'Enter' && verifyAndOpen()}
                    />
                </div>
            </div>
        </Modal>

        {/* Delete Modal */}
        <Modal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            title="Delete Workspace?"
            footer={
                <>
                    <button className="btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                    <button className="btn-primary" style={{ backgroundColor: '#ef4444', borderColor: '#ef4444' }} onClick={handleDeleteConfirm}>Delete</button>
                </>
            }
        >
            <div style={{ padding: '8px 0', color: 'var(--text-secondary)' }}>
                Are you sure you want to delete this workspace? 
                <br /><br />
                All files and data within it will be <strong>permanently lost</strong>.
            </div>
        </Modal>

      </div>

      {/* Create Overlay */}
      {showCreateOverlay && (
          <div className="create-overlay" onClick={resetCreateForm}>
              <button className="overlay-close-btn" onClick={resetCreateForm}>
                  <X size={24} />
              </button>
              
              <div className="overlay-content" onClick={(e) => e.stopPropagation()}>
                  {createStep === 'select' ? (
                      <>
                          <h2 className="overlay-title">Create New Space</h2>
                          <div className="overlay-cards-container">
                              <div className="overlay-option-card" onClick={() => setCreateStep('form')}>
                                  <div className="option-icon-box">
                                      <FileText size={32} />
                                  </div>
                                  <div className="option-text">
                                      <h3>Start from scratch</h3>
                                      <p>Create a clean, empty workspace.</p>
                                  </div>
                              </div>
                              <div className="overlay-option-card disabled">
                                  <div className="option-icon-box">
                                      <Upload size={32} />
                                  </div>
                                  <div className="option-text">
                                      <h3>Import from file</h3>
                                      <p>Restore from a backup (Coming soon)</p>
                                  </div>
                              </div>
                          </div>
                      </>
                  ) : (
                      <div className="overlay-form-container">
                          <div className="workspace-form-shell">
                              <div className="workspace-live-preview">
                                  <div className="workspace-live-preview__head">Live Preview</div>
                                  <div className="workspace-live-preview__card">
                                      <div className="workspace-live-preview__icon">
                                          {isPasswordProtected ? <Lock size={28} /> : getIcon(selectedIcon, 28)}
                                      </div>
                                      <h3>{trimmedWorkspaceName || 'Untitled Workspace'}</h3>
                                      <p>{trimmedWorkspaceDescription || 'Add a short description so this workspace is easier to scan later.'}</p>
                                      <div className="workspace-live-preview__meta">
                                          <span>{isPasswordProtected ? 'Protected' : 'Open Access'}</span>
                                          <span>{selectedIcon}</span>
                                      </div>
                                  </div>
                              </div>

                              <div className="workspace-form-panel">
                                  <div className="form-header">
                                      <h2>Configure Workspace</h2>
                                      <p>Set up your new environment details.</p>
                                  </div>

                                  <div className="form-group">
                                      <div className="form-row">
                                          <label className="form-label">Workspace Name</label>
                                          <span className="field-counter">{newWorkspaceName.length}/{MAX_WORKSPACE_NAME}</span>
                                      </div>
                                      <div className="modern-input-wrapper">
                                          <input
                                              type="text"
                                              className={`modern-input ${nameError ? 'input-error' : ''}`}
                                              value={newWorkspaceName}
                                              onChange={(e) => setNewWorkspaceName(e.target.value)}
                                              placeholder="e.g. Project Alpha"
                                              onKeyDown={(e) => e.key === 'Enter' && handleCreateSubmit()}
                                              maxLength={MAX_WORKSPACE_NAME}
                                              autoFocus
                                          />
                                      </div>
                                      {nameError && <div className="field-error">{nameError}</div>}
                                  </div>

                                  <div className="form-group">
                                      <div className="form-row">
                                          <label className="form-label">Description</label>
                                          <span className="field-counter">{newWorkspaceDesc.length}/{MAX_WORKSPACE_DESC}</span>
                                      </div>
                                      <div className="modern-input-wrapper">
                                          <textarea
                                              className="modern-input modern-textarea"
                                              value={newWorkspaceDesc}
                                              onChange={(e) => setNewWorkspaceDesc(e.target.value)}
                                              placeholder="What will you use this workspace for?"
                                              maxLength={MAX_WORKSPACE_DESC}
                                              rows={3}
                                          />
                                      </div>
                                  </div>

                                  <div className="form-group">
                                      <label className="form-label">Icon</label>
                                      <div className="icon-preview-wrapper-horizontal">
                                          <div className="selected-icon-preview">
                                              {getIcon(selectedIcon, 24)}
                                          </div>
                                          <div className="icon-scroll-container">
                                              <IconPicker
                                                  selectedIcon={selectedIcon}
                                                  onSelect={setSelectedIcon}
                                                  mode="horizontal"
                                              />
                                          </div>
                                      </div>
                                  </div>

                                  <div className="form-divider" />

                                  <div className="form-group">
                                      <div
                                          className={`checkbox-card ${isPasswordProtected ? 'active' : ''}`}
                                          onClick={() => setIsPasswordProtected(!isPasswordProtected)}
                                      >
                                          <div className="checkbox-icon">
                                              {isPasswordProtected ? <Lock size={20} /> : <Unlock size={20} />}
                                          </div>
                                          <div className="checkbox-content">
                                              <span className="checkbox-title">Password Protection</span>
                                              <span className="checkbox-desc">Require password before opening this workspace</span>
                                          </div>
                                          <div className={`checkbox-toggle ${isPasswordProtected ? 'checked' : ''}`}></div>
                                      </div>
                                  </div>

                                  {isPasswordProtected && (
                                      <div className="form-group slide-down">
                                          <label className="form-label">Access Password</label>
                                          <div className="modern-input-wrapper">
                                              <input
                                                  type={showPassword ? "text" : "password"}
                                                  className={`modern-input ${passwordError ? 'input-error' : ''}`}
                                                  value={workspacePassword}
                                                  onChange={(e) => setWorkspacePassword(e.target.value)}
                                                  placeholder="Enter a secure password..."
                                                  onKeyDown={(e) => e.key === 'Enter' && handleCreateSubmit()}
                                              />
                                              <button
                                                  className="password-toggle-btn"
                                                  onClick={() => setShowPassword(!showPassword)}
                                                  tabIndex={-1}
                                                  type="button"
                                              >
                                                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                              </button>
                                          </div>
                                          <div className={`field-hint ${passwordError ? 'field-error' : ''}`}>
                                              {passwordError || `Use at least ${MIN_PASSWORD_LENGTH} characters.`}
                                          </div>
                                      </div>
                                  )}

                                  <div className="form-actions">
                                      <button className="btn-text" onClick={() => setCreateStep('select')} disabled={isCreating}>Back</button>
                                      <button
                                          className="btn-primary btn-large"
                                          onClick={handleCreateSubmit}
                                          disabled={!canCreateWorkspace}
                                      >
                                          {isCreating ? (
                                              <>
                                                  <Loader2 size={16} className="spin" style={{ marginRight: 8 }} />
                                                  Creating...
                                              </>
                                          ) : 'Create Workspace'}
                                      </button>
                                  </div>
                              </div>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      )}
    </div>
  );
};

export default WorkspaceSelectorPage;
