const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

// የአድሚን ማንነት (በ Render environment መቀየር ይቻላል)፦ ኢሜይል (ኢሜይል OTP) + ስልክ (Telegram ማረጋገጫ)
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'tirunehawoke12@gmail.com';
const ADMIN_PHONE = process.env.ADMIN_PHONE || '0946705941';
const mailer = require('./mailer');
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));
// የድሮው ገጽ አጠቃላይ የዳታቤዝ/የክፍለ-ጊዜ API ተዘግቷል (ያለ OTP አካውንት መፍጠር እንዳይቻል)። ለሙከራ ብቻ LEGACY_DB=1
app.use(['/api/db', '/api/session', '/api/account'], (req, res, next) => (process.env.LEGACY_DB === '1' ? next() : res.status(404).json({ ok: false, error: 'not_found' })));

const PORT = Number(process.env.PORT || 3000);
const TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const BOT_USERNAME = (process.env.TELEGRAM_BOT_USERNAME || '').replace(/^@/, '');
const PUBLIC_BASE_URL = (process.env.PUBLIC_BASE_URL || 'https://ethiodigitalmarket.pro.et').replace(/\/+$/, '');
const WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || '';
const OTP_TTL = 5 * 60 * 1000;
const LINK_TTL = 10 * 60 * 1000;
const DB_FILE = process.env.OTP_DB_FILE || path.join(__dirname, 'telegram-otp-data.json');

function loadDB() {
  try {
    const d = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    return { links: d.links || {}, pending: d.pending || {}, accounts: d.accounts || {}, admin: d.admin || null };
  } catch { return { links: {}, pending: {}, accounts: {}, admin: null }; }
}
let db = loadDB();
let saveTimer;
let botApi = null;                                  // Telegram bot (ሙሉ ድረ-ገጽ በ Telegram) — ከታች ይፈጠራል
const DATABASE_URL = process.env.DATABASE_URL || '';
let pool = null;
if (DATABASE_URL) { const { Pool } = require('pg'); pool = new Pool({ connectionString: DATABASE_URL, ssl: /localhost|127\.0\.0\.1/.test(DATABASE_URL) ? false : { rejectUnauthorized: false }, max: 3 }); pool.on('error', e => console.error('pg', e.message)); }
const pgUpsert = (p, id, data) => pool.query('INSERT INTO kv(path,id,data) VALUES($1,$2,$3) ON CONFLICT(path,id) DO UPDATE SET data=EXCLUDED.data', [p, id, JSON.stringify(data)]);
const pgDelete = (p, id) => pool.query('DELETE FROM kv WHERE path=$1 AND id=$2', [p, id]);
function saveDB() {
  if (pool) { clearTimeout(saveTimer); saveTimer = setTimeout(() => pgUpsert('_sys', 'otpdb', db).catch(e => console.error('otp save failed', e.message)), 300); return; }
  // Atomic replacement helps avoid a partially written JSON database.
  const tmp = DB_FILE + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2), { mode: 0o600 });
  fs.renameSync(tmp, DB_FILE);
}
function randDigits(n=6) { return String(crypto.randomInt(0, 10 ** n)).padStart(n, '0'); }
function id() { return crypto.randomBytes(24).toString('hex'); }
function normPhoneET(p) { let d = String(p || '').replace(/[^\d+]/g, '').replace(/^\+/, ''); if (d.startsWith('251')) d = d.slice(3); if (d.startsWith('0')) d = d.slice(1); return /^[79]\d{8}$/.test(d) ? '0' + d : null; }
const maskPhone = p => String(p || '').replace(/^(\d{4})\d{3}(\d{3})$/, '$1***$2');
function accountKey(email, phone) {
  const ph = normPhoneET(phone) || String(phone).replace(/[\s()-]/g,'');
  return crypto.createHash('sha256').update(`${String(email).trim().toLowerCase()}|${ph}`).digest('hex');
}
function clean() {
  const now = Date.now();
  for (const [k,v] of Object.entries(db.pending)) if (now > v.expiresAt) delete db.pending[k];
  for (const [k,v] of Object.entries(db.links)) if (now > (v.expiresAt || 0)) delete db.links[k];
}
async function tg(method, body) {
  if (!TOKEN) throw new Error('Server setup missing TELEGRAM_BOT_TOKEN.');
  const r = await fetch(`${process.env.TELEGRAM_API_BASE || 'https://api.telegram.org'}/bot${TOKEN}/${method}`, {
    method: 'POST', headers: {'content-type':'application/json'}, body: JSON.stringify(body || {})
  });
  const j = await r.json();
  if (!j.ok) throw new Error(j.description || 'Telegram API error');
  return j.result;
}
function safeOtpMatch(input, expected) {
  if (!/^\d{6}$/.test(input || '') || !/^\d{6}$/.test(expected || '')) return false;
  return crypto.timingSafeEqual(Buffer.from(input), Buffer.from(expected));
}

app.get('/api/health', (req,res)=>res.json({
  ok:true, service:'etio-digital-market-telegram', domain:'ethiodigitalmarket.pro.et',
  botConfigured:!!TOKEN, webhookConfigured:!!WEBHOOK_SECRET
}));

