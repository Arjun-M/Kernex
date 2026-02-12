# Architecture

## High-Level Stack
- Frontend: React + TypeScript + Vite
- Backend: Fastify + TypeScript
- DB: better-sqlite3 (system + per-workspace)
- Realtime: websocket endpoints for terminal/log streams

## Server Composition
`server/server.ts` registers:
- auth routes (`/api/auth`)
- public short URL routes
- docs routes (`/api/docs`)
- protected API groups under `/api` (canvas/files/workspaces/tools/system/etc)
- plugin static routes under `/i/*` via iframe routes

## Data Boundaries
- Global state:
  - settings
  - auth/session
  - logs
  - short URLs
  - FTP account metadata
- Workspace state:
  - files
  - workspace db
  - plugin state
  - canvas composition

## Frontend Structure
- App shell/routes: `src/app`, `src/pages`
- Canvas runtime: `src/canvas`
- Plugin host drawer: `src/components/drawer/PluginDrawer.tsx`
- Plugins: `src/plugins/*`

## Plugin Runtime Model
Each plugin is loaded in an iframe from `/i/<plugin>/index.html`.
Plugin API requests use auth/session propagation via `pluginFetch` helper.

## Security Controls (Code-Level)
- auth pre-handler around protected APIs
- path resolution + traversal checks in file APIs
- workspace ID validation
- encrypted secret handling

## Extensibility
- add API route module under `server/api/`
- register route in `server/server.ts`
- add plugin UI entry under `src/plugins/`
- register plugin metadata in Plugin Drawer
