'use client';
/* eslint-disable @next/next/no-img-element */
/* ተማሪ አንባቢ — በ Telegram mini app ውስጥ ብቻ። ስም + ID → «ፋይሉን ክፈት» → ተከታታይ ንባብ (scroll) */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const ERR = { telegram_only: 'ይህ ፋይል በ Telegram ቦት ውስጥ ብቻ ይከፈታል።', wrong_credentials: 'ስም ወይም የተማሪ ID አልተመሳሰለም። ከመምህርዎ ዝርዝር ጋር ያረጋግጡ።', id_in_use: 'ይህ ID በሌላ Telegram አካውንት ተይዟል። ስህተት ከሆነ መምህርዎን ያነጋግሩ።', tg_other_id: 'ይህ Telegram አካውንት ሌላ ID ተጠቅሟል። ለአንድ አካውንት አንድ ID ብቻ ነው።', deck_closed: 'ፋይሉ አሁን ክፍት አይደለም። መምህርዎን ይጠይቁ።', slow_down: 'ብዙ ሙከራ — ከ15 ደቂቃ በኋላ ይሞክሩ።', session_expired: 'ክፍለ ጊዜው አብቅቷል — ስም እና ID እንደገና ያስገቡ።', not_found: 'ፋይሉ አልተገኘም።' };
const msg = e => ERR[e] || 'ስህተት ተፈጠረ፤ እንደገና ይሞክሩ።';
async function lf(path, { body, token } = {}) {
  try { const r = await fetch('/api/learn' + path, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...(token ? { 'x-learn': token } : {}) }, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' }); return await r.json(); } catch (e) { return { ok: false, error: 'network' }; }
}
const esc = s => String(s).replace(/[<>&'"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' }[c]));

function Shell({ children }) { return <div className="ln-root mx-auto min-h-screen max-w-2xl px-4 py-8">{children}</div>; }

