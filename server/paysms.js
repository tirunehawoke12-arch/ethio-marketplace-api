'use strict';
/* ===== ከባለቤቱ ስልክ የደረሰ የክፍያ SMS → ራስ-ሰር ማረጋገጫ (ነጻ፣ በጣም አስተማማኝ፣ ለቴሌብር + ለሁሉም ባንኮች) =====
   የቴሌብር/ባንክ «ገንዘብ ተቀብለዋል» SMS ወደ እርስዎ ስልክ ይደርሳል። በስልክዎ ላይ ነጻ የ SMS-forwarder መተግበሪያ (SMS Forwarder፣ MacroDroid፣ Tasker ወዘተ) እነዚህን
   ወደ POST /api/pay/sms-hook?key=<ሚስጥር> ይልካል። ሰርቨሩ መጠን + ማጣቀሻ + ሰዓት አውጥቶ በ ledger (pay/sms) ያስቀምጣል፤ ተጠቃሚው ማጣቀሻ ሲያስገባ ከ ledger ጋር
   ይመሳሰላል (መጠን ≥ ዋጋ፣ ሰዓት ተገቢ፣ ማጣቀሻው አንድ ጊዜ ብቻ)። SMS ከክፍያው በኋላ ቢዘገይ እንኳ ሲደርስ በተጠባባቂ ጥያቄዎች ላይ ራሱ ይፈተሻል። */
const crypto = require('crypto');
const LED = 'pay/sms', USED = 'pay/used', CFG = 'pay/cfg', KEEP = 45 * 86400e3;
const refKey = x => String(x == null ? '' : x).toUpperCase().replace(/[\s\-_.]/g, '');

