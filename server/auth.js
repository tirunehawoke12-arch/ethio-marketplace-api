'use strict';
/* ===== መግቢያ እና ምዝገባ (የይለፍ ቃል + በተመዘገበው ስልክ ብቻ የሚላክ Telegram OTP) =====
   የይለፍ ቃል አሠራር ከድሮው ስሪት ጋር አንድ ነው (PBKDF2-SHA256፣ 150,000)፤ ስለዚህ የድሮ አካውንቶች ይገባሉ። */
const crypto = require('crypto');
const { promisify } = require('util');
const pbkdf2 = promisify(crypto.pbkdf2);

module.exports = function auth(ctx) {
  const { app, col, bump, pool, pgUpsert, persist, readTok, limit, tokFor, findUid, isSusp, accountKey, normPhoneET, tg, randDigits, id, safeOtpMatch, clean, saveDB, getDb, getStore, PUBLIC_BASE_URL, BOT_USERNAME, OTP_TTL, LINK_TTL } = ctx;
  const hash = async (pw, saltB64) => (await pbkdf2(pw, Buffer.from(saltB64, 'base64'), 150000, 32, 'sha256')).toString('base64');
  const eq = (a, b) => { a = Buffer.from(String(a)); b = Buffer.from(String(b)); return a.length === b.length && crypto.timingSafeEqual(a, b); };
  const bad = (res, c, e, extra) => res.status(c).json({ ok: false, error: e, ...(extra || {}) });
  const S = (x, n) => String(x == null ? '' : x).trim().slice(0, n);
  const ip = req => req.ip || req.socket.remoteAddress || '?';
  const mask = p => String(p || '').replace(/^(\d{4})\d{3}(\d{3})$/, '$1***$2');
  const botLink = rid => `https://t.me/${BOT_USERNAME}?start=${rid}`;
  async function saveAcct(uid) {
    const p = 'data/users/' + uid, st = getStore();
    if (pool) { await pgUpsert(p, 'acct', col(p).acct); if (col(p).private) await pgUpsert(p, 'private', col(p).private); await pgUpsert('_sys', 'idx', st.idx); } else persist();
    bump(p);
  }
  const issue = (res, uid, extra) => res.json({ ok: true, token: tokFor(uid, 'user'), uid, ...(extra || {}) });
  function takeOtp(r, otp) {                         // OTP ማረጋገጫ (ከፍተኛ 5 ሙከራ፣ ጊዜ ገደብ)
    if (!r) return { s: 404, e: 'request_not_found' };
    if (r.status !== 'otp_sent') return { s: 400, e: 'otp_not_ready' };
    if (Date.now() > r.otpExpiresAt) return { s: 400, e: 'otp_expired' };
    if ((r.attempts || 0) >= 5) return { s: 429, e: 'too_many_attempts' };
    r.attempts = (r.attempts || 0) + 1;
    if (!safeOtpMatch(String(otp || '').trim(), r.otp)) { saveDB(); return { s: 400, e: 'invalid_otp', left: Math.max(0, 5 - r.attempts) }; }
    return null;
  }
  const link = (account, uid, r) => { getDb().accounts[accountKey(account.email, account.phone)] = { chatId: r.chatId, phone: normPhoneET(account.phone), username: r.username || '', linkedAt: Date.now() }; };

  /* ---------- ምዝገባ ---------- */
  app.post('/api/auth/register', async (req, res) => {
    try {
      if (!limit('rg' + ip(req), 12, 3600e3)) return bad(res, 429, 'slow_down');
      clean(); const b = req.body || {}, email = S(b.email, 120).toLowerCase(), phone = normPhoneET(b.phone), pw = String(b.password || ''), name = S(b.name, 80);
      if (!/^\S+@\S+\.\S+$/.test(email)) return bad(res, 400, 'invalid_email');
      if (!phone) return bad(res, 400, 'invalid_phone');
      if (pw.length < 8 || pw.length > 128) return bad(res, 400, 'weak_password');
      if (process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL.trim().toLowerCase()) return bad(res, 409, 'email_taken');
      if (findUid(email)) return bad(res, 409, 'email_taken');
      if (findUid(phone)) return bad(res, 409, 'phone_taken');
      if (!BOT_USERNAME) return bad(res, 503, 'telegram_not_configured');
      const salt = crypto.randomBytes(16).toString('base64'), h = await hash(pw, salt), rid = id();
      getDb().links[rid] = { requestId: rid, purpose: 'register', email, phone, name, salt, h, status: 'waiting_for_start', createdAt: Date.now(), expiresAt: Date.now() + LINK_TTL };
      saveDB(); res.json({ ok: true, requestId: rid, botLink: botLink(rid), phoneHint: mask(phone), expiresIn: LINK_TTL });
    } catch (e) { console.error('register', e.message); bad(res, 500, 'server_error'); }
  });
  app.post('/api/auth/register/verify', async (req, res) => {
    try {
      clean(); const rid = String(req.body.requestId || ''), r = getDb().links[rid];
      if (r && r.purpose !== 'register') return bad(res, 400, 'wrong_request');
      const f = takeOtp(r, req.body.otp); if (f) return bad(res, f.s, f.e, f.left != null ? { attemptsLeft: f.left } : null);
      if (r.verifiedPhone !== r.phone) return bad(res, 400, 'phone_not_verified');
      if (findUid(r.email) || findUid(r.phone)) { delete getDb().links[rid]; saveDB(); return bad(res, 409, 'already_registered'); }
      const uid = crypto.randomBytes(12).toString('hex'), p = 'data/users/' + uid, st = getStore();
      const acct = { email: r.email, phone: r.phone, salt: r.salt, h: r.h, ts: Date.now() }; if (r.name) acct.name = r.name;
      col(p).acct = acct; if (r.name) col(p).private = { fullName: r.name, ts: Date.now() };
      st.idx['e:' + r.email] = uid; st.idx['p:' + r.phone] = uid;
      link(acct, uid, r); delete getDb().links[rid]; saveDB(); await saveAcct(uid);
      issue(res, uid);
    } catch (e) { console.error('register verify', e.message); bad(res, 500, 'server_error'); }
  });

  /* ---------- መግቢያ ---------- */
  app.post('/api/auth/login', async (req, res) => {
    try {
      const idv = S(req.body.id, 120), pw = String(req.body.password || '');
      if (!limit('lg2' + idv.toLowerCase(), 8, 900e3) || !limit('lg2i' + ip(req), 60, 900e3)) return bad(res, 429, 'too_many_attempts');
      clean(); const uid = findUid(idv), a = uid && (col('data/users/' + uid).acct);
      if (!a || !a.salt || !a.h || !eq(await hash(pw, a.salt), a.h)) return bad(res, 401, 'invalid');
      if (isSusp(uid)) return bad(res, 403, 'suspended');
      const rid = id(), account = getDb().accounts[accountKey(a.email, a.phone)], base = { requestId: rid, purpose: 'login', uid, email: a.email, phone: normPhoneET(a.phone) || a.phone, createdAt: Date.now(), expiresAt: Date.now() + LINK_TTL };
      if (account && account.chatId) {
        const otp = randDigits(6); getDb().links[rid] = { ...base, status: 'otp_sent', chatId: account.chatId, otp, otpExpiresAt: Date.now() + OTP_TTL, attempts: 0 }; saveDB();
        await tg('sendMessage', { chat_id: account.chatId, text: `🔐 Etio Digital Market — የመግቢያ ኮድ\n\nየማረጋገጫ ኮድዎ፦ ${otp}\n\n⏱ በ5 ደቂቃ ውስጥ ያበቃል።\n⚠️ ይህን ኮድ ለማንም አያጋሩ።` });
        return res.json({ ok: true, step: 'otp', requestId: rid, phoneHint: mask(base.phone) });
      }
      getDb().links[rid] = { ...base, status: 'waiting_for_start', linkNew: true }; saveDB();   // ቴሌግራም ያልተገናኘ (ለምሳሌ የድሮ አካውንት)
      res.json({ ok: true, step: 'link', requestId: rid, botLink: botLink(rid), phoneHint: mask(base.phone) });
    } catch (e) { console.error('login', e.message); bad(res, 500, 'otp_send_failed'); }
  });
  app.post('/api/auth/login/verify', async (req, res) => {
    try {
      clean(); const rid = String(req.body.requestId || ''), r = getDb().links[rid];
      if (r && r.purpose !== 'login') return bad(res, 400, 'wrong_request');
      const f = takeOtp(r, req.body.otp); if (f) return bad(res, f.s, f.e, f.left != null ? { attemptsLeft: f.left } : null);
      if (isSusp(r.uid)) return bad(res, 403, 'suspended');
      const a = col('data/users/' + r.uid).acct; if (!a) return bad(res, 404, 'not_found');
      if (r.linkNew) { if (r.verifiedPhone !== r.phone) return bad(res, 400, 'phone_not_verified'); link(a, r.uid, r); }
      delete getDb().links[rid]; saveDB(); issue(res, r.uid);
    } catch (e) { console.error('login verify', e.message); bad(res, 500, 'server_error'); }
  });

  /* ---------- መገለጫ ---------- */
  app.get('/api/auth/me', (req, res) => {
    const t = readTok(req); if (!t) return bad(res, 401, 'login_required');
    if (t.k === 'admin') return res.json({ ok: true, kind: 'admin', uid: 'admin', email: process.env.ADMIN_EMAIL || 'admin', name: 'አድሚን' });
    const d = col('data/users/' + t.u); if (!d.acct) return bad(res, 401, 'login_required');
    res.json({ ok: true, kind: 'user', uid: t.u, email: d.acct.email, phone: d.acct.phone, name: (d.private && d.private.fullName) || d.acct.name || '', hasPrivate: !!d.private });
  });
  app.post('/api/auth/password', async (req, res) => {
    const t = readTok(req); if (!t || t.k === 'admin') return bad(res, 401, 'login_required');
    const a = col('data/users/' + t.u).acct; if (!a) return bad(res, 401, 'login_required'); const nw = String(req.body.newPassword || '');
    if (!limit('pw' + t.u, 8, 900e3)) return bad(res, 429, 'too_many_attempts');
    if (!eq(await hash(String(req.body.current || ''), a.salt), a.h)) return bad(res, 401, 'invalid');
    if (nw.length < 8 || nw.length > 128) return bad(res, 400, 'weak_password');
    a.salt = crypto.randomBytes(16).toString('base64'); a.h = await hash(nw, a.salt);
    try { await saveAcct(t.u); res.json({ ok: true }); } catch (e) { bad(res, 503, 'storage'); }
  });
  const PF = ['fullName', 'idNo', 'dob', 'addr', 'tin', 'emName', 'emPhone', 'note'];
  app.get('/api/me/private', (req, res) => { const t = readTok(req); if (!t || t.k === 'admin') return bad(res, 401, 'login_required'); res.json({ ok: true, data: col('data/users/' + t.u).private || {} }); });
  app.put('/api/me/private', async (req, res) => {
    const t = readTok(req); if (!t || t.k === 'admin') return bad(res, 401, 'login_required'); if (!col('data/users/' + t.u).acct) return bad(res, 401, 'login_required');
    const o = { ts: Date.now() }; PF.forEach(k => { o[k] = S(req.body[k], k === 'note' ? 400 : 120); }); if (o.fullName.length < 3) return bad(res, 400, 'missing_fields');
    col('data/users/' + t.u).private = o; try { await saveAcct(t.u); res.json({ ok: true }); } catch (e) { bad(res, 503, 'storage'); }
  });

  /* ---------- ለ Telegram bot (በቦቱ ውስጥ ምዝገባ / መግቢያ) ---------- */
  async function createAccount({ email, phone, name, pw, chatId, username }) {
    email = S(email, 120).toLowerCase(); phone = normPhoneET(phone); name = S(name, 80); pw = String(pw || '');
    if (!/^\S+@\S+\.\S+$/.test(email)) return { error: 'invalid_email' };
    if (!phone) return { error: 'invalid_phone' };
    if (pw.length < 8 || pw.length > 128) return { error: 'weak_password' };
    if (process.env.ADMIN_EMAIL && email === process.env.ADMIN_EMAIL.trim().toLowerCase()) return { error: 'email_taken' };
    if (findUid(email)) return { error: 'email_taken' };
    if (findUid(phone)) return { error: 'phone_taken' };
    const salt = crypto.randomBytes(16).toString('base64'), h = await hash(pw, salt), uid = crypto.randomBytes(12).toString('hex'), p = 'data/users/' + uid, st = getStore();
    const acct = { email, phone, salt, h, ts: Date.now() }; if (name) acct.name = name;
    col(p).acct = acct; if (name) col(p).private = { fullName: name, ts: Date.now() };
    st.idx['e:' + email] = uid; st.idx['p:' + phone] = uid;
    link(acct, uid, { chatId, username }); saveDB(); await saveAcct(uid);
    return { uid };
  }
  async function verifyPassword(uid, pw) {
    const a = col('data/users/' + uid).acct; if (!a || !a.salt || !a.h) return false;
    if (!limit('bpw' + uid, 6, 900e3)) return null;                  // null = ብዙ ሙከራ
    return eq(await hash(String(pw || ''), a.salt), a.h);
  }
  function linkChat(uid, chatId, username) { const a = col('data/users/' + uid).acct; if (a) { link(a, uid, { chatId, username }); saveDB(); } }
  async function setPassword(uid, pw) {
    const a = col('data/users/' + uid).acct; pw = String(pw || ''); if (!a) return 'not_found'; if (pw.length < 8 || pw.length > 128) return 'weak_password';
    a.salt = crypto.randomBytes(16).toString('base64'); a.h = await hash(pw, a.salt); await saveAcct(uid); return null;
  }
  return { createAccount, verifyPassword, linkChat, setPassword };
};
