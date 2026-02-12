import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  FilePlus,
  FolderPlus,
  RefreshCw,
  Save,
  Edit2,
  Trash2,
  Search,
  FolderTree,
  Upload,
  X,
  ChevronRight,
  Dot,
  Command,
  Eye,
  FileWarning,
  Image as ImageIcon,
  Link as LinkIcon,
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import './FileManager.css';
import { getSessionToken, getWorkspaceId, pluginFetch } from '../authHelper';
import { useToast } from '../../app/ToastContext';
import { FileTreeItem, type FileNode } from './components/FileTreeItem';
import { getFileIcon } from './components/FileIcons';
import { usePluginState } from '../../hooks/usePluginState';

const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'csv', 'tsv', 'sql',
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs',
  'py', 'rb', 'php', 'java', 'go', 'rs', 'c', 'h', 'cpp', 'hpp', 'cs',
  'html', 'htm', 'css', 'scss', 'less', 'json', 'yaml', 'yml', 'toml', 'xml',
  'env', 'ini', 'conf', 'cfg', 'sh', 'bash', 'zsh', 'ps1', 'dockerfile', 'gitignore',
  'log', 'graphql', 'vue', 'svelte',
]);

const IMAGE_EXTENSIONS = new Set(['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'ico', 'avif']);
const SVG_EXTENSIONS = new Set(['svg']);
const VIDEO_EXTENSIONS = new Set(['mp4', 'webm', 'mov', 'm4v', 'avi', 'mkv']);
const AUDIO_EXTENSIONS = new Set(['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac']);
const PDF_EXTENSIONS = new Set(['pdf']);
const BINARY_EXTENSIONS = new Set([
  'db', 'sqlite', 'sqlite3', 'bin', 'exe', 'dll', 'so', 'dylib',
  'zip', 'tar', 'gz', '7z', 'rar',
  'woff', 'woff2', 'ttf', 'eot',
  'jar', 'class', 'wasm',
]);

type ViewMode = 'text' | 'image' | 'svg' | 'video' | 'audio' | 'pdf' | 'binary';

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
    case 'py':
      return 'python';
    case 'java':
      return 'java';
    case 'go':
      return 'go';
    case 'sql':
      return 'sql';
    default:
      return 'plaintext';
  }
};

const getFileExtension = (path: string) => path.split('.').pop()?.toLowerCase() || '';

const detectViewMode = (path: string, forceText: boolean): ViewMode => {
  if (forceText) return 'text';
  const ext = getFileExtension(path);

  if (IMAGE_EXTENSIONS.has(ext)) return 'image';
  if (SVG_EXTENSIONS.has(ext)) return 'svg';
  if (VIDEO_EXTENSIONS.has(ext)) return 'video';
  if (AUDIO_EXTENSIONS.has(ext)) return 'audio';
  if (PDF_EXTENSIONS.has(ext)) return 'pdf';
  if (BINARY_EXTENSIONS.has(ext)) return 'binary';
  if (TEXT_EXTENSIONS.has(ext)) return 'text';

  return 'text';
};

const buildRawUrl = (path: string, token: string | null, workspaceId: string | null) => {
  const url = new URL('/api/files/raw', window.location.origin);
  url.searchParams.set('path', path);
  if (token) url.searchParams.set('token', token);
  if (workspaceId) url.searchParams.set('workspaceId', workspaceId);
  return `${url.pathname}${url.search}`;
};

interface FilesPluginState {
  selectedPath: string | null;
  expandedFolders: string[];
  openTabs: string[];
}

interface TreeStats {
  files: number;
  folders: number;
}

interface FileEntry {
  path: string;
  name: string;
}

const filterTree = (nodes: FileNode[], query: string): FileNode[] => {
  if (!query) return nodes;

  const lowered = query.toLowerCase();
  const filtered: FileNode[] = [];

  for (const node of nodes) {
    const matchesSelf = node.name.toLowerCase().includes(lowered) || node.path.toLowerCase().includes(lowered);

    if (node.type === 'file') {
      if (matchesSelf) filtered.push(node);
      continue;
    }

    const filteredChildren = filterTree(node.children || [], query);
    if (matchesSelf || filteredChildren.length > 0) {
      filtered.push({ ...node, children: filteredChildren });
    }
  }

  return filtered;
};

const collectFolderPaths = (nodes: FileNode[]): string[] => {
  const paths: string[] = [];
  for (const node of nodes) {
    if (node.type === 'folder') {
      paths.push(node.path);
      if (node.children?.length) {
        paths.push(...collectFolderPaths(node.children));
      }
    }
  }
  return paths;
};

const getTreeStats = (nodes: FileNode[]): TreeStats => {
  let files = 0;
  let folders = 0;

  const walk = (items: FileNode[]) => {
    for (const item of items) {
      if (item.type === 'folder') {
        folders += 1;
        if (item.children?.length) walk(item.children);
      } else {
        files += 1;
      }
    }
  };

  walk(nodes);
  return { files, folders };
};

