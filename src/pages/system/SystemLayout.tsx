import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { 
  Settings, HardDrive, Activity, Package, Monitor, 
  ArrowLeft, Shield, Network, LogOut, RefreshCw, Layout 
} from 'lucide-react';
import { useAuth } from '../../app/AuthContext';
import { useTitle } from '../../hooks/useTitle';
import { useSettings } from '../../app/SettingsContext';
import { KERNEX_CONFIG } from '../../../kernex.config';

const SystemLayout: React.FC = () => {
  useTitle('System');
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { sidebarCollapsed, setSidebarCollapsed } = useSettings();

  const navItems = [
    { path: '/system', label: 'Overview', icon: <Monitor size={20} />, exact: true },
    { path: '/settings', label: 'Settings', icon: <Settings size={20} /> },
    { path: '/system/disk', label: 'Disk Manager', icon: <HardDrive size={20} /> },
    { path: '/system/network', label: 'Network Monitor', icon: <Network size={20} /> },
    { path: '/system/tasks', label: 'Task Manager', icon: <Activity size={20} /> },
    { path: '/system/plugins', label: 'Plugins', icon: <Package size={20} /> },
    { path: '/system/security', label: 'Security', icon: <Shield size={20} /> },
    { path: '/settings/system-update', label: 'System Update', icon: <RefreshCw size={20} /> },
  ];

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{
        width: sidebarCollapsed ? '50px' : '240px',
        backgroundColor: 'var(--bg-secondary)',
        borderRight: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        padding: '0',
        transition: 'width 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        position: 'relative',
        zIndex: 1000
      }}>
        {/* Header Alignment */}
        <div style={{ 
            height: '48px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: sidebarCollapsed ? 'center' : 'space-between',
            padding: sidebarCollapsed ? '0' : '0 12px',
            borderBottom: '1px solid var(--border-color)',
            marginBottom: '10px'
        }}>
            {!sidebarCollapsed && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '0 5px' }}>
                    <img src="/kernex.png" alt="Logo" style={{ width: '24px', height: '24px', borderRadius: '4px' }} />
                    <span style={{ fontWeight: 700, fontSize: '16px', letterSpacing: '-0.5px', color: 'var(--text-primary)' }}>Kernex</span>
                </div>
            )}
            <button 
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                style={{ 
                    background: 'none', 
                    border: 'none', 
                    color: 'var(--text-secondary)', 
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <Layout size={20} />
            </button>
        </div>

        <div style={{ 
            padding: sidebarCollapsed ? '0 5px 10px 5px' : '0 10px 10px 10px',
            display: 'flex',
            justifyContent: sidebarCollapsed ? 'center' : 'flex-start'
        }}>
            <button 
                onClick={() => navigate('/workspace')} 
                title={sidebarCollapsed ? "Back to Workspace" : ""}
                style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                    gap: sidebarCollapsed ? '0' : '12px', 
                    color: 'var(--text-secondary)',
                    fontSize: '13px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '10px 12px',
                    width: sidebarCollapsed ? '40px' : '100%',
                    height: '40px',
                    borderRadius: '6px',
                    transition: 'all 0.2s',
                    textDecoration: 'none',
                    fontWeight: 400
                }}
                onMouseOver={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseOut={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '24px' }}>
                    <ArrowLeft size={20} /> 
                </div>
                {!sidebarCollapsed && <span style={{ whiteSpace: 'nowrap' }}>Back to Workspace</span>}
            </button>
        </div>

        <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px', padding: '0 10px', overflowY: 'auto', overflowX: 'hidden' }}>
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.exact}
              title={sidebarCollapsed ? item.label : ''}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                gap: sidebarCollapsed ? '0' : '12px',
                padding: '10px 12px',
                borderRadius: '6px',
                textDecoration: 'none',
                color: isActive ? 'white' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'var(--accent-primary)' : 'transparent',
                fontWeight: isActive ? 500 : 400,
                transition: 'all 0.2s',
                minHeight: '40px'
              })}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minWidth: '24px' }}>
                {item.icon}
              </div>
              {!sidebarCollapsed && <span style={{ whiteSpace: 'nowrap', fontSize: '13px' }}>{item.label}</span>}
            </NavLink>
          ))}
        </nav>
        
        <div style={{ 
            padding: sidebarCollapsed ? '15px 0' : '20px', 
            borderTop: '1px solid var(--border-color)', 
            color: 'var(--text-secondary)', 
            fontSize: '12px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: sidebarCollapsed ? 'center' : 'flex-start',
            gap: '10px'
        }}>
            {!sidebarCollapsed && <div>Kernex v{KERNEX_CONFIG.version}</div>}
            <button 
              onClick={logout}
              title="Sign Out"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#ef4444',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: 0,
                fontSize: '13px',
                fontWeight: 500
              }}
            >
              <LogOut size={sidebarCollapsed ? 18 : 14} /> 
              {!sidebarCollapsed && <span>Sign Out</span>}
            </button>
        </div>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', backgroundColor: 'var(--bg-primary)' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '40px' }}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default SystemLayout;