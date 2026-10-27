const test = require('node:test'), assert = require('node:assert'), http = require('node:http');
/* ቦቱ አዲስ ቁልፎች ላይ አይሰበርም (ReferenceError ወዘተ) — የሐሰት API እና የሐሰት Telegram */
test('ቦት v16 ፍሰቶች ያለስህተት ይሰራሉ', async () => {
  const calls = [], errs = [];
  const srv = http.createServer((q, r) => { let u = q.url.split('?')[0], j = { ok: true, items: [], groups: [], kinds: {}, requests: [], reports: [], counts: { shops: 0, products: 0, orders: 0, gmv: 0, commission: 0 }, config: { commission: 5 }, payments: [], pendingShops: [], toSettle: [], refunds: [], disputes: [], thread: { id: 'T', label: 'ሻጭ' }, set: ['ሱቅ'], cleared: 1, shop: { id: 'SH', name: 'ሱቅ', kind: 'k', city: 'c', region: 'r', address: 'a', delivery: { pickup: 1, fee: 0, local: 1 }, rating: 0, reviews: 0, tags: [], payments: [], methods: [] }, products: [] };
    if (/nearby/.test(u)) j.items = [{ id: 'SH', name: 'ሱቅ', km: 1.2 }]; if (/alerts$/.test(u) && q.method === 'GET') j.items = [{ id: 'A1', q: 'ሶፋ', kind: 'products' }], j.kinds = { products: '🛍' };
    if (/threads/.test(u)) j.items = [{ id: 'T', label: 'ሻጭ', unread: 1, last: { text: 'ሰላም' } }]; if (/chat\/thread\/T/.test(u)) j.items = [{ mine: false, text: 'ሰላም' }];
    r.setHeader('content-type', 'application/json'); r.end(JSON.stringify(j)); });
  await new Promise(r => srv.listen(0, r)); const port = srv.address().port;
  const sent = []; const tg = async (m, p) => { sent.push([m, p]); return { ok: true }; };
  const docs = { 'data/users/U1': { acct: { email: 'a@b', phone: '0911', name: 'ተጠቃሚ' } } };
  const origErr = console.error; console.error = (...a) => errs.push(a.map(x => x && x.stack || x).join(' '));
  const bot = require('../server/bot')({ tg, tokFor: () => 't', port, baseUrl: 'https://x.et', adminChat: '1', bindAdmin() {}, adminPhone: '', token: 'T', getDb: () => ({ accounts: { k: { chatId: 1 } } }), getStore: () => ({ docs }), accKey: () => 'k', findUid: () => null, normPhoneET: x => x, authApi: { setPref() {} }, pool: null, pgUpsert() {}, isSusp: () => false, botUsername: 'TestBot' });
  const cb = d => bot.handle({ callback_query: { id: '1', data: d, message: { chat: { id: 1, type: 'private' } } } });
  const tx = t => bot.handle({ message: { chat: { id: 1, type: 'private' }, text: t } });
  try {
    for (const d of ['alerts', 'aln', 'alq', 'aldel:A1', 'messages', 'cth:T', 'cr:T', 'cst:s:SH', 'nbk', 'nb:s', 'geoset', 'geosetw', 'geoclr', 'lang', 'lg:en', 'accnw', 'accdg', 'atr', 'abc', 'bcx', 'arp', 'ad']) await cb(d);
    await tx('/near'); await tx('/alerts'); await tx('/messages'); await tx('/lang'); await tx('/start s_ABCD1234');
    await bot.handle({ message: { chat: { id: 1, type: 'private' }, location: { latitude: 9.03, longitude: 38.74 } } });
    await bot.handle({ inline_query: { id: 'iq', query: 'ሶፋ' } });
  } finally { console.error = origErr; srv.close(); }
  assert.deepEqual(errs, []); assert.ok(sent.some(x => x[0] === 'answerInlineQuery'));
});
