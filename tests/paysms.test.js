process.env.PAY_FREE_TELEBIRR = '0';
const test = require('node:test'), assert = require('node:assert');
const PV = require('../server/payverify'), PS = require('../server/paysms'), AIM = require('../server/ai');
const TB = 'Dear Tiruneh, You have received ETB 150.00 from Abebe Kebede(2519****1234) on 04/11/2026 10:00:00. Your transaction number is CK12AB34CD. Your balance is ETB 900.';
const CBE = 'Dear T your Account 1*****1379 has been Credited with ETB 200.00 from ABEBE, on 04/11/2026 at 10:05:00 with Ref No FT26308XXXY1. Balance ETB 5,000.00';
function mk() {
  const routes = [], mkr = m => (p, ...h) => routes.push({ m, p, h }), app = { get: mkr('GET'), post: mkr('POST') }, docs = {}, col = p => docs[p] || (docs[p] = {}), pv = PV.create({ PAY_FREE_TELEBIRR: '0' });
  const ps = PS({ app, col, saveMany: async () => { }, adminOnly: (req) => req.k === 'admin', pv, baseUrl: 'https://x.et', now: () => Date.UTC(2026, 10, 4, 7, 30) });
  const hook = async (body, key) => { const r = routes.find(x => x.p === '/api/pay/sms-hook'), out = { code: 200 }; await r.h[0]({ body, headers: {}, query: { key } }, { status(c) { out.code = c; return this; }, json(j) { out.json = j; return this; } }); return out; };
  return { pv, ps, hook, col, routes };
}
const ACC = [{ method: 'telebirr', number: '0946705941', holder: 'TIRUNEH AWOKE' }];
const ts0 = Date.UTC(2026, 10, 4, 6, 0);
test('SMS ማረጋገጫ፦ ሚስጥር ግዴታ፣ ተቀብለው ledger፣ ማጣቀሻ+መጠን+ዘዴ ተዛምዶ፣ አንድ ጊዜ ብቻ', async () => {
  const t = mk(); assert.equal((await t.hook({ text: TB }, 'nope')).code, 401); const key = t.ps.key();
  assert.deepEqual(await t.hook({ text: 'hello' }, key).then(r => r.json), { ok: true, stored: false }); assert.equal((await t.hook({ text: TB, from: '127' }, key)).json.stored, true); assert.equal((await t.hook({ text: TB }, key)).json.dup, true);
  assert.equal((await t.pv.check({ method: 'telebirr', ref: 'ck12ab34cd', amount: 150, accounts: ACC, ts: ts0, by: 'ai:1' })).state, 'match');
  assert.equal((await t.pv.check({ method: 'telebirr', ref: 'CK12AB34CD', amount: 150, accounts: ACC, ts: ts0, by: 'ai:2' })).state, 'mismatch');          // ሌላ ጥያቄ ተመሳሳይ ማጣቀሻ
  assert.equal((await t.pv.check({ method: 'telebirr', ref: 'CK12AB34CD', amount: 150, accounts: ACC, ts: ts0, by: 'ai:1' })).state, 'match');          // ተመሳሳዩ ጥያቄ ድጋሚ ይቻላል
  assert.equal((await t.pv.check({ method: 'telebirr', ref: 'CK12AB34CD', amount: 300, accounts: ACC, ts: ts0 })).state, 'mismatch');          // ያነሰ መጠን
  assert.equal((await t.pv.check({ method: 'CBE', ref: 'CK12AB34CD', amount: 150, accounts: ACC, ts: ts0 })).state, 'mismatch');          // የዘዴ አለመመሳሰል
  await t.hook({ text: CBE, from: 'CBE' }, key); assert.equal((await t.pv.check({ method: 'ንግድ ባንክ', ref: 'FT26308XXXY1', amount: 200, accounts: ACC, ts: ts0 })).state, 'match');
  assert.equal((await t.pv.check({ method: 'telebirr', ref: 'ZZ99ZZ99ZZ', amount: 1, accounts: ACC, ts: ts0 })).state, 'notfound');
});
test('SMS ከጥያቄው በኋላ ቢደርስ የ AI ክፍያ ራሱ ይጸድቃል፤ ከጥያቄው በፊት ከደረሰም ወዲያው', async () => {
  for (const early of [false, true]) {
    const t = mk(), routes = [], mkr = m => (p, ...h) => routes.push({ m, p, h }), app = { get: mkr('GET'), post: mkr('POST'), put: mkr('PUT'), delete: mkr('DELETE'), patch: mkr('PATCH') }, told = [];
    let n = 0; const svc = require('../server/aisvc')({ app, col: t.col, limit: () => true, who: () => ({ uid: 'u1' }), adminOnly: () => true, saveMany: async () => { }, bad() { }, S: (x, m) => String(x == null ? '' : x).slice(0, m), N: Number, nid: () => 'q' + (++n), notifyUser: (u, m) => told.push(m), notifyAdmin() { }, ai: AIM.create({ ANTHROPIC_API_KEY: 'k' }, async () => ({})), pv: t.pv, payAccounts: () => ACC, now: () => Date.UTC(2026, 10, 4, 7, 30) });
    t.col('data/users/u1').acct = { name: 'አበበ', phone: '0911' }; const key = t.ps.key(), PROOF = { data: Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.alloc(30)]).toString('base64') };
    if (early) await t.hook({ text: TB }, key); const r = await svc.buy('u1', { plan: 'm', method: 'telebirr', ref: 'CK12AB34CD', proof: PROOF }); await new Promise(x => setTimeout(x, 20));
    if (!early) { assert.equal(t.col('ai/reqs')[r.id].status, 'pending'); assert.ok(told.some(m => /እስካሁን አልተገኘም/.test(m))); await t.hook({ text: TB }, key); await new Promise(x => setTimeout(x, 30)); }
    assert.equal(t.col('ai/reqs')[r.id].status, 'approved', 'early=' + early); assert.equal(svc.acc('u1').paid, true);
  }
});
