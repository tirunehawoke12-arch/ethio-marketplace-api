import Link from 'next/link';
import { ETB, imgUrl } from '@/lib/api';

const PH = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 4 3'%3E%3Crect width='4' height='3' fill='%23e8efe9'/%3E%3Ctext x='2' y='1.9' font-size='1.2' text-anchor='middle'%3E%F0%9F%9B%8D%EF%B8%8F%3C/text%3E%3C/svg%3E";
/* eslint-disable @next/next/no-img-element */
export const Thumb = ({ id, className = 'h-14 w-14 rounded-2xl' }) => <img src={imgUrl(id) || PH} alt="" loading="lazy" className={'bg-brand-light object-cover ' + className} />;

export function ProductCard({ p }) {
  return (
    <Link href={`/p/${p.id}`} className="group overflow-hidden rounded-3xl border border-line bg-white shadow-soft transition hover:-translate-y-1 hover:shadow-lift dark:border-[#25352c] dark:bg-[#16211b]">
      <img src={imgUrl(p.imgs && p.imgs[0]) || PH} alt={p.title} loading="lazy" className="aspect-square w-full bg-brand-light object-cover" />
      <div className="p-3">
        <h3 className="line-clamp-2 text-sm font-bold leading-snug">{p.title}</h3>
        <p className="mt-1 font-extrabold text-brand">{ETB(p.price)}</p>
        <p className="muted mt-1 line-clamp-1">{p.shop.name} · {p.shop.city}{p.shop.rating ? ` · ⭐${p.shop.rating}` : ''}</p>
      </div>
    </Link>
  );
}
export function ShopCard({ s }) {
  return (
    <Link href={`/shop/${s.id}`} className="card flex items-center gap-3 transition hover:-translate-y-0.5 hover:shadow-lift">
      <Thumb id={s.logo} className="h-14 w-14 rounded-2xl" />
      <div className="min-w-0 flex-1"><p className="truncate font-extrabold">{s.name} <span className="tag ml-1">{s.kind}</span></p><p className="muted truncate">{s.city}, {s.region}</p><p className="muted">{s.reviews ? `⭐ ${s.rating} (${s.reviews})` : 'አዲስ'}</p></div>
    </Link>
  );
}
export const salaryText = s => (!s || (!s.min && !s.max) ? 'በስምምነት' : `${s.min ? ETB(s.min) : ''}${s.max ? ' – ' + ETB(s.max) : ''} / ${s.per}`);
export function JobCard({ j }) {
  return (
    <Link href={`/jobs/${j.id}`} className="card block transition hover:-translate-y-0.5 hover:shadow-lift">
      <div className="flex items-start justify-between gap-2"><h3 className="font-extrabold">{j.title}</h3><span className="tag shrink-0">{j.type}</span></div>
      <p className="muted mt-1">🏢 {j.employer && j.employer.name} · 📍 {j.city}, {j.region}</p>
      <div className="mt-2 flex items-center justify-between"><b className="text-brand">{salaryText(j.salary)}</b><span className="muted">{j.applicants} አመልካች</span></div>
    </Link>
  );
}
export function WorkerCard({ w }) {
  return (
    <Link href={`/workers/${w.id}`} className="card flex items-center gap-3 transition hover:-translate-y-0.5 hover:shadow-lift">
      <Thumb id={w.photo} className="h-16 w-16 rounded-full" />
      <div className="min-w-0 flex-1"><p className="font-extrabold">{w.name} <span className={w.availability === 'available' ? 'tag' : 'tag-warn'}>{w.availability === 'available' ? '🟢 ዝግጁ' : '🟡 ተሰማርቷል'}</span></p><p>{w.title} · <span className="muted">{w.category}</span></p><p className="muted">📍 {w.city} · {w.exp} ዓመት ልምድ{w.rate && w.rate.amount ? ` · ${ETB(w.rate.amount)}/${w.rate.per}` : ''}</p></div>
    </Link>
  );
}
