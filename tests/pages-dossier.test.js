const test = require('node:test'), assert = require('node:assert');
const dossier = require('../server/dossier');

function harness() {
  const routes = [], mk = m => (p, ...h) => routes.push({ m, p, h }), app = { get: mk('GET'), post: mk('POST'), put: mk('PUT'), delete: mk('DELETE'), patch: mk('PATCH') };
  const docs = {}, col = p => docs[p] || (docs[p] = {}), msgs = [];
  docs['data/users/a1'] = { acct: { email: 'a@x', phone: '0911000001', name: 'አበበ', h: 'HASH', salt: 'SALT' }, private: { fullName: 'አበበ በቀለ', idNo: 'ID-77' } };
  docs['data/users/b1'] = { acct: { email: 'b@x', phone: '0911000002', name: 'ገዥ' } };
  const ctx = { app, col, bump() {}, pool: null, pgUpsert: async () => {}, persist() {}, readTok: q => q.tok, limit: () => true, notifyUser: (u, t) => msgs.push([u, t]), notifyAdmin() {} };
  const mkApi = require('../server/market')(ctx);
  require('../server/people')({ ...ctx, ...mkApi }); require('../server/pages')({ ...ctx, ...mkApi }); require('../server/search')({ app, col, S: mkApi.S });
  const call = async (m, path, { tok, body, params, query } = {}) => { const r = routes.find(x => x.m === m && x.p === path); const out = { code: 200 }; const res = { status(c) { out.code = c; return this; }, json(j) { out.json = j; return this; }, set() { return this; }, send() { return this; }, sendStatus(c) { out.code = c; return this; } }; await r.h[r.h.length - 1]({ tok, body: body || {}, params: params || {}, ip: '1.1.1.1', headers: {}, query: query || {} }, res); return out; };
  return { call, col, msgs, docs };
}
const A = { u: 'a1', k: 'user' }, Bk = { u: 'b1', k: 'user' };
const form = (title, n = 1) => ({ enabled: true, title, button: 'ላክ', fields: Array.from({ length: n }, (_, i) => ({ label: 'ጥያቄ' + i, type: 'text' })) });

