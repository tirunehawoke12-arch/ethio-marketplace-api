'use client';
import { useState } from 'react';
import { post } from '@/lib/api';
import { errText } from '@/lib/consts';
import { Input, Msg } from '@/components/ui';
import RequireAuth from '@/components/RequireAuth';

function Form() {
  const [f, setF] = useState({ current: '', next: '', next2: '' }), [m, setM] = useState(null);
  async function save() { if (f.next !== f.next2) return setM({ t: 'አዲሶቹ የይለፍ ቃሎች አይመሳሰሉም' }); const r = await post('/api/auth/password', { current: f.current, newPassword: f.next }); setM(r.ok ? { t: '✅ የይለፍ ቃል ተቀይሯል', ok: 1 } : { t: errText(r.error) }); if (r.ok) setF({ current: '', next: '', next2: '' }); }
  return (
    <div className="card mx-auto max-w-md"><h1 className="text-xl">🔑 የይለፍ ቃል ቀይር</h1>
      <Input label="አሁን ያለው የይለፍ ቃል" type="password" value={f.current} onChange={e => setF({ ...f, current: e.target.value })} autoComplete="current-password" /><Input label="አዲስ የይለፍ ቃል (ቢያንስ 8)" type="password" value={f.next} onChange={e => setF({ ...f, next: e.target.value })} autoComplete="new-password" /><Input label="አዲሱን ደግም" type="password" value={f.next2} onChange={e => setF({ ...f, next2: e.target.value })} autoComplete="new-password" />
      <Msg m={m && m.t} ok={m && m.ok} /><button className="btn-primary mt-4 w-full" onClick={save}>💾 ቀይር</button></div>
  );
}
export default function Page() { return <RequireAuth><Form /></RequireAuth>; }
