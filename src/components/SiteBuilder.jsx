'use client';
/* እንደ Google Form ራስን የሚቀርጽ + የሚሞላ የገጽ መሥሪያ */
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { api, get, post } from '@/lib/api';
import { REGIONS, errText } from '@/lib/consts';
import { FIELD_TYPES, TEMPLATES, THEMES, VISITOR_PRESETS, blankField, blankFormField, blankSection, themeGrad } from '@/lib/templates';
import { Check, Msg, Spinner } from '@/components/ui';
import ImageInput from '@/components/ImageInput';
import SiteView from '@/components/SiteView';
import { useApp } from '@/lib/app';

const empty = v => (Array.isArray(v) ? !v.length : v === '' || v == null);
const move = (arr, i, d) => { const a = arr.slice(), j = i + d; if (j < 0 || j >= a.length) return a; [a[i], a[j]] = [a[j], a[i]]; return a; };
const upd = (arr, i, patch) => arr.map((x, k) => (k === i ? { ...x, ...patch } : x));

function ValueInput({ f, onChange }) {
  const v = f.value;
  if (f.type === 'long') return <textarea rows={3} className="input" value={v || ''} onChange={e => onChange(e.target.value)} />;
  if (f.type === 'choice') return <div className="flex flex-wrap gap-2">{f.options.map(o => <button type="button" key={o} onClick={() => onChange(v === o ? '' : o)} className={v === o ? 'chip-on' : 'chip'}>{o}</button>)}{!f.options.length && <p className="muted">ምርጫዎችን በ ⚙️ ውስጥ ያክሉ</p>}</div>;
  if (f.type === 'multi') return <div className="flex flex-wrap gap-2">{f.options.map(o => { const on = (v || []).includes(o); return <button type="button" key={o} onClick={() => onChange(on ? v.filter(x => x !== o) : [...(v || []), o])} className={on ? 'chip-on' : 'chip'}>{on ? '✓ ' : ''}{o}</button>; })}{!f.options.length && <p className="muted">ምርጫዎችን በ ⚙️ ውስጥ ያክሉ</p>}</div>;
  if (f.type === 'yesno') return <div className="flex gap-2">{[['yes', 'አዎ'], ['no', 'አይደለም']].map(([k, t]) => <button type="button" key={k} onClick={() => onChange(v === k ? '' : k)} className={v === k ? 'chip-on' : 'chip'}>{t}</button>)}</div>;
  if (f.type === 'image') return <ImageInput value={v || []} onChange={onChange} max={6} />;
  return <input className="input" type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'phone' ? 'tel' : 'text'} placeholder={f.type === 'link' ? 'https://… ወይም @username' : ''} value={v || ''} onChange={e => onChange(e.target.value)} />;
}

