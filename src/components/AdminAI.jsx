'use client';
/* አድሚን፦ AI ረዳት — ማብሪያ/ማጥፊያ፣ ነጻ ገደብ፣ እቅድ እና ዋጋ፣ እውቀት (ፈጣሪ/ገበያ)፣ የክፍያ ጥያቄዎች፣ ተጠቃሚዎች */
import { useCallback, useEffect, useState } from 'react';
import { get, post, tok } from '@/lib/api';
import { errText } from '@/lib/consts';
import { Empty, Msg, Spinner } from '@/components/ui';

const when = t => (t ? new Date(t).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '—');
async function showProof(id) {
  try { const r = await fetch('/api/ai/admin/proof/' + id, { headers: { authorization: 'Bearer ' + tok() } }); if (!r.ok) return alert('ማስረጃ አልተገኘም'); const u = URL.createObjectURL(await r.blob()); window.open(u, '_blank'); setTimeout(() => URL.revokeObjectURL(u), 120000); } catch (e) { alert('ማስረጃ መክፈት አልተቻለም'); }
}
const day = t => (t ? new Date(t).toISOString().slice(0, 10) : '—');

function Requests({ onChange }) {
  const [st, setSt] = useState('pending'), [d, setD] = useState(null), [m, setM] = useState('');
  const load = useCallback(() => get('/api/ai/admin/requests?status=' + st).then(setD), [st]); useEffect(() => { load(); }, [load]);
  async function act(id, a) { let reason = ''; if (a === 'reject') { reason = window.prompt('ምክንያት (አማራጭ)'); if (reason === null) return; } const r = await post(`/api/ai/admin/requests/${id}/${a}`, { reason }); setM(r.ok ? (a === 'approve' ? '✅ ጸድቋል' : '❌ ውድቅ ተደርጓል') : errText(r.error)); load(); onChange && onChange(); }
  return (<div className="space-y-2"><div className="flex gap-2">{[['pending', '⏳ የሚጠብቁ'], ['approved', '✅ የጸደቁ'], ['rejected', '❌ ውድቅ']].map(([k, l]) => <button key={k} className={'chip ' + (st === k ? '!bg-brand !text-white' : '')} onClick={() => setSt(k)}>{l}</button>)}</div>
    <Msg m={m} ok={m.startsWith('✅')} />{!d ? <Spinner /> : d.items.length === 0 ? <Empty>ምንም የለም</Empty> : d.items.map(r => <div key={r.id} className="card !p-3 text-sm">
      <div className="flex justify-between gap-2"><b>🤖 {r.name || r.uid}</b><b className="text-brand">{r.price} ብር</b></div><p className="muted">{r.label} ({r.days} ቀን) · 📞 {r.phone || '—'} · {when(r.ts)}</p>
      <p className="mt-1 rounded-xl bg-brand-light p-2 dark:bg-brand/20">💳 <b>{r.method}</b> · ማጣቀሻ፦ <b>{r.ref}</b></p>{r.auto ? <p className="mt-2 rounded-xl bg-slate-100 p-2 text-xs dark:bg-slate-800">🤖 ራስ-ሰር ፍተሻ፦ <b>{({ match: '✅ ተዛምዷል', mismatch: '❌ አይመሳሰልም', notfound: '❓ አልተገኘም', unknown: '⚠️ ማረጋገጥ አልተቻለም', error: '⚠️ አልተሳካም' })[r.auto.state] || r.auto.state}</b>{(r.auto.reasons || []).map((x, i) => <span key={i} className="block">• {x}</span>)}</p> : null}{r.proof ? <button className="btn-soft mt-2 w-full" onClick={() => showProof(r.id)}>📎 የክፍያ ማስረጃ ክፈት</button> : <p className="msg-err mt-2">⚠️ ያለ ማስረጃ</p>}{r.reason && <p className="muted">ምክንያት፦ {r.reason}</p>}
      {r.status === 'pending' && <div className="mt-2 grid grid-cols-2 gap-2"><button className="btn-primary" onClick={() => act(r.id, 'approve')}>✅ አጽድቅ</button><button className="btn-ghost !text-red-700" onClick={() => act(r.id, 'reject')}>❌ ውድቅ</button></div>}</div>)}</div>);
}

