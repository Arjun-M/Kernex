import React, { useState, useRef } from 'react';
import { Save, Monitor, Layout, Keyboard } from 'lucide-react';
import './SettingsPage.css';
import { useSettings } from '../../app/SettingsContext';
import { useTitle } from '../../hooks/useTitle';

const SettingsPage: React.FC = () => {
  useTitle('Settings');
  const { settings, updateSettings } = useSettings();
  const [localSettings, setLocalSettings] = useState<any>(settings);
  const [activeTab, setActiveTab] = useState('appearance');
  const [hasChanges, setHasChanges] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const handleChange = (key: string, value: any) => {
    const updated = { ...localSettings, [key]: value };
    setLocalSettings(updated);
    setHasChanges(true);
    
    // Auto-apply visual things if they are in certain keys
    if (['fontSize', 'uiDensity', 'canvasGrid', 'canvasSnapToGrid'].includes(key)) {
        updateSettings({ [key]: value });
    }
  };

  const handleThemeChange = (themeId: string) => {
    if (localSettings.themeId === themeId) return;
    const updated = { ...localSettings, themeId };
    setLocalSettings(updated);
    updateSettings({ themeId });
  };

  const handleSave = async () => {
    try {
      await updateSettings(localSettings);
      setHasChanges(false);
      alert('Settings saved successfully');
    } catch (e) {
      console.error(e);
      alert('Failed to save settings');
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
      if (scrollRef.current) {
          if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
              scrollRef.current.style.scrollBehavior = 'auto';
              scrollRef.current.scrollLeft += e.deltaY;
              scrollRef.current.style.scrollBehavior = 'smooth';
          }
      }
  };

  const themes = [
    'obsidian-black', 'midnight-carbon', 'obsidian-flow', 'graphite-ui', 'deep-space', 
    'terminal-noir', 'lunar-slate', 'void-matrix', 'dark-silicon', 'phantom-grey',
    'shadow-grid', 'solar-ash', 'iron-dusk', 'neon-eclipse', 'plasma-night',
    'infra-black', 'hex-void', 'carbon-mist', 'alloy-dark', 'onyx-pro',
    'black-ice', 'arctic-mono', 'polar-code', 'frosted-slate', 'snowblind-ide',
    'white-silicon', 'cloud-studio', 'quartz-light', 'ivory-terminal', 'nord-core',
    'tokyo-night', 'dracula-pro', 'monokai-matrix', 'gruvbox-studio', 'solarized-core',
    'cyberpunk-2077', 'neon-synth', 'vapor-grid', 'retro-crt', 'matrix-green',
    'earth-clay', 'forest-code', 'desert-sand', 'oceanic-deep', 'volcanic-ash',
    'blood-red', 'starry-yellow'
  ];

  const renderField = (key: string, label: string, type: 'text' | 'number' | 'boolean' | 'select', options?: string[]) => {
    const val = localSettings[key];
    return (
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
          {label}
        </label>
        {type === 'boolean' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button 
              onClick={() => handleChange(key, !val)}
              style={{
                width: 40, height: 20, borderRadius: 10,
                backgroundColor: val ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                position: 'relative', transition: 'background-color 0.2s'
              }}
            >
              <div style={{
                width: 16, height: 16, borderRadius: '50%', backgroundColor: 'white',
                position: 'absolute', top: 2,
                left: val ? 22 : 2,
                transition: 'left 0.2s'
              }} />
            </button>
            <span style={{ fontSize: 13 }}>{val ? 'Enabled' : 'Disabled'}</span>
          </div>
        ) : type === 'select' ? (
          <select 
            value={val} 
            onChange={(e) => handleChange(key, e.target.value)}
            style={{ width: '100%', maxWidth: 300, padding: '8px', borderRadius: '4px', backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-color)' }}
          >
            {options?.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        ) : (
          <input
            type={type}
            value={val || ''}
            onChange={(e) => handleChange(key, type === 'number' ? Number(e.target.value) : e.target.value)}
            style={{ width: '100%', maxWidth: 300 }}
          />
        )}
      </div>
    );
  };

  const tabs = [
    { id: 'appearance', label: 'Appearance', icon: <Monitor size={16} /> },
    { id: 'workspace', label: 'Workspace', icon: <Layout size={16} /> },
    { id: 'keyboard', label: 'Interaction', icon: <Keyboard size={16} /> },
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 }}>
        <h1 style={{ margin: 0, fontSize: 24 }}>Settings</h1>
        <button 
          className="btn-primary" 
          disabled={!hasChanges}
          onClick={handleSave}
          style={{ opacity: hasChanges ? 1 : 0.5, display: 'flex', alignItems: 'center', gap: 8 }}
        >
          <Save size={16} /> Save Changes
        </button>
      </div>

      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: 20 }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '10px 20px',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent-primary)' : '2px solid transparent',
              color: activeTab === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)',
              fontWeight: activeTab === tab.id ? 500 : 400
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      <div className="card">
        {activeTab === 'appearance' && (
          <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
            <label style={{ display: 'block', marginBottom: 12, fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
              Theme Selection
            </label>
            <div className="theme-selector-container">
                <div 
                    className="theme-scroll-viewport" 
                    ref={scrollRef}
                    onWheel={handleWheel}
                >
                    {themes.map(t => (
                        <div 
                            key={t} 
                            className={`theme-card ${localSettings.themeId === t ? 'active' : ''}`}
                            onClick={() => handleThemeChange(t)}
                            data-theme={t}
                        >
                            <div className="theme-preview-box">
                                <div className="theme-preview-header" />
                                <div className="theme-preview-body">
                                    <div className="theme-preview-sidebar" />
                                    <div className="theme-preview-content">
                                        <div className="theme-preview-accent" />
                                        <div className="theme-preview-line" />
                                        <div className="theme-preview-line" style={{ width: '80%' }} />
                                    </div>
                                </div>
                            </div>
                            <div className="theme-label">{t.replace(/-/g, ' ')}</div>
                            <div className="theme-name-tooltip">{t.replace(/-/g, ' ')}</div>
                        </div>
                    ))}
                </div>
            </div>

            {renderField('fontSize', 'Base Font Size (px)', 'number')}
            {renderField('uiDensity', 'UI Density', 'select', ['compact', 'normal', 'spacious'])}
            {renderField('canvasGrid', 'Show Canvas Grid', 'boolean')}
            {renderField('canvasSnapToGrid', 'Snap to Grid', 'boolean')}
          </div>
        )}

        {activeTab === 'workspace' && (
          <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
            {renderField('defaultWorkspaceId', 'Default Workspace ID', 'text')}
            {renderField('autosaveIntervalSeconds', 'Autosave Interval (seconds)', 'number')}
            {renderField('maxUndoHistory', 'Max Undo Steps', 'number')}
            {renderField('snapshotFrequency', 'Snapshot Frequency', 'select', ['hourly', 'daily', 'weekly', 'never'])}
            {renderField('exportFormat', 'Default Export Format', 'select', ['json', 'zip'])}
          </div>
        )}

        {activeTab === 'keyboard' && (
          <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
            {renderField('dragSensitivity', 'Drag Sensitivity', 'number')}
            {renderField('scrollZoomSpeed', 'Scroll Zoom Speed', 'number')}
            {renderField('doubleClickAction', 'Double Click Action', 'select', ['maximize', 'edit', 'none'])}
            <div style={{ marginTop: 20 }}>
              <label style={{ display: 'block', marginBottom: 8, fontSize: 13, color: 'var(--text-secondary)' }}>Keybindings (JSON)</label>
              <textarea 
                value={JSON.stringify(localSettings.keybindings, null, 2)}
                onChange={(e) => {
                  try {
                    handleChange('keybindings', JSON.parse(e.target.value));
                  } catch (e) {}
                }}
                style={{ width: '100%', height: 150, fontFamily: 'monospace', fontSize: 12 }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SettingsPage;