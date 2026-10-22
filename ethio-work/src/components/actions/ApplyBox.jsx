'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useApp } from '@/lib/app';
import { post } from '@/lib/api';
import { errText } from '@/lib/consts';
import { Msg, Textarea } from '@/components/ui';

export default function ApplyBox({ jobId }) {
  const { user } = useApp(); const [t, setT] = useState(''); const [m, setM] = useState(null); const [busy, setBusy] = useState(false);
  if (!user) return <div className="card mt-3 text-center"><p className="font-bold">📨 ለማመልከት ይግቡ</p><Link className="btn-primary mt-2" href={`/login?next=/jobs/${jobId}`}>ግባ</Link></div>;
  async function go() { setBusy(true); const r = await post(`/api/people/job/${jobId}/apply`, { message: t }); setBusy(false); setM(r.ok ? { t: '✅ ማመልከቻዎ ተልኳል — ሁኔታውን በ«ማመልከቻዎቼ» ያያሉ', ok: true } : { t: errText(r.error) + (r.error === 'open_worker_first' ? ' → ገጾቼ' : '') }); }
  return (
    <div className="card mt-3"><h2 className="text-lg">📨 ያመልክቱ</h2><p className="muted">ሠራተኛ ገጽዎ (ስም፣ ሙያ፣ ልምድ) ለአሰሪው ይታያል።</p>
      <Textarea value={t} onChange={e => setT(e.target.value)} placeholder="ለምን ተስማሚ እንደሆኑ ጥቂት ይጻፉ" rows={3} />
      <Msg m={m && m.t} ok={m && m.ok} />{m && m.t.includes('ገጾቼ') && <Link href="/me/worker" className="btn-ghost mt-2 w-full">🧑‍🔧 ሠራተኛ ገጽ ክፈት</Link>}
      <button className="btn-primary mt-3 w-full" disabled={busy} onClick={go}>{busy ? '⏳…' : '📨 አመልክት'}</button></div>
  );
}
