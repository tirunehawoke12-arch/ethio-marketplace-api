'use strict';
/* 📖 Wikipedia ማጣቀሻ (v41)፦ ጥያቄ ሲጠየቅ ከ Wikipedia የተገኘ ማጠቃለያ ለ AI ይሰጣል (አማርኛ ጥያቄ → am.wikipedia፤ እንግሊዝኛ → en.wikipedia)። ያለ ቁልፍ፣ ያለ ጥገኛ፤ ቢወድቅ ዝም ይላል። AI_WIKI=0 ያጠፋል። */
const cache = new Map(), TTL = 6 * 3600e3, MAXC = 200;
const LOW = /^(ሰላም|ሀሎ|ሃይ|እሺ|አመሰግናለሁ|አመሰግናለው|ደህና|hi|hello|thanks|ok|okay|yes|no)\b/i, MARKET = /(ሱቅ|ዋጋ|ትዕዛዝ|ክፍያ|ጋሪ|ደረሰኝ|ሥራ ፈልግ|ቪድዮ|ሰነድ|pdf|pptx|docx)/i;
function wanted(text) {
  if (process.env.AI_WIKI === '0' || (process.env.NODE_TEST_CONTEXT && process.env.AI_WIKI !== '1')) return false;
  const t = String(text || '').trim(); if (t.length < 6 || t.length > 400 || /^\//.test(t) || LOW.test(t) || MARKET.test(t)) return false; return /[?፧]|ማን|ምንድን|ምንድ|ምን |መቼ|የት|እንዴት|ለምን|ስንት|ማነው|ማናት|ነው\b|ናት\b|what|who|when|where|why|how|which|explain|define/i.test(t) || t.split(/\s+/).length <= 5;
}
const clean = s => String(s || '').replace(/\s+/g, ' ').replace(/\[\d+\]/g, '').trim();
async function lookup(text, { fetchImpl, timeoutMs = 3500, limit = 2, chars = 900 } = {}) {
  if (!wanted(text)) return []; const f = fetchImpl || ((...a) => fetch(...a)), lang = /[ሀ-፿]/.test(text) ? 'am' : 'en';
  const q = (clean(text).replace(/[?፧።!]+/g, ' ').replace(lang === 'am' ? /(^|\s)(ማን|ማነው|ማናት|ምንድን|ምንድነው|ምን|ስንት|ነው|ናት|ናቸው|የት|መቼ|እንዴት|ለምን|ንገረኝ|አስረዳኝ|ንገሩኝ)(?=\s|$)/g : /\b(what|who|when|where|why|how|is|are|was|the|a|an|tell|me|about|explain)\b/gi, ' ').replace(/\s+/g, ' ').trim() || clean(text)).slice(0, 120), ck = lang + ':' + q.toLowerCase(), hit = cache.get(ck); if (hit && Date.now() - hit.t < TTL) return hit.v;
  const ctl = typeof AbortController === 'function' ? new AbortController() : null, tm = ctl && setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const url = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrlimit=${limit}&gsrnamespace=0&prop=extracts%7Cinfo&exintro=1&explaintext=1&exchars=${chars}&inprop=url&redirects=1`;
    const r = await f(url, { signal: ctl && ctl.signal, headers: { 'user-agent': 'EtioDigitalMarket/1.0 (telegram bot)' } }); if (!r || !r.ok) return [];
    const j = await r.json(), pages = Object.values((j && j.query && j.query.pages) || {}).sort((a, b) => (a.index || 9) - (b.index || 9));
    const v = pages.map(p => ({ title: clean(p.title), text: clean(p.extract), url: p.fullurl || `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(String(p.title).replace(/ /g, '_'))}`, lang })).filter(p => p.title && p.text.length > 40).slice(0, limit);
    if (cache.size > MAXC) cache.delete(cache.keys().next().value); cache.set(ck, { t: Date.now(), v }); return v;
  } catch (e) { return []; } finally { if (tm) clearTimeout(tm); }
}
const asContext = items => items.length ? '\n\n[ከ Wikipedia የተገኘ ማጣቀሻ — ጥያቄው ከዚህ ጋር የሚዛመድ ከሆነ ተጠቀም፤ ካልተዛመደ ችላ በል። Wikipedia ሁሌም ትክክል አይደለም፤ ሲጠቀሙ በመጨረሻ «📖 ምንጭ፦ Wikipedia — አገናኝ» ብለህ ጥቀስ]\n' + items.map(p => `• ${p.title} (${p.url})\n${p.text}`).join('\n\n') : '';
module.exports = { lookup, asContext, wanted };
