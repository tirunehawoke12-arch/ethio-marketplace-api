'use client';
import { useState } from 'react';
import { post, setTok } from '@/lib/api';
import { errText } from '@/lib/consts';
import { Input, Msg } from '@/components/ui';
import RequireAuth from '@/components/RequireAuth';

function Form() {
  const [f, setF] = useState({ current: '', next: '', next2: '' }), [m, setM] = useState(null);
  async function save() { if (f.next !== f.next2) return setM({ t: 'አዲሶቹ የይለፍ ቃሎች አይመሳሰሉም' }); const r = await post('/api/auth/password', { current: f.current, newPassword: f.next }); if (r.ok && r.token) setTok(r.token); setM(r.ok ? { t: '✅ የይለፍ ቃል ተቀይሯል — በሌሎች መሳሪያዎች ላይ ያሉ መግቢያዎች ወጥተዋል', ok: 1 } : { t: errText(r.error) }); if (r.ok) setF({ current: '', next: '', next2: '' }); }
  return (
    <div className="card mx-auto max-w-md"><h1 className="text-xl">🔑 የይለፍ ቃል ቀይር</h1>
      <Input label="አሁን ያለው የይለፍ ቃል" type="password" value={f.current} onChange={e => setF({ ...f, current: e.target.value })} autoComplete="current-password" /><Input label="አዲስ የይለፍ ቃል (ቢያንስ 8)" type="password" value={f.next} onChange={e => setF({ ...f, next: e.target.value })} autoComplete="new-password" /><Input label="አዲሱን ደግም" type="password" value={f.next2} onChange={e => setF({ ...f, next2: e.target.value })} autoComplete="new-password" />
      <Msg m={m && m.t} ok={m && m.ok} /><button className="btn-primary mt-4 w-full" onClick={save}>💾 ቀይር</button></div>
  );
}
function AllDevices() {
  const [m, setM] = useState(null), [sure, setSure] = useState(false), [busy, setBusy] = useState(false);
  async function go() { setBusy(true); const r = await post('/api/auth/logout-all'); setBusy(false); setSure(false); if (r.ok && r.token) setTok(r.token); setM(r.ok ? { t: '✅ በሌሎች መሳሪያዎች ላይ ያሉ መግቢያዎች በሙሉ ወጥተዋል። ይህ መሳሪያ እንደገባ ይቆያል።', ok: 1 } : { t: errText(r.error) }); }
  return (
    <div className="card mx-auto mt-4 max-w-md"><h2 className="text-lg">🚪 በሁሉም መሳሪያ ላይ ውጣ</h2>
      <p className="muted mt-1">ስልክዎ ወይም ኮምፒውተርዎ ቢጠፋ ወይም ሌላ ሰው ገብቷል ብለው ከጠረጠሩ ይጠቀሙ። ሌሎች መሳሪያዎች እንደገና በይለፍ ቃል እና በ Telegram ኮድ መግባት አለባቸው።</p>
      {!sure ? <button className="btn-ghost mt-3 w-full" onClick={() => setSure(true)}>🚪 በሌሎች መሳሪያዎች ላይ ውጣ</button> : <div className="mt-3 grid grid-cols-2 gap-2"><button className="btn-danger" disabled={busy} onClick={go}>{busy ? '⏳…' : '✅ አዎ ውጣ'}</button><button className="btn-ghost" onClick={() => setSure(false)}>✖️ አይ</button></div>}
      <Msg m={m && m.t} ok={m && m.ok} /></div>
  );
}
export default function Page() { return <RequireAuth><Form /><AllDevices /></RequireAuth>; }
