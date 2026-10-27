const test = require('node:test'), assert = require('node:assert');
function harness() {
  const routes = [], mk = m => (p, ...h) => routes.push({ m, p, h }), app = { get: mk('GET'), post: mk('POST'), put: mk('PUT'), delete: mk('DELETE'), patch: mk('PATCH') };
  const docs = {}, col = p => docs[p] || (docs[p] = {}), msgs = [];
  [['b1', 'ገዥ በቀለ'], ['s1', 'ሻጭ ካሳ'], ['x1', 'እንግዳ']].forEach(([u, n]) => { docs['data/users/' + u] = { acct: { email: u + '@x', phone: '0911000000', name: n } }; });
  col('mk/shops').SH = { id: 'SH', uid: 's1', name: 'ሰላም ሱቅ', status: 'active' }; col('mk/products').P1 = { id: 'P1', shopId: 'SH', title: 'ሻይ', status: 'active' };
  const ctx = { app, col, bump() {}, pool: null, pgUpsert: async () => {}, persist() {}, readTok: q => q.tok, limit: () => true, notifyUser: (u, t) => msgs.push([u, t]), notifyAdmin() {} };
  const mkApi = require('../server/market')(ctx); require('../server/chat')({ ...ctx, ...mkApi });
  const call = async (m, path, { tok, body, params } = {}) => { const r = routes.find(x => x.m === m && x.p === path); const out = { code: 200 }; const res = { status(c) { out.code = c; return this; }, json(j) { out.json = j; return this; }, set() { return this; }, send() { return this; }, sendStatus(c) { out.code = c; return this; } }; await r.h[r.h.length - 1]({ tok, body: body || {}, params: params || {}, ip: '1', headers: {}, query: {} }, res); return out; };
  return { call, col, msgs };
}
const B = { u: 'b1', k: 'user' }, S = { u: 's1', k: 'user' }, X = { u: 'x1', k: 'user' };
test('ውይይት መጀመር፣ መልእክት፣ ማንበብ፣ የ Telegram ማሳወቂያ ከተደጋገመ አይላክም', async () => {
  const h = harness(); const st = await h.call('POST', '/api/chat/start', { tok: B, body: { t: 'p', id: 'P1', text: 'ሰላም፣ አለ?' } }); assert.equal(st.json.ok, true); const id = st.json.id;
  assert.equal(h.msgs.length, 1); assert.match(h.msgs[0][1], /ገዥ/);
  await h.call('POST', '/api/chat/thread/:id', { tok: B, params: { id }, body: { text: 'ሁለተኛ' } }); assert.equal(h.msgs.length, 1);          // ያልተነበበ አለ → እንደገና አይነገርም
  assert.equal((await h.call('GET', '/api/chat/unread', { tok: S })).json.n, 2);
  const th = (await h.call('GET', '/api/chat/thread/:id', { tok: S, params: { id } })).json; assert.equal(th.items.length, 2); assert.equal(th.thread.label, 'ገዥ'); assert.equal((await h.call('GET', '/api/chat/unread', { tok: S })).json.n, 0);
  assert.equal((await h.call('POST', '/api/chat/start', { tok: B, body: { t: 's', id: 'SH' } })).json.id, id);                           // አንድ ጥንድ = አንድ ውይይት
  const mine = (await h.call('GET', '/api/chat/threads', { tok: B })).json.items; assert.equal(mine.length, 1); assert.equal(mine[0].label, 'ሰላም ሱቅ');
});
test('ግላዊነት፦ ሌላ ሰው ማንበብ/መጻፍ አይችልም፣ ራስን ማነጋገር ክልክል', async () => {
  const h = harness(); const id = (await h.call('POST', '/api/chat/start', { tok: B, body: { t: 's', id: 'SH', text: 'ሰላም' } })).json.id;
  assert.equal((await h.call('GET', '/api/chat/thread/:id', { tok: X, params: { id } })).code, 404); assert.equal((await h.call('POST', '/api/chat/thread/:id', { tok: X, params: { id }, body: { text: 'hi' } })).code, 404);
  assert.equal((await h.call('POST', '/api/chat/start', { tok: S, body: { t: 's', id: 'SH' } })).json.error, 'own_profile');
  assert.equal((await h.call('POST', '/api/chat/start', { tok: B, body: { t: 'q', id: 'SH' } })).json.error, 'not_found');
});
test('ማገድ፦ ያገደው ብቻ ይፈታል', async () => {
  const h = harness(); const id = (await h.call('POST', '/api/chat/start', { tok: B, body: { t: 's', id: 'SH', text: 'ሰላም' } })).json.id;
  await h.call('POST', '/api/chat/thread/:id/block', { tok: S, params: { id }, body: { block: true } });
  assert.equal((await h.call('POST', '/api/chat/thread/:id', { tok: B, params: { id }, body: { text: 'እባክዎ' } })).json.error, 'chat_blocked');
  await h.call('POST', '/api/chat/thread/:id/block', { tok: B, params: { id }, body: { block: false } }); assert.equal((await h.call('POST', '/api/chat/thread/:id', { tok: S, params: { id }, body: { text: 'x' } })).json.error, 'chat_blocked');
  await h.call('POST', '/api/chat/thread/:id/block', { tok: S, params: { id }, body: { block: false } }); assert.equal((await h.call('POST', '/api/chat/thread/:id', { tok: B, params: { id }, body: { text: 'እባክዎ' } })).json.ok, true);
});
test('አድሚን dossier የመልእክት ክፍል ይዟል', async () => {
  const h = harness(); await h.call('POST', '/api/chat/start', { tok: B, body: { t: 's', id: 'SH', text: 'ሚስጥር ጽሑፍ' } });
  const d = require('../server/dossier').build(h.col, 's1', 'messages'); assert.equal(d.sections.messages.threads[0].messages[0].text, 'ሚስጥር ጽሑፍ');
});
