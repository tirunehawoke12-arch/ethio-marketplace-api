'use client';
import { useEffect, useState } from 'react';
import { get, post, ETB } from '@/lib/api';
import { errText } from '@/lib/consts';
import { Msg, PageTitle, Spinner } from '@/components/ui';
import RequireAuth from '@/components/RequireAuth';

function Invite() {
  const [d, setD] = useState(null), [code, setCode] = useState(''), [m, setM] = useState(''), [ok, setOk] = useState(false), [cp, setCp] = useState(false);
  const load = () => get('/api/referral/me').then(setD); useEffect(() => { load(); }, []);
  if (!d) return <Spinner />; if (!d.ok) return <p className="msg-err">{errText(d.error)}</p>;
  const msg = `🇪🇹 ኢትዮ ዲጂታል ማርኬት — ሱቅ፣ ሥራ እና ሙያተኛ በአንድ ቦታ! በዚህ አገናኝ ይቀላቀሉ፦ ${d.link}`;
  async function copy() { try { await navigator.clipboard.writeText(d.link); setCp(true); setTimeout(() => setCp(false), 2000); } catch (e) { } }
  async function claim() { const r = await post('/api/referral/claim', { code }); setOk(!!r.ok); setM(r.ok ? (r.gift ? `🎁 ኩፖን ተቀብለዋል፦ ${r.gift.code} (${ETB(r.gift.value)})` : '✅ ኮዱ ተመዝግቧል') : errText(r.error)); if (r.ok) load(); }
  return (
    <div className="mx-auto max-w-xl space-y-3"><PageTitle sub="ጓደኞችዎን ይጋብዙ">🎁 ጓደኛ ጋብዝ</PageTitle>
      <div className="card text-center"><p className="muted">የእርስዎ የግል ኮድ</p><b className="block text-4xl tracking-[0.3em] text-brand">{d.code}</b><p className="mt-2 break-all text-sm">{d.link}</p>
        <div className="mt-3 grid grid-cols-2 gap-2"><button className="btn-primary" onClick={copy}>{cp ? '✅ ተቀድቷል' : '📋 አገናኝ ቅዳ'}</button><a className="btn-ghost" target="_blank" rel="noopener noreferrer" href={'https://t.me/share/url?url=' + encodeURIComponent(d.link) + '&text=' + encodeURIComponent(msg.split(' በዚህ')[0])}>✈️ በ Telegram አጋራ</a></div>
        <p className="mt-3 text-lg">👥 የተቀላቀሉ ጓደኞች፦ <b>{d.count}</b></p>{d.reward > 0 && <p className="msg-ok mt-2">ጓደኛ ሲቀላቀል ሁለታችሁም የ {ETB(d.reward)} ኩፖን ታገኛላችሁ 🎉</p>}</div>
      {d.gifts.length > 0 && <div className="card"><b>🎟 የእርስዎ ኩፖኖች</b><ul className="mt-2 space-y-1 text-sm">{d.gifts.map(g => <li key={g.id} className="flex justify-between"><b className="tracking-wider">{g.code}</b><span className="muted">−{ETB(g.value)} · ≥ {ETB(g.minSubtotal)} · እስከ {g.expires}</span></li>)}</ul></div>}
      {!d.claimed && <div className="card"><b>ጋባዥ ኮድ አለዎት?</b><p className="muted">ከተመዘገቡ በ7 ቀን ውስጥ ብቻ።</p><div className="mt-2 flex gap-2"><input className="input uppercase" maxLength={6} placeholder="ABC123" value={code} onChange={e => setCode(e.target.value)} /><button className="btn-primary" disabled={code.trim().length < 6} onClick={claim}>ተቀበል</button></div><Msg m={m} ok={ok} /></div>}
    </div>
  );
}
export default function Page() { return <RequireAuth><Invite /></RequireAuth>; }
