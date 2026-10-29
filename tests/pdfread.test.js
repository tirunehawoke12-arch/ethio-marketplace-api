const test = require('node:test'), assert = require('node:assert'), fs = require('node:fs');
const { blocksFromPages } = require('../src/lib/pdfread');
test('PDF፦ እውነተኛ የስላይድ PDF ቃላት → ርዕስ፣ ነጥብ (ደረጃ)፣ አንቀጽ', () => {
  const pages = blocksFromPages(JSON.parse(fs.readFileSync(__dirname + '/fixtures/pdf_items.json', 'utf8')));
  assert.equal(pages.length, 3); assert.equal(pages[0].title, 'የባዮሎጂ መግቢያ'); assert.equal(pages[1].title, 'ሴል ምንድን ነው?');
  const li = pages[1].blocks.filter(b => b.k === 'li'); assert.equal(li.length, 3); assert.equal(li[0].t, 'ሴል የሕይወት መሠረታዊ አሃድ ነው'); assert.equal(li[0].l, 0); assert.equal(li[1].l, 1);   // ነጥብ ምልክት ተወግዷል፣ ደረጃ ተለይቷል
  assert.equal(pages[2].hasImg, true); assert.ok(pages[2].blocks.some(b => b.k === 'p' && /ሥዕሉን/.test(b.t)));
});
const W = (s, x, y, h = 12) => ({ s, x, y, h, w: s.length * h * 0.5 });
test('PDF፦ የተሰበሩ መስመሮች ይቀጥላሉ፣ ግርጌ እና የገጽ ቁጥር ይወገዳሉ፣ ተከታታይ ርዕስ ይዋሃዳል', () => {
  const mk = n => ({ H: 600, imgs: 0, items: [W('Chapter', 50, 540, 24), W('One', 150, 540, 24), W('and', 50, 510, 24), W('Two', 100, 510, 24),
    W('•', 50, 450), W('First', 70, 450), W('point', 110, 450), W('continues', 70, 436), W('here.', 130, 436), W('•', 50, 400), W('Second', 70, 400),
    W('A', 50, 340), W('plain', 70, 340), W('paragraph', 110, 340), W('Professional Ethics ' + n, 200, 20), W(String(n), 500, 8)] });
  const pages = blocksFromPages([mk(1), mk(2), mk(3), mk(4)]);
  for (const p of pages) { assert.deepEqual(p.blocks.map(b => b.k), ['h', 'li', 'li', 'p']); assert.equal(p.blocks[0].t, 'Chapter One and Two'); assert.equal(p.blocks[1].t, 'First point continues here.'); assert.ok(!JSON.stringify(p).includes('Professional')); }
});