test('አንድ ሰው አንድ ገጽ ብቻ', async () => {
  const h = harness(); const r1 = await h.call('POST', '/api/pages', { tok: A, body: { title: 'የኔ ገጽ' } }); assert.equal(r1.json.ok, true);
  const r2 = await h.call('POST', '/api/pages', { tok: A, body: { title: 'ሁለተኛ' } }); assert.equal(r2.json.error, 'one_page_only');
  const r3 = await h.call('POST', '/api/pages', { tok: A, body: { id: r1.json.id, title: 'የተዘመነ' } }); assert.equal(r3.json.ok, true);
});
test('ብዙ ቅጾች፦ ከፍተኛ 5፣ እያንዳንዱ በራሱ መልስ ይቀበላል', async () => {
  const h = harness(); const id = (await h.call('POST', '/api/pages', { tok: A, body: { title: 'ገጽ', forms: Array.from({ length: 7 }, (_, i) => form('ቅጽ' + i)) } })).json.id;
  const pub = (await h.call('GET', '/api/pages/:id', { params: { id } })).json.page; assert.equal(pub.forms.length, 5); assert.equal(pub.form.id, pub.forms[0].id);
  const f2 = pub.forms[1]; const fid = f2.fields[0].id;
  assert.equal((await h.call('POST', '/api/pages/:id/respond', { tok: Bk, params: { id }, body: { formId: f2.id, answers: { [fid]: 'ሰላም' } } })).json.ok, true);
  const rs = (await h.call('GET', '/api/pages/my/:id/responses', { tok: A, params: { id } })).json; assert.equal(rs.items[0].formId, f2.id); assert.equal(rs.forms.length, 5);
});
test('የድሮ ገጽ (form ብቻ) ወደ forms ይነበባል፣ ሲቀመጥ አይጠፋም', async () => {
  const h = harness(); h.col('pg/pages').old = { id: 'old', uid: 'a1', title: 'ድሮ', kind: 'x', status: 'active', ts: 1, sections: [], gallery: [], form: { enabled: true, title: 'የድሮ ቅጽ', button: 'ላክ', fields: [{ id: 'q1', label: 'ስም', type: 'text', options: [] }] } };
  const pub = (await h.call('GET', '/api/pages/:id', { params: { id: 'old' } })).json.page; assert.equal(pub.forms.length, 1); assert.equal(pub.forms[0].title, 'የድሮ ቅጽ');
  const mine = (await h.call('GET', '/api/pages/my/:id', { tok: A, params: { id: 'old' } })).json.page;
  await h.call('POST', '/api/pages', { tok: A, body: { id: 'old', title: 'ድሮ', forms: mine.forms } });
  assert.equal(h.col('pg/pages').old.forms.length, 1); assert.equal(h.col('pg/pages').old.form.title, 'የድሮ ቅጽ');
});
test('ገጹ የሰውየውን ንቁ ሱቅ/ሙያ/አሰሪ ማጣቀሻ ይይዛል (ያልጸደቀ ሱቅ አይካተትም)', async () => {
  const h = harness(); const id = (await h.call('POST', '/api/pages', { tok: A, body: { title: 'ገጽ' } })).json.id;
  h.col('mk/shops').s1 = { id: 's1', uid: 'a1', name: 'ሱቅ', status: 'pending' }; h.col('pp/workers').w1 = { id: 'w1', uid: 'a1', name: 'አበበ', title: 'አናጺ', status: 'active' };
  let r = (await h.call('GET', '/api/pages/:id', { params: { id } })).json.page.refs; assert.equal(r.shop, null); assert.equal(r.worker.id, 'w1'); assert.equal(r.employer, null);
  h.col('mk/shops').s1.status = 'active'; r = (await h.call('GET', '/api/pages/:id', { params: { id } })).json.page.refs; assert.equal(r.shop.id, 's1');
});
test('የተዋሃደ ፍለጋ፦ የተመዘገቡ ነገሮችን ያገኛል፣ የተደበቁትን አያሳይም', async () => {
  const h = harness(); h.col('pp/employers').e1 = { id: 'e1', uid: 'a1', name: 'ሰላም ድርጅት', sector: 'ግንባታ', status: 'active', city: 'አዲስ አበባ' }; h.col('pp/employers').e2 = { id: 'e2', uid: 'b1', name: 'ሰላም ድብቅ', sector: 'x', status: 'suspended' };
  const r = (await h.call('GET', '/api/search', { query: { q: 'ሰላም' } })).json; const g = r.groups.find(x => x.key === 'employers'); assert.equal(g.items.length, 1); assert.equal(g.items[0].id, 'e1');
  assert.deepEqual((await h.call('GET', '/api/search', { query: { q: 'ሰ' } })).json.groups, []);
  const e = (await h.call('GET', '/api/people/employers', { query: {} })).json; assert.equal(e.total, 1);
});
test('አድሚን dossier፦ ሁሉንም ያሳያል፣ hash/salt አይታይም', async () => {
  const h = harness(); h.col('mk/shops').s1 = { id: 's1', uid: 'a1', name: 'ሱቅ', status: 'active', payout: { method: 'cbe', account: '1000123' } };
  h.col('pg/pages').p1 = { id: 'p1', uid: 'a1', title: 'ገጽ', sections: [{ title: 'ክፍያ', fields: [{ label: 'መታወቂያ', priv: true, value: 'SECRET-ID' }] }] };
  const d = dossier.build(h.col, 'a1', 'all'); const j = JSON.stringify(d);
  assert.ok(j.includes('ID-77')); assert.ok(j.includes('SECRET-ID')); assert.ok(j.includes('1000123')); assert.ok(!j.includes('HASH')); assert.ok(!j.includes('"salt"'));
  assert.equal(d.counts.shops, 1); assert.equal(dossier.build(h.col, 'nope', 'all'), null);
  assert.deepEqual(Object.keys(dossier.build(h.col, 'a1', 'orders').sections), ['orders']);
});
test('የኦዲት መዝገብ ይጻፋል እና በአካውንት ይጣራል', async () => {
  const h = harness(); const audit = dossier.auditor({ col: h.col, pool: null, pgUpsert: async () => {}, persist() {}, nid: () => Math.random().toString(36).slice(2) });
  await audit('view', 'a1', 'orders'); await audit('view', 'b1', 'all'); await audit('suspend', 'a1');
  assert.equal(dossier.readLog(h.col, 'a1').length, 2); assert.equal(dossier.readLog(h.col)[0].action, 'suspend');
  for (let i = 0; i < 1100; i++) await audit('view', 'x'); assert.equal(dossier.readLog(h.col).length, 1000);
});
