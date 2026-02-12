import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, X, Globe, FileText, Database, Terminal, Link as LinkIcon, 
  Hash, Zap, Lock, Key, Shield, FileCode, FileJson, Table, Diff, 
  FileType, List, Layers, ChevronDown, ChevronRight, Server, Image as ImageIcon
} from 'lucide-react';
import './PluginDrawer.css';

interface PluginDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onAddPlugin: (type: string, title: string, iframeSrc: string | null) => void;
}

interface Plugin {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  type: string;
  iframeSrc: string | null;
  category: string;
}

const PLUGINS: Plugin[] = [
  {
    id: 'photo-viewer',
    title: 'Photo Viewer',
    description: 'Simple image viewer',
    icon: <ImageIcon size={24} />,
    type: 'iframe',
    iframeSrc: '/i/photo-viewer/index.html',
    category: 'Media Tools'
  },
  {
    id: 'image-studio',
    title: 'Image Studio',
    description: 'View, edit, and convert images',
    icon: <ImageIcon size={24} color="#ec4899" />,
    type: 'iframe',
    iframeSrc: '/i/image-studio/index.html',
    category: 'Media Tools'
  },
  {
    id: 'web-extractor',
    title: 'Website Extractor',
    description: 'Download source code from URLs',
    icon: <Globe size={24} color="#3b82f6" />,
    type: 'iframe',
    iframeSrc: '/i/website-extractor/index.html',
    category: 'Productivity Utilities'
  },
  {
    id: 'note',
    title: 'Note',
    description: 'Simple markdown note editor',
    icon: <FileText size={24} />,
    type: 'iframe',
    iframeSrc: '/i/notes/index.html',
    category: 'Productivity Utilities'
  },
  {
    id: 'http-tester',
    title: 'HTTP Tester',
    description: 'Test API endpoints with a simple interface',
    icon: <Globe size={24} />,
    type: 'iframe',
    iframeSrc: '/i/http-tester/index.html',
    category: 'HTTP / API'
  },
  {
    id: 'terminal',
    title: 'Terminal',
    description: 'Real-time interactive terminal',
    icon: <Terminal size={24} />,
    type: 'iframe',
    iframeSrc: '/i/terminal/index.html',
    category: 'System & Environment'
  },
  {
    id: 'ftp-client',
    title: 'FTP Client',
    description: 'Connect to external FTP servers',
    icon: <Server size={24} />,
    type: 'iframe',
    iframeSrc: '/i/ftp-client/index.html',
    category: 'System & Environment'
  },
  {
    id: 'ftp-info',
    title: 'FTP Info',
    description: 'Connection details for internal FTP',
    icon: <Server size={24} color="#10b981" />,
    type: 'iframe',
    iframeSrc: '/i/ftp-usage/index.html',
    category: 'System & Environment'
  },
  {
    id: 'db-viewer',
    title: 'SQL Viewer',
    description: 'Inspect and query workspace SQLite databases',
    icon: <Database size={24} />,
    type: 'iframe',
    iframeSrc: '/i/db/index.html',
    category: 'Database Tools'
  },
  {
    id: 'json-viewer',
    title: 'JSON Tool',
    description: 'Format, minify, validate JSON',
    icon: <FileJson size={24} />,
    type: 'iframe',
    iframeSrc: '/i/json/index.html',
    category: 'Data Formats'
  },
  {
    id: 'yaml-tool',
    title: 'YAML Tool',
    description: 'Convert YAML to JSON and vice-versa',
    icon: <FileType size={24} />,
    type: 'iframe',
    iframeSrc: '/i/yaml/index.html',
    category: 'Data Formats'
  },
  {
    id: 'csv-viewer',
    title: 'CSV Viewer',
    description: 'View and sort CSV files',
    icon: <Table size={24} />,
    type: 'iframe',
    iframeSrc: '/i/csv/index.html',
    category: 'Data Formats'
  },
  {
    id: 'diff-viewer',
    title: 'Diff Tool',
    description: 'Compare two text blocks',
    icon: <Diff size={24} />,
    type: 'iframe',
    iframeSrc: '/i/diff/index.html',
    category: 'Text Utilities'
  },
  {
    id: 'regex-tester',
    title: 'Regex Tool',
    description: 'Test regular expressions',
    icon: <Search size={24} />,
    type: 'iframe',
    iframeSrc: '/i/regex/index.html',
    category: 'Regex & Pattern Tools'
  },
  {
    id: 'markdown-preview',
    title: 'Markdown',
    description: 'Live GitHub-flavored preview',
    icon: <FileCode size={24} />,
    type: 'iframe',
    iframeSrc: '/i/markdown/index.html',
    category: 'Documentation & Preview'
  },
  {
    id: 'logs-viewer',
    title: 'Log Viewer',
    description: 'Highlight and filter log files',
    icon: <List size={24} />,
    type: 'iframe',
    iframeSrc: '/i/logs-viewer/index.html',
    category: 'Observability & Logs'
  },
  {
    id: 'xml-formatter',
    title: 'XML Tool',
    description: 'Format and minify XML',
    icon: <Layers size={24} />,
    type: 'iframe',
    iframeSrc: '/i/xml/index.html',
    category: 'Data Formats'
  },
  {
    id: 'hash-gen',
    title: 'Hash Generator',
    description: 'MD5, SHA, Bcrypt hashing',
    icon: <Hash size={24} />,
    type: 'iframe',
    iframeSrc: '/i/hash/index.html',
    category: 'Cryptography'
  },
  {
    id: 'base64-tool',
    title: 'Base64 Tool',
    description: 'Encode/Decode Base64 strings',
    icon: <FileCode size={24} />,
    type: 'iframe',
    iframeSrc: '/i/base64/index.html',
    category: 'Encoding / Decoding'
  },
  {
    id: 'jwt-decoder',
    title: 'JWT Decoder',
    description: 'Inspect JWT header and payload',
    icon: <Shield size={24} />,
    type: 'iframe',
    iframeSrc: '/i/jwt/index.html',
    category: 'Authentication & Tokens'
  },
  {
    id: 'uuid-gen',
    title: 'UUID Gen',
    description: 'Generate v4 UUIDs',
    icon: <Zap size={24} />,
    type: 'iframe',
    iframeSrc: '/i/uuid/index.html',
    category: 'Text Utilities'
  },
  {
    id: 'pass-gen',
    title: 'Password Gen',
    description: 'Secure random passwords',
    icon: <Lock size={24} />,
    type: 'iframe',
    iframeSrc: '/i/password/index.html',
    category: 'Security Utilities'
  },
  {
    id: 'hmac-tool',
    title: 'HMAC Tool',
    description: 'Generate HMAC signatures',
    icon: <Key size={24} />,
    type: 'iframe',
    iframeSrc: '/i/hmac/index.html',
    category: 'Cryptography'
  },
  {
    id: 'encrypt-play',
    title: 'Encryption',
    description: 'AES Encryption playground',
    icon: <Shield size={24} color="#f59e0b" />,
    type: 'iframe',
    iframeSrc: '/i/encryption/index.html',
    category: 'Cryptography'
  },
  {
    id: 'url-tracer',
    title: 'URL Tracer',
    description: 'Analyze URL redirects and paths',
    icon: <LinkIcon size={24} color="#8b5cf6" />,
    type: 'iframe',
    iframeSrc: '/i/url-tracer/index.html',
    category: 'URL & Routing'
  },
  {
    id: 'short-urls',
    title: 'Short URLs',
    description: 'Manage custom URL redirects',
    icon: <LinkIcon size={24} />,
    type: 'iframe',
    iframeSrc: '/i/short-urls/index.html',
    category: 'URL & Routing'
  }
];

