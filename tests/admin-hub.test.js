const test = require('node:test'), assert = require('node:assert');
function harness() {
  const routes = [], mk = m => (p, ...h) => routes.push({ m, p, h }), app = { get: mk('GET'), post: mk('POST'), put: mk('PUT'), delete: mk('DELETE'), patch: mk('PATCH') };
  const docs = {}, col = p => docs[p] || (docs[p] = {}), msgs = [];
  [['b1', 'ገዥ በቀለ'], ['s1', 'ሻጭ ካሳ']].forEach(([u, n], i) => { docs['data/users/' + u] = { acct: { email: u + '@x.com', phone: '09110000' + i, name: n, ts: Date.now() - i * 1000 }, prefs: {} }; });
  col('mk/shops').SH = { id: 'SH', uid: 's1', name: 'ሰላም ሱቅ', status: 'pending', city: 'አዲስ አበባ', ts: Date.now() };
  col('mk/products').P1 = { id: 'P1', shopId: 'SH', title: 'ሻይ ቅጠል', price: 50, stock: 3, status: 'active', ts: Date.now() };
  col('mk/orders').O1 = { id: 'O1abcdef12', shopId: 'SH', shopName: 'ሰላም ሱቅ', status: 'payment_submitted', total: 500, ts: Date.now() };
  col('mk/orders').O2 = { id: 'O2abcdef12', shopId: 'SH', shopName: 'ሰላም ሱቅ', status: 'paid', total: 700, ts: Date.now() };
  const ctx = { app, col, bump() {}, pool: null, pgUpsert: async () => {}, persist() {}, readTok: q => q.tok, limit: () => true, notifyUser: (u, t) => msgs.push([u, t]), notifyAdmin() {} };
  const mkApi = require('../server/market')(ctx), audits = [];
  require('../server/admin-hub')({ app, col, getStore: () => ({ docs }), notifyUser: ctx.notifyUser, audit: async (...a) => { audits.push(a); }, ops: null, health: { db: false, telegram: true }, ...mkApi });
  const call = async (m, path, { tok, body, params, query } = {}) => { const r = routes.find(x => x.m === m && x.p === path); const out = { code: 200 }; const res = { status(c) { out.code = c; return this; }, json(j) { out.json = j; return this; }, set() { return this; }, send() { return this; }, sendStatus(c) { out.code = c; return this; } }; await r.h[r.h.length - 1]({ tok, body: body || {}, params: params || {}, ip: '1', headers: {}, query: query || {} }, res); return out; };
  return { call, col, msgs, audits };
}
const A = { u: 'admin', k: 'admin' }, U = { u: 'b1', k: 'user' };
test('አድሚን ማዕከል፦ ለአድሚን ብቻ፣ ቁጥሮች እና ወረፋ ትክክል', async () => {
  const h = harness();
  assert.notEqual((await h.call('GET', '/api/admin/hub', { tok: U })).json && (await h.call('GET', '/api/admin/hub', { tok: U })).json.ok, true);
  const r = (await h.call('GET', '/api/admin/hub', { tok: A })).json;
  assert.equal(r.ok, true); assert.equal(r.counts.users, 2); assert.equal(r.queue.shops, 1); assert.equal(r.queue.payments, 1); assert.equal(r.attention, 2); assert.equal(r.money.gmv, 700); assert.equal(r.health.telegram, true);
});
test('ዓለም-አቀፍ ፍለጋ እና ዕቃ ማገድ (ባለቤት ይነገራል፣ ኦዲት ይጻፋል)', async () => {
  const h = harness();
  const f = (await h.call('GET', '/api/admin/find', { tok: A, query: { q: 'ሰላም' } })).json.items; assert.ok(f.some(x => x.k === 'shop')); assert.ok(f.every(x => x.sub !== undefined));
  assert.ok((await h.call('GET', '/api/admin/find', { tok: A, query: { q: 'b1@x' } })).json.items.some(x => x.k === 'user'));
  assert.equal((await h.call('GET', '/api/admin/find', { tok: U, query: { q: 'ሰላም' } })).json?.items, undefined);
  await h.call('POST', '/api/admin/product/:id/status', { tok: A, params: { id: 'P1' }, body: { status: 'suspended' } });
  assert.equal(h.col('mk/products').P1.status, 'suspended'); assert.equal(h.msgs.length, 1); assert.equal(h.audits[0][0], 'product_off');
  const L = (await h.call('GET', '/api/admin/products', { tok: A, query: { status: 'suspended' } })).json; assert.equal(L.total, 1);
});
test('ባነር፦ ህዝብ ያያል፣ መጥፎ አገናኝ ውድቅ፣ ማስታወቂያ በሰዓት አንድ ጊዜ', async () => {
  const h = harness();
  assert.equal((await h.call('POST', '/api/admin/banner', { tok: A, body: { on: true, text: 'ሰላም', link: 'javascript:x' } })).json.error, 'bad_link');
  await h.call('POST', '/api/admin/banner', { tok: A, body: { on: true, text: 'የበዓል ቅናሽ', tone: 'ok', link: '/shop' } });
  assert.equal((await h.call('GET', '/api/site/banner')).json.banner.text, 'የበዓል ቅናሽ');
  await h.call('POST', '/api/admin/banner', { tok: A, body: { on: false, text: 'x' } }); assert.equal((await h.call('GET', '/api/site/banner')).json.banner, null);
  const c = (await h.call('GET', '/api/admin/broadcast/count', { tok: A })).json.counts; assert.equal(c.all, 2); assert.equal(c.sellers, 1);
  const b = (await h.call('POST', '/api/admin/broadcast', { tok: A, body: { text: 'አዲስ ማስታወቂያ ለሻጮች', audience: 'sellers' } })).json; assert.equal(b.n, 1);
  assert.equal((await h.call('POST', '/api/admin/broadcast', { tok: A, body: { text: 'ሁለተኛ ማስታወቂያ ሞክር', audience: 'all' } })).json.error, 'slow_down');
});
