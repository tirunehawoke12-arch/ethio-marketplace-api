'use client';
/* አድሚን፦ የመማሪያ ፋይሎች + የክፍያ ጥያቄዎች */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { get, post } from '@/lib/api';
import { errText } from '@/lib/consts';
import { Empty, Msg, Spinner } from '@/components/ui';

const when = t => (t ? new Date(t).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '');
function Requests({ onChange }) {
  const [st, setSt] = useState('pending'), [d, setD] = useState(null), [m, setM] = useState('');
  const load = useCallback(() => get('/api/learn/admin/requests?status=' + st).then(setD), [st]); useEffect(() => { load(); }, [load]);
  async function act(id, a) { const reason = a === 'reject' ? (window.prompt('ምክንያት (አማራጭ)') || '') : ''; if (a === 'reject' && reason === null) return; const r = await post(`/api/learn/admin/requests/${id}/${a}`, { reason }); setM(r.ok ? (a === 'approve' ? '✅ ጸድቋል — ID፦ ' + r.sid : '❌ ውድቅ ተደርጓል') : errText(r.error)); load(); onChange && onChange(); }
  return (<div className="space-y-2"><div className="flex gap-2">{[['pending', '⏳ የሚጠብቁ'], ['approved', '✅ የጸደቁ'], ['rejected', '❌ ውድቅ']].map(([k, l]) => <button key={k} className={'chip ' + (st === k ? '!bg-brand !text-white' : '')} onClick={() => setSt(k)}>{l}{k === 'pending' && d && d.pending ? ` (${d.pending})` : ''}</button>)}</div>
    <Msg m={m} ok={m.startsWith('✅')} />{!d ? <Spinner /> : d.items.length === 0 ? <Empty>ምንም የለም</Empty> : d.items.map(r => <div key={r.id} className="card !p-3 text-sm">
      <div className="flex justify-between gap-2"><b>🎓 {r.name}</b><b className="text-brand">{r.price} ብር</b></div><p className="muted">📖 {r.title} · 📞 {r.phone || '—'} · {when(r.ts)}</p>
      {r.price > 0 && <p className="mt-1 rounded-xl bg-brand-light p-2 dark:bg-brand/20">💳 <b>{r.method}</b> · ማጣቀሻ፦ <b>{r.ref}</b> {r.note}</p>}{r.sid && <p className="mt-1">🆔 <b>{r.sid}</b></p>}{r.reason && <p className="muted">ምክንያት፦ {r.reason}</p>}
      {r.status === 'pending' && <div className="mt-2 grid grid-cols-2 gap-2"><button className="btn-primary" onClick={() => act(r.id, 'approve')}>✅ አጽድቅ</button><button className="btn-ghost !text-red-700" onClick={() => act(r.id, 'reject')}>❌ ውድቅ</button></div>}</div>)}</div>);
}
export default function AdminLearn() {
  const [d, setD] = useState(null), [title, setTitle] = useState(''), [m, setM] = useState(''), [tab, setTab] = useState('files');
  const load = useCallback(() => get('/api/learn/decks').then(setD), []); useEffect(() => { load(); }, [load]);
  async function add() { const r = await post('/api/learn/decks', { title }); if (!r.ok) return setM(errText(r.error)); location.href = '/admin/learn/' + r.id; }
  if (!d) return <Spinner />; if (!d.ok) return <p className="msg-err">{errText(d.error)}</p>;
  return (<div className="space-y-3"><div className="flex gap-2"><button className={'chip ' + (tab === 'files' ? '!bg-brand !text-white' : '')} onClick={() => setTab('files')}>📖 ፋይሎች ({d.items.length})</button><button className={'chip ' + (tab === 'reqs' ? '!bg-brand !text-white' : '')} onClick={() => setTab('reqs')}>💳 የክፍያ ጥያቄዎች</button></div>
    {tab === 'reqs' ? <Requests /> : <>
      <div className="card"><b>➕ አዲስ ፋይል</b><div className="mt-2 flex gap-2"><input className="input" placeholder="ርዕስ (ለምሳሌ፦ ባዮሎጂ 9ኛ ክፍል — አጭር ማስታወሻ)" value={title} onChange={e => setTitle(e.target.value)} /><button className="btn-primary" disabled={title.trim().length < 2} onClick={add}>ፍጠር</button></div><Msg m={m} /></div>
      {d.items.length === 0 && <Empty>እስካሁን ፋይል የለም</Empty>}
      {d.items.map(x => <Link key={x.id} href={'/admin/learn/' + x.id} className="card block transition hover:shadow-soft"><div className="flex items-center gap-2"><b className="min-w-0 flex-1 truncate">📖 {x.title}</b><span className={x.isOpen ? 'tag' : 'tag-warn'}>{x.status !== 'on' ? 'ዝግ' : x.isOpen ? 'ክፍት' : 'ከመስኮት ውጭ'}</span></div>
        <p className="muted mt-1">{x.cat ? x.cat + ' · ' : ''}{x.price ? x.price + ' ብር' : 'ነጻ'}{x.listed ? ' · 🛒 በካታሎግ' : ''} · {x.slides} ገጽ · {x.students} ተማሪ</p></Link>)}</>}</div>);
}
