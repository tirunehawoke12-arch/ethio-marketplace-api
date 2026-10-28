'use client';
/* eslint-disable @next/next/no-img-element */
/* አድሚን፦ ሁሉም ዕቃዎች — ፈልግ፣ አጣራ፣ ደብቅ/መልስ */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { get, imgUrl, post, ETB } from '@/lib/api';
import { Spinner, StatusTag } from '@/components/ui';
import Ico from './Ico';

export default function AdminProducts({ q: q0 = '' }) {
  const [q, setQ] = useState(q0), [st, setSt] = useState(''), [pg, setPg] = useState(1), [d, setD] = useState(null);
  const load = useCallback(() => get('/api/admin/products?' + new URLSearchParams({ q, status: st, page: pg })).then(setD), [q, st, pg]);
  useEffect(() => { const t = setTimeout(load, 200); return () => clearTimeout(t); }, [load]);
  async function flip(p) { await post(`/api/admin/product/${p.id}/status`, { status: p.status === 'active' ? 'suspended' : 'active' }); load(); }
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-2"><div className="relative min-w-[200px] flex-1"><Ico n="search" s={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-mute" /><input className="input !pl-10" placeholder="ዕቃ ወይም ሱቅ ፈልግ" value={q} onChange={e => { setQ(e.target.value); setPg(1); }} /></div>
        {[['', 'ሁሉም'], ['active', '🟢 ንቁ'], ['suspended', '⛔ የታገዱ']].map(([k, l]) => <button key={k} className={st === k ? 'chip-on' : 'chip'} onClick={() => { setSt(k); setPg(1); }}>{l}</button>)}</div>
      {!d ? <Spinner /> : (<>
        <p className="muted mb-2">{d.total} ዕቃ</p>
        <div className="grid gap-2 md:grid-cols-2">{d.items.map(p => (
          <div key={p.id} className="card flex items-center gap-3 !p-3">
            {p.img ? <img src={imgUrl(p.img)} alt="" className="h-14 w-14 shrink-0 rounded-2xl object-cover" /> : <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-brand-light text-brand"><Ico n="box" /></span>}
            <div className="min-w-0 flex-1"><b className="block truncate">{p.title}</b><span className="muted block truncate">{p.shop} · {ETB(p.price)} · ክምችት {p.stock}</span><StatusTag s={p.status === 'suspended' ? 'suspended' : p.status} /></div>
            <Link href={'/p/' + p.id} className="btn-soft !px-2" aria-label="ክፈት"><Ico n="eye" s={16} /></Link>
            <button className={p.status === 'active' ? 'btn-soft !text-red-700' : 'btn-soft'} onClick={() => flip(p)}><Ico n={p.status === 'active' ? 'ban' : 'check'} s={16} />{p.status === 'active' ? 'ደብቅ' : 'መልስ'}</button></div>))}</div>
        <div className="mt-3 flex justify-center gap-2"><button className="btn-soft" disabled={pg <= 1} onClick={() => setPg(pg - 1)}>‹ ቀዳሚ</button><span className="muted self-center">{pg}</span><button className="btn-soft" disabled={pg * 30 >= d.total} onClick={() => setPg(pg + 1)}>ቀጣይ ›</button></div></>)}
    </div>
  );
}
