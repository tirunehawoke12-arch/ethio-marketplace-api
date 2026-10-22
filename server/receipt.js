'use strict';
/* ===== የክፍያ ደረሰኝ — በፊርማ የተጠበቀ ሊንክ (/r/<token>) =====
   • ክፍያ ሲረጋገጥ ለገዥ፣ ለሻጭ ክፍያ ሲፈጸም ለሻጭ፣ ተመላሽ ሲደረግ ለገዥ በ Telegram bot ይላካል።
   • ሊንኩ ለ90 ቀን ይሠራል፤ ?dl=1 ፋይል (HTML) ሆኖ ይወርዳል፤ «አትም / PDF አስቀምጥ» ቁልፍ አለው።
   • የትዕዛዝ መታወቂያውን እና ዓይነቱን በ HMAC ይፈርማል — ሊንክ መገመት ወይም መቀየር አይቻልም። */
const crypto = require('crypto');
const TTL = 90 * 864e5;
const KINDS = { payment: 'የክፍያ ደረሰኝ', payout: 'የሻጭ ክፍያ ደረሰኝ', refund: 'የተመላሽ ደረሰኝ' };

module.exports = function receipt({ app, col, secret, baseUrl }) {
  const key = crypto.createHash('sha256').update('receipt:' + secret).digest();   // ከመግቢያ ቶከን የተለየ ቁልፍ
  const mac = body => crypto.createHmac('sha256', key).update(body).digest('base64url');
  const esc = x => String(x == null ? '' : x).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = n => Number(n || 0).toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' ብር';
  const date = t => { try { return new Date(t).toLocaleString('en-GB', { timeZone: 'Africa/Addis_Ababa', dateStyle: 'medium', timeStyle: 'short' }) + ' (EAT)'; } catch (e) { return ''; } };

  const token = (orderId, kind) => { const body = Buffer.from(JSON.stringify({ o: orderId, k: kind, x: Date.now() + TTL })).toString('base64url'); return body + '.' + mac(body); };
  const url = (orderId, kind) => `${baseUrl}/r/${token(orderId, kind)}`;
  function read(t) {
    const [body, sig] = String(t || '').split('.'); if (!body || !sig) return null;
    const ok = mac(body); if (sig.length !== ok.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(ok))) return null;
    try { const p = JSON.parse(Buffer.from(body, 'base64url').toString()); return p.x > Date.now() && KINDS[p.k] ? p : null; } catch (e) { return null; }
  }
  // ለአንድ ትዕዛዝ ዛሬ የሚሰጡ ደረሰኞች (ዓይነት + ባለቤት)
  const PAID = ['paid', 'preparing', 'shipped', 'delivered', 'settled', 'disputed', 'refund_pending'];
  function available(o) {
    const out = [];
    if (o.payment && o.payment.verifiedAt && (PAID.includes(o.status) || o.status === 'refunded')) out.push('payment');
    if (o.status === 'settled' && o.settle && !o.settle.refund) out.push('payout');
    if (o.status === 'refunded' && o.settle && o.settle.refund) out.push('refund');
    return out;
  }
  const short = o => o.id.slice(0, 6).toUpperCase();
  const no = (o, k) => `ETM-${short(o)}-${{ payment: 'P', payout: 'S', refund: 'R' }[k]}`;

  function render(o, kind) {
    const s = col('mk/shops')[o.shopId] || {}, bu = col('data/users/' + o.buyerUid) || {}, buyer = { name: (bu.private && bu.private.fullName) || '', phone: bu.acct && bu.acct.phone, email: bu.acct && bu.acct.email };
    const rows = [], add = (a, b, strong) => rows.push(`<tr${strong ? ' class="t"' : ''}><td>${esc(a)}</td><td class="r">${esc(b)}</td></tr>`);
    let who = [], title = KINDS[kind], stamp = 'ተረጋግጧል', ref = '', when = 0;
    const items = o.items.map(i => `<tr><td>${esc(i.title)} × ${esc(i.qty)}</td><td class="r">${esc(money(i.price * i.qty))}</td></tr>`).join('');
    if (kind === 'payment') {
      who = [['ከፋይ', buyer.name || buyer.email || '—'], ['ስልክ', buyer.phone || '—'], ['ሱቅ', o.shopName]];
      add('ዕቃዎች ድምር', money(o.subtotal)); if (o.fee > 0) add('ማድረሻ', money(o.fee)); add('ጠቅላላ የተከፈለ', money(o.total), true);
      who.push(['የክፍያ ዘዴ', o.payment.method], ['የማጣቀሻ ቁጥር', o.payment.ref]); ref = o.payment.ref; when = o.payment.verifiedAt;
    } else if (kind === 'payout') {
      who = [['ተቀባይ ሱቅ', o.shopName], ['የክፍያ ዘዴ', s.payout ? s.payout.method + ' · ' + s.payout.account : '—'], ['ባለቤት', s.payout ? s.payout.holder : '—']];
      add('የዕቃዎች ድምር', money(o.subtotal)); add('የአገልግሎት ኮሚሽን', '− ' + money(o.commission)); if (o.fee > 0) add('ማድረሻ', money(o.fee)); add('ለሻጭ የተከፈለ', money(o.sellerNet), true);
      ref = o.settle.ref; when = o.settle.ts; stamp = 'ተከፍሏል';
    } else {
      who = [['ተመላሽ የተደረገለት', buyer.name || buyer.email || '—'], ['ሱቅ', o.shopName]];
      add('ተመላሽ የተደረገ', money(o.total), true); ref = o.settle.ref; when = o.settle.ts; stamp = 'ተመልሷል';
    }
    const html = `<!doctype html><html lang="am"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><title>${esc(title)} ${esc(no(o, kind))}</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#eef3ee;font-family:"Noto Sans Ethiopic","Abyssinica SIL",Nyala,Kefa,"Segoe UI",Roboto,system-ui,sans-serif;color:#14221a;padding:16px}
.sheet{max-width:560px;margin:0 auto;background:#fff;border-radius:22px;box-shadow:0 12px 40px rgba(10,42,28,.15);overflow:hidden}
.top{background:linear-gradient(135deg,#0a8a56,#0b6e8f);color:#fff;padding:22px 22px 18px}.top small{opacity:.85}.top h1{margin:.2em 0 0;font-size:22px}
.flag{height:5px;background:linear-gradient(90deg,#078930 33%,#fcdd09 33% 66%,#da121a 66%)}
.body{padding:20px 22px}.meta{display:flex;justify-content:space-between;gap:10px;font-size:13px;color:#5f6f65;flex-wrap:wrap}
.stamp{display:inline-block;margin:14px 0 4px;border:3px solid #0a8a56;color:#0a8a56;border-radius:12px;padding:4px 14px;font-weight:900;transform:rotate(-3deg);letter-spacing:.5px}
dl{margin:10px 0;display:grid;grid-template-columns:auto 1fr;gap:6px 14px;font-size:14px}dt{color:#5f6f65}dd{margin:0;font-weight:700;text-align:right;word-break:break-word}
table{width:100%;border-collapse:collapse;margin-top:8px;font-size:14px}td{padding:8px 0;border-bottom:1px dashed #d5ded7}td.r{text-align:right;font-weight:700;white-space:nowrap}tr.t td{border-bottom:0;border-top:2px solid #14221a;font-size:18px;font-weight:900;color:#0a8a56}
h2{font-size:13px;color:#5f6f65;margin:18px 0 0;text-transform:uppercase;letter-spacing:.6px}
.foot{padding:14px 22px 20px;font-size:12px;color:#5f6f65;border-top:1px solid #e3e9e4}
.act{max-width:560px;margin:14px auto 0;display:flex;gap:10px}.act a,.act button{flex:1;text-align:center;padding:13px;border-radius:16px;border:0;background:#0a8a56;color:#fff;font:inherit;font-weight:800;text-decoration:none;cursor:pointer}.act .g{background:#fff;color:#0a8a56;border:1.5px solid #0a8a56}
@media print{body{background:#fff;padding:0}.sheet{box-shadow:none}.act{display:none}}
</style></head><body><div class="sheet"><div class="flag"></div><div class="top"><small>🇪🇹 ኢትዮ ዲጂታል ማርኬት</small><h1>🧾 ${esc(title)}</h1></div>
<div class="body"><div class="meta"><span>ቁጥር፦ <b>${esc(no(o, kind))}</b></span><span>${esc(date(when))}</span></div><div class="stamp">✔ ${esc(stamp)}</div>
<dl>${who.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('')}<dt>ትዕዛዝ</dt><dd>#${esc(short(o))}</dd>${kind === 'payout' || kind === 'refund' ? `<dt>የግብይት ማጣቀሻ</dt><dd>${esc(ref)}</dd>` : ''}</dl>
<h2>ዝርዝር</h2><table>${items}${rows.join('')}</table></div>
<div class="foot">ይህ ደረሰኝ በኮምፒዩተር የተሰጠ ነው። ትክክለኛነቱን ለማረጋገጥ ከዚህ ሊንክ ብቻ ያውርዱ፤ ሊንኩን ለሌላ ሰው አያጋሩ — የግል መረጃ ይዟል።<br>${esc(baseUrl.replace(/^https?:\/\//, ''))}</div></div>
<div class="act"><button onclick="window.print()">🖨 አትም / PDF አስቀምጥ</button><a class="g" href="?dl=1">⬇️ አውርድ</a></div></body></html>`;
    return { html, name: `${no(o, kind)}.html` };
  }

  app.get('/r/:token', (req, res) => {
    const p = read(req.params.token), o = p && col('mk/orders')[p.o];
    if (!o || !available(o).includes(p.k)) return res.status(404).type('text').send('ደረሰኙ አልተገኘም ወይም ጊዜው አልፏል።');
    const { html, name } = render(o, p.k);
    res.set({ 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; base-uri 'none'; form-action 'none'" });
    if (req.query.dl) res.set('Content-Disposition', `attachment; filename="${name}"`);
    res.send(html);
  });
  return { url, available, KINDS, no };
};
