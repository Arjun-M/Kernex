import React, { useState, useEffect, useCallback } from 'react';
import { Database, Table, Code, Info, RefreshCw, Play, ChevronsLeft, ChevronsRight, Server, Folder } from 'lucide-react';
import Editor from '@monaco-editor/react';
import './DbApp.css';
import { pluginFetch } from '../authHelper';

type Tab = 'overview' | 'explorer' | 'query';

interface DbInfo {
  name: string;
  size: number;
  lastModified: string;
}

interface TableInfo {
  name: string;
  rows: number;
}

const DbApp: React.FC = () => {
  const MOBILE_BREAKPOINT = 880;
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [dbs, setDbs] = useState<DbInfo[]>([]);
  const [selectedDb, setSelectedDb] = useState<string | null>(null);
  const [dbInfo, setDbInfo] = useState<any | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableSchema, setTableSchema] = useState<any>(null);
  const [tableRows, setTableRows] = useState<any[]>([]);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= MOBILE_BREAKPOINT);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const urlParams = new URLSearchParams(window.location.search);
  const workspaceId = urlParams.get('workspaceId');

  // Handle window resize for responsiveness
  useEffect(() => {
    const handleResize = () => {
        const mobile = window.innerWidth <= MOBILE_BREAKPOINT;
        setIsMobile(mobile);
        if (mobile) setSidebarCollapsed(true);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchDbs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await pluginFetch('/api/db/dbs');
      if (!res.ok) throw new Error('Failed to fetch databases');
      const data = await res.json();
      setDbs(data);
      
      // Select DB logic
      if (!selectedDb) { // Only set if not already selected
          if (workspaceId) {
            const workspaceDbName = `${workspaceId}.db`;
            // Verify if it exists in the list to avoid errors, or just try it
            const exists = data.find((d: any) => d.name === workspaceDbName);
            if (exists) {
                setSelectedDb(workspaceDbName);
                fetchDbDetails(workspaceDbName);
            } else if (data.length > 0) {
                 // Fallback
                 setSelectedDb(data[0].name);
                 fetchDbDetails(data[0].name);
            }
          } else if (data.length > 0) {
            setSelectedDb(data[0].name);
            fetchDbDetails(data[0].name);
          }
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]); // Removed selectedDb from deps to avoid loop

  const fetchDbDetails = async (dbName: string) => {
    try {
      setLoading(true);
      const [infoRes, tablesRes] = await Promise.all([
        pluginFetch(`/api/db/${dbName}/info`),
        pluginFetch(`/api/db/${dbName}/tables`)
      ]);
      if (!infoRes.ok) throw new Error('Failed to fetch DB info');
      if (!tablesRes.ok) throw new Error('Failed to fetch tables');
      const infoData = await infoRes.json();
      const tablesData = await tablesRes.json();
      setDbInfo(infoData);
      setTables(tablesData);
      // Don't reset selected table if we are just refreshing the same DB
      // But if we switched DBs, we should probably reset. 
      // For simplicity, let's keep it if it exists in the new list, else reset.
      // But here we are just fetching details for 'dbName'.
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTableDetails = async (name: string) => {
    if (!selectedDb) return;
    try {
      setLoading(true);
      setSelectedTable(name);
      
      const [schemaRes, rowsRes] = await Promise.all([
        pluginFetch(`/api/db/${selectedDb}/table/${name}/schema`),
        pluginFetch(`/api/db/${selectedDb}/table/${name}/rows?limit=100`)
      ]);
      
      if (!schemaRes.ok) throw new Error(`Schema failed: ${schemaRes.status}`);
      if (!rowsRes.ok) throw new Error(`Rows failed: ${rowsRes.status}`);

      const schemaData = await schemaRes.json();
      const rowsData = await rowsRes.json();
      
      setTableSchema(schemaData);
      setTableRows(rowsData);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDbs();
  }, []); // Run once on mount

  const handleDbChange = (dbName: string) => {
    setSelectedDb(dbName);
    fetchDbDetails(dbName);
    setSelectedTable(null);
    setTableSchema(null);
    setTableRows([]);
    setActiveTab('overview');
  }

  const systemDbs = dbs.filter(d => d.name === 'system.db');
  const workspaceDbs = dbs.filter(d => d.name !== 'system.db');

  const handleMobileTableChange = (tableName: string) => {
    if (!tableName) return;
    setActiveTab('explorer');
    fetchTableDetails(tableName);
  };

  return (
    <div className={`db-app ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${isMobile ? 'is-mobile' : ''}`}>
      {!isMobile && (
      <div className="db-sidebar">
        <div className="sidebar-header">
          {!sidebarCollapsed && 
            <>
              <Database size={18} />
              <span>SQL Viewer</span>
            </>
          }
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="collapse-btn">
            {sidebarCollapsed ? <ChevronsRight size={18} /> : <ChevronsLeft size={18} />}
          </button>
        </div>
        
        <div className="db-selector-wrapper">
             {!sidebarCollapsed && <label className="selector-label">Database</label>}
             <select 
                value={selectedDb || ''} 
                onChange={e => handleDbChange(e.target.value)}
                className="db-select"
             >
                {systemDbs.length > 0 && (
                    <optgroup label="System">
                        {systemDbs.map(db => (
                    <option key={db.name} value={db.name}>System SQL</option>
                        ))}
                    </optgroup>
                )}
                {workspaceDbs.length > 0 && (
                    <optgroup label="Workspaces">
                        {workspaceDbs.map(db => (
                            <option key={db.name} value={db.name}>{db.name.replace('.db', '')}</option>
                        ))}
                    </optgroup>
                )}
             </select>
        </div>

        <div className="tab-buttons">
          <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
            <Info size={16} /> {!sidebarCollapsed && 'Overview'}
          </button>
          <button className={`tab-btn ${activeTab === 'explorer' ? 'active' : ''}`} onClick={() => setActiveTab('explorer')}>
            <Table size={16} /> {!sidebarCollapsed && 'Explorer'}
          </button>
          <button className={`tab-btn ${activeTab === 'query' ? 'active' : ''}`} onClick={() => setActiveTab('query')}>
            <Code size={16} /> {!sidebarCollapsed && 'Query'}
          </button>
        </div>

        <div className="tables-list">
          <div className="section-title">
            {!sidebarCollapsed && 'TABLES'}
            <button 
                onClick={() => selectedDb && fetchDbDetails(selectedDb)} 
                className="refresh-btn"
                title="Refresh Tables"
            >
              <RefreshCw size={14} className={loading ? 'spinning' : ''} />
            </button>
          </div>
          <div className="tables-scroll">
              {tables.map(t => (
                <div 
                  key={t.name} 
                  className={`table-item ${selectedTable === t.name && activeTab === 'explorer' ? 'selected' : ''}`}
                  onClick={() => {
                    setActiveTab('explorer');
                    fetchTableDetails(t.name);
                  }}
                  title={t.name}
                >
                  <Table size={14} className="table-icon" />
                  {!sidebarCollapsed && <span className="table-name">{t.name}</span>}
                  {!sidebarCollapsed && <span className="row-count">{t.rows}</span>}
                </div>
              ))}
          </div>
        </div>
      </div>
      )}

      <div className="db-content">
        {isMobile && (
          <div className="mobile-controls">
            <div className="mobile-row">
              <label className="selector-label">Database</label>
              <select value={selectedDb || ''} onChange={e => handleDbChange(e.target.value)} className="db-select">
                {systemDbs.length > 0 && (
                    <optgroup label="System">
                        {systemDbs.map(db => (
                            <option key={db.name} value={db.name}>System SQL</option>
                        ))}
                    </optgroup>
                )}
                {workspaceDbs.length > 0 && (
                    <optgroup label="Workspaces">
                        {workspaceDbs.map(db => (
                            <option key={db.name} value={db.name}>{db.name.replace('.db', '')}</option>
                        ))}
                    </optgroup>
                )}
              </select>
            </div>
            <div className="mobile-row mobile-split">
              <select value={activeTab} onChange={e => setActiveTab(e.target.value as Tab)} className="db-select">
                <option value="overview">Overview</option>
                <option value="explorer">Explorer</option>
                <option value="query">Query</option>
              </select>
              <select
                value={selectedTable || ''}
                onChange={e => handleMobileTableChange(e.target.value)}
                className="db-select"
                disabled={tables.length === 0}
              >
                <option value="">Select table</option>
                {tables.map(t => (
                  <option key={t.name} value={t.name}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {error && <div className="error-banner">{error} <button onClick={() => setError(null)}>×</button></div>}
        
        {activeTab === 'overview' && dbInfo && (
          <div className="overview-tab fade-in">
            <div className="content-header">
                <h2><Database size={24}/> {selectedDb?.replace('.db', '')}</h2>
                <div className="badges">
                    <span className="badge">{dbInfo.type}</span>
                    <span className="badge">{dbInfo.version}</span>
                </div>
            </div>
            
            <div className="info-grid">
              <div className="info-card">
                <div className="card-icon"><Table size={20} /></div>
                <div className="card-content">
                    <label>Tables</label>
                    <div className="value">{dbInfo.tables}</div>
                </div>
              </div>
              <div className="info-card">
                <div className="card-icon"><Server size={20} /></div>
                <div className="card-content">
                    <label>File Size</label>
                    <div className="value">{(dbInfo.size / 1024).toFixed(2)} KB</div>
                </div>
              </div>
              <div className="info-card full">
                <div className="card-icon"><Folder size={20} /></div>
                <div className="card-content">
                    <label>Path</label>
                    <div className="value path">{dbInfo.path}</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'explorer' && (
           selectedTable && tableSchema ? (
             <div className="explorer-tab fade-in">
                <div className="explorer-header">
                  <h3><Table size={20}/> {selectedTable}</h3>
                  <div className="table-meta">
                    <span className="count">{tableRows.length} rows</span>
                    <button onClick={() => fetchTableDetails(selectedTable)} className="icon-btn" title="Refresh Data">
                        <RefreshCw size={14} />
                    </button>
                  </div>
                </div>

                <div className="explorer-sections">
                  <div className="schema-section">
                    <h4>Schema</h4>
                    <div className="table-responsive">
                        <table className="schema-table">
                        <thead>
                            <tr>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Key</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tableSchema.columns.map((c: any) => (
                            <tr key={c.name}>
                                <td>{c.name}</td>
                                <td><code>{c.type}</code></td>
                                <td>{c.pk ? 'PK' : ''}</td>
                            </tr>
                            ))}
                        </tbody>
                        </table>
                    </div>
                  </div>

                  <div className="data-section">
                    <h4>Data Preview</h4>
                    <div className="results-table-container">
                      <table className="results-table">
                        <thead>
                          <tr>
                            {tableRows.length > 0 && Object.keys(tableRows[0]).map(k => (
                              <th key={k}>{k}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {tableRows.map((row: any, i: number) => (
                            <tr key={i}>
                              {Object.values(row).map((v: any, j: number) => (
                                <td key={j} title={String(v)}>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {tableRows.length === 0 && <div className="empty-state">No rows found</div>}
                    </div>
                  </div>
                </div>
             </div>
           ) : (
             <div className="explorer-placeholder fade-in">
               <div className="placeholder-content">
                <Table size={64} opacity={0.2} />
                <h3>Select a table to view details</h3>
                <p>Choose a table from the sidebar to view its schema and data.</p>
               </div>
             </div>
           )
        )}

        {activeTab === 'query' && (
          <QueryEditor dbName={selectedDb} />
        )}
      </div>
    </div>
  );
};

interface QueryEditorProps {
  dbName: string | null;
}

const QueryEditor: React.FC<QueryEditorProps> = ({ dbName }) => {
  const [sql, setSql] = useState('SELECT * FROM notes LIMIT 10;');
  const [results, setResults] = useState<any>(null);
  const [executing, setExecuting] = useState(false);

  const runQuery = async () => {
    if (!dbName) return;
    try {
      setExecuting(true);
      const res = await pluginFetch(`/api/db/${dbName}/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sql })
      });
      const data = await res.json();
      setResults(data);
    } catch (e: any) {
      setResults({ error: e.message });
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className="query-editor-container fade-in">
      <div className="editor-toolbar">
        <button onClick={runQuery} disabled={executing || !dbName} className="run-btn">
          <Play size={14} /> Run Query
        </button>
        {results?.executionTime !== undefined && (
          <span className="exec-time">⏱ {results.executionTime}ms</span>
        )}
      </div>
      <div className="editor-wrapper">
        <Editor
          height="300px"
          defaultLanguage="sql"
          theme="vs-dark"
          value={sql}
          onChange={(v) => setSql(v || '')}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            scrollBeyondLastLine: false,
            automaticLayout: true,
          }}
        />
      </div>
      <div className="results-wrapper">
        {results?.error && <div className="query-error">{results.error}</div>}
        {results?.type === 'mutation' && (
          <div className="mutation-result">
            Success. Affected rows: {results.changes}
          </div>
        )}
        {results?.rows && (
          <div className="results-table-container">
            <table className="results-table">
              <thead>
                <tr>
                  {results.rows.length > 0 && Object.keys(results.rows[0]).map(k => (
                    <th key={k}>{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.rows.map((row: any, i: number) => (
                  <tr key={i}>
                    {Object.values(row).map((v: any, j: number) => (
                      <td key={j} title={String(v)}>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {results.rows.length === 0 && <div className="empty-state">No results</div>}
          </div>
        )}
      </div>
    </div>
  );
};

export default DbApp;
