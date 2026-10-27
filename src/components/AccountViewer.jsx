'use client';
/* eslint-disable @next/next/no-img-element */
/* አድሚን፦ የአንድ አካውንት ሙሉ እይታ — ክፍል በክፍል (እያንዳንዱ እይታ በኦዲት መዝገብ ይጻፋል) */
import { useCallback, useEffect, useState } from 'react';
import { get, imgUrl } from '@/lib/api';
import { errText } from '@/lib/consts';
import { Spinner } from '@/components/ui';

const TABS = [['account', '👤', 'መገለጫ'], ['pages', '🌐', 'ገጽ'], ['shop', '🏪', 'ሱቅ'], ['orders', '📦', 'ትዕዛዝ'], ['work', '🧑‍🔧', 'ሙያ'], ['employer', '🏢', 'አሰሪ'], ['messages', '💬', 'መልእክት'], ['audit', '📜', 'መዝገብ']];
const IMG = /^(logo|cover|photo|gallery|imgs|image|images|license|avatar|idPhoto)$/i, WHEN = /^(ts|upd|created|at)$/i;
const isImgId = v => typeof v === 'string' && /^[\w-]{8,24}$/.test(v);
const label = k => ({ uid: 'መለያ', email: 'ኢሜይል', phone: 'ስልክ', name: 'ስም', fullName: 'ሙሉ ስም', status: 'ሁኔታ', title: 'ርዕስ', price: 'ዋጋ', total: 'ድምር', address: 'አድራሻ', city: 'ከተማ', region: 'ክልል', about: 'መግለጫ' }[k] || k);

