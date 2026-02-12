# System Management

## System Section Scope
System pages cover runtime operations and host visibility:
- system info
- metrics
- disk overview
- tasks/processes
- plugin/system settings
- logs/activity
- FTP controls
- SQL viewer

Backed primarily by:
- `/api/system/*`
- `/api/disk/*`
- `/api/tasks/*`
- `/api/logs/*`
- `/api/db/*`

## Operational Workflows

### Check Runtime Health
1. Open system info page
2. Review metrics and host-level data
3. Inspect recent logs for errors

### Manage Logs
- Stream/inspect logs from logs plugin and API
- Clear logs via API when needed (`DELETE /api/logs`)

### Database Inspection
Use SQL Viewer for:
- system DB introspection
- workspace DB table/schema inspection
- query execution and troubleshooting

### Disk / Task Inspection
Use Disk and Tasks pages for capacity/performance checks.

## Maintenance Recommendations
- Periodically vacuum/prune DBs
- Rotate and archive logs
- Review inactive workspace data
- Audit FTP accounts and secrets entries

## Security Notes
- System pages are authenticated-only
- Prefer least privilege for server user account
- Keep backup snapshots before manual maintenance tasks
