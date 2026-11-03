'use strict';
/* ===== AI አገልግሎት — በአድሚን የሚቆጣጠር፦ ነጻ ገደብ፣ «ጥልቅ/ክፍያ ያለው» ርዕስ ሲሆን ክፍያ መጠየቅ፣ እቅዶች፣ ክፍያ ማጽደቅ፣ እውቀት (ፈጣሪ/ገበያ) =====
   ማከማቻ፦ ai/cfg (main) · ai/acc (uid → {until, blocked}) · ai/reqs (ክፍያ ጥያቄዎች)   (ሁሉም ከደንበኛ ቀጥታ መድረስ ተዘግቷል) */
const AIM = require('./ai');
const CFG = 'ai/cfg', ACC = 'ai/acc', REQ = 'ai/reqs', DAY = 86400e3, MARK = /\s*\[\[PAID\]\]\s*/g;
const DEFAULTS = {
  enabled: true, paywall: true, freeChatDay: 8, paidChatDay: 200, freePagesDay: 3, paidPagesDay: 150,
  plans: [{ id: 'w', label: '1 ሳምንት', days: 7, price: 50 }, { id: 'm', label: '1 ወር', days: 30, price: 150 }],
  premiumTopics: 'ዝርዝር የሕክምና ምርመራ፣ ሕክምና ወይም የመድኃኒት መጠን፤ የፈተና ወይም የምደባ ሙሉ መልስ/መፍትሔ፤ የሕግ ወይም የገንዘብ ጥልቅ ምክር፤ ረጅም ጽሑፍ፣ ሪፖርት ወይም የምርምር ጽሑፍ ሙሉ መጻፍ',
  creator: 'ይህ ስርዓት (ኢትዮ ዲጂታል ማርኬት እና የ Telegram ቦቱ) የተሰራው በ Tiruneh Awoke ነው። እርሱ በባሕር ዳር ዩኒቨርሲቲ (Bahir Dar University)፣ በ College of Medicine and Health Sciences የ undergraduate (የመጀመሪያ ዲግሪ) ተማሪ ነው።',
  market: 'ኢትዮ ዲጂታል ማርኬት (ethiodigitalmarket.pro.et) በመላው ኢትዮጵያ የሚሠራ የመስመር ላይ ገበያ ነው፦ ሱቆች እና ዕቃዎች (ሻጮች ሱቅ ከፍተው ይሸጣሉ)፣ ደህንነቱ የተጠበቀ ክፍያ (ገዥ በ telebirr/ባንክ ይከፍላል፣ አድሚን ያረጋግጣል፣ ዕቃው ከደረሰ በኋላ ለሻጭ ይከፈላል — ኮሚሽን ይቀነሳል)፣ ሥራ እና ሙያተኞች (አሰሪዎች፣ ሠራተኞች፣ ማመልከቻ)፣ የራስ ድረ-ገጽ/ገጾች፣ ኩፖን እና ሪፈራል፣ በአቅራቢያ መፈለግ፣ የ Telegram ቦት (ሁሉንም በ Telegram ውስጥ መጠቀም)፣ እና «የተማሪዎች መማሪያ» (ክፍያ ከፍለው ማስታወሻ/ጥያቄ/PDF/PPT በ Telegram ብቻ ማንበብ)። ቋንቋዎች፦ አማርኛ፣ እንግሊዝኛ፣ ኦሮምኛ፣ ትግርኛ።',
  extra: '',
};
const SYS_FREE = (c) => `\n\n[የአገልግሎት ደረጃ፦ ነጻ ተጠቃሚ]\nመደበኛ ጥያቄዎችን ሙሉ መልስ ስጥ። ጥያቄው ከነዚህ «ጥልቅ/የሚከፈልባቸው ርዕሶች» ከሆነ፦ ${c.premiumTopics}\n— አጭር ጠቃሚ ከፊል መልስ ብቻ ስጥ (ከ4 ዓረፍተ ነገር አይበልጥ፤ ሙሉ መፍትሔ፣ ዝርዝር ደረጃ ወይም የመድኃኒት መጠን አትስጥ) እና በመጨረሻው መስመር በትክክል [[PAID]] ጻፍ።\nአስፈላጊ ህጎች፦ ሕይወት አደጋ ወይም ድንገተኛ ሁኔታ (ራስን የማጥፋት ሐሳብ፣ መመረዝ፣ ከባድ ደም መፍሰስ፣ የደረት ሕመም፣ የትንፋሽ ችግር፣ ወዘተ) ሲኖር ሁልጊዜ ሙሉ የደህንነት መመሪያ እና አስቸኳይ እርዳታ (በአቅራቢያ ሆስፒታል፤ አዲስ አበባ አምቡላንስ 907) በነጻ ስጥ እና [[PAID]] በጭራሽ አትጻፍ። ስለ ፈጣሪ ወይም ስለ ገበያው ጥያቄዎች ሁልጊዜ ሙሉ መልስ በነጻ፤ [[PAID]] አትጻፍ።`;
const SYS_PAID = '\n\n[የአገልግሎት ደረጃ፦ የተከፈለ ተጠቃሚ]\nሙሉ እና ዝርዝር መልስ ስጥ፤ [[PAID]] በጭራሽ አትጻፍ። የሕክምና/ሕግ/ገንዘብ ጉዳይ ሲሆን ለመማሪያ መረጃ ብቻ መሆኑን እና ባለሙያ ማማከር እንደሚያስፈልግ በአንድ መስመር አስታውስ።';

