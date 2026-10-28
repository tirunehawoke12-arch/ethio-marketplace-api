'use strict';
/* ===== ጤና፣ ስህተት መዝገብ፣ ትንታኔ፣ ምትኬ — ሁሉም ነፃ፣ ውጫዊ አገልግሎት የለም =====
   • ስህተቶች በማስታወሻ ውስጥ (የመጨረሻ 60) — አድሚን ይመለከታል
   • የፍለጋ ቃላት (ባዶ ውጤት ጨምሮ) → ሻጮች ምን መሸጥ እንዳለባቸው ያሳያል
   • ምትኬ፦ አድሚን አንድ ቁልፍ ሲጫን ሙሉ JSON ያወርዳል (ምስሎች ሳይጨምር) */
const DAY = 864e5, PAID = ['paid', 'preparing', 'shipped', 'delivered', 'settled'];
module.exports = function ops(ctx) {
  const { app, col, adminOnly, saveMany, getStore, now = () => Date.now() } = ctx;
  const errors = [], started = now(); let timer = null, dirty = false;
  const logErr = (where, e) => { errors.unshift({ ts: now(), where: String(where).slice(0, 80), msg: String((e && e.message) || e).slice(0, 300), stack: String((e && e.stack) || '').split('\n').slice(1, 4).join(' | ').slice(0, 300) }); errors.length = Math.min(errors.length, 60); };
  const Q = () => col('al/q').d || (col('al/q').d = { id: 'd', t: {} });
  function recordSearch(q, hits) {
    const k = String(q || '').trim().toLowerCase().slice(0, 40); if (k.length < 2) return; const t = Q().t, e = t[k] || (t[k] = { n: 0, miss: 0, last: 0 });
    e.n++; if (!hits) e.miss++; e.last = now(); dirty = true;
    const ks = Object.keys(t); if (ks.length > 400) ks.sort((a, b) => t[a].last - t[b].last).slice(0, 100).forEach(x => delete t[x]);
  }
  async function flush() { if (!dirty) return; dirty = false; try { await saveMany([['al/q', 'd']]); } catch (e) { dirty = true; } }
  function stats() {
    const t = now(), docs = getStore().docs, users = Object.keys(docs).filter(p => /^data\/users\/[\w-]+$/.test(p)).map(p => (docs[p].acct || {}).ts || 0);
    const O = Object.values(col('mk/orders')), days = [];
    for (let i = 13; i >= 0; i--) { const a = t - (i + 1) * DAY, b = t - i * DAY, o = O.filter(x => x.ts > a && x.ts <= b && PAID.includes(x.status)); days.push({ d: new Date(b + 3 * 3600e3).toISOString().slice(5, 10), users: users.filter(x => x > a && x <= b).length, orders: o.length, gmv: Math.round(o.reduce((s, x) => s + (x.total || 0), 0)) }); }
    const S = Object.entries(Q().t).map(([q, v]) => ({ q, ...v }));
    return { days, totals: { users: users.length, shops: Object.keys(col('mk/shops')).length, products: Object.keys(col('mk/products')).length, workers: Object.keys(col('pp/workers')).length, jobs: Object.keys(col('pp/jobs')).length, pages: Object.keys(col('pg/pages')).length },
      top: S.sort((a, b) => b.n - a.n).slice(0, 15), empty: S.filter(x => x.miss >= 1).sort((a, b) => b.miss - a.miss).slice(0, 15), uptimeH: Math.round((t - started) / 36e5 * 10) / 10 };
  }
  app.get('/api/admin/ops', (req, res) => { if (!adminOnly(req, res)) return; res.json({ ok: true, errors, ...stats(), mem: Math.round(process.memoryUsage().rss / 1048576) }); });
  app.get('/api/admin/backup', (req, res) => {
    if (!adminOnly(req, res)) return; const out = {}, docs = getStore().docs; for (const p of Object.keys(docs)) if (!/^_/.test(p)) out[p] = docs[p];
    res.set('content-type', 'application/json; charset=utf-8'); res.set('content-disposition', `attachment; filename="etio-backup-${new Date().toISOString().slice(0, 10)}.json"`); res.send(JSON.stringify({ at: now(), docs: out }));
  });
  process.on('unhandledRejection', e => logErr('unhandledRejection', e));
  timer = setInterval(flush, 5 * 60e3); timer.unref && timer.unref();
  const errorMw = (err, req, res, next) => { logErr(req.method + ' ' + req.path, err); console.error('route error:', err && err.message); if (res.headersSent) return next(err); res.status(500).json({ ok: false, error: 'server_error' }); };
  return { recordSearch, logErr, errorMw, flush, stats, errors: () => errors };
};
