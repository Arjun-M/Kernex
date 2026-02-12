# Kernex Official Manual

## 1. What Kernex Is
Kernex is a self-hosted developer workspace that runs as a Fastify backend + React frontend. Instead of traditional windows, tools are placed on a persistent infinite canvas per workspace.

Core idea: keep context together spatially and restore exactly where you left off.

## 2. Architecture At A Glance
- Frontend: React + Vite + TypeScript (`src/`)
- Backend: Fastify + TypeScript (`server/`)
- Data:
  - Global/system DB: `data/system.db`
  - Per-workspace DB: `workspace/<workspaceId>/workspace.db`
  - Workspace filesystem: `workspace/<workspaceId>/`
- Plugin iframes served under `/i/*`.

## 3. First Run
1. Install dependencies: `npm install`
2. Start backend: `npm run server`
3. Start frontend: `npm run dev`
4. Open `http://localhost:5173`
5. Create admin user at setup screen.

## 4. Core Concepts
- Workspace: isolated environment (files + db + plugin state)
- Canvas: node-based layout containing plugin/tool instances
- Plugin state persistence: `/api/workspace-state/*`
- Protected workspace option: optional per-workspace password gate

See: [Workspaces & Canvas](WORKSPACES.md)

## 5. Plugin Catalog (Built-in)
### Productivity & Workflow
- Note
- Website Extractor

### API / Network / System
- HTTP Tester
- Terminal
- FTP Client
- FTP Info
- Short URLs

### Data / Text
- JSON Tool
- YAML Tool
- CSV Viewer
- XML Tool
- Diff Tool
- Regex Tool
- Markdown
- Log Viewer

### Cryptography / Security Utilities
- Hash Generator
- Base64 Tool
- JWT Decoder
- UUID Generator
- Password Generator
- HMAC Tool
- Encryption

### Database
- SQL Viewer

Detailed behavior per plugin: [Plugin Catalog](PLUGINS_DETAILED.md)

## 6. Security Model
- Session-based authentication (`/api/auth/*`)
- Protected API routes via `authenticate` pre-handler
- Path traversal and symlink safety checks in file APIs
- Encrypted secrets storage via server crypto helper
- CORS controlled by `ALLOWED_ORIGINS`

Production requirement: set `KERNEX_ENCRYPTION_KEY` (64-char hex).

See: [Authentication](AUTHENTICATION.md), [Deployment](DEPLOYMENT.md)

## 7. System Management
System area includes:
- System info / metrics
- Disk overview
- Security settings
- Plugin settings pages
- FTP settings and accounts
- Activity/logs
- Task manager
- SQL Viewer

See: [System Management](SYSTEM.md)

## 8. Data & Backup Strategy
At minimum back up:
- `workspace/`
- `data/system.db`
- config/env used for production

Recommended: scheduled filesystem backups + DB snapshots before upgrades.

## 9. Troubleshooting Quick Guide
- 401 in plugins: confirm session token + workspace headers are present
- Plugin not loading: verify iframe route `/i/<plugin>/index.html`
- Empty SQL Viewer: verify selected DB exists and user has session
- File operations failing: check workspace path validity and permissions
- WebSocket terminal issues: verify `/api/term/ws` auth/session validity

## 10. Developer Onboarding
1. Read [Architecture](ARCHITECTURE.md)
2. Read [API Reference](API.md)
3. Read [Plugin Development Guide](PLUGINS.md)
4. Follow [Contributing](CONTRIBUTING.md)

## 11. Operational Checklist
- Keep Node and dependencies updated
- Rotate logs and monitor DB size
- Review short URLs, FTP accounts, sessions periodically
- Run lint/type checks before release
- Verify auth, filesystem, and workspace routes after updates

## 12. Where To Go Next
- Setup and local dev: [SETUP.md](SETUP.md)
- Production deployment: [DEPLOYMENT.md](DEPLOYMENT.md)
- Plugin internals: [PLUGINS.md](PLUGINS.md)
- Full route map: [API.md](API.md)
