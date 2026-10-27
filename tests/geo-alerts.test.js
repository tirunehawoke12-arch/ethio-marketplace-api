const test = require('node:test'), assert = require('node:assert');
function harness() {
  const routes = [], mk = m => (p, ...h) => routes.push({ m, p, h }), app = { get: mk('GET'), post: mk('POST'), put: mk('PUT'), delete: mk('DELETE'), patch: mk('PATCH') };
  const docs = {}, col = p => docs[p] || (docs[p] = {}), msgs = [];
  [['b1', 'ገዥ'], ['s1', 'ሻጭ']].forEach(([u, n]) => { docs['data/users/' + u] = { acct: { email: u + '@x', phone: '0911000000', name: n } }; });
  col('mk/shops').SH = { id: 'SH', uid: 's1', name: 'ሰላም ሱቅ', status: 'active', city: 'አዲስ አበባ' };
  const ctx = { app, col, bump() {}, pool: null, pgUpsert: async () => {}, persist() {}, readTok: q => q.tok, limit: () => true, notifyUser: (u, t, b) => msgs.push([u, t, b]), notifyAdmin() {}, baseUrl: 'https://x.et' };
  const mkApi = require('../server/market')(ctx); require('../server/geo')({ ...ctx, ...mkApi }); const al = require('../server/alerts')({ ...ctx, ...mkApi });
  const call = async (m, path, { tok, body, params, query } = {}) => { const r = routes.find(x => x.m === m && x.p === path); const out = { code: 200 }; const res = { status(c) { out.code = c; return this; }, json(j) { out.json = j; return this; }, set() { return this; }, send() { return this; }, sendStatus(c) { out.code = c; return this; } }; await r.h[r.h.length - 1]({ tok, body: body || {}, params: params || {}, ip: '1', headers: {}, query: query || {} }, res); return out; };
  return { call, col, msgs, al };
}
const B = { u: 'b1', k: 'user' }, S = { u: 's1', k: 'user' };
test('በአቅራቢያ፦ ቦታ ማስቀመጥ፣ ርቀት ብቻ መመለስ፣ ከኢትዮጵያ ውጭ ውድቅ', async () => {
  const h = harness();
  assert.equal((await h.call('POST', '/api/geo/set', { tok: S, body: { lat: 51, lng: 0 } })).json.error, 'bad_location');
  assert.equal((await h.call('POST', '/api/geo/set', { tok: S, body: { lat: 9.03, lng: 38.74 } })).json.ok, true);
  const r = (await h.call('GET', '/api/nearby', { query: { lat: '9.04', lng: '38.75', kind: 'shops' } })).json;
  assert.equal(r.items.length, 1); assert.ok(r.items[0].km < 3); assert.equal(r.items[0].lat, undefined); assert.equal(r.items[0].geo, undefined);
  assert.equal((await h.call('POST', '/api/geo/clear', { tok: S })).json.cleared, 1);
  assert.equal((await h.call('GET', '/api/nearby', { query: { lat: '9.04', lng: '38.75' } })).json.items.length, 0);
});
test('ማንቂያ፦ መፍጠር፣ ድግግሞሽ፣ ተዛማጅ ሲመጣ ማሳወቅ፣ መሰረዝ', async () => {
  const h = harness();
  const id = (await h.call('POST', '/api/alerts', { tok: B, body: { kind: 'products', q: 'ሶፋ', maxPrice: 10000 } })).json.id; assert.ok(id);
  assert.equal((await h.call('POST', '/api/alerts', { tok: B, body: { kind: 'products', q: 'ሶፋ', maxPrice: 10000 } })).json.error, 'alert_exists');
  h.col('mk/products').N1 = { id: 'N1', shopId: 'SH', title: 'ዘመናዊ ሶፋ', desc: '', price: 9000, status: 'active', ts: Date.now() + 5 };
  h.col('mk/products').N2 = { id: 'N2', shopId: 'SH', title: 'ሶፋ ውድ', desc: '', price: 50000, status: 'active', ts: Date.now() + 5 };
  assert.equal(await h.al.sweep(Date.now() + 10), 1); assert.equal(h.msgs.length, 1); assert.equal(h.msgs[0][0], 'b1');
  assert.equal(await h.al.sweep(Date.now() + 20), 0);                                   // ሁለተኛ ጊዜ አይደገምም
  assert.equal((await h.call('DELETE', '/api/alerts/:id', { tok: S, params: { id } })).code, 404);
  assert.equal((await h.call('DELETE', '/api/alerts/:id', { tok: B, params: { id } })).json.ok, true);
});
