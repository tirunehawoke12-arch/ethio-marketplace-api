'use strict';
/* 🎬 ቪድዮ ሰሪ — ያለ ተጨማሪ ጥገኛ (ffmpeg ብቻ፤ ffmpeg-static ወይም የስርዓቱ ffmpeg)።
   plan → ትዕይንቶች (ጽሑፍ እነማ + ፎቶ/ቀለም ዳራ + የድምፅ ማብራሪያ + ሙዚቃ) → MP4 (እስከ 180 ሰከንድ)።
   ፎንት፦ server/fonts/amh.ttf (ግዕዝ + ላቲን) — ኢሞጂ/ያልተደገፉ ምልክቶች ይወገዳሉ። */
const fs = require('fs'), path = require('path'), os = require('os'), { spawn } = require('child_process');
const { tw, wrap } = require('./docout'), { textPng, pngRGBA } = require('./textpng');
const FM = JSON.parse(fs.readFileSync(path.join(__dirname, 'fonts', 'amh.json'), 'utf8')), FONT = path.join(__dirname, 'fonts', 'amh.ttf');
const SIZES = { v: [540, 960], s: [720, 720], h: [960, 540] }, FPS = 15, MAXSEC = 180;
/* [ዳራ ከ, ዳራ እስከ, አጽንኦ ቀለም] — ሁሉም ጥቁር-ተኮር ስለሆኑ ነጭ ጽሑፍ ግልጽ ነው */
const THEMES = [['1b2a6b', '6a1b9a', 'ffc107'], ['0b5d3b', '0f766e', 'ffeb3b'], ['b71c1c', 'e65100', 'fff59d'], ['111111', '3a3a3a', 'd4af37'], ['880e4f', '4a148c', 'ffd54f'], ['078930', 'da121a', 'fcdd09'], ['0d47a1', '006064', '80deea']];
const clean = s => [...String(s == null ? '' : s)].filter(ch => { const c = ch.codePointAt(0); return c === 32 || FM.m[c]; }).join('').replace(/\s+/g, ' ').trim();
const esc = p => String(p).replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
function run(bin, args, { timeout = 600000, keep = false } = {}) {
  return new Promise((res, rej) => {
    let err = '', p; try { p = spawn(bin, args, { stdio: ['ignore', 'ignore', 'pipe'] }); } catch (e) { return rej(e); }
    const to = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) { } }, timeout); p.stderr.on('data', d => { err = (err + d).slice(-6000); });
    p.on('error', e => { clearTimeout(to); rej(e); }); p.on('close', c => { clearTimeout(to); if (c === 0 || keep) res(err); else rej(new Error('ffmpeg_failed: ' + err.split('\n').slice(-6).join(' | '))); });
  });
}
async function probe(bin, file) { const e = await run(bin, ['-hide_banner', '-i', file], { keep: true }), m = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(e); return m ? (+m[1]) * 3600 + (+m[2]) * 60 + parseFloat(m[3]) : 0; }
const caps = { loaded: false, gradients: true };
function filterList(bin) { return new Promise(res => { let out = '', p; try { p = spawn(bin, ['-hide_banner', '-filters'], { stdio: ['ignore', 'pipe', 'ignore'] }); } catch (e) { return res(null); } const to = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) { } }, 15000); p.stdout.on('data', d => { out += d; }); p.on('error', () => { clearTimeout(to); res(null); }); p.on('close', c => { clearTimeout(to); res(c === 0 ? out : null); }); }); }
async function available(bin) { const e = await filterList(bin); if (!e || !/\boverlay\b/.test(e)) return false; caps.loaded = true; caps.gradients = /\bgradients\b/.test(e); return true; }          // ጽሑፍ በ PNG ስለሚቀመጥ drawtext/freetype አያስፈልግም

