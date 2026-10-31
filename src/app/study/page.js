'use client';
/* 🎓 የተማሪዎች መማሪያ — ካታሎግ፣ ክፍያ፣ የእኔ ፋይሎች (ንባብ በ Telegram mini app ብቻ) */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { get, post } from '@/lib/api';
import { errText } from '@/lib/consts';
import { useApp } from '@/lib/app';
import { Empty, Msg, PageTitle, Spinner } from '@/components/ui';

const ST = { pending: ['⏳ ክፍያ እየተረጋገጠ ነው', 'tag-warn'], approved: ['✅ ጸድቋል', 'tag'], rejected: ['❌ ውድቅ', 'tag-warn'] };
const ICO = { 'አጭር ማስታወሻ': '📝', 'ጥያቄዎች': '❓', 'ፒፒቲ': '📊', PDF: '📕', 'ሰነድ': '📄' };

function Buy({ it, student, accounts, onDone, onClose }) {
  const [f, setF] = useState({ name: '', phone: '', method: (accounts[0] && accounts[0].method) || '', ref: '', note: '' }), [m, setM] = useState(''), [busy, setBusy] = useState(false);
  const free = !it.price;
  async function go(e) { e.preventDefault(); setBusy(true); setM(''); const r = await post('/api/learn/buy', { deck: it.id, ...f }); setBusy(false); if (!r.ok) return setM(errText(r.error)); onDone(r.status); }
  const acc = accounts.find(a => a.method === f.method);
  return (<form className="card mt-2 space-y-2 !bg-brand-light dark:!bg-brand/20" onSubmit={go}>
    <b>{free ? '🆓 ነጻ ፋይል — ያግኙ' : `💳 ${it.price} ብር ይክፈሉ`}</b>
    {!student && <><label className="label">ሙሉ ስም (የመጀመሪያ ስምዎ ለመግቢያ ይሆናል)</label><input className="input" required minLength={2} value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="ለምሳሌ፦ ሰላም ተስፋዬ" /></>}
    <label className="label">ስልክ</label><input className="input" inputMode="tel" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} placeholder="09…" />
    {!free && <>
      <label className="label">የክፍያ መንገድ</label><select className="input" value={f.method} onChange={e => setF({ ...f, method: e.target.value })}>{accounts.map(a => <option key={a.method}>{a.method}</option>)}</select>
      {acc && <p className="rounded-xl bg-white p-2 text-sm dark:bg-[#101712]">{acc.method}፦ <b className="select-all">{acc.number}</b>{acc.holder ? ` · ${acc.holder}` : ''}<br />ከላይ ባለው አካውንት <b>{it.price} ብር</b> ይላኩ፤ ከዚያ የደረሰኝ ቁጥር ያስገቡ።</p>}
      <label className="label">የደረሰኝ / ማጣቀሻ ቁጥር</label><input className="input" required minLength={4} value={f.ref} onChange={e => setF({ ...f, ref: e.target.value })} /></>}
    <Msg m={m} /><div className="grid grid-cols-2 gap-2"><button className="btn-primary" disabled={busy}>{busy ? '⏳…' : free ? 'ያግኙ' : 'ጥያቄ ላክ'}</button><button type="button" className="btn-ghost" onClick={onClose}>ዝጋ</button></div></form>);
}