function SmsCard() {
  const [d, setD] = useState(null), [m, setM] = useState('');
  const load = useCallback(() => get('/api/pay/admin/sms').then(setD), []); useEffect(() => { load(); }, [load]);
  async function rotate() { if (!confirm('አዲስ ሚስጥር ይፈጠር? አሮጌው ሊንክ መሥራት ያቆማል።')) return; const r = await post('/api/pay/admin/sms/rotate', {}); setM(r.ok ? '✅ ተቀይሯል' : errText(r.error)); load(); }
  if (!d) return <Spinner />; if (!d.ok) return null;
  return (<div className="card"><b>📲 የ SMS ራስ-ማረጋገጫ (በጣም ትክክለኛ፣ ነጻ)</b>
    <p className="mt-1 text-xs opacity-80">የቴሌብር/ባንክ «ገንዘብ ተቀብለዋል» SMS ወደሚደርስበት ስልክ ነጻ የ SMS-forwarder (SMS Forwarder / MacroDroid / Tasker) ይጫኑ። SMS ሲደርስ በ HTTP POST ወደ ታች ያለው አድራሻ እንዲልክ ያድርጉ፤ የሰውነት (JSON)፦ <code>{'{"from":"{sender}","text":"{message}"}'}</code></p>
    <input className="input mt-2 select-all text-xs" readOnly value={d.url} onFocus={e => e.target.select()} />
    <p className="mt-2 text-sm">ተቀባይ SMS፦ <b>{d.count}</b> · የመጨረሻ፦ {when(d.last)}</p>
    {d.recent.length > 0 && <ul className="mt-1 space-y-1 text-xs">{d.recent.map(x => <li key={x.ref} className="rounded-lg bg-slate-100 p-1.5 dark:bg-slate-800">{x.used ? '✔️' : '🕒'} <b>{x.ref}</b> · {x.method} · {x.amount} ብር · {x.payer} · {when(x.ts)}</li>)}</ul>}
    <button className="btn-soft mt-2" onClick={rotate}>🔑 ሚስጥሩን ቀይር</button><Msg>{m}</Msg></div>);
}
function Settings({ o, reload }) {
  const [f, setF] = useState(() => ({ ...o.cfg, plans: o.cfg.plans.map(p => ({ ...p })) })), [m, setM] = useState(''), [ok, setOk] = useState(false);
  const set = (k, v) => setF(x => ({ ...x, [k]: v })), plan = (i, k, v) => setF(x => ({ ...x, plans: x.plans.map((p, j) => (j === i ? { ...p, [k]: v } : p)) }));
  async function save() { const r = await post('/api/ai/admin/config', f); setOk(!!r.ok); setM(r.ok ? '✅ ተቀምጧል' : errText(r.error)); if (r.ok) reload(); }
  const Num = ({ k, l }) => <label className="text-sm font-bold">{l}<input type="number" min="0" className="input mt-1" value={f[k]} onChange={e => set(k, e.target.value)} /></label>;
  return (<div className="space-y-3">
    <SmsCard />
    <div className="card"><div className="flex items-center gap-3"><label className="flex flex-1 items-center gap-2 font-bold"><input type="checkbox" className="h-5 w-5 accent-brand" checked={!!f.enabled} onChange={e => set('enabled', e.target.checked)} />AI ክፍት ነው (ለሁሉም)</label></div>
      <label className="mt-2 flex items-center gap-2 text-sm font-bold"><input type="checkbox" className="h-5 w-5 accent-brand" checked={!!f.paywall} onChange={e => set('paywall', e.target.checked)} />ጥልቅ ርዕስ/ገደብ ሲያልፍ ክፍያ ጠይቅ (ከተዘጋ ሁሉም ነጻ)</label>
      <label className="mt-2 flex items-center gap-2 text-sm font-bold"><input type="checkbox" className="h-5 w-5 accent-brand" checked={!!f.autoApprove} onChange={e => set('autoApprove', e.target.checked)} />🤖 የቴሌብር ክፍያ ከኢትዮ ቴሌኮም ደረሰኝ ጋር ሙሉ ሲመሳሰል በራስ አጽድቅ (ነፃ)</label>
      <label className="mt-2 flex items-center gap-2 text-sm font-bold"><input type="checkbox" className="h-5 w-5 accent-brand" checked={f.requireProof !== false} onChange={e => set('requireProof', e.target.checked)} />ክፍያ ሲጠይቁ ማስረጃ (screenshot/PDF) ግዴታ</label>
      <p className="muted mt-2 text-xs">አቅራቢ፦ {o.ready ? `${o.provider} · ${o.model}` : '⚠️ ቁልፍ አልተቀመጠም (Render ላይ GEMINI_API_KEY ወይም ANTHROPIC_API_KEY)'}</p></div>
    <div className="card"><b>📏 የቀን ገደቦች (ለአንድ ተጠቃሚ)</b><div className="mt-2 grid grid-cols-2 gap-2"><Num k="freeChatDay" l="ነጻ — መልእክት" /><Num k="paidChatDay" l="የተከፈለ — መልእክት" /><Num k="freePagesDay" l="ነጻ — የትርጉም ገጽ" /><Num k="paidPagesDay" l="የተከፈለ — የትርጉም ገጽ" /></div></div>
    <div className="card"><b>💳 እቅዶች እና ዋጋ</b><div className="mt-2 space-y-2">{f.plans.map((p, i) => <div key={i} className="grid grid-cols-[1fr_70px_80px_auto] items-end gap-2"><label className="text-xs font-bold">ስም<input className="input mt-1" value={p.label} onChange={e => plan(i, 'label', e.target.value)} /></label><label className="text-xs font-bold">ቀን<input type="number" className="input mt-1" value={p.days} onChange={e => plan(i, 'days', e.target.value)} /></label><label className="text-xs font-bold">ብር<input type="number" className="input mt-1" value={p.price} onChange={e => plan(i, 'price', e.target.value)} /></label>
      <button className="btn-ghost !px-3" disabled={f.plans.length < 2} onClick={() => setF(x => ({ ...x, plans: x.plans.filter((_, j) => j !== i) }))}>✕</button></div>)}</div>
      <button className="btn-soft mt-2" disabled={f.plans.length >= 8} onClick={() => setF(x => ({ ...x, plans: [...x.plans, { id: 'p' + Date.now().toString(36), label: 'አዲስ እቅድ', days: 30, price: 100 }] }))}>➕ እቅድ ጨምር</button></div>
    <div className="card"><b>🔒 የሚከፈልባቸው ጥልቅ ርዕሶች</b><p className="muted mt-1 text-xs">ነጻ ተጠቃሚ እነዚህን ሲጠይቅ አጭር ከፊል መልስ ተሰጥቶ ክፍያ ይጠየቃል። (አስቸኳይ የጤና አደጋ ሁልጊዜ ነጻ ነው።)</p><textarea className="input mt-2" rows={3} value={f.premiumTopics} onChange={e => set('premiumTopics', e.target.value)} />
      <button type="button" className="muted mt-1 text-xs underline" onClick={() => set('premiumTopics', o.defaults.premiumTopics)}>↺ ነባሪ</button></div>
    <div className="card"><b>👤 ስለ ፈጣሪ (ሲጠየቅ የሚያብራራው)</b><textarea className="input mt-2" rows={3} value={f.creator} onChange={e => set('creator', e.target.value)} /><button type="button" className="muted mt-1 text-xs underline" onClick={() => set('creator', o.defaults.creator)}>↺ ነባሪ</button></div>
    <div className="card"><b>🛍 ስለ ገበያው (ሲጠየቅ የሚያብራራው)</b><textarea className="input mt-2" rows={6} value={f.market} onChange={e => set('market', e.target.value)} /><button type="button" className="muted mt-1 text-xs underline" onClick={() => set('market', o.defaults.market)}>↺ ነባሪ</button>
      <label className="label mt-2">ተጨማሪ መረጃ (ዋጋዎች፣ ማስታወቂያ፣ የእውቂያ…)</label><textarea className="input" rows={3} value={f.extra} onChange={e => set('extra', e.target.value)} /></div>
    <Msg m={m} ok={ok} /><button className="btn-primary w-full" onClick={save}>💾 አስቀምጥ</button></div>);
}

