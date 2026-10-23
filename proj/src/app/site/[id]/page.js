import { notFound } from 'next/navigation';
import { sget } from '@/lib/server';
import { imgUrl } from '@/lib/api';
import SiteView from '@/components/SiteView';
import { SITE } from '@/lib/consts';
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const r = await sget('/api/pages/' + params.id); if (!r.ok) return { title: 'ገጽ አልተገኘም' };
  const p = r.page; return { title: p.title, description: (p.tagline || p.about || `${p.title} — ${p.kind}`).slice(0, 160), alternates: { canonical: '/site/' + p.id }, openGraph: { images: p.cover || p.logo ? [imgUrl(p.cover || p.logo)] : ['/og.png'] } };
}
export default async function Page({ params }) {
  const r = await sget('/api/pages/' + params.id); if (!r.ok) notFound();
  const g = r.page, ld = { '@context': 'https://schema.org', '@type': /ሆቴል/.test(g.kind) ? 'Hotel' : /ሱቅ|ነጋዴ/.test(g.kind) ? 'Store' : 'LocalBusiness', name: g.title, description: (g.tagline || g.about || '').slice(0, 300) || undefined, url: SITE + '/site/' + g.id, image: g.cover || g.logo ? SITE + imgUrl(g.cover || g.logo) : undefined, telephone: g.phone || undefined, address: { '@type': 'PostalAddress', addressLocality: g.city || undefined, addressRegion: g.region || undefined, addressCountry: 'ET' } };
  return (<><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} /><SiteView pg={g} /></>);
}
