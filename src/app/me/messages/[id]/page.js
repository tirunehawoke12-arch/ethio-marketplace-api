'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import RequireAuth from '@/components/RequireAuth';
import { get, post } from '@/lib/api';
import { errText } from '@/lib/consts';
import { Msg, Spinner } from '@/components/ui';

const LINK = { s: '/shop/', p: '/p/', w: '/workers/', e: '/employers/', j: '/jobs/', g: '/site/' };
function Thread({ id }) {
  const [d, setD] = useState(null), [text, setText] = useState(''), [m, setM] = useState(''), [busy, setBusy] = useState(false), end = useRef(null), last = useRef(0);
  const load = useCallback(() => get('/api/chat/thread/' + id).then(r => { if (!r.ok) return setM(errText(r.error)); setD(r); }), [id]);
  useEffect(() => { load(); const t = setInterval(() => document.visibilityState === 'visible' && load(), 7000); return () => clearInterval(t); }, [load]);
  useEffect(() => { if (d && d.items.length !== last.current) { last.current = d.items.length; end.current && end.current.scrollIntoView({ block: 'end' }); } }, [d]);
  async function send(e) { e.preventDefault(); const v = text.trim(); if (!v) return; setBusy(true); setM(''); const r = await post('/api/chat/thread/' + id, { text: v }); setBusy(false); if (!r.ok) return setM(errText(r.error)); setText(''); load(); }
  async function block() { const b = !(d.thread.youBlocked); if (b && !confirm('ይህ ሰው መልእክት እንዳይልክልዎ ይታገድ?')) return; await post(`/api/chat/thread/${id}/block`, { block: b }); load(); }
  if (!d) return m ? <p className="msg-err">{m}</p> : <Spinner />;
  const t = d.thread, closed = t.blocked || t.youBlocked;
  return (
    <div className="mx-auto flex max-w-2xl flex-col" style={{ minHeight: 'calc(100vh - 220px)' }}>
      <div className="card mb-3 flex items-center gap-3 !p-3"><Link href="/me/messages" aria-label="ተመለስ" className="text-xl">←</Link><div className="min-w-0 flex-1"><b className="block truncate">{t.label}</b>{t.ctx && <Link className="muted block truncate underline" href={(LINK[t.ctx.t] || '/') + t.ctx.id}>{t.ctx.kind}፦ {t.ctx.title}</Link>}</div><button onClick={block} className="text-xs font-bold text-mute underline">{t.youBlocked ? 'ፍቀድ' : '🚫 እገድ'}</button></div>
      <p className="mb-2 rounded-2xl bg-amber-50 p-2.5 text-center text-xs font-bold text-amber-800 dark:bg-amber-900/30 dark:text-amber-200">🔒 ለደህንነትዎ ክፍያ እና ውል በመድረኩ ውስጥ ያድርጉ። የባንክ መረጃ ወይም የይለፍ ቃል ለማንም አይስጡ።</p>
      <div className="flex-1 space-y-2 pb-3">{d.items.length ? d.items.map(x => (
        <div key={x.id} className={'flex ' + (x.mine ? 'justify-end' : 'justify-start')}><div className={'max-w-[82%] rounded-3xl px-4 py-2.5 ' + (x.mine ? 'rounded-br-lg bg-brand text-white' : 'rounded-bl-lg bg-white shadow-soft dark:bg-[#16211b]')}><p className="whitespace-pre-wrap break-words">{x.text}</p><p className={'mt-0.5 text-right text-[10px] ' + (x.mine ? 'text-white/70' : 'text-mute')}>{new Date(x.ts).toLocaleTimeString('am-ET', { hour: '2-digit', minute: '2-digit' })}</p></div></div>)) : <p className="muted py-10 text-center">👋 ሰላምታ ይላኩ — ውይይቱን ይጀምሩ</p>}<div ref={end} /></div>
      {closed ? <p className="msg-err">🚫 ይህ ውይይት ተዘግቷል</p> : (
        <form onSubmit={send} className="sticky bottom-24 flex items-end gap-2 md:bottom-4"><textarea rows={1} className="input !rounded-3xl" maxLength={1000} placeholder="መልእክት ይጻፉ…" value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(e); } }} /><button className="btn-primary !min-h-[48px] !px-5" disabled={busy || !text.trim()} aria-label="ላክ">➤</button></form>)}
      <Msg m={m} />
    </div>
  );
}
export default function Page({ params }) { return <RequireAuth><Thread id={params.id} /></RequireAuth>; }
