'use strict';
/* 🖼 ለቪድዮ ትዕይንት ምስል ማግኘት (ነጻ፣ ያለ ቁልፍ፤ ሁሉም በጊዜ ገደብ፤ ሲወድቅ null → ዳራ በንድፍ ይሞላል)
   1) Pollinations (AI የሚያመነጨው ምስል፣ ከመግለጫው ጋር የሚሄድ)  2) Wikimedia Commons (እውነተኛ ፎቶ ፍለጋ) */
const tmo = (ms) => { const c = new AbortController(); const t = setTimeout(() => c.abort(), ms); return { signal: c.signal, done: () => clearTimeout(t) }; };
async function getBuf(url, ms, minBytes = 4000) {
  const t = tmo(ms); try { const r = await fetch(url, { signal: t.signal, headers: { 'user-agent': 'EtioDigitalMarketBot/1.0 (video)' } }); if (!r.ok) return null; const ct = (r.headers && r.headers.get && r.headers.get('content-type')) || 'image/jpeg'; if (!/^image\/(jpe?g|png|webp)/i.test(ct)) return null; const b = Buffer.from(await r.arrayBuffer()); return b.length >= minBytes ? Object.assign(b, { mime: ct }) : null; } catch (e) { return null; } finally { t.done(); }
}
async function pollinations(q, W, H, seed, ms) { const w = Math.min(1024, Math.max(512, Math.round(W * 1.3 / 16) * 16)), h = Math.min(1280, Math.max(512, Math.round(H * 1.3 / 16) * 16)); return getBuf(`https://image.pollinations.ai/prompt/${encodeURIComponent(q + ', cinematic, professional photography, vibrant, high quality, no text, no letters')}?width=${w}&height=${h}&nologo=true&seed=${seed}`, ms); }
async function commons(q, ms) {
  const t = tmo(ms); try {
    const r = await fetch(`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent('filetype:bitmap ' + q)}&gsrnamespace=6&gsrlimit=6&prop=imageinfo&iiprop=url|mime|size&iiurlwidth=1200&format=json&origin=*`, { signal: t.signal, headers: { 'user-agent': 'EtioDigitalMarketBot/1.0 (video)' } }); if (!r.ok) return null; const j = await r.json(), pages = Object.values((j.query && j.query.pages) || {}).sort((a, b) => (a.index || 0) - (b.index || 0));
    for (const p of pages) { const ii = p.imageinfo && p.imageinfo[0]; if (ii && /jpe?g|png/i.test(ii.mime || '') && (ii.width || 0) >= 700 && ii.thumburl) { const b = await getBuf(ii.thumburl, ms); if (b) return b; } } return null;
  } catch (e) { return null; } finally { t.done(); }
}
async function fetchImage(q, { W = 540, H = 960, seed = 1, ms = 25000 } = {}) {
  q = String(q || '').replace(/\s+/g, ' ').trim().slice(0, 220); if (q.length < 3) return null;
  return (await pollinations(q, W, H, seed, ms)) || (await commons(q.split(',')[0], Math.min(ms, 12000)));
}
module.exports = { fetchImage };
