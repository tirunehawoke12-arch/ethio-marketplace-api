import Link from 'next/link';
import { sget } from '@/lib/server';
import { qs } from '@/lib/api';
import { REGIONS } from '@/lib/consts';
import { JobCard, WorkerCard } from '@/components/Cards';
import { Empty, PageTitle } from '@/components/ui';
import MarketTabs from '@/components/MarketTabs';
import { ExpandGroup } from '@/components/Expand';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'ሥራ እና ሙያተኞች', description: 'የሥራ ማስታወቂያዎች እና በመላው ኢትዮጵያ የሚገኙ ሙያተኞች ማውጫ።', alternates: { canonical: '/jobs' } };

export default async function Jobs({ searchParams }) {
  const sp = searchParams || {}, isJ = sp.t !== 'workers';
  const [r, pc] = await Promise.all([sget((isJ ? '/api/people/jobs' : '/api/people/workers') + qs({ q: sp.q, cat: sp.cat, region: sp.region, type: sp.type })), sget('/api/people/config')]);
  return (
    <div>
      <MarketTabs active={isJ ? 'jobs' : 'workers'} />
      <PageTitle sub={`${r.total || 0} ውጤት`}>💼 ሥራ እና ሙያተኞች</PageTitle>
      <form className="card grid gap-3 md:grid-cols-5">
        {!isJ && <input type="hidden" name="t" value="workers" />}
        <input name="q" defaultValue={sp.q || ''} placeholder="🔎 ፈልግ" className="input md:col-span-2" />
        <select name="cat" defaultValue={sp.cat || ''} className="input"><option value="">ሁሉም ዘርፍ</option>{(pc.workCats || []).map(c => <option key={c}>{c}</option>)}</select>
        <select name="region" defaultValue={sp.region || ''} className="input"><option value="">ሁሉም ክልል</option>{REGIONS.map(c => <option key={c}>{c}</option>)}</select>
        {isJ ? <select name="type" defaultValue={sp.type || ''} className="input"><option value="">ሁሉም ዓይነት</option>{(pc.jobTypes || []).map(c => <option key={c}>{c}</option>)}</select> : <span />}
        <button className="btn-primary md:col-span-5">አጣራ</button>
      </form>
      <ExpandGroup className="mt-4 grid items-start gap-3 md:grid-cols-2">{(r.items || []).map(x => (isJ ? <JobCard key={x.id} j={x} /> : <WorkerCard key={x.id} w={x} />))}</ExpandGroup>
      {!(r.items && r.items.length) && <Empty>ምንም አልተገኘም</Empty>}
      <div className="card mt-5 flex flex-wrap items-center justify-between gap-3"><b>{isJ ? '🏢 ሠራተኛ ይፈልጋሉ? ሥራ ያስታውቁ' : '🧑‍🔧 ሙያዎን ያሳዩ — ገጽ ይክፈቱ'}</b><Link className="btn-primary" href={isJ ? '/me/employer' : '/me/worker'}>ገጽ ክፈት</Link></div>
    </div>
  );
}
