'use client';
import { useCallback, useEffect, useState } from 'react';
import { get, post } from '@/lib/api';
import { Empty, PageTitle, Spinner } from '@/components/ui';
import { ExpandCard, ExpandGroup, Facts, MoreText } from '@/components/Expand';
import RequireAuth from '@/components/RequireAuth';

const AST = { applied: ['📨 ተልኳል', 'tag'], shortlisted: ['⭐ በዝርዝር ውስጥ', 'tag'], hired: ['✅ ተቀጥረዋል', 'tag'], rejected: ['❌ አልተመረጡም', 'tag-bad'], withdrawn: ['↩️ ተነስቷል', 'tag-warn'], invited: ['🤝 ግብዣ', 'tag'] };
function Apps() {
  const [L, setL] = useState(null); const load = useCallback(() => get('/api/people/my/applications').then(r => setL(r.items || [])), []);
  useEffect(() => { load(); }, [load]);
  if (!L) return <Spinner />;
  return (
    <div className="mx-auto max-w-2xl"><PageTitle>📄 ማመልከቻዎቼ</PageTitle>
      {L.length ? <ExpandGroup className="grid items-start gap-3">{L.map(a => { const t = AST[a.status] || [a.status, 'tag']; return (
        <ExpandCard key={a.id} href={a.job ? `/jobs/${a.job.id}` : undefined} cta="ሥራውን ክፈት"
          head={<><div className="flex items-center justify-between gap-2"><b>{a.invite ? '🤝 የቅጥር ጥያቄ' : '💼 ' + (a.job ? a.job.title : '')}</b><span className={t[1]}>{t[0]}</span></div><p className="muted mt-1">🏢 {a.employer && a.employer.name}</p></>}
          actions={a.status === 'applied' ? <button className="btn-ghost w-full" onClick={async () => { await post(`/api/people/app/${a.id}/status`, { status: 'withdrawn' }); load(); }}>ማመልከቻ አንሳ</button> : null}>
          {a.message && <MoreText text={'“' + a.message + '”'} />}
          <Facts items={[['📞', 'የአሰሪ ስልክ', a.employer && a.employer.phone ? <a key="p" className="font-extrabold text-brand" href={`tel:${a.employer.phone}`}>{a.employer.phone}</a> : ''], ['📅', 'ቀን', a.ts ? new Date(a.ts).toLocaleDateString('am-ET') : '']]} />
        </ExpandCard>); })}</ExpandGroup> : <Empty>እስካሁን አላመለከቱም</Empty>}
    </div>
  );
}
export default function Page() { return <RequireAuth><Apps /></RequireAuth>; }
