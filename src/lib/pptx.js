/* .pptx ንባብ — ያለ ምንም ጥገኝነት (በአሳሽም በ Node 18+ ም ይሰራል)
   ዚፕ ይከፍታል (DecompressionStream) → የስላይድ XML ን በንባብ ቅደም ተከተል ወደ ብሎኮች ይቀይራል፦
   { k:'h'|'p'|'li'|'tbl'|'img', t, l, rows, i }   ምስሎች ሲመለሱ `images[i]` = { name, mime, bytes() } */

async function inflateRaw(u8) {
  const ds = new DecompressionStream('deflate-raw'), w = ds.writable.getWriter(); w.write(u8); w.close();
  return new Uint8Array(await new Response(ds.readable).arrayBuffer());
}
function readZip(buf) {
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf), dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength), files = {};
  let e = -1; for (let i = u8.length - 22; i >= Math.max(0, u8.length - 70000); i--) if (dv.getUint32(i, true) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error('not_zip'); let n = dv.getUint16(e + 10, true), p = dv.getUint32(e + 16, true); const dec = new TextDecoder();
  while (n-- > 0) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('bad_zip');
    const method = dv.getUint16(p + 10, true), csz = dv.getUint32(p + 20, true), nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true), name = dec.decode(u8.subarray(p + 46, p + 46 + nl));
    files[name] = { method, csz, off }; p += 46 + nl + xl + cl;
  }
  const read = async name => {
    const f = files[name]; if (!f) return null; const o = f.off, nl = dv.getUint16(o + 26, true), xl = dv.getUint16(o + 28, true), raw = u8.subarray(o + 30 + nl + xl, o + 30 + nl + xl + f.csz);
    return f.method === 0 ? raw : f.method === 8 ? inflateRaw(raw) : null;
  };
  return { names: Object.keys(files), read, text: async name => { const b = await read(name); return b ? new TextDecoder().decode(b) : ''; } };
}

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const dec = s => s.replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, g) => (g[0] === '#' ? String.fromCodePoint(g[1] === 'x' || g[1] === 'X' ? parseInt(g.slice(2), 16) : parseInt(g.slice(1), 10)) : ENT[g] !== undefined ? ENT[g] : m));
const attr = (xml, name) => { const m = new RegExp('\\b' + name + '="([^"]*)"').exec(xml); return m ? dec(m[1]) : ''; };
const MIME = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', bmp: 'image/bmp' };
const rels = xml => { const o = {}; for (const m of xml.matchAll(/<Relationship\b[^>]*>/g)) o[attr(m[0], 'Id')] = attr(m[0], 'Target'); return o; };
const norm = (base, t) => { if (t.startsWith('/')) return t.slice(1); const parts = base.split('/').slice(0, -1); for (const s of t.split('/')) { if (s === '..') parts.pop(); else if (s !== '.') parts.push(s); } return parts.join('/'); };
const paraText = x => { let t = ''; for (const m of x.matchAll(/<a:t>([\s\S]*?)<\/a:t>|<a:t\/>|<a:br\b[^>]*\/>/g)) t += m[0].startsWith('<a:br') ? '\n' : dec(m[1] || ''); return t.replace(/\u000b/g, '\n'); };

