'use strict';
/* 🎬 ቪድዮ ሰሪ — ያለ ተጨማሪ ጥገኛ (ffmpeg ብቻ፤ ffmpeg-static ወይም የስርዓቱ ffmpeg)።
   plan → ትዕይንቶች (ጽሑፍ እነማ + ፎቶ/ቀለም ዳራ + የድምፅ ማብራሪያ + ሙዚቃ) → MP4 (እስከ 180 ሰከንድ)።
   ፎንት፦ server/fonts/amh.ttf (ግዕዝ + ላቲን) — ኢሞጂ/ያልተደገፉ ምልክቶች ይወገዳሉ። */
const fs = require('fs'), path = require('path'), os = require('os'), { spawn } = require('child_process');
const { tw, wrap } = require('./docout');
const FM = JSON.parse(fs.readFileSync(path.join(__dirname, 'fonts', 'amh.json'), 'utf8')), FONT = path.join(__dirname, 'fonts', 'amh.ttf');
const SIZES = { v: [540, 960], s: [720, 720], h: [960, 540] }, FPS = 24, MAXSEC = 180;
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
async function available(bin) { try { const e = await run(bin, ['-hide_banner', '-filters'], { keep: true, timeout: 15000 }); return true; } catch (e) { return false; } }

/* ዳራ ሙዚቃ (ያለ ፋይል — ffmpeg ራሱ ይሠራል፤ ቀላል የኮርድ ድምፅ ነው) */
async function makeMusic(bin, dir, style) {
  const ch = [[220, 261.63, 329.63], [174.61, 220, 261.63], [261.63, 329.63, 392], [196, 246.94, 293.66]], ins = [], fc = [], D = 4;
  ch.forEach((c, j) => { const ids = c.map(f => { ins.push('-f', 'lavfi', '-i', `sine=f=${f}:d=${D}:r=44100`); return `[${ins.filter(x => x === '-i').length - 1}:a]`; }); fc.push(`${ids.join('')}amix=inputs=3:normalize=0,afade=t=in:d=0.6,afade=t=out:st=${D - 0.8}:d=0.8[c${j}]`); });
  const energetic = style === 'energetic', out = path.join(dir, 'music.wav');
  fc.push(`[c0][c1][c2][c3]concat=n=4:v=0:a=1,lowpass=f=${energetic ? 2600 : 1600},tremolo=f=${energetic ? 4 : 0.6}:d=${energetic ? 0.75 : 0.3},aecho=0.8:0.6:${energetic ? 180 : 320}:0.3,aformat=channel_layouts=stereo,volume=${energetic ? 1.2 : 0.9}[o]`);
  await run(bin, ['-y', '-hide_banner', '-loglevel', 'error', ...ins, '-filter_complex', fc.join(';'), '-map', '[o]', '-ar', '44100', out]); return out;
}

