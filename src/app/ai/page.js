'use client';
/* 🤖 AI ረዳት (ድረ-ገጽ) — ነጻ ገደብ፣ ጥልቅ መልስ ሲሆን ክፍያ፣ የክፍያ ጥያቄ */
import { useCallback, useEffect, useRef, useState } from 'react';
import { get, post } from '@/lib/api';
import { errText } from '@/lib/consts';
import { Msg, PageTitle, Spinner } from '@/components/ui';
import RequireAuth from '@/components/RequireAuth';

function Pay({ plans, accounts, onDone }) {
  const [p, setP] = useState(plans[0] && plans[0].id), [method, setMethod] = useState(accounts[0] ? accounts[0].method : ''), [ref, setRef] = useState(''), [m, setM] = useState(''), [busy, setBusy] = useState(false);
  const acc = accounts.find(a => a.method === method), pl = plans.find(x => x.id === p);
  async function go(e) { e.preventDefault(); setBusy(true); setM(''); const r = await post('/api/ai/buy', { plan: p, method, ref }); setBusy(false); if (!r.ok) return setM(errText(r.error)); onDone(); }
  return (<form className="card space-y-2 !bg-brand-light dark:!bg-brand/20" onSubmit={go}><b>🔓 ሙሉ መልስ ለማግኘት ይክፈሉ</b>
    <div className="grid gap-2">{plans.map(x => <label key={x.id} className={'flex items-center gap-2 rounded-2xl border p-3 ' + (p === x.id ? 'border-brand bg-white dark:bg-[#101712]' : 'border-line')}><input type="radio" className="accent-brand" checked={p === x.id} onChange={() => setP(x.id)} /><b className="flex-1">{x.label}</b><b className="text-brand">{x.price} ብር</b></label>)}</div>
    <label className="label">የክፍያ መንገድ</label><select className="input" value={method} onChange={e => setMethod(e.target.value)}>{accounts.map(a => <option key={a.method}>{a.method}</option>)}</select>
    {acc && <p className="rounded-xl bg-white p-2 text-sm dark:bg-[#101712]">{acc.method}፦ <b className="select-all">{acc.number}</b>{acc.holder ? ` · ${acc.holder}` : ''}<br />{pl ? <>ከላይ ባለው አካውንት <b>{pl.price} ብር</b> ይላኩ፤ ከዚያ የደረሰኝ ቁጥር ያስገቡ።</> : null}</p>}
    <label className="label">የደረሰኝ / ማጣቀሻ ቁጥር</label><input className="input" required minLength={4} value={ref} onChange={e => setRef(e.target.value)} /><Msg m={m} />
    <button className="btn-primary w-full" disabled={busy || !p}>{busy ? '⏳…' : 'ጥያቄ ላክ'}</button></form>);
}

function Chat() {
  const [inf, setInf] = useState(null), [msgs, setMsgs] = useState([]), [text, setText] = useState(''), [busy, setBusy] = useState(false), [pay, setPay] = useState(false), [accounts, setAccounts] = useState([]), [note, setNote] = useState(''); const end = useRef(null);
  const load = useCallback(() => { get('/api/ai/info').then(setInf); get('/api/market/config').then(c => c && c.ok && setAccounts(c.accounts || [])); }, []); useEffect(() => { load(); }, [load]);
  useEffect(() => { end.current && end.current.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [msgs, busy, pay]);
  async function send(e) {
    e.preventDefault(); const t = text.trim(); if (!t || busy) return; setText(''); setMsgs(m => [...m, { r: 'u', t }]); setBusy(true);
    const r = await post('/api/ai/chat', { text: t }); setBusy(false);
    if (!r.ok) { setMsgs(m => [...m, { r: 'e', t: r.error === 'ai_busy' ? '⏳ AI ሥራ በዝቶበታል — ትንሽ ቆይተው ይሞክሩ።' : r.error === 'ai_disabled' ? '⏸ AI ለጊዜው በአድሚን ተዘግቷል።' : errText(r.error) }]); return; }
    if (r.text) setMsgs(m => [...m, { r: 'a', t: r.text }]); if (r.paywall) { setPay(true); setNote(r.paywall === 'limit' ? '⛔ የዛሬው ነጻ ገደብ አልቋል።' : '🔒 ሙሉ (ጥልቅ) መልስ ለተከፈሉ ተጠቃሚዎች ነው።'); } load();
  }
  if (!inf) return <Spinner />;
  const left = Math.max(0, (inf.free.chat || 0) - ((inf.usage && inf.usage.chat) || 0));
  return (<div className="mx-auto flex max-w-2xl flex-col gap-3">
    <PageTitle sub={inf.admin ? '🛡 አድሚን — ያልተገደበ' : inf.paid ? `✅ የተከፈለ — እስከ ${new Date(inf.until).toISOString().slice(0, 10)}` : `🆓 ነጻ — ዛሬ ${left} መልእክት ቀርቷል`}>🤖 AI ረዳት</PageTitle>
    {!inf.ready && <p className="msg-err">AI ገና አልተዘጋጀም።</p>}
    {inf.pending && <p className="msg-ok">⏳ ክፍያዎ እየተረጋገጠ ነው።</p>}{inf.last && inf.last.status === 'rejected' && !inf.pending && <p className="msg-err">ያለፈው ክፍያ አልተረጋገጠም{inf.last.reason ? '፦ ' + inf.last.reason : ''}</p>}
    <div className="card min-h-[40vh] space-y-3">{msgs.length === 0 && <p className="muted text-center">ማንኛውንም ጥያቄ ይጻፉ — ስለ ትምህርት፣ ትርጉም፣ ንግድ፣ ወይም ስለ ገበያው። (PDF/PowerPoint ለማስተረጎም በ Telegram ቦት ይላኩ።)</p>}
      {msgs.map((m, i) => <div key={i} className={'max-w-[92%] whitespace-pre-wrap rounded-2xl px-3 py-2 ' + (m.r === 'u' ? 'ml-auto bg-brand text-white' : m.r === 'e' ? 'bg-red-50 text-red-700' : 'bg-brand-light dark:bg-brand/20')}>{m.t}</div>)}
      {busy && <p className="muted">⏳ እየመለሰ ነው…</p>}<div ref={end} /></div>
    {pay && !inf.paid && !inf.pending && inf.plans && <><p className="msg-err">{note}</p><Pay plans={inf.plans} accounts={accounts} onDone={() => { setPay(false); load(); }} /></>}
    <form className="sticky bottom-20 flex gap-2 md:bottom-4" onSubmit={send}><input className="input flex-1" value={text} onChange={e => setText(e.target.value)} placeholder="ጥያቄዎን ይጻፉ…" maxLength={4000} /><button className="btn-primary" disabled={busy || !text.trim()}>ላክ</button></form></div>);
}
export default function Page() { return <RequireAuth><Chat /></RequireAuth>; }
