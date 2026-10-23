import Link from 'next/link';
import { sget } from '@/lib/server';
import { qs } from '@/lib/api';
import { SiteCard } from '@/components/CardsX';

/* የተመዘገቡ ገጾች በገበያው ላይ ለሁሉም ይታያሉ (ተዛማጅ ፍለጋም ይደግፋል) */
export default async function PagesStrip({ q, region, kind, title = '🌐 የተመዘገቡ ገጾች', limit = 6, hideEmpty = true }) {
  const r = await sget('/api/pages' + qs({ q, region, kind }));
  const items = (r.items || []).slice(0, limit);
  if (!items.length && hideEmpty) return null;
  return (
    <section className="mt-6">
      <div className="mb-2 flex items-center justify-between"><h2 className="text-lg">{title} {r.total ? <span className="muted !text-sm">({r.total})</span> : null}</h2><Link href="/sites" className="text-sm font-bold text-brand">ሁሉም ገጾች ›</Link></div>
      {items.length ? <div className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map(p => <SiteCard key={p.id} p={p} />)}</div>
        : <div className="card muted text-center">ገና ገጽ የለም — <Link className="font-bold text-brand" href="/me/sites/new">የመጀመሪያው ይሁኑ</Link></div>}
    </section>
  );
}
