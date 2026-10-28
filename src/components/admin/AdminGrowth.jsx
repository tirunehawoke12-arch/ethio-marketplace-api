'use client';
/* አድሚን፦ የጣቢያ ኩፖኖች + የሪፈራል ሽልማት ቅንብር */
import { useEffect, useState } from 'react';
import { get, post } from '@/lib/api';
import { errText } from '@/lib/consts';
import { Msg, Spinner } from '@/components/ui';
import CouponsManager from '@/components/CouponsManager';
import Ico from './Ico';

function Referral() {
  const [d, setD] = useState(null), [f, setF] = useState({ reward: 0, minMult: 5 }), [m, setM] = useState(''), [ok, setOk] = useState(false);
  useEffect(() => { get('/api/admin/referral').then(r => { setD(r); if (r.ok) setF(r.cfg); }); }, []);
  async function save() { const r = await post('/api/admin/referral', f); setOk(!!r.ok); setM(r.ok ? '✅ ተቀምጧል' : errText(r.error)); }
  if (!d) return <Spinner />; if (!d.ok) return <p className="msg-err">{errText(d.error)}</p>;
  return (<div className="card"><div className="flex items-center gap-2"><Ico n="users" className="text-brand" /><b>የሪፈራል ሽልማት</b><span className="tag ml-auto">ጠቅላላ ግብዣ {d.total}</span></div>
    <p className="muted mt-1">ጓደኛ ሲቀላቀል ሁለቱም የግል ኩፖን (አንድ ጊዜ፣ 30 ቀን) ያገኛሉ፤ ወጪው በመድረኩ ነው። <b>0 = ሽልማት የለም</b> (ቆጠራ ብቻ)። በአንድ ጋባዥ ቢበዛ 10 ሽልማት።</p>
    <div className="mt-2 grid grid-cols-2 gap-2"><label className="text-sm font-bold">ሽልማት (ብር)<input className="input mt-1" type="number" min="0" max="1000" value={f.reward} onChange={e => setF({ ...f, reward: e.target.value })} /></label><label className="text-sm font-bold">ዝቅተኛ ግዢ = ሽልማት ×<input className="input mt-1" type="number" min="1" max="50" value={f.minMult} onChange={e => setF({ ...f, minMult: e.target.value })} /></label></div>
    <button className="btn-primary mt-3 w-full" onClick={save}>💾 አስቀምጥ</button><Msg m={m} ok={ok} />
    <b className="mt-4 block">🏆 ብዙ የጋበዙ</b><ul className="mt-1 space-y-1 text-sm">{d.top.length ? d.top.map(x => <li key={x.id} className="flex justify-between"><span>{x.user.name || x.user.email}</span><b>{x.count}</b></li>) : <li className="muted">ገና የለም</li>}</ul></div>);
}
export default function AdminGrowth() { return <div className="grid gap-4 lg:grid-cols-2"><CouponsManager admin /><Referral /></div>; }
