'use client';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { ETB, get, post, api } from '@/lib/api';
import { errText, stepLabel } from '@/lib/consts';
import { Empty, Msg, Spinner, StatusTag } from '@/components/ui';
import { Thumb } from '@/components/Cards';
import RequireAuth from '@/components/RequireAuth';
import ShopWizard, { shopToForm } from '@/components/ShopWizard';

function Dash({ d, reload, onEdit }) {
  const s = d.shop, [orders, setOrders] = useState(null), [m, setM] = useState(''), [ship, setShip] = useState({});
  const loadO = useCallback(() => get('/api/market/seller/orders').then(r => setOrders(r.orders || [])), []);
  useEffect(() => { loadO(); }, [loadO]);
  async function act(id, a, b) { setM(''); const r = await post(`/api/market/order/${id}/${a}`, b); if (!r.ok) return setM(errText(r.error)); loadO(); }
  async function del(id) { if (!confirm('ዕቃውን ይሰርዙ?')) return; await api('DELETE', '/api/market/product/' + id); reload(); }
  return (
    <div className="mx-auto max-w-2xl space-y-3">
      <div className="card"><div className="flex items-center gap-3"><Thumb id={s.logo} className="h-16 w-16 rounded-2xl" /><div className="min-w-0 flex-1"><h1 className="truncate text-xl">{s.name}</h1><p className="muted">{s.kind}</p></div><StatusTag s={s.status} /></div>
        {s.note && <p className="msg-err mt-3">የአድሚን መልዕክት፦ {s.note}</p>}{s.status === 'pending' && <p className="mt-3 rounded-2xl border-l-4 border-gold bg-gold/10 p-3 text-sm">አድሚን ሱቅዎን እስኪያጸድቅ ዕቃዎችን መዘርዘር ይችላሉ፤ ለህዝብ የሚታዩት ከጸደቀ በኋላ ነው።</p>}
        <div className="mt-3 grid grid-cols-4 gap-2 text-center text-sm">{[[d.stats.products, 'ዕቃዎች'], [d.stats.orders, 'ትዕዛዞች'], [d.stats.toDo, 'የሚጠብቁ'], [ETB(d.stats.earned), 'የተከፈለዎ']].map(([v, t]) => <div key={t} className="rounded-2xl bg-brand-light p-2"><b className="block">{v}</b><span className="muted">{t}</span></div>)}</div>
        <div className="mt-3 flex gap-2"><Link href="/me/products/new" className="btn-primary flex-1">➕ አዲስ ዕቃ</Link><button className="btn-ghost flex-1" onClick={onEdit}>✏️ ሱቅ አርትዕ</button>{s.status === 'active' && <Link className="btn-ghost" href={`/shop/${s.id}`}>👁</Link>}</div></div>
      <h2 className="pt-1 text-lg">📦 ዕቃዎቼ</h2>
      {d.products.length ? d.products.map(p => (<div key={p.id} className="card flex items-center gap-3"><Thumb id={p.imgs[0]} className="h-14 w-14 rounded-2xl" /><div className="min-w-0 flex-1"><b className="line-clamp-1">{p.title}</b><p className="muted">{ETB(p.price)} · ክምችት {p.stock} · {p.status === 'hidden' ? '🙈 ተደብቋል' : '👁 ይታያል'}</p></div><Link href={`/me/products/${p.id}`} className="btn-ghost !min-h-[40px] !px-3">✏️</Link><button className="btn-ghost !min-h-[40px] !px-3" onClick={() => del(p.id)}>🗑</button></div>)) : <Empty>እስካሁን ዕቃ አልዘረዘሩም — «➕ አዲስ ዕቃ» ይጫኑ።</Empty>}
      <h2 className="pt-1 text-lg">📥 የገቡ ትዕዛዞች</h2><Msg m={m} />
      {!orders ? <Spinner /> : orders.length ? orders.map(o => (
        <div key={o.id} className="card"><div className="flex items-center justify-between"><b>#{o.id.slice(0, 6)} · {ETB(o.total)}</b><span className="tag">{stepLabel(o.status)}</span></div><p className="muted">{o.items.map(i => `${i.title}×${i.qty}`).join('፣ ')}</p>
          {o.buyer ? <p className="mt-2 rounded-2xl bg-brand-light p-3 text-sm">👤 {o.buyer.name || 'ደንበኛ'}<br />{o.delivery.type === 'delivery' ? '🚚 ' + o.delivery.address : '🏬 በአካል ይወስዳል'}<br />📞 <a href={`tel:${o.delivery.phone}`} className="font-bold text-brand">{o.delivery.phone}</a>{o.delivery.note && <><br />📝 {o.delivery.note}</>}</p> : <p className="muted mt-2">🔒 የገዥ አድራሻ ክፍያ ከተረጋገጠ በኋላ ይታያል</p>}
          <p className="muted mt-1">💰 የሚደርስዎ፦ {ETB(o.sellerNet)} (ኮሚሽን {ETB(o.commission)})</p>
          {o.status === 'paid' && <div className="mt-2 grid grid-cols-2 gap-2"><button className="btn-primary" onClick={() => act(o.id, 'accept', {})}>✅ ተቀብያለሁ</button><button className="btn-danger" onClick={() => act(o.id, 'decline', { note: 'ሻጩ አልተቀበለም' })}>✕ አልችልም</button></div>}
          {o.status === 'preparing' && <div className="mt-2"><input className="input" placeholder="የመላኪያ መረጃ (አውቶቡስ ቁጥር፣ ሹፌር ስልክ…)" value={ship[o.id] || ''} onChange={e => setShip({ ...ship, [o.id]: e.target.value })} /><button className="btn-primary mt-2 w-full" onClick={() => act(o.id, 'ship', { note: ship[o.id] })}>🚚 ተልኳል</button></div>}
        </div>)) : <Empty>እስካሁን ትዕዛዝ የለም</Empty>}
    </div>
  );
}
function ShopPage() {
  const [d, setD] = useState(null), [edit, setEdit] = useState(false);
  const load = useCallback(() => get('/api/market/my/shop').then(setD), []);
  useEffect(() => { load(); }, [load]);
  if (!d) return <Spinner />;
  if (!d.shop || edit) return <ShopWizard editing={!!d.shop} initial={d.shop ? shopToForm(d.shop) : null} onDone={() => { setEdit(false); load(); }} />;
  return <Dash d={d} reload={load} onEdit={() => setEdit(true)} />;
}
export default function Page() { return <RequireAuth><ShopPage /></RequireAuth>; }
