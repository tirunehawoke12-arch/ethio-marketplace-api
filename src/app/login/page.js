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
  const [f, setF] = useState({ id: '', password: '' }); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const [req, setReq] = useState(null); const [admin, setAdmin] = useState(false); const [adm, setAdm] = useState(null);
  async function verifyAdmin(e) { e.preventDefault(); setErr(''); setBusy(true); const r = await post('/api/admin/login/verify', { requestId: adm.requestId, telegramOtp: adm.tg, emailOtp: adm.mail }); setBusy(false); if (!r.ok) return setErr(errText(r.error) + (r.attemptsLeft != null ? ` (${r.attemptsLeft} ሙከራ ቀርቷል)` : '')); await login(r.token); router.push('/admin'); }
  async function submit(e) {
    e.preventDefault(); setErr(''); setBusy(true);
    if (admin) { const r = await post('/api/admin/login', { email: f.id, password: f.password }); setBusy(false); if (!r.ok) return setErr(errText(r.error)); return setAdm({ ...r, tg: '', mail: '' }); }
    const r = await post('/api/auth/login', { id: f.id, password: f.password }); setBusy(false); r.ok ? setReq(r) : setErr(errText(r.error));
  }
  return (
    <div className="mx-auto max-w-md">
      <div className="card">
        <h1 className="text-2xl">{admin ? '🛡️ አድሚን መግቢያ' : 'ግባ'}</h1>
        {adm ? (
          <form onSubmit={verifyAdmin}>
            <p className="muted mt-2">✈️ የ Telegram ኮድ ወደ አድሚን ስልክዎ ተልኳል{adm.needEmail ? ` · 📧 የኢሜይል ኮድ ወደ ${adm.emailHint} ተልኳል` : ''}።</p>
            <Input label="የ Telegram ኮድ" inputMode="numeric" maxLength={6} value={adm.tg} onChange={e => setAdm({ ...adm, tg: e.target.value })} autoComplete="one-time-code" required />
            {adm.needEmail && <Input label="የኢሜይል ኮድ" inputMode="numeric" maxLength={6} value={adm.mail} onChange={e => setAdm({ ...adm, mail: e.target.value })} required />}
            <Msg m={err} /><button className="btn-primary mt-4 w-full" disabled={busy}>{busy ? '⏳…' : 'አረጋግጥ እና ግባ'}</button>
            <button type="button" className="btn-ghost mt-2 w-full" onClick={() => { setAdm(null); setErr(''); }}>‹ ተመለስ</button>
          </form>
        ) : !req ? (
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
