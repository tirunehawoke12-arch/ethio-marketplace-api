'use strict';
/* ===== AI ረዳት (Claude) — ንግግር + ሰነድ (PDF/PPTX) ገጽ በገጽ ወደ አማርኛ መተርጎም =====
   ቅንብር (Render → Environment፤ ቁልፉን በውይይት አይላኩ)፦
     ANTHROPIC_API_KEY   — Claude (የሚከፈልበት)   ወይም   GEMINI_API_KEY — Google Gemini (ነጻ ደረጃ አለው፤ ካርድ አይጠይቅም)
     AI_MODEL / GEMINI_MODEL — ነባሪ claude-sonnet-5-5 / gemini-flash-latest
     ሁለቱም ካሉ Claude ይመረጣል፤ ሁለቱም ከሌሉ AI ጠፍቷል
     AI_CHAT_DAY         — በቀን ለአንድ ተጠቃሚ የንግግር መልእክት ገደብ (ነባሪ 30፤ አድሚን ያልተገደበ)
     AI_DOC_PAGES_DAY    — በቀን ለአንድ ተጠቃሚ የሚተረጎም ገጽ (ነባሪ 60)
     AI_DOC_BATCH        — «ቀጥል» ሳይጫኑ በአንድ ጊዜ የሚተረጎም ገጽ (ነባሪ 5)
   ወጪ በ API ቁልፍ ባለቤት (እርስዎ) ይከፈላል፤ ገደቦቹ ለዚያ ነው። */
const SYS = `አንተ «ኢትዮ ዲጂታል ማርኬት» የተባለው የኢትዮጵያ የመስመር ላይ ገበያ እና የተማሪዎች መማሪያ ቦት ውስጥ ያለህ ወዳጃዊ AI ረዳት ነህ።
- ተጠቃሚው በጻፈበት ቋንቋ መልስ ይስጡ፤ ቋንቋው ካልተለየ በአማርኛ።
- አጭር፣ ግልጽ እና ትክክለኛ ሁን፤ ትምህርት፣ ትርጉም፣ ጽሑፍ፣ ሒሳብ፣ ንግድ፣ ሥራ ማመልከቻ እና አጠቃላይ ጥያቄዎችን መርዳት ትችላለህ።
- ስለ ገበያው ልዩ መረጃ (ዋጋ፣ ትዕዛዝ፣ ሱቅ) ከሌለህ አትፍጠር፤ ተጠቃሚውን ከታች ካለው ማውጫ እንዲጠቀም አመልክት።
- ለእውነታዊ መልሶች (ሳይንስ፣ ሕክምና፣ ሕግ፣ ታሪክ፣ ቁጥሮች፣ ዜና) መጨረሻ ላይ «📚 ምንጭ፦» ብለህ እውነተኛ ምንጮችን ጥቀስ (የመማሪያ መጽሐፍ፣ መመሪያ፣ ድርጅት ወይም ድረ-ገጽ ስም/አገናኝ)። የማታውቀውን ምንጭ ወይም አገናኝ በጭራሽ አትፍጠር፤ እርግጠኛ ካልሆንክ «ምንጭ፦ አጠቃላይ እውቀት — በታማኝ ምንጭ ያረጋግጡ» ብለህ ጻፍ። ከድረ-ገጹ ዕቃ/ሱቅ መረጃ ከሆነ የድረ-ገጹን አገናኝ ጥቀስ።
- Telegram ውስጥ ነው የምትመልሰው፤ markdown ሰንጠረዥ ወይም ከባድ ቅርጸት አትጠቀም፤ አጫጭር አንቀጾች እና ቀላል ዝርዝር ብቻ።`;
const TR = `አንተ ባለሙያ የእንግሊዝኛ→አማርኛ ተርጓሚ ነህ። ሰነዱን ትርጉም በትርጉም (አውዳዊ) ወደ ተፈጥሯዊ፣ ግልጽ አማርኛ ተርጉም፤ ቃል በቃል አይደለም።
ህጎች፦ (1) ትርጉሙን ብቻ ስጥ፤ መግቢያ ወይም ማብራሪያ አትጨምር። (2) የርዕስ፣ የነጥብ እና የአንቀጽ አወቃቀርን ጠብቅ። (3) ቁጥሮች፣ ቀመሮች፣ የሰዎች/ድርጅት ስሞች እና አህጽሮተ ቃላት እንዳሉ ይቀሩ፤ የቴክኒክ ቃል ሲተረጎም ለመጀመሪያ ጊዜ እንግሊዝኛውን በቅንፍ አብረህ ጻፍ፣ ለምሳሌ «የሕዋስ ሽፋን (cell membrane)»። (4) ሠንጠረዥ ከሆነ ረድፍ በረድፍ በቀላል መስመሮች (ዓምዶች በ « | »)። (5) ምስል/ሥዕላዊ መግለጫ ካለ በአጭሩ «[ምስል፦ …]» ብለህ ግለጽ፤ በውስጡ ጽሑፍ ካለ ተርጉመው። (6) ገጹ ቀድሞውኑ በአማርኛ ከሆነ እንዳለ ጻፈው። (7) ገጹ ባዶ ከሆነ «[ባዶ ገጽ]» ብቻ ጻፍ።`;
const HIST_TURNS = 8, HIST_TTL = 30 * 60e3, API_VER = '2023-06-01';
const dayKey = (t) => new Date(t + 3 * 3600e3).toISOString().slice(0, 10);

