'use client';
/* eslint-disable @next/next/no-img-element */
/* ዝርዝር ካርዶች — እያንዳንዱ «👁 በዝርዝር እይ / 🙈 አሳንስ» አለው */
import Link from 'next/link';
import { useId } from 'react';
import { ETB, imgUrl } from '@/lib/api';
import { salaryText, ago, isNew } from '@/lib/fmt';
import { themeGrad } from '@/lib/templates';
import { Thumb, PH } from '@/components/Thumb';
import { ExpandCard, Facts, Gallery, MoreText, Tags, ToggleBtn, useOpen } from '@/components/Expand';

const Phone = ({ v }) => (v ? <a className="font-extrabold text-brand" href={`tel:${v}`}>📞 {v}</a> : null);

/* ---------- ዕቃ ---------- */
export function ProductCard({ p }) {
  const [open, setOpen] = useOpen(); const id = useId(); const low = p.stock > 0 && p.stock <= 3, out = p.stock === 0;
  return (
    <article className={'group overflow-hidden rounded-3xl border border-line bg-white shadow-soft transition duration-300 dark:border-[#25352c] dark:bg-[#16211b] ' + (open ? 'col-span-2 ring-2 ring-brand/30 shadow-lift' : 'hover:-translate-y-1 hover:shadow-lift')}>
      <Link href={`/p/${p.id}`} className="relative block" aria-label={p.title}>
        <img src={imgUrl(p.imgs && p.imgs[0]) || PH} alt={p.title} loading="lazy" className={'w-full bg-brand-light object-cover transition-all duration-300 ' + (open ? 'aspect-[16/10]' : 'aspect-square')} />
        <span className="absolute bottom-2 left-2 rounded-full bg-white/95 px-3 py-1 text-sm font-black text-brand shadow-soft">{ETB(p.price)}</span>
        {isNew(p.ts) && <span className="absolute left-2 top-2 rounded-full bg-gold px-2.5 py-0.5 text-[11px] font-black text-ink">አዲስ</span>}
        {(out || low) && <span className={'absolute right-2 top-2 rounded-full px-2.5 py-0.5 text-[11px] font-black text-white ' + (out ? 'bg-red-600' : 'bg-amber-600')}>{out ? 'አልቋል' : `${p.stock} ብቻ`}</span>}
      </Link>
      <div className="p-3">
        <h3 className={'text-sm font-bold leading-snug ' + (open ? '' : 'line-clamp-2')}>{p.title}</h3>
        <p className="muted mt-1 line-clamp-1">🏪 {p.shop.name} · {p.shop.city}{p.shop.rating ? ` · ⭐${p.shop.rating}` : ''}</p>
      </div>
      {open && (
        <div id={id} className="animate-fadeUp space-y-3 border-t border-dashed border-line px-3 py-3 dark:border-[#25352c]">
          <Gallery ids={(p.imgs || []).slice(0, 8)} />
          <MoreText text={p.desc} limit={220} />
          <Facts items={[['🏷', 'ምድብ', p.category], ['📦', 'ክምችት', p.stock === undefined ? '' : `${p.stock}${p.unit ? ' ' + p.unit : ''}`], ['💰', 'ዋጋ', `${ETB(p.price)}${p.unit ? ' / ' + p.unit : ''}`], ['📍', 'አድራሻ', [p.shop.city, p.shop.region].filter(Boolean).join(', ')]]} />
          <Link href={`/shop/${p.shop.id}`} className="flex items-center gap-2 rounded-2xl bg-brand-light/60 p-2 text-sm font-bold dark:bg-white/5"><Thumb id={p.shop.logo} className="h-9 w-9 rounded-xl" />ሱቁን ይመልከቱ: {p.shop.name} ›</Link>
        </div>
      )}
      <div className="flex gap-2 border-t border-line bg-brand-light/50 p-2 dark:border-[#25352c] dark:bg-white/5">
        <ToggleBtn open={open} onClick={() => setOpen(!open)} controls={id} className="flex-1 !px-2 !text-[13px]" />
        <Link href={`/p/${p.id}`} className="btn-primary !min-h-[40px] flex-1 !px-2 !text-[13px]">🛒 ግዛ</Link>
      </div>
    </article>
  );
}

