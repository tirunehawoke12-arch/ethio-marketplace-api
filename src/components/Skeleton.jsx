/* ባዶ ገጽ ሳይሆን የሚንቀሳቀስ ቅርጽ — ቀርፋፋ ኔትዎርክ ላይ ፈጣን ስሜት ይሰጣል */
export const Sk = ({ className = '' }) => <div aria-hidden className={'animate-pulse rounded-2xl bg-brand-light dark:bg-[#1b2b22] ' + className} />;
export function CardsSkeleton({ n = 6, tabs = true }) {
  return (
    <div role="status" aria-label="እየጫነ ነው">
      {tabs && <div className="mb-4 flex gap-2 overflow-hidden">{[0, 1, 2, 3, 4].map(i => <Sk key={i} className="h-10 w-24 !rounded-full" />)}</div>}
      <Sk className="mb-4 h-8 w-48" />
      <div className="grid gap-3 md:grid-cols-2">{Array.from({ length: n }, (_, i) => (
        <div key={i} className="card flex items-center gap-3"><Sk className="h-16 w-16 shrink-0" /><div className="flex-1 space-y-2"><Sk className="h-4 w-3/4" /><Sk className="h-3 w-1/2" /></div></div>))}</div>
      <span className="sr-only">እየጫነ ነው…</span>
    </div>
  );
}
export function PageSkeleton() {
  return (<div role="status" aria-label="እየጫነ ነው" className="mx-auto max-w-3xl"><Sk className="h-44 w-full !rounded-[28px] sm:h-60" /><Sk className="mt-4 h-8 w-2/3" /><Sk className="mt-2 h-4 w-1/2" /><div className="mt-4 space-y-3"><Sk className="h-24 w-full" /><Sk className="h-24 w-full" /></div><span className="sr-only">እየጫነ ነው…</span></div>);
}
