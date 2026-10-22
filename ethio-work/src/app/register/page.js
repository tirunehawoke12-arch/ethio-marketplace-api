'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useApp } from '@/lib/app';
import { post } from '@/lib/api';
import { errText } from '@/lib/consts';
import { Input, Msg } from '@/components/ui';
import TelegramStep from '@/components/TelegramStep';

export default function Register() {
  const { login } = useApp(); const router = useRouter(); const [f, setF] = useState({ name: '', email: '', phone: '', password: '', password2: '' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [req, setReq] = useState(null);
  const set = k => e => setF({ ...f, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault(); setErr('');
    if (f.password !== f.password2) return setErr('የይለፍ ቃሎች አይመሳሰሉም');
    setBusy(true); const r = await post('/api/auth/register', { name: f.name, email: f.email, phone: f.phone, password: f.password }); setBusy(false);
    r.ok ? setReq(r) : setErr(errText(r.error));
  }
  return (
    <div className="mx-auto max-w-md">
      <div className="card">
        <h1 className="text-2xl">አካውንት ክፈት</h1>
        <p className="muted mt-1">ስልክ ቁጥር ግዴታ ነው — በ Telegram ይረጋገጣል።</p>
        {!req ? (
          <form onSubmit={submit}>
            <Input label="ሙሉ ስም" value={f.name} onChange={set('name')} autoComplete="name" />
            <Input label="ኢሜይል" type="email" value={f.email} onChange={set('email')} autoComplete="email" required />
            <Input label="ስልክ ቁጥር" type="tel" value={f.phone} onChange={set('phone')} placeholder="09XXXXXXXX" autoComplete="tel" required hint="📞 OTP የሚላከው ከዚህ ቁጥር ጋር ለሚመሳሰል የ Telegram አካውንት ብቻ ነው።" />
            <Input label="የይለፍ ቃል (ቢያንስ 8)" type="password" value={f.password} onChange={set('password')} autoComplete="new-password" required />
            <Input label="የይለፍ ቃል ደግም" type="password" value={f.password2} onChange={set('password2')} autoComplete="new-password" required />
            <Msg m={err} />
            <button className="btn-primary mt-4 w-full" disabled={busy}>{busy ? '⏳…' : 'ቀጥል ›'}</button>
          </form>
        ) : (
          <div className="mt-3"><TelegramStep needsLink requestId={req.requestId} botLink={req.botLink} phoneHint={req.phoneHint} verifyUrl="/api/auth/register/verify" onDone={async r => { await login(r.token); router.push('/me'); }} /></div>
        )}
      </div>
      <p className="muted mt-4 text-center">አካውንት አለዎት? <Link href="/login" className="font-bold text-brand">ግባ</Link></p>
    </div>
  );
}
