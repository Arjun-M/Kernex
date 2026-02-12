import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DATA_DIR = path.join(process.cwd(), 'workspace');
const getDb = (workspaceId: string): any => {
    // Check if workspaceId is actually a path (for backward compatibility or direct access)
    // or just an ID. 
    // We assume ID corresponds to a folder in workspace/
    
    const workspacePath = path.join(DATA_DIR, workspaceId);
    
    // Ensure workspace directory exists (it should, but safety first)
    if (!fs.existsSync(workspacePath)) {
        // If the folder doesn't exist, we can't put a DB in it. 
        // Fallback or error? For now, let's try to create it if it's just an ID being passed 
        // that hasn't been created yet (though workspaces.ts usually handles this).
        fs.mkdirSync(workspacePath, { recursive: true });
    }

    const dbPath = path.join(workspacePath, 'workspace.db');
    const db = new Database(dbPath);

    // Enable WAL mode for better concurrency
    db.pragma('journal_mode = WAL');

    db.exec(`
    CREATE TABLE IF NOT EXISTS http_collections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );
  
    CREATE TABLE IF NOT EXISTS http_requests (
      id TEXT PRIMARY KEY,
      collection_id TEXT,
      name TEXT NOT NULL,
      method TEXT NOT NULL,
      url TEXT NOT NULL,
      headers TEXT,
      params TEXT,
      body TEXT,
      auth TEXT,
      created_at INTEGER,
      updated_at INTEGER,
      FOREIGN KEY(collection_id) REFERENCES http_collections(id) ON DELETE CASCADE
    );
  
    CREATE TABLE IF NOT EXISTS http_history (
      id TEXT PRIMARY KEY,
      method TEXT NOT NULL,
      url TEXT NOT NULL,
      status INTEGER,
      duration INTEGER,
      timestamp INTEGER,
      request_data TEXT
    );
  
    CREATE TABLE IF NOT EXISTS http_environments (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      variables TEXT,
      created_at INTEGER,
      updated_at INTEGER
    );

    CREATE TABLE IF NOT EXISTS plugin_states (
        plugin_id TEXT PRIMARY KEY,
        state TEXT
    );

    CREATE TABLE IF NOT EXISTS kv_store (
        key TEXT PRIMARY KEY,
        value TEXT,
        updated_at INTEGER
    );
  `);
    return db;
};

export default getDb;