async function parseSlide(zip, path, relMap) {
  const xml = await zip.text(path), rm = rels(await zip.text(path.replace(/([^/]+)$/, '_rels/$1.rels'))), items = [], skipped = new Set(), images = [];
  for (const m of xml.matchAll(/<p:(sp|pic|graphicFrame)\b[\s\S]*?<\/p:\1>/g)) {
    const [x, kind] = [m[0], m[1]], off = /<a:off\b[^>]*\bx="(-?\d+)"[^>]*\by="(-?\d+)"|<a:off\b[^>]*\by="(-?\d+)"[^>]*\bx="(-?\d+)"/.exec(x), ox = off ? Number(off[1] ?? off[4]) : 0, oy = off ? Number(off[2] ?? off[3]) : 0;
    if (kind === 'sp') {
      const ph = /<p:ph\b([^>]*)\/?>/.exec(x), pt = ph ? attr(ph[1], 'type') : '';
      if (['sldNum', 'ftr', 'dt', 'hdr'].includes(pt)) continue; const isTitle = pt === 'title' || pt === 'ctrTitle', isBody = ph && !isTitle && pt !== 'subTitle', blocks = [];
      for (const pm of x.matchAll(/<a:p\b[^>]*>([\s\S]*?)<\/a:p>|<a:p\/>/g)) {
        const body = pm[1] || '', t = paraText(body).trim(); if (!t) continue; const lvl = Number((/<a:pPr\b[^>]*\blvl="(\d)"/.exec(body) || [])[1] || 0);
        const bullet = !/<a:buNone\b/.test(body) && (isBody || /<a:bu(Char|AutoNum|Blip)\b/.test(body));
        blocks.push(isTitle ? { k: 'h', t } : bullet ? { k: 'li', t, l: Math.min(lvl, 3) } : { k: 'p', t });
      }
      if (blocks.length) items.push({ y: oy, x: ox, title: isTitle, blocks: isTitle ? [{ k: 'h', t: blocks.map(b => b.t).join(' ') }] : blocks });
    } else if (kind === 'pic') {
      const id = attr((/<a:blip\b[^>]*>/.exec(x) || [''])[0], 'r:embed'), target = rm[id]; if (!target) continue; const p = norm(path, target), ext = (p.split('.').pop() || '').toLowerCase();
      if (!MIME[ext]) { skipped.add('image:' + ext); continue; } if (!zip.names.includes(p)) continue;
      const alt = attr((/<p:cNvPr\b[^>]*>/.exec(x) || [''])[0], 'descr'), img = { name: p, mime: MIME[ext], alt, bytes: () => zip.read(p) }; images.push(img); items.push({ y: oy, x: ox, blocks: [{ k: 'img', i: images.length - 1, alt }] });
    } else if (/<a:tbl\b/.test(x)) {
      const rows = [...x.matchAll(/<a:tr\b[\s\S]*?<\/a:tr>/g)].map(r => [...r[0].matchAll(/<a:tc\b[\s\S]*?<\/a:tc>/g)].map(c => [...c[0].matchAll(/<a:p\b[^>]*>([\s\S]*?)<\/a:p>/g)].map(p => paraText(p[1]).trim()).filter(Boolean).join('\n')));
      if (rows.length) items.push({ y: oy, x: ox, blocks: [{ k: 'tbl', rows }] });
    } else if (/chart/i.test(x)) skipped.add('chart'); else if (/dgm|diagram/i.test(x)) skipped.add('smartart');
  }
  items.sort((a, b) => (b.title - a.title) || (Math.abs(a.y - b.y) > 180000 ? a.y - b.y : a.x - b.x));          // ርዕስ መጀመሪያ፣ ከዚያ ከላይ ወደ ታች
  const blocks = items.flatMap(i => i.blocks), title = (blocks.find(b => b.k === 'h') || {}).t || '';
  return { title, blocks, images, skipped: [...skipped] };
}

async function parsePptx(buf) {
  const zip = await readZip(buf), pres = await zip.text('ppt/presentation.xml'); if (!pres) throw new Error('not_pptx');
  const rm = rels(await zip.text('ppt/_rels/presentation.xml.rels')), order = [...pres.matchAll(/<p:sldId\b[^>]*>/g)].map(m => rm[attr(m[0], 'r:id')]).filter(Boolean).map(t => norm('ppt/presentation.xml', t));
  const slides = [], warnings = []; let n = 0;
  for (const path of order) { n++; const s = await parseSlide(zip, path); slides.push({ n, ...s }); if (s.skipped.length) warnings.push({ n, what: s.skipped }); }
  return { slides, warnings };
}
module.exports = { parsePptx, readZip };