function FieldEditor({ f, onChange, onUp, onDown, onDel, withValue }) {
  const [cfg, setCfg] = useState(false); const choice = f.type === 'choice' || f.type === 'multi';
  return (
    <div className="rounded-2xl border border-line bg-bg/60 p-3 dark:border-[#25352c] dark:bg-[#111b16]">
      <div className="flex items-start gap-2">
        <input className="input !py-2 font-bold" value={f.label} onChange={e => onChange({ label: e.target.value })} aria-label="የጥያቄ ርዕስ" placeholder="የጥያቄ / መስክ ርዕስ" />
        <button type="button" onClick={() => setCfg(!cfg)} className={'grid h-11 w-11 shrink-0 place-items-center rounded-2xl border ' + (cfg ? 'border-brand bg-brand-light' : 'border-line bg-white dark:bg-[#16211b]')} aria-label="ቅንብር">⚙️</button>
      </div>
      {cfg && (
        <div className="mt-2 space-y-2 rounded-2xl bg-white p-3 dark:bg-[#16211b]">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-sm font-bold">የመልስ ዓይነት<select className="input !py-2" value={f.type} onChange={e => onChange({ type: e.target.value, value: e.target.value === 'multi' || e.target.value === 'image' ? [] : '' })}>{FIELD_TYPES.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></label>
            <label className="text-sm font-bold">ማብራሪያ (አማራጭ)<input className="input !py-2" value={f.hint || ''} onChange={e => onChange({ hint: e.target.value })} /></label>
          </div>
          {choice && <label className="block text-sm font-bold">ምርጫዎች (እያንዳንዱ በአዲስ መስመር)<textarea rows={3} className="input" value={(f.options || []).join('\n')} onChange={e => onChange({ options: e.target.value.split('\n') })} onBlur={e => onChange({ options: [...new Set(e.target.value.split('\n').map(x => x.trim()).filter(Boolean))] })} /></label>}
          <div className="flex flex-wrap gap-4"><label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" className="h-5 w-5 accent-brand" checked={!!f.required} onChange={e => onChange({ required: e.target.checked })} />አስፈላጊ *</label>
            {withValue && <label className="flex items-center gap-2 text-sm font-bold"><input type="checkbox" className="h-5 w-5 accent-brand" checked={!!f.priv} onChange={e => onChange({ priv: e.target.checked })} />🔒 ለአድሚን ብቻ (ለህዝብ አይታይ)</label>}</div>
        </div>
      )}
      {withValue && <div className="mt-2">{f.priv && <p className="mb-1 text-xs font-bold text-amber-700">🔒 ይህ መልስ ለህዝብ አይታይም — አድሚን ብቻ ነው የሚያየው</p>}<ValueInput f={f} onChange={value => onChange({ value })} /></div>}
      <div className="mt-2 flex justify-end gap-1.5 text-sm"><button type="button" className="chip !px-3 !py-1" onClick={onUp} aria-label="ወደ ላይ">▲</button><button type="button" className="chip !px-3 !py-1" onClick={onDown} aria-label="ወደ ታች">▼</button><button type="button" className="chip !px-3 !py-1 text-red-600" onClick={onDel} aria-label="ሰርዝ">🗑</button></div>
    </div>
  );
}

function Look({ f, set, user }) {
  return (
    <div className="space-y-1">
      <label className="label">የገጹ ርዕስ (ስም) *</label><input className="input" value={f.title} onChange={e => set({ title: e.target.value })} placeholder="ለምሳሌ፦ አበበ አናጺ / ሰላም ሆቴል" />
      <label className="label">የገጹ ዓይነት (ራስዎ ይጻፉ)</label><input className="input" list="kinds" value={f.kind} onChange={e => set({ kind: e.target.value })} placeholder="ሠራተኛ፣ አሰሪ፣ ሱቅ፣ ሆቴል፣ ክሊኒክ…" /><datalist id="kinds">{TEMPLATES.map(t => <option key={t.key} value={t.kind} />)}</datalist>
      <label className="label">አጭር መፈክር</label><input className="input" value={f.tagline} onChange={e => set({ tagline: e.target.value })} />
      <label className="label">ስለ ገጹ መግለጫ</label><textarea rows={4} className="input" value={f.about} onChange={e => set({ about: e.target.value })} />
      <p className="label">ቀለም</p><div className="flex flex-wrap gap-2">{Object.entries(THEMES).map(([k, c]) => <button type="button" key={k} onClick={() => set({ theme: k })} className={'flex items-center gap-2 rounded-full border-2 px-3 py-1.5 text-sm font-bold ' + (f.theme === k ? 'border-ink dark:border-white' : 'border-transparent bg-white dark:bg-[#16211b]')}><span className="h-5 w-5 rounded-full" style={{ background: themeGrad(k) }} />{c[2]}</button>)}</div>
      <div className="grid grid-cols-2 gap-3 pt-2"><ImageInput label="አርማ / ፎቶ" value={f.logo ? [f.logo] : []} onChange={v => set({ logo: v[0] || '' })} max={1} /><ImageInput label="የሽፋን ምስል" value={f.cover ? [f.cover] : []} onChange={v => set({ cover: v[0] || '' })} max={1} /></div>
      <ImageInput label="ፎቶዎች (እስከ 8)" value={f.gallery} onChange={v => set({ gallery: v })} max={8} />
      <div className="grid grid-cols-2 gap-x-3"><div><label className="label">ክልል</label><select className="input" value={f.region} onChange={e => set({ region: e.target.value })}><option value="">—</option>{REGIONS.map(r => <option key={r}>{r}</option>)}</select></div><div><label className="label">ከተማ</label><input className="input" value={f.city} onChange={e => set({ city: e.target.value })} /></div></div>
      <label className="label">ስልክ</label><input className="input" type="tel" value={f.phone} placeholder={user.phone || '09…'} onChange={e => set({ phone: e.target.value })} />
      <Check label="ስልኬ ለሁሉም ይታይ (ደውል ቁልፍ ይኖራል)" checked={f.showPhone} onChange={e => set({ showPhone: e.target.checked })} />
      <Check label="ገጼ ለህዝብ ይታይ" checked={f.visible} onChange={e => set({ visible: e.target.checked })} />
    </div>
  );
}

