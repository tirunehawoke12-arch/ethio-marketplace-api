'use strict';
/* ===== የትርጉም ውጤት ፋይል — ያለ ምንም ጥገኝነት PDF እና PPTX ይጽፋል =====
   items = [{ n, title?, en, am }]   በአንድ ገጽ/ስላይድ፦ የመጀመሪያው እንግሊዝኛ (original) ከዚያ አማርኛ ትርጉም።
   PDF፦ የ server/fonts/amh.ttf (GNU FreeSerif ንዑስ-ስብስብ፣ ግዕዝ + ላቲን) ይካተታል። PPTX፦ ባዶ መነሻ አብነት + የራሳችን ስላይዶች። */
const zlib = require('zlib'), fs = require('fs'), path = require('path');
const FONT = fs.readFileSync(path.join(__dirname, 'fonts', 'amh.ttf')), FM = JSON.parse(fs.readFileSync(path.join(__dirname, 'fonts', 'amh.json'), 'utf8'));
const BASE = JSON.parse(fs.readFileSync(path.join(__dirname, 'fonts', 'pptx-base.json'), 'utf8'));
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };

/* ---------- ZIP ጸሐፊ ---------- */
function zip(entries) {                 // entries = [[name, Buffer|string]]
  const loc = [], cen = []; let off = 0;
  for (const [name, data] of entries) {
    const nb = Buffer.from(name), raw = Buffer.isBuffer(data) ? data : Buffer.from(String(data), 'utf8'), def = zlib.deflateRawSync(raw), crc = crc32(raw);
    const h = Buffer.alloc(30); h.writeUInt32LE(0x04034b50, 0); h.writeUInt16LE(20, 4); h.writeUInt16LE(0x0800, 6); h.writeUInt16LE(8, 8); h.writeUInt16LE(0, 10); h.writeUInt16LE(0x21, 12); h.writeUInt32LE(crc, 14); h.writeUInt32LE(def.length, 18); h.writeUInt32LE(raw.length, 22); h.writeUInt16LE(nb.length, 26);
    loc.push(h, nb, def);
    const c = Buffer.alloc(46); c.writeUInt32LE(0x02014b50, 0); c.writeUInt16LE(20, 4); c.writeUInt16LE(20, 6); c.writeUInt16LE(0x0800, 8); c.writeUInt16LE(8, 10); c.writeUInt16LE(0, 12); c.writeUInt16LE(0x21, 14); c.writeUInt32LE(crc, 16); c.writeUInt32LE(def.length, 20); c.writeUInt32LE(raw.length, 24); c.writeUInt16LE(nb.length, 28); c.writeUInt32LE(off, 42);
    cen.push(c, nb); off += 30 + nb.length + def.length;
  }
  const cb = Buffer.concat(cen), e = Buffer.alloc(22); e.writeUInt32LE(0x06054b50, 0); e.writeUInt16LE(entries.length, 8); e.writeUInt16LE(entries.length, 10); e.writeUInt32LE(cb.length, 12); e.writeUInt32LE(off, 16);
  return Buffer.concat([...loc, cb, e]);
}

/* ---------- የጽሑፍ ዝግጅት ---------- */
const clean = s => String(s == null ? '' : s).replace(/\r/g, '').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').replace(/\t/g, '    ').replace(/\*\*/g, '').trim();
const glyph = cp => FM.m[cp] || FM.m[63] || [0, FM.notdef];
const cw = (ch, sz) => glyph(ch.codePointAt(0))[1] * sz / 1000;
const tw = (s, sz) => { let w = 0; for (const ch of s) w += cw(ch, sz); return w; };
function wrap(par, sz, maxW) {           // አንቀጽ → መስመሮች
  const out = []; let cur = '';
  for (const word of par.split(/(?<=[ ፡])/)) {
    if (tw(cur + word, sz) <= maxW || !cur) { cur += word; if (tw(cur, sz) > maxW) { let t = ''; for (const ch of cur) { if (tw(t + ch, sz) > maxW && t) { out.push(t); t = ''; } t += ch; } cur = t; } }
    else { out.push(cur.trimEnd()); cur = word; }
  }
  if (cur.trim()) out.push(cur.trimEnd()); return out.length ? out : [''];
}

