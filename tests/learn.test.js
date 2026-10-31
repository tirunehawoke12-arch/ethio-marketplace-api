const test = require('node:test'), assert = require('node:assert'), crypto = require('node:crypto');
const TOKEN = '123:TESTTOKEN';
function signed(user, age = 0) { const p = new URLSearchParams({ auth_date: String(Math.floor(Date.now() / 1000) - age), query_id: 'q', user: JSON.stringify(user) }); const str = [...p.entries()].map(([k, v]) => k + '=' + v).sort().join('\n'); p.set('hash', crypto.createHmac('sha256', crypto.createHmac('sha256', 'WebAppData').update(TOKEN).digest()).update(str).digest('hex')); return p.toString(); }
function harness() {
  const routes = [], mk = m => (p, ...h) => routes.push({ m, p, h }), app = { get: mk('GET'), post: mk('POST'), put: mk('PUT'), delete: mk('DELETE'), patch: mk('PATCH') };
  const docs = {}, col = p => docs[p] || (docs[p] = {}); docs['data/users/t1'] = { acct: { email: 't@x.com', phone: '0911', ts: 1 } };
  const ctx = { app, col, bump() {}, pool: null, pgUpsert: async () => {}, persist() {}, readTok: q => q.tok, limit: () => true, notifyUser() {}, notifyAdmin() {} };
  const mkApi = require('../server/market')(ctx); require('../server/learn')({ app, col, limit: ctx.limit, persist() {}, bump() {}, token: TOKEN, botUsername: 'TestBot', baseUrl: 'https://x.et', ...mkApi });
  const call = async (m, path, { tok, body, params, query, headers } = {}) => { const r = routes.find(x => x.m === m && x.p === path); const out = { code: 200 }; const res = { status(c) { out.code = c; return this; }, json(j) { out.json = j; return this; }, set() { return this; }, send(b) { out.body = b; return this; }, sendStatus(c) { out.code = c; return this; } }; await r.h[r.h.length - 1]({ tok, body: body || {}, params: params || {}, ip: '1', headers: headers || {}, query: query || {} }, res); return out; };
  return { call, col };
}
const T = { k: 'admin' }, PNG = 'data:image/png;base64,' + Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.alloc(40)]).toString('base64');
async function setup(h) {
  const id = (await h.call('POST', '/api/learn/decks', { tok: T, body: { title: 'ባዮሎጂ 9' } })).json.id;
  const m = (await h.call('POST', '/api/learn/decks/:id/media', { tok: T, params: { id }, body: { dataUrl: PNG } })).json.id;
  await h.call('POST', '/api/learn/decks/:id/content', { tok: T, params: { id }, body: { slides: [{ title: 'ሴል', blocks: [{ k: 'h', t: 'ሴል' }, { k: 'li', t: 'ኒውክሊየስ', l: 1 }, { k: 'img', m, alt: 'x' }, { k: 'img', m: 'FAKE' }, { k: 'p', t: '' }] }] } });
  await h.call('POST', '/api/learn/decks/:id/settings', { tok: T, params: { id }, body: { status: 'on', roster: 'አበበ በቀለ, S001\nትዕግስት አለሙ;S002\nbad line\nአበበ ዳግም, S001' } });
  return { id, m };
}
test('initData ማረጋገጫ፦ ትክክለኛ፣ የተበላሸ፣ ያረጀ', () => {
  const { checkInitData } = require('../server/learn'); assert.equal(checkInitData(signed({ id: 7, first_name: 'አ' }), TOKEN).id, '7');
  assert.equal(checkInitData(signed({ id: 7 }).replace('user=', 'user=x'), TOKEN), null); assert.equal(checkInitData(signed({ id: 7 }, 90000), TOKEN), null); assert.equal(checkInitData(signed({ id: 7 }), 'other:token'), null); assert.equal(checkInitData('', TOKEN), null);
});
test('ተማሪ ፍሰት፦ ስም+ID፣ ከ Telegram ውጭ ውድቅ፣ ID ከአንድ አካውንት ጋር ይታሰራል፣ ንባብ እና ምስል በክፍለ ጊዜ', async () => {
  const h = harness(); const { id, m } = await setup(h); assert.equal((await h.call('GET', '/api/learn/decks/:id', { tok: T, params: { id } })).json.roster.length, 2);          // የተበላሸ እና የተደገመ መስመር ተዘለለ
  const auth = (init, name, sid) => h.call('POST', '/api/learn/auth', { body: { deck: id, initData: init, name, sid } });
  assert.equal((await auth('', 'አበበ', 'S001')).json.error, 'telegram_only'); assert.equal((await auth(signed({ id: 1 }), 'ሌላ', 'S001')).json.error, 'wrong_credentials'); assert.equal((await auth(signed({ id: 1 }), 'አበበ', 'S999')).json.error, 'wrong_credentials');
  const ok = (await auth(signed({ id: 1 }), ' አበበ ', 's-001')).json; assert.equal(ok.ok, true); assert.equal(ok.name, 'አበበ');
  assert.equal((await auth(signed({ id: 2 }), 'አበበ', 'S001')).json.error, 'id_in_use');                    // ሌላ ተማሪ የዚህን ID መጠቀም አይችልም
  assert.equal((await auth(signed({ id: 1 }), 'ትዕግስት', 'S002')).json.error, 'tg_other_id');                // አንድ አካውንት ሁለት ID አይጠቀምም
  assert.equal((await h.call('GET', '/api/learn/read', { headers: { 'x-learn': 'nope' } })).code, 401);
  const rd = (await h.call('GET', '/api/learn/read', { headers: { 'x-learn': ok.token } })).json; assert.equal(rd.slides[0].blocks.length, 3); assert.equal(rd.mark, undefined);      // የውሸት ምስል እና ባዶ ጽሑፍ ተጣሩ
  assert.equal((await h.call('GET', '/api/learn/media/:id', { params: { id: m }, query: { s: ok.token } })).body.length > 0, true); assert.equal((await h.call('GET', '/api/learn/media/:id', { params: { id: m }, query: { s: 'x' } })).code, 401);
  await h.call('POST', '/api/learn/decks/:id/reset', { tok: T, params: { id }, body: { sid: 'S001' } }); assert.equal((await h.call('GET', '/api/learn/read', { headers: { 'x-learn': ok.token } })).code, 401);   // ሲፈታ ክፍለ ጊዜው ይሞታል
  assert.equal((await auth(signed({ id: 2 }), 'አበበ', 'S001')).json.ok, true);                                  // ከተፈታ በኋላ ሌላ አካውንት ይችላል
  const det = (await h.call('GET', '/api/learn/decks/:id', { tok: T, params: { id } })).json.roster.find(r => r.id === 'S001'); assert.equal(det.bound, true);
});
test('መስኮት እና ባለቤትነት፦ የተዘጋ ፋይል አይከፈትም፤ አድሚን ያልሆነ አያስተዳድርም', async () => {
  const h = harness(); const { id } = await setup(h); await h.call('POST', '/api/learn/decks/:id/settings', { tok: T, params: { id }, body: { closes: '2020-01-01' } });
  assert.equal((await h.call('POST', '/api/learn/auth', { body: { deck: id, initData: signed({ id: 1 }), name: 'አበበ', sid: 'S001' } })).json.error, 'deck_closed');
  h.col('data/users/o2').acct = { email: 'o@x.com', phone: '0912', ts: 1 }; assert.equal((await h.call('GET', '/api/learn/decks/:id', { tok: { u: 'o2', k: 'user' }, params: { id } })).code, 403); assert.equal((await h.call('POST', '/api/learn/decks', { tok: { u: 'o2', k: 'user' }, body: { title: 'xx' } })).code, 403);      // መምህር = አድሚን ብቻ
  assert.equal((await h.call('DELETE', '/api/learn/decks/:id', { tok: T, params: { id } })).json.ok, true); assert.equal((await h.call('GET', '/api/learn/public/:id', { params: { id } })).code, 404);
});
test('ቤተ-መጽሐፍት፦ ተማሪው የተፈቀዱለትን ብዙ ፋይሎች ብቻ ያያል', async () => {
  const h = harness(); const a = (await setup(h)).id;
  const b = (await h.call('POST', '/api/learn/decks', { tok: T, body: { title: 'ኬሚስትሪ' } })).json.id, c = (await h.call('POST', '/api/learn/decks', { tok: T, body: { title: 'ሌላ ክፍል' } })).json.id;
  await h.call('POST', '/api/learn/decks/:id/content', { tok: T, params: { id: b }, body: { slides: [{ title: 'x', blocks: [{ k: 'p', t: 'ሰላም' }] }] } });
  await h.call('POST', '/api/learn/decks/:id/settings', { tok: T, params: { id: b }, body: { status: 'on', roster: 'አበበ በቀለ, S001' } });
  await h.call('POST', '/api/learn/decks/:id/settings', { tok: T, params: { id: c }, body: { status: 'on', roster: 'ትዕግስት አለሙ, S002' } });
  const lib = (init, name, sid) => h.call('POST', '/api/learn/library', { body: { initData: init, name, sid } });
  assert.equal((await lib('', 'አበበ', 'S001')).json.error, 'telegram_only');
  const r = (await lib(signed({ id: 1 }), 'አበበ', 'S001')).json; assert.equal(r.items.length, 2); assert.deepEqual(r.items.map(x => x.id).sort(), [a, b].sort());
  assert.equal((await lib(signed({ id: 1 }), 'አበበ', 'S002')).json.error, 'wrong_credentials');
  await h.call('POST', '/api/learn/auth', { body: { deck: a, initData: signed({ id: 1 }), name: 'አበበ', sid: 'S001' } });
  const o = (await lib(signed({ id: 9 }), 'አበበ', 'S001')).json; assert.deepEqual(o.items.map(x => x.id), [b]);      // በ a ተይዟል፣ b አልተያዘም
});

