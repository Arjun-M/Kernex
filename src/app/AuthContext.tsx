import { useNavigate, useLocation } from 'react-router-dom';
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

// --- Types ---
export interface AuthContextType {
  sessionId: string | null;
  isAuthenticated: boolean;
  setupRequired: boolean;
  login: (sessionId: string) => void;
  logout: () => void;
  checkStatus: () => Promise<void>;
}

// --- Context ---
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Helpers ---
const getCookie = (name: string) => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return null;
};

// --- Provider ---
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sessionId, setSessionId] = useState<string | null>(() => localStorage.getItem('sessionId') || getCookie('session') || null);
  const [setupRequired, setSetupRequired] = useState<boolean>(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!sessionId);
  const navigate = useNavigate();
  const location = useLocation();

  const checkStatus = useCallback(async () => {
    try {
      const headers: Record<string, string> = {};
      const sid = localStorage.getItem('sessionId');
      if (sid) headers['x-auth-session'] = sid;

      const res = await fetch('/api/auth/status', { headers });
      if (res.ok) {
        const data = await res.json();
        setSetupRequired(data.setupRequired);
        setIsAuthenticated(data.isAuthenticated);
        
        if (!data.isAuthenticated && sid) {
           localStorage.removeItem('sessionId');
           setSessionId(null);
        }

        // Strict Routing Logic
        if (data.setupRequired) {
          if (location.pathname !== '/setup') {
            navigate('/setup');
          }
        } else {
          if (data.isAuthenticated) {
            if (['/login', '/setup'].includes(location.pathname)) {
              navigate('/workspace');
            }
          } else {
            if (location.pathname !== '/login') {
              navigate('/login');
            }
          }
        }
      }
    } catch (e) {
      console.error('Status check failed', e);
    }
  }, [navigate, location.pathname]);

  useEffect(() => {
    const timer = setTimeout(() => {
        checkStatus();
    }, 0);
    return () => clearTimeout(timer);
  }, [checkStatus]);

  const login = (sid: string) => {
    localStorage.setItem('sessionId', sid);
    setSessionId(sid);
    setIsAuthenticated(true);
    navigate('/workspace');
  };

  const logout = async () => {
    const sid = localStorage.getItem('sessionId');
    if (sid) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'x-auth-session': sid }
        });
      } catch (e) {}
    }
    localStorage.removeItem('sessionId');
    setSessionId(null);
    setIsAuthenticated(false);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ sessionId, isAuthenticated, setupRequired, login, logout, checkStatus }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
