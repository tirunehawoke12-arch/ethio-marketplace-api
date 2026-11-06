'use strict';
/* ===== Telegram Bot — የድረ-ገጹ ሁሉም ሥራ በ Telegram ውስጥም =====
   ዘዴ፦ ቦቱ ለተገናኘው አካውንት በተፈረመ ቶከን ወደ ራሱ የ Express API (127.0.0.1) ይጠራል — ስለዚህ ህጎች፣ ማረጋገጫዎች፣
   escrow፣ ማሳወቂያዎች ሁሉ ከድረ-ገጹ ጋር አንድ ናቸው (ምንም አይደገምም)። ንግግሮች (ቅጾች) «flow» ናቸው፦ ጥያቄ በጥያቄ። */
const { errText } = require('./errors');
const AIM = require('./ai');
const DO = require('./docout'), PDFM = require('./pdfmerge'), PPM = require('./pptxmerge');
const { TEMPLATES } = require('./templates.generated');
const REGIONS = ['አዲስ አበባ', 'ድሬዳዋ', 'አማራ', 'ኦሮሚያ', 'ትግራይ', 'ሲዳማ', 'ሶማሌ', 'አፋር', 'ቤንሻንጉል ጉሙዝ', 'ጋምቤላ', 'ሐረሪ', 'ማዕከላዊ ኢትዮጵያ', 'ደቡብ ምዕራብ ኢትዮጵያ', 'ደቡብ ኢትዮጵያ'];
const PAY = ['telebirr', 'CBE Birr', 'ንግድ ባንክ', 'አዋሽ ባንክ', 'ዳሽን ባንክ', 'አቢሲኒያ ባንክ', 'ሌላ'];
const STEP = { placed: '📝 ታዘዘ', payment_submitted: '💳 ክፍያ ተላከ', paid: '✅ ክፍያ ተረጋገጠ', preparing: '📦 እየተዘጋጀ', shipped: '🚚 ተላከ', delivered: '🤝 ደረሰ', settled: '💰 ለሻጭ ተከፈለ', cancelled: '✕ ተሰርዟል', refund_pending: '↩️ ተመላሽ በመጠባበቅ', refunded: '↩️ ተመላሽ ተደርጓል', disputed: '⚖️ ክርክር ላይ' };
const APPST = { applied: '📨 ተልኳል', shortlisted: '⭐ በዝርዝር', hired: '🎉 ተቀጥረዋል', rejected: '✖️ አልተመረጡም', withdrawn: '↩️ ተነስቷል', invited: '🤝 ግብዣ' };
const MENU_KEYS = [['market', 'shops', 'jobs'], ['pages', 'cart', 'orders'], ['me', 'search', 'help'], ['near', 'alerts', 'messages'], ['learn', 'ai']];
const MENU_TX = {                                    // የታች ማውጫ በ4 ቋንቋ (ትርጉሙ በአፍ-መፍቻ ተናጋሪ ቢታይ ይመረጣል)
  am: [['🛍 ገበያ', '🏪 ሱቆች', '💼 ሥራ'], ['🌐 ገጾች', '🛒 ጋሪ', '📦 ትዕዛዞቼ'], ['👤 ገጾቼ', '🔎 ፈልግ', '❓ እገዛ'], ['📍 በአቅራቢያዬ', '🔔 ማንቂያዎች', '💬 መልእክቶች'], ['🎓 ትምህርት', '🤖 AI ረዳት']],
  en: [['🛍 Market', '🏪 Shops', '💼 Jobs'], ['🌐 Pages', '🛒 Cart', '📦 My orders'], ['👤 My page', '🔎 Search', '❓ Help'], ['📍 Nearby', '🔔 Alerts', '💬 Messages'], ['🎓 Learn', '🤖 AI assistant']],
  om: [['🛍 Gabaa', '🏪 Suuqota', '💼 Hojii'], ['🌐 Fuulota', '🛒 Gaarii', '📦 Ajajoota koo'], ['👤 Fuula koo', '🔎 Barbaadi', '❓ Gargaarsa'], ['📍 Naannoo koo', '🔔 Beeksisa', '💬 Ergaawwan'], ['🎓 Barnoota', '🤖 Gargaaraa AI']],
  ti: [['🛍 ዕዳጋ', '🏪 ድኳናት', '💼 ስራሕ'], ['🌐 ገጻት', '🛒 ቅርጫት', '📦 ትዕዛዛተይ'], ['👤 ገጸይ', '🔎 ድለይ', '❓ ሓገዝ'], ['📍 ኣብ ጎረቤተይ', '🔔 መተሓሳሰቢ', '💬 መልእኽታት'], ['🎓 ትምህርቲ', '🤖 ሓጋዚ AI']],
};
const BOT_LANGS = [['am', 'አማርኛ'], ['en', 'English'], ['om', 'Afaan Oromoo'], ['ti', 'ትግርኛ']];
const TX = {
  welcome: { am: 'እንኳን ደህና መጡ', en: 'Welcome', om: 'Baga nagaan dhufte', ti: 'እንቋዕ ብደሓን መጻእኩም' },
  home: { am: '🏠 ዋና ማውጫ — ከታች ካሉት ቁልፎች ይምረጡ።', en: '🏠 Main menu — choose from the buttons below.', om: '🏠 Menu guddaa — qabduu gadii filadhu.', ti: '🏠 ቀንዲ ሜኑ — ካብ ዝስዕቡ ኣዝራራት ምረጹ።' },
  langSet: { am: '✅ ቋንቋ፦ አማርኛ', en: '✅ Language: English', om: '✅ Afaan: Afaan Oromoo', ti: '✅ ቋንቋ፦ ትግርኛ' },
};
const LABEL_KEYS = {}; Object.values(MENU_TX).forEach(m => m.forEach((row, i) => row.forEach((t, j) => { LABEL_KEYS[t] = MENU_KEYS[i][j]; })));

