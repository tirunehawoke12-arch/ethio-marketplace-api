'use client';
import AdminOps from '@/components/AdminOps';
import { useCallback, useEffect, useState } from 'react';
import { api, ETB, get, post, setTok } from '@/lib/api';
import { errText } from '@/lib/consts';
import { Msg, PageTitle, Spinner, StatusTag } from '@/components/ui';
import { ExpandCard } from '@/components/Expand';
import AccountViewer from '@/components/AccountViewer';
import Trust from '@/components/AdminTrust';
import RequireAuth from '@/components/RequireAuth';
import Ico from '@/components/admin/Ico';
import AdminHome from '@/components/admin/AdminHome';
import AdminSearch from '@/components/admin/AdminSearch';
import AdminProducts from '@/components/admin/AdminProducts';
import AdminComms from '@/components/admin/AdminComms';
import AdminGrowth from '@/components/admin/AdminGrowth';
import AdminLearn from '@/components/AdminLearn';

const AUTO = { match: ['✅ ራስ-ሰር ፍተሻ ተዛምዷል', 'msg-ok'], mismatch: ['❌ ራስ-ሰር ፍተሻ አይመሳሰልም', 'msg-err'], notfound: ['❓ በአረጋጋጩ አልተገኘም', 'msg-err'], unknown: ['⚠️ ማረጋገጥ አልተቻለም', 'muted'], error: ['⚠️ ፍተሻው አልተሳካም', 'muted'] };
const Order = ({ o, children, onCheck }) => (
  <ExpandCard className="mb-3" defaultOpen href={`/orders/${o.id}`} cta="ትዕዛዙን ክፈት"
    head={<><div className="flex justify-between"><b>#{o.id.slice(0, 6)} · {o.shopName}</b><b className="text-brand">{ETB(o.total)}</b></div><p className="muted">👤 {o.buyer.name} {o.buyer.email} {o.buyer.phone}</p></>}
    actions={children}>
    {o.payment && <p className="rounded-2xl bg-brand-light p-2 text-sm">💳 <b>{o.payment.method}</b> · ማጣቀሻ፦ <b>{o.payment.ref}</b> {o.payment.note}</p>}
    {o.hints && o.hints.length > 0 && <ul className="space-y-1 text-sm">{o.hints.map(h => <li key={h} className={h.startsWith('⚠️') ? 'font-bold text-red-600' : 'muted'}>{h}</li>)}</ul>}
    {o.auto && AUTO[o.auto.state] && <div className={'rounded-xl px-3 py-2 text-sm ' + AUTO[o.auto.state][1]}><b>{AUTO[o.auto.state][0]}</b>{(o.auto.reasons || []).map(r => <p key={r}>• {r}</p>)}</div>}
    {o.autoEnabled && onCheck && <button className="btn-soft w-full" onClick={onCheck}>🤖 ራስ-ሰር ፍተሻ አድርግ</button>}
    {o.items && o.items.length > 0 && <p className="muted">{o.items.map(i => `${i.title}×${i.qty}`).join('፣ ')}</p>}
  </ExpandCard>);

function AdminSession() {
  const [m, setM] = useState(''), [sure, setSure] = useState(false);
  async function go() { const r = await post('/api/admin/logout-all'); setSure(false); if (r.ok && r.token) { setTok(r.token); setM('✅ በሌሎች መሳሪያዎች ላይ ያሉ የአድሚን መግቢያዎች ወጥተዋል።'); } else setM(errText(r.error)); }
  return (<div className="mb-3 flex flex-wrap items-center gap-2"><span className="muted">⏱ የአድሚን መግቢያ ከ12 ሰዓት በኋላ ያበቃል።</span>{!sure ? <button className="btn-soft ml-auto" onClick={() => setSure(true)}>🚪 በሁሉም መሳሪያ ላይ ውጣ</button> : <span className="ml-auto flex gap-2"><button className="btn-danger !min-h-[40px] !px-3" onClick={go}>✅ አዎ</button><button className="btn-soft" onClick={() => setSure(false)}>✖️</button></span>}{m && <span className="w-full text-sm text-brand-dark">{m}</span>}</div>);
}
function ImgStore() {
  const [d, setD] = useState(null), [busy, setBusy] = useState(false), [m, setM] = useState('');
  const load = useCallback(() => get('/api/market/admin/images').then(setD), []); useEffect(() => { load(); }, [load]);
  async function run() {
    setBusy(true); setM(''); let moved = 0;
    for (let k = 0; k < 40; k++) { const r = await post('/api/market/admin/images/migrate', { limit: 25 }); if (!r.ok) { setM(errText(r.error)); break; } moved += r.moved; setD(r); if (r.failed) { setM('⚠️ ' + r.failed + ' አልተዛወረም — ' + (r.error || '')); break; } if (!r.inDb || !r.moved) break; }
    setBusy(false); if (moved) setM(m => (m ? m + ' · ' : '') + `✅ ${moved} ምስል ተዛውሯል`); load();
  }
  if (!d || !d.ok) return null;
  return (
    <div className="card mt-3"><h2 className="text-lg">🖼️ የምስል ማከማቻ</h2>
      <p className="muted mt-1">አሁን፦ <b>{d.enabled ? 'ውጫዊ (S3 / R2)' : 'Postgres'}</b>{d.enabled && (d.publicUrl ? ' · በቀጥታ ከ CDN' : ' · በሰርቨር በኩል (S3_PUBLIC_URL ቢቀናበር ፈጣን ነው)')}</p>
      <div className="mt-2 grid grid-cols-3 gap-2 text-center text-sm"><div className="rounded-2xl bg-brand-light p-2"><b className="text-lg">{d.total}</b><br />ጠቅላላ</div><div className="rounded-2xl bg-brand-light p-2"><b className="text-lg">{d.inDb}</b><br />በ Postgres ({d.dbMB} MB)</div><div className="rounded-2xl bg-brand-light p-2"><b className="text-lg">{d.external}</b><br />በውጫዊ ማከማቻ</div></div>
      {!d.enabled ? <p className="muted mt-2">ለማንቃት በ Render የ <b>S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY</b> (እና አማራጭ <b>S3_PUBLIC_URL</b>) ያስገቡ።</p>
        : d.inDb > 0 ? <button className="btn-primary mt-3 w-full" disabled={busy} onClick={run}>{busy ? '⏳ በማዛወር ላይ…' : `📦 ${d.inDb} ነባር ምስሎችን ወደ ውጫዊ ማከማቻ አዛውር`}</button> : <p className="msg-ok mt-2">✅ ሁሉም ምስሎች በውጫዊ ማከማቻ ላይ ናቸው — Postgres ቀላል ነው።</p>}
      <Msg m={m} />
    </div>
  );
}

function Market() {
  const [d, setD] = useState(null), [m, setM] = useState(''), [x, setX] = useState({});
  const load = useCallback(() => get('/api/market/admin/overview').then(setD), []);
  useEffect(() => { load(); }, [load]);
  const set = (k, v) => setX(s => ({ ...s, [k]: v }));
  async function run(url, body) { setM(''); const r = await post(url, body); if (!r.ok) return setM(errText(r.error)); load(); }
  if (!d) return <Spinner />; if (!d.ok) return <p className="msg-err">{errText(d.error)}</p>;
  const c = d.counts, In = ({ k, ph }) => <input className="input mt-2" placeholder={ph} value={x[k] || ''} onChange={e => set(k, e.target.value)} />;
  return (
    <div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">{[[c.shops, 'ሱቆች'], [c.products, 'ዕቃዎች'], [c.orders, 'ትዕዛዞች'], [ETB(c.gmv), 'ጠቅላላ ግብይት'], [ETB(c.commission), 'ኮሚሽን']].map(([v, t]) => <div key={t} className="card text-center"><b className="text-lg">{v}</b><p className="muted">{t}</p></div>)}</div><Msg m={m} />
      <h2 className="mt-5 text-lg">🏪 ለማጽደቅ የሚጠብቁ ሱቆች ({d.pendingShops.length})</h2>
      {d.pendingShops.map(s => (<div key={s.id} className="card mb-3"><b>{s.name}</b> <span className="tag">{s.kind}</span><p className="muted">{s.city}, {s.region} — {s.address}</p><p className="muted">👤 {s.owner.name} {s.owner.email} {s.owner.phone}{s.license ? ` · 🪪 ${s.license}` : ''}</p><p className="muted">💰 {s.payout.method} {s.payout.account} ({s.payout.holder})</p><In k={'sn' + s.id} ph="መልዕክት (አማራጭ)" /><div className="mt-2 grid grid-cols-2 gap-2"><button className="btn-primary" onClick={() => run(`/api/market/admin/shop/${s.id}/status`, { status: 'active', note: x['sn' + s.id] })}>✅ አጽድቅ</button><button className="btn-danger" onClick={() => run(`/api/market/admin/shop/${s.id}/status`, { status: 'rejected', note: x['sn' + s.id] })}>❌ ውድቅ</button></div></div>))}
      <h2 className="mt-5 text-lg">💳 ክፍያ ለማረጋገጥ ({d.payments.length})</h2>
      {d.payments.map(o => (<Order key={o.id} o={o} onCheck={() => run(`/api/market/admin/order/${o.id}/autocheck`, {})}><In k={'vn' + o.id} ph="መልዕክት (አማራጭ)" /><div className="mt-2 grid grid-cols-2 gap-2"><button className="btn-primary" onClick={() => run(`/api/market/admin/order/${o.id}/verify-payment`, { ok: true, note: x['vn' + o.id] })}>✅ ደርሷል</button><button className="btn-danger" onClick={() => run(`/api/market/admin/order/${o.id}/verify-payment`, { ok: false, note: x['vn' + o.id] })}>❌ አልደረሰም</button></div></Order>))}
      <h2 className="mt-5 text-lg">💰 ለሻጭ ለመክፈል ({d.toSettle.length})</h2>
      {d.toSettle.map(o => (<Order key={o.id} o={o}><p className="mt-1 text-sm">ለሻጭ <b>{ETB(o.sellerNet)}</b> (ኮሚሽን {ETB(o.commission)}) → {o.payout && o.payout.method} {o.payout && o.payout.account} ({o.payout && o.payout.holder})</p><In k={'sr' + o.id} ph="የክፍያ ማጣቀሻ ቁጥር" /><button className="btn-primary mt-2 w-full" onClick={() => run(`/api/market/admin/order/${o.id}/settle`, { ref: x['sr' + o.id] })}>💰 ተከፍሏል</button></Order>))}
      <h2 className="mt-5 text-lg">↩️ ተመላሽ ({d.refunds.length}) · ⚖️ ክርክር ({d.disputes.length})</h2>
      {d.refunds.map(o => (<Order key={o.id} o={o}><In k={'rf' + o.id} ph="የተመላሽ ማጣቀሻ" /><button className="btn-primary mt-2 w-full" onClick={() => run(`/api/market/admin/order/${o.id}/refund`, { ref: x['rf' + o.id] })}>↩️ ተመልሷል</button></Order>))}
      {d.disputes.map(o => (<Order key={o.id} o={o}><p className="mt-1 text-sm">⚖️ {o.dispute && o.dispute.reason}</p><In k={'rf' + o.id} ph="የክፍያ / ተመላሽ ማጣቀሻ" /><div className="mt-2 grid grid-cols-2 gap-2"><button className="btn-primary" onClick={() => run(`/api/market/admin/order/${o.id}/release`, { ref: x['rf' + o.id] })}>ለሻጭ ክፈል</button><button className="btn-danger" onClick={() => run(`/api/market/admin/order/${o.id}/refund`, { ref: x['rf' + o.id] })}>ለገዥ መልስ</button></div></Order>))}
      <h2 className="mt-5 text-lg">🏪 ሁሉም ሱቆች</h2>
      {d.allShops.map(s => (<div key={s.id} className="card mb-2 flex items-center justify-between gap-2"><div className="min-w-0"><b className="block truncate">{s.name}</b><span className="muted">{s.owner.email}</span></div><StatusTag s={s.status} /><button className="btn-ghost !min-h-[40px] !px-3" onClick={() => run(`/api/market/admin/shop/${s.id}/status`, { status: s.status === 'suspended' ? 'active' : 'suspended' })}>{s.status === 'suspended' ? '✅' : '⛔'}</button></div>))}
      <h2 className="mt-5 text-lg">⚙️ ቅንብር</h2>
      <div className="card"><label className="label">ኮሚሽን (%)</label><input className="input" type="number" min="0" max="30" value={x.pct ?? d.config.commissionPct} onChange={e => set('pct', e.target.value)} /><label className="label">ገዥዎች የሚከፍሉባቸው አካውንቶች (በየመስመሩ፦ ዘዴ|ቁጥር|ባለቤት)</label><textarea className="input" rows={4} value={x.acc ?? (d.config.accounts || []).map(a => [a.method, a.number, a.holder].join('|')).join('\n')} onChange={e => set('acc', e.target.value)} /><button className="btn-primary mt-3 w-full" onClick={async () => { const accounts = (x.acc ?? (d.config.accounts || []).map(a => [a.method, a.number, a.holder].join('|')).join('\n')).split('\n').map(l => l.split('|').map(t => t.trim())).filter(t => t[0] && t[1]).map(t => ({ method: t[0], number: t[1], holder: t[2] || '' })); const r = await post('/api/market/admin/config', { commissionPct: +(x.pct ?? d.config.commissionPct), accounts }); setM(r.ok ? '✅ ተቀምጧል' : errText(r.error)); load(); }}>💾 አስቀምጥ</button></div>
      <ImgStore />
    </div>
  );
}
function Accounts({ uid: uid0, q: q0 }) {
  const [L, setL] = useState(null), [q, setQ] = useState(q0 || ''), [armed, setArmed] = useState(''), [detail, setDetail] = useState(uid0 || null);
  const load = useCallback(() => get('/api/admin/accounts').then(r => setL(r.accounts || [])), []);
  useEffect(() => { load(); }, [load]);
  async function act(a, u) { const key = a + u; if (a === 'view') return setDetail(u); if (armed !== key) { setArmed(key); setTimeout(() => setArmed(''), 4000); return; } setArmed('');
    if (a === 'susp') await post(`/api/admin/account/${u}/suspend`, { suspend: !L.find(x => x.uid === u).suspended }); if (a === 'tg') await post(`/api/admin/account/${u}/unlink-telegram`, {}); if (a === 'del') await api('DELETE', '/api/admin/account/' + u); load(); }
  if (!L) return <Spinner />;
  if (detail) { const a = L.find(x => x.uid === detail) || {}; return <AccountViewer uid={detail} onBack={() => setDetail(null)} head={<div className="card"><b>{a.name || a.email}</b><p className="muted">{a.email} · {a.phone}</p></div>} />; }
  const F = L.filter(a => !q || (a.email + a.phone + a.name).toLowerCase().includes(q.toLowerCase())), B = ({ a, u, children, cls = 'btn-ghost' }) => <button className={cls + ' !min-h-[40px] flex-1 !px-2 text-xs'} onClick={() => act(a, u)}>{armed === a + u ? '❓ እርግጠኛ?' : children}</button>;
  return (
    <div><input className="input mb-3" placeholder="🔎 በኢሜይል፣ ስልክ ወይም ስም ፈልግ" value={q} onChange={e => setQ(e.target.value)} /><p className="muted mb-2">{F.length} አካውንት</p>
      {F.map(a => (<div key={a.uid} className="card mb-2"><b>{a.name || a.email}</b><p className="muted">{a.email} · {a.phone}</p><div className="my-2 flex flex-wrap gap-1.5"><span className={a.suspended ? 'tag-bad' : 'tag'}>{a.suspended ? '⛔ ታግዷል' : '🟢 ንቁ'}</span><span className="tag">{a.telegram ? '🔗 Telegram ተገናኝቷል' : '○ Telegram የለም'}</span><span className="tag">{a.hasPrivate ? '🪪 የግል መረጃ አለ' : '🪪 የለም'}</span></div>
        <div className="flex gap-1.5"><B a="view" u={a.uid}>👁 ሙሉ እይታ</B><B a="susp" u={a.uid}>{a.suspended ? '✅ ፍቀድ' : '⛔ እገድ'}</B><B a="tg" u={a.uid}>🔌 አላቅቅ</B><B a="del" u={a.uid} cls="btn-danger">🗑 ሰርዝ</B></div></div>))}
    </div>
  );
}
function People() {
  const [d, setD] = useState(null); const load = useCallback(() => get('/api/people/admin/overview').then(setD), []); useEffect(() => { load(); }, [load]);
  async function st(t, id, status) { await post(`/api/people/admin/${t}/${id}/status`, { status }); load(); }
  if (!d) return <Spinner />; if (!d.ok) return <p className="msg-err">{errText(d.error)}</p>; const c = d.counts;
  const Row = ({ t, x, title, sub, ok, bad }) => (<div className="card mb-2 flex items-center gap-2"><div className="min-w-0 flex-1"><b className="block truncate">{title}</b><span className="muted block truncate">{sub}</span></div><StatusTag s={x.status} /><button className="btn-ghost !min-h-[40px] !px-3" onClick={() => st(t, x.id, x.status === 'suspended' ? ok : bad)}>{x.status === 'suspended' ? '✅' : '⛔'}</button></div>);
  return (
    <div><div className="grid grid-cols-3 gap-2 md:grid-cols-6">{[[c.workers, 'ሠራተኞች'], [c.employers, 'አሰሪዎች'], [c.jobs, 'ሥራዎች'], [c.openJobs, 'ክፍት'], [c.applications, 'ማመልከቻ'], [c.hired, 'ቅጥር']].map(([v, t]) => <div key={t} className="card text-center"><b>{v}</b><p className="muted">{t}</p></div>)}</div>
      <h2 className="mt-5 text-lg">🧑‍🔧 ሠራተኞች</h2>{d.workers.map(w => <Row key={w.id} t="w" x={w} title={`${w.name} — ${w.title}`} sub={w.owner.email} ok="active" bad="suspended" />)}
      <h2 className="mt-5 text-lg">🏢 አሰሪዎች</h2>{d.employers.map(e => <Row key={e.id} t="e" x={e} title={`${e.name} — ${e.sector}`} sub={`${e.owner.email}${e.license ? ' · 🪪 ' + e.license : ''}`} ok="active" bad="suspended" />)}
      <h2 className="mt-5 text-lg">💼 ሥራዎች</h2>{d.jobs.map(j => <Row key={j.id} t="j" x={j} title={j.title} sub={j.employer} ok="open" bad="suspended" />)}
    </div>
  );
}
function Pages() {
  const [d, setD] = useState(null), [open, setOpen] = useState({}); const load = useCallback(() => get('/api/pages/admin/list').then(setD), []); useEffect(() => { load(); }, [load]);
  async function st(id, status) { await post(`/api/pages/admin/${id}/status`, { status }); load(); }
  async function view(id) { if (open[id]) return setOpen({ ...open, [id]: null }); const r = await get('/api/pages/admin/' + id); setOpen({ ...open, [id]: r }); }
  const show = v => (Array.isArray(v) ? v.join('፣ ') : v === 'yes' ? 'አዎ' : v === 'no' ? 'አይደለም' : String(v));
  if (!d) return <Spinner />; if (!d.ok) return <p className="msg-err">{errText(d.error)}</p>;
  return (<div>{d.items.length === 0 && <div className="card muted text-center">ገጽ የለም</div>}{d.items.map(x => (<div key={x.id} className="card mb-2"><div className="flex items-center gap-2"><div className="min-w-0 flex-1"><b className="block truncate">{x.title} <span className="tag">{x.kind}</span></b><span className="muted block truncate">{x.owner.email} · {x.owner.phone}</span></div><StatusTag s={x.status} /><button className="btn-ghost !min-h-[40px] !px-3" onClick={() => view(x.id)} aria-label="ሙሉ መረጃ">👁</button><button className="btn-ghost !min-h-[40px] !px-3" onClick={() => st(x.id, x.status === 'suspended' ? 'active' : 'suspended')}>{x.status === 'suspended' ? '✅' : '⛔'}</button></div>
    {open[x.id] && open[x.id].ok && <div className="mt-3 space-y-2">{open[x.id].page.sections.map(s => <div key={s.id} className="rounded-2xl bg-brand-light p-3"><b>{s.icon} {s.title}</b>{s.fields.filter(f => !(Array.isArray(f.value) ? !f.value.length : f.value === '')).map(f => <p key={f.id} className="text-sm"><span className="muted">{f.priv ? '🔒 ' : ''}{f.label}፦</span> {f.type === 'image' ? f.value.map(i => <a key={i} className="mr-2 font-bold text-brand underline" target="_blank" rel="noopener" href={`/api/market/img/${i}`}>ፎቶ</a>) : show(f.value)}</p>)}</div>)}</div>}</div>))}</div>);
}
const NAV = [['home', 'ዋና ማዕከል', 'home'], ['market', 'ገበያ እና ክፍያ', 'store'], ['products', 'ዕቃዎች', 'box'], ['accounts', 'አካውንቶች', 'users'], ['people', 'ሰዎች እና ሥራ', 'briefcase'], ['pages', 'ገጾች', 'globe'], ['trust', 'እምነት', 'shield'], ['comms', 'ማስታወቂያ', 'megaphone'], ['growth', 'ኩፖን እና ሪፈራል', 'tag'], ['learn', 'የተማሪዎች መማሪያ', 'book'], ['ops', 'ትንታኔ እና ምትኬ', 'chart']];
function Admin() {
  const [t, setT] = useState('home'), [hub, setHub] = useState(null), [live, setLive] = useState(true), [f, setF] = useState({}), [spin, setSpin] = useState(false);
  const go = useCallback((k, x) => { setT(k); setF(x || {}); try { history.replaceState(null, '', '#' + k); } catch (e) { } window.scrollTo({ top: 0 }); }, []);
  useEffect(() => { const h = location.hash.slice(1); if (NAV.some(n => n[0] === h)) setT(h); }, []);
  const load = useCallback(async () => { setSpin(true); setHub(await get('/api/admin/hub')); setTimeout(() => setSpin(false), 400); }, []);
  useEffect(() => { load(); if (!live) return; const i = setInterval(() => { if (!document.hidden) load(); }, 30000); return () => clearInterval(i); }, [load, live]);
  const qz = hub && hub.ok ? hub.queue : {}, B = { market: (qz.shops | 0) + (qz.payments | 0) + (qz.settle | 0) + (qz.refunds | 0) + (qz.disputes | 0), trust: (qz.badges | 0) + (qz.reports | 0), ops: hub && hub.ok ? hub.health.errors : 0 };
  const pick = (tab, x) => go(tab, tab === 'accounts' ? { uid: x.id } : { q: x.title });
  const Item = ({ k, l, i, cls }) => (<button key={k} onClick={() => go(k)} aria-current={t === k ? 'page' : undefined} className={cls + ' ' + (t === k ? 'bg-brand text-white shadow-soft' : 'hover:bg-brand-light dark:hover:bg-brand/20')}><Ico n={i} s={19} /><span className="flex-1 whitespace-nowrap text-left">{l}</span>{B[k] > 0 && <b className={'rounded-full px-1.5 text-[11px] ' + (t === k ? 'bg-white text-brand' : 'bg-red-600 text-white')}>{B[k]}</b>}</button>);
  return (
    <div className="mx-auto max-w-6xl">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h1 className="flex items-center gap-2 text-xl"><Ico n="shield" className="text-brand" s={24} />አድሚን</h1>
        <AdminSearch onPick={pick} />
        <button className={'btn-soft ' + (live ? '!text-emerald-700' : '')} onClick={() => setLive(!live)} title="በየ30 ሰከንድ ራስ-ሰር አድስ"><span className={'h-2 w-2 rounded-full ' + (live ? 'animate-pulse bg-emerald-500' : 'bg-gray-400')} />{live ? 'ቀጥታ' : 'ቆሟል'}</button>
        <button className="btn-soft" onClick={load} aria-label="አድስ"><Ico n="refresh" s={16} className={spin ? 'animate-spin' : ''} /></button>
      </div>
      <nav className="-mx-3 mb-4 flex gap-2 overflow-x-auto px-3 pb-1 md:hidden" aria-label="አድሚን ምናሌ">{NAV.map(([k, l, i]) => <Item key={k} k={k} l={l} i={i} cls="chip flex items-center gap-2 !px-3 !py-2 text-sm font-bold transition" />)}</nav>
      <div className="md:grid md:grid-cols-[230px_minmax(0,1fr)] md:gap-5">
        <aside className="hidden md:block"><nav className="card sticky top-20 space-y-1 !p-2" aria-label="አድሚን ምናሌ">{NAV.map(([k, l, i]) => <Item key={k} k={k} l={l} i={i} cls="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-bold transition" />)}</nav></aside>
        <section className="min-w-0" key={t + JSON.stringify(f)}>
          {t === 'home' && <><AdminHome hub={hub} go={go} /><div className="mt-4"><AdminSession /></div></>}
          {t === 'market' && <Market />}{t === 'products' && <AdminProducts q={f.q} />}{t === 'accounts' && <Accounts uid={f.uid} q={f.q} />}{t === 'people' && <People />}{t === 'pages' && <Pages />}{t === 'trust' && <Trust />}{t === 'learn' && <AdminLearn />}{t === 'comms' && <AdminComms />}{t === 'growth' && <AdminGrowth />}{t === 'ops' && <AdminOps />}
        </section>
      </div>
    </div>
  );
}
export default function Page() { return <RequireAuth admin><Admin /></RequireAuth>; }