function Fields({ sections, setSections }) {
  const patchSec = (i, p) => setSections(upd(sections, i, p));
  return (
    <div className="space-y-4">
      <p className="muted">እያንዳንዱ ክፍል በገጽዎ ላይ አንድ ካርድ ይሆናል። ጥያቄዎችን ያክሉ፣ ይቀይሩ ወይም ይሰርዙ — መልስዎን እዚሁ ይሙሉ። ⚙️ ሲጫኑ የመልስ ዓይነት (ምርጫ፣ ቁጥር፣ ፎቶ…) ይቀይራሉ።</p>
      {sections.map((s, i) => (
        <div key={s.id} className="card !p-3">
          <div className="flex items-center gap-2"><input className="input !w-16 !px-2 text-center text-xl" value={s.icon} maxLength={4} onChange={e => patchSec(i, { icon: e.target.value })} aria-label="አዶ" /><input className="input font-extrabold" value={s.title} onChange={e => patchSec(i, { title: e.target.value })} placeholder="የክፍል ርዕስ" /></div>
          <div className="mt-3 space-y-2">{s.fields.map((f, k) => <FieldEditor key={f.id} f={f} withValue onChange={p => patchSec(i, { fields: upd(s.fields, k, p) })} onUp={() => patchSec(i, { fields: move(s.fields, k, -1) })} onDown={() => patchSec(i, { fields: move(s.fields, k, 1) })} onDel={() => patchSec(i, { fields: s.fields.filter((_, j) => j !== k) })} />)}</div>
          <div className="mt-3 flex flex-wrap gap-2"><button type="button" className="btn-ghost !min-h-[40px] flex-1" onClick={() => patchSec(i, { fields: [...s.fields, blankField()] })}>➕ ጥያቄ ጨምር</button><button type="button" className="chip" onClick={() => setSections(move(sections, i, -1))}>▲</button><button type="button" className="chip" onClick={() => setSections(move(sections, i, 1))}>▼</button><button type="button" className="chip text-red-600" onClick={() => confirm('ይህን ክፍል በሙሉ ይሰረዝ?') && setSections(sections.filter((_, j) => j !== i))}>🗑 ክፍል</button></div>
        </div>
      ))}
      <button type="button" className="btn-primary w-full" onClick={() => setSections([...sections, blankSection()])}>➕ አዲስ ክፍል ጨምር</button>
    </div>
  );
}

function Visitor({ form, setForm }) {
  const patch = p => setForm({ ...form, ...p });
  return (
    <div className="space-y-3">
      <Check label="ጎብኝዎች የሚሞሉት ቅጽ በገጼ ላይ ይኑር (ቀጠሮ፣ ክፍል ማስያዝ፣ ማመልከቻ፣ ጥያቄ…)" checked={form.enabled} onChange={e => patch({ enabled: e.target.checked })} />
      {form.enabled && (<>
        <div className="flex flex-wrap gap-2">{VISITOR_PRESETS.map(p => <button type="button" key={p.name} className="chip" onClick={() => patch({ title: p.title, button: p.button, fields: p.fields() })}>{p.name}</button>)}</div>
        <label className="label">የቅጹ ርዕስ</label><input className="input" value={form.title} onChange={e => patch({ title: e.target.value })} />
        <label className="label">መግቢያ ጽሑፍ</label><input className="input" value={form.intro} onChange={e => patch({ intro: e.target.value })} />
        <label className="label">የላክ ቁልፍ ጽሑፍ</label><input className="input" value={form.button} onChange={e => patch({ button: e.target.value })} />
        <div className="space-y-2 pt-2">{form.fields.map((f, k) => <FieldEditor key={f.id} f={f} onChange={p => patch({ fields: upd(form.fields, k, p) })} onUp={() => patch({ fields: move(form.fields, k, -1) })} onDown={() => patch({ fields: move(form.fields, k, 1) })} onDel={() => patch({ fields: form.fields.filter((_, j) => j !== k) })} />)}</div>
        <button type="button" className="btn-ghost w-full" onClick={() => patch({ fields: [...form.fields, blankFormField()] })}>➕ ጥያቄ ጨምር</button>
      </>)}
    </div>
  );
}

