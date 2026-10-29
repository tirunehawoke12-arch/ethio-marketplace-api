'use client';
/* መምህር፦ ፒፒቲ ጫን (በአሳሽህ ይነበባል) + የተማሪ ዝርዝር + መስኮት + እንቅስቃሴ */
import { useCallback, useEffect, useState } from 'react';
import { api, get, post } from '@/lib/api';
import { errText } from '@/lib/consts';
import { Msg, PageTitle, Spinner } from '@/components/ui';
import RequireAuth from '@/components/RequireAuth';
import { parsePptx } from '@/lib/pptx';

async function shrink(bytes, mime) {          // ምስሉን ወደ ≤ ~380KB WebP ያቀንሳል
  const bmp = await createImageBitmap(new Blob([bytes], { type: mime })); let w = Math.min(1280, bmp.width), q = 0.82;
  for (let k = 0; k < 8; k++) { const h = Math.max(1, Math.round(bmp.height * (w / bmp.width))), c = document.createElement('canvas'); c.width = w; c.height = h; c.getContext('2d').drawImage(bmp, 0, 0, w, h); const u = c.toDataURL('image/webp', q); if (u.length < 480000) return u; q = Math.max(0.5, q - 0.1); w = Math.round(w * 0.85); }
  return null;
}
const ago = t => (t ? new Date(t).toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }) : '—');

