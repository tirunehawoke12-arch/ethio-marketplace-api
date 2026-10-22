'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { get } from '@/lib/api';
import { qs } from '@/lib/api';
import { REGIONS } from '@/lib/consts';
import { PageTitle, Spinner, Empty } from '@/components/ui';
import { Thumb } from '@/components/Cards';
import { themeGrad } from '@/lib/templates';
import { imgUrl } from '@/lib/api';

export default function Page() {
  const [q, setQ] = useState(''), [kind, setKind] = useState(''), [region, setRegion] = useState(''), [d, setD] = useState(null);
  useEffect(() => { const t = setTimeout(() => get('/api/pages' + qs({ q, kind, region })).then(setD), 250); return () => clearTimeout(t); }, [q, kind, region]);
  return (
    <div>
      <PageTitle sub="ሠራተኛ፣ አሰሪ፣ ሱቅ፣ ሆቴል እና ሌሎችም — እያንዳንዱ የራሱ ድረ-ገጽ አለው።">🌐 ገጾች</PageTitle>
      <div className="grid gap-2 sm:grid-cols-3"><input className="input" placeholder="🔎 ፈልግ" value={q} onChange={e => setQ(e.target.value)} /><select className="input" value={region} onChange={e => setRegion(e.target.value)}><option value="">ሁሉም ክልል</option>{REGIONS.map(r => <option key={r}>{r}</option>)}</select><Link className="btn-primary" href="/me/sites/new">➕ የራስዎን ገጽ ይክፈቱ</Link></div>
      {d && d.kinds && d.kinds.length > 0 && <div className="mt-3 flex gap-2 overflow-x-auto pb-1"><button className={!kind ? 'chip-on' : 'chip'} onClick={() => setKind('')}>ሁሉም</button>{d.kinds.map(k => <button key={k} className={kind === k ? 'chip-on' : 'chip'} onClick={() => setKind(k)}>{k}</button>)}</div>}
      {!d ? <Spinner /> : !d.items.length ? <div className="mt-4"><Empty>ገና ገጽ የለም — የመጀመሪያው ይሁኑ!</Empty></div> : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{d.items.map(p => (
          <Link key={p.id} href={`/site/${p.id}`} className="group overflow-hidden rounded-3xl border border-line bg-white shadow-soft transition hover:-translate-y-1 hover:shadow-lift dark:border-[#25352c] dark:bg-[#16211b]">
            <div className="h-24" style={{ background: themeGrad(p.theme) }}>{/* eslint-disable-next-line @next/next/no-img-element */}{p.cover && <img src={imgUrl(p.cover)} alt="" className="h-full w-full object-cover" />}</div>
            <div className="relative px-4 pb-4 pt-8"><div className="absolute -top-7 left-4 overflow-hidden rounded-2xl border-4 border-white dark:border-[#16211b]"><Thumb id={p.logo} className="h-14 w-14" /></div>
              <p className="font-extrabold">{p.title} <span className="tag ml-1">{p.kind}</span></p>{p.tagline && <p className="muted line-clamp-2">{p.tagline}</p>}<p className="muted mt-1">📍 {[p.city, p.region].filter(Boolean).join(', ') || '—'}</p><p className="mt-2 text-sm font-extrabold text-brand">👁 ገጹን ይመልከቱ ›</p></div>
          </Link>))}</div>)}
    </div>
  );
}
