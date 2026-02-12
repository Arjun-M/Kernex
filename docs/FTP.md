# FTP Server & Client

## Overview
Kernex includes:
- FTP Server management endpoints (`/api/ftp/*`)
- FTP Client plugin for external server operations (`/api/ftp-client/*`)

## FTP Server Management
Main operations:
- check server status
- restart FTP service
- list/create/delete FTP accounts

Routes:
- `GET /api/ftp/status`
- `POST /api/ftp/restart`
- `GET /api/ftp/accounts`
- `POST /api/ftp/accounts`
- `DELETE /api/ftp/accounts/:id`

## FTP Client Plugin
Routes:
- `POST /api/ftp-client/list`
- `POST /api/ftp-client/download`
- `POST /api/ftp-client/upload`

## Security Guidance
- use strong FTP account passwords
- restrict root directories to required paths
- avoid exposing FTP publicly without network controls
- monitor FTP activity via logs

## Troubleshooting
- connection fails: verify host/port/credentials
- listing empty directory: verify account root path permissions
- upload/download errors: verify target path exists and is writable
