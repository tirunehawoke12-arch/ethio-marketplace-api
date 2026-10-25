import { notFound } from 'next/navigation';
import { sget } from '@/lib/server';
import { JobCard, Thumb } from '@/components/Cards';
import { ExpandGroup } from '@/components/Expand';
import { Section, Empty } from '@/components/ui';
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const r = await sget('/api/people/employer/' + params.id); if (!r.ok) return { title: 'አሰሪ አልተገኘም' };
  return { title: `${r.employer.name} — ክፍት ሥራዎች`, description: (r.employer.about || '').slice(0, 160), alternates: { canonical: '/employers/' + r.employer.id } };
}
export default async function EmployerPage({ params }) {
  const r = await sget('/api/people/employer/' + params.id); if (!r.ok) notFound(); const e = r.employer;
  return (
    <div className="mx-auto max-w-3xl">
      <div className="card"><div className="flex items-center gap-3"><Thumb id={e.logo} className="h-20 w-20 rounded-3xl" /><div><h1 className="text-2xl">{e.name}</h1><p className="muted">{e.sector}{e.size ? ` · ${e.size} ሠራተኛ` : ''}</p></div></div>{e.about && <p className="mt-3 whitespace-pre-wrap">{e.about}</p>}<p className="muted mt-3">📍 {e.city}, {e.region} {e.address}</p>{e.phone && <p className="muted">📞 <a className="font-bold text-brand" href={`tel:${e.phone}`}>{e.phone}</a></p>}<p className="muted">{e.links && e.links.telegram ? `✈️ ${e.links.telegram} ` : ''}{e.links && e.links.website ? `🌐 ${e.links.website}` : ''}</p></div>
      <Section title={`💼 ክፍት ሥራዎች (${r.jobs.length})`}>{r.jobs.length ? <ExpandGroup className="grid items-start gap-3">{r.jobs.map(j => <JobCard key={j.id} j={j} />)}</ExpandGroup> : <Empty>አሁን ክፍት ሥራ የለም</Empty>}</Section>
    </div>
  );
}
