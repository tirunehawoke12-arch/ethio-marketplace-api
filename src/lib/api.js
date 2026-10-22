export const tok = () => (typeof window === 'undefined' ? null : window.localStorage.getItem('etm_tok'));
export const setTok = t => { if (typeof window !== 'undefined') { t ? window.localStorage.setItem('etm_tok', t) : window.localStorage.removeItem('etm_tok'); } };
export async function api(method, url, body) {
  const headers = { 'content-type': 'application/json' }; const t = tok(); if (t) headers.authorization = 'Bearer ' + t;
  let r, d = {};
  try { r = await fetch(url, { method, headers, body: body ? JSON.stringify(body) : undefined }); d = await r.json(); } catch (e) { return { ok: false, error: 'network', status: 0 }; }
  d.http = r.status; return d;
}
export const get = u => api('GET', u);
export const post = (u, b) => api('POST', u, b || {});
export const imgUrl = id => (id ? '/api/market/img/' + id : '');
export const ETB = n => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' ብር';
export const claims = () => { try { const b = tok().split('.')[0].replace(/-/g, '+').replace(/_/g, '/'); return JSON.parse(atob(b + '='.repeat((4 - (b.length % 4)) % 4))); } catch (e) { return {}; } };
export const qs = o => { const p = new URLSearchParams(Object.entries(o || {}).filter(([, v]) => v !== '' && v != null)).toString(); return p ? '?' + p : ''; };
