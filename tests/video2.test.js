const test = require('node:test'), assert = require('node:assert'), http = require('node:http'), cp = require('child_process'), fs = require('fs'), os = require('os'), path = require('path');
const V = require('../server/video'), { localPlan } = require('../server/vidplan');
const hasFF = (() => { try { cp.execSync('ffmpeg -version', { stdio: 'ignore' }); return true; } catch (e) { return false; } })();
test('ቪድዮ፦ ያለ AI የሚሠራ ተለዋጭ እቅድ ስም፣ ስልክ፣ አድራሻ ይለያል', () => {
  const p = localPlan({ kind: 'ad', sec: 30, notes: 'ስሜ ኢትዮ ቡና\nትኩስ ቡና እንሸጣለን\nፈጣን ማድረስ\nተመጣጣኝ ዋጋ\nርካሽ\nስልክ 0911 22 33 44\nአድራሻ ባሕር ዳር ፒያሳ', nPhotos: 1 });
  assert.equal(p.brand, 'ኢትዮ ቡና'); const c = p.scenes[p.scenes.length - 1]; assert.equal(c.type, 'cta'); assert.match(c.phone, /0911/); assert.match(c.addr, /ባሕር ዳር/); assert.ok(p.scenes.length >= 3); assert.ok(p.scenes.every(s => s.img === 0));
  assert.ok(localPlan({ notes: '' }).scenes.length >= 2, 'ባዶ ግብዓትም ቪድዮ ይሰጣል');
});
test('ቪድዮ፦ ከርዕሱ ጋር የሚሄድ ምስል (imgq) ይመጣል፤ ካልተገኘ በንድፍ ይሞላል', { skip: !hasFF && 'ffmpeg የለም' }, async () => {
  const jpg = (() => { const f = path.join(os.tmpdir(), 'wi.jpg'); cp.execSync(`ffmpeg -y -loglevel error -f lavfi -i testsrc=s=800x600:d=1 -frames:v 1 "${f}"`); return fs.readFileSync(f); })(), asked = [];
  const plan = { brand: 'ቡና', theme: 0, music: 'none', scenes: [{ type: 'hook', head: 'ቡና', imgq: 'steaming coffee cup on wooden table', dur: 3 }, { type: 'text', head: 'ሁለት', imgq: 'coffee beans', dur: 3 }, { type: 'cta', head: 'ደውሉ', phone: '0911', dur: 3 }] };
  const r = await V.render(plan, { bin: 'ffmpeg', fmt: 'v', fetchImg: async q => { asked.push(q); return /beans/.test(q) ? null : jpg; } });
  assert.equal(r.images, 1, 'አንዱ ተገኘ'); assert.equal(asked.length, 2, 'cta ምስል አይፈልግም (imgq የለውም)'); assert.ok(r.buf.length > 5000);
  const slow = await V.render(plan, { bin: 'ffmpeg', fmt: 's', imgMs: 1500, fetchImg: () => new Promise(() => { }) }); assert.equal(slow.images, 0, 'ምስል ቢዘገይ ቪድዮው አይቆምም'); assert.ok(slow.buf.length > 3000);
});
test('ቦት፦ «ይህን ቦት አስተዋውቅ» → ሙሉ ባህሪ ለ AI፤ AI ቢወድቅ ቪድዮ አሁንም ይላካል', { skip: !hasFF && 'ffmpeg የለም' }, async () => {
  process.env.ANTHROPIC_API_KEY = 'k'; process.env.VIDEO_PLAN_MS = '4000'; const seen = [], vids = []; let aiFail = false;
  const srv = http.createServer((q, r) => { r.setHeader('content-type', 'application/json'); r.end(JSON.stringify({ ok: true, items: [] })); }); await new Promise(r => srv.listen(0, r)); const port = srv.address().port;
  const realFetch = global.fetch; global.fetch = async (url, o) => {
    if (/anthropic/.test(url)) { const body = JSON.parse(o.body), last = body.messages[body.messages.length - 1].content, txt = Array.isArray(last) ? last.map(x => x.text || '').join('\n') : last; seen.push(txt); if (aiFail) return { ok: false, status: 500, text: async () => 'err', json: async () => ({}) }; return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: JSON.stringify({ brand: 'ኢትዮ ዲጂታል ማርኬት', theme: 0, music: 'calm', scenes: [{ type: 'hook', head: 'ሁሉም በአንድ ቦታ', dur: 3 }, { type: 'cta', head: 'ኢትዮ ዲጂታል ማርኬት', dur: 3 }] }) }] }) }; }
    if (/api\.telegram\.org\/bot.*sendVideo/.test(url)) { vids.push(o.body.get('video').size); return { ok: true, status: 200 }; }
    if (/pollinations|wikimedia/.test(url)) return { ok: false, status: 503 };
    return realFetch(url, o); };
  try {
    const sent = [], tg = async (m, p) => { sent.push([m, p]); return { ok: true, message_id: 1 }; };
    const svc = require('../server/aisvc')({ app: { get() { }, post() { } }, col: (() => { const d = {}; return p => d[p] || (d[p] = {}); })(), who: () => null, adminOnly: () => false, saveMany: async () => { }, bad() { }, S: (x, n) => String(x == null ? '' : x).slice(0, n || 1e9), N: Number, nid: () => 'x' + Math.random(), limit: () => true, ai: require('../server/ai').shared() });
    const bot = require('../server/bot')({ aisvc: svc, tg, tokFor: () => 't', port, baseUrl: 'https://x.et', adminChat: '999', bindAdmin() { }, adminPhone: '', token: 'T', botUsername: 'EtioBot', getDb: () => ({ accounts: { k: { chatId: 7 } } }), getStore: () => ({ docs: { 'data/users/U1': { acct: { name: 'ተ' } } } }), accKey: () => 'k', findUid: () => 'U1', normPhoneET: x => x, authApi: {}, pool: null, pgUpsert: async () => { }, isSusp: () => false });
    const C = 7, msgs = () => sent.filter(x => x[0] === 'sendMessage').map(x => x[1]), kbs = () => JSON.stringify(msgs().map(m => m.reply_markup)), say = t => bot.handle({ message: { chat: { id: C, type: 'private' }, from: { id: C }, text: t, message_id: 1 } }), cb = d => bot.handle({ callback_query: { id: 'q' + Math.random(), data: d, message: { chat: { id: C, type: 'private' } } } });
    await say('ይህን bot የሚያስተዋውቅ ቪድዮ ስራልኝ'); assert.ok(kbs().includes('vd:d:30'), 'ማስታወቂያ ተብሎ ተለይቷል → ወደ ርዝማኔ'); sent.length = 0; await cb('vd:d:15'); await cb('vd:f:v'); await cb('vd:im'); await cb('vd:go');
    assert.equal(vids.length, 1); const q = seen[seen.length - 1]; assert.match(q, /ስለ ቦቱ የተረጋገጡ እውነታዎች/); assert.match(q, /ዲጂታል ገበያ/); assert.match(q, /AI መምህር/); assert.match(q, /t\.me\/EtioBot/); assert.match(q, /ማስታወቂያ/);
    aiFail = true; sent.length = 0; await cb('vd:re'); assert.equal(vids.length, 2, 'AI ቢወድቅም ቪድዮ ተላከ'); assert.ok(msgs().some(m => /በቀላል ቅንብር/.test(m.text)), 'ተጠቃሚው ይነገረዋል');
  } finally { global.fetch = realFetch; srv.close(); }
});
test('ቪድዮ፦ ድምፅ አገልግሎት ቢሰቀል ቪድዮው አይቆምም (ያለ ድምፅ ይቀጥላል)', { skip: !hasFF && 'ffmpeg የለም' }, async () => {
  const t0 = Date.now(); const r = await V.render({ brand: 'x', theme: 1, music: 'none', scenes: [{ type: 'hook', head: 'ሰላም', narr: 'ሰላም ለሁሉም', dur: 3 }, { type: 'cta', head: 'ደውሉ', narr: 'ደውሉልን', dur: 3 }] }, { bin: 'ffmpeg', fmt: 's', ttsMs: 1500, tts: () => new Promise(() => { }) });
  assert.equal(r.narrated, 0); assert.ok(r.buf.length > 3000); assert.ok(Date.now() - t0 < 30000, 'በጊዜ ተጠናቀቀ');
});
test('ቪድዮ ቁልፍ በሁሉም ክፍል (ትምህርት ብቻ ክፍልም) ይታያል፤ በትምህርት ክፍል የገበያ (ማስታወቂያ) ዓይነት አይታይም', async () => {
  process.env.ANTHROPIC_API_KEY = 'k'; const srv = http.createServer((q, r) => { r.setHeader('content-type', 'application/json'); r.end(JSON.stringify({ ok: true, items: [] })); }); await new Promise(r => srv.listen(0, r)); const port = srv.address().port;
  const sent = [], tg = async (m, p) => { sent.push([m, p]); return { ok: true, message_id: 1 }; };
  const svc = require('../server/aisvc')({ app: { get() { }, post() { } }, col: (() => { const d = {}; return p => d[p] || (d[p] = {}); })(), who: () => null, adminOnly: () => false, saveMany: async () => { }, bad() { }, S: (x, n) => String(x == null ? '' : x).slice(0, n || 1e9), N: Number, nid: () => 'x' + Math.random(), limit: () => true, ai: require('../server/ai').shared() });
  const bot = require('../server/bot')({ aisvc: svc, tg, tokFor: () => 't', port, baseUrl: 'https://x.et', adminChat: '999', bindAdmin() { }, adminPhone: '', token: 'T', getDb: () => ({ accounts: { k: { chatId: 7 } } }), getStore: () => ({ docs: { 'data/users/U1': { acct: { name: 'ተ' } } } }), accKey: () => 'k', findUid: () => 'U1', normPhoneET: x => x, authApi: {}, pool: null, pgUpsert: async () => { }, isSusp: () => false });
  const C = 7, say = t => bot.handle({ message: { chat: { id: C, type: 'private' }, from: { id: C }, text: t, message_id: 1 } }), cb = d => bot.handle({ callback_query: { id: 'q' + Math.random(), data: d, message: { chat: { id: C, type: 'private' } } } }), all = () => JSON.stringify(sent);
  try {
    for (const m of ['b', 'e']) { sent.length = 0; await cb('ob:' + m); assert.ok(all().includes('🎬 ቪድዮ ሥራ'), 'ቁልፍ አለ — ክፍል ' + m); }
    sent.length = 0; await say('🎬 ቪድዮ ሥራ'); assert.ok(all().includes('vd:k:edu') && !all().includes('vd:k:ad') && !all().includes('vd:k:product'), 'በትምህርት ክፍል የገበያ ዓይነት የለም');
  } finally { srv.close(); }
});