/* ትዕይንት → ffmpeg ዳራ + ጽሑፍ ግራፍ */
function layout(sc, W, H, vertical) {
  const base = Math.round(W * (vertical ? 0.088 : 0.062)), m = Math.round(W * 0.08), maxW = W - 2 * m, items = [];
  const head = clean(sc.head), sub = clean(sc.sub), bullets = (sc.bullets || []).map(clean).filter(Boolean).slice(0, 4), price = clean(sc.price), phone = clean(sc.phone), addr = clean(sc.addr);
  const hs = sc.type === 'hook' || sc.type === 'title' ? Math.round(base * 1.25) : base, ss = Math.round(base * 0.56), bs = Math.round(base * 0.6);
  const hl = head ? wrap(head, hs, maxW).slice(0, 4) : [], sl = sub ? wrap(sub, ss, maxW).slice(0, 4) : [], gap = Math.round(base * 0.5);
  let hh = hl.length * hs * 1.25, sh = sl.length * ss * 1.3, bh = bullets.length * bs * 1.9, ph = price ? base * 1.9 : 0, cth = phone ? base * 1.7 : 0, ah = addr ? ss * 1.5 : 0;
  const total = hh + (sh ? gap + sh : 0) + (bh ? gap + bh : 0) + (ph ? gap + ph : 0) + (cth ? gap + cth : 0) + (ah ? gap : 0) + ah;
  let y = Math.max(H * 0.14, (H - total) / 2), t = 0.25;
  const add = (kind, o) => items.push({ kind, ...o });
  hl.forEach((l, i) => { add('text', { s: l, size: hs, y: y + i * hs * 1.25, t0: t + i * 0.12, color: 'white', center: true }); }); y += hh; if (hl.length) t += 0.55;
  if (sl.length) { y += gap; sl.forEach((l, i) => add('text', { s: l, size: ss, y: y + i * ss * 1.3, t0: t + i * 0.1, color: 'eeeeee', center: true })); y += sh; t += 0.45; }
  if (bullets.length) { y += gap; bullets.forEach((b, i) => { const w = tw(b, bs), x0 = (W - Math.min(maxW, w + bs * 1.4)) / 2; add('dot', { x: x0, y: y + i * bs * 1.9 + bs * 0.3, size: bs * 0.5, t0: t + 0.35 * i }); add('text', { s: b, size: bs, y: y + i * bs * 1.9, t0: t + 0.35 * i, x: x0 + bs * 1.1, color: 'white' }); }); y += bh; t += 0.35 * bullets.length; }
  if (price) { y += gap; const w = Math.min(maxW, tw(price, base * 1.2) + base * 1.2); add('box', { x: (W - w) / 2, y, w, h: base * 1.7, t0: t, accent: true }); add('text', { s: price, size: Math.round(base * 1.2), y: y + base * 0.25, t0: t + 0.1, color: 'ink', center: true }); y += ph; t += 0.5; }
  if (phone) { y += gap; const w = Math.min(maxW, tw(phone, base * 1.1) + base * 1.4); add('box', { x: (W - w) / 2, y, w, h: base * 1.5, t0: t, accent: true }); add('text', { s: phone, size: Math.round(base * 1.1), y: y + base * 0.2, t0: t + 0.1, color: 'ink', center: true }); y += cth; t += 0.5; }
  if (addr) { y += gap; wrap(addr, ss, maxW).slice(0, 2).forEach((l, i) => add('text', { s: l, size: ss, y: y + i * ss * 1.3, t0: t, color: 'eeeeee', center: true })); }
  return items;
}
function buildScene(sc, i, o) {          // → { fc, inputs } ; o: W,H,D,T0,TT,theme,dir,photo,font,tmp
  const { W, H, D, T0, TT, theme, font, tmp } = o, th = THEMES[theme % THEMES.length], acc = th[2], items = layout(sc, W, H, H >= W), F = [], inputs = [];
  if (o.photo) {
    inputs.push('-loop', '1', '-framerate', String(FPS), '-t', D.toFixed(2), '-i', o.photo);
    const fw = Math.ceil(W * 1.25), fh = Math.ceil(H * 1.25), dirx = i % 2 ? '(in_w-out_w)*(1-t/' + D.toFixed(2) + ')' : '(in_w-out_w)*t/' + D.toFixed(2);
    F.push(`[0:v]scale=${fw}:${fh}:force_original_aspect_ratio=increase,crop=${W}:${H}:x='${dirx}':y='(in_h-out_h)/2',setsar=1,eq=brightness=-0.12:saturation=1.08,drawbox=x=0:y=0:w=${W}:h=${H}:color=black@0.42:t=fill[bg]`);
  } else {
    inputs.push('-f', 'lavfi', '-i', `gradients=s=${W}x${H}:r=${FPS}:d=${D.toFixed(2)}:c0=0x${th[0]}:c1=0x${th[1]}:x0=0:y0=0:x1=${W}:y1=${H}:speed=0.006:type=linear`);
    F.push(`[0:v]setsar=1[bg]`);
  }
  let cur = 'bg', n = 0; const nx = () => 'n' + (n++), ff = esc(font);
  if (o.brand) { const bf = path.join(tmp, `b${i}.txt`); fs.writeFileSync(bf, o.brand); const s = Math.round(W * 0.035), nm = nx(); F.push(`[${cur}]drawtext=fontfile='${ff}':expansion=none:textfile='${esc(bf)}':fontsize=${s}:fontcolor=white@0.75:x=${Math.round(W * 0.05)}:y=${Math.round(H * 0.035)}:shadowx=1:shadowy=1:shadowcolor=black@0.5[${nm}]`); cur = nm; }
  items.forEach((it, k) => {
    const nm = nx(), t0 = it.t0.toFixed(2), al = `min(1,max(0,(t-${t0})/0.45))`, rise = `(1-min(1,max(0,(t-${t0})/0.5)))*${Math.round(H * 0.035)}`;
    if (it.kind === 'text') { const tf = path.join(tmp, `s${i}_${k}.txt`); fs.writeFileSync(tf, it.s); const col = it.color === 'ink' ? '0x1a1a1a' : '0x' + (it.color === 'white' ? 'ffffff' : it.color), x = it.center ? '(w-text_w)/2' : Math.round(it.x);
      F.push(`[${cur}]drawtext=fontfile='${ff}':expansion=none:textfile='${esc(tf)}':fontsize=${it.size}:fontcolor=${col}:alpha='${al}':x=${x}:y='${Math.round(it.y)}+${rise}':shadowx=${it.color === 'ink' ? 0 : 2}:shadowy=${it.color === 'ink' ? 0 : 2}:shadowcolor=black@0.55[${nm}]`); }
    else if (it.kind === 'dot') F.push(`[${cur}]drawbox=x=${Math.round(it.x)}:y=${Math.round(it.y)}:w=${Math.round(it.size)}:h=${Math.round(it.size)}:color=0x${acc}:t=fill:enable='gte(t,${t0})'[${nm}]`);
    else if (it.kind === 'box') F.push(`[${cur}]drawbox=x=${Math.round(it.x)}:y=${Math.round(it.y)}:w=${Math.round(it.w)}:h=${Math.round(it.h)}:color=0x${acc}@0.95:t=fill:enable='gte(t,${t0})'[${nm}]`);
    cur = nm;
  });
  const bar = nx(), fin = nx();          // አጽንኦ መስመር (ከላይ ይሰፋል) + አጠቃላይ ሂደት መስመር (ከታች)
  F.push(`color=c=0x${acc}:s=${Math.round(W * 0.28)}x6:r=${FPS}:d=${D.toFixed(2)}[acc]`, `color=c=0x${acc}:s=${W}x5:r=${FPS}:d=${D.toFixed(2)}[pg]`);
  F.push(`[${cur}][acc]overlay=x='${Math.round(W * 0.08)}-${Math.round(W * 0.28)}*max(0,1-t/0.6)':y=${Math.round(H * 0.11)}:eval=frame[${bar}]`);
  F.push(`[${bar}][pg]overlay=x='-${W}+${W}*(${T0.toFixed(2)}+t)/${TT.toFixed(2)}':y=${H - 5}:eval=frame,fade=t=in:st=0:d=0.3,fade=t=out:st=${(D - 0.3).toFixed(2)}:d=0.3,format=yuv420p[v]`);
  return { fc: F.join(';'), inputs };
}

