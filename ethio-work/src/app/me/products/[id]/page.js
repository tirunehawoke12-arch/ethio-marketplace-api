'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { get, post } from '@/lib/api';
import { errText } from '@/lib/consts';
import { useConfig, useForm } from '@/lib/form';
import { Input, Msg, Select, Spinner, Textarea } from '@/components/ui';
import ImageInput from '@/components/ImageInput';
import RequireAuth from '@/components/RequireAuth';

function Form({ id }) {
  const cfg = useConfig(), router = useRouter(), { f, setF, bind, set } = useForm({ title: '', category: '', price: '', stock: '', unit: 'አንድ', desc: '', imgs: [], hidden: false }), [ready, setReady] = useState(id === 'new'), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { if (id === 'new') return; get('/api/market/my/shop').then(r => { const p = (r.products || []).find(x => x.id === id); if (p) setF({ title: p.title, category: p.category, price: p.price, stock: p.stock, unit: p.unit, desc: p.desc, imgs: p.imgs, hidden: p.status === 'hidden' }); setReady(true); }); }, [id, setF]);
  if (!ready) return <Spinner />;
  async function save() { setBusy(true); setErr(''); const r = await post('/api/market/product', { id: id === 'new' ? '' : id, title: f.title, category: f.category || cfg.cats[0], price: f.price, stock: f.stock, unit: f.unit, desc: f.desc, imgs: f.imgs, status: f.hidden ? 'hidden' : 'active' }); setBusy(false); r.ok ? router.push('/me/shop') : setErr(errText(r.error)); }
  return (
    <div className="mx-auto max-w-xl card"><h1 className="text-xl">{id === 'new' ? '➕ አዲስ ዕቃ' : '✏️ ዕቃ አርትዕ'}</h1>
      <Input label="የዕቃ ስም" {...bind('title')} maxLength={80} /><Select label="ምድብ" options={cfg.cats} value={f.category || cfg.cats[0] || ''} onChange={bind('category').onChange} />
      <div className="grid grid-cols-2 gap-x-3"><Input label="ዋጋ (ብር)" type="number" min="1" {...bind('price')} /><Input label="ክምችት (ብዛት)" type="number" min="0" {...bind('stock')} /></div>
      <Input label="መለኪያ (ኪሎ፣ ሊትር፣ አንድ፣ ሌሊት…)" {...bind('unit')} /><Textarea label="ዝርዝር መግለጫ" {...bind('desc')} /><div className="mt-3"><ImageInput label="ፎቶዎች (እስከ 4)" value={f.imgs} onChange={v => set('imgs', v)} max={4} /></div>
      <label className="mt-3 flex items-center gap-3 text-sm font-bold"><input type="checkbox" className="h-5 w-5 accent-brand" checked={f.hidden} onChange={e => set('hidden', e.target.checked)} />🙈 ለጊዜው ደብቅ</label><Msg m={err} />
      <button className="btn-primary mt-4 w-full" disabled={busy} onClick={save}>{busy ? '⏳…' : '💾 አስቀምጥ'}</button></div>
  );
}
export default function Page({ params }) { return <RequireAuth><Form id={params.id} /></RequireAuth>; }
