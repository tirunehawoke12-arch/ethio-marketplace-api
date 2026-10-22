'use strict';
/* ===== Telegram Bot — የድረ-ገጹ ሁሉም ሥራ በ Telegram ውስጥም =====
   ዘዴ፦ ቦቱ ለተገናኘው አካውንት በተፈረመ ቶከን ወደ ራሱ የ Express API (127.0.0.1) ይጠራል — ስለዚህ ህጎች፣ ማረጋገጫዎች፣
   escrow፣ ማሳወቂያዎች ሁሉ ከድረ-ገጹ ጋር አንድ ናቸው (ምንም አይደገምም)። ንግግሮች (ቅጾች) «flow» ናቸው፦ ጥያቄ በጥያቄ። */
const { errText } = require('./errors');
const { TEMPLATES } = require('./templates.generated');
const REGIONS = ['አዲስ አበባ', 'ድሬዳዋ', 'አማራ', 'ኦሮሚያ', 'ትግራይ', 'ሲዳማ', 'ሶማሌ', 'አፋር', 'ቤንሻንጉል ጉሙዝ', 'ጋምቤላ', 'ሐረሪ', 'ማዕከላዊ ኢትዮጵያ', 'ደቡብ ምዕራብ ኢትዮጵያ', 'ደቡብ ኢትዮጵያ'];
const PAY = ['telebirr', 'CBE Birr', 'ንግድ ባንክ', 'አዋሽ ባንክ', 'ዳሽን ባንክ', 'አቢሲኒያ ባንክ', 'ሌላ'];
const STEP = { placed: '📝 ታዘዘ', payment_submitted: '💳 ክፍያ ተላከ', paid: '✅ ክፍያ ተረጋገጠ', preparing: '📦 እየተዘጋጀ', shipped: '🚚 ተላከ', delivered: '🤝 ደረሰ', settled: '💰 ለሻጭ ተከፈለ', cancelled: '✕ ተሰርዟል', refund_pending: '↩️ ተመላሽ በመጠባበቅ', refunded: '↩️ ተመላሽ ተደርጓል', disputed: '⚖️ ክርክር ላይ' };
const APPST = { applied: '📨 ተልኳል', shortlisted: '⭐ በዝርዝር', hired: '🎉 ተቀጥረዋል', rejected: '✖️ አልተመረጡም', withdrawn: '↩️ ተነስቷል', invited: '🤝 ግብዣ' };
const MENU = [['🛍 ገበያ', '🏪 ሱቆች', '💼 ሥራ'], ['🌐 ገጾች', '🛒 ጋሪ', '📦 ትዕዛዞቼ'], ['👤 ገጾቼ', '🔎 ፈልግ', '❓ እገዛ']];

