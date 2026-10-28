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
import PayAccounts from '@/components/PayAccounts';
import { useT } from '@/lib/i18n';

function Checkout() {
  const { cart, clearCart, user } = useApp(), { t } = useT(); const router = useRouter();
  const [step, setStep] = useState(1); const [f, setF] = useState({ type: 'pickup', address: '', phone: user.phone || '', note: '' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [cp, setCp] = useState(''), [cd, setCd] = useState(null), [cm, setCm] = useState('');
  if (!cart.length) return <div className="card text-center">ጋሪዎ ባዶ ነው — <Link className="font-bold text-brand" href="/market">ወደ ገበያ</Link></div>;
  const total = cart.reduce((a, i) => a + i.price * i.qty, 0);
  async function applyCp() { setCm(''); setCd(null); const r = await post('/api/market/coupon/check', { coupon: cp, items: cart.map(i => ({ pid: i.pid, qty: i.qty })) }); if (r.ok) setCd({ code: r.code, discount: r.discount }); else setCm(errText(r.error)); }
  function next() { setErr(''); if (!/^(\+?251|0)?[79]\d{8}$/.test(f.phone.replace(/[\s-]/g, ''))) return setErr('ትክክለኛ ስልክ ቁጥር ያስገቡ'); if (f.type === 'delivery' && f.address.trim().length < 5) return setErr('የመድረሻ አድራሻ ያስገቡ'); setStep(2); }
  async function place() { setBusy(true); setErr(''); const r = await post('/api/market/checkout', { items: cart.map(i => ({ pid: i.pid, qty: i.qty })), delivery: { type: f.type, address: f.address, phone: f.phone, note: f.note }, coupon: cd ? cd.code : undefined }); setBusy(false); if (!r.ok) return setErr(errText(r.error)); clearCart(); router.push(r.orders.length === 1 ? `/orders/${r.orders[0]}` : '/orders'); }
  return (
    <div className="mx-auto max-w-xl"><PageTitle>{t('checkout_title')}</PageTitle><WizardBar n={step} total={3} />
      {step === 1 && (<div className="card"><h2 className="text-lg">ደረጃ 1 ከ 3 — ርክክብ</h2>
        <div className="mt-3 flex gap-2"><button className={f.type === 'pickup' ? 'chip-on' : 'chip'} onClick={() => setF({ ...f, type: 'pickup' })}>{t('pickup')}</button><button className={f.type === 'delivery' ? 'chip-on' : 'chip'} onClick={() => setF({ ...f, type: 'delivery' })}>{t('deliver')}</button></div>
        {f.type === 'delivery' && <Input label="የመድረሻ አድራሻ" value={f.address} onChange={e => setF({ ...f, address: e.target.value })} placeholder="ከተማ፣ ክፍለ ከተማ፣ ቀበሌ፣ የቤት ቁጥር፣ ምልክት" />}
        <Input label="የሚደውሉበት ስልክ" type="tel" value={f.phone} onChange={e => setF({ ...f, phone: e.target.value })} /><Input label="ማስታወሻ (አማራጭ)" value={f.note} onChange={e => setF({ ...f, note: e.target.value })} />
        <Msg m={err} /><button className="btn-primary mt-4 w-full" onClick={next}>{t('next')}</button></div>)}
      {step === 2 && (<div className="card"><h2 className="text-lg">ደረጃ 2 ከ 3 — ማጠቃለያ</h2>
        {cart.map(i => <div key={i.pid} className="flex justify-between border-b border-line py-2 text-sm"><span>{i.title} × {i.qty}</span><b>{ETB(i.price * i.qty)}</b></div>)}
        <div className="mt-2 flex justify-between"><span>ማድረሻ ክፍያ</span><span className="muted">በሻጩ ተመን ይጨመራል</span></div><div className="mt-3 flex gap-2"><input className="input !min-h-[44px] flex-1 uppercase" placeholder={t('coupon_ph')} value={cp} onChange={e => { setCp(e.target.value); setCd(null); }} /><button className="btn-soft" disabled={cp.trim().length < 4} onClick={applyCp}>{t('apply')}</button></div>{cd && <p className="msg-ok mt-2">✅ «{cd.code}» ተተግብሯል — ቅናሽ <b>−{ETB(cd.discount)}</b></p>}{cm && <p className="msg-err mt-2">{cm}</p>}
        {cd && <div className="mt-2 flex justify-between text-sm text-emerald-700"><span>{t('discount')}</span><b>−{ETB(cd.discount)}</b></div>}<div className="mt-1 flex justify-between text-lg"><b>{t('total')}</b><b className="text-brand">{ETB(total - (cd ? cd.discount : 0))}+</b></div>
        <p className="mt-3 rounded-2xl bg-brand-light p-3 text-sm">{f.type === 'delivery' ? '🚚 ' + f.address : '🏬 በአካል መውሰድ'}<br />📞 {f.phone}</p>
        <PayAccounts note="ትዕዛዙን ካስገቡ በኋላ ክፍያ ያደርጋሉ።" />
        <p className="mt-3 rounded-2xl border-l-4 border-gold bg-gold/10 p-3 text-sm">💡 ትዕዛዙ ከገባ በኋላ ክፍያ ይፈጽማሉ። ገንዘቡ በአድሚን እምነት (escrow) ይያዛል፤ ዕቃውን ሲቀበሉ ለሻጭ ይተላለፋል።</p>
        <Msg m={err} /><div className="mt-4 grid grid-cols-2 gap-2"><button className="btn-ghost" onClick={() => setStep(1)}>{t('back')}</button><button className="btn-primary" disabled={busy} onClick={place}>{busy ? '⏳…' : t('place_order')}</button></div></div>)}
    </div>
  );
}
export default function Page() { return <RequireAuth><Checkout /></RequireAuth>; }
