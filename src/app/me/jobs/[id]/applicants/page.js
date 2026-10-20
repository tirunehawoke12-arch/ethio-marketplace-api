'use client';
import { useCallback, useEffect, useState } from 'react';
import { get, post } from '@/lib/api';
import { Empty, PageTitle, Spinner } from '@/components/ui';
import { Thumb } from '@/components/Cards';
import RequireAuth from '@/components/RequireAuth';

const AST = { applied: ['📨 ተልኳል', 'tag'], shortlisted: ['⭐ በዝርዝር ውስጥ', 'tag'], hired: ['✅ ተቀጥረዋል', 'tag'], rejected: ['❌ አልተመረጡም', 'tag-bad'], withdrawn: ['↩️ ተነስቷል', 'tag-warn'], invited: ['🤝 ግብዣ', 'tag'] };
function Applicants({ id }) {
  const [L, setL] = useState(null);
  const load = useCallback(() => get('/api/people/my/applicants?jobId=' + id).then(r => setL(r.items || [])), [id]);
  useEffect(() => { load(); }, [load]);
  async function st(a, s) { await post(`/api/people/app/${a}/status`, { status: s }); load(); }
  if (!L) return <Spinner />;
  return (
    <div className="mx-auto max-w-2xl"><PageTitle>👥 አመልካቾች</PageTitle>
      {L.length ? L.map(a => { const w = a.worker || {}, t = AST[a.status] || [a.status, 'tag']; return (
        <div key={a.id} className="card mb-3"><div className="flex items-center gap-3"><Thumb id={w.photo} className="h-14 w-14 rounded-full" /><div className="min-w-0 flex-1"><b>{w.name}</b> <span className={t[1]}>{t[0]}</span><p>{w.title} · {w.exp || 0} ዓመት</p><p className="muted">📍 {w.city}</p></div></div>
          <div className="mt-2 flex flex-wrap gap-1.5">{(w.skills || []).map(s => <span key={s} className="tag">{s}</span>)}</div>{a.message && <p className="mt-2">“{a.message}”</p>}
          <p className="mt-2 rounded-2xl bg-brand-light p-3 text-sm">📞 <a className="font-bold text-brand" href={`tel:${w.phone}`}>{w.phone}</a> · 💼 {a.jobTitle}</p>
          <div className="mt-3 grid grid-cols-3 gap-2"><button className="btn-ghost" onClick={() => st(a.id, 'shortlisted')}>⭐ ዝርዝር</button><button className="btn-primary" onClick={() => st(a.id, 'hired')}>✅ ቅጠር</button><button className="btn-danger" onClick={() => st(a.id, 'rejected')}>❌</button></div></div>); }) : <Empty>እስካሁን አመልካች የለም</Empty>}
    </div>
  );
}
export default function Page({ params }) { return <RequireAuth><Applicants id={params.id} /></RequireAuth>; }
