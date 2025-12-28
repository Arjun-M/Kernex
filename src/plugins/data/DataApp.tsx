import React, { useState, useCallback, useEffect } from 'react';
import { 
  Copy, FileJson, FileCode, Table, Search, List, FileType, 
  RefreshCw, Check, AlertCircle, ArrowRightLeft, Split, Layers, Play
} from 'lucide-react';
import Editor from '@monaco-editor/react';
import { pluginFetch } from '../authHelper';

type DataToolId = 'json' | 'yaml' | 'csv' | 'diff' | 'regex' | 'markdown' | 'logs-viewer' | 'xml';

interface DataAppProps {
  tool: DataToolId;
}

const DataApp: React.FC<DataAppProps> = ({ tool }) => {
  const [input, setInput] = useState('');
  const [secondaryInput, setSecondaryInput] = useState(''); 
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [mode, setMode] = useState('pretty');
  const [targetFormat, setTargetFormat] = useState('json');
  const [regexFlags, setRegexFlags] = useState('gi');
  const [filterLevel, setFilterLevel] = useState('ALL');

  const copyToClipboard = (text: string) => {
    if (!text) return;
    const stringText = typeof text === 'string' ? text : JSON.stringify(text, null, 2);
    navigator.clipboard.writeText(stringText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const processData = useCallback(async (currentInput?: string) => {
    const val = currentInput !== undefined ? currentInput : input;
    if (!val && tool !== 'diff') return;
    
    setLoading(true);
    try {
      let res;
      switch (tool) {
        case 'json':
          res = await pluginFetch('/api/data/json', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: val, mode })
          });
          break;
        case 'yaml':
          res = await pluginFetch('/api/data/yaml', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: val, target: targetFormat })
          });
          break;
        case 'csv':
          res = await pluginFetch('/api/data/csv/parse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: val })
          });
          break;
        case 'diff':
          res = await pluginFetch('/api/data/diff', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ oldText: val, newText: secondaryInput })
          });
          break;
        case 'regex':
          res = await pluginFetch('/api/data/regex', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pattern: val, flags: regexFlags, testString: secondaryInput })
          });
          break;
        case 'markdown':
          res = await pluginFetch('/api/data/markdown', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: val })
          });
          break;
        case 'logs-viewer':
          res = await pluginFetch('/api/data/logs/parse', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: val })
          });
          break;
        case 'xml':
          res = await pluginFetch('/api/data/xml', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: val, mode })
          });
          break;
      }

      if (res && res.ok) {
        const data = await res.json();
        setResult(data);
        setError(null);
      } else {
        const err = await res?.json();
        setError(err?.error || 'Processing failed');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [tool, input, secondaryInput, mode, targetFormat, regexFlags]);

  // Live preview for markdown and regex
  useEffect(() => {
    if (['markdown', 'regex'].includes(tool) && input) {
        const timer = setTimeout(() => processData(), 300);
        return () => clearTimeout(timer);
    }
  }, [input, secondaryInput, regexFlags, tool, processData]);

  const getLanguage = () => {
      if (tool === 'json') return 'json';
      if (tool === 'yaml') return targetFormat === 'json' ? 'yaml' : 'json';
      if (tool === 'xml') return 'xml';
      if (tool === 'markdown') return 'markdown';
      return 'plaintext';
  };

  const renderOutput = () => {
    if (!result && !error) return <div className="empty-state">No output generated</div>;
    if (error) return <div className="error-display"><AlertCircle size={24} /><p>{error}</p></div>;

    switch (tool) {
      case 'json':
      case 'yaml':
      case 'xml':
        return (
            <Editor
                height="100%"
                language={tool === 'yaml' ? (targetFormat === 'json' ? 'json' : 'yaml') : tool}
                value={result.result}
                theme="vs-dark"
                options={{ readOnly: true, minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false }}
            />
        );
      case 'markdown':
        return <div className="markdown-preview" dangerouslySetInnerHTML={{ __html: result.html }} />;
      case 'csv':
        if (!result.records?.length) return <div className="empty-state">No records found</div>;
        const headers = Object.keys(result.records[0]);
        return (
          <div className="table-container">
            <table>
              <thead><tr>{headers.map(h => <th key={h}>{h}</th>)}</tr></thead>
              <tbody>
                {result.records.map((r: any, i: number) => (
                  <tr key={i}>{headers.map(h => <td key={h}>{r[h]}</td>)}</tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'logs-viewer':
        const filtered = result.logs.filter((l: any) => filterLevel === 'ALL' || l.level === filterLevel);
        return (
          <div className="logs-list">
            {filtered.map((l: any) => (
              <div key={l.id} className={`log-line level-${l.level.toLowerCase()}`}>
                <span className="log-level">{l.level}</span>
                <span className="log-text">{l.text}</span>
              </div>
            ))}
          </div>
        );
      case 'regex':
        return (
          <div className="regex-results">
            <div className="res-header">Found {result.count} matches</div>
            <div className="matches-list">
              {result.matches.map((m: any, i: number) => (
                <div key={i} className="match-item">
                  <div className="match-index">Index {m.index}</div>
                  <div className="match-text">{m.text}</div>
                  {m.groups.map((g: any, gi: number) => <div key={gi} className="group-val">Group {gi+1}: {g}</div>)}
                </div>
              ))}
            </div>
          </div>
        );
      case 'diff':
        return (
          <div className="diff-view">
            {result.result.map((part: any, i: number) => (
              <div key={i} className={`diff-line ${part.added ? 'added' : part.removed ? 'removed' : ''}`}>
                {part.added ? '+' : part.removed ? '-' : ' '} {part.value}
              </div>
            ))}
          </div>
        );
      default: return null;
    }
  };

  return (
    <div className="modern-data-container">
      <header className="modern-header">
        <div className="tool-identity">
          <div className="tool-icon-bg">{getToolIcon(tool)}</div>
          <div className="tool-info">
            <h2 className="tool-name">{getToolTitle(tool)}</h2>
            <span className="tool-tag">Internal Runtime Tool</span>
          </div>
        </div>
        <div className="tool-actions">
            {!['markdown', 'regex'].includes(tool) && (
                <button className="run-btn" onClick={() => processData()} disabled={loading}>
                    {loading ? <RefreshCw size={14} className="spin" /> : <Play size={14} />}
                    <span>Run</span>
                </button>
            )}
            <button className="action-btn" onClick={() => copyToClipboard(result?.result || result?.html || result?.records)}>
                {copied ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                <span>Copy</span>
            </button>
        </div>
      </header>

      <div className="modern-layout">
        <div className={`input-section ${tool === 'diff' || tool === 'regex' ? 'stacked' : ''}`}>
            <div className="section-bar">
                <span className="section-label">Source {tool === 'regex' ? 'Pattern' : ''}</span>
                <div className="section-controls">
                    {tool === 'json' && (
                        <div className="mini-toggle">
                            <button className={mode === 'pretty' ? 'active' : ''} onClick={() => setMode('pretty')}>Pretty</button>
                            <button className={mode === 'minify' ? 'active' : ''} onClick={() => setMode('minify')}>Minify</button>
                        </div>
                    )}
                    {tool === 'yaml' && (
                        <button className="mini-btn" onClick={() => setTargetFormat(t => t === 'json' ? 'yaml' : 'json')}>
                            <ArrowRightLeft size={12} /> {targetFormat.toUpperCase()}
                        </button>
                    )}
                    {tool === 'regex' && (
                        <input type="text" value={regexFlags} onChange={e => setRegexFlags(e.target.value)} placeholder="flags" className="mini-input" />
                    )}
                </div>
            </div>
            <div className="editor-wrapper">
                <Editor
                    height="100%"
                    language={getLanguage()}
                    value={input}
                    theme="vs-dark"
                    onChange={(val) => setInput(val || '')}
                    options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false, automaticLayout: true }}
                />
            </div>
            {(tool === 'diff' || tool === 'regex') && (
                <>
                    <div className="section-bar" style={{ marginTop: '1px' }}>
                        <span className="section-label">{tool === 'diff' ? 'Comparison' : 'Test Material'}</span>
                    </div>
                    <div className="editor-wrapper">
                        <Editor
                            height="100%"
                            language="plaintext"
                            value={secondaryInput}
                            theme="vs-dark"
                            onChange={(val) => setSecondaryInput(val || '')}
                            options={{ minimap: { enabled: false }, fontSize: 13, scrollBeyondLastLine: false, automaticLayout: true }}
                        />
                    </div>
                </>
            )}
        </div>

        <div className="output-section">
            <div className="section-bar">
                <span className="section-label">Output</span>
                {tool === 'logs-viewer' && (
                    <select className="mini-select" value={filterLevel} onChange={e => setFilterLevel(e.target.value)}>
                        <option value="ALL">All Levels</option>
                        <option value="INFO">Info</option>
                        <option value="WARN">Warn</option>
                        <option value="ERROR">Error</option>
                    </select>
                )}
            </div>
            <div className="result-area">
                {renderOutput()}
            </div>
        </div>
      </div>

      <style>{`
        .modern-data-container {
            display: flex;
            flex-direction: column;
            height: 100vh;
            background-color: #0f0f0f;
            color: #e0e0e0;
            font-family: 'Inter', system-ui, sans-serif;
        }
        .modern-header {
            height: 60px;
            padding: 0 20px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            background-color: #1a1a1a;
            border-bottom: 1px solid #333;
        }
        .tool-identity { display: flex; align-items: center; gap: 15px; }
        .tool-icon-bg {
            width: 36px;
            height: 36px;
            background-color: #2a2a2a;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--accent-primary, #3d5afe);
        }
        .tool-name { margin: 0; fontSize: 16px; fontWeight: 600; }
        .tool-tag { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
        
        .tool-actions { display: flex; gap: 10px; }
        .run-btn, .action-btn {
            height: 32px;
            padding: 0 12px;
            border-radius: 6px;
            border: 1px solid #333;
            background-color: #252526;
            color: #ccc;
            font-size: 12px;
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            transition: all 0.2s;
        }
        .run-btn { background-color: var(--accent-primary, #3d5afe); color: white; border: none; }
        .run-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .action-btn:hover { background-color: #333; }

        .modern-layout { flex: 1; display: flex; overflow: hidden; background-color: #1e1e1e; }
        .input-section { width: 45%; border-right: 1px solid #333; display: flex; flex-direction: column; }
        .input-section.stacked .editor-wrapper { height: calc(50% - 30px); }
        .output-section { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
        
        .section-bar {
            height: 30px;
            padding: 0 12px;
            background-color: #252526;
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #333;
        }
        .section-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: #666; letter-spacing: 0.5px; }
        .editor-wrapper { flex: 1; overflow: hidden; background-color: #1e1e1e; }
        .result-area { flex: 1; overflow: auto; background-color: #1e1e1e; }
        
        .mini-toggle { display: flex; background-color: #0f0f0f; padding: 2px; border-radius: 4px; border: 1px solid #333; }
        .mini-toggle button {
            padding: 2px 8px; border: none; background: none; color: #666; font-size: 10px; cursor: pointer; border-radius: 3px;
        }
        .mini-toggle button.active { background-color: #333; color: white; }
        .mini-btn, .mini-input, .mini-select {
            background-color: #0f0f0f; border: 1px solid #333; color: #ccc; font-size: 10px; border-radius: 4px; padding: 2px 6px;
        }

        .markdown-preview { padding: 30px; color: #d4d4d4; line-height: 1.6; }
        .markdown-preview h1, .markdown-preview h2 { border-bottom: 1px solid #333; padding-bottom: 0.3em; margin-top: 24px; }
        .markdown-preview pre { background-color: #0f0f0f; padding: 16px; border-radius: 8px; border: 1px solid #333; overflow: auto; }
        
        .table-container { height: 100%; overflow: auto; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; background-color: #252526; padding: 10px; font-size: 11px; color: #888; position: sticky; top: 0; border-bottom: 1px solid #333; }
        td { padding: 10px; border-bottom: 1px solid #2a2a2a; font-size: 12px; }
        
        .log-line { font-family: 'JetBrains Mono', monospace; padding: 6px 15px; border-bottom: 1px solid #252526; display: flex; gap: 15px; font-size: 12px; }
        .log-level { font-weight: 800; min-width: 60px; font-size: 10px; }
        .level-error { background-color: rgba(239, 68, 68, 0.05); }
        .level-error .log-level { color: #ef4444; }
        .level-warn .log-level { color: #f59e0b; }
        .level-info .log-level { color: #3d5afe; }
        
        .empty-state { display: flex; align-items: center; justify-content: center; height: 100%; color: #444; font-size: 12px; font-style: italic; }
        .error-display { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #ef4444; gap: 10px; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

const getToolTitle = (id: DataToolId) => {
    switch(id) {
        case 'json': return 'JSON Architect';
        case 'yaml': return 'YAML Converter';
        case 'csv': return 'CSV Explorer';
        case 'diff': return 'Comparison Engine';
        case 'regex': return 'Regex Laboratory';
        case 'markdown': return 'Markdown Studio';
        case 'logs-viewer': return 'Log Intelligence';
        case 'xml': return 'XML Formatter';
    }
};

const getToolIcon = (id: DataToolId) => {
    switch(id) {
        case 'json': return <FileJson size={18} />;
        case 'yaml': return <FileType size={18} />;
        case 'csv': return <Table size={18} />;
        case 'diff': return <Split size={18} />;
        case 'regex': return <Search size={18} />;
        case 'markdown': return <FileCode size={18} />;
        case 'logs-viewer': return <List size={18} />;
        case 'xml': return <Layers size={18} />;
    }
};

export default DataApp;