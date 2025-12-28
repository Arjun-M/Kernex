# Kernex v0.1.0 Blueprint
**Your personal programmable runtime.**

## 🌌 Overview
Kernex is a self-hosted, single-tenant, programmable workspace runtime. It focuses on the **runtime** rather than the interface, where every node on the spatial canvas represents a live execution process on the host server.

## 🏗 Core Architecture
-   **Frontend**: React 19, Vite, TypeScript, Lucide Icons.
-   **Backend**: Node.js + Fastify + Better-SQLite3.
-   **Platform Metadata**: Managed via `kernex.config.ts`.
-   **Identity**: technical, minimalist, industrial aesthetic (Default Theme: *Midnight Carbon*).

## 🛡 Security & Authentication
-   **Single-Owner Protocol**: Initialized via `/setup` upon first boot.
-   **Session Management**: UUID v4 session tokens stored in HttpOnly cookies and LocalStorage.
-   **Fail-Safe Recovery**: `KERNEX_ROOT_OVERRIDE` environment variable for credential bypass and emergency access.
-   **Iframe Security**: Cross-origin safe authentication using token query parameters for internal tools.

## 🛠 Feature Stack

### 🌀 Spatial Surface (Canvas)
-   Infinite panning and zooming navigation.
-   Draggable, resizable, and persistent process nodes.
-   Intelligent overlapping prevention and state persistence in SQLite.

### 📚 Plugin Ecosystem
-   **Categorized Library**: Collapsible groups (Cryptography, Data Formats, etc.) with state memory.
-   **Global Search (Cmd+K)**: Fully indexed command palette for pages, tools, and internal content.
-   **Infrastructure Tools**:
    -   **File Manager**: Server-side file operations (Create, Rename, Delete, Edit).
    -   **Terminal**: Direct host shell access with streaming output.
    -   **DB Viewer**: Live inspection of the system database.
    -   **Log Intelligence**: High-density log filtering and level-based highlighting.

### 🧪 Utility Suites
-   **Hash Vault**: MD5, SHA, Bcrypt generation.
-   **Encryption Lab**: AES-256-GCM/CBC playground.
-   **Data Architects**: JSON, YAML, XML, CSV formatters and converters.
-   **Text Lab**: Diff viewer, Regex laboratory, Markdown studio.

### 🖥 System Control
-   **Runtime Monitor**: Real-time hardware/software metrics via `systeminformation`.
-   **Update Protocol**: Read-only GitHub integration for version tracking and delta changelogs.
-   **Global Configuration**: Centralized settings for UI density, themes, and execution constraints.

## ✅ Implementation Status
1.  **Platform Rebranding (Kernex)**: [x]
2.  **Auth & Emergency Override**: [x]
3.  **Spatial Process Persistence**: [x]
4.  **Plugin Categorization**: [x]
5.  **Infrastructure Utilities (20+ Tools)**: [x]
6.  **System Monitoring & Updates**: [x]
7.  **Professional UI Alignment**: [x]

---
*Kernex is infrastructure. Built for those who build.*
