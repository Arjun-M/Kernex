/**
 * Shared authentication helper for plugins.
 * Ensures session token is sent in headers and cookies are included.
 */

export const getSessionToken = () => {
  // 1. Try to get from URL first (passed by parent to iframe)
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get('token');
  if (token) return token;

  // 2. Try localStorage (if same origin / native component)
  try {
    const storageToken = localStorage.getItem('sessionId');
    if (storageToken) return storageToken;
  } catch (e) {
    // Ignore cases where localStorage is blocked (e.g. cross-origin iframe)
  }

  // 3. Fallback to cookie
  const value = `; ${document.cookie}`;
  const parts = value.split(`; session=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;

  return null;
};

export const pluginFetch = async (url: string, options: RequestInit = {}) => {
  const token = getSessionToken();
  
  // Append token to URL if not present (for backend authenticate hook support)
  let finalUrl = url;
  if (token) {
    const urlObj = new URL(url, window.location.origin);
    if (!urlObj.searchParams.has('token')) {
      urlObj.searchParams.append('token', token);
    }
    finalUrl = urlObj.pathname + urlObj.search;
  }

  const headers: Record<string, string> = {
    ...((options.headers as any) || {}),
  };

  if (token) {
    headers['x-auth-session'] = token;
  }

  const finalOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include',
  };

  try {
    const res = await fetch(finalUrl, finalOptions);
    
    if (res.status === 401) {
      console.warn('Plugin API 401 Unauthorized. Token present in helper:', !!token);
    }
    
    return res;
  } catch (err) {
    console.error('Plugin fetch network error:', err);
    throw err;
  }
};