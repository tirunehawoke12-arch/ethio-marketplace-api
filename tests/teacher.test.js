const test = require('node:test'), assert = require('node:assert'), http = require('node:http');
test('መምህር ሁነታ፦ ርዕሶች፣ ትምህርት፣ ጥያቄ፣ ቀጣይ፤ መጻሕፍት ቤተ-መጻሕፍት', async () => {
  process.env.ANTHROPIC_API_KEY = 'k'; delete process.env.GEMINI_API_KEY; const seen = [];
  const srv = http.createServer((q, r) => { r.setHeader('content-type', 'application/json'); r.end(JSON.stringify({ ok: true, items: [] })); }); await new Promise(r => srv.listen(0, r)); const port = srv.address().port;
  const realFetch = global.fetch; global.fetch = async (url, o) => {
    if (/anthropic/.test(url)) { const body = JSON.parse(o.body), last = body.messages[body.messages.length - 1].content, txt = Array.isArray(last) ? last.map(x => x.text || '').join('\n') : last; seen.push(txt); return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: /ዘርዝር/.test(txt) ? '1. መግቢያ\n2. ዋና ነጥቦች\n3. ማጠቃለያ' : 'የመምህር መልስ' }] }) }; }
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
    // ተማሪ መጽሐፍ መጨመር አይችልም
    sent.length = 0; await cb(1, 'axbk:new'); assert.ok(msgs().some(m => /አድሚን ብቻ/.test(m.text)));
  } finally { global.fetch = realFetch; srv.close(); delete process.env.ANTHROPIC_API_KEY; }
});