const flattenFiles = (nodes: FileNode[]): FileEntry[] => {
  const out: FileEntry[] = [];
  const walk = (items: FileNode[]) => {
    for (const item of items) {
      if (item.type === 'file') out.push({ path: item.path, name: item.name });
      else if (item.children?.length) walk(item.children);
    }
  };
  walk(nodes);
  return out;
};

const flattenPaths = (nodes: FileNode[]): string[] => {
  const out: string[] = [];
  const walk = (items: FileNode[]) => {
    for (const item of items) {
      out.push(item.path);
      if (item.children?.length) walk(item.children);
    }
  };
  walk(nodes);
  return out;
};

const remapPath = (path: string, oldPrefix: string, newPrefix: string) => {
  if (path === oldPrefix) return newPrefix;
  if (path.startsWith(`${oldPrefix}/`)) return `${newPrefix}${path.slice(oldPrefix.length)}`;
  return path;
};

const updateRecordKeys = (record: Record<string, string>, oldPrefix: string, newPrefix: string) => {
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(record)) {
    next[remapPath(key, oldPrefix, newPrefix)] = value;
  }
  return next;
};

const updateBooleanRecordKeys = (record: Record<string, boolean>, oldPrefix: string, newPrefix: string) => {
  const next: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(record)) {
    next[remapPath(key, oldPrefix, newPrefix)] = value;
  }
  return next;
};

const squashPaths = (paths: string[]) => {
  const sorted = [...paths].sort((a, b) => a.length - b.length);
  const out: string[] = [];
  for (const item of sorted) {
    if (out.some((parent) => item === parent || item.startsWith(`${parent}/`))) continue;
    out.push(item);
  }
  return out;
};

