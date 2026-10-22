'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, get, post } from '@/lib/api';
import { REGIONS, errText } from '@/lib/consts';
import { useConfig, useForm } from '@/lib/form';
import { Check, Input, Msg, Select, Spinner, Textarea } from '@/components/ui';
import RequireAuth from '@/components/RequireAuth';

function Form({ id }) {
  const cfg = useConfig(), router = useRouter(), { f, setF, bind, chk } = useForm({ title: '', category: '', type: '', description: '', requirements: '', min: '', max: '', per: 'ወር', openings: 1, deadline: '', region: REGIONS[0], city: '', closed: false });
  const [state, setState] = useState('load'), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { get('/api/people/my').then(async p => { if (!p.employer) return setState('noemp'); if (id !== 'new') { const r = await get('/api/people/job/' + id), mine = p.jobs.find(x => x.id === id); const j = (r.ok && r.job) || mine; if (j) setF({ title: j.title, category: j.category, type: j.type, description: j.description || '', requirements: j.requirements || '', min: (j.salary || {}).min || '', max: (j.salary || {}).max || '', per: (j.salary || {}).per || 'ወር', openings: j.openings, deadline: j.deadline || '', region: j.region, city: j.city, closed: mine ? mine.status === 'closed' : false }); } else setF(s => ({ ...s, region: p.employer.region, city: p.employer.city })); setState('ok'); }); }, [id, setF]);
  if (state === 'load') return <Spinner />;
  if (state === 'noemp') return <div className="card mx-auto max-w-md text-center"><h2 className="text-lg">መጀመሪያ የአሰሪ ገጽ ይክፈቱ</h2><Link href="/me/employer" className="btn-primary mt-3 w-full">🏢 አሰሪ ገጽ ክፈት</Link></div>;
  async function save() { setBusy(true); setErr(''); const r = await post('/api/people/job', { id: id === 'new' ? '' : id, title: f.title, category: f.category || cfg.workCats[0], type: f.type || cfg.jobTypes[0], description: f.description, requirements: f.requirements, salary: { min: f.min, max: f.max, per: f.per }, openings: f.openings, deadline: f.deadline, region: f.region, city: f.city, status: f.closed ? 'closed' : 'open' }); setBusy(false); r.ok ? router.push('/me') : setErr(errText(r.error)); }
  async function del() { if (!confirm('ማስታወቂያውን ይሰርዙ?')) return; await api('DELETE', '/api/people/job/' + id); router.push('/me'); }
  return (
    <div className="card mx-auto max-w-xl"><h1 className="text-xl">{id === 'new' ? '➕ ሥራ አስታውቅ' : '✏️ ሥራ አርትዕ'}</h1>
      <Input label="የሥራ ርዕስ" {...bind('title')} /><div className="grid grid-cols-2 gap-x-3"><Select label="ዘርፍ" options={cfg.workCats} value={f.category || cfg.workCats[0] || ''} onChange={bind('category').onChange} /><Select label="ዓይነት" options={cfg.jobTypes} value={f.type || cfg.jobTypes[0] || ''} onChange={bind('type').onChange} /></div>
      <Textarea label="መግለጫ" rows={5} {...bind('description')} /><Textarea label="መስፈርቶች" rows={3} {...bind('requirements')} />
      <div className="grid grid-cols-3 gap-x-2"><Input label="ዝቅተኛ ክፍያ" type="number" {...bind('min')} /><Input label="ከፍተኛ ክፍያ" type="number" {...bind('max')} /><Select label="በ" options={cfg.per} {...bind('per')} /></div>
      <div className="grid grid-cols-2 gap-x-3"><Input label="የቦታ ብዛት" type="number" min="1" {...bind('openings')} /><Input label="የማመልከቻ ማብቂያ" type="date" {...bind('deadline')} /><Select label="ክልል" options={REGIONS} {...bind('region')} /><Input label="ከተማ" {...bind('city')} /></div>
      <Check label="ማመልከቻ ዝጋ" {...chk('closed')} /><Msg m={err} /><button className="btn-primary mt-4 w-full" disabled={busy} onClick={save}>{busy ? '⏳…' : '💾 አስቀምጥ'}</button>{id !== 'new' && <button className="btn-danger mt-2 w-full" onClick={del}>🗑 ሰርዝ</button>}</div>
  );
}
export default function Page({ params }) { return <RequireAuth><Form id={params.id} /></RequireAuth>; }
