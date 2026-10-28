const test = require('node:test'), assert = require('node:assert');
function harness() {
  const routes = [], mk = m => (p, ...h) => routes.push({ m, p, h }), app = { get: mk('GET'), post: mk('POST'), put: mk('PUT'), delete: mk('DELETE'), patch: mk('PATCH') };
  const docs = {}, col = p => docs[p] || (docs[p] = {}), msgs = [];
  [['b1', 'ገዥ'], ['b2', 'ገዥ ሁለት'], ['s1', 'ሻጭ']].forEach(([u, n]) => { docs['data/users/' + u] = { acct: { email: u + '@x.com', phone: '0911000001', name: n, ts: Date.now() - 1000 }, prefs: {} }; });
  col('mk/shops').SH = { id: 'SH', uid: 's1', name: 'ሱቅ', status: 'active', delivery: { pickup: true, local: false, fee: 0 }, payout: {} };
  col('mk/products').P1 = { id: 'P1', shopId: 'SH', title: 'ሻይ', price: 1000, stock: 10, status: 'active', imgs: [], ts: Date.now() };
  const ctx = { app, col, bump() {}, pool: null, pgUpsert: async () => {}, persist() {}, readTok: q => q.tok, limit: () => true, notifyUser: (u, t) => msgs.push([u, t]), notifyAdmin() {} };
  const mkApi = require('../server/market')(ctx); const cp = require('../server/coupons')({ app, col, limit: ctx.limit, ...mkApi });
  require('../server/referral')({ app, col, limit: ctx.limit, notifyUser: ctx.notifyUser, coupons: cp, baseUrl: 'https://x.et', getStore: () => ({ docs }), ...mkApi });
  const call = async (m, path, { tok, body, params, query } = {}) => { const r = routes.find(x => x.m === m && x.p === path); const out = { code: 200 }; const res = { status(c) { out.code = c; return this; }, json(j) { out.json = j; return this; }, set() { return this; }, send() { return this; }, sendStatus(c) { out.code = c; return this; } }; await r.h[r.h.length - 1]({ tok, body: body || {}, params: params || {}, ip: '1', headers: {}, query: query || {} }, res); return out; };
  return { call, col, msgs };
}
const A = { u: 'admin', k: 'admin' }, B1 = { u: 'b1', k: 'user' }, B2 = { u: 'b2', k: 'user' }, S1 = { u: 's1', k: 'user' };
const buy = (h, tok, coupon) => h.call('POST', '/api/market/checkout', { tok, body: { items: [{ pid: 'P1', qty: 2 }], delivery: { type: 'pickup', phone: '0911000001' }, coupon } });
test('የሱቅ ኩፖን፦ ሻጩ ይሸፍናል፣ ኮሚሽን ከቅናሽ በኋላ፣ በአንድ ሰው አንድ ጊዜ', async () => {
  const h = harness(); assert.equal((await h.call('POST', '/api/coupons', { tok: S1, body: { code: 'ab', kind: 'pct', value: 10 } })).json.error, 'bad_code');
  assert.equal((await h.call('POST', '/api/coupons', { tok: S1, body: { code: 'eid10', kind: 'pct', value: 10, minSubtotal: 1500 } })).json.ok, true);
  assert.equal((await h.call('POST', '/api/coupons', { tok: S1, body: { code: 'EID10', kind: 'pct', value: 5 } })).json.error, 'code_taken');
  assert.equal((await h.call('POST', '/api/market/coupon/check', { tok: B1, body: { coupon: 'eid10', items: [{ pid: 'P1', qty: 2 }] } })).json.discount, 200);
  assert.equal((await h.call('POST', '/api/market/coupon/check', { tok: B1, body: { coupon: 'eid10', items: [{ pid: 'P1', qty: 1 }] } })).json.error, 'coupon_min:1500');
  assert.equal((await buy(h, B1, 'NOPE12')).json.error, 'coupon_invalid');
  const r = (await buy(h, B1, 'eid10')).json; assert.equal(r.ok, true); const o = h.col('mk/orders')[r.orders[0]];
  assert.equal(o.total, 1800); assert.equal(o.discount, 200); assert.equal(o.commission, 90); assert.equal(o.sellerNet, 1710);      // (2000-200) × 5%
  assert.equal((await buy(h, B1, 'eid10')).json.error, 'coupon_user_limit');
  assert.equal((await buy(h, B2, 'eid10')).json.ok, true);
  o.status = 'cancelled'; assert.equal((await buy(h, B1, 'eid10')).json.ok, true);                                                // የተሰረዘ አይቆጠርም
});
test('የጣቢያ ኩፖን፦ መድረኩ ይሸፍናል፣ ሻጩ ሙሉ ያገኛል፤ ሻጭ የጣቢያ ኩፖን መፍጠር አይችልም', async () => {
  const h = harness(); assert.equal((await h.call('POST', '/api/admin/coupons', { tok: S1, body: { code: 'SITE50', kind: 'fixed', value: 50 } })).code, 403);
  await h.call('POST', '/api/admin/coupons', { tok: A, body: { code: 'SITE100', kind: 'fixed', value: 100, maxUses: 1 } });
  const o = h.col('mk/orders')[(await buy(h, B1, 'site100')).json.orders[0]]; assert.equal(o.total, 1900); assert.equal(o.sellerNet, 1900); assert.equal(o.commission, 0);
  assert.equal((await buy(h, B2, 'SITE100')).json.error, 'coupon_used_up');
});
test('ሪፈራል፦ ኮድ፣ ራስን መጋበዝ ክልክል፣ አንዴ ብቻ፣ ሽልማት በአድሚን ሲቀናበር', async () => {
  const h = harness(); const me = (await h.call('GET', '/api/referral/me', { tok: B1 })).json; assert.match(me.code, /^[A-Z2-9]{6}$/); assert.match(me.link, /\?ref=/);
  assert.equal((await h.call('POST', '/api/referral/claim', { tok: B1, body: { code: me.code } })).json.error, 'own_code');
  assert.equal((await h.call('POST', '/api/referral/claim', { tok: B2, body: { code: 'ZZZZZZ' } })).json.error, 'bad_code');
  const r1 = (await h.call('POST', '/api/referral/claim', { tok: B2, body: { code: me.code.toLowerCase() } })).json; assert.equal(r1.ok, true); assert.equal(r1.gift, null);   // ነባሪ ሽልማት 0
  assert.equal((await h.call('POST', '/api/referral/claim', { tok: B2, body: { code: me.code } })).json.error, 'already_claimed');
  assert.equal((await h.call('GET', '/api/referral/me', { tok: B1 })).json.count, 1);
  await h.call('POST', '/api/admin/referral', { tok: A, body: { reward: 50, minMult: 4 } });
  const h2 = harness(); await h2.call('POST', '/api/admin/referral', { tok: A, body: { reward: 50, minMult: 4 } }); const c2 = (await h2.call('GET', '/api/referral/me', { tok: B1 })).json;
  const g = (await h2.call('POST', '/api/referral/claim', { tok: B2, body: { code: c2.code } })).json.gift; assert.equal(g.value, 50); assert.equal(g.min, 200); assert.equal(h2.msgs.length, 1);
  assert.equal((await h2.call('GET', '/api/referral/me', { tok: B2 })).json.gifts.length, 1);
  assert.equal((await buy(h2, B1, g.code)).json.error, 'coupon_invalid');                                 // የሌላ ሰው የግል ኩፖን አይሰራም
  assert.equal((await buy(h2, B2, g.code)).json.ok, true);
});
