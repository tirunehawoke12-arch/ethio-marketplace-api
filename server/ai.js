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
  const lim = { chat: num(env.AI_CHAT_DAY, 30), pages: num(env.AI_DOC_PAGES_DAY, 60), batch: Math.max(1, num(env.AI_DOC_BATCH, 5)) }, retryMs = num(env.AI_RETRY_MS, 15000), timeoutMs = num(env.AI_TIMEOUT_MS, 60000);
  const hist = new Map(), used = new Map(), sleep = ms => new Promise(r => setTimeout(r, ms));
  const timer = setInterval(() => { const t = now(); for (const [k, v] of hist) if (t - v.ts > HIST_TTL) hist.delete(k); for (const [k, v] of used) if (v.d !== dayKey(t)) used.delete(k); }, 10 * 60e3); timer.unref && timer.unref();

  const fail = (r, j) => { const code = r.status === 429 || r.status === 503 ? 'ai_busy' : r.status === 413 ? 'ai_too_big' : r.status === 400 && j && /page|pdf|large|size|document/i.test(JSON.stringify(j)) ? 'ai_bad_doc' : 'ai_failed'; const m = j && (j.error && (j.error.message || j.error.status) || j.message); const err = new Error(code); err.status = r.status; err.detail = String(m || '').slice(0, 300); console.warn('AI ' + prov + ' ' + r.status + ': ' + err.detail); return err; };
  /* ወደ አቅራቢው አንድ ጥያቄ፦ system + msgs [{role:'user'|'assistant', content:string}] + (አማራጭ) pdf Buffer ለመጨረሻው የተጠቃሚ መልእክት */
  async function once(mdl, { system, msgs, max, pdf, ground }, tmo) {
    let r, j = null; const ctl = typeof AbortController === 'function' ? new AbortController() : null, tm = ctl && setTimeout(() => ctl.abort(), tmo);
    try {
      if (prov === 'gemini') {
        const contents = msgs.map((m, i) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [...(pdf && i === msgs.length - 1 ? [{ inlineData: { mimeType: 'application/pdf', data: Buffer.from(pdf).toString('base64') } }] : []), { text: m.content }] }));
        r = await fetchImpl(`${base}/v1beta/models/${mdl}:generateContent`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': gkey }, signal: ctl && ctl.signal, body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents, generationConfig: { maxOutputTokens: max }, ...(ground && prov === 'gemini' ? { tools: [{ google_search: {} }] } : {}) }) });
      } else {
        const messages = msgs.map((m, i) => (pdf && i === msgs.length - 1 ? { role: 'user', content: [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: Buffer.from(pdf).toString('base64') }, cache_control: { type: 'ephemeral' } }, { type: 'text', text: m.content }] } : m));
        r = await fetchImpl(base + '/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': akey, 'anthropic-version': API_VER }, signal: ctl && ctl.signal, body: JSON.stringify({ model: mdl, max_tokens: max, system, messages }) });
      }
      try { j = await r.json(); } catch (e) { }
    } catch (e) { const n = new Error(e && e.name === 'AbortError' ? 'ai_timeout' : 'ai_network'); n.detail = String(e && e.message || e).slice(0, 200); console.warn('AI ' + prov + ' ' + mdl + ' ' + n.message + ': ' + n.detail); throw n; } finally { clearTimeout(tm); }
    if (!r.ok && ground && r.status === 400) return once(mdl, { system, msgs, max, pdf }, tmo);          // «ፍለጋ» መሣሪያው ካልተፈቀደ ያለሱ ይሞክራል
    if (r.ok && ground && prov === 'gemini') { const gm = j && j.candidates && j.candidates[0] && j.candidates[0].groundingMetadata, seen = new Set(), src = ((gm && gm.groundingChunks) || []).map(c => c.web).filter(w => w && w.uri && !seen.has(w.uri) && seen.add(w.uri)).slice(0, 4); const body = ((j.candidates[0].content && j.candidates[0].content.parts) || []).map(p => p.text || '').join('').trim(); if (src.length && body) return body + '\n\n📚 ምንጮች፦\n' + src.map(w => `• ${w.title || w.uri} — ${w.uri}`).join('\n'); }
    if (r.ok) return ((prov === 'gemini' ? (j && j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts || []).map(p => p.text || '').join('') : (j && Array.isArray(j.content) ? j.content.filter(c => c.type === 'text').map(c => c.text).join('') : '')) || '').trim();
    const e = fail(r, j); e.model = mdl; console.warn('AI ' + prov + ' ' + mdl + ' ' + r.status + ': ' + e.detail); throw e;
  }
  /* ሞዴል ሲሞላ (503/429)፣ ሲዘገይ ወይም ሲጠፋ (404) ወደሚቀጥለው ሞዴል ይሸጋገራል፤ የሰራው ለ10 ደቂቃ ይታወሳል */
  const good = {}, dead = new Map();          // dead = 404 (ሞዴሉ የለም/ለአዲስ ተጠቃሚ ተዘግቷል) → ለ6 ሰዓት አይሞከርም
  async function ask(o) {
    const kind = o.pdf ? 'doc' : 'chat', all = prov === 'gemini' ? models[kind] : [model], alive = all.filter(m => !(dead.get(m) > now())), list = alive.length ? alive : all; let last = null, lastGood = null;
    const start = good[kind] && now() - good[kind].t < 10 * 60e3 ? Math.max(0, list.indexOf(good[kind].m)) : 0;
    for (let n = 0; n < list.length; n++) {
      const m = list[(start + n) % list.length];
      try { const out = await once(m, o, kind === 'doc' ? timeoutMs : Math.min(timeoutMs, 30000)); good[kind] = { m, t: now() }; return out; }
      catch (e) { last = e; if (e.status === 404) dead.set(m, now() + 6 * 3600e3); else lastGood = e; if (!(e.message === 'ai_busy' || e.message === 'ai_timeout' || e.message === 'ai_network' || e.status === 404 || (e.status === 400 && /model/i.test(e.detail || '')))) throw e; }
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

  async function chat(id, text, system) {
    const h = hist.get(id) || { ts: now(), m: [] }; if (now() - h.ts > HIST_TTL) h.m = [];
    h.m.push({ role: 'user', content: String(text).slice(0, 6000) }); const msgs = h.m.slice(-HIST_TURNS * 2);
    while (msgs.length && msgs[0].role !== 'user') msgs.shift();
    const out = await ask({ system: system || SYS, msgs, max: 1500, ground: env.AI_GROUNDING !== '0' }); h.m.push({ role: 'assistant', content: out || '…' }); h.m = h.m.slice(-HIST_TURNS * 2); h.ts = now(); hist.set(id, h); return out;
  }
  const reset = id => hist.delete(id), usage = uid => { const u = used.get(uid); return u && u.d === dayKey(now()) ? { chat: u.chat, pages: u.pages } : { chat: 0, pages: 0 }; };

  /* PDF — የገጽ N ብቻ ትርጉም (ሰነዱ cache ስለሚደረግ ተከታታይ ገጾች ርካሽ ናቸው) */
  const BOTH = '\n\nውጤቱን በትክክል በዚህ ቅርጸት ስጥ፦ መጀመሪያ [[EN]] የሚል መስመር፣ ከዚያ የገጹ ዋና የእንግሊዝኛ ጽሑፍ እንዳለ (ትክክለኛ ቅጂ፣ በአንቀጽ አወቃቀሩ)፣ ከዚያ [[AM]] የሚል መስመር፣ ከዚያ የአማርኛ ትርጉሙ። ገጹ ባዶ ከሆነ [[EN]] እና [[AM]] ከዚያ ባዶ ይሁኑ።';
  async function pdfPage(buf, n, total, both) {
    if (prov === 'gemini' && Buffer.from(buf).length > 14 * 1048576) { const e = new Error('ai_too_big'); throw e; }          // inline ገደብ ~20MB (base64 +33%)
    const out = await ask({ system: TR + (both ? BOTH : ''), max: both ? 9000 : 6000, pdf: buf, msgs: [{ role: 'user', content: `የዚህን PDF ገጽ ${n} ብቻ ተርጉም${total ? ` (ከ${total} ገጾች)` : ''}። ሰነዱ ከ${n} ገጽ ያነሰ ከሆነ በትክክል [[END]] ብቻ ጻፍ።` }] });
    return /^\s*\[\[END\]\]\s*$/.test(out) ? null : out;
  }
  /* PPTX — የስላይድ ትርጉም፤ prev = የቀደመው ስላይድ ርዕስ (አውድ) */
  async function slideTr(deckTitle, s, i, total) {
    return ask({ system: TR, max: 4000, msgs: [{ role: 'user', content: `ሰነድ፦ «${deckTitle}» (ስላይድ ${i + 1}/${total})። ይህን ስላይድ ተርጉም፦\n\n${slideText(s, i)}` }] });
  }
  return { enabled: !!prov, provider: prov, model, lim, chat, reset, take, refund, usage, pdfPage, slideTr };
}
let inst = null; const shared = () => inst || (inst = create());
module.exports = { create, shared, countPdfPages, chunkText, slideText, SYS, TR };