function countPdfPages(buf) {          // ያልተጨመቀ የገጽ ዕቃዎችን ይቆጥራል፤ 0 = አልታወቀም
  const s = Buffer.from(buf).toString('latin1'); const m = s.match(/\/Type\s*\/Page(?![A-Za-z])/g); return m ? m.length : 0;
}
function chunkText(text, n = 3600) {          // ለ Telegram ገደብ በአንቀጽ ወሰን ይቆርጣል
  const out = []; let cur = '';
  for (const para of String(text).split(/\n{2,}/)) {
    if ((cur + '\n\n' + para).length > n && cur) { out.push(cur); cur = ''; }
    let p = para; while (p.length > n) { let cut = p.lastIndexOf('\n', n); if (cut < n * 0.5) cut = p.lastIndexOf(' ', n); if (cut < n * 0.5) cut = n; out.push(p.slice(0, cut)); p = p.slice(cut).trimStart(); }
    cur = cur ? cur + '\n\n' + p : p;
  }
  if (cur.trim()) out.push(cur); return out;
}
function slideText(s, i) {          // የ pptx ስላይድ → ጽሑፍ
  const lines = [`ስላይድ ${i + 1}${s.title ? ' — ' + s.title : ''}`];
  for (const b of s.blocks || []) { if (b.k === 'h') lines.push('# ' + b.t); else if (b.k === 'p') lines.push(b.t); else if (b.k === 'li') lines.push('  '.repeat(b.l | 0) + '• ' + b.t); else if (b.k === 'tbl') for (const r of b.rows || []) lines.push(r.join(' | ')); else if (b.k === 'img') lines.push('[ምስል]' + (b.alt ? ': ' + b.alt : '')); }
  return lines.join('\n');
}

