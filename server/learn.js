'use strict';
/* ===== ተማሪ ፋይል አንባቢ (Telegram mini app ብቻ) =====
   መምህር፦ .pptx ይጭናል (በአሳሹ ወደ ጽሑፍ+ምስል ተቀይሮ) + የተማሪ ዝርዝር (ስም፣ ID) + የመክፈቻ መስኮት
   ተማሪ፦ በቦቱ «📖 ክፈት» (web_app) → Telegram initData በሰርቨር (HMAC) ይረጋገጣል → ስም + ID ከዝርዝሩ ጋር → «ፋይሉን ክፈት» → ተከታታይ ንባብ (scroll)
   ጥበቃ፦ initData ከሌለ ምንም አይከፈትም፤ ID ከመጀመሪያው Telegram አካውንት ጋር ይታሰራል (መምህር ብቻ ይፈታል)፤
          ምስሎች ከክፍለ-ጊዜ ጋር ብቻ፤ ሙከራ ገደብ፤ ማን መቼ እንዳየ ይመዘገባል። (ስክሪን ፎቶን 100% መከልከል አይቻልም) */
const crypto = require('crypto'), AM = require('./amnorm'), imgstore = require('./imgstore');
const D = 'ln/decks', M = 'ln/media', V = 'ln/views', R = 'ln/reqs', ST = 'ln/studs', CATS = ['አጭር ማስታወሻ', 'ጥያቄዎች', 'ፒፒቲ', 'PDF', 'ሰነድ'], SESSION = 3 * 3600e3, AUTH_AGE = 24 * 3600e3;
const LIM = { decks: 300, slides: 300, blocks: 120, text: 1500, rows: 40, media: 150, mediaBytes: 24 * 1048576, roster: 600 };

function checkInitData(initData, botToken, now = Date.now()) {          // https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
  try {
    const p = new URLSearchParams(String(initData || '')), hash = p.get('hash'); if (!hash || !botToken) return null; p.delete('hash');
    const str = [...p.entries()].map(([k, v]) => k + '=' + v).sort().join('\n'), secret = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest(), h = crypto.createHmac('sha256', secret).update(str).digest('hex');
    const a = Buffer.from(h), b = Buffer.from(hash); if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
    const ad = Number(p.get('auth_date')) * 1000; if (!ad || now - ad > AUTH_AGE || ad - now > 300e3) return null; const u = JSON.parse(p.get('user') || 'null'); return u && u.id ? { id: String(u.id), first: u.first_name || '' } : null;
  } catch (e) { return null; }
}
const sidNorm = x => String(x || '').toUpperCase().replace(/[\s\-_/.]/g, '');
const firstOf = n => AM.norm(String(n || '').trim().split(/\s+/)[0] || '');