/* ---------- ሱቅ / ድርጅት ---------- */
export function ShopCard({ s }) {
  return (
    <ExpandCard href={`/shop/${s.id}`} cta="ሱቁን ክፈት"
      head={<div className="flex items-center gap-3"><Thumb id={s.logo} className="h-16 w-16 rounded-2xl" /><div className="min-w-0 flex-1"><p className="truncate font-extrabold">{s.name}</p><p className="mt-0.5"><span className="tag">{s.kind}</span></p><p className="muted mt-0.5 truncate">📍 {s.city}, {s.region}</p><p className="muted">{s.reviews ? `⭐ ${s.rating} (${s.reviews})` : '✨ አዲስ'}</p></div></div>}>
      <MoreText text={s.about} limit={200} />
      <Facts items={[['🏷', 'ምድብ', s.category], ['🕒', 'የሥራ ሰዓት', s.hours], ['📍', 'አድራሻ', s.address], ['📞', 'ስልክ', s.phone ? <Phone key="p" v={s.phone} /> : ''], ['🚚', 'አቅርቦት', s.delivery ? [s.delivery.pickup ? 'በአካል መውሰድ' : '', s.delivery.local ? `ማድረስ ${s.delivery.fee || 0} ብር` : ''].filter(Boolean).join(' · ') : ''], ['📅', 'ከ', s.year]]} />
      <Tags list={(s.tags || []).map(t => '#' + t)} />
      <Gallery ids={s.gallery} />
    </ExpandCard>
  );
}

