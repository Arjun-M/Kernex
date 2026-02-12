# Authentication

## Authentication Model
Kernex uses session-based authentication with server-side session records.

Primary routes under `/api/auth`:
- `GET /status`
- `POST /setup`
- `POST /login`
- `POST /change-password`
- `POST /logout`

## Session Flow
1. User logs in with username/password.
2. Server creates session with expiry and returns session context.
3. Client sends session token in authenticated requests.
4. Protected routes validate session via `authenticate` hook.

## Protected vs Public Routes
Public:
- `/api/auth/*`
- short URL redirects (`/u/:id`, `/api/short-urls` endpoints as configured)

Protected:
- most `/api/*` routes (canvas/files/workspaces/db/tools/system)
- `/i/*` plugin iframe routes also require auth.

## Workspace Context
Plugins include workspace context through:
- query param `workspaceId`
- header `x-workspace-id`

This scopes plugin state and workspace DB operations.

## Security Best Practices
- Use strong admin password and rotate periodically
- Restrict CORS origins in deployment
- Run behind HTTPS in production
- Keep session timeouts and logout flows enabled

## Troubleshooting
- Frequent 401s in plugin iframe:
  - verify active session
  - verify token propagation through iframe query/header
- Setup blocked:
  - verify if initial user already exists (`/api/auth/status`)
