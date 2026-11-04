process.env.PAY_FREE_TELEBIRR = "0";
const test = require('node:test'), assert = require('node:assert');
const AIM = require('../server/ai');
function harness(replyFn, extra = {}) {
  const routes = [], mk = m => (p, ...h) => routes.push({ m, p, h }), app = { get: mk('GET'), post: mk('POST'), put: mk('PUT'), delete: mk('DELETE'), patch: mk('PATCH') };
  const docs = {}, col = p => docs[p] || (docs[p] = {}); docs['data/users/u1'] = { acct: { name: 'አበበ', phone: '0911', email: 'a@x.com' } };
  const ctx = { app, col, bump() {}, pool: null, pgUpsert: async () => {}, persist() {}, readTok: q => q.tok, limit: () => true, notifyUser() {}, notifyAdmin() {} };
  const mkApi = require('../server/market')(ctx), sent = [], told = [];
  const prompts = []; const f = async (url, o) => { const b = JSON.parse(o.body); prompts.push(b.system || (b.systemInstruction && b.systemInstruction.parts[0].text)); return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text: replyFn(b) }] }) }; };
  const ai = AIM.create({ ANTHROPIC_API_KEY: 'k' }, f);
  const svc = require('../server/aisvc')({ app, col, limit: () => true, notifyUser: (u, t) => told.push([u, t]), notifyAdmin: (t, b) => sent.push([t, b]), findUid: q => (q === '0911' ? 'u1' : null), ai, ...extra, ...mkApi });
  const call = async (m, path, { tok, body, params, query } = {}) => { const r = routes.find(x => x.m === m && x.p === path); const out = { code: 200 }; const res = { status(c) { out.code = c; return this; }, json(j) { out.json = j; return this; }, set(h) { out.h = h; return this; }, send(b) { out.body = b; return this; } }; await r.h[r.h.length - 1]({ tok, body: body || {}, params: params || {}, ip: '1', headers: {}, query: query || {} }, res); return out; };
  return { call, svc, col, sent, told, prompts, docs };
}
const U = { u: 'u1', k: 'user' }, A = { k: 'admin' }, PROOF = { data: Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.alloc(30)]).toString('base64') };
test('AI፦ ነጻ ተጠቃሚ — ጥልቅ ጥያቄ ከፊል መልስ + ክፍያ፤ ፈጣሪ/ገበያ ነጻ፤ ስርዓት መመሪያ ፈጣሪን ይይዛል', async () => {
  const h = harness(b => (/ሕክምና/.test(JSON.stringify(b.messages)) ? 'ከፊል መልስ።\n[[PAID]]' : 'ሙሉ መልስ'));
  let r = (await h.call('POST', '/api/ai/chat', { tok: U, body: { text: 'ሰላም' } })).json; assert.equal(r.paywall, ''); assert.equal(r.text, 'ሙሉ መልስ');
  r = (await h.call('POST', '/api/ai/chat', { tok: U, body: { text: 'ሕክምና ደረጃ በደረጃ' } })).json; assert.equal(r.paywall, 'premium'); assert.equal(r.text, 'ከፊል መልስ።'); assert.ok(!/PAID/.test(r.text));
  assert.match(h.prompts[0], /Tiruneh Awoke/); assert.match(h.prompts[0], /Bahir Dar/); assert.match(h.prompts[0], /ኢትዮ ዲጂታል ማርኬት/); assert.match(h.prompts[0], /ነጻ ተጠቃሚ/); assert.match(h.prompts[0], /አምቡላንስ/);
});
test('AI፦ ነጻ ገደብ ሲያልቅ ክፍያ፤ እቅድ → ጥያቄ → አድሚን ያጸድቃል → የተከፈለ ሙሉ መልስ', async () => {
  const h = harness(() => 'መልስ [[PAID]]'); await h.call('POST', '/api/ai/admin/config', { tok: A, body: { freeChatDay: 1, paidChatDay: 5 } });
  assert.equal((await h.call('POST', '/api/ai/chat', { tok: U, body: { text: 'x' } })).json.paywall, 'premium');
  assert.equal((await h.call('POST', '/api/ai/chat', { tok: U, body: { text: 'y' } })).json.paywall, 'limit');
  assert.equal((await h.call('POST', '/api/ai/buy', { tok: U, body: { plan: 'zz', method: 'telebirr', ref: 'ABC12345', proof: PROOF } })).code, 400);
  assert.equal((await h.call('POST', '/api/ai/buy', { tok: U, body: { plan: 'w', method: 'telebirr', ref: 'AB' } })).json.error, 'payment_proof_required');
  assert.equal((await h.call('POST', '/api/ai/buy', { tok: U, body: { plan: 'w', method: 'telebirr', ref: 'ABC12345', proof: PROOF } })).json.ok, true); assert.ok(h.sent[0][1].rows[0][0].callback_data.startsWith('aiap:'));
  assert.equal((await h.call('POST', '/api/ai/buy', { tok: U, body: { plan: 'm', method: 'CBE', ref: 'ZZZ99999', proof: PROOF } })).json.error, 'already_requested');
  assert.equal((await h.call('GET', '/api/ai/admin/overview', { tok: U })).code, 403);
  const rq = (await h.call('GET', '/api/ai/admin/requests', { tok: A })).json.items; assert.equal(rq.length, 1);
  assert.equal((await h.call('POST', '/api/ai/admin/requests/:id/:act', { tok: A, params: { id: rq[0].id, act: 'approve' } })).json.ok, true); assert.ok(h.told[0][1].includes('ተረጋግጧል'));
  const r = (await h.call('POST', '/api/ai/chat', { tok: U, body: { text: 'z' } })).json; assert.equal(r.paywall, ''); assert.equal(r.text, 'መልስ'); assert.match(h.prompts[h.prompts.length - 1], /የተከፈለ ተጠቃሚ/);
  assert.equal((await h.call('GET', '/api/ai/info', { tok: U })).json.paid, true);
  assert.equal((await h.call('POST', '/api/ai/admin/requests/:id/:act', { tok: A, params: { id: rq[0].id, act: 'approve' } })).code, 409);
});
test('AI፦ አድሚን ቁጥጥር — ማጥፋት፣ ማገድ፣ በስልክ ቀን መስጠት፣ ገጽ ገደብ፣ እቅድ ማስተካከያ', async () => {
  const h = harness(() => 'እሺ'); await h.call('POST', '/api/ai/admin/config', { tok: A, body: { enabled: false } });
  assert.equal((await h.call('POST', '/api/ai/chat', { tok: U, body: { text: 'x' } })).json.error, 'ai_disabled'); assert.equal((await h.call('POST', '/api/ai/chat', { tok: A, body: { text: 'x' } })).json.ok, true);          // አድሚን ያልተገደበ
  await h.call('POST', '/api/ai/admin/config', { tok: A, body: { enabled: true, freePagesDay: 1, plans: [{ id: 'x', label: 'ሩብ', days: 90, price: 400 }] } });
  assert.equal(h.svc.takePages('u1', false).ok, true); const p = h.svc.takePages('u1', false); assert.equal(p.ok, false); assert.equal(p.paywall, true);
  assert.equal((await h.call('GET', '/api/ai/info', { tok: U })).json.plans[0].price, 400);
  assert.equal((await h.call('POST', '/api/ai/admin/grant', { tok: A, body: { q: '0000', days: 5 } })).code, 404);
  const g = (await h.call('POST', '/api/ai/admin/grant', { tok: A, body: { q: '0911', days: 30 } })).json; assert.ok(g.until > Date.now()); assert.equal(h.svc.takePages('u1', false).ok, true);          // የተከፈለ = ከፍ ያለ ገደብ
  await h.call('POST', '/api/ai/admin/grant', { tok: A, body: { q: '0911', blocked: true } }); assert.equal((await h.call('POST', '/api/ai/chat', { tok: U, body: { text: 'x' } })).json.error, 'ai_blocked');
  const o = (await h.call('GET', '/api/ai/admin/overview', { tok: A })).json; assert.equal(o.users.length, 1); assert.equal(o.users[0].blocked, true); assert.ok(o.defaults.creator.includes('Tiruneh'));
  await h.call('POST', '/api/ai/admin/config', { tok: A, body: { creator: 'አዲስ ፈጣሪ ጽሑፍ' } }); await h.call('POST', '/api/ai/admin/grant', { tok: A, body: { q: '0911', blocked: false } }); await h.call('POST', '/api/ai/chat', { tok: U, body: { text: 'q' } }); assert.match(h.prompts[h.prompts.length - 1], /አዲስ ፈጣሪ ጽሑፍ/);
});

