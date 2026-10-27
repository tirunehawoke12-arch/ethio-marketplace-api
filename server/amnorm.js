'use strict';
/* ===== የአማርኛ ፍለጋ ማስተካከያ =====
   ተመሳሳይ ድምጽ ያላቸው ፊደላት (ሀ/ሐ/ኀ፣ ሰ/ሠ፣ አ/ዐ፣ ጸ/ፀ) እና የፊደል ሞገድ ልዩነት ቢኖርም ይገኛል፤
   ብዙ ቃል ሲጻፍ ሁሉም ቃላት መኖር አለባቸው (ቅደም ተከተል አይመለከትም)፤ ሥርዓተ ነጥብ እና ትላልቅ/ትናንሽ ፊደል አይለይም። */
const FAM = [[0x1210, 0x1200], [0x1280, 0x1200], [0x1220, 0x1230], [0x12D0, 0x12A0], [0x1338, 0x1340]];   // [ምንጭ ቤተሰብ, መደበኛ ቤተሰብ]
function norm(s) {
  let out = '';
  for (const ch of String(s == null ? '' : s).normalize('NFC').toLowerCase()) {
    let c = ch.codePointAt(0);
    for (const [from, to] of FAM) if (c >= from && c < from + 8) { c = to + (c - from); break; }
    out += String.fromCodePoint(c);
  }
  return out.replace(/[።፣፤፥፦፧፡,.;:!?()\[\]{}"'«»\-_/\\]+/g, ' ').replace(/\s+/g, ' ').trim();
}
const tokens = q => norm(q).split(' ').filter(Boolean);
/** hit(haystack, query) — ሁሉም የጥያቄ ቃላት በጽሑፉ ውስጥ ካሉ true */
function hit(hay, q) { const t = Array.isArray(q) ? q : tokens(q); if (!t.length) return true; const h = norm(hay); return t.every(x => h.includes(x)); }
module.exports = { norm, tokens, hit };
