import { notFound } from 'next/navigation';
import { sget } from '@/lib/server';
import { imgUrl } from '@/lib/api';
import { SITE } from '@/lib/consts';
import { ProductCard, Thumb } from '@/components/Cards';
import { ExpandGroup } from '@/components/Expand';
import { Section, Stars, Empty } from '@/components/ui';
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const r = await sget('/api/market/shop/' + params.id); if (!r.ok) return { title: 'ሱቅ አልተገኘም' };
  const s = r.shop; return { title: `${s.name} — ${s.city}`, description: (s.about || `${s.name} (${s.kind}) በ ${s.city}፣ ${s.region}`).slice(0, 160), alternates: { canonical: '/shop/' + s.id }, openGraph: { images: s.logo ? [imgUrl(s.logo)] : ['/og.png'] } };
}
export default async function ShopPage({ params }) {
  const r = await sget('/api/market/shop/' + params.id); if (!r.ok) notFound();
  const { shop: s, products } = r;
  const ld = { '@context': 'https://schema.org', '@type': s.kind === 'ሆቴል እና ማረፊያ' ? 'Hotel' : 'LocalBusiness', name: s.name, description: s.about, image: s.logo ? SITE + imgUrl(s.logo) : undefined, url: SITE + '/shop/' + s.id, telephone: s.phone || undefined, address: { '@type': 'PostalAddress', streetAddress: s.address, addressLocality: s.city, addressRegion: s.region, addressCountry: 'ET' }, ...(s.reviews ? { aggregateRating: { '@type': 'AggregateRating', ratingValue: s.rating, reviewCount: s.reviews } } : {}) };
  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {s.cover ? <img src={imgUrl(s.cover)} alt="" className="mb-3 h-40 w-full rounded-3xl object-cover" /> : <div className="mb-3 h-24 rounded-3xl bg-brand" />}
      <div className="card">
        <div className="flex items-center gap-3"><Thumb id={s.logo} className="h-20 w-20 rounded-3xl" /><div><h1 className="text-2xl">{s.name}</h1><span className="tag">{s.kind}</span><p className="muted mt-1">{s.reviews ? <><Stars n={s.rating} /> {s.rating} ({s.reviews} አስተያየት)</> : 'አዲስ ሱቅ'}</p></div></div>
        {s.about && <p className="mt-3 whitespace-pre-wrap">{s.about}</p>}
        <div className="mt-3 flex flex-wrap gap-1.5">{(s.tags || []).map(t => <span key={t} className="tag">#{t}</span>)}</div>
        <ul className="muted mt-3 space-y-1"><li>📍 {s.city}, {s.region} — {s.address}</li>{s.hours && <li>🕒 {s.hours}</li>}{s.phone && <li>📞 <a className="font-bold text-brand" href={`tel:${s.phone}`}>{s.phone}</a></li>}<li>{s.delivery.pickup ? '🏬 በአካል መውሰድ ' : ''}{s.delivery.local ? `🚚 ማድረስ ${s.delivery.fee} ብር${s.delivery.areas ? ' (' + s.delivery.areas + ')' : ''}` : ''}</li>{s.year && <li>🗓 ከ {s.year} ጀምሮ</li>}{s.links && (s.links.telegram || s.links.website) && <li>{s.links.telegram && `✈️ ${s.links.telegram} `}{s.links.website && `🌐 ${s.links.website}`}</li>}</ul>
        {s.gallery && s.gallery.length > 0 && <div className="mt-3 flex snap-x gap-2 overflow-x-auto">{s.gallery.map(g => /* eslint-disable-next-line @next/next/no-img-element */ <img key={g} src={imgUrl(g)} alt="" className="h-44 w-64 shrink-0 snap-center rounded-2xl object-cover" />)}</div>}
      </div>
      <Section title={`🛍️ ዕቃዎች እና አገልግሎቶች (${products.length})`}>{products.length ? <ExpandGroup className="grid grid-cols-2 items-start gap-3 md:grid-cols-4">{products.map(p => <ProductCard key={p.id} p={p} />)}</ExpandGroup> : <Empty>ገና ዕቃ አልተዘረዘረም</Empty>}</Section>
    </div>
  );
}
