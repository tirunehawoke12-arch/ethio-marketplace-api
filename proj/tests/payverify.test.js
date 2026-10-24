const test = require('node:test'), assert = require('node:assert');
const { create, refKey } = require('../server/payverify');

const ACC = [{ method: 'telebirr', number: '0946705941', holder: 'TIRUNEH AWOKE CHANIE' }, { method: 'ንግድ ባንክ (CBE)', number: '1000594431379', holder: 'TIRUNEH AWOKE CHANIE' }];
const ord = () => ({ total: 500, ts: Date.now() - 600000, payment: { method: 'telebirr' } });
const J = (over) => create({ PAY_VERIFIER_URL: 'http://v' }).judge(ord(), ACC, { found: true, amount: 500, receiver: '0946705941', ts: Date.now(), ...over });

test('refKey — ባዶ ቦታ፣ ሰረዝ እና ትንሽ ፊደል ችላ ይባላሉ', () => { assert.equal(refKey(' abc 1234-567 '), 'ABC1234567'); });
test('ሙሉ ተዛምዶ → match', () => assert.equal(J({}).state, 'match'));
test('መጠን ያንሳል → mismatch', () => assert.equal(J({ amount: 100 }).state, 'mismatch'));
test('መጠን ከፍ ቢል ይቀበላል', () => assert.equal(J({ amount: 800 }).state, 'match'));
test('ሌላ ተቀባይ → mismatch', () => assert.equal(J({ receiver: '0911999999' }).state, 'mismatch'));
test('ተቀባይ በስም (ሁለት ቃል) ሲመሳሰል → match', () => assert.equal(J({ receiver: 'Tiruneh Awoke' }).state, 'match'));
test('ተቀባይ ከሌለ → unknown (በራስ አይረጋገጥም)', () => assert.equal(J({ receiver: '' }).state, 'unknown'));
test('መጠን ከሌለ → unknown', () => assert.equal(J({ amount: NaN }).state, 'unknown'));
test('ክፍያው ከትዕዛዙ በፊት → mismatch', () => assert.equal(J({ ts: Date.now() - 3600000 }).state, 'mismatch'));
test('አልተገኘም → notfound', () => assert.equal(J({ found: false }).state, 'notfound'));
test('ያለ URL ጠፍቷል፤ auto የሚበራው በ PAY_AUTO_CONFIRM=1 ብቻ', () => {
  assert.equal(create({}).enabled, false); const a = create({ PAY_VERIFIER_URL: 'http://v' }); assert.equal(a.enabled, true); assert.equal(a.auto, false); assert.equal(create({ PAY_VERIFIER_URL: 'http://v', PAY_AUTO_CONFIRM: '1' }).auto, true);
});
test('lookup — ቁልፍ እና ትክክለኛ አካል ይልካል፤ HTTP ስህተት ይወረወራል', async () => {
  let seen; const v = create({ PAY_VERIFIER_URL: 'http://v', PAY_VERIFIER_KEY: 'k' }, async (u, o) => { seen = [u, o]; return { ok: true, json: async () => ({ found: true, amount: '500', receiver: 'x', ts: '2026-01-01T00:00:00Z' }) }; });
  const r = await v.lookup({ method: 'telebirr', ref: 'ABC', amount: 500, accounts: ACC }); assert.equal(seen[1].headers.authorization, 'Bearer k'); assert.equal(JSON.parse(seen[1].body).ref, 'ABC'); assert.equal(r.amount, 500); assert.ok(Number.isFinite(r.ts));
  await assert.rejects(() => create({ PAY_VERIFIER_URL: 'http://v' }, async () => ({ ok: false, status: 500 })).lookup({}), /verifier 500/);
});
