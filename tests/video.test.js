const test = require('node:test'), assert = require('node:assert'), http = require('node:http'), cp = require('child_process'), fs = require('fs'), os = require('os'), path = require('path');
const V = require('../server/video');
const hasFF = (() => { try { cp.execSync('ffmpeg -version', { stdio: 'ignore' }); return true; } catch (e) { return false; } })();
const dur = f => parseFloat(cp.execSync(`ffprobe -v error -show_entries format=duration -of csv=p=0 "${f}"`).toString());
const PLAN = { brand: 'ኢትዮ ቡና', theme: 3, music: 'energetic', caption: 'ቡና #ቡና', scenes: [
  { type: 'hook', head: 'ቡና ይወዳሉ?', sub: 'ትኩስ በየቀኑ', narr: 'ቡና ይወዳሉ', dur: 4 }, { type: 'list', head: 'ለምን እኛ', bullets: ['ትኩስ', 'ፈጣን', 'ርካሽ'], dur: 5 },
  { type: 'offer', head: 'ቅናሽ', price: '20% ቅናሽ', dur: 4 }, { type: 'cta', head: 'ኢትዮ ቡና', phone: '0911 22 33 44', addr: 'ባሕር ዳር', dur: 5 }] };
test('ቪድዮ፦ ጽሑፍ ማጽዳት፣ ሙሉ ቪድዮ (ድምፅ + ሙዚቃ)፣ ርዝማኔ ገደብ', { skip: !hasFF && 'ffmpeg የለም' }, async () => {
  assert.equal(V.clean('ሰላም 🎉 ዓለም'), 'ሰላም ዓለም', 'ኢሞጂ ይወገዳል');
  const wav = path.join(os.tmpdir(), 'tt.wav'); cp.execSync(`ffmpeg -y -loglevel error -f lavfi -i "sine=f=300:d=3" "${wav}"`); const wb = fs.readFileSync(wav);
  const r = await V.render(PLAN, { bin: 'ffmpeg', fmt: 'v', tts: async () => wb }); assert.equal(r.w, 540); assert.equal(r.h, 960); assert.ok(r.narrated >= 1 && r.music, 'ድምፅ + ሙዚቃ');
  const f = path.join(os.tmpdir(), 'tv.mp4'); fs.writeFileSync(f, r.buf); const d = dur(f); assert.ok(Math.abs(d - r.dur) < 1.5, `ርዝማኔ ${d} ≈ ${r.dur}`); assert.match(cp.execSync(`ffprobe -v error -show_entries stream=codec_type -of csv=p=0 "${f}"`).toString(), /audio/); 
  const long = { ...PLAN, scenes: Array.from({ length: 8 }, (_, i) => ({ type: i === 7 ? 'cta' : 'text', head: 'ትዕይንት ' + i, sub: 'ጽሑፍ', dur: 10 })) }, r2 = await V.render({ ...long, music: 'none' }, { bin: 'ffmpeg', fmt: 'h', maxSec: 30 }); assert.ok(r2.dur <= 31, 'ከገደብ በላይ ትዕይንቶች ይቀነሳሉ ' + r2.dur); assert.equal(r2.w, 960); assert.ok(r2.scenes < 8);
  await assert.rejects(V.render({ scenes: [{ type: 'text' }] }, { bin: 'ffmpeg' }), /video_empty/);
});
test('ቦት፦ ቪድዮ ሰሪ በደረጃ — ዓይነት → ርዝማኔ → ቅርጽ → ሀሳቦች (ጽሑፍ + ፎቶ) → ቪድዮ ይላካል፤ ለውጥ፤ ትምህርት ብቻ ክፍል', { skip: !hasFF && 'ffmpeg የለም' }, async () => {
  process.env.ANTHROPIC_API_KEY = 'k'; const seen = [], vids = [];
  const srv = http.createServer((q, r) => { r.setHeader('content-type', 'application/json'); r.end(JSON.stringify({ ok: true, items: [] })); }); await new Promise(r => srv.listen(0, r)); const port = srv.address().port;
  const jpg = (() => { const f = path.join(os.tmpdir(), 'tp.jpg'); cp.execSync(`ffmpeg -y -loglevel error -f lavfi -i testsrc=s=640x480:d=1 -frames:v 1 "${f}"`); return fs.readFileSync(f); })();
  const realFetch = global.fetch; global.fetch = async (url, o) => {
    if (/anthropic/.test(url)) { const body = JSON.parse(o.body), last = body.messages[body.messages.length - 1].content, txt = Array.isArray(last) ? last.map(x => x.text || '').join('\n') : last; seen.push(txt); return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: /ቪድዮ ማስታወቂያ ጸሐፊ/.test(body.system) ? JSON.stringify({ ...PLAN, scenes: PLAN.scenes.map((s, i) => ({ ...s, img: i === 0 ? 0 : -1 })) }) : 'መልስ' }] }) }; }
    if (/\/file\/botT\//.test(url)) return { ok: true, arrayBuffer: async () => jpg }; if (/getFile/.test(url)) return { ok: true, json: async () => ({ ok: true, result: { file_path: 'a/p.jpg' } }) };
    if (/api\.telegram\.org\/bot.*sendVideo/.test(url)) { const v = o.body.get('video'); vids.push({ size: v.size, dur: o.body.get('duration'), w: o.body.get('width') }); return { ok: true, status: 200 }; }
    return realFetch(url, o); };
  try {
    const sent = [], tg = async (m, p) => { sent.push([m, p]); if (m === 'getFile') return { file_path: 'a/p.jpg' }; return { ok: true, message_id: 1 }; };
    const svc = require('../server/aisvc')({ app: { get() { }, post() { } }, col: (() => { const d = {}; return p => d[p] || (d[p] = {}); })(), who: () => null, adminOnly: () => false, saveMany: async () => { }, bad() { }, S: (x, n) => String(x == null ? '' : x).slice(0, n || 1e9), N: Number, nid: () => 'x' + Math.random(), limit: () => true, ai: require('../server/ai').shared() });
    const bot = require('../server/bot')({ aisvc: svc, tg, tokFor: () => 't', port, baseUrl: 'https://x.et', adminChat: '999', bindAdmin() { }, adminPhone: '', token: 'T', getDb: () => ({ accounts: { k: { chatId: 7 } } }), getStore: () => ({ docs: { 'data/users/U1': { acct: { name: 'ተ' } } } }), accKey: () => 'k', findUid: () => 'U1', normPhoneET: x => x, authApi: {}, pool: null, pgUpsert: async () => { }, isSusp: () => false });
    const C = 7, msgs = () => sent.filter(x => x[0] === 'sendMessage').map(x => x[1]), kbs = () => JSON.stringify(msgs().map(m => m.reply_markup)), say = t => bot.handle({ message: { chat: { id: C, type: 'private' }, from: { id: C }, text: t, message_id: 1 } }), cb = d => bot.handle({ callback_query: { id: 'q' + Math.random(), data: d, message: { chat: { id: C, type: 'private' } } } });
    sent.length = 0; await say('🎬 ቪድዮ'); assert.ok(kbs().includes('vd:k:ad'), 'ዓይነት ምርጫ'); sent.length = 0; await cb('vd:k:ad'); assert.ok(kbs().includes('vd:d:30')); sent.length = 0; await cb('vd:d:30'); assert.ok(kbs().includes('vd:f:v')); sent.length = 0; await cb('vd:f:v');
    assert.ok(msgs().some(m => /ሀሳቦችዎን ይላኩ/.test(m.text) && /vd:go/.test(JSON.stringify(m.reply_markup))), 'ሀሳብ መሰብሰብ');
    sent.length = 0; await say('የቡና ቤቴ ስም ኢትዮ ቡና ነው፣ ትኩስ ቡና እንሸጣለን'); assert.ok(msgs().some(m => /ጽሑፍ 1/.test(m.text)), 'ጽሑፍ ወደ AI አይሄድም — ይሰበሰባል'); assert.equal(seen.length, 0, 'ሀሳብ ሲሰበሰብ AI አልተጠራም');
    sent.length = 0; await bot.handle({ message: { chat: { id: C, type: 'private' }, from: { id: C }, photo: [{ file_id: 'F1', width: 640, height: 480, file_size: 5000 }], caption: 'የሱቁ ፊት' } }); assert.ok(msgs().some(m => /ፎቶ 1/.test(m.text)), 'ፎቶ ተቀብሏል');
    sent.length = 0; await cb('vd:vo'); assert.ok(msgs().some(m => /ያለ ድምፅ/.test(m.text))); await cb('vd:go');
    assert.equal(vids.length, 1, 'ቪድዮ ተልኳል'); assert.ok(vids[0].size > 5000); assert.equal(vids[0].w, '540'); assert.ok(seen.some(t => /ኢትዮ ቡና/.test(t) && /ፎቶዎች፦ 1/.test(t) && /ማስታወቂያ/.test(t)), 'AI ሀሳቦቹን እና ፎቶውን አይቷል');
    assert.ok(msgs().some(m => /vd:ch/.test(JSON.stringify(m.reply_markup))), 'ለውጥ/ሌላ ስሪት ቁልፍ');
    sent.length = 0; await cb('vd:ch'); await say('ዋጋውን አጉላ'); assert.equal(vids.length, 2, 'ለውጥ → አዲስ ቪድዮ'); assert.ok(seen[seen.length - 1].includes('ዋጋውን አጉላ') && /ቀድሞ የሠራኸው እቅድ/.test(seen[seen.length - 1]));
    sent.length = 0; await say('ለቡና ቤቴ ማስታወቂያ ቪድዮ ስራልኝ'); assert.ok(kbs().includes('vd:d:30'), 'የተፈጥሮ ቋንቋ ጥያቄ → ዓይነት ተለይቶ ወደ ርዝማኔ'); await cb('vd:x');
  } finally { global.fetch = realFetch; srv.close(); }
});
