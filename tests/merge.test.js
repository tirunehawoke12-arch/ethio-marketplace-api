const test = require('node:test'), assert = require('node:assert'), fs = require('fs');
const PM = require('../server/pptxmerge'), PDFM = require('../server/pdfmerge'), { readZip } = require('../src/lib/pptx');
test('PPTX፦ ዋናው ስላይድ ሳይነካ ከእያንዳንዱ በኋላ የትርጉም ስላይድ ይገባል፤ ምስል ይቀመጣል፣ ሠንጠረዥ ከቅጂው ይወገዳል', async () => {
  const src = fs.readFileSync(__dirname + '/fixtures/sample.pptx'), r = await PM.interleavePptx(src, [{ n: 1, am: 'ርዕስ' }, { n: 3, am: 'ሦስተኛ ስላይድ\n• ነጥብ' }], { preset: 'serif', size: 'l' });
  assert.equal(r.added, 2); const a = readZip(src), b = readZip(r.buf);
  for (const nm of a.names.filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))) assert.equal(await a.text(nm), await b.text(nm), 'ዋናው ስላይድ አልተነካም: ' + nm);
  const pres = await b.text('ppt/presentation.xml'), order = [...pres.matchAll(/<p:sldId\b[^>]*r:id="([^"]+)"/g)].map(m => m[1]); assert.equal(order.length, 5);
  const rels = await b.text('ppt/_rels/presentation.xml.rels'), tg = id => new RegExp('Id="' + id + '"[^>]*Target="([^"]+)"|Target="([^"]+)"[^>]*Id="' + id + '"').exec(rels), path = id => { const m = tg(id); return 'ppt/' + (m[1] || m[2]); };
  const third = await b.text(path(order[4])); assert.match(third, /Amharic translation/); assert.match(third, /ሦስተኛ ስላይድ/); assert.match(third, /<p:pic\b/); assert.doesNotMatch(third, /<a:tbl/); assert.match(third, /Noto Serif Ethiopic/);
  assert.match(await b.text('[Content_Types].xml'), /slide[45]\.xml/);
  const srels = await b.text(path(order[4]).replace('slides/', 'slides/_rels/') + '.rels'); assert.match(srels, /slideLayout/); assert.match(srels, /image/); assert.doesNotMatch(srels, /notesSlide/);
});
test('PDF፦ ዋናው ገጽ እንዳለ፣ ከእያንዳንዱ በኋላ የትርጉም ገጽ (pdf-lib ካለ)', async () => {
  let L; try { L = require('pdf-lib'); } catch (e) { return; }
  const d = await L.PDFDocument.create(); d.addPage([595, 842]).drawText('One', { x: 50, y: 780 }); d.addPage([300, 400]).drawText('Two', { x: 20, y: 350 });
  const out = await PDFM.interleavePdf(Buffer.from(await d.save()), [{ n: 1, am: 'አንድ ' }, { n: 2, am: 'ሁለት ' }], {}); assert.ok(out);
  const o = await L.PDFDocument.load(out); assert.equal(o.getPageCount(), 4); assert.deepEqual([o.getPage(0).getSize().width, o.getPage(1).getSize().width, o.getPage(2).getSize().width, o.getPage(3).getSize().width], [595, 595, 300, 300]);
  assert.equal(await PDFM.interleavePdf(Buffer.from('not a pdf'), [{ n: 1, am: 'x' }], {}), null);
});