module.exports = function learn(ctx) {
  const { app, col, limit, who, adminOnly, notifyUser = () => { }, notifyAdmin = () => { }, saveMany, bad, S, N, nid, token, botUsername = '', miniShort = '', baseUrl = '', pool, persist, bump, now = () => Date.now() } = ctx;
  const imgs = ctx.imgs || imgstore.create(), sess = new Map();
  const ti = setInterval(() => { for (const [k, v] of sess) if (v.exp < now()) sess.delete(k); }, 10 * 60e3); ti.unref && ti.unref();
  const mine = (req, res) => (adminOnly(req, res) ? { uid: 'admin', admin: true } : null);          // መምህር = አድሚን ብቻ
  const own = (u, id) => col(D)[id] || null;
  const open = d => d.status === 'on' && (!d.opens || d.opens <= now()) && (!d.closes || d.closes >= now());
  const ymd = (t) => (t ? new Date(t + 3 * 3600e3).toISOString().slice(0, 10) : '');
  async function drop(path, id) { delete col(path)[id]; if (pool) await pool.query('DELETE FROM kv WHERE path=$1 AND id=$2', [path, id]); else persist && persist(); bump && bump(path); }

  /* ---------- መምህር ---------- */
  const brief = d => ({ price: d.price | 0, cat: d.cat || '', listed: !!d.listed, id: d.id, title: d.title, status: d.status, slides: (d.slides || []).length, students: (d.roster || []).length, bound: (d.roster || []).filter(r => r.tg).length, opens: ymd(d.opens), closes: ymd(d.closes), isOpen: open(d), ts: d.ts });
  app.get('/api/learn/decks', (req, res) => { const u = mine(req, res); if (!u) return; res.json({ ok: true, bot: botUsername, short: miniShort, items: Object.values(col(D)).sort((a, b) => b.ts - a.ts).map(brief) }); });
  app.post('/api/learn/decks', async (req, res) => {
    const u = mine(req, res); if (!u) return; if (!limit('ld' + u.uid, 30, 3600e3)) return bad(res, 429, 'slow_down'); const title = S(req.body.title, 120); if (title.length < 2) return bad(res, 400, 'missing_fields');
    if (Object.keys(col(D)).length >= LIM.decks) return bad(res, 400, 'too_many');
    const d = { id: nid(), uid: u.uid, title, status: 'off', slides: [], roster: [], ts: now() }; col(D)[d.id] = d; try { await saveMany([[D, d.id]]); res.json({ ok: true, id: d.id }); } catch (e) { bad(res, 503, 'storage'); }
  });
  app.get('/api/learn/decks/:id', (req, res) => {
    const u = mine(req, res); if (!u) return; const d = own(u, req.params.id); if (!d) return bad(res, 404, 'not_found'); const views = Object.values(col(V)).filter(v => v.deck === d.id);
    res.json({ ok: true, bot: botUsername, short: miniShort, cats: CATS, deck: { ...brief(d), desc: d.desc || '' }, roster: d.roster.map(r => { const v = views.find(x => x.sid === r.id) || {}; return { name: r.name, id: r.id, bound: !!r.tg, opened: v.n | 0, last: v.last || 0, max: v.max | 0 }; }), slidesN: d.slides.length });
  });
  app.post('/api/learn/decks/:id/media', async (req, res) => {
    const u = mine(req, res); if (!u) return; const d = own(u, req.params.id); if (!d) return bad(res, 404, 'not_found'); if (!limit('lm' + u.uid, 200, 3600e3)) return bad(res, 429, 'slow_down');
    const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body.dataUrl || '')); if (!m || m[2].length > 520000) return bad(res, 400, 'bad_image');
    const mine_ = Object.values(col(M)).filter(x => x.deck === d.id); if (mine_.length >= LIM.media || mine_.reduce((a, x) => a + x.sz, 0) > LIM.mediaBytes) return bad(res, 400, 'too_many');
    const b = Buffer.from(m[2], 'base64'), hex = b.slice(0, 12).toString('hex'); if (!((m[1] === 'image/jpeg' && hex.startsWith('ffd8ff')) || (m[1] === 'image/png' && hex.startsWith('89504e47')) || (m[1] === 'image/webp' && b.slice(0, 4).toString() === 'RIFF'))) return bad(res, 400, 'bad_image');
    const id = nid(), doc = { id, deck: d.id, m: m[1], sz: b.length, ts: now() };
    if (imgs.enabled) { try { const k = 'learn/' + id; await imgs.put(k, b, m[1]); doc.k = k; } catch (e) { console.error('learn media store failed:', e.message); } } if (!doc.k) doc.d = m[2];
    col(M)[id] = doc; try { await saveMany([[M, id]]); res.json({ ok: true, id }); } catch (e) { bad(res, 503, 'storage'); }
  });
  app.post('/api/learn/decks/:id/content', async (req, res) => {
    const u = mine(req, res); if (!u) return; const d = own(u, req.params.id); if (!d) return bad(res, 404, 'not_found'); const raw = Array.isArray(req.body.slides) ? req.body.slides : []; if (!raw.length || raw.length > LIM.slides) return bad(res, 400, 'bad_content');
    const ok = new Set(Object.values(col(M)).filter(x => x.deck === d.id).map(x => x.id)), slides = [];
    for (const s of raw) { const blocks = []; for (const b of (Array.isArray(s.blocks) ? s.blocks : []).slice(0, LIM.blocks)) {
      if (b.k === 'h' || b.k === 'p') blocks.push({ k: b.k, t: S(b.t, LIM.text) }); else if (b.k === 'li') blocks.push({ k: 'li', t: S(b.t, LIM.text), l: Math.max(0, Math.min(3, N(b.l) | 0)) });
      else if (b.k === 'tbl') blocks.push({ k: 'tbl', rows: (Array.isArray(b.rows) ? b.rows : []).slice(0, LIM.rows).map(r => (Array.isArray(r) ? r : []).slice(0, 12).map(c => S(c, 300))) });
      else if (b.k === 'img' && ok.has(b.m)) blocks.push({ k: 'img', m: b.m, alt: S(b.alt, 200) }); }
      slides.push({ title: S(s.title, 200), blocks: blocks.filter(b => b.k !== 'p' && b.k !== 'h' && b.k !== 'li' ? true : b.t) }); }
    d.slides = slides; try { await saveMany([[D, d.id]]); res.json({ ok: true, slides: slides.length }); } catch (e) { bad(res, 503, 'storage'); }
  });
  app.post('/api/learn/decks/:id/settings', async (req, res) => {
    const u = mine(req, res); if (!u) return; const d = own(u, req.params.id); if (!d) return bad(res, 404, 'not_found'); const b = req.body;
    if (b.price !== undefined) d.price = Math.max(0, Math.min(1e6, Math.round(N(b.price)) || 0)); if (b.cat !== undefined) d.cat = CATS.includes(b.cat) ? b.cat : ''; if (b.desc !== undefined) d.desc = S(b.desc, 400); if (b.listed !== undefined) d.listed = !!b.listed;
    if (b.title !== undefined) { const t = S(b.title, 120); if (t.length < 2) return bad(res, 400, 'missing_fields'); d.title = t; } if (b.status !== undefined) d.status = b.status === 'on' ? 'on' : 'off';
    if (b.opens !== undefined) d.opens = /^\d{4}-\d{2}-\d{2}$/.test(b.opens) ? Date.parse(b.opens + 'T00:00:00+03:00') : 0; if (b.closes !== undefined) d.closes = /^\d{4}-\d{2}-\d{2}$/.test(b.closes) ? Date.parse(b.closes + 'T23:59:59+03:00') : 0;
    if (b.roster !== undefined) {
      const old = Object.fromEntries((d.roster || []).map(r => [r.id, r])), seen = new Set(), out = [];
      for (const line of String(b.roster).split(/\r?\n/).slice(0, 2000)) { const m = /^\s*(.+?)\s*[,;\t|]\s*([^\s,;|]+)\s*$/.exec(line) || /^\s*(.+?)\s+([A-Za-z]*\d[\w\-/.]*)\s*$/.exec(line); if (!m) continue; const name = S(m[1], 60), id = sidNorm(m[2]); if (!name || id.length < 2 || id.length > 20 || seen.has(id)) continue; seen.add(id); const o = old[id]; out.push({ name, id, ...(o && firstOf(o.name) === firstOf(name) && o.tg ? { tg: o.tg, bound: o.bound } : {}) }); }
      if (out.length > LIM.roster) return bad(res, 400, 'too_many'); d.roster = out;
    }
    try { await saveMany([[D, d.id]]); res.json({ ok: true, deck: brief(d) }); } catch (e) { bad(res, 503, 'storage'); }
  });
  app.post('/api/learn/decks/:id/reset', async (req, res) => {
    const u = mine(req, res); if (!u) return; const d = own(u, req.params.id); if (!d) return bad(res, 404, 'not_found'); const r = d.roster.find(x => x.id === sidNorm(req.body.sid)); if (!r) return bad(res, 404, 'not_found');
    delete r.tg; delete r.bound; for (const [k, v] of sess) if (v.deck === d.id && v.sid === r.id) sess.delete(k); try { await saveMany([[D, d.id]]); res.json({ ok: true }); } catch (e) { bad(res, 503, 'storage'); }
  });
  app.delete('/api/learn/decks/:id', async (req, res) => {
    const u = mine(req, res); if (!u) return; const d = own(u, req.params.id); if (!d) return bad(res, 404, 'not_found');
    try { for (const m of Object.values(col(M)).filter(x => x.deck === d.id)) { if (m.k && imgs.enabled) { try { await imgs.del(m.k); } catch (e) { } } await drop(M, m.id); }
      for (const v of Object.values(col(V)).filter(x => x.deck === d.id)) await drop(V, v.id); for (const [k, v] of sess) if (v.deck === d.id) sess.delete(k); await drop(D, d.id); res.json({ ok: true }); } catch (e) { bad(res, 503, 'storage'); }
  });

  /* ---------- ተማሪ (የ Telegram initData ግዴታ) ---------- */
  app.get('/api/learn/public/:id', (req, res) => { const d = col(D)[req.params.id]; res.set('cache-control', 'no-store'); if (!d) return bad(res, 404, 'not_found'); res.json({ ok: true, title: d.title, open: open(d), bot: botUsername }); });
  app.post('/api/learn/auth', (req, res) => {
    res.set('cache-control', 'no-store'); const tg = checkInitData(req.body.initData, token, now()); if (!tg) return bad(res, 401, 'telegram_only');
    const fk = 'la' + tg.id; if (!limit(fk, 12, 15 * 60e3)) return bad(res, 429, 'slow_down');
    const d = col(D)[S(req.body.deck, 24)]; if (!d) return bad(res, 404, 'not_found'); if (!open(d)) return bad(res, 403, 'deck_closed');
    const name = firstOf(req.body.name), sid = sidNorm(req.body.sid), r = d.roster.find(x => x.id === sid);
    if (!name || !r || firstOf(r.name) !== name) { return bad(res, 403, 'wrong_credentials'); }
    if (r.tg && r.tg !== tg.id) return bad(res, 403, 'id_in_use'); const other = d.roster.find(x => x.tg === tg.id && x.id !== r.id); if (other) return bad(res, 403, 'tg_other_id');
    const done = async () => { const t = crypto.randomBytes(24).toString('hex'); sess.set(t, { deck: d.id, sid: r.id, name: r.name, tg: tg.id, exp: now() + SESSION }); res.json({ ok: true, token: t, name: r.name.split(/\s+/)[0], sid: r.id, title: d.title, slides: d.slides.length }); };
    if (!r.tg) { r.tg = tg.id; r.bound = now(); saveMany([[D, d.id]]).then(done, () => bad(res, 503, 'storage')); } else done();
  });
  app.post('/api/learn/library', (req, res) => {          // ተማሪው ስም+ID ካስገባ በኋላ የተፈቀዱለትን ሁሉንም (ክፍት) ፋይሎች ይዘረዝራል
    res.set('cache-control', 'no-store'); const tg = checkInitData(req.body.initData, token, now()); if (!tg) return bad(res, 401, 'telegram_only');
    if (!limit('la' + tg.id, 12, 15 * 60e3)) return bad(res, 429, 'slow_down');
    const name = firstOf(req.body.name), sid = sidNorm(req.body.sid); if (!name || !sid) return bad(res, 403, 'wrong_credentials');
    let blocked = false, items = [];
    for (const d of Object.values(col(D))) {
      if (!open(d) || !Array.isArray(d.roster)) continue; const r = d.roster.find(x => x.id === sid); if (!r || firstOf(r.name) !== name) continue;
      if ((r.tg && r.tg !== tg.id) || d.roster.some(x => x.tg === tg.id && x.id !== r.id)) { blocked = true; continue; }
      const v = col(V)[d.id + ':' + r.id], n = (d.slides || []).length; items.push({ id: d.id, title: d.title, slides: n, pct: v && n ? Math.min(100, Math.round(((v.max | 0) / n) * 100)) : 0, ts: d.ts || 0 });
    }
    if (!items.length) return bad(res, 403, blocked ? 'id_in_use' : 'wrong_credentials');
    items.sort((a, b) => b.ts - a.ts); res.json({ ok: true, name: name, items: items.slice(0, 60).map(({ ts, ...o }) => o) });
  });

  /* ---------- ክፍያ ያላቸው ፋይሎች፦ ካታሎግ · ግዢ ጥያቄ · አድሚን ማጽደቅ ---------- */
  const rkey = x => String(x == null ? '' : x).toUpperCase().replace(/[\s\-_.]/g, '');
  const catItem = d => ({ id: d.id, title: d.title, desc: d.desc || '', cat: d.cat || '', price: d.price | 0, slides: (d.slides || []).length });
  const listable = d => d.listed && open(d) && (d.slides || []).length > 0;
  const link = id => botUsername ? (miniShort ? `https://t.me/${botUsername}/${miniShort}?startapp=d_${id}` : `https://t.me/${botUsername}?start=d_${id}`) : '';
  const allIds = () => { const s = new Set(); for (const d of Object.values(col(D))) for (const r of d.roster || []) s.add(r.id); for (const x of Object.values(col(ST))) s.add(x.sid); return s; };
  const newSid = () => { const used = allIds(); for (let i = 0; i < 400; i++) { const id = 'ST' + String(1000 + crypto.randomInt(9000)); if (!used.has(id)) return id; } return 'ST' + Date.now().toString(36).toUpperCase().slice(-6); };
  app.get('/api/learn/catalog', (req, res) => { res.set('cache-control', 'no-store'); res.json({ ok: true, cats: CATS, items: Object.values(col(D)).filter(listable).sort((a, b) => b.ts - a.ts).map(catItem) }); });
  app.get('/api/learn/my', (req, res) => {
    const u = who(req, res); if (!u) return; if (u.admin) return res.json({ ok: true, student: null, items: [] }); res.set('cache-control', 'no-store'); const st = col(ST)[u.uid];
    res.json({ ok: true, bot: botUsername, home: botUsername ? (miniShort ? `https://t.me/${botUsername}/${miniShort}` : `https://t.me/${botUsername}?start=lib`) : '', student: st ? { name: st.name.split(/\s+/)[0], sid: st.sid } : null,
      items: Object.values(col(R)).filter(r => r.uid === u.uid).sort((a, b) => b.ts - a.ts).map(r => { const d = col(D)[r.deck] || {}; return { id: r.id, deck: r.deck, title: d.title || '(ተሰርዟል)', cat: d.cat || '', price: r.price, status: r.status, reason: r.reason || '', link: r.status === 'approved' ? link(r.deck) : '' }; }) });
  });
  async function grant(r, d) {          // ተማሪውን በፋይሉ ዝርዝር ውስጥ መመዝገብ (ስም + ID)
    let st = col(ST)[r.uid]; if (!st) st = col(ST)[r.uid] = { id: r.uid, uid: r.uid, name: r.name, sid: newSid(), ts: now() };
    d.roster = d.roster || []; if (!d.roster.some(x => x.id === st.sid)) { if (d.roster.length >= LIM.roster) throw new Error('roster_full'); d.roster.push({ name: st.name, id: st.sid }); }
    r.status = 'approved'; r.sid = st.sid; r.done = now(); await saveMany([[D, d.id], [R, r.id], [ST, st.id]]); return st;
  }
  app.post('/api/learn/buy', async (req, res) => {
    const u = who(req, res); if (!u) return; if (u.admin) return bad(res, 403, 'admin_cannot'); if (!limit('lb' + u.uid, 10, 3600e3)) return bad(res, 429, 'slow_down'); const b = req.body || {};
    const d = col(D)[S(b.deck, 24)]; if (!d || !listable(d)) return bad(res, 404, 'not_found');
    const prev = Object.values(col(R)).find(r => r.uid === u.uid && r.deck === d.id && r.status !== 'rejected'); if (prev) return bad(res, 409, prev.status === 'approved' ? 'already_have' : 'already_requested');
    const st = col(ST)[u.uid], name = st ? st.name : S(b.name, 60), price = d.price | 0; if (name.length < 2) return bad(res, 400, 'missing_fields');
    const method = S(b.method, 20), ref = S(b.ref, 40); if (price > 0) { if (!method || ref.length < 4) return bad(res, 400, 'payment_proof_required'); const k = rkey(ref); if (Object.values(col(R)).some(x => x.status !== 'rejected' && x.ref && rkey(x.ref) === k)) return bad(res, 409, 'duplicate_reference'); }
    const r = { id: nid(), uid: u.uid, deck: d.id, name, phone: S(b.phone, 20), method, ref, note: S(b.note, 200), price, status: 'pending', ts: now() }; col(R)[r.id] = r;
    try {
      if (price === 0) { await grant(r, d); return res.json({ ok: true, status: 'approved' }); }
      await saveMany([[R, r.id]]); res.json({ ok: true, status: 'pending' });
      try { notifyAdmin(`🎓 አዲስ የመማሪያ ክፍያ ጥያቄ\n${name} · ${r.phone}\n📖 ${d.title} — ${price} ብር\n💳 ${method} · ማጣቀሻ ${ref}`); } catch (e) { }
    } catch (e) { delete col(R)[r.id]; bad(res, e.message === 'roster_full' ? 400 : 503, e.message === 'roster_full' ? 'too_many' : 'storage'); }
  });
  app.get('/api/learn/admin/requests', (req, res) => {
    if (!mine(req, res)) return; const s = S(req.query.status, 10) || 'pending';
    res.json({ ok: true, items: Object.values(col(R)).filter(r => s === 'all' || r.status === s).sort((a, b) => b.ts - a.ts).slice(0, 300).map(r => { const d = col(D)[r.deck] || {}; return { id: r.id, name: r.name, phone: r.phone, title: d.title || '(ተሰርዟል)', price: r.price, method: r.method, ref: r.ref, note: r.note, status: r.status, sid: r.sid || '', ts: r.ts, reason: r.reason || '' }; }), pending: Object.values(col(R)).filter(r => r.status === 'pending').length });
  });
  app.post('/api/learn/admin/requests/:id/:act', async (req, res) => {
    if (!mine(req, res)) return; const r = col(R)[req.params.id]; if (!r) return bad(res, 404, 'not_found'); if (r.status !== 'pending') return bad(res, 409, 'wrong_step:' + r.status); const d = col(D)[r.deck];
    try {
      if (req.params.act === 'approve') {
        if (!d) return bad(res, 404, 'not_found'); const st = await grant(r, d);
        try { notifyUser(r.uid, `🎓 ክፍያዎ ተረጋግጧል!\n📖 ${d.title}\n\n👤 ስም፦ ${st.name.split(/\s+/)[0]}\n🆔 የተማሪ ID፦ ${st.sid}\n\nበ Telegram ውስጥ ብቻ ይነበባል፤ በድረ-ገጹ «🎓 የተማሪዎች መማሪያ» ገጽ ላይ አገናኙን ያገኛሉ።`); } catch (e) { }
        return res.json({ ok: true, sid: st.sid });
      }
      if (req.params.act === 'reject') { r.status = 'rejected'; r.reason = S(req.body && req.body.reason, 200); r.done = now(); await saveMany([[R, r.id]]); try { notifyUser(r.uid, `❌ የመማሪያ ክፍያዎ አልተረጋገጠም (${d ? d.title : ''})${r.reason ? '፦ ' + r.reason : ''}። ትክክለኛ ማጣቀሻ ቁጥር ጋር እንደገና ይሞክሩ።`); } catch (e) { } return res.json({ ok: true }); }
      bad(res, 400, 'bad_action');
    } catch (e) { bad(res, e.message === 'roster_full' ? 400 : 503, e.message === 'roster_full' ? 'too_many' : 'storage'); }
  });
  const sessOf = (t) => { const s = sess.get(String(t || '')); if (!s || s.exp < now()) { sess.delete(String(t || '')); return null; } const d = col(D)[s.deck]; return d && open(d) ? { s, d } : null; };
  app.get('/api/learn/read', async (req, res) => {
    res.set({ 'cache-control': 'no-store', 'x-robots-tag': 'noindex' }); const x = sessOf(req.headers['x-learn']); if (!x) return bad(res, 401, 'session_expired');
    const id = x.d.id + ':' + x.s.sid, v = col(V)[id] || (col(V)[id] = { id, deck: x.d.id, sid: x.s.sid, name: x.s.name, first: now(), n: 0, max: 0 }); v.n++; v.last = now(); saveMany([[V, id]]).catch(() => { });
    res.json({ ok: true, title: x.d.title, slides: x.d.slides });
  });
  app.post('/api/learn/progress', (req, res) => { const x = sessOf(req.headers['x-learn']); if (!x) return bad(res, 401, 'session_expired'); const v = col(V)[x.d.id + ':' + x.s.sid]; if (v) { v.max = Math.max(v.max | 0, Math.min(N(req.body.max) | 0, x.d.slides.length)); v.last = now(); saveMany([[V, v.id]]).catch(() => { }); } res.json({ ok: true }); });
  app.get('/api/learn/media/:id', async (req, res) => {
    const x = sessOf(req.query.s); if (!x) return res.sendStatus(401); const m = col(M)[req.params.id]; if (!m || m.deck !== x.d.id) return res.sendStatus(404);
    const h = { 'Content-Type': m.m, 'Cache-Control': 'private, max-age=600', 'X-Content-Type-Options': 'nosniff', 'X-Robots-Tag': 'noindex' };
    try { if (m.d) return res.set(h).send(Buffer.from(m.d, 'base64')); if (m.k && imgs.enabled) return res.set(h).send(await imgs.get(m.k)); } catch (e) { return res.sendStatus(502); } res.sendStatus(404);
  });
  return { checkInitData, sessions: sess };
};
module.exports.checkInitData = checkInitData;
