'use client';
/* eslint-disable @next/next/no-img-element */
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { get, imgUrl, post } from '@/lib/api';
import { errText } from '@/lib/consts';
import { themeColor, themeGrad } from '@/lib/templates';
import { useApp } from '@/lib/app';
import { Msg } from '@/components/ui';

const PREVIEW = 3;            // በእያንዳንዱ ክፍል መጀመሪያ የሚታዩ መስኮች ብዛት
const LONG = 140;             // ከዚህ በላይ ረጅም ጽሑፍ «ተጨማሪ ይመልከቱ» ይኖረዋል

function Lightbox({ id, onClose }) {
  if (!id) return null;
  return (<div className="fixed inset-0 z-50 grid place-items-center bg-black/85 p-4" onClick={onClose} role="dialog" aria-label="ፎቶ"><img src={imgUrl(id)} alt="" className="max-h-full max-w-full rounded-2xl" /><button className="absolute right-4 top-4 grid h-11 w-11 place-items-center rounded-full bg-white text-xl" aria-label="ዝጋ">✕</button></div>);
}
function More({ text }) {
  const [open, setOpen] = useState(false); const long = text.length > LONG;
  return (<div><p className={'whitespace-pre-wrap break-words ' + (long && !open ? 'line-clamp-3' : '')}>{text}</p>{long && <button onClick={() => setOpen(!open)} className="mt-1 inline-flex items-center gap-1 text-sm font-extrabold" style={{ color: 'var(--tc)' }}>{open ? '▲ ያነሰ' : '👁 ተጨማሪ ይመልከቱ'}</button>}</div>);
}
function Value({ f, zoom }) {
  const v = f.value;
  if (f.type === 'image') return <div className="flex flex-wrap gap-2">{v.map(i => <button key={i} onClick={() => zoom(i)} aria-label="ፎቶ ክፈት" className="group relative"><img src={imgUrl(i)} alt="" loading="lazy" className="h-20 w-20 rounded-2xl object-cover" /><span className="absolute inset-0 grid place-items-center rounded-2xl bg-black/35 text-xl text-white opacity-0 transition group-hover:opacity-100">👁</span></button>)}</div>;
  if (f.type === 'multi') return <div className="flex flex-wrap gap-1.5">{v.map(x => <span key={x} className="rounded-full px-3 py-1 text-sm font-bold" style={{ background: 'color-mix(in srgb, var(--tc) 14%, transparent)', color: 'var(--tc)' }}>{x}</span>)}</div>;
  if (f.type === 'yesno') return <b>{v === 'yes' ? '✅ አዎ' : '✖️ አይደለም'}</b>;
  if (f.type === 'link') return <a href={v} target="_blank" rel="noopener noreferrer nofollow" className="inline-flex max-w-full items-center gap-1 break-all rounded-xl px-3 py-1.5 text-sm font-extrabold text-white" style={{ background: 'var(--tc)' }}>🔗 <span className="truncate">{v.replace(/^https?:\/\//, '')}</span></a>;
  if (f.type === 'phone') return <a href={'tel:' + v} className="font-extrabold" style={{ color: 'var(--tc)' }}>📞 {v}</a>;
  if (f.type === 'number') return <b>{Number(v).toLocaleString('en-US')}</b>;
  if (f.type === 'date') return <b>📅 {v}</b>;
  if (f.type === 'long' || String(v).length > LONG) return <More text={String(v)} />;
  return <b className="break-words">{v}</b>;
}
function Section({ s, zoom, forceOpen }) {
  const [open, setOpen] = useState(false); const all = forceOpen || open, list = all ? s.fields : s.fields.slice(0, PREVIEW), rest = s.fields.length - PREVIEW;
  return (
    <section id={'s-' + s.id} className="card !p-0 overflow-hidden scroll-mt-24">
      <div className="flex items-center gap-3 px-4 py-3" style={{ background: 'color-mix(in srgb, var(--tc) 10%, transparent)' }}>
        <span className="grid h-10 w-10 place-items-center rounded-2xl text-xl text-white" style={{ background: 'var(--tg)' }}>{s.icon}</span>
        <h2 className="flex-1 text-lg">{s.title}</h2>
        {rest > 0 && <button onClick={() => setOpen(!all)} className="grid h-10 w-10 place-items-center rounded-2xl border border-line bg-white text-lg dark:bg-[#16211b]" aria-label={all ? 'ሰብስብ' : 'ሁሉንም ይመልከቱ'} aria-expanded={all}>{all ? '🙈' : '👁'}</button>}
      </div>
      <dl className="divide-y divide-line dark:divide-[#25352c]">
        {list.map(f => (<div key={f.id} className="grid gap-1 px-4 py-3 sm:grid-cols-[170px_1fr] sm:gap-4"><dt className="muted font-bold">{f.label}</dt><dd className="min-w-0 text-[15px]"><Value f={f} zoom={zoom} /></dd></div>))}
      </dl>
      {rest > 0 && !all && <button onClick={() => setOpen(true)} className="flex w-full items-center justify-center gap-2 border-t border-line px-4 py-3 text-sm font-extrabold dark:border-[#25352c]" style={{ color: 'var(--tc)' }}>👁 ተጨማሪ ይመልከቱ (+{rest})</button>}
    </section>
  );
}
export function FormInputs({ fields, ans, setAns }) {
  const set = (id, v) => setAns(a => ({ ...a, [id]: v }));
  return fields.map(f => (
    <div key={f.id}>
      <label className="label">{f.label}{f.required && <b className="text-red-600"> *</b>}</label>{f.hint && <p className="muted -mt-0.5 mb-1">{f.hint}</p>}
      {f.type === 'long' ? <textarea rows={4} className="input" value={ans[f.id] || ''} onChange={e => set(f.id, e.target.value)} />
        : f.type === 'choice' ? <div className="flex flex-wrap gap-2">{f.options.map(o => <button type="button" key={o} onClick={() => set(f.id, o)} className={ans[f.id] === o ? 'chip-on' : 'chip'}>{o}</button>)}</div>
        : f.type === 'multi' ? <div className="flex flex-wrap gap-2">{f.options.map(o => { const cur = ans[f.id] || [], on = cur.includes(o); return <button type="button" key={o} onClick={() => set(f.id, on ? cur.filter(x => x !== o) : [...cur, o])} className={on ? 'chip-on' : 'chip'}>{on ? '✓ ' : ''}{o}</button>; })}</div>
          : f.type === 'yesno' ? <div className="flex gap-2">{[['yes', 'አዎ'], ['no', 'አይደለም']].map(([v, t]) => <button type="button" key={v} onClick={() => set(f.id, v)} className={ans[f.id] === v ? 'chip-on' : 'chip'}>{t}</button>)}</div>
            : <input className="input" type={f.type === 'number' ? 'number' : f.type === 'date' ? 'date' : f.type === 'phone' ? 'tel' : 'text'} value={ans[f.id] || ''} onChange={e => set(f.id, e.target.value)} />}
    </div>
  ));
}
function VisitorForm({ pg, f, many }) {
  const { user } = useApp(); const [ans, setAns] = useState({}), [m, setM] = useState(''), [done, setDone] = useState(false), [busy, setBusy] = useState(false); 
  if (done) return <div className="card text-center"><p className="text-4xl">🎉</p><h2 className="text-lg">ተልኳል!</h2><p className="muted">የገጹ ባለቤት መልስዎን ተቀብሏል፤ በቅርቡ ያገኙዎታል።</p></div>;
  async function send() { setBusy(true); setM(''); const r = await post(`/api/pages/${pg.id}/respond`, { answers: ans, formId: f.id }); setBusy(false); r.ok ? setDone(true) : setM(errText(r.error)); }
  return (
    <section id={'s-form-' + (f.id || 'x')} className="card scroll-mt-24" style={{ borderColor: 'var(--tc)' }}>
      <h2 className="flex items-center gap-2 text-lg"><span className="grid h-10 w-10 place-items-center rounded-2xl text-xl text-white" style={{ background: 'var(--tg)' }}>📝</span>{f.title}</h2>{f.intro && <p className="muted mt-1">{f.intro}</p>}
      {user ? (<><FormInputs fields={f.fields} ans={ans} setAns={setAns} /><Msg m={m} /><button className="btn-primary mt-4 w-full" disabled={busy} onClick={send}>{busy ? '⏳…' : f.button}</button></>)
        : <div className="mt-3 rounded-2xl bg-brand-light p-4 text-center"><p className="muted mb-3">ቅጹን ለመሙላት መጀመሪያ ይግቡ።</p><Link className="btn-primary w-full" href={`/login?next=/site/${pg.id}`}>ግባ</Link></div>}
    </section>
  );
}
const MOD = { shop: ['🏪', 'ሱቄ'], worker: ['🧑‍🔧', 'ሙያዬ'], employer: ['🏢', 'አሰሪ / ሥራ'] };
function Module({ kind, r, forceOpen }) {
  const [open, setOpen] = useState(false), [d, setD] = useState(null); const all = forceOpen || open;
  useEffect(() => { if (!all || d) return; const u = kind === 'shop' ? '/api/market/shop/' : kind === 'worker' ? '/api/people/worker/' : '/api/people/employer/'; get(u + r.id).then(setD); }, [all, d, kind, r.id]);
  const href = kind === 'shop' ? '/shop/' + r.id : kind === 'worker' ? '/workers/' + r.id : '/employers/' + r.id;
  const [ic, label] = MOD[kind], sub = kind === 'worker' ? r.title : '';
  const items = d && d.ok ? (kind === 'shop' ? (d.products || []).slice(0, 6) : kind === 'employer' ? (d.jobs || []).slice(0, 6) : []) : [], w = d && d.ok && d.worker;
  return (
    <section id={'s-m-' + kind} className="card !p-0 overflow-hidden scroll-mt-24">
      <div className="flex items-center gap-3 px-4 py-3" style={{ background: 'color-mix(in srgb, var(--tc) 10%, transparent)' }}>
        <span className="grid h-10 w-10 place-items-center rounded-2xl text-xl text-white" style={{ background: 'var(--tg)' }}>{ic}</span>
        <div className="min-w-0 flex-1"><h2 className="truncate text-lg">{label}፦ {r.name}</h2>{sub && <p className="muted truncate">{sub}</p>}</div>
        <button onClick={() => setOpen(!all)} className="grid h-10 w-10 place-items-center rounded-2xl border border-line bg-white text-lg dark:bg-[#16211b]" aria-label={all ? 'ሰብስብ' : 'ዘርጋ'} aria-expanded={all}>{all ? '🙈' : '👁'}</button>
      </div>
      {all && <div className="space-y-2 px-4 py-3">
        {!d && <p className="muted">⏳…</p>}
        {w && <><p className="text-[15px]">{[w.category, w.city, w.region].filter(Boolean).join(' · ')}</p>{w.about && <More text={w.about} />}{(w.skills || []).length > 0 && <div className="flex flex-wrap gap-1.5">{w.skills.slice(0, 12).map(x => <span key={x} className="rounded-full px-3 py-1 text-sm font-bold" style={{ background: 'color-mix(in srgb, var(--tc) 14%, transparent)', color: 'var(--tc)' }}>{x}</span>)}</div>}</>}
        {d && d.ok && kind === 'shop' && (items.length ? <ul className="divide-y divide-line dark:divide-[#25352c]">{items.map(p => <li key={p.id}><Link href={'/p/' + p.id} className="flex items-center justify-between gap-3 py-2"><span className="min-w-0 truncate font-bold">{p.title}</span><b style={{ color: 'var(--tc)' }}>{Number(p.price).toLocaleString('en-US')} ብር</b></Link></li>)}</ul> : <p className="muted">እስካሁን ዕቃ አልተዘረዘረም</p>)}
        {d && d.ok && kind === 'employer' && (items.length ? <ul className="divide-y divide-line dark:divide-[#25352c]">{items.map(j => <li key={j.id}><Link href={'/jobs/' + j.id} className="flex items-center justify-between gap-3 py-2"><span className="min-w-0 truncate font-bold">{j.title}</span><span className="muted">{j.type}</span></Link></li>)}</ul> : <p className="muted">አሁን ክፍት ሥራ የለም</p>)}
        <Link href={href} className="btn-ghost !min-h-[40px] w-full" style={{ color: 'var(--tc)' }}>ሙሉውን ይክፈቱ ←</Link>
      </div>}
    </section>
  );
}
export default function SiteView({ pg }) {
  const [zoom, setZoom] = useState(''); const [all, setAll] = useState(false); const [copied, setCopied] = useState(false);
  const style = { '--tc': themeColor(pg.theme), '--tg': themeGrad(pg.theme) };
  const forms = pg.forms || (pg.form ? [pg.form] : []), refs = pg.refs || {}, mods = ['shop', 'worker', 'employer'].filter(k => refs[k]);
  const nav = [...pg.sections.map(s => ['' + s.id, s.icon, s.title]), ...mods.map(k => ['m-' + k, MOD[k][0], MOD[k][1]]), ...forms.map(f => ['form-' + (f.id || 'x'), '📝', f.title])];
  const share = async () => { const u = window.location.href; try { if (navigator.share) await navigator.share({ title: pg.title, url: u }); else { await navigator.clipboard.writeText(u); setCopied(true); setTimeout(() => setCopied(false), 1800); } } catch (e) { } };
  return (
    <div style={style} className="mx-auto max-w-3xl">
      <div className="overflow-hidden rounded-[28px] shadow-lift">
        <div className="relative h-44 sm:h-60" style={{ background: 'var(--tg)' }}>{pg.cover && <img src={imgUrl(pg.cover)} alt="" className="h-full w-full object-cover" />}<div className="absolute inset-0 bg-gradient-to-t from-black/55 to-transparent" /><span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-extrabold" style={{ color: 'var(--tc)' }}>{pg.kind}</span></div>
        <div className="relative bg-white px-5 pb-5 pt-12 dark:bg-[#16211b]">
          <div className="absolute -top-10 left-5 grid h-20 w-20 place-items-center overflow-hidden rounded-3xl border-4 border-white bg-white text-3xl shadow-soft dark:border-[#16211b]" style={{ background: 'var(--tg)' }}>{pg.logo ? <img src={imgUrl(pg.logo)} alt="" className="h-full w-full object-cover" /> : <span className="text-white">{(pg.title || '?').slice(0, 1)}</span>}</div>
          <h1 className="text-2xl sm:text-3xl">{pg.title}</h1>{pg.tagline && <p className="mt-1 text-[15px] font-bold" style={{ color: 'var(--tc)' }}>{pg.tagline}</p>}
          {(pg.city || pg.region) && <p className="muted mt-1">📍 {[pg.city, pg.region].filter(Boolean).join(', ')}</p>}
          {pg.about && <div className="mt-3"><More text={pg.about} /></div>}
          <div className="mt-4 flex flex-wrap gap-2">
            {pg.phone && <a href={'tel:' + pg.phone} className="btn-primary !min-h-[44px] flex-1" style={{ background: 'var(--tg)' }}>📞 ደውል</a>}
            {forms[0] && <a href={'#s-form-' + (forms[0].id || 'x')} className="btn-ghost !min-h-[44px] flex-1" style={{ color: 'var(--tc)' }}>📝 {forms[0].title}</a>}
            <button onClick={share} className="btn-ghost !min-h-[44px]" style={{ color: 'var(--tc)' }}>{copied ? '✓ ተቀድቷል' : '🔗 አጋራ'}</button>
          </div>
        </div>
      </div>
      {pg.gallery && pg.gallery.length > 0 && <div className="mt-4 flex snap-x gap-2 overflow-x-auto pb-1">{pg.gallery.map(g => <button key={g} onClick={() => setZoom(g)} className="group relative shrink-0 snap-center" aria-label="ፎቶ ክፈት"><img src={imgUrl(g)} alt="" loading="lazy" className="h-40 w-60 rounded-3xl object-cover" /><span className="absolute inset-0 grid place-items-center rounded-3xl bg-black/30 text-2xl text-white opacity-0 transition group-hover:opacity-100">👁</span></button>)}</div>}
      {nav.length > 1 && <div className="sticky top-[62px] z-30 -mx-3 mt-4 flex gap-2 overflow-x-auto bg-bg/90 px-3 py-2 backdrop-blur dark:bg-[#0d1511]/90">{nav.map(([i, ic, t]) => <a key={i} href={'#s-' + i} className="chip">{ic} {t}</a>)}<button onClick={() => setAll(!all)} className="chip" style={{ color: 'var(--tc)' }}>{all ? '🙈 ሰብስብ' : '👁 ሁሉንም አሳይ'}</button></div>}
      <div className="mt-3 space-y-4">{pg.sections.map(s => <Section key={s.id} s={s} zoom={setZoom} forceOpen={all} />)}{mods.map(k => <Module key={k} kind={k} r={refs[k]} forceOpen={all} />)}{forms.map(f => <VisitorForm key={f.id || 'x'} pg={pg} f={f} />)}</div>
      <p className="muted mt-6 text-center">🇪🇹 በ <Link href="/" className="font-bold" style={{ color: 'var(--tc)' }}>ኢትዮ ዲጂታል ማርኬት</Link> የተሠራ ገጽ · <Link href="/me/sites/new" className="font-bold underline">የራስዎን ገጽ ይክፈቱ</Link></p>
      <Lightbox id={zoom} onClose={() => setZoom('')} />
    </div>
  );
}
