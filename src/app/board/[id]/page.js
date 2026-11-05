'use client';
/* 🧑‍🏫 የቀጥታ ክፍል — አሻንጉሊት መምህር ቆሞ፣ ተማሪዎች ቁጭ ብለው፤ መምህሩ እያንዳንዱን ስላይድ በሰሌዳ ላይ ይለጥፋል፣
   መስመር በመስመር ቃል በቃል እያሰመረ በድምፅ ያስረዳል፣ ተማሪዎችን እየተመለከተ፤ «ቀጣይ» ሲባል ያጠፋና ቀጣዩን ይለጥፋል፤ ተማሪ ጥያቄ ይጠይቃል። */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'next/navigation';

const sleep = ms => new Promise(r => setTimeout(r, ms));
const F = "'Noto Sans Ethiopic','Nyala','Abyssinica SIL',system-ui,sans-serif";
const ERR = { ai_limit: 'የ AI ገጽ ገደብ አልቋል — በቦቱ ውስጥ ጥቅል ይግዙ ወይም ነገ ይሞክሩ።', ai_busy: 'AI ሥራ በዝቶበታል — ትንሽ ቆይተው «እንደገና» ይጫኑ።', ai_timeout: 'AI ዘግይቷል — «እንደገና» ይጫኑ።', slow_down: 'ትንሽ ቀስ ይበሉ።', not_found: 'ሰሌዳው ጊዜው አልፏል (48 ሰዓት) — ከቦቱ እንደገና ይጠይቁ።' };

function Shape({ s, i }) {
  const c = { stroke: '#f4f1e8', strokeWidth: 0.7, fill: 'none', strokeLinecap: 'round', pathLength: 1, className: 'chalk-draw', style: { animationDelay: i * 0.35 + 's' } };
  if (s.k === 'line') return <line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} {...c} />;
  if (s.k === 'arrow') { const dx = s.x2 - s.x1, dy = s.y2 - s.y1, L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, hx = s.x2 - ux * 2.5, hy = s.y2 - uy * 2.5; return <g><line x1={s.x1} y1={s.y1} x2={s.x2} y2={s.y2} {...c} /><polyline points={`${hx - uy * 1.5},${hy + ux * 1.5} ${s.x2},${s.y2} ${hx + uy * 1.5},${hy - ux * 1.5}`} {...c} /></g>; }
  if (s.k === 'rect') return <rect x={s.x} y={s.y} width={s.w} height={s.h} rx="1" {...c} />;
  if (s.k === 'circle') return <circle cx={s.x} cy={s.y} r={s.r} {...c} />;
  if (s.k === 'label') return <text x={s.x} y={s.y} fill="#ffe9a8" fontSize="3.2" fontFamily={F} className="chalk-fade" style={{ animationDelay: i * 0.35 + 's' }}>{s.t}</text>;
  return null;
}

/* ቃል በቃል የሚሰመር መስመር */
function Words({ text, base, cur, wi, ms, done }) {
  const toks = text.split(/(\s+)/); let w = 0;
  return toks.map((tk, k) => {
    if (/^\s+$/.test(tk) || !tk) return tk; const idx = base + w++; const isDone = done || (cur && idx < wi), act = cur && !done && idx === wi;
    return <span key={k} className={isDone ? 'ud' : act ? 'uw' : ''} style={act ? { animationDuration: ms + 'ms' } : undefined}>{tk}</span>;
  });
}
const wc = s => (String(s || '').match(/\S+/g) || []).length;