module.exports = function aisvc(ctx) {
  const { app, col, who, adminOnly, saveMany, bad, S, N, nid, limit, notifyUser = () => { }, notifyAdmin = () => { }, findUid = () => null, ai = AIM.shared(), now = () => Date.now() } = ctx;
  const KB = (...r) => ({ rows: [r.map(([t, d]) => ({ text: t, callback_data: d }))] });
  const cfg = () => { const c = (col(CFG).main || {}); return { ...DEFAULTS, ...c, plans: Array.isArray(c.plans) && c.plans.length ? c.plans : DEFAULTS.plans }; };
  const acc = uid => { const a = col(ACC)[uid] || {}; return { until: a.until || 0, blocked: !!a.blocked, paid: (a.until || 0) > now() }; };
  const planOf = (c, id) => c.plans.find(p => p.id === id);
  const sysFor = (c, paid) => AIM.SYS + `\n\n[ስለ ፈጣሪ]\n${c.creator}\n\n[ስለ ገበያው]\n${c.market}${c.extra ? '\n\n[ተጨማሪ መረጃ ከአድሚን]\n' + c.extra : ''}` + (paid || !c.paywall ? SYS_PAID : SYS_FREE(c));
  const stats = { chats: 0, pages: 0, paywalls: 0 };

  /* የጽሑፍ ውይይት፦ → { ok, text, paywall: ''|'premium'|'limit' } */
  async function converse({ uid, key, text, admin }) {
    const c = cfg(); if (!ai.enabled) return { ok: false, error: 'ai_off' }; if (!c.enabled && !admin) return { ok: false, error: 'ai_disabled' };
    const a = acc(uid); if (a.blocked && !admin) return { ok: false, error: 'ai_blocked' }; const paid = admin || a.paid;
    const q = ai.take(String(uid), 'chat', 1, admin, paid ? c.paidChatDay : c.freeChatDay);
    if (!q.ok) { if (!paid && c.paywall) { stats.paywalls++; return { ok: true, text: '', paywall: 'limit' }; } return { ok: false, error: 'ai_limit' }; }
    let out; try { out = await ai.chat(String(key || uid), text, sysFor(c, paid)); } catch (e) { ai.refund(String(uid), 'chat', 1); throw e; }
    stats.chats++; const wants = /\[\[PAID\]\]/.test(out), clean = out.replace(MARK, ' ').trim();
    if (wants && !paid && c.paywall) { stats.paywalls++; return { ok: true, text: clean, paywall: 'premium' }; }
    return { ok: true, text: clean, paywall: '' };
  }
  /* የሰነድ ትርጉም ገጾች ገደብ */
  function takePages(uid, admin) {
    const c = cfg(); if (!c.enabled && !admin) return { ok: false, error: 'ai_disabled' }; const a = acc(uid); if (a.blocked && !admin) return { ok: false, error: 'ai_blocked' }; const paid = admin || a.paid;
    const q = ai.take(String(uid), 'pages', 1, admin, paid ? c.paidPagesDay : c.freePagesDay); if (q.ok) stats.pages++;
    return { ok: q.ok, paid, paywall: !q.ok && !paid && c.paywall, error: q.ok ? '' : 'ai_limit' };
  }
  const info = uid => { const c = cfg(), a = acc(uid), mine = Object.values(col(REQ)).filter(r => r.uid === uid).sort((x, y) => y.ts - x.ts)[0]; return { enabled: c.enabled && ai.enabled, paid: a.paid, until: a.until, blocked: a.blocked, plans: c.plans, free: { chat: c.freeChatDay, pages: c.freePagesDay }, usage: ai.usage(String(uid)), pending: mine && mine.status === 'pending' ? { id: mine.id, plan: mine.plan } : null, last: mine ? { status: mine.status, reason: mine.reason || '' } : null }; };

  /* ክፍያ ጥያቄ */
  async function buy(uid, b) {
    const c = cfg(), p = planOf(c, S(b.plan, 12)); if (!p) return { ok: false, error: 'not_found' }; const method = S(b.method, 20), ref = S(b.ref, 40);
    if (method.length < 2 || ref.length < 4) return { ok: false, error: 'payment_proof_required' }; if (Object.values(col(REQ)).some(r => r.uid === uid && r.status === 'pending')) return { ok: false, error: 'already_requested' };
    const k = x => String(x).toUpperCase().replace(/[\s\-_.]/g, ''); if (Object.values(col(REQ)).some(r => r.status !== 'rejected' && k(r.ref) === k(ref))) return { ok: false, error: 'duplicate_reference' };
    const u = (col('data/users/' + uid) || {}).acct || {}, r = { id: nid(), uid, plan: p.id, days: p.days, price: p.price, label: p.label, method, ref, note: S(b.note, 200), name: u.name || '', phone: u.phone || '', status: 'pending', ts: now() };
    col(REQ)[r.id] = r; try { await saveMany([[REQ, r.id]]); } catch (e) { delete col(REQ)[r.id]; return { ok: false, error: 'storage' }; }
    try { notifyAdmin(`🤖 የ AI ክፍያ ጥያቄ\n${r.name} · ${r.phone}\n📦 ${p.label} (${p.days} ቀን) — ${p.price} ብር\n💳 ${method} · ማጣቀሻ ${ref}`, KB(['✅ አጽድቅ', `aiap:${r.id}:1`], ['❌ ውድቅ', `aiap:${r.id}:0`])); } catch (e) { }
    return { ok: true, id: r.id };
  }
  async function decide(id, approve, reason) {
    const r = col(REQ)[id]; if (!r) return { ok: false, error: 'not_found' }; if (r.status !== 'pending') return { ok: false, error: 'wrong_step:' + r.status };
    if (approve) { const a = col(ACC)[r.uid] || (col(ACC)[r.uid] = { id: r.uid }); a.until = Math.max(a.until || 0, now()) + r.days * DAY; r.status = 'approved'; r.done = now(); await saveMany([[ACC, r.uid], [REQ, r.id]]); try { notifyUser(r.uid, `🤖 የ AI ክፍያዎ ተረጋግጧል!\n📦 ${r.label}\n⏳ እስከ ${new Date(a.until + 3 * 3600e3).toISOString().slice(0, 10)} ድረስ ሙሉ መልስ ያገኛሉ።`); } catch (e) { } return { ok: true, until: a.until }; }
    r.status = 'rejected'; r.reason = S(reason, 200); r.done = now(); await saveMany([[REQ, r.id]]); try { notifyUser(r.uid, `❌ የ AI ክፍያዎ አልተረጋገጠም${r.reason ? '፦ ' + r.reason : ''}። ትክክለኛ ማጣቀሻ ቁጥር ጋር እንደገና ይሞክሩ።`); } catch (e) { } return { ok: true };
  }

  /* ---------- HTTP ---------- */
  const user = (req, res) => who(req, res);
  app.get('/api/ai/info', (req, res) => { const u = user(req, res); if (!u) return; res.set('cache-control', 'no-store'); res.json({ ok: true, ready: ai.enabled, admin: !!u.admin, ...(u.admin ? { enabled: true, paid: true, plans: cfg().plans, free: {}, usage: { chat: 0, pages: 0 } } : info(u.uid)) }); });
  app.post('/api/ai/chat', async (req, res) => {
    const u = user(req, res); if (!u) return; if (!limit('aic' + u.uid, 20, 60e3)) return bad(res, 429, 'slow_down'); const text = S(req.body.text, 4000); if (!text) return bad(res, 400, 'missing_fields');
    try { const r = await converse({ uid: u.uid, key: 'w' + u.uid, text, admin: !!u.admin }); if (!r.ok) return bad(res, r.error === 'ai_limit' ? 429 : 403, r.error); res.json({ ok: true, ...r }); } catch (e) { bad(res, e.message === 'ai_busy' ? 503 : 502, e.message || 'ai_failed'); }
  });
  app.post('/api/ai/buy', async (req, res) => { const u = user(req, res); if (!u) return; if (u.admin) return bad(res, 403, 'admin_cannot'); if (!limit('aib' + u.uid, 10, 3600e3)) return bad(res, 429, 'slow_down'); const r = await buy(u.uid, req.body || {}); r.ok ? res.json(r) : bad(res, r.error === 'storage' ? 503 : r.error.startsWith('duplicate') || r.error === 'already_requested' ? 409 : 400, r.error); });
  const admin = (req, res) => adminOnly(req, res);
  app.get('/api/ai/admin/overview', (req, res) => {
    if (!admin(req, res)) return; const c = cfg(), reqs = Object.values(col(REQ)), t = now();
    const users = Object.values(col(ACC)).map(a => { const d = (col('data/users/' + a.id) || {}).acct || {}; return { uid: a.id, name: d.name || '', phone: d.phone || '', email: d.email || '', until: a.until || 0, active: (a.until || 0) > t, blocked: !!a.blocked }; }).sort((x, y) => y.until - x.until).slice(0, 200);
    res.json({ ok: true, ready: ai.enabled, provider: ai.provider, model: ai.model, cfg: c, defaults: { creator: DEFAULTS.creator, market: DEFAULTS.market, premiumTopics: DEFAULTS.premiumTopics }, stats, pending: reqs.filter(r => r.status === 'pending').length, revenue: reqs.filter(r => r.status === 'approved').reduce((a, r) => a + r.price, 0), users });
  });
  app.post('/api/ai/admin/config', async (req, res) => {
    if (!admin(req, res)) return; const b = req.body || {}, c = { ...(col(CFG).main || { id: 'main' }), id: 'main' }, n = (v, lo, hi) => Math.max(lo, Math.min(hi, Math.round(N(v)) || 0));
    if (b.enabled !== undefined) c.enabled = !!b.enabled; if (b.paywall !== undefined) c.paywall = !!b.paywall;
    for (const [k, lo, hi] of [['freeChatDay', 0, 500], ['paidChatDay', 1, 5000], ['freePagesDay', 0, 500], ['paidPagesDay', 1, 2000]]) if (b[k] !== undefined) c[k] = n(b[k], lo, hi);
    for (const k of ['premiumTopics', 'creator', 'market', 'extra']) if (b[k] !== undefined) c[k] = S(b[k], k === 'market' || k === 'extra' ? 3000 : 1200);
    if (Array.isArray(b.plans)) { const seen = new Set(), plans = []; for (const p of b.plans.slice(0, 8)) { const id = S(p.id, 12).replace(/[^\w-]/g, '') || 'p' + plans.length, days = n(p.days, 1, 3650), price = n(p.price, 0, 1e6), label = S(p.label, 40); if (!label || !days || seen.has(id)) continue; seen.add(id); plans.push({ id, label, days, price }); } if (!plans.length) return bad(res, 400, 'missing_fields'); c.plans = plans; }
    col(CFG).main = c; try { await saveMany([[CFG, 'main']]); res.json({ ok: true, cfg: cfg() }); } catch (e) { bad(res, 503, 'storage'); }
  });
  app.get('/api/ai/admin/requests', (req, res) => { if (!admin(req, res)) return; const st = S(req.query.status, 10) || 'pending'; res.json({ ok: true, items: Object.values(col(REQ)).filter(r => st === 'all' || r.status === st).sort((a, b) => b.ts - a.ts).slice(0, 200) }); });
  app.post('/api/ai/admin/requests/:id/:act', async (req, res) => { if (!admin(req, res)) return; if (!/^(approve|reject)$/.test(req.params.act)) return bad(res, 400, 'bad_action'); try { const r = await decide(req.params.id, req.params.act === 'approve', req.body && req.body.reason); r.ok ? res.json(r) : bad(res, r.error.startsWith('wrong') ? 409 : 404, r.error); } catch (e) { bad(res, 503, 'storage'); } });
  app.post('/api/ai/admin/grant', async (req, res) => {          // በስልክ/ኢሜይል ተጠቃሚን ማግኘት፤ ቀናት መስጠት (ወይም 0 = ማስወገድ) እና ማገድ
    if (!admin(req, res)) return; const b = req.body || {}, uid = findUid(S(b.q, 80)); if (!uid) return bad(res, 404, 'not_found'); const a = col(ACC)[uid] || (col(ACC)[uid] = { id: uid });
    if (b.days !== undefined) { const d = Math.max(0, Math.min(3650, Math.round(N(b.days)) || 0)); a.until = d ? Math.max(a.until || 0, now()) + d * DAY : 0; } if (b.blocked !== undefined) a.blocked = !!b.blocked;
    try { await saveMany([[ACC, uid]]); res.json({ ok: true, until: a.until || 0, blocked: !!a.blocked }); } catch (e) { bad(res, 503, 'storage'); }
  });
  return { cfg, acc, info, converse, takePages, buy, decide, stats, ai };
};
module.exports.DEFAULTS = DEFAULTS;
