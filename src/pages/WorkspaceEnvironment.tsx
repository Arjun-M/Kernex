import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import UnifiedSidebar, { type SidebarItem } from '../components/layout/UnifiedSidebar';
import Canvas from '../canvas/Canvas';
import PluginDrawer from '../components/drawer/PluginDrawer';
import SearchBar from '../components/search/SearchBar';
import type { NodeData, Workspace } from '../types';

import NotesApp from '../plugins/notes/NotesApp';
import { type ToolType } from '../canvas/ToolSwitcher';
import { useSettings } from '../app/SettingsContext';
import { useAuth } from '../app/AuthContext';
import { authFetch } from '../app/authFetch';
import { Folder, Package, Settings, ArrowLeft } from 'lucide-react';
import { workspaceApi } from '../api/workspace';
import { useToast } from '../app/ToastContext';

const WorkspaceEnvironment: React.FC = () => {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const { success } = useToast();
  
  useEffect(() => {
      if (workspaceId) {
          workspaceApi.list().then(list => {
              const found = list.find(w => w.id === workspaceId);
              if (found) {
                  setWorkspace(found);
                  document.title = `Workspace ${found.name}`;
              }
          });
      }
  }, [workspaceId]);

  const { sidebarCollapsed, setSidebarCollapsed } = useSettings();
  const { sessionId } = useAuth();
  const navigate = useNavigate();
  const [isPluginDrawerOpen, setIsPluginDrawerOpen] = useState(false);
  const [activeSidebarItem] = useState('files'); 

  // Auto-collapse sidebar when drawer opens
  useEffect(() => {
    if (isPluginDrawerOpen) {
      const timer = setTimeout(() => {
        setSidebarCollapsed(true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isPluginDrawerOpen, setSidebarCollapsed]);

  const handleToggleSidebar = useCallback(() => {
    setSidebarCollapsed(!sidebarCollapsed);
  }, [sidebarCollapsed, setSidebarCollapsed]);

  const handleTogglePluginDrawer = useCallback(() => {
    setIsPluginDrawerOpen(prev => !prev);
  }, []);

  const [nodes, setNodes] = useState<NodeData[]>([]);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [gridType, setGridType] = useState<'dots' | 'lines' | 'none'>('dots');
  const [activeTool, setActiveTool] = useState<ToolType>('cursor');
  const [isLoaded, setIsLoaded] = useState(false);

  const saveCanvasState = useCallback(async (currentNodes: NodeData[], currentViewport: { x: number, y: number, zoom: number }, currentTool: ToolType) => {
    if (!workspaceId) return;

    // Strip out non-serializable content before saving
    const serializableNodes = currentNodes.map(n => {
        const { content, ...rest } = n;
        return rest;
    });

    try {
        await authFetch('/api/canvas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                workspaceId,
                viewport: currentViewport,
                nodes: serializableNodes,
                activeTool: currentTool
            })
        });
    } catch (e) {
        console.error('Failed to save canvas state', e);
    }
  }, [workspaceId]);

  const handleManualSave = useCallback(() => {
      saveCanvasState(nodes, { x: panOffset.x, y: panOffset.y, zoom }, activeTool);
      success('Workspace saved');
  }, [nodes, panOffset, zoom, activeTool, saveCanvasState, success]);

  const handleUpdateNode = useCallback((id: string, updates: Partial<NodeData>) => {
      setNodes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
  }, []);

  // Periodic Save (Every 60s)
  useEffect(() => {
    if (!isLoaded || !workspaceId) return;
    const interval = setInterval(() => {
      saveCanvasState(nodes, { x: panOffset.x, y: panOffset.y, zoom }, activeTool);
    }, 60000);
    return () => clearInterval(interval);
  }, [isLoaded, nodes, panOffset, zoom, activeTool, saveCanvasState, workspaceId]);

  // Helper to create node content with bindings
  const createNodeContent = useCallback((appId: string) => {
      switch(appId) {
          case 'notes': return (
              <NotesApp />
          );
          default: return null;
      }
  }, [handleUpdateNode]);

  // Load Canvas State
  useEffect(() => {
    if (!sessionId || !workspaceId) return;

    const loadState = async () => {
        try {
            const res = await authFetch(`/api/canvas?workspaceId=${workspaceId}`);
            const data = await res.json();
            
            const restoredNodes = (data.nodes || []).map((n: any) => {
                // Add token and workspaceId to iframeSrc if missing
                if (n.type === 'iframe' && n.iframeSrc) {
                    let src = n.iframeSrc;
                    if (!src.includes('token=')) {
                        src += (src.includes('?') ? '&' : '?') + `token=${sessionId}`;
                    }
                    if (!src.includes('workspaceId=')) {
                        src += `&workspaceId=${workspaceId}`;
                    }
                    n.iframeSrc = src;
                }

                // Restore React content
                if (n.type === 'react' && !n.content) {
                    let appId = '';
                    if (n.title === 'File Manager') appId = 'files';
                    if (n.title === 'Notes') appId = 'notes'; 
                    
                    if (appId) {
                        n.content = createNodeContent(appId);
                    }
                }
                return n;
            });
            
            setNodes(restoredNodes);
            
            if (data.viewport) {
                setZoom(data.viewport.zoom);
                if (data.viewport.x !== undefined && data.viewport.y !== undefined) {
                    setPanOffset({ x: data.viewport.x, y: data.viewport.y });
                }
            }

            if (data.activeTool) {
                setActiveTool(data.activeTool);
            }

            setIsLoaded(true);
        } catch (e) {
            console.error('Failed to load canvas state', e);
            setIsLoaded(true);
        }
    };
    loadState();
  }, [sessionId, workspaceId, createNodeContent]);

  const handleSelectNode = useCallback((id: string | null, multi: boolean) => {
    setNodes(prev => prev.map(n => {
      if (id === null) return { ...n, selected: false };
      if (n.id === id) {
          return { ...n, selected: true, zIndex: Math.max(...prev.map(p => p.zIndex)) + 1 };
      }
      return multi ? n : { ...n, selected: false };
    }));
  }, []);

  // Keyboard Shortcuts (Same as WorkspacePage)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarCollapsed(!sidebarCollapsed);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleManualSave();
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        setIsPluginDrawerOpen(prev => !prev);
      }
      if (e.ctrlKey || e.metaKey) {
        if (e.key === '=' || e.key === '+') {
          e.preventDefault();
          setZoom(z => Math.min(5, z + 0.1));
        }
        if (e.key === '-') {
          e.preventDefault();
          setZoom(z => Math.max(0.1, z - 0.1));
        }
        if (e.key === '0') {
            e.preventDefault();
            setZoom(1);
            setPanOffset({ x: 0, y: 0 });
        }
        if (e.key === 'g' && (e.ctrlKey || e.metaKey)) {
             e.preventDefault();
             setGridType(prev => prev === 'dots' ? 'lines' : prev === 'lines' ? 'none' : 'dots');
        }
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
        setNodes(prev => prev.filter(n => !n.selected));
      }
      if (e.key === 'Escape') {
        if (isPluginDrawerOpen) {
            setIsPluginDrawerOpen(false);
        } else {
            handleSelectNode(null, false);
        }
      }
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
         if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
         e.preventDefault();
         const delta = e.shiftKey ? 10 : 1;
         setNodes(prev => prev.map(n => {
             if (!n.selected || n.locked) return n;
             let { x, y } = n;
             if (e.key === 'ArrowUp') y -= delta;
             if (e.key === 'ArrowDown') y += delta;
             if (e.key === 'ArrowLeft') x -= delta;
             if (e.key === 'ArrowRight') x += delta;
             return { ...n, x, y };
         }));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPluginDrawerOpen, handleSelectNode, sidebarCollapsed, setSidebarCollapsed, handleManualSave]);

  const addNode = useCallback((type: string, title: string, options: { 
      content?: React.ReactNode, 
      iframeSrc?: string | null, 
      appId?: string,
      data?: any,
      initialPosition?: { x: number, y: number }
  } = {}) => {
    const id = `node-${Date.now()}`;
    let nextX: number;
    let nextY: number;

    if (options.initialPosition) {
        nextX = options.initialPosition.x;
        nextY = options.initialPosition.y;
    } else {
        const centerX = (window.innerWidth / 2 - panOffset.x) / zoom;
        const centerY = (window.innerHeight / 2 - panOffset.y) / zoom;
        nextX = centerX - 400;
        nextY = centerY - 300;
        const step = 30;
        const threshold = 10;
        let attempts = 0;
        while (nodes.some(n => Math.abs(n.x - nextX) < threshold && Math.abs(n.y - nextY) < threshold) && attempts < 20) {
            nextX += step;
            nextY += step;
            attempts++;
        }
    }

    let content = options.content;
    if (options.appId && type === 'react') {
        content = createNodeContent(options.appId);
    }
    
    const newNode: NodeData = {
      id,
      x: nextX, 
      y: nextY, 
      width: 800,
      height: 600,
      type,
      content,
      iframeSrc: options.iframeSrc || null,
      title,
      zIndex: nodes.length + 1,
      selected: true, 
      minimized: false,
      maximized: false,
      locked: false,
      data: options.data
    };
    
    const nextNodes = [...nodes.map(n => ({ ...n, selected: false })), newNode];
    setNodes(nextNodes);
    saveCanvasState(nextNodes, { x: panOffset.x, y: panOffset.y, zoom }, activeTool);
  }, [nodes, panOffset, zoom, activeTool, createNodeContent, saveCanvasState]);

  const handleLaunchApp = useCallback((appId: string, initialData?: any) => {
      // System apps - Updated for local workspace settings
      switch(appId) {
          case 'settings': navigate(`/workspace/${workspaceId}/settings`); return;
          case 'security': navigate('/system/security'); return;
          case 'back': navigate('/workspace'); return;
      }

      let title = 'App';
      let type = 'react';
      
      const appendParams = (url: string) => {
          const sep = url.includes('?') ? '&' : '?';
          return `${url}${sep}token=${sessionId}&workspaceId=${workspaceId}`;
      };

      switch(appId) {
          case 'files':
              title = 'File Manager';
              type = 'iframe';
              let src = '/i/files/index.html';
              const params = [];
              if (initialData?.initialPath) params.push(`initialPath=${encodeURIComponent(initialData.initialPath)}`);
              if (initialData?.scope) params.push(`scope=${encodeURIComponent(initialData.scope)}`);
              
              if (params.length > 0) src += `?${params.join('&')}`;
              
              addNode(type, title, { iframeSrc: appendParams(src), data: initialData });
              return;
          case 'terminal':
              title = 'Terminal';
              type = 'iframe';
              addNode(type, title, { iframeSrc: appendParams('/i/terminal/index.html'), data: initialData });
              return;
          case 'notes': 
              title = 'Notes'; 
              type = 'iframe'; 
              addNode(type, title, { iframeSrc: appendParams('/i/notes/index.html'), data: initialData });
              return;
          case 'photo-viewer':
              title = 'Photo Viewer';
              type = 'iframe';
              let pvSrc = '/i/photo-viewer/index.html';
              if (initialData?.file) pvSrc += `?file=${encodeURIComponent(initialData.file)}`;
              addNode(type, title, { iframeSrc: appendParams(pvSrc), data: initialData });
              return;
          case 'image-studio':
              title = 'Image Studio';
              type = 'iframe';
              let isSrc = '/i/image-studio/index.html';
              if (initialData?.initialPath) isSrc += `?initialPath=${encodeURIComponent(initialData.initialPath)}`;
              addNode(type, title, { iframeSrc: appendParams(isSrc), data: initialData });
              return;
          case 'url-tracer':
              title = 'URL Tracer';
              type = 'iframe';
              let utSrc = '/i/url-tracer/index.html';
              if (initialData?.initialUrl) utSrc += `?initialUrl=${encodeURIComponent(initialData.initialUrl)}`;
              addNode(type, title, { iframeSrc: appendParams(utSrc), data: initialData });
              return;
          // ... Add other apps as needed
          default:
             // Fallback for others
             if (appId) {
                 const knownPlugins = ['http-tester', 'short-urls', 'db-viewer', 'hash', 'base64', 'jwt', 'uuid', 'password', 'hmac', 'encryption', 'json', 'yaml', 'csv', 'diff', 'regex', 'markdown', 'logs-viewer', 'xml'];
                 if (knownPlugins.includes(appId)) {
                     // const pluginName = appId.replace('-viewer', '').replace('-tester', ''); 
                     let url = `/i/${appId}/index.html`;
                     if (appId === 'db-viewer') url = '/i/db/index.html';
                     
                     addNode('iframe', title, { iframeSrc: appendParams(url), data: initialData });
                     return;
                 }
                 addNode(type, title, { appId, data: initialData });
             }
      }
  }, [navigate, addNode, sessionId, workspaceId]);

  // Listen for messages from plugins (iframes)
  useEffect(() => {
      const handleMessage = (e: MessageEvent) => {
          if (e.data && e.data.type === 'OPEN_APP') {
              const { appId, data } = e.data;
              handleLaunchApp(appId, data);
          }
      };
      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
  }, [handleLaunchApp]);

  const handleNodeMove = (id: string, newX: number, newY: number) => {
    setNodes((prevNodes) => prevNodes.map((node) => (node.id === id ? { ...node, x: newX, y: newY } : node)));
  };

  const handleNodeResize = (id: string, newWidth: number, newHeight: number) => {
    setNodes((prevNodes) => prevNodes.map((node) => node.id === id ? { ...node, width: newWidth, height: newHeight } : node));
  };

  const closeNode = (id: string) => {
    setNodes((prevNodes) => {
      const next = prevNodes.filter(node => node.id !== id);
      saveCanvasState(next, { x: panOffset.x, y: panOffset.y, zoom }, activeTool);
      return next;
    });
  };

  const handleSearchAction = useCallback((kind: string, payload: any) => {
      console.log('Search in workspace', kind, payload);
  }, []);

  const sidebarItems: SidebarItem[] = [
      { id: 'back', label: 'All Workspaces', icon: <ArrowLeft size={20} />, action: () => navigate('/workspace') },
      { isDivider: true, groupLabel: 'Workspace' },
      { id: 'files', label: 'File Manager', icon: <Folder size={20} />, action: () => handleLaunchApp('files') },
      { id: 'plugins', label: 'Plugins', icon: <Package size={20} />, action: handleTogglePluginDrawer },
      { isDivider: true, groupLabel: 'System' },
      { id: 'settings', label: 'Settings', icon: <Settings size={20} />, action: () => handleLaunchApp('settings') },
  ];

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      backgroundColor: 'var(--bg-primary)',
      position: 'relative',
      display: 'flex'
    }}>
      <UnifiedSidebar
        items={sidebarItems}
        isCollapsed={sidebarCollapsed}
        onToggleCollapse={handleToggleSidebar}
        activeItem={activeSidebarItem}
      />
      
      <div style={{ flex: 1, position: 'relative', height: '100%' }}>
          <Canvas
            nodes={nodes}
            zoom={zoom}
            setZoom={setZoom}
            panOffset={panOffset}
            setPanOffset={setPanOffset}
            gridType={gridType}
            onNodeMove={handleNodeMove}
            onNodeResize={handleNodeResize}
            onCloseNode={closeNode}
            onAddNode={(type, content, iframeSrc, title, position) => addNode(type, title, { content, iframeSrc, initialPosition: position })}
            onSelectNode={handleSelectNode}
            onUpdateNode={handleUpdateNode}
            activeTool={activeTool}
            setActiveTool={setActiveTool}
            workspaceName={workspace?.name}
            isProtected={workspace?.isProtected}
            onSave={handleManualSave}
          />
          
          <SearchBar onAction={handleSearchAction} />
      </div>

      <PluginDrawer 
        isOpen={isPluginDrawerOpen} 
        onClose={() => setIsPluginDrawerOpen(false)}
        onAddPlugin={(type, title, iframeSrc) => {
            let finalSrc = iframeSrc;
             if (finalSrc && !finalSrc.includes('token=') && sessionId) {
                const separator = finalSrc.includes('?') ? '&' : '?';
                finalSrc = `${finalSrc}${separator}token=${sessionId}&workspaceId=${workspaceId}`;
            }
            addNode(type, title, { iframeSrc: finalSrc });
        }}
      />
    </div>
  );
};

export default WorkspaceEnvironment;