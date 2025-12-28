import { Navigate } from 'react-router-dom';
import SetupPage from '../pages/SetupPage';
import LoginPage from '../pages/LoginPage';
import WorkspacePage from '../pages/WorkspacePage';
import SystemLayout from '../pages/system/SystemLayout';
import SettingsPage from '../pages/system/SettingsPage';
import SystemInfoPage from '../pages/system/SystemInfoPage';
import DiskPage from '../pages/system/DiskPage';
import NetworkPage from '../pages/system/NetworkPage';
import TasksPage from '../pages/system/TasksPage';
import PluginsPage from '../pages/system/PluginsPage';
import SecurityPage from '../pages/system/SecurityPage';
import SystemUpdatePage from '../pages/system/SystemUpdatePage';
import NotFoundPage from '../pages/NotFoundPage';

export const routes = [
  {
    path: '/',
    element: <Navigate to="/setup" replace />,
  },
  {
    path: '/setup',
    element: <SetupPage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/workspace',
    element: <Navigate to="/workspace/canvas" replace />,
  },
  {
    path: '/workspace/canvas',
    element: <WorkspacePage />
  },
  // System Pages
  {
    path: '/system',
    element: <SystemLayout />,
    children: [
      { index: true, element: <SystemInfoPage /> },
      { path: 'disk', element: <DiskPage /> },
      { path: 'network', element: <NetworkPage /> },
      { path: 'tasks', element: <TasksPage /> },
      { path: 'plugins', element: <PluginsPage /> },
      { path: 'security', element: <SecurityPage /> },
    ]
  },
  {
    path: '/settings',
    element: <SystemLayout />,
    children: [
      { index: true, element: <SettingsPage /> },
      { path: 'system-update', element: <SystemUpdatePage /> }
    ]
  },
  {
    path: '/notfound',
    element: <NotFoundPage />
  },
  {
    path: '*',
    element: <NotFoundPage />
  }
];
