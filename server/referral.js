'use strict';
/* ===== ሪፈራል — «ጓደኛ ጋብዝ» =====
   • እያንዳንዱ ተጠቃሚ የግል ኮድ እና አገናኝ (`/?ref=ኮድ`) አለው
   • አዲስ ተጠቃሚ (ከተመዘገበ 7 ቀን ውስጥ) አንዴ ኮድ ይቀበላል፤ ራስን መጋበዝ ክልክል
   • ሽልማት በአድሚን ይወሰናል (ነባሪ 0 = ምንም ወጪ የለም፤ ቆጠራ ብቻ)። ሲቀናበር ሁለቱም የግል ኩፖን (አንድ ጊዜ፣ ዝቅተኛ ግዢ፣ 30 ቀን) ያገኛሉ
   • በአንድ ጋባዥ ቢበዛ 10 ሽልማት */
module.exports = function referral(ctx) {
  const { app, col, limit, who, saveMany, bad, S, N, adminOnly, userInfo, notifyUser, coupons, baseUrl = '', getStore, now = () => Date.now() } = ctx;
  const CODES = 'rf/codes', CFG = 'rf/cfg', MAXREW = 10, WINDOW = 7 * 864e5, AB = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const cfg = () => { const c = col(CFG).d || {}; return { reward: Math.max(0, Math.min(1000, N(c.reward))), minMult: Math.max(1, N(c.minMult) || 5) }; };
  const acct = uid => (col('data/users/' + uid) || {}).acct;
  const mine = uid => col(CODES)[uid];
  async function ensure(uid) {
    let r = mine(uid); if (r) return r; let code; do { code = Array.from({ length: 6 }, () => AB[Math.floor(Math.random() * AB.length)]).join(''); } while (Object.values(col(CODES)).some(x => x.code === code));
    r = col(CODES)[uid] = { id: uid, code, count: 0, rewarded: 0, ts: now() }; await saveMany([[CODES, uid]]); return r;
  }
  const byCode = c => Object.values(col(CODES)).find(x => x.code === String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, ''));

  app.get('/api/referral/me', async (req, res) => {
    const u = who(req, res); if (!u || u.admin) return u && bad(res, 403, 'admin_cannot'); const r = await ensure(u.uid), c = cfg();
    const gifts = Object.values(col('mk/coupons')).filter(x => x.forUid === u.uid && x.status === 'active').map(x => coupons.view(x));
    res.json({ ok: true, code: r.code, link: baseUrl + '/?ref=' + r.code, count: r.count, reward: c.reward, claimed: !!(col('rf/claims')[u.uid]), gifts });
  });
  app.post('/api/referral/claim', async (req, res) => {
    const u = who(req, res); if (!u || u.admin) return u && bad(res, 403, 'admin_cannot'); if (!limit('rfc' + u.uid, 10, 3600e3)) return bad(res, 429, 'slow_down');
    if (col('rf/claims')[u.uid]) return bad(res, 409, 'already_claimed'); const a = acct(u.uid); if (!a || now() - (a.ts || 0) > WINDOW) return bad(res, 400, 'too_late');
    const inv = byCode(req.body.code); if (!inv) return bad(res, 404, 'bad_code'); if (inv.id === u.uid) return bad(res, 400, 'own_code');
    const c = cfg(); col('rf/claims')[u.uid] = { id: u.uid, by: inv.id, ts: now() }; inv.count++; const ch = [['rf/claims', u.uid], [CODES, inv.id]];
    try { await saveMany(ch);
      let gift = null; if (c.reward > 0) { gift = await coupons.issue({ forUid: u.uid, value: c.reward, minSubtotal: c.reward * c.minMult, days: 30, prefix: 'WELCOME' });
        if (inv.rewarded < MAXREW) { inv.rewarded++; await saveMany([[CODES, inv.id]]); const g2 = await coupons.issue({ forUid: inv.id, value: c.reward, minSubtotal: c.reward * c.minMult, days: 30, prefix: 'THANKS' }); notifyUser && notifyUser(inv.id, `🎁 ጓደኛዎ ተቀላቅሏል! የ${c.reward} ብር ኩፖን፦ ${g2.code} (ከ${g2.minSubtotal} ብር ግዢ በላይ፣ እስከ ${g2.expires})`); } }
      res.json({ ok: true, gift: gift ? { code: gift.code, value: gift.value, min: gift.minSubtotal, expires: gift.expires } : null });
    } catch (e) { bad(res, 503, 'storage'); }
  });
  app.get('/api/admin/referral', (req, res) => {
    if (!adminOnly(req, res)) return; const top = Object.values(col(CODES)).filter(x => x.count > 0).sort((a, b) => b.count - a.count).slice(0, 20).map(x => ({ id: x.id, count: x.count, rewarded: x.rewarded, user: userInfo(x.id) }));
    res.json({ ok: true, cfg: cfg(), total: Object.keys(col('rf/claims')).length, top });
  });
  app.post('/api/admin/referral', async (req, res) => {
    if (!adminOnly(req, res)) return; col(CFG).d = { id: 'd', reward: Math.max(0, Math.min(1000, N(req.body.reward))), minMult: Math.max(1, Math.min(50, N(req.body.minMult) || 5)) };
    try { await saveMany([[CFG, 'd']]); res.json({ ok: true, cfg: cfg() }); } catch (e) { bad(res, 503, 'storage'); }
  });
  return {};
};
