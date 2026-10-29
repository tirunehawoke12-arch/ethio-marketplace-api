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
const T = { u: 't1', k: 'user' }, PNG = 'data:image/png;base64,' + Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), Buffer.alloc(40)]).toString('base64');
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
test('መስኮት እና ባለቤትነት፦ የተዘጋ ፋይል አይከፈትም፤ ሌላ መምህር አያይም', async () => {
  const h = harness(); const { id } = await setup(h); await h.call('POST', '/api/learn/decks/:id/settings', { tok: T, params: { id }, body: { closes: '2020-01-01' } });
  assert.equal((await h.call('POST', '/api/learn/auth', { body: { deck: id, initData: signed({ id: 1 }), name: 'አበበ', sid: 'S001' } })).json.error, 'deck_closed');
  h.col('data/users/o2').acct = { email: 'o@x.com', phone: '0912', ts: 1 }; assert.equal((await h.call('GET', '/api/learn/decks/:id', { tok: { u: 'o2', k: 'user' }, params: { id } })).code, 404);
  assert.equal((await h.call('DELETE', '/api/learn/decks/:id', { tok: T, params: { id } })).json.ok, true); assert.equal((await h.call('GET', '/api/learn/public/:id', { params: { id } })).code, 404);
});
