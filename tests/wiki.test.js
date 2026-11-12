const test = require('node:test'), assert = require('node:assert'), W = require('../server/wiki');
test('wiki፦ ጥያቄ ተለይቶ ይፈለጋል፤ ሰላምታ/ትዕዛዝ አይፈለግም፤ ቋንቋ ይመረጣል፤ ውድቀት ዝም ይላል', async () => {
  process.env.AI_WIKI = '1'; const seen = [], mk = body => async url => { seen.push(url); return { ok: true, json: async () => body }; };
  const body = { query: { pages: { 1: { title: 'Nile', index: 1, extract: 'The Nile is a major north-flowing river in northeastern Africa, the longest in the world by some measures.', fullurl: 'https://en.wikipedia.org/wiki/Nile' } } } };
  const r = await W.lookup('What is the length of the Nile?', { fetchImpl: mk(body) }); assert.equal(r.length, 1); assert.match(seen[0], /^https:\/\/en\.wikipedia\.org/); assert.match(W.asContext(r), /Wikipedia[\s\S]*Nile/);
  await W.lookup('የዓባይ ወንዝ ርዝመት ስንት ነው?', { fetchImpl: mk({ query: { pages: {} } }) }); assert.match(seen[1], /^https:\/\/am\.wikipedia\.org/);
  const n = seen.length; assert.deepEqual(await W.lookup('ሰላም', { fetchImpl: mk(body) }), []); assert.deepEqual(await W.lookup('/start', { fetchImpl: mk(body) }), []); assert.equal(seen.length, n, 'አልተፈለገም');
  assert.deepEqual(await W.lookup('Who was Menelik II of Ethiopia?', { fetchImpl: async () => { throw new Error('net'); } }), []);
  assert.deepEqual(await W.lookup('Why is the sky blue today?', { fetchImpl: async () => ({ ok: false, status: 500 }) }), []);
  process.env.AI_WIKI = '0'; assert.deepEqual(await W.lookup('What is the Nile?', { fetchImpl: mk(body) }), []); delete process.env.AI_WIKI;
});
test('aisvc፦ የ AI መልእክት (system) ውስጥ የ Wikipedia ማጣቀሻ ይገባል', async () => {
  process.env.ANTHROPIC_API_KEY = 'k'; process.env.AI_WIKI = '1'; const realFetch = global.fetch; let sys = '';
  global.fetch = async (url, o) => {
    if (/wikipedia\.org/.test(url)) return { ok: true, status: 200, json: async () => ({ query: { pages: { 1: { title: 'Lalibela', index: 1, extract: 'Lalibela is a town in the Amhara Region of Ethiopia, famous for its rock-hewn churches built in the 12th century.', fullurl: 'https://en.wikipedia.org/wiki/Lalibela' } } } }) };
    if (/anthropic/.test(url)) { sys = JSON.parse(o.body).system; return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: 'መልስ' }] }), text: async () => '' }; }
    return realFetch(url, o); };
  try {
    const svc = require('../server/aisvc')({ app: { get() { }, post() { } }, col: (() => { const d = {}; return p => d[p] || (d[p] = {}); })(), who: () => null, adminOnly: () => false, saveMany: async () => { }, bad() { }, S: (x, n) => String(x == null ? '' : x).slice(0, n || 1e9), N: Number, nid: () => 'x' + Math.random(), limit: () => true, ai: require('../server/ai').shared() });
    const r = await svc.converse({ uid: 'U1', key: 'k1', text: 'What is Lalibela famous for?', admin: true }); assert.ok(r.ok); assert.match(JSON.stringify(sys), /Wikipedia[\s\S]*rock-hewn/);
  } finally { global.fetch = realFetch; delete process.env.AI_WIKI; }
});
