'use strict';
/* ===== PPTX፦ ዋናው ስላይድ ሳይነካ ከእያንዳንዱ ስላይድ በኋላ የአማርኛ ትርጉም ስላይድ ማስገባት =====
   የትርጉም ስላይድ = የዋናው ስላይድ ቅጂ (ተመሳሳይ አቀማመጥ/ዳራ/ምስሎች) ከጽሑፍ ሳጥኖቹ ተወግደው + አንድ የአማርኛ ጽሑፍ ሳጥን
   (ምስል ካለ ከምስሎቹ ውጪ ባለው ትልቁ ነጻ ቦታ ላይ)። ሠንጠረዥ/ገበታ/SmartArt (graphicFrame) ከቅጂው ይወገዳሉ — ይዘታቸው በትርጉሙ ጽሑፍ ውስጥ ነው። */
const { readZip } = require('../src/lib/pptx'), DO = require('./docout');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const num = (x, d) => { const n = parseInt(x, 10); return Number.isFinite(n) ? n : d; };
const xf = x => { const m = /<a:off x="(-?\d+)" y="(-?\d+)"\s*\/>\s*<a:ext cx="(\d+)" cy="(\d+)"\s*\/>/.exec(x); return m ? { x: +m[1], y: +m[2], w: +m[3], h: +m[4] } : null; };

function freeRect(W, H, pics) {          // ከምስሎች ውጪ ትልቁ ነጻ አራት ማዕዘን
  const M = Math.round(W * 0.04), full = { x: M, y: Math.round(H * 0.08), w: W - 2 * M, h: Math.round(H * 0.84) };
  if (!pics.length) return { ...full, over: false };
  const u = { x1: Math.min(...pics.map(p => p.x)), y1: Math.min(...pics.map(p => p.y)), x2: Math.max(...pics.map(p => p.x + p.w)), y2: Math.max(...pics.map(p => p.y + p.h)) }, g = Math.round(W * 0.02);
  const c = [{ x: M, y: full.y, w: u.x1 - g - M, h: full.h }, { x: u.x2 + g, y: full.y, w: W - M - (u.x2 + g), h: full.h }, { x: M, y: full.y, w: full.w, h: u.y1 - g - full.y }, { x: M, y: u.y2 + g, w: full.w, h: full.y + full.h - (u.y2 + g) }].filter(r => r.w > W * 0.22 && r.h > H * 0.18);
  c.sort((a, b) => b.w * b.h - a.w * a.h); return c.length && c[0].w * c[0].h > W * H * 0.14 ? { ...c[0], over: false } : { ...full, over: true };          // ቦታ ከሌለ ጽሑፉ በምስሉ ላይ በነጭ ሳጥን
}
function fit(text, wEmu, hEmu, K) {      // የፊደል መጠን (pt*100) ከሳጥኑ ጋር
  const wpt = wEmu / 12700 - 14, hpt = hEmu / 12700 - 12, chars = text.replace(/\n+/g, '\n').split('\n');
  for (let sz = Math.round(24 * K); sz >= 9; sz--) { let lines = 0; for (const p of chars) lines += Math.max(1, Math.ceil(p.length * sz * 0.62 / wpt)); if (lines * sz * 1.32 <= hpt) return sz * 100; }
  return 900;
}
function textBox(id, r, text, sz, PS, over) {
  const paras = String(DO.clean(text)).split('\n').filter(x => x.trim()), body = paras.map((t, i) => { const bullet = /^\s*[•\-–]\s+/.test(t); return `<a:p><a:pPr${bullet ? ' marL="228600" indent="-228600"' : ' marL="0" indent="0"'}>${bullet ? '<a:buChar char="•"/>' : '<a:buNone/>'}</a:pPr><a:r><a:rPr lang="am-ET" sz="${sz}"${i === 0 && paras.length > 1 ? ' b="1"' : ''} dirty="0"><a:solidFill><a:srgbClr val="${PS.amc}"/></a:solidFill><a:latin typeface="${PS.am}"/><a:ea typeface="${PS.am}"/><a:cs typeface="${PS.am}"/></a:rPr><a:t>${esc(t.replace(/^\s*[•\-–]\s+/, ''))}</a:t></a:r></a:p>`; }).join('');
  return `<p:sp><p:nvSpPr><p:cNvPr id="${id}" name="Amharic translation"/><p:cNvSpPr txBox="1"/><p:nvPr/></p:nvSpPr><p:spPr><a:xfrm><a:off x="${r.x}" y="${r.y}"/><a:ext cx="${r.w}" cy="${r.h}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="FFFFFF"><a:alpha val="${over ? 92000 : 100000}"/></a:srgbClr></a:solidFill><a:ln w="9525"><a:solidFill><a:srgbClr val="${PS.hd}"/></a:solidFill></a:ln></p:spPr><p:txBody><a:bodyPr wrap="square" lIns="91440" tIns="64008" rIns="91440" bIns="64008" rtlCol="0" anchor="t"><a:normAutofit/></a:bodyPr><a:lstStyle/>${body || '<a:p><a:endParaRPr lang="am-ET"/></a:p>'}</p:txBody></p:sp>`;
}

