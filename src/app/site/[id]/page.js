import { notFound } from 'next/navigation';
import { sget } from '@/lib/server';
import { imgUrl } from '@/lib/api';
import SiteView from '@/components/SiteView';
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const r = await sget('/api/pages/' + params.id); if (!r.ok) return { title: 'ገጽ አልተገኘም' };
  const p = r.page; return { title: p.title, description: (p.tagline || p.about || `${p.title} — ${p.kind}`).slice(0, 160), alternates: { canonical: '/site/' + p.id }, openGraph: { images: p.cover || p.logo ? [imgUrl(p.cover || p.logo)] : ['/og.png'] } };
}
export default async function Page({ params }) {
  const r = await sget('/api/pages/' + params.id); if (!r.ok) notFound();
  return <SiteView pg={r.page} />;
}
