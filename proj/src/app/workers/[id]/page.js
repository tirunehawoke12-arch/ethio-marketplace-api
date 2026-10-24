import { notFound } from 'next/navigation';
import { sget } from '@/lib/server';
import { ETB, imgUrl } from '@/lib/api';
import { Thumb } from '@/components/Cards';
import HireBox from '@/components/actions/HireBox';
export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }) {
  const r = await sget('/api/people/worker/' + params.id); if (!r.ok) return { title: 'ሙያተኛ አልተገኘም' };
  const w = r.worker; return { title: `${w.name} — ${w.title}`, description: (w.about || `${w.title} በ ${w.city}`).slice(0, 160), alternates: { canonical: '/workers/' + w.id } };
}
export default async function WorkerPage({ params }) {
  const r = await sget('/api/people/worker/' + params.id); if (!r.ok) notFound(); const w = r.worker;
  return (
    <div className="mx-auto max-w-3xl">
      <div className="card">
        <div className="flex items-center gap-4"><Thumb id={w.photo} className="h-24 w-24 rounded-full" /><div><h1 className="text-2xl">{w.name}</h1><p className="font-bold">{w.title}</p><span className={w.availability === 'available' ? 'tag' : 'tag-warn'}>{w.availability === 'available' ? '🟢 ለሥራ ዝግጁ' : '🟡 ተሰማርቷል'}</span></div></div>
        {w.about && <p className="mt-3 whitespace-pre-wrap">{w.about}</p>}
        <ul className="muted mt-3 space-y-1"><li>📍 {w.city}, {w.region} · {w.exp} ዓመት ልምድ · {w.category}</li>{w.education && <li>🎓 {w.education}</li>}{w.languages && w.languages.length > 0 && <li>🗣 {w.languages.join('፣ ')}</li>}{w.rate && w.rate.amount > 0 && <li className="font-black text-brand">💰 {ETB(w.rate.amount)} / {w.rate.per}</li>}{w.phone && <li>📞 <a className="font-bold text-brand" href={`tel:${w.phone}`}>{w.phone}</a></li>}</ul>
        <div className="mt-3 flex flex-wrap gap-1.5">{(w.skills || []).map(s => <span key={s} className="tag">{s}</span>)}</div>
        {w.gallery && w.gallery.length > 0 && <div className="mt-3 flex snap-x gap-2 overflow-x-auto">{w.gallery.map(g => /* eslint-disable-next-line @next/next/no-img-element */ <img key={g} src={imgUrl(g)} alt="" className="h-44 w-64 shrink-0 snap-center rounded-2xl object-cover" />)}</div>}
      </div>
      <HireBox workerId={w.id} />
    </div>
  );
}
