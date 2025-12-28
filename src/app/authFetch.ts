// Global fetch wrapper/interceptor helper
export const authFetch = async (url: string, options: RequestInit = {}) => {
  const sessionId = localStorage.getItem('sessionId');
  const headers = {
    ...options.headers,
    ...(sessionId ? { 'x-auth-session': sessionId } : {})
  };

  const res = await fetch(url, { ...options, headers });
  
  if (res.status === 401) {
    const isAuthPage = window.location.pathname === '/login' || window.location.pathname === '/setup';
    if (!isAuthPage) {
      localStorage.removeItem('sessionId');
      window.location.href = '/login';
    }
    throw new Error('Unauthorized');
  }
  
  return res;
};
