const origin = 'https://qinghe.local';
export function normalizeRoute(value, fallback = '/') {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f]/.test(value)) return fallback;
  try {
    const url = new URL(value, origin);
    if (url.origin !== origin) return fallback;
    return (url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : '/') + url.search;
  } catch { return fallback; }
}
export function loginReturn(route) {
  const url = new URL(normalizeRoute(route), origin);
  const target = normalizeRoute(url.searchParams.get('returnTo'), '/me');
  return new URL(target, origin).pathname === '/login' ? '/me' : target;
}
export function fallbackBack(route) {
  const p = new URL(normalizeRoute(route), origin).pathname;
  if (p === '/login') return loginReturn(route);
  if (p.startsWith('/activity/')) return '/activities';
  if (p.startsWith('/post/') || p.startsWith('/article/') || p.startsWith('/success/')) return '/community';
  if (/^\/plant\/[^/]+\/record$/.test(p)) return p.replace(/\/record$/, '');
  if (p.startsWith('/plant/') || p === '/plant-records' || p === '/profile/edit' || p === '/records' || p === '/drafts' || p === '/favorites' || p.startsWith('/settings')) return '/me';
  if (p.startsWith('/chat/')) return '/messages';
  return '/';
}
export function editorSourceExists(state, url) {
  const draft = url.searchParams.get('draft'), post = url.searchParams.get('post');
  if (draft && post) return false;
  if (draft) return state.drafts.some(d => d.id === draft && d.owner === state.userId);
  if (post) return state.posts.some(p => p.id === post && p.author === state.userId);
  return true;
}
