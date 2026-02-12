import { Navigate } from 'react-router-dom';
import SetupPage from '../pages/SetupPage';
import LoginPage from '../pages/LoginPage';
// import WorkspacePage from '../pages/WorkspacePage';
import WorkspaceSelectorPage from '../pages/WorkspaceSelectorPage';
import WorkspaceEnvironment from '../pages/WorkspaceEnvironment';
import WorkspaceSettingsPage from '../pages/WorkspaceSettingsPage';
import DocsPage from '../pages/DocsPage';
import SystemLayout from '../pages/system/SystemLayout';
import SettingsPage from '../pages/system/SettingsPage';
import FtpServerPage from '../pages/system/FtpServerPage';
import SystemInfoPage from '../pages/system/SystemInfoPage';
import DiskPage from '../pages/system/DiskPage';
import NetworkPage from '../pages/system/NetworkPage';
import TasksPage from '../pages/system/TasksPage';
import PluginsPage from '../pages/system/PluginsPage';
import SecurityPage from '../pages/system/SecurityPage';
import SystemUpdatePage from '../pages/system/SystemUpdatePage';
import ActivityLogPage from '../pages/system/ActivityLogPage';
import NotFoundPage from '../pages/NotFoundPage';
import KernexPage from '../pages/KernexPage';

export const routes = [
  {
    path: '/',
    element: <Navigate to="/setup" replace />,
  },
  {
    path: '/kernex',
    element: <KernexPage />,
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
    element: <WorkspaceSelectorPage />,
  },
  {
    path: '/workspace/:workspaceId',
    element: <WorkspaceEnvironment />
  },
  {
      path: '/workspace/:workspaceId/settings',
      element: <WorkspaceSettingsPage />
  },
  {
      path: '/docs/*',
      element: <DocsPage />
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
      { path: 'logs', element: <ActivityLogPage /> },
      { path: 'ftp-server', element: <FtpServerPage /> },
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
