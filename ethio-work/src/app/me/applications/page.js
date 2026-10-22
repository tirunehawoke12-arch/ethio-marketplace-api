'use client';
import { useCallback, useEffect, useState } from 'react';
import { get, post } from '@/lib/api';
import { Empty, PageTitle, Spinner } from '@/components/ui';
import RequireAuth from '@/components/RequireAuth';

const AST = { applied: ['📨 ተልኳል', 'tag'], shortlisted: ['⭐ በዝርዝር ውስጥ', 'tag'], hired: ['✅ ተቀጥረዋል', 'tag'], rejected: ['❌ አልተመረጡም', 'tag-bad'], withdrawn: ['↩️ ተነስቷል', 'tag-warn'], invited: ['🤝 ግብዣ', 'tag'] };
function Apps() {
  const [L, setL] = useState(null); const load = useCallback(() => get('/api/people/my/applications').then(r => setL(r.items || [])), []);
  useEffect(() => { load(); }, [load]);
  if (!L) return <Spinner />;
  return (
    <div className="mx-auto max-w-2xl"><PageTitle>📄 ማመልከቻዎቼ</PageTitle>
      {L.length ? L.map(a => { const t = AST[a.status] || [a.status, 'tag']; return (<div key={a.id} className="card mb-3"><div className="flex items-center justify-between gap-2"><b>{a.invite ? '🤝 የቅጥር ጥያቄ' : '💼 ' + (a.job ? a.job.title : '')}</b><span className={t[1]}>{t[0]}</span></div><p className="muted">🏢 {a.employer && a.employer.name}</p>{a.message && <p className="mt-1">“{a.message}”</p>}{a.employer && a.employer.phone && <p className="mt-2 rounded-2xl bg-brand-light p-3 text-sm">📞 <a className="font-bold text-brand" href={`tel:${a.employer.phone}`}>{a.employer.phone}</a></p>}{a.status === 'applied' && <button className="btn-ghost mt-2 w-full" onClick={async () => { await post(`/api/people/app/${a.id}/status`, { status: 'withdrawn' }); load(); }}>ማመልከቻ አንሳ</button>}</div>); }) : <Empty>እስካሁን አላመለከቱም</Empty>}
    </div>
  );
}
export default function Page() { return <RequireAuth><Apps /></RequireAuth>; }
