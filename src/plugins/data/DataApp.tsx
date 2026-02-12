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
      case 'csv': {
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
      }
      case 'logs-viewer': {
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
      }
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
            --d-border: color-mix(in srgb, var(--border-color) 58%, #3b4457);
            --d-surface: color-mix(in srgb, var(--bg-secondary) 88%, #121824);
            --d-elev: color-mix(in srgb, var(--bg-tertiary) 84%, #141c2a);
            --d-accent-soft: color-mix(in srgb, var(--accent-primary) 16%, transparent);
            display: flex;
            flex-direction: column;
            height: 100%;
            background:
              radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--accent-primary) 10%, transparent), transparent 40%),
              var(--bg-primary);
            color: var(--text-primary);
            overflow: hidden;
        }
        .modern-header {
            min-height: 64px;
            padding: 10px 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: 10px;
            border-bottom: 1px solid var(--d-border);
            background: linear-gradient(180deg, color-mix(in srgb, var(--bg-secondary) 88%, #101723), var(--bg-secondary));
        }
        .tool-identity { display: flex; align-items: center; gap: 12px; min-width: 0; }
        .tool-icon-bg {
            width: 40px;
            height: 40px;
            border-radius: 12px;
            border: 1px solid var(--d-border);
            background-color: var(--d-elev);
            display: flex;
            align-items: center;
            justify-content: center;
            color: var(--accent-primary);
        }
        .tool-name { margin: 0; font-size: 16px; font-weight: 700; line-height: 1.2; }
        .tool-tag { font-size: 10px; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.08em; }

        .tool-actions { display: flex; gap: 8px; flex-wrap: wrap; }
        .run-btn, .action-btn {
            height: 34px;
            padding: 0 12px;
            border-radius: 8px;
            border: 1px solid var(--d-border);
            background-color: var(--d-elev);
            color: var(--text-primary);
            font-size: 12px;
            display: inline-flex;
            align-items: center;
            gap: 7px;
            cursor: pointer;
            transition: transform 0.16s ease, opacity 0.16s ease;
        }
        .run-btn {
            background: linear-gradient(90deg, color-mix(in srgb, var(--accent-primary) 90%, #4668d8), color-mix(in srgb, var(--accent-primary) 72%, #2d4fa0));
            border-color: color-mix(in srgb, var(--accent-primary) 55%, #2d4fa0);
            color: #fff;
        }
        .run-btn:hover, .action-btn:hover { transform: translateY(-1px); }

        .modern-layout { flex: 1; display: grid; grid-template-columns: minmax(320px, 44%) minmax(0, 1fr); overflow: hidden; }
        .input-section { border-right: 1px solid var(--d-border); display: flex; flex-direction: column; min-width: 0; }
        .input-section.stacked .editor-wrapper { height: calc(50% - 16px); min-height: 130px; }
        .output-section { display: flex; flex-direction: column; min-width: 0; }

        .section-bar {
            min-height: 34px;
            padding: 0 10px;
            background-color: color-mix(in srgb, var(--bg-tertiary) 86%, #151e2c);
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid var(--d-border);
            gap: 8px;
        }
        .section-label { font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); letter-spacing: 0.08em; }
        .editor-wrapper { flex: 1; min-height: 0; overflow: hidden; background-color: var(--bg-primary); }
        .result-area { flex: 1; min-height: 0; overflow: auto; background-color: var(--bg-primary); }

        .mini-toggle { display: flex; background-color: var(--bg-primary); padding: 2px; border-radius: 8px; border: 1px solid var(--d-border); }
        .mini-toggle button {
            padding: 3px 8px; border: none; background: none; color: var(--text-secondary); font-size: 11px; cursor: pointer; border-radius: 6px;
        }
        .mini-toggle button.active { background-color: var(--d-accent-soft); color: var(--text-primary); }
        .mini-btn, .mini-input, .mini-select {
            background-color: var(--bg-primary); border: 1px solid var(--d-border); color: var(--text-primary); font-size: 11px; border-radius: 8px; padding: 3px 7px;
        }

        .markdown-preview { padding: 20px; color: var(--text-primary); line-height: 1.65; }
        .markdown-preview h1, .markdown-preview h2 { border-bottom: 1px solid var(--d-border); padding-bottom: 0.3em; margin-top: 20px; }
        .markdown-preview pre { background-color: color-mix(in srgb, var(--bg-tertiary) 84%, #141d2b); padding: 14px; border-radius: 10px; border: 1px solid var(--d-border); overflow: auto; }

        .table-container { height: 100%; overflow: auto; }
        table { width: 100%; border-collapse: collapse; }
        th { text-align: left; background-color: color-mix(in srgb, var(--bg-tertiary) 86%, #141d2b); padding: 9px; font-size: 11px; color: var(--text-secondary); position: sticky; top: 0; border-bottom: 1px solid var(--d-border); }
        td { padding: 9px; border-bottom: 1px solid color-mix(in srgb, var(--d-border) 58%, transparent); font-size: 12px; }

        .log-line { font-family: 'JetBrains Mono', monospace; padding: 6px 12px; border-bottom: 1px solid color-mix(in srgb, var(--d-border) 58%, transparent); display: flex; gap: 12px; font-size: 12px; }
        .diff-view { font-family: 'JetBrains Mono', monospace; padding: 12px; font-size: 13px; line-height: 1.45; }
        .diff-line { white-space: pre-wrap; word-break: break-all; border-radius: 6px; padding: 2px 4px; }
        .diff-line.added { background-color: rgba(16, 185, 129, 0.15); color: #34d399; }
        .diff-line.removed { background-color: rgba(239, 68, 68, 0.15); color: #f87171; text-decoration: line-through; opacity: 0.85; }

        .regex-results { padding: 10px; }
        .res-header { font-size: 12px; color: var(--text-secondary); margin-bottom: 8px; }
        .matches-list { display: grid; gap: 8px; }
        .match-item { border: 1px solid var(--d-border); border-radius: 10px; padding: 10px; background: var(--d-surface); }
        .match-index { font-size: 11px; color: var(--text-secondary); }
        .match-text { margin-top: 6px; font-family: 'JetBrains Mono', monospace; font-size: 12px; }
        .group-val { margin-top: 5px; font-size: 11px; color: var(--text-secondary); }

        .empty-state { display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-secondary); font-size: 12px; font-style: italic; }
        .error-display { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: #ef8181; gap: 10px; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        @media (max-width: 980px) {
            .modern-layout { grid-template-columns: 1fr; grid-template-rows: minmax(220px, 52%) minmax(220px, 1fr); }
            .input-section { border-right: none; border-bottom: 1px solid var(--d-border); }
            .input-section.stacked .editor-wrapper { height: calc(50% - 17px); }
        }

        @media (max-width: 700px) {
            .modern-header { flex-wrap: wrap; align-items: flex-start; }
            .tool-actions { width: 100%; }
            .run-btn span, .action-btn span { font-size: 11px; }
            .section-bar { flex-wrap: wrap; min-height: 42px; padding: 6px 8px; }
            .modern-layout { grid-template-rows: minmax(260px, 56%) minmax(220px, 1fr); }
        }
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
