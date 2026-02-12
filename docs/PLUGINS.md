# Plugin Development Guide

## Plugin Model
Plugins are iframe-based micro-apps served from `src/plugins/<plugin>/index.html` under `/i/<plugin>/index.html`.

Each plugin typically includes:
- `index.html`
- `main.tsx`
- implementation component(s)

## Requesting Backend APIs
Use shared helper:
- `src/plugins/authHelper.ts`
- `pluginFetch(url, options)`

This helper appends auth/session + workspace context.

## Recommended Plugin Structure
```text
src/plugins/my-plugin/
  index.html
  main.tsx
  MyPluginApp.tsx
  MyPluginApp.css
```

## Integration Steps
1. Create plugin files in `src/plugins/<id>/`
2. Expose iframe entry at `/i/<id>/index.html` (automatic via static route)
3. Add plugin metadata in `PluginDrawer.tsx`
4. If backend needed, add route module under `server/api/` and register in `server/server.ts`

## UX Guidelines
- support narrow iframes and mobile widths
- avoid fixed large heights without scroll containers
- keep actions explicit and recoverable
- show loading and error states clearly

## Security Notes
- never trust client input in route handlers
- validate workspace-scoped operations
- avoid direct filesystem paths without resolver/safety checks