// Telegram webhook. The secret header prevents arbitrary callers from faking bot updates.
app.post('/api/telegram/webhook', async (req,res) => {
  if (!WEBHOOK_SECRET || req.get('x-telegram-bot-api-secret-token') !== WEBHOOK_SECRET) {
    return res.sendStatus(403);
  }
  res.sendStatus(200); // acknowledge promptly; process the update below
  try {
    const upd = req.body || {}, msg = upd.message;
    if (msg && msg.chat && msg.contact) { if (!(await handleContact(msg)) && botApi) await botApi.handle(upd); }
    else if (msg && msg.chat && typeof msg.text === 'string') { if (!(await handleStart(msg.text, msg.chat)) && botApi) await botApi.handle(upd); }
    else if (botApi) await botApi.handle(upd);               // ፎቶ፣ ቁልፍ ጠቅታ (callback_query) ወዘተ → ቦቱ
  } catch (e) { console.error('Telegram webhook update failed:', e.message); }
});

// Do not expose the application directory via express.static: it contains server code and OTP data.

app.post('/api/telegram/start', (req,res)=>{
  clean();
  if (!TOKEN || !BOT_USERNAME) return res.status(503).json({ok:false,error:'telegram_not_configured'});
  const phone = normPhoneET(req.body.phone);
  if (!phone) return res.status(400).json({ok:false,error:'invalid_phone'});
  const requestId = id();
  db.links[requestId] = { requestId, phone, email:String(req.body.email||'').trim().toLowerCase(), status:'waiting_for_start', createdAt:Date.now(), expiresAt:Date.now()+LINK_TTL };
  saveDB();
  res.json({ok:true, requestId, botUsername:BOT_USERNAME, telegramUrl:`https://t.me/${BOT_USERNAME}?start=${requestId}`, expiresIn:LINK_TTL});
});

app.post('/api/telegram/status', (req,res)=>{
  clean();
  const r = db.links[String(req.body.requestId||'')];
  if (!r) return res.status(404).json({ok:false,error:'request_not_found'});
  res.json({ok:true,status:r.status,verified:r.status==='verified',telegramUsername:r.username || null});
});

app.post('/api/telegram/verify', (req,res)=>{
  clean();
  const requestId = String(req.body.requestId||'');
  const otp = String(req.body.otp||'').trim();
  const r = db.links[requestId];
  if (!r) return res.status(404).json({ok:false,error:'request_not_found'});
  if (r.status !== 'otp_sent') return res.status(400).json({ok:false,error:'otp_not_ready'});
  if (Date.now() > r.otpExpiresAt) return res.status(400).json({ok:false,error:'otp_expired'});
  if ((r.attempts || 0) >= 5) return res.status(429).json({ok:false,error:'too_many_attempts'});
  r.attempts = (r.attempts || 0) + 1;
  if (!safeOtpMatch(otp, r.otp)) {
    saveDB(); return res.status(400).json({ok:false,error:'invalid_otp',attemptsLeft:Math.max(0,5-r.attempts)});
  }
  r.status='verified'; r.verifiedAt=Date.now();
  saveDB();
  res.json({ok:true,verified:true,requestId,telegramChatId:r.chatId,telegramUsername:r.username||null});
});

app.post('/api/telegram/bind', (req,res)=>{
  clean();
  const requestId=String(req.body.requestId||'');
  const email=String(req.body.email||'').trim();
  const phone=String(req.body.phone||'').trim();
  const r=db.links[requestId];
  if (!r || r.status!=='verified') return res.status(400).json({ok:false,error:'telegram_not_verified'});
  if (!email || !phone) return res.status(400).json({ok:false,error:'account_identity_required'});
  if (!normPhoneET(phone) || r.verifiedPhone !== normPhoneET(phone)) return res.status(400).json({ok:false,error:'phone_not_verified'});
  const key=accountKey(email,phone);
  db.accounts[key]={chatId:r.chatId,phone:normPhoneET(phone),username:r.username||null,linkedAt:Date.now()};
  saveDB();
  res.json({ok:true,linked:true});
});

app.post('/api/telegram/login', async (req,res)=>{
  try {
    clean();
    const email=String(req.body.email||'').trim();
    const phone=String(req.body.phone||'').trim();
    if(!email||!phone) return res.status(400).json({ok:false,error:'account_identity_required'});
    const key=accountKey(email,phone);
    const account=db.accounts[key];
    if(!account) return res.status(404).json({ok:false,error:'telegram_not_linked'});
    const requestId=id(), otp=randDigits(6);
    db.pending[requestId]={requestId,key,chatId:account.chatId,otp,createdAt:Date.now(),expiresAt:Date.now()+OTP_TTL,attempts:0};
    saveDB();
    await tg('sendMessage',{chat_id:account.chatId,text:`🔐 Etio Digital Market Login OTP\n\nየማረጋገጫ ኮድዎ፦ ${otp}\n\n⏱ ኮዱ በ5 ደቂቃ ውስጥ ያበቃል።\n⚠️ ይህን ኮድ ለሌላ ሰው አይስጡ።`});
    res.json({ok:true,requestId,expiresIn:OTP_TTL});
  } catch(e) { console.error('Login OTP failed:',e.message); res.status(500).json({ok:false,error:'otp_send_failed'}); }
});

