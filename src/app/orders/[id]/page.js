'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ETB, get, post } from '@/lib/api';
import { PAY, errText, stepLabel } from '@/lib/consts';
import { Input, Msg, Select, Spinner, Stars } from '@/components/ui';
import { OrderStepper } from '@/components/Stepper';
import RequireAuth from '@/components/RequireAuth';

function Order({ id }) {
  const [o, setO] = useState(null); const [cfg, setCfg] = useState({ accounts: [] }); const [m, setM] = useState(''); const [f, setF] = useState({ method: PAY[0], ref: '', note: '', reason: '', rate: 0, text: '' });
  const load = useCallback(async () => { const [r, c] = await Promise.all([get('/api/market/my/orders'), get('/api/market/config')]); setO((r.orders || []).find(x => x.id === id) || false); if (c.ok) setCfg(c); }, [id]);
  useEffect(() => { load(); }, [load]);
  async function act(path, body, url) { setM(''); const r = await post(url || `/api/market/order/${id}/${path}`, body); if (!r.ok) return setM(errText(r.error)); await load(); }
  if (o === null) return <Spinner />; if (o === false) return <div className="card">ትዕዛዝ አልተገኘም</div>;
  const set = k => e => setF({ ...f, [k]: e.target.value });
  const NEXT = { placed: '💳 ቀጣይ እርምጃ፦ ክፍያ ይፈጽሙ እና የማጣቀሻ ቁጥር ያስገቡ።', payment_submitted: '⏳ አድሚን ክፍያዎን እያረጋገጠ ነው።', paid: '✅ ክፍያ ተረጋግጧል — ሻጩ እንዲቀበል በመጠባበቅ ላይ።', preparing: '📦 ሻጩ ዕቃዎን እያዘጋጀ ነው።', shipped: '🚚 ዕቃው ተልኳል' + (o.tracking ? '፦ ' + o.tracking : '') + '። ሲደርስዎ ብቻ «ደረሰኝ» ይጫኑ።', delivered: '🤝 ዕቃው ደርሷል — አድሚን ለሻጭ ክፍያ እየፈጸመ ነው።', settled: '💰 ግብይቱ ተጠናቋል። እናመሰግናለን!', disputed: '⚖️ ክርክርዎ በአድሚን እየታየ ነው።', refund_pending: '↩️ ተመላሽ በመዘጋጀት ላይ ነው።', refunded: '↩️ ገንዘብዎ ተመልሷል።', cancelled: '✕ ትዕዛዙ ተሰርዟል።' };
  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <div className="card"><div className="flex items-center justify-between"><b>🏪 {o.shopName}</b><span className="tag">#{o.id.slice(0, 6)}</span></div>
        <OrderStepper status={o.status} /><p className="rounded-2xl border-l-4 border-gold bg-gold/10 p-3 text-sm">{NEXT[o.status]}</p>
        <div className="mt-3">{o.items.map(i => <div key={i.pid} className="flex justify-between py-1 text-sm"><span>{i.title} × {i.qty}</span><b>{ETB(i.price * i.qty)}</b></div>)}{o.fee > 0 && <div className="flex justify-between text-sm"><span>ማድረሻ</span><b>{ETB(o.fee)}</b></div>}<div className="mt-1 flex justify-between border-t border-line pt-2 text-lg"><b>ጠቅላላ</b><b className="text-brand">{ETB(o.total)}</b></div></div>
        <p className="mt-3 rounded-2xl bg-brand-light p-3 text-sm">{o.delivery.type === 'delivery' ? '🚚 ' + o.delivery.address : '🏬 በአካል መውሰድ' + (o.shopAddress ? ' — ' + o.shopAddress : '')}{o.shopPhone && <><br />🏪 {o.shopPhone}</>}</p>
      </div>

      {o.status === 'placed' && (<div className="card">{o.payment && o.payment.rejected && <p className="msg-err mb-3">❌ ክፍያዎ አልተቀበለም፦ {o.payment.rejected}</p>}
        <h2 className="text-lg">💳 ክፍያ</h2><div className="mt-2 rounded-2xl bg-brand-light p-3 text-sm"><b>{ETB(o.total)}</b> ወደዚህ ይክፈሉ፦{cfg.accounts.length ? cfg.accounts.map(a => <div key={a.number}>• <b>{a.method}</b> {a.number} ({a.holder})</div>) : <div>አድሚኑ የክፍያ አካውንት ገና አላስቀመጠም — አድሚኑን ያነጋግሩ።</div>}</div>
        <Select label="የከፈሉበት ዘዴ" options={PAY} value={f.method} onChange={set('method')} /><Input label="የግብይት ማጣቀሻ ቁጥር" value={f.ref} onChange={set('ref')} placeholder="ለምሳሌ TB123456789" /><Input label="ማስታወሻ (አማራጭ)" value={f.note} onChange={set('note')} />
        <Msg m={m} /><button className="btn-primary mt-3 w-full" onClick={() => act('pay', { method: f.method, ref: f.ref, note: f.note })}>💳 ክፍያ ፈጽሜያለሁ — አረጋግጥ</button><button className="btn-ghost mt-2 w-full" onClick={() => act('cancel', {})}>✕ ትዕዛዙን ሰርዝ</button></div>)}

      {(o.status === 'shipped' || o.status === 'delivered') && (<div className="card">{o.status === 'shipped' && <button className="btn-primary w-full" onClick={() => act('receive', {})}>🤝 ዕቃው ደረሰኝ፤ ደህና ነው</button>}
        <Input label="ችግር አለ? ምክንያት ይጻፉ" value={f.reason} onChange={set('reason')} placeholder="ዕቃው አልደረሰም / ተበላሽቷል…" /><button className="btn-danger mt-2 w-full" onClick={() => act('dispute', { reason: f.reason })}>⚖️ ክርክር ክፈት</button><Msg m={m} /></div>)}

      {(o.status === 'delivered' || o.status === 'settled') && !o.reviewed && (<div className="card"><h2 className="text-lg">⭐ ግምገማ ይስጡ</h2><div className="my-2 text-3xl">{[1, 2, 3, 4, 5].map(n => <button key={n} onClick={() => setF({ ...f, rate: n })} className="text-gold" aria-label={n + ' ኮከብ'}>{n <= f.rate ? '★' : '☆'}</button>)}</div><Input value={f.text} onChange={set('text')} placeholder="አስተያየትዎ" /><Msg m={m} />
        <button className="btn-primary mt-3 w-full" onClick={() => (f.rate ? act('', { orderId: id, rating: f.rate, text: f.text }, '/api/market/review') : setM('ኮከብ ይምረጡ'))}>ላክ</button></div>)}
      {o.reviewed && <p className="muted text-center"><Stars n={5} /> ግምገማ ሰጥተዋል — እናመሰግናለን</p>}

      <div className="card"><h2 className="text-lg">📜 ታሪክ</h2>{(o.history || []).slice().reverse().map((h, k) => <p key={k} className="muted">{new Date(h.ts).toLocaleString('am-ET')} — {stepLabel(h.s)}{h.note ? ' · ' + h.note : ''}</p>)}</div>
      <Link href="/orders" className="btn-ghost w-full">‹ ወደ ትዕዛዞች</Link>
    </div>
  );
}
export default function Page({ params }) { return <RequireAuth><Order id={params.id} /></RequireAuth>; }
