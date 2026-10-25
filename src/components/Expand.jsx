'use client';
/* eslint-disable @next/next/no-img-element */
/* በሁሉም ገጽ ላይ የሚያገለግል «👁 በዝርዝር እይ / 🙈 አሳንስ» መሠረታዊ ክፍሎች */
import Link from 'next/link';
import { createContext, useContext, useEffect, useId, useState } from 'react';
import { imgUrl } from '@/lib/api';

const Ctx = createContext({ nonce: 0, mode: null });

/* የአንድ ዝርዝር ሁሉንም ካርዶች በአንድ ጊዜ ለመዘርጋት/ለማሳነስ */
export function ExpandGroup({ children, className = '', hideBar = false }) {
  const [s, setS] = useState({ nonce: 0, mode: null, open: false });
  const toggle = () => setS(p => ({ nonce: p.nonce + 1, mode: p.open ? 'closed' : 'open', open: !p.open }));
  return (
    <Ctx.Provider value={s}>
      {!hideBar && <div className="mb-3 flex justify-end"><button type="button" onClick={toggle} aria-pressed={s.open} className="chip inline-flex items-center gap-1.5">{s.open ? '🙈 ሁሉንም አሳንስ' : '👁 ሁሉንም በዝርዝር እይ'}</button></div>}
      <div className={className}>{children}</div>
    </Ctx.Provider>
  );
}
export function useOpen(initial = false) {
  const g = useContext(Ctx); const [open, setOpen] = useState(initial);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { if (g.mode) setOpen(g.mode === 'open'); }, [g.nonce]);
  return [open, setOpen];
}
export const ToggleBtn = ({ open, onClick, controls, className = '' }) => (
  <button type="button" onClick={onClick} aria-expanded={open} aria-controls={controls} className={'btn-soft ' + className}>
    <span className={'inline-block transition-transform duration-300 ' + (open ? 'rotate-180' : '')} aria-hidden>{open ? '🙈' : '👁'}</span>{open ? 'አሳንስ' : 'በዝርዝር እይ'}
  </button>
);

/* ረጅም ጽሑፍ — «ተጨማሪ ይመልከቱ / ያነሰ» */
export function MoreText({ text, limit = 160, lines = 3, className = '' }) {
  const [open, setOpen] = useState(false); const s = String(text || ''); if (!s) return null; const long = s.length > limit;
  return (<div className={className}><p className={'whitespace-pre-wrap break-words ' + (long && !open ? (lines === 2 ? 'line-clamp-2' : 'line-clamp-3') : '')}>{s}</p>{long && <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="mt-1 text-sm font-extrabold text-brand">{open ? '🙈 አሳንስ' : '👁 ተጨማሪ ይመልከቱ'}</button>}</div>);
}
/* [አዶ, መለያ, ዋጋ] ዝርዝር — ባዶ የሆኑ አይታዩም */
export function Facts({ items }) {
  const L = (items || []).filter(x => x && x[2] !== undefined && x[2] !== null && x[2] !== '' && !(Array.isArray(x[2]) && !x[2].length));
  if (!L.length) return null;
  return (<dl className="grid gap-x-4 gap-y-2 sm:grid-cols-2">{L.map(([i, l, v]) => (<div key={l} className="flex items-start gap-2 rounded-2xl bg-brand-light/60 px-3 py-2 dark:bg-white/5"><span className="text-lg leading-6" aria-hidden>{i}</span><div className="min-w-0"><dt className="muted !text-xs font-bold">{l}</dt><dd className="break-words text-sm font-bold">{v}</dd></div></div>))}</dl>);
}
export const Tags = ({ list }) => (list && list.length ? <div className="flex flex-wrap gap-1.5">{list.map(t => <span key={t} className="tag">{t}</span>)}</div> : null);
export function Gallery({ ids }) {
  const [z, setZ] = useState(''); const L = (ids || []).filter(Boolean); if (!L.length) return null;
  return (<>
    <div className="flex snap-x gap-2 overflow-x-auto pb-1">{L.map(g => <button type="button" key={g} onClick={() => setZ(g)} aria-label="ፎቶ ክፈት" className="group relative shrink-0 snap-center"><img src={imgUrl(g)} alt="" loading="lazy" className="h-24 w-32 rounded-2xl object-cover" /><span className="absolute inset-0 grid place-items-center rounded-2xl bg-black/35 text-xl text-white opacity-0 transition group-hover:opacity-100">👁</span></button>)}</div>
    {z && <div className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4" onClick={() => setZ('')} role="dialog" aria-label="ፎቶ"><img src={imgUrl(z)} alt="" className="max-h-full max-w-full rounded-2xl" /><button type="button" className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white text-xl" aria-label="ዝጋ">✕</button></div>}
  </>);
}

/* ዋናው ካርድ፦ head ሁልጊዜ ይታያል፤ children (ዝርዝር) በ«በዝርዝር እይ» ይከፈታል */
export function ExpandCard({ head, children, href, cta = 'ክፈት', actions, className = '', defaultOpen = false }) {
  const [open, setOpen] = useOpen(defaultOpen); const id = useId();
  return (
    <article className={'card !p-0 overflow-hidden transition duration-300 ' + (open ? 'ring-2 ring-brand/30 shadow-lift ' : 'hover:-translate-y-0.5 hover:shadow-lift ') + className}>
      <div className="p-4">{head}</div>
      {open && <div id={id} className="animate-fadeUp space-y-3 border-t border-dashed border-line px-4 py-3 dark:border-[#25352c]">{children}{actions}</div>}
      <div className="flex gap-2 border-t border-line bg-brand-light/50 p-2 dark:border-[#25352c] dark:bg-white/5">
        <ToggleBtn open={open} onClick={() => setOpen(!open)} controls={id} className="flex-1" />
        {href && <Link href={href} className="btn-primary !min-h-[40px] flex-1 !px-3 !text-[13px]">{cta} ›</Link>}
      </div>
    </article>
  );
}
