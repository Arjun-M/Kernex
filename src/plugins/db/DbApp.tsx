import React, { useState, useEffect } from 'react';
import { Database, Table, Code, Info, RefreshCw, Play } from 'lucide-react';
import Editor from '@monaco-editor/react';
import './DbApp.css';
import { pluginFetch } from '../authHelper';

type Tab = 'overview' | 'explorer' | 'query';

interface DbInfo {
  type: string;
  path: string;
  size: number;
  tables: number;
  version: string;
}

interface TableInfo {
  name: string;
  rows: number;
}

const DbApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [dbInfo, setDbInfo] = useState<DbInfo | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [tableSchema, setTableSchema] = useState<any>(null);
  const [tableRows, setTableRows] = useState<any[]>([]);

  const fetchInfo = async () => {
    try {
      setLoading(true);
      const res = await pluginFetch('/api/db/info');
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Info failed: ${res.status} ${text}`);
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setDbInfo(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTables = async () => {
    try {
      setLoading(true);
      const res = await pluginFetch('/api/db/tables');
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Tables failed: ${res.status} ${text}`);
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setTables(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTableDetails = async (name: string) => {
    try {
      setLoading(true);
      setSelectedTable(name);
      
      const [schemaRes, rowsRes] = await Promise.all([
        pluginFetch(`/api/db/table/${name}/schema`),
        pluginFetch(`/api/db/table/${name}/rows?limit=100`)
      ]);
      
      if (!schemaRes.ok) throw new Error(`Schema failed: ${schemaRes.status}`);
      if (!rowsRes.ok) throw new Error(`Rows failed: ${rowsRes.status}`);

      const schemaData = await schemaRes.json();
      const rowsData = await rowsRes.json();
      
      if (schemaData.error) throw new Error(schemaData.error);
      if (rowsData.error) throw new Error(rowsData.error);
      
      setTableSchema(schemaData);
      setTableRows(rowsData);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInfo();
    fetchTables();
  }, []);

  return (
    <div className="db-app">
      <div className="db-sidebar">
        <div className="sidebar-header">
          <Database size={18} />
          <span>DB Manager</span>
          <button onClick={() => { fetchInfo(); fetchTables(); }} className="refresh-btn">
            <RefreshCw size={14} className={loading ? 'spinning' : ''} />
          </button>
        </div>
        
        <div className="tab-buttons">
          <button 
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <Info size={16} /> Overview
          </button>
          <button 
            className={`tab-btn ${activeTab === 'explorer' ? 'active' : ''}`}
            onClick={() => setActiveTab('explorer')}
          >
            <Table size={16} /> Explorer
          </button>
          <button 
            className={`tab-btn ${activeTab === 'query' ? 'active' : ''}`}
            onClick={() => setActiveTab('query')}
          >
            <Code size={16} /> Query
          </button>
        </div>

        <div className="tables-list">
          <div className="section-title">TABLES</div>
          {tables.map(t => (
            <div 
              key={t.name} 
              className={`table-item ${selectedTable === t.name && activeTab === 'explorer' ? 'selected' : ''}`}
              onClick={() => {
                setActiveTab('explorer');
                fetchTableDetails(t.name);
              }}
            >
              <Table size={14} />
              <span className="table-name">{t.name}</span>
              <span className="row-count">{t.rows}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="db-content">
        {error && <div className="error-banner">{error}</div>}
        
        {activeTab === 'overview' && dbInfo && (
          <div className="overview-tab">
            <h2>Database Overview</h2>
            <div className="info-grid">
              <div className="info-card">
                <label>Type</label>
                <div className="value">{dbInfo.type}</div>
              </div>
              <div className="info-card">
                <label>Version</label>
                <div className="value">{dbInfo.version}</div>
              </div>
              <div className="info-card">
                <label>Tables</label>
                <div className="value">{dbInfo.tables}</div>
              </div>
              <div className="info-card">
                <label>File Size</label>
                <div className="value">{(dbInfo.size / 1024).toFixed(2)} KB</div>
              </div>
              <div className="info-card full">
                <label>Path</label>
                <div className="value path">{dbInfo.path}</div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'explorer' && (
           selectedTable && tableSchema ? (
             <div className="explorer-tab">
                <div className="explorer-header">
                  <h3>{selectedTable}</h3>
                  <div className="table-meta">
                    {tableRows.length} rows loaded
                  </div>
                </div>

                <div className="explorer-sections">
                  <div className="schema-section">
                    <h4>Schema</h4>
                    <table className="schema-table">
                      <thead>
                        <tr>
                          <th>Name</th>
                          <th>Type</th>
                          <th>PK</th>
                          <th>Nullable</th>
                          <th>Default</th>
                        </tr>
                      </thead>
                      <tbody>
                        {tableSchema.columns.map((c: any) => (
                          <tr key={c.name}>
                            <td>{c.name}</td>
                            <td><code>{c.type}</code></td>
                            <td>{c.pk ? '✅' : ''}</td>
                            <td>{c.notnull ? '❌' : '✅'}</td>
                            <td>{c.dflt_value || 'NULL'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="data-section">
                    <h4>Data (First 100 rows)</h4>
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
                                <td key={j}>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
             </div>
           ) : (
             <div className="explorer-placeholder">
               <Table size={48} />
               <h3>Select a table from the sidebar to view details</h3>
             </div>
           )
        )}

        {activeTab === 'query' && (
          <QueryEditor />
        )}
      </div>
    </div>
  );
};

const QueryEditor: React.FC = () => {
  const [sql, setSql] = useState('SELECT * FROM notes LIMIT 10;');
  const [results, setResults] = useState<any>(null);
  const [executing, setExecuting] = useState(false);

  const runQuery = async () => {
    try {
      setExecuting(true);
      const res = await pluginFetch('/api/db/query', {
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
    <div className="query-editor-container">
      <div className="editor-toolbar">
        <button onClick={runQuery} disabled={executing} className="run-btn">
          <Play size={14} /> Run Query
        </button>
        {results?.executionTime !== undefined && (
          <span className="exec-time">{results.executionTime}ms</span>
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
                      <td key={j}>{typeof v === 'object' ? JSON.stringify(v) : String(v)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DbApp;