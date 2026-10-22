'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/lib/app';
import { post } from '@/lib/api';
import { errText } from '@/lib/consts';
import { Input, Msg } from '@/components/ui';
import TelegramStep from '@/components/TelegramStep';

function LoginForm() {
  const { login } = useApp(); const router = useRouter(); const sp = useSearchParams(); const next = sp.get('next') || '/';
  const [f, setF] = useState({ id: '', password: '' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [req, setReq] = useState(null); const [admin, setAdmin] = useState(false);
  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    if (admin) { const r = await post('/api/admin/login', { email: f.id, password: f.password }); setBusy(false); if (!r.ok) return setErr(errText(r.error)); await login(r.token); return router.push('/admin'); }
    const r = await post('/api/auth/login', { id: f.id, password: f.password }); setBusy(false); r.ok ? setReq(r) : setErr(errText(r.error));
  }
  return (
    <div className="mx-auto max-w-md">
      <div className="card">
        <h1 className="text-2xl">{admin ? '🛡️ አድሚን መግቢያ' : 'ግባ'}</h1>
        {!req ? (
          <form onSubmit={submit}>
            <Input label={admin ? 'የአድሚን ኢሜይል' : 'ኢሜይል ወይም ስልክ'} value={f.id} onChange={e => setF({ ...f, id: e.target.value })} autoComplete="username" required={!admin} />
            <Input label="የይለፍ ቃል" type="password" value={f.password} onChange={e => setF({ ...f, password: e.target.value })} autoComplete="current-password" required />
            <Msg m={err} />
            <button className="btn-primary mt-4 w-full" disabled={busy}>{busy ? '⏳…' : admin ? 'ግባ' : 'ቀጥል — OTP ላክ ›'}</button>
            <p className="muted mt-3 text-center">{admin ? 'ተራ ተጠቃሚ ነዎት? ' : ''}<button type="button" className="font-bold text-brand" onClick={() => setAdmin(!admin)}>{admin ? 'ወደ ተጠቃሚ መግቢያ' : 'አድሚን ነዎት?'}</button></p>
          </form>
        ) : (
          <div className="mt-3"><TelegramStep needsLink={req.step === 'link'} requestId={req.requestId} botLink={req.botLink} phoneHint={req.phoneHint} verifyUrl="/api/auth/login/verify" onDone={async r => { await login(r.token); router.push(next); }} /></div>
        )}
      </div>
      <p className="muted mt-4 text-center">አካውንት የለዎትም? <Link href="/register" className="font-bold text-brand">ይመዝገቡ</Link></p>
    </div>
  );
}
export default function Login() { return <Suspense fallback={null}><LoginForm /></Suspense>; }