test('AI፦ ማስረጃ ግዴታ፣ የውሸት ፋይል ውድቅ፣ አድሚን ማስረጃውን ያያል፣ ወደ Telegram ይተላለፋል', async () => {
  const fwd = []; const h = harness(() => 'x', { tg: async (m, p) => { fwd.push([m, p]); }, adminChat: () => '555' }); const buy = b => h.call('POST', '/api/ai/buy', { tok: U, body: { plan: 'w', method: 'telebirr', ref: 'REF-11112', ...b } });
  assert.equal((await buy({})).json.error, 'proof_required'); assert.equal((await buy({ proof: { data: Buffer.from('not an image').toString('base64') } })).json.error, 'bad_proof');
  const r = (await buy({ proof: PROOF, tgFile: { type: 'photo', id: 'FILEID' } })).json; assert.equal(r.ok, true); assert.deepEqual(fwd[0][1].photo, 'FILEID'); assert.equal(fwd[0][1].chat_id, '555');
  assert.equal((await h.call('GET', '/api/ai/admin/proof/:id', { tok: U, params: { id: r.id } })).code, 403);
  const pr = await h.call('GET', '/api/ai/admin/proof/:id', { tok: A, params: { id: r.id } }); assert.equal(pr.h['content-type'], 'image/png'); assert.ok(Buffer.isBuffer(pr.body));
  assert.equal((await h.call('GET', '/api/ai/admin/requests', { tok: A })).json.items[0].proof, true); assert.ok(!('d' in (await h.call('GET', '/api/ai/admin/requests', { tok: A })).json.items[0]));
  await h.call('POST', '/api/ai/admin/config', { tok: A, body: { requireProof: false } }); const h2 = harness(() => 'x'); await h2.call('POST', '/api/ai/admin/config', { tok: A, body: { requireProof: false } }); assert.equal((await h2.call('POST', '/api/ai/buy', { tok: U, body: { plan: 'w', method: 'CBE', ref: 'NOPROOF1' } })).json.ok, true);
});
test('AI፦ አጣዳፊ ጥያቄ ነጻ ነው (ገደብ ቢያልቅም)፤ ለሌላው ክፍያ፤ ባለቤት (0946705941) ያልተገደበ', async () => {
  const h = harness(b => (/አጣዳፊ/.test(b.system) ? 'አጣዳፊ እርዳታ' : 'መልስ [[PAID]]')); await h.call('POST', '/api/ai/admin/config', { tok: A, body: { freeChatDay: 0 } });
  assert.equal((await h.call('POST', '/api/ai/chat', { tok: U, body: { text: 'ሕክምና እባክህ' } })).json.paywall, 'limit');
  const r = (await h.call('POST', '/api/ai/chat', { tok: U, body: { text: 'አሞኛል ምን ላድርግ?' } })).json; assert.equal(r.paywall, ''); assert.equal(r.text, 'አጣዳፊ እርዳታ'); assert.match(h.prompts[h.prompts.length - 1], /አምቡላንስ/);
  assert.equal((await h.call('POST', '/api/ai/chat', { tok: U, body: { text: 'I feel sick, help me' } })).json.paywall, '');
  h.docs['data/users/u1'].acct.phone = '+251946705941'; const o = (await h.call('POST', '/api/ai/chat', { tok: U, body: { text: 'ሕክምና ዝርዝር' } })).json; assert.equal(o.paywall, ''); assert.equal(h.svc.isOwner('u1'), true);
  assert.match(h.prompts[0], /0946705941/);
});
test('AI፦ ድረ-ገጹን መርምሮ ይመልሳል (ቁጥሮች + ፍለጋ ውጤት) እና የደንበኝነት ጊዜ ሲያልቅ ይዘጋል/ይነገራል', async () => {
  const qs = []; const h = harness(() => 'ሶፋ አለ', { baseUrl: 'https://x.et', siteSearch: async q => { qs.push(q); return [{ key: 'products', label: '🛍 ዕቃዎች', items: [{ id: 'P1', title: 'ሶፋ', sub: '5000 ብር · ሱቅ', href: '/p/P1' }] }]; } });
  h.docs['mk/products'] = { P1: { id: 'P1', status: 'active', category: 'ቤት' } }; h.docs['mk/shops'] = { S1: { id: 'S1', status: 'active' } };
  await h.call('POST', '/api/ai/chat', { tok: U, body: { text: 'ሶፋ ምን ዋጋ አለ በገበያው?' } }); const sp = h.prompts[h.prompts.length - 1];
  assert.ok(qs.includes('ሶፋ')); assert.match(sp, /1 ሱቆች · 1 ዕቃዎች/); assert.match(sp, /https:\/\/x\.et\/p\/P1/); assert.match(sp, /5000 ብር/);
  const g = (await h.call('POST', '/api/ai/admin/grant', { tok: A, body: { q: '0911', days: 1 } })).json; assert.equal(h.svc.info('u1').paid, true);
  h.col('ai/acc').u1.until = Date.now() + 3600e3; await h.svc.tick(); assert.ok(h.told.some(t => /ያበቃል/.test(t[1]))); const n = h.told.length; await h.svc.tick(); assert.equal(h.told.length, n);          // አንድ ጊዜ ብቻ
  h.col('ai/acc').u1.until = Date.now() - 1000; await h.svc.tick(); assert.ok(h.told.some(t => /አብቅቷል/.test(t[1]))); assert.equal(h.svc.info('u1').paid, false);          // በራሱ ተዘግቷል
});
