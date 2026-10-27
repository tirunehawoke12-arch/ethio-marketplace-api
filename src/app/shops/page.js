import Link from 'next/link';
import { sget } from '@/lib/server';
import { qs } from '@/lib/api';
import { ShopCard } from '@/components/Cards';
import { Empty, PageTitle } from '@/components/ui';
import MarketTabs from '@/components/MarketTabs';
import { ExpandGroup } from '@/components/Expand';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'ሱቆች፣ ሆቴሎች እና አገልግሎት ሰጪዎች', alternates: { canonical: '/shops' } };

export default async function Shops({ searchParams }) {
  const sp = searchParams || {};
  const [r, cfg] = await Promise.all([sget('/api/market/shops' + qs({ kind: sp.kind, q: sp.q, region: sp.region, city: sp.city, minRating: sp.minRating })), sget('/api/market/config')]);
  return (
    <div>
      <MarketTabs active="shops" />
      <PageTitle sub={`${r.total || 0} ገጽ`}>🏪 ሱቆች እና ድርጅቶች</PageTitle>
      <form className="card mb-3 grid gap-2 md:grid-cols-4">{sp.kind && <input type="hidden" name="kind" value={sp.kind} />}<input name="q" defaultValue={sp.q || ''} placeholder="🔎 ፈልግ" className="input md:col-span-2" /><input name="city" defaultValue={sp.city || ''} placeholder="📍 ከተማ" className="input" /><select name="minRating" defaultValue={sp.minRating || ''} className="input"><option value="">ማንኛውም ደረጃ</option><option value="4">⭐ 4+</option><option value="3">⭐ 3+</option></select><button className="btn-primary md:col-span-4">አጣራ</button></form>
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1"><Link href="/shops" className={sp.kind ? 'chip' : 'chip-on'}>ሁሉም</Link>{(cfg.kinds || []).map(k => <Link key={k} href={'/shops' + qs({ kind: k })} className={sp.kind === k ? 'chip-on' : 'chip'}>{k}</Link>)}</div>
      {r.items && r.items.length ? <ExpandGroup className="grid items-start gap-3 md:grid-cols-2">{r.items.map(s => <ShopCard key={s.id} s={s} />)}</ExpandGroup> : <Empty>እስካሁን የለም</Empty>}
    </div>
  );
}
