import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronDown } from 'lucide-react';

export interface DocEntry {
  type: 'file' | 'dir';
  name: string;
  title: string;
  path: string;
  children?: DocEntry[];
}

interface DocsSidebarProps {
  tree: DocEntry[];
  activeSlug: string;
}

const docRoute = (path: string) => (path ? `/docs/${path}` : '/docs');

const isChildActiveRecursive = (entry: DocEntry, slug: string): boolean => {
  if (entry.type === 'file' && entry.path === slug) return true;
  if (entry.children) {
    return entry.children.some((child) => isChildActiveRecursive(child, slug));
  }
  return false;
};

const TreeItem: React.FC<{ item: DocEntry; activeSlug: string; depth?: number }> = ({ item, activeSlug, depth = 0 }) => {
  const navigate = useNavigate();

  const isActive = item.type === 'file' && activeSlug === item.path;
  const hasActiveChild = item.type === 'dir' && isChildActiveRecursive(item, activeSlug);

  const [isExpanded, setIsExpanded] = useState(hasActiveChild);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (item.type === 'dir') {
      setIsExpanded(!isExpanded);
    } else {
      navigate(docRoute(item.path));
    }
  };

  return (
    <div style={{ marginLeft: depth * 12 }}>
      <div
        onClick={handleClick}
        className={`docs-sidebar-item ${isActive ? 'active' : ''} ${item.type === 'dir' ? 'dir' : 'file'}`}
      >
        {item.type === 'dir' && (
          <span style={{ marginRight: 4, display: 'flex' }}>
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
        )}
        <span className="item-title">{item.title}</span>
      </div>
      {item.type === 'dir' && isExpanded && item.children && (
        <div className="sidebar-children">
          {item.children.map((child) => (
            <TreeItem key={`${child.type}:${child.name}:${child.path}`} item={child} activeSlug={activeSlug} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
};

const DocsSidebar: React.FC<DocsSidebarProps> = ({ tree, activeSlug }) => {
  return (
    <div className="docs-sidebar">
      {tree.map((item) => (
        <TreeItem key={`${item.type}:${item.name}:${item.path}`} item={item} activeSlug={activeSlug} />
      ))}
    </div>
  );
};

export default DocsSidebar;
