'use strict';
/* ===== እምነት፦ የተረጋገጠ ባጅ ✅ · የሙያተኛ/አሰሪ ግምገማ ⭐ · ሪፖርት 🚩 =====
   • ባጅ፦ ባለቤቱ ይጠይቃል (ማስረጃ ፎቶ ሊያያይዝ ይችላል) → አድሚን ያጸድቃል/ይሰርዛል። ባጅ በሱቅ፣ ሙያተኛ፣ አሰሪ እና ገጽ ላይ ይታያል።
   • ግምገማ፦ እውነተኛ ግንኙነት ሲኖር ብቻ — አሰሪ ለተቀጠረ/በዝርዝር ለገባ ሙያተኛ፣ ሙያተኛ ለተቀጠረበት/በዝርዝር ለገባበት አሰሪ። አንድ ሰው አንድ ጊዜ።
   • ሪፖርት፦ ማንኛውም የገባ ሰው ሱቅ፣ ዕቃ፣ ሙያተኛ፣ አሰሪ፣ ሥራ ወይም ገጽ ሊያመለክት ይችላል → አድሚን ይመለከታል (መደበቅ/ማገድ/መሰረዝ)። */
module.exports = function trust(ctx) {
  const { app, col, limit, who, saveMany, bad, S, adminOnly, nid, userInfo, notifyUser, notifyAdmin } = ctx;
  const tell = (u, t) => { try { notifyUser && notifyUser(u, t); } catch (e) { } }, tellA = t => { try { notifyAdmin && notifyAdmin(t); } catch (e) { } };
  const R = { rv: 'tr/reviews', rp: 'tr/reports', rq: 'tr/requests' };
  const TGT = { s: ['mk/shops', 'ሱቅ'], w: ['pp/workers', 'ሙያተኛ'], e: ['pp/employers', 'አሰሪ'], g: ['pg/pages', 'ገጽ'] };                 // ባጅ ሊያገኙ የሚችሉ
  const REP = { s: ['mk/shops', 'ሱቅ', 'suspended'], p: ['mk/products', 'ዕቃ', 'hidden'], w: ['pp/workers', 'ሙያተኛ', 'suspended'], e: ['pp/employers', 'አሰሪ', 'suspended'], j: ['pp/jobs', 'ሥራ', 'suspended'], g: ['pg/pages', 'ገጽ', 'suspended'] };
  const REASONS = ['ማጭበርበር ወይም አጠራጣሪ', 'የተሳሳተ መረጃ', 'ተገቢ ያልሆነ ይዘት', 'የሌላ ሰው ንብረት/ስም መጠቀም', 'ሌላ'];
  const nameOf = (t, x) => (x && (x.name || x.title)) || '';

  /* ---------- ግምገማ ---------- */
  const reviewsOf = (t, id) => Object.values(col(R.rv)).filter(r => r.t === t && r.targetId === id);
  const summary = (t, id) => { const L = reviewsOf(t, id); return { avg: L.length ? Math.round(L.reduce((a, r) => a + r.rating, 0) / L.length * 10) / 10 : 0, n: L.length }; };
  const related = (t, target, uid) => Object.values(col('pp/apps')).some(a => (t === 'w' ? a.employerUid === uid && a.workerUid === target.uid : a.workerUid === uid && a.employerUid === target.uid) && !a.invite && ['hired', 'shortlisted'].includes(a.status));
  app.get('/api/trust/reviews/:t/:id', (req, res) => {
    const t = req.params.t; if (!['w', 'e'].includes(t)) return bad(res, 404, 'not_found'); const x = col(TGT[t][0])[req.params.id]; if (!x || x.status !== 'active') return bad(res, 404, 'not_found');
    const items = reviewsOf(t, x.id).sort((a, b) => b.ts - a.ts).slice(0, 20).map(r => ({ rating: r.rating, text: r.text, ts: r.ts, who: (userInfo(r.authorUid).name || 'ተጠቃሚ').split(' ')[0] }));
    res.json({ ok: true, ...summary(t, x.id), items });
  });
  app.post('/api/trust/reviews/:t/:id', async (req, res) => {
    const u = who(req, res); if (!u || u.admin) return u && bad(res, 403, 'admin_cannot'); const t = req.params.t; if (!['w', 'e'].includes(t)) return bad(res, 404, 'not_found');
    if (!limit('rv' + u.uid, 20, 3600e3)) return bad(res, 429, 'slow_down');
    const x = col(TGT[t][0])[req.params.id]; if (!x || x.status !== 'active') return bad(res, 404, 'not_found'); if (x.uid === u.uid) return bad(res, 400, 'own_profile');
    const rating = Math.round(Number(req.body.rating)); if (!(rating >= 1 && rating <= 5)) return bad(res, 400, 'bad_rating');
    if (!related(t, x, u.uid)) return bad(res, 403, 'review_not_eligible');
    if (reviewsOf(t, x.id).some(r => r.authorUid === u.uid)) return bad(res, 409, 'already_reviewed');
    const r = { id: nid(), t, targetId: x.id, authorUid: u.uid, rating, text: S(req.body.text, 400), ts: Date.now() };
    col(R.rv)[r.id] = r; try { await saveMany([[R.rv, r.id]]); tell(x.uid, `⭐ አዲስ ግምገማ (${rating}/5)${r.text ? '፦ ' + S(r.text, 100) : ''}`); res.json({ ok: true, ...summary(t, x.id) }); } catch (e) { bad(res, 503, 'storage'); }
  });

  /* ---------- ባጅ ጥያቄ (ባለቤት) ---------- */
  const ownTargets = uid => Object.entries(TGT).flatMap(([t, [p, label]]) => Object.values(col(p)).filter(x => x.uid === uid && x.status !== 'suspended').map(x => ({ t, id: x.id, name: nameOf(t, x) || label, label, verified: !!x.verified })));
  app.get('/api/trust/my', (req, res) => {
    const u = who(req, res); if (!u) return;
    res.json({ ok: true, targets: ownTargets(u.uid), requests: Object.values(col(R.rq)).filter(q => q.uid === u.uid).sort((a, b) => b.ts - a.ts).slice(0, 10).map(q => ({ id: q.id, t: q.t, targetId: q.targetId, status: q.status, note: q.adminNote || '', ts: q.ts })) });
  });
  app.post('/api/trust/request', async (req, res) => {
    const u = who(req, res); if (!u || u.admin) return u && bad(res, 403, 'admin_cannot'); if (!limit('vq' + u.uid, 6, 3600e3)) return bad(res, 429, 'slow_down');
    const t = S(req.body.t, 1), id = S(req.body.id, 24), x = TGT[t] && col(TGT[t][0])[id]; if (!x || x.uid !== u.uid) return bad(res, 404, 'not_found'); if (x.verified) return bad(res, 409, 'already_verified');
    if (Object.values(col(R.rq)).some(q => q.uid === u.uid && q.targetId === id && q.status === 'pending')) return bad(res, 409, 'request_pending');
    const proof = (Array.isArray(req.body.proof) ? req.body.proof : []).slice(0, 4).map(i => S(i, 24)).filter(i => col('_img')[i]);
    if (!proof.length) return bad(res, 400, 'proof_required');
    const q = { id: nid(), uid: u.uid, t, targetId: id, name: nameOf(t, x), note: S(req.body.note, 300), proof, status: 'pending', ts: Date.now() };
    col(R.rq)[q.id] = q; try { await saveMany([[R.rq, q.id]]); tellA(`✅ የባጅ ጥያቄ፦ ${TGT[t][1]} «${q.name}» (${userInfo(u.uid).email || ''}) — በአድሚን ገጽ «🛡 እምነት» ይመልከቱ።`); res.json({ ok: true }); } catch (e) { bad(res, 503, 'storage'); }
  });

  /* ---------- ሪፖርት ---------- */
  app.get('/api/trust/reasons', (req, res) => res.json({ ok: true, reasons: REASONS }));
  app.post('/api/trust/report', async (req, res) => {
    const u = who(req, res); if (!u || u.admin) return u && bad(res, 403, 'admin_cannot'); if (!limit('rp' + u.uid, 10, 3600e3)) return bad(res, 429, 'slow_down');
    const t = S(req.body.t, 1), id = S(req.body.id, 24), def = REP[t], x = def && col(def[0])[id]; if (!x) return bad(res, 404, 'not_found');
    const reason = REASONS.includes(req.body.reason) ? req.body.reason : 'ሌላ';
    if (Object.values(col(R.rp)).some(r => r.reporterUid === u.uid && r.targetId === id && r.status === 'open')) return bad(res, 409, 'already_reported');
    if (Object.values(col(R.rp)).length >= 5000) return bad(res, 400, 'too_many');
    const r = { id: nid(), reporterUid: u.uid, t, targetId: id, name: nameOf(t, x), reason, note: S(req.body.note, 400), status: 'open', ts: Date.now() };
    col(R.rp)[r.id] = r; try { await saveMany([[R.rp, r.id]]); tellA(`🚩 ሪፖርት፦ ${def[1]} «${r.name}» — ${reason}${r.note ? '\n' + S(r.note, 150) : ''}`); res.json({ ok: true }); } catch (e) { bad(res, 503, 'storage'); }
  });

  /* ---------- አድሚን ---------- */
  app.get('/api/trust/admin/overview', (req, res) => {
    if (!adminOnly(req, res)) return;
    const reqs = Object.values(col(R.rq)).sort((a, b) => b.ts - a.ts).slice(0, 80).map(q => ({ ...q, owner: userInfo(q.uid), label: TGT[q.t][1] }));
    const reps = Object.values(col(R.rp)).sort((a, b) => b.ts - a.ts).slice(0, 120).map(r => ({ ...r, label: REP[r.t][1], reporter: userInfo(r.reporterUid), count: Object.values(col(R.rp)).filter(x => x.targetId === r.targetId && x.status === 'open').length }));
    res.json({ ok: true, requests: reqs, reports: reps });
  });
  async function setBadge(t, id, on) { const x = TGT[t] && col(TGT[t][0])[id]; if (!x) return false; if (on) x.verified = { ts: Date.now() }; else delete x.verified; await saveMany([[TGT[t][0], id]]); return x; }
  app.post('/api/trust/admin/verify', async (req, res) => {        // በቀጥታ ባጅ ስጥ/ውሰድ
    if (!adminOnly(req, res)) return; const t = S(req.body.t, 1), id = S(req.body.id, 24); try { const x = await setBadge(t, id, !!req.body.on); if (!x) return bad(res, 404, 'not_found'); res.json({ ok: true }); } catch (e) { bad(res, 503, 'storage'); }
  });
  app.post('/api/trust/admin/request/:id', async (req, res) => {
    if (!adminOnly(req, res)) return; const q = col(R.rq)[req.params.id]; if (!q) return bad(res, 404, 'not_found');
    const ok = !!req.body.approve; q.status = ok ? 'approved' : 'rejected'; q.adminNote = S(req.body.note, 200);
    try { if (ok) { const x = await setBadge(q.t, q.targetId, true); if (!x) return bad(res, 404, 'not_found'); } await saveMany([[R.rq, q.id]]); tell(q.uid, ok ? `✅ «${q.name}» የተረጋገጠ ባጅ አግኝቷል! 🎉` : `❌ የባጅ ጥያቄዎ ለ«${q.name}» አልተቀበለም።${q.adminNote ? ' ምክንያት፦ ' + q.adminNote : ''} ተጨማሪ ማስረጃ ጨምረው እንደገና ይጠይቁ።`); res.json({ ok: true }); } catch (e) { bad(res, 503, 'storage'); }
  });
  app.post('/api/trust/admin/report/:id', async (req, res) => {    // action፦ dismiss | resolve | hide (ዒላማውን መደበቅ/ማገድ)
    if (!adminOnly(req, res)) return; const r = col(R.rp)[req.params.id]; if (!r) return bad(res, 404, 'not_found'); const act = S(req.body.action, 10); if (!['dismiss', 'resolve', 'hide'].includes(act)) return bad(res, 400, 'bad_action');
    const ch = [[R.rp]]; r.status = act === 'dismiss' ? 'dismissed' : 'resolved'; r.adminNote = S(req.body.note, 200);
    const same = Object.values(col(R.rp)).filter(x => x.targetId === r.targetId && x.t === r.t && x.status === 'open'); same.forEach(x => { x.status = r.status; });
    try {
      if (act === 'hide') { const def = REP[r.t], x = col(def[0])[r.targetId]; if (x) { x.status = def[2]; ch.push([def[0], x.id]); x.uid && tell(x.uid, `⛔ «${r.name}» በሪፖርት ምክንያት ተደብቋል። ለማብራሪያ አድሚኑን ያነጋግሩ።`); } }
      await saveMany([...new Set([...same, r])].map(x => [R.rp, x.id]).concat(ch.slice(1))); res.json({ ok: true });
    } catch (e) { bad(res, 503, 'storage'); }
  });
  ctx.trustSummary = summary;
};