/* buf = ዋናው pptx፤ items = [{ n (1-based), am }]፤ opts = { preset, size } → Buffer (ከተሳሳተ ይወረውራል) */
async function interleavePptx(buf, items, opts) {
  const z = readZip(buf), OP = DO.optOf(opts), PS = DO.PRESETS[OP.preset], K = DO.SIZES[OP.size][1];
  const files = new Map(); for (const nm of z.names) { if (nm.endsWith('/')) continue; files.set(nm, Buffer.from(await z.read(nm))); }
  const T = n => (files.has(n) ? files.get(n).toString('utf8') : ''), pres = T('ppt/presentation.xml'), prels = T('ppt/_rels/presentation.xml.rels'); if (!pres || !prels) throw new Error('not_pptx');
  const rel = {}; for (const m of prels.matchAll(/<Relationship\b[^>]*>/g)) { const id = /\bId="([^"]+)"/.exec(m[0]), tg = /\bTarget="([^"]+)"/.exec(m[0]); if (id && tg) rel[id[1]] = tg[1]; }
  const sz = /<p:sldSz\b[^>]*cx="(\d+)"[^>]*cy="(\d+)"/.exec(pres), W = sz ? +sz[1] : 12192000, H = sz ? +sz[2] : 6858000;
  const ids = [...pres.matchAll(/<p:sldId\b[^>]*\/>/g)].map(m => ({ tag: m[0], id: num(/\bid="(\d+)"/.exec(m[0])[1]), rid: /r:id="([^"]+)"/.exec(m[0])[1] }));
  if (!ids.length) throw new Error('no_slides');
  const norm = t => 'ppt/' + String(t).replace(/^\/?(ppt\/)?/, ''), by = new Map(items.map(i => [i.n, i]));
  let maxSlide = 0; for (const nm of files.keys()) { const m = /^ppt\/slides\/slide(\d+)\.xml$/.exec(nm); if (m) maxSlide = Math.max(maxSlide, +m[1]); }
  let maxId = Math.max(...ids.map(i => i.id), 255), maxRid = Math.max(0, ...Object.keys(rel).map(r => num(String(r).replace(/\D/g, ''), 0))), ct = T('[Content_Types].xml'), newPres = pres, newRels = prels, add = 0;
  for (let k = 0; k < ids.length; k++) {
    const it = by.get(k + 1); if (!it || !String(it.am || '').trim()) continue; const path = norm(rel[ids[k].rid] || ''), xml = T(path), relsPath = path.replace('slides/', 'slides/_rels/') + '.rels'; if (!xml) continue;
    const pics = [...xml.matchAll(/<p:pic\b[\s\S]*?<\/p:pic>/g)].map(m => xf(m[0])).filter(Boolean);
    let nx = xml.replace(/<p:sp\b[^>]*>[\s\S]*?<\/p:sp>/g, m => (/<a:t[ >]|<p:ph\b/.test(m) ? '' : m)).replace(/<p:graphicFrame\b[\s\S]*?<\/p:graphicFrame>/g, '').replace(/<p:extLst>[\s\S]*?<\/p:extLst>\s*(?=<\/p:cSld>)/g, '');
    const R = freeRect(W, H, pics), text = String(it.am), size = Math.round(fit(DO.clean(text), R.w, R.h, K) / 100) * 100, nid = 9000 + k;
    nx = nx.replace(/<\/p:spTree>/, textBox(nid, R, text, size, PS, R.over) + '</p:spTree>');
    if (!/<p:clrMapOvr>/.test(nx)) nx = nx.replace(/<\/p:cSld>/, '</p:cSld><p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>');
    const used = new Set([...nx.matchAll(/\br:(?:embed|link|id|pict)="([^"]+)"/g)].map(m => m[1])), orel = T(relsPath);
    const keep = [...orel.matchAll(/<Relationship\b[^>]*\/>/g)].map(m => m[0]).filter(r => { const id = /\bId="([^"]+)"/.exec(r)[1]; return /slideLayout/.test(r) || (used.has(id) && !/notesSlide|chart|diagram|oleObject/.test(r)); });
    const nn = ++maxSlide, name = `ppt/slides/slide${nn}.xml`; files.set(name, Buffer.from(nx, 'utf8'));
    files.set(`ppt/slides/_rels/slide${nn}.xml.rels`, Buffer.from('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' + keep.join('') + '</Relationships>', 'utf8'));
    ct = ct.replace('</Types>', `<Override PartName="/${name}" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/></Types>`);
    const rid = 'rId' + (++maxRid); newRels = newRels.replace('</Relationships>', `<Relationship Id="${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${nn}.xml"/></Relationships>`);
    newPres = newPres.replace(ids[k].tag, ids[k].tag + `<p:sldId id="${++maxId}" r:id="${rid}"/>`); add++;
  }
  newPres = newPres.replace(/<p:ext\b[^>]*>\s*<p14:sectionLst[\s\S]*?<\/p14:sectionLst>\s*<\/p:ext>/g, '');          // ክፍሎች (sections) አዲሶቹን ስላይዶች እንዳይሰብሩ
  files.set('ppt/presentation.xml', Buffer.from(newPres, 'utf8')); files.set('ppt/_rels/presentation.xml.rels', Buffer.from(newRels, 'utf8')); files.set('[Content_Types].xml', Buffer.from(ct, 'utf8'));
  const entries = [['[Content_Types].xml', files.get('[Content_Types].xml')], ...[...files].filter(([n]) => n !== '[Content_Types].xml')];
  return { buf: DO.zip(entries), added: add };
}
module.exports = { interleavePptx };