/* ---------- ሥራ ---------- */
export function JobCard({ j }) {
  return (
    <ExpandCard href={`/jobs/${j.id}`} cta="አመልክት"
      head={<><div className="flex items-start justify-between gap-2"><h3 className="font-extrabold leading-snug">{j.title}</h3><span className="tag shrink-0">{j.type}</span></div>
        <p className="muted mt-1">🏢 {j.employer && j.employer.name} · 📍 {j.city}, {j.region}</p>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-1"><b className="text-brand">💰 {salaryText(j.salary)}</b><span className="muted">{ago(j.ts)} · {j.applicants} አመልካች</span></div></>}>
      <Facts items={[['🏷', 'ዘርፍ', j.category], ['👥', 'ክፍት ቦታ', j.openings], ['⏰', 'የማመልከቻ ማብቂያ', j.deadline]]} />
      <div><p className="text-sm font-extrabold">መግለጫ</p><MoreText text={j.description} limit={240} /></div>
      {j.requirements && <div><p className="text-sm font-extrabold">መስፈርቶች</p><MoreText text={j.requirements} limit={240} /></div>}
      {j.employer && <Link href={`/employers/${j.employer.id}`} className="flex items-center gap-2 rounded-2xl bg-brand-light/60 p-2 text-sm font-bold dark:bg-white/5"><Thumb id={j.employer.logo} className="h-9 w-9 rounded-xl" />{j.employer.name} ›</Link>}
    </ExpandCard>
  );
}

/* ---------- ሙያተኛ ---------- */
export function WorkerCard({ w }) {
  const on = w.availability === 'available';
  return (
    <ExpandCard href={`/workers/${w.id}`} cta="ቅጠር / ገጹን ክፈት"
      head={<div className="flex items-center gap-3"><Thumb id={w.photo} className="h-16 w-16 rounded-full" /><div className="min-w-0 flex-1"><p className="font-extrabold">{w.name}</p><p className="truncate text-sm">{w.title} · <span className="muted">{w.category}</span></p><p className="mt-0.5"><span className={on ? 'tag' : 'tag-warn'}>{on ? '🟢 ዝግጁ' : '🟡 ተሰማርቷል'}</span></p><p className="muted mt-0.5 truncate">📍 {w.city} · {w.exp} ዓመት ልምድ{w.rate && w.rate.amount ? ` · ${ETB(w.rate.amount)}/${w.rate.per}` : ''}</p></div></div>}>
      <MoreText text={w.about} limit={200} />
      <Tags list={w.skills} />
      <Facts items={[['🎓', 'ትምህርት', w.education], ['🗣', 'ቋንቋ', (w.languages || []).join('፣ ')], ['💰', 'ክፍያ', w.rate && w.rate.amount ? `${ETB(w.rate.amount)} / ${w.rate.per}` : ''], ['📞', 'ስልክ', w.phone ? <Phone key="p" v={w.phone} /> : '']]} />
      <Gallery ids={w.gallery} />
    </ExpandCard>
  );
}

/* ---------- አሰሪ ---------- */
export function EmployerCard({ e }) {
  return (
    <ExpandCard href={`/employers/${e.id}`} cta="ገጹን ክፈት"
      head={<div className="flex items-center gap-3"><Thumb id={e.logo} className="h-16 w-16 rounded-2xl" /><div className="min-w-0 flex-1"><p className="truncate font-extrabold">{e.name}</p><p className="muted truncate">{e.sector} · 📍 {e.city}, {e.region}</p></div></div>}>
      <MoreText text={e.about} limit={200} />
      <Facts items={[['👥', 'መጠን', e.size], ['📍', 'አድራሻ', e.address], ['📞', 'ስልክ', e.phone ? <Phone key="p" v={e.phone} /> : '']]} />
    </ExpandCard>
  );
}

/* ---------- በተጠቃሚ የተሠራ ገጽ (ሠራተኛ/አሰሪ/ሱቅ/ሆቴል/ሌላ) ---------- */
export function SiteCard({ p }) {
  const [open, setOpen] = useOpen(); const id = useId();
  return (
    <article className={'group overflow-hidden rounded-3xl border border-line bg-white shadow-soft transition duration-300 dark:border-[#25352c] dark:bg-[#16211b] ' + (open ? 'ring-2 ring-brand/30 shadow-lift' : 'hover:-translate-y-1 hover:shadow-lift')}>
      <Link href={`/site/${p.id}`} className="block" aria-label={p.title}>
        <div className="relative h-24 overflow-hidden" style={{ background: themeGrad(p.theme) }}>{p.cover && <img src={imgUrl(p.cover)} alt="" loading="lazy" className="h-full w-full object-cover" />}<span className="absolute right-2 top-2 rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-black text-ink">{p.kind}</span></div>
        <div className="relative px-4 pt-8"><div className="absolute -top-7 left-4 overflow-hidden rounded-2xl border-4 border-white bg-white dark:border-[#16211b]"><Thumb id={p.logo} className="h-14 w-14" /></div>
          <p className="font-extrabold leading-snug">{p.title}</p>{p.tagline && <p className={'muted ' + (open ? '' : 'line-clamp-2')}>{p.tagline}</p>}<p className="muted mt-1 pb-3">📍 {[p.city, p.region].filter(Boolean).join(', ') || '—'}{p.ts ? ` · ${ago(p.ts)}` : ''}</p></div>
      </Link>
      {open && (
        <div id={id} className="animate-fadeUp space-y-3 border-t border-dashed border-line px-4 py-3 dark:border-[#25352c]">
          <MoreText text={p.about} limit={200} />
          {p.topics && p.topics.length > 0 && <div><p className="mb-1 text-sm font-extrabold">በገጹ ላይ የሚገኙ</p><Tags list={p.topics} /></div>}
          <Facts items={[['📞', 'ስልክ', p.phone ? <Phone key="p" v={p.phone} /> : ''], ['📑', 'ክፍሎች', p.sections ? `${p.sections}` : ''], ['📝', 'ቅጽ', p.hasForm ? 'አለው — መሙላት ይችላሉ' : '']]} />
        </div>
      )}
      <div className="flex gap-2 border-t border-line bg-brand-light/50 p-2 dark:border-[#25352c] dark:bg-white/5">
        <ToggleBtn open={open} onClick={() => setOpen(!open)} controls={id} className="flex-1 !px-2 !text-[13px]" />
        <Link href={`/site/${p.id}`} className="btn-primary !min-h-[40px] flex-1 !px-2 !text-[13px]">ገጹን ክፈት ›</Link>
      </div>
    </article>
  );
}
