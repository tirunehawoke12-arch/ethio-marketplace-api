import ChatBtn from '@/components/actions/ChatBtn';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { sget } from '@/lib/server';
import { ETB, imgUrl } from '@/lib/api';
import { SITE } from '@/lib/consts';
import { Stars } from '@/components/ui';
import { Thumb } from '@/components/Cards';
import { ReportBtn } from '@/components/actions/TrustBits';
import ProductActions from '@/components/actions/ProductActions';
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const r = await sget('/api/market/product/' + params.id); if (!r.ok) return { title: 'ዕቃ አልተገኘም' };
  const p = r.product, img = p.imgs && p.imgs[0];
  return { title: `${p.title} — ${ETB(p.price)}`, description: (p.desc || `${p.title} በ ${p.shop.name}፣ ${p.shop.city}`).slice(0, 160), alternates: { canonical: '/p/' + p.id }, openGraph: { images: img ? [imgUrl(img)] : ['/og.png'], type: 'website' } };
}
export default async function ProductPage({ params }) {
  const r = await sget('/api/market/product/' + params.id); if (!r.ok) notFound();
  const { product: p, shop: s, reviews } = r;
  const ld = { '@context': 'https://schema.org', '@type': 'Product', name: p.title, description: p.desc, image: (p.imgs || []).map(i => SITE + imgUrl(i)), category: p.category, offers: { '@type': 'Offer', priceCurrency: 'ETB', price: p.price, availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock', url: SITE + '/p/' + p.id, seller: { '@type': 'Organization', name: s.name } }, ...(s.reviews ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: s.rating, reviewCount: s.reviews } } : {}) };
  return (
    <div className="grid gap-5 md:grid-cols-2">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <div className="flex snap-x gap-2 overflow-x-auto md:grid md:overflow-visible">
        {(p.imgs.length ? p.imgs : ['']).map((i, k) => /* eslint-disable-next-line @next/next/no-img-element */ <img key={k} src={imgUrl(i) || "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'%3E%3Crect width='4' height='3' fill='%23e8efe9'/%3E%3C/svg%3E"} alt={p.title} className="w-[88%] shrink-0 snap-center rounded-3xl bg-brand-light object-cover md:w-full" />)}
      </div>
      <div>
        <div className="card">
          <span className="tag">{p.category}</span>
          <h1 className="mt-2 text-2xl">{p.title}</h1>
          <p className="mt-2 text-3xl font-black text-brand">{ETB(p.price)} <span className="muted">/ {p.unit}</span></p>
          <p className="muted mt-1">{p.stock > 0 ? `✅ ${p.stock} ይቀራል` : '❌ አልቋል'}</p>
          {p.desc && <p className="mt-3 whitespace-pre-wrap">{p.desc}</p>}
          {p.stock > 0 && <ProductActions product={p} />}
        </div>
        <Link href={`/shop/${s.id}`} className="card mt-3 flex items-center gap-3 hover:shadow-lift"><Thumb id={s.logo} className="h-14 w-14 rounded-2xl" /><div className="min-w-0 flex-1"><p className="font-extrabold">🏪 {s.name}</p><p className="muted">{s.city}, {s.region}</p><p className="muted">{s.reviews ? <><Stars n={s.rating} /> {s.rating} ({s.reviews})</> : 'አዲስ ሱቅ'}</p><p className="muted">{s.delivery.pickup ? '🏬 በአካል መውሰድ ' : ''}{s.delivery.local ? '🚚 ማድረስ' : ''}</p></div></Link>
        {reviews.length > 0 && (<div className="mt-3 space-y-2">{reviews.map((v, k) => <div key={k} className="card"><Stars n={v.rating} /> <b>{v.who}</b><p>{v.text}</p></div>)}</div>)}
      </div>
      <div className="mt-4"><ChatBtn t="p" id={p.id} /></div>
      <ReportBtn t="p" id={p.id} />
    </div>
  );
}
