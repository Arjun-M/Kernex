# Kernex Architecture Guide

## High-Level Overview

Kernex is a **self-hosted personal workspace** designed to run on a local server (or VPS) and be accessed via a web browser. It follows a "thick client" approach where the UI is a rich React application, but all state is persisted to the server.

### Core Components

1.  **The Core (Server)**
    *   **Runtime:** Node.js (v20+).
    *   **Framework:** Fastify (lightweight, high-performance).
    *   **Database:** `better-sqlite3` (SQLite) for storing layout, secrets, and system state.
    *   **Filesystem:** Direct access to the host filesystem for the File Manager.
    *   **API:** REST-like JSON endpoints.

2.  **The Surface (Client)**
    *   **Framework:** React 19.
    *   **Build Tool:** Vite.
    *   **Language:** TypeScript.
    *   **State:** Mostly local component state or React Context (`AuthContext`, `SettingsContext`).
    *   **UI Paradigm:** Infinite Canvas (Zoomable User Interface).

---

## Directory Structure

```
/
├── .idx/              # Project IDX configuration (dev environment)
├── data/              # Runtime data (SQLite db, JSON state) - GITIGNORED
├── docs/              # Developer documentation
├── public/            # Static assets
├── server/            # Backend Node.js application
│   ├── api/           # API Route handlers
│   ├── db.ts          # Database connection
│   └── server.ts      # Entry point
├── src/               # Frontend React application
│   ├── app/           # App-wide providers and routing
│   ├── canvas/        # The core Canvas UI logic
│   ├── components/    # Reusable UI components
│   ├── plugins/       # Plugin implementations (iframe apps)
│   └── pages/         # Standard full-screen pages (Settings, etc.)
└── vite.config.ts     # Build configuration (critical for plugins)
```

---

## The Plugin System

Kernex uses an **Iframe-based Plugin Architecture** for strong isolation and stability.

*   **Isolation:** Each plugin runs in its own `<iframe>`. If a plugin crashes, the main workspace remains stable.
*   **Performance:** Plugins are built as separate "Multi-Page App" (MPA) entries by Vite. They are only loaded when requested.
*   **Security:** Plugins run in a sandboxed environment (same-origin, but separate DOM).

See [Plugin Development Guide](./PLUGINS.md) for details on creating tools.

---

## Data Persistence

*   **System State:** Stored in `data/system.db` (SQLite).
*   **Canvas Layout:** Stored in `data/canvas.json`.
*   **Files:** Real files are modified directly on the disk.

## Security Model

*   **Single Tenant:** Kernex is designed for ONE owner.
*   **Authentication:** Password-based (hashed with bcrypt).
*   **Sessions:** Server-side HTTP-only cookies.
*   **Secrets:** Encrypted (at rest logic to be implemented) or stored securely in SQLite for runtime injection.
