import React, { useMemo, useState } from 'react';
import { Route, ArrowRight, Clock3, Globe, ExternalLink, RefreshCw } from 'lucide-react';
import { pluginFetch } from '../authHelper';
import { useToast } from '../../app/ToastContext';

type RedirectKind = 'http' | 'meta' | 'js' | 'final' | 'error' | 'loop' | 'broken';

interface TraceStep {
  index: number;
  url: string;
  status: number;
  statusText?: string;
  duration: number;
  reason: string;
  redirectKind: RedirectKind;
  locationHeader?: string | null;
  nextUrl?: string | null;
  contentType?: string;
}

interface TraceResult {
  originalUrl: string;
  finalUrl: string;
  chain: TraceStep[];
  statusCode: number;
  headers: Record<string, string>;
  totalTime: number;
  redirectCount: number;
}

const cardStyle: React.CSSProperties = {
  background: 'var(--bg-secondary)',
  borderRadius: 10,
  border: '1px solid var(--border-color)',
  padding: 16,
};

const kindLabel = (kind: RedirectKind) => {
  switch (kind) {
    case 'http':
      return 'HTTP Redirect';
    case 'meta':
      return 'Meta Refresh';
    case 'js':
      return 'JavaScript Redirect';
    case 'loop':
      return 'Loop';
    case 'broken':
      return 'Broken Redirect';
    case 'error':
      return 'Error';
    default:
      return 'Final';
  }
};

const kindColor = (kind: RedirectKind) => {
  switch (kind) {
    case 'http':
      return '#f59e0b';
    case 'meta':
      return '#8b5cf6';
    case 'js':
      return '#3b82f6';
    case 'loop':
      return '#dc2626';
    case 'broken':
      return '#ef4444';
    case 'error':
      return '#b91c1c';
    default:
      return '#10b981';
  }
};

const statusColor = (status: number) => {
  if (status >= 200 && status < 300) return '#10b981';
  if (status >= 300 && status < 400) return '#f59e0b';
  if (status >= 400 && status < 500) return '#ef4444';
  if (status >= 500) return '#b91c1c';
  return '#6b7280';
};

const UrlTracerApp = () => {
  const { error } = useToast();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TraceResult | null>(null);

  const performTrace = React.useCallback(async (targetUrl: string) => {
    if (!targetUrl.trim()) return;
    setLoading(true);
    setResult(null);

    try {
      const res = await pluginFetch('/api/url-tracer/trace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
      } else {
        error(data.error || 'Trace failed');
      }
    } catch {
      error('Network error while tracing URL');
    } finally {
      setLoading(false);
    }
  }, [error]);

  React.useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const initialUrl = params.get('initialUrl');
    if (initialUrl) {
      setUrl(initialUrl);
      performTrace(initialUrl);
    }
  }, [performTrace]);

  const handleTrace = (e: React.FormEvent) => {
    e.preventDefault();
    performTrace(url);
  };

  const summary = useMemo(() => {
    if (!result) return null;
    const hops = result.chain.length;
    const finalHop = result.chain[result.chain.length - 1];
    return {
      hops,
      finalHop,
      totalMs: result.totalTime,
      redirects: result.redirectCount,
    };
  }, [result]);

  return (
    <div
      style={{
        height: '100%',
        background: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid var(--border-color)',
          background: 'var(--bg-secondary)',
        }}
      >
        <form onSubmit={handleTrace} style={{ display: 'flex', gap: 10, maxWidth: 920, margin: '0 auto' }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Globe
              size={18}
              style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}
            />
            <input
              className="input"
              style={{ paddingLeft: 38, height: 42, fontSize: 14 }}
              placeholder="Trace redirects for URL (e.g. https://t.co/...)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading} style={{ padding: '0 20px', height: 42 }}>
            {loading ? 'Tracing...' : 'Trace URL'}
          </button>
        </form>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        {result && summary && (
          <div style={{ maxWidth: 920, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ ...cardStyle, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Final Status</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: statusColor(result.statusCode) }}>{result.statusCode || 'N/A'}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Redirects</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{summary.redirects}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Hops</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{summary.hops}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Total Time</div>
                <div style={{ fontSize: 18, fontWeight: 700 }}>{summary.totalMs}ms</div>
              </div>
            </div>

            <div style={cardStyle}>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 6 }}>Final Destination</div>
              <a
                href={result.finalUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--accent-primary)', wordBreak: 'break-all', textDecoration: 'none', display: 'inline-flex', gap: 6, alignItems: 'center' }}
              >
                {result.finalUrl}
                <ExternalLink size={14} />
              </a>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {result.chain.map((step) => (
                <div key={`${step.index}-${step.url}`} style={cardStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <strong style={{ color: statusColor(step.status) }}>
                        {step.status || 'ERR'} {step.statusText || ''}
                      </strong>
                      <span
                        style={{
                          fontSize: 11,
                          border: `1px solid ${kindColor(step.redirectKind)}66`,
                          color: kindColor(step.redirectKind),
                          borderRadius: 999,
                          padding: '2px 8px',
                          background: `${kindColor(step.redirectKind)}1A`,
                        }}
                      >
                        {kindLabel(step.redirectKind)}
                      </span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Clock3 size={12} />
                      {step.duration}ms
                    </div>
                  </div>

                  <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 3 }}>From</div>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>{step.url}</div>

                  {step.locationHeader && (
                    <>
                      <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 10, marginBottom: 3 }}>Location Header</div>
                      <div style={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>{step.locationHeader}</div>
                    </>
                  )}

                  {step.nextUrl && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, marginBottom: 3, color: 'var(--text-secondary)' }}>
                        <ArrowRight size={14} />
                        <span style={{ fontSize: 12 }}>Redirects To</span>
                      </div>
                      <div style={{ fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all', color: 'var(--accent-primary)' }}>
                        {step.nextUrl}
                      </div>
                    </>
                  )}

                  <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-secondary)' }}>
                    Reason: {step.reason}
                    {step.contentType ? ` | Content-Type: ${step.contentType}` : ''}
                  </div>
                </div>
              ))}
            </div>

            {result.headers && Object.keys(result.headers).length > 0 && (
              <div style={cardStyle}>
                <div style={{ marginBottom: 8, fontSize: 13, color: 'var(--text-secondary)' }}>Final Response Headers</div>
                <div style={{ overflowX: 'auto', fontFamily: 'monospace', fontSize: 12 }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <tbody>
                      {Object.entries(result.headers).map(([key, val]) => (
                        <tr key={key}>
                          <td style={{ padding: '4px 8px 4px 0', color: 'var(--accent-primary)', whiteSpace: 'nowrap', verticalAlign: 'top' }}>
                            {key}:
                          </td>
                          <td style={{ padding: '4px 0', color: 'var(--text-secondary)', wordBreak: 'break-all' }}>{val}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {!result && !loading && (
          <div
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.65,
              gap: 10,
              textAlign: 'center',
            }}
          >
            <Route size={56} />
            <div style={{ fontSize: 14 }}>Trace any URL and inspect each redirect hop in detail.</div>
            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Shows HTTP Location redirects + common meta/JS redirects.</div>
          </div>
        )}

        {loading && (
          <div
            style={{
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              color: 'var(--text-secondary)',
            }}
          >
            <RefreshCw size={16} />
            <span>Tracing URL path...</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default UrlTracerApp;