function parseSms(text, from) {
  const t = String(text || '').replace(/\s+/g, ' ').trim(); if (!t) return null;
  if (/\b(debited|you have (?:sent|transferred|paid)|you (?:sent|paid)|purchased|airtime|ላኩ|ተልኳል|ተከፍሏል)\b/i.test(t) && !/\b(received|credited)\b|ተቀብለዋል|ገቢ ሆኗል/i.test(t)) return null;          // ወጪ ሲሆን
  if (!/received|credited|deposit|ተቀብለዋል|ገቢ ሆኗል|ገቢ ተደርጓል/i.test(t)) return null;
  const am = /(?:ETB|Birr|ብር)\s*([\d,]+(?:\.\d+)?)|([\d,]+(?:\.\d+)?)\s*(?:ETB|Birr|ብር)/i.exec(t); const amount = am ? parseFloat((am[1] || am[2]).replace(/,/g, '')) : NaN; if (!Number.isFinite(amount) || amount <= 0) return null;
  let ref = ''; for (const re of [/(?:transaction\s*(?:number|no\.?|id)|txn\s*(?:id|no\.?)|ref(?:erence)?\s*(?:no\.?|number|id)?|receipt\s*(?:no\.?|number)|የግብይት\s*(?:ቁጥር|መለያ))\s*(?:is|፦|:|-)?\s*([A-Z0-9]{8,20})\b/i, /\bid\s*[:\-]?\s*([A-Z]{2}[A-Z0-9]{8,14})\b/i]) { const m = re.exec(t); if (m && /\d/.test(m[1])) { ref = m[1]; break; } }
  if (!ref) { const m = [...t.matchAll(/\b([A-Z]{2}[A-Z0-9]{8,14})\b/g)].map(x => x[1]).find(x => /\d/.test(x) && /[A-Z]/.test(x)); if (m) ref = m; }
  if (!ref) return null;
  const f = String(from || ''), method = /telebirr|ቴሌብር|e-?money|127/i.test(t + ' ' + f) ? 'telebirr' : /cbe|commercial bank|ንግድ ባንክ|FT\d/i.test(t + ' ' + f + ' ' + ref) ? 'cbe' : /awash|አዋሽ/i.test(t + f) ? 'awash' : /dashen|ዳሽን/i.test(t + f) ? 'dashen' : /abyssinia|boa|አቢሲኒያ/i.test(t + f) ? 'abyssinia' : 'other';
  const pm = /from\s+([A-Za-z][A-Za-z .'\-]{2,40}?)(?:\s*[\(,]| on | at |\.|$)/i.exec(t), d = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\D+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(t), iso = /(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/.exec(t);
  let ts = NaN; if (iso) ts = Date.UTC(+iso[1], +iso[2] - 1, +iso[3], +iso[4] - 3, +iso[5], +(iso[6] || 0)); else if (d) ts = Date.UTC(+d[3], +d[2] - 1, +d[1], (+d[4] || 0) - 3, +(d[5] || 0), +(d[6] || 0));          // dd/mm/yyyy፤ ሰዓት = ኢትዮጵያ (UTC+3)
  return { ref, amount, method, payer: pm ? pm[1].trim() : '', ts };
}

module.exports = function paysms(ctx) {
  const { app, col, saveMany, adminOnly, pv, bad, S, baseUrl = '', now = () => Date.now(), notifyAdmin = () => { } } = ctx;
  const key = () => { const c = col(CFG); if (!c.main || !c.main.key) { c.main = { id: 'main', key: crypto.randomBytes(18).toString('hex') }; saveMany([[CFG, 'main']]).catch(() => { }); } return c.main.key; };
  const same = (a, b) => { const x = Buffer.from(String(a)), y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };
  async function ingest(raw) {
    const p = parseSms(raw.text, raw.from); if (!p) return { ok: true, stored: false };
    const t = now(), e = { id: refKey(p.ref), ref: p.ref, method: p.method, amount: p.amount, payer: p.payer, ts: Number.isFinite(p.ts) && p.ts <= t + 600e3 ? p.ts : t, rx: t };
    const L = col(LED); for (const [k, v] of Object.entries(L)) if (t - (v.rx || 0) > KEEP) delete L[k];
    if (L[e.id]) return { ok: true, stored: false, dup: true }; L[e.id] = e; await saveMany([[LED, e.id]]);
    try { pv.notifyLedger(e); } catch (x) { } return { ok: true, stored: true, id: e.id };
  }
  pv.addSource(async ({ ref }) => { const e = col(LED)[refKey(ref)]; return e ? { found: true, amount: e.amount, ts: e.ts, method: e.method } : null; });
  pv.setClaim(async (ref, by) => { const U = col(USED), k = refKey(ref), u = U[k]; if (u && u.by !== by) return false; if (!u) { U[k] = { id: k, by, ts: now() }; try { await saveMany([[USED, k]]); } catch (x) { delete U[k]; return false; } } return true; });
  app.post('/api/pay/sms-hook', async (req, res) => {
    const b = req.body || {}, k = req.headers['x-hook-key'] || req.query.key || b.key || ''; if (!k || !same(k, key())) return res.status(401).json({ ok: false, error: 'bad_key' });
    try { res.json(await ingest({ text: b.text || b.message || b.body || b.sms || b.content || '', from: b.from || b.sender || b.address || b.number || '' })); } catch (e) { bad ? bad(res, 503, 'storage') : res.status(503).json({ ok: false }); }
  });
  const admin = (req, res) => adminOnly(req, res);
  app.get('/api/pay/admin/sms', (req, res) => { if (!admin(req, res)) return; const L = Object.values(col(LED)).sort((a, b) => b.rx - a.rx); res.json({ ok: true, url: `${baseUrl}/api/pay/sms-hook?key=${key()}`, key: key(), count: L.length, last: L[0] ? L[0].rx : 0, recent: L.slice(0, 15).map(x => ({ ref: x.ref, method: x.method, amount: x.amount, payer: x.payer, ts: x.ts, used: !!col(USED)[x.id] })) }); });
  app.post('/api/pay/admin/sms/rotate', async (req, res) => { if (!admin(req, res)) return; col(CFG).main = { id: 'main', key: crypto.randomBytes(18).toString('hex') }; try { await saveMany([[CFG, 'main']]); res.json({ ok: true, url: `${baseUrl}/api/pay/sms-hook?key=${col(CFG).main.key}` }); } catch (e) { res.status(503).json({ ok: false }); } });
  return { parseSms, ingest, key };
};
module.exports.parseSms = parseSms;
module.exports.refKey = refKey;
