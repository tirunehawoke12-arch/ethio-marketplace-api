'use client';
/* 🧑‍🏫 የቀጥታ ሰሌዳ — መምህሩ በጥቁር ሰሌዳ ላይ እየጻፈ/እየሳለ በድምፅ ያስረዳል (ከ Telegram ቦት የሚከፈት) */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const F = "'Noto Sans Ethiopic','Nyala','Abyssinica SIL',system-ui,sans-serif";

function Shape({ s, i }) {
  const c = { stroke: '#f4f1e8', strokeWidth: 0.7, fill: 'none', strokeLinecap: 'round', pathLength: 1, className: 'chalk-draw', style: { animationDelay: i * 0.35 + 's' } };
  if (s.k === 'line') return <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} {...c} />;
  if (s.k === 'arrow') { const dx = s.x2 - s.x1, dy = s.y2 - s.y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, hx = s.x2 - ux * 2.5, hy = s.y2 - uy * 2.5; return <g><line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} {...c} /><polyline points={`${hx - uy * 1.5},${hy + ux * 1.5} ${s.x2},${s.y2} ${hx + uy * 1.5},${hy - ux * 1.5}`} {...c} /></g>; }
  if (s.k === 'rect') return <rect x={s.x} y={s.y} width={s.w} height={s.h} rx="1" {...c} />;
  if (s.k === 'circle') return <circle cx={s.x} cy={s.y} r={s.r} {...c} />;
  if (s.k === 'label') return <text x={s.x} y={s.y} fill="#ffe9a8" fontSize="3.2" fontFamily={F} className="chalk-fade" style={{ animationDelay: i * 0.35 + 's' }}>{s.t}</text>;
  return null;
}

function Item({ it }) {
  if (it.k === 'draw') return <svg viewBox="0 0 100 56" className="my-3 w-full rounded-lg border border-white/10 bg-black/10">{it.shapes.map((s, i) => <Shape key={i} s={s} i={i} />)}</svg>;
  const shown = it.t.slice(0, it.n), cur = it.n < it.t.length ? <span className="chalk-pen">✏️</span> : null;
  const st = { title: 'text-2xl font-bold text-[#ffe9a8] underline decoration-white/30 underline-offset-4', text: 'text-lg', bullet: 'text-lg pl-5 -indent-4', formula: 'text-xl font-mono text-[#9fe3ff] bg-black/15 rounded px-2 py-1 inline-block', note: 'text-base text-[#ffb3a7] italic' }[it.k] || 'text-lg';
  return <p className={'my-1.5 leading-relaxed ' + st}>{it.k === 'bullet' ? '• ' : ''}{shown}{cur}</p>;
}

