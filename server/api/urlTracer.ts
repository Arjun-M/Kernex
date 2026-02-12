import type { FastifyInstance } from 'fastify';

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

const normalizeInputUrl = (raw: string) => {
  const trimmed = (raw || '').trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const parseClientRedirect = (html: string, currentUrl: string) => {
  const snippet = html.slice(0, 300_000);

  const metaMatch = snippet.match(
    /<meta\s+[^>]*http-equiv=["']?refresh["']?[^>]*content=["']?\s*(\d+)\s*;\s*url\s*=\s*([^"'>]+)["']?/i
  );
  if (metaMatch) {
    return {
      redirectKind: 'meta' as const,
      reason: `Meta Refresh (${metaMatch[1]}s)`,
      nextUrl: new URL(metaMatch[2].trim(), currentUrl).href,
    };
  }

  const jsPatterns = [
    /window\.location\.replace\(\s*["']([^"']+)["']\s*\)/i,
    /location\.replace\(\s*["']([^"']+)["']\s*\)/i,
    /window\.location\.href\s*=\s*["']([^"']+)["']/i,
    /window\.location\s*=\s*["']([^"']+)["']/i,
    /top\.location\s*=\s*["']([^"']+)["']/i,
    /location\.href\s*=\s*["']([^"']+)["']/i,
  ];

  for (const pattern of jsPatterns) {
    const match = snippet.match(pattern);
    if (match) {
      return {
        redirectKind: 'js' as const,
        reason: 'JavaScript Redirect',
        nextUrl: new URL(match[1].trim(), currentUrl).href,
      };
    }
  }

  return null;
};

export default async function urlTracerRoutes(fastify: FastifyInstance) {
  fastify.post('/trace', async (request, reply) => {
    const { url } = request.body as { url: string };
    const normalizedUrl = normalizeInputUrl(url);
    if (!normalizedUrl) return reply.code(400).send({ error: 'URL is required' });

    try {
      // Validate URL
      new URL(normalizedUrl);

      const chain: TraceStep[] = [];
      let currentUrl = normalizedUrl;
      let finalResponse: Response | null = null;
      const maxRedirects = 20;
      let redirectCount = 0;
      const startTime = Date.now();
      let cookies = '';
      const visited = new Set<string>();

      while (redirectCount < maxRedirects) {
        const stepStart = Date.now();
        try {
          const headers: Record<string, string> = {
            'User-Agent':
              'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
          };

          if (cookies) {
            headers.Cookie = cookies;
          }

          const res = await fetch(currentUrl, {
            method: 'GET',
            redirect: 'manual',
            headers,
          });

          const duration = Date.now() - stepStart;

          // Update cookies (best effort)
          const setCookie = res.headers.get('set-cookie');
          if (setCookie) {
            const newCookies = setCookie
              .split(',')
              .map((c) => c.split(';')[0])
              .filter(Boolean)
              .join('; ');
            cookies = cookies ? `${cookies}; ${newCookies}` : newCookies;
          }

          const contentType = res.headers.get('content-type') || '';
          const locationHeader = res.headers.get('location');
          let nextUrl: string | null = null;
          let reason = 'Final';
          let redirectKind: RedirectKind = 'final';

          if (res.status >= 300 && res.status < 400) {
            if (locationHeader) {
              nextUrl = new URL(locationHeader, currentUrl).href;
              reason = 'HTTP Redirect';
              redirectKind = 'http';
            } else {
              reason = 'Broken Redirect (missing Location header)';
              redirectKind = 'broken';
            }
          } else if (res.status >= 200 && res.status < 300 && contentType.includes('text/html')) {
            const html = await res.text();
            const clientRedirect = parseClientRedirect(html, currentUrl);
            if (clientRedirect) {
              nextUrl = clientRedirect.nextUrl;
              reason = clientRedirect.reason;
              redirectKind = clientRedirect.redirectKind;
            }
          }

          const repeatedUrl = !!nextUrl && (nextUrl === currentUrl || visited.has(nextUrl));
          if (repeatedUrl) {
            reason = `Redirect Loop Detected -> ${nextUrl}`;
            redirectKind = 'loop';
            nextUrl = null;
          }

          chain.push({
            index: chain.length + 1,
            url: currentUrl,
            status: res.status,
            statusText: res.statusText,
            duration,
            reason,
            redirectKind,
            locationHeader,
            nextUrl,
            contentType: contentType || undefined,
          });

          visited.add(currentUrl);

          if (nextUrl) {
            currentUrl = nextUrl;
            redirectCount++;
          } else {
            finalResponse = res;
            break;
          }
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : 'Network error';
          chain.push({
            index: chain.length + 1,
            url: currentUrl,
            status: 0,
            duration: Date.now() - stepStart,
            reason: message,
            redirectKind: 'error',
          });
          break;
        }
      }

      const totalTime = Date.now() - startTime;

      const headers: Record<string, string> = {};
      if (finalResponse) {
        finalResponse.headers.forEach((value, key) => {
          headers[key] = value;
        });
      }

      return {
        originalUrl: normalizedUrl,
        finalUrl: currentUrl,
        chain,
        statusCode: finalResponse?.status || 0,
        headers,
        totalTime,
        redirectCount,
      };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Failed to trace URL';
      return reply.code(500).send({ error: message });
    }
  });
}
