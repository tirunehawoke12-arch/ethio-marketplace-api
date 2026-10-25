import Link from 'next/link';
import { sget } from '@/lib/server';
import { qs } from '@/lib/api';
import { REGIONS } from '@/lib/consts';
import { EmployerCard } from '@/components/Cards';
import { Empty, PageTitle } from '@/components/ui';
import MarketTabs from '@/components/MarketTabs';
import { ExpandGroup } from '@/components/Expand';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'አሰሪዎች እና ድርጅቶች', description: 'በኢትዮጵያ ሠራተኛ የሚፈልጉ አሰሪዎች እና ድርጅቶች ማውጫ።', alternates: { canonical: '/employers' } };

export default async function Employers({ searchParams }) {
  const sp = searchParams || {};
  const r = await sget('/api/people/employers' + qs({ q: sp.q, region: sp.region }));
  return (
    <div>
      <MarketTabs active="employers" />
      <PageTitle sub={`${r.total || 0} አሰሪ`}>🏢 አሰሪዎች</PageTitle>
      <form className="card grid gap-3 md:grid-cols-4">
        <input name="q" defaultValue={sp.q || ''} placeholder="🔎 ፈልግ" className="input md:col-span-2" />
        <select name="region" defaultValue={sp.region || ''} className="input"><option value="">ሁሉም ክልል</option>{REGIONS.map(c => <option key={c}>{c}</option>)}</select>
        <button className="btn-primary">አጣራ</button>
      </form>
      {r.items && r.items.length ? <ExpandGroup className="mt-4 grid items-start gap-3 md:grid-cols-2">{r.items.map(e => <EmployerCard key={e.id} e={e} />)}</ExpandGroup> : <Empty>ምንም አልተገኘም</Empty>}
      <div className="card mt-5 flex flex-wrap items-center justify-between gap-3"><b>🏢 ሠራተኛ ይፈልጋሉ? የአሰሪ ክፍል ይክፈቱ</b><Link className="btn-primary" href="/me/employer">➕ ክፈት</Link></div>
    </div>
  );
}
