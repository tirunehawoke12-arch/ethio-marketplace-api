'use client';
import { useEffect, useState } from 'react';
import { api, get } from '@/lib/api';
import { errText } from '@/lib/consts';
import { useForm } from '@/lib/form';
import { Input, Msg, Spinner, Textarea } from '@/components/ui';
import RequireAuth from '@/components/RequireAuth';

function Form() {
  const { f, setF, bind } = useForm({ fullName: '', idNo: '', dob: '', addr: '', tin: '', emName: '', emPhone: '', note: '' }); const [ready, setReady] = useState(false), [m, setM] = useState(null);
  useEffect(() => { get('/api/me/private').then(r => { if (r.ok) setF(s => ({ ...s, ...r.data })); setReady(true); }); }, [setF]);
  if (!ready) return <Spinner />;
  async function save() { const r = await api('PUT', '/api/me/private', f); setM(r.ok ? { t: '✅ ተቀምጧል — ለእርስዎ እና ለአድሚን ብቻ ይታያል።', ok: 1 } : { t: errText(r.error) }); }
  return (
    <div className="card mx-auto max-w-xl"><h1 className="text-xl">🪪 የግል መረጃዬ</h1><p className="muted">🔒 ይህ መረጃ ለእርስዎ እና ለአድሚን ብቻ ይታያል — ለሌሎች ሰዎች ወይም ደንበኞች አይታይም።</p>
      <Input label="ሙሉ ስም (በመታወቂያ)" {...bind('fullName')} /><Input label="የመታወቂያ ቁጥር (ብሔራዊ / ቀበሌ / ፓስፖርት)" {...bind('idNo')} /><Input label="የትውልድ ቀን" type="date" {...bind('dob')} /><Input label="የመኖሪያ አድራሻ" {...bind('addr')} /><Input label="TIN (ለንግድ)" {...bind('tin')} />
      <div className="grid grid-cols-2 gap-x-3"><Input label="የአደጋ ጊዜ ተጠሪ" {...bind('emName')} /><Input label="ስልክ" type="tel" {...bind('emPhone')} /></div><Textarea label="ተጨማሪ ማስታወሻ" rows={3} {...bind('note')} />
      <Msg m={m && m.t} ok={m && m.ok} /><button className="btn-primary mt-4 w-full" onClick={save}>💾 አስቀምጥ</button></div>
  );
}
export default function Page() { return <RequireAuth><Form /></RequireAuth>; }