test('ክፍያ ያለው ፋይል፦ ካታሎግ → ጥያቄ → አድሚን ያጸድቃል → ስም+ID ተሰጥቶ በቤተ-መጽሐፍት ይታያል', async () => {
  const h = harness(), U = { u: 'o2', k: 'user' }; h.col('data/users/o2').acct = { email: 'o@x.com', phone: '0912', ts: 1 }; const { id } = await setup(h);
  await h.call('POST', '/api/learn/decks/:id/settings', { tok: T, params: { id }, body: { price: 150, cat: 'PDF', desc: 'ማስታወሻ', listed: true } });
  assert.equal((await h.call('GET', '/api/learn/catalog')).json.items.length, 1); assert.equal((await h.call('GET', '/api/learn/catalog')).json.items[0].price, 150);
  const buy = b => h.call('POST', '/api/learn/buy', { tok: U, body: { deck: id, name: 'ሰላም ተስፋዬ', phone: '0911000000', ...b } });
  assert.equal((await buy({})).json.error, 'payment_proof_required'); assert.equal((await h.call('POST', '/api/learn/buy', { body: { deck: id } })).code, 401);
  assert.equal((await buy({ method: 'telebirr', ref: 'ABC12345' })).json.status, 'pending'); assert.equal((await buy({ method: 'telebirr', ref: 'ZZZ99999' })).json.error, 'already_requested');
  assert.equal((await h.call('GET', '/api/learn/admin/requests', { tok: U })).code, 403);
  const rq = (await h.call('GET', '/api/learn/admin/requests', { tok: T })).json; assert.equal(rq.items.length, 1); assert.equal((await h.call('GET', '/api/learn/my', { tok: U })).json.items[0].link, '');
  const ap = (await h.call('POST', '/api/learn/admin/requests/:id/:act', { tok: T, params: { id: rq.items[0].id, act: 'approve' } })).json; assert.equal(ap.ok, true); assert.match(ap.sid, /^ST\d{4}$/);
  const my = (await h.call('GET', '/api/learn/my', { tok: U })).json; assert.equal(my.student.sid, ap.sid); assert.equal(my.student.name, 'ሰላም'); assert.match(my.items[0].link, /d_/);
  const lib = (await h.call('POST', '/api/learn/library', { body: { initData: signed({ id: 5 }), name: 'ሰላም', sid: ap.sid.toLowerCase() } })).json; assert.equal(lib.items.length, 1);
  assert.equal((await h.call('POST', '/api/learn/admin/requests/:id/:act', { tok: T, params: { id: rq.items[0].id, act: 'approve' } })).code, 409);
  await h.call('POST', '/api/learn/decks/:id/settings', { tok: T, params: { id }, body: { listed: false } }); assert.equal((await h.call('GET', '/api/learn/catalog')).json.items.length, 0);
});
test('ክፍያ ማጣቀሻ ድግግሞሽ እና ውድቅ', async () => {
  const h = harness(), U = { u: 'o2', k: 'user' }, U3 = { u: 'o3', k: 'user' }; h.col('data/users/o2').acct = { email: 'o@x.com', phone: '0912', ts: 1 }; h.col('data/users/o3').acct = { email: 'p@x.com', phone: '0913', ts: 1 }; const { id } = await setup(h);
  await h.call('POST', '/api/learn/decks/:id/settings', { tok: T, params: { id }, body: { price: 50, listed: true } });
  await h.call('POST', '/api/learn/buy', { tok: U, body: { deck: id, name: 'አልማዝ', method: 'CBE', ref: 'REF-0001' } });
  assert.equal((await h.call('POST', '/api/learn/buy', { tok: U3, body: { deck: id, name: 'ዮሐንስ', method: 'CBE', ref: 'ref 0001' } })).json.error, 'duplicate_reference');
  const rid = (await h.call('GET', '/api/learn/admin/requests', { tok: T })).json.items[0].id; assert.equal((await h.call('POST', '/api/learn/admin/requests/:id/:act', { tok: T, params: { id: rid, act: 'reject' }, body: { reason: 'አልተገኘም' } })).json.ok, true);
  assert.equal((await h.call('POST', '/api/learn/buy', { tok: U, body: { deck: id, name: 'አልማዝ', method: 'CBE', ref: 'REF-0002' } })).json.status, 'pending');      // ከውድቅ በኋላ እንደገና ይቻላል
});
