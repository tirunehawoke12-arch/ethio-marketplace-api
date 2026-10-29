/* PDF → ለማንበብ ምቹ ብሎኮች (ርዕስ፣ አንቀጽ፣ ነጥቦች) — ምስል ብቻ አይደለም።
   blocksFromPages፦ ንጹህ ስሌት (ያለ pdf.js፣ በ Node ይሞከራል)። readPdf፦ pdf.js (CDN፣ መምህሩ ገጽ ላይ ብቻ) ን ይጠቀማል።
   ብሎክ፦ { k:'h'|'p'|'li', t, l }  ·  ገጽ፦ { title, blocks, chars, hasImg } */
const BULLET = /^[•●▪◦‣·–—−\-*■⁃∙○➢►▶]\s+|^[•●▪◦·]/;
const NUM = /^\(?(\d{1,2}|[a-zA-Z])[.)]\s+/;
const END = /[።፡.:?!፧]\s*$/;
const med = (arr, w) => { const a = arr.map((v, i) => [v, w[i]]).sort((x, y) => x[0] - y[0]), tot = a.reduce((s, x) => s + x[1], 0); let c = 0; for (const [v, k] of a) { c += k; if (c >= tot / 2) return v; } return 12; };

function linesOf(items) {                       // ቃላት → መስመሮች (ከላይ ወደ ታች)
  const L = [], its = items.filter(i => String(i.s).trim()).sort((a, b) => b.y - a.y || a.x - b.x);
  for (const it of its) {
    const l = L.find(q => Math.abs(q.y - it.y) <= 0.5 * Math.max(q.h, it.h)); if (l) l.its.push(it); else L.push({ y: it.y, h: it.h, its: [it] });
  }
  return L.sort((a, b) => b.y - a.y).map(l => {
    l.its.sort((a, b) => a.x - b.x); let t = '', end = null, size = 0, best = 0;
    for (const i of l.its) { if (end !== null && i.x - end > 0.12 * i.h) t += ' '; t += String(i.s).trim(); end = i.x + (i.w || 0); if (i.s.length > best) { best = i.s.length; size = i.h; } }
    return { t: t.replace(/\s+/g, ' ').trim(), x: l.its[0].x, y: l.y, h: size || l.h };
  }).filter(l => l.t);
}

function blocksFromPages(pages) {
  const P = pages.map(p => ({ H: p.H || 792, lines: linesOf(p.items), imgs: p.imgs | 0 }));
  const sizes = [], w = []; for (const p of P) for (const l of p.lines) { sizes.push(l.h); w.push(l.t.length); } const body = med(sizes, w) || 12;
  const norm = t => t.replace(/\d+/g, '#').toLowerCase(), count = {};          // በብዙ ገጽ የሚደጋገሙ ግርጌ/ራስጌ
  for (const p of P) { const seen = new Set(); for (const l of p.lines) { const r = l.y / p.H; if (r < 0.12 || r > 0.9) seen.add(norm(l.t)); } for (const k of seen) count[k] = (count[k] || 0) + 1; }
  const rep = new Set(Object.keys(count).filter(k => count[k] >= Math.max(3, P.length * 0.35)));
  return P.map(p => {
    const lines = p.lines.filter(l => { const r = l.y / p.H; return !((r < 0.12 || r > 0.9) && (rep.has(norm(l.t)) || /^\d{1,3}$/.test(l.t))); });
    const baseX = Math.min(...lines.filter(l => BULLET.test(l.t)).map(l => l.x), Infinity), blocks = []; let prev = null, py = null, ph = 1;
    for (const l of lines) {
      const big = l.h >= body * 1.3 && l.t.length <= 140, gap = py === null ? 0 : py - l.y;
      if (big) { if (prev && prev.k === 'h' && Math.abs(ph - l.h) < body * 0.15 && gap <= l.h * 1.8) prev.t += ' ' + l.t; else blocks.push((prev = { k: 'h', t: l.t })); }
      else if (BULLET.test(l.t) || NUM.test(l.t)) { const t = BULLET.test(l.t) ? l.t.replace(BULLET, '').trim() : l.t; if (t) blocks.push((prev = { k: 'li', t, l: BULLET.test(l.t) && isFinite(baseX) ? Math.max(0, Math.min(3, Math.round((l.x - baseX) / (body * 1.6)))) : 0 })); }
      else if (prev && prev.k !== 'h' && gap <= l.h * 2 && !END.test(prev.t)) prev.t += ' ' + l.t;
      else blocks.push((prev = { k: 'p', t: l.t }));
      py = l.y; ph = l.h;
    }
    const chars = blocks.reduce((a, b) => a + b.t.length, 0), title = (blocks.find(b => b.k === 'h') || blocks[0] || {}).t || '';
    return { title: title.slice(0, 120), blocks, chars, hasImg: p.imgs > 0 };
  });
}

