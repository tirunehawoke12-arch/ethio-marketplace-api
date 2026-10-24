'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { get } from '@/lib/api';
import { PageTitle, Spinner, StatusTag } from '@/components/ui';
import { ExpandCard, ExpandGroup, Facts, MoreText } from '@/components/Expand';
import RequireAuth from '@/components/RequireAuth';
import { useApp } from '@/lib/app';

function Hub() {
  const { user } = useApp(); const [d, setD] = useState(null);
  useEffect(() => { Promise.all([get('/api/people/my'), get('/api/market/my/shop'), get('/api/pages/my/list')]).then(([p, s, g]) => setD({ p, s: s.shop, g: g.items || [] })); }, []);
  if (!d) return <Spinner />;
  const { p, s, g } = d, w = p.worker, e = p.employer;
  const Row = ({ icon, title, sub, st, href, cta, extra }) => (
    <div className="card"><div className="flex items-center gap-3"><span className="text-3xl">{icon}</span><div className="min-w-0 flex-1"><b>{title}</b><p className="muted truncate">{sub}</p></div>{st && <StatusTag s={st} />}</div><div className="mt-3 flex flex-wrap gap-2"><Link className="btn-primary flex-1" href={href}>{cta}</Link>{extra}</div></div>);
  return (
    <div className="mx-auto max-w-2xl space-y-3"><PageTitle sub="አንድ ሰው ብዙ ገጽ ሊኖረው ይችላል — እያንዳንዱን በማንኛውም ጊዜ ማስፋት እና ማዘመን ይችላሉ።">👤 ገጾቼ</PageTitle>
      <div className="card bg-brand-light"><p className="font-bold">👋 {user.name || user.email}</p><p className="muted">📞 {user.phone || ''}</p></div>
      <div className="card border-2 border-brand/40"><div className="flex items-center gap-3"><span className="text-3xl">🌐</span><div className="min-w-0 flex-1"><b>የራሴ ገጽ (ድረ-ገጽ)</b><p className="muted">ሠራተኛ፣ አሰሪ፣ ሱቅ፣ ሆቴል… ማንኛውንም ዓይነት — ጥያቄዎቹን ራስዎ እንደ Google Form ይቅረጹ፣ ይሙሉ፤ ገጹ እንደ ራስዎ ድረ-ገጽ ይሆናል።</p></div></div>
        <ExpandGroup hideBar className="mt-3 grid items-start gap-3">{g.map(x => (<ExpandCard key={x.id} href={`/me/sites/${x.id}`} cta="🛠 አርትዕ"
          head={<div className="flex items-center gap-3"><div className="min-w-0 flex-1"><b className="block truncate">{x.title}</b><p className="muted">{x.kind} · <StatusTag s={x.status} />{x.unseen > 0 && <b className="ml-2 text-red-600">📬 {x.unseen} አዲስ</b>}</p></div></div>}
          actions={<Link className="btn-ghost w-full" href={`/site/${x.id}`}>👁 ገጹን እንደ ጎብኝ ይመልከቱ</Link>}>
          <MoreText text={x.about} limit={160} /><Facts items={[['📬', 'የደረሱ መልሶች', x.responses], ['📑', 'ክፍሎች', x.sections], ['📍', 'ቦታ', [x.city, x.region].filter(Boolean).join(', ')]]} />
        </ExpandCard>))}</ExpandGroup>
        <Link className="btn-primary mt-3 w-full" href="/me/sites/new">➕ አዲስ ገጽ ክፈት</Link></div>
      <Row icon="🏪" title="ሱቅ · ነጋዴ · ሆቴል · አገልግሎት ሰጪ · አምራች" sub={s ? `${s.name} · ${s.kind}` : 'ዕቃ ወይም አገልግሎት ለህዝብ ይሽጡ'} st={s && s.status} href="/me/shop" cta={s ? '🛠 አስተዳድር / አስፋ' : '➕ ገጽ ክፈት'} />
      <Row icon="🧑‍🔧" title="ሠራተኛ / ሙያተኛ ገጽ" sub={w ? `${w.name} · ${w.title}` : 'ሙያዎን ያሳዩ፤ አሰሪዎች ያገኙዎታል'} st={w && w.status} href="/me/worker" cta={w ? '✏️ አዘምን' : '➕ ገጽ ክፈት'} extra={<Link className="btn-ghost flex-1" href="/me/applications">📄 ማመልከቻዎቼ{p.applications ? ` (${p.applications})` : ''}</Link>} />
      <Row icon="🏢" title="አሰሪ ገጽ" sub={e ? `${e.name} · ${e.sector}` : 'ሠራተኛ ይፈልጋሉ? ሥራ ያስታውቁ'} st={e && e.status} href="/me/employer" cta={e ? '✏️ አዘምን' : '➕ ገጽ ክፈት'} extra={e && <Link className="btn-ghost flex-1" href="/me/jobs/new">➕ ሥራ አስታውቅ</Link>} />
      {e && (<><h2 className="pt-2 text-lg">📢 የእኔ የሥራ ማስታወቂያዎች</h2>{p.jobs.length ? <ExpandGroup className="grid items-start gap-3">{p.jobs.map(j => (<ExpandCard key={j.id} href={`/me/jobs/${j.id}/applicants`} cta="👥 አመልካቾች"
          head={<><div className="flex items-center justify-between gap-2"><b>{j.title}</b><StatusTag s={j.status} /></div><p className="muted mt-1">{j.type} · {j.applicants} አመልካች</p></>}
          actions={<Link className="btn-ghost w-full" href={`/me/jobs/${j.id}`}>✏️ አርትዕ</Link>}>
          <Facts items={[['🏷', 'ዘርፍ', j.category], ['📍', 'ቦታ', [j.city, j.region].filter(Boolean).join(', ')], ['⏰', 'ማብቂያ', j.deadline], ['👥', 'ክፍት ቦታ', j.openings]]} /><MoreText text={j.description} limit={200} />
        </ExpandCard>))}</ExpandGroup> : <div className="card muted">እስካሁን ሥራ አላስታወቁም</div>}</>)}
      <div className="grid grid-cols-2 gap-2 pt-2"><Link className="btn-ghost" href="/orders">📦 ትዕዛዞቼ</Link><Link className="btn-ghost" href="/me/private">🪪 የግል መረጃ</Link></div>
    </div>
  );
}
export default function Page() { return <RequireAuth><Hub /></RequireAuth>; }
