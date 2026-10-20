'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, ETB, get, post } from '@/lib/api';
import { errText } from '@/lib/consts';
import { Msg, PageTitle, Spinner, StatusTag } from '@/components/ui';
import RequireAuth from '@/components/RequireAuth';

const Order = ({ o, children }) => (
  <div className="card mb-3"><div className="flex justify-between"><b>#{o.id.slice(0, 6)} · {o.shopName}</b><b className="text-brand">{ETB(o.total)}</b></div>
    <p className="muted">👤 {o.buyer.name} {o.buyer.email} {o.buyer.phone}</p>{o.payment && <p className="mt-1 rounded-2xl bg-brand-light p-2 text-sm">💳 <b>{o.payment.method}</b> · ማጣቀሻ፦ <b>{o.payment.ref}</b> {o.payment.note}</p>}{children}</div>);

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
      {d.payments.map(o => (<Order key={o.id} o={o}><In k={'vn' + o.id} ph="መልዕክት (አማራጭ)" /><div className="mt-2 grid grid-cols-2 gap-2"><button className="btn-primary" onClick={() => run(`/api/market/admin/order/${o.id}/verify-payment`, { ok: true, note: x['vn' + o.id] })}>✅ ደርሷል</button><button className="btn-danger" onClick={() => run(`/api/market/admin/order/${o.id}/verify-payment`, { ok: false, note: x['vn' + o.id] })}>❌ አልደረሰም</button></div></Order>))}
      <h2 className="mt-5 text-lg">💰 ለሻጭ ለመክፈል ({d.toSettle.length})</h2>
      {d.toSettle.map(o => (<Order key={o.id} o={o}><p className="mt-1 text-sm">ለሻጭ <b>{ETB(o.sellerNet)}</b> (ኮሚሽን {ETB(o.commission)}) → {o.payout && o.payout.method} {o.payout && o.payout.account} ({o.payout && o.payout.holder})</p><In k={'sr' + o.id} ph="የክፍያ ማጣቀሻ ቁጥር" /><button className="btn-primary mt-2 w-full" onClick={() => run(`/api/market/admin/order/${o.id}/settle`, { ref: x['sr' + o.id] })}>💰 ተከፍሏል</button></Order>))}
      <h2 className="mt-5 text-lg">↩️ ተመላሽ ({d.refunds.length}) · ⚖️ ክርክር ({d.disputes.length})</h2>
      {d.refunds.map(o => (<Order key={o.id} o={o}><In k={'rf' + o.id} ph="የተመላሽ ማጣቀሻ" /><button className="btn-primary mt-2 w-full" onClick={() => run(`/api/market/admin/order/${o.id}/refund`, { ref: x['rf' + o.id] })}>↩️ ተመልሷል</button></Order>))}
      {d.disputes.map(o => (<Order key={o.id} o={o}><p className="mt-1 text-sm">⚖️ {o.dispute && o.dispute.reason}</p><In k={'rf' + o.id} ph="የክፍያ / ተመላሽ ማጣቀሻ" /><div className="mt-2 grid grid-cols-2 gap-2"><button className="btn-primary" onClick={() => run(`/api/market/admin/order/${o.id}/release`, { ref: x['rf' + o.id] })}>ለሻጭ ክፈል</button><button className="btn-danger" onClick={() => run(`/api/market/admin/order/${o.id}/refund`, { ref: x['rf' + o.id] })}>ለገዥ መልስ</button></div></Order>))}
      <h2 className="mt-5 text-lg">🏪 ሁሉም ሱቆች</h2>
      {d.allShops.map(s => (<div key={s.id} className="card mb-2 flex items-center justify-between gap-2"><div className="min-w-0"><b className="block truncate">{s.name}</b><span className="muted">{s.owner.email}</span></div><StatusTag s={s.status} /><button className="btn-ghost !min-h-[40px] !px-3" onClick={() => run(`/api/market/admin/shop/${s.id}/status`, { status: s.status === 'suspended' ? 'active' : 'suspended' })}>{s.status === 'suspended' ? '✅' : '⛔'}</button></div>))}
      <h2 className="mt-5 text-lg">⚙️ ቅንብር</h2>
      <div className="card"><label className="label">ኮሚሽን (%)</label><input className="input" type="number" min="0" max="30" value={x.pct ?? d.config.commissionPct} onChange={e => set('pct', e.target.value)} /><label className="label">ገዥዎች የሚከፍሉባቸው አካውንቶች (በየመስመሩ፦ ዘዴ|ቁጥር|ባለቤት)</label><textarea className="input" rows={4} value={x.acc ?? (d.config.accounts || []).map(a => [a.method, a.number, a.holder].join('|')).join('\n')} onChange={e => set('acc', e.target.value)} /><button className="btn-primary mt-3 w-full" onClick={async () => { const accounts = (x.acc ?? (d.config.accounts || []).map(a => [a.method, a.number, a.holder].join('|')).join('\n')).split('\n').map(l => l.split('|').map(t => t.trim())).filter(t => t[0] && t[1]).map(t => ({ method: t[0], number: t[1], holder: t[2] || '' })); const r = await post('/api/market/admin/config', { commissionPct: +(x.pct ?? d.config.commissionPct), accounts }); setM(r.ok ? '✅ ተቀምጧል' : errText(r.error)); load(); }}>💾 አስቀምጥ</button></div>
    </div>
  );
}
function Accounts() {
  const [L, setL] = useState(null), [q, setQ] = useState(''), [armed, setArmed] = useState(''), [detail, setDetail] = useState(null);
  const load = useCallback(() => get('/api/admin/accounts').then(r => setL(r.accounts || [])), []);
  useEffect(() => { load(); }, [load]);
  async function act(a, u) { const key = a + u; if (a === 'view') { const d = await get('/api/admin/account/' + u); return setDetail(d); } if (armed !== key) { setArmed(key); setTimeout(() => setArmed(''), 4000); return; } setArmed('');
    if (a === 'susp') await post(`/api/admin/account/${u}/suspend`, { suspend: !L.find(x => x.uid === u).suspended }); if (a === 'tg') await post(`/api/admin/account/${u}/unlink-telegram`, {}); if (a === 'del') await api('DELETE', '/api/admin/account/' + u); load(); }
  if (!L) return <Spinner />;
  if (detail) return (<div className="card"><h2 className="text-lg">👁 ዝርዝር</h2><pre className="mt-2 max-h-[60vh] overflow-auto whitespace-pre-wrap rounded-2xl bg-brand-light p-3 text-xs">{JSON.stringify(detail.docs, null, 2)}</pre><button className="btn-ghost mt-3 w-full" onClick={() => setDetail(null)}>← ተመለስ</button></div>);
  const F = L.filter(a => !q || (a.email + a.phone + a.name).toLowerCase().includes(q.toLowerCase())), B = ({ a, u, children, cls = 'btn-ghost' }) => <button className={cls + ' !min-h-[40px] flex-1 !px-2 text-xs'} onClick={() => act(a, u)}>{armed === a + u ? '❓ እርግጠኛ?' : children}</button>;
  return (
    <div><input className="input mb-3" placeholder="🔎 በኢሜይል፣ ስልክ ወይም ስም ፈልግ" value={q} onChange={e => setQ(e.target.value)} /><p className="muted mb-2">{F.length} አካውንት</p>
      {F.map(a => (<div key={a.uid} className="card mb-2"><b>{a.name || a.email}</b><p className="muted">{a.email} · {a.phone}</p><div className="my-2 flex flex-wrap gap-1.5"><span className={a.suspended ? 'tag-bad' : 'tag'}>{a.suspended ? '⛔ ታግዷል' : '🟢 ንቁ'}</span><span className="tag">{a.telegram ? '🔗 Telegram ተገናኝቷል' : '○ Telegram የለም'}</span><span className="tag">{a.hasPrivate ? '🪪 የግል መረጃ አለ' : '🪪 የለም'}</span></div>
        <div className="flex gap-1.5"><B a="view" u={a.uid}>👁 ዝርዝር</B><B a="susp" u={a.uid}>{a.suspended ? '✅ ፍቀድ' : '⛔ እገድ'}</B><B a="tg" u={a.uid}>🔌 አላቅቅ</B><B a="del" u={a.uid} cls="btn-danger">🗑 ሰርዝ</B></div></div>))}
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
function Admin() {
  const [t, setT] = useState('market'), tabs = [['market', '🛍️ ገበያ'], ['accounts', '👥 አካውንቶች'], ['people', '💼 ሰዎች እና ሥራ']];
  return (<div className="mx-auto max-w-3xl"><PageTitle>🛡️ አድሚን</PageTitle><div className="mb-4 flex gap-2 overflow-x-auto">{tabs.map(([k, l]) => <button key={k} className={t === k ? 'chip-on' : 'chip'} onClick={() => setT(k)}>{l}</button>)}</div>{t === 'market' && <Market />}{t === 'accounts' && <Accounts />}{t === 'people' && <People />}</div>);
}
export default function Page() { return <RequireAuth admin><Admin /></RequireAuth>; }
