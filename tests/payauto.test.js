const test = require('node:test'), assert = require('node:assert');
const PV = require('../server/payverify');
const HTML = (o = {}) => `<html><body><table><tr><td>Payer Name</td><td>ABEBE KEBEDE</td></tr><tr><td>Credited Party name</td><td>${o.to || 'TIRUNEH AWOKE CHANIE'}</td></tr><tr><td>Credited party account no</td><td>2519****5941</td></tr><tr><td>Transaction status</td><td>${o.st || 'Completed'}</td></tr><tr><td>Payment date</td><td>${o.dt || '04-11-2026 10:00:00'}</td></tr><tr><td>Settled Amount</td><td>${o.amt || '150.00'} Birr</td></tr><tr><td>Total Paid Amount</td><td>${o.amt || '150.00'} Birr</td></tr></table></body></html>`;
const ACC = [{ method: 'telebirr', number: '0946705941', holder: 'TIRUNEH AWOKE CHANIE' }];
const mk = (body, status = 200) => { const calls = []; const pv = PV.create({}, async u => { calls.push(u); return { ok: status === 200, status, text: async () => body }; }); return { pv, calls }; };
const ts0 = Date.parse('2026-11-04T06:50:00Z');          // 09:50 EAT — ደረሰኙ 10:00 EAT ከዚህ በኋላ ነው
test('parse፦ የቴሌብር ደረሰኝ ይነበባል (ሰዓት UTC+3)', () => { const p = PV.parseTelebirr(HTML()); assert.equal(p.amount, 150); assert.match(p.receiver, /TIRUNEH/); assert.equal(p.ts, Date.UTC(2026, 10, 4, 7, 0, 0)); });
test('ተዛምዷል — ትክክለኛ መጠን/ተቀባይ/ሰዓት፤ URL ትክክል', async () => { const { pv, calls } = mk(HTML()); const r = await pv.check({ method: 'telebirr', ref: 'CK12AB34CD', amount: 150, accounts: ACC, ts: ts0 }); assert.equal(r.state, 'match', JSON.stringify(r)); assert.equal(calls[0], 'https://transactioninfo.ethiotelecom.et/receipt/CK12AB34CD'); });
test('ያነሰ መጠን፣ ሌላ ተቀባይ፣ ከትዕዛዝ በፊት፣ ያልተሳካ ሁኔታ → አያጸድቅም', async () => {
  assert.equal((await mk(HTML({ amt: '50.00' })).pv.check({ method: 'telebirr', ref: 'CK12AB34CD', amount: 150, accounts: ACC, ts: ts0 })).state, 'mismatch');
  assert.equal((await mk(HTML({ to: 'SOMEONE ELSE' })).pv.check({ method: 'telebirr', ref: 'CK12AB34CD', amount: 150, accounts: ACC, ts: ts0 })).state, 'mismatch');
  assert.equal((await mk(HTML()).pv.check({ method: 'telebirr', ref: 'CK12AB34CD', amount: 150, accounts: ACC, ts: Date.parse('2026-11-05T00:00:00Z') })).state, 'mismatch');
  assert.equal((await mk(HTML({ st: 'Failed' })).pv.check({ method: 'telebirr', ref: 'CK12AB34CD', amount: 150, accounts: ACC, ts: ts0 })).state, 'notfound');
});
test('ስህተት/404/ሌላ ባንክ/የተበላሸ ገጽ — በፍጹም match አይሆንም', async () => {
  assert.equal((await mk('', 404).pv.check({ method: 'telebirr', ref: 'CK12AB34CD', amount: 1, accounts: ACC })).state, 'notfound');
  assert.equal((await mk('', 503).pv.check({ method: 'telebirr', ref: 'CK12AB34CD', amount: 1, accounts: ACC })).state, 'error');
  assert.equal((await mk('<html>hello</html>').pv.check({ method: 'telebirr', ref: 'CK12AB34CD', amount: 1, accounts: ACC })).state, 'error');
  assert.equal((await mk(HTML()).pv.check({ method: 'CBE', ref: 'FT123456789A', amount: 150, accounts: ACC })).state, 'unknown');
  assert.equal((await mk(HTML()).pv.check({ method: 'telebirr', ref: 'x!', amount: 150, accounts: ACC })).state, 'notfound');
});
test('PAY_FREE_TELEBIRR=0 ያጠፋል', () => assert.equal(PV.create({ PAY_FREE_TELEBIRR: '0' }).enabled, false));
test('AI ክፍያ — autoApprove ሲበራ ተዛምዶ በራሱ ያጸድቃል፤ ሲጠፋ ጠቋሚ ብቻ', async () => {
  process.env.PAY_FREE_TELEBIRR = '0';
  const AIM = require('../server/ai');
  for (const auto of [true, false]) {
    const routes = [], mkr = m => (p, ...h) => routes.push({ m, p, h }), app = { get: mkr('GET'), post: mkr('POST'), put: mkr('PUT'), delete: mkr('DELETE'), patch: mkr('PATCH') };
    const docs = { 'data/users/u1': { acct: { name: 'አበበ', phone: '0911' } } }, col = p => docs[p] || (docs[p] = {}), sent = [], told = [];
    const { pv } = mk(HTML()); let n = 0;
    const svc = require('../server/aisvc')({ app, col, limit: () => true, who: () => ({ uid: 'u1' }), adminOnly: () => true, saveMany: async () => { }, bad() { }, S: (x, m) => String(x == null ? '' : x).slice(0, m), N: Number, nid: () => 'ai' + (++n), notifyUser: (u, t) => told.push(t), notifyAdmin: (t, b) => sent.push(t), ai: AIM.create({ ANTHROPIC_API_KEY: 'k' }, async () => ({})), pv, payAccounts: () => ACC, now: () => ts0 });
    col('ai/cfg').main = { autoApprove: auto };
    const PROOF = { data: Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.alloc(30)]).toString('base64') };
    const r = await svc.buy('u1', { plan: 'm', method: 'telebirr', ref: 'CK12AB34CD', proof: PROOF }); assert.equal(r.ok, true);
    await new Promise(r => setTimeout(r, 30)); const q = col('ai/reqs')[r.id];
    assert.equal(q.auto.state, 'match', JSON.stringify(q.auto)); assert.equal(q.status, auto ? 'approved' : 'pending'); assert.equal(svc.acc('u1').paid, auto);
    assert.ok(sent.some(t => /ራስ-ሰር/.test(t)));
  }
});
