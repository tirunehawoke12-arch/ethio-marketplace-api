const test = require('node:test'), assert = require('node:assert'), http = require('node:http');
const G = require('../server/gendoc');
const SPEC = { title: 'ሴል', subtitle: 'ባዮ', sections: [{ h: 'መግቢያ', blocks: [{ k: 'p', t: 'H₂O ≥ 3 ± 0.5 √x π α' }, { k: 'ul', items: ['ሀ', 'ለ'] }, { k: 'bad', t: 'x' }] }, { h: 'ሠንጠረዥ', blocks: [{ k: 'table', head: ['ስም', 'ዋጋ'], rows: Array.from({ length: 60 }, (_, i) => ['ንጥል ' + i, String(i * 1.5)]) }] }] };
test('ከባዶ ፋይል፦ 4 ፎርማቶች ትክክለኛ ፋይል ይሆናሉ፤ ግብዓት ይጸዳል', async () => {
  const n = G.norm({ title: 5, sections: [{ h: 'x', blocks: [{ k: 'evil', t: 'a' }, { k: 'table', head: ['a'], rows: [['1', '2', '3']] }, null] }, 7] }); assert.equal(n.sections.length, 1); assert.equal(n.sections[0].blocks[0].n, 3, 'ሠንጠረዥ ዓምዶች ይስተካከላሉ'); assert.equal(n.sections[0].blocks[0].head.length, 3);
  const pdf = G.build('pdf', SPEC); assert.equal(pdf.buf.slice(0, 5).toString(), '%PDF-'); assert.ok(pdf.name.endsWith('.pdf')); assert.ok((pdf.buf.toString('latin1').match(/\/Type \/Page\b/g) || []).length >= 2, 'ረጅም ሠንጠረዥ ብዙ ገጽ');
  for (const f of ['docx', 'pptx', 'xlsx']) { const r = G.build(f, SPEC); assert.equal(r.buf.slice(0, 2).toString(), 'PK', f); const { readZip } = require('../src/lib/pptx'), z = readZip(r.buf); assert.ok(z.names.length >= 4, f); }
  const { readZip } = require('../src/lib/pptx'); const px = readZip(G.build('pptx', SPEC).buf); assert.ok(px.names.filter(x => /^ppt\/slides\/slide\d+\.xml$/.test(x)).length >= 4, 'ሠንጠረዡ በስላይዶች ይከፈላል');
  const xl = readZip(G.build('xlsx', SPEC).buf), sh = await xl.text('xl/worksheets/sheet2.xml'); assert.match(sh, /<c r="B5"><v>1\.5<\/v><\/c>/, 'ቁጥር እንደ ቁጥር'); assert.throws(() => G.build('exe', SPEC), /bad_format/);
  const dx = await readZip(G.build('docx', SPEC).buf).text('word/document.xml'); assert.match(dx, /H₂O ≥ 3 ± 0\.5 √x π α/, 'ምልክቶች ይጠበቃሉ'); assert.match(dx, /<w:tbl>/);
});
test('ቦት፦ ፋይል ማዘጋጀት፣ ማሻሻል፣ መቀየር፣ /new እና ትውስታ', async () => {
  process.env.ANTHROPIC_API_KEY = 'k'; const seen = [], docs = [];
  const srv = http.createServer((q, r) => { r.setHeader('content-type', 'application/json'); r.end(JSON.stringify({ ok: true, items: [] })); }); await new Promise(r => srv.listen(0, r)); const port = srv.address().port;
  const realFetch = global.fetch; global.fetch = async (url, o) => {
    if (/anthropic/.test(url)) { const body = JSON.parse(o.body), last = body.messages[body.messages.length - 1].content, txt = Array.isArray(last) ? last.map(x => x.text || '').join('\n') : last; seen.push({ sys: body.system, txt, n: body.messages.length }); return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: /ባለሙያ ሰነድ አዘጋጅ/.test(body.system) ? JSON.stringify(SPEC) : 'መልስ' }] }) }; }
    if (/api\.telegram\.org\/bot.*sendDocument/.test(url)) { docs.push(o.body.get('document').name); return { ok: true, status: 200 }; }
    return realFetch(url, o); };
  const sent = [], tg = async (m, p) => { sent.push([m, p]); return { ok: true }; };
  const svc = require('../server/aisvc')({ app: { get() { }, post() { } }, col: (() => { const d = {}; return p => d[p] || (d[p] = {}); })(), who: () => null, adminOnly: () => false, saveMany: async () => { }, bad() { }, S: (x, n) => String(x == null ? '' : x).slice(0, n || 1e9), N: Number, nid: () => 'x' + Math.random(), limit: () => true, ai: require('../server/ai').shared() });
  const bot = require('../server/bot')({ aisvc: svc, tg, tokFor: () => 't', port, baseUrl: 'https://x.et', adminChat: '999', bindAdmin() { }, adminPhone: '', token: 'T', getDb: () => ({ accounts: { k: { chatId: 7 } } }), getStore: () => ({ docs: { 'data/users/U1': { acct: { name: 'ተ' } } } }), accKey: () => 'k', findUid: () => 'U1', normPhoneET: x => x, authApi: {}, pool: null, pgUpsert: async () => { }, isSusp: () => false });
  const msgs = () => sent.filter(x => x[0] === 'sendMessage').map(x => x[1]), say = t => bot.handle({ message: { chat: { id: 7, type: 'private' }, text: t } }), cb = d => bot.handle({ callback_query: { id: 'q' + Math.random(), data: d, message: { chat: { id: 7, type: 'private' } } } });
  try {
    await say('ስለ ሴል ፒፒቲ አዘጋጅልኝ'); assert.equal(docs.length, 1); assert.match(docs[0], /\.pptx$/); assert.ok(seen.at(-1).sys.includes('ባለሙያ ሰነድ አዘጋጅ')); assert.match(seen.at(-1).txt, /PPTX/);
    sent.length = 0; await say('አንድ ስላይድ ጨምር'); assert.equal(docs.length, 2); assert.match(seen.at(-1).txt, /ቀድሞ ያዘጋጀኸው ሰነድ JSON/, 'ቀድሞ የነበረው ሰነድ ይላካል');
    const ai0 = seen.length; await say('ይህን ወደ pdf ቀይር'); assert.equal(docs.length, 3); assert.match(docs[2], /\.pdf$/); assert.equal(seen.length, ai0, 'መቀየር AI አይጠራም');
    sent.length = 0; await say('ሰነድ አዘጋጅልኝ ስለ ጤና'); const ask = msgs().find(m => /gd:a:pdf/.test(JSON.stringify(m.reply_markup))); assert.ok(ask, 'ፎርማት ይጠየቃል'); await cb('gd:a:docx'); assert.match(docs[3], /\.docx$/);
    await say('እንዴት pdf አዘጋጃለሁ?'); assert.equal(docs.length, 4, 'የማብራሪያ ጥያቄ ፋይል አይሠራም');
    // ትውስታ
    await say('ስሜ አበበ ነው'); const n1 = seen.at(-1).n; await say('ስሜ ማን ነው?'); assert.ok(seen.at(-1).n >= n1 + 2, 'ቀድሞ የተነገረው ይታወሳል');
    svc.resetChat(7); await say('እና ስሜ?'); assert.ok(seen.at(-1).n >= 3, 'ከ RAM ቢጠፋም ከተቀመጠው ይመለሳል');
    sent.length = 0; await say('/new'); assert.ok(msgs().some(m => /አዲስ ውይይት/.test(m.text))); await say('ሰላም'); assert.equal(seen.at(-1).n, 1, '/new በኋላ ታሪክ ባዶ ነው');
    await say('ይህን ወደ xlsx ቀይር'); assert.equal(docs.length, 4, '/new የቀድሞውን ሰነድ ይረሳል');
  } finally { global.fetch = realFetch; srv.close(); delete process.env.ANTHROPIC_API_KEY; }
});

