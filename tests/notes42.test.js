const test = require('node:test'), assert = require('node:assert'), http = require('node:http'), fs = require('fs');
let PDFDocument; try { ({ PDFDocument } = require('pdf-lib')); } catch (e) { }
async function harness(onAI) {
  process.env.ANTHROPIC_API_KEY = 'k'; const srv = http.createServer((q, r) => { r.setHeader('content-type', 'application/json'); r.end('{}'); }); await new Promise(r => srv.listen(0, r)); const port = srv.address().port, realFetch = global.fetch, state = { file: null, ai: [] };
  global.fetch = async (url, o) => {
    if (/api\.telegram\.org\/file/.test(url)) return { ok: true, arrayBuffer: async () => state.file };
    if (/anthropic/.test(url)) { const b = JSON.parse(o.body), last = b.messages[b.messages.length - 1].content, txt = Array.isArray(last) ? last.map(x => x.text || '').join('\n') : last; state.ai.push({ sys: b.system, txt, doc: Array.isArray(last) && last.some(x => x.type === 'document') }); return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: onAI(b.system, txt) }] }), text: async () => '' }; }
    return realFetch(url, o); };
  const sent = [], tg = async (m, p) => { sent.push([m, p]); return { ok: true, file_path: 'f' }; };
  const svc = require('../server/aisvc')({ app: { get() { }, post() { } }, col: (() => { const d = {}; return p => d[p] || (d[p] = {}); })(), who: () => null, adminOnly: () => false, saveMany: async () => { }, bad() { }, S: (x, n) => String(x == null ? '' : x).slice(0, n || 1e9), N: Number, nid: () => 'x' + Math.random(), limit: () => true, ai: require('../server/ai').shared() });
  const bot = require('../server/bot')({ aisvc: svc, tg, tokFor: () => 't', port, baseUrl: 'https://x.et', adminChat: '7', bindAdmin() { }, adminPhone: '', token: 'T', botUsername: 'B', getDb: () => ({ accounts: { k: { chatId: 7 } } }), getStore: () => ({ docs: { 'data/users/U1': { acct: { name: 'ተ' } } } }), accKey: () => 'k', findUid: () => 'U1', normPhoneET: x => x, authApi: {}, pool: null, pgUpsert: async () => { }, isSusp: () => false });
  const C = 7, T = () => sent.filter(x => x[0] === 'sendMessage').map(x => x[1].text).join('\n'), K = () => JSON.stringify(sent.map(x => x[1].reply_markup || ''));
  return { state, sent, T, K, say: t => bot.handle({ message: { chat: { id: C, type: 'private' }, from: { id: C }, text: t, message_id: 1 } }), cb: d => bot.handle({ callback_query: { id: 'q' + Math.random(), data: d, message: { chat: { id: C, type: 'private' } } } }), doc: (name, mime) => bot.handle({ message: { chat: { id: C, type: 'private' }, from: { id: C }, document: { file_id: 'F', file_name: name, mime_type: mime, file_size: 100 }, message_id: 2 } }), done: () => { global.fetch = realFetch; srv.close(); } };
}
test('አጭር ማስታወሻ፦ PDF ሁሉም ገጽ በክፍሎች (ትይዩ) በቅደም ተከተል፤ ክልል 5-8 ብቻ ይሠራል', { skip: !PDFDocument && 'pdf-lib የለም' }, async () => {
  const h = await harness((sys, txt) => (/short note/.test(sys) ? '• ነጥብ ለ ' + (/ክፍል፦ ([^።]+)/.exec(txt) || [])[1] : 'መልስ'));
  try {
    const d = await PDFDocument.create(); for (let i = 0; i < 10; i++) d.addPage([200, 200]); h.state.file = Buffer.from(await d.save());
    await h.doc('book.pdf', 'application/pdf'); assert.ok(h.K().includes('fk:nt')); h.sent.length = 0; await h.cb('fk:nt'); assert.ok(/10 ገጾች/.test(h.T()) && h.K().includes('nt:all:m') && h.K().includes('nt:rg:m'), 'ወሰን ይጠይቃል');
    h.sent.length = 0; h.state.ai.length = 0; await h.cb('nt:all:m'); const out = h.T(); assert.equal(h.state.ai.length, 4, '10 ገጽ / 3 = 4 ክፍሎች'); assert.ok(h.state.ai.every(x => x.doc), 'የገጽ ቅንጣት PDF ተላከ');
    const pos = ['ገጽ 1–3', 'ገጽ 4–6', 'ገጽ 7–9', 'ገጽ 10'].map(x => out.indexOf('ነጥብ ለ ' + x)); assert.ok(pos.every(p => p >= 0) && pos.every((p, i) => !i || p > pos[i - 1]), 'በቅደም ተከተል'); assert.ok(/ተጠናቀቀ — 4\/4/.test(out));
    h.sent.length = 0; h.state.ai.length = 0; await h.cb('nt:rg:m'); assert.ok(/1–10/.test(h.T())); await h.say('ሰላም'); h.sent.length = 0;
    await h.say('abc'); assert.ok(/ገጹን በቁጥር/.test(h.T()), 'ቁጥር ከሌለ ይጠይቃል'); h.sent.length = 0; await h.say('ከገጽ 5 እስከ 8'); assert.equal(h.state.ai.length, 2, '5-8 = 4 ገጽ → 2 ክፍሎች (3+1)'); assert.ok(/ገጽ 5–7/.test(h.T()) && /ገጽ 8/.test(h.T()) && !/ገጽ 9/.test(h.T()));
    h.sent.length = 0; h.state.ai.length = 0; await h.say('ከገጽ 2 እስከ 3 short note አዘጋጅ በጣም አጭር'); assert.equal(h.state.ai.length, 1); assert.match(h.state.ai[0].sys, /2-4 ነጥብ/); h.sent.length = 0; await h.say('short note ገጽ 99'); assert.ok(/ከ1 እስከ 10/.test(h.T()));
  } finally { h.done(); }
});
test('አጭር ማስታወሻ፦ PPTX ስላይዶች (ምርጫ 2) እና TXT ፋይል', async () => {
  const h = await harness((sys, txt) => (/short note/.test(sys) ? '• ማስታወሻ' : 'መልስ'));
  try {
    h.state.file = fs.readFileSync(__dirname + '/fixtures/sample.pptx'); await h.doc('s.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'); h.sent.length = 0; await h.say('አጭር ማስታወሻ ስላይድ 2 አዘጋጅ');
    assert.equal(h.state.ai.length, 1); assert.ok(!h.state.ai[0].doc && /ስላይድ 2/.test(h.state.ai[0].txt), 'የ 2ኛ ስላይድ ጽሑፍ ብቻ'); assert.ok(/ተጠናቀቀ — 1\/1/.test(h.T()));
    h.state.file = Buffer.from('ሰላም '.repeat(4000)); h.state.ai.length = 0; await h.doc('n.txt', 'text/plain'); h.sent.length = 0; await h.cb('fk:nt'); assert.ok(h.state.ai.length >= 2 && /ተጠናቀቀ/.test(h.T()), 'ረጅም ጽሑፍ በክፍሎች');
  } finally { h.done(); }
});
test('AI ጥያቄ፦ የመረዳት መመሪያ ወደ system ይገባል፤ ዜና/ሳይት/ዊኪ ትይዩ ናቸው', async () => {
  const h = await harness(() => 'መልስ');
  try { await h.say("yeabay wenz sint kilo meter new"); const s = JSON.stringify(h.state.ai[0].sys); assert.match(s, /ጥያቄን መረዳት/); assert.match(s, /ላቲን ፊደል/); } finally { h.done(); }
});
test('ትርጉም፦ የቴክኒክ ቃል በድምፅ ብቻ አይጻፍም — ትርጉሙ ይነገራል (TR + SYS)', () => {
  const AI = require('../server/ai'); assert.match(AI.TR, /ትራኪዮስቶሚ[\s\S]*ማለት በአንገት/); assert.match(AI.TR, /በድምፅ ብቻ አትጻፍ/); assert.match(AI.SYS, /ትራኪዮስቶሚ[\s\S]*ማለት/);
});
