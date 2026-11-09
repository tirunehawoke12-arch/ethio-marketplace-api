const { test } = require('node:test'); const assert = require('node:assert/strict'); const zlib = require('zlib');
const { extractPdfImages } = require('../server/pdfimg');
test('v37፦ ደረጃ (ዝርዝር/መካከለኛ/ገረፍ ገረፍ)፣ ምስሎች፣ ቋሚ ቁልፍ፣ gzip ድምፅ', async () => {
  const routes = {}, app = { get: (p, f) => { routes['GET ' + p] = f; }, post: (p, f) => { routes['POST ' + p] = f; } }, seen = [];
  const ai = { enabled: true, provider: 'gemini', lim: { chat: 5 }, refund() { }, take: () => ({ ok: true }), usage: () => ({}), speak: async () => ({ pcm: Buffer.alloc(48000), rate: 24000 }),
    boardPage: async (t, n, tot, src, dom, lv) => { seen.push({ lv, imgs: (src.imgs || []).length }); return { title: 'ገጽ', lines: [{ k: 'text', t: 'a', say: 'አንድ ' + lv, img: [0] }, { k: 'text', t: 'b', say: 'ሁለት' }] }; }, boardAsk: async () => 'መልስ' };
  const svc = require('../server/aisvc')({ app, col: (() => { const d = {}; return p => d[p] || (d[p] = {}); })(), who: () => null, adminOnly: () => false, saveMany: async () => { }, bad: (res, c, e) => res.status(c).json({ ok: false, error: e }), S: (x, n) => String(x == null ? '' : x).slice(0, n || 1e9), N: Number, nid: () => 'x' + Math.random(), limit: () => true, ai });
  const rgb = zlib.deflateSync(Buffer.alloc(80 * 80 * 3, 9)), imgBuf = Buffer.concat([Buffer.from('%PDF\n7 0 obj\n<< /Subtype /Image /Width 80 /Height 80 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /FlateDecode >>\nstream\n'), rgb, Buffer.from('\nendstream\nendobj\n')]);
  const ex = extractPdfImages(imgBuf); assert.equal(ex.length, 1); assert.equal(ex[0].mime, 'image/png'); assert.equal(ex[0].buf.slice(1, 4).toString(), 'PNG');
  const id = svc.boardPut('u', 'T', { total: 2, pageSrc: async n => ({ text: 'p' + n, imgs: n === 1 ? ex : [] }) }, { admin: true, key: 'KEY1' }), res0 = () => { const o = { h: {} }; return { o, r: { status(c) { o.code = c; return this; }, json(j) { o.json = j; return this; }, set(h) { Object.assign(o.h, h); return this; }, send(b) { o.body = b; return this; }, end() { o.ended = true; return this; } } }; };
  const call = async (k, params, query, body, hdr) => { const x = res0(); await routes[k]({ params, query: query || {}, body, headers: hdr || {}, ip: '1.1.1.1' }, x.r); return x.o; };
  assert.equal((await call('GET /api/ai/board/:id', { id })).json.key, 'KEY1');
  const m = (await call('GET /api/ai/board/:id/page/:n', { id, n: '1' })).json, d = (await call('GET /api/ai/board/:id/page/:n', { id, n: '1' }, { lv: 'd' })).json, s = (await call('GET /api/ai/board/:id/page/:n', { id, n: '1' }, { lv: 's' })).json;
  assert.deepEqual(seen.map(x => x.lv), ['m', 'd', 's'], 'እያንዳንዱ ደረጃ ለየብቻ ይዘጋጃል'); assert.equal(seen[0].imgs, 1);
  assert.equal(m.page.lines[0].say, 'አንድ m'); assert.equal(d.page.lines[0].say, 'አንድ d'); assert.equal(s.page.lines[0].say, 'አንድ s');
  assert.deepEqual(m.page.lines[0].img, [0], 'ምስል ከመስመር ጋር'); assert.equal(m.page.nimg, 1);
  await call('GET /api/ai/board/:id/page/:n', { id, n: '1' }, { lv: 'd' }); assert.equal(seen.length, 3, 'ደረጃ ይሸጎጣል');
  const im = await call('GET /api/ai/board/:id/img/:n/:i', { id, n: '1', i: '0' }); assert.equal(im.h['content-type'], 'image/png'); assert.ok(Buffer.isBuffer(im.body));
  assert.equal((await call('GET /api/ai/board/:id/img/:n/:i', { id, n: '1', i: '5' })).code, 404);
  await new Promise(r => setTimeout(r, 60)); const au = await call('GET /api/ai/board/:id/tts/:n/g/:g', { id, n: '1', g: '0' }, { lv: 'd' }, null, { 'accept-encoding': 'gzip' });
  assert.ok(au.body, 'ድምፅ ተልኳል'); if (au.h['content-encoding'] === 'gzip') assert.equal(zlib.gunzipSync(au.body).slice(0, 4).toString(), 'RIFF');
});
