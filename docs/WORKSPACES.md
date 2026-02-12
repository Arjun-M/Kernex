# Workspaces & Canvas

## Workspace Model
A workspace is an isolated environment containing:
- workspace filesystem (`workspace/<id>/`)
- workspace SQLite DB (`workspace/<id>/workspace.db`)
- per-plugin persisted UI state

Workspace API routes:
- `GET /api/workspaces`
- `POST /api/workspaces`
- `PUT /api/workspaces/:id`
- `DELETE /api/workspaces/:id`
- `POST /api/workspaces/:id/verify`
- `POST /api/workspaces/:id/maintenance/vacuum`

## Canvas Model
Canvas state is stored and restored via `/api/canvas` endpoints.
Tools/plugins are rendered as nodes that can be repositioned and persisted.

## Protected Workspaces
Workspaces can optionally be password-protected.
Opening a protected workspace requires verification before navigation.

## Plugin State Persistence
Routes under `/api/workspace-state` manage per-plugin state:
- get all state for workspace
- get state by plugin
- set state by plugin
- clear workspace plugin state

## Typical Flow
1. Create workspace from selector UI
2. Open workspace
3. Add plugins from drawer
4. Arrange plugins on canvas
5. Continue later with state restored

## Data Safety Notes
Deleting a workspace removes its files and workspace database.
Use backups before destructive operations.