app.post('/api/telegram/login-verify', (req,res)=>{
  clean();
  const requestId=String(req.body.requestId||''), otp=String(req.body.otp||'').trim();
  const r=db.pending[requestId];
  if(!r) return res.status(404).json({ok:false,error:'request_not_found'});
  if(Date.now()>r.expiresAt) return res.status(400).json({ok:false,error:'otp_expired'});
  if(r.attempts>=5) return res.status(429).json({ok:false,error:'too_many_attempts'});
  r.attempts++;
  if(!safeOtpMatch(otp,r.otp)) { saveDB(); return res.status(400).json({ok:false,error:'invalid_otp',attemptsLeft:5-r.attempts}); }
  delete db.pending[requestId]; saveDB();
  res.json({ok:true,verified:true});
});

const CONTACT_KB = { keyboard: [[{ text: '📱 ስልኬን አጋራ', request_contact: true }]], resize_keyboard: true, one_time_keyboard: true };
async function handleContact(msg) {
  const chatId = msg.chat.id;
  const r = Object.values(db.links).filter(x => x.chatId === chatId && x.status === 'awaiting_contact').sort((a, b) => b.createdAt - a.createdAt)[0];
  if (!r) return false;                             // የድረ-ገጽ OTP ጥያቄ የለም → የቦቱ ምዝገባ/መግቢያ ይይዘዋል
  if (Date.now() > r.expiresAt) { delete db.links[r.requestId]; saveDB(); return tg('sendMessage', { chat_id: chatId, text: 'ጊዜው አልፎበታል። እንደገና ይሞክሩ።', reply_markup: { remove_keyboard: true } }); }
  const c = msg.contact;
  if (!msg.from || c.user_id !== msg.from.id) return tg('sendMessage', { chat_id: chatId, text: '⚠️ የራስዎን ስልክ ቁጥር ብቻ ማጋራት ይችላሉ። «📱 ስልኬን አጋራ» ቁልፉን ይጠቀሙ።', reply_markup: CONTACT_KB });
  r.contactTries = (r.contactTries || 0) + 1;
  if (normPhoneET(c.phone_number) !== r.phone) {
    if (r.contactTries >= 3) { r.status = 'phone_mismatch'; saveDB(); return tg('sendMessage', { chat_id: chatId, text: '❌ ይህ የ Telegram ስልክ ቁጥር ከተመዘገበው ጋር አይመሳሰልም። OTP አልተላከም። በትክክለኛው ቁጥር እንደገና ይመዝገቡ።', reply_markup: { remove_keyboard: true } }); }
    saveDB(); return tg('sendMessage', { chat_id: chatId, text: `❌ ይህ ቁጥር ከተመዘገበው (${maskPhone(r.phone)}) ጋር አይመሳሰልም። OTP አልተላከም።`, reply_markup: CONTACT_KB });
  }
  r.status = 'otp_sent'; r.verifiedPhone = r.phone; r.otp = randDigits(6); r.otpExpiresAt = Date.now() + OTP_TTL; r.attempts = 0; saveDB();
  await tg('sendMessage', { chat_id: chatId, text: `🇪🇹 Etio Digital Market\n\n✅ ስልክ ቁጥርዎ ተረጋግጧል።\nየማረጋገጫ ኮድዎ፦ ${r.otp}\n\nወደ ድረ-ገጹ ተመልሰው ኮዱን ያስገቡ።\n⏱ በ5 ደቂቃ ውስጥ ያበቃል።`, reply_markup: { remove_keyboard: true } });
  return true;
}
async function handleStart(text, chat) {
  if (/^\/myid\b/.test(text || '')) return tg('sendMessage', { chat_id: chat.id, text: `🆔 የእርስዎ Telegram Chat ID፦ ${chat.id}\n\n(አድሚን ከሆኑ ይህን በ Render ውስጥ ADMIN_TELEGRAM_CHAT_ID ላይ ያስገቡ።)` });
  const m=/^\/start(?:\s+(.+))?$/.exec(text||'');
  if(!m) return false;
  const requestId=m[1];
  if(requestId && db.links[requestId]) {
    const r=db.links[requestId];
    if (Date.now() > r.expiresAt) {
      delete db.links[requestId]; saveDB();
      await tg('sendMessage',{chat_id:chat.id,text:'ይህ ማረጋገጫ ሊንክ ጊዜው አልፎበታል። ወደ Marketplace ተመልሰው እንደገና ይሞክሩ።'});
      return true;
    }
    r.chatId=chat.id; r.username=chat.username || chat.first_name || ''; r.status='awaiting_contact'; r.contactTries=0;
    saveDB();
    await tg('sendMessage',{chat_id:chat.id,text:`🇪🇹 Etio Digital Market\n\n🔒 ለደህንነትዎ፣ OTP የሚላከው በምዝገባ ወቅት ወደተሰጠው ስልክ ቁጥር ብቻ ነው።\n📞 የተመዘገበ ቁጥር፦ ${maskPhone(r.phone)}\n\nከታች ያለውን «📱 ስልኬን አጋራ» ይጫኑ።`,reply_markup:CONTACT_KB});
    return true;
  }
  return false;                                      // ሌላው ሁሉ → የቦቱ ዋና ማውጫ / ምዝገባ
}

