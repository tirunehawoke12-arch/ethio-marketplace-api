import Link from 'next/link';
import { sget } from '@/lib/server';
import { qs } from '@/lib/api';
import { REGIONS } from '@/lib/consts';
import { ProductCard } from '@/components/Cards';
import { Empty, PageTitle } from '@/components/ui';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'ገበያ — ዕቃዎች እና አገልግሎቶች', alternates: { canonical: '/market' } };

export default async function Market({ searchParams }) {
  const sp = searchParams || {}, page = Math.max(1, parseInt(sp.page) || 1);
  const [r, cfg] = await Promise.all([sget('/api/market/products' + qs({ q: sp.q, cat: sp.cat, region: sp.region, min: sp.min, max: sp.max, sort: sp.sort, page })), sget('/api/market/config')]);
  const next = { ...sp, page: page + 1 }, prev = { ...sp, page: page - 1 };
  return (
    <div>
      <PageTitle sub={`${r.total || 0} ውጤት`}>{sp.cat || (sp.q ? `🔎 «${sp.q}»` : '🛍️ ገበያ')}</PageTitle>
      <form className="card grid gap-3 md:grid-cols-6">
        <input name="q" defaultValue={sp.q || ''} placeholder="ፈልግ" className="input md:col-span-2" />
        <select name="cat" defaultValue={sp.cat || ''} className="input"><option value="">ሁሉም ምድብ</option>{(cfg.cats || []).map(c => <option key={c}>{c}</option>)}</select>
        <select name="region" defaultValue={sp.region || ''} className="input"><option value="">ሁሉም ክልል</option>{REGIONS.map(c => <option key={c}>{c}</option>)}</select>
        <select name="sort" defaultValue={sp.sort || ''} className="input"><option value="">አዳዲስ</option><option value="price_asc">ዋጋ ↑</option><option value="price_desc">ዋጋ ↓</option></select>
        <button className="btn-primary">አጣራ</button>
        <input name="min" type="number" defaultValue={sp.min || ''} placeholder="ዝቅተኛ ዋጋ" className="input" /><input name="max" type="number" defaultValue={sp.max || ''} placeholder="ከፍተኛ ዋጋ" className="input" />
      </form>
      <div className="mt-4">
        {r.items && r.items.length ? <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{r.items.map(p => <ProductCard key={p.id} p={p} />)}</div> : <Empty>ምንም አልተገኘም</Empty>}
      </div>
      <div className="mt-5 flex justify-center gap-3">{page > 1 && <Link className="btn-ghost" href={'/market' + qs(prev)}>‹ ቀዳሚ</Link>}{(r.total || 0) > page * 24 && <Link className="btn-ghost" href={'/market' + qs(next)}>ቀጣይ ›</Link>}</div>
    </div>
  );
}
