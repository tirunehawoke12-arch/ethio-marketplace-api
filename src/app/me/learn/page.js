'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { get, post } from '@/lib/api';
import { errText } from '@/lib/consts';
import { Empty, Msg, PageTitle, Spinner } from '@/components/ui';
import RequireAuth from '@/components/RequireAuth';

function List() {
  const [d, setD] = useState(null), [title, setTitle] = useState(''), [m, setM] = useState('');
  const load = () => get('/api/learn/decks').then(setD); useEffect(() => { load(); }, []);
  async function add() { const r = await post('/api/learn/decks', { title }); if (!r.ok) return setM(errText(r.error)); location.href = '/me/learn/' + r.id; }
  if (!d) return <Spinner />;
  return (
    <div className="mx-auto max-w-2xl space-y-3"><PageTitle sub="ፒፒቲ ይጫኑ፤ ተማሪዎች በ Telegram ቦት ውስጥ ብቻ ስም እና ID አስገብተው ያነባሉ">📖 የተማሪ ፋይሎች</PageTitle>
      <div className="card"><b>➕ አዲስ ፋይል</b><div className="mt-2 flex gap-2"><input className="input" placeholder="ርዕስ (ለምሳሌ፦ ባዮሎጂ 9ኛ ክፍል — ምዕራፍ 1)" value={title} onChange={e => setTitle(e.target.value)} /><button className="btn-primary" disabled={title.trim().length < 2} onClick={add}>ፍጠር</button></div><Msg m={m} /></div>
      {d.items.length === 0 && <Empty>እስካሁን ፋይል የለም</Empty>}
      {d.items.map(x => <Link key={x.id} href={'/me/learn/' + x.id} className="card block transition hover:shadow-soft"><div className="flex items-center gap-2"><b className="min-w-0 flex-1 truncate">{x.title}</b><span className={x.isOpen ? 'tag' : 'tag-warn'}>{x.isOpen ? '🟢 ክፍት' : '⏸ ዝግ'}</span></div><p className="muted mt-1">{x.slides} ስላይድ · {x.students} ተማሪ ({x.bound} ገብተዋል)</p></Link>)}
    </div>
  );
}
export default function Page() { return <RequireAuth><List /></RequireAuth>; }