function Responses({ id }) {
  const [d, setD] = useState(null);
  useEffect(() => { get(`/api/pages/my/${id}/responses`).then(setD); }, [id]);
  if (!d) return <Spinner />; if (!d.ok) return <Msg m={errText(d.error)} />;
  if (!d.items.length) return <div className="card muted text-center">እስካሁን መልስ አልደረሰም</div>;
  const show = (f, v) => (f.type === 'yesno' ? (v === 'yes' ? 'አዎ' : 'አይደለም') : Array.isArray(v) ? v.join('፣ ') : String(v));
  return <div className="space-y-3">{d.items.map(r => (
    <details key={r.id} className="card !p-0" open={!r.seen}><summary className="flex cursor-pointer list-none items-center gap-3 p-4"><span className="text-2xl">{r.seen ? '📭' : '📬'}</span><div className="min-w-0 flex-1"><b>{r.from.name || r.from.email || 'ተጠቃሚ'}</b><p className="muted">{new Date(r.ts).toLocaleString('am-ET')}</p></div><span className="grid h-9 w-9 place-items-center rounded-xl bg-brand-light">👁</span></summary>
      <dl className="divide-y divide-line border-t border-line dark:divide-[#25352c]">{d.fields.filter(f => !empty(r.answers[f.id])).map(f => <div key={f.id} className="px-4 py-2.5"><dt className="muted font-bold">{f.label}</dt><dd className="whitespace-pre-wrap break-words">{show(f, r.answers[f.id])}</dd></div>)}<div className="flex flex-wrap gap-3 px-4 py-3 text-sm">{r.from.phone && <a className="btn-primary !min-h-[40px]" href={'tel:' + r.from.phone}>📞 {r.from.phone}</a>}</div></dl></details>))}</div>;
}

