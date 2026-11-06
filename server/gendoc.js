'use strict';
/* ===== ከባዶ ሰነድ ማዘጋጃ — ያለ ምንም ጥገኝነት PDF · PPTX · DOCX · XLSX =====
   spec = { title, subtitle?, sections: [{ h, blocks: [ {k:'p',t} | {k:'ul',items} | {k:'ol',items} | {k:'table',head,rows,caption?} | {k:'note',t} ] }] }
   → { buf, ext, mime, name }  — ሠንጠረዦች፣ ቁጥሮች እና የሂሳብ/ግሪክ ምልክቶች (≥ ≤ √ ∑ π α β Δ ² ₂ …) በፎንቱ ውስጥ ይካተታሉ። */
const DO = require('./docout');
const esc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cl = s => DO.clean(s), str = (x, n) => cl(x).slice(0, n);
const MIME = { pdf: 'application/pdf', pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' };
const H = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

/* ---------- ግብዓት ማጽዳት ---------- */
function norm(spec) {
  const sp = spec && typeof spec === 'object' ? spec : {}, out = { title: str(sp.title, 120) || 'ሰነድ', subtitle: str(sp.subtitle, 200), sections: [] };
  for (const s of (Array.isArray(sp.sections) ? sp.sections : []).slice(0, 80)) {
    if (!s || typeof s !== 'object') continue; const blocks = [];
    for (const b of (Array.isArray(s.blocks) ? s.blocks : []).slice(0, 60)) {
      if (!b || typeof b !== 'object') continue;
      if (b.k === 'p' || b.k === 'note') { const t = str(b.t, 4000); if (t) blocks.push({ k: b.k, t }); }
      else if (b.k === 'ul' || b.k === 'ol') { const items = (Array.isArray(b.items) ? b.items : []).slice(0, 60).map(x => str(x, 1200)).filter(Boolean); if (items.length) blocks.push({ k: b.k, items }); }
      else if (b.k === 'table') {
        const head = (Array.isArray(b.head) ? b.head : []).slice(0, 12).map(x => str(x, 160)), rows = (Array.isArray(b.rows) ? b.rows : []).slice(0, 200).map(r => (Array.isArray(r) ? r : []).slice(0, 12).map(x => str(x, 400)));
        const n = Math.max(head.length, ...rows.map(r => r.length), 0); if (n && (rows.length || head.length)) blocks.push({ k: 'table', head: head.length ? Array.from({ length: n }, (_, i) => head[i] || '') : null, rows: rows.map(r => Array.from({ length: n }, (_, i) => r[i] || '')), n, caption: str(b.caption, 200) });
      }
    }
    const h = str(s.h, 160); if (h || blocks.length) out.sections.push({ h, blocks });
  }
  if (!out.sections.length) out.sections.push({ h: '', blocks: [{ k: 'p', t: out.title }] }); return out;
}
const weights = (t) => { const n = t.n, w = Array.from({ length: n }, (_, i) => Math.min(38, Math.max(5, ...(t.head ? [t.head[i].length] : [0]), ...t.rows.map(r => Math.min(38, r[i].length))))); const sum = w.reduce((a, b) => a + b, 0); return w.map(x => x / sum); };

/* ---------- PDF (A4 ቁመት፣ ሠንጠረዥ በመስመር፣ ገጽ ቁጥር) ---------- */
function buildPdf(spec) {
  const W = 595, Ht = 842, M = 50, maxW = W - 2 * M, pages = []; let pg = null, y = 0;
  const hex = s => { let h = ''; for (const ch of s) h += DO.glyph(ch.codePointAt(0))[0].toString(16).padStart(4, '0'); return h; };
  const txt = (s, x, yy, sz, rgb) => (s ? `BT ${rgb} rg /F1 ${sz} Tf ${x.toFixed(1)} ${yy.toFixed(1)} Td <${hex(s)}> Tj ET\n` : '');
  const rect = (x, yy, w, h, fill, stroke) => (fill ? `${fill} rg ${x.toFixed(1)} ${yy.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f\n` : '') + (stroke ? `${stroke} RG 0.5 w ${x.toFixed(1)} ${yy.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re S\n` : '');
  const newPage = () => { pg = { c: '', w: W, h: Ht }; pages.push(pg); y = Ht - M; };
  const need = h => { if (y - h < M + 16) newPage(); };
  const para = (t, sz, rgb, x0 = M, w = maxW, lead = sz * 1.38) => { for (const par of t.split('\n')) { if (!par.trim()) { y -= lead * 0.5; continue; } for (const ln of DO.wrap(par, sz, w)) { need(lead); y -= lead; pg.c += txt(ln, x0, y + lead * 0.25, sz, rgb); } } };
  const sp = norm(spec); newPage();
  { const lines = DO.wrap(sp.title, 24, maxW); for (const ln of lines) { y -= 30; pg.c += txt(ln, M, y, 24, '0.07 0.3 0.2'); } if (sp.subtitle) { for (const ln of DO.wrap(sp.subtitle, 12.5, maxW)) { y -= 17; pg.c += txt(ln, M, y, 12.5, '0.4 0.4 0.4'); } } y -= 8; pg.c += '0.07 0.3 0.2 RG 1.2 w ' + M + ' ' + y.toFixed(1) + ' m ' + (W - M) + ' ' + y.toFixed(1) + ' l S\n'; y -= 14; }
  for (const s of sp.sections) {
    if (s.h) { need(60); y -= 8; for (const ln of DO.wrap(s.h, 15.5, maxW)) { y -= 21; pg.c += txt(ln, M, y, 15.5, '0.07 0.3 0.2'); } pg.c += '0.75 0.85 0.78 RG 0.6 w ' + M + ' ' + (y - 4).toFixed(1) + ' m ' + (W - M) + ' ' + (y - 4).toFixed(1) + ' l S\n'; y -= 10; }
    for (const b of s.blocks) {
      if (b.k === 'p') { para(b.t, 11, '0.1 0.1 0.1'); y -= 6; }
      else if (b.k === 'ul' || b.k === 'ol') { b.items.forEach((it, i) => { const lead = 15, lab = b.k === 'ul' ? '•' : (i + 1) + '.', lns = DO.wrap(it, 11, maxW - 20); need(lead * Math.min(lns.length, 2)); lns.forEach((ln, j) => { need(lead); y -= lead; if (j === 0) pg.c += txt(lab, M + 4, y + 4, 11, '0.07 0.3 0.2'); pg.c += txt(ln, M + 20, y + 4, 11, '0.1 0.1 0.1'); }); y -= 2; }); y -= 5; }
      else if (b.k === 'note') { const lns = DO.wrap(b.t, 10.5, maxW - 24), h = lns.length * 14.5 + 12; need(Math.min(h, 200)); const top = y; let drawn = 0; pg.c += rect(M, y - h, maxW, h, '0.98 0.95 0.84', null) + rect(M, y - h, 3, h, '0.85 0.6 0.1', null); y -= 8; for (const ln of lns) { if (y - 14.5 < M + 16) { newPage(); } y -= 14.5; pg.c += txt(ln, M + 12, y + 3.5, 10.5, '0.3 0.22 0.05'); drawn++; } y -= 12; }
      else if (b.k === 'table') {
        const wts = weights(b), cw = wts.map(x => x * maxW), SZ = 9.5, LD = 12.5, PAD = 4;
        const rowH = r => Math.max(...r.map((c, i) => DO.wrap(c, SZ, cw[i] - 2 * PAD).length)) * LD + 2 * PAD;
        const drawRow = (r, head, zebra) => {
          const h = rowH(r); if (y - h < M + 16) { newPage(); if (b.head && !head) drawRow(b.head, true, false); } let x = M; const top = y;
          r.forEach((c, i) => { pg.c += rect(x, top - h, cw[i], h, head ? '0.12 0.42 0.28' : zebra ? '0.95 0.97 0.95' : null, '0.7 0.75 0.72'); const ls = DO.wrap(c, SZ, cw[i] - 2 * PAD); ls.forEach((ln, j) => { pg.c += txt(ln, x + PAD, top - PAD - LD * (j + 1) + 3.5, SZ, head ? '1 1 1' : '0.1 0.1 0.1'); }); x += cw[i]; }); y -= h;
        };
        if (b.caption) { para(b.caption, 10, '0.35 0.35 0.35'); y -= 2; } need(rowH(b.head || b.rows[0]) + 20);
        if (b.head) drawRow(b.head, true, false); b.rows.forEach((r, i) => drawRow(r, false, i % 2 === 1)); y -= 12;
      }
    }
  }
  const tot = pages.length; pages.forEach((p, i) => { const t = `${i + 1} / ${tot}`; p.c += txt(t, W - M - DO.tw(t, 9), 26, 9, '0.5 0.5 0.5') + txt(sp.title.slice(0, 60), M, 26, 9, '0.5 0.5 0.5'); });
  return DO.assemblePdf(pages);
}

/* ---------- DOCX ---------- */
function buildDocx(spec, opts) {
  const PS = DO.PRESETS[DO.optOf(opts).preset], F = PS.am, sp = norm(spec), TW = 9638;
  const run = (t, o = {}) => `<w:r><w:rPr><w:rFonts w:ascii="${F}" w:hAnsi="${F}" w:cs="${F}" w:eastAsia="${F}"/>${o.b ? '<w:b/>' : ''}${o.i ? '<w:i/>' : ''}${o.c ? `<w:color w:val="${o.c}"/>` : ''}${o.sz ? `<w:sz w:val="${o.sz}"/>` : ''}</w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r>`;
  const P = (inner, ppr = '') => `<w:p><w:pPr>${ppr}</w:pPr>${inner}</w:p>`, lines = (t, o) => t.split('\n').map(x => run(x, o)).join('<w:r><w:br/></w:r>');
  const body = [P(run(sp.title, { b: 1, sz: 48, c: PS.hd }), '<w:pStyle w:val="Title"/>')]; if (sp.subtitle) body.push(P(run(sp.subtitle, { sz: 26, c: '666666' })));
  for (const s of sp.sections) {
    if (s.h) body.push(P(run(s.h, { b: 1, sz: 32, c: PS.hd }), '<w:pStyle w:val="Heading1"/><w:keepNext/>'));
    for (const b of s.blocks) {
      if (b.k === 'p') body.push(P(lines(b.t), '<w:spacing w:after="120"/>'));
      else if (b.k === 'ul' || b.k === 'ol') b.items.forEach((it, i) => body.push(P(run((b.k === 'ul' ? '•' : (i + 1) + '.') + '\t') + lines(it), '<w:tabs><w:tab w:val="left" w:pos="540"/></w:tabs><w:spacing w:after="60"/><w:ind w:left="540" w:hanging="360"/>')));
      else if (b.k === 'note') body.push(P(lines(b.t, { i: 1 }), '<w:pBdr><w:left w:val="single" w:sz="24" w:space="8" w:color="D9A21B"/></w:pBdr><w:shd w:val="clear" w:color="auto" w:fill="FBF3D6"/><w:spacing w:before="80" w:after="160"/><w:ind w:left="200"/>'));
      else if (b.k === 'table') {
        if (b.caption) body.push(P(run(b.caption, { i: 1, sz: 20, c: '555555' }), '<w:keepNext/>')); const w = weights(b).map(x => Math.round(x * TW)), bd = '<w:tblBorders>' + ['top', 'left', 'bottom', 'right', 'insideH', 'insideV'].map(x => `<w:${x} w:val="single" w:sz="4" w:space="0" w:color="B8C2BC"/>`).join('') + '</w:tblBorders>';
        const cell = (t, i, head, z) => `<w:tc><w:tcPr><w:tcW w:w="${w[i]}" w:type="dxa"/>${head ? `<w:shd w:val="clear" w:color="auto" w:fill="${PS.hd}"/>` : z ? '<w:shd w:val="clear" w:color="auto" w:fill="F2F6F3"/>' : ''}</w:tcPr>${P(lines(t, head ? { b: 1, c: 'FFFFFF', sz: 20 } : { sz: 20 }), '<w:spacing w:before="40" w:after="40"/>')}</w:tc>`;
        body.push(`<w:tbl><w:tblPr><w:tblW w:w="${TW}" w:type="dxa"/>${bd}<w:tblLayout w:type="fixed"/><w:tblCellMar><w:left w:w="90" w:type="dxa"/><w:right w:w="90" w:type="dxa"/></w:tblCellMar></w:tblPr><w:tblGrid>${w.map(x => `<w:gridCol w:w="${x}"/>`).join('')}</w:tblGrid>` + (b.head ? `<w:tr><w:trPr><w:cantSplit/><w:tblHeader/></w:trPr>${b.head.map((c, i) => cell(c, i, true)).join('')}</w:tr>` : '') + b.rows.map((r, ri) => `<w:tr><w:trPr><w:cantSplit/></w:trPr>${r.map((c, i) => cell(c, i, false, ri % 2)).join('')}</w:tr>`).join('') + '</w:tbl>' + P('', '<w:spacing w:after="120"/>'));
      }
    }
  }
  const doc = H + `<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body.join('')}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="709" w:footer="709" w:gutter="0"/></w:sectPr></w:body></w:document>`;
  const styles = H + `<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="${F}" w:hAnsi="${F}" w:cs="${F}" w:eastAsia="${F}"/><w:sz w:val="22"/><w:szCs w:val="22"/><w:lang w:val="en-US" w:bidi="am-ET"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:after="120" w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:after="160"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:next w:val="Normal"/><w:pPr><w:keepNext/><w:spacing w:before="320" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr></w:style></w:styles>`;
  const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  return DO.zip([['[Content_Types].xml', H + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>'], ['_rels/.rels', H + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/officeDocument" Target="word/document.xml"/></Relationships>`], ['word/document.xml', doc], ['word/styles.xml', styles], ['word/_rels/document.xml.rels', H + `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${R}/styles" Target="styles.xml"/></Relationships>`]]);
}

/* ---------- PPTX ---------- */
function buildPptx(spec, opts) {
  const OP = DO.optOf(opts), PS = DO.PRESETS[OP.preset], K = DO.SIZES[OP.size][1], F = PS.am, sp = norm(spec), EMU = 12192000, SH = 6858000, X0 = 457200, BW = EMU - 2 * X0, Y0 = 1050000, BH = SH - Y0 - 380000, PT = 12700;
  const rpr = (sz, o = {}) => `<a:rPr lang="am-ET" sz="${Math.round(sz * 100)}"${o.b ? ' b="1"' : ''}${o.i ? ' i="1"' : ''} dirty="0">${o.c ? `<a:solidFill><a:srgbClr val="${o.c}"/></a:solidFill>` : ''}<a:latin typeface="${F}"/><a:ea typeface="${F}"/><a:cs typeface="${F}"/></a:rPr>`;
  const ap = (t, sz, o = {}) => `<a:p><a:pPr marL="${o.bullet ? 342900 : 0}" indent="${o.bullet ? -342900 : 0}"${o.algn ? ` algn="${o.algn}"` : ''}>${o.bullet ? `<a:spcBef><a:spcPts val="600"/></a:spcBef>${o.num ? `<a:buFont typeface="+mj-lt"/><a:buAutoNum type="arabicPeriod"/>` : '<a:buChar char="•"/>'}` : '<a:spcBef><a:spcPts val="400"/></a:spcBef><a:buNone/>'}</a:pPr><a:r>${rpr(sz, o)}<a:t>${esc(t)}</a:t></a:r></a:p>`;
  let nid = 10; const sp1 = (name, x, y, w, h, paras, fill, anchor) => `<p:sp><p:nvSpPr><p:cNvPr id="${nid++}" name="${name}"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${x}" y="${y}"/><a:ext cx="${w}" cy="${h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom>${fill ? `<a:solidFill><a:srgbClr val="${fill}"/></a:solidFill>` : '<a:noFill/>'}</p:spPr><p:txBody><a:bodyPr wrap="square" lIns="91440" tIns="45720" rIns="91440" bIns="45720" anchor="${anchor || 't'}"><a:normAutofit/></a:bodyPr><a:lstStyle/>${paras || '<a:p><a:endParaRPr lang="en-US"/></a:p>'}</p:txBody></p:sp>`;
  const slideXml = body => `${H}<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"><p:cSld><p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr><p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>${body}</p:spTree></p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr></p:sld>`;
  const lineH = sz => sz * 1.3 * PT, cpl = (w, sz) => Math.max(8, Math.floor(w / PT / (sz * 0.62))), nl = (t, sz, w) => t.split('\n').reduce((a, p) => a + Math.max(1, Math.ceil(p.length / cpl(w, sz))), 0);
  const tblXml = (head, rows, wts, sz) => {
    const cw = wts.map(x => Math.round(x * BW)), rh = Math.round(lineH(sz) * 1.5), cell = (t, i, hd, z) => `<a:tc><a:txBody><a:bodyPr/><a:lstStyle/><a:p><a:pPr marL="0" indent="0"><a:buNone/></a:pPr><a:r>${rpr(sz, hd ? { b: 1, c: 'FFFFFF' } : { c: '111111' })}<a:t>${esc(t)}</a:t></a:r></a:p></a:txBody><a:tcPr marL="72000" marR="72000" marT="36000" marB="36000"><a:lnL w="6350"><a:solidFill><a:srgbClr val="B8C2BC"/></a:solidFill></a:lnL><a:lnR w="6350"><a:solidFill><a:srgbClr val="B8C2BC"/></a:solidFill></a:lnR><a:lnT w="6350"><a:solidFill><a:srgbClr val="B8C2BC"/></a:solidFill></a:lnT><a:lnB w="6350"><a:solidFill><a:srgbClr val="B8C2BC"/></a:solidFill></a:lnB><a:solidFill><a:srgbClr val="${hd ? PS.hd : z ? 'F2F6F3' : 'FFFFFF'}"/></a:solidFill></a:tcPr></a:tc>`;
    const trs = [...(head ? [`<a:tr h="${rh}">${head.map((c, i) => cell(c, i, true)).join('')}</a:tr>`] : []), ...rows.map((r, ri) => `<a:tr h="${rh}">${r.map((c, i) => cell(c, i, false, ri % 2)).join('')}</a:tr>`)].join('');
    return { xml: `<p:graphicFrame><p:nvGraphicFramePr><p:cNvPr id="${nid++}" name="Table"/><p:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></p:cNvGraphicFramePr><p:nvPr/></p:nvGraphicFramePr><p:xfrm><a:off x="${X0}" y="0"/><a:ext cx="${BW}" cy="${rh * (rows.length + (head ? 1 : 0))}"/></p:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/table"><a:tbl><a:tblPr firstRow="1" bandRow="1"/><a:tblGrid>${cw.map(x => `<a:gridCol w="${x}"/>`).join('')}</a:tblGrid>${trs}</a:tbl></a:graphicData></a:graphic></p:graphicFrame>`, rh };
  };
  const slides = [];
  slides.push(slideXml(sp1('Bg', 0, 0, EMU, SH, '', PS.hd) + sp1('Title', X0, 2000000, BW, 1700000, ap(sp.title, 44 * K, { b: 1, c: 'FFFFFF', algn: 'ctr' }), null, 'b') + (sp.subtitle ? sp1('Sub', X0, 3800000, BW, 900000, ap(sp.subtitle, 22 * K, { c: 'E8F0EA', algn: 'ctr' })) : '')));
  const frame = (title, parts, n) => { let y = Y0, out = sp1('Hdr', 0, 0, EMU, 860000, ap(title + (n > 1 ? ` (${n})` : ''), 28 * K, { b: 1, c: 'FFFFFF' }), PS.hd, 'ctr'); for (const p of parts) { if (p.t === 'tbl') { out += p.xml.replace('y="0"', `y="${y}"`); y += p.h + 220000; } else { out += sp1('Body', X0, y, BW, p.h, p.paras); y += p.h; } } return slideXml(out); };
  for (const s of sp.sections) {
    let parts = [], used = 0, n = 1; const title = s.h || sp.title, flush = () => { if (parts.length) slides.push(frame(title, parts, n++)); parts = []; used = 0; };
    const addText = (paras, h) => { if (used + h > BH && parts.length) flush(); parts.push({ t: 'txt', paras, h: Math.min(h, BH) }); used += Math.min(h, BH); };
    for (const b of s.blocks) {
      if (b.k === 'p' || b.k === 'note') { const sz = 18 * K; addText(ap(b.t, sz, b.k === 'note' ? { i: 1, c: '7A5B00' } : { c: '1A1A1A' }), (nl(b.t, sz, BW) * lineH(sz)) + 160000); }
      else if (b.k === 'ul' || b.k === 'ol') { const sz = (b.items.length > 7 ? 18 : 22) * K; let chunk = [], h = 0; b.items.forEach(it => { const ih = nl(it, sz, BW - 342900) * lineH(sz) + 90000; if (used + h + ih > BH && (chunk.length || parts.length)) { if (chunk.length) addText(chunk.join(''), h); flush(); chunk = []; h = 0; } chunk.push(ap(it, sz, { bullet: 1, num: b.k === 'ol', c: '1A1A1A' })); h += ih; }); if (chunk.length) addText(chunk.join(''), h + 60000); }
      else if (b.k === 'table') {
        const wts = weights(b), sz = (b.n > 6 ? 11 : b.n > 4 ? 13 : 15) * K, cw = wts.map(x => x * BW);
        const rowH = r => Math.max(...r.map((c, i) => nl(c, sz, cw[i] - 144000))) * lineH(sz) + 72000; if (b.caption) addText(ap(b.caption, 14 * K, { i: 1, c: '555555' }), lineH(14 * K) * nl(b.caption, 14 * K, BW) + 80000);
        let chunk = [], h = b.head ? rowH(b.head) : 0; const emit = () => { if (!chunk.length) return; const t = tblXml(b.head, chunk, wts, sz), th = (b.head ? rowH(b.head) : 0) + chunk.reduce((a, r) => a + rowH(r), 0); t.h = th; parts.push({ t: 'tbl', xml: t.xml.replace(/<a:tr h="\d+">/g, '<a:tr h="' + Math.round(lineH(sz) * 1.4) + '">'), h: th }); used += th + 220000; chunk = []; h = b.head ? rowH(b.head) : 0; };
        for (const r of b.rows) { const rh = rowH(r); if (used + h + rh > BH && (chunk.length || parts.length)) { emit(); flush(); } chunk.push(r); h += rh; } emit();
      }
    }
    flush();
  }
  return DO.packPptx(slides);
}

/* ---------- XLSX ---------- */
function buildXlsx(spec) {
  const sp = norm(spec), colL = i => { let s = ''; for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s; return s; };
  const isNum = t => /^-?(0|[1-9]\d{0,14})(\.\d+)?$/.test(t.trim()), cellX = (t, ref, st) => { t = String(t); if (t.startsWith('=') && t.length > 1) return `<c r="${ref}"${st}><f>${esc(t.slice(1))}</f></c>`; if (isNum(t)) return `<c r="${ref}"${st}><v>${t.trim()}</v></c>`; return t ? `<c r="${ref}" t="inlineStr"${st}><is><t xml:space="preserve">${esc(t)}</t></is></c>` : ''; };
  const sheets = [], names = new Set(); const fit = (h, i) => { let n = (String(h || '').replace(/[\\/?*\[\]:]/g, ' ').trim().slice(0, 28) || 'Sheet' + (i + 1)), k = 2, b0 = n; while (names.has(n.toLowerCase())) n = b0.slice(0, 26) + ' ' + k++; names.add(n.toLowerCase()); return n; };
  const secs = sp.sections.some(s => s.blocks.some(b => b.k === 'table')) ? sp.sections.filter(s => s.blocks.length) : [{ h: sp.title, blocks: sp.sections.flatMap(s => [...(s.h ? [{ k: 'p', t: s.h }] : []), ...s.blocks]) }];
  secs.forEach((s, si) => {
    const rows = []; const widths = []; const put = (r, cells, st) => { rows[r] = (rows[r] || []).concat([]); cells.forEach((c, i) => { rows[r][i] = { t: c, st }; widths[i] = Math.min(60, Math.max(widths[i] || 8, String(c).length * 1.15 + 2)); }); };
    let r = 0; if (s.h) { put(r++, [s.h], 3); r++; }
    for (const b of s.blocks) {
      if (b.k === 'p' || b.k === 'note') put(r++, [b.t], 0); else if (b.k === 'ul' || b.k === 'ol') b.items.forEach((x, i) => put(r++, [(b.k === 'ul' ? '• ' : (i + 1) + '. ') + x], 0));
      else if (b.k === 'table') { if (b.caption) put(r++, [b.caption], 0); if (b.head) put(r++, b.head, 1); b.rows.forEach(x => put(r++, x, 0)); r++; }
    }
    const xml = H + `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"${si === 0 ? ' tabSelected="1"' : ''}/></sheetViews><cols>${widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w.toFixed(1)}" customWidth="1"/>`).join('')}</cols><sheetData>${rows.map((row, ri) => row ? `<row r="${ri + 1}">${row.map((c, ci) => (c ? cellX(c.t, colL(ci) + (ri + 1), c.st ? ` s="${c.st}"` : '') : '')).join('')}</row>` : '').join('')}</sheetData></worksheet>`;
    sheets.push({ name: fit(s.h, si), xml });
  });
  const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships', PR = 'http://schemas.openxmlformats.org/package/2006/relationships';
  const styles = H + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="3"><font><sz val="11"/><name val="Nyala"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Nyala"/></font><font><b/><sz val="14"/><name val="Nyala"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF1F6B45"/></patternFill></fill></fills><borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
  return DO.zip([['[Content_Types].xml', H + `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`], ['_rels/.rels', H + `<Relationships xmlns="${PR}"><Relationship Id="rId1" Type="${R}/officeDocument" Target="xl/workbook.xml"/></Relationships>`], ['xl/workbook.xml', H + `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="${R}"><sheets>${sheets.map((s, i) => `<sheet name="${esc(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets></workbook>`], ['xl/_rels/workbook.xml.rels', H + `<Relationships xmlns="${PR}">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="${R}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="${R}/styles" Target="styles.xml"/></Relationships>`], ['xl/styles.xml', styles], ...sheets.map((s, i) => [`xl/worksheets/sheet${i + 1}.xml`, s.xml])]);
}

function build(fmt, spec, opts) {
  fmt = String(fmt || 'pdf').toLowerCase(); if (!MIME[fmt]) throw new Error('bad_format'); const sp = norm(spec);
  const buf = fmt === 'pdf' ? buildPdf(sp) : fmt === 'docx' ? buildDocx(sp, opts) : fmt === 'pptx' ? buildPptx(sp, opts) : buildXlsx(sp);
  const name = (sp.title.replace(/[\\/:*?"<>|\n\r]+/g, ' ').replace(/\s+/g, '_').slice(0, 50) || 'document') + '.' + fmt; return { buf, ext: fmt, mime: MIME[fmt], name };
}
module.exports = { build, norm, MIME };
