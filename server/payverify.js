'use strict';
/* ===== የክፍያ ማረጋገጫ ተሰኪ (አማራጭ፤ በነባሪ ጠፍቷል) =====
   ገዥው በቴሌብር/ባንክ ከከፈለ በኋላ የሚያስገባውን የደረሰኝ ቁጥር ወደ ውጫዊ አረጋጋጭ ልኮ ውጤቱን ከትዕዛዙ ጋር ያመሳስላል።
   ቅንብር፦ PAY_VERIFIER_URL (አረጋጋጩ የሚቀበል POST አድራሻ) · PAY_VERIFIER_KEY (አማራጭ — Bearer ቁልፍ)
          PAY_AUTO_CONFIRM=1  ሙሉ ተዛምዶ ሲኖር ብቻ በራስ ያረጋግጣል (ሌላ ጊዜ ለአድሚን ጠቋሚ ብቻ ነው የሚሆነው)
   ውል (contract)፦ ጥያቄ  POST { method, ref, amount, accounts:[{method,number,holder}] }
                    መልስ   { found:boolean, amount:number, receiver:string, ts:number|ISO-string }
   (Verify.ET፣ VerPay ወይም የራስዎ አገልግሎት ፊት ትንሽ አስተላላፊ በማድረግ ከዚህ ውል ጋር ያስማሙ።) */
const digits = x => String(x == null ? '' : x).replace(/\D/g, '');
const words = x => String(x == null ? '' : x).toUpperCase().split(/[^A-Z0-9ሀ-፿]+/).filter(w => w.length > 1);
/* ===== ነፃ አብሮ-የተሰራ የቴሌብር ደረሰኝ ፍተሻ (ምንም ክፍያ/ቁልፍ አይፈልግም) =====
   የኢትዮ ቴሌኮም የህዝብ ደረሰኝ ገጽ https://transactioninfo.ethiotelecom.et/receipt/<ማጣቀሻ> በሰርቨር ይነበባል፤ ከፋይ/ተቀባይ/መጠን/ቀን/ሁኔታ ይወጣል።
   PAY_FREE_TELEBIRR=0 ሲሆን ይጠፋል። PAY_RECEIPT_BASE ሊለወጥ ይችላል። ገጹ ቅርጹን ከቀየረ ወይም ከውጭ IP ከተከለከለ «unknown/error» ይሆናል (በፍጹም በስህተት አያጸድቅም)። */
