'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { get, post } from '@/lib/api';
import { REGIONS, errText } from '@/lib/consts';
import { useForm } from '@/lib/form';
import { Check, Input, Msg, Select, Spinner, Textarea } from '@/components/ui';
import ImageInput from '@/components/ImageInput';
import RequireAuth from '@/components/RequireAuth';
import { useApp } from '@/lib/app';

function Form() {
  const { user } = useApp(), router = useRouter(), { f, setF, bind, chk, set } = useForm({ name: '', sector: '', about: '', region: REGIONS[0], city: '', address: '', phone: user.phone || '', showPhone: false, size: '1-5', tg: '', web: '', license: '', logo: [] });
  const [ready, setReady] = useState(false), [exists, setExists] = useState(false), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { get('/api/people/my').then(p => { const e = p.employer; if (e) { setExists(true); setF({ name: e.name, sector: e.sector, about: e.about, region: e.region, city: e.city, address: e.address, phone: e.phone, showPhone: e.showPhone, size: e.size || '1-5', tg: (e.links || {}).telegram || '', web: (e.links || {}).website || '', license: e.license || '', logo: e.logo ? [e.logo] : [] }); } setReady(true); }); }, [setF]);
  if (!ready) return <Spinner />;
  async function save() { setBusy(true); setErr(''); const r = await post('/api/people/employer', { name: f.name, sector: f.sector, about: f.about, region: f.region, city: f.city, address: f.address, phone: f.phone, showPhone: f.showPhone, size: f.size, links: { telegram: f.tg, website: f.web }, license: f.license, logo: f.logo[0] || '' }); setBusy(false); r.ok ? router.push('/me') : setErr(errText(r.error)); }
  return (
    <div className="card mx-auto max-w-xl"><h1 className="text-xl">{exists ? '✏️ ገጽዎን ያዘምኑ' : '🏢 አሰሪ ገጽ ይክፈቱ'}</h1>
      <Input label="የድርጅት / የአሰሪ ስም" {...bind('name')} /><Input label="ዘርፍ (ሆቴል፣ ግንባታ፣ ትምህርት…)" {...bind('sector')} /><Textarea label="ስለ ድርጅቱ" {...bind('about')} />
      <div className="grid grid-cols-2 gap-x-3"><Select label="ክልል" options={REGIONS} {...bind('region')} /><Input label="ከተማ" {...bind('city')} /></div><Input label="ዝርዝር አድራሻ" {...bind('address')} />
      <Input label="ስልክ" type="tel" {...bind('phone')} /><Check label="ስልኩ ለሁሉም ይታይ" {...chk('showPhone')} /><Select label="የሠራተኛ ብዛት" options={['1-5', '6-20', '21-100', '100+']} {...bind('size')} />
      <div className="grid grid-cols-2 gap-x-3"><Input label="ቴሌግራም" {...bind('tg')} /><Input label="ድረ-ገጽ" {...bind('web')} /></div><Input label="የንግድ ፈቃድ / TIN (ለአድሚን ብቻ)" {...bind('license')} />
      <div className="mt-3"><ImageInput label="አርማ" value={f.logo} onChange={v => set('logo', v)} max={1} /></div><Msg m={err} /><button className="btn-primary mt-4 w-full" disabled={busy} onClick={save}>{busy ? '⏳…' : '💾 አስቀምጥ'}</button></div>
  );
}
export default function Page() { return <RequireAuth><Form /></RequireAuth>; }
