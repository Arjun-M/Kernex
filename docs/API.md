# API Reference

All authenticated APIs are served under `/api/*` unless noted.

## Public / Semi-Public
- `GET /health`
- Auth: `/api/auth/*`
- Short URL redirect + CRUD routes in `shortUrls` module

## Auth (`/api/auth`)
- `GET /status`
- `POST /setup`
- `POST /login`
- `POST /change-password`
- `POST /logout`

## Workspace & Canvas
- Canvas: `GET/POST /api/canvas`
- Workspaces: `GET/POST/PUT/DELETE /api/workspaces...`
- Workspace state: `GET/PUT/DELETE /api/workspace-state...`

## Files (`/api/files`)
- `GET /tree`
- `GET /read`
- `GET /raw`
- `POST /write`
- `POST /create`
- `POST /upload`
- `POST /rename`
- `DELETE /delete`

## Utilities (`/api/utils`)
- `POST /hash`
- `POST /base64`
- `POST /jwt/decode`
- `GET /uuid`
- `POST /password`
- `POST /hmac`
- `POST /encryption`

## Data Utilities (`/api/data`)
- `POST /json`
- `POST /yaml`
- `POST /csv/parse`
- `POST /diff`
- `POST /regex`
- `POST /markdown`
- `POST /logs/parse`
- `POST /xml`

## SQL Viewer (`/api/db`)
- `GET /dbs`
- `GET /:dbName/info`
- `GET /:dbName/tables`
- `GET /:dbName/table/:name/schema`
- `GET /:dbName/table/:name/rows`
- `POST /:dbName/query`

## HTTP Tester (`/api/http`)
Workspace-scoped collections, requests, history, and environments.
Includes execute endpoint and CRUD routes.

## System
- `/api/system/*` (info, metrics, update/check, changelog)
- `/api/disk/overview`
- `/api/tasks/*`
- `/api/settings/*`
- `/api/search/*`
- `/api/secrets/*`

## Logs & Terminal
- Logs: `/api/logs/*` and websocket stream
- Terminal: `/api/term/ws` websocket

## FTP
- Server management: `/api/ftp/*`
- FTP client operations: `/api/ftp-client/*`

## Docs
- `GET /api/docs/tree`
- `GET /api/docs/content?slug=...`

## Notes
- Most endpoints require auth session.
- Plugin requests should use `pluginFetch` to include token/workspace headers.
