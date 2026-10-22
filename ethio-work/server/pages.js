'use strict';
/* ===== የራስ ገጽ (Google Form + የግል ድረ-ገጽ) =====
   ማንኛውም የተመዘገበ ሰው — ሠራተኛ፣ አሰሪ፣ ሱቅ፣ ሆቴል፣ ትምህርት ቤት፣ ክሊኒክ… — እንደፈለገው ገጽ ይሠራል፦
   • ክፍሎችን (ስለ እኔ፣ ስለ ሥራዬ፣ ክፍያ፣ አድራሻ…) እና በውስጣቸው ጥያቄ/መስኮችን ራሱ ይቀርጻል (Google Form እንደሚሠራ)
   • መስኮቹን ራሱ ይሞላል → ገጹ እንደ ራሱ ድረ-ገጽ ይታያል
   • የጎብኝ ቅጽ (ቀጠሮ፣ ክፍል ማስያዝ፣ ማመልከቻ፣ ጥያቄ) ይሠራል → መልሶች ለባለቤቱ ይደርሳሉ + Telegram ማሳወቂያ
   • «ለአድሚን ብቻ» ምልክት የተደረገበት መስክ (ክፍያ መንገድ፣ መታወቂያ…) ለህዝብ ፈጽሞ አይታይም */