function Manage({ id }) {
  const [d, setD] = useState(null), [f, setF] = useState({ title: '', opens: '', closes: '', roster: '' }), [m, setM] = useState(''), [ok, setOk] = useState(false), [prog, setProg] = useState(''), [sure, setSure] = useState(false);
  const load = useCallback(async () => { const r = await get('/api/learn/decks/' + id); setD(r); if (r.ok) setF(x => ({ ...x, title: r.deck.title, opens: r.deck.opens, closes: r.deck.closes, roster: r.roster.map(s => s.name + ', ' + s.id).join('\n') })); }, [id]);
  useEffect(() => { load(); }, [load]);
  const say = (t, good) => { setM(t); setOk(!!good); };
  async function save(extra) { const r = await post(`/api/learn/decks/${id}/settings`, { title: f.title, opens: f.opens, closes: f.closes, roster: f.roster, ...(extra || {}) }); say(r.ok ? '✅ ተቀምጧል' : errText(r.error), r.ok); if (r.ok) load(); }
  async function upload(e) {
    const file = e.target.files && e.target.files[0]; e.target.value = ''; if (!file) return; setM(''); setProg('⏳ ፋይሉን በማንበብ ላይ…');
    try {
      const { slides, warnings } = await parsePptx(await file.arrayBuffer()), out = [], done = new Map(); let n = 0, total = slides.reduce((a, s) => a + s.images.length, 0);
      for (const s of slides) {
        const blocks = []; const ids = [];
        for (const img of s.images) { const key = img.name; if (!done.has(key)) { setProg(`🖼 ምስል ${++n}/${total}…`); let mid = null; try { const u = await shrink(await img.bytes(), img.mime); if (u) { const r = await post(`/api/learn/decks/${id}/media`, { dataUrl: u }); if (r.ok) mid = r.id; } } catch (x) { } done.set(key, mid); } ids.push(done.get(key)); }
        for (const b of s.blocks) { if (b.k === 'img') { const mid = ids[b.i]; if (mid) blocks.push({ k: 'img', m: mid, alt: b.alt }); } else blocks.push(b); }
        out.push({ title: s.title, blocks });
      }
      setProg('💾 በማስቀመጥ ላይ…'); const r = await post(`/api/learn/decks/${id}/content`, { slides: out }); setProg('');
      const miss = [...done.values()].filter(x => !x).length, w = warnings.length ? ` ⚠️ ${warnings.map(x => `ስላይድ ${x.n}፦ ${x.what.join('/')}`).join('፣ ')} በጽሑፍ አልገባም — በምስል (ስክሪን-ሾት) ቢያስገቡ ይሻላል።` : '';
      say(r.ok ? `✅ ${r.slides} ስላይድ ተጭኗል።${miss ? ` ${miss} ምስል አልገባም።` : ''}${w}` : errText(r.error), r.ok); if (r.ok) load();
    } catch (x) { setProg(''); say('❌ ይህ ፋይል መነበብ አልቻለም — .pptx (PowerPoint 2007+) መሆኑን ያረጋግጡ።'); }
  }
  async function reset(sid) { await post(`/api/learn/decks/${id}/reset`, { sid }); load(); }
  async function del() { const r = await api('DELETE', '/api/learn/decks/' + id); if (r.ok) location.href = '/me/learn'; else say(errText(r.error)); }
  if (!d) return <Spinner />; if (!d.ok) return <p className="msg-err">{errText(d.error)}</p>;
  const dk = d.deck, link = d.bot ? `https://t.me/${d.bot}?start=d_${id}` : '';
  return (
    <div className="mx-auto max-w-2xl space-y-3"><PageTitle>📖 {dk.title}</PageTitle>
      <div className="card"><div className="flex items-center gap-2"><b>ሁኔታ</b><span className={dk.isOpen ? 'tag' : 'tag-warn'}>{dk.status !== 'on' ? '⏸ ዝግ' : dk.isOpen ? '🟢 ክፍት' : '⏳ ከመስኮት ውጭ'}</span>
        <button className={'ml-auto ' + (dk.status === 'on' ? 'btn-ghost' : 'btn-primary')} disabled={!dk.slides && dk.status !== 'on'} onClick={() => save({ status: dk.status === 'on' ? 'off' : 'on' })}>{dk.status === 'on' ? '⏸ ዝጋ' : '▶️ ክፈት'}</button></div>
        {link ? <div className="mt-3 rounded-2xl bg-brand-light p-3 text-sm dark:bg-brand/20"><p className="font-bold">📎 ለተማሪዎች የሚሰጠው አገናኝ</p><p className="mt-1 break-all">{link}</p><button className="btn-soft mt-2" onClick={() => navigator.clipboard.writeText(link).then(() => say('✅ ተቀድቷል', true))}>📋 ቅዳ</button></div> : <p className="muted mt-2">TELEGRAM_BOT_USERNAME አልተቀናበረም — አገናኙ አይታይም።</p>}</div>
      <div className="card"><b>1️⃣ ፒፒቲ ጫን</b><p className="muted mt-1">.pptx ፋይል ይምረጡ። ጽሑፍ፣ ነጥቦች፣ ሠንጠረዥ እና ምስሎች ተነብበው ለማንበብ ምቹ በሆነ ተከታታይ ሰነድ ይሆናሉ (ተማሪው ፋይሉን በጭራሽ አያገኝም)። ድጋሚ መጫን የድሮውን ይተካል። {dk.slides > 0 && <b>አሁን፦ {dk.slides} ስላይድ</b>}</p>
        <label className="btn-primary mt-3 w-full cursor-pointer">📂 .pptx ምረጥ<input type="file" accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation" className="hidden" onChange={upload} /></label>{prog && <p className="msg-ok mt-2">{prog}</p>}</div>
      <div className="card"><b>2️⃣ የተማሪዎች ዝርዝር</b><p className="muted mt-1">በየመስመሩ አንድ ተማሪ፦ <b>ስም, ID</b> (ለምሳሌ <code>አበበ በቀለ, S001</code>)። ተማሪው የመጀመሪያ ስሙን እና ID ያስገባል። ከ Excel ኮፒ ማድረግም ይቻላል።</p>
        <textarea className="input mt-2 font-mono text-sm" rows={8} value={f.roster} onChange={e => setF({ ...f, roster: e.target.value })} placeholder={'አበበ በቀለ, S001\nትዕግስት አለሙ, S002'} />
        <div className="mt-2 grid grid-cols-2 gap-2"><label className="text-sm font-bold">ከ (ቀን)<input type="date" className="input mt-1" value={f.opens} onChange={e => setF({ ...f, opens: e.target.value })} /></label><label className="text-sm font-bold">እስከ (ቀን)<input type="date" className="input mt-1" value={f.closes} onChange={e => setF({ ...f, closes: e.target.value })} /></label></div>
        <label className="label">ርዕስ</label><input className="input" value={f.title} onChange={e => setF({ ...f, title: e.target.value })} /><button className="btn-primary mt-3 w-full" onClick={() => save()}>💾 አስቀምጥ</button></div>
      <Msg m={m} ok={ok} />
      <div className="card"><b>👥 ተማሪዎች ({d.roster.length})</b><p className="muted mt-1">🔗 = ID ከአንድ Telegram አካውንት ጋር ታስሯል (ሌላ ሰው መጠቀም አይችልም)። ተማሪ ስልኩን ከቀየረ «አስፈታ» ይጫኑ።</p>
        <div className="mt-2 divide-y divide-line dark:divide-[#25352c]">{d.roster.map(s => <div key={s.id} className="flex items-center gap-2 py-2 text-sm"><div className="min-w-0 flex-1"><b className="block truncate">{s.name}</b><span className="muted">{s.id} · ተከፍቷል {s.opened}× · ስላይድ {s.max}/{d.slidesN} · {ago(s.last)}</span></div>{s.bound ? <button className="btn-soft" onClick={() => reset(s.id)}>🔗 አስፈታ</button> : <span className="muted">○</span>}</div>)}{!d.roster.length && <p className="muted py-2">ዝርዝር ገና ባዶ ነው</p>}</div></div>
      <div className="card"><button className="btn-ghost w-full !text-red-700" onClick={() => (sure ? del() : (setSure(true), setTimeout(() => setSure(false), 4000)))}>{sure ? '❓ እርግጠኛ ነዎት? እንደገና ይጫኑ' : '🗑 ፋይሉን ሰርዝ'}</button></div>
    </div>
  );
}
export default function Page({ params }) { return <RequireAuth><Manage id={params.id} /></RequireAuth>; }
