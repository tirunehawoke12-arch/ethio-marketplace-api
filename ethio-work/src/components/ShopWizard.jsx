'use client';
import { useState } from 'react';
import { useForm, useConfig } from '@/lib/form';
import { post } from '@/lib/api';
import { PAY, REGIONS, errText } from '@/lib/consts';
import { Check, Input, Msg, Select, Textarea } from './ui';
import { WizardBar } from './Stepper';
import ImageInput from './ImageInput';

const EMPTY = { kind: '', name: '', category: '', about: '', logo: [], region: REGIONS[0], city: '', address: '', hours: '2:00 - 12:00', phone: '', showPhone: false, tg: '', web: '', year: '', tags: '', license: '', gallery: [], pickup: true, local: false, fee: 0, areas: '', pm: PAY[0], acc: '', holder: '' };
export const shopToForm = s => ({ ...EMPTY, kind: s.kind, name: s.name, category: s.category, about: s.about, logo: s.logo ? [s.logo] : [], region: s.region, city: s.city, address: s.address, hours: s.hours, phone: s.phone, showPhone: s.showPhone, tg: (s.links || {}).telegram || '', web: (s.links || {}).website || '', year: s.year, tags: (s.tags || []).join(', '), license: s.license || '', gallery: s.gallery || [], pickup: s.delivery.pickup, local: s.delivery.local, fee: s.delivery.fee, areas: s.delivery.areas, pm: s.payout.method, acc: s.payout.account, holder: s.payout.holder });

export default function ShopWizard({ initial, editing, onDone }) {
  const cfg = useConfig(); const { f, bind, chk, set } = useForm(initial || EMPTY); const [n, setN] = useState(1); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const kind = f.kind || cfg.kinds[0] || '', cat = f.category || cfg.cats[0] || '';
  function next() {
    setErr('');
    if (n === 1 && f.name.trim().length < 3) return setErr('ስም (ቢያንስ 3 ፊደል) ያስገቡ');
    if (n === 2 && (!f.city.trim() || f.address.trim().length < 3 || !/^(\+?251|0)?[79]\d{8}$/.test((f.phone || '').replace(/[\s-]/g, '')))) return setErr('ከተማ፣ አድራሻ እና ትክክለኛ ስልክ ያስገቡ');
    if (n === 3) { if (!f.pickup && !f.local) return setErr('ቢያንስ አንድ የርክክብ ዘዴ ይምረጡ'); if (!f.acc.trim() || !f.holder.trim()) return setErr('የገንዘብ መቀበያ መረጃ ያስገቡ'); }
    setN(n + 1);
  }
  async function submit() {
    setBusy(true); setErr('');
    const r = await post('/api/market/shop', { name: f.name, kind, about: f.about, category: cat, region: f.region, city: f.city, address: f.address, hours: f.hours, phone: f.phone, showPhone: f.showPhone, logo: f.logo[0] || '', gallery: f.gallery, links: { telegram: f.tg, website: f.web }, year: f.year, tags: f.tags, license: f.license, delivery: { pickup: f.pickup, local: f.local, fee: +f.fee || 0, areas: f.areas }, payout: { method: f.pm, account: f.acc, holder: f.holder } });
    setBusy(false); r.ok ? onDone() : setErr(errText(r.error));
  }
  return (
    <div className="mx-auto max-w-xl"><h1 className="mb-3 text-2xl">{editing ? '✏️ ሱቅ አርትዕ' : '🏪 ሱቅ ይክፈቱ'}</h1><WizardBar n={n} total={4} />
      <div className="card"><h2 className="text-lg">ደረጃ {n} ከ 4</h2>
        {n === 1 && (<><p className="muted">ስለ ገጽዎ ለገዥዎች የሚታይ መረጃ</p><Select label="የገጽ ዓይነት" options={cfg.kinds} value={kind} onChange={bind('kind').onChange} /><Input label="የሱቅ / የድርጅት ስም" {...bind('name')} maxLength={60} /><Select label="ዋና ምድብ" options={cfg.cats} value={cat} onChange={bind('category').onChange} /><Textarea label="ስለ ሱቁ (ምን ይሸጣሉ?)" {...bind('about')} rows={3} /><ImageInput label="አርማ (አማራጭ)" value={f.logo} onChange={v => set('logo', v)} max={1} /></>)}
        {n === 2 && (<><p className="muted">ገዥዎች እንዲያገኟችሁ አድራሻ</p><Select label="ክልል" options={REGIONS} {...bind('region')} /><Input label="ከተማ" {...bind('city')} /><Input label="ዝርዝር አድራሻ" {...bind('address')} placeholder="ክፍለ ከተማ፣ ቀበሌ፣ ምልክት" /><Input label="የሥራ ሰዓት" {...bind('hours')} /><Input label="የሱቅ ስልክ" type="tel" {...bind('phone')} placeholder="09XXXXXXXX" /><Check label="ስልኩ ለህዝብ ይታይ" {...chk('showPhone')} /><div className="grid grid-cols-2 gap-x-3"><Input label="ቴሌግራም (@ስም)" {...bind('tg')} /><Input label="ድረ-ገጽ / ፌስቡክ" {...bind('web')} /><Input label="የተመሠረተበት ዓመት" {...bind('year')} maxLength={4} /><Input label="ቁልፍ ቃላት (በኮማ)" {...bind('tags')} /></div><Input label="የንግድ ፈቃድ / TIN (ለአድሚን ብቻ)" {...bind('license')} /><ImageInput label="የፎቶ ጋለሪ (እስከ 8)" value={f.gallery} onChange={v => set('gallery', v)} max={8} /></>)}
        {n === 3 && (<><p className="muted">ርክክብ እና ክፍያ መቀበያ (ክፍያ መቀበያው ለአድሚን ብቻ ይታያል)</p><Check label="🏬 በአካል መውሰድ ይፈቀዳል" {...chk('pickup')} /><Check label="🚚 ማድረስ አደርጋለሁ" {...chk('local')} /><Input label="የማድረሻ ክፍያ (ብር)" type="number" min="0" {...bind('fee')} /><Input label="የሚያደርሱባቸው አካባቢዎች" {...bind('areas')} /><hr className="my-4 border-line" /><Select label="ገንዘብ መቀበያ ዘዴ" options={PAY} {...bind('pm')} /><Input label="የአካውንት / ስልክ ቁጥር" {...bind('acc')} /><Input label="የአካውንት ባለቤት ስም" {...bind('holder')} /></>)}
        {n === 4 && (<><p className="muted">ያስገቡትን ያረጋግጡ — አድሚን ከመረመረ በኋላ ሱቅዎ ለህዝብ ይከፈታል።</p><div className="mt-3 rounded-2xl bg-brand-light p-3 text-sm leading-7"><b>{f.name}</b> · {kind} · {cat}<br />📍 {f.city}, {f.region} — {f.address}<br />📞 {f.phone}<br />💰 {f.pm} {f.acc} ({f.holder})<br />{f.pickup ? '🏬 በአካል ' : ''}{f.local ? `🚚 ማድረስ ${f.fee} ብር` : ''}</div></>)}
        <Msg m={err} />
        <div className="mt-4 flex gap-2">{n > 1 && <button className="btn-ghost flex-1" onClick={() => setN(n - 1)}>‹ ተመለስ</button>}{n < 4 ? <button className="btn-primary flex-1" onClick={next}>ቀጥል ›</button> : <button className="btn-primary flex-1" disabled={busy} onClick={submit}>{busy ? '⏳…' : '✅ ለአድሚን ላክ'}</button>}</div>
      </div>
    </div>
  );
}