export default function Board() {
  const { id } = useParams(), [bd, setBd] = useState(null), [err, setErr] = useState(''), [items, setItems] = useState([]), [cur, setCur] = useState(-1), [playing, setPlaying] = useState(false), [voice, setVoice] = useState(true), [spd, setSpd] = useState(1);
  const R = useRef({ tok: 0, paused: false, audio: null, voice: true, spd: 1 }), end = useRef(null);
  useEffect(() => { R.current.voice = voice; if (!voice && R.current.audio) { R.current.audio.pause(); } }, [voice]);
  useEffect(() => { R.current.spd = spd; }, [spd]);
  useEffect(() => { fetch('/api/ai/board/' + id).then(r => r.json()).then(d => d.ok ? setBd(d) : setErr('ሰሌዳው አልተገኘም ወይም ጊዜው አልፏል (48 ሰዓት)። ከቦቱ እንደገና ይጠይቁ።')).catch(() => setErr('ግንኙነት ተቋርጧል')); try { const w = window.Telegram && window.Telegram.WebApp; if (w) { w.ready(); w.expand(); } } catch (e) { } }, [id]);
  useEffect(() => { if (end.current) end.current.scrollIntoView({ behavior: 'smooth', block: 'end' }); }, [items]);
  const wait = useCallback(async (ms, tok) => { let t = 0; while (t < ms) { if (R.current.tok !== tok) return false; if (R.current.paused) { await sleep(120); continue; } await sleep(40); t += 40 / R.current.spd; } return R.current.tok === tok; }, []);
  const speak = useCallback((i, tok) => new Promise(res => {          // ድምፅ፦ የሰርቨር (Gemini) ድምፅ → ከሌለ የአሳሽ ድምፅ
    if (!R.current.voice || !bd) return res(0); const text = bd.steps[i].say; if (!text) return res(0); let done = false; const fin = d => { if (!done) { done = true; res(d || 0); } };
    const fb = () => { try { const u = new SpeechSynthesisUtterance(text); u.lang = 'am-ET'; u.rate = R.current.spd; u.onend = () => fin(); u.onerror = () => fin(); window.speechSynthesis.speak(u); setTimeout(() => fin(), Math.min(60000, text.length * 120)); } catch (e) { fin(); } };
    if (!bd.tts) return fb(); const a = new Audio('/api/ai/board/' + id + '/tts/' + i); a.playbackRate = R.current.spd; R.current.audio = a; a.onended = () => fin(); a.onerror = () => { fb(); }; a.onloadedmetadata = () => { R.current.dur = a.duration; };
    a.play().catch(() => fb()); const chk = setInterval(() => { if (R.current.tok !== tok) { a.pause(); clearInterval(chk); fin(); } else if (R.current.paused) a.pause(); else if (a.paused && !a.ended && R.current.voice) a.play().catch(() => { }); }, 200); a.addEventListener('ended', () => clearInterval(chk));
  }), [bd, id]);
  const play = useCallback(async from => {
    if (!bd) return; const tok = ++R.current.tok; R.current.paused = false; setPlaying(true); try { window.speechSynthesis.cancel(); } catch (e) { }
    for (let i = from; i < bd.steps.length; i++) {
      if (R.current.tok !== tok) return; const st = bd.steps[i]; setCur(i); if (st.clear || i === from) setItems(p => (st.clear ? [] : p.length && i === from ? [] : p));
      const sp = speak(i, tok), total = st.write.reduce((a, w) => a + (w.t ? w.t.length : 0), 0) || 1, per = Math.min(110, Math.max(28, (st.say.length * 85 * 0.85) / total));
      for (const w of st.write) {
        if (R.current.tok !== tok) return;
        if (w.k === 'draw') { setItems(p => [...p, { ...w, id: Math.random() }]); if (!(await wait(900 + w.shapes.length * 350, tok))) return; continue; }
        const key = Math.random(); setItems(p => [...p, { ...w, n: 0, id: key }]);
        for (let n = 1; n <= w.t.length; n++) { if (!(await wait(per, tok))) return; setItems(p => p.map(x => (x.id === key ? { ...x, n } : x))); }
        if (!(await wait(250, tok))) return;
      }
      await sp; if (!(await wait(700, tok))) return;
    }
    if (R.current.tok === tok) { setPlaying(false); setCur(bd.steps.length); }
  }, [bd, speak, wait]);
  const stop = () => { R.current.tok++; setPlaying(false); try { window.speechSynthesis.cancel(); if (R.current.audio) R.current.audio.pause(); } catch (e) { } };
  const pause = () => { R.current.paused = !R.current.paused; try { R.current.paused ? window.speechSynthesis.pause() : window.speechSynthesis.resume(); } catch (e) { } setPlaying(p => !p); };
  const go = d => { const n = Math.max(0, Math.min((bd ? bd.steps.length : 1) - 1, (cur < 0 ? 0 : cur) + d)); stop(); setItems([]); setTimeout(() => play(n), 60); };
  useEffect(() => () => { R.current.tok++; try { window.speechSynthesis.cancel(); } catch (e) { } }, []);
  if (err) return <div style={{ padding: 24, fontFamily: F }}>{err}</div>; if (!bd) return <div style={{ padding: 24 }}>⏳…</div>;
  const started = cur >= 0, finished = bd && cur >= bd.steps.length, paused = started && !playing && !finished && R.current.paused;
  return (<div style={{ fontFamily: F }} className="min-h-screen bg-[#2b1d12] p-2 text-[#f4f1e8]">
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Ethiopic:wght@400;700&display=swap" />
    <style>{`.chalk-draw{stroke-dasharray:1;stroke-dashoffset:1;animation:cd 1.1s ease forwards}@keyframes cd{to{stroke-dashoffset:0}}.chalk-fade{opacity:0;animation:cf .6s ease forwards}@keyframes cf{to{opacity:1}}.chalk-pen{display:inline-block;margin-left:3px;animation:pw .4s infinite alternate}@keyframes pw{to{transform:translateY(-3px) rotate(-12deg)}}`}</style>
    <div className="mx-auto max-w-2xl">
      <div className="rounded-xl border-[10px] border-[#8b5e34] bg-[#21402f] p-4 shadow-2xl" style={{ minHeight: '62vh', backgroundImage: 'radial-gradient(ellipse at 30% 20%,rgba(255,255,255,.07),transparent 60%)' }}>
        <div className="mb-2 flex items-center justify-between text-xs text-white/50"><span>🧑‍🏫 {bd.title}</span><span>{started && !finished ? `${cur + 1}/${bd.steps.length}` : ''}</span></div>
        {!started && <div className="py-16 text-center"><p className="mb-4 text-xl">🧑‍🏫 {bd.title}</p><p className="mb-6 text-sm text-white/60">መምህሩ በሰሌዳ ላይ እየጻፈና እየሳለ ያስረዳል።{bd.tts ? '' : ' (ድምፅ ከአሳሽዎ ይሰማል — የአማርኛ ድምፅ ከሌለ በጽሑፍ ብቻ ይሆናል)'}</p><button onClick={() => play(0)} className="rounded-full bg-[#ffe9a8] px-8 py-3 text-lg font-bold text-[#2b1d12]">▶️ ጀምር</button></div>}
        {items.map(it => <Item key={it.id} it={it} />)}
        {finished && <p className="mt-4 text-center text-lg text-[#ffe9a8]">🏁 ትምህርቱ ተጠናቀቀ — ጥያቄ ካለዎት ወደ ቦቱ ተመልሰው ይጠይቁ።</p>}
        <div ref={end} />
      </div>
      {started && <div className="sticky bottom-2 mt-3 flex flex-wrap items-center justify-center gap-2 rounded-2xl bg-black/50 p-2 backdrop-blur">
        <button onClick={() => go(-1)} className="rounded-lg bg-white/10 px-3 py-2">⏮</button>
        {finished ? <button onClick={() => { setItems([]); play(0); }} className="rounded-lg bg-[#ffe9a8] px-4 py-2 font-bold text-[#2b1d12]">🔁 ከመጀመሪያ</button> : <button onClick={pause} className="rounded-lg bg-[#ffe9a8] px-4 py-2 font-bold text-[#2b1d12]">{paused ? '▶️ ቀጥል' : '⏸ አቁም'}</button>}
        <button onClick={() => go(1)} className="rounded-lg bg-white/10 px-3 py-2">⏭</button>
        <button onClick={() => setVoice(v => !v)} className="rounded-lg bg-white/10 px-3 py-2">{voice ? '🔊' : '🔇'}</button>
        <select value={spd} onChange={e => setSpd(Number(e.target.value))} className="rounded-lg bg-white/10 px-2 py-2 text-sm">{[0.75, 1, 1.25, 1.5].map(v => <option key={v} value={v} className="text-black">{v}×</option>)}</select>
        <button onClick={() => { try { window.Telegram.WebApp.close(); } catch (e) { history.back(); } }} className="rounded-lg bg-white/10 px-3 py-2">❓ ጥያቄ</button>
      </div>}
    </div>
  </div>);
}
