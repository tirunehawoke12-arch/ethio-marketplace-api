'use strict';
/* ===== ኩፖን (ቅናሽ ኮድ) =====
   • የሱቅ ኩፖን፦ ሻጭ ለራሱ ሱቅ ይፈጥራል — ቅናሹን ሻጩ ይሸፍናል (ኮሚሽን ከቅናሽ በኋላ ባለው ዋጋ)
   • የጣቢያ ኩፖን፦ አድሚን ይፈጥራል — ቅናሹን መድረኩ ከኮሚሽኑ ይሸፍናል፤ ሻጩ ሙሉ ክፍያውን ያገኛል
   • ገደቦች፦ ቢያንስ ግዢ፣ ጠቅላላ ብዛት፣ በአንድ ሰው ብዛት፣ ማብቂያ ቀን፣ (አማራጭ) ለአንድ ተጠቃሚ ብቻ
   • አጠቃቀም የሚቆጠረው ከትዕዛዞች ነው (የተሰረዘ ትዕዛዝ አይቆጠርም) → ምንም የተናጠል ቆጣሪ አይበላሽም */
module.exports = function coupons(ctx) {
  const { app, col, limit, who, saveMany, bad, S, N, nid, adminOnly, hooks, now = () => Date.now() } = ctx;
  const P = 'mk/coupons', MAXSHOP = 20;
  const norm = c => S(c, 24).toUpperCase().replace(/[^A-Z0-9ሀ-፿_-]/g, '');
  const shopOf = uid => Object.values(col('mk/shops')).find(s => s.uid === uid);
  const live = o => o.coupon && o.status !== 'cancelled';
  const usage = (c, uid) => { let all = 0, mine = 0; for (const o of Object.values(col('mk/orders'))) if (live(o) && o.coupon.id === c.id) { all++; if (uid && o.buyerUid === uid) mine++; } return { all, mine }; };
  const view = c => ({ id: c.id, code: c.code, scope: c.scope, kind: c.kind, value: c.value, minSubtotal: c.minSubtotal || 0, maxUses: c.maxUses || 0, perUser: c.perUser || 1, expires: c.expires || '', status: c.status, forUid: c.forUid ? 'yes' : '', used: usage(c).all, ts: c.ts });
  const expired = c => c.expires && c.expires < new Date(now() + 3 * 3600e3).toISOString().slice(0, 10);

  /* groups = [{shopId, subtotal}] → { ok, coupon, per: {shopId: ቅናሽ}, total } */
  function quote(code, uid, groups) {
    const k = norm(code), c = Object.values(col(P)).find(x => x.code === k && x.status === 'active'); if (!c) return { ok: false, error: 'coupon_invalid' };
    if (expired(c)) return { ok: false, error: 'coupon_expired' }; if (c.forUid && c.forUid !== uid) return { ok: false, error: 'coupon_invalid' };
    const u = usage(c, uid); if (c.maxUses && u.all >= c.maxUses) return { ok: false, error: 'coupon_used_up' }; if (u.mine >= (c.perUser || 1)) return { ok: false, error: 'coupon_user_limit' };
    const mine = groups.filter(g => c.scope === 'site' || g.shopId === c.shopId); if (!mine.length) return { ok: false, error: 'coupon_not_applicable' };
    const per = {}; let total = 0, minFail = false, left = c.maxUses ? c.maxUses - u.all : 99, leftU = (c.perUser || 1) - u.mine;
    for (const g of mine) { if (left < 1 || leftU < 1) break; if (g.subtotal < (c.minSubtotal || 0)) { minFail = true; continue; } const d = Math.min(g.subtotal, c.kind === 'pct' ? Math.round(g.subtotal * c.value) / 100 : c.value); if (d > 0) { per[g.shopId] = d; total += d; left--; leftU--; } }
    if (!total) return { ok: false, error: minFail ? 'coupon_min:' + c.minSubtotal : 'coupon_not_applicable' };
    return { ok: true, coupon: { id: c.id, code: c.code, scope: c.scope }, per, total: Math.round(total * 100) / 100 };
  }
  hooks.coupon = { quote };

  function parse(b, forUid) {
    const kind = b.kind === 'fixed' ? 'fixed' : 'pct', value = N(b.value); if (!(value > 0) || (kind === 'pct' ? value > 90 : value > 100000)) return { error: 'bad_value' };
    const code = norm(b.code); if (code.length < 4) return { error: 'bad_code' }; const exp = S(b.expires, 10); if (exp && !/^\d{4}-\d{2}-\d{2}$/.test(exp)) return { error: 'bad_date' };
    if (Object.values(col(P)).some(x => x.code === code && x.status === 'active')) return { error: 'code_taken' };
    return { c: { id: nid(), code, kind, value, minSubtotal: Math.max(0, N(b.minSubtotal)), maxUses: Math.max(0, Math.floor(N(b.maxUses))), perUser: Math.max(1, Math.floor(N(b.perUser)) || 1), expires: exp, status: 'active', ts: now(), ...(forUid ? { forUid } : {}) } };
  }

  /* ---------- ሻጭ ---------- */
  app.get('/api/coupons/my', (req, res) => { const u = who(req, res); if (!u || u.admin) return u && bad(res, 403, 'admin_cannot'); const s = shopOf(u.uid); res.json({ ok: true, hasShop: !!s, items: s ? Object.values(col(P)).filter(c => c.shopId === s.id).sort((a, b) => b.ts - a.ts).map(view) : [] }); });
  app.post('/api/coupons', async (req, res) => {
    const u = who(req, res); if (!u || u.admin) return u && bad(res, 403, 'admin_cannot'); if (!limit('cpn' + u.uid, 20, 3600e3)) return bad(res, 429, 'slow_down'); const s = shopOf(u.uid); if (!s) return bad(res, 400, 'no_shop');
    if (Object.values(col(P)).filter(c => c.shopId === s.id && c.status === 'active').length >= MAXSHOP) return bad(res, 400, 'too_many');
    const r = parse(req.body); if (r.error) return bad(res, 400, r.error); r.c.scope = 'shop'; r.c.shopId = s.id; col(P)[r.c.id] = r.c;
    try { await saveMany([[P, r.c.id]]); res.json({ ok: true, id: r.c.id }); } catch (e) { bad(res, 503, 'storage'); }
  });
  app.post('/api/coupons/:id/off', async (req, res) => {
    const u = who(req, res); if (!u || u.admin) return u && bad(res, 403, 'admin_cannot'); const c = col(P)[req.params.id], s = shopOf(u.uid); if (!c || !s || c.shopId !== s.id) return bad(res, 404, 'not_found');
    c.status = c.status === 'active' ? 'off' : 'active'; if (c.status === 'active' && Object.values(col(P)).some(x => x.id !== c.id && x.code === c.code && x.status === 'active')) { c.status = 'off'; return bad(res, 409, 'code_taken'); }
    try { await saveMany([[P, c.id]]); res.json({ ok: true, status: c.status }); } catch (e) { bad(res, 503, 'storage'); }
  });

  /* ---------- ገዥ፦ ቅድመ-እይታ ---------- */
  app.post('/api/market/coupon/check', (req, res) => {
    const u = who(req, res); if (!u || u.admin) return u && bad(res, 403, 'admin_cannot'); if (!limit('cpc' + u.uid, 60, 3600e3)) return bad(res, 429, 'slow_down');
    const g = {}; for (const it of (Array.isArray(req.body.items) ? req.body.items.slice(0, 40) : [])) { const p = col('mk/products')[S(it.pid, 24)], q = parseInt(it.qty); if (p && q >= 1 && q <= 99) g[p.shopId] = (g[p.shopId] || 0) + p.price * q; }
    const r = quote(req.body.coupon, u.uid, Object.entries(g).map(([shopId, subtotal]) => ({ shopId, subtotal: Math.round(subtotal * 100) / 100 }))); res.json(r.ok ? { ok: true, code: r.coupon.code, discount: r.total } : r);
  });

  /* ---------- አድሚን (የጣቢያ ኩፖን) ---------- */
  app.get('/api/admin/coupons', (req, res) => { if (!adminOnly(req, res)) return; res.json({ ok: true, items: Object.values(col(P)).sort((a, b) => b.ts - a.ts).slice(0, 200).map(c => ({ ...view(c), shop: c.shopId ? (col('mk/shops')[c.shopId] || {}).name || '' : '' })) }); });
  app.post('/api/admin/coupons', async (req, res) => {
    if (!adminOnly(req, res)) return; const r = parse(req.body); if (r.error) return bad(res, 400, r.error); r.c.scope = 'site'; col(P)[r.c.id] = r.c;
    try { await saveMany([[P, r.c.id]]); res.json({ ok: true, id: r.c.id }); } catch (e) { bad(res, 503, 'storage'); }
  });
  app.post('/api/admin/coupons/:id/off', async (req, res) => {
    if (!adminOnly(req, res)) return; const c = col(P)[req.params.id]; if (!c) return bad(res, 404, 'not_found'); c.status = c.status === 'active' ? 'off' : 'active';
    if (c.status === 'active' && Object.values(col(P)).some(x => x.id !== c.id && x.code === c.code && x.status === 'active')) { c.status = 'off'; return bad(res, 409, 'code_taken'); }
    try { await saveMany([[P, c.id]]); res.json({ ok: true, status: c.status }); } catch (e) { bad(res, 503, 'storage'); }
  });
  /* ለሌሎች ሞጁሎች (ሪፈራል ሽልማት) — የግል ኩፖን */
  async function issue({ forUid, value, minSubtotal, days, prefix }) {
    let code; do { code = (prefix || 'GIFT') + '-' + Math.random().toString(36).slice(2, 7).toUpperCase(); } while (Object.values(col(P)).some(x => x.code === code));
    const exp = new Date(now() + (days || 30) * 864e5 + 3 * 3600e3).toISOString().slice(0, 10), c = { id: nid(), code, kind: 'fixed', value, minSubtotal: minSubtotal || 0, maxUses: 1, perUser: 1, expires: exp, status: 'active', ts: now(), scope: 'site', forUid };
    col(P)[c.id] = c; await saveMany([[P, c.id]]); return c;
  }
  return { quote, issue, view, norm };
};
