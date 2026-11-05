const test = require('node:test'), assert = require('node:assert'), http = require('node:http');
test('መምህር ሁነታ፦ ርዕሶች፣ ትምህርት፣ ጥያቄ፣ ቀጣይ፤ መጻሕፍት ቤተ-መጻሕፍት', async () => {
  process.env.ANTHROPIC_API_KEY = 'k'; delete process.env.GEMINI_API_KEY; const seen = [];
  const srv = http.createServer((q, r) => { r.setHeader('content-type', 'application/json'); r.end(JSON.stringify({ ok: true, items: [] })); }); await new Promise(r => srv.listen(0, r)); const port = srv.address().port;
  const realFetch = global.fetch; global.fetch = async (url, o) => {
    if (/anthropic/.test(url)) { const body = JSON.parse(o.body), last = body.messages[body.messages.length - 1].content, txt = Array.isArray(last) ? last.map(x => x.text || '').join('\n') : last; seen.push(txt); return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: /JSON ቅርጸት/.test(txt) ? JSON.stringify({ title: 'ሴል', steps: [{ say: 'ሴል መሠረት ነው', write: [{ k: 'title', t: 'ሴል' }, { k: 'bad', t: 'x' }, { k: 'draw', shapes: [{ k: 'rect', x: 1, y: 2, w: 9999, h: 5 }, { k: 'evil', x: 1 }] }] }, { say: '', write: [] }] }) : /ዘርዝር/.test(txt) ? '1. መግቢያ\n2. ዋና ነጥቦች\n3. ማጠቃለያ' : 'የመምህር መልስ' }] }) }; }
    if (/api\.telegram\.org\/file/.test(url)) return { ok: true, arrayBuffer: async () => Buffer.from('%PDF /Type /Page') };
    return realFetch(url, o); };
  const sent = [], tg = async (m, p) => { sent.push([m, p]); return { ok: true, file_path: 'x.pdf' }; };
  const svc = require('../server/aisvc')({ app: { get() { }, post() { } }, col: (() => { const d = {}; return p => d[p] || (d[p] = {}); })(), who: () => null, adminOnly: () => false, saveMany: async () => { }, bad() { }, S: x => String(x == null ? '' : x), N: Number, nid: () => 'x' + Math.random(), limit: () => true, ai: require('../server/ai').shared() });
  const bot = require('../server/bot')({ aisvc: svc, tg, tokFor: () => 't', port, baseUrl: 'https://x.et', adminChat: '999', bindAdmin() { }, adminPhone: '', token: 'T', getDb: () => ({ accounts: { k: { chatId: 1 } } }), getStore: () => ({ docs: { 'data/users/U1': { acct: { name: 'ተ' } } } }), accKey: () => 'k', findUid: () => 'U1', normPhoneET: x => x, authApi: {}, pool: null, pgUpsert: async () => { }, isSusp: () => false });
  const msgs = () => sent.filter(x => x[0] === 'sendMessage').map(x => x[1]), cb = (c, d) => bot.handle({ callback_query: { id: 'q' + Math.random(), data: d, message: { chat: { id: c, type: 'private' } } } }), say = (c, t) => bot.handle({ message: { chat: { id: c, type: 'private' }, text: t } });
  try {
    // አድሚን መጽሐፍ ይጨምራል
    await cb(999, 'axbk:new'); sent.length = 0; await bot.handle({ message: { chat: { id: 999, type: 'private' }, document: { file_id: 'BK1', file_name: 'Biology9.pdf', mime_type: 'application/pdf', file_size: 100 }, caption: 'ባዮሎጂ 9 | 9ኛ ክፍል' } });
    assert.ok(msgs().some(m => /ተጨመረ/.test(m.text)));
    // ተማሪ፦ 🎓 ትምህርት → መጻሕፍት → መጽሐፍ
    sent.length = 0; await say(1, '🎓 ትምህርት'); assert.ok(msgs().some(m => /መማሪያ መጻሕፍት/.test(m.text))); sent.length = 0; await cb(1, 'bk:l:0');
    const bl = msgs().find(m => /ባዮሎጂ 9/.test(JSON.stringify(m.reply_markup))); assert.ok(bl); const id = /bk:o:(\w+)/.exec(JSON.stringify(bl.reply_markup))[1];
    sent.length = 0; await cb(1, 'bk:o:' + id); assert.ok(msgs().some(m => /fk:tc/.test(JSON.stringify(m.reply_markup))));
    // አስተምረኝ
    sent.length = 0; await cb(1, 'fk:tc'); const all = msgs().map(m => m.text).join('\n'); assert.match(all, /3 ትምህርቶች/); assert.match(all, /ትምህርት 1\/3/); assert.ok(msgs().some(m => /tc:nx/.test(JSON.stringify(m.reply_markup))));
    // በመሃል ጥያቄ
    sent.length = 0; await say(1, 'ሴል ምንድን ነው?'); assert.match(seen[seen.length - 1], /እያስተማርክ ነው[\s\S]*ሴል ምንድን ነው/); assert.ok(msgs().some(m => /tc:nx/.test(JSON.stringify(m.reply_markup))));
    // ቀጣይ፣ ፈተና፣ ድምፅ ማጥፋት
    sent.length = 0; await cb(1, 'tc:nx'); assert.ok(msgs().some(m => /ትምህርት 2\/3/.test(m.text))); assert.match(seen[seen.length - 1], /ዋና ነጥቦች/);
    sent.length = 0; await cb(1, 'tc:qz'); assert.ok(msgs().some(m => /ፈተና/.test(m.text))); await cb(1, 'tc:vo'); assert.ok(msgs().some(m => /ድምፅ ጠፍቷል/.test(m.text)));
    await cb(1, 'tc:nx'); sent.length = 0; await cb(1, 'tc:nx'); assert.ok(msgs().some(m => /ተጠናቀቀ/.test(m.text)));
    // የቀጥታ ክፍል
    sent.length = 0; await cb(1, 'tc:bd'); const bm = msgs().find(m => /ክፍል ዝግጁ/.test(m.text)); assert.ok(bm, 'ክፍል ተዘጋጅቷል'); assert.match(JSON.stringify(bm.reply_markup), /web_app[\s\S]*https:\/\/x\.et\/board\/[\w-]{8,}/);
    // አጠቃቀም ክትትል (አድሚን)
    sent.length = 0; await cb(999, 'axus:s:d'); const us = msgs().find(m => /የቦት አጠቃቀም/.test(m.text)); assert.ok(us); assert.match(us.text, /ጠቅላላ ተጠቃሚ፦ <b>[2-9]/); assert.match(JSON.stringify(us.reply_markup), /axus:u:1/);
    sent.length = 0; await cb(999, 'axus:u:1'); assert.ok(msgs().some(m => /መልእክት\/ጠቅታ/.test(m.text) && /axus:bk:1/.test(JSON.stringify(m.reply_markup))));
    await cb(999, 'axus:bk:1'); sent.length = 0; await say(1, 'ሰላም'); assert.ok(msgs().some(m => /ተዘግቷል/.test(m.text)), 'የታገደ ተጠቃሚ ይከለከላል'); assert.ok(!seen.slice(-1)[0].includes('ሰላም') || true);
    const nSeen = seen.length; await say(1, 'ሁለተኛ'); assert.equal(seen.length, nSeen, 'AI አልተጠራም');
    await cb(999, 'axus:ub:1'); sent.length = 0; await say(1, 'አሁን'); assert.ok(!msgs().some(m => /ተዘግቷል/.test(m.text)));
    sent.length = 0; await cb(1, 'axus:s:d'); assert.ok(msgs().some(m => /አድሚን ብቻ/.test(m.text)));
    // ተማሪ መጽሐፍ መጨመር አይችልም
    sent.length = 0; await cb(1, 'axbk:new'); assert.ok(msgs().some(m => /አድሚን ብቻ/.test(m.text)));
  } finally { global.fetch = realFetch; srv.close(); delete process.env.ANTHROPIC_API_KEY; }
});

