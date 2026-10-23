'use client';
import { useEffect, useRef, useState } from 'react';
import { post } from '@/lib/api';
import { errText } from '@/lib/consts';
import { Input, Msg } from './ui';

const HELP = {
  waiting_for_start: ['1', 'Telegram Bot ይክፈቱ እና «Start» ይጫኑ'],
  awaiting_contact: ['2', 'Bot ውስጥ «📱 ስልኬን አጋራ» ይጫኑ'],
  otp_sent: ['3', 'የደረሰዎትን 6 አሃዝ ኮድ ከታች ያስገቡ'],
};
/** የ Telegram ማረጋገጫ፦ Start → ስልክ ማጋራት → OTP። OTP የሚላከው ከተመዘገበው ስልክ ጋር ለሚመሳሰል የ Telegram አካውንት ብቻ ነው። */
export default function TelegramStep({ requestId, botLink, phoneHint, verifyUrl, onDone, needsLink }) {
  const [st, setSt] = useState(needsLink ? 'waiting_for_start' : 'otp_sent'); const [otp, setOtp] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false); const stop = useRef(false);
  useEffect(() => {
    stop.current = false;
    (async () => { while (!stop.current) { const r = await post('/api/telegram/status', { requestId }); if (r.ok && r.status) { setSt(r.status); if (r.status === 'phone_mismatch') { setErr('❌ የ Telegram ስልክ ቁጥር ከተመዘገበው ጋር አይመሳሰልም — OTP አልተላከም። ሰርዘው በትክክለኛው ቁጥር ይሞክሩ።'); return; } } if (!r.ok && (r.error === 'request_not_found')) { setErr(errText('request_not_found')); return; } await new Promise(res => setTimeout(res, 2000)); } })();
    return () => { stop.current = true; };
  }, [requestId]);
  async function submit(e) { e.preventDefault(); setErr(''); setBusy(true); const r = await post(verifyUrl, { requestId, otp }); setBusy(false); if (!r.ok) return setErr(errText(r.error) + (r.attemptsLeft != null ? ` (${r.attemptsLeft} ሙከራ ቀርቷል)` : '')); onDone(r); }
  const h = HELP[st];
  return (
    <div>
      {needsLink && (
        <ol className="mb-3 space-y-2 text-sm">
          {['waiting_for_start', 'awaiting_contact', 'otp_sent'].map(k => (<li key={k} className={'flex items-start gap-3 rounded-2xl p-3 ' + (k === st ? 'bg-brand-light font-bold text-brand-dark' : 'bg-white/50 text-mute dark:bg-white/5')}><span className={'grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs ' + (k === st ? 'bg-brand text-white' : 'bg-line')}>{HELP[k][0]}</span>{HELP[k][1]}</li>))}
        </ol>
      )}
      {needsLink && st !== 'otp_sent' && <a href={botLink} target="_blank" rel="noopener noreferrer" className="btn-primary mb-3 w-full">✈️ Telegram Bot ክፈት</a>}
      <p className="muted mb-1">📞 OTP የሚላከው ወደ <b>{phoneHint}</b> ለተመዘገበ የ Telegram አካውንት ብቻ ነው።</p>
      <form onSubmit={submit}>
        <Input label={h ? h[1] : 'ኮድ'} value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="6 አሃዝ ኮድ" className="text-center text-2xl tracking-[0.5em]" />
        <Msg m={err} />
        <button className="btn-primary mt-3 w-full" disabled={busy || otp.length !== 6}>{busy ? '⏳…' : '✅ አረጋግጥ'}</button>
      </form>
    </div>
  );
}