/* ---------- pdf.js (CDN፣ የተወሰነ ስሪት) ---------- */
const CDN = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
let loading = null;
function loadPdfJs() {
  if (typeof window === 'undefined') return Promise.reject(new Error('browser_only')); if (window.pdfjsLib) return Promise.resolve(window.pdfjsLib);
  return (loading = loading || new Promise((ok, no) => { const s = document.createElement('script'); s.src = CDN + 'pdf.min.js'; s.onload = () => { window.pdfjsLib.GlobalWorkerOptions.workerSrc = CDN + 'pdf.worker.min.js'; ok(window.pdfjsLib); }; s.onerror = () => { loading = null; no(new Error('pdfjs_load')); }; document.head.appendChild(s); }));
}
async function readPdf(buf, onProgress) {
  const lib = await loadPdfJs(), doc = await lib.getDocument({ data: new Uint8Array(buf) }).promise, raw = [], pdfPages = [], IMG = new Set([lib.OPS.paintImageXObject, lib.OPS.paintInlineImageXObject, lib.OPS.paintJpegXObject].filter(x => x !== undefined));
  for (let i = 1; i <= doc.numPages; i++) {
    onProgress && onProgress(i, doc.numPages); const page = await doc.getPage(i), tc = await page.getTextContent(), ops = await page.getOperatorList();
    raw.push({ H: page.view[3] - page.view[1], items: tc.items.filter(t => typeof t.str === 'string').map(t => ({ s: t.str, x: t.transform[4], y: t.transform[5], h: Math.hypot(t.transform[2], t.transform[3]) || t.height || 10, w: t.width || 0 })), imgs: ops.fnArray.filter(f => IMG.has(f)).length }); pdfPages.push(page);
  }
  const pages = blocksFromPages(raw), imgPages = pages.filter(p => p.hasImg).length, decoration = pages.length > 4 && imgPages / pages.length > 0.6;     // በአብዛኛው ገጽ ላይ ያለ ምስል = የንድፍ ማስጌጫ
  async function render(i, maxW = 1100, target = 230000) {            // የገጹን ምስል (WebP፣ ከዋናው ትንሽ)
    const page = pdfPages[i], vp0 = page.getViewport({ scale: 1 }); let scale = Math.min(2, maxW / vp0.width), q = 0.78;
    for (let k = 0; k < 6; k++) { const vp = page.getViewport({ scale }), c = document.createElement('canvas'); c.width = Math.round(vp.width); c.height = Math.round(vp.height); await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise; const u = c.toDataURL('image/webp', q); if (u.length < target) return u; q = Math.max(0.5, q - 0.1); scale *= 0.85; }
    return null;
  }
  return { pages, decoration, render, numPages: doc.numPages, avgChars: pages.reduce((a, p) => a + p.chars, 0) / Math.max(1, pages.length) };
}
module.exports = { blocksFromPages, readPdf };
