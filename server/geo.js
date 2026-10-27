'use strict';
/* ===== በአቅራቢያዬ =====
   • ባለቤቱ የንግዱን ቦታ (ሱቅ፣ ገጽ፣ አሰሪ፤ ከፈለገ ሙያተኛ) ያስቀምጣል — ትክክለኛ መጋጠሚያ ፈጽሞ ለህዝብ አይመለስም፣ ርቀት ብቻ (0.1 ኪ.ሜ)
   • ሙያተኛ (የግል ቤት ሊሆን ስለሚችል) ቦታው ~1 ኪ.ሜ ተደብዝዞ ይቀመጣል
   • ኢትዮጵያ ውስጥ ያሉ መጋጠሚያዎች ብቻ ይቀበላሉ */
module.exports = function geo(ctx) {
  const { app, col, limit, who, saveMany, bad, S } = ctx;
  const T = { s: ['mk/shops', 'ሱቅ'], g: ['pg/pages', 'ገጽ'], e: ['pp/employers', 'አሰሪ'], w: ['pp/workers', 'ሙያተኛ'] };
  const KIND = { shops: 's', pages: 'g', employers: 'e', workers: 'w' };
  const okGeo = (la, lo) => Number.isFinite(la) && Number.isFinite(lo) && la >= 3 && la <= 15.5 && lo >= 32.5 && lo <= 48.5;
  const km = (a, b, c, d) => { const r = x => x * Math.PI / 180, h = Math.sin(r(c - a) / 2) ** 2 + Math.cos(r(a)) * Math.cos(r(c)) * Math.sin(r(d - b) / 2) ** 2; return 12742 * Math.asin(Math.sqrt(h)); };

  app.post('/api/geo/set', async (req, res) => {
    const u = who(req, res); if (!u || u.admin) return u && bad(res, 403, 'admin_cannot'); if (!limit('geo' + u.uid, 20, 3600e3)) return bad(res, 429, 'slow_down');
    const la = Number(req.body.lat), lo = Number(req.body.lng); if (!okGeo(la, lo)) return bad(res, 400, 'bad_location');
    const want = (Array.isArray(req.body.targets) && req.body.targets.length ? req.body.targets : ['s', 'g', 'e']).filter(t => T[t]), done = [], ch = [];
    for (const t of want) for (const x of Object.values(col(T[t][0])).filter(y => y.uid === u.uid)) {
      x.geo = t === 'w' ? { lat: Math.round(la * 100) / 100, lng: Math.round(lo * 100) / 100 } : { lat: Math.round(la * 1e5) / 1e5, lng: Math.round(lo * 1e5) / 1e5 };
      ch.push([T[t][0], x.id]); done.push(T[t][1]);
    }
    if (!ch.length) return bad(res, 404, 'nothing_to_locate');
    try { await saveMany(ch); res.json({ ok: true, set: done }); } catch (e) { bad(res, 503, 'storage'); }
  });
  app.post('/api/geo/clear', async (req, res) => {
    const u = who(req, res); if (!u || u.admin) return u && bad(res, 403, 'admin_cannot'); const ch = [];
    for (const [p] of Object.values(T)) for (const x of Object.values(col(p)).filter(y => y.uid === u.uid && y.geo)) { delete x.geo; ch.push([p, x.id]); }
    try { if (ch.length) await saveMany(ch); res.json({ ok: true, cleared: ch.length }); } catch (e) { bad(res, 503, 'storage'); }
  });
  app.get('/api/nearby', (req, res) => {
    if (!limit('nb' + (req.ip || ''), 60, 60e3)) return bad(res, 429, 'slow_down');
    const la = Number(req.query.lat), lo = Number(req.query.lng); if (!okGeo(la, lo)) return bad(res, 400, 'bad_location');
    const t = KIND[S(req.query.kind, 12)] || 's', maxKm = Math.min(200, Math.max(1, Number(req.query.km) || 30)), [p] = T[t];
    const L = Object.values(col(p)).filter(x => x.status === 'active' && x.geo).map(x => ({ x, d: km(la, lo, x.geo.lat, x.geo.lng) })).filter(o => o.d <= maxKm).sort((a, b) => a.d - b.d).slice(0, 12);
    const row = ({ x, d }) => t === 's' ? { id: x.id, name: x.name, sub: [x.kind, x.city].filter(Boolean).join(' · '), href: '/shop/' + x.id, img: x.logo, km: Math.round(d * 10) / 10 }
      : t === 'g' ? { id: x.id, name: x.title, sub: [x.kind, x.city].filter(Boolean).join(' · '), href: '/site/' + x.id, img: x.logo, km: Math.round(d * 10) / 10 }
        : t === 'e' ? { id: x.id, name: x.name, sub: [x.sector, x.city].filter(Boolean).join(' · '), href: '/employers/' + x.id, img: x.logo, km: Math.round(d * 10) / 10 }
          : { id: x.id, name: x.name, sub: [x.title, x.city].filter(Boolean).join(' · '), href: '/workers/' + x.id, img: x.photo, km: Math.max(1, Math.round(d)) };   // ሙያተኛ፦ ከ1 ኪ.ሜ በታች አይታይም
    res.json({ ok: true, kind: t, items: L.map(row) });
  });
  return { km };
};
