'use strict';
/* ===== በድር ውስጥ መልእክት (chat) =====
   ገዥ ↔ ሻጭ፣ አሰሪ ↔ ሙያተኛ፣ ጎብኝ ↔ ገጽ ባለቤት — ስልክ ሳይለዋወጡ በመድረኩ ውስጥ ይነጋገራሉ።
   • ጀማሪው ዒላማውን (ሱቅ/ዕቃ/ሙያተኛ/አሰሪ/ሥራ/ገጽ) ይመርጣል፤ ባለቤቱ uid ለህዝብ አይታይም
   • በአንድ ጥንድ ሰዎች መካከል አንድ ውይይት
   • ተቀባይ በ Telegram ይነገረዋል (ያልተነበበ ከሌለው ብቻ — መልእክት እንዳይደጋገም)
   • ማገድ ይቻላል፤ አድሚን በአካውንት እይታ ውስጥ ማየት ይችላል (በኦዲት መዝገብ) */
module.exports = function chat(ctx) {
  const { app, col, limit, who, saveMany, bad, S, nid, userInfo, notifyUser } = ctx;
  const tell = (u, t) => { try { notifyUser && notifyUser(u, t); } catch (e) { } };
  const C = { th: 'ch/threads', ms: 'ch/msgs' };
  const OWN = { s: ['mk/shops', 'ሱቅ', x => x.name], p: ['mk/products', 'ዕቃ', (x, g) => ((g('mk/shops')[x.shopId]) || {}).name || x.title], w: ['pp/workers', 'ሙያተኛ', x => x.name], e: ['pp/employers', 'አሰሪ', x => x.name], j: ['pp/jobs', 'ሥራ', (x, g) => ((g('pp/employers')[x.employerId]) || {}).name || x.title], g: ['pg/pages', 'ገጽ', x => x.title] };
  const ownerOf = (t, x) => (t === 'p' ? (col('mk/shops')[x.shopId] || {}).uid : x.uid);
  const live = (t, x) => x && (t === 'p' ? x.status === 'active' : t === 'j' ? x.status === 'open' && !x.deleted : x.status === 'active');
  const first = uid => (userInfo(uid).name || (col('data/users/' + uid).acct || {}).name || 'ደንበኛ').split(' ')[0];
  const key = (a, b) => [a, b].sort().join('|');
  const mine = uid => Object.values(col(C.th)).filter(t => t.members.includes(uid));
  const other = (t, uid) => t.members.find(m => m !== uid);
  const view = (t, uid) => ({ id: t.id, label: (t.labels || {})[uid] || 'ተጠቃሚ', ctx: t.ctx || null, last: t.last || null, unread: (t.unread || {})[uid] | 0, blocked: !!(t.blocked || {})[uid], youBlocked: !!(t.blocked || {})[other(t, uid)] });

  app.get('/api/chat/unread', (req, res) => { const u = who(req, res); if (!u || u.admin) return u && res.json({ ok: true, n: 0 }); res.json({ ok: true, n: mine(u.uid).reduce((a, t) => a + ((t.unread || {})[u.uid] | 0), 0) }); });
  app.get('/api/chat/threads', (req, res) => { const u = who(req, res); if (!u || u.admin) return u && res.json({ ok: true, items: [] }); res.json({ ok: true, items: mine(u.uid).sort((a, b) => ((b.last || {}).ts || b.ts) - ((a.last || {}).ts || a.ts)).slice(0, 100).map(t => view(t, u.uid)) }); });

  async function post(t, u, text) {
    const now = Date.now(), m = { id: nid(), threadId: t.id, from: u.uid, text, ts: now }, to = other(t, u.uid);
    col(C.ms)[m.id] = m; t.last = { ts: now, from: u.uid, text: text.slice(0, 80) }; const wasZero = !((t.unread || {})[to] | 0); t.unread = { ...(t.unread || {}), [to]: ((t.unread || {})[to] | 0) + 1 };
    await saveMany([[C.ms, m.id], [C.th, t.id]]);
    if (wasZero) tell(to, `💬 አዲስ መልእክት ከ«${(t.labels || {})[to] || 'ተጠቃሚ'}»፦ ${text.slice(0, 100)}\nበድረ-ገጹ «💬 መልእክቶች» ውስጥ ይመልሱ።`);
    return m;
  }
  app.post('/api/chat/start', async (req, res) => {
    const u = who(req, res); if (!u || u.admin) return u && bad(res, 403, 'admin_cannot'); if (!limit('cs' + u.uid, 30, 3600e3)) return bad(res, 429, 'slow_down');
    const t = S(req.body.t, 1), def = OWN[t], x = def && col(def[0])[S(req.body.id, 24)]; if (!x || !live(t, x)) return bad(res, 404, 'not_found');
    const owner = ownerOf(t, x); if (!owner || !col('data/users/' + owner).acct) return bad(res, 404, 'not_found'); if (owner === u.uid) return bad(res, 400, 'own_profile');
    const k = key(u.uid, owner); let th = Object.values(col(C.th)).find(y => y.key === k);
    if (!th) { if (mine(u.uid).length >= 300) return bad(res, 400, 'too_many'); th = { id: nid(), key: k, members: [u.uid, owner], ts: Date.now(), labels: { [u.uid]: S(def[2](x, col), 60), [owner]: first(u.uid) }, unread: {}, blocked: {}, ctx: { t, id: x.id, title: S(def[2](x, col), 60), kind: def[1] } }; col(C.th)[th.id] = th; }
    if ((th.blocked || {})[u.uid]) return bad(res, 403, 'chat_blocked'); if ((th.blocked || {})[owner]) return bad(res, 403, 'chat_blocked');
    const text = S(req.body.text, 1000); try { if (text) await post(th, u, text); else await saveMany([[C.th, th.id]]); res.json({ ok: true, id: th.id }); } catch (e) { bad(res, 503, 'storage'); }
  });
  app.get('/api/chat/thread/:id', async (req, res) => {
    const u = who(req, res); if (!u || u.admin) return u && bad(res, 403, 'admin_cannot'); const t = col(C.th)[req.params.id]; if (!t || !t.members.includes(u.uid)) return bad(res, 404, 'not_found');
    const items = Object.values(col(C.ms)).filter(m => m.threadId === t.id).sort((a, b) => a.ts - b.ts).slice(-100).map(m => ({ id: m.id, mine: m.from === u.uid, text: m.text, ts: m.ts }));
    if ((t.unread || {})[u.uid]) { t.unread[u.uid] = 0; try { await saveMany([[C.th, t.id]]); } catch (e) { } }
    res.json({ ok: true, thread: view(t, u.uid), items });
  });
  app.post('/api/chat/thread/:id', async (req, res) => {
    const u = who(req, res); if (!u || u.admin) return u && bad(res, 403, 'admin_cannot'); if (!limit('cm' + u.uid, 40, 60e3) || !limit('ch' + u.uid, 400, 3600e3)) return bad(res, 429, 'slow_down');
    const t = col(C.th)[req.params.id]; if (!t || !t.members.includes(u.uid)) return bad(res, 404, 'not_found'); if ((t.blocked || {})[u.uid] || (t.blocked || {})[other(t, u.uid)]) return bad(res, 403, 'chat_blocked');
    const text = S(req.body.text, 1000); if (!text) return bad(res, 400, 'missing_fields');
    if (Object.values(col(C.ms)).filter(m => m.threadId === t.id).length >= 2000) return bad(res, 400, 'too_many');
    try { const m = await post(t, u, text); res.json({ ok: true, id: m.id }); } catch (e) { bad(res, 503, 'storage'); }
  });
  app.post('/api/chat/thread/:id/block', async (req, res) => {       // ማገድ / መፍቀድ — ያገደው ሰው ብቻ ሊፈታ ይችላል
    const u = who(req, res); if (!u || u.admin) return u && bad(res, 403, 'admin_cannot'); const t = col(C.th)[req.params.id]; if (!t || !t.members.includes(u.uid)) return bad(res, 404, 'not_found');
    t.blocked = { ...(t.blocked || {}) }; const o = other(t, u.uid); if (req.body.block) t.blocked[o] = u.uid; else if (t.blocked[o] === u.uid) delete t.blocked[o];
    try { await saveMany([[C.th, t.id]]); res.json({ ok: true, blocked: !!t.blocked[o] }); } catch (e) { bad(res, 503, 'storage'); }
  });
};