async function configureWebhook() {
  if (!TOKEN || !WEBHOOK_SECRET) {
    console.warn('Telegram webhook not configured: set TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET in Plesk environment variables.');
    return;
  }
  try {
    const result = await tg('setWebhook', {
      url: `${PUBLIC_BASE_URL}/api/telegram/webhook`,
      secret_token: WEBHOOK_SECRET,
      allowed_updates: ['message', 'callback_query', 'inline_query'],
      drop_pending_updates: false
    });
    tg('setMyCommands', { commands: [{ command: 'menu', description: 'ዋና ማውጫ' }, { command: 'search', description: 'ፈልግ' }, { command: 'near', description: 'በአቅራቢያዬ' }, { command: 'alerts', description: 'ማንቂያዎቼ' }, { command: 'messages', description: 'መልእክቶች' }, { command: 'account', description: 'አካውንቴ' }, { command: 'lang', description: 'ቋንቋ / Language' }, { command: 'logout', description: 'ውጣ' }, { command: 'login', description: 'ግባ / ተመዝገብ' }, { command: 'cancel', description: 'የጀመሩትን ሰርዝ' }, { command: 'help', description: 'እገዛ' }, { command: 'myid', description: 'Chat ID' }] }).catch(() => { });
    console.log('Image storage:', require('./imgstore').create().driver === 's3' ? 'S3/R2 (external)' : 'Postgres (set S3_* to move images out)');
    console.log('Telegram webhook configured:', result, `${PUBLIC_BASE_URL}/api/telegram/webhook`);
  } catch (e) {
    console.error('Could not configure Telegram webhook:', e.message);
  }
}


/* ================= የጋራ ዳታቤዝ (በሁሉም መሣሪያ ተመሳሳይ ውሂብ) ================= */
const STORE_FILE = process.env.STORE_FILE || path.join(__dirname, 'market-data.json');
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const TOKEN_SECRET = process.env.TOKEN_SECRET || (()=>{ // ካልተዘጋጀ በፋይል ውስጥ አንድ ጊዜ ይፈጠራል
  const f = path.join(__dirname, '.token-secret');
  try { return fs.readFileSync(f, 'utf8').trim(); } catch { const v = crypto.randomBytes(32).toString('hex'); try { fs.writeFileSync(f, v, { mode: 0o600 }); } catch {} return v; }
})();
const ADMIN_ONLY_WRITE = new Set(['settings','approved','done','ads','rates','ledger']);
const ANON_READ = new Set(['settings','reg']);
let store = { docs: {}, rev: {}, idx: {} };           // docs[path][id]=doc, rev[path]=n, idx['e:mail']=uid
try { const d = JSON.parse(fs.readFileSync(STORE_FILE, 'utf8')); store = { docs: d.docs || {}, rev: d.rev || {}, idx: d.idx || {} }; } catch {}
let storeTimer;
function persist() {
  if (pool) return;
  clearTimeout(storeTimer);
  storeTimer = setTimeout(() => { try { const t = STORE_FILE + '.tmp'; fs.writeFileSync(t, JSON.stringify(store), { mode: 0o600 }); fs.renameSync(t, STORE_FILE); } catch (e) { console.error('persist failed', e.message); } }, 400);
}
const svOf = u => (((store.docs['data/users/' + u] || {}).acct || {}).sv | 0);
const adminSv = () => ((((store.docs['_admin'] || {}).sv) || {}).n | 0);
const tokens = require('./tokens').create({ secret: TOKEN_SECRET, getUserSv: svOf, getAdminSv: adminSv, isSusp: u => isSusp(u) });
function isSusp(u) { return !!(((store.docs['_admin'] || {}).susp || {})[u]); }
function readTok(req) { return tokens.verify((req.get('authorization') || '').replace(/^Bearer /, '')); }
const normPhone = p => { p = String(p || '').replace(/[\s-]/g, ''); if (/^\+?251/.test(p)) p = '0' + p.replace(/^\+?251/, ''); return p; };
const hits = {}; // ቀላል የፍጥነት ገደብ
function limit(key, max, ms) { const n = Date.now(); const a = (hits[key] = (hits[key] || []).filter(t => n - t < ms)); if (a.length >= max) return false; a.push(n); return true; }
const ip = req => req.ip || req.socket.remoteAddress || '?';
const col = p => store.docs[p] || (store.docs[p] = {});
const REV0 = Date.now();
const bump = p => { store.rev[p] = (store.rev[p] || REV0) + 1; persist(); };
const validPath = p => typeof p === 'string' && p.length < 200 && /^[\w@+.:~\/-]+$/.test(p) && !p.includes('..');
function can(tok, p, write, id) {
  if (tok && tok.k === 'admin') return true;
  { const t0 = String(p).split('/')[0]; if (t0 === 'mk' || t0 === 'pp' || t0 === 'pg' || t0 === 'tr' || t0 === 'ch' || t0 === 'al' || t0 === 'rf' || t0 === 'ln' || t0[0] === '_') return false; }   // ገበያ እና ምስል መረጃ በልዩ API ብቻ
  const m = /^data\/users\/([\w-]+)$/.exec(p);
  if (m) return !!tok && tok.u === m[1];                       // የግል ውሂብ፦ ባለቤት ብቻ
  if (!tok) return false;
  const top = p.split('/')[0];
  if (write) return !ADMIN_ONLY_WRITE.has(top);
  return tok.k !== 'anon' || ANON_READ.has(top);
}
const tokFor = (u, k) => tokens.tokFor(u, k);