/* ዳራ ሙዚቃ (ያለ ፋይል — ffmpeg ራሱ ይሠራል፤ ቀላል የኮርድ ድምፅ ነው) */
async function makeMusic(bin, dir, style) {
  const ch = [[220, 261.63, 329.63], [174.61, 220, 261.63], [261.63, 329.63, 392], [196, 246.94, 293.66]], ins = [], fc = [], D = 4;
  ch.forEach((c, j) => { const ids = c.map(f => { ins.push('-f', 'lavfi', '-i', `sine=f=${f}:d=${D}:r=44100`); return `[${ins.filter(x => x === '-i').length - 1}:a]`; }); fc.push(`${ids.join('')}amix=inputs=3:normalize=0,afade=t=in:d=0.6,afade=t=out:st=${D - 0.8}:d=0.8[c${j}]`); });
  const energetic = style === 'energetic', out = path.join(dir, 'music.wav');
  fc.push(`[c0][c1][c2][c3]concat=n=4:v=0:a=1,lowpass=f=${energetic ? 2600 : 1600},tremolo=f=${energetic ? 4 : 0.6}:d=${energetic ? 0.75 : 0.3},aecho=0.8:0.6:${energetic ? 180 : 320}:0.3,aformat=channel_layouts=stereo,volume=${energetic ? 1.2 : 0.9}[o]`);
  await run(bin, ['-y', '-hide_banner', '-loglevel', 'error', ...ins, '-filter_complex', fc.join(';'), '-map', '[o]', '-ar', '44100', out]); return out;
}

