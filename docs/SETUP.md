# Installation & Setup

## Prerequisites
- Node.js 20+
- npm
- Linux/macOS/WSL2 recommended

## Local Development
1. Clone repository
```bash
git clone https://github.com/Arjun-M/Kernex.git
cd Kernex
```

2. Install dependencies
```bash
npm install
```

3. Run backend and frontend in separate terminals
```bash
npm run server
```
```bash
npm run dev
```

4. Open `http://localhost:5173`.

## First-Time App Setup
- Create the first admin account on setup page.
- Sign in and create/select workspace.

## Useful Commands
- `npm run dev`: frontend dev server
- `npm run server`: backend API + plugin/static host
- `npm run lint`: ESLint
- `npm run build`: type-check + production frontend build
- `npm run preview`: serve built frontend bundle

## Directory Notes
- `src/`: frontend app and plugin code
- `server/`: backend APIs and runtime services
- `workspace/`: per-workspace data (created at runtime)
- `data/system.db`: system-level SQLite data

## Common Local Issues
- Port conflicts: ensure `3000` and `5173` are free
- Auth errors in plugin iframe: confirm session exists and user is logged in
- Missing workspace data: confirm `workspace/` directory is writable