app.post('/api/session/anon', (req, res) => {
  if (!limit('anon' + ip(req), 30, 3600e3)) return res.status(429).json({ ok: false });
  const u = crypto.randomBytes(12).toString('hex'); res.json({ ok: true, uid: u, token: tokFor(u, 'anon') });
});
function findUid(id) { id = String(id || '').trim(); const k = id.includes('@') ? 'e:' + id.toLowerCase() : 'p:' + normPhone(id); return store.idx[k] || null; }
app.post('/api/account/lookup', (req, res) => {
  if (!limit('lk' + ip(req), 60, 600e3)) return res.status(429).json({ ok: false });
  const u = findUid(req.body.id); if (!u) return res.json({ ok: true, found: false });
  const a = (store.docs['data/users/' + u] || {}).acct; res.json({ ok: true, found: !!a, uid: u, salt: a && a.salt });
});
app.post('/api/account/login', (req, res) => {
  const id = String(req.body.id || ''), u = findUid(id), a = u && (store.docs['data/users/' + u] || {}).acct;
  if (!limit('lg' + id.toLowerCase(), 5, 900e3) || !limit('lgi' + ip(req), 40, 900e3)) return res.status(429).json({ ok: false, error: 'too_many_attempts' });
  if (u && isSusp(u)) return res.status(403).json({ ok: false, error: 'suspended' });
  const proof = String(req.body.proof || '');
  if (!a || proof.length !== String(a.h).length || !crypto.timingSafeEqual(Buffer.from(proof), Buffer.from(String(a.h)))) return res.status(401).json({ ok: false, error: 'invalid' });
  res.json({ ok: true, uid: u, token: tokFor(u, 'user') });
});
/* አድሚን መግቢያ — 3 ማረጋገጫ፦ (1) ኢሜይል + የይለፍ ቃል፣ (2) Telegram OTP ወደ ስልክ ADMIN_PHONE ወደተረጋገጠው አካውንት፣ (3) ኢሜይል OTP ወደ ADMIN_EMAIL */
const admPend = {};
app.post('/api/admin/logout-all', needAdmin, async (req, res) => {          // በሁሉም መሳሪያ ላይ ያሉ የአድሚን መግቢያዎች ይሻራሉ፤ ይህ መሳሪያ አዲስ ምልክት ያገኛል
  try { const c = col('_admin'); c.sv = { n: adminSv() + 1 }; if (pool) await pgUpsert('_admin', 'sv', c.sv); else persist(); bump('_admin'); res.json({ ok: true, token: tokFor('admin', 'admin') }); }
  catch (e) { res.status(503).json({ ok: false, error: 'storage' }); }
});
app.post('/api/admin/login', async (req, res) => {
  if (!ADMIN_PASSWORD) return res.status(503).json({ ok: false, error: 'admin_not_configured' });
  if (!limit('ad' + ip(req), 5, 900e3)) return res.status(429).json({ ok: false, error: 'too_many_attempts' });
  const em = String(req.body.email || '').trim().toLowerCase(), a = Buffer.from(String(req.body.password || '')), b = Buffer.from(ADMIN_PASSWORD);
  if (em !== process.env.ADMIN_EMAIL.trim().toLowerCase() || a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ ok: false, error: 'invalid' });
  const chat = adminChatId(); if (!chat) return res.status(409).json({ ok: false, error: 'admin_telegram_not_linked', phone: maskPhone(normPhoneET(ADMIN_PHONE)) });
  const rid = id(), needEmail = !!mailer.configured(), o = { tg: randDigits(6), mail: needEmail ? randDigits(6) : null, attempts: 0, exp: Date.now() + 10 * 60e3 };
  Object.keys(admPend).forEach(k => { if (admPend[k].exp < Date.now()) delete admPend[k]; });
  try {
    await tg('sendMessage', { chat_id: chat, text: `🛡️ የአድሚን መግቢያ — Telegram ኮድ\n\nኮድዎ፦ ${o.tg}\n⏱ በ10 ደቂቃ ውስጥ ያበቃል።\n⚠️ እርስዎ ካልገቡ ኮዱን ለማንም አይስጡ፤ የይለፍ ቃልዎን ይቀይሩ።` });
    if (needEmail) await mailer.send({ to: process.env.ADMIN_EMAIL.trim(), subject: 'Etio Digital Market — የአድሚን መግቢያ ኮድ', text: `የአድሚን መግቢያ ኢሜይል ኮድዎ፦ ${o.mail}\n\nበ10 ደቂቃ ውስጥ ያበቃል። እርስዎ ካልጠየቁ ይህን ኢሜይል ችላ ይበሉ እና የይለፍ ቃልዎን ይቀይሩ።` });
  } catch (e) { console.error('admin otp send failed:', e.message); return res.status(500).json({ ok: false, error: 'otp_send_failed' }); }
  if (!needEmail) console.warn('⚠️ አድሚን ኢሜይል OTP አልተዘጋጀም (RESEND_API_KEY / BREVO_API_KEY / SMTP_HOST) — Telegram ብቻ ተጠቅሟል');
  admPend[rid] = o; res.json({ ok: true, requestId: rid, needEmail, emailHint: String(process.env.ADMIN_EMAIL).replace(/^(.).*(@.*)$/, '$1***$2') });
});
app.post('/api/admin/login/verify', (req, res) => {
  const r = admPend[String(req.body.requestId || '')];
  if (!r || r.exp < Date.now()) return res.status(404).json({ ok: false, error: 'request_not_found' });
  if (++r.attempts > 5) { delete admPend[req.body.requestId]; return res.status(429).json({ ok: false, error: 'too_many_attempts' }); }
  if (!safeOtpMatch(String(req.body.telegramOtp || '').trim(), r.tg) || (r.mail && !safeOtpMatch(String(req.body.emailOtp || '').trim(), r.mail))) return res.status(400).json({ ok: false, error: 'invalid_otp', attemptsLeft: Math.max(0, 5 - r.attempts) });
  delete admPend[req.body.requestId]; res.json({ ok: true, uid: 'admin', token: tokFor('admin', 'admin') });
});
app.get('/api/db/doc', (req, res) => {
  const t = readTok(req), p = String(req.query.p || ''), id = String(req.query.id || '');
  if (!validPath(p) || !can(t, p, false, id)) return res.status(403).json({ ok: false });
  const d = (col(p))[id]; res.json({ ok: true, exists: d !== undefined, data: d });
});
app.get('/api/db/col', (req, res) => {
  const t = readTok(req), p = String(req.query.p || '');
  if (!validPath(p) || !can(t, p, false)) return res.status(403).json({ ok: false });
  res.json({ ok: true, rev: store.rev[p] || 0, docs: col(p) });
});
app.post('/api/db/poll', (req, res) => {            // የተቀየሩ ስብስቦችን ብቻ ይመልሳል (አንድ ጥያቄ ለሁሉም)
  const t = readTok(req), want = req.body.paths || {}, out = {};
  Object.keys(want).slice(0, 60).forEach(p => { if (validPath(p) && can(t, p, false) && (store.rev[p] || 0) !== want[p]) out[p] = { rev: store.rev[p] || 0, docs: col(p) }; });
  res.json({ ok: true, changed: out });
});
function indexAcct(u, d, res) {
  const keys = []; if (d.email) keys.push('e:' + String(d.email).toLowerCase()); if (d.phone) keys.push('p:' + normPhone(d.phone));
  for (const k of keys) if (store.idx[k] && store.idx[k] !== u) { res.status(409).json({ ok: false, error: 'taken' }); return false; }
  keys.forEach(k => store.idx[k] = u); if (pool) pgUpsert('_sys', 'idx', store.idx).catch(e => console.error('idx save failed', e.message)); return true;
}
app.put('/api/db/doc', (req, res) => {
  const t = readTok(req), { p, id, data, merge } = req.body || {};
  if (!validPath(p) || typeof id !== 'string' || !id || id.length > 120 || !data || typeof data !== 'object' || !can(t, p, true, id)) return res.status(403).json({ ok: false });
  if (!limit('w' + (t ? t.u : ip(req)), 300, 60e3)) return res.status(429).json({ ok: false });
  const next = merge ? { ...(col(p)[id] || {}), ...data } : data;
  const m = /^data\/users\/([\w-]+)$/.exec(p);
  if (m && id === 'acct' && !indexAcct(m[1], next, res)) return;
  const prev = col(p)[id]; col(p)[id] = next;
  const done = () => { bump(p); res.json({ ok: true }); };
  if (!pool) return done();
  pgUpsert(p, id, next).then(done).catch(e => { if (prev === undefined) delete col(p)[id]; else col(p)[id] = prev; console.error('write failed', e.message); res.status(503).json({ ok: false, error: 'storage' }); });
});
app.delete('/api/db/doc', (req, res) => {
  const t = readTok(req), p = String(req.query.p || ''), id = String(req.query.id || '');
  if (!validPath(p) || !can(t, p, true, id)) return res.status(403).json({ ok: false });
  const prev = col(p)[id]; delete col(p)[id];
  if (!pool) { bump(p); return res.json({ ok: true }); }
  pgDelete(p, id).then(() => { bump(p); res.json({ ok: true }); }).catch(e => { if (prev !== undefined) col(p)[id] = prev; res.status(503).json({ ok: false, error: 'storage' }); });
});



