const test = require('node:test'), assert = require('node:assert');
const payverify = require('../server/payverify');

function harness(env = {}, fetchImpl) {
  const routes = [], mk = m => (p, ...h) => routes.push({ m, p, h }), app = { get: mk('GET'), post: mk('POST'), put: mk('PUT'), delete: mk('DELETE'), patch: mk('PATCH') };
  const docs = {}, col = p => docs[p] || (docs[p] = {}), msgs = [];
  docs['data/users/b1'] = { acct: { email: 'b@x', phone: '0911000001', name: 'ገዥ' } }; docs['data/users/s1'] = { acct: { email: 's@x', phone: '0911000002', name: 'ሻጭ' } };
  col('mk/shops').sh1 = { id: 'sh1', uid: 's1', name: 'ሱቅ', status: 'active' };
  const ctx = { app, col, bump() {}, pool: null, pgUpsert: async () => {}, persist() {}, readTok: q => q.tok, limit: () => true, notifyUser: (u, t) => msgs.push([u, t]), notifyAdmin: t => msgs.push(['admin', t]), payverify: payverify.create(env, fetchImpl), imgs: { enabled: false } };
  require('../server/market')(ctx);
  const order = (id, total = 500) => (col('mk/orders')[id] = { id, shopId: 'sh1', shopName: 'ሱቅ', buyerUid: 'b1', items: [{ pid: 'p', title: 'ዕቃ', qty: 1, price: total }], subtotal: total, fee: 0, total, commission: 25, sellerNet: total - 25, status: 'placed', history: [], delivery: { type: 'pickup' }, ts: Date.now() - 600000 });
  const call = async (m, path, { tok, body, params } = {}) => { const r = routes.find(x => x.m === m && x.p === path); const out = { code: 200 }; const res = { status(c) { out.code = c; return this; }, json(j) { out.json = j; return this; }, set() { return this; }, send() { return this; }, sendStatus(c) { out.code = c; return this; } }; await r.h[r.h.length - 1]({ tok, body: body || {}, params: params || {}, ip: '1.1.1.1', headers: {}, query: {} }, res); return out; };
  return { call, order, col, msgs };
}
const B = { u: 'b1', k: 'user' }, AD = { k: 'admin' }, pay = (h, id, ref) => h.call('POST', '/api/market/order/:id/:act', { tok: B, params: { id, act: 'pay' }, body: { method: 'telebirr', ref } });
const wait = ms => new Promise(r => setTimeout(r, ms));

test('አንድ ማጣቀሻ ለሁለት ትዕዛዝ አይውልም (ቅርጽ ቢለያይም)', async () => {
  const h = harness(); h.order('o1'); h.order('o2');
  assert.equal((await pay(h, 'o1', 'ABC1234567')).json.ok, true);
  const r = await pay(h, 'o2', 'abc 1234-567'); assert.equal(r.code, 409); assert.equal(r.json.error, 'duplicate_reference');
});
test('አድሚን ውድቅ ካደረገ በኋላ ማጣቀሻው እንደገና ሊውል ይችላል', async () => {
  const h = harness(); h.order('o1'); h.order('o2'); await pay(h, 'o1', 'ABC1234567');
  await h.call('POST', '/api/market/admin/order/:id/:act', { tok: AD, params: { id: 'o1', act: 'verify-payment' }, body: { ok: false, note: 'x' } });
  assert.equal((await pay(h, 'o2', 'ABC1234567')).json.ok, true);
});
test('የአድሚን መልዕክት ጠቋሚዎችን ይዟል (መጠን እና አካውንት)', async () => {
  const h = harness(); h.order('o1'); await pay(h, 'o1', 'ABC1234567'); const m = h.msgs.find(x => x[0] === 'admin')[1]; assert.match(m, /500 ብር/); assert.match(m, /0946705941/);
});
test('በእጅ ማረጋገጫ፦ ትዕዛዙ paid ይሆናል፣ ገዥው ይነገረዋል', async () => {
  const h = harness(); h.order('o1'); await pay(h, 'o1', 'ABC1234567');
  const r = await h.call('POST', '/api/market/admin/order/:id/:act', { tok: AD, params: { id: 'o1', act: 'verify-payment' }, body: { ok: true } }); assert.equal(r.json.status, 'paid'); assert.ok(h.msgs.some(m => m[0] === 'b1' && /ተረጋግጧል/.test(m[1])));
});
test('ራስ-ሰር ማረጋገጫ በርቶ ሙሉ ተዛምዶ ሲኖር ብቻ ይረጋገጣል', async () => {
  const rep = { found: true, amount: 500, receiver: '0946705941', ts: Date.now() }; const f = async () => ({ ok: true, json: async () => rep });
  const h = harness({ PAY_VERIFIER_URL: 'http://v', PAY_AUTO_CONFIRM: '1' }, f); h.order('o1'); h.order('o2');
  await pay(h, 'o1', 'MATCH12345'); await wait(60); assert.equal(h.col('mk/orders').o1.status, 'paid');
  rep.amount = 100; await pay(h, 'o2', 'LOWAMT1234'); await wait(60); assert.equal(h.col('mk/orders').o2.status, 'payment_submitted'); assert.equal(h.col('mk/orders').o2.payment.auto.state, 'mismatch');
});
test('አረጋጋጩ ቢወድቅ ትዕዛዙ ለአድሚን በእጅ ይቆያል', async () => {
  const h = harness({ PAY_VERIFIER_URL: 'http://v', PAY_AUTO_CONFIRM: '1' }, async () => ({ ok: false, status: 500 })); h.order('o1'); await pay(h, 'o1', 'DOWN123456'); await wait(60);
  assert.equal(h.col('mk/orders').o1.status, 'payment_submitted'); assert.equal(h.col('mk/orders').o1.payment.auto.state, 'error');
});
test('auto ጠፍቶ ተዛምዶ ሲኖር በራስ አይረጋገጥም (ለአድሚን ጠቋሚ ብቻ)', async () => {
  const f = async () => ({ ok: true, json: async () => ({ found: true, amount: 500, receiver: '0946705941', ts: Date.now() }) });
  const h = harness({ PAY_VERIFIER_URL: 'http://v' }, f); h.order('o1'); await pay(h, 'o1', 'HINTONLY12'); await wait(60);
  assert.equal(h.col('mk/orders').o1.status, 'payment_submitted'); assert.equal(h.col('mk/orders').o1.payment.auto.state, 'match');
});
