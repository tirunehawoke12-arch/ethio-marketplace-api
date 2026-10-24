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
const refKey = x => String(x == null ? '' : x).toUpperCase().replace(/[\s\-_.]/g, '');

function create(env = process.env, fetchImpl = (...a) => fetch(...a)) {
  const url = env.PAY_VERIFIER_URL || '', key = env.PAY_VERIFIER_KEY || '';
  const enabled = !!url, auto = enabled && env.PAY_AUTO_CONFIRM === '1';
  async function lookup({ method, ref, amount, accounts }) {
    const ac = new AbortController(), t = setTimeout(() => ac.abort(), 8000);
    try {
      const r = await fetchImpl(url, { method: 'POST', signal: ac.signal, headers: { 'content-type': 'application/json', ...(key ? { authorization: 'Bearer ' + key } : {}) }, body: JSON.stringify({ method, ref, amount, accounts: accounts || [] }) });
      if (!r.ok) throw new Error('verifier ' + r.status);
      const j = await r.json(); return { found: !!j.found, amount: j.amount == null ? NaN : Number(j.amount), receiver: j.receiver == null ? '' : String(j.receiver), ts: j.ts == null ? NaN : (typeof j.ts === 'number' ? j.ts : Date.parse(j.ts)) };
    } finally { clearTimeout(t); }
  }
  /* ውጤቱን ከትዕዛዙ ጋር ማመሳሰል — 'match' የሚሆነው ሁሉም ተረጋግጦ ሲገኝ ብቻ */
  function judge(order, accounts, r) {
    if (!r.found) return { state: 'notfound', reasons: ['ማጣቀሻው በአረጋጋጩ አልተገኘም'] };
    const bad = [], unk = [];
    if (!Number.isFinite(r.amount)) unk.push('መጠኑ አልታወቀም'); else if (r.amount + 0.001 < order.total) bad.push(`መጠኑ ያንሳል (${r.amount} < ${order.total})`);
    const mine = (accounts || []).filter(a => a.method === (order.payment && order.payment.method)), pool = mine.length ? mine : (accounts || []);
    if (!r.receiver) unk.push('ተቀባዩ አልታወቀም');
    else if (!pool.some(a => (digits(a.number).length >= 4 && digits(r.receiver).endsWith(digits(a.number).slice(-4))) || (words(a.holder).length >= 2 && words(a.holder).filter(w => words(r.receiver).includes(w)).length >= 2))) bad.push('ተቀባዩ ከእርስዎ አካውንት ጋር አይመሳሰልም');
    if (Number.isFinite(r.ts) && r.ts < order.ts - 5 * 60e3) bad.push('ክፍያው ከትዕዛዙ በፊት ነው የተፈጸመው');
    if (bad.length) return { state: 'mismatch', reasons: bad };
    if (unk.length) return { state: 'unknown', reasons: unk };
    return { state: 'match', reasons: [] };
  }
  return { enabled, auto, lookup, judge };
}
module.exports = { create, refKey };