/* ---------- ቅጦች (ፎንት + መጠን) ---------- */
const PRESETS = {
  classic: { label: 'ክላሲክ — Nyala + Calibri', am: 'Nyala', en: 'Calibri', hd: '1F6B45', amc: '0B2E63', pdf: [0.05, 0.2, 0.5] },
  modern: { label: 'ዘመናዊ — Ebrima + Arial', am: 'Ebrima', en: 'Arial', hd: '1D4ED8', amc: '14325C', pdf: [0.08, 0.25, 0.6] },
  scholar: { label: 'ምሁራዊ — Abyssinica SIL + Times', am: 'Abyssinica SIL', en: 'Times New Roman', hd: '7C2D12', amc: '5B1A0A', pdf: [0.4, 0.12, 0.05] },
  clean: { label: 'ንጹህ — Noto Sans Ethiopic + Segoe UI', am: 'Noto Sans Ethiopic', en: 'Segoe UI', hd: '0F172A', amc: '1E293B', pdf: [0.1, 0.1, 0.18] },
  serif: { label: 'ሰሪፍ — Noto Serif Ethiopic + Georgia', am: 'Noto Serif Ethiopic', en: 'Georgia', hd: '4C1D95', amc: '3B1670', pdf: [0.23, 0.09, 0.44] },
  mac: { label: 'ማክ — Kefa + Helvetica', am: 'Kefa', en: 'Helvetica', hd: '0F766E', amc: '134E4A', pdf: [0.07, 0.32, 0.3] },
};
const SIZES = { s: ['ትንሽ', 0.85], m: ['መካከለኛ', 1], l: ['ትልቅ', 1.2] };
const optOf = o => ({ preset: PRESETS[o && o.preset] ? o.preset : 'classic', size: SIZES[o && o.size] ? o.size : 'm' });

/* ---------- PDF ---------- */
function buildPdf(title, items, opts) {
  const OP = optOf(opts), PS = PRESETS[OP.preset], K = SIZES[OP.size][1];
  const W = 842, H = 595, M = 42, SZ = 12.5 * K, LEAD = 17 * K, maxW = W - 2 * M, pages = [];
  const ttl = clean(title).slice(0, 80), total = items.length;
  const cm = [], hex = ch => { const g = glyph(ch.codePointAt(0))[0]; return g.toString(16).padStart(4, '0'); };
  const txt = (s, x, y, sz, rgb) => { let h = ''; for (const ch of s) h += hex(ch); return `BT ${rgb} rg /F1 ${sz} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td <${h}> Tj ET\n`; };
  let pg = null, y = 0;
  const newPage = it => { pg = { c: '', w: W, h: H }; pages.push(pg); pg.c += `0.96 0.97 0.95 rg 0 ${H - 34} ${W} 34 re f\n` + txt(ttl, M, H - 22, 10, '0.2 0.35 0.25') + txt(`${it.n} / ${total}`, W - M - tw(`${it.n} / ${total}`, 10), H - 22, 10, '0.2 0.35 0.25'); y = H - 62; };
  const put = (line, sz, rgb) => { if (y < M + LEAD) newPage(cur); pg.c += txt(line, M, y, sz, rgb); y -= LEAD * sz / SZ; };
  let cur = null;
  for (const it of items) {
    cur = it; newPage(it);
    for (const [lab, body, rgb, lrgb] of [['ENGLISH — original', clean(it.en), '0.1 0.1 0.1', '0.5 0.5 0.5'], ['አማርኛ — ትርጉም', clean(it.am), PS.pdf.join(' '), '0.05 0.35 0.2']]) {
      if (!body) continue; if (y < M + 60) newPage(it); put(lab, 9.5, lrgb);
      pg.c += `${lrgb} RG 0.5 w ${M} ${(y + LEAD * 0.55).toFixed(1)} m ${W - M} ${(y + LEAD * 0.55).toFixed(1)} l S\n`; y -= 3;
      for (const par of body.split('\n')) { if (!par.trim()) { y -= 5; continue; } for (const ln of wrap(par, SZ, maxW)) put(ln, SZ, rgb); }
      y -= 12;
    }
  }
  if (!pages.length) newPage({ n: 0 });
  return assemblePdf(pages);
}

