'use client';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { get, post } from '@/lib/api';
import { REGIONS, errText } from '@/lib/consts';
import { useConfig, useForm } from '@/lib/form';
import { Check, Input, Msg, Select, Spinner, Textarea } from '@/components/ui';
import ImageInput from '@/components/ImageInput';
import RequireAuth from '@/components/RequireAuth';
import { useApp } from '@/lib/app';

function Form() {
  const cfg = useConfig(), { user } = useApp(), router = useRouter(), { f, setF, bind, chk, set } = useForm({ name: '', title: '', category: '', skills: '', exp: 0, education: '', about: '', region: REGIONS[0], city: '', phone: user.phone || '', showPhone: false, amount: '', per: 'ቀን', availability: 'available', languages: '', photo: [], gallery: [], visible: true });
  const [ready, setReady] = useState(false), [exists, setExists] = useState(false), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  useEffect(() => { get('/api/people/my').then(p => { const w = p.worker; if (w) { setExists(true); setF({ name: w.name, title: w.title, category: w.category, skills: (w.skills || []).join(', '), exp: w.exp, education: w.education, about: w.about, region: w.region, city: w.city, phone: w.phone, showPhone: w.showPhone, amount: w.rate ? w.rate.amount : '', per: w.rate ? w.rate.per : 'ቀን', availability: w.availability, languages: (w.languages || []).join(', '), photo: w.photo ? [w.photo] : [], gallery: w.gallery || [], visible: w.status !== 'hidden' }); } else setF(s => ({ ...s, name: user.name || '' })); setReady(true); }); }, [setF, user.name]);
  if (!ready) return <Spinner />;
  async function save() { setBusy(true); setErr(''); const r = await post('/api/people/worker', { name: f.name, title: f.title, category: f.category || cfg.workCats[0], skills: f.skills, exp: f.exp, education: f.education, about: f.about, region: f.region, city: f.city, phone: f.phone, showPhone: f.showPhone, rate: { amount: f.amount, per: f.per }, availability: f.availability, languages: f.languages, photo: f.photo[0] || '', gallery: f.gallery, visible: f.visible }); setBusy(false); r.ok ? router.push('/me') : setErr(errText(r.error)); }
  return (
    <div className="card mx-auto max-w-xl"><h1 className="text-xl">{exists ? '✏️ ገጽዎን ያዘምኑ' : '🧑‍🔧 ሠራተኛ ገጽ ይክፈቱ'}</h1><p className="muted">ይህ ገጽ ለአሰሪዎች ይታያል። የበለጠ የተሟላ ገጽ ብዙ ዕድል ያመጣል።</p>
      <Input label="ሙሉ ስም" {...bind('name')} /><Input label="ሙያ (አናጢ፣ ሹፌር፣ አስተማሪ…)" {...bind('title')} /><Select label="ዘርፍ" options={cfg.workCats} value={f.category || cfg.workCats[0] || ''} onChange={bind('category').onChange} />
      <Input label="ክህሎቶች (በኮማ)" {...bind('skills')} /><div className="grid grid-cols-2 gap-x-3"><Input label="ልምድ (ዓመት)" type="number" min="0" {...bind('exp')} /><Input label="ትምህርት" {...bind('education')} /></div>
      <Textarea label="ስለ እኔ" {...bind('about')} /><div className="grid grid-cols-2 gap-x-3"><Select label="ክልል" options={REGIONS} {...bind('region')} /><Input label="ከተማ" {...bind('city')} /></div>
      <Input label="ስልክ" type="tel" {...bind('phone')} /><Check label="ስልኬ ለሁሉም ይታይ" {...chk('showPhone')} />
      <div className="grid grid-cols-2 gap-x-3"><Input label="የሚጠይቁት ክፍያ (ብር)" type="number" {...bind('amount')} /><Select label="በ" options={cfg.per} {...bind('per')} /></div>
      <Select label="ሁኔታ" options={[{ value: 'available', label: '🟢 ለሥራ ዝግጁ' }, { value: 'busy', label: '🟡 ተሰማርቻለሁ' }]} {...bind('availability')} /><Input label="ቋንቋዎች (በኮማ)" {...bind('languages')} />
      <div className="mt-3"><ImageInput label="የመገለጫ ፎቶ" value={f.photo} onChange={v => set('photo', v)} max={1} /></div><div className="mt-3"><ImageInput label="የሥራ ናሙና ፎቶዎች (እስከ 6)" value={f.gallery} onChange={v => set('gallery', v)} max={6} /></div>
      <Check label="ገጼ ለህዝብ ይታይ" {...chk('visible')} /><Msg m={err} /><button className="btn-primary mt-4 w-full" disabled={busy} onClick={save}>{busy ? '⏳…' : '💾 አስቀምጥ'}</button></div>
  );
}
export default function Page() { return <RequireAuth><Form /></RequireAuth>; }
