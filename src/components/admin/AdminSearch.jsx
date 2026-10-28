'use client';
/* አድሚን ዓለም-አቀፍ ፍለጋ — ተጠቃሚ፣ ሱቅ፣ ዕቃ፣ ትዕዛዝ፣ ሙያተኛ፣ አሰሪ፣ ሥራ፣ ገጽ (ቁልፍ «/» ያተኩራል) */
import { useEffect, useRef, useState } from 'react';
import { get } from '@/lib/api';
import Ico from './Ico';

const KIND = { user: ['users', 'ተጠቃሚ', 'accounts'], shop: ['store', 'ሱቅ', 'market'], product: ['box', 'ዕቃ', 'products'], order: ['cart', 'ትዕዛዝ', 'market'], worker: ['user', 'ሙያተኛ', 'people'], employer: ['briefcase', 'አሰሪ', 'people'], job: ['briefcase', 'ሥራ', 'people'], page: ['globe', 'ገጽ', 'pages'] };
export default function AdminSearch({ onPick }) {
  const [q, setQ] = useState(''), [L, setL] = useState(null), [open, setOpen] = useState(false), ref = useRef(null);
  useEffect(() => { const k = e => { if (e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) { e.preventDefault(); ref.current && ref.current.focus(); } if (e.key === 'Escape') setOpen(false); }; window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k); }, []);
  useEffect(() => { if (q.trim().length < 2) { setL(null); return; } const t = setTimeout(() => get('/api/admin/find?q=' + encodeURIComponent(q.trim())).then(r => setL(r.items || [])), 250); return () => clearTimeout(t); }, [q]);
  const pick = x => { setOpen(false); setQ(''); setL(null); onPick(KIND[x.k][2], x); };
  return (
    <div className="relative min-w-0 flex-1">
      <Ico n="search" s={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mute" />
      <input ref={ref} className="input !min-h-[44px] !py-2 !pl-10 !pr-10" placeholder="ሁሉንም ፈልግ — ተጠቃሚ፣ ሱቅ፣ ዕቃ፣ ትዕዛዝ…" value={q} onFocus={() => setOpen(true)} onChange={e => { setQ(e.target.value); setOpen(true); }} aria-label="አድሚን ፍለጋ" />
      <kbd className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 rounded border border-line px-1.5 text-xs text-mute sm:block">/</kbd>
      {open && L && (<>
        <button className="fixed inset-0 z-30 cursor-default" aria-label="ዝጋ" onClick={() => setOpen(false)} />
        <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-[70vh] overflow-y-auto rounded-3xl border border-line bg-white p-2 shadow-soft dark:border-[#25352c] dark:bg-[#16211b]">
          {L.length ? L.map(x => (<button key={x.k + x.id} onClick={() => pick(x)} className="flex w-full items-center gap-3 rounded-2xl p-2 text-left hover:bg-brand-light dark:hover:bg-brand/20">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-brand-light text-brand dark:bg-brand/20"><Ico n={KIND[x.k][0]} s={18} /></span>
            <span className="min-w-0 flex-1"><b className="block truncate text-sm">{x.title}</b><span className="muted block truncate !text-xs">{x.sub}</span></span><span className="tag">{KIND[x.k][1]}</span></button>)) : <p className="muted p-3 text-center">ምንም አልተገኘም</p>}
        </div></>)}
    </div>
  );
}
