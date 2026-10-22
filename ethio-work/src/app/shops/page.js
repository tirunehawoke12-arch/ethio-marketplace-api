import Link from 'next/link';
import { sget } from '@/lib/server';
import { qs } from '@/lib/api';
import { ShopCard } from '@/components/Cards';
import { Empty, PageTitle } from '@/components/ui';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'ሱቆች፣ ሆቴሎች እና አገልግሎት ሰጪዎች', alternates: { canonical: '/shops' } };

export default async function Shops({ searchParams }) {
  const sp = searchParams || {};
  const [r, cfg] = await Promise.all([sget('/api/market/shops' + qs({ kind: sp.kind, q: sp.q, region: sp.region })), sget('/api/market/config')]);
  return (
    <div>
      <PageTitle sub={`${r.total || 0} ገጽ`}>🏪 ሱቆች እና ድርጅቶች</PageTitle>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1"><Link href="/shops" className={sp.kind ? 'chip' : 'chip-on'}>ሁሉም</Link>{(cfg.kinds || []).map(k => <Link key={k} href={'/shops' + qs({ kind: k })} className={sp.kind === k ? 'chip-on' : 'chip'}>{k}</Link>)}</div>
      {r.items && r.items.length ? <div className="grid gap-3 md:grid-cols-2">{r.items.map(s => <ShopCard key={s.id} s={s} />)}</div> : <Empty>እስካሁን የለም</Empty>}
    </div>
  );
}
