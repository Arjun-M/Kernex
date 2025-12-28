import { useState, useEffect, useCallback, useRef } from 'react';
import { Folder, File, ChevronRight, ChevronDown, RefreshCw, Edit2, Trash2, FilePlus, FolderPlus } from 'lucide-react';
import Editor from '@monaco-editor/react';
import './FileManager.css';
import { pluginFetch } from '../authHelper';

interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  node: FileNode | null;
}

const getLanguageFromPath = (path: string): string => {
  const ext = path.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'typescript';
    case 'js':
    case 'jsx':
      return 'javascript';
    case 'css':
      return 'css';
    case 'html':
      return 'html';
    case 'json':
      return 'json';
    case 'md':
      return 'markdown';
    default:
      return 'plaintext';
  }
};

const FileManager = () => {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, node: null });
  const fmTreeRef = useRef<HTMLDivElement>(null);

  const loadTree = useCallback(async () => {
    try {
      const res = await pluginFetch('/api/files/tree');
      if (!res.ok) throw new Error('Failed to load tree');
      const data = await res.json();
      setTree(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setTree([]);
    }
  }, []);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  // Close context menu on click elsewhere
  useEffect(() => {
    const handleClick = () => setContextMenu(prev => ({ ...prev, visible: false }));
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  const handleFileClick = async (node: FileNode) => {
    setSelectedPath(node.path);
    if (node.type === 'file') {
      try {
        const res = await pluginFetch(`/api/files/read?path=${encodeURIComponent(node.path)}`);
        if (!res.ok) throw new Error('Failed to read file');
        const data = await res.json();
        setFileContent(data.content || '');
      } catch (e) {
        console.error(e);
        setFileContent('Error loading file content.');
      }
    } else {
      toggleFolder(node.path);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, node: FileNode | null) => {
    e.preventDefault();
    setContextMenu({
      visible: true,
      x: e.clientX,
      y: e.clientY,
      node
    });
  };

  const handleCreate = async (type: 'file' | 'folder', parentNode: FileNode | null) => {
      const name = window.prompt(`Enter ${type} name:`);
      if (!name) return;

      const parentPath = parentNode 
        ? (parentNode.type === 'folder' ? parentNode.path : parentNode.path.split('/').slice(0, -1).join('/'))
        : '';
      
      const newPath = parentPath ? `${parentPath}/${name}` : name;

      try {
          const res = await pluginFetch('/api/files/create', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ path: newPath, type })
          });
          if (res.ok) {
              loadTree();
              if (parentNode && parentNode.type === 'folder') {
                  setExpandedFolders(prev => new Set(prev).add(parentNode.path));
              }
          } else {
              const err = await res.json();
              alert(err.message || 'Failed to create');
          }
      } catch (e) {
          console.error(e);
      }
  };

  const handleRename = async (node: FileNode) => {
      const newName = window.prompt('Enter new name:', node.name);
      if (!newName || newName === node.name) return;

      const parts = node.path.split('/');
      parts[parts.length - 1] = newName;
      const newPath = parts.join('/');

      try {
          const res = await pluginFetch('/api/files/rename', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ oldPath: node.path, newPath })
          });
          if (res.ok) {
              loadTree();
              if (selectedPath === node.path) setSelectedPath(newPath);
          } else {
              const err = await res.json();
              alert(err.message || 'Failed to rename');
          }
      } catch (e) {
          console.error(e);
      }
  };

  const handleDelete = async (node: FileNode) => {
      if (!window.confirm(`Are you sure you want to delete ${node.name}?`)) return;

      try {
          const res = await pluginFetch(`/api/files/delete`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ path: node.path })
          });
          if (res.ok) {
              loadTree();
              if (selectedPath === node.path) setSelectedPath(null);
          } else {
              const err = await res.json();
              alert(err.message || 'Failed to delete');
          }
      } catch (e) {
          console.error(e);
      }
  };

  const renderTree = (nodes: FileNode[], level = 0) => {
    if (!Array.isArray(nodes)) return null;
    return nodes.map((node) => (
      <div key={node.path} style={{ paddingLeft: level * 12 }}>
        <div 
          className={`file-node ${selectedPath === node.path ? 'selected' : ''}`}
          onClick={() => handleFileClick(node)}
          onContextMenu={(e) => handleContextMenu(e, node)}
        >
          {node.type === 'folder' && (
            <span className="toggle-icon">
              {expandedFolders.has(node.path) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </span>
          )}
          {node.type === 'folder' ? <Folder size={14} className="node-icon" /> : <File size={14} className="node-icon" />}
          <span className="node-name">{node.name}</span>
        </div>
        {node.type === 'folder' && expandedFolders.has(node.path) && node.children && (
          <div>{renderTree(node.children, level + 1)}</div>
        )}
      </div>
    ));
  };

  const handleSave = async () => {
      if (!selectedPath) return;
      try {
          const res = await pluginFetch('/api/files/write', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ path: selectedPath, content: fileContent })
          });
          if (res.ok) {
              alert('Saved!');
          } else {
              const err = await res.json();
              alert(err.message || 'Failed to save');
          }
      } catch (e) {
          console.error(e);
      }
  };

  return (
    <div className="file-manager">
      <div className="fm-sidebar">
        <div className="fm-header">
          <span>Files</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button onClick={() => handleCreate('file', null)} title="New File at Root"><FilePlus size={14} /></button>
            <button onClick={() => handleCreate('folder', null)} title="New Folder at Root"><FolderPlus size={14} /></button>
            <button onClick={loadTree} title="Refresh Tree"><RefreshCw size={14} /></button>
          </div>
        </div>
        <div 
            className="fm-tree" 
            ref={fmTreeRef}
            onContextMenu={(e) => handleContextMenu(e, null)}
        >
          {renderTree(tree)}
        </div>
      </div>
      <div className="fm-editor">
        {selectedPath ? (
          <>
            <div className="editor-toolbar">
                <span style={{ fontSize: '12px', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{selectedPath}</span>
                <button onClick={handleSave} className="btn-primary" style={{ padding: '4px 12px', fontSize: '12px' }}>Save</button>
            </div>
            <div style={{ flexGrow: 1, overflow: 'hidden' }}>
              <Editor
                height="100%"
                defaultLanguage="plaintext"
                language={getLanguageFromPath(selectedPath)}
                value={fileContent}
                theme="vs-dark"
                onChange={(value) => setFileContent(value || '')}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            </div>
          </>
        ) : (
          <div className="empty-fm">Select a file to edit</div>
        )}
      </div>

      {contextMenu.visible && (
        <div 
          className="context-menu" 
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {contextMenu.node ? (
            <>
              <div className="menu-item" onClick={() => { handleCreate('file', contextMenu.node); setContextMenu(prev => ({ ...prev, visible: false })); }}>
                <FilePlus size={14} /> New File
              </div>
              <div className="menu-item" onClick={() => { handleCreate('folder', contextMenu.node); setContextMenu(prev => ({ ...prev, visible: false })); }}>
                <FolderPlus size={14} /> New Folder
              </div>
              <div className="menu-separator" />
              <div className="menu-item" onClick={() => { handleRename(contextMenu.node!); setContextMenu(prev => ({ ...prev, visible: false })); }}>
                <Edit2 size={14} /> Rename
              </div>
              <div className="menu-item danger" onClick={() => { handleDelete(contextMenu.node!); setContextMenu(prev => ({ ...prev, visible: false })); }}>
                <Trash2 size={14} /> Delete
              </div>
            </>
          ) : (
            <>
              <div className="menu-item" onClick={() => { handleCreate('file', null); setContextMenu(prev => ({ ...prev, visible: false })); }}>
                <FilePlus size={14} /> New File at Root
              </div>
              <div className="menu-item" onClick={() => { handleCreate('folder', null); setContextMenu(prev => ({ ...prev, visible: false })); }}>
                <FolderPlus size={14} /> New Folder at Root
              </div>
              <div className="menu-separator" />
              <div className="menu-item" onClick={() => { loadTree(); setContextMenu(prev => ({ ...prev, visible: false })); }}>
                <RefreshCw size={14} /> Refresh
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default FileManager;