function Val({ k, v }) {
  if (v === null || v === undefined || v === '') return <span className="muted">—</span>;
  if (IMG.test(k)) { const ids = (Array.isArray(v) ? v : [v]).filter(isImgId); if (ids.length) return <span className="flex flex-wrap gap-2">{ids.map(i => <a key={i} href={imgUrl(i)} target="_blank" rel="noopener noreferrer"><img src={imgUrl(i)} alt="" loading="lazy" className="h-16 w-16 rounded-xl object-cover" /></a>)}</span>; }
  if (WHEN.test(k) && typeof v === 'number') return <span>{new Date(v).toLocaleString('am-ET')}</span>;
  if (typeof v === 'boolean') return <b>{v ? 'አዎ' : 'አይደለም'}</b>;
  if (typeof v !== 'object') return <span className="whitespace-pre-wrap break-words">{String(v)}</span>;
  return <Tree data={v} />;
}
function Tree({ data, depth = 0 }) {
  const [open, setOpen] = useState(depth < 1);
  if (Array.isArray(data) && !data.length) return <span className="muted">— ባዶ —</span>;
  if (Array.isArray(data) && data.every(x => x === null || typeof x !== 'object')) return <span className="break-words">{data.join('፣ ')}</span>;
  const entries = Array.isArray(data) ? data.map((x, i) => [String(i + 1), x]) : Object.entries(data);
  if (!entries.length) return <span className="muted">— ባዶ —</span>;
  if (!open) return <button className="chip !py-1 text-sm" onClick={() => setOpen(true)}>👁 ክፈት ({entries.length})</button>;
  return (
    <div className={'space-y-1.5 ' + (depth ? 'rounded-2xl border border-line p-2 dark:border-[#25352c]' : '')}>
      {depth > 0 && <button className="chip !py-1 text-sm" onClick={() => setOpen(false)}>🙈 አሳንስ</button>}
      {entries.map(([k, v]) => (<div key={k} className="grid gap-0.5 sm:grid-cols-[150px_1fr] sm:gap-3"><dt className="muted break-words text-sm font-bold">{label(k)}</dt><dd className="min-w-0 text-[15px]"><Val k={k} v={v} /></dd></div>))}
    </div>
  );
}
function Block({ title, children, count }) {
  const [open, setOpen] = useState(true);
  return (<section className="card !p-0 overflow-hidden"><button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between gap-2 bg-brand-light px-4 py-3 text-left font-extrabold dark:bg-[#1b2b22]"><span>{title}{count != null ? ` (${count})` : ''}</span><span>{open ? '🙈' : '👁'}</span></button>{open && <div className="p-3">{children}</div>}</section>);
}
const SecView = ({ id, d }) => {
  const s = d.sections[id]; if (!s) return null;
  if (id === 'account') return <Block title="👤 መገለጫ"><Tree data={{ ...s.acct, suspended: s.suspended, telegram: s.telegram }} /><h3 className="mt-3 font-extrabold">🔒 የግል መረጃ</h3>{s.private ? <Tree data={s.private} /> : <p className="muted">አልሞላም</p>}{s.prefs && <><h3 className="mt-3 font-extrabold">⚙️ ምርጫዎች</h3><Tree data={s.prefs} /></>}</Block>;
  return Object.entries(s).map(([k, v]) => <Block key={k} title={{ pages: '🌐 ገጾቼ (የግል መስኮችን ጨምሮ)', received: '📬 የደረሱ መልሶች', sent: '📤 የላካቸው መልሶች', shops: '🏪 ሱቆች', products: '🛍 ዕቃዎች', reviews: '⭐ ግምገማዎች', asBuyer: '🛒 እንደ ገዥ', asSeller: '📦 እንደ ሻጭ', worker: '🧑‍🔧 ሙያ ገጽ', applications: '📄 ማመልከቻዎች', employer: '🏢 አሰሪ ገጽ', jobs: '💼 ሥራዎች', applicants: '👥 አመልካቾች', threads: '💬 ውይይቶች' }[k] || k} count={Array.isArray(v) ? v.length : undefined}>{v && (!Array.isArray(v) || v.length) ? <Tree data={v} depth={Array.isArray(v) ? 0 : 1} /> : <p className="muted">ምንም የለም</p>}</Block>);
};
function Audit({ uid }) {
  const [d, setD] = useState(null); useEffect(() => { get('/api/admin/audit?uid=' + uid).then(setD); }, [uid]);
  if (!d) return <Spinner />; if (!d.ok) return <p className="msg-err">{errText(d.error)}</p>;
  return <Block title="📜 የዚህ አካውንት የኦዲት መዝገብ" count={d.items.length}>{d.items.length ? <ul className="divide-y divide-line dark:divide-[#25352c]">{d.items.map(x => <li key={x.id} className="py-2 text-sm"><b>{x.action}</b>{x.section ? ` · ${x.section}` : ''} <span className="muted">· {new Date(x.ts).toLocaleString('am-ET')}</span></li>)}</ul> : <p className="muted">ምንም አልተመዘገበም</p>}</Block>;
}
export default function AccountViewer({ uid, head, onBack }) {
  const [tab, setTab] = useState('account'), [cache, setCache] = useState({}), [err, setErr] = useState('');
  const load = useCallback(async t => { if (t === 'audit' || cache[t]) return; const r = await get(`/api/admin/account/${uid}/full?section=${t}`); if (!r.ok) return setErr(errText(r.error)); setErr(''); setCache(c => ({ ...c, [t]: r })); }, [uid, cache]);
  useEffect(() => { load(tab); }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps
  const d = cache[tab];
  return (
    <div className="space-y-3">
      <button className="btn-ghost w-full" onClick={onBack}>← ወደ አካውንቶች ተመለስ</button>
      {head}
      <p className="msg-ok text-sm">🔐 ይህን አካውንት ማየትዎ በኦዲት መዝገብ ይጻፋል። የይለፍ ቃል (hash) ፈጽሞ አይታይም።</p>
      <div className="sticky top-[62px] z-30 -mx-3 flex gap-2 overflow-x-auto bg-bg/90 px-3 py-2 backdrop-blur dark:bg-[#0d1511]/90">{TABS.map(([k, i, t]) => <button key={k} className={tab === k ? 'chip-on' : 'chip'} onClick={() => setTab(k)}>{i} {t}</button>)}</div>
      {err && <p className="msg-err">{err}</p>}
      {tab === 'audit' ? <Audit uid={uid} /> : d ? <SecView id={tab} d={d} /> : !err && <Spinner />}
    </div>
  );
}