function create(env = process.env, fetchImpl = (...a) => fetch(...a), now = () => Date.now()) {
  const akey = env.ANTHROPIC_API_KEY || '', gkey = env.GEMINI_API_KEY || '', prov = akey ? 'claude' : gkey ? 'gemini' : '';
  const model = prov === 'gemini' ? (env.GEMINI_MODEL || 'gemini-flash-latest').split(',')[0].trim() : (env.AI_MODEL || 'claude-sonnet-5-5'), base = (prov === 'gemini' ? (env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com') : (env.ANTHROPIC_API_BASE || 'https://api.anthropic.com')).replace(/\/$/, '');
  const gl = String(env.GEMINI_MODEL || '').split(',').map(x => x.trim()).filter(Boolean), uniq = a => [...new Set(a)];
  const models = { chat: uniq([...gl, 'gemini-flash-lite-latest', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.6-flash']), doc: uniq([...gl, 'gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-flash-lite-latest']) };
  const num = (v, d) => { const n = Number(v); return Number.isFinite(n) && n >= 0 ? n : d; };
  const lim = { chat: num(env.AI_CHAT_DAY, 30), pages: num(env.AI_DOC_PAGES_DAY, 60), batch: Math.max(1, num(env.AI_DOC_BATCH, 12)), par: Math.max(1, Math.min(8, num(env.AI_DOC_PAR, 3))) }, retryMs = num(env.AI_RETRY_MS, 15000), timeoutMs = num(env.AI_TIMEOUT_MS, 60000), docTimeoutMs = num(env.AI_DOC_TIMEOUT_MS, 120000);
  const hist = new Map(), used = new Map(), sleep = ms => new Promise(r => setTimeout(r, ms));
  const timer = setInterval(() => { const t = now(); for (const [k, v] of hist) if (t - v.ts > HIST_TTL) hist.delete(k); for (const [k, v] of used) if (v.d !== dayKey(t)) used.delete(k); }, 10 * 60e3); timer.unref && timer.unref();

  const fail = (r, j) => { const code = r.status === 429 || r.status === 503 ? 'ai_busy' : r.status === 413 ? 'ai_too_big' : r.status === 400 && j && /page|pdf|large|size|document/i.test(JSON.stringify(j)) ? 'ai_bad_doc' : 'ai_failed'; const m = j && (j.error && (j.error.message || j.error.status) || j.message); const err = new Error(code); err.status = r.status; err.detail = String(m || '').slice(0, 300); console.warn('AI ' + prov + ' ' + r.status + ': ' + err.detail); return err; };
  /* ወደ አቅራቢው አንድ ጥያቄ፦ system + msgs [{role:'user'|'assistant', content:string}] + (አማራጭ) pdf Buffer ለመጨረሻው የተጠቃሚ መልእክት */
  async function once(mdl, { system, msgs, max, pdf, ground, media }, tmo) {
    if (media && media.mime === 'application/pdf' && !pdf) pdf = media.buf;
    let r, j = null; const ctl = typeof AbortController === 'function' ? new AbortController() : null, tm = ctl && setTimeout(() => ctl.abort(), tmo);
    try {
      if (prov === 'gemini') {
        const contents = msgs.map((m, i) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [...(pdf && i === msgs.length - 1 ? [{ inlineData: { mimeType: 'application/pdf', data: Buffer.from(pdf).toString('base64') } }] : media && media.mime !== 'application/pdf' && i === msgs.length - 1 ? [{ inlineData: { mimeType: media.mime, data: Buffer.from(media.buf).toString('base64') } }] : []), { text: m.content }] }));
        r = await fetchImpl(`${base}/v1beta/models/${mdl}:generateContent`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': gkey }, signal: ctl && ctl.signal, body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents, generationConfig: { maxOutputTokens: max }, ...(ground && prov === 'gemini' ? { tools: [{ google_search: {} }] } : {}) }) });
      } else {
        const messages = msgs.map((m, i) => (media && media.mime !== 'application/pdf' && i === msgs.length - 1 ? { role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: media.mime, data: Buffer.from(media.buf).toString('base64') } }, { type: 'text', text: m.content }] } : pdf && i === msgs.length - 1 ? { role: 'user', content: [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: Buffer.from(pdf).toString('base64') }, cache_control: { type: 'ephemeral' } }, { type: 'text', text: m.content }] } : m));
        r = await fetchImpl(base + '/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': akey, 'anthropic-version': API_VER }, signal: ctl && ctl.signal, body: JSON.stringify({ model: mdl, max_tokens: max, system, messages }) });
      }
      try { j = await r.json(); } catch (e) { }
    } catch (e) { const n = new Error(e && e.name === 'AbortError' ? 'ai_timeout' : 'ai_network'); n.detail = String(e && e.message || e).slice(0, 200); console.warn('AI ' + prov + ' ' + mdl + ' ' + n.message + ': ' + n.detail); throw n; } finally { clearTimeout(tm); }
    if (!r.ok && ground && [400, 403, 429].includes(r.status)) return once(mdl, { system, msgs, max, pdf }, tmo);          // «ፍለጋ» መሣሪያው ካልተፈቀደ ያለሱ ይሞክራል
    if (r.ok && ground && prov === 'gemini') { const gm = j && j.candidates && j.candidates[0] && j.candidates[0].groundingMetadata, seen = new Set(), src = ((gm && gm.groundingChunks) || []).map(c => c.web).filter(w => w && w.uri && !seen.has(w.uri) && seen.add(w.uri)).slice(0, 4); const body = ((j.candidates[0].content && j.candidates[0].content.parts) || []).map(p => p.text || '').join('').trim(); if (src.length && body) return body + '\n\n📚 ምንጮች፦\n' + src.map(w => `• ${w.title || w.uri} — ${w.uri}`).join('\n'); }
    if (r.ok) return ((prov === 'gemini' ? (j && j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts || []).map(p => p.text || '').join('') : (j && Array.isArray(j.content) ? j.content.filter(c => c.type === 'text').map(c => c.text).join('') : '')) || '').trim();
    const e = fail(r, j); e.model = mdl; console.warn('AI ' + prov + ' ' + mdl + ' ' + r.status + ': ' + e.detail); throw e;
  }
  /* ሞዴል ሲሞላ (503/429)፣ ሲዘገይ ወይም ሲጠፋ (404) ወደሚቀጥለው ሞዴል ይሸጋገራል፤ የሰራው ለ10 ደቂቃ ይታወሳል */
  const good = {}, dead = new Map();          // dead = 404 (ሞዴሉ የለም/ለአዲስ ተጠቃሚ ተዘግቷል) → ለ6 ሰዓት አይሞከርም
  async function ask(o) {
    const kind = o.pdf || o.media ? 'doc' : 'chat', all = prov === 'gemini' ? models[kind] : [model], alive = all.filter(m => !(dead.get(m) > now())), list = alive.length ? alive : all; let last = null, lastGood = null;
    const start = good[kind] && now() - good[kind].t < 10 * 60e3 ? Math.max(0, list.indexOf(good[kind].m)) : 0;
    let tmo = 0;
    for (let n = 0; n < list.length; n++) {
      const m = list[(start + n) % list.length];
      try { const out = await once(m, o, kind === 'doc' ? docTimeoutMs : Math.min(timeoutMs, 30000)); good[kind] = { m, t: now() }; return out; }
      catch (e) { last = e; if (e.message === 'ai_timeout' && kind === 'doc' && ++tmo >= 2) throw e; if (e.status === 404) dead.set(m, now() + 6 * 3600e3); else lastGood = e; if (!(e.message === 'ai_busy' || e.message === 'ai_timeout' || e.message === 'ai_network' || e.status === 404 || (e.status === 400 && /model/i.test(e.detail || '')))) throw e; }
    }
    const fin = lastGood || last;          // ከ404 ይልቅ ትክክለኛውን (ሥራ በዝቶ/ጊዜ) ስህተት ያሳያል
    if (fin && fin.message === 'ai_busy' && prov === 'gemini' && retryMs > 0 && o._r !== 1) { await sleep(retryMs); return ask({ ...o, _r: 1 }); }          // ሁሉም ሞዴል ሲሞላ አንድ ጊዜ ተጠብቆ እንደገና
    throw fin;
  }
  /* ገደብ፦ kind = 'chat' | 'pages'፤ ok=false ከሆነ left=0 */
  function take(uid, kind, n = 1, admin = false, capOverride) {
    if (admin) return { ok: true, left: Infinity }; const t = dayKey(now()), u = used.get(uid) && used.get(uid).d === t ? used.get(uid) : { d: t, chat: 0, pages: 0 }; used.set(uid, u);
    const cap = capOverride == null ? lim[kind] : capOverride, left = cap - u[kind]; if (left < n) return { ok: false, left: Math.max(0, left) }; u[kind] += n; return { ok: true, left: cap - u[kind] };
  }
  const refund = (uid, kind, n = 1) => { const u = used.get(uid); if (u) u[kind] = Math.max(0, u[kind] - n); };

  async function chat(id, text, system, media) {
    const h = hist.get(id) || { ts: now(), m: [] }; if (now() - h.ts > HIST_TTL) h.m = [];
    h.m.push({ role: 'user', content: String(text).slice(0, 6000) }); const msgs = h.m.slice(-HIST_TURNS * 2);
    while (msgs.length && msgs[0].role !== 'user') msgs.shift();
    const out = await ask({ system: system || SYS, msgs, max: media ? 3000 : 1500, media, ground: !media && env.AI_GROUNDING === '1' }); if (media) h.m[h.m.length - 1].content = '[📎 ' + (media.mime === 'application/pdf' ? 'PDF' : 'ፎቶ') + '] ' + h.m[h.m.length - 1].content; h.m.push({ role: 'assistant', content: out || '…' }); h.m = h.m.slice(-HIST_TURNS * 2); h.ts = now(); hist.set(id, h); return out;
  }
  const reset = id => hist.delete(id), usage = uid => { const u = used.get(uid); return u && u.d === dayKey(now()) ? { chat: u.chat, pages: u.pages } : { chat: 0, pages: 0 }; };

  /* PDF — የገጽ N ብቻ ትርጉም (ሰነዱ cache ስለሚደረግ ተከታታይ ገጾች ርካሽ ናቸው) */
  /* አውድ፦ ርዕስ፣ ቀዳሚ/ቀጣይ ገጽ፣ ቀድሞ የተተረጎሙ ቋሚ ቃላት — ትርጉሙ ከሰነዱ ጋር ተያያዥ እና ወጥ እንዲሆን */
  const ctxText = c => !c ? '' : '\n\n[የሰነዱ አውድ — ትርጉሙን ከሰነዱ አጠቃላይ ርዕስ፣ ዓላማ እና ከአጎራባች ገጾች ጋር ተያያዥ አድርግ፤ ይህን አውድ አትተርጉም]' + (c.title ? `\nርዕስ፦ ${c.title}` : '') + (c.domain ? `\n[የሙያ መስክ እና የቃላት መመሪያ — ትርጉሙ ሙሉ በሙሉ ከዚህ መስክ ባለሙያዎች አጠቃቀም ጋር ይስማማ፤ በዚህ መስክ የተለመደ የአማርኛ የትምህርት/ሙያ ቃላትን ተጠቀም]\n${String(c.domain).slice(0, 1800)}` : '') + (c.outline ? `\nየሰነዱ ማውጫ፦ ${c.outline}` : '') + (c.prev ? `\n[ቀዳሚ ገጽ (ዋናው)]\n${String(c.prev).slice(0, 700)}` : '') + (c.next ? `\n[ቀጣይ ገጽ (ዋናው)]\n${String(c.next).slice(0, 700)}` : '') + (c.gloss && c.gloss.length ? '\n[ቀድሞ የተተረጎሙ ቃላት — ሁልጊዜ በተመሳሳይ ተጠቀም]\n' + c.gloss.slice(0, 40).map(g => `• ${g[0]} = ${g[1]}`).join('\n') : '');
  const BOTH = '\n\nውጤቱን በትክክል በዚህ ቅርጸት ስጥ፦ መጀመሪያ [[EN]] የሚል መስመር፣ ከዚያ የገጹ ዋና የእንግሊዝኛ ጽሑፍ እንዳለ (ትክክለኛ ቅጂ፣ በአንቀጽ አወቃቀሩ)፣ ከዚያ [[AM]] የሚል መስመር፣ ከዚያ የአማርኛ ትርጉሙ። ገጹ ባዶ ከሆነ [[EN]] እና [[AM]] ከዚያ ባዶ ይሁኑ።';
  async function pdfPage(buf, n, total, both, cx, real) {
    if (prov === 'gemini' && Buffer.from(buf).length > 14 * 1048576) { const e = new Error('ai_too_big'); throw e; }          // inline ገደብ ~20MB (base64 +33%)
    const out = await ask({ system: TR + (both ? BOTH : '') + ctxText(cx) + (real ? '' : '\nሙሉውን ሰነድ ለአውድ አንብብ፤ ግን የተጠየቀውን ገጽ ብቻ ተርጉም።'), max: both ? 8000 : 6000, pdf: buf, msgs: [{ role: 'user', content: real ? `ይህ PDF የአንድ ገጽ ብቻ ነው — ይህ የሰነዱ ገጽ ${real}${total ? ` (ከ${total})` : ''} ነው። ሙሉውን ተርጉም።` : `የዚህን PDF ገጽ ${n} ብቻ ተርጉም${total ? ` (ከ${total} ገጾች)` : ''}። ሰነዱ ከ${n} ገጽ ያነሰ ከሆነ በትክክል [[END]] ብቻ ጻፍ።` }] });
    return /^\s*\[\[END\]\]\s*$/.test(out) ? null : out;
  }
  /* የሰነዱን የሙያ መስክ አንድ ጊዜ ይለያል (ሕክምና፣ ኬሚስትሪ፣ ሕግ…) + ዋና ቃላት ከተመረጠ አማርኛ ጋር → ሁሉም ገጾች በአንድ ወጥ የሙያ ቃላት ይተረጎማሉ */
  async function domainBrief(title, src) {
    const sys = `የሰነድ ተንታኝ ነህ። ሰነዱን በመመልከት ለተርጓሚዎች አጭር መመሪያ ጻፍ (ከ170 ቃላት አይበልጥ፣ አማርኛ)፦\nመስክ፦ <ዋናው መስክ እና ንዑስ መስክ፣ ለምሳሌ ሕክምና — የውስጥ ደዌ>\nአንባቢ፦ <ተማሪ/ባለሙያ/ሕዝብ>\nየትርጉም ዘይቤ፦ <በመስኩ የተለመደ የአማርኛ የመማሪያ መጽሐፍ ቃላት፤ ምን ይቆይ (የላቲን/የመድኃኒት/የውህድ ስሞች፣ ቀመሮች፣ ክፍሎች፣ አህጽሮተ ቃላት)>\nቁልፍ ቃላት፦ <ከሰነዱ ከ12 እስከ 25 ዋና የእንግሊዝኛ ቃላት = የተመረጠ ትክክለኛ አማርኛ፣ እያንዳንዱ በአዲስ መስመር «• english = አማርኛ»>\nሌላ ምንም አትጨምር።`;
    const msg = `የሰነዱ ርዕስ፦ «${title}»` + (src && src.text ? `\n\n[የሰነዱ ናሙና]\n${String(src.text).slice(0, 6000)}` : '\n\nሰነዱን ተመልከት።');
    const out = await ask({ system: sys, max: 900, ...(src && src.pdf ? { pdf: src.pdf } : {}), msgs: [{ role: 'user', content: msg }] }); return String(out || '').trim();
  }
  /* 🧑‍🏫 ሰሌዳ፦ የአንድ ገጽ/ስላይድ ሙሉ ይዘት (ምንም ሳይዘለል) መስመር በመስመር + የእያንዳንዱ መስመር የመምህር ማብራሪያ — JSON */
  const BOARD_SYS = `አንተ ትዕግሥተኛ፣ ብቁ የኢትዮጵያ መምህር ነህ። ለተማሪዎች አንድን የፋይል ገጽ/ስላይድ በሰሌዳ ላይ ልትለጥፍና መስመር በመስመር ልታስረዳ ነው።
ከገጹ ሙሉ ይዘት (ርዕስ፣ እያንዳንዱ ነጥብ/መስመር፣ ሠንጠረዥ ረድፍ፣ ቀመር፣ የሥዕል ጽሑፍ) ምንም ሳትዘልና ሳታሳጥር ሁሉንም አካትት።
ውጤቱን በዚህ JSON ቅርጸት ብቻ ስጥ (ከJSON ውጪ ምንም ጽሑፍ ወይም \`\`\` አትጨምር)፦
{"title":"የገጹ ርዕስ","lines":[{"k":"title|text|bullet|formula|note","t":"መስመሩ በገጹ ላይ እንዳለ (የገጹ ቋንቋ፣ አጭር)","am":"ገጹ እንግሊዝኛ ከሆነ የአማርኛ ትርጉሙ (አማርኛ ከሆነ ባዶ)","say":"ይህን መስመር እንደ መምህር የምታብራራበት ሙሉ ንግግር (3-6 አረፍተ ነገሮች፤ ትርጉም፣ ምክንያት፣ ምሳሌ)"}],"draw":[{"k":"rect","x":10,"y":8,"w":30,"h":14},{"k":"circle","x":70,"y":15,"r":8},{"k":"arrow","x1":40,"y1":15,"x2":62,"y2":15},{"k":"label","x":12,"y":18,"t":"ጽሑፍ"}]}
ህጎች፦ lines እስከ 28፤ በገጹ ቅደም ተከተል፤ say በቀላል ተፈጥሯዊ አማርኛ (የቴክኒክ ቃል እንግሊዝኛው በቅንፍ)፣ ለድምፅ ምቹ ሙሉ አረፍተ ነገሮች፣ ምልክት/ሰንጠረዥ አትጠቀም። draw አማራጭ ነው (ገጹ ሥዕላዊ መግለጫ ሲኖረው ወይም ለማብራራት ሲጠቅም፤ ሸራው 100×56)። ገጹ ባዶ ከሆነ lines: [] ስጥ።`;
  async function boardPage(title, n, total, src, domain) {
    const sys = BOARD_SYS + (domain ? ctxText({ domain }) : ''); const head = `ሰነድ፦ «${title}» — ገጽ/ስላይድ ${n}${total ? ' ከ' + total : ''}።`;
    let o;
    if (src.pdfBuf) o = { pdf: src.pdfBuf, msgs: [{ role: 'user', content: head + (src.real ? ' ይህ PDF የዚህ አንድ ገጽ ብቻ ነው፤ ሙሉውን አስተምር።' : ` የዚህን PDF ገጽ ${n} ብቻ አስተምር።`) }] };
    else if (src.media) o = { media: src.media, msgs: [{ role: 'user', content: head + ' ይህን ፎቶ/ምስል አስተምር።' }] };
    else o = { msgs: [{ role: 'user', content: head + '\n\n[የገጹ ጽሑፍ]\n' + String(src.text || '').slice(0, 12000) }] };
    const out = await ask({ system: sys, max: 8000, ...o }); const a = out.indexOf('{'), z = out.lastIndexOf('}'); if (a < 0 || z < a) throw new Error('board_parse'); return JSON.parse(out.slice(a, z + 1));
  }
  async function boardAsk(title, page, q) {
    const ctx = page ? [page.title, ...(page.lines || []).map(l => l.t + (l.am ? ' — ' + l.am : ''))].join('\n').slice(0, 5000) : '';
    return ask({ system: 'አንተ ትዕግሥተኛ የኢትዮጵያ መምህር ነህ። ተማሪ በክፍል ውስጥ ጥያቄ ጠየቀህ፤ በቀላል አማርኛ ከ6 አረፍተ ነገር ባልበለጠ፣ ምሳሌ ጨምረህ መልስ፤ ከዚያ «ገባዎት?» በል። ምልክት/ሰንጠረዥ አትጠቀም።', max: 900, msgs: [{ role: 'user', content: `ሰነድ፦ «${title}»\nአሁን በሰሌዳ ላይ ያለው ገጽ፦\n${ctx}\n\nየተማሪው ጥያቄ፦ ${String(q).slice(0, 600)}` }] });
  }
  /* PPTX — የስላይድ ትርጉም፤ prev = የቀደመው ስላይድ ርዕስ (አውድ) */
  async function slideTr(deckTitle, s, i, total, cx) {
    return ask({ system: TR + ctxText({ title: deckTitle, ...cx }), max: 4000, msgs: [{ role: 'user', content: `ሰነድ፦ «${deckTitle}» (ስላይድ ${i + 1}/${total})። ይህን ስላይድ ተርጉም፦\n\n${slideText(s, i)}` }] });
  }
  /* ድምፅ → ጽሑፍ (Gemini ብቻ፤ ኦዲዮ በቀጥታ ይነበባል) */
  async function transcribe(buf, mime) {
    if (prov !== 'gemini') { const e = new Error('ai_no_audio'); throw e; }
    const out = await ask({ system: 'አንተ ትክክለኛ የድምፅ ጽሑፍ ቀያሪ ነህ።', max: 1500, media: { mime: mime || 'audio/ogg', buf }, msgs: [{ role: 'user', content: 'ይህን ድምፅ ቃል በቃል ወደ ጽሑፍ ቀይር፤ በተነገረበት ቋንቋ (አማርኛ ከሆነ በግዕዝ ፊደል፣ እንግሊዝኛ ከሆነ በእንግሊዝኛ)። ጽሑፉን ብቻ ስጥ፤ ምንም ማብራሪያ አትጨምር። ድምፁ ባዶ ወይም የማይሰማ ከሆነ በትክክል [[EMPTY]] ብቻ ጻፍ።' }] });
    return /^\s*\[\[EMPTY\]\]\s*$/.test(out) || !out.trim() ? '' : out.trim();
  }
  /* ጽሑፍ → ድምፅ (Gemini TTS፤ PCM 24kHz mono 16-bit)፤ አይገኝ ከሆነ null */
  async function speak(text) {
    if (prov !== 'gemini' || !text) return null; const list = String(env.AI_TTS_MODEL || 'gemini-2.5-flash-preview-tts,gemini-3.1-flash-tts-preview,gemini-2.5-pro-preview-tts').split(',').map(x => x.trim()).filter(Boolean), voice = env.AI_TTS_VOICE || 'Kore';
    for (const mdl of list) {
      if (dead.get('tts:' + mdl) > now()) continue;
      try {
        const r = await fetchImpl(`${base}/v1beta/models/${mdl}:generateContent`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': gkey }, body: JSON.stringify({ contents: [{ parts: [{ text: String(text).slice(0, 1200) }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } } }) });
        const j = await r.json().catch(() => null); if (!r.ok) { if (r.status === 404 || r.status === 400 || r.status === 403) dead.set('tts:' + mdl, now() + 6 * 3600e3); continue; }
        const part = j && j.candidates && j.candidates[0] && j.candidates[0].content && (j.candidates[0].content.parts || []).find(p => p.inlineData && p.inlineData.data); if (!part) continue;
        const m = /rate=(\d+)/.exec(part.inlineData.mimeType || ''); return { pcm: Buffer.from(part.inlineData.data, 'base64'), rate: m ? +m[1] : 24000 };
      } catch (e) { /* ቀጣዩን ሞዴል ይሞክራል */ }
    }
    return null;
  }
  return { enabled: !!prov, provider: prov, model, lim, chat, reset, take, refund, usage, pdfPage, slideTr, domainBrief, boardPage, boardAsk, transcribe, speak };
}
let inst = null; const shared = () => inst || (inst = create());
module.exports = { create, shared, countPdfPages, chunkText, slideText, SYS, TR };
