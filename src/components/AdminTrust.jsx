'use client';
/* eslint-disable @next/next/no-img-element */
/* አድሚን፦ የባጅ ጥያቄዎች እና ሪፖርቶች */
import { useCallback, useEffect, useState } from 'react';
import { get, imgUrl, post } from '@/lib/api';
import { errText } from '@/lib/consts';
import { Spinner } from '@/components/ui';

const LINK = { s: '/shop/', w: '/workers/', e: '/employers/', g: '/site/', p: '/p/', j: '/jobs/' };
export default function AdminTrust() {
  const [d, setD] = useState(null), [tab, setTab] = useState('req'), [note, setNote] = useState({}), [err, setErr] = useState('');
  const load = useCallback(() => get('/api/trust/admin/overview').then(setD), []); useEffect(() => { load(); }, [load]);
  if (!d) return <Spinner />; if (!d.ok) return <p className="msg-err">{errText(d.error)}</p>;
  const reqs = d.requests.filter(q => q.status === 'pending'), reps = d.reports.filter(r => r.status === 'open');
  async function reqAct(q, approve) { const r = await post('/api/trust/admin/request/' + q.id, { approve, note: note[q.id] || '' }); if (!r.ok) setErr(errText(r.error)); load(); }
  async function repAct(r, action) { if (action === 'hide' && !confirm('«' + r.name + '» ይደበቅ/ይታገድ?')) return; const x = await post('/api/trust/admin/report/' + r.id, { action, note: note[r.id] || '' }); if (!x.ok) setErr(errText(x.error)); load(); }
  return (
    <div>
      <div className="mb-3 flex gap-2"><button className={tab === 'req' ? 'chip-on' : 'chip'} onClick={() => setTab('req')}>✅ የባጅ ጥያቄ ({reqs.length})</button><button className={tab === 'rep' ? 'chip-on' : 'chip'} onClick={() => setTab('rep')}>🚩 ሪፖርቶች ({reps.length})</button></div>
      {err && <p className="msg-err mb-2">{err}</p>}
      {tab === 'req' && (reqs.length ? reqs.map(q => (
        <div key={q.id} className="card mb-3"><b>{q.label}፦ {q.name}</b><p className="muted">{q.owner.name} · {q.owner.email} · {q.owner.phone}</p>{q.note && <p className="mt-1">{q.note}</p>}
          <div className="my-2 flex flex-wrap gap-2">{q.proof.map(i => <a key={i} href={imgUrl(i)} target="_blank" rel="noopener noreferrer"><img src={imgUrl(i)} alt="ማስረጃ" className="h-24 w-24 rounded-xl object-cover" /></a>)}</div>
          <a className="text-sm font-bold text-brand underline" href={LINK[q.t] + q.targetId} target="_blank" rel="noopener noreferrer">ገጹን ክፈት ↗</a>
          <input className="input mt-2" placeholder="ምክንያት (ውድቅ ሲያደርጉ)" value={note[q.id] || ''} onChange={e => setNote({ ...note, [q.id]: e.target.value })} />
          <div className="mt-2 flex gap-2"><button className="btn-primary flex-1" onClick={() => reqAct(q, true)}>✅ አጽድቅ</button><button className="btn-danger flex-1" onClick={() => reqAct(q, false)}>❌ ውድቅ</button></div></div>)) : <div className="card muted text-center">አዲስ ጥያቄ የለም</div>)}
      {tab === 'rep' && (reps.length ? reps.map(r => (
        <div key={r.id} className="card mb-3"><div className="flex items-start justify-between gap-2"><b>{r.label}፦ {r.name}</b>{r.count > 1 && <span className="tag-bad">🚩 ×{r.count}</span>}</div><p className="muted">{r.reason} · ከ {r.reporter.email || r.reporter.name}</p>{r.note && <p className="mt-1">{r.note}</p>}
          <a className="text-sm font-bold text-brand underline" href={LINK[r.t] + r.targetId} target="_blank" rel="noopener noreferrer">ገጹን ክፈት ↗</a>
          <input className="input mt-2" placeholder="ማስታወሻ (አማራጭ)" value={note[r.id] || ''} onChange={e => setNote({ ...note, [r.id]: e.target.value })} />
          <div className="mt-2 flex gap-2"><button className="btn-ghost flex-1" onClick={() => repAct(r, 'dismiss')}>🙈 አልተረጋገጠም</button><button className="btn-ghost flex-1" onClick={() => repAct(r, 'resolve')}>✔ ተፈትቷል</button><button className="btn-danger flex-1" onClick={() => repAct(r, 'hide')}>⛔ ደብቅ</button></div></div>)) : <div className="card muted text-center">ክፍት ሪፖርት የለም</div>)}
    </div>
  );
}