function assemblePdf(pages) {
  // ዕቃዎች
  const objs = [], add = s => (objs.push(s), objs.length);       // 1-based
  const catalog = add(null), pagesObj = add(null), type0 = add(null), cid = add(null), desc = add(null), file = add(null), tou = add(null);
  const used = {}; for (const p of pages) for (const m of p.c.matchAll(/<([0-9a-f]+)> Tj/g)) for (let i = 0; i < m[1].length; i += 4) used[parseInt(m[1].slice(i, i + 4), 16)] = 1;
  const gw = {}; const uni = {}; for (const [cp, [g, w]] of Object.entries(FM.m)) { gw[g] = w; if (!uni[g]) uni[g] = +cp; }
  const W_ = Object.keys(used).map(Number).sort((a, b) => a - b).map(g => `${g} [${gw[g] || FM.notdef}]`).join(' ');
  const bf = Object.keys(used).map(Number).filter(g => uni[g]).sort((a, b) => a - b).map(g => `<${g.toString(16).padStart(4, '0')}> <${uni[g].toString(16).padStart(4, '0')}>`);
  let cmap = '/CIDInit /ProcSet findresource begin 12 dict begin begincmap /CMapName /Adobe-Identity-UCS def /CMapType 2 def 1 begincodespacerange <0000> <FFFF> endcodespacerange\n';
  for (let i = 0; i < bf.length; i += 100) cmap += `${Math.min(100, bf.length - i)} beginbfchar\n${bf.slice(i, i + 100).join('\n')}\nendbfchar\n`; cmap += 'endcmap CMapName currentdict /CMap defineresource pop end end';
  const stream = (dict, buf) => Buffer.concat([Buffer.from(`<< ${dict} /Length ${buf.length} >>\nstream\n`, 'latin1'), buf, Buffer.from('\nendstream', 'latin1')]);
  objs[catalog - 1] = `<< /Type /Catalog /Pages ${pagesObj} 0 R >>`;
  objs[type0 - 1] = `<< /Type /Font /Subtype /Type0 /BaseFont /AmhSerif /Encoding /Identity-H /DescendantFonts [${cid} 0 R] /ToUnicode ${tou} 0 R >>`;
  objs[cid - 1] = `<< /Type /Font /Subtype /CIDFontType2 /BaseFont /AmhSerif /CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /FontDescriptor ${desc} 0 R /DW ${FM.notdef} /W [${W_}] /CIDToGIDMap /Identity >>`;
  objs[desc - 1] = `<< /Type /FontDescriptor /FontName /AmhSerif /Flags 6 /FontBBox [${FM.bbox.join(' ')}] /ItalicAngle 0 /Ascent ${FM.asc} /Descent ${FM.desc} /CapHeight 700 /StemV 80 /FontFile2 ${file} 0 R >>`;
  objs[file - 1] = stream(`/Filter /FlateDecode /Length1 ${FONT.length}`, zlib.deflateSync(FONT));
  objs[tou - 1] = stream('', Buffer.from(cmap, 'latin1'));
  const kids = []; for (const p of pages) { const c = add(stream('/Filter /FlateDecode', zlib.deflateSync(Buffer.from(p.c, 'latin1')))), pgo = add(`<< /Type /Page /Parent ${pagesObj} 0 R /MediaBox [0 0 ${p.w} ${p.h}] /Resources << /Font << /F1 ${type0} 0 R >> >> /Contents ${c} 0 R >>`); kids.push(pgo + ' 0 R'); }
  objs[pagesObj - 1] = `<< /Type /Pages /Count ${kids.length} /Kids [${kids.join(' ')}] >>`;
  const parts = [Buffer.from('%PDF-1.5\n%\xE2\xE3\xCF\xD3\n', 'latin1')], offs = []; let pos = parts[0].length;
  objs.forEach((o, i) => { const b = Buffer.concat([Buffer.from(`${i + 1} 0 obj\n`, 'latin1'), Buffer.isBuffer(o) ? o : Buffer.from(o, 'latin1'), Buffer.from('\nendobj\n', 'latin1')]); offs.push(pos); pos += b.length; parts.push(b); });
  let x = `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`; for (const o of offs) x += String(o).padStart(10, '0') + ' 00000 n \n';
  parts.push(Buffer.from(x + `trailer\n<< /Size ${objs.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${pos}\n%%EOF`, 'latin1'));
  return Buffer.concat(parts);
}

