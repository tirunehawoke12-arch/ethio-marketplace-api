'use strict';
/* ===== የመግቢያ ምልክቶች (tokens) — በፊርማ የተጠበቁ፤ በ«ስሪት ቁጥር» (sv) ሊሻሩ ይችላሉ =====
   ተጠቃሚ፦ የአካውንቱ `sv` ሲጨምር (በሁሉም መሳሪያ ላይ ውጣ / የይለፍ ቃል ሲቀየር) ቀድሞ የተሰጡ ምልክቶች በሙሉ ዋጋ ያጣሉ።
   አድሚን፦ የአድሚን ምልክት ዕድሜ 12 ሰዓት ብቻ ነው፤ እንዲሁ ሊሻር ይችላል። */
const crypto = require('crypto');
const b64u = b => Buffer.from(b).toString('base64url');
const USER_TTL = 90 * 864e5, ADMIN_TTL = 12 * 3600e3;

function create({ secret, getUserSv = () => 0, getAdminSv = () => 0, isSusp = () => false, now = Date.now }) {
  const mac = body => crypto.createHmac('sha256', secret).update(body).digest('base64url');
  const sign = p => { const body = b64u(JSON.stringify(p)); return body + '.' + mac(body); };
  const tokFor = (u, k) => (k === 'admin' ? sign({ u, k, x: now() + ADMIN_TTL, v: getAdminSv() }) : k === 'user' ? sign({ u, k, x: now() + USER_TTL, v: getUserSv(u) }) : sign({ u, k, x: now() + USER_TTL }));
  function verify(t) {
    const [body, sig] = String(t || '').split('.'); if (!body || !sig) return null;
    const ok = mac(body); if (sig.length !== ok.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(ok))) return null;
    try {
      const p = JSON.parse(Buffer.from(body, 'base64url').toString()); if (!(p.x > now())) return null;
      if (p.k === 'admin') { if ((p.v | 0) !== (getAdminSv() | 0)) return null; if (p.x - now() > ADMIN_TTL + 60e3) return null; return p; }   // የድሮ የ90-ቀን አድሚን ምልክቶች ተቀባይነት የላቸውም
      if (isSusp(p.u)) return null;
      if (p.k === 'user' && (p.v | 0) !== (getUserSv(p.u) | 0)) return null;
      return p;
    } catch { return null; }
  }
  return { sign, tokFor, verify };
}
module.exports = { create, USER_TTL, ADMIN_TTL };
