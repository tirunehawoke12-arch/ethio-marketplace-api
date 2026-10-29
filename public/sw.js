/* Etio Digital Market — service worker (ፈጣን መክፈት + ያለ ኢንተርኔት የቆዩ ገጾች)
   • /api እና POST ፈጽሞ አይቀመጡም (የግል እና ትኩስ መረጃ)
   • ገጾች፦ መጀመሪያ ኔትዎርክ፣ ካልተገኘ የተቀመጠው፣ ያም ከሌለ /offline.html
   • ምስል እና static ፋይሎች፦ መጀመሪያ ከተቀመጠው */
const V = 'etm-v15', PAGES = V + '-pages', STATIC = V + '-static', IMG = V + '-img';
self.addEventListener('install', e => { e.waitUntil(caches.open(STATIC).then(c => c.addAll(['/offline.html', '/icons/icon-192.png'])).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => !k.startsWith(V)).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
const trim = async (name, max) => { const c = await caches.open(name), ks = await c.keys(); if (ks.length > max) await Promise.all(ks.slice(0, ks.length - max).map(k => c.delete(k))); };
self.addEventListener('fetch', e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin) return;
  if (u.pathname.startsWith('/api/') && !u.pathname.startsWith('/api/market/img/')) return;
  if (u.pathname.startsWith('/api/market/img/')) {                       // ምስሎች — ከተቀመጠው መጀመሪያ
    e.respondWith(caches.open(IMG).then(async c => { const hit = await c.match(r); if (hit) return hit; const res = await fetch(r); if (res.ok) { c.put(r, res.clone()); trim(IMG, 150); } return res; }));
    return;
  }
  if (u.pathname.startsWith('/_next/static/') || u.pathname.startsWith('/icons/')) {
    e.respondWith(caches.open(STATIC).then(async c => { const hit = await c.match(r); if (hit) return hit; const res = await fetch(r); if (res.ok) c.put(r, res.clone()); return res; }));
    return;
  }
  if (r.mode === 'navigate') {
    if (/^\/(admin|login|register|checkout|cart|me|learn)(\/|$)/.test(u.pathname)) { e.respondWith(fetch(r).catch(() => caches.match('/offline.html'))); return; }   // የግል ገጾች አይቀመጡም
    e.respondWith(fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(PAGES).then(c => { c.put(r, cp); trim(PAGES, 40); }); } return res; }).catch(async () => (await caches.match(r)) || caches.match('/offline.html')));
  }
});