const PluginDrawer: React.FC<PluginDrawerProps> = ({ isOpen, onClose, onAddPlugin }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('expanded_plugin_categories');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  
  useEffect(() => {
    localStorage.setItem('expanded_plugin_categories', JSON.stringify(Array.from(expandedCategories)));
  }, [expandedCategories]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isOpen && e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const groupedPlugins = useMemo(() => {
    const filtered = PLUGINS.filter(p => 
      p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      p.description.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const groups: Record<string, Plugin[]> = {};
    filtered.forEach(p => {
      const cat = p.category || 'Uncategorized';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(p);
    });

    // Auto-expand categories when searching
    if (searchTerm) {
        // This side-effect should not be in useMemo
    }

    return groups;
  }, [searchTerm]);

  useEffect(() => {
    if (searchTerm) {
       const allCats = Object.keys(groupedPlugins);
       setTimeout(() => {
         setExpandedCategories(new Set(allCats));
       }, 0);
    }
  }, [searchTerm, groupedPlugins]);

  const toggleCategory = (category: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  return (
    <div className={`plugin-drawer ${isOpen ? 'open' : ''}`}>
      <div className="drawer-header">
        <div className="header-top">
          <h3>Plugin Library</h3>
          <button onClick={onClose} className="close-btn">
            <X size={20} />
          </button>
        </div>
        <div className="search-container">
          <Search size={18} className="search-icon" />
          <input 
            type="text" 
            placeholder="Search all plugins..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus={isOpen}
          />
        </div>
      </div>

      <div className="drawer-content">
        {Object.entries(groupedPlugins).sort(([a], [b]) => a.localeCompare(b)).map(([category, plugins]) => {
          const isExpanded = expandedCategories.has(category);
          return (
            <div key={category} className="category-group">
              <div 
                className={`category-header ${isExpanded ? 'expanded' : ''}`}
                onClick={() => toggleCategory(category)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <span className="category-name">{category}</span>
                </div>
                <span className="category-count">{plugins.length}</span>
              </div>
              
              {isExpanded && (
                <div className="plugin-grid">
                  {plugins.map(plugin => (
                    <div 
                      key={plugin.id} 
                      className="plugin-card"
                      onClick={() => {
                        onAddPlugin(plugin.type, plugin.title, plugin.iframeSrc);
                        onClose();
                      }}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/json', JSON.stringify({
                          type: plugin.type,
                          title: plugin.title,
                          iframeSrc: plugin.iframeSrc
                        }));
                      }}
                      title={plugin.description}
                    >
                      <div className="plugin-icon">{plugin.icon}</div>
                      <div className="plugin-info">
                        <h4>{plugin.title}</h4>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
        {Object.keys(groupedPlugins).length === 0 && (
            <div className="no-results">No plugins match your search.</div>
        )}
      </div>
    </div>
  );
};

export default PluginDrawer;