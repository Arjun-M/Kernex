import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Search, Command, FileText, Package, Zap, X,
  Monitor, Settings, HardDrive, Activity, Shield, Folder,
  PlusSquare, RefreshCw, Trash2, Power, Link as LinkIcon, Hash, Lock, Key, FileCode,
  FileJson, Table, Split, FileType, List, Layers
} from 'lucide-react';
import './SearchBar.css';

import { authFetch } from '../../app/authFetch';

interface SearchAction {
  kind: 'navigate' | 'open_canvas' | 'execute';
  target: string;
}

interface SearchResult {
  id: string;
  type: 'page' | 'canvas' | 'command';
  title: string;
  description: string;
  icon: string;
  action: SearchAction;
  shortcut?: string;
}

interface SearchBarProps {
  onAction: (action: string, payload?: any) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ onAction }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [recentItems, setRecentItems] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isFocused, setIsFocused] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load recents
  useEffect(() => {
    const saved = localStorage.getItem('search_recents');
    if (saved) {
      try {
        setRecentItems(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load recents');
      }
    }
  }, []);

  // Global Shortcut Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
        setIsFocused(true);
      }

      if (e.key === 'Escape' && isFocused) {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFocused]);

  // Click Outside Handler
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClose = () => {
    setIsFocused(false);
    setQuery('');
    setResults([]);
    inputRef.current?.blur();
  };

  // Search Logic
  useEffect(() => {
    if (!query) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const fetchResults = async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      try {
        const res = await authFetch(`/api/search?q=${encodeURIComponent(query)}`, {
          signal: abortControllerRef.current.signal
        });
        if (res.ok) {
           const data = await res.json();
           setResults(data.results || []);
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Search error', err);
          setResults([]);
        }
      } finally {
        setIsLoading(false);
        setSelectedIndex(0);
      }
    };

    const timer = setTimeout(fetchResults, 150);
    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = useCallback((result: SearchResult) => {
    // Save to recents
    const newRecents = [result, ...recentItems.filter(item => item.id !== result.id)].slice(0, 5);
    setRecentItems(newRecents);
    localStorage.setItem('search_recents', JSON.stringify(newRecents));

    // Dispatch action
    // Map SearchAction to the legacy onAction format or handle it directly
    // Requirement says WorkspacePage handles it.
    onAction(result.action.kind, result);

    handleClose();
  }, [recentItems, onAction]);

  // Navigation Logic
  const handleKeyDown = (e: React.KeyboardEvent) => {
    const activeList = query ? results : recentItems;
    if (!activeList.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % activeList.length);
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + activeList.length) % activeList.length);
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      const selected = activeList[selectedIndex];
      if (selected) handleSelect(selected);
    }
  };

  const getIcon = (iconName: string) => {
    const props = { size: 16 };
    switch (iconName) {
      case 'monitor': return <Monitor {...props} />;
      case 'settings': return <Settings {...props} />;
      case 'hard-drive': return <HardDrive {...props} />;
      case 'activity': return <Activity {...props} />;
      case 'package': return <Package {...props} />;
      case 'shield': return <Shield {...props} />;
      case 'zap': return <Zap {...props} />;
      case 'file-text': return <FileText {...props} />;
      case 'folder': return <Folder {...props} />;
      case 'plus-square': return <PlusSquare {...props} />;
      case 'refresh-cw': return <RefreshCw {...props} />;
      case 'trash-2': return <Trash2 {...props} />;
      case 'power': return <Power {...props} color="#ff4444" />;
      case 'link': return <LinkIcon {...props} />;
      case 'hash': return <Hash {...props} />;
      case 'lock': return <Lock {...props} />;
      case 'key': return <Key {...props} />;
      case 'file-code': return <FileCode {...props} />;
      case 'file-json': return <FileJson {...props} />;
      case 'table': return <Table {...props} />;
      case 'split': return <Split {...props} />;
      case 'file-type': return <FileType {...props} />;
      case 'list': return <List {...props} />;
      case 'layers': return <Layers {...props} />;
      default: return <Command {...props} />;
    }
  };
  const highlightMatch = (text: string, q: string) => {
    if (!q) return text;
    const parts = text.split(new RegExp(`(${q})`, 'gi'));
    return parts.map((part, i) => 
      part.toLowerCase() === q.toLowerCase() 
        ? <span key={i} className="highlight">{part}</span> 
        : part
    );
  };

  const activeResults = query ? results : recentItems;
  const showPanel = isFocused && (activeResults.length > 0 || isLoading);

  return (
    <div 
        ref={containerRef}
        className={`search-bar-container ${isFocused ? 'active' : ''}`}
    >
      {showPanel && (
        <div className="search-results-panel">
          {isLoading ? (
            <div className="search-loading">Searching...</div>
          ) : (
            <div className="results-list">
              {!query && recentItems.length > 0 && (
                <div className="results-section-header">Recently Used</div>
              )}
              {activeResults.map((result, index) => (
                <div 
                  key={`${result.type}-${result.id}`}
                  className={`result-item ${index === selectedIndex ? 'selected' : ''}`}
                  onClick={() => handleSelect(result)}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <div className="result-icon">{getIcon(result.icon)}</div>
                  <div className="result-info">
                    <div className="result-title">{highlightMatch(result.title, query)}</div>
                    <div className="result-desc">{result.description}</div>
                  </div>
                  <div className="result-type-badge">{result.type}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="search-input-wrapper">
        <Search size={18} className="search-icon" />
        <input
          ref={inputRef}
          type="text"
          placeholder="Type a command or search..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
        />
        <div className="shortcut-hint">
            {query ? (
              <button onClick={() => { setQuery(''); inputRef.current?.focus(); }} className="clear-btn">
                <X size={14}/>
              </button>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Command size={10} /><span>K</span>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default SearchBar;