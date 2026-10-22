'use strict';
/* ===== ኢትዮ ዲጂታል ማርኬት — ደረጃ በደረጃ የሚሄድ ገበያ (ሁሉም ህጎች በሰርቨር ይጠበቃሉ) =====
   ሱቅ ክፈት → አጽድቅ → ዕቃ ዘርዝር → ደንበኛ እዘዝ → ክፈል (escrow) → አድሚን አረጋግጥ
   → ሻጭ አዘጋጅ → ላክ → ደንበኛ ተቀበል → አድሚን ለሻጭ ክፈል → ግምገማ                       */
const crypto = require('crypto');
module.exports = function market(ctx) {
  const { app, col, bump, pool, pgUpsert, persist, readTok, limit } = ctx;
  const rc = ctx.receipts, tell = (uid, t, btn) => { try { ctx.notifyUser && ctx.notifyUser(uid, t, btn); } catch (e) { } }, rbtn = (o, k) => (rc ? { url: rc.url(o.id, k), label: '🧾 ደረሰኝ አውርድ' } : undefined), tellAdmin = t => { try { ctx.notifyAdmin && ctx.notifyAdmin(t); } catch (e) { } };
  const short = o => '#' + o.id.slice(0, 6), money = n => Number(n).toLocaleString('en-US') + ' ብር';
  const COMM = Number(process.env.COMMISSION_PCT) || 5;
  const CATS = ['ምግብ እና መጠጥ', 'ልብስ እና ጫማ', 'ኤሌክትሮኒክስ', 'ሞባይል እና መለዋወጫ', 'የቤት ዕቃ', 'ግንባታ እና ሃርድዌር', 'ግብርና', 'ውበት እና ጤና', 'መጻሕፍት እና ትምህርት', 'ሆቴል እና ማረፊያ', 'ሙያተኛ አገልግሎት', 'አገልግሎት', 'ሌላ'];
  const KINDS = ['ሱቅ', 'ነጋዴ (ግለሰብ)', 'ሆቴል እና ማረፊያ', 'አገልግሎት ሰጪ', 'አምራች / ገበሬ'];
  const P = { shops: 'mk/shops', products: 'mk/products', orders: 'mk/orders', reviews: 'mk/reviews', img: '_img', cfg: 'mk/config' };
  const nid = () => crypto.randomBytes(9).toString('hex');
  const bad = (res, c, e) => res.status(c).json({ ok: false, error: e });
  const S = (x, n) => String(x == null ? '' : x).trim().slice(0, n);
  const N = x => { const v = Number(x); return Number.isFinite(v) ? v : NaN; };
  const phoneET = p => { let d = String(p || '').replace(/[^\d+]/g, '').replace(/^\+/, ''); if (d.startsWith('251')) d = d.slice(3); if (d.startsWith('0')) d = d.slice(1); return /^[79]\d{8}$/.test(d) ? '0' + d : null; };
  const ip = req => req.ip || req.socket.remoteAddress || '?';

  async function saveMany(list) {
    if (pool) await Promise.all(list.map(([p, id]) => pgUpsert(p, id, col(p)[id])));
    else persist();
    [...new Set(list.map(x => x[0]))].forEach(bump);
  }
  function who(req, res) {                                     // የገባ እና የተመዘገበ ተጠቃሚ ብቻ
    const t = readTok(req); if (!t) { bad(res, 401, 'login_required'); return null; }
    if (t.k === 'admin') return { uid: 'admin', admin: true };
    const d = col('data/users/' + t.u); if (!d.acct) { bad(res, 403, 'not_registered'); return null; }
    return { uid: t.u, admin: false, acct: d.acct };
  }
  const adminOnly = (req, res) => { const t = readTok(req); if (!t || t.k !== 'admin') { bad(res, 403, 'admin_only'); return false; } return true; };
  const shopOf = uid => Object.values(col(P.shops)).find(s => s.uid === uid);
  // ገዥዎች የሚከፍሉባቸው ነባሪ አካውንቶች (አድሚን በቅንብር ካልቀየረ ለሁሉም የተመዘገበ ተጠቃሚ በራስ-ሰር ይታያል)
  const DEFAULT_ACCOUNTS = process.env.DEFAULT_PAY_ACCOUNTS
    ? process.env.DEFAULT_PAY_ACCOUNTS.split(';').map(x => x.split('|').map(s => s.trim())).filter(x => x[0] && x[1]).map(x => ({ method: x[0], number: x[1], holder: x[2] || '' }))
    : [{ method: 'telebirr', number: '0946705941', holder: 'TIRUNEH AWOKE CHANIE' }, { method: 'ንግድ ባንክ (CBE)', number: '1000594431379', holder: 'TIRUNEH AWOKE CHANIE' }];
  const cfg = () => { const c = col(P.cfg).main || {}; return { commissionPct: c.commissionPct == null ? COMM : c.commissionPct, accounts: c.accounts && c.accounts.length ? c.accounts : DEFAULT_ACCOUNTS, note: c.note || '' }; };
  const rate = shopId => { const rs = Object.values(col(P.reviews)).filter(r => r.shopId === shopId); return { avg: rs.length ? Math.round(rs.reduce((a, r) => a + r.rating, 0) / rs.length * 10) / 10 : 0, n: rs.length }; };
  const pubShop = s => { const r = rate(s.id); return { id: s.id, kind: s.kind || KINDS[0], gallery: s.gallery || [], links: s.links || {}, year: s.year || '', tags: s.tags || [], name: s.name, about: s.about, category: s.category, region: s.region, city: s.city, address: s.address, hours: s.hours, phone: s.showPhone ? s.phone : '', logo: s.logo, cover: s.cover, delivery: s.delivery, rating: r.avg, reviews: r.n, ts: s.ts }; };
  const pubProd = (p, s) => ({ id: p.id, title: p.title, desc: p.desc, price: p.price, unit: p.unit, stock: p.stock, category: p.category, imgs: p.imgs, ts: p.ts, shop: { id: s.id, name: s.name, city: s.city, region: s.region, logo: s.logo, rating: rate(s.id).avg } });
  const live = () => { const sh = col(P.shops); return Object.values(col(P.products)).filter(p => p.status === 'active' && sh[p.shopId] && sh[p.shopId].status === 'active').map(p => [p, sh[p.shopId]]); };
  const push = (o, s, by, note) => { o.status = s; (o.history = o.history || []).push({ s, ts: Date.now(), by, note: note || '' }); };
  const restock = o => o.items.forEach(i => { const p = col(P.products)[i.pid]; if (p) p.stock += i.qty; });
  async function expire() {                                    // ያልተከፈለ ትዕዛዝ ከ24 ሰዓት በኋላ ይሰረዛል
    const now = Date.now(), ch = [];
    Object.values(col(P.orders)).forEach(o => { if (o.status === 'placed' && now - o.ts > 24 * 3600e3) { restock(o); push(o, 'cancelled', 'system', 'ክፍያ በ24 ሰዓት አልደረሰም'); ch.push([P.orders, o.id]); o.items.forEach(i => col(P.products)[i.pid] && ch.push([P.products, i.pid])); } });
    if (ch.length) await saveMany(ch);
  }
  const userInfo = uid => { const d = col('data/users/' + uid); return { name: (d.private && d.private.fullName) || '', email: d.acct && d.acct.email, phone: d.acct && d.acct.phone }; };
  const orderView = (o, role) => {                             // ማን ምን ያያል
    const base = { id: o.id, shopId: o.shopId, shopName: o.shopName, items: o.items, subtotal: o.subtotal, fee: o.fee, total: o.total, status: o.status, history: o.history, delivery: { type: o.delivery.type }, payment: o.payment ? { method: o.payment.method, ref: o.payment.ref, ts: o.payment.ts, note: o.payment.note, rejected: o.payment.rejected } : null, tracking: o.tracking || '', dispute: o.dispute || null, reviewed: !!o.reviewed, ts: o.ts };
    const paidUp = ['paid', 'preparing', 'shipped', 'delivered', 'settled', 'disputed', 'refund_pending'].includes(o.status);
    if (role === 'buyer') { const s = col(P.shops)[o.shopId]; base.delivery = o.delivery; base.shopPhone = s && s.phone; base.shopAddress = s && s.address; }
    if (role === 'seller') { base.commission = o.commission; base.sellerNet = o.sellerNet; if (paidUp) { base.delivery = o.delivery; base.buyer = { name: userInfo(o.buyerUid).name }; } }
    if (role === 'admin') { base.delivery = o.delivery; base.commission = o.commission; base.sellerNet = o.sellerNet; base.buyer = userInfo(o.buyerUid); const s = col(P.shops)[o.shopId]; base.payout = s && s.payout; base.settle = o.settle || null; }
    return base;
  };

  /* ---------- ህዝባዊ (ሳይገቡ ማየት ይቻላል) ---------- */
  app.get('/api/market/config', (req, res) => { const c = cfg(), t = readTok(req); res.json({ ok: true, cats: CATS, kinds: KINDS, commissionPct: c.commissionPct, accounts: t ? c.accounts : [], note: c.note }); });   // የክፍያ አካውንቶች ለገቡ ተጠቃሚዎች ብቻ
  app.get('/api/market/home', (req, res) => {
    const L = live(), cats = CATS.map(c => ({ c, n: L.filter(([p]) => p.category === c).length })).filter(x => x.n);
    res.json({ ok: true, cats, latest: L.sort((a, b) => b[0].ts - a[0].ts).slice(0, 12).map(([p, s]) => pubProd(p, s)), shops: Object.values(col(P.shops)).filter(s => s.status === 'active').sort((a, b) => b.ts - a.ts).slice(0, 8).map(pubShop), total: L.length });
  });
  app.get('/api/market/products', (req, res) => {
    const q = S(req.query.q, 60).toLowerCase(), cat = S(req.query.cat, 40), shop = S(req.query.shop, 40), reg = S(req.query.region, 40), min = N(req.query.min), max = N(req.query.max), sort = S(req.query.sort, 12), page = Math.max(1, parseInt(req.query.page) || 1);
    let L = live().filter(([p, s]) => (!q || (p.title + ' ' + p.desc + ' ' + s.name).toLowerCase().includes(q)) && (!cat || p.category === cat) && (!shop || s.id === shop) && (!reg || s.region === reg) && (isNaN(min) || p.price >= min) && (isNaN(max) || p.price <= max));
    L.sort(sort === 'price_asc' ? (a, b) => a[0].price - b[0].price : sort === 'price_desc' ? (a, b) => b[0].price - a[0].price : (a, b) => b[0].ts - a[0].ts);
    res.json({ ok: true, total: L.length, page, items: L.slice((page - 1) * 24, page * 24).map(([p, s]) => pubProd(p, s)) });
  });
  app.get('/api/market/shops', (req, res) => {
    const q = S(req.query.q, 60).toLowerCase(), kind = S(req.query.kind, 40), reg = S(req.query.region, 40);
    const L = Object.values(col(P.shops)).filter(s => s.status === 'active' && (!kind || (s.kind || KINDS[0]) === kind) && (!reg || s.region === reg) && (!q || (s.name + ' ' + s.about + ' ' + (s.tags || []).join(' ')).toLowerCase().includes(q))).sort((a, b) => b.ts - a.ts);
    res.json({ ok: true, total: L.length, items: L.slice(0, 48).map(pubShop) });
  });
  app.get('/api/market/product/:id', (req, res) => {
    const p = col(P.products)[req.params.id], s = p && col(P.shops)[p.shopId];
    if (!p || p.status !== 'active' || !s || s.status !== 'active') return bad(res, 404, 'not_found');
    const rv = Object.values(col(P.reviews)).filter(r => r.shopId === s.id).sort((a, b) => b.ts - a.ts).slice(0, 10).map(r => ({ rating: r.rating, text: r.text, ts: r.ts, who: (userInfo(r.buyerUid).name || 'ደንበኛ').split(' ')[0] }));
    res.json({ ok: true, product: pubProd(p, s), shop: pubShop(s), reviews: rv });
  });
  app.get('/api/market/shop/:id', (req, res) => {
    const s = col(P.shops)[req.params.id]; if (!s || s.status !== 'active') return bad(res, 404, 'not_found');
    res.json({ ok: true, shop: pubShop(s), products: live().filter(([, sh]) => sh.id === s.id).map(([p, sh]) => pubProd(p, sh)) });
  });
  app.get('/api/market/img/:id', (req, res) => {
    const i = col(P.img)[req.params.id]; if (!i) return res.sendStatus(404);
    res.set({ 'Content-Type': i.m, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' }).send(Buffer.from(i.d, 'base64'));
  });

  /* ---------- ሱቅ እና ዕቃዎች (ሻጭ) ---------- */
  app.post('/api/market/upload', async (req, res) => {
    const u = who(req, res); if (!u) return; if (!limit('up' + u.uid, 60, 3600e3)) return bad(res, 429, 'slow_down');
    const m = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(req.body.dataUrl || ''));
    if (!m || m[2].length > 380000) return bad(res, 400, 'bad_image');
    const b = Buffer.from(m[2], 'base64'), hex = b.slice(0, 12).toString('hex');
    const okSig = (m[1] === 'image/jpeg' && hex.startsWith('ffd8ff')) || (m[1] === 'image/png' && hex.startsWith('89504e47')) || (m[1] === 'image/webp' && b.slice(0, 4).toString() === 'RIFF' && b.slice(8, 12).toString() === 'WEBP');
    if (!okSig) return bad(res, 400, 'bad_image');
    const id = nid(); col(P.img)[id] = { m: m[1], d: m[2], u: u.uid, ts: Date.now() };
    try { await saveMany([[P.img, id]]); res.json({ ok: true, id }); } catch (e) { bad(res, 503, 'storage'); }
  });
  app.get('/api/market/my/shop', async (req, res) => {
    const u = who(req, res); if (!u) return; await expire();
    const s = shopOf(u.uid); if (!s) return res.json({ ok: true, shop: null });
    const prods = Object.values(col(P.products)).filter(p => p.shopId === s.id), ords = Object.values(col(P.orders)).filter(o => o.shopId === s.id);
    res.json({ ok: true, shop: { ...pubShop(s), phone: s.phone, showPhone: !!s.showPhone, payout: s.payout, license: s.license, status: s.status, note: s.note }, products: prods, stats: { products: prods.length, orders: ords.length, toDo: ords.filter(o => ['paid', 'preparing'].includes(o.status)).length, earned: ords.filter(o => o.status === 'settled').reduce((a, o) => a + o.sellerNet, 0) } });
  });
  app.post('/api/market/shop', async (req, res) => {
    const u = who(req, res); if (!u || u.admin) return u && bad(res, 403, 'admin_cannot'); const b = req.body || {};
    const name = S(b.name, 60), phone = phoneET(b.phone || u.acct.phone);
    if (name.length < 3 || !S(b.category, 40) || !S(b.region, 40) || !S(b.city, 60) || !S(b.address, 160) || !phone) return bad(res, 400, 'missing_fields');
    const pay = b.payout || {}; if (!S(pay.method, 20) || !S(pay.account, 40) || !S(pay.holder, 60)) return bad(res, 400, 'payout_required');
    let s = shopOf(u.uid); const isNew = !s;
    if (isNew) s = { id: nid(), uid: u.uid, ts: Date.now(), status: 'pending' };
    const L = b.links || {}; Object.assign(s, { kind: KINDS.includes(b.kind) ? b.kind : KINDS[0], gallery: (Array.isArray(b.gallery) ? b.gallery : []).slice(0, 8).map(x => S(x, 24)).filter(x => col(P.img)[x]), links: { telegram: S(L.telegram, 80), facebook: S(L.facebook, 120), tiktok: S(L.tiktok, 120), website: S(L.website, 120) }, year: S(b.year, 4), tags: (Array.isArray(b.tags) ? b.tags : String(b.tags || '').split(/[,،]/)).map(x => S(x, 24)).filter(Boolean).slice(0, 10), license: S(b.license, 40), name, about: S(b.about, 600), category: S(b.category, 40), region: S(b.region, 40), city: S(b.city, 60), address: S(b.address, 160), hours: S(b.hours, 80), phone, showPhone: !!b.showPhone, logo: S(b.logo, 24) || s.logo || '', cover: S(b.cover, 24) || s.cover || '', delivery: { pickup: b.delivery ? !!b.delivery.pickup : true, local: !!(b.delivery && b.delivery.local), fee: Math.max(0, Math.min(5000, N(b.delivery && b.delivery.fee) || 0)), areas: S(b.delivery && b.delivery.areas, 120) }, payout: { method: S(pay.method, 20), account: S(pay.account, 40), holder: S(pay.holder, 60) }, upd: Date.now() });
    if (!isNew && s.status === 'rejected') { s.status = 'pending'; s.note = ''; }
    col(P.shops)[s.id] = s;
    try { await saveMany([[P.shops, s.id]]); if (s.status === 'pending') tellAdmin(`🏪 አዲስ ሱቅ ለማጽደቅ፦ «${s.name}» (${s.city})`); res.json({ ok: true, id: s.id, status: s.status }); } catch (e) { bad(res, 503, 'storage'); }
  });
  app.post('/api/market/product', async (req, res) => {
    const u = who(req, res); if (!u) return; const s = shopOf(u.uid); if (!s) return bad(res, 400, 'open_shop_first'); const b = req.body || {};
    const price = N(b.price), stock = parseInt(b.stock), title = S(b.title, 80);
    if (title.length < 2 || !(price > 0) || price > 1e8 || !(stock >= 0) || stock > 100000 || !CATS.includes(b.category)) return bad(res, 400, 'bad_fields');
    let p = b.id && col(P.products)[b.id]; if (p && p.shopId !== s.id) return bad(res, 403, 'not_yours');
    if (!p) { if (Object.values(col(P.products)).filter(x => x.shopId === s.id).length >= 300) return bad(res, 400, 'too_many'); p = { id: nid(), shopId: s.id, ts: Date.now() }; }
    const imgs = (Array.isArray(b.imgs) ? b.imgs : []).slice(0, 4).map(x => S(x, 24)).filter(x => col(P.img)[x]);
    Object.assign(p, { title, desc: S(b.desc, 1200), price: Math.round(price * 100) / 100, unit: S(b.unit, 16) || 'አንድ', stock, category: b.category, imgs, status: b.status === 'hidden' ? 'hidden' : 'active', upd: Date.now() });
    col(P.products)[p.id] = p;
    try { await saveMany([[P.products, p.id]]); res.json({ ok: true, id: p.id }); } catch (e) { bad(res, 503, 'storage'); }
  });
  app.delete('/api/market/product/:id', async (req, res) => {
    const u = who(req, res); if (!u) return; const s = shopOf(u.uid), p = col(P.products)[req.params.id];
    if (!p || !s || p.shopId !== s.id) return bad(res, 404, 'not_found');
    delete col(P.products)[p.id]; try { if (pool) await pool.query('DELETE FROM kv WHERE path=$1 AND id=$2', [P.products, p.id]); else persist(); bump(P.products); res.json({ ok: true }); } catch (e) { bad(res, 503, 'storage'); }
  });

  /* ---------- ትዕዛዝ (ደረጃ በደረጃ) ---------- */
  app.post('/api/market/checkout', async (req, res) => {
    const u = who(req, res); if (!u || u.admin) return u && bad(res, 403, 'admin_cannot'); if (!limit('co' + u.uid, 20, 3600e3)) return bad(res, 429, 'slow_down');
    await expire(); const items = Array.isArray(req.body.items) ? req.body.items.slice(0, 40) : [], d = req.body.delivery || {};
    const type = d.type === 'delivery' ? 'delivery' : 'pickup', phone = phoneET(d.phone || u.acct.phone), address = S(d.address, 200);
    if (!items.length || !phone || (type === 'delivery' && address.length < 5)) return bad(res, 400, 'missing_fields');
    const mine = shopOf(u.uid), groups = {}, want = {};
    for (const it of items) { const p = col(P.products)[S(it.pid, 24)], q = parseInt(it.qty); if (!p || !(q >= 1 && q <= 99)) return bad(res, 400, 'bad_item'); want[p.id] = (want[p.id] || 0) + q; }
    for (const pid of Object.keys(want)) { const p = col(P.products)[pid], s = col(P.shops)[p.shopId];
      if (p.status !== 'active' || !s || s.status !== 'active') return bad(res, 400, 'unavailable:' + p.title);
      if (mine && s.id === mine.id) return bad(res, 400, 'own_product');
      if (p.stock < want[pid]) return bad(res, 400, 'out_of_stock:' + p.title);
      if (type === 'delivery' && !s.delivery.local) return bad(res, 400, 'no_delivery:' + s.name);
      if (type === 'pickup' && !s.delivery.pickup) return bad(res, 400, 'no_pickup:' + s.name);
      (groups[s.id] = groups[s.id] || []).push(p); }
    const pct = cfg().commissionPct, ch = [], ids = [];
    for (const sid of Object.keys(groups)) { const s = col(P.shops)[sid]; const its = groups[sid].map(p => ({ pid: p.id, title: p.title, price: p.price, qty: want[p.id], img: p.imgs[0] || '' }));
      const subtotal = Math.round(its.reduce((a, i) => a + i.price * i.qty, 0) * 100) / 100, fee = type === 'delivery' ? s.delivery.fee : 0, commission = Math.round(subtotal * pct) / 100;
      const o = { id: nid(), buyerUid: u.uid, shopId: sid, shopName: s.name, items: its, subtotal, fee, total: Math.round((subtotal + fee) * 100) / 100, commission, sellerNet: Math.round((subtotal - commission + fee) * 100) / 100, delivery: { type, address, phone, note: S(d.note, 200) }, history: [], ts: Date.now() };
      push(o, 'placed', 'buyer', ''); col(P.orders)[o.id] = o; ids.push(o.id); ch.push([P.orders, o.id]); groups[sid].forEach(p => { p.stock -= want[p.id]; ch.push([P.products, p.id]); }); }
    try { await saveMany(ch); ids.forEach(id => { const o = col(P.orders)[id], s = col(P.shops)[o.shopId]; tell(s.uid, `🛒 አዲስ ትዕዛዝ ${short(o)} — ${o.items.map(i => i.title + '×' + i.qty).join('፣ ')} (${money(o.total)})።\nገዥው ክፍያ እስኪፈጽም እና አድሚን እስኪያረጋግጥ ይጠብቁ።`); tell(u.uid, `✅ ትዕዛዝዎ ${short(o)} ተመዝግቧል (${money(o.total)})።\n💳 ክፍያ ይፈጽሙ እና የማጣቀሻ ቁጥር በድረ-ገጹ ያስገቡ።`); }); res.json({ ok: true, orders: ids }); } catch (e) { bad(res, 503, 'storage'); }
  });
  app.get('/api/market/my/orders', async (req, res) => { const u = who(req, res); if (!u) return; await expire(); res.json({ ok: true, orders: Object.values(col(P.orders)).filter(o => o.buyerUid === u.uid).sort((a, b) => b.ts - a.ts).map(o => orderView(o, 'buyer')) }); });
  app.get('/api/market/seller/orders', async (req, res) => { const u = who(req, res); if (!u) return; await expire(); const s = shopOf(u.uid); res.json({ ok: true, orders: s ? Object.values(col(P.orders)).filter(o => o.shopId === s.id).sort((a, b) => b.ts - a.ts).map(o => orderView(o, 'seller')) : [] }); });

  const T = { // ማን፣ ከየት ደረጃ፣ ወደ የት — የሁኔታ ማሽን
    pay: { role: 'buyer', from: ['placed'], to: 'payment_submitted' }, cancel: { role: 'buyer', from: ['placed'], to: 'cancelled', restock: 1 },
    accept: { role: 'seller', from: ['paid'], to: 'preparing' }, decline: { role: 'seller', from: ['paid'], to: 'refund_pending' },
    ship: { role: 'seller', from: ['preparing'], to: 'shipped' }, receive: { role: 'buyer', from: ['shipped'], to: 'delivered' },
    dispute: { role: 'buyer', from: ['shipped', 'delivered'], to: 'disputed' } };
  app.post('/api/market/order/:id/:act', async (req, res) => {
    const u = who(req, res); if (!u) return; const t = T[req.params.act], o = col(P.orders)[req.params.id]; if (!t || !o) return bad(res, 404, 'not_found');
    const s = col(P.shops)[o.shopId], isBuyer = o.buyerUid === u.uid, isSeller = s && s.uid === u.uid;
    if ((t.role === 'buyer' && !isBuyer) || (t.role === 'seller' && !isSeller)) return bad(res, 403, 'not_allowed');
    if (!t.from.includes(o.status)) return bad(res, 409, 'wrong_step:' + o.status);
    const b = req.body || {}, ch = [[P.orders, o.id]];
    if (req.params.act === 'pay') { const ref = S(b.ref, 40); if (!S(b.method, 20) || ref.length < 4) return bad(res, 400, 'payment_proof_required'); o.payment = { method: S(b.method, 20), ref, note: S(b.note, 200), ts: Date.now() }; }
    if (req.params.act === 'ship') o.tracking = S(b.note, 200);
    if (req.params.act === 'dispute') { if (S(b.reason, 400).length < 5) return bad(res, 400, 'reason_required'); o.dispute = { reason: S(b.reason, 400), ts: Date.now() }; }
    if (t.restock) { restock(o); o.items.forEach(i => col(P.products)[i.pid] && ch.push([P.products, i.pid])); }
    push(o, t.to, t.role, S(b.note, 200));
    try { await saveMany(ch); const a = req.params.act, sh = s; const N = { pay: () => tellAdmin(`💳 ክፍያ ለማረጋገጥ ${short(o)} — ${money(o.total)} · ${o.payment.method} · ማጣቀሻ ${o.payment.ref}`), cancel: () => tell(sh.uid, `✕ ትዕዛዝ ${short(o)} በገዥው ተሰርዟል።`), accept: () => tell(o.buyerUid, `📦 ሻጩ ትዕዛዝዎን ${short(o)} እያዘጋጀ ነው።`), decline: () => { tell(o.buyerUid, `↩️ ሻጩ ትዕዛዝዎን ${short(o)} መቀበል አልቻለም፤ ገንዘብዎ ይመለሳል።`); tellAdmin(`↩️ ተመላሽ ለማድረግ ${short(o)} — ${money(o.total)}`); }, ship: () => tell(o.buyerUid, `🚚 ትዕዛዝዎ ${short(o)} ተልኳል${o.tracking ? '፦ ' + o.tracking : ''}። ሲደርስ በድረ-ገጹ «ደረሰኝ» ይጫኑ።`), receive: () => { tell(sh.uid, `🤝 ገዥው ትዕዛዝ ${short(o)} ተቀብሏል — አድሚን ክፍያዎን በቅርቡ ይልካል (${money(o.sellerNet)})።`); tellAdmin(`💰 ለሻጭ ለመክፈል ${short(o)} — ${money(o.sellerNet)} → ${sh.payout.method} ${sh.payout.account}`); }, dispute: () => { tellAdmin(`⚖️ ክርክር ${short(o)}፦ ${o.dispute.reason}`); tell(sh.uid, `⚖️ ገዥው በትዕዛዝ ${short(o)} ላይ ክርክር ከፍቷል። አድሚን ይመለከተዋል።`); } }; N[a] && N[a](); res.json({ ok: true, status: o.status }); } catch (e) { bad(res, 503, 'storage'); }
  });
  app.post('/api/market/review', async (req, res) => {
    const u = who(req, res); if (!u) return; const o = col(P.orders)[S(req.body.orderId, 24)], r = parseInt(req.body.rating);
    if (!o || o.buyerUid !== u.uid) return bad(res, 404, 'not_found'); if (!['delivered', 'settled'].includes(o.status)) return bad(res, 409, 'not_delivered');
    if (o.reviewed) return bad(res, 409, 'already_reviewed'); if (!(r >= 1 && r <= 5)) return bad(res, 400, 'bad_rating');
    const id = nid(); col(P.reviews)[id] = { id, orderId: o.id, shopId: o.shopId, buyerUid: u.uid, rating: r, text: S(req.body.text, 400), ts: Date.now() }; o.reviewed = true;
    try { await saveMany([[P.reviews, id], [P.orders, o.id]]); const sh = col(P.shops)[o.shopId]; sh && tell(sh.uid, `⭐ አዲስ ግምገማ (${r}/5)${S(req.body.text, 100) ? '፦ ' + S(req.body.text, 100) : ''}`); res.json({ ok: true }); } catch (e) { bad(res, 503, 'storage'); }
  });

  // ለገዥ/ለሻጭ የሚገኙ ደረሰኞች (በድረ-ገጹ ላይ «ደረሰኝ አውርድ» ቁልፍ)
  app.get('/api/market/order/:id/receipts', (req, res) => {
    const u = who(req, res); if (!u || !rc) return; const o = col(P.orders)[req.params.id]; if (!o) return bad(res, 404, 'not_found');
    const s = col(P.shops)[o.shopId], isBuyer = o.buyerUid === u.uid, isSeller = s && s.uid === u.uid; if (!isBuyer && !isSeller) return bad(res, 403, 'not_allowed');
    const mineKinds = rc.available(o).filter(k => (k === 'payout' ? isSeller : isBuyer));
    res.json({ ok: true, receipts: mineKinds.map(k => ({ kind: k, label: rc.KINDS[k], no: rc.no(o, k), url: rc.url(o.id, k).replace(/^https?:\/\/[^/]+/, '') })) });
  });

  /* ---------- አድሚን ---------- */
  app.get('/api/market/admin/overview', async (req, res) => {
    if (!adminOnly(req, res)) return; await expire(); const O = Object.values(col(P.orders)), V = o => orderView(o, 'admin');
    res.json({ ok: true, config: cfg(), counts: { shops: Object.keys(col(P.shops)).length, products: Object.keys(col(P.products)).length, orders: O.length, gmv: O.filter(o => ['paid', 'preparing', 'shipped', 'delivered', 'settled'].includes(o.status)).reduce((a, o) => a + o.total, 0), commission: O.filter(o => o.status === 'settled').reduce((a, o) => a + o.commission, 0) },
      pendingShops: Object.values(col(P.shops)).filter(s => s.status === 'pending').map(s => ({ ...pubShop(s), phone: s.phone, payout: s.payout, license: s.license, status: s.status, owner: userInfo(s.uid) })),
      allShops: Object.values(col(P.shops)).map(s => ({ id: s.id, name: s.name, status: s.status, city: s.city, owner: userInfo(s.uid) })),
      payments: O.filter(o => o.status === 'payment_submitted').map(V), toSettle: O.filter(o => o.status === 'delivered').map(V), refunds: O.filter(o => o.status === 'refund_pending').map(V), disputes: O.filter(o => o.status === 'disputed').map(V),
      recent: O.sort((a, b) => b.ts - a.ts).slice(0, 30).map(V) });
  });
  app.post('/api/market/admin/config', async (req, res) => {
    if (!adminOnly(req, res)) return; const b = req.body || {}, pct = N(b.commissionPct);
    col(P.cfg).main = { commissionPct: pct >= 0 && pct <= 30 ? pct : COMM, accounts: (Array.isArray(b.accounts) ? b.accounts : []).slice(0, 8).map(a => ({ method: S(a.method, 20), number: S(a.number, 40), holder: S(a.holder, 60) })).filter(a => a.method && a.number), note: S(b.note, 300) };
    try { await saveMany([[P.cfg, 'main']]); res.json({ ok: true }); } catch (e) { bad(res, 503, 'storage'); }
  });
  app.post('/api/market/admin/shop/:id/status', async (req, res) => {
    if (!adminOnly(req, res)) return; const s = col(P.shops)[req.params.id]; if (!s) return bad(res, 404, 'not_found');
    if (!['active', 'rejected', 'suspended', 'pending'].includes(req.body.status)) return bad(res, 400, 'bad_status');
    s.status = req.body.status; s.note = S(req.body.note, 200); try { await saveMany([[P.shops, s.id]]); const T2 = { active: `🎉 ሱቅዎ «${s.name}» ጸድቋል — አሁን ለህዝብ ክፍት ነው። ዕቃዎችዎን ይዘርዝሩ!`, rejected: `❌ ሱቅዎ «${s.name}» አልተቀበለም።${s.note ? ' ምክንያት፦ ' + s.note : ''}`, suspended: `⛔ ሱቅዎ «${s.name}» ታግዷል።${s.note ? ' ' + s.note : ''}` }; if (T2[s.status]) tell(s.uid, T2[s.status]); res.json({ ok: true }); } catch (e) { bad(res, 503, 'storage'); }
  });
  const A = { // የአድሚን እርምጃዎች
    'verify-payment': { from: ['payment_submitted'], run: (o, b) => { if (b.ok) { o.payment.verifiedAt = Date.now(); push(o, 'paid', 'admin', S(b.note, 200)); } else { o.payment.rejected = S(b.note, 200) || 'ማስረጃው አልተቀበለም'; push(o, 'placed', 'admin', o.payment.rejected); } } },
    settle: { from: ['delivered'], run: (o, b) => { const ref = S(b.ref, 40); if (ref.length < 3) return 'payout_ref_required'; o.settle = { ref, ts: Date.now() }; push(o, 'settled', 'admin', 'ለሻጭ ተከፍሏል፤ ማጣቀሻ ' + ref); } },
    refund: { from: ['refund_pending', 'disputed'], restock: 1, run: (o, b) => { const ref = S(b.ref, 40); if (ref.length < 3) return 'refund_ref_required'; o.settle = { ref, ts: Date.now(), refund: true }; push(o, 'refunded', 'admin', 'ተመላሽ ተደርጓል፤ ማጣቀሻ ' + ref); } },
    release: { from: ['disputed'], run: (o, b) => { const ref = S(b.ref, 40); if (ref.length < 3) return 'payout_ref_required'; o.settle = { ref, ts: Date.now() }; push(o, 'settled', 'admin', 'ክርክር ለሻጭ ተወሰነ፤ ማጣቀሻ ' + ref); } } };
  app.post('/api/market/admin/order/:id/:act', async (req, res) => {
    if (!adminOnly(req, res)) return; const a = A[req.params.act], o = col(P.orders)[req.params.id]; if (!a || !o) return bad(res, 404, 'not_found');
    if (!a.from.includes(o.status)) return bad(res, 409, 'wrong_step:' + o.status);
    const ch = [[P.orders, o.id]], err = a.run(o, req.body || {}); if (err) return bad(res, 400, err);
    if (a.restock) { restock(o); o.items.forEach(i => col(P.products)[i.pid] && ch.push([P.products, i.pid])); }
    try { await saveMany(ch); const sh = col(P.shops)[o.shopId], act = req.params.act, b = req.body || {};
      if (act === 'verify-payment') { if (b.ok) { tell(o.buyerUid, `✅ ክፍያዎ ${short(o)} ተረጋግጧል (${money(o.total)})። ሻጩ ዕቃውን ያዘጋጃል።\n📥 የክፍያ ደረሰኝዎን ከታች ባለው ቁልፍ ያውርዱ።`, rbtn(o, 'payment')); sh && tell(sh.uid, `✅ ትዕዛዝ ${short(o)} ክፍያ ተረጋግጧል — አሁን ተቀብለው ያዘጋጁ (${money(o.total)})።`); } else tell(o.buyerUid, `❌ ክፍያዎ ${short(o)} አልተቀበለም${o.payment && o.payment.rejected ? '፦ ' + o.payment.rejected : ''}። ትክክለኛውን ማጣቀሻ በድረ-ገጹ እንደገና ያስገቡ።`); }
      if (act === 'settle' || act === 'release') sh && tell(sh.uid, `💰 ለትዕዛዝ ${short(o)} ${money(o.sellerNet)} ተከፍሏል። ማጣቀሻ፦ ${o.settle.ref}\n📥 የክፍያ ደረሰኝዎን ያውርዱ።`, rbtn(o, 'payout'));
      if (act === 'refund') tell(o.buyerUid, `↩️ ለትዕዛዝ ${short(o)} ${money(o.total)} ተመልሷል። ማጣቀሻ፦ ${o.settle.ref}\n📥 የተመላሽ ደረሰኝዎን ያውርዱ።`, rbtn(o, 'refund'));
      res.json({ ok: true, status: o.status }); } catch (e) { bad(res, 503, 'storage'); }
  });
  return { who, saveMany, bad, S, N, phoneET, adminOnly, nid, userInfo };
};
