import React, { useEffect, useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Book, ArrowLeft, Menu, ChevronLeft, ChevronRight } from 'lucide-react';
import { authFetch } from '../app/authFetch';
import { useTitle } from '../hooks/useTitle';
import DocsSidebar, { type DocEntry } from '../components/docs/DocsSidebar';
import { DOCS_MAP } from '../components/docs/docsData';
import MarkdownRenderer from '../components/docs/MarkdownRenderer';
import TableOfContents from '../components/docs/TableOfContents';
import '../components/docs/Docs.css';

const normalizeDocSlug = (slug: string): string => {
  let value = (slug || '').trim().replace(/^\/+|\/+$/g, '');
  value = value.replace(/^docs\//i, '');

  if (!value) return '';

  value = value.replace(/\.md$/i, '');
  value = value.replace(/\/(index|README)$/i, '');
  if (/^(index|README)$/i.test(value)) return '';

  return value;
};

const docRoute = (slug: string): string => (slug ? `/docs/${slug}` : '/docs');

const flattenFiles = (entries: DocEntry[]): Array<{ title: string; path: string }> => {
  const files: Array<{ title: string; path: string }> = [];

  const walk = (items: DocEntry[]) => {
    items.forEach((item) => {
      if (item.type === 'file') {
        files.push({ title: item.title, path: item.path });
      } else if (item.children?.length) {
        walk(item.children);
      }
    });
  };

  walk(entries);
  return files;
};

const DocsPage: React.FC = () => {
  useTitle('Documentation');
  const navigate = useNavigate();
  const params = useParams();
  const rawSlug = params['*'] || '';
  const slug = normalizeDocSlug(rawSlug);

  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const orderedDocs = useMemo(() => flattenFiles(DOCS_MAP), []);
  const currentIndex = orderedDocs.findIndex((doc) => doc.path === slug);
  const prevDoc = currentIndex > 0 ? orderedDocs[currentIndex - 1] : null;
  const nextDoc = currentIndex >= 0 && currentIndex < orderedDocs.length - 1 ? orderedDocs[currentIndex + 1] : null;

  useEffect(() => {
    if (rawSlug !== slug) {
      navigate(docRoute(slug), { replace: true });
    }
  }, [navigate, rawSlug, slug]);

  useEffect(() => {
    const loadContent = async () => {
      setLoading(true);
      document.querySelector('.docs-content-container')?.scrollTo(0, 0);

      try {
        const res = await authFetch(`/api/docs/content?slug=${encodeURIComponent(slug)}`);
        if (res.ok) {
          const data = await res.json();
          setContent(data.content);
        } else {
          setContent('# 404 Not Found\nThe requested document could not be found.');
        }
      } catch {
        setContent('# Error\nFailed to load documentation.');
      } finally {
        setLoading(false);
      }
    };

    loadContent();
  }, [slug]);

  return (
    <div className="docs-layout">
      <div className="mobile-header" style={{ display: 'none' }}>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          <Menu />
        </button>
        <span>Kernex Docs</span>
      </div>

      <div className={`docs-sidebar-container ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="docs-sidebar-header">
          <Book size={24} className="text-blue-600" />
          <span>Kernex Docs</span>
        </div>

        <div style={{ padding: '16px 16px 0' }}>
          <button
            onClick={() => navigate('/workspace')}
            className="docs-sidebar-item"
            style={{ width: '100%', marginBottom: '16px' }}
          >
            <ArrowLeft size={16} style={{ marginRight: 8 }} />
            Back to App
          </button>
        </div>

        <DocsSidebar tree={DOCS_MAP} activeSlug={slug} />
      </div>

      <div className="docs-content-container">
        <div className="docs-content-wrapper">
          <div className="docs-article">
            {loading ? (
              <div style={{ padding: 40, color: '#6b7280' }}>Loading...</div>
            ) : (
              <MarkdownRenderer content={content} currentSlug={slug} />
            )}
          </div>

          {!loading && currentIndex >= 0 && (prevDoc || nextDoc) && (
            <div className="docs-page-nav" aria-label="Documentation pagination">
              {prevDoc ? (
                <button className="docs-page-nav-btn" onClick={() => navigate(docRoute(prevDoc.path))}>
                  <ChevronLeft size={16} />
                  <span>Back: {prevDoc.title}</span>
                </button>
              ) : (
                <div />
              )}

              {nextDoc ? (
                <button
                  className="docs-page-nav-btn docs-page-nav-btn-next"
                  onClick={() => navigate(docRoute(nextDoc.path))}
                >
                  <span>Next: {nextDoc.title}</span>
                  <ChevronRight size={16} />
                </button>
              ) : (
                <div />
              )}
            </div>
          )}

          <footer className="docs-footer">
            <div className="docs-footer-divider" />
            <div className="docs-footer-content">
              <div className="docs-footer-left">© {new Date().getFullYear()} Kernex. MIT Licensed.</div>
              <div className="docs-footer-right">
                <a href="https://github.com/Arjun-M/Kernex" target="_blank" rel="noopener noreferrer">
                  GitHub
                </a>
                <span className="dot">·</span>
                <a href="https://github.com/Arjun-M/Kernex/issues" target="_blank" rel="noopener noreferrer">
                  Issues
                </a>
              </div>
            </div>
          </footer>
        </div>

        {!loading && content && (
          <div className="docs-toc-container">
            <TableOfContents key={content.substring(0, 100)} />
          </div>
        )}
      </div>
    </div>
  );
};

export default DocsPage;