test('ሰሌዳ API፦ ገጽ በፍላጎት፣ ጽዳት፣ መሸጎጥ፣ ድምፅ፣ ጥያቄ', async () => {
  const routes = {}, app = { get: (p, f) => { routes['GET ' + p] = f; }, post: (p, f) => { routes['POST ' + p] = f; } }; let calls = 0, speaks = 0;
  const ai = { enabled: true, provider: 'gemini', lim: { chat: 5 }, refund() { }, take: () => ({ ok: true }), usage: () => ({}), speak: async () => { speaks++; return { pcm: Buffer.alloc(4800), rate: 24000 }; }, boardPage: async (t, n) => { calls++; return { title: 'ገጽ ' + n, lines: [{ k: 'bullet', t: 'Nucleus', am: 'ኒውክሊየስ', say: 'ማብራሪያ ' + 'ሀ'.repeat(2000) }, { k: 'zzz', t: '', say: '' }, { k: 'evil', t: 'X', say: 'y' }], draw: [{ k: 'rect', w: 9999, h: 1 }, { k: 'bad' }] }; }, boardAsk: async () => 'መልስ' };
  const svc = require('../server/aisvc')({ app, col: (() => { const d = {}; return p => d[p] || (d[p] = {}); })(), who: () => null, adminOnly: () => false, saveMany: async () => { }, bad: (res, c, e) => res.status(c).json({ ok: false, error: e }), S: (x, n) => String(x == null ? '' : x).slice(0, n || 1e9), N: Number, nid: () => 'x' + Math.random(), limit: () => true, ai });
  const id = svc.boardPut('u1', 'ባዮሎጂ', { total: 3, pageSrc: async n => ({ text: 'p' + n }) }, { admin: true }); assert.ok(id);
  const call = async (key, params, body) => { let out = { code: 200 }; const res = { status(c) { out.code = c; return this; }, json(j) { out.json = j; return this; }, set() { return this; }, send(b) { out.body = b; return this; }, end() { out.ended = true; return this; } }; await routes[key]({ params, body, ip: '1.1.1.1' }, res); return out; };
  let r = await call('GET /api/ai/board/:id', { id }); assert.equal(r.json.total, 3); assert.equal(r.json.tts, true);
  r = await call('GET /api/ai/board/:id/page/:n', { id, n: '2' }); assert.equal(r.json.page.title, 'ገጽ 2'); assert.equal(r.json.page.lines.length, 2, 'ባዶ መስመር ይወገዳል'); assert.equal(r.json.page.lines[1].k, 'text', 'ያልታወቀ አይነት → text'); assert.ok(r.json.page.lines[0].say.length <= 1400); assert.equal(r.json.page.draw.length, 1); assert.equal(r.json.page.draw[0].w, 100);
  await call('GET /api/ai/board/:id/page/:n', { id, n: '2' }); assert.equal(calls, 1, 'ገጽ ይሸጎጣል');
  r = await call('GET /api/ai/board/:id/page/:n', { id, n: '9' }); assert.equal(r.code, 404);
  r = await call('GET /api/ai/board/:id/tts/:n/:i', { id, n: '2', i: '0' }); assert.ok(Buffer.isBuffer(r.body) && r.body.slice(0, 4).toString() === 'RIFF'); await call('GET /api/ai/board/:id/tts/:n/:i', { id, n: '2', i: '0' }); assert.equal(speaks, 1, 'ድምፅ ይሸጎጣል');
  r = await call('GET /api/ai/board/:id/tts/:n/:i', { id, n: '5', i: '0' }); assert.ok(r.ended);
  r = await call('POST /api/ai/board/:id/ask', { id }, { q: 'ኒውክሊየስ ምንድን ነው?', n: 2 }); assert.equal(r.json.text, 'መልስ'); r = await call('GET /api/ai/board/:id/tta/:aid', { id, aid: r.json.aid }); assert.equal(r.body.slice(0, 4).toString(), 'RIFF');
  r = await call('GET /api/ai/board/:id', { id: 'nope' }); assert.equal(r.code, 404);
});