const txt = h => String(h || '').replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
function parseTelebirr(html) {
  const t = txt(html), pick = (re) => { const m = re.exec(t); return m ? m[1].trim() : ''; };
  const num = x => { const n = parseFloat(String(x).replace(/,/g, '')); return Number.isFinite(n) ? n : NaN; };
  const amount = num(pick(/(?:Total Paid Amount|Settled Amount|የተከፈለው(?: ጠቅላላ)? መጠን|የተላለፈ(?:ው)? መጠን)\s*:?\s*(?:ETB|Birr|ብር)?\s*([\d,]+(?:\.\d+)?)/i));
  const receiver = pick(/(?:Credited Party name|Credited Party Name|የተከፈለለት(?: ሰው)? ስም)\s*:?\s*(.+?)\s+(?:Credited party account no|Credited Party Account|Transaction status|Bank name|የተከፈለለት (?:ሒሳብ|አካውንት)|የግብይት ሁኔታ)/i);
  const acct = pick(/(?:Credited party account no|Credited Party Account No)[^:]*:?\s*([\d*Xx\s]{6,})/i);
  const status = pick(/(?:Transaction status|የግብይት ሁኔታ)\s*:?\s*([A-Za-z]+|[ሀ-፿]+)/i);
  const d = /(\d{2})-(\d{2})-(\d{4})\s+(\d{2}):(\d{2}):(\d{2})/.exec(t), iso = /(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/.exec(t);
  const ts = d ? Date.UTC(+d[3], +d[2] - 1, +d[1], +d[4] - 3, +d[5], +d[6]) : iso ? Date.UTC(+iso[1], +iso[2] - 1, +iso[3], +iso[4] - 3, +iso[5], +iso[6]) : NaN;     // የኢትዮጵያ ሰዓት = UTC+3
  return { amount, receiver: [receiver, acct].filter(Boolean).join(' '), status, ts, text: t };
}
const refKey = x => String(x == null ? '' : x).toUpperCase().replace(/[\s\-_.]/g, '');

function create(env = process.env, fetchImpl = (...a) => fetch(...a)) {
  const url = env.PAY_VERIFIER_URL || '', key = env.PAY_VERIFIER_KEY || '';
  const free = env.PAY_FREE_TELEBIRR !== '0', base = (env.PAY_RECEIPT_BASE || 'https://transactioninfo.ethiotelecom.et/receipt/').replace(/\/?$/, '/');
  const sources = [], listeners = []; let claimFn = null;
  const baseEnabled = !!url || free, autoOk = env.PAY_AUTO_CONFIRM === '1' || (!url && env.PAY_AUTO_CONFIRM !== '0');          // ነፃው አብሮ-የተሰራ ፍተሻ በነባሪ በራስ ያረጋግጣል (PAY_AUTO_CONFIRM=0 ያጠፋል)
  const kind = m => (/telebirr|ቴሌብር|tele\s*birr/i.test(String(m || '')) ? 'telebirr' : /cbe|ንግድ ባንክ|commercial/i.test(String(m || '')) ? 'cbe' : 'other'), isTb = m => /telebirr|ቴሌብር|tele\s*birr/i.test(String(m || ''));
  async function freeTelebirr(ref) {
    const k = refKey(ref); if (!/^[A-Z0-9]{8,14}$/.test(k)) return { found: false };
    const ac = new AbortController(), t = setTimeout(() => ac.abort(), 10000);
    try {
      const r = await fetchImpl(base + k, { signal: ac.signal, headers: { 'user-agent': 'Mozilla/5.0 EtioDigitalMarket', accept: 'text/html' } });
      if (r.status === 404) return { found: false }; if (!r.ok) throw new Error('receipt ' + r.status);
      const p = parseTelebirr(await r.text()); if (!Number.isFinite(p.amount) || !p.receiver) { if (/not found|ሊገኝ አልቻለም|invalid/i.test(p.text)) return { found: false }; throw new Error('receipt_unreadable'); }
      if (p.status && !/complet|success|ተሳክ|ተጠናቀ/i.test(p.status)) return { found: false };
      return { found: true, amount: p.amount, receiver: p.receiver, ts: p.ts };
    } finally { clearTimeout(t); }
  }
  async function lookup({ method, ref, amount, accounts }) {
    for (const src of sources) { const e = await src({ method, ref }); if (e && e.found) return { found: true, amount: Number(e.amount), receiver: '', ts: e.ts == null ? NaN : e.ts, trusted: true, method: e.method || '' }; }          // ከባለቤቱ ስልክ የደረሰ የባንክ/ቴሌብር SMS (በጣም አስተማማኝ)
    if (!url) { if (free && isTb(method)) return freeTelebirr(ref); return { found: false, unsupported: !sources.length }; }
    const ac = new AbortController(), t = setTimeout(() => ac.abort(), 8000);
    try {
      const r = await fetchImpl(url, { method: 'POST', signal: ac.signal, headers: { 'content-type': 'application/json', ...(key ? { authorization: 'Bearer ' + key } : {}) }, body: JSON.stringify({ method, ref, amount, accounts: accounts || [] }) });
      if (!r.ok) throw new Error('verifier ' + r.status);
      const j = await r.json(); return { found: !!j.found, amount: j.amount == null ? NaN : Number(j.amount), receiver: j.receiver == null ? '' : String(j.receiver), ts: j.ts == null ? NaN : (typeof j.ts === 'number' ? j.ts : Date.parse(j.ts)) };
    } finally { clearTimeout(t); }
  }
  /* ውጤቱን ከትዕዛዙ ጋር ማመሳሰል — 'match' የሚሆነው ሁሉም ተረጋግጦ ሲገኝ ብቻ */
  function judge(order, accounts, r) {
    if (r.unsupported) return { state: 'unknown', reasons: ['ይህ የክፍያ መንገድ በራስ መፈተሽ አይቻልም (ቴሌብር ብቻ) — በእጅ ያረጋግጡ'] };
    if (!r.found) return { state: 'notfound', reasons: ['ማጣቀሻው በአረጋጋጩ አልተገኘም'] };
    const bad = [], unk = [];
    if (!Number.isFinite(r.amount)) unk.push('መጠኑ አልታወቀም'); else if (r.amount + 0.001 < order.total) bad.push(`መጠኑ ያንሳል (${r.amount} < ${order.total})`);
    if (r.trusted) { if (r.method && kind(r.method) !== 'other' && kind(order.payment && order.payment.method) !== 'other' && kind(r.method) !== kind(order.payment.method)) bad.push('የክፍያ ዘዴው አይመሳሰልም'); }
    const mine = (accounts || []).filter(a => a.method === (order.payment && order.payment.method)), pool = mine.length ? mine : (accounts || []);
    if (r.trusted) { /* ተቀባዩ በባለቤቱ ስልክ ላይ የደረሰ ነው */ }
    else if (!r.receiver) unk.push('ተቀባዩ አልታወቀም');
    else if (!pool.some(a => (digits(a.number).length >= 4 && digits(r.receiver).endsWith(digits(a.number).slice(-4))) || (words(a.holder).length >= 2 && words(a.holder).filter(w => words(r.receiver).includes(w)).length >= 2))) bad.push('ተቀባዩ ከእርስዎ አካውንት ጋር አይመሳሰልም');
    if (Number.isFinite(r.ts) && r.ts < order.ts - 5 * 60e3) bad.push('ክፍያው ከትዕዛዙ በፊት ነው የተፈጸመው');
    if (bad.length) return { state: 'mismatch', reasons: bad };
    if (unk.length) return { state: 'unknown', reasons: unk };
    return { state: 'match', reasons: [] };
  }
  /* ማንኛውም ክፍያ (AI/መማሪያ) — ማጣቀሻ + መጠን + ጊዜ ብቻ ተሰጥቶ ይፈተሻል፤ ስህተት ከተከሰተ 'error' ይመልሳል */
  async function check({ method, ref, amount, accounts, ts, by }) {
    try {
      const res = judge({ total: amount, payment: { method }, ts: ts || 0 }, accounts, await lookup({ method, ref, amount, accounts }));
      if (res.state === 'match' && by && claimFn && !(await claimFn(ref, by))) return { state: 'mismatch', reasons: ['ይህ ማጣቀሻ ለሌላ ክፍያ ቀድሞ ተጠቅሟል'] };
      return res;
    } catch (e) { return { state: 'error', reasons: [String(e.message).slice(0, 80)] }; }
  }
  return { get enabled() { return baseEnabled || sources.length > 0; }, get auto() { return this.enabled && autoOk; }, lookup, judge, check, isTb, kind,
    addSource: fn => { sources.push(fn); }, setClaim: fn => { claimFn = fn; }, onLedger: fn => { listeners.push(fn); }, notifyLedger: e => { for (const l of listeners) { try { Promise.resolve(l(e)).catch(() => { }); } catch (x) { } } } };
}
module.exports = { create, refKey, parseTelebirr };