test('AI፦ የዛሬ ጥያቄ → የድር ፍለጋ + የአሁን ቀን/ሰዓት፤ ተራ ሰላምታ → ፍለጋ የለም', async () => {
  const ai = require('../server/ai'), bodies = [];
  const f = async (u, o) => { bodies.push(JSON.parse(o.body)); return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'መልስ' }] }, groundingMetadata: { groundingChunks: [{ web: { uri: 'https://a.et', title: 'A' } }] } }] }) }; };
  const a = ai.create({ GEMINI_API_KEY: 'k' }, f); const r = await a.chat('t1', 'የዛሬ ዜና ምንድን ነው?');
  assert.ok(bodies[0].tools && /google_search/.test(JSON.stringify(bodies[0].tools))); assert.match(bodies[0].systemInstruction.parts[0].text, /አሁን፦.*ዓ\.ም/); assert.match(r, /ምንጮች/);
  await a.chat('t1', 'ሰላም'); assert.ok(!bodies[1].tools);
});

test('AI፦ ዋናው ሲሞላ (429) ወደ ተጨማሪ ነፃ AI ይሸጋገራል፤ ፋይል ሲሆን አይሸጋገርም፤ ያለ ተጨማሪ ቁልፍ ባህሪ አልተቀየረም', async () => {
  const ai = require('../server/ai'), urls = [];
  const f = async (u, o) => { urls.push(u); if (/googleapis/.test(u)) return { ok: false, status: 429, json: async () => ({ error: { message: 'quota' } }) }; return { ok: true, status: 200, json: async () => ({ choices: [{ message: { content: 'ከነፃው AI' } }] }) }; };
  const a = ai.create({ GEMINI_API_KEY: 'k', GROQ_API_KEY: 'g', AI_RETRY_MS: '0' }, f); assert.deepEqual(a.extras, ['groq']);
  assert.equal(await a.chat('x1', 'ሰላም'), 'ከነፃው AI'); assert.ok(urls.some(u => /groq\.com\/openai\/v1\/chat\/completions/.test(u)));
  await assert.rejects(() => a.chat('x3', 'ይህን አንብብ', null, { mime: 'image/png', buf: Buffer.from('a') }), /ai_busy/);
  const b = ai.create({ GEMINI_API_KEY: 'k', AI_RETRY_MS: '0' }, f); assert.deepEqual(b.extras, []); await assert.rejects(() => b.chat('x2', 'ሰላም'), /ai_busy/);
});

