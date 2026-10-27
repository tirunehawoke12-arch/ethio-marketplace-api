'use strict';
const AM = require('./amnorm');
/* ===== ሠራተኛ ገጽ፣ አሰሪ ገጽ፣ የሥራ ማስታወቂያ፣ ማመልከቻ እና ቅጥር =====
   ሠራተኛ ገጽ ይከፍታል → አሰሪ ገጽ ይከፍታል → ሥራ ያስታውቃል → ሠራተኛ ያመለክታል
   → አሰሪ ይመርጣል (ዝርዝር ውስጥ ያስገባል / ይቀጥራል / ውድቅ ያደርጋል) → ሁሉም በ Telegram ይነገራል */
module.exports = function people(ctx) {
  const { app, col, limit, who, saveMany, bad, S, N, phoneET, adminOnly, nid, userInfo, notifyUser, notifyAdmin } = ctx;
  const tell = (uid, t) => { try { notifyUser && notifyUser(uid, t); } catch (e) { } };
  const WC = ['ግንባታ', 'ጥገና እና ቴክኒክ', 'ትምህርት', 'ጤና', 'ቢሮ እና አስተዳደር', 'ሹፌር እና ትራንስፖርት', 'ምግብ ማብሰል', 'ጽዳት', 'ደህንነት', 'ቴክኖሎጂ', 'ሽያጭ እና ግብይት', 'ግብርና', 'ሌላ'];
  const JT = ['ሙሉ ጊዜ', 'ትርፍ ጊዜ', 'ኮንትራት', 'ጊዜያዊ', 'ልምምድ'], PER = ['ሰዓት', 'ቀን', 'ወር', 'ሥራ'];
  const P = { w: 'pp/workers', e: 'pp/employers', j: 'pp/jobs', a: 'pp/apps' };
  const mine = (p, uid) => Object.values(col(p)).find(x => x.uid === uid);
  const imgsOk = (arr, n) => (Array.isArray(arr) ? arr : []).slice(0, n).map(x => S(x, 24)).filter(x => col('_img')[x]);
  const list = (a, n, m) => (Array.isArray(a) ? a : String(a || '').split(/[,،\n]/)).map(x => S(x, m)).filter(Boolean).slice(0, n);
  const rt = (t, id) => { const L = Object.values(col('tr/reviews')).filter(r => r.t === t && r.targetId === id); return { avg: L.length ? Math.round(L.reduce((a, r) => a + r.rating, 0) / L.length * 10) / 10 : 0, n: L.length }; };
  const pubW = w => ({ verified: !!w.verified, rating: rt('w', w.id), id: w.id, name: w.name, title: w.title, category: w.category, skills: w.skills, exp: w.exp, education: w.education, about: w.about, region: w.region, city: w.city, rate: w.rate, availability: w.availability, photo: w.photo, gallery: w.gallery, languages: w.languages, phone: w.showPhone ? w.phone : '', ts: w.ts });
  const pubE = e => ({ verified: !!e.verified, rating: rt('e', e.id), id: e.id, name: e.name, sector: e.sector, about: e.about, region: e.region, city: e.city, address: e.address, logo: e.logo, size: e.size, links: e.links, phone: e.showPhone ? e.phone : '', ts: e.ts });
  const open = j => { const e = col(P.e)[j.employerId]; return j.status === 'open' && e && e.status === 'active' && (!j.deadline || j.deadline >= new Date().toISOString().slice(0, 10)); };
  const pubJ = j => { const e = col(P.e)[j.employerId]; return { id: j.id, title: j.title, category: j.category, type: j.type, description: j.description, requirements: j.requirements, salary: j.salary, openings: j.openings, region: j.region, city: j.city, deadline: j.deadline, ts: j.ts, employer: e ? { id: e.id, name: e.name, logo: e.logo, sector: e.sector } : null, applicants: Object.values(col(P.a)).filter(a => a.jobId === j.id && !a.invite).length }; };

  app.get('/api/people/config', (req, res) => res.json({ ok: true, workCats: WC, jobTypes: JT, per: PER }));

  /* ---------- ሠራተኛ ገጽ ---------- */
  app.post('/api/people/worker', async (req, res) => {
    const u = who(req, res); if (!u || u.admin) return u && bad(res, 403, 'admin_cannot'); const b = req.body || {};
    const name = S(b.name, 60), title = S(b.title, 60), phone = phoneET(b.phone || u.acct.phone);
    if (name.length < 3 || title.length < 2 || !WC.includes(b.category) || !S(b.region, 40) || !S(b.city, 60) || !phone) return bad(res, 400, 'missing_fields');
    let w = mine(P.w, u.uid); const isNew = !w; if (isNew) w = { id: nid(), uid: u.uid, ts: Date.now(), status: 'active' };
    const per = PER.includes(b.rate && b.rate.per) ? b.rate.per : 'ቀን';
    Object.assign(w, { name, title, category: b.category, skills: list(b.skills, 15, 30), exp: Math.max(0, Math.min(60, parseInt(b.exp) || 0)), education: S(b.education, 120), about: S(b.about, 800), region: S(b.region, 40), city: S(b.city, 60), phone, showPhone: !!b.showPhone, rate: { amount: Math.max(0, N(b.rate && b.rate.amount) || 0), per }, availability: b.availability === 'busy' ? 'busy' : 'available', languages: list(b.languages, 6, 20), photo: imgsOk([b.photo], 1)[0] || '', gallery: imgsOk(b.gallery, 6), upd: Date.now() });
    if (w.status !== 'suspended') w.status = b.visible === false ? 'hidden' : 'active';
    col(P.w)[w.id] = w; try { await saveMany([[P.w, w.id]]); res.json({ ok: true, id: w.id, status: w.status }); } catch (e) { bad(res, 503, 'storage'); }
  });
  app.get('/api/people/workers', (req, res) => {
    const q = S(req.query.q, 60).toLowerCase(), cat = S(req.query.cat, 40), reg = S(req.query.region, 40), av = S(req.query.av, 12), page = Math.max(1, parseInt(req.query.page) || 1);
    const L = Object.values(col(P.w)).filter(w => w.status === 'active' && (!q || AM.hit(w.name + ' ' + w.title + ' ' + (w.skills || []).join(' ') + ' ' + w.about, q)) && (!cat || w.category === cat) && (!reg || w.region === reg) && (!av || w.availability === av)).sort((a, b) => b.ts - a.ts);
    res.json({ ok: true, total: L.length, page, items: L.slice((page - 1) * 24, page * 24).map(pubW) });
  });
  app.get('/api/people/worker/:id', (req, res) => { const w = col(P.w)[req.params.id]; if (!w || w.status !== 'active') return bad(res, 404, 'not_found'); res.json({ ok: true, worker: pubW(w) }); });

  /* ---------- አሰሪ ገጽ ---------- */
  app.post('/api/people/employer', async (req, res) => {
    const u = who(req, res); if (!u || u.admin) return u && bad(res, 403, 'admin_cannot'); const b = req.body || {};
    const name = S(b.name, 80), phone = phoneET(b.phone || u.acct.phone);
    if (name.length < 3 || !S(b.sector, 60) || !S(b.region, 40) || !S(b.city, 60) || !phone) return bad(res, 400, 'missing_fields');
    let e = mine(P.e, u.uid); if (!e) e = { id: nid(), uid: u.uid, ts: Date.now(), status: 'active' };
    const L = b.links || {};
    Object.assign(e, { name, sector: S(b.sector, 60), about: S(b.about, 800), region: S(b.region, 40), city: S(b.city, 60), address: S(b.address, 160), phone, showPhone: !!b.showPhone, size: S(b.size, 20), logo: imgsOk([b.logo], 1)[0] || '', links: { telegram: S(L.telegram, 80), website: S(L.website, 120), facebook: S(L.facebook, 120) }, license: S(b.license, 40), upd: Date.now() });
    col(P.e)[e.id] = e; try { await saveMany([[P.e, e.id]]); res.json({ ok: true, id: e.id }); } catch (x) { bad(res, 503, 'storage'); }
  });
  app.get('/api/people/employers', (req, res) => {
    const q = S(req.query.q, 60).toLowerCase(), reg = S(req.query.region, 40), page = Math.max(1, parseInt(req.query.page) || 1);
    const L = Object.values(col(P.e)).filter(e => e.status === 'active' && (!q || AM.hit(e.name + ' ' + e.sector + ' ' + e.about, q)) && (!reg || e.region === reg)).sort((a, b) => b.ts - a.ts);
    res.json({ ok: true, total: L.length, page, items: L.slice((page - 1) * 24, page * 24).map(pubE) });
  });
  app.get('/api/people/employer/:id', (req, res) => { const e = col(P.e)[req.params.id]; if (!e || e.status !== 'active') return bad(res, 404, 'not_found'); res.json({ ok: true, employer: pubE(e), jobs: Object.values(col(P.j)).filter(j => j.employerId === e.id && open(j)).map(pubJ) }); });
  app.get('/api/people/my', (req, res) => {
    const u = who(req, res); if (!u) return; const w = mine(P.w, u.uid), e = mine(P.e, u.uid);
    const jobs = e ? Object.values(col(P.j)).filter(j => j.employerId === e.id).sort((a, b) => b.ts - a.ts).map(j => ({ ...pubJ(j), status: j.status })) : [];
    const apps = Object.values(col(P.a)).filter(a => a.workerUid === u.uid && !a.invite).length;
    res.json({ ok: true, worker: w ? { ...pubW(w), phone: w.phone, showPhone: !!w.showPhone, status: w.status } : null, employer: e ? { ...pubE(e), phone: e.phone, showPhone: !!e.showPhone, license: e.license, status: e.status } : null, jobs, applications: apps });
  });

  /* ---------- ሥራ ማስታወቂያ ---------- */
  app.post('/api/people/job', async (req, res) => {
    const u = who(req, res); if (!u) return; const e = mine(P.e, u.uid); if (!e) return bad(res, 400, 'open_employer_first'); if (e.status !== 'active') return bad(res, 403, 'employer_suspended'); const b = req.body || {};
    const title = S(b.title, 80), desc = S(b.description, 2000);
    if (title.length < 3 || desc.length < 10 || !WC.includes(b.category) || !JT.includes(b.type) || !S(b.region, 40) || !S(b.city, 60)) return bad(res, 400, 'missing_fields');
    let j = b.id && col(P.j)[b.id]; if (j && j.employerId !== e.id) return bad(res, 403, 'not_yours');
    if (!j) { if (Object.values(col(P.j)).filter(x => x.employerId === e.id).length >= 50) return bad(res, 400, 'too_many'); j = { id: nid(), employerId: e.id, uid: u.uid, ts: Date.now() }; }
    const sal = b.salary || {}; const dl = /^\d{4}-\d{2}-\d{2}$/.test(S(b.deadline, 10)) ? S(b.deadline, 10) : '';
    Object.assign(j, { title, category: b.category, type: b.type, description: desc, requirements: S(b.requirements, 1200), salary: { min: Math.max(0, N(sal.min) || 0), max: Math.max(0, N(sal.max) || 0), per: PER.includes(sal.per) ? sal.per : 'ወር', negotiable: !!sal.negotiable }, openings: Math.max(1, Math.min(999, parseInt(b.openings) || 1)), region: S(b.region, 40), city: S(b.city, 60), deadline: dl, status: b.status === 'closed' ? 'closed' : (j.status === 'suspended' ? 'suspended' : 'open'), upd: Date.now() });
    col(P.j)[j.id] = j; try { await saveMany([[P.j, j.id]]); res.json({ ok: true, id: j.id }); } catch (x) { bad(res, 503, 'storage'); }
  });
  app.delete('/api/people/job/:id', async (req, res) => {
    const u = who(req, res); if (!u) return; const j = col(P.j)[req.params.id]; if (!j || j.uid !== u.uid) return bad(res, 404, 'not_found');
    j.status = 'closed'; j.deleted = true; try { await saveMany([[P.j, j.id]]); res.json({ ok: true }); } catch (x) { bad(res, 503, 'storage'); }
  });
  app.get('/api/people/jobs', (req, res) => {
    const q = S(req.query.q, 60).toLowerCase(), cat = S(req.query.cat, 40), reg = S(req.query.region, 40), type = S(req.query.type, 20), page = Math.max(1, parseInt(req.query.page) || 1);
    const L = Object.values(col(P.j)).filter(j => !j.deleted && open(j) && (!q || AM.hit(j.title + ' ' + j.description + ' ' + (col(P.e)[j.employerId] || {}).name, q)) && (!cat || j.category === cat) && (!reg || j.region === reg) && (!type || j.type === type)).sort((a, b) => b.ts - a.ts);
    res.json({ ok: true, total: L.length, page, items: L.slice((page - 1) * 24, page * 24).map(pubJ) });
  });
  app.get('/api/people/job/:id', (req, res) => { const j = col(P.j)[req.params.id]; if (!j || j.deleted || !open(j)) return bad(res, 404, 'not_found'); res.json({ ok: true, job: pubJ(j), employer: pubE(col(P.e)[j.employerId]) }); });

  /* ---------- ማመልከቻ እና ቅጥር ---------- */
  app.post('/api/people/job/:id/apply', async (req, res) => {
    const u = who(req, res); if (!u || u.admin) return u && bad(res, 403, 'admin_cannot'); if (!limit('ap' + u.uid, 30, 3600e3)) return bad(res, 429, 'slow_down');
    const w = mine(P.w, u.uid); if (!w || w.status !== 'active') return bad(res, 400, 'open_worker_first');
    const j = col(P.j)[req.params.id]; if (!j || j.deleted || !open(j)) return bad(res, 404, 'not_found'); if (j.uid === u.uid) return bad(res, 400, 'own_job');
    if (Object.values(col(P.a)).some(a => a.jobId === j.id && a.workerUid === u.uid && !a.invite && a.status !== 'withdrawn')) return bad(res, 409, 'already_applied');
    const a = { id: nid(), jobId: j.id, employerId: j.employerId, employerUid: j.uid, workerUid: u.uid, workerId: w.id, message: S(req.body.message, 600), status: 'applied', history: [{ s: 'applied', ts: Date.now() }], ts: Date.now() };
    col(P.a)[a.id] = a; try { await saveMany([[P.a, a.id]]); tell(j.uid, `📨 አዲስ አመልካች ለ«${j.title}»፦ ${w.name} (${w.title})። ዝርዝሩን በድረ-ገጹ ይመልከቱ።`); tell(u.uid, `✅ ማመልከቻዎ ለ«${j.title}» ተልኳል።`); res.json({ ok: true }); } catch (x) { bad(res, 503, 'storage'); }
  });
  app.get('/api/people/my/applicants', (req, res) => {
    const u = who(req, res); if (!u) return; const jid = S(req.query.jobId, 24);
    const L = Object.values(col(P.a)).filter(a => a.employerUid === u.uid && !a.invite && (!jid || a.jobId === jid)).sort((a, b) => b.ts - a.ts).map(a => { const w = col(P.w)[a.workerId], j = col(P.j)[a.jobId]; return { id: a.id, jobId: a.jobId, jobTitle: j && j.title, status: a.status, message: a.message, ts: a.ts, worker: w ? { ...pubW(w), phone: w.phone } : null }; });
    res.json({ ok: true, items: L });
  });
  app.get('/api/people/my/applications', (req, res) => {
    const u = who(req, res); if (!u) return;
    const L = Object.values(col(P.a)).filter(a => a.workerUid === u.uid).sort((a, b) => b.ts - a.ts).map(a => { const j = col(P.j)[a.jobId], e = col(P.e)[a.employerId]; return { id: a.id, invite: !!a.invite, status: a.status, message: a.message, ts: a.ts, job: j ? { id: j.id, title: j.title } : null, employer: e ? { id: e.id, name: e.name, phone: a.invite || a.status === 'hired' || a.status === 'shortlisted' ? e.phone : '' } : null }; });
    res.json({ ok: true, items: L });
  });
  const AST = { shortlisted: 'በዝርዝር ውስጥ ገብተዋል', hired: 'ተቀጥረዋል 🎉', rejected: 'በዚህ ጊዜ አልተመረጡም' };
  app.post('/api/people/app/:id/status', async (req, res) => {
    const u = who(req, res); if (!u) return; const a = col(P.a)[req.params.id]; if (!a || a.invite) return bad(res, 404, 'not_found'); const s = req.body.status;
    if (s === 'withdrawn') { if (a.workerUid !== u.uid) return bad(res, 403, 'not_allowed'); }
    else { if (a.employerUid !== u.uid) return bad(res, 403, 'not_allowed'); if (!AST[s]) return bad(res, 400, 'bad_status'); }
    if (a.status === 'withdrawn') return bad(res, 409, 'withdrawn'); a.status = s; a.history.push({ s, ts: Date.now() });
    try { await saveMany([[P.a, a.id]]); const j = col(P.j)[a.jobId]; if (AST[s]) tell(a.workerUid, `💼 ለ«${j ? j.title : ''}» ማመልከቻዎ፦ ${AST[s]}${s === 'hired' || s === 'shortlisted' ? '። አሰሪውን በድረ-ገጹ ማነጋገር ይችላሉ።' : '።'}`); res.json({ ok: true, status: s }); } catch (x) { bad(res, 503, 'storage'); }
  });
  app.post('/api/people/worker/:id/hire-request', async (req, res) => {
    const u = who(req, res); if (!u || u.admin) return u && bad(res, 403, 'admin_cannot'); if (!limit('hr' + u.uid, 15, 3600e3)) return bad(res, 429, 'slow_down');
    const e = mine(P.e, u.uid); if (!e) return bad(res, 400, 'open_employer_first'); const w = col(P.w)[req.params.id]; if (!w || w.status !== 'active') return bad(res, 404, 'not_found'); if (w.uid === u.uid) return bad(res, 400, 'own_profile');
    const msg = S(req.body.message, 400); if (msg.length < 5) return bad(res, 400, 'message_required');
    const a = { id: nid(), invite: true, employerId: e.id, employerUid: u.uid, workerUid: w.uid, workerId: w.id, jobId: S(req.body.jobId, 24), message: msg, status: 'invited', history: [{ s: 'invited', ts: Date.now() }], ts: Date.now() };
    col(P.a)[a.id] = a; try { await saveMany([[P.a, a.id]]); tell(w.uid, `🤝 የቅጥር ጥያቄ ከ«${e.name}»፦ ${msg}\n📞 ${e.phone}`); res.json({ ok: true }); } catch (x) { bad(res, 503, 'storage'); }
  });

  /* ---------- አድሚን ---------- */
  app.get('/api/people/admin/overview', (req, res) => {
    if (!adminOnly(req, res)) return; const W = Object.values(col(P.w)), E = Object.values(col(P.e)), J = Object.values(col(P.j)).filter(j => !j.deleted), A = Object.values(col(P.a));
    res.json({ ok: true, counts: { workers: W.length, employers: E.length, jobs: J.length, openJobs: J.filter(open).length, applications: A.filter(a => !a.invite).length, hired: A.filter(a => a.status === 'hired').length },
      workers: W.sort((a, b) => b.ts - a.ts).slice(0, 60).map(w => ({ id: w.id, name: w.name, title: w.title, status: w.status, owner: userInfo(w.uid) })), employers: E.sort((a, b) => b.ts - a.ts).slice(0, 60).map(e => ({ id: e.id, name: e.name, sector: e.sector, status: e.status, license: e.license, owner: userInfo(e.uid) })),
      jobs: J.sort((a, b) => b.ts - a.ts).slice(0, 60).map(j => ({ id: j.id, title: j.title, status: j.status, employer: (col(P.e)[j.employerId] || {}).name })) });
  });
  app.post('/api/people/admin/:t/:id/status', async (req, res) => {
    if (!adminOnly(req, res)) return; const p = P[req.params.t]; if (!p || req.params.t === 'a') return bad(res, 404, 'not_found'); const x = col(p)[req.params.id]; if (!x) return bad(res, 404, 'not_found');
    const ok = req.params.t === 'j' ? ['open', 'closed', 'suspended'] : ['active', 'hidden', 'suspended']; if (!ok.includes(req.body.status)) return bad(res, 400, 'bad_status');
    x.status = req.body.status; try { await saveMany([[p, x.id]]); if (x.status === 'suspended') tell(x.uid, '⛔ ገጽዎ በአድሚን ታግዷል። ለማብራሪያ አድሚኑን ያነጋግሩ።'); res.json({ ok: true }); } catch (e) { bad(res, 503, 'storage'); }
  });
};
