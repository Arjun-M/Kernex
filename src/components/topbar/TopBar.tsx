import React, { useEffect, useState } from 'react';
import './TopBar.css';
import { LogOut, Star, Save, Lock, ChevronRight } from 'lucide-react';
import { useAuth } from '../../app/AuthContext';
import { useNavigate } from 'react-router-dom';

interface TopBarProps {
  zoom: number;
  setZoom: (zoom: number) => void;
  resetView: () => void;
  workspaceName?: string;
  isProtected?: boolean;
  onSave?: () => void;
}

const TopBar: React.FC<TopBarProps> = ({ 
  zoom, 
  setZoom, 
  resetView, 
  workspaceName = 'Kernex Surface',
  isProtected = false,
  onSave
}) => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [stars, setStars] = useState<number | null>(null);

  useEffect(() => {
    fetch('https://api.github.com/repos/Arjun-M/Kernex')
      .then(res => res.json())
      .then(data => setStars(data.stargazers_count))
      .catch(console.error);
  }, []);

  return (
    <div className="top-bar">
      <div className="top-bar-left">
        <div className="breadcrumb">
            <span 
                className="breadcrumb-segment" 
                onClick={() => navigate('/workspace')}
                style={{ cursor: 'pointer', transition: 'color 0.2s' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--accent-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'inherit'}
            >
                Personal
            </span>
            <ChevronRight size={14} className="breadcrumb-separator" />
            <span className="breadcrumb-segment active">{workspaceName}</span>
            {isProtected && <Lock size={14} style={{ marginLeft: 8, color: 'var(--accent-primary)' }} />}
        </div>
      </div>
      
      <div className="top-bar-center">
         {/* Search bar is now floating at the bottom */}
      </div>

      <div className="top-bar-right">
        <a 
            href="https://github.com/Arjun-M/Kernex" 
            target="_blank" 
            rel="noopener noreferrer"
            className="github-star-btn"
            title="Star on GitHub"
        >
            <Star size={16} />
            <span style={{ fontSize: '13px', fontWeight: 500 }}>{stars !== null ? stars : '...'}</span>
        </a>

        {onSave && (
            <button className="top-bar-btn" onClick={onSave} title="Save Workspace">
                <Save size={18} />
            </button>
        )}

        <div className="zoom-controls">
          <button onClick={() => setZoom(Math.max(0.1, zoom - 0.1))} title="Zoom Out (⌘-)">−</button>
          <span className="zoom-display">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom(Math.min(5, zoom + 0.1))} title="Zoom In (⌘+)">+</button>
          <button onClick={resetView} title="Reset View">⟲</button>
        </div>
        
        <div 
          onClick={logout}
          className="top-bar-btn logout-btn"
          title="Sign Out"
        >
          <LogOut size={18} />
        </div>
        
        <div className="status-indicator online" title="Connected">●</div>
      </div>
    </div>
  );
};

export default TopBar;