const FileManager = () => {
  const { success, error } = useToast();

  const [persistedState, setPersistedState, stateLoading] = usePluginState<FilesPluginState>('files-manager', {
    selectedPath: null,
    expandedFolders: [],
    openTabs: []
  });

  const [scope, setScope] = useState<string | null>(null);

  // Handle initial path and scope
  useEffect(() => {
      const params = new URLSearchParams(window.location.search);
      const initialPath = params.get('initialPath');
      const scopeParam = params.get('scope');
      
      if (scopeParam) {
          setScope(scopeParam);
      }

      if (initialPath) {
          setPersistedState(prev => ({
              ...prev,
              expandedFolders: [...prev.expandedFolders, initialPath],
              selectedPath: initialPath // Select it too
          }));
      }
  }, []);

  const [tree, setTree] = useState<FileNode[]>([]);
  const [contentByPath, setContentByPath] = useState<Record<string, string>>({});
  const [savedByPath, setSavedByPath] = useState<Record<string, string>>({});
  const [forceTextByPath, setForceTextByPath] = useState<Record<string, boolean>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPaths, setSelectedPaths] = useState<string[]>([]);
  const [lastSelectedPath, setLastSelectedPath] = useState<string | null>(null);

  const selectedPath = persistedState.selectedPath;

  const [contextMenu, setContextMenu] = useState<{ visible: boolean; x: number; y: number; node: FileNode | null }>({
    visible: false,
    x: 0,
    y: 0,
    node: null,
  });
  const [editingPath, setEditingPath] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [isLoadingContent, setIsLoadingContent] = useState(false);
  const [isRefreshingTree, setIsRefreshingTree] = useState(false);
  const [rootDragActive, setRootDragActive] = useState(false);

  const [newFileParent, setNewFileParent] = useState<string | null>(null);
  const [newFileType, setNewFileType] = useState<'file' | 'folder' | null>(null);
  const [isCreatingRoot, setIsCreatingRoot] = useState(false);
  const [createRootName, setCreateRootName] = useState('');
  const rootInputRef = useRef<HTMLInputElement>(null);

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');
  const [paletteIndex, setPaletteIndex] = useState(0);
  const paletteInputRef = useRef<HTMLInputElement>(null);

  const sessionToken = getSessionToken();
  const workspaceId = getWorkspaceId();

  const normalizedSearch = searchQuery.trim();
  const filteredTree = useMemo(() => filterTree(tree, normalizedSearch), [tree, normalizedSearch]);
  const treeStats = useMemo(() => getTreeStats(tree), [tree]);
  const allFiles = useMemo(() => flattenFiles(tree), [tree]);
  const visibleOrder = useMemo(() => flattenPaths(filteredTree), [filteredTree]);

  const effectiveExpandedFolders = useMemo(() => {
    if (!normalizedSearch) return new Set(persistedState.expandedFolders);
    const forced = collectFolderPaths(filteredTree);
    return new Set([...persistedState.expandedFolders, ...forced]);
  }, [filteredTree, normalizedSearch, persistedState.expandedFolders]);

  const pathSegments = useMemo(() => {
    if (!selectedPath) return [];
    return selectedPath.split('/').filter(Boolean);
  }, [selectedPath]);

  const naturalViewMode = useMemo(() => (selectedPath ? detectViewMode(selectedPath, false) : 'text'), [selectedPath]);
  const currentViewMode = useMemo(
    () => (selectedPath ? detectViewMode(selectedPath, !!forceTextByPath[selectedPath]) : 'text'),
    [selectedPath, forceTextByPath],
  );

  const currentContent = selectedPath ? contentByPath[selectedPath] ?? '' : '';
  const currentSaved = selectedPath ? savedByPath[selectedPath] ?? '' : '';
  const isDirty = !!selectedPath && currentViewMode === 'text' && currentContent !== currentSaved;
  const rawSelectedUrl = selectedPath ? buildRawUrl(selectedPath, sessionToken, workspaceId) : '';

  const selectedPathSet = useMemo(() => new Set(selectedPaths), [selectedPaths]);

  const filteredPalette = useMemo(() => {
    const q = paletteQuery.trim().toLowerCase();
    if (!q) return allFiles.slice(0, 200);

    return allFiles
      .map((file) => {
        const lower = file.path.toLowerCase();
        const index = lower.indexOf(q);
        return { file, score: index === -1 ? 9999 : index };
      })
      .filter((item) => item.score !== 9999)
      .sort((a, b) => a.score - b.score || a.file.path.length - b.file.path.length)
      .slice(0, 200)
      .map((item) => item.file);
  }, [allFiles, paletteQuery]);

  useEffect(() => {
    if (isCreatingRoot && rootInputRef.current) {
      rootInputRef.current.focus();
      setCreateRootName('');
    }
  }, [isCreatingRoot]);

  const loadContent = useCallback(
    async (path: string) => {
      if (path in contentByPath) return;

      setIsLoadingContent(true);
      try {
        const res = await pluginFetch(`/api/files/read?path=${encodeURIComponent(path)}`);
        if (res.ok) {
          const data = await res.json();
          const content = data.content || '';
          setContentByPath((prev) => ({ ...prev, [path]: content }));
          setSavedByPath((prev) => ({ ...prev, [path]: content }));
        } else {
          setPersistedState((prev) => ({ ...prev, selectedPath: null }));
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoadingContent(false);
      }
    },
    [contentByPath, setPersistedState],
  );

  useEffect(() => {
    if (!selectedPath || currentViewMode !== 'text') return;
    loadContent(selectedPath);
  }, [selectedPath, currentViewMode, loadContent]);

  const loadTree = useCallback(async () => {
    try {
      setIsRefreshingTree(true);
      const url = scope ? `/api/files/scoped-tree?path=${encodeURIComponent(scope)}` : '/api/files/tree';
      const res = await pluginFetch(url);
      if (!res.ok) throw new Error('Failed to load tree');
      const data = await res.json();
      setTree(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setTree([]);
    } finally {
      setIsRefreshingTree(false);
    }
  }, [scope]);

  useEffect(() => {
    loadTree();
  }, [loadTree]);

  useEffect(() => {
    const handleClick = () => setContextMenu((prev) => ({ ...prev, visible: false }));
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    if (paletteOpen && paletteInputRef.current) {
      paletteInputRef.current.focus();
      paletteInputRef.current.select();
    }
  }, [paletteOpen]);

  const openFile = useCallback(
    (path: string) => {
      setPersistedState((prev) => {
        const openTabs = prev.openTabs.includes(path) ? prev.openTabs : [...prev.openTabs, path];
        return { ...prev, selectedPath: path, openTabs };
      });
      setSelectedPaths([path]);
      setLastSelectedPath(path);
    },
    [setPersistedState],
  );

  const forceOpenAsText = useCallback(
    (path: string) => {
      setForceTextByPath((prev) => ({ ...prev, [path]: true }));
      loadContent(path);
    },
    [loadContent],
  );

  const restorePreviewMode = (path: string) => {
    setForceTextByPath((prev) => {
      const next = { ...prev };
      delete next[path];
      return next;
    });
  };

  const closeTab = (path: string) => {
    setPersistedState((prev) => {
      const nextTabs = prev.openTabs.filter((item) => item !== path);
      let nextSelected = prev.selectedPath;

      if (prev.selectedPath === path) {
        const closedIndex = prev.openTabs.indexOf(path);
        nextSelected = nextTabs[closedIndex] || nextTabs[closedIndex - 1] || null;
      }

      return { ...prev, openTabs: nextTabs, selectedPath: nextSelected };
    });
  };

  const handleSave = useCallback(async () => {
    if (!selectedPath || !isDirty) return;
    try {
      const res = await pluginFetch('/api/files/write', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: selectedPath, content: currentContent }),
      });
      if (res.ok) {
        setSavedByPath((prev) => ({ ...prev, [selectedPath]: currentContent }));
        success('Saved');
      } else {
        const err = await res.json();
        error(err.message || 'Failed to save');
      }
    } catch (e) {
      console.error(e);
    }
  }, [selectedPath, isDirty, currentContent, success, error]);

  useEffect(() => {
    const handleGlobalKeys = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        handleSave();
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'p') {
        event.preventDefault();
        setPaletteQuery('');
        setPaletteIndex(0);
        setPaletteOpen(true);
      }

      if (!paletteOpen) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        setPaletteOpen(false);
        return;
      }

      if (event.key === 'ArrowDown') {
        event.preventDefault();
        setPaletteIndex((prev) => Math.min(prev + 1, Math.max(filteredPalette.length - 1, 0)));
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        setPaletteIndex((prev) => Math.max(prev - 1, 0));
        return;
      }

      if (event.key === 'Enter') {
        event.preventDefault();
        const target = filteredPalette[paletteIndex];
        if (target) {
          openFile(target.path);
          setPaletteOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeys);
    return () => window.removeEventListener('keydown', handleGlobalKeys);
  }, [handleSave, paletteOpen, filteredPalette, paletteIndex, openFile]);

  const toggleFolder = (path: string) => {
    if (normalizedSearch) return;

    setPersistedState((prev) => {
      const next = new Set(prev.expandedFolders);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return { ...prev, expandedFolders: Array.from(next) };
    });
  };

  const collapseAll = () => {
    setPersistedState((prev) => ({ ...prev, expandedFolders: [] }));
  };

  const handleTreeSelect = (node: FileNode, event: React.MouseEvent) => {
    const isMulti = event.metaKey || event.ctrlKey;
    const isRange = event.shiftKey;

    if (isMulti) {
      setSelectedPaths((prev) => (prev.includes(node.path) ? prev.filter((p) => p !== node.path) : [...prev, node.path]));
      setLastSelectedPath(node.path);
      return;
    }

    if (isRange && lastSelectedPath) {
      const start = visibleOrder.indexOf(lastSelectedPath);
      const end = visibleOrder.indexOf(node.path);
      if (start !== -1 && end !== -1) {
        const [from, to] = start < end ? [start, end] : [end, start];
        const range = visibleOrder.slice(from, to + 1);
        setSelectedPaths(range);
      }
      return;
    }

    setSelectedPaths([node.path]);
    setLastSelectedPath(node.path);

    if (node.type === 'folder') {
      toggleFolder(node.path);
      return;
    }

    openFile(node.path);
  };

  const handleContextMenu = (e: React.MouseEvent, node: FileNode | null) => {
    e.preventDefault();
    e.stopPropagation();

    if (node && !selectedPathSet.has(node.path)) {
      setSelectedPaths([node.path]);
    }

    const estimatedWidth = 200;
    const estimatedHeight = node ? 190 : 100;
    const x = Math.min(e.clientX, window.innerWidth - estimatedWidth - 12);
    const y = Math.min(e.clientY, window.innerHeight - estimatedHeight - 12);

    setContextMenu({ visible: true, x, y, node });
  };

  const handleCreate = (type: 'file' | 'folder', parentNode: FileNode | null) => {
    setNewFileType(type);

    if (parentNode) {
      setNewFileParent(parentNode.path);
      setIsCreatingRoot(false);

      if (parentNode.type === 'folder') {
        setPersistedState((prev) => {
          const next = new Set(prev.expandedFolders);
          next.add(parentNode.path);
          return { ...prev, expandedFolders: Array.from(next) };
        });
      }
      return;
    }

    setNewFileParent(null);
    setIsCreatingRoot(true);
  };

  const handleCreateSubmit = async (name: string) => {
    const trimmedName = name.trim();
    const parentPath = newFileParent || '';
    const typeToCreate = newFileType;

    setNewFileParent(null);
    setIsCreatingRoot(false);
    setNewFileType(null);

    if (!trimmedName || !typeToCreate) return;

    const newPath = parentPath ? `${parentPath}/${trimmedName}` : trimmedName;

    try {
      const res = await pluginFetch('/api/files/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: newPath, type: typeToCreate }),
      });

      if (res.ok) {
        await loadTree();
        if (parentPath) {
          setPersistedState((prev) => {
            const next = new Set(prev.expandedFolders);
            next.add(parentPath);
            return { ...prev, expandedFolders: Array.from(next) };
          });
        }
      } else {
        const err = await res.json();
        error(err.message || 'Failed to create item');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const applyPathRemap = (oldPath: string, newPath: string) => {
    setPersistedState((prev) => ({
      ...prev,
      selectedPath: prev.selectedPath ? remapPath(prev.selectedPath, oldPath, newPath) : null,
      openTabs: prev.openTabs.map((path) => remapPath(path, oldPath, newPath)),
      expandedFolders: prev.expandedFolders.map((path) => remapPath(path, oldPath, newPath)),
    }));

    setSelectedPaths((prev) => prev.map((path) => remapPath(path, oldPath, newPath)));
    setLastSelectedPath((prev) => (prev ? remapPath(prev, oldPath, newPath) : null));
    setContentByPath((prev) => updateRecordKeys(prev, oldPath, newPath));
    setSavedByPath((prev) => updateRecordKeys(prev, oldPath, newPath));
    setForceTextByPath((prev) => updateBooleanRecordKeys(prev, oldPath, newPath));
  };

  const startRename = (node: FileNode) => {
    setEditingPath(node.path);
    setContextMenu((prev) => ({ ...prev, visible: false }));
  };

  const handleRenameSubmit = async (node: FileNode, newName: string) => {
    setEditingPath(null);

    const trimmedName = newName.trim();
    if (!trimmedName || trimmedName === node.name) return;

    const parts = node.path.split('/');
    parts[parts.length - 1] = trimmedName;
    const newPath = parts.join('/');

    try {
      const res = await pluginFetch('/api/files/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPath: node.path, newPath }),
      });

      if (res.ok) {
        applyPathRemap(node.path, newPath);
        await loadTree();
      } else {
        const err = await res.json();
        error(err.message || 'Failed to rename');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteByPath = async (path: string) => {
    const res = await pluginFetch('/api/files/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to delete');
    }

    setPersistedState((prev) => ({
      ...prev,
      selectedPath: prev.selectedPath && (prev.selectedPath === path || prev.selectedPath.startsWith(`${path}/`)) ? null : prev.selectedPath,
      openTabs: prev.openTabs.filter((tab) => tab !== path && !tab.startsWith(`${path}/`)),
      expandedFolders: prev.expandedFolders.filter((folder) => folder !== path && !folder.startsWith(`${path}/`)),
    }));

    setSelectedPaths((prev) => prev.filter((item) => item !== path && !item.startsWith(`${path}/`)));
    setContentByPath((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => key !== path && !key.startsWith(`${path}/`))));
    setSavedByPath((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => key !== path && !key.startsWith(`${path}/`))));
    setForceTextByPath((prev) => Object.fromEntries(Object.entries(prev).filter(([key]) => key !== path && !key.startsWith(`${path}/`))));
  };

  const handleDelete = async (node: FileNode) => {
    if (!window.confirm(`Delete ${node.name}?`)) return;

    try {
      await handleDeleteByPath(node.path);
      await loadTree();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to delete';
      error(message);
    }
  };

  const handleBulkDelete = async () => {
    if (!selectedPaths.length) return;
    const uniqueTargets = squashPaths(selectedPaths);
    if (!window.confirm(`Delete ${uniqueTargets.length} selected item(s)?`)) return;

    try {
      for (const path of uniqueTargets) {
        await handleDeleteByPath(path);
      }
      setSelectedPaths([]);
      await loadTree();
      success('Selection deleted');
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Bulk delete failed';
      error(message);
    }
  };

  const handleDragStart = (e: React.DragEvent, node: FileNode) => {
    e.dataTransfer.setData('application/kernex-file', JSON.stringify(node));
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent, targetNode: FileNode | null) => {
    e.preventDefault();
    e.stopPropagation();
    setRootDragActive(false);

    const targetPath = targetNode
      ? targetNode.type === 'folder'
        ? targetNode.path
        : targetNode.path.split('/').slice(0, -1).join('/')
      : '';

    const internalData = e.dataTransfer.getData('application/kernex-file');
    if (internalData) {
      try {
        const sourceNode = JSON.parse(internalData) as FileNode;
        if (sourceNode.path === targetNode?.path) return;

        const newPath = targetPath ? `${targetPath}/${sourceNode.name}` : sourceNode.name;
        if (newPath === sourceNode.path) return;

        const res = await pluginFetch('/api/files/rename', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ oldPath: sourceNode.path, newPath }),
        });

        if (res.ok) {
          applyPathRemap(sourceNode.path, newPath);
          await loadTree();
        } else {
          error('Move failed');
        }
      } catch (err) {
        console.error(err);
      }
      return;
    }

    if (e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files);
      setUploading(true);

      for (const file of files) {
        const formData = new FormData();
        formData.append('file', file);

        try {
          const url = `/api/files/upload?targetDir=${encodeURIComponent(targetPath || '')}`;
          const res = await pluginFetch(url, { method: 'POST', body: formData, headers: {} });
          if (!res.ok) {
            const err = await res.json();
            error(err.message || 'Upload failed');
          }
        } catch (uploadError) {
          console.error('Upload failed', uploadError);
          error('Upload failed');
        }
      }

      setUploading(false);
      await loadTree();
      if (targetPath) {
        setPersistedState((prev) => {
          const next = new Set(prev.expandedFolders);
          next.add(targetPath);
          return { ...prev, expandedFolders: Array.from(next) };
        });
      }
    }
  };

  const handleRootCreateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleCreateSubmit(createRootName);
    if (e.key === 'Escape') {
      setIsCreatingRoot(false);
      setNewFileType(null);
    }
  };

  const openPaletteResult = (path: string) => {
    openFile(path);
    setPaletteOpen(false);
  };

  const launchPlugin = (appId: string, initialData: any) => {
      window.parent.postMessage({
          type: 'OPEN_APP',
          appId,
          data: initialData
      }, '*');
  };

  const handleOpenUrlTracer = async (path: string) => {
      try {
          const res = await pluginFetch(`/api/files/read?path=${encodeURIComponent(path)}`);
          if (res.ok) {
              const data = await res.json();
              const content = data.content || '';
              let url = content.trim();
              const match = content.match(/URL=(.+)/i);
              if (match) url = match[1].trim();
              
              launchPlugin('url-tracer', { initialUrl: url });
              setContextMenu(prev => ({ ...prev, visible: false }));
          } else {
              error('Failed to read file');
          }
      } catch {
          error('Failed to read file');
      }
  };

  if (stateLoading) {
    return (
      <div className="file-manager file-manager-loading">
        <RefreshCw size={18} className="spin" />
        <span>Loading explorer state...</span>
      </div>
    );
  }

  return (
    <div className="file-manager">
      <aside className="fm-sidebar">
        <div className="fm-header">
          <div className="fm-title-wrap">
            <FolderTree size={16} />
            <span>{scope ? scope.split('/').pop() : 'Explorer'}</span>
          </div>
          <div className="fm-header-actions">
            <button className="icon-btn" onClick={() => handleCreate('file', null)} title="New File">
              <FilePlus size={14} />
            </button>
            <button className="icon-btn" onClick={() => handleCreate('folder', null)} title="New Folder">
              <FolderPlus size={14} />
            </button>
            <button className="icon-btn" onClick={collapseAll} title="Collapse All">
              <ChevronRight size={14} />
            </button>
            <button className="icon-btn" onClick={loadTree} title="Refresh">
              <RefreshCw size={14} className={isRefreshingTree ? 'spin' : ''} />
            </button>
          </div>
        </div>

        <div className="fm-search-wrap">
          <Search size={14} className="fm-search-icon" />
          <input
            className="fm-search-input"
            placeholder="Search files and folders"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="icon-btn fm-clear-search" onClick={() => setSearchQuery('')} title="Clear search">
              <X size={13} />
            </button>
          )}
        </div>

        <div className="fm-sidebar-meta">
          <span>{treeStats.folders} folders</span>
          <span>{treeStats.files} files</span>
        </div>

        <div
          className={`fm-tree ${rootDragActive ? 'root-drag-over' : ''}`}
          onContextMenu={(e) => handleContextMenu(e, null)}
          onDragOver={(e) => {
            e.preventDefault();
            setRootDragActive(true);
          }}
          onDragLeave={() => setRootDragActive(false)}
          onDrop={(e) => handleDrop(e, null)}
        >
          {filteredTree.map((node) => (
            <FileTreeItem
              key={node.path}
              node={node}
              level={0}
              selectedPath={selectedPath}
              selectedPaths={selectedPathSet}
              expandedFolders={effectiveExpandedFolders}
              onToggle={toggleFolder}
              onSelect={handleTreeSelect}
              onContextMenu={handleContextMenu}
              onDrop={handleDrop}
              onDragStart={handleDragStart}
              editingPath={editingPath}
              onRenameSubmit={handleRenameSubmit}
              onRenameCancel={() => setEditingPath(null)}
              newFileParent={newFileParent}
              newFileType={newFileType}
              onCreateSubmit={handleCreateSubmit}
              onCreateCancel={() => {
                setNewFileParent(null);
                setNewFileType(null);
              }}
            />
          ))}

          {isCreatingRoot && (
            <div className="file-row editing" style={{ paddingLeft: '10px' }}>
              <span className="toggle-icon" style={{ visibility: 'hidden' }} />
              <span className="file-icon">{getFileIcon(createRootName, newFileType === 'folder', false)}</span>
              <input
                ref={rootInputRef}
                type="text"
                className="rename-input"
                value={createRootName}
                onChange={(e) => setCreateRootName(e.target.value)}
                onKeyDown={handleRootCreateKeyDown}
                onBlur={() => handleCreateSubmit(createRootName)}
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}

          {filteredTree.length === 0 && !isCreatingRoot && (
            <div className="empty-state fm-tree-empty">
              <Upload size={28} />
              <p>{normalizedSearch ? 'No matches found' : 'Drop files here or create a file to start'}</p>
            </div>
          )}
        </div>
      </aside>

      <section className="fm-editor">
        <div className="editor-tabbar">
          {persistedState.openTabs.length === 0 ? (
            <div className="editor-tabbar-empty">
              <Command size={13} />
              <span>Quick open: Ctrl/Cmd + P</span>
            </div>
          ) : (
            persistedState.openTabs.map((tabPath) => {
              const tabMode = detectViewMode(tabPath, !!forceTextByPath[tabPath]);
              const dirty = tabMode === 'text' && (contentByPath[tabPath] ?? '') !== (savedByPath[tabPath] ?? '');
              return (
                <button
                  key={tabPath}
                  className={`editor-tab ${selectedPath === tabPath ? 'active' : ''}`}
                  onClick={() => openFile(tabPath)}
                  title={tabPath}
                >
                  {getFileIcon(tabPath, false, false)}
                  <span>{tabPath.split('/').pop()}</span>
                  {dirty && <Dot size={14} className="tab-dirty-dot" />}
                  <span
                    className="tab-close"
                    onClick={(event) => {
                      event.stopPropagation();
                      closeTab(tabPath);
                    }}
                  >
                    <X size={12} />
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="editor-topbar">
          {selectedPath ? (
            <div className="fm-breadcrumbs" title={selectedPath}>
              {pathSegments.map((part, index) => (
                <React.Fragment key={`${part}-${index}`}>
                  {index > 0 && <ChevronRight size={12} className="crumb-separator" />}
                  <span className={`crumb ${index === pathSegments.length - 1 ? 'active' : ''}`}>{part}</span>
                </React.Fragment>
              ))}
              {isDirty && <Dot size={16} className="dirty-dot" />}
            </div>
          ) : (
            <div className="fm-breadcrumbs placeholder">Select a file from the explorer</div>
          )}

          <div className="editor-actions">
            {selectedPaths.length > 1 && (
              <button className="save-btn danger" onClick={handleBulkDelete} title="Delete selected">
                <Trash2 size={12} />
                <span>Delete {selectedPaths.length}</span>
              </button>
            )}

            {selectedPath && currentViewMode !== 'text' && (
              <button className="save-btn secondary" onClick={() => forceOpenAsText(selectedPath)} title="Open raw content as text">
                <FileWarning size={12} />
                <span>Open as text</span>
              </button>
            )}

            {selectedPath && currentViewMode === 'text' && naturalViewMode !== 'text' && (
              <button className="save-btn secondary" onClick={() => restorePreviewMode(selectedPath)} title="Switch back to preview">
                <Eye size={12} />
                <span>Back to preview</span>
              </button>
            )}

            <button
              onClick={handleSave}
              className="save-btn"
              disabled={!isDirty || !selectedPath || currentViewMode !== 'text'}
              title="Save (Ctrl/Cmd+S)"
            >
              <Save size={12} />
              <span>{isDirty ? 'Save changes' : 'Saved'}</span>
            </button>
          </div>
        </div>

        {selectedPath ? (
          <div className="editor-surface">
            {currentViewMode === 'text' ? (
              isLoadingContent && !(selectedPath in contentByPath) ? (
                <div className="empty-state">
                  <RefreshCw size={24} className="spin" />
                  <p>Loading file...</p>
                </div>
              ) : (
                <Editor
                  height="100%"
                  defaultLanguage="plaintext"
                  language={getLanguageFromPath(selectedPath)}
                  value={currentContent}
                  theme="vs-dark"
                  onChange={(value) =>
                    setContentByPath((prev) => ({
                      ...prev,
                      [selectedPath]: value || '',
                    }))
                  }
                  options={{
                    minimap: { enabled: true },
                    fontSize: 13,
                    fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                    scrollBeyondLastLine: false,
                    automaticLayout: true,
                    renderWhitespace: 'selection',
                    smoothScrolling: true,
                    cursorBlinking: 'smooth',
                    padding: { top: 10 },
                  }}
                />
              )
            ) : currentViewMode === 'image' || currentViewMode === 'svg' ? (
              <div className="fm-preview-wrap">
                <img src={rawSelectedUrl} alt={selectedPath} className="fm-preview-image" />
              </div>
            ) : currentViewMode === 'video' ? (
              <div className="fm-preview-wrap">
                <video src={rawSelectedUrl} controls className="fm-preview-video" />
              </div>
            ) : currentViewMode === 'audio' ? (
              <div className="fm-preview-wrap">
                <audio src={rawSelectedUrl} controls className="fm-preview-audio" />
              </div>
            ) : currentViewMode === 'pdf' ? (
              <div className="fm-preview-wrap">
                <iframe src={rawSelectedUrl} className="fm-preview-pdf" title={selectedPath} />
              </div>
            ) : (
              <div className="empty-state fm-binary-state">
                <FileWarning size={38} />
                <h3>Binary file preview</h3>
                <p>
                  This file type is not safe to open in the text editor by default.
                  Use <strong>Open as text</strong> only if you know it is readable.
                </p>
                <a href={rawSelectedUrl} target="_blank" rel="noreferrer" className="fm-open-raw-link">
                  Open raw file
                </a>
              </div>
            )}
          </div>
        ) : (
          <div className="empty-state fm-main-empty">
            <FolderTree size={52} />
            <h3>Command your workspace files</h3>
            <p>Open a file to edit, drag-and-drop to move, or right-click for power actions.</p>
          </div>
        )}

        <div className="fm-statusbar">
          <span>{selectedPath ? `${getLanguageFromPath(selectedPath)} • ${currentViewMode}` : 'No file selected'}</span>
          <span>{isDirty ? 'Unsaved changes' : 'All changes saved'}</span>
        </div>
      </section>

      {contextMenu.visible && (
        <div className="context-menu" style={{ top: contextMenu.y, left: contextMenu.x }} onClick={(e) => e.stopPropagation()}>
          {contextMenu.node ? (
            <>
              {(() => {
                  const ext = contextMenu.node.path.split('.').pop()?.toLowerCase() || '';
                  const isImage = IMAGE_EXTENSIONS.has(ext);
                  const isSvg = ext === 'svg';
                  const isUrl = ext === 'url' || ext === 'txt'; // Allow txt for simple URL lists
                  
                  return (
                      <>
                          {(isImage || isSvg) && (
                              <>
                                  <div className="menu-item" onClick={() => { launchPlugin('photo-viewer', { file: contextMenu.node!.path }); setContextMenu(prev => ({ ...prev, visible: false })); }}>
                                      <ImageIcon size={14} /> Open in Photo Viewer
                                  </div>
                                  <div className="menu-item" onClick={() => { launchPlugin('image-studio', { initialPath: contextMenu.node!.path }); setContextMenu(prev => ({ ...prev, visible: false })); }}>
                                      <ImageIcon size={14} /> Open in Image Studio
                                  </div>
                                  <div className="menu-separator" />
                              </>
                          )}
                          {isUrl && (
                              <>
                                  <div className="menu-item" onClick={() => handleOpenUrlTracer(contextMenu.node!.path)}>
                                      <LinkIcon size={14} /> Trace URL
                                  </div>
                                  <div className="menu-separator" />
                              </>
                          )}
                      </>
                  );
              })()}
              <div
                className="menu-item"
                onClick={() => {
                  handleCreate('file', contextMenu.node);
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
              >
                <FilePlus size={14} /> New File
              </div>
              <div
                className="menu-item"
                onClick={() => {
                  handleCreate('folder', contextMenu.node);
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
              >
                <FolderPlus size={14} /> New Folder
              </div>
              <div className="menu-separator" />
              <div className="menu-item" onClick={() => contextMenu.node && startRename(contextMenu.node)}>
                <Edit2 size={14} /> Rename
              </div>
              <div
                className="menu-item danger"
                onClick={() => {
                  if (contextMenu.node) {
                    handleDelete(contextMenu.node);
                    setContextMenu((prev) => ({ ...prev, visible: false }));
                  }
                }}
              >
                <Trash2 size={14} /> Delete
              </div>
            </>
          ) : (
            <>
              <div
                className="menu-item"
                onClick={() => {
                  handleCreate('file', null);
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
              >
                <FilePlus size={14} /> New File
              </div>
              <div
                className="menu-item"
                onClick={() => {
                  handleCreate('folder', null);
                  setContextMenu((prev) => ({ ...prev, visible: false }));
                }}
              >
                <FolderPlus size={14} /> New Folder
              </div>
            </>
          )}
        </div>
      )}

      {paletteOpen && (
        <div className="fm-palette-backdrop" onClick={() => setPaletteOpen(false)}>
          <div className="fm-palette" onClick={(e) => e.stopPropagation()}>
            <div className="fm-palette-input-wrap">
              <Search size={14} />
              <input
                ref={paletteInputRef}
                value={paletteQuery}
                onChange={(e) => {
                  setPaletteQuery(e.target.value);
                  setPaletteIndex(0);
                }}
                placeholder="Type a file name..."
              />
              <span>Ctrl/Cmd+P</span>
            </div>
            <div className="fm-palette-list">
              {filteredPalette.length === 0 ? (
                <div className="fm-palette-empty">No files match your query.</div>
              ) : (
                filteredPalette.map((item, index) => (
                  <button
                    key={item.path}
                    className={`fm-palette-item ${index === paletteIndex ? 'active' : ''}`}
                    onMouseEnter={() => setPaletteIndex(index)}
                    onClick={() => openPaletteResult(item.path)}
                  >
                    {getFileIcon(item.path, false, false)}
                    <span className="name">{item.name}</span>
                    <span className="path">{item.path}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {uploading && (
        <div className="fm-upload-toast">
          <Upload size={14} />
          <span>Uploading files...</span>
        </div>
      )}
    </div>
  );
};

export default FileManager;