/* ---------- የትርጉም ገጾች ብቻ (ዋናው PDF ሳይነካ ከእያንዳንዱ ገጽ በኋላ ይገባሉ) ----------
   items = [{ n, am, w, h, imgs:[{ar}] }]  → { buf, map: { n: { page0, count, rects:[{x,y,w,h}] } } }  (rects በ PDF ነጥብ፣ ከታች-ግራ መነሻ)
   ምስል ሲኖር በቀኝ አምድ ይደረደራል፤ ጽሑፉ በግራ። ረዥም ጽሑፍ ወደ ቀጣይ ገጽ ይቀጥላል። */
function buildTrPages(items, opts) {
  const OP = optOf(opts), PS = PRESETS[OP.preset], K = SIZES[OP.size][1], pages = [], map = {}, hx = ch => glyph(ch.codePointAt(0))[0].toString(16).padStart(4, '0');
  const op = (s, x, y, sz, rgb) => { let h = ''; for (const ch of s) h += hx(ch); return `BT ${rgb} rg /F1 ${sz.toFixed(2)} Tf ${x.toFixed(1)} ${y.toFixed(1)} Td <${h}> Tj ET\n`; };
  for (const it of items) {
    const W = it.w || 595, H = it.h || 842, M = Math.max(28, Math.min(W, H) * 0.07), imgs = (it.imgs || []).filter(i => i && i.ar > 0).slice(0, 4), colW = imgs.length ? (W - 2 * M) * 0.36 : 0, gap = imgs.length ? 14 : 0, textW = W - 2 * M - colW - gap;
    const SZ = Math.max(9, Math.min(16, Math.min(W, H) / 48)) * K, LEAD = SZ * 1.38, top = H - M, bot = M, rects = [];
    const body = clean(it.am); const lines = []; for (const par of body.split('\n')) { if (!par.trim()) { lines.push(null); continue; } for (const ln of wrap(par, SZ, textW)) lines.push(ln); }
    let pg = null, y = 0, first = true, count = 0; const start = pages.length;
    const np = () => { pg = { c: '', w: W, h: H }; pages.push(pg); count++; y = top; pg.c += `0.96 0.97 0.95 rg 0 ${(H - M * 0.62).toFixed(1)} ${W} ${(M * 0.62).toFixed(1)} re f\n` + op(`ትርጉም · ገጽ ${it.n}${count > 1 ? ' (' + count + ')' : ''}`, M, H - M * 0.42, 8.5, '0.2 0.35 0.25'); y = top - M * 0.4; };
    np(); if (imgs.length) { let iy = top - M * 0.4; for (const im of imgs) { const w = colW, h = Math.min(w / im.ar, (top - bot) * 0.46); const ww = Math.min(w, h * im.ar); rects.push({ x: W - M - colW + (colW - ww) / 2, y: iy - h, w: ww, h }); iy -= h + 12; if (iy < bot + 40) break; } }
    for (const ln of lines) { if (y < bot + LEAD) np(); if (ln === null) { y -= LEAD * 0.45; continue; } pg.c += op(ln, M, y - SZ, SZ, PS.pdf.join(' ')); y -= LEAD; }
    map[it.n] = { page0: start, count, rects };
  }
  return { buf: assemblePdf(pages.length ? pages : [{ c: '', w: 595, h: 842 }]), map };
}

