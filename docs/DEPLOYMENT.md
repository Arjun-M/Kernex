# Deployment Guide

## 1. Production Prerequisites
- Node.js runtime compatible with project dependencies
- Reverse proxy (Nginx/Caddy/Traefik)
- HTTPS certificate
- Persistent storage for `workspace/` and `data/`

## 2. Required Environment
- `KERNEX_ENCRYPTION_KEY`: required in production
  - 64-character hex string
  - used for encrypting sensitive values

Optional:
- `ALLOWED_ORIGINS`: comma-separated allowed CORS origins

## 3. Build And Run
```bash
npm install
npm run build
npm run server
```

Backend listens on `0.0.0.0:3000`.

## 4. Reverse Proxy
Route:
- `/` -> frontend static served by backend in production mode
- `/api/*` -> backend API
- `/i/*` -> plugin iframe assets

Ensure websocket support for:
- `/api/term/ws`
- `/api/logs/ws`

## 5. Data Persistence
Persist these paths across restarts:
- `workspace/`
- `data/`

Without persistence, workspace files and system DB state will be lost.

## 6. Security Hardening
- Run as non-root user
- Restrict inbound traffic to HTTPS and required admin paths
- Limit `ALLOWED_ORIGINS` in multi-origin deployments
- Monitor auth/session and logs endpoints

## 7. Upgrade Procedure
1. Backup `workspace/` and `data/system.db`
2. Pull new version
3. Install deps
4. Run build
5. Restart service
6. Validate login, workspace open, plugin loading, and terminal websockets

## 8. Health Check
- `GET /health` should return `{"status":"ok"}`