/* plan = { brand, theme, music:'calm'|'energetic'|'none', scenes:[{type,head,sub,bullets,price,phone,addr,narr,dur,img}] }
   opt = { bin, fmt:'v'|'s'|'h', maxSec, photos:[Buffer], tts: async text => Buffer|null (mime በ .mime)፣ musicFile, onProgress(p, msg) } → { buf, dur, w, h, narrated } */
async function render(plan, opt) {
  const bin = opt.bin || 'ffmpeg', [W, H] = SIZES[opt.fmt] || SIZES.v, cap = Math.min(MAXSEC, opt.maxSec || MAXSEC), prog = (p, m) => { try { opt.onProgress && opt.onProgress(p, m); } catch (e) { } };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'vid-')); try {
    const font = path.join(dir, 'f.ttf'); fs.copyFileSync(FONT, font);
    let scenes = (plan.scenes || []).filter(s => s && (s.head || s.sub || (s.bullets || []).length || s.narr)).slice(0, 40); if (!scenes.length) throw new Error('video_empty');
    const photos = []; (opt.photos || []).slice(0, 12).forEach((b, i) => { const f = path.join(dir, `p${i}.jpg`); fs.writeFileSync(f, b); photos.push(f); });
    /* 1) ድምፅ ማብራሪያ (3 በትይዩ) */
    let narrated = 0; const aud = new Array(scenes.length).fill(null), dur = new Array(scenes.length).fill(0);
    if (opt.tts && plan.voice !== false) { let k = 0, done = 0; const worker = async () => { while (k < scenes.length) { const i = k++, t = clean(scenes[i].narr); if (!t) continue; let w = null; try { w = await opt.tts(t); } catch (e) { } if (w && w.length > 500) { const f = path.join(dir, `a${i}.${/mpeg|mp3/i.test(w.mime || '') ? 'mp3' : 'wav'}`); fs.writeFileSync(f, w); try { const d = await probe(bin, f); if (d > 0.3) { aud[i] = f; dur[i] = d; narrated++; } } catch (e) { } } done++; prog(0.05 + 0.3 * done / scenes.length, 'voice'); } }; await Promise.all([worker(), worker(), worker()]); }
    /* 2) የትዕይንት ርዝማኔ፤ ከ cap በላይ ከሆነ ማፍጠን ከዚያ መቀነስ */
    const want = i => Math.max(2.5, Math.min(14, Number(scenes[i].dur) || 5)), D = () => scenes.map((s, i) => (aud[i] ? Math.max(2.5, dur[i] + 1.0) : want(i)));
    let ds = D(), tot = ds.reduce((a, b) => a + b, 0), tempo = 1;
    if (tot > cap && narrated) { tempo = Math.min(1.3, (tot - 0) / cap); ds = scenes.map((s, i) => (aud[i] ? Math.max(2.5, dur[i] / tempo + 0.8) : want(i))); tot = ds.reduce((a, b) => a + b, 0); }
    while (tot > cap && scenes.length > 2) { let j = Math.floor(scenes.length / 2); for (let q = 1; q < scenes.length - 1; q++) if (scenes[q].type !== 'offer' && scenes[q].type !== 'list') { j = q; break; } tot -= ds[j]; scenes.splice(j, 1); aud.splice(j, 1); dur.splice(j, 1); ds.splice(j, 1); }
    /* 3) እያንዳንዱን ትዕይንት መሥራት */
    const theme = Number.isInteger(plan.theme) ? plan.theme : 0, parts = []; let T0 = 0;
    for (let i = 0; i < scenes.length; i++) {
      const sc = scenes[i], D1 = ds[i], img = Number.isInteger(sc.img) && sc.img >= 0 && sc.img < photos.length ? photos[sc.img] : null, b = buildScene(sc, i, { W, H, D: D1, T0, TT: tot, theme, photo: img, font, tmp: dir, brand: clean(plan.brand) });
      const out = path.join(dir, `s${i}.mp4`), args = ['-y', '-hide_banner', '-loglevel', 'error', ...b.inputs];
      if (aud[i]) args.push('-i', aud[i]); else args.push('-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo');
      args.push('-filter_complex', b.fc + ';' + `[1:a]${aud[i] ? `atempo=${tempo.toFixed(3)},adelay=400|400,` : ''}apad=whole_dur=${D1.toFixed(2)},atrim=0:${D1.toFixed(2)},aresample=44100,aformat=channel_layouts=stereo[a]`, '-map', '[v]', '-map', '[a]', '-t', D1.toFixed(2), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '27', '-r', String(FPS), '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '96k', '-ar', '44100', '-ac', '2', out);
      await run(bin, args); parts.push(out); T0 += D1; prog(0.35 + 0.55 * (i + 1) / scenes.length, 'scene');
    }
    const list = path.join(dir, 'l.txt'); fs.writeFileSync(list, parts.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n')); const joined = path.join(dir, 'j.mp4');
    await run(bin, ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', joined]);
    /* 4) ሙዚቃ */
    const final = path.join(dir, 'final.mp4'); let music = opt.musicFile || null, style = plan.music;
    if (!music && style !== 'none') { try { music = await makeMusic(bin, dir, style === 'energetic' ? 'energetic' : 'calm'); } catch (e) { music = null; } }
    if (music) { const vol = narrated ? 0.11 : 0.4; await run(bin, ['-y', '-hide_banner', '-loglevel', 'error', '-i', joined, '-stream_loop', '-1', '-i', music, '-filter_complex', `[1:a]volume=${vol},afade=t=out:st=${Math.max(0, tot - 2).toFixed(2)}:d=2[m];[0:a][m]amix=inputs=2:duration=first:dropout_transition=0:normalize=0[a]`, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '112k', '-movflags', '+faststart', '-shortest', final]); }
    else await run(bin, ['-y', '-hide_banner', '-loglevel', 'error', '-i', joined, '-c', 'copy', '-movflags', '+faststart', final]);
    prog(1, 'done'); const buf = fs.readFileSync(final); return { buf, dur: tot, w: W, h: H, narrated, scenes: scenes.length, music: !!music };
  } finally { try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { } }
}
module.exports = { render, available, makeMusic, SIZES, THEMES, clean, MAXSEC };
