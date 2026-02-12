import type { DocEntry } from './DocsSidebar';

export const DOCS_MAP: DocEntry[] = [
  {
    type: 'dir',
    name: 'start',
    title: 'Getting Started',
    path: '',
    children: [
        {
            type: 'file',
            name: 'index.md',
            title: 'Overview',
            path: ''
        },
        {
            type: 'file',
            name: 'OFFICIAL_MANUAL.md',
            title: 'Full Manual',
            path: 'OFFICIAL_MANUAL'
        },
        {
            type: 'file',
            name: 'SETUP.md',
            title: 'Installation & Setup',
            path: 'SETUP'
        },
        {
            type: 'file',
            name: 'FEATURES.md',
            title: 'Features Overview',
            path: 'FEATURES'
        },
    ]
  },
  {
    type: 'dir',
    name: 'concepts',
    title: 'Core Concepts',
    path: '',
    children: [
        {
            type: 'file',
            name: 'WORKSPACES.md',
            title: 'Workspaces & Canvas',
            path: 'WORKSPACES'
        },
        {
            type: 'file',
            name: 'AUTHENTICATION.md',
            title: 'Authentication',
            path: 'AUTHENTICATION'
        },
        {
            type: 'file',
            name: 'SYSTEM.md',
            title: 'System Management',
            path: 'SYSTEM'
        },
        {
            type: 'file',
            name: 'FTP.md',
            title: 'FTP Server & Client',
            path: 'FTP'
        }
    ]
  },
  {
    type: 'dir',
    name: 'developer',
    title: 'Developer Guide',
    path: '',
    children: [
      {
        type: 'file',
        name: 'ARCHITECTURE.md',
        title: 'Architecture',
        path: 'ARCHITECTURE'
      },
      {
        type: 'file',
        name: 'PLUGINS.md',
        title: 'Plugin Development',
        path: 'PLUGINS'
      },
      {
        type: 'file',
        name: 'PLUGINS_DETAILED.md',
        title: 'Plugin Catalog',
        path: 'PLUGINS_DETAILED'
      },
      {
        type: 'file',
        name: 'API.md',
        title: 'API Reference',
        path: 'API'
      },
      {
        type: 'file',
        name: 'DEPLOYMENT.md',
        title: 'Deployment',
        path: 'DEPLOYMENT'
      },
      {
        type: 'file',
        name: 'CONTRIBUTING.md',
        title: 'Contributing',
        path: 'CONTRIBUTING'
      }
    ]
  }
];
