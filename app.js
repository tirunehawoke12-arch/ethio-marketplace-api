const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
require('dotenv').config();

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '64kb' }));

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
function saveDB() {
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

app.listen(PORT, () => {
  console.log(`Etio Digital Market server listening on port ${PORT}`);
  configureWebhook();
});
