'use strict';
/* ===== ማንቂያዎች (የተቀመጡ ፍለጋዎች) =====
   ተጠቃሚ «ሹፌር በአዲስ አበባ» ወይም «ሶፋ ከ 10,000 ብር በታች» ብሎ ያስቀምጣል፤ አዲስ ተዛማጅ ዕቃ/ሥራ/ሙያተኛ/ገጽ ሲመዘገብ በ Telegram ይነገረዋል።
   ዘዴ፦ በየጥቂት ደቂቃ `sweep()` ከመጨረሻው ፍተሻ በኋላ የተመዘገቡትን ያመሳስላል (በመዝገብ ጊዜ ምንም ማሰሪያ የለም → ነባር ኮድ አይነካም)። */
const AM = require('./amnorm');
module.exports = function alerts(ctx) {
  const { app, col, limit, who, saveMany, bad, S, N, nid, notifyUser, baseUrl } = ctx;
  const P = 'al/subs', KINDS = { products: '🛍 ዕቃ', jobs: '💼 ሥራ', workers: '🧑‍🔧 ሙያተኛ', pages: '🌐 ገጽ' }, MAX = 10;
  const mineL = uid => Object.values(col(P)).filter(s => s.uid === uid);
  const view = s => ({ id: s.id, q: s.q, kind: s.kind, city: s.city || '', maxPrice: s.maxPrice || 0, ts: s.ts, sent: s.sent | 0 });

  app.get('/api/alerts', (req, res) => { const u = who(req, res); if (!u || u.admin) return u && res.json({ ok: true, items: [], kinds: KINDS }); res.json({ ok: true, kinds: KINDS, items: mineL(u.uid).sort((a, b) => b.ts - a.ts).map(view) }); });
  app.post('/api/alerts', async (req, res) => {
    const u = who(req, res); if (!u || u.admin) return u && bad(res, 403, 'admin_cannot'); if (!limit('alc' + u.uid, 20, 3600e3)) return bad(res, 429, 'slow_down');
    const q = S(req.body.q, 60), kind = KINDS[req.body.kind] ? req.body.kind : ''; if (AM.tokens(q).length === 0 || !kind) return bad(res, 400, 'missing_fields');
    if (mineL(u.uid).length >= MAX) return bad(res, 400, 'alerts_full');
    const mp = N(req.body.maxPrice), s = { id: nid(), uid: u.uid, q, kind, city: S(req.body.city, 60), maxPrice: kind === 'products' && mp > 0 ? mp : 0, ts: Date.now(), last: Date.now(), sent: 0 };
    if (mineL(u.uid).some(x => x.kind === kind && AM.norm(x.q) === AM.norm(q) && AM.norm(x.city) === AM.norm(s.city) && x.maxPrice === s.maxPrice)) return bad(res, 409, 'alert_exists');
    col(P)[s.id] = s; try { await saveMany([[P, s.id]]); res.json({ ok: true, id: s.id }); } catch (e) { bad(res, 503, 'storage'); }
  });
  app.delete('/api/alerts/:id', async (req, res) => {
    const u = who(req, res); if (!u) return; const s = col(P)[req.params.id]; if (!s || s.uid !== u.uid) return bad(res, 404, 'not_found'); delete col(P)[s.id];
    try { if (ctx.pool) await ctx.pool.query('DELETE FROM kv WHERE path=$1 AND id=$2', [P, s.id]); else ctx.persist(); ctx.bump(P); res.json({ ok: true }); } catch (e) { bad(res, 503, 'storage'); }
  });

  /* አዳዲስ ነገሮችን ከ `since` በኋላ ሰብስብ */
  function fresh(kind, since) {
    const shops = col('mk/shops'), emps = col('pp/employers'), today = new Date().toISOString().slice(0, 10);
    if (kind === 'products') return Object.values(col('mk/products')).filter(p => p.ts > since && p.status === 'active' && shops[p.shopId] && shops[p.shopId].status === 'active').map(p => ({ id: p.id, owner: shops[p.shopId].uid, text: p.title + ' ' + p.desc + ' ' + p.category + ' ' + shops[p.shopId].name, city: shops[p.shopId].city, price: p.price, title: p.title, sub: `${p.price} ብር · ${shops[p.shopId].name}`, href: '/p/' + p.id, ts: p.ts }));
    if (kind === 'jobs') return Object.values(col('pp/jobs')).filter(j => j.ts > since && !j.deleted && j.status === 'open' && emps[j.employerId] && emps[j.employerId].status === 'active' && (!j.deadline || j.deadline >= today)).map(j => ({ id: j.id, owner: j.uid, text: j.title + ' ' + j.description + ' ' + j.category + ' ' + emps[j.employerId].name, city: j.city, title: j.title, sub: `${emps[j.employerId].name} · ${j.city || ''}`, href: '/jobs/' + j.id, ts: j.ts }));
    if (kind === 'workers') return Object.values(col('pp/workers')).filter(w => w.ts > since && w.status === 'active').map(w => ({ id: w.id, owner: w.uid, text: w.name + ' ' + w.title + ' ' + (w.skills || []).join(' ') + ' ' + w.about, city: w.city, title: w.name, sub: `${w.title} · ${w.city || ''}`, href: '/workers/' + w.id, ts: w.ts }));
    if (kind === 'pages') return Object.values(col('pg/pages')).filter(g => g.ts > since && g.status === 'active').map(g => ({ id: g.id, owner: g.uid, text: g.title + ' ' + g.tagline + ' ' + g.kind + ' ' + g.about, city: g.city, title: g.title, sub: [g.kind, g.city].filter(Boolean).join(' · '), href: '/site/' + g.id, ts: g.ts }));
    return [];
  }
  async function sweep(now = Date.now()) {
    const subs = Object.values(col(P)); if (!subs.length) return 0; let sent = 0; const ch = [], cache = {}, base = baseUrl || '';
    for (const s of subs) {
      const since = s.last || s.ts; (cache[s.kind + since] = cache[s.kind + since] || fresh(s.kind, since));
      const hits = cache[s.kind + since].filter(it => it.owner !== s.uid && AM.hit(it.text, s.q) && (!s.city || AM.hit(it.city || '', s.city)) && (!s.maxPrice || (it.price || 0) <= s.maxPrice)).sort((a, b) => b.ts - a.ts);
      s.last = now; ch.push([P, s.id]);
      if (!hits.length) continue;
      const top = hits.slice(0, 5), more = hits.length - top.length;
      const txt = `🔔 <b>አዲስ ተዛማጅ</b> — «${S(s.q, 40)}»${s.city ? ' · ' + s.city : ''}${s.maxPrice ? ' · ≤ ' + s.maxPrice + ' ብር' : ''}\n\n` + top.map(h => `• ${h.title}\n  ${h.sub}`).join('\n') + (more > 0 ? `\n…እና ${more} ተጨማሪ` : '');
      s.sent = (s.sent | 0) + hits.length; sent += hits.length;
      try { notifyUser(s.uid, txt.replace(/<\/?b>/g, ''), { rows: [...top.filter(h => /^https:/.test(base)).map(h => [{ text: ('👁 ' + h.title).slice(0, 60), url: base + h.href }]), [{ text: '🔕 ይህን ማንቂያ ሰርዝ', callback_data: 'aldel:' + s.id }]] }); } catch (e) { }
    }
    try { await saveMany(ch); } catch (e) { }
    return sent;
  }
  return { sweep };
};