module.exports = function bot(c) {
  const { tg, tokFor, port, baseUrl, adminChat, token, getDb, getStore, accKey, findUid, normPhoneET, authApi, pool, pgUpsert, isSusp } = c;
  const H = x => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const B = x => '<b>' + H(x) + '</b>';
  const ETB = n => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' ብር';
  const clip = (x, n) => { x = String(x == null ? '' : x); return x.length > n ? x.slice(0, n - 1) + '…' : x; };
  const b = (t, d) => ({ text: String(t).slice(0, 60), callback_data: String(d).slice(0, 64) });
  const u = (t, link) => ({ text: String(t).slice(0, 60), url: link });
  const ik = rows => ({ inline_keyboard: rows.filter(r => r && r.length) });
  const web = p => baseUrl + p;
  const isAdmin = chat => !!adminChat && String(chat) === String(adminChat);
  const grid = (arr, n = 2) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; };

  /* ---------- ክፍለ-ጊዜ (ንግግር፣ ጋሪ) ---------- */
  const S = {}; const ses = chat => S[chat] || (S[chat] = { cart: [] });
  let saveT; const save = () => { if (!pool) return; clearTimeout(saveT); saveT = setTimeout(() => pgUpsert('_sys', 'botdb', S).catch(e => console.warn('bot save', e.message)), 600); };
  const restore = d => { if (d && typeof d === 'object') Object.assign(S, d); };

  /* ---------- መላኪያ ---------- */
  const send = (chat, text, kb) => tg('sendMessage', { chat_id: chat, text: String(text).slice(0, 3900), parse_mode: 'HTML', disable_web_page_preview: true, ...(kb ? { reply_markup: kb } : {}) }).catch(e => console.warn('bot send:', e.message));
  async function photo(chat, id, caption, kb) {
    if (!id || !/^https:/.test(baseUrl)) return send(chat, caption, kb);
    try { return await tg('sendPhoto', { chat_id: chat, photo: web('/api/market/img/' + id), caption: String(caption).slice(0, 1000), parse_mode: 'HTML', ...(kb ? { reply_markup: kb } : {}) }); } catch (e) { return send(chat, caption, kb); }
  }
  const menuKb = chat => ({ keyboard: isAdmin(chat) ? [...MENU, ['🛡 አድሚን']] : MENU, resize_keyboard: true, is_persistent: true });
  const home = (chat, text) => send(chat, text || '🏠 ዋና ማውጫ — ከታች ካሉት ቁልፎች ይምረጡ።', menuKb(chat));

  /* ---------- ወደ ድረ-ገጹ API (በተጠቃሚው ቶከን) ---------- */
  async function api(method, path, who, body) {
    const headers = { 'content-type': 'application/json' };
    if (who) headers.authorization = 'Bearer ' + (who === 'admin' ? tokFor('admin', 'admin') : tokFor(who, 'user'));
    try { const r = await fetch(`http://127.0.0.1:${port}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined }); return await r.json(); } catch (e) { return { ok: false, error: 'network' }; }
  }
  const GET = (p, w) => api('GET', p, w), POST = (p, w, d) => api('POST', p, w, d || {}), DEL = (p, w) => api('DELETE', p, w);
  const qs = o => { const p = new URLSearchParams(Object.entries(o).filter(([, v]) => v !== '' && v != null)).toString(); return p ? '?' + p : ''; };
  const bad = r => '❌ ' + errText(r && r.error);
  let cfgC = null, cfgAt = 0;
  async function cfg(uid) {
    if (cfgC && Date.now() - cfgAt < 120e3) return cfgC;
    const [m, p] = await Promise.all([GET('/api/market/config', uid), GET('/api/people/config')]);
    cfgC = { cats: m.cats || [], kinds: m.kinds || [], workCats: p.workCats || [], jobTypes: p.jobTypes || [], per: p.per || [] }; cfgAt = Date.now(); return cfgC;
  }

  /* ---------- ቴሌግራም ↔ አካውንት ---------- */
  let map = {}, mapAt = 0;
  function rebuild() {
    const st = getStore(), db = getDb(); map = {}; mapAt = Date.now();
    for (const p of Object.keys(st.docs)) { const m = /^data\/users\/([\w-]+)$/.exec(p); if (!m) continue; const a = st.docs[p].acct; if (!a) continue; const l = db.accounts[accKey(a)]; if (l && l.chatId) map[l.chatId] = m[1]; }
  }
  function uidOf(chat) { if (Date.now() - mapAt > 20e3) rebuild(); let x = map[chat]; if (!x && Date.now() - mapAt > 1500) { rebuild(); x = map[chat]; } return x && !isSusp(x) ? x : null; }
  const userOf = uid => { const d = getStore().docs['data/users/' + uid] || {}; return { name: (d.private && d.private.fullName) || (d.acct && d.acct.name) || '', phone: d.acct && d.acct.phone, email: d.acct && d.acct.email }; };

  /* ---------- ፎቶ ከ Telegram → የገበያው ምስል ማከማቻ ---------- */
  async function uploadPhoto(uid, sizes) {
    const ok = (sizes || []).filter(s => (s.file_size || 0) <= 270000).sort((a, b2) => (b2.width || 0) - (a.width || 0))[0] || (sizes || [])[0];
    if (!ok) return null;
    try {
      const f = await tg('getFile', { file_id: ok.file_id });
      const r = await fetch(`${process.env.TELEGRAM_API_BASE || 'https://api.telegram.org'}/file/bot${token}/${f.file_path}`); const buf = Buffer.from(await r.arrayBuffer());
      if (buf.length > 285000) return null;
      const up = await POST('/api/market/upload', uid, { dataUrl: 'data:image/jpeg;base64,' + buf.toString('base64') });
      return up.ok ? up.id : null;
    } catch (e) { console.warn('bot photo', e.message); return null; }
  }

  /* ================= ንግግር (flow) ሞተር =================
     step = { k, q, t: text|long|num|phone|date|link|choice|multi|yn|photo, o: [ምርጫዎች], opt: ሊዘለል ይችላል, def: ነባሪ እሴት, min, max, if: [key, value] } */
  const FIN = {};                                         // flow id → (chat, uid, data, ctx) => ማጠናቀቂያ
  function startFlow(chat, id, steps, ctx, intro, canFinish) {
    const s = ses(chat); s.flow = { id, steps, i: 0, d: {}, ctx: ctx || {}, canFinish: !!canFinish }; save(); if (intro) send(chat, intro); return ask(chat);
  }
  const shown = (st, v) => (v == null || v === '' || (Array.isArray(v) && !v.length) ? '' : Array.isArray(v) ? (st.t === 'photo' ? v.length + ' ፎቶ' : v.join('፣ ')) : st.t === 'yn' ? (v === 'yes' ? 'አዎ' : 'አይደለም') : String(v));
  function skipCond(f) { let st = f.steps[f.i]; while (st && st.if && f.d[st.if[0]] !== st.if[1]) { f.i++; st = f.steps[f.i]; } return st; }
  function ask(chat) {
    const f = ses(chat).flow; if (!f) return; const st = skipCond(f); if (!st) return finishFlow(chat);
    const rows = [], cur = f.d[st.k], total = f.steps.length;
    if (st.t === 'choice') grid(st.o.map((o, k) => b((cur === o ? '✓ ' : '') + o, 'f:c:' + k)), 2).forEach(r => rows.push(r));
    if (st.t === 'multi') { grid(st.o.map((o, k) => b(((cur || []).includes(o) ? '✓ ' : '') + o, 'f:m:' + k)), 2).forEach(r => rows.push(r)); rows.push([b('✅ ጨርሽ', 'f:md')]); }
    if (st.t === 'yn') rows.push([b('✅ አዎ', 'f:y'), b('✖️ አይደለም', 'f:n')]);
    if (st.t === 'photo' && (cur || []).length) rows.push([b('✅ ጨርሽ (' + cur.length + ' ፎቶ)', 'f:pd')]);
    const hasDef = st.def !== undefined && st.def !== '' && !(Array.isArray(st.def) && !st.def.length);
    if (hasDef) rows.push([b('⏭ እንዳለ ይቀጥል', 'f:s')]); else if (st.opt) rows.push([b('⏭ ዝለል', 'f:s')]);
    const nav = []; if (f.i > 0) nav.push(b('‹ ተመለስ', 'f:b')); if (f.canFinish) nav.push(b('⏩ አሁን ጨርሽ', 'f:fin')); nav.push(b('✖️ ሰርዝ', 'f:x')); rows.push(nav);
    const hint = { photo: '📷 ፎቶ ይላኩ', num: '🔢 ቁጥር ይጻፉ', phone: '📞 ስልክ ይጻፉ (09…)', date: '📅 ቀን ይጻፉ (2026-12-31)', long: '✍️ ይጻፉ', link: '🔗 ሊንክ ወይም @username', text: '✍️ ይጻፉ' }[st.t] || '👇 ይምረጡ';
    const d = hasDef ? `\n<i>አሁን፦ ${H(clip(shown(st, st.def), 80))}</i>` : '';
    return send(chat, `${B(`${f.i + 1}/${total}`)} ${H(st.q)}${d}\n${hint}`, ik(rows));
  }
  function next(chat) { const f = ses(chat).flow; f.i++; save(); return ask(chat); }
  async function finishFlow(chat) {
    const s = ses(chat), f = s.flow; if (!f) return; s.flow = null; save();
    const fn = FIN[f.id]; if (!fn) return;
    try { await fn(chat, uidOf(chat), f.d, f.ctx); } catch (e) { console.error('flow', f.id, e); send(chat, '❌ ስህተት ተከስቷል፤ እንደገና ይሞክሩ።'); }
  }
  async function flowText(chat, text, msg) {
    const f = ses(chat).flow, st = skipCond(f); if (!st) return;
    const t = String(text || '').trim();
    if (st.t === 'choice') { const k = st.o.findIndex(o => o === t); if (k < 0) return send(chat, '👇 ከምርጫዎቹ አንዱን ይጫኑ።'); f.d[st.k] = st.o[k]; return next(chat); }
    if (st.t === 'multi' || st.t === 'yn' || st.t === 'photo') return send(chat, st.t === 'photo' ? '📷 ፎቶ ይላኩ (ወይም ዝለል)።' : '👇 ምርጫዎቹን ይጫኑ።');
    let v = t;
    if (st.t === 'num') { v = Number(t.replace(/,/g, '')); if (!Number.isFinite(v) || v < 0) return send(chat, '🔢 ትክክለኛ ቁጥር ያስገቡ።'); }
    else if (st.t === 'phone') { const p = normPhoneET(t); if (!p && !st.loose) return send(chat, '📞 ትክክለኛ የኢትዮጵያ ስልክ ያስገቡ (09… ወይም 07…)።'); v = p || t; }
    else if (st.t === 'date') { if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return send(chat, '📅 በዚህ መልክ ይጻፉ፦ 2026-12-31'); }
    else { if (t.length < (st.min || 1)) return send(chat, `✍️ ቢያንስ ${st.min || 1} ፊደል ይጻፉ።`); if (t.length > (st.t === 'long' ? 2000 : st.max || 200)) return send(chat, '✍️ ጽሑፉ በጣም ረጅም ነው።'); }
    if (st.secret && msg) tg('deleteMessage', { chat_id: chat, message_id: msg.message_id }).catch(() => { });
    f.d[st.k] = v; return next(chat);
  }
  async function flowPhoto(chat, msg) {
    const f = ses(chat).flow, st = skipCond(f); if (!st || st.t !== 'photo') return send(chat, 'አሁን ፎቶ አያስፈልግም።');
    const uid = uidOf(chat); if (!uid) return; const id = await uploadPhoto(uid, msg.photo);
    if (!id) return send(chat, '❌ ፎቶው አልተቀበለም (ትልቅ ነው?)። ሌላ ይላኩ።');
    const max = st.max || 1; f.d[st.k] = [...(f.d[st.k] || []), id].slice(0, max); save();
    if (f.d[st.k].length >= max) return next(chat); return ask(chat);
  }
  async function flowCb(chat, data) {
    const f = ses(chat).flow; if (!f) return send(chat, 'ይህ ቅጽ አልቋል። ከዋና ማውጫ ይጀምሩ።');
    const [, a, x] = data.split(':'), st = skipCond(f);
    if (a === 'x') { ses(chat).flow = null; save(); return send(chat, '✖️ ተሰርዟል።', menuKb(chat)); }
    if (a === 'b') { let i = f.i - 1; while (i > 0 && f.steps[i].if && f.d[f.steps[i].if[0]] !== f.steps[i].if[1]) i--; f.i = Math.max(0, i); save(); return ask(chat); }
    if (a === 'fin') return finishFlow(chat);
    if (!st) return;
    if (a === 's') { if (st.def !== undefined && f.d[st.k] === undefined) f.d[st.k] = st.def; else if (f.d[st.k] === undefined) f.d[st.k] = st.t === 'photo' || st.t === 'multi' ? [] : ''; return next(chat); }
    if (a === 'c') { f.d[st.k] = st.o[Number(x)]; return next(chat); }
    if (a === 'y' || a === 'n') { f.d[st.k] = a === 'y' ? 'yes' : 'no'; return next(chat); }
    if (a === 'm') { const o = st.o[Number(x)], cur = f.d[st.k] || []; f.d[st.k] = cur.includes(o) ? cur.filter(v => v !== o) : [...cur, o]; save(); return ask(chat); }
    if (a === 'md') { if (f.d[st.k] === undefined) f.d[st.k] = []; return next(chat); }
    if (a === 'pd') return next(chat);
  }

  /* ================= መግቢያ / ምዝገባ በቦቱ ውስጥ ================= */
  const CONTACT_KB = { keyboard: [[{ text: '📱 ስልኬን አጋራ', request_contact: true }]], resize_keyboard: true, one_time_keyboard: true };
  function authStart(chat) {
    ses(chat).auth = { stage: 'contact' }; save();
    return send(chat, '🇪🇹 <b>እንኳን ወደ ኢትዮ ዲጂታል ማርኬት በደህና መጡ!</b>\n\nበዚህ ቦት ውስጥ ድረ-ገጹ የሚሠራውን ሁሉ ማድረግ ይችላሉ፦ ዕቃ መግዛት እና መሸጥ፣ ሥራ መፈለግ እና ማስታወቅ፣ የራስዎን ገጽ መሥራት፣ ክፍያ እና ደረሰኝ።\n\n🔒 ለመግባት ወይም አካውንት ለመክፈት በመጀመሪያ ስልክ ቁጥርዎን ያረጋግጡ — ከታች «📱 ስልኬን አጋራ» ይጫኑ።', CONTACT_KB);
  }
  async function authContact(chat, msg) {
    const ct = msg.contact; if (!msg.from || ct.user_id !== msg.from.id) return send(chat, '⚠️ የራስዎን ስልክ ቁጥር ብቻ ማጋራት ይችላሉ። «📱 ስልኬን አጋራ» ቁልፉን ይጠቀሙ።', CONTACT_KB);
    const phone = normPhoneET(ct.phone_number); if (!phone) return send(chat, '❌ ይህ የኢትዮጵያ ስልክ ቁጥር አይደለም (09… / 07…)። ለመመዝገብ የኢትዮጵያ ቁጥር ያስፈልጋል።');
    const username = msg.from.username || msg.from.first_name || '', exist = findUid(phone), s = ses(chat);
    if (s.auth && s.auth.stage === 'chphone') {                                       // ስልክ መቀየር — በ Telegram የተረጋገጠ አዲስ ቁጥር
      const e = await authApi.changeIdentity(s.auth.uid, { phone }, chat, username); s.auth = null; save(); rebuild();
      return e ? send(chat, bad({ error: e }), menuKb(chat)) : home(chat, `✅ ስልክዎ ወደ ${H(phone)} ተቀይሯል።`);
    }
    if (exist) {
      if (isSusp(exist)) return send(chat, '⛔ አካውንትዎ ታግዷል — አድሚኑን ያነጋግሩ።');
      s.auth = { stage: 'pw', phone, uid: exist, username }; save();
      await send(chat, '🔑 ከዚህ ስልክ ጋር የተመዘገበ አካውንት አለ።', { remove_keyboard: true });
      return send(chat, 'የድረ-ገጽ <b>የይለፍ ቃልዎን</b> ይጻፉ — መልዕክቱ ወዲያው ይሰረዛል።', ik([[b('🆘 የይለፍ ቃል ረሳሁ', 'rst')]]));
    }
    s.auth = { stage: 'email', phone, username }; save();
    return send(chat, '🆕 አዲስ አካውንት እንክፈት።\n\n📧 <b>ኢሜይልዎን</b> ይጻፉ፦', { remove_keyboard: true });
  }
  async function authText(chat, text, msg) {
    const s = ses(chat), a = s.auth, t = String(text || '').trim();
    if (a.stage === 'contact' || a.stage === 'chphone') return send(chat, '📱 ከታች «ስልኬን አጋራ» ይጫኑ (ወይም /cancel)።', CONTACT_KB);
    if (a.stage === 'resetpw') {
      tg('deleteMessage', { chat_id: chat, message_id: msg.message_id }).catch(() => { }); if (t.length < 8) return send(chat, '❌ ቢያንስ 8 ቁምፊ ይሁን።');
      const e = await authApi.setPassword(a.uid, t); if (e) return send(chat, bad({ error: e }));
      authApi.linkChat(a.uid, chat, a.username); rebuild(); s.auth = null; save(); return home(chat, '✅ አዲስ የይለፍ ቃል ተቀምጧል — ገብተዋል!');
    }
    const wipe = () => tg('deleteMessage', { chat_id: chat, message_id: msg.message_id }).catch(() => { });
    if (a.stage === 'pw') {
      wipe(); const ok = await authApi.verifyPassword(a.uid, t);
      if (ok === null) return send(chat, '⏳ ብዙ ሙከራ — ከ15 ደቂቃ በኋላ ይሞክሩ።');
      if (!ok) return send(chat, '❌ የይለፍ ቃሉ ትክክል አይደለም፤ እንደገና ይጻፉ።');
      authApi.linkChat(a.uid, chat, a.username); rebuild(); s.auth = null; save();
      return home(chat, `✅ ገብተዋል! እንኳን ደህና መጡ ${H(userOf(a.uid).name)}\n\nከታች ካሉት ቁልፎች ይምረጡ።`);
    }
    if (a.stage === 'email') {
      const e = t.toLowerCase(); if (!/^\S+@\S+\.\S+$/.test(e)) return send(chat, '❌ ትክክለኛ ኢሜይል ያስገቡ (ለምሳሌ name@gmail.com)።');
      if (findUid(e)) return send(chat, '❌ ይህ ኢሜይል ቀድሞ ተመዝግቧል። ሌላ ይጻፉ።');
      a.email = e; a.stage = 'name'; save(); return send(chat, '👤 <b>ሙሉ ስምዎን</b> ይጻፉ፦');
    }
    if (a.stage === 'name') { if (t.length < 3) return send(chat, '❌ ሙሉ ስም ይጻፉ።'); a.name = t.slice(0, 80); a.stage = 'newpw'; save(); return send(chat, '🔐 <b>የይለፍ ቃል</b> ይፍጠሩ (ቢያንስ 8 ቁምፊ) — መልዕክቱ ወዲያው ይሰረዛል፦'); }
    if (a.stage === 'newpw') {
      wipe(); if (t.length < 8) return send(chat, '❌ ቢያንስ 8 ቁምፊ ይሁን።');
      const r = await authApi.createAccount({ email: a.email, phone: a.phone, name: a.name, pw: t, chatId: chat, username: a.username });
      if (r.error) { s.auth = null; save(); return send(chat, bad(r) + '\n/start ብለው እንደገና ይጀምሩ።'); }
      rebuild(); s.auth = null; save();
      return home(chat, `🎉 አካውንትዎ ተከፍቷል! ይህን ኢሜይል እና የይለፍ ቃል በድረ-ገጹም መጠቀም ይችላሉ።\n\nከታች ካሉት ቁልፎች ይምረጡ።`);
    }
  }

  /* ================= ገበያ ================= */
  async function marketHome(chat, uid) {
    const cf = await cfg(uid), rows = grid(cf.cats.map((x, k) => b(x, 'pr:' + k)), 2); rows.unshift([b('🆕 አዳዲስ ዕቃዎች', 'pr:-')]);
    return send(chat, '🛍 <b>ገበያ</b>\nዘርፍ ይምረጡ ወይም «🔎 ፈልግ» ይጫኑ።', ik(rows));
  }
  async function listProducts(chat, uid, ctx, page) {
    const s = ses(chat); s.lp = ctx; save(); const cf = await cfg(uid);
    const r = await GET('/api/market/products' + qs({ cat: ctx.cat !== undefined && ctx.cat !== '-' ? cf.cats[Number(ctx.cat)] : '', q: ctx.q, shop: ctx.shop, page }), uid);
    if (!r.ok) return send(chat, bad(r)); if (!r.items.length) return send(chat, '🤷 ምንም ዕቃ አልተገኘም።');
    const rows = r.items.map(p => [b(`${clip(p.title, 26)} · ${ETB(p.price)}`, 'p:' + p.id)]), nav = [];
    if (page > 1) nav.push(b('‹ ቀዳሚ', 'lp:' + (page - 1))); if (page * 24 < r.total) nav.push(b('ቀጣይ ›', 'lp:' + (page + 1))); rows.push(nav);
    return send(chat, `🛍 ${B(r.total + ' ዕቃዎች')}${ctx.q ? ` — «${H(ctx.q)}»` : ''}  (ገጽ ${page})`, ik(rows));
  }
  async function showProduct(chat, uid, id) {
    const r = await GET('/api/market/product/' + id, uid); if (!r.ok) return send(chat, bad(r));
    const p = r.product, sh = r.shop;
    const cap = `${B(p.title)}\n💰 ${B(ETB(p.price))} / ${H(p.unit)}\n📦 ክምችት፦ ${p.stock}\n${p.desc ? '\n' + H(clip(p.desc, 450)) + '\n' : ''}\n🏪 ${H(sh.name)} · 📍 ${H(sh.city)}${sh.rating ? ` · ⭐ ${sh.rating} (${sh.reviews})` : ''}${(r.reviews || []).slice(0, 2).map(v => `\n💬 ${'★'.repeat(v.rating)} ${H(clip(v.text, 80))}`).join('')}`;
    const kb = ik([[1, 2, 3, 5].map(n => b('➕' + n, `ac:${p.id}:${n}`)), [b('🏪 ሱቁን ክፈት', 'sh:' + sh.id), b('🛒 ጋሪ', 'cart')], [u('🌐 በድረ-ገጽ', web('/p/' + p.id))]]);
    return photo(chat, p.imgs && p.imgs[0], cap, kb);
  }
  async function addCart(chat, uid, pid, n) {
    const r = await GET('/api/market/product/' + pid, uid); if (!r.ok) return send(chat, bad(r)); const s = ses(chat), p = r.product, x = s.cart.find(i => i.pid === pid);
    if (x) x.qty = Math.min(99, x.qty + n); else s.cart.push({ pid, qty: n, title: p.title, price: p.price, shopName: r.shop.name }); save();
    return send(chat, `✅ ወደ ጋሪ ተጨመረ፦ ${H(p.title)} × ${s.cart.find(i => i.pid === pid).qty}`, ik([[b('🛒 ጋሪን ይመልከቱ', 'cart'), b('🛍 ሌላ ይግዙ', 'm:market')]]));
  }
  function showCart(chat) {
    const s = ses(chat); if (!s.cart.length) return send(chat, '🛒 ጋሪዎ ባዶ ነው።', ik([[b('🛍 ወደ ገበያ', 'm:market')]]));
    const rows = []; let tot = 0;
    const lines = s.cart.map((i, k) => { tot += i.price * i.qty; rows.push([b('➖', `cq:${k}:-1`), b(`${clip(i.title, 18)} ×${i.qty}`, 'noop'), b('➕', `cq:${k}:1`), b('✕', `cx:${k}`)]); return `• ${H(i.title)} × ${i.qty} = ${ETB(i.price * i.qty)}`; });
    rows.push([b('🧹 አጽዳ', 'cc'), b('✅ እዘዝ', 'co')]);
    return send(chat, `🛒 <b>ጋሪዎ</b>\n\n${lines.join('\n')}\n\n💰 ድምር፦ ${B(ETB(tot))}\n<i>(የማድረሻ ክፍያ በሱቁ ይታከላል)</i>`, ik(rows));
  }
  function startCheckout(chat, uid) {
    const s = ses(chat); if (!s.cart.length) return showCart(chat); const me = userOf(uid);
    return startFlow(chat, 'checkout', [{ k: 'type', q: 'ዕቃውን እንዴት ይቀበላሉ?', t: 'choice', o: ['🏬 በአካል መውሰድ', '🚚 ማድረስ'] }, { k: 'address', q: 'የማድረሻ አድራሻ (ከተማ፣ ክፍለ ከተማ፣ ምልክት)፦', t: 'text', min: 5, if: ['type', '🚚 ማድረስ'] }, { k: 'phone', q: 'የሚያገኝዎ ስልክ፦', t: 'phone', def: me.phone || undefined }, { k: 'note', q: 'ለሻጩ ማስታወሻ፦', t: 'text', opt: true }], {}, '🧾 ትዕዛዝ ማጠናቀቂያ');
  }
  const payInfo = (cf, o) => `💳 <b>ክፍያ ይፈጽሙ</b> — ${B(ETB(o.total))}\n${(cf.accounts || []).map(a => `• ${H(a.method)}፦ <code>${H(a.number)}</code>${a.holder ? ' (' + H(a.holder) + ')' : ''}`).join('\n')}${cf.note ? '\n📝 ' + H(cf.note) : ''}\n\nከከፈሉ በኋላ «💳 ክፍያ ፈጽሜያለሁ» ይጫኑ እና የግብይት ማጣቀሻ ቁጥሩን ያስገቡ። ገንዘቡ በአድሚን በኩል ይቆያል (escrow)፤ ዕቃው ሲደርስዎ ብቻ ለሻጩ ይለቀቃል።`;
  FIN.checkout = async (chat, uid, d) => {
    const s = ses(chat), r = await POST('/api/market/checkout', uid, { items: s.cart.map(i => ({ pid: i.pid, qty: i.qty })), delivery: { type: d.type === '🚚 ማድረስ' ? 'delivery' : 'pickup', address: d.address || '', phone: d.phone, note: d.note || '' } });
    if (!r.ok) return send(chat, bad(r) + '\n🛒 ጋሪዎ አልተነካም።', ik([[b('🛒 ጋሪ', 'cart')]]));
    s.cart = []; save(); const cf = await GET('/api/market/config', uid), L = (await GET('/api/market/my/orders', uid)).orders || [];
    for (const id of r.orders) { const o = L.find(x => x.id === id); if (o) await send(chat, `✅ ትዕዛዝ #${id.slice(0, 6)} ተመዝግቧል — ${H(o.shopName)}\n\n${payInfo(cf, o)}`, ik([[b('💳 ክፍያ ፈጽሜያለሁ', 'pay:' + id)], [b('📦 ትዕዛዙን ክፈት', 'o:' + id)]])); }
  };

  /* ================= ትዕዛዞች (ገዥ) ================= */
  const orderTxt = (o, extra) => `🏪 ${B(o.shopName)}  #${o.id.slice(0, 6)}\n${o.items.map(i => `• ${H(i.title)} × ${i.qty} = ${ETB(i.price * i.qty)}`).join('\n')}${o.fee > 0 ? `\n🚚 ማድረሻ፦ ${ETB(o.fee)}` : ''}\n💰 ጠቅላላ፦ ${B(ETB(o.total))}\n📍 ${o.delivery && o.delivery.type === 'delivery' ? '🚚 ' + H(o.delivery.address) : '🏬 በአካል መውሰድ'}\n📊 ${STEP[o.status] || o.status}${o.tracking ? '\n🧭 ' + H(o.tracking) : ''}${o.payment && o.payment.rejected ? '\n❌ ክፍያ አልተቀበለም፦ ' + H(o.payment.rejected) : ''}${extra || ''}`;
  async function receiptRows(uid, id) { const r = await GET(`/api/market/order/${id}/receipts`, uid); return (r.receipts || []).map(x => [u('🧾 ' + x.label + ' — አውርድ', web(x.url + '?dl=1'))]); }
  async function listOrders(chat, uid) {
    const r = await GET('/api/market/my/orders', uid); if (!r.ok) return send(chat, bad(r)); if (!r.orders.length) return send(chat, '📦 እስካሁን ትዕዛዝ የለም።', ik([[b('🛍 ወደ ገበያ', 'm:market')]]));
    return send(chat, '📦 <b>ትዕዛዞቼ</b>', ik(r.orders.slice(0, 20).map(o => [b(`#${o.id.slice(0, 6)} · ${clip(o.shopName, 14)} · ${ETB(o.total)} · ${STEP[o.status] || o.status}`, 'o:' + o.id)])));
  }
  async function showOrder(chat, uid, id) {
    const r = await GET('/api/market/my/orders', uid), o = (r.orders || []).find(x => x.id === id); if (!o) return send(chat, '❌ ትዕዛዝ አልተገኘም።');
    const rows = [], cf = o.status === 'placed' ? await GET('/api/market/config', uid) : null;
    if (o.status === 'placed') rows.push([b('💳 ክፍያ ፈጽሜያለሁ', 'pay:' + id), b('✕ ሰርዝ', 'oa:cancel:' + id)]);
    if (o.status === 'shipped') rows.push([b('🤝 ደርሶኛል', 'oa:receive:' + id)]);
    if (o.status === 'shipped' || o.status === 'delivered') rows.push([b('⚖️ ክርክር ክፈት', 'dsp:' + id)]);
    if ((o.status === 'delivered' || o.status === 'settled') && !o.reviewed) rows.push([b('⭐ ግምገማ ስጥ', 'rv:' + id)]);
    rows.push(...await receiptRows(uid, id)); rows.push([b('‹ ትዕዛዞች', 'ol')]);
    return send(chat, orderTxt(o) + (cf ? '\n\n' + payInfo(cf, o) : ''), ik(rows));
  }
  FIN.pay = async (chat, uid, d, x) => { const r = await POST(`/api/market/order/${x.id}/pay`, uid, { method: d.method, ref: d.ref, note: d.note || '' }); return send(chat, r.ok ? '✅ ክፍያዎ ለአድሚን ተልኳል — ሲረጋገጥ ደረሰኝ ይላክልዎታል።' : bad(r), ik([[b('📦 ትዕዛዙ', 'o:' + x.id)]])); };
  FIN.dispute = async (chat, uid, d, x) => { const r = await POST(`/api/market/order/${x.id}/dispute`, uid, { reason: d.reason }); return send(chat, r.ok ? '⚖️ ክርክርዎ ለአድሚን ተልኳል።' : bad(r)); };
  FIN.review = async (chat, uid, d, x) => { const r = await POST('/api/market/review', uid, { orderId: x.id, rating: Number(d.rate), text: d.text || '' }); return send(chat, r.ok ? '⭐ እናመሰግናለን!' : bad(r)); };
  async function orderAct(chat, uid, act, id) { const r = await POST(`/api/market/order/${id}/${act}`, uid, {}); await send(chat, r.ok ? '✅ ተከናውኗል' : bad(r)); if (r.ok) return showOrder(chat, uid, id); }

  /* ================= ሱቆች ================= */
  async function listShops(chat, uid, page = 1) {
    const r = await GET('/api/market/shops', uid); if (!r.ok) return send(chat, bad(r)); if (!r.items.length) return send(chat, 'ሱቅ የለም');
    return send(chat, `🏪 <b>ሱቆች (${r.total})</b>`, ik(r.items.slice(0, 30).map(s => [b(`${clip(s.name, 22)} · ${s.city}${s.rating ? ' ⭐' + s.rating : ''}`, 'sh:' + s.id)])));
  }
  async function showShop(chat, uid, id) {
    const r = await GET('/api/market/shop/' + id, uid); if (!r.ok) return send(chat, bad(r)); const s = r.shop;
    const cap = `🏪 ${B(s.name)} <i>${H(s.kind)}</i>\n${s.about ? H(clip(s.about, 400)) + '\n' : ''}\n📍 ${H(s.city)}, ${H(s.region)} — ${H(s.address)}${s.hours ? '\n🕒 ' + H(s.hours) : ''}${s.phone ? '\n📞 ' + H(s.phone) : ''}\n${s.delivery.pickup ? '🏬 በአካል መውሰድ ' : ''}${s.delivery.local ? `🚚 ማድረስ ${s.delivery.fee} ብር` : ''}\n${s.reviews ? `⭐ ${s.rating} (${s.reviews})` : 'አዲስ ሱቅ'} · 🛍 ${r.products.length} ዕቃዎች`;
    return photo(chat, s.logo || s.cover, cap, ik([[b('🛍 ዕቃዎቹን አሳይ', 'shp:' + id)], [u('🌐 በድረ-ገጽ', web('/shop/' + id))]]));
  }

  /* ================= ፍለጋ ================= */
  FIN.search = async (chat, uid, d) => listProducts(chat, uid, { q: d.q }, 1);

  /* ================= የእኔ ገጾች (ማዕከል) ================= */
  const hub = (chat, uid) => send(chat, `👤 <b>ገጾቼ</b> — ${H(userOf(uid).name || '')}\n📞 ${H(userOf(uid).phone || '')}`, ik([
    [b('🌐 የራሴ ገጾች (ድረ-ገጽ)', 'mpg')], [b('🏪 ሱቄ / ሆቴሌ / ንግዴ', 'ms')], [b('🧑‍🔧 ሠራተኛ ገጽ', 'mw'), b('🏢 አሰሪ ገጽ', 'mem')], [b('📢 ሥራዎቼ', 'mj'), b('📄 ማመልከቻዎቼ', 'mapps')], [b('🪪 የግል መረጃ', 'prv'), b('⚙️ አካውንቴ', 'acc')], [u('🖥 ድረ-ገጹን ክፈት', web('/me'))]]));
  const dv = x => (x === undefined || x === null || x === '' || (Array.isArray(x) && !x.length) ? undefined : x);
  const yn = x => (x ? 'yes' : 'no');

  /* ---------- ሱቅ ---------- */
  async function myShop(chat, uid) {
    const r = await GET('/api/market/my/shop', uid); if (!r.ok) return send(chat, bad(r)); const s = r.shop;
    if (!s) return send(chat, '🏪 ገና ሱቅ/ንግድ የለዎትም። ሱቅ፣ ሆቴል፣ አገልግሎት ወይም አምራችነት ይክፈቱ።', ik([[b('➕ ሱቅ ክፈት', 'mse')]]));
    const st = { active: '🟢 ክፍት', pending: '⏳ አድሚን እስኪያጸድቅ', rejected: '❌ አልተቀበለም', suspended: '⛔ ታግዷል' }[s.status] || s.status;
    return send(chat, `🏪 ${B(s.name)} <i>${H(s.kind)}</i>\n${st}${s.note ? ' — ' + H(s.note) : ''}\n\n🛍 ዕቃዎች፦ ${r.stats.products} · 🧾 ትዕዛዞች፦ ${r.stats.orders} · ⏳ የሚጠብቁ፦ ${r.stats.toDo}\n💰 የተከፈለዎ፦ ${ETB(r.stats.earned)}`, ik([[b('➕ ዕቃ ጨምር', 'mpn'), b('🛍 ዕቃዎቼ', 'mpl')], [b('🧾 የሱቄ ትዕዛዞች', 'so'), b('✏️ ሱቅ አርም', 'mse')], [u('🌐 ሱቄን በድረ-ገጽ', web('/shop/' + s.id))]]));
  }
  async function shopFlow(chat, uid) {
    const [r, cf] = await Promise.all([GET('/api/market/my/shop', uid), cfg(uid)]), s = r.shop || {}, me = userOf(uid), p = s.payout || {}, dl = s.delivery || {};
    const steps = [
      { k: 'kind', q: 'የንግድዎ ዓይነት?', t: 'choice', o: cf.kinds, def: dv(s.kind) }, { k: 'name', q: 'የሱቅ / የንግድ ስም፦', t: 'text', min: 3, max: 60, def: dv(s.name) }, { k: 'category', q: 'ዘርፍ፦', t: 'choice', o: cf.cats, def: dv(s.category) },
      { k: 'about', q: 'ስለ ሱቁ አጭር መግለጫ፦', t: 'long', opt: true, def: dv(s.about) }, { k: 'region', q: 'ክልል፦', t: 'choice', o: REGIONS, def: dv(s.region) }, { k: 'city', q: 'ከተማ፦', t: 'text', def: dv(s.city) },
      { k: 'address', q: 'ዝርዝር አድራሻ (ክፍለ ከተማ፣ ምልክት)፦', t: 'text', min: 3, max: 160, def: dv(s.address) }, { k: 'hours', q: 'የሥራ ሰዓት (ለምሳሌ ሰኞ–ቅዳሜ 2:00–12:00)፦', t: 'text', opt: true, def: dv(s.hours) },
      { k: 'phone', q: 'የሱቁ ስልክ፦', t: 'phone', def: dv(s.phone) || me.phone }, { k: 'showPhone', q: 'ስልኩ ለሁሉም ይታይ?', t: 'yn', def: yn(s.showPhone) },
      { k: 'pickup', q: 'ደንበኛ በአካል መጥቶ መውሰድ ይችላል?', t: 'yn', def: yn(dl.pickup !== false) }, { k: 'local', q: 'ማድረስ ያደርጋሉ?', t: 'yn', def: yn(dl.local) },
      { k: 'fee', q: 'የማድረሻ ክፍያ (ብር)፦', t: 'num', if: ['local', 'yes'], def: dv(dl.fee) }, { k: 'areas', q: 'የሚደርሱባቸው አካባቢዎች፦', t: 'text', opt: true, if: ['local', 'yes'], def: dv(dl.areas) },
      { k: 'pm', q: '💳 ክፍያ መቀበያ ዘዴ (ሽያጭዎ የሚላክበት)፦', t: 'choice', o: PAY, def: dv(p.method) }, { k: 'acc', q: 'የአካውንት / ስልክ ቁጥር፦', t: 'text', max: 40, def: dv(p.account) }, { k: 'holder', q: 'የአካውንት ባለቤት ስም፦', t: 'text', max: 60, def: dv(p.holder) },
      { k: 'logo', q: 'የሱቁ አርማ / ፎቶ፦', t: 'photo', max: 1, opt: true },
    ];
    return startFlow(chat, 'shop', steps, { old: r.shop || null }, r.shop ? '✏️ ሱቅ ማስተካከያ — እንዳለ ለማቆየት «እንዳለ ይቀጥል» ይጫኑ።' : '🏪 አዲስ ሱቅ እንክፈት።');
  }
  FIN.shop = async (chat, uid, d, x) => {
    const o = x.old || {}, L = o.links || {};
    const r = await POST('/api/market/shop', uid, { kind: d.kind, name: d.name, category: d.category, about: d.about || '', region: d.region, city: d.city, address: d.address, hours: d.hours || '', phone: d.phone, showPhone: d.showPhone === 'yes', delivery: { pickup: d.pickup === 'yes', local: d.local === 'yes', fee: d.fee || 0, areas: d.areas || '' }, payout: { method: d.pm, account: d.acc, holder: d.holder }, logo: (d.logo && d.logo[0]) || o.logo || '', cover: o.cover || '', gallery: o.gallery || [], links: L, year: o.year || '', tags: o.tags || [], license: o.license || '' });
    await send(chat, r.ok ? (r.status === 'pending' ? '✅ ሱቅዎ ተልኳል — አድሚን ሲያጸድቅ በ Telegram ይነገርዎታል።' : '✅ ተቀምጧል።') : bad(r)); if (r.ok) return myShop(chat, uid);
  };
  async function myProducts(chat, uid) {
    const r = await GET('/api/market/my/shop', uid); if (!r.ok || !r.shop) return send(chat, '🏪 መጀመሪያ ሱቅ ይክፈቱ።', ik([[b('➕ ሱቅ ክፈት', 'mse')]]));
    if (!r.products.length) return send(chat, '🛍 ዕቃ የለም።', ik([[b('➕ ዕቃ ጨምር', 'mpn')]]));
    return send(chat, '🛍 <b>ዕቃዎቼ</b>', ik([...r.products.slice(0, 40).map(p => [b(`${p.status === 'hidden' ? '🙈 ' : ''}${clip(p.title, 22)} · ${ETB(p.price)} · ${p.stock}`, 'mp:' + p.id)]), [b('➕ ዕቃ ጨምር', 'mpn')]]));
  }
  async function productFlow(chat, uid, id) {
    const [r, cf] = await Promise.all([GET('/api/market/my/shop', uid), cfg(uid)]); if (!r.shop) return send(chat, '🏪 መጀመሪያ ሱቅ ይክፈቱ።'); const p = id ? r.products.find(x => x.id === id) : null; if (id && !p) return send(chat, '❌ አልተገኘም');
    return startFlow(chat, 'product', [{ k: 'title', q: 'የዕቃው / የአገልግሎቱ ስም፦', t: 'text', min: 2, max: 80, def: p && p.title }, { k: 'category', q: 'ዘርፍ፦', t: 'choice', o: cf.cats, def: p && p.category }, { k: 'price', q: 'ዋጋ (ብር)፦', t: 'num', def: p && p.price }, { k: 'unit', q: 'መለኪያ (ኪሎ፣ ሊትር፣ አንድ…)፦', t: 'text', opt: true, def: (p && p.unit) || 'አንድ' }, { k: 'stock', q: 'ክምችት (ብዛት)፦', t: 'num', def: p ? p.stock : undefined }, { k: 'desc', q: 'መግለጫ፦', t: 'long', opt: true, def: p && p.desc }, { k: 'imgs', q: 'ፎቶዎች (እስከ 4)፦', t: 'photo', max: 4, opt: true }], { id: id || '', old: p }, id ? '✏️ ዕቃ ማስተካከያ' : '➕ አዲስ ዕቃ');
  }
  FIN.product = async (chat, uid, d, x) => {
    const o = x.old || {}, r = await POST('/api/market/product', uid, { id: x.id || undefined, title: d.title, category: d.category, price: d.price, unit: d.unit || 'አንድ', stock: Math.floor(d.stock || 0), desc: d.desc || '', imgs: d.imgs && d.imgs.length ? d.imgs : o.imgs || [], status: o.status || 'active' });
    await send(chat, r.ok ? '✅ ዕቃው ተቀምጧል።' : bad(r)); if (r.ok) return myProducts(chat, uid);
  };
  async function showMyProduct(chat, uid, id) {
    const r = await GET('/api/market/my/shop', uid), p = (r.products || []).find(x => x.id === id); if (!p) return send(chat, '❌ አልተገኘም');
    return photo(chat, p.imgs && p.imgs[0], `${B(p.title)}\n💰 ${ETB(p.price)} / ${H(p.unit)} · 📦 ${p.stock}\n${p.status === 'hidden' ? '🙈 የተደበቀ' : '🟢 ለህዝብ ክፍት'}\n${H(clip(p.desc, 300))}`, ik([[b('✏️ አርም', 'mpe:' + id), b(p.status === 'hidden' ? '👁 አሳይ' : '🙈 ደብቅ', 'mpt:' + id)], [b('🗑 ሰርዝ', 'mpd:' + id), b('‹ ዕቃዎቼ', 'mpl')]]));
  }
  async function toggleProduct(chat, uid, id) {
    const r = await GET('/api/market/my/shop', uid), p = (r.products || []).find(x => x.id === id); if (!p) return send(chat, '❌ አልተገኘም');
    const w = await POST('/api/market/product', uid, { id, title: p.title, category: p.category, price: p.price, unit: p.unit, stock: p.stock, desc: p.desc, imgs: p.imgs, status: p.status === 'hidden' ? 'active' : 'hidden' });
    await send(chat, w.ok ? '✅ ተቀይሯል' : bad(w)); if (w.ok) return showMyProduct(chat, uid, id);
  }
  async function sellerOrders(chat, uid) {
    const r = await GET('/api/market/seller/orders', uid); if (!r.ok) return send(chat, bad(r)); if (!r.orders.length) return send(chat, '🧾 እስካሁን ትዕዛዝ የለም።');
    for (const o of r.orders.slice(0, 8)) {
      const rows = []; if (o.status === 'paid') rows.push([b('✅ ተቀብያለሁ', 'sa:accept:' + o.id), b('✕ አልችልም', 'sa:decline:' + o.id)]); if (o.status === 'preparing') rows.push([b('🚚 ተልኳል', 'ssh:' + o.id)]); if (o.status === 'settled') rows.push(...await receiptRows(uid, o.id));
      await send(chat, orderTxt(o, `${o.buyer ? `\n👤 ${H(o.buyer.name || 'ደንበኛ')} · 📞 ${H(o.delivery.phone)}${o.delivery.note ? '\n📝 ' + H(o.delivery.note) : ''}` : '\n🔒 የገዥ አድራሻ ክፍያ ከተረጋገጠ በኋላ ይታያል'}\n💰 የሚደርስዎ፦ ${ETB(o.sellerNet)}`), ik(rows));
    }
  }
  FIN.ship = async (chat, uid, d, x) => { const r = await POST(`/api/market/order/${x.id}/ship`, uid, { note: d.note || '' }); return send(chat, r.ok ? '🚚 ገዥው ተነግሯል።' : bad(r)); };

  /* ================= ሥራ፣ ሠራተኛ፣ አሰሪ ================= */
  const sal = s => (!s || (!s.min && !s.max) ? 'በስምምነት' : `${s.min ? ETB(s.min) : ''}${s.max ? ' – ' + ETB(s.max) : ''} / ${s.per}`);
  const jobsMenu = chat => send(chat, '💼 <b>ሥራ እና ሠራተኛ</b>', ik([[b('💼 ክፍት ሥራዎች', 'jl:1'), b('🧑‍🔧 ሠራተኞች', 'wl:1')], [b('📄 ማመልከቻዎቼ', 'mapps'), b('📢 ሥራ አስታውቅ', 'mjn')]]));
  async function listJobs(chat, uid, page) {
    const r = await GET('/api/people/jobs' + qs({ page }), uid); if (!r.ok) return send(chat, bad(r)); if (!r.items.length) return send(chat, 'ክፍት ሥራ የለም።');
    const rows = r.items.map(j => [b(`${clip(j.title, 24)} · ${clip(j.employer ? j.employer.name : '', 14)}`, 'j:' + j.id)]); const nav = []; if (page > 1) nav.push(b('‹', 'jl:' + (page - 1))); if (page * 24 < r.total) nav.push(b('›', 'jl:' + (page + 1))); rows.push(nav);
    return send(chat, `💼 <b>ክፍት ሥራዎች (${r.total})</b>`, ik(rows));
  }
  async function showJob(chat, uid, id) {
    const r = await GET('/api/people/job/' + id, uid); if (!r.ok) return send(chat, bad(r)); const j = r.job;
    return send(chat, `💼 ${B(j.title)} <i>${H(j.type)}</i>\n🏢 ${H(j.employer && j.employer.name)} · 📍 ${H(j.city)}, ${H(j.region)}\n💰 ${H(sal(j.salary))} · 👥 ${j.openings} ቦታ${j.deadline ? ' · ⏳ እስከ ' + j.deadline : ''}\n\n${H(clip(j.description, 1200))}${j.requirements ? '\n\n📋 <b>መስፈርት</b>\n' + H(clip(j.requirements, 700)) : ''}`, ik([[b('📨 አመልክት', 'ja:' + id)], [b('🏢 አሰሪውን ይመልከቱ', 'e:' + j.employer.id), u('🌐 በድረ-ገጽ', web('/jobs/' + id))]]));
  }
  async function listWorkers(chat, uid, page) {
    const r = await GET('/api/people/workers' + qs({ page }), uid); if (!r.ok) return send(chat, bad(r)); if (!r.items.length) return send(chat, 'ሠራተኛ የለም።');
    const rows = r.items.map(w => [b(`${w.availability === 'available' ? '🟢' : '🟡'} ${clip(w.name, 16)} · ${clip(w.title, 16)}`, 'w:' + w.id)]); const nav = []; if (page > 1) nav.push(b('‹', 'wl:' + (page - 1))); if (page * 24 < r.total) nav.push(b('›', 'wl:' + (page + 1))); rows.push(nav);
    return send(chat, `🧑‍🔧 <b>ሠራተኞች (${r.total})</b>`, ik(rows));
  }
  async function showWorker(chat, uid, id) {
    const r = await GET('/api/people/worker/' + id, uid); if (!r.ok) return send(chat, bad(r)); const w = r.worker;
    return photo(chat, w.photo, `🧑‍🔧 ${B(w.name)}\n${H(w.title)} · <i>${H(w.category)}</i>\n📍 ${H(w.city)}, ${H(w.region)} · ${w.exp} ዓመት ልምድ\n${w.rate && w.rate.amount ? '💰 ' + ETB(w.rate.amount) + ' / ' + H(w.rate.per) + '\n' : ''}${(w.skills || []).length ? '🛠 ' + H(w.skills.join('፣ ')) + '\n' : ''}${w.about ? '\n' + H(clip(w.about, 500)) : ''}${w.phone ? '\n📞 ' + H(w.phone) : ''}`, ik([[b('🤝 ቅጥር ጠይቅ', 'wh:' + id)], [u('🌐 በድረ-ገጽ', web('/workers/' + id))]]));
  }
  async function showEmployer(chat, uid, id) {
    const r = await GET('/api/people/employer/' + id, uid); if (!r.ok) return send(chat, bad(r)); const e = r.employer;
    return photo(chat, e.logo, `🏢 ${B(e.name)} <i>${H(e.sector)}</i>\n📍 ${H(e.city)}, ${H(e.region)}${e.about ? '\n\n' + H(clip(e.about, 500)) : ''}${e.phone ? '\n📞 ' + H(e.phone) : ''}`, ik(r.jobs.slice(0, 10).map(j => [b('💼 ' + clip(j.title, 40), 'j:' + j.id)])));
  }
  FIN.apply = async (chat, uid, d, x) => { const r = await POST(`/api/people/job/${x.id}/apply`, uid, { message: d.message || '' }); return send(chat, r.ok ? '✅ ማመልከቻዎ ተልኳል።' : bad(r) + (r.error === 'open_worker_first' ? '\n🧑‍🔧 በ «ገጾቼ → ሠራተኛ ገጽ» ይክፈቱ።' : '')); };
  FIN.hire = async (chat, uid, d, x) => { const r = await POST(`/api/people/worker/${x.id}/hire-request`, uid, { message: d.message }); return send(chat, r.ok ? '✅ ጥያቄዎ ተልኳል።' : bad(r) + (r.error === 'open_employer_first' ? '\n🏢 በ «ገጾቼ → አሰሪ ገጽ» ይክፈቱ።' : '')); };
  async function myApplications(chat, uid) {
    const r = await GET('/api/people/my/applications', uid); if (!r.ok) return send(chat, bad(r)); if (!r.items.length) return send(chat, '📄 ማመልከቻ የለም።');
    for (const a of r.items.slice(0, 10)) await send(chat, `${a.invite ? '🤝 ግብዣ' : '📨 ማመልከቻ'} — ${H(a.job ? a.job.title : '')}\n🏢 ${H(a.employer ? a.employer.name : '')}${a.employer && a.employer.phone ? ' · 📞 ' + H(a.employer.phone) : ''}\n${APPST[a.status] || a.status}`, a.status === 'applied' ? ik([[b('↩️ አንሳ', 'aw:' + a.id)]]) : undefined);
  }
  async function workerFlow(chat, uid) {
    const [r, cf] = await Promise.all([GET('/api/people/my', uid), cfg(uid)]), w = r.worker || {}, me = userOf(uid);
    return startFlow(chat, 'worker', [{ k: 'name', q: 'ሙሉ ስም፦', t: 'text', min: 3, def: dv(w.name) || me.name }, { k: 'title', q: 'ሙያ (አናጢ፣ ሹፌር፣ አስተማሪ…)፦', t: 'text', min: 2, def: dv(w.title) }, { k: 'category', q: 'ዘርፍ፦', t: 'choice', o: cf.workCats, def: dv(w.category) },
      { k: 'skills', q: 'ክህሎቶች (በኮማ ይለዩ)፦', t: 'text', opt: true, def: dv((w.skills || []).join(', ')) }, { k: 'exp', q: 'የልምድ ዓመት፦', t: 'num', def: dv(w.exp) }, { k: 'education', q: 'ትምህርት፦', t: 'text', opt: true, def: dv(w.education) }, { k: 'about', q: 'ስለ እኔ፦', t: 'long', opt: true, def: dv(w.about) },
      { k: 'region', q: 'ክልል፦', t: 'choice', o: REGIONS, def: dv(w.region) }, { k: 'city', q: 'ከተማ፦', t: 'text', def: dv(w.city) }, { k: 'phone', q: 'ስልክ፦', t: 'phone', def: dv(w.phone) || me.phone }, { k: 'showPhone', q: 'ስልኬ ለሁሉም ይታይ?', t: 'yn', def: yn(w.showPhone) },
      { k: 'amount', q: 'የሚጠይቁት ክፍያ (ብር)፦', t: 'num', opt: true, def: dv(w.rate && w.rate.amount) }, { k: 'per', q: 'ክፍያ በ፦', t: 'choice', o: cf.per, def: dv(w.rate && w.rate.per) }, { k: 'av', q: 'ሁኔታ፦', t: 'choice', o: ['🟢 ለሥራ ዝግጁ', '🟡 ተሰማርቻለሁ'], def: w.availability === 'busy' ? '🟡 ተሰማርቻለሁ' : undefined },
      { k: 'languages', q: 'ቋንቋዎች (በኮማ)፦', t: 'text', opt: true, def: dv((w.languages || []).join(', ')) }, { k: 'photo', q: 'የመገለጫ ፎቶ፦', t: 'photo', max: 1, opt: true }, { k: 'gallery', q: 'የሥራ ናሙና ፎቶዎች (እስከ 6)፦', t: 'photo', max: 6, opt: true }], { old: r.worker || null }, r.worker ? '✏️ ሠራተኛ ገጽ ማስተካከያ' : '🧑‍🔧 ሠራተኛ ገጽ እንክፈት።');
  }
  FIN.worker = async (chat, uid, d, x) => {
    const o = x.old || {}, r = await POST('/api/people/worker', uid, { name: d.name, title: d.title, category: d.category, skills: d.skills || '', exp: d.exp || 0, education: d.education || '', about: d.about || '', region: d.region, city: d.city, phone: d.phone, showPhone: d.showPhone === 'yes', rate: { amount: d.amount || 0, per: d.per || 'ቀን' }, availability: d.av === '🟡 ተሰማርቻለሁ' ? 'busy' : 'available', languages: d.languages || '', photo: (d.photo && d.photo[0]) || o.photo || '', gallery: d.gallery && d.gallery.length ? d.gallery : o.gallery || [], visible: o.status !== 'hidden' });
    return send(chat, r.ok ? '✅ ሠራተኛ ገጽዎ ተቀምጧል።' : bad(r), r.ok ? ik([[u('🌐 ገጹን ይመልከቱ', web('/workers/' + r.id))]]) : undefined);
  };
  async function employerFlow(chat, uid) {
    const r = await GET('/api/people/my', uid), e = r.employer || {}, me = userOf(uid);
    return startFlow(chat, 'employer', [{ k: 'name', q: 'የድርጅት / የአሰሪ ስም፦', t: 'text', min: 3, def: dv(e.name) }, { k: 'sector', q: 'ዘርፍ (ንግድ፣ ግንባታ፣ ትምህርት…)፦', t: 'text', def: dv(e.sector) }, { k: 'about', q: 'ስለ ድርጅቱ፦', t: 'long', opt: true, def: dv(e.about) }, { k: 'region', q: 'ክልል፦', t: 'choice', o: REGIONS, def: dv(e.region) }, { k: 'city', q: 'ከተማ፦', t: 'text', def: dv(e.city) }, { k: 'address', q: 'አድራሻ፦', t: 'text', opt: true, def: dv(e.address) },
      { k: 'phone', q: 'ስልክ፦', t: 'phone', def: dv(e.phone) || me.phone }, { k: 'showPhone', q: 'ስልኩ ለሁሉም ይታይ?', t: 'yn', def: yn(e.showPhone) }, { k: 'size', q: 'የሠራተኛ ብዛት፦', t: 'choice', o: ['1–10', '11–50', '51–200', '200+'], def: dv(e.size) }, { k: 'license', q: 'የንግድ ፈቃድ ቁጥር (ለአድሚን)፦', t: 'text', opt: true, def: dv(e.license) }, { k: 'logo', q: 'አርማ፦', t: 'photo', max: 1, opt: true }], { old: r.employer || null }, r.employer ? '✏️ አሰሪ ገጽ ማስተካከያ' : '🏢 አሰሪ ገጽ እንክፈት።');
  }
  FIN.employer = async (chat, uid, d, x) => {
    const o = x.old || {}, r = await POST('/api/people/employer', uid, { name: d.name, sector: d.sector, about: d.about || '', region: d.region, city: d.city, address: d.address || '', phone: d.phone, showPhone: d.showPhone === 'yes', size: d.size || '', license: d.license || '', logo: (d.logo && d.logo[0]) || o.logo || '', links: o.links || {} });
    return send(chat, r.ok ? '✅ አሰሪ ገጽዎ ተቀምጧል።' : bad(r), r.ok ? ik([[b('📢 ሥራ አስታውቅ', 'mjn')]]) : undefined);
  };
  async function jobFlow(chat, uid, id) {
    const [cf, jr] = await Promise.all([cfg(uid), id ? GET('/api/people/job/' + id, uid) : null]), j = jr && jr.ok ? jr.job : {}, s = j.salary || {};
    return startFlow(chat, 'job', [{ k: 'title', q: 'የሥራው ርዕስ፦', t: 'text', min: 3, def: dv(j.title) }, { k: 'category', q: 'ዘርፍ፦', t: 'choice', o: cf.workCats, def: dv(j.category) }, { k: 'type', q: 'የሥራ ዓይነት፦', t: 'choice', o: cf.jobTypes, def: dv(j.type) }, { k: 'description', q: 'የሥራ መግለጫ፦', t: 'long', min: 10, def: dv(j.description) }, { k: 'requirements', q: 'መስፈርቶች፦', t: 'long', opt: true, def: dv(j.requirements) },
      { k: 'smin', q: 'ዝቅተኛ ደመወዝ (ብር)፦', t: 'num', opt: true, def: dv(s.min) }, { k: 'smax', q: 'ከፍተኛ ደመወዝ (ብር)፦', t: 'num', opt: true, def: dv(s.max) }, { k: 'per', q: 'ደመወዝ በ፦', t: 'choice', o: cf.per, def: dv(s.per) }, { k: 'openings', q: 'የሚፈለጉ ሰዎች ብዛት፦', t: 'num', def: dv(j.openings) || 1 }, { k: 'region', q: 'ክልል፦', t: 'choice', o: REGIONS, def: dv(j.region) }, { k: 'city', q: 'ከተማ፦', t: 'text', def: dv(j.city) }, { k: 'deadline', q: 'የማመልከቻ ማብቂያ ቀን፦', t: 'date', opt: true, def: dv(j.deadline) }], { id: id || '' }, id ? '✏️ ሥራ ማስተካከያ' : '📢 አዲስ የሥራ ማስታወቂያ');
  }
  FIN.job = async (chat, uid, d, x) => {
    const r = await POST('/api/people/job', uid, { id: x.id || undefined, title: d.title, category: d.category, type: d.type, description: d.description, requirements: d.requirements || '', salary: { min: d.smin || 0, max: d.smax || 0, per: d.per || 'ወር', negotiable: !d.smin && !d.smax }, openings: Math.floor(d.openings || 1), region: d.region, city: d.city, deadline: d.deadline || '' });
    return send(chat, r.ok ? '✅ ሥራው ተቀምጧል።' : bad(r) + (r.error === 'open_employer_first' ? '\n🏢 መጀመሪያ አሰሪ ገጽ ይክፈቱ።' : ''), r.ok ? ik([[b('📢 ሥራዎቼ', 'mj')]]) : ik([[b('🏢 አሰሪ ገጽ ክፈት', 'mee')]]));
  };
  async function myJobs(chat, uid) {
    const r = await GET('/api/people/my', uid); if (!r.ok) return send(chat, bad(r)); if (!r.employer) return send(chat, '🏢 ሥራ ለማስታወቅ መጀመሪያ አሰሪ ገጽ ይክፈቱ።', ik([[b('➕ አሰሪ ገጽ ክፈት', 'mee')]]));
    return send(chat, '📢 <b>የእኔ የሥራ ማስታወቂያዎች</b>', ik([...r.jobs.filter(j => !j.deleted).map(j => [b(`${j.status === 'open' ? '🟢' : '⚪'} ${clip(j.title, 26)} · ${j.applicants} 👥`, 'mjv:' + j.id)]), [b('➕ አዲስ ሥራ', 'mjn')]]));
  }
  async function applicants(chat, uid, jobId) {
    const r = await GET('/api/people/my/applicants' + qs({ jobId }), uid); if (!r.ok) return send(chat, bad(r)); if (!r.items.length) return send(chat, '👥 እስካሁን አመልካች የለም።');
    for (const a of r.items.slice(0, 10)) { const w = a.worker || {}; await send(chat, `👤 ${B(w.name)} — ${H(w.title)}\n📍 ${H(w.city)} · ${w.exp} ዓመት\n📞 ${H(w.phone)}\n${a.message ? '💬 ' + H(clip(a.message, 300)) + '\n' : ''}${APPST[a.status] || a.status}`, ik([[b('⭐ ዝርዝር', `as:${a.id}:shortlisted`), b('🎉 ቅጠር', `as:${a.id}:hired`), b('✖️ ውድቅ', `as:${a.id}:rejected`)]])); }
  }

  /* ================= የራስ ገጽ (ድረ-ገጽ) — Google Form እንደሚሠራ ================= */
  const FT = { text: 'text', long: 'long', number: 'num', phone: 'phone', link: 'link', date: 'date', choice: 'choice', multi: 'multi', yesno: 'yn', image: 'photo' };
  const fstep = (k, label, f, def, opt) => ({ k, q: label, t: FT[f.type] || 'text', o: f.options, max: f.type === 'image' ? 6 : undefined, loose: true, opt: opt !== false && !f.required, def: dv(def) });
  const valTxt = f => (f.type === 'image' ? `🖼 ${f.value.length} ፎቶ` : Array.isArray(f.value) ? f.value.join('፣ ') : f.type === 'yesno' ? (f.value === 'yes' ? 'አዎ' : 'አይደለም') : String(f.value));
  async function listPages(chat, uid, page) {
    const r = await GET('/api/pages' + qs({ page }), uid); if (!r.ok) return send(chat, bad(r)); if (!r.items.length) return send(chat, '🌐 ገና ገጽ የለም — የመጀመሪያው ይሁኑ!', ik([[b('➕ ገጽ ክፈት', 'pgn')]]));
    const rows = r.items.map(p => [b(`${clip(p.title, 24)} · ${p.kind}`, 's:' + p.id)]); const nav = []; if (page > 1) nav.push(b('‹', 'pg:' + (page - 1))); if (page * 24 < r.total) nav.push(b('›', 'pg:' + (page + 1))); rows.push(nav, [b('➕ የራሴን ገጽ ክፈት', 'pgn')]);
    return send(chat, `🌐 <b>ገጾች (${r.total})</b>`, ik(rows));
  }
  async function showPage(chat, uid, id) {
    const r = await GET('/api/pages/' + id, uid); if (!r.ok) return send(chat, bad(r)); const p = r.page;
    const rows = p.sections.map((s, k) => [b(`${s.icon} ${clip(s.title, 30)} (${s.fields.length}) 👁`, `ss:${id}:${k}`)]); if (p.form) rows.push([b('📝 ' + clip(p.form.title, 30), 'sf:' + id)]); rows.push([u('🌐 በድረ-ገጽ ክፈት', web('/site/' + id))]);
    return photo(chat, p.cover || p.logo, `🌐 ${B(p.title)} <i>${H(p.kind)}</i>\n${p.tagline ? '✨ ' + H(p.tagline) + '\n' : ''}${p.city || p.region ? '📍 ' + H([p.city, p.region].filter(Boolean).join(', ')) + '\n' : ''}${p.phone ? '📞 ' + H(p.phone) + '\n' : ''}${p.about ? '\n' + H(clip(p.about, 500)) : ''}\n\n👇 ክፍል ለማየት 👁 ይጫኑ`, ik(rows));
  }
  async function showSection(chat, uid, id, k) {
    const r = await GET('/api/pages/' + id, uid); if (!r.ok) return send(chat, bad(r)); const s = r.page.sections[Number(k)]; if (!s) return;
    await send(chat, `${s.icon} ${B(s.title)}\n\n${s.fields.map(f => `▫️ <b>${H(f.label)}</b>\n${f.type === 'link' ? H(f.value) : H(valTxt(f))}`).join('\n\n')}`, ik([[b('‹ ወደ ገጹ', 's:' + id)]]));
    for (const f of s.fields.filter(x => x.type === 'image')) for (const im of f.value.slice(0, 3)) await photo(chat, im, `🖼 ${H(f.label)}`);
  }
  async function visitorForm(chat, uid, id) {
    const r = await GET('/api/pages/' + id, uid); if (!r.ok || !r.page.form) return send(chat, '❌ ቅጽ የለም'); const f = r.page.form;
    return startFlow(chat, 'respond', f.fields.map(x => ({ ...fstep('q' + x.id, x.label + (x.required ? ' *' : ''), x, undefined, false), opt: !x.required, k: x.id })), { id }, `📝 <b>${H(f.title)}</b>${f.intro ? '\n' + H(f.intro) : ''}`);
  }
  FIN.respond = async (chat, uid, d, x) => { const ans = {}; Object.entries(d).forEach(([k, v]) => { ans[k] = v === 'yes' || v === 'no' ? v : v; }); const r = await POST(`/api/pages/${x.id}/respond`, uid, { answers: ans }); return send(chat, r.ok ? '🎉 ተልኳል! ባለቤቱ ያገኝዎታል።' : bad(r)); };
  async function myPages(chat, uid) {
    const r = await GET('/api/pages/my/list', uid); if (!r.ok) return send(chat, bad(r));
    return send(chat, '🌐 <b>የራሴ ገጾች</b>\nሠራተኛ፣ አሰሪ፣ ሱቅ፣ ሆቴል… ማንኛውንም ዓይነት ገጽ ይክፈቱ።', ik([...r.items.map(p => [b(`${p.status === 'active' ? '🟢' : p.status === 'hidden' ? '🙈' : '⛔'} ${clip(p.title, 22)}${p.unseen ? ' 📬' + p.unseen : ''}`, 'mpg:' + p.id)]), [b('➕ አዲስ ገጽ ክፈት', 'pgn')]]));
  }
  async function manageMyPage(chat, uid, id) {
    const r = await GET('/api/pages/my/' + id, uid); if (!r.ok) return send(chat, bad(r)); const p = r.page, n = p.sections.reduce((a, s) => a + s.fields.length, 0);
    return send(chat, `🌐 ${B(p.title)} <i>${H(p.kind)}</i>\n${p.status === 'active' ? '🟢 ለህዝብ ክፍት' : p.status === 'hidden' ? '🙈 የተደበቀ' : '⛔ ታግዷል'}\n${p.sections.length} ክፍሎች · ${n} ጥያቄዎች${p.form && p.form.enabled ? ' · 📝 የጎብኝ ቅጽ አለ' : ''}`, ik([[b('✏️ መልሶቼን አርም', 'pgf:' + id), b('📬 የመጡ መልሶች', 'rsp:' + id)], [b(p.status === 'hidden' ? '👁 አሳይ' : '🙈 ደብቅ', 'pgv:' + id), b('🗑 ሰርዝ', 'pgd:' + id)], [u('👁 ገጹን ክፈት', web('/site/' + id))], [u('🧩 ጥያቄዎችን መጨመር/መቀየር (አርታዒ)', web('/me/sites/' + id))]]));
  }
  const pagePayload = (p, patch) => ({ id: p.id, title: p.title, kind: p.kind, tagline: p.tagline, about: p.about, theme: p.theme, logo: p.logo, cover: p.cover, gallery: p.gallery, region: p.region, city: p.city, phone: p.phone, showPhone: p.showPhone, sections: p.sections, form: p.form, visible: p.status !== 'hidden', ...patch });
  async function fillMyPage(chat, uid, id) {
    const r = await GET('/api/pages/my/' + id, uid); if (!r.ok) return send(chat, bad(r)); const steps = [];
    r.page.sections.forEach((s, i) => s.fields.forEach((f, j) => steps.push({ ...fstep(`v${i}_${j}`, `${s.icon} ${s.title} › ${f.label}${f.priv ? ' 🔒' : ''}`, f, f.value, true), opt: true })));
    if (!steps.length) return send(chat, 'ይህ ገጽ ጥያቄ የለውም — በድረ-ገጽ አርታዒ ይጨምሩ።'); return startFlow(chat, 'pagefill', steps, { id }, `✏️ <b>${H(r.page.title)}</b> — መልሶችን አርም። «እንዳለ ይቀጥል» ወይም «ዝለል» ይጠቀሙ፤ ⏩ ሲጫኑ ይቀመጣል።`, true);
  }
  FIN.pagefill = async (chat, uid, d, x) => {
    const r = await GET('/api/pages/my/' + x.id, uid); if (!r.ok) return send(chat, bad(r)); const p = r.page;
    p.sections.forEach((s, i) => s.fields.forEach((f, j) => { const v = d[`v${i}_${j}`]; if (v !== undefined && v !== '') f.value = f.type === 'number' ? String(v) : v; }));
    const w = await POST('/api/pages', uid, pagePayload(p)); return send(chat, w.ok ? '✅ ተቀምጧል — ገጽዎ ዘምኗል።' : bad(w), w.ok ? ik([[u('👁 ገጹን ይመልከቱ', web('/site/' + x.id))]]) : undefined);
  };
  async function pageTemplates(chat) { return send(chat, '✨ <b>ገጽዎን በምን ይጀምሩ?</b>\nአንዱን ይምረጡ — ጥያቄ በጥያቄ እጠይቅዎታለሁ፤ ከዚያ ገጹ እንደ ራስዎ ድረ-ገጽ ይሆናል።', ik(TEMPLATES.map(t => [b(`${t.icon} ${t.name}`, 'pgt:' + t.key)]))); }
  function createPageFlow(chat, uid, key) {
    const t = TEMPLATES.find(x => x.key === key); if (!t) return; const steps = [{ k: 'title', q: 'የገጹ ርዕስ (ስም)፦', t: 'text', min: 2, max: 80 }, { k: 'tagline', q: 'አጭር መፈክር፦', t: 'text', opt: true, def: dv(t.tagline) }, { k: 'city', q: 'ከተማ፦', t: 'text', opt: true }];
    t.build().forEach((s, i) => s.fields.forEach((f, j) => steps.push({ ...fstep(`v${i}_${j}`, `${s.icon} ${s.title} › ${f.label}${f.priv ? ' 🔒' : ''}`, f, undefined, true), opt: !f.required })));
    return startFlow(chat, 'pagenew', steps, { key }, `${t.icon} <b>${H(t.name)}</b> — ${steps.length - 3} ጥያቄዎች አሉ። የማያውቁትን «ዝለል» ይጫኑ፤ ⏩ «አሁን ጨርሽ» ሲጫኑ ያለዎት ይቀመጣል። 🔒 ምልክት ያላቸው መልሶች ለህዝብ አይታዩም።`, true);
  }
  FIN.pagenew = async (chat, uid, d, x) => {
    const t = TEMPLATES.find(y => y.key === x.key), me = userOf(uid), secs = t.build();
    secs.forEach((s, i) => s.fields.forEach((f, j) => { const v = d[`v${i}_${j}`]; if (v !== undefined) f.value = v; }));
    const r = await POST('/api/pages', uid, { title: d.title || t.name, kind: t.kind, tagline: d.tagline || '', city: d.city || '', theme: 'green', phone: me.phone || '', showPhone: false, sections: secs, form: { enabled: false, title: 'ቅጽ ይሙሉ', intro: '', button: 'ላክ', fields: [] }, visible: true });
    return send(chat, r.ok ? '🎉 ገጽዎ ተከፈተ!\nፎቶ፣ ቀለም፣ ተጨማሪ ጥያቄዎች እና የጎብኝ ቅጽ በድረ-ገጽ አርታዒ ይጨምራሉ።' : bad(r), r.ok ? ik([[u('👁 ገጼን ይመልከቱ', web('/site/' + r.id)), u('🧩 አርታዒ', web('/me/sites/' + r.id))], [b('🌐 የራሴ ገጾች', 'mpg')]]) : undefined);
  };
  async function pageResponses(chat, uid, id) {
    const r = await GET(`/api/pages/my/${id}/responses`, uid); if (!r.ok) return send(chat, bad(r)); if (!r.items.length) return send(chat, '📭 እስካሁን መልስ አልደረሰም።');
    for (const it of r.items.slice(0, 8)) await send(chat, `📬 ${B(it.from.name || it.from.email || 'ተጠቃሚ')}${it.from.phone ? ' · 📞 ' + H(it.from.phone) : ''}\n<i>${new Date(it.ts).toLocaleString('en-GB', { timeZone: 'Africa/Addis_Ababa' })}</i>\n\n${r.fields.filter(f => it.answers[f.id] !== undefined).map(f => `▫️ <b>${H(f.label)}</b>: ${H(Array.isArray(it.answers[f.id]) ? it.answers[f.id].join('፣ ') : it.answers[f.id] === 'yes' ? 'አዎ' : it.answers[f.id] === 'no' ? 'አይደለም' : it.answers[f.id])}`).join('\n')}`);
  }

  /* ================= የግል መረጃ እና የይለፍ ቃል ================= */
  async function privateFlow(chat, uid) {
    const r = await GET('/api/me/private', uid), p = r.data || {};
    return startFlow(chat, 'private', [{ k: 'fullName', q: 'ሙሉ ስም (በመታወቂያ)፦', t: 'text', min: 3, def: dv(p.fullName) || userOf(uid).name }, { k: 'idNo', q: 'የመታወቂያ ቁጥር፦', t: 'text', opt: true, def: dv(p.idNo) }, { k: 'dob', q: 'የትውልድ ቀን (2000-01-31)፦', t: 'text', opt: true, def: dv(p.dob) }, { k: 'addr', q: 'አድራሻ፦', t: 'text', opt: true, def: dv(p.addr) }, { k: 'tin', q: 'TIN ቁጥር፦', t: 'text', opt: true, def: dv(p.tin) }, { k: 'emName', q: 'የአደጋ ጊዜ ተጠሪ ስም፦', t: 'text', opt: true, def: dv(p.emName) }, { k: 'emPhone', q: 'የተጠሪ ስልክ፦', t: 'phone', loose: true, opt: true, def: dv(p.emPhone) }, { k: 'note', q: 'ማስታወሻ፦', t: 'text', opt: true, def: dv(p.note) }], {}, '🪪 የግል መረጃ — ለአድሚን ብቻ ነው የሚታየው፤ ለህዝብ አይታይም።');
  }
  FIN.private = async (chat, uid, d) => { const r = await api('PUT', '/api/me/private', uid, { fullName: d.fullName, idNo: d.idNo || '', dob: d.dob || '', addr: d.addr || '', tin: d.tin || '', emName: d.emName || '', emPhone: d.emPhone || '', note: d.note || '' }); return send(chat, r.ok ? '✅ ተቀምጧል' : bad(r)); };

  /* ================= አካውንቴ (መገለጫ፣ ማስተካከያ፣ መውጣት፣ መሰረዝ) ================= */
  const prefs = uid => (getStore().docs['data/users/' + uid] || {}).prefs || {};
  function accountMenu(chat, uid) {
    const d = getStore().docs['data/users/' + uid] || {}, a = d.acct || {}, l = getDb().accounts[accKey(a)] || {}, muted = !!prefs(uid).mute;
    return send(chat, `⚙️ <b>አካውንቴ</b>\n\n👤 ${H(userOf(uid).name || '—')}\n📧 ${H(a.email)}\n📞 ${H(a.phone)}\n✈️ Telegram፦ ${l.username ? '@' + H(l.username) : 'ተገናኝቷል'}\n📅 የተከፈተው፦ ${a.ts ? new Date(a.ts).toLocaleDateString('en-GB') : '—'}\n🔔 ማሳወቂያ፦ ${muted ? '🔕 ድምጸ-ከል (ቁልፍ የሌላቸው መልዕክቶች አይላኩም)' : '🔔 በርቷል'}`, ik([
      [b('✏️ ስም ቀይር', 'acn'), b('📧 ኢሜይል ቀይር', 'ace')], [b('📱 ስልክ ቀይር', 'acp'), b('🔑 የይለፍ ቃል ቀይር', 'pw')], [b(muted ? '🔔 ማሳወቂያ አብራ' : '🔕 ማሳወቂያ አጥፋ', 'accn')], [b('🚪 ውጣ (Log out)', 'lo'), b('🗑 አካውንት ሰርዝ', 'adel')]]));
  }
  async function pwOk(chat, uid, pw) { const ok = await authApi.verifyPassword(uid, pw); if (ok === null) { await send(chat, '⏳ ብዙ ሙከራ — ከ15 ደቂቃ በኋላ ይሞክሩ።'); return false; } if (!ok) { await send(chat, '❌ የአሁኑ የይለፍ ቃል ትክክል አይደለም።'); return false; } return true; }
  const PWQ = { k: 'cur', q: '🔑 አሁን ያለዎትን የይለፍ ቃል ይጻፉ (መልዕክቱ ይሰረዛል)፦', t: 'text', min: 1, max: 128, secret: true };
  FIN.acname = async (chat, uid, d) => { const e = await authApi.setName(uid, d.name); await send(chat, e ? bad({ error: e }) : '✅ ስም ተቀይሯል'); return accountMenu(chat, uid); };
  FIN.acemail = async (chat, uid, d) => { if (!(await pwOk(chat, uid, d.cur))) return; const e = await authApi.changeIdentity(uid, { email: d.email }); rebuild(); await send(chat, e ? bad({ error: e }) : '✅ ኢሜይል ተቀይሯል — በድረ-ገጹ በአዲሱ ኢሜይል ይግቡ።'); return accountMenu(chat, uid); };
  FIN.acphone = async (chat, uid, d) => { if (!(await pwOk(chat, uid, d.cur))) return; ses(chat).auth = { stage: 'chphone', uid }; save(); return send(chat, '📱 አዲሱን ስልክ ቁጥርዎን ለማረጋገጥ ከታች «ስልኬን አጋራ» ይጫኑ።\n⚠️ በዚህ Telegram አካውንት ላይ የተመዘገበ ቁጥር መሆን አለበት።', CONTACT_KB); };
  FIN.password = async (chat, uid, d) => { if (!(await pwOk(chat, uid, d.cur))) return; const e = await authApi.setPassword(uid, d.pw); return send(chat, e ? bad({ error: e }) : '✅ አዲሱ የይለፍ ቃል ተቀምጧል — በድረ-ገጹ ለመግባት ይጠቀሙት።'); };
  FIN.acdel = async (chat, uid, d) => {
    if (String(d.confirm).trim() !== 'ሰርዝ') return send(chat, '✖️ አልተረጋገጠም — አካውንትዎ አልተሰረዘም።'); if (!(await pwOk(chat, uid, d.cur))) return;
    const e = await authApi.deleteAccount(uid); if (e) return send(chat, bad({ error: e })); rebuild(); delete S[chat]; save();
    return send(chat, '🗑 አካውንትዎ ተሰርዟል፤ ሱቅዎ እና ገጾችዎ ከህዝብ ተደብቀዋል። እንደገና መመዝገብ ከፈለጉ ከታች ይጫኑ።', { remove_keyboard: true }).then(() => send(chat, '👇', ik([[b('🔐 ግባ / ተመዝገብ', 'login')]])));
  };
  async function logout(chat, uid) {
    authApi.unlinkChat(uid); rebuild(); delete S[chat]; save();
    await send(chat, '🚪 ከአካውንትዎ ወጥተዋል። ጋሪዎ ተጠርጓል፤ የ Telegram ማሳወቂያዎችም ይቆማሉ።\n\nℹ️ በድረ-ገጹ ለመግባት የ Telegram ግንኙነት እንደገና ያስፈልጋል — ከዚህ ቦት ተመልሰው ሲገቡ በራሱ ይገናኛል።', { remove_keyboard: true });
    return send(chat, '👇 እንደገና ለመግባት ወይም ሌላ አካውንት ለመክፈት፦', ik([[b('🔐 ግባ / ተመዝገብ', 'login')]]));
  }

  /* ================= አድሚን (ADMIN_TELEGRAM_CHAT_ID ብቻ) ================= */
  const AD = (m, p, d) => api(m, p, 'admin', d);
  const adminTxt = o => `${orderTxt(o)}${o.buyer ? `\n👤 ${H(o.buyer.name || '')} ${H(o.buyer.email || '')} ${H(o.buyer.phone || '')}` : ''}${o.payment ? `\n💳 ${H(o.payment.method)} · ማጣቀሻ፦ <code>${H(o.payment.ref)}</code>${o.payment.note ? ' · ' + H(o.payment.note) : ''}` : ''}${o.payout ? `\n🏦 ${H(o.payout.method)} · <code>${H(o.payout.account)}</code> · ${H(o.payout.holder)}` : ''}${o.dispute ? '\n⚖️ ' + H(o.dispute.reason) : ''}`;
  async function adminHub(chat) {
    const r = await AD('GET', '/api/market/admin/overview'); if (!r.ok) return send(chat, '❌ አድሚን አልተፈቀደም (ADMIN_PASSWORD ያረጋግጡ)');
    const c = r.counts;
    return send(chat, `🛡 <b>አድሚን</b>\n🏪 ሱቆች ${c.shops} · 🛍 ዕቃዎች ${c.products} · 📦 ትዕዛዞች ${c.orders}\n💵 GMV፦ ${ETB(c.gmv)} · 💰 ኮሚሽን፦ ${ETB(c.commission)}\n⚙️ ኮሚሽን ${r.config.commissionPct}%`, ik([
      [b(`💳 ክፍያ ለማረጋገጥ (${r.payments.length})`, 'apay')], [b(`🏪 ሱቅ ለማጽደቅ (${r.pendingShops.length})`, 'ashp'), b(`💰 ለሻጭ ለመክፈል (${r.toSettle.length})`, 'asl')], [b(`↩️ ተመላሽ (${r.refunds.length})`, 'arfl'), b(`⚖️ ክርክር (${r.disputes.length})`, 'adis')], [b('🌐 ገጾች/ሰዎች ቁጥጥር', 'amod')], [u('🖥 የአድሚን ድረ-ገጽ', web('/admin'))]]));
  }
  async function adminList(chat, kind) {
    const r = await AD('GET', '/api/market/admin/overview'); if (!r.ok) return send(chat, bad(r));
    if (kind === 'ashp') { if (!r.pendingShops.length) return send(chat, '✅ የሚጠብቅ ሱቅ የለም።'); for (const s of r.pendingShops) await send(chat, `🏪 ${B(s.name)} <i>${H(s.kind)}</i>\n📍 ${H(s.city)}, ${H(s.region)} — ${H(s.address)}\n👤 ${H(s.owner.name)} · ${H(s.owner.email)} · ${H(s.owner.phone)}\n🏦 ${H(s.payout && s.payout.method)} ${H(s.payout && s.payout.account)}${s.license ? '\n🪪 ' + H(s.license) : ''}`, ik([[b('✅ አጽድቅ', `ash:${s.id}:active`), b('❌ ውድቅ', 'ashr:' + s.id)]])); return; }
    const L = { apay: [r.payments, o => [[b('✅ አረጋግጥ', `avp:${o.id}:1`), b('❌ ውድቅ', `avp:${o.id}:0`)]], '✅ የሚጠብቅ ክፍያ የለም።'], asl: [r.toSettle, o => [[b('💰 ተከፍሏል — ማጣቀሻ አስገባ', 'ast:' + o.id)]], '✅ የሚከፈል የለም።'], arfl: [r.refunds, o => [[b('↩️ ተመላሽ ተደርጓል — ማጣቀሻ', 'arf:' + o.id)]], '✅ ተመላሽ የለም።'], adis: [r.disputes, o => [[b('💰 ለሻጭ ልቀቅ', 'arl:' + o.id), b('↩️ ለገዥ መልስ', 'arf:' + o.id)]], '✅ ክርክር የለም።'] }[kind];
    if (!L[0].length) return send(chat, L[2]); for (const o of L[0].slice(0, 10)) await send(chat, adminTxt(o), ik(L[1](o)));
  }
  const ADMIN_FLOWS = { ast: ['settle', 'ለሻጭ የከፈሉበት ማጣቀሻ ቁጥር፦'], arf: ['refund', 'የተመላሽ ማጣቀሻ ቁጥር፦'], arl: ['release', 'ለሻጭ የከፈሉበት ማጣቀሻ ቁጥር፦'] };
  FIN.aorder = async (chat, uid, d, x) => { const r = await AD('POST', `/api/market/admin/order/${x.id}/${x.act}`, x.act === 'verify-payment' ? { ok: false, note: d.ref } : { ref: d.ref }); return send(chat, r.ok ? '✅ ተከናውኗል — ተሳታፊዎች በ Telegram ተነግረዋል።' : bad(r)); };
  FIN.ashop = async (chat, uid, d, x) => { const r = await AD('POST', `/api/market/admin/shop/${x.id}/status`, { status: 'rejected', note: d.note }); return send(chat, r.ok ? '✅ ውድቅ ተደርጓል' : bad(r)); };
  async function modList(chat) {
    const [g, p] = await Promise.all([AD('GET', '/api/pages/admin/list'), AD('GET', '/api/people/admin/overview')]); const rows = [];
    (g.items || []).slice(0, 12).forEach(x => rows.push([b(`${x.status === 'suspended' ? '✅ መልስ' : '⛔ አግድ'} 🌐 ${clip(x.title, 22)}`, `apt:pg:${x.id}:${x.status === 'suspended' ? 'active' : 'suspended'}`)]));
    (p.workers || []).slice(0, 8).forEach(x => rows.push([b(`${x.status === 'suspended' ? '✅ መልስ' : '⛔ አግድ'} 🧑‍🔧 ${clip(x.name, 22)}`, `apt:w:${x.id}:${x.status === 'suspended' ? 'active' : 'suspended'}`)]));
    (p.employers || []).slice(0, 8).forEach(x => rows.push([b(`${x.status === 'suspended' ? '✅ መልስ' : '⛔ አግድ'} 🏢 ${clip(x.name, 22)}`, `apt:e:${x.id}:${x.status === 'suspended' ? 'active' : 'suspended'}`)]));
    (p.jobs || []).slice(0, 8).forEach(x => rows.push([b(`${x.status === 'suspended' ? '✅ መልስ' : '⛔ አግድ'} 💼 ${clip(x.title, 22)}`, `apt:j:${x.id}:${x.status === 'suspended' ? 'open' : 'suspended'}`)]));
    return send(chat, '🌐 <b>ገጾች እና ሰዎች ቁጥጥር</b> (የቅርብ ጊዜዎች)', ik(rows.length ? rows : [[b('ምንም የለም', 'noop')]]));
  }

  /* ================= እገዛ ================= */
  const HELP = `❓ <b>እገዛ — ቦቱ የሚያደርገው</b>\n\n🛍 <b>ገበያ</b> — ዕቃ ይፈልጉ፣ ጋሪ፣ ይዘዙ፣ ክፍያ ይላኩ፣ ደረሰኝ ያውርዱ፣ ግምገማ ይስጡ\n🏪 <b>ሱቆች</b> — ሱቆችን ይመልከቱ\n💼 <b>ሥራ</b> — ክፍት ሥራ፣ ሠራተኞች፣ ማመልከት፣ መቅጠር\n🌐 <b>ገጾች</b> — የሌሎችን ገጽ ይመልከቱ (👁)፣ ቅጽ ይሙሉ\n👤 <b>ገጾቼ</b> — የራስዎን ገጽ (ሠራተኛ፣ አሰሪ፣ ሱቅ፣ ሆቴል…) ይክፈቱ እና ያስተዳድሩ፤ ዕቃ እና ትዕዛዝ፤ ሥራ ማስታወቅ፤ የግል መረጃ\n\n/menu — ዋና ማውጫ · /cancel — የጀመሩትን ሰርዝ`;

  /* ================= ራውተር ================= */
  const LABELS = { '🛍 ገበያ': 'market', '🏪 ሱቆች': 'shops', '💼 ሥራ': 'jobs', '🌐 ገጾች': 'pages', '🛒 ጋሪ': 'cart', '📦 ትዕዛዞቼ': 'orders', '👤 ገጾቼ': 'me', '🔎 ፈልግ': 'search', '❓ እገዛ': 'help', '🛡 አድሚን': 'admin' };
  async function action(chat, uid, a) {
    switch (a) {
      case 'market': return marketHome(chat, uid); case 'shops': return listShops(chat, uid); case 'jobs': return jobsMenu(chat); case 'pages': return listPages(chat, uid, 1);
      case 'cart': return showCart(chat); case 'orders': return listOrders(chat, uid); case 'me': return hub(chat, uid); case 'help': return send(chat, HELP, menuKb(chat));
      case 'search': return startFlow(chat, 'search', [{ k: 'q', q: '🔎 የሚፈልጉትን ዕቃ ስም ይጻፉ፦', t: 'text', min: 2, max: 60 }]);
      case 'admin': return isAdmin(chat) ? adminHub(chat) : send(chat, '⛔ አድሚን ብቻ');
    }
  }
  async function onText(chat, text, msg) {
    const t = text.trim(), s = ses(chat), uid = uidOf(chat);
    if (/^\/cancel\b/.test(t)) { s.flow = null; s.auth = null; save(); return home(chat, '✖️ ተሰርዟል።'); }
    if (/^\/myid\b/.test(t)) return send(chat, `🆔 Chat ID፦ <code>${chat}</code>`);
    if (/^\/(start|menu|login)\b/.test(t)) { s.flow = null; if (uid) return home(chat, `🇪🇹 <b>ኢትዮ ዲጂታል ማርኬት</b>\nእንኳን ደህና መጡ ${H(userOf(uid).name)}!`); s.auth = null; return authStart(chat); }
    if (/^\/account\b/.test(t) && uid) return accountMenu(chat, uid);
    if (/^\/logout\b/.test(t) && uid) return send(chat, '🚪 ከአካውንትዎ መውጣት ይፈልጋሉ?', ik([[b('✅ አዎ ውጣ', 'loc'), b('✖️ አይ', 'acc')]]));
    if (/^\/help\b/.test(t) || t === '❓ እገዛ') return send(chat, HELP, menuKb(chat));
    if (s.auth) { if (uid && (LABELS[t] || /^\//.test(t))) s.auth = null; else return authText(chat, t, msg); }
    if (!uid && !(isAdmin(chat) && (t === '🛡 አድሚን' || s.flow))) return authStart(chat);
    if (LABELS[t]) { s.flow = null; return action(chat, uid, LABELS[t]); }
    if (/^\//.test(t)) return home(chat);
    if (s.flow) return flowText(chat, t, msg);
    return send(chat, '👇 ከታች ካለው ማውጫ ይምረጡ ወይም ዕቃ ለመፈለግ «🔎 ፈልግ» ይጫኑ።', menuKb(chat));
  }
  async function route(chat, data) {
    const [k, a, x, y] = data.split(':'); let uid = uidOf(chat);
    if (k === 'noop') return;
    if (k === 'login') return authStart(chat);
    if (k === 'rst') { const a = ses(chat).auth; if (a && a.stage === 'pw') { a.stage = 'resetpw'; save(); return send(chat, '🆘 ስልክዎ በ Telegram ስለተረጋገጠ አዲስ የይለፍ ቃል መፍጠር ይችላሉ።\n🔐 አዲስ የይለፍ ቃል ይጻፉ (ቢያንስ 8 ቁምፊ — መልዕክቱ ይሰረዛል)፦'); } return authStart(chat); }
    if (!uid && !(isAdmin(chat) && /^(ad|avp|ast|arf|arl|ash|apt|amod|apay|asl|arfl|adis|ashp)/.test(k))) return authStart(chat);
    if (/^(ad|avp|ast|arf|arl|ash|ashr|apt|amod|apay|asl|arfl|adis|ashp)$/.test(k) && !isAdmin(chat)) return send(chat, '⛔ አድሚን ብቻ');
    const s = ses(chat);
    switch (k) {
      case 'f': return flowCb(chat, data);
      case 'm': return action(chat, uid, a);
      case 'pr': return listProducts(chat, uid, { cat: a }, 1); case 'lp': return listProducts(chat, uid, s.lp || {}, Number(a) || 1);
      case 'p': return showProduct(chat, uid, a); case 'ac': return addCart(chat, uid, a, Number(x) || 1);
      case 'cart': return showCart(chat);
      case 'cq': { const i = s.cart[Number(a)]; if (i) { i.qty = Math.max(1, Math.min(99, i.qty + Number(x))); save(); } return showCart(chat); }
      case 'cx': s.cart.splice(Number(a), 1); save(); return showCart(chat); case 'cc': s.cart = []; save(); return showCart(chat); case 'co': return startCheckout(chat, uid);
      case 'ol': return listOrders(chat, uid); case 'o': return showOrder(chat, uid, a); case 'oa': return orderAct(chat, uid, a, x);
      case 'pay': return startFlow(chat, 'pay', [{ k: 'method', q: 'በየትኛው ዘዴ ከፈሉ?', t: 'choice', o: PAY }, { k: 'ref', q: 'የግብይት ማጣቀሻ ቁጥር፦', t: 'text', min: 4, max: 40 }, { k: 'note', q: 'ማስታወሻ፦', t: 'text', opt: true }], { id: a });
      case 'dsp': return startFlow(chat, 'dispute', [{ k: 'reason', q: 'ችግሩ ምንድን ነው?', t: 'text', min: 5, max: 400 }], { id: a }, '⚖️ ክርክር');
      case 'rv': return startFlow(chat, 'review', [{ k: 'rate', q: 'ስንት ኮከብ ይሰጣሉ?', t: 'choice', o: ['1', '2', '3', '4', '5'] }, { k: 'text', q: 'አስተያየት፦', t: 'text', opt: true }], { id: a }, '⭐ ግምገማ');
      case 'sh': return showShop(chat, uid, a); case 'shp': return listProducts(chat, uid, { shop: a }, 1); case 'shl': return listShops(chat, uid);
      case 'jl': return listJobs(chat, uid, Number(a) || 1); case 'j': return showJob(chat, uid, a);
      case 'ja': return startFlow(chat, 'apply', [{ k: 'message', q: 'ለአሰሪው አጭር መልዕክት፦', t: 'long', opt: true }], { id: a }, '📨 ማመልከቻ');
      case 'wl': return listWorkers(chat, uid, Number(a) || 1); case 'w': return showWorker(chat, uid, a);
      case 'wh': return startFlow(chat, 'hire', [{ k: 'message', q: 'ለሠራተኛው መልዕክት (ሥራው ምንድን ነው?)፦', t: 'long', min: 5 }], { id: a }, '🤝 የቅጥር ጥያቄ');
      case 'e': return showEmployer(chat, uid, a); case 'mapps': return myApplications(chat, uid);
      case 'aw': { const r = await POST(`/api/people/app/${a}/status`, uid, { status: 'withdrawn' }); return send(chat, r.ok ? '↩️ ማመልከቻዎ ተነስቷል' : bad(r)); }
      case 'me': return hub(chat, uid);
      case 'ms': return myShop(chat, uid); case 'mse': return shopFlow(chat, uid); case 'mpl': return myProducts(chat, uid); case 'mpn': return productFlow(chat, uid, ''); case 'mp': return showMyProduct(chat, uid, a); case 'mpe': return productFlow(chat, uid, a); case 'mpt': return toggleProduct(chat, uid, a);
      case 'mpd': return send(chat, '🗑 ይህን ዕቃ በእርግጥ ይሰረዝ?', ik([[b('✅ አዎ ሰርዝ', 'mpdc:' + a), b('✖️ አይ', 'mp:' + a)]]));
      case 'mpdc': { const r = await DEL('/api/market/product/' + a, uid); await send(chat, r.ok ? '✅ ተሰርዟል' : bad(r)); return myProducts(chat, uid); }
      case 'so': return sellerOrders(chat, uid); case 'sa': { const r = await POST(`/api/market/order/${x}/${a}`, uid, a === 'decline' ? { note: 'ሻጩ አልተቀበለም' } : {}); return send(chat, r.ok ? '✅ ተከናውኗል' : bad(r)); }
      case 'ssh': return startFlow(chat, 'ship', [{ k: 'note', q: 'የመላኪያ መረጃ (አውቶቡስ ቁጥር፣ ሹፌር ስልክ…)፦', t: 'text', opt: true }], { id: a }, '🚚 ተልኳል');
      case 'mw': { const r = await GET('/api/people/my', uid), w = r.worker; return send(chat, w ? `🧑‍🔧 ${B(w.name)} — ${H(w.title)}\n${w.status === 'active' ? '🟢 ክፍት' : w.status}` : '🧑‍🔧 ሠራተኛ ገጽ የለዎትም — ሙያዎን ያሳዩ፤ አሰሪዎች ያገኙዎታል።', ik([[b(w ? '✏️ አዘምን' : '➕ ገጽ ክፈት', 'mwe')], ...(w ? [[u('🌐 ክፈት', web('/workers/' + w.id))]] : [])])); }
      case 'mwe': return workerFlow(chat, uid);
      case 'mem': { const r = await GET('/api/people/my', uid), e = r.employer; return send(chat, e ? `🏢 ${B(e.name)} — ${H(e.sector)}` : '🏢 አሰሪ ገጽ የለዎትም — ሠራተኛ ይፈልጋሉ? ገጽ ይክፈቱ እና ሥራ ያስታውቁ።', ik([[b(e ? '✏️ አዘምን' : '➕ ገጽ ክፈት', 'mee')], ...(e ? [[b('📢 ሥራ አስታውቅ', 'mjn')]] : [])])); }
      case 'mee': return employerFlow(chat, uid);
      case 'mj': return myJobs(chat, uid); case 'mjn': return jobFlow(chat, uid, ''); case 'mje': return jobFlow(chat, uid, a);
      case 'mjv': return send(chat, '📢 ሥራ', ik([[b('👥 አመልካቾች', 'ap:' + a), b('✏️ አርም', 'mje:' + a)], [b('🗑 ዝጋ', 'mjc:' + a), u('🌐', web('/jobs/' + a))]]));
      case 'mjc': { const r = await DEL('/api/people/job/' + a, uid); return send(chat, r.ok ? '✅ ሥራው ተዘግቷል' : bad(r)); }
      case 'ap': return applicants(chat, uid, a);
      case 'as': { const r = await POST(`/api/people/app/${a}/status`, uid, { status: x }); return send(chat, r.ok ? '✅ ሠራተኛው በ Telegram ተነግሯል' : bad(r)); }
      case 'pg': return listPages(chat, uid, Number(a) || 1); case 's': return showPage(chat, uid, a); case 'ss': return showSection(chat, uid, a, x); case 'sf': return visitorForm(chat, uid, a);
      case 'mpg': return a ? manageMyPage(chat, uid, a) : myPages(chat, uid); case 'pgn': return pageTemplates(chat); case 'pgt': return createPageFlow(chat, uid, a);
      case 'pgf': return fillMyPage(chat, uid, a); case 'rsp': return pageResponses(chat, uid, a);
      case 'pgv': { const r = await GET('/api/pages/my/' + a, uid); if (!r.ok) return send(chat, bad(r)); const w = await POST('/api/pages', uid, pagePayload(r.page, { visible: r.page.status === 'hidden' })); await send(chat, w.ok ? '✅ ተቀይሯል' : bad(w)); return manageMyPage(chat, uid, a); }
      case 'pgd': return send(chat, '🗑 ገጹ እና መልሶቹ ለዘለዓለም ይሰረዛሉ። እርግጠኛ ነዎት?', ik([[b('✅ አዎ ሰርዝ', 'pgdc:' + a), b('✖️ አይ', 'mpg:' + a)]]));
      case 'pgdc': { const r = await DEL('/api/pages/' + a, uid); await send(chat, r.ok ? '✅ ተሰርዟል' : bad(r)); return myPages(chat, uid); }
      case 'prv': return privateFlow(chat, uid);
      case 'acc': return accountMenu(chat, uid);
      case 'accn': authApi.setPref(uid, 'mute', !prefs(uid).mute); return accountMenu(chat, uid);
      case 'acn': return startFlow(chat, 'acname', [{ k: 'name', q: '✏️ አዲሱ ሙሉ ስም፦', t: 'text', min: 3, max: 80, def: userOf(uid).name || undefined }]);
      case 'ace': return startFlow(chat, 'acemail', [PWQ, { k: 'email', q: '📧 አዲሱ ኢሜይል፦', t: 'text', max: 120 }], {}, '📧 ኢሜይል መቀየር');
      case 'acp': return startFlow(chat, 'acphone', [PWQ], {}, '📱 ስልክ መቀየር');
      case 'pw': return startFlow(chat, 'password', [PWQ, { k: 'pw', q: '🔐 አዲስ የይለፍ ቃል (ቢያንስ 8 ቁምፊ)፦', t: 'text', min: 8, max: 128, secret: true }], {}, '🔑 የይለፍ ቃል መቀየር');
      case 'lo': return send(chat, '🚪 ከአካውንትዎ መውጣት ይፈልጋሉ?\n(ጋሪዎ ይጠራረጋል፤ ማሳወቂያዎች ይቆማሉ።)', ik([[b('✅ አዎ ውጣ', 'loc'), b('✖️ አይ', 'acc')]]));
      case 'loc': return logout(chat, uid);
      case 'adel': return startFlow(chat, 'acdel', [PWQ, { k: 'confirm', q: '⚠️ <b>አካውንት መሰረዝ የማይመለስ ነው።</b> ሱቅዎ፣ ገጾችዎ፣ ሥራዎችዎ ከህዝብ ይደበቃሉ።\nለማረጋገጥ <b>ሰርዝ</b> ብለው ይጻፉ፦', t: 'text', max: 20 }], {}, '🗑 አካውንት መሰረዝ');
      /* አድሚን */
      case 'ad': return adminHub(chat); case 'apay': case 'asl': case 'arfl': case 'adis': case 'ashp': return adminList(chat, k); case 'amod': return modList(chat);
      case 'avp': if (x === '1') { const r = await AD('POST', `/api/market/admin/order/${a}/verify-payment`, { ok: true }); return send(chat, r.ok ? '✅ ክፍያ ተረጋግጧል — ደረሰኝ ለገዥ ተልኳል' : bad(r)); } return startFlow(chat, 'aorder', [{ k: 'ref', q: 'ውድቅ የተደረገበት ምክንያት፦', t: 'text', min: 2 }], { id: a, act: 'verify-payment' });
      case 'ast': case 'arf': case 'arl': return startFlow(chat, 'aorder', [{ k: 'ref', q: ADMIN_FLOWS[k][1], t: 'text', min: 3, max: 40 }], { id: a, act: ADMIN_FLOWS[k][0] });
      case 'ash': { const r = await AD('POST', `/api/market/admin/shop/${a}/status`, { status: x }); return send(chat, r.ok ? '✅ ሱቁ ጸድቋል — ባለቤቱ ተነግሯል' : bad(r)); }
      case 'ashr': return startFlow(chat, 'ashop', [{ k: 'note', q: 'ውድቅ የተደረገበት ምክንያት፦', t: 'text', min: 2 }], { id: a });
      case 'apt': { const r = a === 'pg' ? await AD('POST', `/api/pages/admin/${x}/status`, { status: y }) : await AD('POST', `/api/people/admin/${a}/${x}/status`, { status: y }); return send(chat, r.ok ? '✅ ተቀይሯል' : bad(r)); }
    }
  }
  async function handle(upd) {
    try {
      if (upd.callback_query) { const cq = upd.callback_query; tg('answerCallbackQuery', { callback_query_id: cq.id }).catch(() => { }); if (!cq.message) return; return await route(cq.message.chat.id, String(cq.data || '')); }
      const m = upd.message; if (!m || !m.chat || m.chat.type !== 'private') return; const chat = m.chat.id;
      if (m.contact) return await authContact(chat, m);
      if (m.photo) return ses(chat).flow ? await flowPhoto(chat, m) : send(chat, '📷 ፎቶ ለመጠቀም መጀመሪያ ተገቢውን ቅጽ (ለምሳሌ ዕቃ መጨመር) ይክፈቱ።');
      if (typeof m.text === 'string') return await onText(chat, m.text, m);
    } catch (e) { console.error('bot update failed:', e); }
  }
  return { handle, restore, uidOf };
};
