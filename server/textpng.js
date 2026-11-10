'use strict';
/* ጽሑፍ → PNG (ያለ ጥገኛ፣ ያለ ffmpeg drawtext/freetype)። amh.ttf (TrueType) የ glyf ቅርጾችን ያነባል፣ ይሞላል (4× supersampling)፣ ጥላ ይጨምራል።
   የ glyph መታወቂያ እና ስፋት ከ fonts/amh.json (FM.m[codepoint] = [gid, advance/1000em]) */
const fs = require('fs'), path = require('path'), zlib = require('zlib');
const BUF = fs.readFileSync(path.join(__dirname, 'fonts', 'amh.ttf')), FM = JSON.parse(fs.readFileSync(path.join(__dirname, 'fonts', 'amh.json'), 'utf8'));
const tbl = (() => { const n = BUF.readUInt16BE(4), t = {}; for (let i = 0; i < n; i++) { const o = 12 + i * 16; t[BUF.toString('latin1', o, o + 4)] = { off: BUF.readUInt32BE(o + 8), len: BUF.readUInt32BE(o + 12) }; } return t; })();
const UPEM = BUF.readUInt16BE(tbl.head.off + 18), LOCF = BUF.readInt16BE(tbl.head.off + 50), NG = BUF.readUInt16BE(tbl.maxp.off + 4);
const loca = g => LOCF ? BUF.readUInt32BE(tbl.loca.off + g * 4) : BUF.readUInt16BE(tbl.loca.off + g * 2) * 2;
const CACHE = new Map();
function contours(g, depth = 0) {          // → [[ [x,y], ... ] ...] ቀጥ ያሉ መስመሮች (Bézier ተቆራርጧል)
  if (CACHE.has(g)) return CACHE.get(g); let out = [];
  if (g >= 0 && g < NG && depth < 4) {
    const a = loca(g), b = loca(g + 1); if (b > a) {
      let o = tbl.glyf.off + a; const nc = BUF.readInt16BE(o); o += 10;
      if (nc >= 0) {
        const ends = []; for (let i = 0; i < nc; i++) { ends.push(BUF.readUInt16BE(o)); o += 2; } const np = nc ? ends[nc - 1] + 1 : 0, il = BUF.readUInt16BE(o); o += 2 + il;
        const fl = []; while (fl.length < np) { const f = BUF[o++]; fl.push(f); if (f & 8) { let r = BUF[o++]; while (r-- > 0 && fl.length < np) fl.push(f); } }
        const xs = [], ys = []; let v = 0; for (let i = 0; i < np; i++) { const f = fl[i]; if (f & 2) { const d = BUF[o++]; v += f & 16 ? d : -d; } else if (!(f & 16)) { v += BUF.readInt16BE(o); o += 2; } xs.push(v); } v = 0;
        for (let i = 0; i < np; i++) { const f = fl[i]; if (f & 4) { const d = BUF[o++]; v += f & 32 ? d : -d; } else if (!(f & 32)) { v += BUF.readInt16BE(o); o += 2; } ys.push(v); }
        let s = 0; for (const e of ends) {
          const P = []; for (let i = s; i <= e; i++) P.push({ x: xs[i], y: ys[i], on: !!(fl[i] & 1) }); s = e + 1; if (P.length < 2) continue;
          const pts = []; const n = P.length; let st = P.findIndex(p => p.on), first; if (st < 0) { first = { x: (P[0].x + P[n - 1].x) / 2, y: (P[0].y + P[n - 1].y) / 2 }; st = -1; } else first = P[st];
          const seq = []; for (let k = 0; k < n; k++) seq.push(P[(((st < 0 ? 0 : st + 1) + k) % n)]); if (st >= 0) seq.pop();           // st≥0፦ መነሻ on-point ከተወሰደ በኋላ ያሉት
          let cur = first; pts.push([cur.x, cur.y]); let ctl = null;
          const quad = (p0, c, p1) => { for (let q = 1; q <= 6; q++) { const t = q / 6, u = 1 - t; pts.push([u * u * p0.x + 2 * u * t * c.x + t * t * p1.x, u * u * p0.y + 2 * u * t * c.y + t * t * p1.y]); } };
          for (const p of seq) { if (p.on) { if (ctl) { quad(cur, ctl, p); ctl = null; } else pts.push([p.x, p.y]); cur = p; } else { if (ctl) { const m = { x: (ctl.x + p.x) / 2, y: (ctl.y + p.y) / 2 }; quad(cur, ctl, m); cur = m; } ctl = p; } }
          if (ctl) quad(cur, ctl, first); out.push(pts);
        }
      } else {          // ተዋሃደ glyph
        for (let more = true; more;) { const f = BUF.readUInt16BE(o), gi = BUF.readUInt16BE(o + 2); o += 4; let dx, dy; if (f & 1) { dx = BUF.readInt16BE(o); dy = BUF.readInt16BE(o + 2); o += 4; } else { dx = BUF.readInt8(o); dy = BUF.readInt8(o + 1); o += 2; } let sx = 1, sy = 1; if (f & 8) { sx = sy = BUF.readInt16BE(o) / 16384; o += 2; } else if (f & 0x40) { sx = BUF.readInt16BE(o) / 16384; sy = BUF.readInt16BE(o + 2) / 16384; o += 4; } else if (f & 0x80) { sx = BUF.readInt16BE(o) / 16384; sy = BUF.readInt16BE(o + 6) / 16384; o += 8; }
          if (!(f & 2)) { dx = 0; dy = 0; } for (const c of contours(gi, depth + 1)) out.push(c.map(([x, y]) => [x * sx + dx, y * sy + dy])); more = !!(f & 0x20); }
      }
    }
  }
  CACHE.set(g, out); return out;
}
const SS = 4, CRC = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
const crc = b => { let c = -1; for (let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (type, data) => { const o = Buffer.alloc(12 + data.length); o.writeUInt32BE(data.length, 0); o.write(type, 4, 'latin1'); data.copy(o, 8); o.writeUInt32BE(crc(o.subarray(4, 8 + data.length)), 8 + data.length); return o; };
function pngRGBA(w, h, rgba) { const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6; const raw = Buffer.alloc(h * (1 + w * 4)); for (let y = 0; y < h; y++) rgba.copy(raw, y * (1 + w * 4) + 1, y * w * 4, (y + 1) * w * 4); return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw, { level: 3 })), chunk('IEND', Buffer.alloc(0))]); }
/* → { buf (PNG), w, h } ፤ opt: color [r,g,b], shadow (px, 0=የለም) */
function textPng(text, size, opt = {}) {
  const col = opt.color || [255, 255, 255], sh = opt.shadow == null ? Math.max(1, Math.round(size * 0.05)) : opt.shadow, pad = Math.ceil(size * 0.12) + sh, asc = size * 0.95, desc = size * 0.4;
  const chars = [...String(text)].filter(ch => FM.m[ch.codePointAt(0)]); let adv = 0; const pen = chars.map(ch => { const x = adv; adv += FM.m[ch.codePointAt(0)][1] * size / 1000; return x; });
  const w = Math.max(2, Math.ceil(adv + pad * 2)), h = Math.ceil(asc + desc + pad * 2), W = w * SS, Hh = h * SS, mask = new Uint8Array(W * Hh), k = size / UPEM * SS, base = (pad + asc) * SS;
  const edges = []; chars.forEach((ch, i) => { const g = FM.m[ch.codePointAt(0)][0], ox = (pad + pen[i]) * SS; for (const c of contours(g)) for (let j = 0; j < c.length; j++) { const a = c[j], b = c[(j + 1) % c.length]; const x1 = ox + a[0] * k, y1 = base - a[1] * k, x2 = ox + b[0] * k, y2 = base - b[1] * k; if (y1 !== y2) edges.push([x1, y1, x2, y2]); } });
  const rows = Array.from({ length: Hh }, () => []); for (const e of edges) { const [x1, y1, x2, y2] = e, lo = Math.max(0, Math.ceil(Math.min(y1, y2) - 0.5)), hi = Math.min(Hh - 1, Math.floor(Math.max(y1, y2) - 0.5)); for (let y = lo; y <= hi; y++) { const yc = y + 0.5, t = (yc - y1) / (y2 - y1); if (t >= 0 && t < 1) rows[y].push([x1 + t * (x2 - x1), y2 > y1 ? 1 : -1]); } }
  for (let y = 0; y < Hh; y++) { const r = rows[y]; if (!r.length) continue; r.sort((a, b) => a[0] - b[0]); let wnd = 0; for (let i = 0; i < r.length - 1; i++) { wnd += r[i][1]; if (wnd !== 0) { const xa = Math.max(0, Math.round(r[i][0])), xb = Math.min(W, Math.round(r[i + 1][0])); mask.fill(1, y * W + xa, y * W + xb); } } }
  const cov = new Float32Array(w * h); for (let y = 0; y < Hh; y++) for (let x = 0; x < W; x++) if (mask[y * W + x]) cov[((y / SS) | 0) * w + ((x / SS) | 0)] += 1 / (SS * SS);
  const out = Buffer.alloc(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const a = Math.min(1, cov[y * w + x]), s = sh && x >= sh && y >= sh ? Math.min(1, cov[(y - sh) * w + (x - sh)]) * 0.55 : 0, o = (y * w + x) * 4;
    const ta = a, sa = s * (1 - ta), oa = ta + sa; if (oa <= 0) continue; out[o] = Math.round((col[0] * ta) / oa); out[o + 1] = Math.round((col[1] * ta) / oa); out[o + 2] = Math.round((col[2] * ta) / oa); out[o + 3] = Math.round(oa * 255);
  }
  return { buf: pngRGBA(w, h, out), w, h };
}
module.exports = { textPng, contours, UPEM, pngRGBA };
