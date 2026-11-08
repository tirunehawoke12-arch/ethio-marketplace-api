const test = require('node:test'), assert = require('node:assert/strict');
let PDFDocument = null; try { ({ PDFDocument } = require('pdf-lib')); } catch (e) { }

test('መጻሕፍት፦ በ URL ዝርዝር መጫን፣ በክፍል ማደራጀት፣ ትልቅ PDF በክፍል-ክፍል ማስተማር', { skip: !PDFDocument && 'pdf-lib የለም' }, async () => {
  process.env.ANTHROPIC_API_KEY = 'k'; const reqs = [];
  const doc = await PDFDocument.create(); for (let i = 0; i < 100; i++) doc.addPage([200, 200]); const big = Buffer.from(await doc.save());
  const realFetch = global.fetch; global.fetch = async (url, o) => {
    if (/anthropic/.test(url)) { const b = JSON.parse(o.body), last = b.messages[b.messages.length - 1].content, d = Array.isArray(last) ? last.find(x => x.type === 'document') : null; reqs.push({ doc: d ? Buffer.from(d.source.data, 'base64').length : 0, txt: Array.isArray(last) ? last.map(x => x.text || '').join('') : last }); return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: 'ትምህርት' }] }) }; }
    if (/books\.test/.test(url)) return { ok: true, status: 200, headers: { get: () => String(big.length) }, arrayBuffer: async () => big.buffer.slice(big.byteOffset, big.byteOffset + big.byteLength) };
    return { ok: true, status: 200, json: async () => ({ ok: true, items: [] }), text: async () => '' };
  };
  const sent = []; const tg = async (m, p) => { sent.push([m, p]); return { ok: true }; };
  const svc = require('../server/aisvc')({ app: { get() { }, post() { } }, col: (() => { const d = {}; return p => d[p] || (d[p] = {}); })(), who: () => null, adminOnly: () => false, saveMany: async () => { }, bad() { }, S: x => String(x == null ? '' : x), N: Number, nid: () => 'x' + Math.random(), limit: () => true, ai: require('../server/ai').shared() });
  const bot = require('../server/bot')({ aisvc: svc, tg, tokFor: () => 't', port: 1, baseUrl: 'https://x.et', adminChat: '999', bindAdmin() { }, adminPhone: '', token: 'T', getDb: () => ({ accounts: { k: { chatId: 1 } } }), getStore: () => ({ docs: { 'data/users/U1': { acct: { name: 'ተ' } } } }), accKey: () => 'k', findUid: () => 'U1', normPhoneET: x => x, authApi: {}, pool: null, pgUpsert: async () => { }, isSusp: () => false });
  const msgs = () => sent.filter(x => x[0] === 'sendMessage').map(x => x[1]), cb = (c, d) => bot.handle({ callback_query: { id: 'q' + Math.random(), data: d, message: { chat: { id: c, type: 'private' } } } }), say = (c, t) => bot.handle({ message: { chat: { id: c, type: 'private' }, text: t } });
  try {
    const lines = ['9 | ባዮሎጂ 9 | https://books.test/bio9.pdf', '9 | ኬሚስትሪ 9 | https://books.test/chem9.pdf', '10 | Physics 10 | https://books.test/phy10.pdf', '11 | Math 11 | https://books.test/math11.pdf', '12 | Geography 12 | https://books.test/geo12.pdf', '12 | History 12 | https://books.test/his12.pdf', '9 | English 9 | https://books.test/en9.pdf', '10 | Civics 10 | https://books.test/civ10.pdf', '| ሌላ | https://books.test/other.pdf', 'ያለ ሊንክ መስመር', '9 | ባዮሎጂ 9 | https://books.test/bio9.pdf'];
    await say(999, '/booksadd\n' + lines.join('\n')); const rep = msgs().at(-1).text; assert.match(rep, /9 መጻሕፍት ተጨመሩ/); assert.match(rep, /1 ተደጋጋሚ/); assert.match(rep, /1 መስመሮች URL የላቸውም/);
    sent.length = 0; await cb(1, 'bk:l:0'); const gm = JSON.stringify(msgs().at(-1).reply_markup); assert.match(gm, /bk:g:9/); assert.match(gm, /9ኛ ክፍል \(3\)/); assert.match(gm, /bk:g:12/);
    sent.length = 0; await cb(1, 'bk:g:9'); const l9 = msgs().at(-1); assert.match(l9.text, /9ኛ ክፍል/); const ids = [...JSON.stringify(l9.reply_markup).matchAll(/bk:o:(\w+)/g)].map(x => x[1]); assert.equal(ids.length, 3);
    sent.length = 0; await cb(1, 'bk:o:' + ids[0]); assert.ok(msgs().some(m => /ምን ላድርግ/.test(m.text)), 'ከ URL ወርዶ ተከፈተ');
    sent.length = 0; await cb(1, 'fk:tc'); const all = msgs().map(m => m.text).join('\n'); assert.match(all, /ክፍል 1 — ገጽ 1–3/); assert.match(all, /ክፍል 34 — ገጽ 100–100/);
    const r1 = reqs.at(-1); assert.ok(r1.doc > 0 && r1.doc < big.length * 0.5, 'የአሁኑ ክፍል ገጾች ብቻ ተልከዋል (' + r1.doc + ' vs ' + big.length + ')'); assert.match(r1.txt, /ገጾች \(1–3\)/);
  } finally { global.fetch = realFetch; delete process.env.ANTHROPIC_API_KEY; }
});
