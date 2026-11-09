/* PDF ገጽ ውስጥ የተካተቱ ምስሎችን ያወጣል (ያለ ጥገኛ፤ zlib ብቻ)።
   ይደግፋል፦ JPEG (DCTDecode) እና 8-ቢት Flate ምስሎች (RGB/ግራጫ፣ ከ PNG-predictor ጋር ወይም ያለ) → PNG።
   ሌሎች (CMYK፣ Indexed፣ JPX፣ CCITT፣ ጭምብል) ይዘለላሉ። ውጤት፦ [{ mime, buf, w, h }] */
const zlib = require('zlib');
const T = (() => { const t = new Int32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c; } return t; })();
const crc = b => { let c = -1; for (let i = 0; i < b.length; i++) c = T[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (type, data) => { const o = Buffer.alloc(12 + data.length); o.writeUInt32BE(data.length, 0); o.write(type, 4, 'latin1'); data.copy(o, 8); o.writeUInt32BE(crc(o.subarray(4, 8 + data.length)), 8 + data.length); return o; };
function png(w, h, c, rows /* filter byte ያላቸው ረድፎች */) {
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = c === 1 ? 0 : 2; ih[10] = 0; ih[11] = 0; ih[12] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(rows)), chunk('IEND', Buffer.alloc(0))]);
}
const num = (d, k) => { const m = new RegExp('/' + k + '\\s+(\\d+)(?!\\s+\\d+\\s+R)').exec(d); return m ? Number(m[1]) : 0; };
function extractPdfImages(buf, opt = {}) {
  const max = opt.max || 6, minPx = opt.minPx || 64, maxBytes = opt.maxBytes || 6e6, s = buf.toString('latin1'), out = [], seen = new Set();
  let pos = 0;
  while (out.length < max) {
    const st = s.indexOf('stream', pos); if (st < 0) break; pos = st + 6; if (s.slice(st - 3, st) === 'end') continue;
    let ds = s.lastIndexOf(' obj', st); if (ds < 0) continue; const dict = s.slice(ds + 4, st);
    if (!/\/Subtype\s*\/Image/.test(dict)) continue; let a = st + 6; if (s[a] === '\r') a++; if (s[a] === '\n') a++; const e = s.indexOf('endstream', a); if (e < 0) continue;
    let b = e; if (s[b - 1] === '\n') b--; if (s[b - 1] === '\r') b--; const w = num(dict, 'Width'), h = num(dict, 'Height'); if (w < minPx || h < minPx || b - a > maxBytes) continue;
    if (/\/SMask|\/ImageMask\s+true/.test(dict) && /\/ImageMask\s+true/.test(dict)) continue; const key = w + 'x' + h + ':' + (b - a) + ':' + buf.subarray(a, Math.min(b, a + 32)).toString('hex'); if (seen.has(key)) continue;
    const filt = (/\/Filter\s*(\[[^\]]*\]|\/\w+)/.exec(dict) || ['', ''])[1], raw = buf.subarray(a, b);
    try {
      if (/^\/DCTDecode$|^\[\s*\/DCTDecode\s*\]$/.test(filt.trim())) { seen.add(key); out.push({ mime: 'image/jpeg', buf: Buffer.from(raw), w, h }); continue; }
      if (/^\/FlateDecode$|^\[\s*\/FlateDecode\s*\]$/.test(filt.trim()) && (num(dict, 'BitsPerComponent') || 8) === 8) {
        const inf = zlib.inflateSync(raw), pred = num(dict, 'Predictor'); let c = 0, rows = null;
        if (pred >= 10) { for (const cc of [1, 3]) if (inf.length === h * (1 + w * cc)) c = cc; if (c) rows = inf; }
        else { for (const cc of [1, 3]) if (inf.length === w * h * cc) c = cc; if (c) { rows = Buffer.alloc(h * (1 + w * c)); for (let y = 0; y < h; y++) inf.copy(rows, y * (1 + w * c) + 1, y * w * c, (y + 1) * w * c); } }
        if (rows) { seen.add(key); out.push({ mime: 'image/png', buf: png(w, h, c, rows), w, h }); }
      }
    } catch (x) { }
  }
  return out;
}
module.exports = { extractPdfImages, png };
