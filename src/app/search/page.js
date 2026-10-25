import Link from 'next/link';
import { sget } from '@/lib/server';
import { qs } from '@/lib/api';
import { Empty, PageTitle } from '@/components/ui';
import { Thumb } from '@/components/Thumb';
import MarketTabs from '@/components/MarketTabs';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'ፍለጋ', robots: { index: false } };

export default async function Search({ searchParams }) {
  const q = String((searchParams && searchParams.q) || '').trim();
  const r = q.length >= 2 ? await sget('/api/search' + qs({ q })) : { groups: [] };
  return (
    <div>
      <MarketTabs active="" />
      <PageTitle sub={q ? `«${q}»` : ''}>🔎 ፍለጋ</PageTitle>
      <form className="card flex gap-2"><input name="q" defaultValue={q} placeholder="ዕቃ፣ ሱቅ፣ ገጽ፣ ሙያተኛ፣ አሰሪ ወይም ሥራ…" className="input flex-1" /><button className="btn-primary">ፈልግ</button></form>
      {q.length < 2 ? <Empty>ቢያንስ 2 ፊደል ያስገቡ</Empty> : !(r.groups || []).length ? <Empty>ለ«{q}» ምንም አልተገኘም</Empty> : (r.groups || []).map(g => (
        <section key={g.key} className="mt-5"><h2 className="mb-2 text-lg">{g.label}</h2>
          <div className="grid gap-2 md:grid-cols-2">{g.items.map(x => <Link key={x.id} href={x.href} className="card flex items-center gap-3 !p-3 transition hover:-translate-y-0.5 hover:shadow-lift"><Thumb id={x.img} className="h-14 w-14 rounded-2xl" /><div className="min-w-0 flex-1"><b className="block truncate">{x.title}</b><p className="muted truncate">{x.sub}</p></div><span aria-hidden>←</span></Link>)}</div>
        </section>))}
    </div>
  );
}
