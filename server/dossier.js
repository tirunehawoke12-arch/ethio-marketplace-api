'use strict';
/* ===== አድሚን፦ የአንድ አካውንት ሙሉ እይታ (dossier) + የኦዲት መዝገብ =====
   • አድሚን የእያንዳንዱን አካውንት ማንኛውንም ክፍል ማየት ይችላል (መገለጫ፣ የግል መረጃ፣ ገጽ እና መልሶቹ፣ ሱቅ፣ ዕቃ፣ ትዕዛዝ፣ ሙያ፣ አሰሪ፣ ሥራ፣ ማመልከቻ)
   • የይለፍ ቃል hash/salt/ምስጢራዊ ቁልፎች ፈጽሞ አይመለሱም
   • እያንዳንዱ እይታ እና አድሚን እርምጃ በ `_audit` መዝገብ ይጻፋል (ማን፣ መቼ፣ የትኛውን አካውንት፣ የትኛውን ክፍል) */
const SECRET = /^(h|salt|hash|pw|pass|password|secret|otp|token|tok|code|pin|key)$/i;
const scrub = v => {                                    // ጥልቅ ማጽጃ — ምስጢራዊ ስሞች ያሏቸው መስኮች ይወገዳሉ
  if (Array.isArray(v)) return v.map(scrub);
  if (v && typeof v === 'object') { const o = {}; for (const k of Object.keys(v)) if (!SECRET.test(k)) o[k] = scrub(v[k]); return o; }
  return v;
};
const SECTIONS = ['account', 'pages', 'shop', 'orders', 'work', 'employer', 'messages'];
const LABELS = { account: '👤 መገለጫ እና የግል መረጃ', pages: '🌐 ገጽ፣ ቅጾች እና መልሶች', shop: '🏪 ሱቅ እና ዕቃዎች', orders: '📦 ትዕዛዞች', work: '🧑‍🔧 ሙያ እና ማመልከቻ', employer: '🏢 አሰሪ እና ሥራዎች', messages: '💬 መልእክቶች' };

function build(col, uid, section, extra) {
  const d = col('data/users/' + uid); if (!d || !d.acct) return null;
  const all = p => Object.values(col(p));
  const who = id => { const x = col('data/users/' + id); return { uid: id, name: (x.private && x.private.fullName) || (x.acct && x.acct.name) || '', email: x.acct && x.acct.email, phone: x.acct && x.acct.phone }; };
  const out = {}, want = s => !section || section === 'all' || section === s;
  if (want('account')) out.account = { acct: scrub(d.acct), private: scrub(d.private || null), prefs: scrub(d.prefs || null), docs: Object.keys(d), ...(extra || {}) };
  if (want('pages')) {
    const pages = all('pg/pages').filter(p => p.uid === uid);
    out.pages = { pages, received: all('pg/responses').filter(r => r.ownerUid === uid).sort((a, b) => b.ts - a.ts).slice(0, 300).map(r => ({ ...r, from: who(r.fromUid) })), sent: all('pg/responses').filter(r => r.fromUid === uid).sort((a, b) => b.ts - a.ts).slice(0, 100).map(r => ({ ...r, page: (col('pg/pages')[r.pageId] || {}).title || '' })) };
  }
  const shops = all('mk/shops').filter(s => s.uid === uid), sids = new Set(shops.map(s => s.id));
  if (want('shop')) out.shop = { shops: scrub(shops), products: all('mk/products').filter(p => sids.has(p.shopId)), reviews: all('mk/reviews').filter(r => sids.has(r.shopId)).slice(0, 100) };
  if (want('orders')) out.orders = { asBuyer: all('mk/orders').filter(o => o.buyerUid === uid).sort((a, b) => b.ts - a.ts).slice(0, 200), asSeller: all('mk/orders').filter(o => sids.has(o.shopId)).sort((a, b) => b.ts - a.ts).slice(0, 200).map(o => ({ ...o, buyer: who(o.buyerUid) })) };
  const w = all('pp/workers').find(x => x.uid === uid), e = all('pp/employers').find(x => x.uid === uid);
  if (want('work')) out.work = { worker: w || null, applications: all('pp/apps').filter(a => a.workerUid === uid).sort((a, b) => b.ts - a.ts).slice(0, 200).map(a => ({ ...a, job: (col('pp/jobs')[a.jobId] || {}).title || '', employer: (col('pp/employers')[a.employerId] || {}).name || '' })) };
  if (want('employer')) out.employer = { employer: e || null, jobs: e ? all('pp/jobs').filter(j => j.employerId === e.id) : [], applicants: all('pp/apps').filter(a => a.employerUid === uid && !a.invite).sort((a, b) => b.ts - a.ts).slice(0, 200).map(a => ({ ...a, worker: who(a.workerUid) })) };
  if (want('messages')) out.messages = { threads: all('ch/threads').filter(t => (t.members || []).includes(uid)).sort((a, b) => ((b.last || {}).ts || 0) - ((a.last || {}).ts || 0)).slice(0, 60).map(t => ({ id: t.id, with: who((t.members || []).find(m => m !== uid)), about: t.ctx || null, blocked: t.blocked || {}, messages: all('ch/msgs').filter(m => m.threadId === t.id).sort((a, b) => a.ts - b.ts).slice(-200).map(m => ({ ts: m.ts, from: m.from === uid ? 'ይህ አካውንት' : 'ሌላኛው', text: m.text })) })) };
  const counts = { pages: all('pg/pages').filter(p => p.uid === uid).length, shops: shops.length, orders: all('mk/orders').filter(o => o.buyerUid === uid || sids.has(o.shopId)).length, worker: w ? 1 : 0, employer: e ? 1 : 0 };
  return { sections: out, counts };
}

/* የኦዲት መዝገብ — አንድ ሰነድ `_audit/log`፣ ከፍተኛ 1000 ግቤት */
const MAX = 1000;
function auditor({ col, pool, pgUpsert, persist, nid }) {
  return async function audit(action, target, section, note) {
    const c = col('_audit'); const log = (c.log && c.log.items) || [];
    log.push({ id: nid(), ts: Date.now(), by: 'admin', action, target: target || '', section: section || '', note: note || '' });
    c.log = { items: log.slice(-MAX) };
    try { if (pool) await pgUpsert('_audit', 'log', c.log); else persist(); } catch (e) { /* መዝገብ መጻፍ ባይሳካ እይታውን አያስቆምም፤ ግን በማህደረ ትውስታ ይቆያል */ }
  };
}
const readLog = (col, q) => {
  const items = ((col('_audit').log || {}).items || []).slice().reverse();
  return q ? items.filter(x => x.target === q) : items;
};
module.exports = { build, scrub, auditor, readLog, SECTIONS, LABELS };