/* ---------- PPTX ---------- */
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
function groups(text, n) {                 // አንቀጾችን በርዝመት ሚዛን ወደ n ቡድን
  const ps = clean(text).split(/\n+/).filter(x => x.trim()).flatMap(p => (p.length > 350 ? p.split(/(?<=[.!?\u1362\u1367\u1368])\s+/) : [p])); if (n <= 1 || ps.length <= 1) return [ps.length ? ps : []].concat(Array.from({ length: n - 1 }, () => []));
  const tot = ps.reduce((a, p) => a + p.length, 0), out = Array.from({ length: n }, () => []); let acc = 0;
  for (const p of ps) { const k = Math.min(n - 1, Math.floor(acc / (tot / n + 1))); out[k].push(p); acc += p.length; } return out;
}
let AMF = 'Nyala';
function para(t, sz, face, rgb) { const bullet = /^\s*[•\-–]\s+/.test(t); return `<a:p><a:pPr${bullet ? ' marL="228600" indent="-228600"' : ' marL="0" indent="0"'}>${bullet ? '<a:buChar char="•"/>' : '<a:buNone/>'}</a:pPr><a:r><a:rPr lang="${face === AMF ? 'am-ET' : 'en-US'}" sz="${sz}" dirty="0"><a:solidFill><a:srgbClr val="${rgb}"/></a:solidFill><a:latin typeface="${face}"/><a:ea typeface="${face}"/><a:cs typeface="${face}"/></a:rPr><a:t>${esc(t.replace(/^\s*[•\-–]\s+/, ''))}</a:t></a:r></a:p>`; }
function box(id, name, x, y, w, h, body, fill, line) { return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="${name}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom>${fill ? `<a:solidFill><a:srgbClr val="${fill}"/></a:solidFill>` : '<a:noFill/>'}${line ? `<a:ln w="9525"><a:solidFill><a:srgbClr val="${line}"/></a:solidFill></a:ln>` : '<a:ln><a:noFill/></a:ln>'}</p:spPr><p:txBody><a:bodyPr wrap="square" lIns="109728" tIns="73152" rIns="109728" bIns="73152" rtlCol="0" anchor="t"><a:normAutofit/></a:bodyPr><a:lstStyle/>${body || '<a:p><a:endParaRPr lang="en-US"/></a:p>'}</p:txBody></p:sp>`; }
function buildPptx(title, items, opts) {
  const OP = optOf(opts), PS = PRESETS[OP.preset], K = SIZES[OP.size][1], slides = [], B = Math.round(950 / K);                          // በአንድ አምድ የሚመች የፊደል ብዛት
  for (const it of items) {
    const n = Math.max(1, Math.ceil(Math.max(clean(it.en).length, clean(it.am).length) / B)), ge = groups(it.en, n), ga = groups(it.am, n);
    for (let k = 0; k < n; k++) slides.push({ head: `${esc(clean(it.title || '') || (title || ''))}`.slice(0, 90), n: it.n, part: n > 1 ? ` (${k + 1}/${n})` : '', en: ge[k], am: ga[k] });
  }
  if (!slides.length) slides.push({ head: title || '', n: 0, part: '', en: [], am: [] });
  const EMU = 12192000, MX = 365760, GAP = 182880, CW = Math.floor((EMU - 2 * MX - GAP) / 2), TOP = 868680, CH = 6858000 - TOP - 320040;
  const sl = slides.map((s, i) => {
    const size = t => Math.round((t.join('').length > 700 ? 1200 : t.join('').length > 450 ? 1400 : 1600) * K / 100) * 100;
    const body = [
      box(2, 'Header', 0, 0, EMU, 640080, `<a:p><a:pPr marL="0" indent="0"><a:buNone/></a:pPr><a:r><a:rPr lang="en-US" sz="1600" b="1" dirty="0"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:latin typeface="${PS.en}"/><a:cs typeface="${PS.am}"/></a:rPr><a:t>${esc(s.head)}${esc(s.part)}  ·  ${s.n}/${items.length}</a:t></a:r></a:p>`, PS.hd),
      box(3, 'English', MX, TOP, CW, CH, `<a:p><a:pPr marL="0" indent="0"><a:buNone/></a:pPr><a:r><a:rPr lang="en-US" sz="1000" b="1" dirty="0"><a:solidFill><a:srgbClr val="777777"/></a:solidFill><a:latin typeface="${PS.en}"/></a:rPr><a:t>ENGLISH — ORIGINAL</a:t></a:r></a:p>` + s.en.map(t => para(t, size(s.en), PS.en, '111111')).join(''), 'F7F7F7', 'D0D0D0'),
      box(4, 'Amharic', MX + CW + GAP, TOP, CW, CH, `<a:p><a:pPr marL="0" indent="0"><a:buNone/></a:pPr><a:r><a:rPr lang="am-ET" sz="1000" b="1" dirty="0"><a:solidFill><a:srgbClr val="${PS.hd}"/></a:solidFill><a:latin typeface="${PS.am}"/><a:cs typeface="${PS.am}"/></a:rPr><a:t>አማርኛ — ትርጉም</a:t></a:r></a:p>` + s.am.map(t => para(t, size(s.am), PS.am, PS.amc)).join(''), 'F2F8F4', 'BFD9C9'),
    ].join('');
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld name="Slide ${i + 1}"><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>${body}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
  });
  return packPptx(sl);
}
function packPptx(sl) {          // sl = የስላይድ XML ዝርዝር → .pptx Buffer
  const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships', H = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  const ct = H + `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/><Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/><Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/><Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/><Override PartName="/ppt/presProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presProps+xml"/><Override PartName="/ppt/viewProps.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.viewProps+xml"/><Override PartName="/ppt/tableStyles.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.tableStyles+xml"/>${sl.map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`).join('')}</Types>`;
  const rels = H + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/officeDocument" Target="ppt/presentation.xml"/></Relationships>`;
  const pres = H + `<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${R}" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" saveSubsetFonts="1"><p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst><p:sldIdLst>${sl.map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${10 + i}"/>`).join('')}</p:sldIdLst><p:sldSz cx="12192000" cy="6858000"/><p:notesSz cx="6858000" cy="9144000"/></p:presentation>`;
  const prels = H + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/slideMaster" Target="slideMasters/slideMaster1.xml"/><Relationship Id="rId2" Type="${R}/presProps" Target="presProps.xml"/><Relationship Id="rId3" Type="${R}/viewProps" Target="viewProps.xml"/><Relationship Id="rId4" Type="${R}/theme" Target="theme/theme1.xml"/><Relationship Id="rId5" Type="${R}/tableStyles" Target="tableStyles.xml"/>${sl.map((_, i) => `<Relationship Id="rId${10 + i}" Type="${R}/slide" Target="slides/slide${i + 1}.xml"/>`).join('')}</Relationships>`;
  const srel = H + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/slideLayout" Target="../slideLayouts/slideLayout1.xml"/></Relationships>`;
  return zip([['[Content_Types].xml', ct], ['_rels/.rels', rels], ['ppt/presentation.xml', pres], ['ppt/_rels/presentation.xml.rels', prels], ...Object.entries(BASE), ...sl.flatMap((x, i) => [[`ppt/slides/slide${i + 1}.xml`, x], [`ppt/slides/_rels/slide${i + 1}.xml.rels`, srel]])]);
}

/* የ AI ውጤት (pdf ገጽ) → { en, am } */
function splitBoth(out) {
  const m = /\[\[EN\]\]([\s\S]*?)\[\[AM\]\]([\s\S]*)/.exec(String(out || '')); if (!m) return { en: '', am: String(out || '').replace(/\[\[(EN|AM)\]\]/g, '').trim() };
  return { en: m[1].trim(), am: m[2].trim() };
}
module.exports = { packPptx, glyph, tw, wrap, assemblePdf, buildTrPages, PRESETS, SIZES, optOf, buildPdf, buildPptx, zip, splitBoth, clean };
