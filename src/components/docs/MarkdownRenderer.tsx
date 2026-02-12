import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import MarkdownIt from 'markdown-it';

interface MarkdownRendererProps {
  content: string;
  currentSlug: string;
}

const resolveDocHref = (href: string, currentSlug: string): string => {
  if (!href) return href;
  if (href.startsWith('#')) return href;
  if (/^(https?:|mailto:|tel:|javascript:)/i.test(href)) return href;

  const [withoutHash, hashFragment = ''] = href.split('#');
  const [rawPath, query = ''] = withoutHash.split('?');

  const hash = hashFragment ? `#${hashFragment}` : '';
  const search = query ? `?${query}` : '';

  const currentSegments = currentSlug ? currentSlug.split('/').filter(Boolean) : [];
  if (currentSegments.length > 0) {
    currentSegments.pop();
  }

  let sourcePath = rawPath || '';

  if (sourcePath.startsWith('/docs/')) {
    sourcePath = sourcePath.slice('/docs/'.length);
  } else if (sourcePath === '/docs') {
    sourcePath = '';
  } else if (sourcePath.startsWith('/')) {
    // Keep non-doc absolute links as-is
    return `${rawPath}${search}${hash}`;
  } else {
    const relativeParts = sourcePath.split('/').filter(Boolean);
    const merged = [...currentSegments];

    relativeParts.forEach((part) => {
      if (part === '.') return;
      if (part === '..') {
        merged.pop();
        return;
      }
      merged.push(part);
    });

    sourcePath = merged.join('/');
  }

  sourcePath = sourcePath.replace(/\.md$/i, '');
  sourcePath = sourcePath.replace(/\/(index|README)$/i, '');
  if (/^(index|README)$/i.test(sourcePath)) {
    sourcePath = '';
  }

  return sourcePath ? `/docs/${sourcePath}${search}${hash}` : `/docs${search}${hash}`;
};

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, currentSlug }) => {
  const navigate = useNavigate();

  const md = useMemo(() => {
    const instance = new MarkdownIt({
      html: true,
      linkify: true,
      typographer: true,
    });

    const defaultRender =
      instance.renderer.rules.link_open ||
      ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

    instance.renderer.rules.link_open = (tokens, idx, options, env, self) => {
      const token = tokens[idx];
      const href = token.attrGet('href');

      if (href) {
        token.attrSet('href', resolveDocHref(href, currentSlug));
      }

      return defaultRender(tokens, idx, options, env, self);
    };

    return instance;
  }, [currentSlug]);

  const html = useMemo(() => md.render(content), [content, md]);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    const anchor = target.closest('a');
    if (!anchor) return;

    const href = anchor.getAttribute('href');
    if (!href || !href.startsWith('/docs')) return;

    event.preventDefault();
    navigate(href);
  };

  return <div className="markdown-body" onClick={handleClick} dangerouslySetInnerHTML={{ __html: html }} />;
};

export default MarkdownRenderer;
