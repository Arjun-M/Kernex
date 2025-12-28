import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../sidebar/Sidebar';
import Canvas from '../canvas/Canvas';
import PluginDrawer from '../components/drawer/PluginDrawer';
import SearchBar from '../components/search/SearchBar';
import type { NodeData } from '../types';

import NotesApp from '../plugins/notes/NotesApp';
import { type ToolType } from '../canvas/ToolSwitcher';
import { useSettings } from '../app/SettingsContext';
import { useAuth } from '../app/AuthContext';
import { authFetch } from '../app/authFetch';
import { useTitle } from '../hooks/useTitle';

const WorkspacePage: React.FC = () => {
  useTitle('Workspace');
  const { sidebarCollapsed, setSidebarCollapsed } = useSettings();
  const { sessionId } = useAuth();
  const navigate = useNavigate();
  const [isPluginDrawerOpen, setIsPluginDrawerOpen] = useState(false);
  const [activeSidebarItem, setActiveSidebarItem] = useState('files');

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

  // Sync theme logic removed - handled in App.tsx now

  const saveCanvasState = useCallback(async (currentNodes: NodeData[], currentViewport: { x: number, y: number, zoom: number }, currentTool: ToolType) => {
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
                workspaceId: 'default',
                viewport: currentViewport,
                nodes: serializableNodes,
                activeTool: currentTool
            })
        });
    } catch (e) {
        console.error('Failed to save canvas state', e);
    }
  }, []);

  const handleUpdateNode = useCallback((id: string, updates: Partial<NodeData>) => {
      setNodes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
  }, []);

  // Periodic Save (Every 60s)
  useEffect(() => {
    if (!isLoaded) return;
    const interval = setInterval(() => {
      saveCanvasState(nodes, { x: panOffset.x, y: panOffset.y, zoom }, activeTool);
    }, 60000);
    return () => clearInterval(interval);
  }, [isLoaded, nodes, panOffset, zoom, activeTool, saveCanvasState]);

  // Helper to create node content with bindings
  const createNodeContent = useCallback((appId: string, nodeId: string, initialData?: any) => {
      switch(appId) {
          case 'notes': return (
              <NotesApp 
                  initialState={initialData} 
                  onStateChange={(newState) => handleUpdateNode(nodeId, { data: newState })} 
              />
          );
          default: return null;
      }
  }, [handleUpdateNode]);

  // Load Canvas State
  useEffect(() => {
    if (!sessionId) return; // Wait for session to be ready

    const loadState = async () => {
        try {
            const res = await authFetch('/api/canvas?workspaceId=default');
            const data = await res.json();
            
            const restoredNodes = (data.nodes || []).map((n: any) => {
                // Add token to iframeSrc if missing
                if (n.type === 'iframe' && n.iframeSrc && !n.iframeSrc.includes('token=')) {
                    const separator = n.iframeSrc.includes('?') ? '&' : '?';
                    n.iframeSrc = `${n.iframeSrc}${separator}token=${sessionId}`;
                }

                // Restore React content
                if (n.type === 'react' && !n.content) {
                    // Infer appId from title or use a stored property if we had one.
                    let appId = '';
                    if (n.title === 'File Manager') appId = 'files';
                    if (n.title === 'Notes') appId = 'notes'; 
                    
                    if (appId) {
                        n.content = createNodeContent(appId, n.id, n.data);
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
  }, [createNodeContent]);

  const handleSelectNode = useCallback((id: string | null, multi: boolean) => {
    setNodes(prev => prev.map(n => {
      if (id === null) return { ...n, selected: false };
      if (n.id === id) {
          return { ...n, selected: true, zIndex: Math.max(...prev.map(p => p.zIndex)) + 1 }; // Bring to front
      }
      return multi ? n : { ...n, selected: false };
    }));
  }, []);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Sidebar (Cmd+B)
      if ((e.metaKey || e.ctrlKey) && e.key === 'b') {
        e.preventDefault();
        setSidebarCollapsed(!sidebarCollapsed);
      }

      // Toggle Plugin Drawer (Cmd+P)
      if ((e.metaKey || e.ctrlKey) && e.key === 'p') {
        e.preventDefault();
        setIsPluginDrawerOpen(prev => !prev);
      }

      // Zoom
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
        
        // Grid Toggle (G)
        if (e.key === 'g' && (e.ctrlKey || e.metaKey)) {
             e.preventDefault();
             setGridType(prev => prev === 'dots' ? 'lines' : prev === 'lines' ? 'none' : 'dots');
        }
      }

      // Delete selected
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // Don't delete if typing in input
        if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;
        
        setNodes(prev => prev.filter(n => !n.selected));
      }
      
      // Escape to deselect
      if (e.key === 'Escape') {
        if (isPluginDrawerOpen) {
            setIsPluginDrawerOpen(false);
        } else {
            handleSelectNode(null, false);
        }
      }
      
      // Nudge selected
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
  }, [isPluginDrawerOpen, handleSelectNode]);

  // Unified addNode
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
        
        // Intelligent positioning: avoid direct overlap
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
        content = createNodeContent(options.appId, id, options.data);
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
    
    const nextNodes = [
        ...nodes.map(n => ({ ...n, selected: false })), 
        newNode
    ];
    setNodes(nextNodes);
    saveCanvasState(nextNodes, { x: panOffset.x, y: panOffset.y, zoom }, activeTool);
  }, [nodes, panOffset, zoom, activeTool, createNodeContent, saveCanvasState, sessionId]);


  const handleLaunchApp = useCallback((appId: string, initialData?: any) => {
      // System apps navigate to dedicated routes
      switch(appId) {
          case 'disk': navigate('/system/disk'); return;
          case 'tasks': navigate('/system/tasks'); return;
          case 'system': navigate('/system'); return;
          case 'settings': navigate('/settings'); return;
          case 'plugins': navigate('/system/plugins'); return;
          case 'security': navigate('/system/security'); return;
      }

      let title = 'App';
      let type = 'react';
      
      switch(appId) {
          case 'files':
              title = 'File Manager';
              type = 'iframe';
              addNode(type, title, { iframeSrc: `/i/files/index.html?token=${sessionId}`, data: initialData });
              return;
          case 'notes': 
              title = 'Notes'; 
              type = 'iframe'; 
              addNode(type, title, { iframeSrc: `/i/notes/index.html?token=${sessionId}`, data: initialData });
              return;
          case 'http-tester': 
              title = 'HTTP Tester'; 
              type = 'iframe'; 
              addNode(type, title, { iframeSrc: `/i/http-tester/index.html?token=${sessionId}`, data: initialData });
              return;
          case 'short-urls':
              title = 'Short URLs';
              type = 'iframe';
              addNode(type, title, { iframeSrc: `/i/short-urls/index.html?token=${sessionId}`, data: initialData });
              return;
          case 'terminal':
              title = 'Terminal';
              type = 'iframe';
              addNode(type, title, { iframeSrc: `/i/terminal/index.html?token=${sessionId}`, data: initialData });
              return;
          case 'db-viewer':
              title = 'DB Viewer';
              type = 'iframe';
              addNode(type, title, { iframeSrc: `/i/db/index.html?token=${sessionId}`, data: initialData });
              return;
          case 'hash':
              title = 'Hash Generator';
              type = 'iframe';
              addNode(type, title, { iframeSrc: `/i/hash/index.html?token=${sessionId}`, data: initialData });
              return;
          case 'base64':
              title = 'Base64 Tool';
              type = 'iframe';
              addNode(type, title, { iframeSrc: `/i/base64/index.html?token=${sessionId}`, data: initialData });
              return;
          case 'jwt':
              title = 'JWT Decoder';
              type = 'iframe';
              addNode(type, title, { iframeSrc: `/i/jwt/index.html?token=${sessionId}`, data: initialData });
              return;
          case 'uuid':
              title = 'UUID Generator';
              type = 'iframe';
              addNode(type, title, { iframeSrc: `/i/uuid/index.html?token=${sessionId}`, data: initialData });
              return;
          case 'password':
              title = 'Password Generator';
              type = 'iframe';
              addNode(type, title, { iframeSrc: `/i/password/index.html?token=${sessionId}`, data: initialData });
              return;
          case 'hmac':
              title = 'HMAC Tool';
              type = 'iframe';
              addNode(type, title, { iframeSrc: `/i/hmac/index.html?token=${sessionId}`, data: initialData });
              return;
          case 'encryption':
              title = 'Encryption Playground';
              type = 'iframe';
              addNode(type, title, { iframeSrc: `/i/encryption/index.html?token=${sessionId}`, data: initialData });
              return;
          case 'json':
              title = 'JSON Tool';
              type = 'iframe';
              addNode(type, title, { iframeSrc: `/i/json/index.html?token=${sessionId}`, data: initialData });
              return;
          case 'yaml':
              title = 'YAML Tool';
              type = 'iframe';
              addNode(type, title, { iframeSrc: `/i/yaml/index.html?token=${sessionId}`, data: initialData });
              return;
          case 'csv':
              title = 'CSV Viewer';
              type = 'iframe';
              addNode(type, title, { iframeSrc: `/i/csv/index.html?token=${sessionId}`, data: initialData });
              return;
          case 'diff':
              title = 'Diff Tool';
              type = 'iframe';
              addNode(type, title, { iframeSrc: `/i/diff/index.html?token=${sessionId}`, data: initialData });
              return;
          case 'regex':
              title = 'Regex Tool';
              type = 'iframe';
              addNode(type, title, { iframeSrc: `/i/regex/index.html?token=${sessionId}`, data: initialData });
              return;
          case 'markdown':
              title = 'Markdown';
              type = 'iframe';
              addNode(type, title, { iframeSrc: `/i/markdown/index.html?token=${sessionId}`, data: initialData });
              return;
          case 'logs-viewer':
              title = 'Log Viewer';
              type = 'iframe';
              addNode(type, title, { iframeSrc: `/i/logs-viewer/index.html?token=${sessionId}`, data: initialData });
              return;
          case 'xml':
              title = 'XML Tool';
              type = 'iframe';
              addNode(type, title, { iframeSrc: `/i/xml/index.html?token=${sessionId}`, data: initialData });
              return;
      }
      
      // Use addNode with appId to let it generate content
      addNode(type, title, { appId, data: initialData });
  }, [navigate, addNode, sessionId]);

  const handleNodeMove = (id: string, newX: number, newY: number) => {
    setNodes((prevNodes) =>
      prevNodes.map((node) => (node.id === id ? { ...node, x: newX, y: newY } : node))
    );
  };

  const handleNodeResize = (id: string, newWidth: number, newHeight: number) => {
    setNodes((prevNodes) =>
      prevNodes.map((node) =>
        node.id === id ? { ...node, width: newWidth, height: newHeight } : node
      )
    );
  };

  const closeNode = (id: string) => {
    setNodes((prevNodes) => {
      const next = prevNodes.filter(node => node.id !== id);
      saveCanvasState(next, { x: panOffset.x, y: panOffset.y, zoom }, activeTool);
      return next;
    });
  };

  const handleSearchAction = useCallback((kind: string, payload: any) => {
    console.log('Search Action:', kind, payload);
    const { action, target, data } = payload;
    const actionTarget = target || (action && action.target);
    const actionData = data || (action && action.data);
    console.log('Action Target:', actionTarget, 'Action Data:', actionData);

    if (kind === 'navigate') {
      if (actionTarget) navigate(actionTarget);
      return;
    }

    if (kind === 'open_canvas') {
      if (actionTarget) {
        setNodes(prevNodes => {
          const existing = prevNodes.find(n => 
            (actionTarget === 'files' && n.title === 'File Manager') ||
            (actionTarget === 'notes' && n.title === 'Notes') ||
            (actionTarget === 'http-tester' && (n.title === 'HTTP Tester' || n.iframeSrc?.includes('http-tester'))) ||
            (actionTarget === 'short-urls' && (n.title === 'Short URLs' || n.iframeSrc?.includes('short-urls')))
          );
          
          if (existing) {
            // If data is provided, update the existing node
            if (actionData) {
                setTimeout(() => handleUpdateNode(existing.id, { data: actionData }), 0);
            }
            
            // Logic to select existing node
            return prevNodes.map(n => ({
              ...n,
              selected: n.id === existing.id,
              zIndex: n.id === existing.id ? Math.max(...prevNodes.map(p => p.zIndex)) + 1 : n.zIndex
            }));
          } else {
            setTimeout(() => handleLaunchApp(actionTarget, actionData), 0);
            return prevNodes;
          }
        });
      }
      return;
    }

    if (kind === 'execute') {
      if (actionTarget === 'restart_runtime') {
        if (confirm('Are you sure you want to restart the runtime? This will terminate all active processes.')) {
          console.log('Restarting runtime...');
        }
      } else if (actionTarget === 'clear_cache') {
        alert('Cache cleared successfully');
      } else if (actionTarget === 'reload_plugins') {
        alert('Plugins reloaded');
      } else if (actionTarget === 'create_workspace') {
        const name = prompt('Enter workspace name:');
        if (name) alert(`Workspace "${name}" created`);
      }
      return;
    }

    // Legacy / Misc
    if (kind === 'command') {
      if (payload.id === 'toggle_sidebar') setSidebarCollapsed(!sidebarCollapsed);
      if (payload.id === 'zoom_in') setZoom(z => Math.min(5, z + 0.1));
      if (payload.id === 'zoom_out') setZoom(z => Math.max(0.1, z - 0.1));
      if (payload.id === 'reset_view') { setZoom(1); setPanOffset({ x: 0, y: 0 }); }
    }
  }, [navigate, handleLaunchApp, handleUpdateNode]);

  return (
    <div style={{
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      backgroundColor: 'var(--bg-primary)',
      position: 'relative'
    }}>
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
      />
      
      <Sidebar
        isCollapsed={sidebarCollapsed}
        toggleCollapse={handleToggleSidebar}
        onOpenPluginDrawer={handleTogglePluginDrawer}
        onLaunchApp={handleLaunchApp}
        activeItem={activeSidebarItem}
        setActiveItem={setActiveSidebarItem}
      />

      <PluginDrawer 
        isOpen={isPluginDrawerOpen} 
        onClose={() => setIsPluginDrawerOpen(false)}
        onAddPlugin={(type, title, iframeSrc) => {
            let finalSrc = iframeSrc;
            if (finalSrc && !finalSrc.includes('token=') && sessionId) {
                const separator = finalSrc.includes('?') ? '&' : '?';
                finalSrc = `${finalSrc}${separator}token=${sessionId}`;
            }
            addNode(type, title, { iframeSrc: finalSrc });
        }}
      />
      
      <SearchBar onAction={handleSearchAction} />
    </div>
  );
};

export default WorkspacePage;