function Users({ o, reload }) {
  const [q, setQ] = useState(''), [days, setDays] = useState(30), [m, setM] = useState('');
  async function go(body) { const r = await post('/api/ai/admin/grant', { q, ...body }); setM(r.ok ? '✅ ተደርጓል' : errText(r.error)); if (r.ok) reload(); }
  return (<div className="space-y-3"><div className="card"><b>🎁 ቀን ስጥ / አግድ</b><label className="label mt-2">የተጠቃሚ ስልክ ወይም ኢሜይል</label><input className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="09… ወይም a@b.com" />
    <div className="mt-2 flex gap-2"><input type="number" className="input !w-24" value={days} onChange={e => setDays(e.target.value)} /><button className="btn-primary flex-1" disabled={!q.trim()} onClick={() => go({ days })}>➕ ቀናት ስጥ</button></div>
    <div className="mt-2 grid grid-cols-3 gap-2"><button className="btn-soft" disabled={!q.trim()} onClick={() => go({ days: 0 })}>↩️ አስወግድ</button><button className="btn-soft" disabled={!q.trim()} onClick={() => go({ blocked: true })}>⛔ አግድ</button><button className="btn-soft" disabled={!q.trim()} onClick={() => go({ blocked: false })}>✅ ፍታ</button></div><Msg m={m} ok={m.startsWith('✅')} /></div>
    {o.users.length === 0 ? <Empty>የተከፈሉ ተጠቃሚዎች የሉም</Empty> : o.users.map(u => <div key={u.uid} className="card !p-3 text-sm"><div className="flex items-center gap-2"><b className="min-w-0 flex-1 truncate">{u.name || u.uid}</b><span className={u.blocked ? 'tag-warn' : u.active ? 'tag' : 'tag-warn'}>{u.blocked ? '⛔ ታግዷል' : u.active ? '✅ ንቁ' : 'ጊዜው አልፏል'}</span></div><p className="muted">{u.phone} {u.email} · እስከ {day(u.until)}</p></div>)}</div>);
}

