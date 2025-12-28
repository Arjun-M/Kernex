import React from 'react';
import './TopBar.css';
import { LogOut } from 'lucide-react';
import { useAuth } from '../../app/AuthContext';

interface TopBarProps {
  zoom: number;
  setZoom: (zoom: number) => void;
  resetView: () => void;
  workspaceName?: string;
}

const TopBar: React.FC<TopBarProps> = ({ zoom, setZoom, resetView, workspaceName = 'Kernex Surface' }) => {
  const { logout } = useAuth();

  return (
    <div className="top-bar">
      <div className="top-bar-left">
        <span className="workspace-name">{workspaceName}</span>
      </div>
      
      <div className="top-bar-center">
         {/* Search bar is now floating at the bottom */}
      </div>

      <div className="top-bar-right">
        <div className="zoom-controls">
          <button onClick={() => setZoom(Math.max(0.1, zoom - 0.1))} title="Zoom Out (⌘-)">−</button>
          <span className="zoom-display">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(Math.min(5, zoom + 0.1))} title="Zoom In (⌘+)">+</button>
          <button onClick={resetView} title="Reset View">⟲</button>
        </div>
        <div 
          onClick={logout}
          style={{ 
            cursor: 'pointer', 
            color: '#ef4444', 
            display: 'flex', 
            alignItems: 'center', 
            padding: '4px 8px', 
            borderRadius: '4px',
            transition: 'background 0.2s'
          }}
          title="Sign Out"
        >
          <LogOut size={16} />
        </div>
        <div className="status-indicator online" title="Connected">●</div>
      </div>
    </div>
  );
};

export default TopBar;