module.exports = function bot(c) {
  const { aisvc, tg, tokFor, port, baseUrl, adminChat, bindAdmin, adminPhone, token, getDb, getStore, accKey, findUid, normPhoneET, authApi, pool, pgUpsert, isSusp } = c;
  const H = x => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const B = x => '<b>' + H(x) + '</b>';
  const ETB = n => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' ብር';
  const clip = (x, n) => { x = String(x == null ? '' : x); return x.length > n ? x.slice(0, n - 1) + '…' : x; };
  const b = (t, d) => ({ text: String(t).slice(0, 60), callback_data: String(d).slice(0, 64) });
  const u = (t, link) => ({ text: String(t).slice(0, 60), url: link });
  const ik = rows => ({ inline_keyboard: rows.filter(r => r && r.length) });
  const web = p => baseUrl + p;
  const isAdmin = chat => { const a = typeof adminChat === 'function' ? adminChat() : adminChat; return !!a && String(chat) === String(a); };
  const grid = (arr, n = 2) => { const out = []; for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n)); return out; };

  /* ---------- ክፍለ-ጊዜ (ንግግር፣ ጋሪ) ---------- */
  const ai = AIM.shared(), DOCS = new Map(), svc = aisvc || null, aiReady = () => !!(svc && ai.enabled);          // ንግግር + የሰነድ ትርጉም ሥራዎች (በ RAM፤ 60 ደቂቃ)
  const S = {}; const ses = chat => S[chat] || (S[chat] = { cart: [] });
  let saveT; const save = () => { if (!pool) return; clearTimeout(saveT); saveT = setTimeout(() => pgUpsert('_sys', 'botdb', S).catch(e => console.warn('bot save', e.message)), 600); };
  const restore = d => { if (d && typeof d === 'object') Object.assign(S, d); };

  /* ---------- መላኪያ ---------- */
  const send = (chat, text, kb) => tg('sendMessage', { chat_id: chat, text: String(text).slice(0, 3900), parse_mode: 'HTML', disable_web_page_preview: true, ...(kb ? { reply_markup: kb } : {}) }).catch(e => console.warn('bot send:', e.message));
  async function photo(chat, id, caption, kb) {
    if (!id || !/^https:/.test(baseUrl)) return send(chat, caption, kb);
    try { return await tg('sendPhoto', { chat_id: chat, photo: web('/api/market/img/' + id), caption: String(caption).slice(0, 1000), parse_mode: 'HTML', ...(kb ? { reply_markup: kb } : {}) }); } catch (e) { return send(chat, caption, kb); }
  }
  const lang = chat => (S[chat] && S[chat].lang) || 'am', tx = (chat, k) => (TX[k] && (TX[k][lang(chat)] || TX[k].am)) || '';
  const menuKb = chat => { const m = MENU_TX[lang(chat)] || MENU_TX.am; return { keyboard: isAdmin(chat) ? [...m, ['🛡 አድሚን']] : m, resize_keyboard: true, is_persistent: true }; };
  const home = async (chat, text) => {
    await send(chat, text || tx(chat, 'home'), menuKb(chat));
    const s = ses(chat), uid = uidOf(chat); if (s.deep && uid) { const d = s.deep; s.deep = null; save(); await openDeep(chat, uid, d); }   // deep link ከመግባት በኋላ
  };

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
  function authStart(chat) {          // አዲስ ሰው፦ /start ካለ በኋላ 3 ምርጫ ብቻ
    const s = ses(chat); s.auth = null; save();
    return send(chat, '🇪🇹 <b>እንኳን ወደ ኢትዮ ዲጂታል ማርኬት በደህና መጡ!</b>\n\nምን ላይ ማተኮር ይፈልጋሉ?', ik([[b('🎓 ትምህርት', 'ob:e')], [b('🛍 ዲጂታል ገበያ', 'ob:m')], [b('✨ ሁለቱንም', 'ob:b')]]));
  }
  function authAsk(chat, edu) {
    ses(chat).auth = { stage: 'contact', edu: !!edu }; save();
    return send(chat, '🇪🇹 <b>እንኳን ወደ ኢትዮ ዲጂታል ማርኬት በደህና መጡ!</b>\n\nበዚህ ቦት ውስጥ ድረ-ገጹ የሚሠራውን ሁሉ ማድረግ ይችላሉ፦ ዕቃ መግዛት እና መሸጥ፣ ሥራ መፈለግ እና ማስታወቅ፣ የራስዎን ገጽ መሥራት፣ ክፍያ እና ደረሰኝ።\n\n🔒 ለመግባት ወይም አካውንት ለመክፈት በመጀመሪያ ስልክ ቁጥርዎን ያረጋግጡ — ከታች «📱 ስልኬን አጋራ» ይጫኑ።', CONTACT_KB);

  }
  async function landing(chat, uid) {          // ከመግባት በኋላ የመረጡት ክፍል ይከፈታል
    const m = ses(chat).mode; if (m === 'edu') return eduHome(chat, uid); if (m === 'market') return marketHome(chat, uid);
  }
  async function authContact(chat, msg) {
    const ct = msg.contact; if (!msg.from || ct.user_id !== msg.from.id) return send(chat, '⚠️ የራስዎን ስልክ ቁጥር ብቻ ማጋራት ይችላሉ። «📱 ስልኬን አጋራ» ቁልፉን ይጠቀሙ።', CONTACT_KB);
    const phone = normPhoneET(ct.phone_number); if (!phone) return send(chat, '❌ ይህ የኢትዮጵያ ስልክ ቁጥር አይደለም (09… / 07…)። ለመመዝገብ የኢትዮጵያ ቁጥር ያስፈልጋል።');
    const username = msg.from.username || msg.from.first_name || '', exist = findUid(phone), s = ses(chat);
    if (adminPhone && phone === adminPhone) { bindAdmin(chat); await send(chat, '🛡 <b>የአድሚን ስልክ በ Telegram ተረጋግጧል።</b>\nአሁን በድረ-ገጹ አድሚን ሲገቡ የ Telegram ኮድ ወደዚህ ይላካል። «🛡 አድሚን» ቁልፍ በማውጫው ይታያል።'); }
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
    if (s.auth && s.auth.edu) {          // 🎓 ለትምህርት፦ ስልክ + የይለፍ ቃል ብቻ
      s.auth = { stage: 'newpw', phone, username, edu: true, name: [msg.from.first_name, msg.from.last_name].filter(Boolean).join(' ').slice(0, 60) || 'ተማሪ', email: `p${phone.replace(/\D/g, '')}@tg.etio.et` }; save();
      return send(chat, '🆕 አዲስ አካውንት እንክፈት።\n\n🔐 <b>የይለፍ ቃል</b> ይፍጠሩ (ቢያንስ 8 ቁምፊ) — መልዕክቱ ወዲያው ይሰረዛል፦', { remove_keyboard: true });
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
      await home(chat, `✅ ገብተዋል! እንኳን ደህና መጡ ${H(userOf(a.uid).name)}\n\nከታች ካሉት ቁልፎች ይምረጡ።`); return landing(chat, a.uid);
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
      await home(chat, a.edu ? `🎉 ተመዝግበዋል! ስልክዎን እና የይለፍ ቃልዎን በድረ-ገጹም መጠቀም ይችላሉ።` : `🎉 አካውንትዎ ተከፍቷል! ይህን ኢሜይል እና የይለፍ ቃል በድረ-ገጹም መጠቀም ይችላሉ።\n\nከታች ካሉት ቁልፎች ይምረጡ።`); return landing(chat, uidOf(chat));
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
    if (!r.ok) return send(chat, bad(r)); if (!r.items.length) { if (ctx.q) s.lastQ = ctx.q; save(); return send(chat, '🤷 ምንም ዕቃ አልተገኘም።', ctx.q ? ik([[b('🔔 ሲመጣ ንገረኝ', 'alq')]]) : undefined); }
    const rows = r.items.map(p => [b(`${clip(p.title, 26)} · ${ETB(p.price)}`, 'p:' + p.id)]), nav = [];
    if (page > 1) nav.push(b('‹ ቀዳሚ', 'lp:' + (page - 1))); if (page * 24 < r.total) nav.push(b('ቀጣይ ›', 'lp:' + (page + 1))); rows.push(nav);
    return send(chat, `🛍 ${B(r.total + ' ዕቃዎች')}${ctx.q ? ` — «${H(ctx.q)}»` : ''}  (ገጽ ${page})`, ik(rows));
  }
  async function showProduct(chat, uid, id) {
    const r = await GET('/api/market/product/' + id, uid); if (!r.ok) return send(chat, bad(r));
    const p = r.product, sh = r.shop;
    const cap = `${B(p.title)}\n💰 ${B(ETB(p.price))} / ${H(p.unit)}\n📦 ክምችት፦ ${p.stock}\n${p.desc ? '\n' + H(clip(p.desc, 450)) + '\n' : ''}\n🏪 ${H(sh.name)} · 📍 ${H(sh.city)}${sh.rating ? ` · ⭐ ${sh.rating} (${sh.reviews})` : ''}${(r.reviews || []).slice(0, 2).map(v => `\n💬 ${'★'.repeat(v.rating)} ${H(clip(v.text, 80))}`).join('')}`;
    const kb = ik([[1, 2, 3, 5].map(n => b('➕' + n, `ac:${p.id}:${n}`)), [b('🏪 ሱቁን ክፈት', 'sh:' + sh.id), b('🛒 ጋሪ', 'cart')], [b('💬 መልእክት ላክ', 'cst:p:' + p.id), u('🌐 በድረ-ገጽ', web('/p/' + p.id))]]);
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
    return photo(chat, s.logo || s.cover, cap, ik([[b('🛍 ዕቃዎቹን አሳይ', 'shp:' + id)], [b('💬 መልእክት ላክ', 'cst:s:' + id), u('🌐 በድረ-ገጽ', web('/shop/' + id))]]));
  }

  /* ================= ፍለጋ ================= */
  FIN.search = async (chat, uid, d) => listProducts(chat, uid, { q: d.q }, 1);

  /* ================= የእኔ ገጾች (ማዕከል) ================= */
  const hub = (chat, uid) => send(chat, `👤 <b>ገጾቼ</b> — ${H(userOf(uid).name || '')}\n📞 ${H(userOf(uid).phone || '')}`, ik([
    [b('📍 ቦታ አስቀምጥ', 'geoset'), b('🧑‍🔧 የሙያ ቦታ', 'geosetw'), b('🚫 ቦታ አጥፋ', 'geoclr')], [b('🌐 የራሴ ገጾች (ድረ-ገጽ)', 'mpg')], [b('🏪 ሱቄ / ሆቴሌ / ንግዴ', 'ms')], [b('🧑‍🔧 ሠራተኛ ገጽ', 'mw'), b('🏢 አሰሪ ገጽ', 'mem')], [b('📢 ሥራዎቼ', 'mj'), b('📄 ማመልከቻዎቼ', 'mapps')], [b('🪪 የግል መረጃ', 'prv'), b('⚙️ አካውንቴ', 'acc')], [u('🖥 ድረ-ገጹን ክፈት', web('/me'))]]));
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
    return send(chat, `💼 ${B(j.title)} <i>${H(j.type)}</i>\n🏢 ${H(j.employer && j.employer.name)} · 📍 ${H(j.city)}, ${H(j.region)}\n💰 ${H(sal(j.salary))} · 👥 ${j.openings} ቦታ${j.deadline ? ' · ⏳ እስከ ' + j.deadline : ''}\n\n${H(clip(j.description, 1200))}${j.requirements ? '\n\n📋 <b>መስፈርት</b>\n' + H(clip(j.requirements, 700)) : ''}`, ik([[b('📨 አመልክት', 'ja:' + id)], [b('🏢 አሰሪውን ይመልከቱ', 'e:' + j.employer.id), b('💬 ጠይቅ', 'cst:j:' + id)], [u('🌐 በድረ-ገጽ', web('/jobs/' + id))]]));
  }
  async function listWorkers(chat, uid, page) {
    const r = await GET('/api/people/workers' + qs({ page }), uid); if (!r.ok) return send(chat, bad(r)); if (!r.items.length) return send(chat, 'ሠራተኛ የለም።');
    const rows = r.items.map(w => [b(`${w.availability === 'available' ? '🟢' : '🟡'} ${clip(w.name, 16)} · ${clip(w.title, 16)}`, 'w:' + w.id)]); const nav = []; if (page > 1) nav.push(b('‹', 'wl:' + (page - 1))); if (page * 24 < r.total) nav.push(b('›', 'wl:' + (page + 1))); rows.push(nav);
    return send(chat, `🧑‍🔧 <b>ሠራተኞች (${r.total})</b>`, ik(rows));
  }
  async function showWorker(chat, uid, id) {
    const r = await GET('/api/people/worker/' + id, uid); if (!r.ok) return send(chat, bad(r)); const w = r.worker;
    return photo(chat, w.photo, `🧑‍🔧 ${B(w.name)}\n${H(w.title)} · <i>${H(w.category)}</i>\n📍 ${H(w.city)}, ${H(w.region)} · ${w.exp} ዓመት ልምድ\n${w.rate && w.rate.amount ? '💰 ' + ETB(w.rate.amount) + ' / ' + H(w.rate.per) + '\n' : ''}${(w.skills || []).length ? '🛠 ' + H(w.skills.join('፣ ')) + '\n' : ''}${w.about ? '\n' + H(clip(w.about, 500)) : ''}${w.phone ? '\n📞 ' + H(w.phone) : ''}`, ik([[b('🤝 ቅጥር ጠይቅ', 'wh:' + id), b('💬 መልእክት', 'cst:w:' + id)], [u('🌐 በድረ-ገጽ', web('/workers/' + id))]]));
  }
  async function showEmployer(chat, uid, id) {
    const r = await GET('/api/people/employer/' + id, uid); if (!r.ok) return send(chat, bad(r)); const e = r.employer;
    return photo(chat, e.logo, `🏢 ${B(e.name)} <i>${H(e.sector)}</i>\n📍 ${H(e.city)}, ${H(e.region)}${e.about ? '\n\n' + H(clip(e.about, 500)) : ''}${e.phone ? '\n📞 ' + H(e.phone) : ''}`, ik(r.jobs.slice(0, 10).map(j => [b('💼 ' + clip(j.title, 40), 'j:' + j.id)]).concat([[b('💬 መልእክት ላክ', 'cst:e:' + id)]])));
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
    const rows = p.sections.map((s, k) => [b(`${s.icon} ${clip(s.title, 30)} (${s.fields.length}) 👁`, `ss:${id}:${k}`)]); if (p.form) rows.push([b('📝 ' + clip(p.form.title, 30), 'sf:' + id)]); rows.push([b('💬 መልእክት ላክ', 'cst:g:' + id), u('🌐 በድረ-ገጽ ክፈት', web('/site/' + id))]);
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
    return send(chat, '🌐 <b>የራሴ ገጽ</b>\nእያንዳንዱ ሰው አንድ ገጽ አለው — ሱቅ፣ ሙያ፣ አሰሪ እና ቅጾች የዚያ ገጽ ክፍሎች ናቸው።', ik([...r.items.map(p => [b(`${p.status === 'active' ? '🟢' : p.status === 'hidden' ? '🙈' : '⛔'} ${clip(p.title, 22)}${p.unseen ? ' 📬' + p.unseen : ''}`, 'mpg:' + p.id)]), ...(r.items.length ? [] : [[b('➕ ገጼን ክፈት', 'pgn')]])]));
  }
  async function manageMyPage(chat, uid, id) {
    const r = await GET('/api/pages/my/' + id, uid); if (!r.ok) return send(chat, bad(r)); const p = r.page, n = p.sections.reduce((a, s) => a + s.fields.length, 0);
    return send(chat, `🌐 ${B(p.title)} <i>${H(p.kind)}</i>\n${p.status === 'active' ? '🟢 ለህዝብ ክፍት' : p.status === 'hidden' ? '🙈 የተደበቀ' : '⛔ ታግዷል'}\n${p.sections.length} ክፍሎች · ${n} ጥያቄዎች${p.form && p.form.enabled ? ' · 📝 የጎብኝ ቅጽ አለ' : ''}`, ik([[b('✏️ መልሶቼን አርም', 'pgf:' + id), b('📬 የመጡ መልሶች', 'rsp:' + id)], [b(p.status === 'hidden' ? '👁 አሳይ' : '🙈 ደብቅ', 'pgv:' + id), b('🗑 ሰርዝ', 'pgd:' + id)], [u('👁 ገጹን ክፈት', web('/site/' + id))], [u('🧩 ጥያቄዎችን መጨመር/መቀየር (አርታዒ)', web('/me/sites/' + id))]]));
  }
  const pagePayload = (p, patch) => ({ id: p.id, title: p.title, kind: p.kind, tagline: p.tagline, about: p.about, theme: p.theme, logo: p.logo, cover: p.cover, gallery: p.gallery, region: p.region, city: p.city, phone: p.phone, showPhone: p.showPhone, sections: p.sections, forms: p.forms || (p.form ? [p.form] : []), visible: p.status !== 'hidden', ...patch });
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
  async function pageTemplates(chat, uid) { const mine = uid && await GET('/api/pages/my/list', uid); if (mine && mine.ok && mine.items.length) return manageMyPage(chat, uid, mine.items[0].id); return send(chat, '✨ <b>ገጽዎን በምን ይጀምሩ?</b>\nአንዱን ይምረጡ — ጥያቄ በጥያቄ እጠይቅዎታለሁ፤ ከዚያ ገጹ እንደ ራስዎ ድረ-ገጽ ይሆናል።', ik(TEMPLATES.map(t => [b(`${t.icon} ${t.name}`, 'pgt:' + t.key)]))); }
  function createPageFlow(chat, uid, key) {
    const t = TEMPLATES.find(x => x.key === key); if (!t) return; const steps = [{ k: 'title', q: 'የገጹ ርዕስ (ስም)፦', t: 'text', min: 2, max: 80 }, { k: 'tagline', q: 'አጭር መፈክር፦', t: 'text', opt: true, def: dv(t.tagline) }, { k: 'city', q: 'ከተማ፦', t: 'text', opt: true }];
    t.build().forEach((s, i) => s.fields.forEach((f, j) => steps.push({ ...fstep(`v${i}_${j}`, `${s.icon} ${s.title} › ${f.label}${f.priv ? ' 🔒' : ''}`, f, undefined, true), opt: !f.required })));
    return startFlow(chat, 'pagenew', steps, { key }, `${t.icon} <b>${H(t.name)}</b> — ${steps.length - 3} ጥያቄዎች አሉ። የማያውቁትን «ዝለል» ይጫኑ፤ ⏩ «አሁን ጨርሽ» ሲጫኑ ያለዎት ይቀመጣል። 🔒 ምልክት ያላቸው መልሶች ለህዝብ አይታዩም።`, true);
  }
  FIN.pagenew = async (chat, uid, d, x) => {
    const t = TEMPLATES.find(y => y.key === x.key), me = userOf(uid), secs = t.build();
    secs.forEach((s, i) => s.fields.forEach((f, j) => { const v = d[`v${i}_${j}`]; if (v !== undefined) f.value = v; }));
    const r = await POST('/api/pages', uid, { title: d.title || t.name, kind: t.kind, tagline: d.tagline || '', city: d.city || '', theme: 'green', phone: me.phone || '', showPhone: false, sections: secs, forms: [], visible: true });
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
      [b('✏️ ስም ቀይር', 'acn'), b('📧 ኢሜይል ቀይር', 'ace')], [b('📱 ስልክ ቀይር', 'acp'), b('🔑 የይለፍ ቃል ቀይር', 'pw')], [b(muted ? '🔔 ማሳወቂያ አብራ' : '🔕 ማሳወቂያ አጥፋ', 'accn')], [b(prefs(uid).news === false ? '📣 ዜና አብራ' : '📣 ዜና አጥፋ', 'accnw'), b(prefs(uid).digest === false ? '📊 ማጠቃለያ አብራ' : '📊 ማጠቃለያ አጥፋ', 'accdg')], [b('🌐 ቋንቋ', 'lang')], [b('🚪 ውጣ (Log out)', 'lo'), b('🗑 አካውንት ሰርዝ', 'adel')], [b('📵 በሁሉም መሳሪያ ላይ ውጣ', 'lall')]]));
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
      [b('🛡 እምነት (ባጅ/ሪፖርት)', 'atr'), b('📣 ማስታወቂያ', 'abc'), b('📊 ሪፖርት', 'arp')],
      [b(`💳 ክፍያ ለማረጋገጥ (${r.payments.length})`, 'apay')], [b(`🏪 ሱቅ ለማጽደቅ (${r.pendingShops.length})`, 'ashp'), b(`💰 ለሻጭ ለመክፈል (${r.toSettle.length})`, 'asl')], [b(`↩️ ተመላሽ (${r.refunds.length})`, 'arfl'), b(`⚖️ ክርክር (${r.disputes.length})`, 'adis')], [b('🌐 ገጾች/ሰዎች ቁጥጥር', 'amod')], [b('🤖 AI ቁጥጥር', 'axai'), b('🎓 መማሪያ ቁጥጥር', 'axd')], [b('📚 መማሪያ መጻሕፍት', 'axbk:l'), b('📊 አጠቃቀም', 'axus:s:d')], [u('🖥 የአድሚን ድረ-ገጽ', web('/admin'))]]));
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


  /* ================= አድሚን፦ AI + መማሪያ ሙሉ ቁጥጥር በቦት ================= */
  const ONOFF = v => (v ? '🟢 በርቷል' : '⚪ ጠፍቷል');
  async function axAi(chat) {
    const r = await AD('GET', '/api/ai/admin/overview'); if (!r.ok) return send(chat, bad(r)); const c = r.cfg;
    return send(chat, `🤖 <b>AI ቁጥጥር</b> · ${H(r.provider || '—')} ${H(r.model || '')}\n⏳ የሚጠብቁ ክፍያዎች፦ ${r.pending} · 💰 ገቢ፦ ${ETB(r.revenue)}\n💬 ዛሬ፦ ${r.stats.chats} ውይይት · ${r.stats.pages} ገጽ · ${r.stats.paywalls} ክፍያ ጥያቄ\n\n${ONOFF(c.enabled)} AI · ${ONOFF(c.paywall)} ክፍያ ግድግዳ · ${ONOFF(c.autoApprove)} ራስ-ማጽደቅ · ${ONOFF(c.requireProof)} ማስረጃ ግዴታ\n🆓 ነጻ፦ ${c.freeChatDay} መልእክት · ${c.freePagesDay} ገጽ በቀን | 💎 የተከፈለ፦ ${c.paidChatDay} · ${c.paidPagesDay}\n📦 ${c.plans.map(x => `${x.label} ${x.price} ብር`).join(' · ')}`, ik([
      [b(`${c.enabled ? '⏸ AI አጥፋ' : '▶️ AI አብራ'}`, 'axt:enabled'), b(`${c.paywall ? '🔓 ክፍያ አጥፋ' : '🔒 ክፍያ አብራ'}`, 'axt:paywall')],
      [b(`${c.autoApprove ? '✋ ራስ-ማጽደቅ አጥፋ' : '🤖 ራስ-ማጽደቅ አብራ'}`, 'axt:autoApprove'), b(`${c.requireProof ? '📎 ማስረጃ ተው' : '📎 ማስረጃ ጠይቅ'}`, 'axt:requireProof')],
      [b(`⏳ ክፍያ ጥያቄዎች (${r.pending})`, 'axq')], [b('💵 የእቅድ ዋጋ', 'axpr'), b('🔢 ገደቦች', 'axlm')], [b('🎁 ለተጠቃሚ ቀን ስጥ/አግድ', 'axg'), b('🌐 ዜና ፈትሽ', 'axnews')], [b('📲 SMS ራስ-ማረጋገጫ', 'axsms')]]));
  }
  async function axAiReqs(chat) {
    const r = await AD('GET', '/api/ai/admin/requests?status=pending'); if (!r.ok) return send(chat, bad(r)); if (!r.items.length) return send(chat, '✅ የሚጠብቅ የ AI ክፍያ የለም።');
    for (const q of r.items.slice(0, 10)) await send(chat, `🤖 ${B(q.name)} · ${H(q.phone)}\n📦 ${H(q.label)} — ${q.price} ብር\n💳 ${H(q.method)} · <code>${H(q.ref)}</code>${q.auto ? `\n🔎 ራስ-ፍተሻ፦ ${H(q.auto.state)}${(q.auto.reasons || []).length ? ' — ' + H(q.auto.reasons.join('፤ ')) : ''}` : ''}`, ik([[b('✅ አጽድቅ', `aiap:${q.id}:1`), b('❌ ውድቅ', `aiap:${q.id}:0`)]]));
  }
  async function axLearnReqs(chat) {
    const r = await AD('GET', '/api/learn/admin/requests?status=pending'); if (!r.ok) return send(chat, bad(r)); if (!r.items.length) return send(chat, '✅ የሚጠብቅ የመማሪያ ክፍያ የለም።');
    for (const q of r.items.slice(0, 10)) await send(chat, `🎓 ${B(q.name)} · ${H(q.phone)}\n📖 ${H(q.title)} — ${q.price} ብር\n💳 ${H(q.method)} · <code>${H(q.ref)}</code>${q.note ? '\n📝 ' + H(q.note) : ''}`, ik([[b('✅ አጽድቅ', `axlp:${q.id}:1`), b('❌ ውድቅ', `axlp:${q.id}:0`)]]));
  }
  async function axDecks(chat) {
    const r = await AD('GET', '/api/learn/decks'); if (!r.ok) return send(chat, bad(r));
    await send(chat, `🎓 <b>መማሪያ ፋይሎች</b> (${r.items.length})\n➕ አዲስ ለመጫን «አዲስ ፋይል» ን ይጫኑ፤ ከዚያ <b>.pptx</b> ይላኩ (ጽሑፍ እና ሠንጠረዥ ይወሰዳል፤ ለ PDF/ምስል ያለው ስላይድ የድረ-ገጹን አድሚን ይጠቀሙ)።`, ik([[b('➕ አዲስ ፋይል (.pptx)', 'axnew'), b('⏳ የክፍያ ጥያቄዎች', 'axl')]]));
    for (const d of r.items.slice(0, 15)) await send(chat, `📖 ${B(d.title)}\n${d.slides} ስላይድ · 👥 ${d.students} ተማሪ · ${d.status === 'on' ? '🟢 ክፍት' : '⚪ ዝግ'} · ${d.listed ? '🛒 በካታሎግ' : '🙈 አልተዘረዘረም'} · 💵 ${d.price ? d.price + ' ብር' : 'ነጻ'}`, ik([[b(d.listed ? '🙈 ከካታሎግ አውጣ' : '🛒 በካታሎግ ዘርዝር', `axdl:${d.id}`), b(d.status === 'on' ? '⏸ ዝጋ' : '▶️ ክፈት', `axds:${d.id}`)], [b('💵 ዋጋ ቀይር', `axdp:${d.id}`), b('🔗 ሊንክ', `axdk:${d.id}`)]]));
  }
  async function axUpload(chat, m) {        // አድሚን .pptx ሲልክ አዲስ የመማሪያ ፋይል ይፈጥራል
    const st = ses(chat); st.axup = false; save(); const d = m.document, name = d.file_name || 'file';
    if (!/\.pptx$/i.test(name)) return send(chat, '📎 እባክዎ .pptx ብቻ ይላኩ (PDF ለማስገባት የድረ-ገጹን አድሚን ይጠቀሙ)።');
    if ((d.file_size || 0) > 19.5 * 1048576) return send(chat, '⚠️ ፋይሉ ከ20MB በላይ ነው።'); typing(chat);
    let slides; try { const { parsePptx } = require('../src/lib/pptx'); slides = (await parsePptx(await tgDownload(d.file_id))).slides.map(s => ({ title: s.title || '', blocks: (s.blocks || []).filter(x => x.k !== 'img') })); } catch (e) { return send(chat, '⚠️ PPTX መነበብ አልቻለም።'); }
    if (!slides.length) return send(chat, '⚠️ ስላይድ አልተገኘም።'); const c = await AD('POST', '/api/learn/decks', { title: name.replace(/\.pptx$/i, '') }); if (!c.ok) return send(chat, bad(c));
    const r = await AD('POST', `/api/learn/decks/${c.id}/content`, { slides }); if (!r.ok) return send(chat, bad(r));
    return send(chat, `✅ «${H(name)}» ተጫነ — ${slides.length} ስላይድ። አሁን ዋጋ/ካታሎግ ያስተካክሉ።`, ik([[b('🛒 በካታሎግ ዘርዝር', `axdl:${c.id}`), b('▶️ ክፈት', `axds:${c.id}`)], [b('💵 ዋጋ ቀይር', `axdp:${c.id}`), b('🔗 ሊንክ', `axdk:${c.id}`)]]));
  }
  async function axNews(chat) {
    await send(chat, '🌐 የዜና/ድር ፍለጋ ምንጮችን እየፈተሽሁ ነው…'); const r = await svc.newsDiag();
    return send(chat, `🌐 <b>የዜና ፍለጋ ምርመራ</b> — ${r.ok ? '✅ ይሠራል' : '❌ ምንም ምንጭ አልደረሰም'} (${r.items} ውጤት)\n\n` + (Object.entries(r.by).map(([k2, v]) => `${v.ok ? '✅' : v.empty ? '⚪' : '❌'} ${H(k2)} — ✅${v.ok} ⚪${v.empty} ❌${v.fail}${v.note ? '\n   ' + H(v.note) : ''}`).join('\n') || '—') + (r.ok ? '' : '\n\n<i>Render ከውጭ ድረ-ገጾች እንዳይደርስ ሊታገድ ይችላል፤ ቀኑ/ሰዓቱ ግን ይሠራል።</i>'));
  }
  async function axSms(chat, rotate) {
    const r = rotate ? await AD('POST', '/api/pay/admin/sms/rotate', {}) : await AD('GET', '/api/pay/admin/sms'); if (!r.ok) return send(chat, bad(r));
    const g = rotate ? await AD('GET', '/api/pay/admin/sms') : r;
    return send(chat, `📲 <b>SMS ራስ-ማረጋገጫ</b> (ነጻ፣ በጣም ትክክለኛ)\n\nየቴሌብር/ባንክ «ገንዘብ ተቀብለዋል» SMS የሚደርስበት ስልክ ላይ ነጻ <b>SMS Forwarder</b> (ወይም MacroDroid/Tasker) ይጫኑ፤ SMS ሲደርስ በ <b>HTTP POST</b> ወደዚህ አድራሻ እንዲልክ ያድርጉ፦\n<code>${H(g.url)}</code>\n\nየሰውነት (JSON)፦\n<code>{"from":"{sender}","text":"{message}"}</code>\n\n📥 እስካሁን የደረሰ፦ ${g.count}${(g.recent || []).length ? '\n' + g.recent.slice(0, 5).map(x => `${x.used ? '✔️' : '🕒'} ${H(x.ref)} · ${H(x.method)} · ${x.amount} ብር`).join('\n') : ''}\n\n<i>ክፍያ ሲገባ ተጠቃሚው ማጣቀሻ ያስገባል፤ ከ SMS ጋር መጠን+ማጣቀሻ ሲመሳሰል በራስ ይጸድቃል። ሚስጥሩን ለማንም አይስጡ።</i>`, ik([[b('🔑 ሚስጥር ቀይር', 'axsmsr')]]));
  }
  async function axRoute(chat, k, a, x) {
    if (k === 'axsms') return axSms(chat, false); if (k === 'axsmsr') return axSms(chat, true);
    if (k === 'axnews') return axNews(chat);
    if (k === 'axai') return axAi(chat); if (k === 'axq') return axAiReqs(chat); if (k === 'axl') return axLearnReqs(chat); if (k === 'axd') return axDecks(chat);
    if (k === 'axt') { if (!/^(enabled|paywall|autoApprove|requireProof)$/.test(a)) return; const o = await AD('GET', '/api/ai/admin/overview'); const r = await AD('POST', '/api/ai/admin/config', { [a]: !o.cfg[a] }); if (!r.ok) return send(chat, bad(r)); return axAi(chat); }
    if (k === 'axpr') { const o = await AD('GET', '/api/ai/admin/overview'); return send(chat, 'የትኛውን እቅድ ዋጋ ይቀይራሉ?', ik(o.cfg.plans.map(p => [b(`${p.label} — ${p.price} ብር`, 'axps:' + p.id)]))); }
    if (k === 'axps') return startFlow(chat, 'axprice', [{ k: 'price', q: 'አዲሱ ዋጋ (ብር)፦', t: 'num', min: 0, max: 100000 }], { id: a });
    if (k === 'axlm') return send(chat, 'የትኛውን ገደብ ይቀይራሉ?', ik([[b('🆓 ነጻ መልእክት/ቀን', 'axn:freeChatDay'), b('🆓 ነጻ ገጽ/ቀን', 'axn:freePagesDay')], [b('💎 የተከፈለ መልእክት/ቀን', 'axn:paidChatDay'), b('💎 የተከፈለ ገጽ/ቀን', 'axn:paidPagesDay')]]));
    if (k === 'axn') { if (!/^(freeChatDay|freePagesDay|paidChatDay|paidPagesDay)$/.test(a)) return; return startFlow(chat, 'axlimit', [{ k: 'v', q: 'አዲሱ ቁጥር፦', t: 'num', min: 0, max: 100000 }], { f: a }); }
    if (k === 'axg') return startFlow(chat, 'axgrant', [{ k: 'q', q: 'የተጠቃሚው ስልክ ወይም ኢሜይል፦', t: 'text', min: 4, max: 80 }, { k: 'act', q: 'ምን ይደረግ?', t: 'choice', o: ['🎁 ቀን ስጥ (0 = አስወግድ)', '⛔ አግድ', '✅ ማገዱን አንሳ'] }, { k: 'days', q: 'ስንት ቀን? (ለማገድ/ለማንሳት 0 ያስገቡ)', t: 'num', min: 0, max: 3650 }]);
    if (k === 'axlp') { const r = await AD('POST', `/api/learn/admin/requests/${a}/${x === '1' ? 'approve' : 'reject'}`, x === '1' ? {} : { reason: 'ክፍያው አልተረጋገጠም' }); return send(chat, r.ok ? (x === '1' ? '✅ ተፈቅዷል — ተማሪው ተነግሯል' : '❌ ውድቅ ተደርጓል') : bad(r)); }
    if (k === 'axnew') { ses(chat).axup = true; save(); return send(chat, '📎 አሁን <b>.pptx</b> ፋይሉን ይላኩ።'); }
    if (k === 'axdl' || k === 'axds') { const o = await AD('GET', '/api/learn/decks'), d = (o.items || []).find(y => y.id === a); if (!d) return send(chat, '❌ አልተገኘም'); const r = await AD('POST', `/api/learn/decks/${a}/settings`, k === 'axdl' ? { listed: !d.listed } : { status: d.status === 'on' ? 'off' : 'on' }); return r.ok ? axDecks(chat) : send(chat, bad(r)); }
    if (k === 'axdp') return startFlow(chat, 'axdeckprice', [{ k: 'price', q: 'ዋጋ (ብር፤ 0 = ነጻ)፦', t: 'num', min: 0, max: 1000000 }], { id: a });
    if (k === 'axdk') return send(chat, `🔗 ${H(web('/learn/' + a))}\n🤖 https://t.me/${botUser}?start=d_${a}`);
  }
  FIN.axprice = async (chat, uid, d, x) => { const o = await AD('GET', '/api/ai/admin/overview'); const plans = o.cfg.plans.map(p => (p.id === x.id ? { ...p, price: Number(d.price) } : p)); const r = await AD('POST', '/api/ai/admin/config', { plans }); return r.ok ? axAi(chat) : send(chat, bad(r)); };
  FIN.axlimit = async (chat, uid, d, x) => { const r = await AD('POST', '/api/ai/admin/config', { [x.f]: Number(d.v) }); return r.ok ? axAi(chat) : send(chat, bad(r)); };
  FIN.axgrant = async (chat, uid, d) => { const body = /አግድ/.test(d.act) ? { blocked: true } : /አንሳ/.test(d.act) ? { blocked: false } : { days: Number(d.days) }; const r = await AD('POST', '/api/ai/admin/grant', { q: d.q, ...body }); return send(chat, r.ok ? `✅ ተከናውኗል${r.until ? ' — እስከ ' + new Date(r.until + 3 * 3600e3).toISOString().slice(0, 10) : ''}${r.blocked ? ' · ⛔ ታግዷል' : ''}` : bad(r)); };
  FIN.axdeckprice = async (chat, uid, d, x) => { const r = await AD('POST', `/api/learn/decks/${x.id}/settings`, { price: Number(d.price) }); return r.ok ? axDecks(chat) : send(chat, bad(r)); };

  /* ================= እገዛ ================= */
  const HELP = `❓ <b>እገዛ — ቦቱ የሚያደርገው</b>\n\n🛍 <b>ገበያ</b> — ዕቃ ይፈልጉ፣ ጋሪ፣ ይዘዙ፣ ክፍያ ይላኩ፣ ደረሰኝ ያውርዱ፣ ግምገማ ይስጡ\n🏪 <b>ሱቆች</b> — ሱቆችን ይመልከቱ\n💼 <b>ሥራ</b> — ክፍት ሥራ፣ ሠራተኞች፣ ማመልከት፣ መቅጠር\n🌐 <b>ገጾች</b> — የሌሎችን ገጽ ይመልከቱ (👁)፣ ቅጽ ይሙሉ\n👤 <b>ገጾቼ</b> — የራስዎን ገጽ (ሠራተኛ፣ አሰሪ፣ ሱቅ፣ ሆቴል…) ይክፈቱ እና ያስተዳድሩ፤ ዕቃ እና ትዕዛዝ፤ ሥራ ማስታወቅ፤ የግል መረጃ\n\n/menu — ዋና ማውጫ · /cancel — የጀመሩትን ሰርዝ

🤖 <b>AI ረዳት</b> — ማንኛውንም ጥያቄ ይጻፉ፤ PDF/PowerPoint (እንግሊዝኛ) ይላኩ — ገጽ በገጽ ወደ አማርኛ እተረጉማለሁ።`;

  /* ================= ራውተር ================= */
  const LABELS = { ...LABEL_KEYS, '🛡 አድሚን': 'admin' };

  /* ================= v16፦ መልስ በቦቱ · ማንቂያዎች · inline · deep link · በአቅራቢያዬ · አድሚን · ቋንቋ ================= */
  const botUser = c.botUsername || '';
  const deepLink = (t, id) => (botUser ? `https://t.me/${botUser}?start=${t}_${id}` : '');
  async function openDeep(chat, uid, d) {
    const fn = { s: showShop, p: showProduct, w: showWorker, e: showEmployer, j: showJob, g: showPage }[d.t];
    return fn ? fn(chat, uid, d.id) : undefined;
  }
  /* ---------- inline ፍለጋ፦ @Bot ሶፋ ---------- */
  async function inline(q) {
    const text = String(q.query || '').trim().slice(0, 60), results = [], https = /^https:/.test(baseUrl);
    if (text.length >= 2) {
      const r = await GET('/api/search' + qs({ q: text }));
      for (const g of (r.groups || [])) for (const it of g.items) {
        if (results.length >= 25) break; const url = web(it.href);
        results.push({ type: 'article', id: (g.key + ':' + it.id).slice(0, 64), title: String(it.title).slice(0, 100), description: (g.label + ' · ' + (it.sub || '')).slice(0, 200),
          ...(https && it.img ? { thumbnail_url: web('/api/market/img/' + it.img) } : {}),
          input_message_content: { message_text: `${it.title}\n${it.sub || ''}\n${url}`.slice(0, 4000) },
          ...(https ? { reply_markup: { inline_keyboard: [[{ text: '👁 ክፈት', url }]] } } : {}) });
      }
    }
    return tg('answerInlineQuery', { inline_query_id: q.id, results, cache_time: 20, is_personal: false }).catch(e => console.warn('inline:', e.message));
  }
  /* ---------- በአቅራቢያዬ ---------- */
  const GEO_KB = { keyboard: [[{ text: '📍 ቦታዬን አጋራ', request_location: true }], ['✖️ ተው']], resize_keyboard: true, one_time_keyboard: true };
  function nearStart(chat) { const s = ses(chat); s.await = 'near'; save(); return send(chat, '📍 ቦታዎን ያጋሩ — የቅርብ ሱቆች፣ ገጾች፣ ሙያተኞች እና አሰሪዎች አሳያለሁ።\n🔒 ቦታዎ ለዚህ ፍለጋ ብቻ ለአጭር ጊዜ ይቆያል።', GEO_KB); }
  const KM = { s: 'shops', g: 'pages', w: 'workers', e: 'employers' }, NB_CB = { s: 'sh', g: 's', w: 'w', e: 'e' };
  const NB_KB = ik([[b('🏪 ሱቆች', 'nb:s'), b('🌐 ገጾች', 'nb:g')], [b('🧑‍🔧 ሙያተኞች', 'nb:w'), b('🏢 አሰሪዎች', 'nb:e')]]);
  async function onLocation(chat, m) {
    const s = ses(chat), uid = uidOf(chat); if (!uid) return authStart(chat); const { latitude: lat, longitude: lng } = m.location, mode = s.await; s.await = null;
    if (mode === 'set' || mode === 'setw') { const r = await POST('/api/geo/set', uid, { lat, lng, targets: mode === 'setw' ? ['w'] : ['s', 'g', 'e'] }); return send(chat, r.ok ? `✅ ቦታ ተቀምጧል (${H(r.set.join('፣'))}) — ደንበኞች «በአቅራቢያዬ» ሲፈልጉ ይገኛሉ።\n🔒 ትክክለኛ ቦታ ለህዝብ አይታይም፤ ርቀት ብቻ።` : bad(r), menuKb(chat)); }
    if (mode === 'near') { s.loc = { lat, lng, ts: Date.now() }; await send(chat, '✅ ቦታዎ ደርሷል።', menuKb(chat)); return send(chat, '📍 ምን ይፈልጋሉ?', NB_KB); }
    return home(chat);
  }
  async function nearby(chat, uid, kind) {
    const s = ses(chat); if (!s.loc || Date.now() - s.loc.ts > 30 * 60e3) { s.loc = null; return nearStart(chat); }
    const r = await GET('/api/nearby' + qs({ lat: s.loc.lat, lng: s.loc.lng, kind: KM[kind] || 'shops' }), uid); if (!r.ok) return send(chat, bad(r));
    if (!r.items.length) return send(chat, '🤷 በ30 ኪ.ሜ ውስጥ ቦታቸውን ያስቀመጡ የሉም።', NB_KB);
    return send(chat, '📍 <b>በአቅራቢያዎ</b> (ከቅርብ ወደ ሩቅ)', ik([...r.items.map(i => [b(`${clip(i.name, 24)} · ${i.km} ኪ.ሜ`, NB_CB[kind] + ':' + i.id)]), [b('🔄 ሌላ ዓይነት', 'nbk')]]));
  }
  /* ---------- ማንቂያዎች ---------- */
  const AL_K = [['🛍 ዕቃ', 'products'], ['💼 ሥራ', 'jobs'], ['🧑‍🔧 ሙያተኛ', 'workers'], ['🌐 ገጽ', 'pages']];
  async function alertsMenu(chat, uid) {
    const r = await GET('/api/alerts', uid); if (!r.ok) return send(chat, bad(r));
    const rows = r.items.map(a => [b(`🗑 ${r.kinds[a.kind] || ''} «${clip(a.q, 20)}»${a.city ? ' · ' + clip(a.city, 10) : ''}${a.maxPrice ? ' ≤' + a.maxPrice : ''}`, 'aldel:' + a.id)]); rows.push([b('➕ አዲስ ማንቂያ', 'aln')]);
    return send(chat, `🔔 <b>ማንቂያዎቼ</b> (${r.items.length}/10)\nአዲስ ተዛማጅ ሲመዘገብ እነግርዎታለሁ። ለመሰረዝ 🗑 ይጫኑ።`, ik(rows));
  }
  const alertFlow = (chat, pre) => startFlow(chat, 'alertnew', [{ k: 'kind', q: 'ምን ዓይነት ይፈልጋሉ?', t: 'choice', o: AL_K.map(x => x[0]) }, { k: 'q', q: 'የሚፈልጉት ቃል (ለምሳሌ፦ ሹፌር፣ ሶፋ፣ አናጺ)፦', t: 'text', min: 2, max: 60, def: pre || undefined }, { k: 'city', q: 'ከተማ (አማራጭ)፦', t: 'text', opt: true, max: 60 }, { k: 'maxPrice', q: 'ከፍተኛ ዋጋ በብር (አማራጭ)፦', t: 'num', opt: true, if: ['kind', '🛍 ዕቃ'] }], {}, '🔔 አዲስ ማንቂያ');
  FIN.alertnew = async (chat, uid, d) => { const kind = (AL_K.find(x => x[0] === d.kind) || [])[1]; const r = await POST('/api/alerts', uid, { kind, q: d.q, city: d.city || '', maxPrice: d.maxPrice || 0 }); return send(chat, r.ok ? '✅ ማንቂያ ተቀምጧል — አዲስ ተዛማጅ ሲኖር እነግርዎታለሁ።' : bad(r), ik([[b('🔔 ማንቂያዎቼ', 'alerts')]])); };
  /* ---------- መልእክቶች (ከድረ-ገጹ chat ጋር አንድ ውይይት) ---------- */
  async function msgList(chat, uid) {
    const r = await GET('/api/chat/threads', uid); if (!r.ok) return send(chat, bad(r)); if (!r.items.length) return send(chat, '💬 እስካሁን ውይይት የለም — በማንኛውም ሱቅ፣ ዕቃ፣ ሙያተኛ፣ ሥራ ወይም ገጽ ላይ «💬 መልእክት ላክ» ይጫኑ።');
    return send(chat, '💬 <b>መልእክቶች</b>', ik(r.items.slice(0, 20).map(t => [b(`${t.unread ? '🔴 ' : ''}${clip(t.label, 20)} — ${clip(t.last ? t.last.text : '', 22)}`, 'cth:' + t.id)])));
  }
  async function msgOpen(chat, uid, id) {
    const r = await GET('/api/chat/thread/' + id, uid); if (!r.ok) return send(chat, bad(r)); const t = r.thread;
    const L = r.items.slice(-6).map(m => `${m.mine ? '🟢 እኔ' : '⚪️ ' + H(t.label)}፦ ${H(clip(m.text, 300))}`).join('\n\n');
    return send(chat, `💬 ${B(t.label)}${t.ctx ? ` · <i>${H(t.ctx.kind)}፦ ${H(t.ctx.title)}</i>` : ''}\n\n${L || '—'}`, ik([[b('↩️ መልስ', 'cr:' + id)], [u('🌐 ሙሉ ውይይት', web('/me/messages/' + id)), b('📥 መልእክቶች', 'messages')]]));
  }
  FIN.chatsend = async (chat, uid, d, x) => { const r = await POST('/api/chat/thread/' + x.id, uid, { text: d.text }); return send(chat, r.ok ? '✅ ተልኳል' : bad(r), ik([[b('💬 ውይይቱን ክፈት', 'cth:' + x.id)]])); };
  FIN.chatstart = async (chat, uid, d, x) => { const r = await POST('/api/chat/start', uid, { t: x.t, id: x.id, text: d.text }); return send(chat, r.ok ? '✅ መልእክትዎ ተልኳል — መልስ ሲመጣ እነግርዎታለሁ።' : bad(r), r.ok ? ik([[b('💬 ውይይቱን ክፈት', 'cth:' + r.id)]]) : undefined); };
  /* ---------- አድሚን፦ እምነት፣ ማስታወቂያ፣ ሪፖርት ---------- */
  async function adminTrust(chat) {
    const r = await AD('GET', '/api/trust/admin/overview'); if (!r.ok) return send(chat, bad(r));
    const reqs = r.requests.filter(q => q.status === 'pending').slice(0, 8), reps = r.reports.filter(x => x.status === 'open').slice(0, 8);
    await send(chat, `🛡 <b>እምነት</b> — ✅ የባጅ ጥያቄ ${reqs.length} · 🚩 ክፍት ሪፖርት ${reps.length}`);
    for (const q of reqs) await photo(chat, q.proof[0], `✅ ${B(q.label + '፦ ' + q.name)}\n${H(q.owner.name || '')} ${H(q.owner.email || '')}${q.note ? '\n' + H(q.note) : ''}\n🖼 ${q.proof.length} ማስረጃ`, ik([[b('✅ አጽድቅ', 'atrq:' + q.id + ':1'), b('❌ ውድቅ', 'atrq:' + q.id + ':0')]]));
    for (const x of reps) await send(chat, `🚩 ${B(x.label + '፦ ' + x.name)}${x.count > 1 ? ' ×' + x.count : ''}\n${H(x.reason)}${x.note ? '\n' + H(x.note) : ''}`, ik([[b('🙈 አልተረጋገጠም', 'atrp:' + x.id + ':dismiss'), b('✔ ተፈትቷል', 'atrp:' + x.id + ':resolve')], [b('⛔ ደብቅ', 'atrph:' + x.id)]]));
    if (!reqs.length && !reps.length) await send(chat, '✨ ምንም የሚጠብቅ የለም።');
  }
  FIN.atrqno = async (chat, uid, d, x) => { const r = await AD('POST', '/api/trust/admin/request/' + x.id, { approve: false, note: d.note || '' }); return send(chat, r.ok ? '✅ ውድቅ ተደርጓል — ባለቤቱ ተነግሯል' : bad(r)); };
  FIN.bcast = async (chat, uid, d) => { ses(chat).bc = d.text; save(); return send(chat, `📣 <b>ቅድመ-እይታ</b>\n\n${H(d.text)}\n\nለሁሉም ተጠቃሚ (ዜና ያላጠፉ) ይላክ?`, ik([[b('✅ ለሁሉም ላክ', 'bcgo'), b('✖️ ተው', 'bcx')]])); };
  async function broadcast(chat) {
    const s = ses(chat), text = s.bc; s.bc = null; if (!text) return send(chat, 'መልእክት የለም');
    if (Date.now() - (s.lastBc || 0) < 3600e3) return send(chat, '⏳ ማስታወቂያ በሰዓት አንድ ጊዜ ብቻ ይላካል።'); s.lastBc = Date.now(); save();
    rebuild(); const targets = Object.entries(map).filter(([, uid]) => !isSusp(uid) && prefs(uid).news !== false).map(([ch]) => ch);
    await send(chat, `📣 ወደ ${targets.length} ሰው በመላክ ላይ…`); let ok = 0;
    for (const t of targets) { try { await tg('sendMessage', { chat_id: t, text: `📣 ${text}\n\n🔕 ዜና ለማቆም፦ /account → «📣 ዜና»`.slice(0, 3900), disable_web_page_preview: true }); ok++; } catch (e) { } await new Promise(r => setTimeout(r, 60)); }
    return send(chat, `✅ ተልኳል፦ ${ok}/${targets.length}`);
  }
  function adminReportNow(chat) {
    const st = getStore(), colx = p => st.docs[p] || {}, accts = Object.keys(st.docs).filter(p => /^data\/users\/[\w-]+$/.test(p)).map(p => (st.docs[p].acct || {}).ts || 0);
    return send(chat, require('./scheduler').adminReport(colx, Date.now(), accts.filter(t => t > Date.now() - 864e5).length));
  }
  const langMenu = chat => send(chat, '🌐 ቋንቋ / Language / Afaan / ቋንቋ', ik([BOT_LANGS.map(([k, n]) => b((lang(chat) === k ? '✓ ' : '') + n, 'lg:' + k))]));

  /* ---------- ተማሪ ፋይል (mini app) — መለያ ሳይከፍቱ በ `t.me/ቦት?start=d_<id>` ---------- */
  async function learnStart(chat, id) {
    const r = await GET('/api/learn/public/' + id); if (!r.ok) return send(chat, '❌ ይህ ፋይል አልተገኘም ወይም ተሰርዟል።');
    if (!r.open) return send(chat, `📖 ${B(r.title)}\n\n⏳ ፋይሉ አሁን ክፍት አይደለም። መምህርዎን ይጠይቁ።`);
    const url = web('/learn/' + id), cap = `📖 ${B(r.title)}\n\n👇 ከታች ይጫኑ፤ ስምዎን እና የተማሪ ID ያስገቡ፤ ከዚያ «ፋይሉን ክፈት» ይጫኑ።\n🔒 ፋይሉ በዚህ Telegram ውስጥ ብቻ ይከፈታል፤ መልእክቱ ሊተላለፍ አይችልም።`;
    return tg('sendMessage', { chat_id: chat, text: cap, parse_mode: 'HTML', protect_content: true, reply_markup: /^https:/.test(baseUrl) ? { inline_keyboard: [[{ text: '📖 ክፈት', web_app: { url } }]] } : undefined });
  }
  async function action(chat, uid, a) {
    switch (a) {
      case 'market': return marketHome(chat, uid); case 'shops': return listShops(chat, uid); case 'jobs': return jobsMenu(chat); case 'pages': return listPages(chat, uid, 1);
      case 'cart': return showCart(chat); case 'orders': return listOrders(chat, uid); case 'me': return hub(chat, uid); case 'help': return send(chat, HELP, menuKb(chat));
      case 'search': return startFlow(chat, 'search', [{ k: 'q', q: '🔎 የሚፈልጉትን ዕቃ ስም ይጻፉ፦', t: 'text', min: 2, max: 60 }]);
      case 'admin': return isAdmin(chat) ? adminHub(chat) : send(chat, '⛔ አድሚን ብቻ');
      case 'ai': return aiIntro(chat, uid); case 'learn': return eduHome(chat, uid);
      case 'near': return nearStart(chat); case 'alerts': return alertsMenu(chat, uid); case 'messages': return msgList(chat, uid);
    }
  }
  async function onText(chat, text, msg) {
    const t = text.trim(), s = ses(chat), uid = uidOf(chat);
    if (/^\/cancel\b/.test(t)) { s.flow = null; s.auth = null; s.aiproof = null; save(); return home(chat, '✖️ ተሰርዟል።'); }
    if (/^\/myid\b/.test(t)) return send(chat, `🆔 Chat ID፦ <code>${chat}</code>`);
    const ld = /^\/start\s+d_([\w-]{4,40})$/.exec(t); if (ld) return learnStart(chat, ld[1]);
    const dl = /^\/start\s+([sgpwej])_([\w-]{4,40})$/.exec(t); if (dl) s.deep = { t: dl[1], id: dl[2] };       // deep link — ከመግባት በኋላም ይከፈታል
    if (t === '✖️ ተው') { s.await = null; s.flow = null; s.aiproof = null; save(); return home(chat); }
    if (uid && /^\/ai\b/.test(t)) return aiIntro(chat, uid); if (isAdmin(chat) && /^\/newstest\b/.test(t)) return axNews(chat); if (uid && /^\/voice\b/.test(t)) { const s2 = ses(chat), nx = { undefined: 'on', auto: 'on', on: 'off', off: 'auto' }[s2.vo || 'auto']; s2.vo = nx; save(); return send(chat, nx === 'on' ? '🔊 ሁልጊዜ በድምፅም እመልሳለሁ።' : nx === 'off' ? '🔇 የድምፅ መልስ ጠፍቷል (ድምፅ ቢልኩም በጽሑፍ ብቻ)።' : '🎙 በድምፅ ሲጠይቁ በድምፅ እመልሳለሁ (ነባሪ)።'); } if (uid && /^\/(new|reset)\b/.test(t)) { ai.reset(String(chat)); return send(chat, '🧹 አዲስ ውይይት ጀምረናል።', menuKb(chat)); }
    if (uid && /^\/lang\b/.test(t)) return langMenu(chat);
    if (uid && /^\/(search|near|alerts|messages)\b/.test(t)) return action(chat, uid, /^\/(\w+)/.exec(t)[1]);
    if (/^\/(start|menu|login)\b/.test(t)) { s.flow = null; if (uid) { await home(chat, `🇪🇹 <b>ኢትዮ ዲጂታል ማርኬት</b>\n${tx(chat, 'welcome')} ${H(userOf(uid).name)}!`); return send(chat, '✨ ዛሬ ምን እናድርግ?', ik([[b('🎓 ትምህርት', 'ob:e'), b('🛍 ገበያ', 'ob:m')], [b('🤖 ማንኛውንም ጠይቁኝ', 'aih')]])); } s.auth = null; return authStart(chat); }
    if (/^\/account\b/.test(t) && uid) return accountMenu(chat, uid);
    if (/^\/logout\b/.test(t) && uid) return send(chat, '🚪 ከአካውንትዎ መውጣት ይፈልጋሉ?', ik([[b('✅ አዎ ውጣ', 'loc'), b('✖️ አይ', 'acc')]]));
    if (/^\/help\b/.test(t) || t === '❓ እገዛ') return send(chat, HELP, menuKb(chat));
    if (s.auth) { if (uid && (LABELS[t] || /^\//.test(t))) s.auth = null; else return authText(chat, t, msg); }
    if (!uid && !(isAdmin(chat) && (t === '🛡 አድሚን' || s.flow))) return authStart(chat);
    if (LABELS[t]) { s.flow = null; return action(chat, uid, LABELS[t]); }
    if (/^\//.test(t)) return home(chat);
    if (s.flow) return flowText(chat, t, msg);
    if (aiReady()) return aiText(chat, uid, t);          // ሌላ ማንኛውም ጽሑፍ → AI ረዳት
    return send(chat, '👇 ከታች ካለው ማውጫ ይምረጡ ወይም ዕቃ ለመፈለግ «🔎 ፈልግ» ይጫኑ።', menuKb(chat));
  }
  async function route(chat, data) {
    const [k, a, x, y] = data.split(':'); let uid = uidOf(chat);
    if (k === 'noop') return;
    if (k === 'login') return authStart(chat);
    if (k === 'ob') { const s0 = ses(chat); s0.mode = { e: 'edu', m: 'market', b: 'both' }[a] || 'both'; save(); if (uid) return s0.mode === 'both' ? home(chat, '✨ እንኳን ደህና መጡ — ከታች ይምረጡ።') : landing(chat, uid); return authAsk(chat, a === 'e'); }
    if (k === 'pw') return a === 'up' ? payMenu(chat, uid) : send(chat, '🌅 እሺ! ነገ ነጻ ድርሻዎ ይታደሳል፤ ተመልሰው ይቀጥሉ — በዚህ ጊዜ ትምህርቱን ወይም ገበያውን ያስሱ።', menuKb(chat));
    if (k === 'rst') { const a = ses(chat).auth; if (a && a.stage === 'pw') { a.stage = 'resetpw'; save(); return send(chat, '🆘 ስልክዎ በ Telegram ስለተረጋገጠ አዲስ የይለፍ ቃል መፍጠር ይችላሉ።\n🔐 አዲስ የይለፍ ቃል ይጻፉ (ቢያንስ 8 ቁምፊ — መልዕክቱ ይሰረዛል)፦'); } return authStart(chat); }
    if (!uid && !(isAdmin(chat) && /^(ax|axbk|ad|avp|ast|arf|arl|ash|apt|amod|apay|asl|arfl|adis|ashp|atr|abc|bcgo|bcx|arp|aiap)/.test(k))) return authStart(chat);
    if (/^(ad|avp|ast|arf|arl|ash|ashr|apt|amod|apay|asl|arfl|adis|ashp|atr|atrq|atrp|atrph|abc|bcgo|bcx|arp|aiap)$/.test(k) && !isAdmin(chat)) return send(chat, '⛔ አድሚን ብቻ');
    const s = ses(chat);
    if (k === 'axus') return axUsRoute(chat, a, x, data.split(':')[3]);
    if (/^ax/.test(k) && k !== 'axbk') return isAdmin(chat) ? axRoute(chat, k, a, x) : send(chat, '⛔ አድሚን ብቻ');
    if (k === 'aih') return send(chat, { m: '🛍 ለምሳሌ ይጻፉ፦\n• «ሶፋ ምን ዋጋ አለ?»\n• «በአዲስ አበባ ክፍት ሥራዎች አሉ?»\n• «ሱቅ እንዴት እከፍታለሁ?»\n• «ክፍያው እንዴት ይሠራል?»', d: '📄 PDF ወይም PowerPoint (.pptx) ፋይል ይላኩ — እንግሊዝኛውን ገጽ በገጽ በአውድ ወደ አማርኛ እተረጉማለሁ።', u: '🩺 አጣዳፊ ጥያቄ ሁልጊዜ ነጻ ነው፤ ለምሳሌ «አሞኛል፣ ትኩሳት እና ራስ ምታት አለኝ ምን ላድርግ?» ብለው ይጻፉ። (ከባድ አደጋ ከሆነ ወዲያው ሆስፒታል/አምቡላንስ 907)', s: '🎓 ለምሳሌ «የ cell membrane ተግባር ምንድን ነው?» ወይም «ይህን ርዕስ አጭር ማስታወሻ አድርግልኝ» ብለው ይጻፉ።' }[a] || '🤖'); if (k === 'aipay') return aiPayStart(chat, uid, a); if (k === 'aiap') { const r = await svc.decide(a, x === '1'); return send(chat, r.ok ? (x === '1' ? '✅ ጸድቋል' : '❌ ውድቅ ተደርጓል') : bad(r)); }
    if (k === 'fk') return fkRun(chat, uid, a);
    if (k === 'tc') return tcRoute(chat, uid, a, x);
    if (k === 'bk') return a === 'l' ? bookList(chat, Number(x) || 0) : a === 'o' ? bookOpen(chat, uid, x) : eduHome(chat, uid);
    if (k === 'axbk') { if (!isAdmin(chat)) return send(chat, '⛔ አድሚን ብቻ'); if (a === 'new') { ses(chat).axbk = true; save(); return send(chat, '📎 መጽሐፉን (PDF/PPTX/DOCX/TXT) ይላኩ — caption፦ «ርዕስ | ክፍል» (አማራጭ)።'); } if (a === 'd') { const bs = TB().books, i = bs.findIndex(y => y.id === x); if (i >= 0) bs.splice(i, 1); save(); } return axBooks(chat); }
    if (k === 'adn') return docRun(chat, uid); if (k === 'adfo') return fontMenu(chat, DOCS.get(chat)); if (k === 'adfp' || k === 'adfs') { const dd = DOCS.get(chat), o = { ...DO.optOf((dd && dd.opt) || ses(chat).docopt) }; if (k === 'adfp' && DO.PRESETS[a]) o.preset = a; if (k === 'adfs' && DO.SIZES[a]) o.size = a; ses(chat).docopt = o; if (dd) dd.opt = o; save(); return fontMenu(chat, dd); }
    if (k === 'adf') { const d = DOCS.get(chat); return d ? docFile(chat, d) : send(chat, '⌛ ፋይሉ ጊዜው አልፏል።'); } if (k === 'adx') { DOCS.delete(chat); return send(chat, '✖️ ትርጉሙ ቆሟል።'); }
    switch (k) {
      case 'f': return flowCb(chat, data);
      case 'nb': return nearby(chat, uid, a); case 'nbk': return send(chat, '📍 ምን ይፈልጋሉ?', NB_KB);
      case 'geoset': s.await = 'set'; save(); return send(chat, '📍 የንግድዎን ቦታ (ሱቅ/ገጽ/አሰሪ) ለማስቀመጥ በንግድዎ ቦታ ሆነው ያጋሩ።\n🔒 ርቀት ብቻ ነው ለህዝብ የሚታየው።', GEO_KB);
      case 'geosetw': s.await = 'setw'; save(); return send(chat, '📍 የሙያ ቦታዎን ያጋሩ። ቦታው ~1 ኪ.ሜ ተደብዝዞ ነው የሚቀመጠው (ለህዝብ ኪ.ሜ ብቻ)።', GEO_KB);
      case 'geoclr': { const r = await POST('/api/geo/clear', uid); return send(chat, r.ok ? `✅ ቦታ ጠፍቷል (${r.cleared})` : bad(r)); }
      case 'alerts': return alertsMenu(chat, uid); case 'aln': return alertFlow(chat, ''); case 'alq': { const q = s.lastQ; if (!q) return alertFlow(chat, ''); const r = await POST('/api/alerts', uid, { kind: 'products', q }); return send(chat, r.ok ? `✅ «${H(q)}» ሲመዘገብ እነግርዎታለሁ።` : bad(r), ik([[b('🔔 ማንቂያዎቼ', 'alerts')]])); }
      case 'aldel': { const r = await DEL('/api/alerts/' + a, uid); await send(chat, r.ok ? '🗑 ማንቂያው ተሰርዟል' : bad(r)); return alertsMenu(chat, uid); }
      case 'messages': return msgList(chat, uid); case 'cth': return msgOpen(chat, uid, a);
      case 'cr': return startFlow(chat, 'chatsend', [{ k: 'text', q: '↩️ መልስዎን ይጻፉ፦', t: 'long', min: 1, max: 1000 }], { id: a });
      case 'cst': return startFlow(chat, 'chatstart', [{ k: 'text', q: '💬 መልእክትዎን ይጻፉ፦', t: 'long', min: 1, max: 1000 }], { t: a, id: x });
      case 'lang': return langMenu(chat);
      case 'lg': if (BOT_LANGS.some(l => l[0] === a)) { s.lang = a; save(); authApi.setPref(uid, 'lang', a); } return home(chat, tx(chat, 'langSet'));
      case 'accnw': authApi.setPref(uid, 'news', prefs(uid).news === false); return accountMenu(chat, uid);
      case 'accdg': authApi.setPref(uid, 'digest', prefs(uid).digest === false); return accountMenu(chat, uid);
      case 'atr': return adminTrust(chat);
      case 'atrq': if (x === '1') { const r = await AD('POST', '/api/trust/admin/request/' + a, { approve: true }); return send(chat, r.ok ? '✅ ባጅ ተሰጥቷል — ባለቤቱ ተነግሯል' : bad(r)); } return startFlow(chat, 'atrqno', [{ k: 'note', q: 'ውድቅ የተደረገበት ምክንያት (አማራጭ)፦', t: 'text', opt: true, max: 200 }], { id: a });
      case 'atrp': { const r = await AD('POST', '/api/trust/admin/report/' + a, { action: x }); return send(chat, r.ok ? '✅ ተከናውኗል' : bad(r)); }
      case 'atrph': return send(chat, '⛔ ይህ ነገር ከህዝብ ይደበቅ? (ባለቤቱ ይነገረዋል)', ik([[b('✅ አዎ ደብቅ', 'atrp:' + a + ':hide'), b('✖️ አይ', 'atr')]]));
      case 'abc': return startFlow(chat, 'bcast', [{ k: 'text', q: '📣 ለሁሉም ተጠቃሚ የሚላክ መልእክት፦', t: 'long', min: 5, max: 1000 }], {}, '📣 ማስታወቂያ');
      case 'bcgo': return broadcast(chat); case 'bcx': s.bc = null; return send(chat, '✖️ ተሰርዟል');
      case 'arp': return adminReportNow(chat);
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
      case 'mpg': return a ? manageMyPage(chat, uid, a) : myPages(chat, uid); case 'pgn': return pageTemplates(chat, uid); case 'pgt': return createPageFlow(chat, uid, a);
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
      case 'lall': return send(chat, '📵 በድረ-ገጽ ላይ በሌሎች መሳሪያዎች የገቡበት ሁሉ ይወጣሉ (እዚህ Telegram ላይ ያለዎት መግቢያ አይነካም)። ይቀጥሉ?', ik([[b('✅ አዎ', 'lallc'), b('✖️ አይ', 'acc')]]));
      case 'lallc': { const e = await authApi.logoutAll(uid); await send(chat, e ? bad({ error: e }) : '✅ በድረ-ገጽ ላይ በሁሉም መሳሪያዎች ያሉ መግቢያዎች ወጥተዋል። እንደገና ለመግባት የይለፍ ቃል እና የ Telegram ኮድ ያስፈልጋል።'); return accountMenu(chat, uid); }
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

  /* ================= 🤖 AI ረዳት እና የሰነድ ትርጉም (ገጽ በገጽ → አማርኛ) ================= */
  const aiErr = (e, chat) => (e && e.message === 'ai_timeout' ? '⏳ AI በጊዜው አልመለሰም — እንደገና ይሞክሩ።' : e && e.message === 'ai_network' ? '⚠️ ከ AI አገልግሎት ጋር መገናኘት አልተቻለም — እንደገና ይሞክሩ።' : aiErr0(e)) + (chat && isAdmin(chat) && e && (e.detail || e.status) ? `\n\n🛠 <code>${H(e.message)} ${e.status || ''} ${H(e.detail || '')}</code>` : '');
  const aiErr0 = e => (e && e.message === 'ai_busy' ? '⏳ AI አሁን ሥራ በዝቶበታል — ከጥቂት ደቂቃ በኋላ ይሞክሩ።' : e && e.message === 'ai_bad_doc' ? '⚠️ ፋይሉ መነበብ አልቻለም (የተመሰጠረ፣ በጣም ትልቅ ወይም ከ100 ገጽ በላይ ሊሆን ይችላል)።' : e && e.message === 'ai_too_big' ? '⚠️ ፋይሉ ለ AI በጣም ትልቅ ነው።' : '⚠️ AI አልተሳካም — እንደገና ይሞክሩ።');
  const aiOff = '🤖 AI ገና አልተዘጋጀም። (አድሚን፦ በ Render ላይ GEMINI_API_KEY (ነጻ) ወይም ANTHROPIC_API_KEY ያቀናብሩ።)';
  const planRows = (plans, pre = 'aipay') => plans.map(p => [b(`💳 ${p.label} — ${p.price} ብር`, `${pre}:${p.id}`)]);
  const tbf = (a) => !svc.tbOnly() || /telebirr|ቴሌብር/i.test(a.method);
  const accText = async uid => { const cf = await GET('/api/market/config', uid); return (cf.accounts || []).filter(tbf).map(a => `• ${H(a.method)}፦ <code>${H(a.number)}</code>${a.holder ? ' · ' + H(a.holder) : ''}`).join('\n'); };
  async function paywall(chat, uid, why, partial) {          // ክፍያ በፍጹም አይጠቀስም፤ የነጻ ድርሻ ሲያልቅ ብቻ ለስላሳ መልእክት፤ «ፕላን አሳድግ» ሲጫን ብቻ የክፍያ መንገድ ይታያል
    const inf = svc.info(uid || 'x'); if (partial) await sendLong(chat, '', partial);
    if (inf.pending) return send(chat, '⏳ ያለፈው ክፍያዎ እየተረጋገጠ ነው — ሲጸድቅ ወዲያው እነግርዎታለሁ።');
    const head = why === 'limit' ? '🌟 የዛሬውን ነጻ የ AI ድርሻዎን ተጠቅመዋል — በጣም ጥሩ እየተማሩ ነው!' : why === 'pages' ? '🌟 የዛሬውን ነጻ የገጾች ድርሻዎን ተጠቅመዋል!' : '🌟 ይህ ጥልቅ መልስ በከፍተኛ ፕላን ይገኛል።';
    return send(chat, `${head}\n\nነገ ድርሻዎ ይታደሳል፤ አሁኑኑ መቀጠል ከፈለጉ ፕላንዎን ማሳደግ ይችላሉ።`, ik([[b('⬆️ ፕላን አሳድግ', 'pw:up'), b('⏳ እስከ ነገ እጠብቃለሁ', 'pw:wait')]]));
  }
  async function payMenu(chat, uid) {
    const inf = svc.info(uid || 'x'); if (inf.pending) return send(chat, '⏳ ያለፈው ክፍያዎ እየተረጋገጠ ነው።'); const acc = await accText(uid);
    return send(chat, `⬆️ <b>ፕላን ማሳደግ</b>\n\nእቅድ ይምረጡ፣ ከዚያ ከታች ባሉት አካውንቶች ይክፈሉ እና የክፍያ ማስረጃ (screenshot ወይም PDF) ይላኩ፦\n\n${acc || 'የክፍያ አካውንት በድረ-ገጹ ይመልከቱ'}`, ik(planRows(inf.plans)));
  }
  async function aiIntro(chat, uid) {
    if (!aiReady()) return send(chat, aiOff, menuKb(chat));
    const inf = svc.info(uid || 'x'), adm = isAdmin(chat), left = Math.max(0, inf.free.chat - inf.usage.chat);
    const st = adm ? '🛡 አድሚን — ያልተገደበ' : inf.paid ? `✅ የተከፈለ — እስከ ${new Date(inf.until + 3 * 3600e3).toISOString().slice(0, 10)}` : `🆓 ነጻ — ዛሬ ${left} መልእክት · ${inf.free.pages} የትርጉም ገጽ`;
    return send(chat, `🤖 <b>AI ረዳት</b> · ${st}

• ማንኛውንም ጥያቄ እዚሁ ይጻፉ — እመልሳለሁ።
• 📎 <b>PDF ወይም PowerPoint (.pptx)</b> ይላኩ — እንግሊዝኛውን ገጽ በገጽ በአውድ ወደ አማርኛ እተረጉማለሁ።\n• 📷 <b>ፎቶ ወይም ፋይል</b> (PDF፣ DOCX፣ PPTX፣ TXT፣ CSV) ከጥያቄዎ (caption) ጋር ይላኩ — አንብቤ እመልሳለሁ፤ ተከታይ ጥያቄም ይችላሉ። ለትርጉም ያለ caption ወይም «ተርጉም» ብለው ይላኩ።
• ስለ ገበያው ወይም ስለ ፈጣሪዬ ይጠይቁኝ።
• 🎙 <b>በድምፅ ይጠይቁ</b> (voice message) — እሰማለሁ፤ በድምፅም እመልሳለሁ። /voice — የድምፅ መልስ ማብራት/ማጥፋት\n• /new — አዲስ ውይይት`, ik([[b('🛍 ስለ ገበያው', 'aih:m'), b('📄 ሰነድ አስተርጉም', 'aih:d')], [b('🩺 አጣዳፊ ጥያቄ', 'aih:u'), b('🎓 ትምህርት', 'aih:s')], ]));
  }
  async function aiPayStart(chat, uid, planId) {
    const inf = svc.info(uid), p = inf.plans.find(x => x.id === planId); if (!p) return; if (inf.pending) return send(chat, '⏳ ያለፈው ክፍያዎ እየተረጋገጠ ነው።');
    const cf = await GET('/api/market/config', uid), acc = (cf.accounts || []).filter(tbf).map(a => `• ${H(a.method)}፦ <code>${H(a.number)}</code>${a.holder ? ' · ' + H(a.holder) : ''}`).join('\n');
    return startFlow(chat, 'aibuy', [{ k: 'method', q: 'በየትኛው ዘዴ ከፈሉ?', t: 'choice', o: svc.tbOnly() ? ['telebirr'] : PAY }, { k: 'ref', q: 'የግብይት ማጣቀሻ ቁጥር፦', t: 'text', min: 4, max: 40 }], { plan: p.id }, `🤖 <b>${H(p.label)}</b> — ${p.price} ብር\n\n${acc || 'የክፍያ አካውንት በድረ-ገጹ ይመልከቱ'}\n\nከላይ ባለው አካውንት ${p.price} ብር ከላኩ በኋላ ከታች ዝርዝሩን ያስገቡ።`);
  }
  FIN.aibuy = async (chat, uid, d, x) => {
    const inf = svc.info(uid), st = ses(chat);
    if (!inf.requireProof) { const r = await svc.buy(uid, { plan: x.plan, method: d.method, ref: d.ref }); return send(chat, r.ok ? '✅ ጥያቄዎ ተልኳል — ክፍያው ሲረጋገጥ ይነገርዎታል።' : bad(r), menuKb(chat)); }
    st.aiproof = { plan: x.plan, method: d.method, ref: d.ref, ts: Date.now() }; save();
    return send(chat, '📎 አሁን የክፍያ ማስረጃዎን ይላኩ — <b>screenshot (ፎቶ) ወይም PDF</b> (ከ1.5MB ያነሰ)።\nለመተው «✖️ ተው»።', { keyboard: [['✖️ ተው']], resize_keyboard: true, one_time_keyboard: true });
  };
  async function aiProof(chat, m) {
    const uid = uidOf(chat), st = ses(chat), p = st.aiproof; if (!uid || !p) return; if (Date.now() - p.ts > 30 * 60e3) { st.aiproof = null; save(); return send(chat, '⌛ ጊዜው አልፏል — እንደገና ይጀምሩ።', menuKb(chat)); }
    let fileId, type, mime;
    if (m.photo) { const ok = (m.photo || []).filter(x => (x.file_size || 0) <= 1.4 * 1048576).sort((a, b2) => (b2.width || 0) - (a.width || 0))[0]; if (!ok) return send(chat, '⚠️ ፎቶው ትልቅ ነው — ትንሽ አድርገው ወይም እንደ PDF ይላኩ።'); fileId = ok.file_id; type = 'photo'; }
    else { const d = m.document; if (!/^(image\/(jpeg|png|webp)|application\/pdf)$/.test(d.mime_type || '')) return send(chat, '⚠️ ምስል (JPG/PNG) ወይም PDF ብቻ ይላኩ።'); if ((d.file_size || 0) > 1.4 * 1048576) return send(chat, '⚠️ ፋይሉ ከ1.5MB በላይ ነው።'); fileId = d.file_id; type = 'document'; }
    let buf; try { buf = await tgDownload(fileId); } catch (e) { return send(chat, '⚠️ ፋይሉን ማውረድ አልተቻለም — እንደገና ይላኩ።'); }
    const r = await svc.buy(uid, { plan: p.plan, method: p.method, ref: p.ref, proof: { data: buf.toString('base64') }, tgFile: { type, id: fileId } });
    if (r.ok || r.error !== 'bad_proof') { st.aiproof = null; save(); } return send(chat, r.ok ? '✅ ጥያቄዎ እና ማስረጃዎ ተልኳል — ክፍያው ሲረጋገጥ ይነገርዎታል።' : bad(r), menuKb(chat));
  }
  const typing = chat => tg('sendChatAction', { chat_id: chat, action: 'typing' }).catch(() => { });
  const sendLong = async (chat, head, text) => { const parts = AIM.chunkText(text); for (let i = 0; i < parts.length; i++) await send(chat, (i === 0 && head ? head + '\n\n' : '') + H(parts[i])); };
  const MEDIA = new Map(), TXT_RE = /\.(txt|md|csv|json|docx)$/i, QA_DEF = 'ይህን ፋይል/ፎቶ በጥንቃቄ አንብበህ በአጭሩ ግለጽ፤ በውስጡ ጽሑፍ ካለ አንብብ፤ ከዚያ ምን ልርዳህ ብለህ ጠይቅ።';
  async function readFile(buf, name, mime) {          // ፋይል → { media } (ፎቶ/PDF ለ AI በቀጥታ) ወይም { body } (የተወጣ ጽሑፍ)
    if (/^image\/(jpeg|png|webp|gif)$/.test(mime)) return { media: { mime, buf }, body: '' };
    if (/pdf/i.test(mime) || /\.pdf$/i.test(name)) return { media: { mime: 'application/pdf', buf }, body: '' };
    if (/\.pptx$/i.test(name)) { try { const { parsePptx } = require('../src/lib/pptx'); const r = await parsePptx(buf); return { media: null, body: r.slides.map((x, i) => AIM.slideText({ title: x.title, blocks: x.blocks }, i)).join('\n\n').slice(0, 40000) }; } catch (e) { return { err: '⚠️ PPTX መነበብ አልቻለም።' }; } }
    if (TXT_RE.test(name)) { let body = ''; try { if (/\.docx$/i.test(name)) { const { readZip } = require('../src/lib/pptx'), z = readZip(buf), x = await z.text('word/document.xml'); body = x.replace(/<\/w:p>/g, '\n').replace(/<w:tab\/>/g, ' ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>'); } else body = buf.toString('utf8'); } catch (e) { return { err: '⚠️ ፋይሉ መነበብ አልቻለም።' }; } return { media: null, body: body.slice(0, 40000) }; }
    return { err: '📎 ፎቶ (JPG/PNG)፣ PDF፣ PPTX፣ DOCX ወይም TXT/CSV ይላኩ።' };
  }
  /* ፎቶ ወይም ፋይል + (caption = ጥያቄ) → AI መልስ፤ ፋይሉ ለተከታይ ጥያቄዎች ለ20 ደቂቃ ይታወሳል */
  async function onMedia(chat, m) {
    const uid = uidOf(chat); if (!uid && !isAdmin(chat)) return authStart(chat); if (!aiReady()) return send(chat, aiOff);
    const cap = String(m.caption || '').trim().slice(0, 1500), d = m.document; let fileId, name = 'photo.jpg', mime = 'image/jpeg', size = 0;
    if (m.photo) { const p = (m.photo || []).filter(x => (x.file_size || 0) <= 5 * 1048576).sort((a, b2) => (b2.width || 0) - (a.width || 0))[0] || m.photo[0]; fileId = p.file_id; size = p.file_size || 0; }
    else { fileId = d.file_id; name = d.file_name || 'file'; mime = d.mime_type || ''; size = d.file_size || 0; }
    if (size > (/\.(pdf|pptx)$/i.test(name) ? 19.5 : 14) * 1048576) return send(chat, `⚠️ ፋይሉ ከ${/\.(pdf|pptx)$/i.test(name) ? 20 : 14}MB በላይ ነው።`); typing(chat); let buf; try { buf = await tgDownload(fileId); } catch (e) { return send(chat, '⚠️ ፋይሉን ማውረድ አልተቻለም — እንደገና ይላኩ።'); }
    const rf = await readFile(buf, name, mime); if (rf.err) return send(chat, rf.err); const media = rf.media, text = (cap || QA_DEF) + (rf.body ? `\n\n[የፋይሉ ጽሑፍ — ${name}]\n` + rf.body : '');
    const body = rf.body, isPdf = /pdf/i.test(mime) || /\.pdf$/i.test(name), isPpt = /\.pptx$/i.test(name);
    MEDIA.set(chat, { m: media, t: body, name, isPdf, isPpt, buf: isPdf || isPpt ? buf : null, img: !!media && !isPdf, ts: Date.now() });
    if (!cap) return fileMenu(chat, name);          // ምንጊዜም ምን እንደሚፈልጉ ይጠይቃል
    return runMedia(chat, uid, media, text);
  }
  const FK = { qa: '❓ ጥያቄዎችን መመለስ', tr: '🌐 መተርጎም', qs: '📝 ጥያቄ ማውጣት', ex: '📖 ማብራራት', nt: '🗒 አጭር ማስታወሻ', sm: '📌 ማጠቃለያ', tx: '🔤 ጽሑፍ ማውጣት', tc: '🎓 አስተምረኝ' };
  const FKP = {
    qs: 'ከዚህ ፋይል ይዘት ብቻ በመነሳት የተለያዩ 10 የፈተና ጥያቄዎች (ምርጫ እና አጭር መልስ) ከትክክለኛ መልሶቻቸው ጋር በአማርኛ አውጣ። ጥያቄዎቹ ዋና ዋና ነጥቦችን ይሸፍኑ።',
    ex: 'የዚህን ፋይል ዋና ዋና ርዕሶች አንድ በአንድ በቀላል አማርኛ አብራራ፤ አስፈላጊ ቃላትን በቅንፍ እንግሊዝኛውን ጠብቅ፤ ምሳሌ ጨምር።',
    nt: 'ከዚህ ፋይል አጭር የጥናት ማስታወሻ (short note) በአማርኛ ሥራ፤ ዋና ዋና ነጥቦችን በነጥብ (•) ብቻ፣ ርዕስ በርዕስ፣ በተቻለ መጠን አጭር።',
    sm: 'ይህን ፋይል በአማርኛ ከ8 ነጥብ ባልበለጠ አጠቃልል።',
    tx: 'በፋይሉ/ፎቶው ውስጥ ያለውን ጽሑፍ ሁሉ እንዳለ በትክክል አውጣ (ምንም ሳትጨምር)።',
    trx: 'በዚህ ፋይል/ፎቶ ውስጥ ያለውን ጽሑፍ ሁሉ በአውድ ወደ ተፈጥሯዊ አማርኛ ተርጉም (የሥዕል/ሰንጠረዥ ጽሑፍም ጭምር)።'
  };
  const fileMenu = (chat, name) => send(chat, `📎 <b>${H(clip(name || 'ፋይል', 60))}</b> ተቀብያለሁ።\nምን እንዳደርግልዎ ይፈልጋሉ?`, ik([[b(FK.qa, 'fk:qa'), b(FK.tr, 'fk:tr')], [b(FK.qs, 'fk:qs'), b(FK.ex, 'fk:ex')], [b(FK.nt, 'fk:nt'), b(FK.sm, 'fk:sm')], [b(FK.tx, 'fk:tx'), b(FK.tc, 'fk:tc')], [b('🧑‍🏫 በሰሌዳ (live) አስረዳኝ', 'tc:bd')]]));
  async function fkRun(chat, uid, act) {
    const lm = MEDIA.get(chat); if (!lm || Date.now() - lm.ts > 20 * 60e3) return send(chat, '⌛ ፋይሉ ጊዜው አልፏል — እንደገና ይላኩ።');
    if (act === 'tc') return teachStart(chat, uid);
    if (act === 'qa') return send(chat, '❓ ስለ ፋይሉ ጥያቄዎን ይጻፉ (ወይም በድምፅ ይጠይቁ) — ለ20 ደቂቃ ፋይሉን አስታውሳለሁ።');
    if (act === 'tr' && (lm.isPdf || lm.isPpt)) { if (!aiReady()) return send(chat, aiOff); return startDoc(chat, uid, lm.buf, lm.name, lm.isPdf); }
    const q = act === 'tr' ? FKP.trx : FKP[act]; if (!q) return;
    await runMedia(chat, uid, lm.m, lm.t ? q + '\n\n[የፋይሉ ጽሑፍ — ' + lm.name + ']\n' + lm.t : q, true);
  }
  async function runMedia(chat, uid, media, text, again) {
    const tm = setInterval(() => typing(chat), 4500); typing(chat);
    try {
      const r = await svc.converse({ uid: uid || 'admin', key: String(chat), text, admin: isAdmin(chat), media });
      if (!r.ok && r.error === 'ai_limit') return paywall(chat, uid, 'limit');
      if (!r.ok) return send(chat, r.error === 'ai_disabled' ? '⏸ AI ለጊዜው በአድሚን ተዘግቷል።' : r.error === 'ai_blocked' ? '⛔ የ AI አገልግሎት ለእርስዎ ተዘግቷል።' : r.error === 'ai_limit' ? '⛔ የዛሬው የ AI መልእክት ገደብ አልቋል።' : aiOff, menuKb(chat));
      if (r.paywall) return await paywall(chat, uid, r.paywall, r.text); await sendLong(chat, '', r.text || '…'); const lm2 = MEDIA.get(chat); await send(chat, '💬 ስለዚህ ፋይል ተጨማሪ ጥያቄ ይጻፉ (ለ20 ደቂቃ ይታወሳል) ወይም ሌላ ይምረጡ፦', ik([[b(FK.qs, 'fk:qs'), b(FK.ex, 'fk:ex')], [b(FK.nt, 'fk:nt'), b(FK.tr, 'fk:tr')]]));
    } catch (e) { await send(chat, aiErr(e, chat)); } finally { clearInterval(tm); }
  }

  /* ===== 🎓 መምህር ሁነታ፦ ፋይሉን ርዕስ በርዕስ በጽሑፍ + በድምፅ ያስተምራል፤ ጥያቄ እየተቀበለ ያብራራል፤ ይፈትናል ===== */
  const TB = () => (S.__tb || (S.__tb = { books: [] })), lmBody = (lm, q) => (lm.t ? q + '\n\n[የፋይሉ ጽሑፍ — ' + lm.name + ']\n' + lm.t : q);
  const TEACHER = 'አንተ ትዕግሥተኛና ብቁ የኢትዮጵያ መምህር ነህ። ተማሪህን በቀላል አማርኛ (የቴክኒክ ቃላት እንግሊዝኛውን በቅንፍ) እንደ ክፍል ውስጥ መምህር ታስተምራለህ፤ ከተሰጠው ፋይል ይዘት ሳትወጣ፤ ምሳሌዎችን ተጠቀም።';
  async function askAI(chat, uid, text, media) {
    try {
      const r = await svc.converse({ uid: uid || 'admin', key: String(chat), text, admin: isAdmin(chat), media });
      if (!r.ok && r.error === 'ai_limit') { await paywall(chat, uid, 'limit'); return null; }
      if (!r.ok) { await send(chat, r.error === 'ai_disabled' ? '⏸ AI ለጊዜው በአድሚን ተዘግቷል።' : r.error === 'ai_blocked' ? '⛔ የ AI አገልግሎት ለእርስዎ ተዘግቷል።' : r.error === 'ai_limit' ? '⛔ የዛሬው የ AI መልእክት ገደብ አልቋል።' : aiOff, menuKb(chat)); return null; }
      if (r.paywall) { await paywall(chat, uid, r.paywall, r.text); return null; } return r.text || '';
    } catch (e) { await send(chat, aiErr(e, chat)); return null; }
  }
  const tcKb = (chat, lm) => { const vo = ses(chat).vo !== 'off', last = lm.tc && lm.tc.i >= lm.tc.topics.length - 1; return ik([[b(last ? '🏁 ማጠቃለያ' : '▶️ ቀጣይ ትምህርት', 'tc:nx'), b('🔁 በሌላ መንገድ', 'tc:rp')], [b('❓ ጥያቄ አለኝ', 'tc:q'), b('📝 ፈትነኝ', 'tc:qz')], [b('🧑‍🏫 በሰሌዳ (live)', 'tc:bd')], [b('📋 ርዕሶች', 'tc:ls'), b(vo ? '🔊 ድምፅ በርቷል' : '🔇 ድምፅ ጠፍቷል', 'tc:vo')]]); };
  async function teachStart(chat, uid) {
    const lm = MEDIA.get(chat); if (!lm) return send(chat, '⌛ ፋይሉ ጊዜው አልፏል — እንደገና ይላኩ።'); if (!aiReady()) return send(chat, aiOff);
    typing(chat); const tm = setInterval(() => typing(chat), 4500);
    try {
      const out = await askAI(chat, uid, lmBody(lm, TEACHER + '\n\nይህን ፋይል መርምረህ ለማስተማር ከ4 እስከ 12 ርዕሶች (ትምህርቶች) በቅደም ተከተል ዘርዝር። ቅርጸት፦ እያንዳንዱ በአንድ መስመር «ቁጥር. ርዕስ» ብቻ፤ ሌላ ጽሑፍ አትጨምር።'), lm.m); if (out == null) return;
      const topics = out.split('\n').map(l => /^\s*(?:\d+|[፩-፱])\s*[.)፦\-]\s*(.{2,100})$/.exec(l)).filter(Boolean).map(m => m[1].replace(/[*_`#]/g, '').trim()).slice(0, 14);
      if (!topics.length) return send(chat, '⚠️ የትምህርት ዝርዝር ማውጣት አልተቻለም — እንደገና ይሞክሩ ወይም ጥያቄ ይጻፉ።', menuKb(chat));
      lm.tc = { topics, i: 0 }; lm.ts = Date.now(); await send(chat, `🎓 <b>${H(clip(lm.name, 50))}</b> — ${topics.length} ትምህርቶች፦\n\n` + topics.map((t, i) => `${i + 1}. ${H(t)}`).join('\n') + '\n\n🔊 በድምፅና በጽሑፍ አስተምራለሁ፤ በማንኛውም ጊዜ ጥያቄ ይጻፉ ወይም በድምፅ ይጠይቁ።');
    } finally { clearInterval(tm); }
    return teachTopic(chat, uid, 0);
  }
  async function teachTopic(chat, uid, i, again) {
    const lm = MEDIA.get(chat); if (!lm || !lm.tc) return send(chat, '⌛ ትምህርቱ ጊዜው አልፏል — ፋይሉን እንደገና ይላኩ።');
    const T = lm.tc; if (i >= T.topics.length) { T.i = T.topics.length - 1; return teachFinish(chat, uid, lm); } T.i = Math.max(0, i); lm.ts = Date.now();
    typing(chat); const tm = setInterval(() => typing(chat), 4500);
    try {
      const q = `${TEACHER}\n\nአሁን የምናስተምረው ርዕስ ${T.i + 1}/${T.topics.length}፦ «${T.topics[T.i]}»።${again ? ' ቀደም ብዬ አብራርተህልኝ ነበር፤ አሁን በሌላ መንገድ፣ በሌላ ምሳሌ አስረዳኝ።' : ''}\nአስተምር፦ 1) መግቢያ (ለምን አስፈላጊ ነው) 2) ዋና ነጥቦች በቀላል ማብራሪያና ምሳሌ 3) አጭር ማጠቃለያ 4) በመጨረሻ አንድ ትንሽ የመረዳት ጥያቄ ጠይቀኝ (መልሱን አትንገር)። ከ300 ቃላት አይበልጥ፤ ለድምፅ ምቹ ሙሉ አረፍተ ነገሮች ተጠቀም፤ ሰንጠረዥ/ምልክት አትጠቀም።`;
      const out = await askAI(chat, uid, lmBody(lm, q), lm.m); if (out == null) return;
      await sendLong(chat, `🎓 <b>ትምህርት ${T.i + 1}/${T.topics.length} — ${H(T.topics[T.i])}</b>`, out);
      if (ses(chat).vo !== 'off') await speakTo(chat, out, true);
      await send(chat, '💬 ጥያቄ ካለዎት ይጻፉ ወይም በድምፅ ይጠይቁ፤ ወይም ይቀጥሉ፦', tcKb(chat, lm));
    } finally { clearInterval(tm); }
  }
  async function teachFinish(chat, uid, lm) {
    typing(chat); const out = await askAI(chat, uid, lmBody(lm, `${TEACHER}\n\nሁሉንም ትምህርቶች (${lm.tc.topics.join('፣ ')}) ጨርሰናል። አጭር አጠቃላይ ማጠቃለያ በነጥቦች ስጠኝ፤ ከዚያ ለመድገም 3 ምክሮች።`), lm.m); if (out == null) return;
    await sendLong(chat, '🏁 <b>ትምህርቱ ተጠናቀቀ — እንኳን ደስ አለዎት!</b>', out); if (ses(chat).vo !== 'off') await speakTo(chat, out, true);
    return send(chat, 'ሌላ ምን ላድርግ?', ik([[b(FK.qs, 'fk:qs'), b('📋 ርዕሶች', 'tc:ls')], [b('🔁 ከመጀመሪያ', 'tc:go:0')]]));
  }
  async function tcRoute(chat, uid, a, x) {
    if (a === 'bd' || a === 'bdn') { const l0 = MEDIA.get(chat); if (!l0) return send(chat, '⌛ ፋይሉ ጊዜው አልፏል — እንደገና ይላኩ።'); if (l0.tc && a === 'bdn') l0.tc.i = Math.min(l0.tc.topics.length - 1, l0.tc.i + 1); if (l0.tc) l0.ts = Date.now(); return boardMake(chat, uid); }
    const lm = MEDIA.get(chat); if (!lm || !lm.tc) return send(chat, '⌛ ትምህርቱ ጊዜው አልፏል — ፋይሉን እንደገና ይላኩ ወይም 🎓 ትምህርት ውስጥ መጽሐፍ ይምረጡ።'); const T = lm.tc;
    if (a === 'nx') return teachTopic(chat, uid, T.i + 1); if (a === 'rp') return teachTopic(chat, uid, T.i, true); if (a === 'go') return teachTopic(chat, uid, Number(x) || 0);
    if (a === 'ls') return send(chat, '📋 <b>ርዕሶች</b>', ik(T.topics.map((t, i) => [b(`${i === T.i ? '▶️ ' : ''}${i + 1}. ${clip(t, 40)}`, 'tc:go:' + i)])));
    if (a === 'vo') { const s = ses(chat); s.vo = s.vo === 'off' ? 'on' : 'off'; save(); return send(chat, s.vo === 'off' ? '🔇 ድምፅ ጠፍቷል (በጽሑፍ ብቻ)።' : '🔊 ድምፅ በርቷል።', tcKb(chat, lm)); }
    if (a === 'q') return send(chat, '❓ ጥያቄዎን ይጻፉ ወይም በድምፅ ይናገሩ — እንደ መምህር አብራራለሁ።');
    if (a === 'qz') {
      typing(chat); const out = await askAI(chat, uid, lmBody(lm, `${TEACHER}\n\nስለ ርዕስ «${T.topics[T.i]}» 3 አጫጭር የፈተና ጥያቄዎች ጠይቀኝ (መልሱን አትንገር)። እኔ ስመልስ አርመህ ትክክለኛውን መልስ አብራራ፤ ከዚያ ነጥብ ስጠኝ።`), lm.m); if (out == null) return;
      await sendLong(chat, '📝 <b>ፈተና</b>', out); if (ses(chat).vo !== 'off') await speakTo(chat, out); return send(chat, '✍️ መልሶችዎን በአንድ መልእክት ይጻፉ ወይም በድምፅ ይመልሱ።', tcKb(chat, lm));
    }
  }

  /* ===== 🧑‍🏫 የቀጥታ ሰሌዳ፦ መምህሩ በጠቆረ ሰሌዳ ላይ እየጻፈ/እየሳለ በድምፅ ያስረዳል (Mini App ገጽ /board/<id>) ===== */
  async function boardMake(chat, uid) {
    const lm = MEDIA.get(chat); if (!lm) return send(chat, '⌛ ፋይሉ ጊዜው አልፏል — እንደገና ይላኩ።'); if (!aiReady()) return send(chat, aiOff); if (!svc.boardPut) return send(chat, '⚠️ ሰሌዳ አልተዘጋጀም።');
    typing(chat); let src = null;
    try {
      if (lm.isPdf && lm.buf) { const sp = await pdfSplit(lm.buf), total = sp ? sp.n : AIM.countPdfPages(lm.buf); if (total > 0) src = { total, pageSrc: async n => (sp ? { pdfBuf: await sp.page(n - 1), real: true } : { pdfBuf: lm.buf }) }; }
      else if (lm.isPpt && lm.buf) { const { parsePptx } = require('../src/lib/pptx'), r = await parsePptx(lm.buf), tx = r.slides.map((x, i) => AIM.slideText({ title: x.title, blocks: x.blocks }, i)); if (tx.length) src = { total: tx.length, pageSrc: async n => ({ text: tx[n - 1] || '' }) }; }
      else if (lm.t) { const ps = []; let cur = ''; for (const para of lm.t.split(/\n+/)) { if ((cur + '\n' + para).length > 1400 && cur) { ps.push(cur); cur = ''; } cur += (cur ? '\n' : '') + para; } if (cur) ps.push(cur); if (ps.length) src = { total: Math.min(ps.length, 60), pageSrc: async n => ({ text: ps[n - 1] || '' }) }; }
      else if (lm.m && !lm.isPdf) src = { total: 1, pageSrc: async () => ({ media: lm.m }) };
    } catch (e) { console.warn('boardMake', e.message); }
    const id = src && svc.boardPut(uid || 'admin', lm.name, src, { admin: isAdmin(chat), domain: '' }); if (!id) return send(chat, '⚠️ ሰሌዳውን ማዘጋጀት አልተቻለም — ፋይሉ መነበብ አልቻለም።');
    const url = web('/board/' + id); return tg('sendMessage', { chat_id: chat, text: `🧑‍🏫 <b>የቀጥታ ክፍል ዝግጁ ነው</b>\n📘 ${H(clip(lm.name, 60))} — ${src.total} ${lm.isPdf ? 'ገጽ' : 'ስላይድ/ክፍል'}\n\nመምህሩ ሁሉንም ስላይድ አንድ በአንድ በሰሌዳ ላይ ይለጥፋል፤ መስመር በመስመር ቃል በቃል እያሰመረ በድምፅ ያስረዳል። «ቀጣይ» ሲሉ የቀደመውን አጥፍቶ ቀጣዩን ይለጥፋል። ጥያቄ ሲኖርዎ ተማሪ እንደሚያደርገው ይጠይቁ።\n(ሊንኩ ለ48 ሰዓት ይሠራል)`, parse_mode: 'HTML', reply_markup: /^https:/.test(baseUrl) ? { inline_keyboard: [[{ text: '🧑‍🏫 ክፍሉን ክፈት', web_app: { url } }]] } : undefined }).catch(e => console.warn('board send', e.message));
  }
  /* ===== 🎓 ትምህርት ዋና ክፍል + 📚 የመማሪያ መጻሕፍት ቤተ-መጻሕፍት ===== */
  async function eduHome(chat, uid) {
    const n = TB().books.length;
    return send(chat, `🎓 <b>ትምህርት</b>\n\n• 📚 <b>መማሪያ መጻሕፍት</b> (${n}) — መጽሐፍ ይምረጡ፤ መምህር ርዕስ በርዕስ በድምፅና በጽሑፍ ያስተምራል።\n• 📎 <b>የራስዎን ፋይል</b> (PDF፣ PPTX፣ DOCX፣ ፎቶ) ይላኩ — «🎓 አስተምረኝ» ይምረጡ።\n• 🤖 ማንኛውንም የትምህርት ጥያቄ እዚሁ ይጻፉ ወይም በድምፅ ይጠይቁ።\n• 📖 የመምህርዎ የተሰጠ ፋይል — በ «📖 ክፈት» ሊንክ።`, ik([[b('📚 መማሪያ መጻሕፍት', 'bk:l:0')], [b('🤖 ጥያቄ ልጠይቅ', 'aih'), b('🛍 ወደ ገበያ', 'm:market')]]));
  }
  async function bookList(chat, pg) {
    const bs = TB().books, P = 8, n = Math.max(1, Math.ceil(bs.length / P)); pg = Math.min(Math.max(0, pg), n - 1);
    if (!bs.length) return send(chat, '📚 እስካሁን መጻሕፍት አልተጫኑም — አድሚን በቅርቡ ይጨምራል። ሳለ የራስዎን ፋይል መላክ ይችላሉ።', ik([[b('🎓 ትምህርት', 'bk:h')]]));
    const rows = bs.slice(pg * P, pg * P + P).map(k => [b('📘 ' + clip(k.title, 44), 'bk:o:' + k.id)]); const nav = []; if (pg > 0) nav.push(b('◀️', 'bk:l:' + (pg - 1))); if (pg < n - 1) nav.push(b('▶️', 'bk:l:' + (pg + 1))); if (nav.length) rows.push(nav);
    return send(chat, `📚 <b>መማሪያ መጻሕፍት</b> (${bs.length}) — ገጽ ${pg + 1}/${n}`, ik(rows));
  }
  async function bookOpen(chat, uid, id) {
    const k = TB().books.find(x => x.id === id); if (!k) return send(chat, '❌ መጽሐፉ አልተገኘም።'); if (!aiReady()) return send(chat, aiOff);
    typing(chat); let buf; try { buf = await tgDownload(k.fileId); } catch (e) { return send(chat, '⚠️ መጽሐፉን ማውጣት አልተቻለም — አድሚን እንደገና ይጫነው።'); }
    const rf = await readFile(buf, k.name, k.mime); if (rf.err) return send(chat, rf.err);
    MEDIA.set(chat, { m: rf.media, t: rf.body, name: k.title, isPdf: !!(rf.media && /pdf/.test(rf.media.mime)), isPpt: /\.pptx$/i.test(k.name), buf, img: false, ts: Date.now() });
    return send(chat, `📘 <b>${H(k.title)}</b>${k.sub ? ' · ' + H(k.sub) : ''}\nምን ላድርግ?`, ik([[b('🎓 አስተምረኝ (ርዕስ በርዕስ)', 'fk:tc')], [b('🧑‍🏫 በሰሌዳ (live) አስረዳኝ', 'tc:bd')], [b(FK.qa, 'fk:qa'), b(FK.qs, 'fk:qs')], [b(FK.nt, 'fk:nt'), b(FK.sm, 'fk:sm')], [b(FK.tr, 'fk:tr'), b(FK.ex, 'fk:ex')]]));
  }
  async function bookAdd(chat, m) {          // አድሚን፦ መጽሐፍ ያክላል (ፋይሉ በ Telegram file_id ይያዛል፤ ርዕስ | ትምህርት ከ caption)
    const st = ses(chat); st.axbk = false; save(); const d = m.document, name = d.file_name || 'book';
    if (!/\.(pdf|pptx|docx|txt|md)$/i.test(name)) return send(chat, '⚠️ PDF፣ PPTX፣ DOCX ወይም TXT ይላኩ።');
    const [title, sub] = String(m.caption || '').split('|').map(x => x.trim()); const bs = TB().books; if (bs.length >= 300) return send(chat, '⚠️ ቤተ-መጻሕፍቱ ሞልቷል (300)።');
    const k = { id: Math.random().toString(36).slice(2, 8), title: (title || name.replace(/\.[^.]+$/, '')).slice(0, 80), sub: (sub || '').slice(0, 40), fileId: d.file_id, name, mime: d.mime_type || '', size: d.file_size || 0, ts: Date.now() }; bs.push(k); save();
    return send(chat, `✅ «${H(k.title)}» ወደ መማሪያ መጻሕፍት ተጨመረ (${bs.length})።`, ik([[b('➕ ሌላ', 'axbk:new'), b('📚 ዝርዝር', 'axbk:l')]]));
  }
  async function axBooks(chat) {
    const bs = TB().books; return send(chat, `📚 <b>መማሪያ መጻሕፍት</b> (${bs.length})\n\n➕ ለመጨመር፦ ፋይሉን ከ caption «ርዕስ | ክፍል/ትምህርት» ጋር ይላኩ።`, ik([[b('➕ መጽሐፍ ጨምር', 'axbk:new')], ...bs.slice(0, 30).map(k => [b('🗑 ' + clip(k.title, 40), 'axbk:d:' + k.id)])]));
  }

  /* ===== 📊 የቦት አጠቃቀም ክትትል (አድሚን)፦ ማን፣ መቼ፣ ለምን ያህል ጊዜ — እና ማገድ/ዕለታዊ የጊዜ ገደብ ===== */
  const US = () => (S.__use || (S.__use = { users: {}, cfg: { cap: 0 } })), dayKey = t => new Date((t || Date.now()) + 3 * 3600e3).toISOString().slice(0, 10), GAP = 5 * 60e3;
  const dur = ms => { const m = Math.round(ms / 60e3); return m >= 60 ? Math.floor(m / 60) + ' ሰዓት ' + (m % 60) + ' ደ' : m + ' ደቂቃ'; };
  function track(chat, from, kind) {          // በእያንዳንዱ መልእክት/ጠቅታ፦ የክፍለ-ጊዜ ጊዜ ይጨምራል (ከ5 ደቂቃ ያነሰ ልዩነት ብቻ እንደ ንቁ ጊዜ)
    const U = US(), now = Date.now(), k = String(chat), u = U.users[k] || (U.users[k] = { f: now, l: 0, n: 0, t: 0, d: {}, name: '' });
    if (u.l) { const g = now - u.l; if (g > 0 && g < GAP) { u.t += g; const dk = dayKey(now); u.d[dk] = (u.d[dk] || 0) + g; } }
    u.l = now; u.n++; if (from) u.name = [from.first_name, from.last_name].filter(Boolean).join(' ').slice(0, 40) + (from.username ? ' @' + from.username : '');
    const ks = Object.keys(u.d); if (ks.length > 30) for (const x of ks.sort().slice(0, ks.length - 30)) delete u.d[x]; save(); return u;
  }
  function gate(chat) {          // ከታገደ ወይም የዕለት ገደብ ካለፈ ጽሑፍ ይመልሳል (አድሚን አይታገድም)
    if (isAdmin(chat)) return null; const U = US(), u = U.users[String(chat)]; if (!u) return null;
    if (u.blk) return '⛔ የቦቱ አገልግሎት ለእርስዎ ተዘግቷል። አድሚንን ያነጋግሩ።';
    const cap = Number(U.cfg.cap) || 0; if (cap > 0 && (u.d[dayKey()] || 0) >= cap * 60e3) return `⏳ የዛሬው የቦት አጠቃቀም ጊዜዎ (${cap} ደቂቃ) አልቋል — ነገ ይቀጥሉ።`; return null;
  }
  const sumDays = (u, n) => { let t = 0; for (let i = 0; i < n; i++) t += u.d[dayKey(Date.now() - i * 86400e3)] || 0; return t; };
  const uName = (chat, u) => { const uid = uidOf(chat); let nm = u.name || ''; try { const a = uid && (getStore().docs['data/users/' + uid] || {}).acct; if (a && a.name) nm = a.name + (a.phone ? ' · ' + a.phone : ''); } catch (e) { } return nm || ('#' + chat); };
  async function axUsage(chat, mode) {
    const U = US(), all = Object.entries(U.users), now = Date.now(), dk = dayKey();
    const online = all.filter(([, u]) => now - u.l < GAP).length, today = all.filter(([, u]) => (u.d[dk] || 0) > 0 || dayKey(u.l) === dk), wk = all.filter(([, u]) => now - u.l < 7 * 86400e3);
    const tT = today.reduce((a, [, u]) => a + (u.d[dk] || 0), 0), blk = all.filter(([, u]) => u.blk).length;
    const rank = (mode === 'w' ? all.map(([c, u]) => [c, u, sumDays(u, 7)]) : mode === 'a' ? all.map(([c, u]) => [c, u, u.t]) : all.map(([c, u]) => [c, u, u.d[dk] || 0])).filter(x => x[2] > 0).sort((a, b2) => b2[2] - a[2]).slice(0, 12);
    const head = `📊 <b>የቦት አጠቃቀም</b>\n👥 ጠቅላላ ተጠቃሚ፦ <b>${all.length}</b>\n🟢 አሁን ንቁ (5 ደ)፦ <b>${online}</b>\n📅 ዛሬ፦ <b>${today.length}</b> ሰው · ${dur(tT)} ጠቅላላ${today.length ? ' (አማካይ ' + dur(tT / today.length) + ')' : ''}\n🗓 ባለፉት 7 ቀን፦ <b>${wk.length}</b> ሰው\n🚫 የታገዱ፦ ${blk}\n⏱ የዕለት ገደብ፦ ${Number(U.cfg.cap) ? U.cfg.cap + ' ደቂቃ/ሰው' : 'የለም'}\n\n🏆 <b>${mode === 'w' ? 'የ7 ቀን' : mode === 'a' ? 'ሁሉም ጊዜ' : 'የዛሬ'} ከፍተኛ ተጠቃሚዎች</b>`;
    return send(chat, head, ik([...rank.map(([c, u, t]) => [b(`${now - u.l < GAP ? '🟢' : u.blk ? '🚫' : '👤'} ${clip(uName(c, u), 26)} · ${dur(t)}`, 'axus:u:' + c)]), [b('📅 ዛሬ', 'axus:s:d'), b('🗓 7 ቀን', 'axus:s:w'), b('♾ ሁሉም', 'axus:s:a')], [b('⏱ የዕለት ገደብ', 'axus:cap'), b('🔄 አድስ', 'axus:s:' + (mode || 'd'))]]));
  }
  async function axUser(chat, id) {
    const u = US().users[id]; if (!u) return send(chat, '❌ አልተገኘም።'); const dk = dayKey(), cap = Number(US().cfg.cap) || 0;
    const days = Object.keys(u.d).sort().slice(-7).map(x => `${x.slice(5)}፦ ${dur(u.d[x])}`).join(' · ') || '—';
    return send(chat, `👤 <b>${H(uName(id, u))}</b>\n🆔 ${H(id)}\nየመጀመሪያ፦ ${new Date(u.f + 3 * 3600e3).toISOString().slice(0, 16).replace('T', ' ')}\nመጨረሻ፦ ${new Date(u.l + 3 * 3600e3).toISOString().slice(0, 16).replace('T', ' ')}${Date.now() - u.l < GAP ? ' 🟢 አሁን ንቁ' : ''}\n💬 መልእክት/ጠቅታ፦ ${u.n}\n⏱ ዛሬ፦ ${dur(u.d[dk] || 0)}${cap ? ' / ' + cap + ' ደ' : ''} · 7 ቀን፦ ${dur(sumDays(u, 7))} · ጠቅላላ፦ ${dur(u.t)}\n📆 ${days}\n${u.blk ? '🚫 <b>ታግዷል</b>' : '✅ ክፍት'}`, ik([[u.blk ? b('✅ ፍታ', 'axus:ub:' + id) : b('🚫 አግድ', 'axus:bk:' + id)], [b('⬅️ ዝርዝር', 'axus:s:d')]]));
  }
  async function axUsRoute(chat, a, x, y) {
    if (!isAdmin(chat)) return send(chat, '⛔ አድሚን ብቻ');
    if (a === 'u') return axUser(chat, x || y); if (a === 'bk' || a === 'ub') { const u = US().users[x]; if (u) { u.blk = a === 'bk'; save(); if (a === 'bk') send(x, '⛔ የቦቱ አገልግሎት ለእርስዎ ተዘግቷል።').catch(() => { }); } return axUser(chat, x); }
    if (a === 'cap') return startFlow(chat, 'uscap', [{ k: 'cap', q: '⏱ በቀን ለእያንዳንዱ ተጠቃሚ የሚፈቀድ የቦት አጠቃቀም (ደቂቃ)፦ — 0 = ገደብ የለም', t: 'num', min: 0, max: 1440 }]);
    return axUsage(chat, x || 'd');
  }
  FIN.uscap = async (chat, uid, d) => { US().cfg.cap = Number(d.cap) || 0; save(); return axUsage(chat, 'd'); };
  /* ===== ድምፅ፦ መጠየቅ (voice/audio → ጽሑፍ) እና መመለስ (ጽሑፍ → ድምፅ፣ ffmpeg ካለ OGG/Opus voice) ===== */
  const ffmpegBin = () => { if (process.env.FFMPEG_PATH) return process.env.FFMPEG_PATH; try { return require('ffmpeg-static') || 'ffmpeg'; } catch (e) { return 'ffmpeg'; } };
  const toOgg = (pcm, rate) => new Promise(res => {
    let p; try { p = require('child_process').spawn(ffmpegBin(), ['-hide_banner', '-loglevel', 'error', '-f', 's16le', '-ar', String(rate), '-ac', '1', '-i', 'pipe:0', '-c:a', 'libopus', '-b:a', '32k', '-f', 'ogg', 'pipe:1']); } catch (e) { return res(null); }
    const out = []; let done = false; const fin = v => { if (!done) { done = true; res(v); } };
    p.stdout.on('data', d => out.push(d)); p.on('error', () => fin(null)); p.on('close', c => fin(c === 0 && out.length ? Buffer.concat(out) : null)); p.stdin.on('error', () => { }); p.stdin.end(pcm); setTimeout(() => { try { p.kill(); } catch (e) { } fin(null); }, 30000).unref();
  });
  const wavOf = (pcm, rate) => { const h = Buffer.alloc(44); h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40); return Buffer.concat([h, pcm]); };
  async function tgUpload(method, field, chat, buf, name, mime, extra = {}) {
    const fd = new FormData(); fd.append('chat_id', String(chat)); for (const [k, v] of Object.entries(extra)) fd.append(k, String(v)); fd.append(field, new Blob([buf], { type: mime }), name);
    const r = await fetch(`${process.env.TELEGRAM_API_BASE || 'https://api.telegram.org'}/bot${token}/${method}`, { method: 'POST', body: fd }); if (!r.ok) throw new Error(method + ' ' + r.status);
  }
  async function speakTo(chat, text, long) {
    try {
      const all = String(text || '').split('📚')[0].replace(/\[\[[A-Z]+\]\]/g, '').replace(/https?:\/\/\S+/g, '').replace(/[*_`#>]/g, '').trim(); if (all.length < 2) return;
      const parts = [], maxP = long ? 3 : 1; let rest = all; while (rest && parts.length < maxP) { if (rest.length <= 900) { parts.push(rest); rest = ''; break; } let cut = Math.max(rest.lastIndexOf('።', 900), rest.lastIndexOf('\n', 900), rest.lastIndexOf('. ', 900)); if (cut < 300) cut = 900; parts.push(rest.slice(0, cut + 1)); rest = rest.slice(cut + 1).trim(); }
      for (const t of parts) {
        tg('sendChatAction', { chat_id: chat, action: 'record_voice' }).catch(() => { }); const a = await ai.speak(t); if (!a) return;
        const ogg = await toOgg(a.pcm, a.rate); if (ogg) { await tgUpload('sendVoice', 'voice', chat, ogg, 'reply.ogg', 'audio/ogg'); continue; }
        await tgUpload('sendDocument', 'document', chat, wavOf(a.pcm, a.rate), 'reply.wav', 'audio/wav', { caption: '🔊 የድምፅ መልስ' });
      }
    } catch (e) { console.warn('speakTo', e.message); }
  }
  async function onVoice(chat, m) {
    const uid = uidOf(chat); if (!uid && !isAdmin(chat)) return authStart(chat); if (!aiReady()) return send(chat, aiOff);
    const v = m.voice || m.audio; if ((v.duration || 0) > 180) return send(chat, '⚠️ ድምፁ ከ3 ደቂቃ በላይ ነው — አጠር አድርገው ይላኩ።'); if ((v.file_size || 0) > 15 * 1048576) return send(chat, '⚠️ ፋይሉ ትልቅ ነው።');
    tg('sendChatAction', { chat_id: chat, action: 'typing' }).catch(() => { }); let text;
    try { text = await ai.transcribe(await tgDownload(v.file_id), v.mime_type || 'audio/ogg'); }
    catch (e) { return send(chat, e.message === 'ai_no_audio' ? '🎙 ድምፅ ለመረዳት Gemini (GEMINI_API_KEY) ያስፈልጋል — አሁን በጽሑፍ ይጠይቁ።' : aiErr(e, chat)); }
    if (!text) return send(chat, '🎙 ድምፁ አልተሰማኝም — እንደገና ቀርበው ይናገሩ።');
    await send(chat, '🎙 <i>' + H(clip(text, 500)) + '</i>'); return aiText(chat, uid, text, true);
  }
  async function aiText(chat, uid, t, voice) {          // t ይቀየራል
    typing(chat); const tm = setInterval(() => typing(chat), 4500);
    try {
      const lm = MEDIA.get(chat), media = lm && Date.now() - lm.ts < 20 * 60e3 ? lm.m : null, tcOn = !!(lm && lm.tc && Date.now() - lm.ts < 20 * 60e3); if (tcOn) { lm.ts = Date.now(); t = TEACHER + `\nአሁን ርዕስ «${lm.tc.topics[lm.tc.i]}» እያስተማርክ ነው። ተማሪው በትምህርቱ መሃል የሚከተለውን ጻፈ/ጠየቀ (መልስ ከሆነ አርመው)፤ እንደ መምህር በትዕግሥት መልስ፣ አስፈላጊ ከሆነ ምሳሌ ስጥ፤ መጨረሻ ላይ «ገባዎት?» በል፦\n` + t; }          // የቅርብ ጊዜ ፎቶ/PDF ለተከታይ ጥያቄዎች ይታወሳል (20 ደቂቃ)
      const r = await svc.converse({ uid: uid || 'admin', key: String(chat), text: lm && lm.t && media === null && Date.now() - lm.ts < 20 * 60e3 ? t + '\n\n[የፋይሉ ጽሑፍ — ' + lm.name + ']\n' + lm.t : t, admin: isAdmin(chat), media });
      if (!r.ok && r.error === 'ai_limit') return paywall(chat, uid, 'limit');
      if (!r.ok) return send(chat, r.error === 'ai_disabled' ? '⏸ AI ለጊዜው በአድሚን ተዘግቷል።' : r.error === 'ai_blocked' ? '⛔ የ AI አገልግሎት ለእርስዎ ተዘግቷል።' : r.error === 'ai_limit' ? '⛔ የዛሬው የ AI መልእክት ገደብ አልቋል — ነገ ይሞክሩ።' : aiOff, menuKb(chat));
      if (r.paywall) return await paywall(chat, uid, r.paywall, r.text); await sendLong(chat, '', r.text || '…'); const vo = ses(chat).vo; if (vo === 'on' || (vo !== 'off' && (voice || tcOn))) await speakTo(chat, r.text, tcOn); if (tcOn) await send(chat, '👆', tcKb(chat, lm));
    } catch (e) { await send(chat, aiErr(e, chat)); } finally { clearInterval(tm); }
  }
  async function tgDownload(fileId) { const f = await tg('getFile', { file_id: fileId }); const r = await fetch(`${process.env.TELEGRAM_API_BASE || 'https://api.telegram.org'}/file/bot${token}/${f.file_path}`); if (!r.ok) throw new Error('download'); return Buffer.from(await r.arrayBuffer()); }
  async function onDocument(chat, m) {
    const uid = uidOf(chat); if (!uid && !isAdmin(chat)) return authStart(chat); if (!aiReady()) return send(chat, aiOff);
    const d = m.document, name = d.file_name || 'file', isPdf = /pdf/i.test(d.mime_type || '') || /\.pdf$/i.test(name), isPpt = /\.pptx$/i.test(name) || /presentationml/.test(d.mime_type || '');
    if (!isPdf && !isPpt) return send(chat, '📎 ለትርጉም <b>PDF</b> ወይም <b>PowerPoint (.pptx)</b> ብቻ ይላኩ። (.ppt/.doc ከሆነ በ WPS «PDF አድርግ» ብለው ይላኩ።)');
    if ((d.file_size || 0) > 19.5 * 1048576) return send(chat, '⚠️ ፋይሉ ከ20MB በላይ ነው — ትንሽ ክፍል አድርገው ይላኩ።');
    for (const [k, v] of DOCS) if (Date.now() - v.ts > 3600e3) DOCS.delete(k); if (DOCS.size > 40) return send(chat, '⏳ አሁን ብዙ ሰው እየተረጎመ ነው — ከጥቂት ደቂቃ በኋላ ይሞክሩ።');
    typing(chat); let buf; try { buf = await tgDownload(d.file_id); } catch (e) { return send(chat, '⚠️ ፋይሉን ማውረድ አልተቻለም — እንደገና ይላኩ።'); }
    return startDoc(chat, uid, buf, name, isPdf);
  }
  async function startDoc(chat, uid, buf, name, isPdf) {
    for (const [k, v] of DOCS) if (Date.now() - v.ts > 3600e3) DOCS.delete(k); if (DOCS.size > 40) return send(chat, '⏳ አሁን ብዙ ሰው እየተረጎመ ነው — ከጥቂት ደቂቃ በኋላ ይሞክሩ።');
    const job = { kind: isPdf ? 'pdf' : 'pptx', name, ts: Date.now(), next: 1, total: 0, busy: false, orig: buf };
    if (isPdf) { job.buf = buf; job.split = await pdfSplit(buf); job.total = job.split ? job.split.n : AIM.countPdfPages(buf); if (job.total > 100) return send(chat, `⚠️ ፋይሉ ${job.total} ገጽ ነው — AI በአንድ ጊዜ እስከ 100 ገጽ ብቻ ያነባል። በ100 ገጽ ክፍል አድርገው ይላኩ።`); }
    else { try { const { parsePptx } = require('../src/lib/pptx'); const r = await parsePptx(buf); job.slides = r.slides.map(s => ({ title: s.title, blocks: s.blocks })); job.total = job.slides.length; } catch (e) { return send(chat, '⚠️ PPTX መነበብ አልቻለም — (PowerPoint 2007+ .pptx መሆኑን ያረጋግጡ)'); } if (!job.total) return send(chat, '⚠️ ስላይድ አልተገኘም።'); }
    job.title = name.replace(/\.(pdf|pptx)$/i, ''); DOCS.set(chat, job);
    await send(chat, `📄 <b>${H(clip(name, 60))}</b>${job.total ? ' — ' + job.total + ' ' + (isPdf ? 'ገጾች' : 'ስላይዶች') : ''}\n🌐 ወደ አማርኛ ገጽ በገጽ በአውድ እተረጉማለሁ…\n🔤 ፎንት መምረጥ ይችላሉ (ትርጉሙ አይቆምም)`, ik([[b('🔤 ፎንት/መጠን ምረጥ', 'adfo')]]));
    return docRun(chat, uid);
  }
  /* የተተረጎመውን በተሰጠው ፎርም (PDF → PDF፣ PPTX → PPTX) እንግሊዝኛ + አማርኛ በአንድ ገጽ/ስላይድ አድርጎ ይመልሳል */
  async function docFile(chat, d) {
    if (!d.out || !d.out.length) return send(chat, '⚠️ እስካሁን የተተረጎመ ገጽ የለም።');
    try {
      const pdf = d.kind === 'pdf', opt = d.opt || ses(chat).docopt; let buf = null, merged = false;
      try { buf = pdf ? await PDFM.interleavePdf(d.buf, d.out, opt) : (await PPM.interleavePptx(d.orig, d.out, opt)).buf; merged = !!buf; } catch (e) { console.warn('merge', e.message); }
      if (!buf) buf = pdf ? DO.buildPdf(d.title, d.out, opt) : DO.buildPptx(d.title, d.out, opt);          // ማዋሃድ ካልተቻለ (pdf-lib የለም/ፋይሉ ያልተለመደ) አማራጭ ባለሁለት ቋንቋ ፋይል
      const nm = `${String(d.title || 'translation').replace(/[^\w\u1200-\u137F.-]+/g, '_').slice(0, 60)}_am.${pdf ? 'pdf' : 'pptx'}`;
      const cap = merged ? `📥 ዋናው ፋይል እንዳለ (አቀማመጥ እና ምስል ሳይነካ) — ከእያንዳንዱ ${pdf ? 'ገጽ' : 'ስላይድ'} በኋላ የአማርኛ ትርጉሙ (${d.out.length})` : `📥 ${d.out.length} ${pdf ? 'ገጽ' : 'ስላይድ'} — ዋናው እና የአማርኛ ትርጉሙ በአንድ ላይ (ዋናውን ፋይል ማዋሃድ አልተቻለም)`;
      const fd = new FormData(); fd.append('chat_id', String(chat)); fd.append('caption', cap); fd.append('document', new Blob([buf], { type: pdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.presentationml.presentation' }), nm);
      const r = await fetch(`${process.env.TELEGRAM_API_BASE || 'https://api.telegram.org'}/bot${token}/sendDocument`, { method: 'POST', body: fd }); if (!r.ok) throw new Error('send ' + r.status);
    } catch (e) { console.warn('docFile', e.message); return send(chat, '⚠️ ፋይሉን ማዘጋጀት/መላክ አልተሳካም — ትርጉሙ ከላይ በመልእክት ተልኳል።'); }
  }
  /* PDF ገጽ በገጽ መቁረጥ (pdf-lib ካለ)፦ እያንዳንዱ ጥያቄ የአንድ ገጽ ፋይል ብቻ ይልካል — በጣም ፈጣን (10MB ፋይል በ 31 ጊዜ መላክ ይቀራል) */
  async function pdfSplit(buf) {
    try { const { PDFDocument } = require('pdf-lib'), src = await PDFDocument.load(buf, { ignoreEncryption: true }), n = src.getPageCount(); if (!n) return null; return { n, page: async i => { const o = await PDFDocument.create(), [pg] = await o.copyPages(src, [i]); o.addPage(pg); return Buffer.from(await o.save()); } }; } catch (e) { return null; }
  }
  const GLOSS_RE = /([ሀ-፿][ሀ-፿ ፡]{1,36}[ሀ-፿]) \(([A-Za-z][A-Za-z \-]{1,36}[A-Za-z])\)/g;
  const fontMenu = (chat, d) => { const o = DO.optOf((d && d.opt) || ses(chat).docopt); return send(chat, `🔤 <b>የፋይሉ ፎንት እና መጠን</b>\nአሁን፦ ${H(DO.PRESETS[o.preset].label)} · ${DO.SIZES[o.size][0]}\n\n<i>PPTX፦ ፎንቱ በእርስዎ ኮምፒውተር/ስልክ ላይ ከተጫነ ይታያል (ከሌለ ተመሳሳይ ይተካል)። PDF፦ የአማርኛ ፎንት በፋይሉ ውስጥ ተካቷል፤ ቀለም እና መጠን ይለወጣሉ።</i>`, ik([...Object.entries(DO.PRESETS).map(([k, v]) => [b((k === o.preset ? '✅ ' : '') + v.label, 'adfp:' + k)]), Object.entries(DO.SIZES).map(([k, v]) => b((k === o.size ? '✅ ' : '') + v[0], 'adfs:' + k))])); };
  async function docRun(chat, uid) {
    const d = DOCS.get(chat); if (!d) return send(chat, '⌛ ፋይሉ ጊዜው አልፏል — እንደገና ይላኩ።'); if (d.busy) return; d.busy = true; d.ts = Date.now();
    let ticks = 0; const tm = setInterval(() => { typing(chat); if (++ticks === 6 && !done) send(chat, `⏳ ገጽ ${d.next} እየተተረጎመ ነው — ትልቅ ፋይል ስለሆነ ትንሽ ይወስዳል፤ አይቆምም…`).catch(() => { }); }, 4500); let done = 0, stop = false; d.cache = d.cache || {}; d.gloss = d.gloss || new Map();
    try {
      if (d.domain === undefined) {          // የሰነዱ የሙያ መስክ (ሕክምና/ኬሚስትሪ…) አንድ ጊዜ ተለይቶ በሁሉም ገጾች ትርጉም ላይ ይተገበራል
        d.domain = ''; typing(chat);
        try { const src = d.kind === 'pdf' ? { pdf: d.buf && d.buf.length <= 8 * 1048576 ? d.buf : d.split ? await d.split.page(Math.min(1, Math.max(0, (d.total || 1) - 1))) : d.buf } : { text: d.slides.slice(0, 8).map((s2, i) => AIM.slideText(s2, i)).join('\n\n') }; d.domain = await ai.domainBrief(d.title, src); } catch (e) { d.domain = ''; }
        const f = /መስክ\s*[፦:]\s*([^\n]{2,80})/.exec(d.domain || ''); if (f) send(chat, `🔬 የሰነዱ መስክ፦ <b>${H(f[1].trim())}</b> — ትርጉሙ በዚህ መስክ የሙያ ቃላት ይሠራል።`).catch(() => { });
      }
      const last = d.total ? Math.min(d.total, d.next + ai.lim.batch - 1) : d.next + ai.lim.batch - 1, ns = [], tasks = new Map(); let limitHit = null, active = 0; const waiters = [];
      const gate = async fn => { while (active >= (d.par || ai.lim.par)) await new Promise(r => waiters.push(r)); active++; try { return await fn(); } finally { active--; const w = waiters.shift(); if (w) w(); } };
      const slideTx = i => (d.slides[i] ? AIM.slideText(d.slides[i], i).split('\n').slice(1).join('\n') : '');
      const outline = d.kind === 'pptx' ? d.slides.map((s2, i) => `${i + 1}. ${s2.title || ''}`).join('; ').slice(0, 700) : '';
      const work = n => gate(async () => {
        const cx = { gloss: [...d.gloss.values()].slice(-40), outline, domain: d.domain, ...(d.kind === 'pptx' ? { prev: slideTx(n - 2), next: slideTx(n) } : {}) };
        let both = false;          // ዋናው ፋይል ሳይነካ ስለሚቀመጥ እንግሊዝኛውን መድገም አያስፈልግም (ፈጣን)
        for (let tr = 0; ; tr++) {
          try { const v = d.kind === 'pdf' ? (d.split ? await ai.pdfPage(await d.split.page(n - 1), 1, d.total, both, { title: d.title, gloss: cx.gloss, domain: d.domain }, n) : await ai.pdfPage(d.buf, n, d.total, both, { title: d.title, gloss: cx.gloss, domain: d.domain })) : await ai.slideTr(d.title, d.slides[n - 1], n - 1, d.total, cx); d.cache[n] = v; return { ok: true, v }; }
          catch (e) {
            const busy = /^ai_(busy|timeout|network)$/.test(e.message);
            if (busy && !d.warned) { d.warned = true; send(chat, '⏳ AI ሥራ በዝቶበታል/ዘግይቷል — በራሴ እንደገና እየሞከርኩ ነው፤ ትንሽ ይታገሱ…').catch(() => { }); }
            if (busy) d.par = 1;          // ሞዴሉ ሲሞላ/ሲዘገይ ትይዩነት ወደ 1 ይወርዳል (ኮታ ይጠበቃል)
            else if (d.kind === 'pdf' && both && tr < 3) { both = false; continue; }          // ባለሁለት ቋንቋ ቅርጸት ካልተሳካ ትርጉም ብቻ ይሞክራል
            if (tr >= (busy ? 4 : 2) || (!busy && !(d.kind === 'pdf' && !both && tr < 3))) { ai.refund(String(uid || 'admin'), 'pages', 1); return { ok: false, e }; }
            await new Promise(r => setTimeout(r, busy ? 5000 * (tr + 1) : 500));
          }
        }
      });
      for (let n = d.next; n <= last; n++) {
        if (d.cache[n] === undefined) { const q = svc.takePages(uid || 'admin', isAdmin(chat)); if (!q.ok) { limitHit = q; break; } tasks.set(n, work(n)); } else tasks.set(n, Promise.resolve({ ok: true, v: d.cache[n] }));
        ns.push(n);
      }
      typing(chat);
      for (const n of ns) {
        const r = await tasks.get(n);
        if (!r.ok) { stop = true; await send(chat, aiErr(r.e, chat), ik([[b('🔁 እንደገና ሞክር', 'adn'), b('✖️ አቁም', 'adx')]])); break; }
        if (r.v === null) { d.total = n - 1; break; }
        let en = '', am = r.v; if (d.kind === 'pdf') ({ en, am } = DO.splitBoth(r.v)); else en = slideTx(n - 1);
        (d.out = d.out || []).push({ n, title: d.kind === 'pptx' ? (d.slides[n - 1].title || '') : '', en, am }); delete d.cache[n];
        for (const m of String(am).matchAll(GLOSS_RE)) d.gloss.set(m[2].toLowerCase(), [m[2], m[1]]);
        d.next = n + 1; done++;          // የገጽ ጽሑፍ በመልእክት አይላክም — በመጨረሻ ፋይል ብቻ
      }
      if (!stop && limitHit && !(d.total && d.next > d.total)) { stop = true; if (limitHit.paywall) await paywall(chat, uid, 'pages'); else await send(chat, '⛔ የዛሬው የትርጉም ገጽ ገደብ አልቋል — ነገ ከገጽ ' + d.next + ' ይቀጥሉ (ፋይሉን እንደገና ይላኩ)።'); }
      if (stop) return;
      if (d.total && d.next > d.total) { await send(chat, `✅ <b>ትርጉሙ ተጠናቀቀ</b> — ${d.total} ${d.kind === 'pdf' ? 'ገጾች' : 'ስላይዶች'}። ፋይሉን እያዘጋጀሁ ነው…`, menuKb(chat)); await docFile(chat, d); DOCS.delete(chat); return; }
      return send(chat, `ገጽ ${d.next - done}–${d.next - 1} ተተርጉሟል።`, ik([[b(`▶️ ቀጥል (ገጽ ${d.next}…)`, 'adn'), b('📥 እስከ አሁን ፋይል', 'adf')], [b('🔤 ፎንት/መጠን', 'adfo'), b('✖️ አቁም', 'adx')]]));
    } finally { clearInterval(tm); d.busy = false; }
  }
  async function handle(upd) {
    try {
      if (upd.callback_query) { const cq = upd.callback_query; tg('answerCallbackQuery', { callback_query_id: cq.id }).catch(() => { }); if (!cq.message) return; if (cq.message.chat.type === 'private') { track(cq.message.chat.id, cq.from, 'cb'); const gt = gate(cq.message.chat.id); if (gt) return send(cq.message.chat.id, gt); } return await route(cq.message.chat.id, String(cq.data || '')); }
      if (upd.inline_query) return await inline(upd.inline_query);
      const m = upd.message; if (!m || !m.chat || m.chat.type !== 'private') return; const chat = m.chat.id;
      track(chat, m.from, 'msg'); { const gt = gate(chat); if (gt) return send(chat, gt); }
      if (m.voice || m.audio) return await onVoice(chat, m);
      if (m.location) return await onLocation(chat, m);
      if (m.contact) return await authContact(chat, m);
      if (m.document && ses(chat).axup && isAdmin(chat)) return await axUpload(chat, m);
      if (m.document && ses(chat).axbk && isAdmin(chat)) return await bookAdd(chat, m);
      if ((m.photo || m.document) && ses(chat).aiproof) return await aiProof(chat, m);
      if (m.document) { const nm = m.document.file_name || '', tr = /pdf|presentationml/i.test(m.document.mime_type || '') || /\.(pdf|pptx)$/i.test(nm); return tr && m.caption && /ተርጉ|ትርጉም|translat/i.test(m.caption) ? await onDocument(chat, m) : await onMedia(chat, m); }
      if (m.photo && !ses(chat).flow) return await onMedia(chat, m);
      if (m.photo) return ses(chat).flow ? await flowPhoto(chat, m) : send(chat, '📷 ፎቶ ለመጠቀም መጀመሪያ ተገቢውን ቅጽ (ለምሳሌ ዕቃ መጨመር) ይክፈቱ።');
      if (typeof m.text === 'string') return await onText(chat, m.text, m);
    } catch (e) { console.error('bot update failed:', e); }
  }
  return { handle, restore, uidOf };
};
