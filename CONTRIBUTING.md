# Contributing to Kernex

Thank you for your interest in contributing to Kernex! We welcome contributions from the community to help make this the best personal workspace for developers.

## Getting Started

1.  **Fork the repository** on GitHub.
2.  **Clone your fork** locally:
    ```bash
    git clone https://github.com/Arjun-M/Kernex.git
    cd Kernex
    ```
3.  **Install dependencies**:
    ```bash
    npm install
    ```
4.  **Start the development environment**:
    ```bash
    # Terminal 1: Start the backend
    npm run server

    # Terminal 2: Start the frontend
    npm run dev
    ```

## Project Structure

*   `server/`: Node.js/Fastify backend.
*   `src/`: React frontend.
*   `src/plugins/`: Plugin implementations.

## How to Contribute

### 1. Reporting Bugs
*   Ensure the bug was not already reported.
*   Open a new Issue with a clear title and description.
*   Include steps to reproduce, expected behavior, and actual behavior.

### 2. Adding Features / Fixing Bugs
*   Create a new branch: `git checkout -b feature/my-new-feature` or `fix/issue-123`.
*   Make your changes.
*   **Test your changes** manually.
*   Commit your changes with a descriptive message.
*   Push to your branch and open a **Pull Request**.

### 3. Adding Plugins
See the [Plugin Development Guide](docs/PLUGINS.md).

## Code Style

*   We use **TypeScript** for both frontend and backend.
*   Follow the existing coding style (Standard JS/TS).
*   Run `npm run lint` (if available) before committing.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
