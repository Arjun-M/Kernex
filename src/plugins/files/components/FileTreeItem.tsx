import React, { useState, useRef, useEffect } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { getFileIcon } from './FileIcons';

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'folder';
  children?: FileNode[];
}

interface FileTreeItemProps {
  node: FileNode;
  level: number;
  selectedPath: string | null;
  selectedPaths: Set<string>;
  expandedFolders: Set<string>;
  onToggle: (path: string) => void;
  onSelect: (node: FileNode, event: React.MouseEvent) => void;
  onContextMenu: (e: React.MouseEvent, node: FileNode) => void;
  onDrop: (e: React.DragEvent, node: FileNode) => void;
  onDragStart: (e: React.DragEvent, node: FileNode) => void;
  editingPath: string | null;
  onRenameSubmit: (node: FileNode, newName: string) => void;
  onRenameCancel: () => void;
  newFileParent: string | null; // Path of the parent folder
  newFileType: 'file' | 'folder' | null;
  onCreateSubmit: (name: string) => void;
  onCreateCancel: () => void;
}

export const FileTreeItem: React.FC<FileTreeItemProps> = ({
  node,
  level,
  selectedPath,
  selectedPaths,
  expandedFolders,
  onToggle,
  onSelect,
  onContextMenu,
  onDrop,
  onDragStart,
  editingPath,
  onRenameSubmit,
  onRenameCancel,
  newFileParent,
  newFileType,
  onCreateSubmit,
  onCreateCancel
}) => {
  const isExpanded = expandedFolders.has(node.path);
  const isSelected = selectedPaths.has(node.path) || selectedPath === node.path;
  const isEditing = editingPath === node.path;
  const isCreatingChild = newFileParent === node.path;

  const [editName, setEditName] = useState(node.name);
  const [createName, setCreateName] = useState('');
  
  const editInputRef = useRef<HTMLInputElement>(null);
  const createInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    if (isCreatingChild && createInputRef.current) {
      createInputRef.current.focus();
      setTimeout(() => setCreateName(''), 0);
    }
  }, [isCreatingChild]);

  const handleEditKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onRenameSubmit(node, editName);
    } else if (e.key === 'Escape') {
      onRenameCancel();
      setEditName(node.name);
    }
  };

  const handleCreateKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
        onCreateSubmit(createName);
    } else if (e.key === 'Escape') {
        onCreateCancel();
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (node.type === 'folder') {
      e.currentTarget.classList.add('drag-over');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDropLocal = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('drag-over');
    onDrop(e, node);
  };

  return (
    <div>
      <div 
        className={`file-row ${isSelected ? 'selected' : ''} ${isEditing ? 'editing' : ''}`}
        style={{ paddingLeft: `${level * 12 + 8}px` }}
        onClick={(e) => onSelect(node, e)}
        onContextMenu={(e) => onContextMenu(e, node)}
        draggable={!isEditing}
        onDragStart={(e) => onDragStart(e, node)}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDropLocal}
      >
        <span 
          className="toggle-icon" 
          onClick={(e) => { e.stopPropagation(); onToggle(node.path); }}
          style={{ visibility: node.type === 'folder' ? 'visible' : 'hidden' }}
        >
          {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </span>
        
        <span className="file-icon">
          {getFileIcon(node.name, node.type === 'folder', isExpanded)}
        </span>

        {isEditing ? (
          <input
            ref={editInputRef}
            type="text"
            className="rename-input"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onKeyDown={handleEditKeyDown}
            onBlur={() => onRenameSubmit(node, editName)}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="file-name">{node.name}</span>
        )}
      </div>

      {/* Child nodes */}
      {node.type === 'folder' && isExpanded && (
          <div className="file-children">
            {/* Input for new file creation */}
            {isCreatingChild && (
                <div 
                    className="file-row editing" 
                    style={{ paddingLeft: `${(level + 1) * 12 + 8}px` }}
                >
                    <span className="toggle-icon" style={{ visibility: 'hidden' }}>
                        <ChevronRight size={14} />
                    </span>
                    <span className="file-icon">
                        {getFileIcon(createName, newFileType === 'folder', false)}
                    </span>
                    <input
                        ref={createInputRef}
                        type="text"
                        className="rename-input"
                        value={createName}
                        onChange={(e) => setCreateName(e.target.value)}
                        onKeyDown={handleCreateKeyDown}
                        onBlur={() => onCreateSubmit(createName)}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}

            {node.children && node.children.map(child => (
                <FileTreeItem 
                key={child.path}
                node={child}
                level={level + 1}
                selectedPath={selectedPath}
                selectedPaths={selectedPaths}
                expandedFolders={expandedFolders}
                onToggle={onToggle}
                onSelect={onSelect}
                onContextMenu={onContextMenu}
                onDrop={onDrop}
                onDragStart={onDragStart}
                editingPath={editingPath}
                onRenameSubmit={onRenameSubmit}
                onRenameCancel={onRenameCancel}
                newFileParent={newFileParent}
                newFileType={newFileType}
                onCreateSubmit={onCreateSubmit}
                onCreateCancel={onCreateCancel}
                />
            ))}
          </div>
      )}
    </div>
  );
};
