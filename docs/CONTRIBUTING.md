# Contributing

## Development Setup
- Follow [SETUP.md](SETUP.md)
- Run backend and frontend concurrently for local development

## Branching & Commits
- Use focused branches: `feature/<name>` or `fix/<name>`
- Prefer clear commit messages, e.g. `feat(sql-viewer): add mobile table selector`

## Before Opening PR
- run lint checks (`npm run lint`)
- run build/type-check if requested for the change
- manually verify affected flows (UI + API behavior)

## Pull Request Checklist
- clear description of change and motivation
- test/validation notes
- screenshots or recordings for UI changes
- mention any migration or deployment impact

## Code Guidelines
- TypeScript for frontend and backend
- preserve existing patterns in touched modules
- avoid unrelated refactors in focused PRs

## Plugin Contributions
For new plugins or plugin updates, include:
- plugin folder under `src/plugins/`
- drawer registration (`PluginDrawer.tsx`)
- API endpoints (if required)
- docs updates in `docs/PLUGINS_DETAILED.md`

## Documentation Contributions
When behavior changes, update docs in same PR:
- API route changes -> `docs/API.md`
- plugin changes -> `docs/PLUGINS_DETAILED.md`
- deployment/security changes -> `docs/DEPLOYMENT.md` / `docs/AUTHENTICATION.md`