/* ትዕይንት → ffmpeg ዳራ + ጽሑፍ ግራፍ */
function layout(sc, W, H, vertical, photo) {
  const base = Math.round(W * (vertical ? 0.088 : 0.062)), m = Math.round(W * 0.08), maxW = W - 2 * m, items = [];
  const head = clean(sc.head), sub = clean(sc.sub), bullets = (sc.bullets || []).map(clean).filter(Boolean).slice(0, 4), price = clean(sc.price), phone = clean(sc.phone), addr = clean(sc.addr);
  const hs = sc.type === 'hook' || sc.type === 'title' ? Math.round(base * 1.25) : base, ss = Math.round(base * 0.56), bs = Math.round(base * 0.6);
  const hl = head ? wrap(head, hs, maxW).slice(0, 4) : [], sl = sub ? wrap(sub, ss, maxW).slice(0, 4) : [], gap = Math.round(base * 0.5);
  let hh = hl.length * hs * 1.25, sh = sl.length * ss * 1.3, bh = bullets.length * bs * 1.9, ph = price ? base * 1.9 : 0, cth = phone ? base * 1.7 : 0, ah = addr ? ss * 1.5 : 0;
  const total = hh + (sh ? gap + sh : 0) + (bh ? gap + bh : 0) + (ph ? gap + ph : 0) + (cth ? gap + cth : 0) + (ah ? gap : 0) + ah;
  let y = photo ? Math.max(H * 0.14, H * 0.9 - total - m * 0.4) : Math.max(H * 0.14, (H - total) / 2), t = 0.25;
  const add = (kind, o) => items.push({ kind, ...o });
  hl.forEach((l, i) => { add('text', { s: l, size: hs, y: y + i * hs * 1.25, t0: t + i * 0.12, color: 'white', center: true }); }); y += hh; if (hl.length) t += 0.55;
  if (sl.length) { y += gap; sl.forEach((l, i) => add('text', { s: l, size: ss, y: y + i * ss * 1.3, t0: t + i * 0.1, color: 'eeeeee', center: true })); y += sh; t += 0.45; }
  if (bullets.length) { y += gap; bullets.forEach((b, i) => { const w = tw(b, bs), x0 = (W - Math.min(maxW, w + bs * 1.4)) / 2; add('dot', { x: x0, y: y + i * bs * 1.9 + bs * 0.3, size: bs * 0.5, t0: t + 0.35 * i }); add('text', { s: b, size: bs, y: y + i * bs * 1.9, t0: t + 0.35 * i, x: x0 + bs * 1.1, color: 'white' }); }); y += bh; t += 0.35 * bullets.length; }
  if (price) { y += gap; const w = Math.min(maxW, tw(price, base * 1.2) + base * 1.2); add('box', { x: (W - w) / 2, y, w, h: base * 1.7, t0: t, accent: true }); add('text', { s: price, size: Math.round(base * 1.2), y: y + base * 0.25, t0: t + 0.1, color: 'ink', center: true }); y += ph; t += 0.5; }
  if (phone) { y += gap; const w = Math.min(maxW, tw(phone, base * 1.1) + base * 1.4); add('box', { x: (W - w) / 2, y, w, h: base * 1.5, t0: t, accent: true }); add('text', { s: phone, size: Math.round(base * 1.1), y: y + base * 0.2, t0: t + 0.1, color: 'ink', center: true }); y += cth; t += 0.5; }
  if (addr) { y += gap; wrap(addr, ss, maxW).slice(0, 2).forEach((l, i) => add('text', { s: l, size: ss, y: y + i * ss * 1.3, t0: t, color: 'eeeeee', center: true })); }
  return items;
}
const hex = h => [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
function cached(o, key, make) { if (!o.cache[key]) { const f = path.join(o.tmp, key.replace(/\W/g, '_') + '.png'); fs.writeFileSync(f, make()); o.cache[key] = f; } return o.cache[key]; }
const gradPng = (w, h, c0, c1) => { const a = hex(c0), z = hex(c1), buf = Buffer.alloc(w * h * 4); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const t = Math.min(1, Math.max(0, (x / w * 0.45 + y / h * 0.75) / 1.2)), dx = x / w - 0.5, dy = y / h - 0.5, v = 1 - 0.38 * Math.min(1, (dx * dx + dy * dy) * 2.2), o = (y * w + x) * 4; buf[o] = (a[0] + (z[0] - a[0]) * t) * v; buf[o + 1] = (a[1] + (z[1] - a[1]) * t) * v; buf[o + 2] = (a[2] + (z[2] - a[2]) * t) * v; buf[o + 3] = 255; } return pngRGBA(w, h, buf); };
const scrimPng = (w, h) => { const buf = Buffer.alloc(w * h * 4); for (let y = 0; y < h; y++) { const f = y / h, a = Math.round(255 * Math.min(0.86, Math.max(0.16, 0.16 + Math.pow(Math.max(0, f - 0.28) / 0.72, 1.4) * 0.8))); for (let x = 0; x < w; x++) { const o = (y * w + x) * 4; buf[o + 3] = a; } } return pngRGBA(w, h, buf); };
const glowPng = (sz, c, alpha) => { const buf = Buffer.alloc(sz * sz * 4), r = sz / 2; for (let y = 0; y < sz; y++) for (let x = 0; x < sz; x++) { const d = Math.hypot(x - r, y - r) / r, o = (y * sz + x) * 4; buf[o] = c[0]; buf[o + 1] = c[1]; buf[o + 2] = c[2]; buf[o + 3] = d >= 1 ? 0 : Math.round(255 * alpha * Math.pow(1 - d, 1.6)); } return pngRGBA(sz, sz, buf); };
function composeLayer(items, W, acc) {          // በአንድ ቡድን ያሉ ጽሑፎች፣ ሳጥኖች፣ ነጥቦች → አንድ ግልጽ ንብርብር (PNG) — በአንድ overlay ብቻ ይለጠፋል
  const COL = { white: [255, 255, 255], eeeeee: [238, 238, 238], ink: [26, 26, 26] }, parts = []; let y0 = 1e9, y1 = 0;
  for (const it of items) {
    if (it.kind === 'text') { const r = textPng(it.s, it.size, { color: COL[it.color] || COL.white, shadow: it.color === 'ink' ? 0 : null, raw: true }), x = Math.round(it.center ? (W - r.w) / 2 : it.x - r.pad), y = Math.round(it.y - r.pad + it.size * 0.05); parts.push({ k: 't', x, y, r }); y0 = Math.min(y0, y); y1 = Math.max(y1, y + r.h); }
    else { const w = it.kind === 'dot' ? it.size : it.w, h = it.kind === 'dot' ? it.size : it.h, x = Math.round(it.x), y = Math.round(it.y); parts.push({ k: 'b', x, y, w: Math.round(w), h: Math.round(h) }); y0 = Math.min(y0, y); y1 = Math.max(y1, y + Math.round(h)); }
  }
  y0 = Math.max(0, Math.floor(y0)); const H = Math.max(2, Math.ceil(y1 - y0)), buf = Buffer.alloc(W * H * 4), ac = hex(acc);
  for (const p of parts) {
    if (p.k === 'b') { for (let yy = Math.max(0, p.y - y0); yy < Math.min(H, p.y - y0 + p.h); yy++) for (let xx = Math.max(0, p.x); xx < Math.min(W, p.x + p.w); xx++) { const o = (yy * W + xx) * 4; buf[o] = ac[0]; buf[o + 1] = ac[1]; buf[o + 2] = ac[2]; buf[o + 3] = 242; } continue; }
    const { r } = p; for (let yy = 0; yy < r.h; yy++) { const Y = p.y - y0 + yy; if (Y < 0 || Y >= H) continue; for (let xx = 0; xx < r.w; xx++) { const X = p.x + xx; if (X < 0 || X >= W) continue; const so = (yy * r.w + xx) * 4, sa = r.rgba[so + 3]; if (!sa) continue; const o = (Y * W + X) * 4, da = buf[o + 3], a = sa / 255, oa = a + (da / 255) * (1 - a); if (oa <= 0) continue; for (let c = 0; c < 3; c++) buf[o + c] = Math.round((r.rgba[so + c] * a + buf[o + c] * (da / 255) * (1 - a)) / oa); buf[o + 3] = Math.round(oa * 255); } }
  }
  return { png: pngRGBA(W, H, buf), y: y0, h: H };
}
function buildScene(sc, i, o) {          // → { fc, inputs, nIn } ; o: W,H,D,T0,TT,theme,photo,tmp,cache,brand
  const { W, H, D, T0, TT, theme, tmp } = o, th = THEMES[theme % THEMES.length], acc = th[2], hasPhoto = !!o.photo, items = layout(sc, W, H, H >= W, hasPhoto), F = [], inputs = [], Ds = D.toFixed(2); let nIn = 0;
  const addImg = file => { inputs.push('-i', file); return nIn++; };
  const still = (idx, pre, post) => `[${idx}:v]${pre ? pre + ',' : ''}loop=loop=-1:size=1:start=0,setpts=N/(${FPS}*TB),trim=duration=${Ds}${post ? ',' + post : ''}`;          // አንድ ጊዜ ብቻ ይነበባል፣ ፍሬሞች ይደገማሉ (በየፍሬሙ ዳግም ማንበብ የለም)
  const fw = Math.ceil(W * 1.25), fh = Math.ceil(H * 1.25), bgFile = o.photo || cached(o, `bg_${theme}_${fw}x${fh}`, () => gradPng(fw, fh, th[0], th[1])), bi = addImg(bgFile), dirx = i % 2 ? `(in_w-out_w)*(1-t/${Ds})` : `(in_w-out_w)*t/${Ds}`;
  F.push(`${still(bi, `scale=${fw}:${fh}:force_original_aspect_ratio=increase,crop=${fw}:${fh}`)},crop=${W}:${H}:x='${dirx}':y='(in_h-out_h)*(0.5+0.3*(t/${Ds}-0.5)*${i % 3 === 1 ? -1 : 1})',setsar=1${hasPhoto ? ',eq=brightness=-0.04:saturation=1.15:contrast=1.06' : ''}[bg]`);
  let cur = 'bg', n = 0; const nx = () => 'n' + (n++);
  if (hasPhoto) { const si = addImg(cached(o, `scrim_${W}x${H}`, () => scrimPng(W, H))), nm = nx(); F.push(`${still(si, 'format=rgba')}[sc${i}]`, `[${cur}][sc${i}]overlay=0:0[${nm}]`); cur = nm; }
  else { const g = cached(o, `glow_${theme}_${W}`, () => glowPng(Math.round(W * 0.9), hex(acc), 0.3)), g2 = cached(o, `glow2_${theme}_${W}`, () => glowPng(Math.round(W * 0.6), [255, 255, 255], 0.16)); for (const [f, k, ph] of [[g, 1, 0], [g2, 2, 2]]) { const gi = addImg(f), nm = nx(); F.push(`${still(gi, 'format=rgba')}[gl${i}_${k}]`, `[${cur}][gl${i}_${k}]overlay=x='(W-w)*(0.5+0.42*sin(t*${0.35 * k}+${i * 1.7 + ph}))':y='(H-h)*(0.35+0.3*cos(t*${0.28 * k}+${i * 1.3 + ph}))':eval=frame[${nm}]`); cur = nm; } }
  if (o.brand) { const r = textPng(o.brand, Math.round(W * 0.036), { color: [255, 255, 255], shadow: 1 }), f = path.join(tmp, `b${i}.png`); fs.writeFileSync(f, r.buf); const bi2 = addImg(f), nm = nx(); F.push(`${still(bi2, 'format=rgba,colorchannelmixer=aa=0.85')}[bt${i}]`, `[${cur}][bt${i}]overlay=x=${Math.round(W * 0.05)}:y=${Math.round(H * 0.03)}[${nm}]`); cur = nm; }
  const g1 = items.filter(x => x.t0 < 0.95), g2 = items.filter(x => x.t0 >= 0.95);          // 2 ንብርብር ብቻ (ርዕስ + ዝርዝር)፤ በየፍሬሙ ሁለት overlay
  [g1, g2].forEach((g, gi) => {
    if (!g.length) return; const L = composeLayer(g, W, acc), f = path.join(tmp, `L${i}_${gi}.png`); fs.writeFileSync(f, L.png); const li = addImg(f), t0 = Math.min(...g.map(x => x.t0)).toFixed(2), nm = nx(), rise = `(1-min(1,max(0,(t-${t0})/0.5)))*${Math.round(H * 0.04)}`;
    F.push(`${still(li, 'format=rgba', `fade=t=in:st=${t0}:d=0.5:alpha=1`)}[ly${i}_${gi}]`, `[${cur}][ly${i}_${gi}]overlay=x=0:y='${L.y}+${rise}':eval=frame:enable='gte(t,${t0})'[${nm}]`); cur = nm;
  });
  const bar = nx(); F.push(`color=c=0x${acc}:s=${Math.round(W * 0.28)}x6:r=${FPS}:d=${Ds}[acc]`, `color=c=0x${acc}:s=${W}x5:r=${FPS}:d=${Ds}[pg]`);
  F.push(`[${cur}][acc]overlay=x='${Math.round(W * 0.08)}-${Math.round(W * 0.28)}*max(0,1-t/0.6)':y=${Math.round(H * 0.11)}:eval=frame[${bar}]`);
  F.push(`[${bar}][pg]overlay=x='-${W}+${W}*(${T0.toFixed(2)}+t)/${TT.toFixed(2)}':y=${H - 5}:eval=frame,fade=t=in:st=0:d=0.3,fade=t=out:st=${(D - 0.3).toFixed(2)}:d=0.3,format=yuv420p[v]`);
  return { fc: F.join(';'), inputs, nIn };
}

