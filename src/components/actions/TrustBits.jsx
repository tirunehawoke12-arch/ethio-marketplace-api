'use client';
/* ሪፖርት 🚩 · ግምገማ ⭐ (ሙያተኛ/አሰሪ) · የባጅ ጥያቄ ✅ */
import { useEffect, useState } from 'react';
import { get, post } from '@/lib/api';
import { errText } from '@/lib/consts';
import { Msg, Stars, Spinner } from '@/components/ui';
import ImageInput from '@/components/ImageInput';
import { useApp } from '@/lib/app';

const REASONS = ['ማጭበርበር ወይም አጠራጣሪ', 'የተሳሳተ መረጃ', 'ተገቢ ያልሆነ ይዘት', 'የሌላ ሰው ንብረት/ስም መጠቀም', 'ሌላ'];
export function ReportBtn({ t, id }) {
  const { user } = useApp(); const [open, setOpen] = useState(false), [reason, setReason] = useState(REASONS[0]), [note, setNote] = useState(''), [m, setM] = useState(''), [done, setDone] = useState(false), [busy, setBusy] = useState(false);
  if (done) return <p className="muted mt-4 text-center">🚩 ሪፖርትዎ ደርሷል — እናመሰግናለን፤ አድሚን ይመለከተዋል።</p>;
  if (!open) return <div className="mt-6 text-center"><button className="text-sm font-bold text-mute underline" onClick={() => setOpen(true)}>🚩 ይህን አጠራጣሪ ነገር ሪፖርት አድርግ</button></div>;
  if (!user) return <p className="muted mt-4 text-center">ሪፖርት ለማድረግ መጀመሪያ ይግቡ።</p>;
  async function send() { setBusy(true); setM(''); const r = await post('/api/trust/report', { t, id, reason, note }); setBusy(false); r.ok ? setDone(true) : setM(errText(r.error)); }
  return (
    <div className="card mt-6 space-y-2"><b>🚩 ሪፖርት</b>
      <select className="input" value={reason} onChange={e => setReason(e.target.value)}>{REASONS.map(r => <option key={r}>{r}</option>)}</select>
      <textarea rows={3} className="input" placeholder="ዝርዝር (አማራጭ)" value={note} onChange={e => setNote(e.target.value)} />
      <Msg m={m} /><div className="flex gap-2"><button className="btn-primary flex-1" disabled={busy} onClick={send}>{busy ? '⏳…' : 'ላክ'}</button><button className="btn-ghost" onClick={() => setOpen(false)}>ተው</button></div>
    </div>
  );
}
/** ለሙያተኛ (t='w') ወይም አሰሪ (t='e') — እውነተኛ ግንኙነት (ቅጥር/ዝርዝር) ሲኖር ብቻ ማስገባት ይቻላል */
export function PeopleReviews({ t, id }) {
  const { user } = useApp(); const [d, setD] = useState(null), [rating, setRating] = useState(5), [text, setText] = useState(''), [m, setM] = useState(''), [busy, setBusy] = useState(false), [show, setShow] = useState(false);
  const load = () => get(`/api/trust/reviews/${t}/${id}`).then(setD); useEffect(() => { load(); }, [t, id]); // eslint-disable-line react-hooks/exhaustive-deps
  async function send() { setBusy(true); setM(''); const r = await post(`/api/trust/reviews/${t}/${id}`, { rating, text }); setBusy(false); if (!r.ok) return setM(errText(r.error)); setShow(false); setText(''); load(); }
  if (!d) return <Spinner />; if (!d.ok) return null;
  return (
    <section className="card mt-4"><div className="flex items-center justify-between gap-2"><h2 className="text-lg">⭐ ግምገማዎች {d.n > 0 && <span className="muted">({d.avg} · {d.n})</span>}</h2>{user && !show && <button className="btn-ghost !min-h-[40px]" onClick={() => setShow(true)}>✍️ ገምግም</button>}</div>
      {show && <div className="mt-3 space-y-2 rounded-2xl bg-brand-light p-3 dark:bg-[#1b2b22]"><div className="flex gap-1 text-3xl">{[1, 2, 3, 4, 5].map(n => <button key={n} type="button" aria-label={n + ' ኮከብ'} onClick={() => setRating(n)} className={n <= rating ? 'text-gold' : 'text-line'}>★</button>)}</div><textarea rows={3} className="input" placeholder="ተሞክሮዎን ይጻፉ" value={text} onChange={e => setText(e.target.value)} /><p className="muted">ማስታወሻ፦ ከዚህ ሰው ጋር እውነተኛ ቅጥር ወይም የዝርዝር ግንኙነት ካለ ብቻ መገምገም ይቻላል።</p><Msg m={m} /><div className="flex gap-2"><button className="btn-primary flex-1" disabled={busy} onClick={send}>{busy ? '⏳…' : 'አስገባ'}</button><button className="btn-ghost" onClick={() => setShow(false)}>ተው</button></div></div>}
      {d.items.length ? <ul className="mt-3 divide-y divide-line dark:divide-[#25352c]">{d.items.map((r, i) => <li key={i} className="py-2.5"><div className="flex items-center gap-2"><Stars n={r.rating} /><b className="text-sm">{r.who}</b><span className="muted text-xs">{new Date(r.ts).toLocaleDateString('am-ET')}</span></div>{r.text && <p className="mt-1 whitespace-pre-wrap break-words">{r.text}</p>}</li>)}</ul> : !show && <p className="muted mt-2">እስካሁን ግምገማ የለም</p>}
    </section>
  );
}
/** በ «ገጾቼ» ውስጥ — ባለቤቱ ለራሱ ሱቅ/ሙያ/አሰሪ/ገጽ ባጅ ይጠይቃል */
export function VerifyRequest() {
  const [d, setD] = useState(null), [pick, setPick] = useState(''), [proof, setProof] = useState([]), [note, setNote] = useState(''), [m, setM] = useState(''), [busy, setBusy] = useState(false);
  const load = () => get('/api/trust/my').then(setD); useEffect(() => { load(); }, []);
  if (!d || !d.ok || !d.targets.length) return null;
  const ST = { pending: '⏳ በግምገማ ላይ', approved: '✅ ጸድቋል', rejected: '❌ አልተቀበለም' };
  async function send() { const [t, id] = pick.split(':'); setBusy(true); setM(''); const r = await post('/api/trust/request', { t, id, proof, note }); setBusy(false); if (!r.ok) return setM(errText(r.error)); setM('✅ ጥያቄዎ ተልኳል'); setPick(''); setProof([]); setNote(''); load(); }
  const todo = d.targets.filter(x => !x.verified);
  return (
    <div className="card"><div className="flex items-center gap-3"><span className="text-3xl">✅</span><div className="min-w-0 flex-1"><b>የተረጋገጠ ባጅ</b><p className="muted">ደንበኞች ይበልጥ ያምኑዎታል፤ በገበያ ላይም ይለያሉ</p></div></div>
      <ul className="mt-2 space-y-1 text-sm">{d.targets.map(x => <li key={x.t + x.id}>{x.verified ? '✅' : '○'} {x.label}፦ <b>{x.name}</b>{x.verified ? ' — የተረጋገጠ' : ''}</li>)}</ul>
      {d.requests.slice(0, 3).map(q => <p key={q.id} className="muted mt-1">{ST[q.status]}{q.note ? ' — ' + q.note : ''}</p>)}
      {todo.length > 0 && <div className="mt-3 space-y-2"><select className="input" value={pick} onChange={e => setPick(e.target.value)}><option value="">ለየትኛው ባጅ ይጠይቃሉ?</option>{todo.map(x => <option key={x.t + x.id} value={x.t + ':' + x.id}>{x.label} — {x.name}</option>)}</select>
        {pick && <><ImageInput label="ማስረጃ ፎቶ (የንግድ ፈቃድ፣ መታወቂያ፣ የሱቅ ፎቶ…) *" value={proof} onChange={setProof} max={4} /><input className="input" placeholder="ማብራሪያ (አማራጭ)" value={note} onChange={e => setNote(e.target.value)} /><p className="muted">ማስረጃው ለአድሚን ብቻ ይታያል።</p><button className="btn-primary w-full" disabled={busy || !proof.length} onClick={send}>{busy ? '⏳…' : '✅ ባጅ ጠይቅ'}</button></>}
        <Msg m={m} ok={m.startsWith('✅')} /></div>}
    </div>
  );
}