function Study() {
  const { user, isAdmin } = useApp(), [cat, setCat] = useState(null), [my, setMy] = useState(null), [accounts, setAccounts] = useState([]), [sel, setSel] = useState(''), [msg, setMsg] = useState(''), [flt, setFlt] = useState('');
  const load = useCallback(() => { get('/api/learn/catalog').then(setCat); if (user && !isAdmin) { get('/api/learn/my').then(setMy); get('/api/market/config').then(c => c && c.ok && setAccounts(c.accounts || [])); } }, [user, isAdmin]);
  useEffect(() => { load(); }, [load]);
  if (!cat) return <Spinner />;
  const have = Object.fromEntries(((my && my.items) || []).filter(x => x.status !== 'rejected').map(x => [x.deck, x]));
  const items = cat.items.filter(x => !flt || x.cat === flt);
  return (<div className="mx-auto max-w-2xl space-y-3">
    <PageTitle sub="አጫጭር ማስታወሻዎች፣ ጥያቄዎች፣ ፒፒቲ፣ PDF እና ሰነዶች — ክፍያ ከጸደቀ በኋላ በተሰጠዎት ስም እና ID በ Telegram ብቻ ያነባሉ">🎓 የተማሪዎች መማሪያ</PageTitle>
    {my && my.student && <div className="card !bg-brand-light dark:!bg-brand/20"><p className="font-bold">🪪 የእርስዎ መግቢያ</p><p className="mt-1">ስም፦ <b>{my.student.name}</b> · ID፦ <b className="select-all">{my.student.sid}</b></p>
      <p className="muted mt-1">ፋይሎችዎን ለመክፈት በ Telegram ውስጥ ይህን ስም እና ID ያስገቡ።</p>{my.home && <a href={my.home} className="btn-primary mt-2 w-full">📚 ሁሉንም ፋይሎቼን በ Telegram ክፈት</a>}</div>}
    {my && my.items.length > 0 && <div className="card"><b>📥 የእኔ ጥያቄዎች</b><div className="mt-2 divide-y divide-line dark:divide-[#25352c]">{my.items.map(x => <div key={x.id} className="py-2 text-sm"><div className="flex items-center gap-2"><b className="min-w-0 flex-1 truncate">{x.title}</b><span className={ST[x.status][1]}>{ST[x.status][0]}</span></div>
      {x.status === 'approved' && x.link && <a href={x.link} className="btn-soft mt-2 w-full">📖 በ Telegram ክፈት</a>}{x.status === 'rejected' && x.reason && <p className="muted mt-1">ምክንያት፦ {x.reason}</p>}</div>)}</div></div>}
    <Msg m={msg} ok />
    {cat.cats && cat.items.length > 0 && <div className="flex gap-2 overflow-x-auto pb-1"><button className={'chip ' + (!flt ? '!bg-brand !text-white' : '')} onClick={() => setFlt('')}>ሁሉም</button>{cat.cats.filter(c => cat.items.some(x => x.cat === c)).map(c => <button key={c} className={'chip ' + (flt === c ? '!bg-brand !text-white' : '')} onClick={() => setFlt(c)}>{ICO[c]} {c}</button>)}</div>}
    {items.length === 0 && <Empty><p className="text-3xl">📚</p><p className="mt-1 font-bold">እስካሁን የሚሸጥ ፋይል የለም</p></Empty>}
    {items.map(it => { const h = have[it.id]; return (<div key={it.id} className="card"><div className="flex items-start gap-3"><span className="text-3xl">{ICO[it.cat] || '📖'}</span><div className="min-w-0 flex-1"><b>{it.title}</b>{it.desc && <p className="muted mt-0.5 text-sm">{it.desc}</p>}<p className="muted mt-1 text-xs">{it.cat ? it.cat + ' · ' : ''}{it.slides} ገጾች</p></div><b className="shrink-0 text-brand">{it.price ? it.price + ' ብር' : 'ነጻ'}</b></div>
      {h ? <p className="mt-2 text-sm font-bold">{ST[h.status][0]}</p> : !user ? <Link className="btn-primary mt-3 w-full" href="/login?next=/study">ለመግዛት ይግቡ</Link> : isAdmin ? null : sel === it.id ? <Buy it={it} student={my && my.student} accounts={accounts} onClose={() => setSel('')} onDone={s => { setSel(''); setMsg(s === 'approved' ? '✅ ተመዝግበዋል — ከላይ መግቢያዎን ይመልከቱ።' : '✅ ጥያቄዎ ተልኳል። ክፍያው ሲረጋገጥ በ Telegram እና እዚህ ይነገርዎታል።'); load(); }} /> : <button className="btn-primary mt-3 w-full" onClick={() => setSel(it.id)}>{it.price ? '💳 ግዛ' : '🆓 ያግኙ'}</button>}</div>); })}
    <p className="muted text-center text-xs">🔒 ፋይሎቹ በ Telegram mini app ውስጥ ብቻ ይነበባሉ፤ አይወርዱም፣ አይገለበጡም።</p></div>);
}
export default function Page() { return <Study />; }