/* plan = { brand, theme, music:'calm'|'energetic'|'none', scenes:[{type,head,sub,bullets,price,phone,addr,narr,dur,img}] }
   opt = { bin, fmt:'v'|'s'|'h', maxSec, photos:[Buffer], tts: async text => Buffer|null (mime በ .mime)፣ musicFile, onProgress(p, msg) } → { buf, dur, w, h, narrated } */
async function render(plan, opt) {
  const bin = opt.bin || 'ffmpeg', [W, H] = SIZES[opt.fmt] || SIZES.v, cap = Math.min(MAXSEC, opt.maxSec || MAXSEC), prog = (p, m) => { try { opt.onProgress && opt.onProgress(p, m); } catch (e) { } };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vid-')); try {
    const font = FONT; if (!caps.loaded) await available(bin);
    let scenes = (plan.scenes || []).filter(s => s && (s.head || s.sub || (s.bullets || []).length || s.narr)).slice(0, 40).map(x => ({ ...x })); if (!scenes.length) throw new Error('video_empty');
    const photos = []; (opt.photos || []).slice(0, 12).forEach((b, i) => { const f = path.join(dir, `p${i}.jpg`); fs.writeFileSync(f, b); photos.push(f); });
    /* 1) ድምፅ ማብራሪያ (3 በትይዩ) */
    let narrated = 0; const aud = new Array(scenes.length).fill(null), dur = new Array(scenes.length).fill(0);
    if (opt.tts && plan.voice !== false) {          // ድምፅ በጊዜ ገደብ፦ አገልግሎቱ ካልመለሰ ቪድዮው ያለ ድምፅ ይቀጥላል (መቼም አይቆምም)
      let k = 0, done = 0, fails = 0; const deadline = Date.now() + (opt.ttsMs || 50000), late = ms => new Promise(r => { setTimeout(() => r(null), Math.max(300, ms)); });
      const worker = async () => { while (k < scenes.length && Date.now() < deadline && !(fails >= 3 && !narrated)) { const i = k++, t = clean(scenes[i].narr); if (!t) continue; let w = null; try { w = await Promise.race([opt.tts(t), late(Math.min(25000, deadline - Date.now()))]); } catch (e) { } let ok = false; if (w && w.length > 500 && Date.now() < deadline + 5000) { const f = path.join(dir, `a${i}.${/mpeg|mp3/i.test(w.mime || '') ? 'mp3' : 'wav'}`); fs.writeFileSync(f, w); try { const d = await probe(bin, f); if (d > 0.3) { aud[i] = f; dur[i] = d; narrated++; ok = true; } } catch (e) { } } if (!ok) fails++; done++; prog(0.05 + 0.3 * done / scenes.length, 'voice'); } };
      await Promise.race([Promise.all([worker(), worker(), worker()]), late(deadline - Date.now() + 6000)]);
    }
    /* 1ለ) ከርዕሱ ጋር የሚሄዱ ምስሎች (ከተሰጡት ፎቶዎች ውጪ ላሉ ትዕይንቶች፤ በ 35 ሰከንድ ገደብ፤ ካልተገኘ ንድፍ ዳራ) */
    let fetched = 0; const musicP = (!opt.musicFile && plan.music !== 'none') ? makeMusic(bin, dir, plan.music === 'energetic' ? 'energetic' : 'calm').catch(() => null) : Promise.resolve(null);
    if (opt.fetchImg) {
      const need = scenes.map((sc, i) => (!(Number.isInteger(sc.img) && sc.img >= 0 && sc.img < photos.length) && clean(sc.imgq || '').length > 2 ? i : -1)).filter(i => i >= 0).slice(0, opt.maxImgs || 12), deadline = Date.now() + (opt.imgMs || 28000); let k = 0, done = 0;
      const w = async () => { while (k < need.length && Date.now() < deadline) { const i = need[k++]; let b = null; try { b = await Promise.race([opt.fetchImg(String(scenes[i].imgq).slice(0, 220), i), new Promise(r => setTimeout(() => r(null), Math.max(1000, deadline - Date.now())))]); } catch (e) { } if (b && b.length > 3000) { const f = path.join(dir, `w${i}.jpg`); fs.writeFileSync(f, b); scenes[i]._photo = f; fetched++; } done++; prog(0.05 + 0.3 * done / Math.max(1, need.length), 'images'); } };
      await Promise.all([w(), w(), w(), w()]);
    }
    /* 2) የትዕይንት ርዝማኔ፤ ከ cap በላይ ከሆነ ማፍጠን ከዚያ መቀነስ */
    const want = i => Math.max(2.5, Math.min(14, Number(scenes[i].dur) || 5)), D = () => scenes.map((s, i) => (aud[i] ? Math.max(2.5, dur[i] + 1.0) : want(i)));
    let ds = D(), tot = ds.reduce((a, b) => a + b, 0), tempo = 1;
    if (tot > cap && narrated) { tempo = Math.min(1.3, (tot - 0) / cap); ds = scenes.map((s, i) => (aud[i] ? Math.max(2.5, dur[i] / tempo + 0.8) : want(i))); tot = ds.reduce((a, b) => a + b, 0); }
    while (tot > cap && scenes.length > 2) { let j = Math.floor(scenes.length / 2); for (let q = 1; q < scenes.length - 1; q++) if (scenes[q].type !== 'offer' && scenes[q].type !== 'list') { j = q; break; } tot -= ds[j]; scenes.splice(j, 1); aud.splice(j, 1); dur.splice(j, 1); ds.splice(j, 1); }
    /* 3) እያንዳንዱን ትዕይንት መሥራት */
    const theme = Number.isInteger(plan.theme) ? plan.theme : 0, parts = new Array(scenes.length), cache = {}, offs = []; { let t = 0; for (const d of ds) { offs.push(t); t += d; } }
    const one = async i => {
      const sc = scenes[i], D1 = ds[i], img = sc._photo || (Number.isInteger(sc.img) && sc.img >= 0 && sc.img < photos.length ? photos[sc.img] : null), b = buildScene(sc, i, { W, H, D: D1, T0: offs[i], TT: tot, theme, photo: img, tmp: dir, cache, brand: clean(plan.brand) });
      const out = path.join(dir, `s${i}.mp4`), args = ['-y', '-hide_banner', '-loglevel', 'error', '-threads', '2', ...b.inputs];
      if (aud[i]) args.push('-i', aud[i]); else args.push('-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo');
      args.push('-filter_complex', b.fc + ';' + `[${b.nIn}:a]${aud[i] ? `atempo=${tempo.toFixed(3)},adelay=400|400,` : ''}apad=whole_dur=${D1.toFixed(2)},atrim=0:${D1.toFixed(2)},aresample=44100,aformat=channel_layouts=stereo[a]`, '-map', '[v]', '-map', '[a]', '-t', D1.toFixed(2), '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '28', '-r', String(FPS), '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-ar', '44100', '-ac', '2', out);
      await run(bin, args); parts[i] = out;
    };
    { let k = 0, fin = 0; const conc = Math.max(1, Math.min(3, (os.cpus() || []).length || 2)); const w = async () => { while (k < scenes.length) { const i = k++; await one(i); fin++; prog(0.4 + 0.5 * fin / scenes.length, 'scene'); } }; await Promise.all(Array.from({ length: conc }, w)); }
    const list = path.join(dir, 'l.txt'); fs.writeFileSync(list, parts.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n')); const joined = path.join(dir, 'j.mp4');
    await run(bin, ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', joined]);
    /* 4) ሙዚቃ */
    const final = path.join(dir, 'final.mp4'); let music = opt.musicFile || (await musicP);
    if (music) { const vol = narrated ? 0.11 : 0.4; await run(bin, ['-y', '-hide_banner', '-loglevel', 'error', '-i', joined, '-stream_loop', '-1', '-i', music, '-filter_complex', `[1:a]volume=${vol},afade=t=out:st=${Math.max(0, tot - 2).toFixed(2)}:d=2[m];[0:a][m]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a]`, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '112k', '-movflags', '+faststart', '-shortest', final]); }
    else await run(bin, ['-y', '-hide_banner', '-loglevel', 'error', '-i', joined, '-c', 'copy', '-movflags', '+faststart', final]);
    prog(1, 'done'); const buf = fs.readFileSync(final); return { buf, dur: tot, w: W, h: H, narrated, scenes: scenes.length, music: !!music, images: fetched };
  } finally { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { } }
}
module.exports = { render, available, makeMusic, SIZES, THEMES, clean, MAXSEC };
