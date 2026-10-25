const test = require('node:test'), assert = require('node:assert');
const { create, ADMIN_TTL, USER_TTL } = require('../server/tokens');

const mk = (o = {}) => { const st = { sv: {}, adm: 0, susp: {}, t: 1_000_000 }; const T = create({ secret: 's3cret', getUserSv: u => st.sv[u] | 0, getAdminSv: () => st.adm, isSusp: u => !!st.susp[u], now: () => st.t, ...o }); return { st, T }; };

test('ትክክለኛ የተጠቃሚ ምልክት ተቀባይነት አለው', () => { const { T } = mk(); const p = T.verify(T.tokFor('u1', 'user')); assert.equal(p.u, 'u1'); assert.equal(p.k, 'user'); });
test('በሁሉም መሳሪያ ላይ ውጣ — የቆዩ ምልክቶች ይሻራሉ፣ አዲሱ ይሠራል', () => {
  const { st, T } = mk(); const a = T.tokFor('u1', 'user'), b = T.tokFor('u1', 'user'); assert.ok(T.verify(a) && T.verify(b));
  st.sv.u1 = 1; assert.equal(T.verify(a), null); assert.equal(T.verify(b), null); const c = T.tokFor('u1', 'user'); assert.ok(T.verify(c));
});
test('የአንድ ተጠቃሚ መሻር ሌላውን አይነካም', () => { const { st, T } = mk(); const a = T.tokFor('u1', 'user'), b = T.tokFor('u2', 'user'); st.sv.u1 = 5; assert.equal(T.verify(a), null); assert.ok(T.verify(b)); });
test('ከማሻሻያ በፊት የተሰጠ (v የሌለው) ምልክት ገና ሳይሻር ይሠራል', () => { const { T } = mk(); const t = T.sign({ u: 'u1', k: 'user', x: 2_000_000 }); assert.ok(T.verify(t)); });
test('ጊዜው ያለፈ እና የተበላሸ ፊርማ ውድቅ ነው', () => {
  const { st, T } = mk(); const t = T.tokFor('u1', 'user'); st.t += USER_TTL + 1; assert.equal(T.verify(t), null);
  st.t = 1_000_000; const good = T.tokFor('u1', 'user'), [b, s] = good.split('.'); assert.equal(T.verify(b + '.' + s.slice(0, -2) + 'AA'), null); assert.equal(T.verify('x.y'), null); assert.equal(T.verify(''), null);
});
test('የታገደ ተጠቃሚ ምልክት ውድቅ ነው', () => { const { st, T } = mk(); const t = T.tokFor('u1', 'user'); st.susp.u1 = true; assert.equal(T.verify(t), null); });
test('አድሚን፦ ዕድሜ 12 ሰዓት ብቻ', () => { const { st, T } = mk(); const t = T.tokFor('admin', 'admin'); assert.ok(T.verify(t)); st.t += ADMIN_TTL - 1000; assert.ok(T.verify(t)); st.t += 2000; assert.equal(T.verify(t), null); });
test('አድሚን፦ የድሮ የ90-ቀን ምልክት ተቀባይነት የለውም', () => { const { st, T } = mk(); const old = T.sign({ u: 'admin', k: 'admin', x: st.t + USER_TTL }); assert.equal(T.verify(old), null); });
test('አድሚን፦ ሁሉንም መሳሪያ ማስወጣት', () => { const { st, T } = mk(); const a = T.tokFor('admin', 'admin'); st.adm = 1; assert.equal(T.verify(a), null); assert.ok(T.verify(T.tokFor('admin', 'admin'))); });
test('ስም-አልባ (anon) ምልክት በ sv አይነካም', () => { const { st, T } = mk(); const a = T.tokFor('anon-1', 'anon'); st.sv['anon-1'] = 9; assert.ok(T.verify(a)); });
test('የተጠቃሚ ምልክት እንደ አድሚን ሊሠራ አይችልም (k ሲቀየር ፊርማ ይሰበራል)', () => {
  const { T } = mk(); const [b, s] = T.tokFor('u1', 'user').split('.'); const body = JSON.parse(Buffer.from(b, 'base64url')); body.k = 'admin'; const forged = Buffer.from(JSON.stringify(body)).toString('base64url') + '.' + s; assert.equal(T.verify(forged), null);
});
