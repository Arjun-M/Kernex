import React, { useEffect } from 'react';
import { MousePointer2, Hand, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import './ToolSwitcher.css';

export type ToolType = 'cursor' | 'hand' | 'zoom-in' | 'zoom-out';

interface ToolSwitcherProps {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  onResetView: () => void;
}

const ToolSwitcher: React.FC<ToolSwitcherProps> = ({ activeTool, setActiveTool, onResetView }) => {
  
  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in an input
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

      switch (e.key.toLowerCase()) {
        case 'v':
          setActiveTool('cursor');
          break;
        case 'h':
          setActiveTool('hand');
          break;
        case 'z':
          setActiveTool('zoom-in'); // Default 'z' to zoom-in tool
          break;
        case '0':
          onResetView();
          break;
        case ' ':
          if (!e.repeat) {
            // Space hold is handled in Canvas via keydown/keyup usually, 
            // but we can set temporary state here if we moved that logic up.
            // For now, let's keep simple toggle logic or just rely on Canvas handling space-drag override.
            // Requirement says "Space (hold) -> temporary Hand tool".
            // Implementation strategy: The canvas handles spacebar overrides. 
            // This switcher just reflects state or sets persistent state.
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setActiveTool, onResetView]);

  const tools = [
    { id: 'cursor', icon: <MousePointer2 size={18} />, label: 'Cursor (V)' },
    { id: 'hand', icon: <Hand size={18} />, label: 'Hand (H)' },
    { id: 'zoom-in', icon: <ZoomIn size={18} />, label: 'Zoom In (Z)' },
    { id: 'zoom-out', icon: <ZoomOut size={18} />, label: 'Zoom Out' },
  ];

  return (
    <div className="tool-switcher">
      <div className="tool-group">
        {tools.map((tool) => (
          <button
            key={tool.id}
            className={`tool-btn ${activeTool === tool.id ? 'active' : ''}`}
            onClick={() => setActiveTool(tool.id as ToolType)}
            title={tool.label}
          >
            {tool.icon}
          </button>
        ))}
      </div>
      <div className="tool-divider" />
      <button className="tool-btn" onClick={onResetView} title="Reset View (0)">
        <Maximize size={18} />
      </button>
    </div>
  );
};

export default ToolSwitcher;
