const test = require('node:test'), assert = require('node:assert');
test('ops፦ ፍለጋ መዝገብ፣ ስህተት፣ ትንታኔ፣ ምትኬ አድሚን ብቻ', async () => {
  const routes = {}, app = { get: (p, h) => { routes[p] = h; } }, docs = { 'data/users/U': { acct: { ts: Date.now() } }, _img: { x: 1 }, 'mk/orders': { O: { ts: Date.now() - 1000, status: 'paid', total: 500 } } };
  const col = p => docs[p] || (docs[p] = {}); let saved = 0;
  const o = require('../server/ops')({ app, col, adminOnly: (req, res) => req.admin, saveMany: async () => { saved++; }, getStore: () => ({ docs }) });
  o.recordSearch('ሶፋ', 0); o.recordSearch('ሶፋ', 0); o.recordSearch('ሻይ', 3); o.recordSearch('a', 1); o.logErr('x', new Error('ቦም'));
  const call = (p, admin) => { const out = {}; routes[p]({ admin }, { json: j => { out.j = j; }, set() { }, send: s => { out.s = s; } }); return out; };
  assert.equal(call('/api/admin/ops', false).j, undefined);
  const j = call('/api/admin/ops', true).j; assert.equal(j.ok, true); assert.equal(j.empty[0].q, 'ሶፋ'); assert.equal(j.empty[0].miss, 2); assert.equal(j.top.length, 2); assert.equal(j.errors[0].msg, 'ቦም');
  assert.equal(j.days[13].orders, 1); assert.equal(j.days[13].gmv, 500); assert.equal(j.totals.users, 1);
  const bk = JSON.parse(call('/api/admin/backup', true).s); assert.ok(bk.docs['mk/orders'] && !bk.docs._img);
  await o.flush(); assert.equal(saved, 1);
});
