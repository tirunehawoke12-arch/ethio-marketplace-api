'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ETB, get } from '@/lib/api';
import { stepLabel } from '@/lib/consts';
import { Empty, PageTitle, Spinner } from '@/components/ui';
import { OrderStepper } from '@/components/Stepper';
import RequireAuth from '@/components/RequireAuth';

function Orders() {
  const [o, setO] = useState(null);
  useEffect(() => { get('/api/market/my/orders').then(r => setO(r.orders || [])); }, []);
  if (!o) return <Spinner />;
  return (
    <div className="mx-auto max-w-2xl"><PageTitle>📦 ትዕዛዞቼ</PageTitle>
      {o.length ? o.map(x => (<Link key={x.id} href={`/orders/${x.id}`} className="card mb-3 block hover:shadow-lift"><div className="flex items-center justify-between gap-2"><b>🏪 {x.shopName}</b><span className={['cancelled', 'refunded', 'disputed'].includes(x.status) ? 'tag-bad' : 'tag'}>{stepLabel(x.status)}</span></div><p className="muted mt-1 line-clamp-1">{x.items.map(i => `${i.title}×${i.qty}`).join('፣ ')}</p><div className="mt-1 flex justify-between"><b className="text-brand">{ETB(x.total)}</b><span className="muted">{new Date(x.ts).toLocaleDateString('am-ET')}</span></div><OrderStepper status={x.status} mini /></Link>))
        : <Empty><p className="text-4xl">📦</p><p className="font-bold">እስካሁን ትዕዛዝ የለም</p><Link href="/market" className="btn-primary mt-3">ወደ ገበያ</Link></Empty>}
    </div>
  );
}
export default function Page() { return <RequireAuth><Orders /></RequireAuth>; }
