'use strict';
/* ===== PDF፦ ዋናው ፋይል ሳይነካ ከእያንዳንዱ ገጽ በኋላ የአማርኛ ትርጉም ገጽ ማስገባት (pdf-lib ያስፈልጋል — optionalDependencies) =====
   ገጾቹ በ copyPages ይገለበጣሉ (አቀማመጥ፣ ምስል፣ ፎንት እንዳለ)፤ የትርጉም ገጽ በ docout.buildTrPages ይሠራል፤
   በዋናው ገጽ ላይ JPEG (DCTDecode) ምስል ካለ ወደ ትርጉም ገጹ በቀኝ አምድ ይቀመጣል። */
const DO = require('./docout');

function lib() { try { return require('pdf-lib'); } catch (e) { return null; } }

/* የገጹ ምስሎች (JPEG ብቻ) በይዘት ቅደም ተከተል — [{ bytes, w, h }] */
function pageImages(L, doc, page, max = 4) {
  const out = [];
  try {
    const { PDFName, PDFRawStream, PDFDict, PDFArray, decodePDFRawStream } = L, ctx = doc.context, res = page.node.Resources();
    const xo = res && res.lookupMaybe(PDFName.of('XObject'), PDFDict); if (!xo) return out;
    const dec = x => { try { return Buffer.from(decodePDFRawStream(x).decode()).toString('latin1'); } catch (e) { return ''; } };
    let content = ''; const c = page.node.Contents(); const arr = c instanceof PDFArray ? c.asArray().map(r => ctx.lookup(r)) : c ? [c] : []; for (const st of arr) if (st instanceof PDFRawStream) content += dec(st) + '\n';
    const order = [...content.matchAll(/\/([A-Za-z0-9_.\-]+)\s+Do\b/g)].map(m => m[1]), seen = new Set();
    for (const nm of order) {
      if (seen.has(nm) || out.length >= max) continue; seen.add(nm); const st = xo.lookup(PDFName.of(nm)); if (!(st instanceof PDFRawStream)) continue; const d = st.dict;
      if (!d.get(PDFName.of('Subtype')) || String(d.get(PDFName.of('Subtype'))) !== '/Image') continue; const f = d.get(PDFName.of('Filter')), fs = String(f && f.asArray ? f.asArray().map(String).join(',') : f);
      if (!/^\/DCTDecode$/.test(fs)) continue; const w = Number(String(d.lookup(PDFName.of('Width')))), h = Number(String(d.lookup(PDFName.of('Height')))); if (!(w >= 60 && h >= 60)) continue;
      out.push({ bytes: new Uint8Array(st.contents), w, h });          // ራሱን የቻለ ቅጂ (Buffer pool offset ችግር ለ pdf-lib)
    }
  } catch (e) { /* ምስል ማውጣት አልተቻለም — ጽሑፍ ብቻ */ }
  return out;
}

/* buf = ዋናው PDF፤ items = [{ n (1-based), am }]፤ opts = { preset, size } → Buffer | null (pdf-lib ከሌለ/ከተሳሳተ) */
async function interleavePdf(buf, items, opts) {
  const L = lib(); if (!L) return null;
  try {
    const { PDFDocument } = L, src = await PDFDocument.load(buf, { ignoreEncryption: true }), total = src.getPageCount(), by = new Map(items.map(i => [i.n, i]));
    const info = [], tr = []; for (let i = 0; i < total; i++) { const it = by.get(i + 1); if (!it || !String(it.am || '').trim()) continue; const pg = src.getPage(i), { width, height } = pg.getSize(), imgs = pageImages(L, src, pg); info.push({ i, imgs }); tr.push({ n: i + 1, am: it.am, w: width, h: height, imgs: imgs.map(x => ({ ar: x.w / x.h })) }); }
    const out = await PDFDocument.create(), origPages = await out.copyPages(src, [...Array(total).keys()]);
    let trDoc = null, trPages = [], map = {}; if (tr.length) { const b = DO.buildTrPages(tr, opts); map = b.map; trDoc = await PDFDocument.load(b.buf); trPages = await out.copyPages(trDoc, [...Array(trDoc.getPageCount()).keys()]); }
    const emb = new Map();
    for (let i = 0; i < total; i++) {
      out.addPage(origPages[i]); const m = map[i + 1]; if (!m) continue;
      for (let k = 0; k < m.count; k++) out.addPage(trPages[m.page0 + k]);
      const fi = info.find(x => x.i === i), firstTr = out.getPage(out.getPageCount() - m.count);
      if (fi) for (let j = 0; j < Math.min(fi.imgs.length, m.rects.length); j++) { try { const key = i + ':' + j; let im = emb.get(key); if (!im) { im = await out.embedJpg(fi.imgs[j].bytes); emb.set(key, im); } const r = m.rects[j]; firstTr.drawImage(im, { x: r.x, y: r.y, width: r.w, height: r.h }); } catch (e) { /* ይህ ምስል ሊገባ አልቻለም */ } }
    }
    return Buffer.from(await out.save());
  } catch (e) { console.warn('interleavePdf', e.message); return null; }
}
module.exports = { interleavePdf, pageImages, available: () => !!lib() };
