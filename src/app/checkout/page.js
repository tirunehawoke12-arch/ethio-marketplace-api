'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';
import { useApp } from '@/lib/app';
import { ETB, post } from '@/lib/api';
import { errText } from '@/lib/consts';
import { Check, Input, Msg, PageTitle } from '@/components/ui';
import { WizardBar } from '@/components/Stepper';
import RequireAuth from '@/components/RequireAuth';

function Checkout() {
  const { cart, clearCart, user } = useApp(); const router = useRouter();
  const [step, setStep] = useState(1); const [f, setF] = useState({ type: 'pickup', address: '', phone: user.phone || '', note: '' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  if (!cart.length) return <div className="card text-center">ጋሪዎ ባዶ ነው — <Link className="font-bold text-brand" href="/market">ወደ ገበያ</Link></div>;
  const total = cart.reduce((a, i) => a + i.price * i.qty, 0);
  function next() { setErr(''); if (!/^(\+?251|0)?[79]\d{8}$/.test(f.phone.replace(/[\s-]/g, ''))) return setErr('ትክክለኛ ስልክ ቁጥር ያስገቡ'); if (f.type === 'delivery' && f.address.trim().length < 5) return setErr('የመድረሻ አድራሻ ያስገቡ'); setStep(2); }
  async function place() { setBusy(true); setErr(''); const r = await post('/api/market/checkout', { items: cart.map(i => ({ pid: i.pid, qty: i.qty })), delivery: { type: f.type, address: f.address, phone: f.phone, note: f.note } }); setBusy(false); if (!r.ok) return setErr(errText(r.error)); clearCart(); router.push(r.orders.length === 1 ? `/orders/${r.orders[0]}` : '/orders'); }
  return (
    <div className="mx-auto max-w-xl"><PageTitle>ክፍያ ደረጃ</PageTitle><WizardBar n={step} total={3} />
      {step === 1 && (<div className="card"><h2 className="text-lg">ደረጃ 1 ከ 3 — ርክክብ</h2>
        <div className="mt-3 flex gap-2"><button className={f.type === 'pickup' ? 'chip-on' : 'chip'} onClick={() => setF({ ...f, type: 'pickup' })}>🏬 በአካል እወስዳለሁ</button><button className={f.type === 'delivery' ? 'chip-on' : 'chip'} onClick={() => setF({ ...f, type: 'delivery' })}>🚚 ይድረሰኝ</button></div>
        {f.type === 'delivery' && <Input label="የመድረሻ አድራሻ" value={f.address} onChange={e => setF({ ...f, address: e.target.value })} placeholder="ከተማ፣ ክፍለ ከተማ፣ ቀበሌ፣ የቤት ቁጥር፣ ምልክት" />}
        <Input label="የሚደውሉበት ስልክ" type="tel" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /><Input label="ማስታወሻ (አማራጭ)" value={f.note} onChange={e => setF({ ...f, note: e.target.value })} />
        <Msg m={err} /><button className="btn-primary mt-4 w-full" onClick={next}>ቀጥል ›</button></div>)}
      {step === 2 && (<div className="card"><h2 className="text-lg">ደረጃ 2 ከ 3 — ማጠቃለያ</h2>
        {cart.map(i => <div key={i.pid} className="flex justify-between border-b border-line py-2 text-sm"><span>{i.title} × {i.qty}</span><b>{ETB(i.price * i.qty)}</b></div>)}
        <div className="mt-2 flex justify-between"><span>ማድረሻ ክፍያ</span><span className="muted">በሻጩ ተመን ይጨመራል</span></div><div className="mt-1 flex justify-between text-lg"><b>ድምር</b><b className="text-brand">{ETB(total)}+</b></div>
        <p className="mt-3 rounded-2xl bg-brand-light p-3 text-sm">{f.type === 'delivery' ? '🚚 ' + f.address : '🏬 በአካል መውሰድ'}<br />📞 {f.phone}</p>
        <p className="mt-3 rounded-2xl border-l-4 border-gold bg-gold/10 p-3 text-sm">💡 ትዕዛዙ ከገባ በኋላ ክፍያ ይፈጽማሉ። ገንዘቡ በአድሚን እምነት (escrow) ይያዛል፤ ዕቃውን ሲቀበሉ ለሻጭ ይተላለፋል።</p>
        <Msg m={err} /><div className="mt-4 grid grid-cols-2 gap-2"><button className="btn-ghost" onClick={() => setStep(1)}>‹ ተመለስ</button><button className="btn-primary" disabled={busy} onClick={place}>{busy ? '⏳…' : '✅ ትዕዛዝ አስገባ'}</button></div></div>)}
    </div>
  );
}
export default function Page() { return <RequireAuth><Checkout /></RequireAuth>; }
