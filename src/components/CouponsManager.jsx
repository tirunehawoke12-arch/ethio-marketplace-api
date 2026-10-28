'use client';
/* ኩፖን አስተዳደር — ሻጭ (የሱቅ ኩፖን) እና አድሚን (የጣቢያ ኩፖን) */
import { useCallback, useEffect, useState } from 'react';
import { get, post, ETB } from '@/lib/api';
import { errText } from '@/lib/consts';
import { Msg, Spinner } from '@/components/ui';

export default function CouponsManager({ admin }) {
  const base = admin ? '/api/admin/coupons' : '/api/coupons', [L, setL] = useState(null), [f, setF] = useState({ code: '', kind: 'pct', value: '', minSubtotal: '', maxUses: '', expires: '' }), [m, setM] = useState(''), [ok, setOk] = useState(false);
  const load = useCallback(() => get(admin ? '/api/admin/coupons' : '/api/coupons/my').then(r => setL(r.ok ? r : { items: [], hasShop: false })), [admin]); useEffect(() => { load(); }, [load]);
  async function add() { const r = await post(base, f); setOk(!!r.ok); setM(r.ok ? '✅ ኩፖን ተፈጥሯል' : errText(r.error)); if (r.ok) { setF({ ...f, code: '', value: '' }); load(); } }
  async function flip(c) { const r = await post(admin ? `/api/admin/coupons/${c.id}/off` : `/api/coupons/${c.id}/off`, {}); if (!r.ok) { setOk(false); setM(errText(r.error)); } load(); }
  if (!L) return <Spinner />; if (!admin && !L.hasShop) return <p className="muted">ኩፖን ለመፍጠር መጀመሪያ ሱቅ ይክፈቱ።</p>;
  const set = (k, v) => setF(x => ({ ...x, [k]: v }));
  return (
    <div className="card">
      <b>🎟 {admin ? 'የጣቢያ ኩፖኖች (በመድረኩ የሚሸፈኑ)' : 'የሱቄ ኩፖኖች (በሻጩ የሚሸፈኑ)'}</b>
      <p className="muted mt-1">{admin ? 'ቅናሹ ከመድረኩ ኮሚሽን ይቀነሳል፤ ሻጩ ሙሉ ክፍያውን ያገኛል።' : 'ቅናሹ ከሽያጭዎ ይቀነሳል፤ ኮሚሽኑ ከቅናሽ በኋላ ባለው ዋጋ ይሰላል።'}</p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <input className="input uppercase" placeholder="ኮድ (ለምሳሌ EID10)" value={f.code} onChange={e => set('code', e.target.value)} maxLength={20} />
        <div className="flex gap-2"><select className="input !w-28" value={f.kind} onChange={e => set('kind', e.target.value)}><option value="pct">%</option><option value="fixed">ብር</option></select><input className="input" type="number" min="1" placeholder={f.kind === 'pct' ? 'ቅናሽ % (1–90)' : 'ቅናሽ በብር'} value={f.value} onChange={e => set('value', e.target.value)} /></div>
        <input className="input" type="number" min="0" placeholder="ዝቅተኛ ግዢ (ብር፤ አማራጭ)" value={f.minSubtotal} onChange={e => set('minSubtotal', e.target.value)} />
        <input className="input" type="number" min="0" placeholder="ጠቅላላ ብዛት (ባዶ = ያልተገደበ)" value={f.maxUses} onChange={e => set('maxUses', e.target.value)} />
        <label className="text-sm font-bold sm:col-span-2">ማብቂያ ቀን (አማራጭ)<input className="input mt-1" type="date" value={f.expires} onChange={e => set('expires', e.target.value)} /></label>
      </div>
      <button className="btn-primary mt-3 w-full" disabled={f.code.trim().length < 4 || !f.value} onClick={add}>➕ ኩፖን ፍጠር</button><Msg m={m} ok={ok} />
      <ul className="mt-4 space-y-2">{L.items.filter(c => !c.forUid).map(c => (
        <li key={c.id} className="flex items-center gap-2 rounded-2xl border border-line p-3 dark:border-[#25352c]"><div className="min-w-0 flex-1"><b className="tracking-wider">{c.code}</b> <span className={c.status === 'active' ? 'tag' : 'tag-warn'}>{c.status === 'active' ? '🟢 ንቁ' : '⏸ ቆሟል'}</span>
          <p className="muted">−{c.kind === 'pct' ? c.value + '%' : ETB(c.value)}{c.minSubtotal ? ` · ≥ ${ETB(c.minSubtotal)}` : ''} · ተጠቅሟል {c.used}{c.maxUses ? '/' + c.maxUses : ''}{c.expires ? ' · እስከ ' + c.expires : ''}{c.shop ? ' · ' + c.shop : ''}</p></div>
          <button className="btn-soft" onClick={() => flip(c)}>{c.status === 'active' ? 'አቁም' : 'አስጀምር'}</button></li>))}{!L.items.filter(c => !c.forUid).length && <li className="muted">እስካሁን ኩፖን የለም</li>}</ul>
    </div>
  );
}