function Teacher({ talking, gaze, angle, hand }) {
  const eye = gaze === 'board' ? -2.2 : 1.2, ey = gaze === 'board' ? -0.2 : 0.8, head = gaze === 'board' ? -7 : 8;
  return (<svg viewBox="0 0 90 210" style={{ width: 84, height: 196, flexShrink: 0, display: 'block' }} aria-label="መምህር">
    <ellipse cx="45" cy="204" rx="26" ry="4" fill="rgba(0,0,0,.25)" />
    <g className="breathe">
      <rect x="31" y="128" width="11" height="68" rx="5" fill="#3a3f5a" /><rect x="46" y="128" width="11" height="68" rx="5" fill="#3a3f5a" />
      <rect x="27" y="194" width="17" height="8" rx="4" fill="#2a2018" /><rect x="45" y="194" width="17" height="8" rx="4" fill="#2a2018" />
      <rect x="26" y="64" width="38" height="70" rx="12" fill="#2f7d6b" /><rect x="40" y="64" width="10" height="26" fill="#f1f1ec" /><polygon points="45,68 41,90 49,90" fill="#b3342a" />
      <rect x="62" y="70" width="9" height="46" rx="4.5" fill="#2f7d6b" transform="rotate(8 66 72)" /><circle cx="70" cy="118" r="5" fill="#d9a074" />
      <g style={{ transform: `rotate(${angle}deg)`, transformOrigin: '30px 72px', transition: 'transform .9s ease' }}>
        <rect x="-36" y="68" width="66" height="8" rx="4" fill="#2f7d6b" /><circle cx="-34" cy="72" r="5" fill="#d9a074" /><rect x="-62" y="71" width="40" height="2.4" rx="1.2" fill="#e8c87a" />
      </g>
      <g style={{ transform: `rotate(${head}deg)`, transformOrigin: '45px 62px', transition: 'transform .7s ease' }}>
        <rect x="40" y="52" width="10" height="12" fill="#d9a074" /><circle cx="45" cy="38" r="17" fill="#e0aa80" /><path d="M28 36 Q30 18 45 18 Q61 18 62 36 Q55 26 45 27 Q34 27 28 36Z" fill="#241a14" />
        <circle cx="39" cy="38" r="4" fill="#fff" /><circle cx="52" cy="38" r="4" fill="#fff" /><circle cx={39 + eye} cy={38 + ey} r="2" fill="#2a1a10" style={{ transition: 'all .5s' }} /><circle cx={52 + eye} cy={38 + ey} r="2" fill="#2a1a10" style={{ transition: 'all .5s' }} />
        <path d="M34 32 Q39 29 43 32 M48 32 Q53 29 57 32" stroke="#241a14" strokeWidth="1.4" fill="none" />
        <ellipse cx="45" cy="48" rx="4.5" ry={talking ? 3 : 0.9} fill="#7a2b2b" className={talking ? 'mouth' : ''} />
      </g>
    </g>
    {hand ? <text x="2" y="20" fontSize="14">👀</text> : null}
  </svg>);
}

const SC = ['#5b7fa6', '#a65b5b', '#6aa65b', '#a68f5b', '#8a5ba6', '#5ba6a0', '#a65b8f', '#7d8a99', '#b0794a'];
function Students({ hand, talkingQ }) {
  return (<svg viewBox="0 0 330 74" style={{ display: 'block', width: '100%', maxWidth: 672, margin: '0 auto' }} aria-label="ተማሪዎች">
    <rect x="0" y="58" width="330" height="16" fill="#6b4a2b" opacity=".55" />
    {SC.map((c, i) => { const x = 22 + i * 35, nod = (i * 0.37) % 2.4; const up = hand && i === 4; return (<g key={i} style={{ animation: `nod ${3.2 + (i % 3) * 0.6}s ease-in-out ${nod}s infinite` }}>
      <ellipse cx={x} cy="58" rx="15" ry="14" fill={c} /><circle cx={x} cy="30" r="10" fill={i % 2 ? '#c98f66' : '#8a5a3c'} /><path d={`M${x - 10} 28 Q${x} 14 ${x + 10} 28 Q${x} 22 ${x - 10} 28Z`} fill="#1e1612" />
      {up && <g style={{ animation: 'hand .5s ease-in-out infinite alternate' }}><rect x={x + 9} y="22" width="5" height="28" rx="2.5" fill={c} /><circle cx={x + 11.5} cy="20" r="4" fill="#c98f66" /></g>}</g>); })}
  </svg>);
}

