import React from 'react';
import './Sidebar.css';
import { Folder, Package, Settings, Layout, Shield } from 'lucide-react';

interface SidebarProps {
  isCollapsed: boolean;
  toggleCollapse: () => void;
  onOpenPluginDrawer: () => void;
  onLaunchApp: (appId: string) => void;
  activeItem: string;
  setActiveItem: (item: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isCollapsed, 
  toggleCollapse, 
  onOpenPluginDrawer,
  onLaunchApp,
  activeItem,
  setActiveItem
}) => {
  const sidebarItems = [
    { id: 'files', label: 'File Manager', icon: <Folder size={20} />, action: () => onLaunchApp('files') },
    { id: 'plugins', label: 'Plugins', icon: <Package size={20} />, action: onOpenPluginDrawer },
    { id: 'security', label: 'Security', icon: <Shield size={20} />, action: () => onLaunchApp('security') },
    { id: 'settings', label: 'Settings', icon: <Settings size={20} />, action: () => onLaunchApp('settings') },
  ];

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        {!isCollapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 5px' }}>
            <img src="/kernex.png" alt="Logo" style={{ width: '24px', height: '24px', borderRadius: '4px' }} />
            <span style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '-0.5px' }}>Kernex</span>
          </div>
        )}
        <button onClick={toggleCollapse} className="toggle-btn" title="Toggle Sidebar (⌘B)">
          <Layout size={20} />
        </button>
      </div>

      <div className="sidebar-content">
        {sidebarItems.map((item) => (
          <div
            key={item.id}
            className={`sidebar-item ${activeItem === item.id ? 'active' : ''}`}
            onClick={() => {
              setActiveItem(item.id);
              if (item.action) item.action();
            }}
            title={isCollapsed ? item.label : ''}
          >
            <div className="icon-container">{item.icon}</div>
            {!isCollapsed && <span className="label">{item.label}</span>}
          </div>
        ))}
      </div>
      <div className="sidebar-footer">
          {/* Placeholder for future footer items or user profile */}
      </div>
    </div>
  );
};

export default Sidebar;
