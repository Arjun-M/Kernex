<div align="center">

  <h1>Kernex</h1>
  <p><b>Your Personal Programmable Workspace.</b></p>
  <p>A self-hosted, infinite-canvas OS for your developer tools.</p>

  <img src="public/banner.png" alt="Kernex Banner" width="100%">
  <br />

  <p>
    <a href="#-what-is-kernex">About</a> •
    <a href="#-features">Features</a> •
    <a href="#-installation">Installation</a> •
    <a href="docs/PLUGINS.md">Plugin Guide</a> •
    <a href="CONTRIBUTING.md">Contributing</a>
  </p>

  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
</div>

---

## 🌌 What is Kernex?

**Kernex** is a developer-first, self-hosted workspace that runs on your machine (or server) and is accessed via your browser. It reimagines the "desktop" as an **infinite 2D canvas** where your tools (Terminal, Notes, HTTP Tester, File Manager) live as persistent nodes.

Unlike a traditional desktop OS where windows overlap and hide each other, Kernex lets you organize your workflows spatially.

**Why?**
*   **Context Switching:** Keep related tools (e.g., a terminal, a note, and an API tester) grouped together visually.
*   **Persistence:** Your "desktop" state is saved on the server. Reload the browser, and everything is exactly where you left it.
*   **Ownership:** No cloud accounts. No tracking. You own the data.

---

## 🛠 Features

*   **🗺 Infinite Canvas:** Pan, zoom, and organize tools spatially.
*   **🧱 Persistent Nodes:** Tools run as isolated instances that save their state.
*   **🔌 Plugin Architecture:** Extensible via simple HTML/React plugins.
*   **📂 File Manager:** Browse and manage your server's real filesystem.
*   **💻 Terminal:** Full xterm.js shell access to the host.
*   **🧪 Developer Tools:**
    *   **HTTP Tester:** Postman-lite for API testing.
    *   **JSON/YAML/XML Tools:** Formatters and validators.
    *   **Diff Viewer:** Compare text.
    *   **Crypto Tools:** Hashing, Base64, HMAC.
*   **🔒 Security:** Password authentication, encrypted secrets storage.

---

## 🚀 Installation

### Prerequisites
*   **Node.js v20+**
*   **Linux / macOS / WSL2** (Windows is supported via WSL2)

### Quick Start

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/Arjun-M/Kernex.git
    cd Kernex
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

  3.  **Start the system:**
      
      Open two terminal tabs:

      ```bash
      # Terminal 1: Start the Backend
      npm run server
      ```

      ```bash
      # Terminal 2: Start the Frontend
      npm run dev
      ```

  4.  **Access the workspace:**
      Open `http://localhost:5173` in your browser.
---

## 📖 Documentation

*   **[Architecture Overview](docs/ARCHITECTURE.md)** - Learn how Kernex is built (Fastify + React + SQLite).
*   **[Plugin Development](docs/PLUGINS.md)** - Learn how to build your own tools for Kernex.

---

## 🤝 Contributing

We welcome contributions! Whether it's a new plugin, a bug fix, or a UI improvement.
Please read our [Contributing Guide](CONTRIBUTING.md) to get started.

## 📄 License

MIT © [Arjun-M](https://github.com/Arjun-M)