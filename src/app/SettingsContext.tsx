import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { authFetch } from './authFetch';

interface Settings {
  themeId: string;
  fontSize: number;
  uiDensity: 'compact' | 'normal' | 'spacious';
  canvasGrid: boolean;
  canvasSnapToGrid: boolean;
  defaultNodeSize: { width: number; height: number };
  dragSensitivity: number;
  scrollZoomSpeed: number;
  doubleClickAction: string;
  autosaveIntervalSeconds: number;
  [key: string]: any;
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (updates: Partial<Settings>) => Promise<void>;
  refreshSettings: () => Promise<void>;
  sidebarCollapsed: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

const DEFAULT_SETTINGS: Settings = {
  themeId: 'midnight-carbon',
  fontSize: 14,
  uiDensity: 'normal',
  canvasGrid: true,
  canvasSnapToGrid: true,
  defaultNodeSize: { width: 400, height: 300 },
  dragSensitivity: 1.0,
  scrollZoomSpeed: 1.0,
  doubleClickAction: 'maximize',
  autosaveIntervalSeconds: 30
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    const saved = localStorage.getItem('sidebarCollapsed');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    localStorage.setItem('sidebarCollapsed', JSON.stringify(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const applySettings = useCallback((s: Settings) => {
    const root = document.documentElement;
    root.setAttribute('data-theme', s.themeId);
    root.setAttribute('data-density', s.uiDensity);
    root.style.fontSize = `${s.fontSize}px`;
    
    // Save to local storage for immediate boot-time application next time
    localStorage.setItem('theme', s.themeId);
    localStorage.setItem('fontSize', String(s.fontSize));
    localStorage.setItem('uiDensity', s.uiDensity);
  }, []);

  const refreshSettings = useCallback(async () => {
    if (!isAuthenticated) return;
    
    try {
      const res = await authFetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        applySettings(data);
      }
    } catch (e) {
      console.error('Failed to fetch settings', e);
    }
  }, [applySettings, isAuthenticated]);

  const updateSettings = async (updates: Partial<Settings>) => {
    const newSettings = { ...settings, ...updates };
    setSettings(newSettings);
    applySettings(newSettings);

    try {
      await authFetch('/api/settings/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch (e) {
      console.error('Failed to save settings', e);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      const timer = setTimeout(() => {
        refreshSettings();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [refreshSettings, isAuthenticated]);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, refreshSettings, sidebarCollapsed, setSidebarCollapsed }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within a SettingsProvider');
  return context;
};
