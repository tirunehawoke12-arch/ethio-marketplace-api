'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { get } from '@/lib/api';
import { PageTitle, Spinner, StatusTag } from '@/components/ui';
import RequireAuth from '@/components/RequireAuth';
import { useApp } from '@/lib/app';

function Hub() {
  const { user } = useApp(); const [d, setD] = useState(null);
  useEffect(() => { Promise.all([get('/api/people/my'), get('/api/market/my/shop')]).then(([p, s]) => setD({ p, s: s.shop })); }, []);
  if (!d) return <Spinner />;
  const { p, s } = d, w = p.worker, e = p.employer;
  const Row = ({ icon, title, sub, st, href, cta, extra }) => (
    <div className="card"><div className="flex items-center gap-3"><span className="text-3xl">{icon}</span><div className="min-w-0 flex-1"><b>{title}</b><p className="muted truncate">{sub}</p></div>{st && <StatusTag s={st} />}</div><div className="mt-3 flex flex-wrap gap-2"><Link className="btn-primary flex-1" href={href}>{cta}</Link>{extra}</div></div>);
  return (
    <div className="mx-auto max-w-2xl space-y-3"><PageTitle sub="አንድ ሰው ብዙ ገጽ ሊኖረው ይችላል — እያንዳንዱን በማንኛውም ጊዜ ማስፋት እና ማዘመን ይችላሉ።">👤 ገጾቼ</PageTitle>
      <div className="card bg-brand-light"><p className="font-bold">👋 {user.name || user.email}</p><p className="muted">📞 {user.phone || ''}</p></div>
      <Row icon="🏪" title="ሱቅ · ነጋዴ · ሆቴል · አገልግሎት ሰጪ · አምራች" sub={s ? `${s.name} · ${s.kind}` : 'ዕቃ ወይም አገልግሎት ለህዝብ ይሽጡ'} st={s && s.status} href="/me/shop" cta={s ? '🛠 አስተዳድር / አስፋ' : '➕ ገጽ ክፈት'} />
      <Row icon="🧑‍🔧" title="ሠራተኛ / ሙያተኛ ገጽ" sub={w ? `${w.name} · ${w.title}` : 'ሙያዎን ያሳዩ፤ አሰሪዎች ያገኙዎታል'} st={w && w.status} href="/me/worker" cta={w ? '✏️ አዘምን' : '➕ ገጽ ክፈት'} extra={<Link className="btn-ghost flex-1" href="/me/applications">📄 ማመልከቻዎቼ{p.applications ? ` (${p.applications})` : ''}</Link>} />
      <Row icon="🏢" title="አሰሪ ገጽ" sub={e ? `${e.name} · ${e.sector}` : 'ሠራተኛ ይፈልጋሉ? ሥራ ያስታውቁ'} st={e && e.status} href="/me/employer" cta={e ? '✏️ አዘምን' : '➕ ገጽ ክፈት'} extra={e && <Link className="btn-ghost flex-1" href="/me/jobs/new">➕ ሥራ አስታውቅ</Link>} />
      {e && (<><h2 className="pt-2 text-lg">📢 የእኔ የሥራ ማስታወቂያዎች</h2>{p.jobs.length ? p.jobs.map(j => (<div key={j.id} className="card"><div className="flex items-center justify-between"><b>{j.title}</b><StatusTag s={j.status} /></div><p className="muted">{j.type} · {j.applicants} አመልካች</p><div className="mt-2 flex gap-2"><Link className="btn-primary flex-1" href={`/me/jobs/${j.id}/applicants`}>👥 አመልካቾች</Link><Link className="btn-ghost" href={`/me/jobs/${j.id}`}>✏️</Link></div></div>)) : <div className="card muted">እስካሁን ሥራ አላስታወቁም</div>}</>)}
      <div className="grid grid-cols-2 gap-2 pt-2"><Link className="btn-ghost" href="/orders">📦 ትዕዛዞቼ</Link><Link className="btn-ghost" href="/me/private">🪪 የግል መረጃ</Link></div>
    </div>
  );
}
export default function Page() { return <RequireAuth><Hub /></RequireAuth>; }