module.exports = function pages(ctx) {
  const { app, col, limit, who, saveMany, bad, S, adminOnly, nid, userInfo, notifyUser, notifyAdmin } = ctx;
  const tell = (uid, t) => { try { notifyUser && notifyUser(uid, t); } catch (e) { } };
  const P = { pg: 'pg/pages', rs: 'pg/responses' };
  const TYPES = ['text', 'long', 'number', 'phone', 'link', 'date', 'choice', 'multi', 'yesno', 'image'];
  const THEMES = ['green', 'ocean', 'sunset', 'royal', 'rose', 'night', 'gold'];
  const LIM = { sections: 14, fields: 30, total: 150, options: 24, formFields: 25, pages: 10 };
  const imgsOk = (arr, n) => (Array.isArray(arr) ? arr : []).slice(0, n).map(x => S(x, 24)).filter(x => col('_img')[x]);
  const phoneOk = p => { let d = String(p || '').replace(/[^\d+]/g, '').replace(/^\+/, ''); if (d.startsWith('251')) d = d.slice(3); if (d.startsWith('0')) d = d.slice(1); return /^[79]\d{8}$/.test(d) ? '0' + d : ''; };
  const isDate = v => /^\d{4}-\d{2}-\d{2}$/.test(v);
  function fixLink(v) {                       // http(s) ወይም @telegram ብቻ — javascript: ወዘተ ፈጽሞ አይፈቀድም
    v = S(v, 200); if (!v) return '';
    if (/^https?:\/\//i.test(v)) return v;
    if (/^@[\w]{4,32}$/.test(v)) return 'https://t.me/' + v.slice(1);
    if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(v)) return 'https://' + v;
    return '';
  }
  function cleanValue(f, v) {                 // በመስኩ ዓይነት መሠረት እሴቱን ያጸዳል
    switch (f.type) {
      case 'long': return S(v, 3000);
      case 'number': { const n = Number(String(v).replace(/,/g, '')); return String(v).trim() === '' || !Number.isFinite(n) ? '' : String(Math.abs(n) > 1e12 ? '' : n); }
      case 'phone': return phoneOk(v) || S(v, 20).replace(/[^\d+\s()-]/g, '');
      case 'link': return fixLink(v);
      case 'date': return isDate(S(v, 10)) ? S(v, 10) : '';
      case 'choice': return f.options.includes(S(v, 80)) ? S(v, 80) : '';
      case 'multi': return (Array.isArray(v) ? v : []).map(x => S(x, 80)).filter(x => f.options.includes(x)).slice(0, LIM.options);
      case 'yesno': return v === 'yes' || v === true ? 'yes' : v === 'no' || v === false ? 'no' : '';
      case 'image': return imgsOk(v, 6);
      default: return S(v, 400);
    }
  }
  const cleanField = (x, withValue) => {
    x = x || {}; const type = TYPES.includes(x.type) ? x.type : 'text';
    const f = { id: S(x.id, 24) || nid(), label: S(x.label, 90), type, hint: S(x.hint, 160), required: !!x.required, options: [] };
    if (type === 'choice' || type === 'multi') f.options = [...new Set((Array.isArray(x.options) ? x.options : String(x.options || '').split('\n')).map(o => S(o, 80)).filter(Boolean))].slice(0, LIM.options);
    if (withValue) { f.priv = !!x.priv; f.value = cleanValue(f, x.value); }
    return f;
  };
  function cleanSections(arr) {
    let total = 0;
    return (Array.isArray(arr) ? arr : []).slice(0, LIM.sections).map(s => ({
      id: S(s && s.id, 24) || nid(), title: S(s && s.title, 80), icon: S(s && s.icon, 8) || '📌',
      fields: (Array.isArray(s && s.fields) ? s.fields : []).slice(0, LIM.fields).map(f => cleanField(f, true)).filter(f => f.label && total++ < LIM.total),
    })).filter(s => s.title);
  }
  function cleanForm(b) {
    b = b || {};
    return { enabled: !!b.enabled, title: S(b.title, 80) || 'ቅጽ ይሙሉ', intro: S(b.intro, 300), button: S(b.button, 30) || 'ላክ', fields: (Array.isArray(b.fields) ? b.fields : []).slice(0, LIM.formFields).map(f => cleanField(f, false)).filter(f => f.label) };
  }
  // ለህዝብ፦ «ለአድሚን ብቻ» መስኮች ይወገዳሉ፤ ባዶ ክፍሎች አይታዩም
  const pubSections = pg => pg.sections.map(s => ({ ...s, fields: s.fields.filter(f => !f.priv && !(Array.isArray(f.value) ? !f.value.length : f.value === '')) })).filter(s => s.fields.length);
  const card = pg => ({ id: pg.id, kind: pg.kind, title: pg.title, tagline: pg.tagline, logo: pg.logo, cover: pg.cover, theme: pg.theme, region: pg.region, city: pg.city, ts: pg.ts, sections: pg.sections.length });
  const pub = pg => ({ ...card(pg), about: pg.about, gallery: pg.gallery, phone: pg.showPhone ? pg.phone : '', sections: pubSections(pg), form: pg.form && pg.form.enabled && pg.form.fields.length ? { title: pg.form.title, intro: pg.form.intro, button: pg.form.button, fields: pg.form.fields } : null });
  const mineList = uid => Object.values(col(P.pg)).filter(p => p.uid === uid);

  /* ---------- ህዝባዊ ---------- */
  app.get('/api/pages', (req, res) => {
    const q = S(req.query.q, 60).toLowerCase(), kind = S(req.query.kind, 40), reg = S(req.query.region, 40), page = Math.max(1, parseInt(req.query.page) || 1);
    const L = Object.values(col(P.pg)).filter(p => p.status === 'active' && (!kind || p.kind === kind) && (!reg || p.region === reg) && (!q || (p.title + ' ' + p.tagline + ' ' + p.kind + ' ' + p.city).toLowerCase().includes(q))).sort((a, b) => b.ts - a.ts);
    res.json({ ok: true, total: L.length, page, items: L.slice((page - 1) * 24, page * 24).map(card), kinds: [...new Set(Object.values(col(P.pg)).filter(p => p.status === 'active').map(p => p.kind))].slice(0, 40) });
  });

  /* ---------- የእኔ ገጾች (ባለቤት) — ከ :id በፊት መመዝገብ አለበት ---------- */
  app.get('/api/pages/my/list', (req, res) => {
    const u = who(req, res); if (!u) return;
    res.json({ ok: true, items: mineList(u.uid).sort((a, b) => b.ts - a.ts).map(p => ({ ...card(p), status: p.status, responses: Object.values(col(P.rs)).filter(r => r.pageId === p.id).length, unseen: Object.values(col(P.rs)).filter(r => r.pageId === p.id && !r.seen).length })) });
  });
  app.get('/api/pages/my/:id', (req, res) => {
    const u = who(req, res); if (!u) return; const p = col(P.pg)[req.params.id]; if (!p || p.uid !== u.uid) return bad(res, 404, 'not_found');
    res.json({ ok: true, page: p });
  });
  app.post('/api/pages', async (req, res) => {
    const u = who(req, res); if (!u || u.admin) return u && bad(res, 403, 'admin_cannot'); const b = req.body || {};
    if (!limit('pgw' + u.uid, 120, 3600e3)) return bad(res, 429, 'slow_down');
    const title = S(b.title, 80), kind = S(b.kind, 40) || 'ሌላ'; if (title.length < 2) return bad(res, 400, 'missing_fields');
    let p = b.id && col(P.pg)[b.id]; if (p && p.uid !== u.uid) return bad(res, 403, 'not_yours');
    if (!p) { if (mineList(u.uid).length >= LIM.pages) return bad(res, 400, 'too_many'); p = { id: nid(), uid: u.uid, ts: Date.now(), status: 'active' }; }
    const sections = cleanSections(b.sections);
    Object.assign(p, { kind, title, tagline: S(b.tagline, 140), about: S(b.about, 1500), theme: THEMES.includes(b.theme) ? b.theme : 'green', logo: imgsOk([b.logo], 1)[0] || '', cover: imgsOk([b.cover], 1)[0] || '', gallery: imgsOk(b.gallery, 8), region: S(b.region, 40), city: S(b.city, 60), phone: phoneOk(b.phone) || '', showPhone: !!b.showPhone, sections, form: cleanForm(b.form), upd: Date.now() });
    if (p.status !== 'suspended') p.status = b.visible === false ? 'hidden' : 'active';
    col(P.pg)[p.id] = p; try { await saveMany([[P.pg, p.id]]); res.json({ ok: true, id: p.id, status: p.status }); } catch (e) { bad(res, 503, 'storage'); }
  });
  app.delete('/api/pages/:id', async (req, res) => {
    const u = who(req, res); if (!u) return; const p = col(P.pg)[req.params.id]; if (!p || (p.uid !== u.uid && !u.admin)) return bad(res, 404, 'not_found');
    delete col(P.pg)[p.id]; const rs = Object.values(col(P.rs)).filter(r => r.pageId === p.id); rs.forEach(r => delete col(P.rs)[r.id]);
    try {
      if (ctx.pool) { await ctx.pool.query('DELETE FROM kv WHERE path=$1 AND id=$2', [P.pg, p.id]); for (const r of rs) await ctx.pool.query('DELETE FROM kv WHERE path=$1 AND id=$2', [P.rs, r.id]); } else ctx.persist();
      ctx.bump(P.pg); ctx.bump(P.rs); res.json({ ok: true });
    } catch (e) { bad(res, 503, 'storage'); }
  });

  /* ---------- የጎብኝ ቅጽ መልሶች ---------- */
  app.post('/api/pages/:id/respond', async (req, res) => {
    const u = who(req, res); if (!u || u.admin) return u && bad(res, 403, 'admin_cannot'); if (!limit('rs' + u.uid, 20, 3600e3)) return bad(res, 429, 'slow_down');
    const p = col(P.pg)[req.params.id]; if (!p || p.status !== 'active' || !p.form || !p.form.enabled) return bad(res, 404, 'not_found'); if (p.uid === u.uid) return bad(res, 400, 'own_page');
    if (Object.values(col(P.rs)).filter(r => r.pageId === p.id).length >= 2000) return bad(res, 400, 'too_many');
    const ans = req.body.answers || {}, out = {};
    for (const f of p.form.fields) {
      const v = cleanValue(f, ans[f.id]), empty = Array.isArray(v) ? !v.length : v === '';
      if (f.required && empty) return bad(res, 400, 'required_missing:' + f.label); if (!empty) out[f.id] = v;
    }
    if (!Object.keys(out).length) return bad(res, 400, 'missing_fields');
    const r = { id: nid(), pageId: p.id, ownerUid: p.uid, fromUid: u.uid, answers: out, ts: Date.now(), seen: false };
    col(P.rs)[r.id] = r; try { await saveMany([[P.rs, r.id]]); const me = userInfo(u.uid); tell(p.uid, `📨 አዲስ መልስ በ«${p.title}» ገጽዎ ላይ ከ${me.name || me.email || 'ተጠቃሚ'}${me.phone ? ' (' + me.phone + ')' : ''}።\nበድረ-ገጹ ላይ «ገጾቼ → መልሶች» ይመልከቱ።`); res.json({ ok: true }); } catch (e) { bad(res, 503, 'storage'); }
  });
  app.get('/api/pages/my/:id/responses', async (req, res) => {
    const u = who(req, res); if (!u) return; const p = col(P.pg)[req.params.id]; if (!p || p.uid !== u.uid) return bad(res, 404, 'not_found');
    const L = Object.values(col(P.rs)).filter(r => r.pageId === p.id).sort((a, b) => b.ts - a.ts).slice(0, 300);
    const items = L.map(r => ({ id: r.id, ts: r.ts, seen: r.seen, from: userInfo(r.fromUid), answers: r.answers }));
    const fresh = L.filter(r => !r.seen); fresh.forEach(r => { r.seen = true; });
    if (fresh.length) { try { await saveMany(fresh.map(r => [P.rs, r.id])); } catch (e) { } }
    res.json({ ok: true, fields: p.form.fields, items });
  });

  /* ---------- አድሚን ---------- */
  app.get('/api/pages/admin/list', (req, res) => {
    if (!adminOnly(req, res)) return;
    res.json({ ok: true, items: Object.values(col(P.pg)).sort((a, b) => b.ts - a.ts).slice(0, 100).map(p => ({ id: p.id, title: p.title, kind: p.kind, status: p.status, city: p.city, owner: userInfo(p.uid) })) });
  });
  app.get('/api/pages/admin/:id', (req, res) => {     // አድሚን «ለአድሚን ብቻ» መስኮችንም ጨምሮ ሁሉንም ያያል
    if (!adminOnly(req, res)) return; const p = col(P.pg)[req.params.id]; if (!p) return bad(res, 404, 'not_found');
    res.json({ ok: true, page: p, owner: userInfo(p.uid) });
  });
  app.post('/api/pages/admin/:id/status', async (req, res) => {
    if (!adminOnly(req, res)) return; const p = col(P.pg)[req.params.id]; if (!p) return bad(res, 404, 'not_found');
    if (!['active', 'hidden', 'suspended'].includes(req.body.status)) return bad(res, 400, 'bad_status');
    p.status = req.body.status; try { await saveMany([[P.pg, p.id]]); if (p.status === 'suspended') tell(p.uid, `⛔ ገጽዎ «${p.title}» በአድሚን ታግዷል። ለማብራሪያ አድሚኑን ያነጋግሩ።`); res.json({ ok: true }); } catch (e) { bad(res, 503, 'storage'); }
  });

  // ከ /my እና /admin በኋላ — ህዝባዊ ገጽ
  app.get('/api/pages/:id', (req, res) => {
    const p = col(P.pg)[req.params.id]; if (!p || p.status !== 'active') return bad(res, 404, 'not_found');
    res.json({ ok: true, page: pub(p) });
  });
};
