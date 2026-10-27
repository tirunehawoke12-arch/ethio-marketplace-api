import Link from 'next/link';
import { sget } from '@/lib/server';
import { qs } from '@/lib/api';
import { REGIONS } from '@/lib/consts';
import { ProductCard } from '@/components/Cards';
import { Empty, PageTitle } from '@/components/ui';
import MarketTabs from '@/components/MarketTabs';
import PagesStrip from '@/components/PagesStrip';
import { ExpandGroup } from '@/components/Expand';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'ገበያ — ዕቃዎች እና አገልግሎቶች', alternates: { canonical: '/market' } };

export default async function Market({ searchParams }) {
  const sp = searchParams || {}, page = Math.max(1, parseInt(sp.page) || 1);
  const [r, cfg] = await Promise.all([sget('/api/market/products' + qs({ q: sp.q, cat: sp.cat, region: sp.region, min: sp.min, max: sp.max, city: sp.city, minRating: sp.minRating, sort: sp.sort, page })), sget('/api/market/config')]);
  const next = { ...sp, page: page + 1 }, prev = { ...sp, page: page - 1 };
  return (
    <div>
      <MarketTabs active="market" />
      <PageTitle sub={`${r.total || 0} ውጤት`}>{sp.cat || (sp.q ? `🔎 «${sp.q}»` : '🛍️ ገበያ')}</PageTitle>
      <details className="card group" open={!!(sp.q || sp.cat || sp.region || sp.min || sp.max || sp.sort || sp.city || sp.minRating)}><summary className="flex cursor-pointer list-none items-center justify-between font-extrabold">🎛 አጣራ እና ፈልግ <span className="text-brand transition group-open:rotate-180">▾</span></summary>
      <form className="mt-3 grid gap-3 md:grid-cols-6">
        <input name="q" defaultValue={sp.q || ''} placeholder="ፈልግ" className="input md:col-span-2" />
        <select name="cat" defaultValue={sp.cat || ''} className="input"><option value="">ሁሉም ምድብ</option>{(cfg.cats || []).map(c => <option key={c}>{c}</option>)}</select>
        <select name="region" defaultValue={sp.region || ''} className="input"><option value="">ሁሉም ክልል</option>{REGIONS.map(c => <option key={c}>{c}</option>)}</select>
        <select name="sort" defaultValue={sp.sort || ''} className="input"><option value="">አዳዲስ</option><option value="price_asc">ዋጋ ↑</option><option value="price_desc">ዋጋ ↓</option></select>
        <button className="btn-primary">አጣራ</button>
        <input name="city" defaultValue={sp.city || ''} placeholder="📍 ከተማ" className="input" /><select name="minRating" defaultValue={sp.minRating || ''} className="input"><option value="">ማንኛውም ደረጃ</option><option value="4">⭐ 4 እና ከዚያ በላይ</option><option value="3">⭐ 3 እና ከዚያ በላይ</option></select><input name="min" type="number" defaultValue={sp.min || ''} placeholder="ዝቅተኛ ዋጋ" className="input" /><input name="max" type="number" defaultValue={sp.max || ''} placeholder="ከፍተኛ ዋጋ" className="input" />
      </form></details>
      <div className="mt-4">
        {r.items && r.items.length ? <ExpandGroup className="grid grid-cols-2 items-start gap-3 md:grid-cols-4">{r.items.map(p => <ProductCard key={p.id} p={p} />)}</ExpandGroup> : <Empty>ምንም አልተገኘም</Empty>}
      </div>
      <PagesStrip q={sp.q} region={sp.region} title={sp.q ? `🌐 «${sp.q}» — ተዛማጅ ገጾች` : '🌐 የተመዘገቡ ገጾች'} hideEmpty={!!sp.q} />
      <div className="mt-5 flex justify-center gap-3">{page > 1 && <Link className="btn-ghost" href={'/market' + qs(prev)}>‹ ቀዳሚ</Link>}{(r.total || 0) > page * 24 && <Link className="btn-ghost" href={'/market' + qs(next)}>ቀጣይ ›</Link>}</div>
    </div>
  );
}