/* ===== አድሚን፦ የአካውንቶች ሙሉ ቁጥጥር ===== */
function needAdmin(req, res, next) { const t = readTok(req); if (!t || t.k !== 'admin') return res.status(403).json({ ok: false }); next(); }
const usersOf = () => Object.keys(store.docs).filter(p => /^data\/users\/[\w-]+$/.test(p));
const strip = a => { const { h, salt, ...rest } = a || {}; return rest; };
const accKey = a => accountKey(a.email, a.phone);
app.get('/api/admin/accounts', needAdmin, (req, res) => {
  const list = usersOf().map(p => { const d = store.docs[p], a = d.acct; if (!a) return null; const uid = p.split('/')[2];
    return { uid, email: a.email, phone: a.phone, name: (d.private && d.private.fullName) || a.name || '', ts: a.ts || null, suspended: isSusp(uid), telegram: !!db.accounts[accKey(a)], hasPrivate: !!d.private, docs: Object.keys(d).length }; }).filter(Boolean).sort((x, y) => (y.ts || 0) - (x.ts || 0));
  res.json({ ok: true, count: list.length, accounts: list });
});
const dossier = require('./dossier');
const audit = dossier.auditor({ col, pool, pgUpsert, persist, nid: () => require('crypto').randomBytes(6).toString('hex') });
app.get('/api/admin/account/:uid/full', needAdmin, async (req, res) => {       // ሙሉ እይታ — ሁሉንም ወይም አንድ ክፍል (?section=orders)
  const sec = String(req.query.section || 'all'); if (sec !== 'all' && !dossier.SECTIONS.includes(sec)) return res.status(400).json({ ok: false, error: 'bad_section' });
  const d = store.docs['data/users/' + req.params.uid]; if (!d || !d.acct) return res.status(404).json({ ok: false });
  const r = dossier.build(col, req.params.uid, sec, { suspended: isSusp(req.params.uid), telegram: !!db.accounts[accKey(d.acct)] });
  await audit('view', req.params.uid, sec, (d.acct.email || '') + ''); res.json({ ok: true, uid: req.params.uid, ...r, labels: dossier.LABELS });
});
app.get('/api/admin/audit', needAdmin, (req, res) => res.json({ ok: true, items: dossier.readLog(col, String(req.query.uid || '')).slice(0, 300) }));
app.get('/api/admin/account/:uid', needAdmin, async (req, res) => {
  const d = store.docs['data/users/' + req.params.uid]; if (!d || !d.acct) return res.status(404).json({ ok: false });
  await audit('view', req.params.uid, 'raw');
  const docs = {}; Object.keys(d).forEach(k => docs[k] = dossier.scrub(k === 'acct' ? strip(d[k]) : d[k]));
  res.json({ ok: true, uid: req.params.uid, suspended: isSusp(req.params.uid), telegram: !!db.accounts[accKey(d.acct)], docs });
});
app.post('/api/admin/account/:uid/suspend', needAdmin, async (req, res) => {
  const u = req.params.uid; if (!store.docs['data/users/' + u]) return res.status(404).json({ ok: false });
  audit(req.body.suspend ? 'suspend' : 'unsuspend', u); const c = col('_admin'); c.susp = { ...(c.susp || {}) }; if (req.body.suspend) c.susp[u] = Date.now(); else delete c.susp[u];
  try { if (pool) await pgUpsert('_admin', 'susp', c.susp); else persist(); bump('_admin'); res.json({ ok: true, suspended: !!req.body.suspend }); } catch (e) { res.status(503).json({ ok: false }); }
});
app.post('/api/admin/account/:uid/unlink-telegram', needAdmin, (req, res) => {
  const d = store.docs['data/users/' + req.params.uid]; if (!d || !d.acct) return res.status(404).json({ ok: false });
  audit('unlink-telegram', req.params.uid); delete db.accounts[accKey(d.acct)]; saveDB(); res.json({ ok: true });
});
app.delete('/api/admin/account/:uid', needAdmin, async (req, res) => {
  const u = req.params.uid, p = 'data/users/' + u, d = store.docs[p]; if (!d) return res.status(404).json({ ok: false });
  try {
    await audit('delete-account', u, '', (d.acct && d.acct.email) || '');
    if (d.acct) delete db.accounts[accKey(d.acct)];
    Object.keys(store.idx).forEach(k => { if (store.idx[k] === u) delete store.idx[k]; });
    delete store.docs[p]; const c = col('_admin'); if (c.susp) delete c.susp[u];
    if (pool) { await pool.query('DELETE FROM kv WHERE path=$1', [p]); await pgUpsert('_sys', 'idx', store.idx); await pgUpsert('_admin', 'susp', c.susp || {}); } else persist();
    saveDB(); bump(p); res.json({ ok: true });
  } catch (e) { res.status(503).json({ ok: false }); }
});