export default function AdminAI() {
  const [o, setO] = useState(null), [tab, setTab] = useState('reqs'); const load = useCallback(() => get('/api/ai/admin/overview').then(setO), []); useEffect(() => { load(); }, [load]);
  if (!o) return <Spinner />; if (!o.ok) return <p className="msg-err">{errText(o.error)}</p>;
  return (<div className="space-y-3">
    <div className="grid grid-cols-3 gap-2 text-center"><div className="card !p-3"><b className="text-xl">{o.stats.chats}</b><p className="muted text-xs">መልእክቶች (ከጅምር)</p></div><div className="card !p-3"><b className="text-xl">{o.stats.paywalls}</b><p className="muted text-xs">ክፍያ ተጠይቋል</p></div><div className="card !p-3"><b className="text-xl">{o.revenue}</b><p className="muted text-xs">ብር (የጸደቀ)</p></div></div>
    {o.stats.urgent > 0 && <p className="muted text-center text-xs">🩺 ነጻ የተመለሱ አጣዳፊ ጥያቄዎች፦ {o.stats.urgent}</p>}
    <div className="flex gap-2 overflow-x-auto">{[['reqs', `💳 ጥያቄዎች${o.pending ? ' (' + o.pending + ')' : ''}`], ['set', '⚙️ ቅንብር'], ['users', '👥 ተጠቃሚዎች']].map(([k, l]) => <button key={k} className={'chip shrink-0 ' + (tab === k ? '!bg-brand !text-white' : '')} onClick={() => setTab(k)}>{l}</button>)}</div>
    {tab === 'reqs' && <Requests onChange={load} />}{tab === 'set' && <Settings o={o} reload={load} />}{tab === 'users' && <Users o={o} reload={load} />}</div>);
}
