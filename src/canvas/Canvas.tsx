import React, { useRef, useState, useCallback, useEffect } from 'react';
import Node from './Node';
import type { NodeData } from '../types';
import ToolSwitcher, { type ToolType } from './ToolSwitcher';
import { useSettings } from '../app/SettingsContext';

interface CanvasProps {
  nodes: NodeData[];
  zoom: number;
  setZoom: (zoom: number) => void;
  panOffset: { x: number, y: number };
  setPanOffset: (offset: { x: number, y: number } | ((prev: { x: number, y: number }) => { x: number, y: number })) => void;
  gridType: 'dots' | 'lines' | 'none';
  onNodeMove: (id: string, x: number, y: number) => void;
  onNodeResize: (id: string, width: number, height: number) => void;
  onCloseNode: (id: string) => void;
  onAddNode: (type: string, content: React.ReactNode | null, iframeSrc: string | null, title: string, position?: { x: number, y: number }) => void;
  onSelectNode: (id: string | null, multi: boolean) => void;
  onUpdateNode: (id: string, updates: Partial<NodeData>) => void;
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
}

const Canvas: React.FC<CanvasProps> = ({
  nodes,
  zoom,
  setZoom,
  panOffset,
  setPanOffset,
  gridType,
  onNodeMove,
  onNodeResize,
  onCloseNode,
  onAddNode,
  onSelectNode,
  onUpdateNode,
  activeTool,
  setActiveTool
}) => {
  const { settings } = useSettings();
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Keyboard Space hold for temporary hand tool
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        if (!isSpacePressed) setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isSpacePressed]);

  const effectiveTool = isSpacePressed ? 'hand' : activeTool;

  // Cursor-centered zoom helper
  const handleZoomAt = useCallback((newZoom: number, centerX: number, centerY: number) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const cursorX = centerX - rect.left;
    const cursorY = centerY - rect.top;

    const worldX = (cursorX - panOffset.x) / zoom;
    const worldY = (cursorY - panOffset.y) / zoom;

    setZoom(newZoom);

    const newPanX = cursorX - worldX * newZoom;
    const newPanY = cursorY - worldY * newZoom;
    setPanOffset({ x: newPanX, y: newPanY });
  }, [zoom, panOffset, setZoom, setPanOffset]);

  // Cursor-centered zoom logic (Wheel)
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      // Mouse wheel zoom respects active tool unless modifier key pressed
      // If we are in zoom tools, wheel might still pan unless ctrl/meta is pressed?
      // Figma/Excalidraw: Wheel = Pan, Ctrl+Wheel = Zoom.
      // Let's stick to Ctrl+Wheel = Zoom always (gesture).
      
      if (e.ctrlKey || e.metaKey) {
        const zoomSensitivity = 0.001 * (settings.scrollZoomSpeed || 1.0);
        const delta = -e.deltaY * zoomSensitivity;
        const newZoom = Math.min(5, Math.max(0.1, zoom + delta));
        
        if (newZoom !== zoom) {
           handleZoomAt(newZoom, e.clientX, e.clientY);
        }
      } else {
        // Pan
        setPanOffset((prev) => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
      }
    };
    
    const canvasEl = canvasRef.current;
    if (canvasEl) {
      canvasEl.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => {
      if (canvasEl) {
        canvasEl.removeEventListener('wheel', handleWheel);
      }
    };
  }, [zoom, handleZoomAt, setPanOffset, settings.scrollZoomSpeed]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.target !== canvasRef.current) return;

    if (effectiveTool === 'hand' || e.button === 1) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
      onSelectNode(null, false);
      return;
    }

    if (effectiveTool === 'zoom-in') {
      const newZoom = Math.min(5, zoom * 1.5);
      handleZoomAt(newZoom, e.clientX, e.clientY);
      return;
    }

    if (effectiveTool === 'zoom-out') {
      const newZoom = Math.max(0.1, zoom / 1.5);
      handleZoomAt(newZoom, e.clientX, e.clientY);
      return;
    }

    if (effectiveTool === 'cursor') {
      onSelectNode(null, false);
    }
  }, [effectiveTool, zoom, handleZoomAt, onSelectNode]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (isPanning) {
      const rawDx = e.clientX - panStart.x;
      const rawDy = e.clientY - panStart.y;
      
      setPanOffset((prevOffset) => ({ x: prevOffset.x + rawDx, y: prevOffset.y + rawDy }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  }, [isPanning, panStart, setPanOffset]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/json');
    if (data && canvasRef.current) {
      const { type, title, iframeSrc } = JSON.parse(data);
      
      const rect = canvasRef.current.getBoundingClientRect();
      const dropX = (e.clientX - rect.left - panOffset.x) / zoom;
      const dropY = (e.clientY - rect.top - panOffset.y) / zoom;

      // Subtract half of default width/height to center at drop point
      // (Default width 800 / 2 = 400, Default height 600 / 2 = 300)
      onAddNode(type, null, iframeSrc, title, { x: dropX - 400, y: dropY - 300 });
    }
  };

  const resetView = () => {
      setZoom(1);
      setPanOffset({ x: 0, y: 0 });
  };

  // Background styles
  const getBackgroundStyle = () => {
    if (!settings.canvasGrid) return {};

    const size = 20 * zoom;
    const offsetX = panOffset.x % size;
    const offsetY = panOffset.y % size;

    if (gridType === 'dots') {
      return {
        backgroundImage: `radial-gradient(var(--text-secondary) 1px, transparent 1px)`,
        backgroundSize: `${size}px ${size}px`,
        backgroundPosition: `${offsetX}px ${offsetY}px`,
        opacity: 0.2
      };
    } else if (gridType === 'lines') {
      return {
        backgroundImage: `linear-gradient(var(--border-color) 1px, transparent 1px), linear-gradient(90deg, var(--border-color) 1px, transparent 1px)`,
        backgroundSize: `${size}px ${size}px`,
        backgroundPosition: `${offsetX}px ${offsetY}px`,
        opacity: 0.2
      };
    }
    return {};
  };

  const getCursor = () => {
      if (isPanning) return 'grabbing';
      if (effectiveTool === 'hand') return 'grab';
      if (effectiveTool === 'zoom-in') return 'zoom-in';
      if (effectiveTool === 'zoom-out') return 'zoom-out';
      return 'default';
  };

  return (
    <div
      ref={canvasRef}
      style={{
        width: '100%',
        height: '100%',
        backgroundColor: 'var(--bg-primary)',
        position: 'relative',
        overflow: 'hidden',
        cursor: getCursor(),
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Grid Background */}
      <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: 'none',
          ...getBackgroundStyle()
      }} />

      <div
        style={{
          position: 'absolute',
          transformOrigin: '0 0',
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          width: '100%',
          height: '100%',
          pointerEvents: 'none'
        }}
      >
        {nodes.map((node) => (
          <Node
            key={node.id}
            node={node}
            zoom={zoom}
            onMove={onNodeMove}
            onResize={onNodeResize}
            onClose={onCloseNode}
            onSelect={onSelectNode}
            onUpdate={onUpdateNode}
            locked={effectiveTool !== 'cursor'} // Prevent node interaction if not in cursor mode
          />
        ))}
      </div>

      <ToolSwitcher 
        activeTool={activeTool} 
        setActiveTool={setActiveTool} 
        onResetView={resetView} 
      />

      {/* Zoom Display - Bottom Right */}
      <div style={{
          position: 'absolute',
          bottom: 24,
          right: 24,
          zIndex: 1000
      }}>
          <button 
            onClick={resetView}
            style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: 8,
                padding: '6px 12px',
                fontSize: 12,
                fontWeight: 500,
                color: 'var(--text-secondary)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
            }}
          >
              {Math.round(zoom * 100)}%
          </button>
      </div>
    </div>
  );
};

export default Canvas;

