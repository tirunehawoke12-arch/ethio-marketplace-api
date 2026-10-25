'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { get, qs } from '@/lib/api';
import { REGIONS } from '@/lib/consts';
import { PageTitle, Spinner, Empty } from '@/components/ui';
import { SiteCard } from '@/components/CardsX';
import { ExpandGroup } from '@/components/Expand';
import MarketTabs from '@/components/MarketTabs';

export default function Page() {
  const [q, setQ] = useState(''), [kind, setKind] = useState(''), [region, setRegion] = useState(''), [d, setD] = useState(null);
  useEffect(() => { const t = setTimeout(() => get('/api/pages' + qs({ q, kind, region })).then(setD), 250); return () => clearTimeout(t); }, [q, kind, region]);
  return (
    <div>
      <MarketTabs active="sites" />
      <PageTitle sub={`${d ? d.total : '…'} ገጽ — ሠራተኛ፣ አሰሪ፣ ሱቅ፣ ሆቴል እና ሌሎችም፤ እያንዳንዱ የራሱ ድረ-ገጽ አለው።`}>🌐 የተመዘገቡ ገጾች</PageTitle>
      <div className="grid gap-2 sm:grid-cols-3"><input className="input" placeholder="🔎 ፈልግ" aria-label="ፈልግ" value={q} onChange={e => setQ(e.target.value)} /><select className="input" aria-label="ክልል" value={region} onChange={e => setRegion(e.target.value)}><option value="">ሁሉም ክልል</option>{REGIONS.map(r => <option key={r}>{r}</option>)}</select><Link className="btn-primary" href="/me/sites/new">➕ የራስዎን ገጽ ይክፈቱ</Link></div>
      {d && d.kinds && d.kinds.length > 0 && <div className="mt-3 flex gap-2 overflow-x-auto pb-1"><button className={!kind ? 'chip-on' : 'chip'} onClick={() => setKind('')}>ሁሉም</button>{d.kinds.map(k => <button key={k} className={kind === k ? 'chip-on' : 'chip'} onClick={() => setKind(k)}>{k}</button>)}</div>}
      <div className="mt-4">
        {!d ? <Spinner /> : !d.items.length ? <Empty>ገና ገጽ የለም — የመጀመሪያው ይሁኑ!</Empty> : <ExpandGroup className="grid items-start gap-3 sm:grid-cols-2 lg:grid-cols-3">{d.items.map(p => <SiteCard key={p.id} p={p} />)}</ExpandGroup>}
      </div>
    </div>
  );
}
