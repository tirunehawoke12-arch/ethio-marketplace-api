'use client';
/* eslint-disable @next/next/no-img-element */
/* ተማሪ አንባቢ — በ Telegram mini app ውስጥ ብቻ። ስም + ID → «ፋይሉን ክፈት» → ተከታታይ ንባብ (scroll) */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

const ERR = { telegram_only: 'ይህ ፋይል በ Telegram ቦት ውስጥ ብቻ ይከፈታል።', wrong_credentials: 'ስም ወይም የተማሪ ID አልተመሳሰለም። ከመምህርዎ ዝርዝር ጋር ያረጋግጡ።', id_in_use: 'ይህ ID በሌላ Telegram አካውንት ተይዟል። ስህተት ከሆነ መምህርዎን ያነጋግሩ።', tg_other_id: 'ይህ Telegram አካውንት ሌላ ID ተጠቅሟል። ለአንድ አካውንት አንድ ID ብቻ ነው።', deck_closed: 'ፋይሉ አሁን ክፍት አይደለም። መምህርዎን ይጠይቁ።', slow_down: 'ብዙ ሙከራ — ከ15 ደቂቃ በኋላ ይሞክሩ።', session_expired: 'ክፍለ ጊዜው አብቅቷል — ስም እና ID እንደገና ያስገቡ።', not_found: 'ፋይሉ አልተገኘም።' };
const msg = e => ERR[e] || 'ስህተት ተፈጠረ፤ እንደገና ይሞክሩ።';
async function lf(path, { body, token } = {}) {
  try { const r = await fetch('/api/learn' + path, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...(token ? { 'x-learn': token } : {}) }, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' }); return await r.json(); } catch (e) { return { ok: false, error: 'network' }; }
}

function Shell({ children }) { return <div className="ln-root mx-auto min-h-screen max-w-2xl px-4 py-8">{children}</div>; }

const TH = {
  light: { bg: '#ffffff', fg: '#1b2420', mute: '#6b7a72', line: '#e3ebe6', soft: '#eef7f2', icon: '☀️', name: 'ብርሃን' },
  paper: { bg: '#f5edd9', fg: '#3a2e1c', mute: '#7a6a50', line: '#e0d2b3', soft: '#ebe0c5', icon: '📜', name: 'ወረቀት' },
  dark: { bg: '#101712', fg: '#dfe8e2', mute: '#94a79b', line: '#25352c', soft: '#1a2620', icon: '🌙', name: 'ጨለማ' },
};
const FONT = '"Noto Sans Ethiopic","Noto Serif Ethiopic","Abyssinica SIL","Nyala",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif';

function Reader({ id, auth }) {
  const [d, setD] = useState(null), [fs, setFs] = useState(18), [toc, setToc] = useState(false), [hid, setHid] = useState(false), [pct, setPct] = useState(0), [th, setTh] = useState('light');
  const refs = useRef([]), max = useRef(0), sent = useRef(0), key = 'ln_pos_' + id + '_' + auth.sid, C = TH[th];
  useEffect(() => { (async () => { setD(await lf('/read', { token: auth.token })); })(); try { const f = Number(localStorage.getItem('ln_fs')); if (f >= 14 && f <= 30) setFs(f); const t = localStorage.getItem('ln_th'); if (TH[t]) setTh(t); else if (document.documentElement.classList.contains('dark')) setTh('dark'); } catch (e) { } }, [auth.token]);
  useEffect(() => { const b = document.body, old = b.style.background; b.style.background = C.bg; return () => { b.style.background = old; }; }, [C.bg]);
  useEffect(() => { const v = () => setHid(document.visibilityState === 'hidden'), k = e => { if ((e.ctrlKey || e.metaKey) && /^[cpsua]$/i.test(e.key)) e.preventDefault(); };
    document.addEventListener('visibilitychange', v); window.addEventListener('keydown', k); return () => { document.removeEventListener('visibilitychange', v); window.removeEventListener('keydown', k); }; }, []);
  useEffect(() => { const on = () => { const h = document.documentElement; setPct(Math.min(100, Math.round((window.scrollY / Math.max(1, h.scrollHeight - h.clientHeight)) * 100))); }; window.addEventListener('scroll', on, { passive: true }); return () => window.removeEventListener('scroll', on); }, []);
  useEffect(() => {          // የተነበበ ክፍል ክትትል + የቆመበት ቦታ
    if (!d || !d.ok) return; let idx = 0; try { idx = Number(localStorage.getItem(key)) || 0; } catch (e) { }
    const io = new IntersectionObserver(es => { for (const e of es) if (e.isIntersecting) { const i = Number(e.target.dataset.i); max.current = Math.max(max.current, i + 1); try { localStorage.setItem(key, String(i)); } catch (x) { } } }, { rootMargin: '0px 0px -60% 0px' });
    refs.current.forEach(n => n && io.observe(n)); if (idx > 0 && refs.current[idx]) setTimeout(() => refs.current[idx].scrollIntoView(), 200);
    const t = setInterval(() => { if (max.current > sent.current) { sent.current = max.current; lf('/progress', { token: auth.token, body: { max: max.current } }); } }, 20000);
    return () => { io.disconnect(); clearInterval(t); };
  }, [d, key, auth.token]);
  const setSize = n => { const v = Math.max(14, Math.min(30, n)); setFs(v); try { localStorage.setItem('ln_fs', String(v)); } catch (e) { } };
  const cycle = () => { const k = Object.keys(TH), n = k[(k.indexOf(th) + 1) % k.length]; setTh(n); try { localStorage.setItem('ln_th', n); } catch (e) { } };
  if (!d) return <Shell><p className="muted py-20 text-center">⏳ በመጫን ላይ…</p></Shell>;
  if (!d.ok) return <Shell><p className="msg-err">{msg(d.error)}</p></Shell>;
  const btn = { border: `1px solid ${C.line}`, background: C.soft, color: C.fg };
  const block = (b, i) => {
    if (b.k === 'h') return <h2 key={i} style={{ fontSize: '1.4em', fontWeight: 800, lineHeight: 1.45, margin: '0 0 0.7em' }}>{b.t}</h2>;
    if (b.k === 'p') return <p key={i} style={{ margin: '0 0 1em', whiteSpace: 'pre-line' }}>{b.t}</p>;
    if (b.k === 'li') return <div key={i} style={{ display: 'flex', gap: '0.6em', margin: '0 0 0.55em', paddingLeft: b.l * 1.4 + 'em' }}><span aria-hidden style={{ color: '#0a8a56', flexShrink: 0, fontWeight: 800 }}>{b.l ? '–' : '•'}</span><span style={{ whiteSpace: 'pre-line' }}>{b.t}</span></div>;
    if (b.k === 'tbl') return <div key={i} style={{ overflowX: 'auto', margin: '1em 0' }}><table style={{ borderCollapse: 'collapse', minWidth: '100%', fontSize: '0.92em' }}><tbody>{b.rows.map((r, a) => <tr key={a}>{r.map((c, j) => { const T = a === 0 ? 'th' : 'td'; return <T key={j} style={{ border: `1px solid ${C.line}`, padding: '0.45em 0.6em', textAlign: 'left', whiteSpace: 'pre-line', background: a === 0 ? C.soft : 'transparent', fontWeight: a === 0 ? 700 : 400 }}>{c}</T>; })}</tr>)}</tbody></table></div>;
    if (b.k === 'img') return <img key={i} src={`/api/learn/media/${b.m}?s=${auth.token}`} alt={b.alt || ''} loading="lazy" draggable={false} onContextMenu={e => e.preventDefault()} style={{ width: '100%', borderRadius: 14, border: `1px solid ${C.line}`, margin: '0.6em 0 1.1em', WebkitTouchCallout: 'none' }} />;
    return null;
  };
  return (
    <div className="ln-root min-h-screen" style={{ background: C.bg, color: C.fg, fontFamily: FONT }} onContextMenu={e => e.preventDefault()} onCopy={e => e.preventDefault()} onCut={e => e.preventDefault()} onDragStart={e => e.preventDefault()}>
      <style>{'@media print{.ln-root{display:none!important}} .ln-noselect{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}'}</style>
      <div className="fixed inset-x-0 top-0 z-40 h-1" style={{ background: C.line }}><div className="h-full transition-all" style={{ width: pct + '%', background: '#0a8a56' }} /></div>
      <header className="sticky top-0 z-30 px-3 py-2 backdrop-blur" style={{ background: C.bg + 'ee', borderBottom: `1px solid ${C.line}` }}>
        <div className="mx-auto flex max-w-2xl items-center gap-2"><button className="rounded-xl px-3 py-2 text-sm font-bold" style={btn} onClick={() => setToc(!toc)} aria-label="ማውጫ">☰</button><b className="min-w-0 flex-1 truncate">{d.title}</b><span className="text-xs" style={{ color: C.mute }}>{pct}%</span>
          <button className="rounded-xl px-2.5 py-2 text-sm font-bold" style={btn} onClick={() => setSize(fs - 1)} aria-label="ትንሽ">A−</button><button className="rounded-xl px-2.5 py-2 text-sm font-bold" style={btn} onClick={() => setSize(fs + 1)} aria-label="ትልቅ">A+</button><button className="rounded-xl px-2.5 py-2 text-sm" style={btn} onClick={cycle} aria-label={C.name} title={C.name}>{C.icon}</button></div>
        {toc && <ol className="mx-auto mt-2 max-h-[55vh] max-w-2xl space-y-0.5 overflow-y-auto rounded-2xl p-2 text-sm" style={{ background: C.soft }}>{d.slides.map((s, i) => <li key={i}><button className="w-full rounded-xl px-2 py-1.5 text-left" onClick={() => { setToc(false); refs.current[i] && refs.current[i].scrollIntoView({ behavior: 'smooth' }); }}><span style={{ color: C.mute, marginRight: 8 }}>{i + 1}</span>{s.title || 'ገጽ ' + (i + 1)}</button></li>)}</ol>}
      </header>
      <article className={'ln-noselect mx-auto max-w-2xl px-5 pb-28 pt-6 transition-opacity ' + (hid ? 'opacity-0' : '')} style={{ fontSize: fs + 'px', lineHeight: 1.9, letterSpacing: '0.005em', wordBreak: 'break-word' }}>
        {d.slides.map((s, i) => (
          <section key={i} data-i={i} ref={n => (refs.current[i] = n)} style={{ scrollMarginTop: 70, paddingBottom: '1.6em', marginBottom: '1.6em', borderBottom: i < d.slides.length - 1 ? `1px solid ${C.line}` : 'none' }}>
            <div style={{ fontSize: '0.62em', letterSpacing: '0.08em', color: C.mute, marginBottom: '0.8em' }}>{i + 1} / {d.slides.length}</div>
            {s.blocks.some(b => b.k === 'h') ? null : <h2 style={{ fontSize: '1.4em', fontWeight: 800, lineHeight: 1.45, margin: '0 0 0.7em' }}>{s.title || 'ገጽ ' + (i + 1)}</h2>}
            {s.blocks.map(block)}
          </section>))}
        <p style={{ textAlign: 'center', color: C.mute, padding: '1em 0' }}>🏁 የፋይሉ መጨረሻ</p>
      </article>
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
  if (phase === 'reading') return <Reader id={id} auth={auth} />;
  if (phase === 'ready') return <Shell><div className="card text-center"><p className="text-4xl">✅</p><h1 className="mt-2 text-xl">ሰላም {auth.name}!</h1><p className="mt-1 font-bold">{auth.title}</p><p className="muted mt-1">{auth.slides} ገጾች · ወደ ታች በማንሸራተት ያንብቡ</p>
    <button className="btn-primary mt-5 w-full !min-h-[56px] text-lg" onClick={() => setPhase('reading')}>📖 ፋይሉን ክፈት</button></div></Shell>;
  const closed = info && info.ok && !info.open;
  return <Shell><form className="card" onSubmit={submit}><p className="text-center text-4xl">📖</p><h1 className="mt-2 text-center text-xl">{info && info.title ? info.title : 'ፋይል'}</h1><p className="muted mt-1 text-center">ለመቀጠል ስምዎን እና የተማሪ ID ያስገቡ</p>
    {closed && <p className="msg-err mt-3">{ERR.deck_closed}</p>}
    <label className="label">የመጀመሪያ ስም</label><input className="input" autoComplete="off" value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="ለምሳሌ፦ አበበ" required />
    <label className="label">የተማሪ ID</label><input className="input uppercase" autoComplete="off" value={f.sid} onChange={e => setF({ ...f, sid: e.target.value })} placeholder="ለምሳሌ፦ S001" required />
    {err && <p className="msg-err mt-3">{err}</p>}<button className="btn-primary mt-4 w-full" disabled={busy || closed || !f.name.trim() || !f.sid.trim()}>{busy ? '⏳…' : 'ቀጥል ›'}</button></form></Shell>;
}
