const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '1mb' }));

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
    return { links: d.links || {}, pending: d.pending || {}, accounts: d.accounts || {} };
  } catch { return { links: {}, pending: {}, accounts: {} }; }
}
let db = loadDB();
let saveTimer;
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
function accountKey(email, phone) {
  return crypto.createHash('sha256').update(`${String(email).trim().toLowerCase()}|${String(phone).replace(/[\s()-]/g,'')}`).digest('hex');
}
function clean() {
  const now = Date.now();
  for (const [k,v] of Object.entries(db.pending)) if (now > v.expiresAt) delete db.pending[k];
  for (const [k,v] of Object.entries(db.links)) if (now > (v.expiresAt || 0)) delete db.links[k];
}
async function tg(method, body) {
  if (!TOKEN) throw new Error('Server setup missing TELEGRAM_BOT_TOKEN.');
  const r = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
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
    const msg = req.body && req.body.message;
    if (msg && msg.chat && typeof msg.text === 'string') await handleStart(msg.text, msg.chat);
  } catch (e) { console.error('Telegram webhook update failed:', e.message); }
});

app.get('/', (req,res)=>res.sendFile(path.join(__dirname,'index.html')));
app.get('/index.html', (req,res)=>res.sendFile(path.join(__dirname,'index.html')));
// Do not expose the application directory via express.static: it contains server code and OTP data.

app.post('/api/telegram/start', (req,res)=>{
  clean();
  if (!TOKEN || !BOT_USERNAME) return res.status(503).json({ok:false,error:'telegram_not_configured'});
  const requestId = id();
  db.links[requestId] = { requestId, status:'waiting_for_start', createdAt:Date.now(), expiresAt:Date.now()+LINK_TTL };
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
  const key=accountKey(email,phone);
  db.accounts[key]={chatId:r.chatId,username:r.username||null,linkedAt:Date.now()};
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

async function handleStart(text, chat) {
  const m=/^\/start(?:\s+(.+))?$/.exec(text||'');
  if(!m) return;
  const requestId=m[1];
  if(requestId && db.links[requestId]) {
    const r=db.links[requestId];
    if (Date.now() > r.expiresAt) {
      delete db.links[requestId]; saveDB();
      await tg('sendMessage',{chat_id:chat.id,text:'ይህ ማረጋገጫ ሊንክ ጊዜው አልፎበታል። ወደ Marketplace ተመልሰው እንደገና ይሞክሩ።'});
      return;
    }
    r.chatId=chat.id; r.username=chat.username || chat.first_name || ''; r.status='otp_sent';
    r.otp=randDigits(6); r.otpExpiresAt=Date.now()+OTP_TTL; r.attempts=0;
    saveDB();
    await tg('sendMessage',{chat_id:chat.id,text:`🇪🇹 Etio Digital Market\n\nየTelegram ማረጋገጫ ኮድዎ፦ ${r.otp}\n\nወደ Marketplace ተመልሰው ኮዱን ያስገቡ።\n⏱ በ5 ደቂቃ ውስጥ ያበቃል።`});
    return;
  }
  await tg('sendMessage',{chat_id:chat.id,text:'🇪🇹 እንኳን ወደ Etio Digital Market በደህና መጡ።\n\nየMarketplace ገጹ የሚሰጠውን Telegram Start ሊንክ ይጠቀሙ።'});
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
      allowed_updates: ['message'],
      drop_pending_updates: false
    });
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
const b64u = b => Buffer.from(b).toString('base64url');
function sign(p) { const body = b64u(JSON.stringify(p)); return body + '.' + crypto.createHmac('sha256', TOKEN_SECRET).update(body).digest('base64url'); }
function readTok(req) {
  const t = (req.get('authorization') || '').replace(/^Bearer /, ''); const [body, sig] = t.split('.');
  if (!body || !sig) return null;
  const ok = crypto.createHmac('sha256', TOKEN_SECRET).update(body).digest('base64url');
  if (sig.length !== ok.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(ok))) return null;
  try { const p = JSON.parse(Buffer.from(body, 'base64url').toString()); return p.x > Date.now() ? p : null; } catch { return null; }
}
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
  const m = /^data\/users\/([\w-]+)$/.exec(p);
  if (m) return !!tok && tok.u === m[1];                       // የግል ውሂብ፦ ባለቤት ብቻ
  if (!tok) return false;
  const top = p.split('/')[0];
  if (write) return !ADMIN_ONLY_WRITE.has(top);
  return tok.k !== 'anon' || ANON_READ.has(top);
}
const tokFor = (u, k) => sign({ u, k, x: Date.now() + 90 * 864e5 });

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
  const proof = String(req.body.proof || '');
  if (!a || proof.length !== String(a.h).length || !crypto.timingSafeEqual(Buffer.from(proof), Buffer.from(String(a.h)))) return res.status(401).json({ ok: false, error: 'invalid' });
  res.json({ ok: true, uid: u, token: tokFor(u, 'user') });
});
app.post('/api/admin/login', (req, res) => {
  if (!ADMIN_PASSWORD) return res.status(503).json({ ok: false, error: 'admin_not_configured' });
  if (!limit('ad' + ip(req), 5, 900e3)) return res.status(429).json({ ok: false, error: 'too_many_attempts' });
  const a = Buffer.from(String(req.body.password || '')), b = Buffer.from(ADMIN_PASSWORD);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ ok: false, error: 'invalid' });
  res.json({ ok: true, uid: 'admin', token: tokFor('admin', 'admin') });
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


async function initStorage() {
  if (!pool) return;
  await pool.query('CREATE TABLE IF NOT EXISTS kv (path text NOT NULL, id text NOT NULL, data jsonb NOT NULL, PRIMARY KEY (path, id))');
  const r = await pool.query('SELECT path,id,data FROM kv');
  store = { docs: {}, rev: {}, idx: {} };
  for (const row of r.rows) {
    if (row.path === '_sys') { if (row.id === 'idx') store.idx = row.data; if (row.id === 'otpdb') db = { links: row.data.links || {}, pending: row.data.pending || {}, accounts: row.data.accounts || {} }; }
    else (store.docs[row.path] = store.docs[row.path] || {})[row.id] = row.data;
  }
  console.log('Postgres storage ready:', r.rows.length, 'records');
}
initStorage().then(() => {
app.listen(PORT, () => {
  console.log(`Etio Digital Market server listening on port ${PORT}`);
  configureWebhook();
});
}).catch(e => { console.error('Storage init failed:', e.message); process.exit(1); });