function Reader({ deck, id, auth, tg }) {
  const [d, setD] = useState(null), [fs, setFs] = useState(17), [toc, setToc] = useState(false), [hid, setHid] = useState(false), [pct, setPct] = useState(0), [now, setNow] = useState(() => new Date()), [dark, setDark] = useState(false);
  const refs = useRef([]), max = useRef(0), sent = useRef(0), key = 'ln_pos_' + id + '_' + auth.sid;
  useEffect(() => { (async () => { const r = await lf('/read', { token: auth.token }); setD(r); })(); try { const f = Number(localStorage.getItem('ln_fs')); if (f >= 13 && f <= 26) setFs(f); } catch (e) { } setDark(document.documentElement.classList.contains('dark')); }, [auth.token]);
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 60000), v = () => setHid(document.visibilityState === 'hidden'), k = e => { if ((e.ctrlKey || e.metaKey) && /^[cpsua]$/i.test(e.key)) e.preventDefault(); };
    document.addEventListener('visibilitychange', v); window.addEventListener('keydown', k); return () => { clearInterval(t); document.removeEventListener('visibilitychange', v); window.removeEventListener('keydown', k); }; }, []);
  useEffect(() => { const on = () => { const h = document.documentElement; setPct(Math.min(100, Math.round((window.scrollY / Math.max(1, h.scrollHeight - h.clientHeight)) * 100))); }; window.addEventListener('scroll', on, { passive: true }); return () => window.removeEventListener('scroll', on); }, []);
  useEffect(() => {          // የተነበበ ስላይድ ክትትል + የቆመበት ቦታ
    if (!d || !d.ok) return; let idx = 0; try { idx = Number(localStorage.getItem(key)) || 0; } catch (e) { }
    const io = new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) { const i = Number(e.target.dataset.i); max.current = Math.max(max.current, i + 1); try { localStorage.setItem(key, String(i)); } catch (x) { } } }, { rootMargin: '0px 0px -60% 0px' });
    refs.current.forEach(n => n && io.observe(n)); if (idx > 0 && refs.current[idx]) setTimeout(() => refs.current[idx].scrollIntoView(), 150);
    const t = setInterval(() => { if (max.current > sent.current) { sent.current = max.current; lf('/progress', { token: auth.token, body: { max: max.current } }); } }, 20000);
    return () => { io.disconnect(); clearInterval(t); };
  }, [d, key, auth.token]);
  const mark = useMemo(() => d && d.mark ? d.mark : '', [d]);
  const wm = useMemo(() => { const t = now.toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }), svg = `<svg xmlns='http://www.w3.org/2000/svg' width='340' height='210'><text x='20' y='120' transform='rotate(-24 170 105)' font-size='15' font-family='sans-serif' fill='#808080' fill-opacity='0.2'>${esc(mark + ' · ' + t)}</text></svg>`; return 'url("data:image/svg+xml;utf8,' + encodeURIComponent(svg) + '")'; }, [mark, now]);
  const setSize = n => { const v = Math.max(13, Math.min(26, n)); setFs(v); try { localStorage.setItem('ln_fs', String(v)); } catch (e) { } };
  const toggleDark = () => { const v = !dark; setDark(v); document.documentElement.classList.toggle('dark', v); };
  if (!d) return <Shell><p className="muted py-20 text-center">⏳ በመጫን ላይ…</p></Shell>;
  if (!d.ok) return <Shell><p className="msg-err">{msg(d.error)}</p></Shell>;
  const block = (b, i) => {
    if (b.k === 'h') return <h2 key={i} className="mb-3 text-[1.35em] font-extrabold leading-snug">{b.t}</h2>;
    if (b.k === 'p') return <p key={i} className="my-3 whitespace-pre-line leading-[1.75]">{b.t}</p>;
    if (b.k === 'li') return <div key={i} className="my-1.5 flex gap-2 leading-[1.7]" style={{ paddingLeft: b.l * 1.25 + 'em' }}><span aria-hidden className="shrink-0 text-brand">{b.l ? '–' : '•'}</span><span className="whitespace-pre-line">{b.t}</span></div>;
    if (b.k === 'tbl') return <div key={i} className="my-4 overflow-x-auto"><table className="min-w-full border-collapse text-[0.92em]"><tbody>{b.rows.map((r, a) => <tr key={a}>{r.map((c, j) => (a === 0 ? <th key={j} className="border border-line bg-brand-light px-2 py-1.5 text-left dark:border-[#25352c] dark:bg-brand/20">{c}</th> : <td key={j} className="whitespace-pre-line border border-line px-2 py-1.5 dark:border-[#25352c]">{c}</td>))}</tr>)}</tbody></table></div>;
    if (b.k === 'img') return <img key={i} src={`/api/learn/media/${b.m}?s=${auth.token}`} alt={b.alt || ''} loading="lazy" draggable={false} onContextMenu={e => e.preventDefault()} className="my-4 w-full rounded-2xl border border-line dark:border-[#25352c]" style={{ WebkitTouchCallout: 'none' }} />;
    return null;
  };
  return (
    <div className="ln-root min-h-screen" onContextMenu={e => e.preventDefault()} onCopy={e => e.preventDefault()} onCut={e => e.preventDefault()} onDragStart={e => e.preventDefault()}>
      <style>{'@media print{.ln-root{display:none!important}} .ln-noselect{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}'}</style>
      <div className="fixed inset-x-0 top-0 z-40 h-1 bg-brand-light"><div className="h-full bg-brand transition-all" style={{ width: pct + '%' }} /></div>
      <header className="sticky top-0 z-30 border-b border-line bg-white/95 px-3 py-2 backdrop-blur dark:border-[#25352c] dark:bg-[#0f1813]/95">
        <div className="mx-auto flex max-w-2xl items-center gap-2"><button className="btn-soft !px-3" onClick={() => setToc(!toc)} aria-label="ማውጫ">☰</button><b className="min-w-0 flex-1 truncate">{d.title}</b>
          <button className="btn-soft !px-2.5" onClick={() => setSize(fs - 1)} aria-label="ትንሽ">A−</button><button className="btn-soft !px-2.5" onClick={() => setSize(fs + 1)} aria-label="ትልቅ">A+</button><button className="btn-soft !px-2.5" onClick={toggleDark} aria-label="ብርሃን/ጨለማ">{dark ? '☀️' : '🌙'}</button></div>
        {toc && <ol className="mx-auto mt-2 max-h-[55vh] max-w-2xl space-y-1 overflow-y-auto rounded-2xl bg-brand-light p-2 text-sm dark:bg-brand/20">{d.slides.map((s, i) => <li key={i}><button className="w-full rounded-xl px-2 py-1.5 text-left hover:bg-white/70 dark:hover:bg-black/20" onClick={() => { setToc(false); refs.current[i] && refs.current[i].scrollIntoView({ behavior: 'smooth' }); }}><span className="muted mr-2">{i + 1}</span>{s.title || 'ስላይድ ' + (i + 1)}</button></li>)}</ol>}
      </header>
      <article className={'ln-noselect mx-auto max-w-2xl px-4 pb-24 pt-4 transition-opacity ' + (hid ? 'opacity-0' : '')} style={{ fontSize: fs + 'px' }}>
        {d.slides.map((s, i) => (
          <section key={i} data-i={i} ref={n => (refs.current[i] = n)} className="mb-6 scroll-mt-20 rounded-3xl border border-line bg-white p-4 shadow-soft dark:border-[#25352c] dark:bg-[#16211b]">
            <span className="mb-2 inline-block rounded-full bg-brand-light px-3 py-0.5 text-xs font-bold text-brand dark:bg-brand/20">{i + 1} / {d.slides.length}</span>
            {s.blocks.some(b => b.k === 'h') ? null : <h2 className="mb-3 text-[1.35em] font-extrabold">{s.title || 'ስላይድ ' + (i + 1)}</h2>}
            {s.blocks.map(block)}
          </section>))}
        <p className="muted pb-10 text-center">🏁 የፋይሉ መጨረሻ</p>
      </article>
      <div aria-hidden className="pointer-events-none fixed inset-0 z-50" style={{ backgroundImage: wm }} />
    </div>
  );
}