const TABS = [['look', '🎨', 'መልክ'], ['fields', '🧩', 'ክፍሎች'], ['visitor', '📝', 'የጎብኝ ቅጽ'], ['preview', '👁', 'ቅድመ ዕይታ']];
export default function SiteBuilder({ id }) {
  const { user } = useApp(), router = useRouter();
  const [ready, setReady] = useState(!!id === false), [tpl, setTpl] = useState(!id), [tab, setTab] = useState('look'), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false), [pid, setPid] = useState(id || '');
  const [f, setF] = useState({ title: '', kind: '', tagline: '', about: '', theme: 'green', logo: '', cover: '', gallery: [], region: '', city: '', phone: user.phone || '', showPhone: false, visible: true });
  const [sections, setSections] = useState([]), [form, setForm] = useState({ enabled: false, title: 'ቅጽ ይሙሉ', intro: '', button: 'ላክ', fields: [] }); const [status, setStatus] = useState('active');
  useEffect(() => {
    if (!id) return;
    get('/api/pages/my/' + id).then(r => { if (!r.ok) { setMsg(errText(r.error)); setReady(true); return; } const p = r.page; setF({ title: p.title, kind: p.kind, tagline: p.tagline, about: p.about, theme: p.theme, logo: p.logo, cover: p.cover, gallery: p.gallery || [], region: p.region, city: p.city, phone: p.phone, showPhone: p.showPhone, visible: p.status !== 'hidden' }); setSections(p.sections); setForm(p.form); setStatus(p.status); setReady(true); });
  }, [id]);
  if (!ready) return <Spinner />;
  const set = p => setF(s => ({ ...s, ...p }));
  function pick(t) { setSections(t.build()); set({ kind: t.kind, tagline: f.tagline || t.tagline }); setTpl(false); }
  async function save() {
    if (f.title.trim().length < 2) { setTab('look'); return setMsg('የገጹን ርዕስ ያስገቡ'); }
    setBusy(true); setMsg(''); const r = await post('/api/pages', { id: pid || undefined, ...f, sections, form }); setBusy(false);
    if (!r.ok) return setMsg(errText(r.error)); setMsg('✅ ተቀምጧል'); setPid(r.id); setStatus(r.status); if (!pid) router.replace('/me/sites/' + r.id);
  }
  if (tpl) return (
    <div className="mx-auto max-w-2xl"><h1 className="text-2xl">✨ ገጽዎን በምን ይጀምሩ?</h1><p className="muted mb-4">አንዱን ይምረጡ — ከዚያ ሁሉንም ነገር እንደፈለጉ መቀየር፣ ማከል እና መሰረዝ ይችላሉ።</p>
      <div className="grid gap-3 sm:grid-cols-2">{TEMPLATES.map(t => <button key={t.key} onClick={() => pick(t)} className="card text-left transition hover:-translate-y-0.5 hover:shadow-lift"><span className="text-4xl">{t.icon}</span><b className="mt-1 block text-lg">{t.name}</b><span className="muted">{t.build().length} ክፍሎች · {t.build().reduce((a, s) => a + s.fields.length, 0)} ጥያቄዎች</span></button>)}</div></div>
  );
  const preview = { id: pid, ...f, phone: f.showPhone ? f.phone : '', kind: f.kind || 'ገጽ', sections: sections.map(s => ({ ...s, fields: s.fields.filter(x => !x.priv && !empty(x.value)) })).filter(s => s.fields.length), form: form.enabled && form.fields.length ? form : null };
  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-3 flex items-center justify-between gap-2"><h1 className="text-xl">{pid ? '🛠 ገጼን አስተዳድር' : '🆕 አዲስ ገጽ'}</h1>{pid && <Link href={`/site/${pid}`} className="btn-ghost !min-h-[40px]" target="_blank">🌐 ገጹን ክፈት</Link>}</div>
      {status === 'suspended' && <p className="msg-err mb-3">⛔ ይህ ገጽ በአድሚን ታግዷል።</p>}
      <div className="sticky top-[62px] z-30 -mx-3 mb-3 flex gap-2 overflow-x-auto bg-bg/90 px-3 py-2 backdrop-blur dark:bg-[#0d1511]/90">{TABS.map(([k, i, t]) => <button key={k} className={tab === k ? 'chip-on' : 'chip'} onClick={() => setTab(k)}>{i} {t}</button>)}{pid && <button className={tab === 'resp' ? 'chip-on' : 'chip'} onClick={() => setTab('resp')}>📬 መልሶች</button>}</div>
      <div className={tab === 'preview' ? '' : 'card'}>
        {tab === 'look' && <Look f={f} set={set} user={user} />}
        {tab === 'fields' && <Fields sections={sections} setSections={setSections} />}
        {tab === 'visitor' && <Visitor form={form} setForm={setForm} />}
        {tab === 'preview' && <><p className="msg-ok mb-3">👁 ህዝብ የሚያየው እንዲህ ነው (🔒 ምልክት የተደረገባቸው መስኮች አይታዩም)።</p><SiteView pg={preview} /></>}
        {tab === 'resp' && pid && <Responses id={pid} />}
      </div>
      {tab !== 'resp' && <><Msg m={msg} ok={msg.startsWith('✅')} /><button className="btn-primary sticky bottom-24 mt-4 w-full md:bottom-4" disabled={busy} onClick={save}>{busy ? '⏳…' : '💾 አስቀምጥ'}</button></>}
      {pid && <button className="mt-4 w-full text-sm font-bold text-red-600" onClick={async () => { if (!confirm('ይህ ገጽ እና መልሶቹ ለዘለዓለም ይሰረዛሉ። እርግጠኛ ነዎት?')) return; const r = await api('DELETE', '/api/pages/' + pid); r.ok ? router.push('/me') : setMsg(errText(r.error)); }}>🗑 ገጹን ሰርዝ</button>}
    </div>
  );
}
