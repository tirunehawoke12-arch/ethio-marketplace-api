import Link from 'next/link';
import { notFound } from 'next/navigation';
import { sget } from '@/lib/server';
import { SITE } from '@/lib/consts';
import { Thumb, salaryText } from '@/components/Cards';
import ApplyBox from '@/components/actions/ApplyBox';
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const r = await sget('/api/people/job/' + params.id); if (!r.ok) return { title: 'ሥራ አልተገኘም' };
  const j = r.job; return { title: `${j.title} — ${j.employer ? j.employer.name : ''}`, description: j.description.slice(0, 160), alternates: { canonical: '/jobs/' + j.id } };
}
const ET = { 'ሙሉ ጊዜ': 'FULL_TIME', 'ትርፍ ጊዜ': 'PART_TIME', 'ኮንትራት': 'CONTRACTOR', 'ጊዜያዊ': 'TEMPORARY', 'ልምምድ': 'INTERN' };
export default async function JobPage({ params }) {
  const r = await sget('/api/people/job/' + params.id); if (!r.ok) notFound();
  const { job: j, employer: e } = r;
  const ld = { '@context': 'https://schema.org', '@type': 'JobPosting', title: j.title, description: j.description, datePosted: new Date(j.ts).toISOString(), validThrough: j.deadline || undefined, employmentType: ET[j.type], hiringOrganization: { '@type': 'Organization', name: e.name, sameAs: SITE + '/employers/' + e.id }, jobLocation: { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: j.city, addressRegion: j.region, addressCountry: 'ET' } }, ...(j.salary && (j.salary.min || j.salary.max) ? { baseSalary: { '@type': 'MonetaryAmount', currency: 'ETB', value: { '@type': 'QuantitativeValue', minValue: j.salary.min, maxValue: j.salary.max, unitText: { 'ሰዓት': 'HOUR', 'ቀን': 'DAY', 'ወር': 'MONTH', 'ሥራ': 'YEAR' }[j.salary.per] || 'MONTH' } } } : {}) };
  return (
    <div className="mx-auto max-w-3xl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }} />
      <div className="card">
        <div className="flex flex-wrap gap-1.5"><span className="tag">{j.type}</span><span className="tag">{j.category}</span></div>
        <h1 className="mt-2 text-2xl">{j.title}</h1>
        <p className="mt-2 text-xl font-black text-brand">{salaryText(j.salary)}</p>
        <p className="muted mt-1">📍 {j.city}, {j.region} · {j.openings} ቦታ{j.deadline ? ` · ⏰ እስከ ${j.deadline}` : ''} · {j.applicants} አመልካች</p>
        <h2 className="mt-4 text-lg">መግለጫ</h2><p className="whitespace-pre-wrap">{j.description}</p>
        {j.requirements && <><h2 className="mt-4 text-lg">መስፈርቶች</h2><p className="whitespace-pre-wrap">{j.requirements}</p></>}
      </div>
      <Link href={`/employers/${e.id}`} className="card mt-3 flex items-center gap-3 hover:shadow-lift"><Thumb id={e.logo} /><div><p className="font-extrabold">🏢 {e.name}</p><p className="muted">{e.sector} · {e.city}</p></div></Link>
      <ApplyBox jobId={j.id} />
    </div>
  );
}
