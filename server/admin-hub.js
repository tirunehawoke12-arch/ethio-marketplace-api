'use strict';
/* ===== የአድሚን ማዕከል — አንድ ቦታ ሆኖ ሁሉንም ሥርዓት መቆጣጠር =====
   • /api/admin/hub    ዳሽቦርድ፦ ቁጥሮች፣ «ትኩረት የሚሻ» ወረፋ፣ የቅርብ እንቅስቃሴ፣ የሥርዓት ጤና
   • /api/admin/find   አንድ ፍለጋ ለሁሉም (ተጠቃሚ፣ ሱቅ፣ ዕቃ፣ ትዕዛዝ፣ ሙያተኛ፣ አሰሪ፣ ሥራ፣ ገጽ)
   • /api/admin/products + status   ዕቃ ማገድ/መፍቀድ
   • /api/admin/banner  ለሁሉም ጎብኝ የሚታይ ማስታወቂያ ባነር (GET public /api/site/banner)
   • /api/admin/broadcast  ለተመረጠ ቡድን የ Telegram ማስታወቂያ (በሰዓት 1) */
const DAY = 864e5, PAID = ['paid', 'preparing', 'shipped', 'delivered', 'settled'];
module.exports = function adminHub(ctx) {
  const { app, col, adminOnly, saveMany, bad, S, notifyUser, getStore, audit, ops, health = {}, now = () => Date.now() } = ctx;
  const users = () => { const d = getStore().docs, out = []; for (const p of Object.keys(d)) { const m = /^data\/users\/([\w-]+)$/.exec(p); if (m && d[p].acct) out.push({ uid: m[1], a: d[p].acct, pv: d[p].private || {}, pf: d[p].prefs || {} }); } return out; };
  const ui = uid => { const d = col('data/users/' + uid); return { name: (d.private && d.private.fullName) || (d.acct && d.acct.name) || '', email: (d.acct && d.acct.email) || '', phone: (d.acct && d.acct.phone) || '' }; };
  const cnt = o => Object.keys(o).length;
  const small = x => String(x == null ? '' : x).slice(0, 80);

  app.get('/api/admin/hub', (req, res) => {
    if (!adminOnly(req, res)) return; const t = now(), U = users(), O = Object.values(col('mk/orders')), shops = col('mk/shops'), P = Object.values(col('mk/products'));
    const paid = O.filter(o => PAID.includes(o.status)), sum = a => Math.round(a.reduce((s, o) => s + (o.total || 0), 0)), day0 = t - ((t + 3 * 3600e3) % DAY);
    const rq = Object.values(col('tr/requests')).filter(x => x.status === 'pending').length, rp = Object.values(col('tr/reports')).filter(x => x.status === 'open').length;
    const queue = { shops: Object.values(shops).filter(s => s.status === 'pending').length, payments: O.filter(o => o.status === 'payment_submitted').length, settle: O.filter(o => o.status === 'delivered').length, refunds: O.filter(o => o.status === 'refund_pending').length, disputes: O.filter(o => o.status === 'disputed').length, badges: rq, reports: rp };
    const st = ops ? ops.stats() : { days: [], top: [], empty: [] };
    const errs = ops && ops.errors ? ops.errors().length : 0, cs = Object.values(col('ch/threads'));
    const recent = {
      users: U.sort((a, b) => (b.a.ts || 0) - (a.a.ts || 0)).slice(0, 6).map(x => ({ id: x.uid, title: x.pv.fullName || x.a.name || x.a.email, sub: x.a.email || x.a.phone, ts: x.a.ts })),
      shops: Object.values(shops).sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 5).map(s => ({ id: s.id, title: s.name, sub: [s.kind, s.city].filter(Boolean).join(' · '), ts: s.ts, status: s.status })),
      orders: O.sort((a, b) => b.ts - a.ts).slice(0, 6).map(o => ({ id: o.id, title: '#' + o.id.slice(0, 6) + ' · ' + (o.shopName || ''), sub: o.status + ' · ' + o.total + ' ብር', ts: o.ts })),
      jobs: Object.values(col('pp/jobs')).filter(j => !j.deleted).sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 5).map(j => ({ id: j.id, title: j.title, sub: j.city || '', ts: j.ts })) };
    res.json({ ok: true, at: t,
      counts: { users: U.length, new7: U.filter(x => (x.a.ts || 0) > t - 7 * DAY).length, shops: cnt(shops), activeShops: Object.values(shops).filter(s => s.status === 'active').length, products: P.length, orders: O.length, workers: cnt(col('pp/workers')), employers: cnt(col('pp/employers')), jobs: Object.values(col('pp/jobs')).filter(j => !j.deleted && j.status === 'open').length, pages: cnt(col('pg/pages')), threads: cs.length, alerts: cnt(col('al/subs')) },
      money: { gmv: sum(paid), today: sum(paid.filter(o => o.ts >= day0)), week: sum(paid.filter(o => o.ts > t - 7 * DAY)), commission: Math.round(O.filter(o => o.status === 'settled').reduce((s, o) => s + (o.commission || 0), 0)) },
      queue, attention: Object.values(queue).reduce((a, b) => a + b, 0), days: st.days.slice(-7), top: st.top.slice(0, 6), empty: st.empty.slice(0, 6), recent,
      health: { uptimeH: st.uptimeH, memMB: Math.round(process.memoryUsage().rss / 1048576), errors: errs, db: health.db ? 'postgres' : 'file', telegram: !!health.telegram, email: !!health.email, s3: !!health.s3, node: process.version } });
  });

  app.get('/api/admin/find', (req, res) => {
    if (!adminOnly(req, res)) return; const q = S(req.query.q, 60).toLowerCase(); if (q.length < 2) return res.json({ ok: true, items: [] }); const has = (...a) => a.some(v => String(v || '').toLowerCase().includes(q)), out = [], add = (k, id, title, sub, extra) => out.length < 60 && out.push({ k, id, title: small(title), sub: small(sub), ...extra });
    for (const x of users()) if (has(x.a.email, x.a.phone, x.a.name, x.pv.fullName, x.uid)) add('user', x.uid, x.pv.fullName || x.a.name || x.a.email, x.a.email + ' · ' + (x.a.phone || ''));
    const shops = col('mk/shops'); for (const s of Object.values(shops)) if (has(s.name, s.city, s.phone, s.id)) add('shop', s.id, s.name, [s.status, s.city, ui(s.uid).email].filter(Boolean).join(' · '), { status: s.status });
    for (const p of Object.values(col('mk/products'))) if (has(p.title, p.id)) add('product', p.id, p.title, [p.status, p.price + ' ብር', (shops[p.shopId] || {}).name].join(' · '), { status: p.status });
    for (const o of Object.values(col('mk/orders'))) if (has(o.id, o.shopName, o.payment && o.payment.ref)) add('order', o.id, '#' + o.id.slice(0, 8) + ' · ' + (o.shopName || ''), o.status + ' · ' + o.total + ' ብር');
    for (const w of Object.values(col('pp/workers'))) if (has(w.name, w.title, w.phone, w.id)) add('worker', w.id, w.name, [w.status, w.title, w.city].filter(Boolean).join(' · '), { status: w.status });
    for (const e of Object.values(col('pp/employers'))) if (has(e.name, e.sector, e.id)) add('employer', e.id, e.name, [e.status, e.sector, e.city].filter(Boolean).join(' · '), { status: e.status });
    for (const j of Object.values(col('pp/jobs'))) if (!j.deleted && has(j.title, j.id)) add('job', j.id, j.title, [j.status, j.city].filter(Boolean).join(' · '), { status: j.status });
    for (const g of Object.values(col('pg/pages'))) if (has(g.title, g.kind, g.id)) add('page', g.id, g.title, [g.status, g.kind, g.city].filter(Boolean).join(' · '), { status: g.status });
    res.json({ ok: true, items: out });
  });

  app.get('/api/admin/products', (req, res) => {
    if (!adminOnly(req, res)) return; const q = S(req.query.q, 60).toLowerCase(), st = S(req.query.status, 12), page = Math.max(1, Number(req.query.page) || 1), shops = col('mk/shops');
    const L = Object.values(col('mk/products')).filter(p => (!st || p.status === st) && (!q || (String(p.title) + ' ' + ((shops[p.shopId] || {}).name || '')).toLowerCase().includes(q))).sort((a, b) => (b.ts || 0) - (a.ts || 0));
    res.json({ ok: true, total: L.length, items: L.slice((page - 1) * 30, page * 30).map(p => ({ id: p.id, title: p.title, price: p.price, stock: p.stock, status: p.status, img: (p.imgs || [])[0], shop: (shops[p.shopId] || {}).name || '—', ts: p.ts })) });
  });
  app.post('/api/admin/product/:id/status', async (req, res) => {
    if (!adminOnly(req, res)) return; const p = col('mk/products')[req.params.id]; if (!p) return bad(res, 404, 'not_found'); const on = req.body.status === 'active';
    p.status = on ? 'active' : 'suspended';
    try { await saveMany([['mk/products', p.id]]); audit && await audit(on ? 'product_on' : 'product_off', p.id, '', p.title); const sh = col('mk/shops')[p.shopId]; if (!on && sh) notifyUser && notifyUser(sh.uid, `⛔ ዕቃ «${p.title}» በአድሚን ከህዝብ ተደብቋል። ለማብራሪያ አድሚኑን ያነጋግሩ።`); res.json({ ok: true, status: p.status }); } catch (e) { bad(res, 503, 'storage'); }
  });

  /* ---------- ባነር ---------- */
  const B = () => col('al/site').b || null, TONES = ['info', 'warn', 'ok'];
  app.get('/api/site/banner', (req, res) => { const b = B(); res.set('cache-control', 'public, max-age=30'); res.json({ ok: true, banner: b && b.on && b.text ? { text: b.text, tone: b.tone, link: b.link || '' } : null }); });
  app.get('/api/admin/banner', (req, res) => { if (!adminOnly(req, res)) return; res.json({ ok: true, banner: B() || { on: false, text: '', tone: 'info', link: '' } }); });
  app.post('/api/admin/banner', async (req, res) => {
    if (!adminOnly(req, res)) return; const link = S(req.body.link, 200); if (link && !/^(\/|https:\/\/)/.test(link)) return bad(res, 400, 'bad_link');
    col('al/site').b = { id: 'b', on: !!req.body.on, text: S(req.body.text, 240), tone: TONES.includes(req.body.tone) ? req.body.tone : 'info', link, ts: now() };
    try { await saveMany([['al/site', 'b']]); audit && await audit('banner', '', '', col('al/site').b.on ? 'on' : 'off'); res.json({ ok: true }); } catch (e) { bad(res, 503, 'storage'); }
  });

  /* ---------- ማስታወቂያ ---------- */
  const AUD = { all: () => true, sellers: x => Object.values(col('mk/shops')).some(s => s.uid === x.uid), workers: x => Object.values(col('pp/workers')).some(s => s.uid === x.uid), employers: x => Object.values(col('pp/employers')).some(s => s.uid === x.uid) };
  const targets = a => users().filter(x => x.pf.news !== false && (AUD[a] || AUD.all)(x));
  app.get('/api/admin/broadcast/count', (req, res) => { if (!adminOnly(req, res)) return; res.json({ ok: true, counts: Object.fromEntries(Object.keys(AUD).map(k => [k, targets(k).length])) }); });
  app.post('/api/admin/broadcast', async (req, res) => {
    if (!adminOnly(req, res)) return; const text = S(req.body.text, 1000), aud = AUD[req.body.audience] ? req.body.audience : 'all'; if (text.length < 5) return bad(res, 400, 'missing_fields');
    const m = col('al/site'); if (now() - ((m.bc || {}).ts || 0) < 3600e3) return bad(res, 429, 'slow_down');
    const T = targets(aud); m.bc = { id: 'bc', ts: now(), n: T.length }; try { await saveMany([['al/site', 'bc']]); } catch (e) { return bad(res, 503, 'storage'); }
    audit && await audit('broadcast', aud, '', text.slice(0, 80)); res.json({ ok: true, n: T.length });
    (async () => { for (const x of T) { try { notifyUser && notifyUser(x.uid, '📣 ' + text + '\n\n🔕 ዜና ለማቆም፦ አካውንት → «📣 ዜና»'); } catch (e) { } await new Promise(r => setTimeout(r, 60)); } })();
  });
  return {};
};
