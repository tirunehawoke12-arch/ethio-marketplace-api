const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs');
const { parsePptx } = require('../src/lib/pptx');
test('pptx ንባብ፦ ርዕስ፣ ነጥቦች (ደረጃ)፣ ሠንጠረዥ፣ ምስል በንባብ ቅደም ተከተል', async () => {
  const r = await parsePptx(fs.readFileSync(__dirname + '/fixtures/sample.pptx')); assert.equal(r.slides.length, 3);
  const [a, b, c] = r.slides; assert.equal(a.title, 'የባዮሎጂ መግቢያ'); assert.ok(a.blocks.some(x => x.t === 'ክፍል 1 — ሴል & ሕይወት'));
  assert.equal(b.title, 'ሴል ምንድን ነው?'); const li = b.blocks.filter(x => x.k === 'li'); assert.equal(li.length, 3); assert.equal(li[0].l, 0); assert.equal(li[1].l, 1); assert.equal(li[2].t, 'ሳይቶፕላዝም <ሙከራ> & "ጥቅስ"');
  assert.deepEqual(c.blocks.map(x => x.k), ['h', 'tbl', 'p', 'img']);                         // ርዕስ → ሠንጠረዥ → ማስታወሻ → ምስል (ከላይ ወደ ታች)
  assert.deepEqual(c.blocks[1].rows, [['ክፍል', 'ተግባር'], ['ኒውክሊየስ', 'ቁጥጥር']]);
  const img = c.images[0], by = await img.bytes(); assert.equal(img.mime, 'image/png'); assert.equal(Buffer.from(by.slice(1, 4)).toString(), 'PNG');
});
test('pptx ያልሆነ ፋይል ውድቅ', async () => { await assert.rejects(parsePptx(Buffer.from('hello world not a zip file at all'.repeat(3))), /not_zip/); });
