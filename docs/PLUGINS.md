# Kernex Plugin Development Guide

Kernex is designed to be extensible. Plugins are essentially **mini React applications** that run inside the workspace.

## How Plugins Work

Currently, plugins are **internal**, meaning they live inside the `src/plugins/` directory and are bundled with the application.

Each plugin consists of:
1.  A directory in `src/plugins/<plugin-name>`.
2.  An `index.html` entry point.
3.  A `main.tsx` React entry point.
4.  Registration in `vite.config.ts` (for build).
5.  Registration in `PluginDrawer.tsx` (for UI).

---

## Step-by-Step: Creating a "Hello World" Plugin

### 1. Create the Plugin Files

Create a folder: `src/plugins/helloworld/`

**`src/plugins/helloworld/index.html`**
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Hello World</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="./main.tsx"></script>
  </body>
</html>
```

**`src/plugins/helloworld/main.tsx`**
```tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import '../../styles/theme.css'   // Inherit global variables
import '../../styles/global.css'  // Inherit reset/base styles

const HelloWorld = () => {
  return (
    <div style={{ padding: '20px', color: 'var(--text-primary)' }}>
      <h1>Hello World!</h1>
      <p>This is my first Kernex plugin.</p>
    </div>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelloWorld />
  </React.StrictMode>,
)
```

### 2. Register the Build Entry

Open `vite.config.ts` in the root directory. Add your plugin to the `input` object:

```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        // ... existing plugins
        'helloworld': resolve(__dirname, 'src/plugins/helloworld/index.html'),
      },
    },
  },
  // ...
})
```

### 3. Register in the UI

Open `src/components/drawer/PluginDrawer.tsx`. Add your plugin to the `PLUGINS` array:

```tsx
const PLUGINS: Plugin[] = [
  // ... existing plugins
  {
    id: 'hello-world',
    title: 'Hello World',
    description: 'My first example plugin',
    icon: <Zap size={24} />, // Import an icon from 'lucide-react'
    type: 'iframe',
    iframeSrc: '/i/helloworld/index.html', // Note the /i/ prefix which maps to plugins
    category: 'Examples'
  },
];
```

### 4. Test It

1.  Restart the dev server (`npm run dev`) to pick up the `vite.config.ts` changes.
2.  Open the Plugin Drawer (Sidebar -> Plugins).
3.  Find "Hello World" and drag it onto the canvas.

---

## Best Practices

*   **Styling:** Import `theme.css` to ensure your plugin respects the user's theme (Dark/Light mode). Use CSS variables like `var(--bg-primary)` and `var(--text-primary)`.
*   **State:** Keep your plugin state local. If you need to save data, currently you must implement a custom API endpoint or use `localStorage` (which is isolated to the iframe origin).
*   **Dependencies:** You can import any npm package installed in the project `package.json`.
