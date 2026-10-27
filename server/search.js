'use strict';
const AM = require('./amnorm');
/* ===== የተዋሃደ ፍለጋ — አንድ ቃል በሁሉም የተመዘገቡ ነገሮች ላይ (ዕቃ፣ ሱቅ፣ ገጽ፣ ሙያተኛ፣ አሰሪ፣ ሥራ) =====
   ለህዝብ የሚታዩትን (active/open) ብቻ ይመልሳል፤ የግል መስኮች (ስልክ፣ ክፍያ…) አይካተቱም። */
module.exports = function search({ app, col, S }) {
  const hit = (q, ...parts) => AM.hit(parts.join(' '), q);
  app.get('/api/search', (req, res) => {
    const q = S(req.query.q, 60).toLowerCase(); if (q.length < 2) return res.json({ ok: true, q, groups: [] });
    const shops = col('mk/shops'), emps = col('pp/employers'), today = new Date().toISOString().slice(0, 10), N = 6;
    const take = (arr, f) => { const out = []; for (const x of arr) { if (out.length >= N) break; const r = f(x); if (r) out.push(r); } return out; };
    const groups = [
      ['products', '🛍 ዕቃዎች', take(Object.values(col('mk/products')), p => p.status === 'active' && shops[p.shopId] && shops[p.shopId].status === 'active' && hit(q, p.title, p.desc, p.category) && { id: p.id, title: p.title, sub: `${p.price} ብር · ${shops[p.shopId].name}`, href: '/p/' + p.id, img: (p.imgs || [])[0] })],
      ['shops', '🏪 ሱቆች', take(Object.values(shops), s => s.status === 'active' && hit(q, s.name, s.about, (s.tags || []).join(' '), s.city) && { id: s.id, title: s.name, sub: [s.kind, s.city].filter(Boolean).join(' · '), href: '/shop/' + s.id, img: s.logo })],
      ['pages', '🌐 ገጾች', take(Object.values(col('pg/pages')), p => p.status === 'active' && hit(q, p.title, p.tagline, p.kind, p.city, p.about) && { id: p.id, title: p.title, sub: [p.kind, p.city].filter(Boolean).join(' · '), href: '/site/' + p.id, img: p.logo })],
      ['workers', '🧑‍🔧 ሙያተኞች', take(Object.values(col('pp/workers')), w => w.status === 'active' && hit(q, w.name, w.title, (w.skills || []).join(' '), w.about, w.city) && { id: w.id, title: w.name, sub: [w.title, w.city].filter(Boolean).join(' · '), href: '/workers/' + w.id, img: w.photo })],
      ['employers', '🏢 አሰሪዎች', take(Object.values(emps), e => e.status === 'active' && hit(q, e.name, e.sector, e.about, e.city) && { id: e.id, title: e.name, sub: [e.sector, e.city].filter(Boolean).join(' · '), href: '/employers/' + e.id, img: e.logo })],
      ['jobs', '💼 ሥራዎች', take(Object.values(col('pp/jobs')), j => !j.deleted && j.status === 'open' && emps[j.employerId] && emps[j.employerId].status === 'active' && (!j.deadline || j.deadline >= today) && hit(q, j.title, j.description, emps[j.employerId].name) && { id: j.id, title: j.title, sub: `${emps[j.employerId].name} · ${j.city || ''}`, href: '/jobs/' + j.id })],
    ].filter(g => g[2].length).map(([key, label, items]) => ({ key, label, items }));
    res.json({ ok: true, q, groups });
  });
};