const ADMIN_CHAT = process.env.ADMIN_TELEGRAM_CHAT_ID || '';
const adminChatId = () => (db.admin && db.admin.chatId) || ADMIN_CHAT;   // ስልክ 0946705941 በቦቱ ሲረጋገጥ የሚታሰር Telegram chat (ወይም env)
function bindAdmin(chatId) { if (db.admin && db.admin.chatId === chatId) return; db.admin = { chatId, phone: ADMIN_PHONE, at: Date.now() }; saveDB(); }
async function sendTg(chatId, text, btn) {   // btn = { url, label } → በመልዕክቱ ስር የሚጫን ቁልፍ (ለምሳሌ «🧾 ደረሰኝ አውርድ»)
  if (!TOKEN || !chatId) return;
  const base = { chat_id: chatId, text: String(text).slice(0, 3800), disable_web_page_preview: true };
  try {
    if (btn && btn.rows) { try { return await tg('sendMessage', { ...base, reply_markup: { inline_keyboard: btn.rows } }); } catch (e) { console.warn('rows send failed, retry plain:', e.message); } }
    else if (btn && /^https:\/\//.test(btn.url || '')) { try { return await tg('sendMessage', { ...base, reply_markup: { inline_keyboard: [[{ text: String(btn.label || '🧾 ደረሰኝ አውርድ').slice(0, 60), url: btn.url }]] } }); } catch (e) { console.warn('button send failed, retry plain:', e.message); } }
    await tg('sendMessage', base);
  } catch (e) { console.warn('notify failed:', e.message); }
}
function notifyUser(uid, text, btn) { try { const d = store.docs['data/users/' + uid] || {}, a = d.acct; if (!a) return; if (!btn && d.prefs && d.prefs.mute) return;   // ድምጸ-ከል፦ ቁልፍ የሌላቸው (መረጃ ብቻ) መልዕክቶች አይላኩም
    const l = db.accounts[accKey(a)]; if (l && l.chatId) sendTg(l.chatId, `🇪🇹 Etio Digital Market\n\n${text}${btn && btn.url ? '\n\n🧾 ' + btn.url : ''}\n\n🔗 ${PUBLIC_BASE_URL}`, btn); } catch (e) { console.warn('notifyUser', e.message); } }
function notifyAdmin(text, btn) { sendTg(adminChatId(), `🛡️ አድሚን\n\n${text}\n\n🔗 ${PUBLIC_BASE_URL}`, btn); }
const receipts = require('./receipt')({ app, col, secret: TOKEN_SECRET, baseUrl: PUBLIC_BASE_URL });
const mkApi = require('./market')({ app, col, bump, pool, pgUpsert, persist, readTok, limit, notifyUser, notifyAdmin, receipts });
require('./people')({ app, col, limit, notifyUser, notifyAdmin, ...mkApi });
let opsApi = null;
require('./search')({ app, col, S: (v, n) => String(v == null ? '' : v).trim().slice(0, n), onSearch: (q, n) => opsApi && opsApi.recordSearch(q, n) });
require('./pages')({ app, col, bump, pool, persist, limit, notifyUser, notifyAdmin, ...mkApi });
require('./chat')({ app, col, limit, notifyUser, notifyAdmin, ...mkApi });
require('./trust')({ app, col, limit, notifyUser, notifyAdmin, ...mkApi });
require('./geo')({ app, col, limit, ...mkApi });
require('./learn')({ app, col, limit, pool, persist, bump, token: TOKEN, botUsername: BOT_USERNAME, miniShort: (process.env.TELEGRAM_MINIAPP_SHORT || '').replace(/[^\w]/g, ''), baseUrl: PUBLIC_BASE_URL, ...mkApi });
const couponsApi = require('./coupons')({ app, col, limit, ...mkApi });
require('./referral')({ app, col, limit, notifyUser, coupons: couponsApi, baseUrl: PUBLIC_BASE_URL, getStore: () => store, ...mkApi });
opsApi = require('./ops')({ app, col, getStore: () => store, ...mkApi });
require('./admin-hub')({ app, col, getStore: () => store, notifyUser, audit, ops: opsApi, health: { db: !!pool, telegram: !!TOKEN, email: !!(process.env.RESEND_API_KEY || process.env.BREVO_API_KEY || process.env.SMTP_HOST), s3: !!process.env.S3_ENDPOINT }, ...mkApi });
const alertsApi = require('./alerts')({ app, col, limit, bump, pool, persist, notifyUser, baseUrl: PUBLIC_BASE_URL, ...mkApi });
if (process.env.NODE_ENV !== 'test') require('./scheduler').start({ col, saveMany: mkApi.saveMany, notifyUser, notifyAdmin, alerts: alertsApi, baseUrl: PUBLIC_BASE_URL,
  prefsOf: uid => (store.docs['data/users/' + uid] || {}).prefs || {}, users: () => usersOf().map(p => ({ uid: p.split('/')[2], ts: ((store.docs[p] || {}).acct || {}).ts || 0 })).filter(x => store.docs['data/users/' + x.uid].acct) });

const authApi = require('./auth')({ app, col, bump, pool, pgUpsert, persist, readTok, limit, tokFor, findUid, isSusp, accountKey, normPhoneET, tg, randDigits, id, safeOtpMatch, clean, saveDB, getDb: () => db, getStore: () => store, PUBLIC_BASE_URL, BOT_USERNAME, OTP_TTL, LINK_TTL, notifyAdmin });

botApi = require('./bot')({ tg, tokFor, port: PORT, baseUrl: PUBLIC_BASE_URL, adminChat: adminChatId, bindAdmin, adminPhone: normPhoneET(ADMIN_PHONE), token: TOKEN, botUsername: BOT_USERNAME, getDb: () => db, getStore: () => store, accKey, findUid, normPhoneET, authApi, pool, pgUpsert, isSusp });
app.use((err, req, res, next) => opsApi.errorMw(err, req, res, next));      // ያልተያዙ የመንገድ ስህተቶች → አድሚን መዝገብ

async function initStorage() {
  if (!pool) return;
  await pool.query('CREATE TABLE IF NOT EXISTS kv (path text NOT NULL, id text NOT NULL, data jsonb NOT NULL, PRIMARY KEY (path, id))');
  const r = await pool.query('SELECT path,id,data FROM kv');
  store = { docs: {}, rev: {}, idx: {} };
  for (const row of r.rows) {
    if (row.path === '_sys') { if (row.id === 'idx') store.idx = row.data; if (row.id === 'botdb') botApi.restore(row.data); if (row.id === 'otpdb') db = { links: row.data.links || {}, pending: row.data.pending || {}, accounts: row.data.accounts || {}, admin: row.data.admin || null }; }
    else (store.docs[row.path] = store.docs[row.path] || {})[row.id] = row.data;
  }
  console.log('Postgres storage ready:', r.rows.length, 'records');
}
module.exports = { app, ready: initStorage, configureWebhook, PORT };