export default function Room() {
  const { id } = useParams(), [meta, setMeta] = useState(null), [err, setErr] = useState(''), [pg, setPg] = useState(null), [n, setN] = useState(0), [li, setLi] = useState(-1), [wi, setWi] = useState(-1), [ms, setMs] = useState(300), [phase, setPhase] = useState('idle'), [busy, setBusy] = useState(''), [voice, setVoice] = useState(true), [spd, setSpd] = useState(1), [gaze, setGaze] = useState('board'), [talking, setTalking] = useState(false), [paused, setPaused] = useState(false), [q, setQ] = useState(''), [ans, setAns] = useState(''), [hand, setHand] = useState(false), [showQ, setShowQ] = useState(false);
  const R = useRef({ tok: 0, paused: false, voice: true, spd: 1, audio: null, cache: {}, aud: {}, resume: null }), boardEl = useRef(null);
  useEffect(() => { R.current.voice = voice; if (!voice && R.current.audio) R.current.audio.pause(); }, [voice]); useEffect(() => { R.current.spd = spd; }, [spd]);
  useEffect(() => { fetch('/api/ai/board/' + id).then(r => r.json()).then(d => d.ok ? setMeta(d) : setErr(ERR.not_found)).catch(() => setErr('ግንኙነት ተቋርጧል')); try { const w = window.Telegram && window.Telegram.WebApp; if (w) { w.ready(); w.expand(); } } catch (e) { } }, [id]);
  useEffect(() => { if (!talking) return; const t = setInterval(() => setGaze(g => (g === 'board' ? 'class' : 'board')), 3200 + Math.random() * 1500); return () => clearInterval(t); }, [talking]);
  const wait = useCallback(async (ms2, tok) => { let t = 0; while (t < ms2) { if (R.current.tok !== tok) return false; if (R.current.paused) { await sleep(120); continue; } await sleep(40); t += 40 / R.current.spd; } return R.current.tok === tok; }, []);

  const fetchPage = useCallback(async k => {          // ገጽ k (በቅድሚያ ይታወሳል)
    const C = R.current.cache; if (C[k]) return C[k];
    C[k] = fetch('/api/ai/board/' + id + '/page/' + k).then(r => r.json()).then(d => { if (!d.ok) { delete C[k]; throw new Error(d.error || 'failed'); } return d.page; }).catch(e => { delete C[k]; throw e; }); return C[k];
  }, [id]);
  const audioFor = useCallback((k, i) => {          // የመስመር ድምፅ ቀድሞ ይጫናል
    if (!meta || !meta.tts) return null; const key = k + ':' + i; if (!R.current.aud[key]) { const a = new Audio(); a.preload = 'auto'; a.src = '/api/ai/board/' + id + '/tts/' + k + '/' + i; a.dataset.state = 'load'; a.addEventListener('error', () => { a.dataset.state = 'err'; }); a.addEventListener('canplaythrough', () => { a.dataset.state = 'ok'; }); R.current.aud[key] = a; } return R.current.aud[key];
  }, [meta, id]);
  const speakLine = useCallback((k, i, text, tok) => new Promise(res => {          // → የንግግር ጊዜ (ms)
    if (!R.current.voice || !text) return res(Math.max(1500, text.length * 55)); let fin = false; const done = d => { if (!fin) { fin = true; setTalking(false); res(d); } };
    const fb = () => { try { const u = new SpeechSynthesisUtterance(text); u.lang = 'am-ET'; u.rate = R.current.spd; const t0 = Date.now(); u.onend = () => done(Date.now() - t0); u.onerror = () => done(Math.max(1500, text.length * 55)); setTalking(true); window.speechSynthesis.speak(u); setTimeout(() => done(text.length * 90), Math.min(90000, text.length * 150)); } catch (e) { done(Math.max(1500, text.length * 55)); } };
    const a = audioFor(k, i); if (!a) return fb(); R.current.audio = a; a.playbackRate = R.current.spd;
    const t0 = Date.now(); let started = false; const tryPlay = () => { if (started) return; if (a.dataset.state === 'err') { started = true; return fb(); } if (a.readyState >= 3) { started = true; setTalking(true); a.currentTime = 0; a.play().catch(() => { started = false; fb(); }); } };
    a.onended = () => done((a.duration || 0) * 1000 / R.current.spd); const iv = setInterval(() => { if (R.current.tok !== tok) { clearInterval(iv); try { a.pause(); } catch (e) { } return done(0); } if (R.current.paused) { if (!a.paused) a.pause(); return; } if (started && a.paused && !a.ended && R.current.voice) a.play().catch(() => { }); tryPlay(); if (!started && Date.now() - t0 > 40000) { started = true; fb(); } if (fin) clearInterval(iv); }, 150);
    R.current.durOf = () => (a.duration && isFinite(a.duration) ? a.duration * 1000 / R.current.spd : 0);
  }), [audioFor]);

  const runLines = useCallback(async (k, page, from, tok) => {
    const L = page.lines; for (let i = from; i < L.length; i++) {
      if (R.current.tok !== tok) return false; const l = L[i]; setLi(i); setWi(-1); for (let j = 1; j <= 2; j++) audioFor(k, i + j);          // 2 መስመር ቀድሞ ያዘጋጃል
      const W = wc(l.t) + wc(l.am), est = Math.max(1600, (l.say || '').length * 62); setMs(Math.max(220, est / Math.max(1, W)));
      const sp = speakLine(k, i, l.say, tok); let spoken = false; sp.then(() => { spoken = true; });
      await sleep(350); const dur = R.current.durOf && R.current.voice ? R.current.durOf() : 0, per = Math.max(220, (dur || est) / Math.max(1, W)); setMs(per);
      for (let w = 0; w < W; w++) { setWi(w); if (!(await wait(per, tok))) return false; }
      setWi(W); while (!spoken) { if (R.current.tok !== tok) return false; await sleep(120); } if (!(await wait(600, tok))) return false;
    } return true;
  }, [audioFor, speakLine, wait]);

  const teach = useCallback(async (k, from = 0) => {
    const tok = ++R.current.tok; R.current.paused = false; setPaused(false); setAns(''); setShowQ(false); setHand(false); try { window.speechSynthesis.cancel(); if (R.current.audio) R.current.audio.pause(); } catch (e) { }
    setN(k); setPhase('loading'); setBusy(''); setLi(-1); setWi(-1); setTalking(false); setGaze('board');
    let page; try { page = await fetchPage(k); } catch (e) { if (R.current.tok === tok) { setPhase('error'); setBusy(ERR[e.message] || 'ገጹን ማዘጋጀት አልተቻለም — እንደገና ይሞክሩ።'); } return; }
    if (R.current.tok !== tok) return; setPg(page); setPhase('teach'); if (meta && k < meta.total) fetchPage(k + 1).catch(() => { }); for (let j = 0; j < 2; j++) audioFor(k, j);
    if (!page.lines.length) { setPhase('wait'); return; }
    await sleep(900); R.current.resume = { k, i: from }; const ok = await runLines(k, page, from, tok); if (!ok || R.current.tok !== tok) return; setLi(-1); setPhase(k >= (meta ? meta.total : k) ? 'end' : 'wait'); setGaze('class'); setTalking(false);
  }, [fetchPage, runLines, audioFor, meta]);

  const stop = () => { R.current.tok++; setTalking(false); try { window.speechSynthesis.cancel(); if (R.current.audio) R.current.audio.pause(); } catch (e) { } };
  const pause = () => { R.current.paused = !R.current.paused; setPaused(R.current.paused); try { R.current.paused ? window.speechSynthesis.pause() : window.speechSynthesis.resume(); } catch (e) { } };
  const nextP = () => { if (meta && n < meta.total) { setPg(null); teach(n + 1); } }, prevP = () => { if (n > 1) { setPg(null); teach(n - 1); } };
  const replay = i => { if (phase === 'loading' || !pg) return; teach(n, i); };
  async function ask(e) {
    e && e.preventDefault(); const text = q.trim(); if (text.length < 2) return; stop(); setBusy('ask'); setHand(true); setGaze('class'); setQ(''); setAns('…');
    try { const r = await fetch('/api/ai/board/' + id + '/ask', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ q: text, n }) }).then(x => x.json()); if (!r.ok) throw new Error(r.error); setAns(r.text); setHand(false); setBusy('');
      if (R.current.voice) { setTalking(true); const done = () => setTalking(false); if (meta && meta.tts) { const a = new Audio('/api/ai/board/' + id + '/tta/' + r.aid); R.current.audio = a; a.playbackRate = R.current.spd; a.onended = done; a.onerror = () => { try { const u = new SpeechSynthesisUtterance(r.text); u.lang = 'am-ET'; u.onend = done; u.onerror = done; window.speechSynthesis.speak(u); } catch (x) { done(); } }; a.play().catch(() => a.onerror()); } else { try { const u = new SpeechSynthesisUtterance(r.text); u.lang = 'am-ET'; u.onend = done; u.onerror = done; window.speechSynthesis.speak(u); } catch (x) { done(); } } }
    } catch (x) { setHand(false); setBusy(''); setAns(ERR[x.message] || 'መልስ ማግኘት አልተቻለም — እንደገና ይሞክሩ።'); }
  }
  useEffect(() => () => { R.current.tok++; try { window.speechSynthesis.cancel(); } catch (e) { } }, []);
  useEffect(() => { const el = boardEl.current, a = el && el.querySelector('[data-act="1"]'); if (a && el) { const r = a.getBoundingClientRect(), b = el.getBoundingClientRect(); if (r.bottom > b.bottom - 20 || r.top < b.top + 10) a.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }, [li]);
  if (err) return <div style={{ padding: 24, fontFamily: F }}>{err}</div>; if (!meta) return <div style={{ padding: 24 }}>⏳…</div>;
  const frac = pg && pg.lines.length && li >= 0 ? li / Math.max(1, pg.lines.length - 1) : 0.3, angle = -22 + frac * 44, started = phase !== 'idle';
  return (<div className="min-h-screen p-2 text-[#f4f1e8]" style={{ background: 'linear-gradient(#d8c9a7,#b79f73)', fontFamily: F }}>
    <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Noto+Sans+Ethiopic:wght@400;700&display=swap" />
    <style>{`.chalk-draw{stroke-dasharray:1;stroke-dashoffset:1;animation:cd 1.1s ease forwards}@keyframes cd{to{stroke-dashoffset:0}}.chalk-fade{opacity:0;animation:cf .6s ease forwards}@keyframes cf{to{opacity:1}}
.uw,.ud{background-image:linear-gradient(#ffe9a8,#ffe9a8);background-repeat:no-repeat;background-position:0 100%;border-radius:1px}.ud{background-size:100% 3px}.uw{background-size:0 3px;animation:uwk linear forwards;color:#fff}@keyframes uwk{to{background-size:100% 3px}}
.paste{animation:pst .5s ease-out}@keyframes pst{from{opacity:0;transform:scale(.92) translateY(-8px)}to{opacity:1;transform:none}}
.mouth{animation:mth .28s infinite alternate}@keyframes mth{from{ry:1}to{ry:3.4}}.breathe{animation:br 3.4s ease-in-out infinite;transform-origin:45px 200px}@keyframes br{50%{transform:scaleY(1.012)}}
@keyframes nod{0%,100%{transform:translateY(0)}50%{transform:translateY(2.5px)}}@keyframes hand{to{transform:translateY(-4px)}}`}</style>
    <div className="mx-auto max-w-2xl">
      <div className="mb-1 flex items-center justify-between px-1 text-xs text-[#3b2a17]"><span>🧑‍🏫 {meta.title}</span><span>{n ? `ስላይድ ${n}/${meta.total}` : ''}</span></div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4 }}>
        <div ref={boardEl} className="rounded-xl shadow-2xl" style={{ flex: 1, minWidth: 0, overflowY: 'auto', border: '9px solid #8b5e34', background: '#21402f', color: '#f4f1e8', padding: 12, height: '56vh', backgroundImage: 'radial-gradient(ellipse at 30% 20%,rgba(255,255,255,.07),transparent 60%)' }}>
          {!started && <div className="py-14 text-center"><p className="mb-3 text-xl">🧑‍🏫 {meta.title}</p><p className="mb-6 text-sm text-white/65">{meta.total} ስላይድ። መምህሩ እያንዳንዱን በሰሌዳ ላይ ይለጥፋል፣ መስመር በመስመር ቃል በቃል እያሰመረ ያስረዳል።{meta.tts ? '' : ' (ድምፅ ከአሳሽዎ ይሰማል — የአማርኛ ድምፅ ከሌለ በጽሑፍ ብቻ)'}</p><button onClick={() => teach(meta.start || 1)} className="rounded-full bg-[#ffe9a8] px-8 py-3 text-lg font-bold text-[#2b1d12]">▶️ ክፍሉን ጀምር</button></div>}
          {phase === 'loading' && <p className="py-16 text-center text-white/70">✍️ መምህሩ ስላይድ {n}ን እያዘጋጀ ነው…</p>}
          {phase === 'error' && <div className="py-12 text-center"><p className="mb-4 text-[#ffb3a7]">{busy}</p><button onClick={() => teach(n)} className="rounded-lg bg-[#ffe9a8] px-5 py-2 font-bold text-[#2b1d12]">🔁 እንደገና</button></div>}
          {pg && phase !== 'loading' && phase !== 'error' && <div key={n} className="paste">
            {pg.title && !(pg.lines[0] && pg.lines[0].t === pg.title) && <h2 className="mb-2 text-2xl font-bold text-[#ffe9a8] underline decoration-white/30 underline-offset-4">{pg.title}</h2>}
            {(() => pg.lines.map((l, i) => { const cur = i === li, done = li > i || phase === 'wait' || phase === 'end';
              const st = { title: 'text-xl font-bold text-[#ffe9a8]', text: 'text-lg', bullet: 'text-lg pl-4', formula: 'text-xl font-mono text-[#9fe3ff]', note: 'italic text-[#ffb3a7]' }[l.k] || 'text-lg';
              return <div key={i} data-act={cur ? '1' : undefined} onClick={() => replay(i)} className={'my-1 cursor-pointer rounded-md px-2 py-1 leading-relaxed transition-colors ' + (cur ? 'bg-white/10' : 'hover:bg-white/5')}>
                <p className={st}>{cur ? '👉 ' : l.k === 'bullet' ? '• ' : ''}<Words text={l.t} base={0} cur={cur} wi={wi} ms={ms} done={done && !cur} /></p>
                {l.am && <p className="text-base text-[#cfe8d6]"><Words text={l.am} base={wc(l.t)} cur={cur} wi={wi} ms={ms} done={done && !cur} /></p>}
              </div>; }))()}
            {pg.draw && pg.draw.length > 0 && <svg viewBox="0 0 100 56" className="my-3 w-full rounded-lg border border-white/10 bg-black/10">{pg.draw.map((s, i) => <Shape key={i} s={s} i={i} />)}</svg>}
            {(phase === 'wait' || phase === 'end') && <div className="mt-4 text-center">{phase === 'end' ? <p className="text-lg text-[#ffe9a8]">🏁 ትምህርቱ ተጠናቀቀ! ጥያቄ ካለዎት ይጠይቁ።</p> : <button onClick={nextP} className="rounded-full bg-[#ffe9a8] px-8 py-3 text-lg font-bold text-[#2b1d12]">▶️ ቀጣይ ስላይድ</button>}</div>}
          </div>}
        </div>
        <div style={{ flexShrink: 0, alignSelf: 'flex-end' }}><Teacher talking={talking} gaze={gaze} angle={angle} hand={busy === 'ask'} /></div>
      </div>
      {ans && <div className="mx-auto mt-2 rounded-2xl border-2 border-[#8b5e34] bg-[#fff8e1] p-3 text-[#2b1d12] shadow"><p className="mb-1 text-xs text-[#8b5e34]">🧑‍🏫 መምህሩ፦</p><p className="whitespace-pre-wrap text-base">{ans}</p>{!busy && R.current.resume && phase !== 'end' && <button onClick={() => { setAns(''); teach(R.current.resume.k, Math.max(0, li < 0 ? R.current.resume.i : li)); }} className="mt-2 rounded-lg bg-[#2f7d6b] px-3 py-1.5 text-sm font-bold text-white">▶️ ትምህርቱን ቀጥል</button>}</div>}
      <div className="mt-1"><Students hand={hand} /></div>
      {started && <div className="sticky bottom-2 mt-2 space-y-2 rounded-2xl bg-black/60 p-2 backdrop-blur">
        {showQ && <form onSubmit={ask} className="flex gap-2"><input value={q} onChange={e => setQ(e.target.value)} autoFocus placeholder="ጥያቄዎን ይጻፉ…" className="min-w-0 flex-1 rounded-lg bg-white/90 px-3 py-2 text-[#2b1d12]" /><button className="rounded-lg bg-[#ffe9a8] px-4 font-bold text-[#2b1d12]">ጠይቅ</button></form>}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button onClick={prevP} className="rounded-lg bg-white/10 px-3 py-2" title="ቀዳሚ">⏮</button>
          {phase === 'teach' && <button onClick={pause} className="rounded-lg bg-[#ffe9a8] px-4 py-2 font-bold text-[#2b1d12]">{paused ? '▶️ ቀጥል' : '⏸ አቁም'}</button>}
          <button onClick={nextP} className="rounded-lg bg-white/10 px-3 py-2" title="ቀጣይ">⏭ ቀጣይ</button>
          <button onClick={() => { stop(); setShowQ(v => !v); }} className="rounded-lg bg-white/10 px-3 py-2">🙋 ጥያቄ</button>
          <button onClick={() => setVoice(v => !v)} className="rounded-lg bg-white/10 px-3 py-2">{voice ? '🔊' : '🔇'}</button>
          <select value={spd} onChange={e => setSpd(Number(e.target.value))} className="rounded-lg bg-white/10 px-2 py-2 text-sm">{[0.75, 1, 1.25, 1.5].map(v => <option key={v} value={v} className="text-black">{v}×</option>)}</select>
        </div>
      </div>}
    </div>
  </div>);
}
