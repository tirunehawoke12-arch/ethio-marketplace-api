const test = require('node:test'), assert = require('node:assert');
test('ምስል ከዳታቤዝ በፍላጎት ይነበባል (dl:true ምልክት)፤ ከሌለ 404/ያለው በቀጥታ', async () => {
  const routes = [], mk = m => (p, ...h) => routes.push({ m, p, h }), app = { get: mk('GET'), post: mk('POST'), put: mk('PUT'), delete: mk('DELETE'), patch: mk('PATCH') }, docs = {}, col = p => docs[p] || (docs[p] = {}), q = [];
  const png = Buffer.from('89504e470d0a1a0a0000', 'hex'); col('_img').a = { m: 'image/png', dl: true, sz: 10 }; col('_img').b = { m: 'image/png', d: png.toString('base64') }; col('_img').c = { m: 'image/png', dl: true };
  const pool = { query: async (sql, args) => { q.push(args); return { rows: args[1] === 'a' ? [{ d: png.toString('base64') }] : [] }; } };
  require('../server/market')({ app, col, bump() { }, pool, pgUpsert: async () => { }, persist() { }, readTok: x => x.tok, limit: () => true, notifyUser() { }, notifyAdmin() { }, imgs: { enabled: false } });
  const h = routes.find(r => r.m === 'GET' && r.p === '/api/market/img/:id').h.slice(-1)[0], get = async id => { const o = { code: 200 }; await h({ params: { id } }, { set() { return this; }, send(b) { o.body = b; }, sendStatus(c) { o.code = c; }, redirect() { } }); return o; };
  assert.ok((await get('a')).body.equals(png), 'ከዳታቤዝ ተነበበ'); assert.equal(q.length, 1); assert.ok((await get('b')).body.equals(png)); assert.equal(q.length, 1, 'በማስታወሻ ያለው ዳታቤዝ አልጠየቀም'); assert.equal((await get('c')).code, 404, 'ዳታ ከጠፋ 404'); assert.equal((await get('zz')).code, 404);
});