export default function Learn({ params }) {
  const id = params.id, [phase, setPhase] = useState('boot'), [info, setInfo] = useState(null), [tg, setTg] = useState(null), [f, setF] = useState({ name: '', sid: '' }), [err, setErr] = useState(''), [busy, setBusy] = useState(false), [auth, setAuth] = useState(null);
  useEffect(() => {
    let dead = false; lf('/public/' + id).then(r => !dead && setInfo(r));
    const init = () => { const w = window.Telegram && window.Telegram.WebApp; if (dead) return; if (!w || !w.initData) { setPhase('outside'); return; } try { w.ready(); w.expand(); w.disableVerticalSwipes && w.disableVerticalSwipes(); if (!localStorage.getItem('etm_theme')) document.documentElement.classList.toggle('dark', w.colorScheme === 'dark'); } catch (e) { } setTg(w); setPhase('form'); };
    if (window.Telegram && window.Telegram.WebApp) init(); else { const s = document.createElement('script'); s.src = 'https://telegram.org/js/telegram-web-app.js'; s.onload = init; s.onerror = () => !dead && setPhase('outside'); document.head.appendChild(s); }
    return () => { dead = true; };
  }, [id]);
  const submit = useCallback(async e => { e.preventDefault(); setBusy(true); setErr(''); const r = await lf('/auth', { body: { deck: id, initData: tg.initData, name: f.name, sid: f.sid } }); setBusy(false); if (!r.ok) return setErr(msg(r.error)); setAuth(r); setPhase('ready'); }, [id, tg, f]);
  if (phase === 'boot') return <Shell><p className="muted py-20 text-center">⏳ በመጫን ላይ…</p></Shell>;
  if (phase === 'outside') return <Shell><div className="card text-center"><p className="text-4xl">🔒</p><h1 className="mt-2 text-xl">{info && info.title ? info.title : 'ፋይል'}</h1><p className="mt-2">ይህ ፋይል በ Telegram ቦት ውስጥ ብቻ ይከፈታል።</p>{info && info.bot && <a className="btn-primary mt-4 w-full" href={`https://t.me/${info.bot}?start=d_${id}`}>✈️ በ Telegram ክፈት</a>}</div></Shell>;
  if (phase === 'reading') return <Reader id={id} auth={auth} tg={tg} />;
  if (phase === 'ready') return <Shell><div className="card text-center"><p className="text-4xl">✅</p><h1 className="mt-2 text-xl">ሰላም {auth.name}!</h1><p className="mt-1 font-bold">{auth.title}</p><p className="muted mt-1">{auth.slides} ስላይዶች · ወደ ታች በማንሸራተት ያንብቡ</p>
    <button className="btn-primary mt-5 w-full !min-h-[56px] text-lg" onClick={() => setPhase('reading')}>📖 ፋይሉን ክፈት</button><p className="muted mt-3 !text-xs">🔒 በገጹ ላይ የእርስዎ ስም እና ID በደበዘዘ ሁኔታ ይታያል።</p></div></Shell>;
  const closed = info && info.ok && !info.open;
  return <Shell><form className="card" onSubmit={submit}><p className="text-center text-4xl">📖</p><h1 className="mt-2 text-center text-xl">{info && info.title ? info.title : 'ፋይል'}</h1><p className="muted mt-1 text-center">ለመቀጠል ስምዎን እና የተማሪ ID ያስገቡ</p>
    {closed && <p className="msg-err mt-3">{ERR.deck_closed}</p>}
    <label className="label">የመጀመሪያ ስም</label><input className="input" autoComplete="off" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="ለምሳሌ፦ አበበ" required />
    <label className="label">የተማሪ ID</label><input className="input uppercase" autoComplete="off" value={f.sid} onChange={e => setF({ ...f, sid: e.target.value })} placeholder="ለምሳሌ፦ S001" required />
    {err && <p className="msg-err mt-3">{err}</p>}<button className="btn-primary mt-4 w-full" disabled={busy || closed || !f.name.trim() || !f.sid.trim()}>{busy ? '⏳…' : 'ቀጥል ›'}</button></form></Shell>;
}
