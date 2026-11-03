const test = require('node:test'), assert = require('node:assert'), http = require('node:http');
const AIM = require('../server/ai');
const mkFetch = (log, fn) => async (url, o) => { const body = JSON.parse(o.body); log.push({ url, body, headers: o.headers }); const r = fn ? fn(body) : { status: 200, text: 'ሰላም' }; return { ok: (r.status || 200) < 300, status: r.status || 200, json: async () => ({ content: [{ type: 'text', text: r.text }] }) }; };

test('AI ንግግር፦ ታሪክ፣ ቁልፍ፣ ሞዴል፣ ገደብ', async () => {
  const log = [], ai = AIM.create({ ANTHROPIC_API_KEY: 'k', AI_CHAT_DAY: '2' }, mkFetch(log));
  assert.equal(AIM.create({}).enabled, false); assert.equal(ai.enabled, true);
  assert.equal(await ai.chat('c1', 'ሰላም'), 'ሰላም'); await ai.chat('c1', 'ሁለተኛ');
  assert.equal(log[1].body.messages.length, 3); assert.equal(log[0].headers['x-api-key'], 'k'); assert.match(log[0].body.model, /claude/); assert.ok(log[0].body.system.includes('አማርኛ'));
  assert.equal(ai.take('u', 'chat').ok, true); assert.equal(ai.take('u', 'chat').ok, true); assert.equal(ai.take('u', 'chat').ok, false); assert.equal(ai.take('u', 'chat', 1, true).ok, true);   // አድሚን ያልተገደበ
  ai.refund('u', 'chat'); assert.equal(ai.take('u', 'chat').ok, true); ai.reset('c1');
});
test('PDF ገጽ በገጽ፦ ሰነዱ cache፣ ገጽ N፣ [[END]]', async () => {
  const log = [], ai = AIM.create({ ANTHROPIC_API_KEY: 'k' }, mkFetch(log, b => ({ text: /ገጽ 3 ብቻ/.test(b.messages[0].content[1].text) ? '[[END]]' : 'ትርጉም' })));
  assert.equal(await ai.pdfPage(Buffer.from('%PDF-1.4'), 1, 2), 'ትርጉም'); assert.equal(await ai.pdfPage(Buffer.from('%PDF-1.4'), 3, 0), null);
  const c = log[0].body.messages[0].content; assert.equal(c[0].type, 'document'); assert.equal(c[0].source.media_type, 'application/pdf'); assert.deepEqual(c[0].cache_control, { type: 'ephemeral' }); assert.match(c[1].text, /ገጽ 1 ብቻ/);
  assert.match(log[0].body.system, /አውዳዊ/);
});
test('PPTX ስላይድ ትርጉም፣ ስህተት ኮዶች፣ ረዳቶች', async () => {
  const log = [], ai = AIM.create({ ANTHROPIC_API_KEY: 'k' }, mkFetch(log)); await ai.slideTr('Bio', { title: 'Cell', blocks: [{ k: 'h', t: 'Cell' }, { k: 'li', t: 'Nucleus', l: 1 }, { k: 'tbl', rows: [['a', 'b']] }] }, 0, 3);
  assert.match(log[0].body.messages[0].content, /Nucleus/); assert.match(log[0].body.messages[0].content, /a \| b/);
  const bad = AIM.create({ ANTHROPIC_API_KEY: 'k' }, mkFetch([], () => ({ status: 429, text: '' }))); await assert.rejects(() => bad.chat('x', 'hi'), /ai_busy/);
  assert.equal(AIM.countPdfPages(Buffer.from('/Type /Pages /Type /Page /Type/Page /Type /Page')), 3);
  const parts = AIM.chunkText(('ሀ'.repeat(1000) + '\n\n').repeat(8), 3600); assert.ok(parts.length >= 3 && parts.every(p => p.length <= 3600));
});
test('ቦት፦ ጽሑፍ → AI፣ PDF ሰነድ → ገጽ በገጽ + «ቀጥል»', async () => {
  process.env.ANTHROPIC_API_KEY = 'k'; process.env.AI_DOC_BATCH = '2'; const errs = [], origErr = console.error; console.error = (...a) => errs.push(a.join(' '));
  const srv = http.createServer((q, r) => { r.setHeader('content-type', 'application/json'); r.end(JSON.stringify({ ok: true, items: [] })); }); await new Promise(r => srv.listen(0, r)); const port = srv.address().port;
  const realFetch = global.fetch, aiLog = []; global.fetch = async (url, o) => {
    if (/anthropic/.test(url)) { const body = JSON.parse(o.body), txt = Array.isArray(body.messages[0].content) ? body.messages[0].content[1].text : body.messages[0].content; aiLog.push(txt); return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: Array.isArray(body.messages[0].content) ? 'ትርጉም ' + /ገጽ (\d+) ብቻ/.exec(txt)[1] : 'የ AI መልስ' }] }) }; }
    if (/api\.telegram\.org\/file/.test(url)) return { ok: true, arrayBuffer: async () => Buffer.from('%PDF /Type /Page /Type /Page /Type /Page') };
    return realFetch(url, o); };
  const sent = [], tg = async (m, p) => { sent.push([m, p]); return { ok: true, file_path: 'x.pdf' }; }, docs = { 'data/users/U1': { acct: { email: 'a@b', phone: '0911', name: 'ተጠቃሚ' } } };
  const svc = require('../server/aisvc')({ app: { get() { }, post() { } }, col: (() => { const d = {}; return p => d[p] || (d[p] = {}); })(), who: () => null, adminOnly: () => false, saveMany: async () => { }, bad() { }, S: x => String(x == null ? '' : x), N: Number, nid: () => 'x' + Math.random(), limit: () => true, ai: require('../server/ai').shared() });
  const bot = require('../server/bot')({ aisvc: svc, tg, tokFor: () => 't', port, baseUrl: 'https://x.et', adminChat: '999', bindAdmin() {}, adminPhone: '', token: 'T', getDb: () => ({ accounts: { k: { chatId: 1 } } }), getStore: () => ({ docs }), accKey: () => 'k', findUid: () => 'U1', normPhoneET: x => x, authApi: {}, pool: null, pgUpsert: async () => { }, isSusp: () => false });
  try {
    await bot.handle({ message: { chat: { id: 1, type: 'private' }, text: 'ኢትዮጵያ ዋና ከተማ?' } }); assert.ok(sent.some(x => x[0] === 'sendMessage' && /የ AI መልስ/.test(x[1].text)));
    sent.length = 0; await bot.handle({ message: { chat: { id: 1, type: 'private' }, document: { file_id: 'F', file_name: 'Book.pdf', mime_type: 'application/pdf', file_size: 1000 } } });
    const msgs = () => sent.filter(x => x[0] === 'sendMessage').map(x => x[1]);
    assert.ok(msgs().some(m => /ገጽ 1\/3/.test(m.text) && /ትርጉም 1/.test(m.text))); assert.ok(msgs().some(m => /ገጽ 2\/3/.test(m.text))); assert.ok(!msgs().some(m => /ገጽ 3\/3/.test(m.text)));
    const cont = msgs().find(m => m.reply_markup && JSON.stringify(m.reply_markup).includes('adn')); assert.ok(cont);
    sent.length = 0; await bot.handle({ callback_query: { id: '1', data: 'adn', message: { chat: { id: 1, type: 'private' } } } });
    assert.ok(msgs().some(m => /ገጽ 3\/3/.test(m.text))); assert.ok(msgs().some(m => /ተጠናቀቀ/.test(m.text)));
    sent.length = 0; await bot.handle({ message: { chat: { id: 1, type: 'private' }, document: { file_id: 'F', file_name: 'a.exe', file_size: 10 } } }); assert.ok(msgs().some(m => /PDF/.test(m.text)));
  } finally { global.fetch = realFetch; console.error = origErr; srv.close(); delete process.env.ANTHROPIC_API_KEY; delete process.env.AI_DOC_BATCH; }
  assert.deepEqual(errs, []);
});
test('Gemini (ነጻ)፦ ቁልፍ በ header፣ የ PDF inlineData፣ ድጋሚ ሙከራ በ 429', async () => {
  const log = []; let n = 0; const f = async (url, o) => { const body = JSON.parse(o.body); log.push({ url, body, headers: o.headers }); n++; if (n === 1) return { ok: false, status: 429, json: async () => ({}) }; return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'የ Gemini ትርጉም' }] } }] }) }; };
  const ai = AIM.create({ GEMINI_API_KEY: 'g', AI_RETRY_MS: '0' }, f); assert.equal(ai.enabled, true); assert.equal(ai.provider, 'gemini');
  assert.equal(await ai.pdfPage(Buffer.from('%PDF'), 2, 5), 'የ Gemini ትርጉም'); assert.equal(n, 2);
  assert.match(log[0].url, /generativelanguage\.googleapis\.com\/v1beta\/models\/.+:generateContent$/); assert.equal(log[0].headers['x-goog-api-key'], 'g'); assert.ok(!/key=/.test(log[0].url));
  const parts = log[0].body.contents[0].parts; assert.equal(parts[0].inlineData.mimeType, 'application/pdf'); assert.match(parts[1].text, /ገጽ 2 ብቻ/); assert.ok(log[0].body.systemInstruction.parts[0].text.includes('አማርኛ'));
  await ai.chat('c', 'ሰላም'); await ai.chat('c', 'ሁለት'); assert.equal(log[log.length - 1].body.contents.map(c => c.role).join(), 'user,model,user');
  assert.equal(AIM.create({ ANTHROPIC_API_KEY: 'a', GEMINI_API_KEY: 'g' }).provider, 'claude'); assert.equal(AIM.create({}).provider, '');
  const big = AIM.create({ GEMINI_API_KEY: 'g' }, f); await assert.rejects(() => big.pdfPage(Buffer.alloc(15 * 1048576), 1, 1), /ai_too_big/);
});
test('AI ስህተት ዝርዝር እና የጊዜ ገደብ', async () => {
  const f = async () => ({ ok: false, status: 400, json: async () => ({ error: { message: 'API key not valid' } }) });
  const ai = AIM.create({ GEMINI_API_KEY: 'bad' }, f); await assert.rejects(() => ai.chat('z', 'hi'), e => e.message === 'ai_failed' && e.status === 400 && /not valid/.test(e.detail));
  const hang = (u, o) => new Promise((_, rej) => o.signal.addEventListener('abort', () => { const e = new Error('x'); e.name = 'AbortError'; rej(e); }));
  await assert.rejects(() => AIM.create({ GEMINI_API_KEY: 'g', AI_TIMEOUT_MS: '30' }, hang).chat('z', 'hi'), /ai_timeout/);
  await assert.rejects(() => AIM.create({ GEMINI_API_KEY: 'g' }, async () => { throw new Error('ENOTFOUND'); }).chat('z', 'hi'), e => e.message === 'ai_network' && /ENOTFOUND/.test(e.detail));
});
test('Gemini ሞዴል ሲሞላ ወደ ሌላ ሞዴል ይሸጋገራል', async () => {
  const urls = []; const f = async (url) => { urls.push(url.match(/models\/([^:]+):/)[1]); const m = urls[urls.length - 1]; if (m === 'gemini-flash-lite-latest') return { ok: false, status: 503, json: async () => ({ error: { message: 'high demand' } }) }; if (m === 'gemini-flash-latest') return { ok: false, status: 404, json: async () => ({ error: { message: 'model not found' } }) }; return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'እሺ' }] } }] }) }; };
  const ai = AIM.create({ GEMINI_API_KEY: 'g', AI_RETRY_MS: '0' }, f); assert.equal(await ai.chat('s', 'hi'), 'እሺ'); assert.deepEqual(urls, ['gemini-flash-lite-latest', 'gemini-flash-latest', 'gemini-2.5-flash-lite']);
  urls.length = 0; await ai.chat('s', 'again'); assert.deepEqual(urls, ['gemini-2.5-flash-lite']);          // የሰራው ይታወሳል
  const all = AIM.create({ GEMINI_API_KEY: 'g', AI_RETRY_MS: '0' }, async () => ({ ok: false, status: 503, json: async () => ({ error: { message: 'busy' } }) })); await assert.rejects(() => all.chat('s', 'x'), /ai_busy/);
  const own = AIM.create({ GEMINI_API_KEY: 'g', GEMINI_MODEL: 'my-model' }, f); urls.length = 0; await own.chat('t', 'x'); assert.equal(urls[0], 'my-model');
});
