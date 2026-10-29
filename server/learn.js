'use strict';
/* ===== ተማሪ ፋይል አንባቢ (Telegram mini app ብቻ) =====
   መምህር፦ .pptx ይጭናል (በአሳሹ ወደ ጽሑፍ+ምስል ተቀይሮ) + የተማሪ ዝርዝር (ስም፣ ID) + የመክፈቻ መስኮት
   ተማሪ፦ በቦቱ «📖 ክፈት» (web_app) → Telegram initData በሰርቨር (HMAC) ይረጋገጣል → ስም + ID ከዝርዝሩ ጋር → «ፋይሉን ክፈት» → ተከታታይ ንባብ (scroll)
   ጥበቃ፦ initData ከሌለ ምንም አይከፈትም፤ ID ከመጀመሪያው Telegram አካውንት ጋር ይታሰራል (መምህር ብቻ ይፈታል)፤
          ምስሎች ከክፍለ-ጊዜ ጋር ብቻ፤ ሙከራ ገደብ፤ ማን መቼ እንዳየ ይመዘገባል። (ስክሪን ፎቶን 100% መከልከል አይቻልም) */
const crypto = require('crypto'), AM = require('./amnorm'), imgstore = require('./imgstore');
const D = 'ln/decks', M = 'ln/media', V = 'ln/views', SESSION = 3 * 3600e3, AUTH_AGE = 24 * 3600e3;
const LIM = { decks: 10, slides: 300, blocks: 120, text: 1500, rows: 40, media: 150, mediaBytes: 24 * 1048576, roster: 600 };

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
  const { app, col, limit, who, saveMany, bad, S, N, nid, token, botUsername = '', miniShort = '', baseUrl = '', pool, persist, bump, now = () => Date.now() } = ctx;
  const imgs = ctx.imgs || imgstore.create(), sess = new Map();
  const ti = setInterval(() => { for (const [k, v] of sess) if (v.exp < now()) sess.delete(k); }, 10 * 60e3); ti.unref && ti.unref();
  const mine = (req, res) => { const u = who(req, res); if (!u) return null; if (u.admin) { bad(res, 403, 'admin_cannot'); return null; } return u; };
  const own = (u, id) => { const d = col(D)[id]; return d && d.uid === u.uid ? d : null; };
  const open = d => d.status === 'on' && (!d.opens || d.opens <= now()) && (!d.closes || d.closes >= now());
  const ymd = (t) => (t ? new Date(t + 3 * 3600e3).toISOString().slice(0, 10) : '');
  async function drop(path, id) { delete col(path)[id]; if (pool) await pool.query('DELETE FROM kv WHERE path=$1 AND id=$2', [path, id]); else persist && persist(); bump && bump(path); }

  /* ---------- መምህር ---------- */
  const brief = d => ({ id: d.id, title: d.title, status: d.status, slides: (d.slides || []).length, students: (d.roster || []).length, bound: (d.roster || []).filter(r => r.tg).length, opens: ymd(d.opens), closes: ymd(d.closes), isOpen: open(d), ts: d.ts });
  app.get('/api/learn/decks', (req, res) => { const u = mine(req, res); if (!u) return; res.json({ ok: true, bot: botUsername, short: miniShort, items: Object.values(col(D)).filter(d => d.uid === u.uid).sort((a, b) => b.ts - a.ts).map(brief) }); });
  app.post('/api/learn/decks', async (req, res) => {
    const u = mine(req, res); if (!u) return; if (!limit('ld' + u.uid, 30, 3600e3)) return bad(res, 429, 'slow_down'); const title = S(req.body.title, 120); if (title.length < 2) return bad(res, 400, 'missing_fields');
    if (Object.values(col(D)).filter(d => d.uid === u.uid).length >= LIM.decks) return bad(res, 400, 'too_many');
    const d = { id: nid(), uid: u.uid, title, status: 'off', slides: [], roster: [], ts: now() }; col(D)[d.id] = d; try { await saveMany([[D, d.id]]); res.json({ ok: true, id: d.id }); } catch (e) { bad(res, 503, 'storage'); }
  });
  app.get('/api/learn/decks/:id', (req, res) => {
    const u = mine(req, res); if (!u) return; const d = own(u, req.params.id); if (!d) return bad(res, 404, 'not_found'); const views = Object.values(col(V)).filter(v => v.deck === d.id);
    res.json({ ok: true, bot: botUsername, short: miniShort, deck: { ...brief(d), desc: d.desc || '' }, roster: d.roster.map(r => { const v = views.find(x => x.sid === r.id) || {}; return { name: r.name, id: r.id, bound: !!r.tg, opened: v.n | 0, last: v.last || 0, max: v.max | 0 }; }), slidesN: d.slides.length });
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
