import React, { useState, useRef, useEffect } from 'react';
import NodeHeader from './NodeHeader';
import NodeBody from './NodeBody';
import type { NodeData } from '../types';
import './Node.css';
import { useSettings } from '../app/SettingsContext';

interface NodeProps {
  node: NodeData;
  zoom: number;
  onMove: (id: string, dx: number, dy: number) => void;
  onResize: (id: string, width: number, height: number) => void;
  onClose: (id: string) => void;
  onSelect: (id: string, multi: boolean) => void;
  onUpdate: (id: string, updates: Partial<NodeData>) => void;
  locked?: boolean;
}

const Node: React.FC<NodeProps> = ({
  node,
  zoom,
  onMove,
  onResize,
  onClose,
  onSelect,
  onUpdate,
  locked: externalLocked
}) => {
  const { settings } = useSettings();
  const { id, type, x, y, width, height, iframeSrc, content, title, zIndex, minimized, maximized, locked: internalLocked, selected } = node;
  
  const isLocked = internalLocked || externalLocked;
  
  const [isResizing, setIsResizing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const nodeRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;

    // Handle selection
    if (!externalLocked) {
      onSelect(id, e.shiftKey || e.metaKey);
    }

    if (isLocked) return;

    if (headerRef.current && (e.target === headerRef.current || headerRef.current.contains(e.target as Node))) {
      if (!maximized) {
        setIsDragging(true);
        setDragStart({ x: e.clientX, y: e.clientY });
        e.preventDefault();
        e.stopPropagation();
      }
    }
    
    if (resizeHandleRef.current && (e.target === resizeHandleRef.current || resizeHandleRef.current.contains(e.target as Node))) {
      if (!minimized && !maximized) {
        setIsResizing(true);
        setResizeStart({ x: e.clientX, y: e.clientY, width, height });
        e.preventDefault();
        e.stopPropagation();
      }
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        const sensitivity = settings.dragSensitivity || 1.0;
        const rawDx = (e.clientX - dragStart.x) * sensitivity;
        const rawDy = (e.clientY - dragStart.y) * sensitivity;
        
        const dx = rawDx / zoom;
        const dy = rawDy / zoom;

        let newX = x + dx;
        let newY = y + dy;

        // Snap to grid if enabled
        if (settings.canvasSnapToGrid) {
            const gridSize = 20;
            newX = Math.round(newX / gridSize) * gridSize;
            newY = Math.round(newY / gridSize) * gridSize;
        }

        onMove(id, newX, newY); 
        setDragStart({ x: e.clientX, y: e.clientY });
      }

      if (isResizing) {
        const rawDx = e.clientX - resizeStart.x;
        const rawDy = e.clientY - resizeStart.y;
        
        const dx = rawDx / zoom;
        const dy = rawDy / zoom;

        const newWidth = Math.max(200, resizeStart.width + dx); 
        const newHeight = Math.max(100, resizeStart.height + dy);
        onResize(id, newWidth, newHeight);
      }
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
    };

    if (isDragging || isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStart, resizeStart, id, x, y, zoom, onMove, onResize]);

  // Styles based on state
  const getStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {
      position: 'absolute',
      zIndex: zIndex || 1,
      display: 'flex',
      flexDirection: 'column',
      boxShadow: selected ? '0 0 0 2px var(--accent-primary), var(--shadow)' : 'var(--shadow)',
      transition: isDragging || isResizing ? 'none' : 'all 0.2s ease-out',
      backgroundColor: 'var(--node-bg)',
      borderRadius: '8px',
      overflow: 'hidden',
    };

    if (minimized) {
      return {
        ...baseStyle,
        left: `${x}px`,
        top: `${y}px`,
        width: '200px',
        height: '40px', // Header only
      };
    }

    return {
      ...baseStyle,
      left: `${x}px`,
      top: `${y}px`,
      width: `${width}px`,
      height: `${height}px`,
    };
  };

  const handleToggleMinimize = () => onUpdate(id, { minimized: !minimized });
  const handleToggleLock = () => onUpdate(id, { locked: !internalLocked });

  return (
    <div
      ref={nodeRef}
      className="node"
      style={getStyle()}
      onMouseDown={handleMouseDown}
    >
      <NodeHeader 
        title={title} 
        onClose={() => onClose(id)} 
        headerRef={headerRef} 
      />
      
      <div style={{ position: 'absolute', top: 8, right: 35, display: 'flex', gap: 4, zIndex: 10 }}>
         <button onClick={handleToggleLock} style={{ fontSize: 10, cursor: 'pointer' }}>{internalLocked ? '🔒' : '🔓'}</button>
         <button onClick={handleToggleMinimize} style={{ fontSize: 10, cursor: 'pointer' }}>{minimized ? 'Expand' : '_'}</button>
      </div>

      {!minimized && (
        <div style={{ flexGrow: 1, position: 'relative', overflow: 'hidden' }}>
          <NodeBody 
            type={type} 
            iframeSrc={iframeSrc} 
            content={content} 
            width={width} 
            height={height - 32} 
          />
          
          {isResizing && (
            <div style={{
              position: 'absolute',
              top: 0, left: 0, right: 0, bottom: 0,
              zIndex: 9999,
              cursor: 'nwse-resize'
            }} />
          )}
        </div>
      )}

      {!minimized && !isLocked && (
        <div
          ref={resizeHandleRef}
          className="resize-handle"
          style={{
            position: 'absolute',
            bottom: '0',
            right: '0',
            width: '15px',
            height: '15px',
            cursor: 'nwse-resize',
            backgroundColor: selected ? 'var(--accent-primary)' : 'transparent',
            zIndex: 10
          }}
        >
          <div style={{ 
            width: 0, height: 0, 
            borderStyle: 'solid', 
            borderWidth: '0 0 10px 10px', 
            borderColor: 'transparent transparent var(--text-secondary) transparent',
            position: 'absolute', bottom: 2, right: 2
          }} />
        </div>
      )}
    </div>
  );
};

export default Node;