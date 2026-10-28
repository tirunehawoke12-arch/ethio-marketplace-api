'use client';
/* አድሚን፦ ባነር፣ ማስታወቂያ (broadcast)፣ የኦዲት መዝገብ */
import { useEffect, useState } from 'react';
import { get, post } from '@/lib/api';
import { errText } from '@/lib/consts';
import { Msg, Spinner } from '@/components/ui';
import Ico from './Ico';

const TONE = { info: 'bg-sky-100 text-sky-900', warn: 'bg-amber-100 text-amber-900', ok: 'bg-emerald-100 text-emerald-900' }, AUD = [['all', 'ሁሉም ተጠቃሚ'], ['sellers', 'ሻጮች'], ['workers', 'ሙያተኞች'], ['employers', 'አሰሪዎች']];
function Banner() {
  const [b, setB] = useState(null), [m, setM] = useState(''), [ok, setOk] = useState(false);
  useEffect(() => { get('/api/admin/banner').then(r => r.ok && setB(r.banner)); }, []); if (!b) return <Spinner />;
  const set = (k, v) => setB(x => ({ ...x, [k]: v }));
  async function save() { const r = await post('/api/admin/banner', b); setOk(!!r.ok); setM(r.ok ? '✅ ተቀምጧል — ባነሩ በ30 ሰከንድ ውስጥ ይታያል' : errText(r.error)); }
  return (<div className="card"><div className="flex items-center gap-2"><Ico n="megaphone" className="text-brand" /><b>የጣቢያ ባነር</b><label className="ml-auto flex items-center gap-2 text-sm font-bold"><input type="checkbox" className="h-5 w-5 accent-brand" checked={!!b.on} onChange={e => set('on', e.target.checked)} />{b.on ? 'በርቷል' : 'ጠፍቷል'}</label></div>
    <p className="muted mt-1">በሁሉም ገጽ አናት ላይ ለሁሉም ጎብኝ ይታያል (ለምሳሌ፦ የበዓል ቅናሽ፣ የጥገና ማሳሰቢያ)።</p>
    <textarea className="input mt-2" rows={2} maxLength={240} placeholder="የባነር ጽሑፍ" value={b.text} onChange={e => set('text', e.target.value)} />
    <div className="mt-2 grid gap-2 sm:grid-cols-2"><select className="input" value={b.tone} onChange={e => set('tone', e.target.value)}><option value="info">ℹ️ መረጃ (ሰማያዊ)</option><option value="warn">⚠️ ማሳሰቢያ (ቢጫ)</option><option value="ok">✅ ዜና (አረንጓዴ)</option></select><input className="input" placeholder="አገናኝ (አማራጭ፤ / ወይም https://)" value={b.link} onChange={e => set('link', e.target.value)} /></div>
    {b.text && <div className={'mt-3 rounded-2xl px-3 py-2 text-center text-sm font-bold ' + TONE[b.tone]}>{b.text}</div>}
    <button className="btn-primary mt-3 w-full" onClick={save}>💾 አስቀምጥ</button><Msg m={m} ok={ok} /></div>);
}
function Broadcast() {
  const [c, setC] = useState({}), [aud, setAud] = useState('all'), [text, setText] = useState(''), [sure, setSure] = useState(false), [m, setM] = useState(''), [ok, setOk] = useState(false);
  useEffect(() => { get('/api/admin/broadcast/count').then(r => r.ok && setC(r.counts)); }, []);
  async function go() { const r = await post('/api/admin/broadcast', { text, audience: aud }); setSure(false); setOk(!!r.ok); setM(r.ok ? `✅ ለ${r.n} ሰው በመላክ ላይ ነው` : r.error === 'slow_down' ? '⏳ ማስታወቂያ በሰዓት አንድ ጊዜ ብቻ ይላካል' : errText(r.error)); if (r.ok) setText(''); }
  return (<div className="card"><div className="flex items-center gap-2"><Ico n="bell" className="text-brand" /><b>የ Telegram ማስታወቂያ</b></div>
    <p className="muted mt-1">በ Telegram ለተገናኙ ተጠቃሚዎች ይላካል (ዜና ያጠፉ አይደርሳቸውም)። በሰዓት አንድ ጊዜ።</p>
    <div className="mt-2 flex flex-wrap gap-2">{AUD.map(([k, l]) => <button key={k} className={aud === k ? 'chip-on' : 'chip'} onClick={() => setAud(k)}>{l} ({c[k] ?? '…'})</button>)}</div>
    <textarea className="input mt-2" rows={4} maxLength={1000} placeholder="መልእክት…" value={text} onChange={e => { setText(e.target.value); setSure(false); }} />
    {!sure ? <button className="btn-primary mt-3 w-full" disabled={text.trim().length < 5} onClick={() => setSure(true)}>📣 ቅድመ-እይታ እና መላክ</button>
      : <div className="mt-3 rounded-2xl bg-amber-50 p-3 text-sm dark:bg-amber-950/30"><b>ለ{c[aud]} ሰው ይላክ?</b><p className="mt-1 whitespace-pre-wrap">{text}</p><div className="mt-2 grid grid-cols-2 gap-2"><button className="btn-primary" onClick={go}>✅ ላክ</button><button className="btn-ghost" onClick={() => setSure(false)}>ተው</button></div></div>}
    <Msg m={m} ok={ok} /></div>);
}
function Audit() {
  const [L, setL] = useState(null); useEffect(() => { get('/api/admin/audit').then(r => setL(r.items || [])); }, []); if (!L) return <Spinner />;
  return (<div className="card"><div className="flex items-center gap-2"><Ico n="log" className="text-brand" /><b>የኦዲት መዝገብ</b><span className="muted ml-auto">የመጨረሻ {Math.min(L.length, 40)}</span></div>
    <ul className="mt-2 divide-y divide-line text-sm dark:divide-[#25352c]">{L.slice(0, 40).map(x => <li key={x.id} className="flex gap-2 py-1.5"><span className="muted shrink-0 !text-xs">{new Date(x.ts).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' })}</span><span className="min-w-0 flex-1 truncate"><b>{x.action}</b> {x.target && <span className="muted">{String(x.target).slice(0, 14)}</span>} {x.note && <span className="muted">· {x.note}</span>}</span></li>)}{!L.length && <li className="muted py-2">ገና የለም</li>}</ul></div>);
}
export default function AdminComms() { return <div className="grid gap-4 lg:grid-cols-2"><Banner /><Broadcast /><div className="lg:col-span-2"><Audit /></div></div>; }
