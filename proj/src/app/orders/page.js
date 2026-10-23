'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ETB, get } from '@/lib/api';
import { stepLabel } from '@/lib/consts';
import { Empty, PageTitle, Spinner } from '@/components/ui';
import { OrderStepper } from '@/components/Stepper';
import { ExpandCard, ExpandGroup } from '@/components/Expand';
import RequireAuth from '@/components/RequireAuth';

function Orders() {
  const [o, setO] = useState(null);
  useEffect(() => { get('/api/market/my/orders').then(r => setO(r.orders || [])); }, []);
  if (!o) return <Spinner />;
  return (
    <div className="mx-auto max-w-2xl"><PageTitle>📦 ትዕዛዞቼ</PageTitle>
      {o.length ? <ExpandGroup className="grid items-start gap-3">{o.map(x => (
        <ExpandCard key={x.id} href={`/orders/${x.id}`} cta="ሙሉ ትዕዛዝ"
          head={<><div className="flex items-center justify-between gap-2"><b>🏪 {x.shopName}</b><span className={['cancelled', 'refunded', 'disputed'].includes(x.status) ? 'tag-bad' : 'tag'}>{stepLabel(x.status)}</span></div><p className="muted mt-1 line-clamp-1">{x.items.map(i => `${i.title}×${i.qty}`).join('፣ ')}</p><div className="mt-1 flex justify-between"><b className="text-brand">{ETB(x.total)}</b><span className="muted">{new Date(x.ts).toLocaleDateString('am-ET')}</span></div><OrderStepper status={x.status} mini /></>}>
          <div>{x.items.map(i => <div key={i.pid} className="flex justify-between py-1 text-sm"><span>{i.title} × {i.qty}</span><b>{ETB((i.price || 0) * i.qty)}</b></div>)}{x.fee > 0 && <div className="flex justify-between py-1 text-sm"><span>አገልግሎት ክፍያ</span><b>{ETB(x.fee)}</b></div>}<div className="flex justify-between border-t border-line py-1 font-extrabold"><span>ጠቅላላ</span><span className="text-brand">{ETB(x.total)}</span></div></div>
          {x.history && x.history.length > 0 && <div><p className="text-sm font-extrabold">📜 ታሪክ</p>{x.history.slice(-4).reverse().map((h, k) => <p key={k} className="muted">{new Date(h.ts).toLocaleString('am-ET')} — {stepLabel(h.s)}</p>)}</div>}
        </ExpandCard>))}</ExpandGroup>
        : <Empty><p className="text-4xl">📦</p><p className="font-bold">እስካሁን ትዕዛዝ የለም</p><Link href="/market" className="btn-primary mt-3">ወደ ገበያ</Link></Empty>}
    </div>
  );
}
export default function Page() { return <RequireAuth><Orders /></RequireAuth>; }