test('AI፦ ground አማራጭ ተራ ጥያቄም ላይ ፍለጋ ያስነሳል (/search)', async () => {
  const ai = require('../server/ai'), bodies = [];
  const f = async (u, o) => { bodies.push(JSON.parse(o.body)); return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'መልስ' }] } }] }) }; };
  const a = ai.create({ GEMINI_API_KEY: 'k' }, f); await a.chat('s1', 'ሰላም'); assert.ok(!bodies[0].tools); await a.chat('s1', 'ሰላም', null, null, { ground: true }); assert.ok(bodies[1].tools);
});

test('AI፦ ፍለጋ ሲጠየቅ lite ሞዴል አይቀድምም፤ ፍለጋ ካልተሳካ ያለ ፍለጋ + ማስጠንቀቂያ', async () => {
  const ai = require('../server/ai'), calls = [];
  let mode = 'ok'; const f = async (u, o) => { const b = JSON.parse(o.body); calls.push({ u, t: !!b.tools }); if (b.tools && mode === 'nosearch') return { ok: false, status: 400, json: async () => ({ error: { message: 'tool unsupported' } }) }; return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'መልስ' }] } }] }) }; };
  const a = ai.create({ GEMINI_API_KEY: 'k' }, f); await a.chat('g1', 'የሮናልዶ ዜና'); assert.ok(calls[0].t && !/lite/.test(calls[0].u), 'ፍለጋ ያለው ሞዴል መጀመሪያ');
  mode = 'nosearch'; calls.length = 0; const r = await a.chat('g2', 'የዛሬ ዜና'); assert.match(r, /ፍለጋ ለጊዜው አልተገኘም \(400/); assert.ok(calls.some(c => !c.t));
});

test('AI፦ Google ፍለጋ ሲከለከል የ Google News ርዕሶች ወደ መልሱ ይጨመራሉ', async () => {
  const ai = require('../server/ai'); let sys = '';
  const rss = '<rss><channel><item><title>Ronaldo quits Portugal squad - BBC</title><link>https://n.example/1</link><pubDate>Fri, 06 Nov 2026 10:00:00 GMT</pubDate><source url="x">BBC</source></item></channel></rss>';
  const ddg = '<a rel="nofollow" class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fbbc.example%2Fronaldo&rut=x">Ronaldo news</a><a class="result__snippet" href="x">He <b>quit</b> the squad</a>';
  const f = async (u, o) => { if (/news\.google\.com/.test(u)) return { ok: true, status: 200, text: async () => rss }; if (/duckduckgo/.test(u)) return { ok: true, status: 200, text: async () => ddg }; const b = JSON.parse(o.body); if (b.tools) return { ok: false, status: 429, json: async () => ({ error: { message: 'limit 0' } }) }; sys = b.systemInstruction.parts[0].text; return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'ሮናልዶ ራሱን አግልሏል' }] } }] }) }; };
  const a = ai.create({ GEMINI_API_KEY: 'k', AI_RETRY_MS: '0' }, f); const r = await a.chat('n1', 'ሮናልዶ ዜና'); assert.match(sys, /Ronaldo quits Portugal/); assert.match(sys, /\[ድር\] Ronaldo news — He quit the squad/); assert.match(r, /bbc\.example\/ronaldo/); assert.match(r, /🔎 ምንጮች[\s\S]*Ronaldo quits/);
});

test('ድምፅ፦ Gemini TTS ሲወድቅ (429) ነፃ መጠባበቂያ mp3 ይሰጣል፤ AI_TTS_FREE=0 ሲሆን አይሰጥም', async () => {
  const ai = require('../server/ai'), urls = [];
  const f = async (u, o) => { urls.push(u); if (/translate_tts/.test(u)) return { ok: true, status: 200, arrayBuffer: async () => new Uint8Array(500).buffer }; return { ok: false, status: 429, json: async () => ({ error: { message: 'quota' } }) }; };
  const a = ai.create({ GEMINI_API_KEY: 'k' }, f); assert.equal(await a.speak('ሰላም'), null);
  const m = await a.speakFree('ሰላም። እንዴት ነህ? ' + 'ሀ'.repeat(300)); assert.ok(Buffer.isBuffer(m) && m.mime === 'audio/mpeg' && m.length >= 1000, 'የተቆራረጡ ተያይዘዋል'); assert.ok(urls.filter(u => /translate_tts/.test(u)).every(u => /tl=am/.test(u)));
  assert.equal(await ai.create({ GEMINI_API_KEY: 'k', AI_TTS_FREE: '0' }, f).speakFree('ሰላም'), null);
});
