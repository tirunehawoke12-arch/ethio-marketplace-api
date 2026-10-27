const test = require('node:test'), assert = require('node:assert');
function harness() {
  const routes = [], mk = m => (p, ...h) => routes.push({ m, p, h }), app = { get: mk('GET'), post: mk('POST'), put: mk('PUT'), delete: mk('DELETE'), patch: mk('PATCH') };
  const docs = {}, col = p => docs[p] || (docs[p] = {}), msgs = [];
  [['w1', 'አበበ'], ['e1', 'ድርጅት'], ['x1', 'እንግዳ']].forEach(([u, n]) => { docs['data/users/' + u] = { acct: { email: u + '@x', phone: '0911000000', name: n } }; });
  col('pp/workers').W = { id: 'W', uid: 'w1', name: 'አበበ', title: 'አናጺ', status: 'active' }; col('pp/employers').E = { id: 'E', uid: 'e1', name: 'ድርጅት', status: 'active' };
  col('_img').i1 = { m: 'image/png' };
  const ctx = { app, col, bump() {}, pool: null, pgUpsert: async () => {}, persist() {}, readTok: q => q.tok, limit: () => true, notifyUser: (u, t) => msgs.push([u, t]), notifyAdmin: t => msgs.push(['admin', t]) };
  const mkApi = require('../server/market')(ctx); require('../server/people')({ ...ctx, ...mkApi }); require('../server/trust')({ ...ctx, ...mkApi });
  const call = async (m, path, { tok, body, params, query } = {}) => { const r = routes.find(x => x.m === m && x.p === path); const out = { code: 200 }; const res = { status(c) { out.code = c; return this; }, json(j) { out.json = j; return this; }, set() { return this; }, send() { return this; }, sendStatus(c) { out.code = c; return this; } }; await r.h[r.h.length - 1]({ tok, body: body || {}, params: params || {}, ip: '1.1.1.1', headers: {}, query: query || {} }, res); return out; };
  return { call, col, msgs };
}
const W = { u: 'w1', k: 'user' }, E = { u: 'e1', k: 'user' }, X = { u: 'x1', k: 'user' }, AD = { k: 'admin' };
test('ግምገማ፦ ግንኙነት ከሌለ ይከለከላል፣ ከተቀጠረ በኋላ አንድ ጊዜ ይቻላል', async () => {
  const h = harness(); const rv = (tok, id, t, rating = 5) => h.call('POST', '/api/trust/reviews/:t/:id', { tok, params: { t, id }, body: { rating, text: 'ጥሩ' } });
  assert.equal((await rv(E, 'W', 'w')).json.error, 'review_not_eligible');
  h.col('pp/apps').a1 = { id: 'a1', employerUid: 'e1', workerUid: 'w1', status: 'hired' };
  assert.equal((await rv(X, 'W', 'w')).json.error, 'review_not_eligible');
  const ok = await rv(E, 'W', 'w', 4); assert.equal(ok.json.ok, true); assert.equal(ok.json.avg, 4);
  assert.equal((await rv(E, 'W', 'w')).json.error, 'already_reviewed');
  assert.equal((await rv(W, 'E', 'e', 5)).json.ok, true);                          // ሙያተኛ ለተቀጠረበት አሰሪ
  assert.equal((await rv(W, 'W', 'w')).json.error, 'own_profile');
  assert.equal((await rv(E, 'W', 'w', 9)).json.error, 'bad_rating');
  const list = await h.call('GET', '/api/trust/reviews/:t/:id', { params: { t: 'w', id: 'W' } }); assert.equal(list.json.n, 1);
  const w = (await h.call('GET', '/api/people/worker/:id', { params: { id: 'W' } })).json.worker; assert.equal(w.rating.avg, 4);
});
test('ባጅ፦ ማስረጃ ያስፈልጋል፣ አድሚን ሲያጸድቅ በህዝብ መረጃ ይታያል', async () => {
  const h = harness();
  assert.equal((await h.call('POST', '/api/trust/request', { tok: W, body: { t: 'w', id: 'W' } })).json.error, 'proof_required');
  assert.equal((await h.call('POST', '/api/trust/request', { tok: X, body: { t: 'w', id: 'W', proof: ['i1'] } })).json.error, 'not_found');
  assert.equal((await h.call('POST', '/api/trust/request', { tok: W, body: { t: 'w', id: 'W', proof: ['i1'] } })).json.ok, true);
  assert.equal((await h.call('POST', '/api/trust/request', { tok: W, body: { t: 'w', id: 'W', proof: ['i1'] } })).json.error, 'request_pending');
  const ov = (await h.call('GET', '/api/trust/admin/overview', { tok: AD })).json; assert.equal(ov.requests.length, 1);
  assert.equal((await h.call('GET', '/api/trust/admin/overview', { tok: W })).code, 403);
  assert.equal((await h.call('POST', '/api/trust/admin/request/:id', { tok: AD, params: { id: ov.requests[0].id }, body: { approve: true } })).json.ok, true);
  assert.equal((await h.call('GET', '/api/people/worker/:id', { params: { id: 'W' } })).json.worker.verified, true);
});
test('ሪፖርት፦ አንድ ጊዜ ብቻ፣ አድሚን መደበቅ ይችላል', async () => {
  const h = harness(); const rp = () => h.call('POST', '/api/trust/report', { tok: X, body: { t: 'w', id: 'W', reason: 'ማጭበርበር ወይም አጠራጣሪ' } });
  assert.equal((await rp()).json.ok, true); assert.equal((await rp()).json.error, 'already_reported');
  assert.equal((await h.call('POST', '/api/trust/report', { tok: X, body: { t: 'z', id: 'W' } })).json.error, 'not_found');
  const id = (await h.call('GET', '/api/trust/admin/overview', { tok: AD })).json.reports[0].id;
  assert.equal((await h.call('POST', '/api/trust/admin/report/:id', { tok: AD, params: { id }, body: { action: 'hide' } })).json.ok, true);
  assert.equal(h.col('pp/workers').W.status, 'suspended');
  assert.equal((await h.call('GET', '/api/people/worker/:id', { params: { id: 'W' } })).code, 404);
});
