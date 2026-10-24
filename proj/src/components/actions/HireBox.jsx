'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useApp } from '@/lib/app';
import { post } from '@/lib/api';
import { errText } from '@/lib/consts';
import { Msg, Textarea } from '@/components/ui';

export default function HireBox({ workerId }) {
  const { user } = useApp(); const [t, setT] = useState(''); const [m, setM] = useState(null); const [busy, setBusy] = useState(false);
  if (!user) return <div className="card mt-3 text-center"><p className="font-bold">🤝 ቅጥር ጥያቄ ለመላክ ይግቡ</p><Link className="btn-primary mt-2" href={`/login?next=/workers/${workerId}`}>ግባ</Link></div>;
  async function go() { setBusy(true); const r = await post(`/api/people/worker/${workerId}/hire-request`, { message: t }); setBusy(false); setM(r.ok ? { t: '✅ ጥያቄዎ ተልኳል — ሠራተኛው በ Telegram ይነገረዋል', ok: true } : { t: errText(r.error) }); }
  return (
    <div className="card mt-3"><h2 className="text-lg">🤝 ቅጥር ጥያቄ ላክ</h2><p className="muted">በአሰሪ ገጽዎ ስም ጥያቄ ይላካል (የአሰሪ ገጽ ያስፈልጋል)።</p>
      <Textarea value={t} onChange={e => setT(e.target.value)} placeholder="ምን ዓይነት ሥራ፣ የት፣ መቼ…" rows={3} />
      <Msg m={m && m.t} ok={m && m.ok} />{m && m.t.includes('አሰሪ ገጽ') && <Link href="/me/employer" className="btn-ghost mt-2 w-full">🏢 አሰሪ ገጽ ክፈት</Link>}
      <button className="btn-primary mt-3 w-full" disabled={busy} onClick={go}>{busy ? '⏳…' : '🤝 ጥያቄ ላክ'}</button></div>
  );
}
