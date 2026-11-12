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
/* ሠንጠረዥ፣ ቁጥሮች እና ምልክቶች በትክክል ለማንበብ (ለፋይል/ፎቶ ጥያቄዎች እና ለትርጉም) */
const ACC = `\n\n[ትክክለኛ የንባብ ህግ] ሠንጠረዥ ካለ ረድፍ በረድፍ ሁሉንም ሕዋስ (የተዋሃዱ ሕዋሳትን ጭምር) በትክክል አንብብ፤ የአምድ ርዕሶችን ከእሴቶቹ ጋር አዛምድ። ቁጥሮችን፣ አስርዮሽ ነጥብ/ኮማ፣ አሃዶችን (kg, mm, %, °C, ETB…)፣ ምልክቶችን (± ≤ ≥ ≠ ≈ × ÷ √ ∑ ∫ π α β Δ µ ‰ → ←)፣ ንዑስ/ላዕላይ ጽሑፍ (H₂O, x², 10⁶) እና የኬሚካል/የሂሳብ ቀመሮችን ፊደል በፊደል እንዳሉ ጠብቅ። ፈጽሞ አትገምት፣ አታጠጋጋ፣ አታስተካክል፤ የማይነበብ ወይም የማይታይ ከሆነ «[የማይነበብ]» ብለህ ጻፍ።`;
const SYS = `አንተ «ኢትዮ ዲጂታል ማርኬት» የተባለው የኢትዮጵያ የመስመር ላይ ገበያ እና የተማሪዎች መማሪያ ቦት ውስጥ ያለህ ወዳጃዊ AI ረዳት ነህ።
- ተጠቃሚው በጻፈበት ቋንቋ መልስ ይስጡ፤ ቋንቋው ካልተለየ በአማርኛ።
- አጭር፣ ግልጽ እና ትክክለኛ ሁን፤ ትምህርት፣ ትርጉም፣ ጽሑፍ፣ ሒሳብ፣ ንግድ፣ ሥራ ማመልከቻ እና አጠቃላይ ጥያቄዎችን መርዳት ትችላለህ።
- የእንግሊዝኛ ቃል/ጽሑፍ ሲተረጉሙ ወይም ትርጉሙ ሲጠየቅ፦ ቃሉን በአማርኛ ፊደል ብቻ አትጻፍ (ለምሳሌ «ትራኪዮስቶሚ» ብቻ ክልክል)፤ «ትራኪዮስቶሚ (tracheostomy) ማለት በአንገት ላይ ቀዳዳ ከፍቶ ለመተንፈስ የሚያስችል የቀዶ ሕክምና ነው» እንደሚባለው ምን ማለት እንደሆነ በቀላል አማርኛ ንገር። እርግጠኛ ካልሆንክ አትገምት።
- ስለ ገበያው ልዩ መረጃ (ዋጋ፣ ትዕዛዝ፣ ሱቅ) ከሌለህ አትፍጠር፤ ተጠቃሚውን ከታች ካለው ማውጫ እንዲጠቀም አመልክት።
- ለእውነታዊ መልሶች (ሳይንስ፣ ሕክምና፣ ሕግ፣ ታሪክ፣ ቁጥሮች፣ ዜና) መጨረሻ ላይ «📚 ምንጭ፦» ብለህ እውነተኛ ምንጮችን ጥቀስ (የመማሪያ መጽሐፍ፣ መመሪያ፣ ድርጅት ወይም ድረ-ገጽ ስም/አገናኝ)። የማታውቀውን ምንጭ ወይም አገናኝ በጭራሽ አትፍጠር፤ እርግጠኛ ካልሆንክ «ምንጭ፦ አጠቃላይ እውቀት — በታማኝ ምንጭ ያረጋግጡ» ብለህ ጻፍ። ከድረ-ገጹ ዕቃ/ሱቅ መረጃ ከሆነ የድረ-ገጹን አገናኝ ጥቀስ።
- ማንኛውንም ጥያቄ (አጠቃላይ እውቀት፣ ወቅታዊ/የዛሬ ጉዳይ ጨምሮ) ለመመለስ ሞክር። የዛሬ ወይም ወቅታዊ ጉዳይ (ዜና፣ ዋጋ፣ የአየር ሁኔታ፣ ውጤት፣ ሹመት) ከሆነ በፍለጋ ውጤት ብቻ መልስ፤ ፍለጋ ካልቻልክ በእርግጠኝነት እንደማታውቅ ተናገር እንጂ አትገምት፤ የቀን/ሰዓት ጥያቄ ከታች ካለው «አሁን» መረጃ መልስ።
- Telegram ውስጥ ነው የምትመልሰው፤ markdown ሰንጠረዥ ወይም ከባድ ቅርጸት አትጠቀም፤ አጫጭር አንቀጾች እና ቀላል ዝርዝር ብቻ።`;
const TR = `አንተ ባለሙያ የእንግሊዝኛ→አማርኛ ተርጓሚ ነህ። ሰነዱን ትርጉም በትርጉም (አውዳዊ) ወደ ተፈጥሯዊ፣ ግልጽ አማርኛ ተርጉም፤ ቃል በቃል አይደለም።
ህጎች፦ (1) ትርጉሙን ብቻ ስጥ፤ መግቢያ ወይም ማብራሪያ አትጨምር። (2) የርዕስ፣ የነጥብ እና የአንቀጽ አወቃቀርን ጠብቅ። (3) ቁጥሮች፣ ቀመሮች፣ የሰዎች/ድርጅት ስሞች እና አህጽሮተ ቃላት እንዳሉ ይቀሩ። የቴክኒክ/ሕክምና/ሳይንስ ቃል ሲገጥምህ እንግሊዝኛውን በአማርኛ ፊደል በድምፅ ብቻ አትጻፍ (ለምሳሌ «ትራኪዮስቶሚ» ብቻ ማለት ክልክል ነው)፤ ይልቁንም ትርጉሙን (ምን እንደሆነ) በአማርኛ ንገር። ለምሳሌ «tracheostomy» → «ትራኪዮስቶሚ (tracheostomy) ማለት በአንገት ፊት በኩል ወደ ንፋስ ቧንቧ ቀዳዳ ከፍቶ ለመተንፈስ የሚያስችል የቀዶ ሕክምና ነው»። ለመጀመሪያ ጊዜ ሲገኝ ትርጉሙን በአንድ አጭር ሐረግ ጨምር፤ ከዚያ በኋላ በአማርኛ ገላጭ ስም (ወይም አጭር ትርጉም) ተጠቀም። ትርጉሙን በእርግጠኝነት የማታውቀው ቃል ከሆነ «[የቃሉ ትርጉም አልተረጋገጠም]» ብለህ እንግሊዝኛውን በቅንፍ ብቻ ጻፍ፤ አትገምት። የታወቀ የአማርኛ አቻ ያለው ቃል (ምሳሌ cell membrane = የሕዋስ ሽፋን) በአቻው ተርጉምና እንግሊዝኛውን በቅንፍ ጻፍ። (4) ሠንጠረዥ ከሆነ ረድፍ በረድፍ በቀላል መስመሮች (ዓምዶች በ « | »)። (5) ምስል/ሥዕላዊ መግለጫ ካለ በአጭሩ «[ምስል፦ …]» ብለህ ግለጽ፤ በውስጡ ጽሑፍ ካለ ተርጉመው። (6) ገጹ ቀድሞውኑ በአማርኛ ከሆነ እንዳለ ጻፈው። (7) ሠንጠረዦችን ረድፍ በረድፍ ሁሉንም ሕዋስ በትክክል ተርጉም፤ ቁጥሮች፣ አሃዶች፣ ምልክቶች (± ≤ ≥ × ÷ √ ∑ π α β Δ °)፣ ቀመሮች እና ንዑስ/ላዕላይ ጽሑፍ ፈጽሞ አይለወጡ። (8) ገጹ ባዶ ከሆነ «[ባዶ ገጽ]» ብቻ ጻፍ።`;
const HIST_TURNS = Number(process.env.AI_HIST_TURNS) || 40, HIST_TTL = (Number(process.env.AI_HIST_DAYS) || 7) * 86400e3, API_VER = '2023-06-01';
const WD = ['እሑድ', 'ሰኞ', 'ማክሰኞ', 'ረቡዕ', 'ሐሙስ', 'ዓርብ', 'ቅዳሜ'], EM = ['መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት', 'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜ'];
function nowInfo(t) {          // አሁን፦ ዓ.ም (ኢትዮጵያ) + ግሪጎሪያን + ሰዓት (ኢትዮጵያ ሰዓት፣ UTC+3)
  const d = new Date(t + 3 * 3600e3), jdn = Math.floor((t + 3 * 3600e3) / 86400e3) + 2440588, r = (jdn - 1723856) % 1461, n = r % 365 + 365 * Math.floor(r / 1460), yr = 4 * Math.floor((jdn - 1723856) / 1461) + Math.floor(r / 365) - Math.floor(r / 1460), mo = Math.floor(n / 30), dy = n % 30 + 1;
  return `${WD[d.getUTCDay()]} ${EM[mo]} ${dy} ቀን ${yr} ዓ.ም (ግሪጎሪያን ${d.toISOString().slice(0, 10)}) ሰዓት ${d.toISOString().slice(11, 16)} (የኢትዮጵያ ሰዓት)`;
}
const TIMELY = /ዛሬ|አሁን|መቼ|ሊግ|ተጫዋች|ተመረጠ|ተሾመ|ሞተ|ተቀጠረ|ተከፈተ|ጦርነት|ምርጫ|ማን አሸነፈ|ምን አዲስ|\b(when|who won|match|fixture|election|died|stock|bitcoin)\b|ዘንድሮ|ትናንት|ነገ|ወቅታዊ|ዜና|የአየር|ዋጋ|ምንዛሬ|ዶላር|ውጤት|ጨዋታ|አዲስ|ማን ነው|\b(today|tonight|now|current|currently|latest|recent|news|price|weather|score|rate|exchange|who is|202\d)\b/i;
/* 🌐 እውነታ-ጠያቂ ጥያቄ (ማን፣ ምንድን፣ ስንት፣ የት፣ መቼ…) → Google ፍለጋ ይጠቀማል፤ ጽሑፍ ማዘጋጀት/ትርጉም/ሒሳብ/ሰላምታ/የገበያ ጉዳይ አይፈልግም። AI_WEB_FACTS=0 ያጠፋል */
const WEBQ = /[?፧]|\b(what|who|whom|when|where|why|how|which|is it|are there|does|did|can|define|meaning|capital|population|history|price)\b|ማን\b|ማነው|ምንድን|ምንድነው|ምን ማለት|ስንት|ስንተኛ|የት\b|የትኛው|መቼ|እንዴት|ለምን|ማለት ነው|ይባላል|ታሪክ|ዋና ከተማ|የህዝብ ብዛት|ብዛት|ርቀት|ርዝመት|ቁመት|ዕድሜ|የተወለደ|ተመሠረተ/i, NOWEB = /ጻፍልኝ|ጽፈህ|ግጥም|ታሪክ ጻፍ|ተርጉም|ትርጉም ስጠኝ|አብራራልኝ ከፋይሉ|ሒሳብ|አስላ|ኮድ|code|translate|write me|essay|poem|ሰላም\b|እንዴት ነህ|አመሰግናለሁ|ሱቅ|ዕቃ|ትዕዛዝ|ክፍያ|ጋሪ|ቪድዮ|ሰነድ/i;
const needsWeb = t => { t = String(t || '').trim(); return t.length >= 8 && t.length <= 500 && !/^\//.test(t) && WEBQ.test(t) && !NOWEB.test(t); };
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
  const akey = env.ANTHROPIC_API_KEY || '', gkeys = [...new Set([...(String(env.GEMINI_API_KEYS || '').split(/[\s,]+/)), env.GEMINI_API_KEY || ''].map(x => x.trim()).filter(Boolean))], gkey = gkeys[0] || '', prov = akey ? 'claude' : gkey ? 'gemini' : '';
  const model = prov === 'gemini' ? (env.GEMINI_MODEL || 'gemini-flash-latest').split(',')[0].trim() : (env.AI_MODEL || 'claude-sonnet-5-5'), base = (prov === 'gemini' ? (env.GEMINI_API_BASE || 'https://generativelanguage.googleapis.com') : (env.ANTHROPIC_API_BASE || 'https://api.anthropic.com')).replace(/\/$/, '');
  /* ብዙ የ Gemini ቁልፍ (GEMINI_API_KEYS=k1,k2,… ወይም ከ GEMINI_API_KEY ጋር)፦ አንዱ 429 ሲል ለ2 ደቂቃ አርፎ ወደ ቀጣዩ ይሄዳል */
  const kcool = new Map(); let kcur = 0;
  async function gfetch(url, init) {
    const N = gkeys.length || 1; let r;
    for (let t = 0; t < N; t++) { const i = (kcur + t) % N; if (N > 1 && kcool.get(i) > now() && t < N - 1) continue; r = await fetchImpl(url, { ...init, headers: { ...(init && init.headers), 'x-goog-api-key': gkeys[i] || '' } }); if (r.status === 429 && N > 1) { kcool.set(i, now() + 120e3); console.warn('AI gemini key #' + (i + 1) + ' 429 → ቀጣይ ቁልፍ'); continue; } kcur = i; return r; }
    return r;
  }
  const gl = String(env.GEMINI_MODEL || '').split(',').map(x => x.trim()).filter(Boolean), uniq = a => [...new Set(a)];
  const models = { g: uniq([...gl.filter(x => !/lite/i.test(x)), 'gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.6-flash']), chat: uniq([...gl, 'gemini-flash-lite-latest', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.6-flash']), doc: uniq([...gl, 'gemini-flash-latest', 'gemini-3.8-flash', 'gemini-3.6-flash', 'gemini-3.5-flash-lite', 'gemini-3.1-flash-lite', 'gemini-flash-lite-latest']) };
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
        r = await gfetch(`${base}/v1beta/models/${mdl}:generateContent`, { method: 'POST', headers: { 'content-type': 'application/json' }, signal: ctl && ctl.signal, body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents, generationConfig: { maxOutputTokens: max }, ...(ground && prov === 'gemini' ? { tools: [{ google_search: {} }] } : {}) }) });
      } else {
        const messages = msgs.map((m, i) => (media && media.mime !== 'application/pdf' && i === msgs.length - 1 ? { role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: media.mime, data: Buffer.from(media.buf).toString('base64') } }, { type: 'text', text: m.content }] } : pdf && i === msgs.length - 1 ? { role: 'user', content: [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: Buffer.from(pdf).toString('base64') }, cache_control: { type: 'ephemeral' } }, { type: 'text', text: m.content }] } : m));
        r = await fetchImpl(base + '/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', 'x-api-key': akey, 'anthropic-version': API_VER }, signal: ctl && ctl.signal, body: JSON.stringify({ model: mdl, max_tokens: max, system, messages, ...(ground ? { tools: [{ type: 'web_search_20250305', name: 'web_search', max_uses: 3 }] } : {}) }) });
      }
      try { j = await r.json(); } catch (e) { }
    } catch (e) { const n = new Error(e && e.name === 'AbortError' ? 'ai_timeout' : 'ai_network'); n.detail = String(e && e.message || e).slice(0, 200); console.warn('AI ' + prov + ' ' + mdl + ' ' + n.message + ': ' + n.detail); throw n; } finally { clearTimeout(tm); }
    if (r.ok && ground && prov === 'gemini') { const gm = j && j.candidates && j.candidates[0] && j.candidates[0].groundingMetadata, seen = new Set(), src = ((gm && gm.groundingChunks) || []).map(c => c.web).filter(w => w && w.uri && !seen.has(w.uri) && seen.add(w.uri)).slice(0, 4); const body = ((j.candidates[0].content && j.candidates[0].content.parts) || []).map(p => p.text || '').join('').trim(); if (src.length && body) return body + '\n\n📚 ምንጮች፦\n' + src.map(w => `• ${w.title || w.uri} — ${w.uri}`).join('\n'); }
    if (r.ok && ground && prov !== 'gemini' && j && Array.isArray(j.content)) { const body = j.content.filter(c => c.type === 'text').map(c => c.text).join('').trim(), seen = new Set(), src = []; j.content.forEach(c => (c.citations || []).forEach(x => { if (x.url && !seen.has(x.url)) { seen.add(x.url); src.push(x); } })); if (body) return src.length ? body + '\n\n📚 ምንጮች፦\n' + src.slice(0, 4).map(w => `• ${w.title || w.url} — ${w.url}`).join('\n') : body; }
    if (r.ok) return ((prov === 'gemini' ? (j && j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts || []).map(p => p.text || '').join('') : (j && Array.isArray(j.content) ? j.content.filter(c => c.type === 'text').map(c => c.text).join('') : '')) || '').trim();
    const e = fail(r, j); e.model = mdl; console.warn('AI ' + prov + ' ' + mdl + ' ' + r.status + ': ' + e.detail); throw e;
  }
  /* ሞዴል ሲሞላ (503/429)፣ ሲዘገይ ወይም ሲጠፋ (404) ወደሚቀጥለው ሞዴል ይሸጋገራል፤ የሰራው ለ10 ደቂቃ ይታወሳል */
  const good = {}, dead = new Map();          // dead = 404 (ሞዴሉ የለም/ለአዲስ ተጠቃሚ ተዘግቷል) → ለ6 ሰዓት አይሞከርም
  const decode = x => String(x || '').replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
  const qOf = q => { let t = String(q || '').replace(/\[[^\]]*\]/g, ' ').replace(/[^\p{L}\p{N} ]+/gu, ' ').replace(/\s+/g, ' ').trim(); const lat = t.split(' ').filter(w => /^[A-Za-z0-9]+$/.test(w)); if (lat.length) t = lat.join(' '); return t.slice(0, 120); };          // ላቲን ቃል ካለ እሱ ብቻ (የውጭ ፍለጋ በእንግሊዝኛ የተሻለ ነው)
  const getTxt = async (url, tmo = 8000, headers) => { const ctl = typeof AbortController === 'function' ? new AbortController() : null, tm = ctl && setTimeout(() => ctl.abort(), tmo); try { const r = await fetchImpl(url, { signal: ctl && ctl.signal, headers }); return r.ok ? await r.text() : null; } catch (e) { return null; } finally { clearTimeout(tm); } };
  async function newsRss(query) {
    const x = await getTxt('https://news.google.com/rss/search?q=' + encodeURIComponent(query) + '&hl=en-US&gl=US&ceid=US:en'); if (!x) return []; const items = [];
    for (const m of x.matchAll(/<item>([\s\S]*?)<\/item>/g)) { const g = t => { const k = new RegExp('<' + t + '[^>]*>([\\s\\S]*?)</' + t + '>').exec(m[1]); return k ? decode(k[1]) : ''; }; const title = g('title'); if (title) items.push({ kind: 'news', title, date: g('pubDate').slice(0, 16), src: g('source') }); if (items.length >= 5) break; }
    return items;
  }
  async function webSnips(query) {          // DuckDuckGo HTML (ያለ ቁልፍ)፦ ርዕስ + ማጠቃለያ + እውነተኛ ሊንክ
    const x = await getTxt('https://html.duckduckgo.com/html/?q=' + encodeURIComponent(query), 8000, { 'user-agent': 'Mozilla/5.0 (compatible; EtioBot/1.0)' }); if (!x) return []; const out = [];
    for (const blk of x.split(/(?=<a[^>]+class="result__a")/).filter(b => /^<a[^>]+class="result__a"/.test(b))) {
      const a = /<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/.exec(blk); if (!a) continue; const sn = /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/.exec(blk);
      let href = decode(a[1]); const u = /[?&]uddg=([^&]+)/.exec(href); if (u) { try { href = decodeURIComponent(u[1]); } catch (e) { } } if (!/^https?:\/\//.test(href)) continue; const strip = t => decode(String(t || '').replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ');
      out.push({ kind: 'web', title: strip(a[2]).slice(0, 140), snip: strip(sn && sn[1]).slice(0, 240), link: href }); if (out.length >= 5) break;
    } return out;
  }
  async function newsCtx(q) { const query = qOf(q); if (!query) return null; const [a, b] = await Promise.all([newsRss(query).catch(() => []), webSnips(query).catch(() => [])]); const all = [...a, ...b]; return all.length ? all : null; }
  async function plainWithNews(o, why) {          // ያለ Google ፍለጋ፦ ከነፃ ምንጮች (News + ድር) የተገኘውን ወደ ጥያቄው ጨምሮ ይመልሳል
    const last = o.msgs && o.msgs.length ? o.msgs[o.msgs.length - 1].content : '', items = o.media || o.pdf ? null : await newsCtx(last);
    if (items) { const ctx = '\n\n[ከድር የተገኙ የቅርብ ጊዜ ውጤቶች (ዜና + የፍለጋ ውጤት) — ጥያቄው የዛሬ/ወቅታዊ ከሆነ ከነዚህ ብቻ ተመርኩዘህ መልስ፤ ቀኑን ጥቀስ፤ ውጤቶቹ ከጥያቄው ጋር ካልተዛመዱ እንዳልተገኘ ተናገር እንጂ አትገምት]\n' + items.map((i, n) => i.kind === 'news' ? `${n + 1}. [ዜና${i.src ? ' — ' + i.src : ''}${i.date ? ', ' + i.date : ''}] ${i.title}` : `${n + 1}. [ድር] ${i.title} — ${i.snip}`).join('\n'); const out = await askMain0({ ...o, ground: false, system: o.system + ctx }); const links = items.filter(i => i.link).slice(0, 3), nw = items.filter(i => i.kind === 'news').slice(0, 2); return out + '\n\n🔎 ምንጮች፦\n' + [...links.map(i => `• ${i.title.slice(0, 60)} — ${i.link}`), ...nw.map(i => `• ${i.src || 'ዜና'}፦ ${i.title.slice(0, 70)}`)].join('\n'); }
    return (await askMain0({ ...o, ground: false })) + '\n\n⚠️ የድር ፍለጋ ለጊዜው አልተገኘም (' + why + ') — መልሱ ከፍለጋ ውጭ ነው።';
  }
  let groundOff = 0, groundWhy = '';
  async function askMain(o) {          // ፍለጋ ከተጠየቀ በመጀመሪያ ፍለጋ የሚችሉ ሞዴሎች ሁሉ ይሞከራሉ (lite ሞዴል ፍለጋ ላይሰራ ይችላል)፤ ሁሉም ካልሆኑ ብቻ ያለ ፍለጋ + ማስጠንቀቂያ
    if (o.ground && now() < groundOff) o = { ...o, ground: false, _gskip: groundWhy };
    if (o.ground) { try { return await askMain0(o); } catch (e) { const why = (e.status || e.message) + (e.detail ? ' ' + String(e.detail).slice(0, 90) : ''); groundWhy = why; groundOff = now() + ([429, 503].includes(e.status) || e.message === 'ai_busy' ? 2 * 60e3 : 10 * 60e3); console.warn('AI ground failed (' + why + ') → ያለ ፍለጋ'); return plainWithNews(o, why); } }
    if (o._gskip) return plainWithNews(o, o._gskip);
    return askMain0(o);
  }
  async function askMain0(o) {
    const kind = o.ground && prov === 'gemini' ? 'g' : o.pdf || o.media ? 'doc' : 'chat', all = prov === 'gemini' ? models[kind] : [model], alive = all.filter(m => !(dead.get(m) > now())), list = alive.length ? alive : all; let last = null, lastGood = null;
    const start = good[kind] && now() - good[kind].t < 10 * 60e3 ? Math.max(0, list.indexOf(good[kind].m)) : 0;
    let tmo = 0;
    for (let n = 0; n < list.length; n++) {
      const m = list[(start + n) % list.length];
      try { const out = await once(m, o, kind === 'doc' || o.ground ? docTimeoutMs : Math.min(timeoutMs, 30000)); good[kind] = { m, t: now() }; return out; }
      catch (e) { last = e; if (e.message === 'ai_timeout' && kind === 'doc' && ++tmo >= 2) throw e; if (e.status === 404) dead.set(m, now() + 6 * 3600e3); else lastGood = e; if (!(e.message === 'ai_busy' || e.message === 'ai_timeout' || e.message === 'ai_network' || e.status === 404 || (e.status === 400 && /model/i.test(e.detail || '')))) throw e; }
    }
    const fin = lastGood || last;          // ከ404 ይልቅ ትክክለኛውን (ሥራ በዝቶ/ጊዜ) ስህተት ያሳያል
    if (fin && fin.message === 'ai_busy' && prov === 'gemini' && retryMs > 0 && o._r !== 1) { await sleep(retryMs); return askMain0({ ...o, _r: 1 }); }          // ሁሉም ሞዴል ሲሞላ አንድ ጊዜ ተጠብቆ እንደገና
    throw fin;
  }
  /* ተጨማሪ ነፃ AI (አማራጭ፣ ያለውን አይለውጥም)፦ ዋናው AI ሲሞላ/ኮታ ሲያልቅ/ሲወድቅ የጽሑፍ ጥያቄ ወደዚህ ይሸጋገራል (OpenAI-ተኳሃኝ፦ Groq፣ OpenRouter፣ ወዘተ) */
  const extras = [];
  if (env.EXTRA_AI_KEY && env.EXTRA_AI_BASE && env.EXTRA_AI_MODEL) extras.push({ n: 'extra', key: env.EXTRA_AI_KEY, base: env.EXTRA_AI_BASE.replace(/\/+$/, ''), model: env.EXTRA_AI_MODEL });
  if (env.GROQ_API_KEY) extras.push({ n: 'groq', key: env.GROQ_API_KEY, base: 'https://api.groq.com/openai/v1', model: env.GROQ_MODEL || 'llama-3.3-70b-versatile' });
  if (env.OPENROUTER_API_KEY) extras.push({ n: 'openrouter', key: env.OPENROUTER_API_KEY, base: 'https://openrouter.ai/api/v1', model: env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free' });
  async function askExtra(x, o) {
    const ctl = typeof AbortController === 'function' ? new AbortController() : null, tm = ctl && setTimeout(() => ctl.abort(), Math.min(timeoutMs, 40000));
    try {
      const r = await fetchImpl(x.base + '/chat/completions', { method: 'POST', headers: { 'content-type': 'application/json', authorization: 'Bearer ' + x.key }, signal: ctl && ctl.signal, body: JSON.stringify({ model: x.model, max_tokens: o.max || 1500, messages: [{ role: 'system', content: o.system + '\n\n(ማስታወሻ፦ የድር ፍለጋ የለህም፤ ወቅታዊ/የዛሬ ጉዳይ ከሆነ እርግጠኛ እንዳልሆንክ ተናገር እንጂ አትገምት።)' }, ...o.msgs.map(m => ({ role: m.role, content: m.content }))] }) });
      let j = null; try { j = await r.json(); } catch (e) { } const out = r.ok && j && j.choices && j.choices[0] && j.choices[0].message && String(j.choices[0].message.content || '').trim();
      if (!out) { console.warn('AI extra ' + x.n + ' ' + r.status + ': ' + String(j && j.error && (j.error.message || j.error) || '').slice(0, 200)); return null; } return out;
    } catch (e) { console.warn('AI extra ' + x.n + ': ' + String(e && e.message || e).slice(0, 150)); return null; } finally { clearTimeout(tm); }
  }
  async function ask(o) {
    try { return await askMain(o); }
    catch (e) {
      if (!extras.length || o.pdf || o.media || o.noExtra || !['ai_busy', 'ai_timeout', 'ai_network', 'ai_failed'].includes(e.message)) throw e;
      for (const x of extras) { const out = await askExtra(x, o); if (out) return out; } throw e;
    }
  }
  /* ገደብ፦ kind = 'chat' | 'pages'፤ ok=false ከሆነ left=0 */
  function take(uid, kind, n = 1, admin = false, capOverride) {
    if (admin) return { ok: true, left: Infinity }; const t = dayKey(now()), u = used.get(uid) && used.get(uid).d === t ? used.get(uid) : { d: t, chat: 0, pages: 0 }; used.set(uid, u);
    const cap = capOverride == null ? lim[kind] : capOverride, left = cap - u[kind]; if (left < n) return { ok: false, left: Math.max(0, left) }; u[kind] += n; return { ok: true, left: cap - u[kind] };
  }
  const refund = (uid, kind, n = 1) => { const u = used.get(uid); if (u) u[kind] = Math.max(0, u[kind] - n); };

  async function chat(id, text, system, media, opt) {
    const h = hist.get(id) || { ts: now(), m: [] }; if (now() - h.ts > HIST_TTL) h.m = [];
    h.m.push({ role: 'user', content: String(text).slice(0, 6000) }); const msgs = h.m.slice(-HIST_TURNS * 2).map((x, i, a) => (i < a.length - 12 && x.content.length > 900 ? { ...x, content: x.content.slice(0, 900) + ' …' } : x));          // የቆዩ መልእክቶች ይጠረዛሉ (ወጪ)፤ የቅርብ 12 ሙሉ
    while (msgs.length && msgs[0].role !== 'user') msgs.shift();
    const out = await ask({ system: (system || SYS) + (media ? ACC : '') + '\n\nአሁን፦ ' + nowInfo(now()), msgs, max: media ? 4000 : 1500, media, ground: !media && env.AI_GROUNDING !== '0' && (env.AI_GROUNDING === '1' || (opt && opt.ground) || TIMELY.test(String(text)) || (env.AI_WEB_FACTS !== '0' && needsWeb(text)))}); if (media) h.m[h.m.length - 1].content = '[📎 ' + (media.mime === 'application/pdf' ? 'PDF' : 'ፎቶ') + '] ' + h.m[h.m.length - 1].content; h.m.push({ role: 'assistant', content: String(out || '…').replace(/\n\n(?:⚠️ የድር ፍለጋ|🔎 ምንጮች|📰 ምንጮች|📚 ምንጮች)[\s\S]*$/, '') || '…' }); h.m = h.m.slice(-HIST_TURNS * 2); h.ts = now(); hist.set(id, h); return out;
  }
  const snap = id => { const h = hist.get(id); return h ? h.m.slice(-12).map(x => ({ role: x.role, content: String(x.content).slice(0, 500) })) : []; }, has = id => !!(hist.get(id) && hist.get(id).m.length), restore = (id, arr) => { if (!has(id) && Array.isArray(arr) && arr.length) hist.set(id, { ts: now(), m: arr.filter(x => x && (x.role === 'user' || x.role === 'assistant') && x.content).map(x => ({ role: x.role, content: String(x.content).slice(0, 700) })) }); }, note = (id, content) => { const h = hist.get(id) || { ts: now(), m: [] }; h.m.push({ role: 'assistant', content: String(content).slice(0, 700) }); h.ts = now(); hist.set(id, h); };
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
  /* ከባዶ ሰነድ (pdf/pptx/docx/xlsx) የሚሆን የይዘት JSON */
  const GEN_SYS = `አንተ ባለሙያ ሰነድ አዘጋጅ ነህ። ተጠቃሚው የጠየቀውን ሰነድ ከባዶ ሙሉ በሙሉ አዘጋጅ።
ውጤቱን በዚህ JSON ቅርጸት ብቻ ስጥ (ከJSON ውጪ ምንም ጽሑፍ ወይም \`\`\` አትጨምር)፦
{"title":"ርዕስ","subtitle":"ንዑስ ርዕስ (አማራጭ)","sections":[{"h":"የክፍል ርዕስ","blocks":[{"k":"p","t":"አንቀጽ"},{"k":"ul","items":["ነጥብ"]},{"k":"ol","items":["ደረጃ"]},{"k":"table","caption":"አማራጭ","head":["ዓምድ1","ዓምድ2"],"rows":[["ሀ","1"],["ለ","2"]]},{"k":"note","t":"ማስታወሻ"}]}]}
ህጎች፦ (1) ቋንቋው ተጠቃሚው እንደጠየቀው (ካልተገለጸ አማርኛ፤ የቴክኒክ ቃል እንግሊዝኛው በቅንፍ)። (2) ይዘቱ ሙሉ፣ ትክክለኛ እና ጠቃሚ ይሁን — ማሳጠር የለም፤ የማታውቀውን እውነታ/ቁጥር አትፍጠር። (3) pptx፦ እያንዳንዱ section = አንድ ስላይድ፣ ነጥቦች አጫጭር (እስከ 14 ቃላት)፣ ካልተባለ 8–14 ስላይዶች፤ ሠንጠረዥ ሲጠቅም ተጠቀም። docx/pdf፦ ዝርዝር አንቀጾች፣ ርዕሶች እና አስፈላጊ ሠንጠረዦች። xlsx፦ ብዙ ጊዜ table ብሎኮች፤ ቁጥሮች ያለ ኮማ/ምልክት እንደ ቁጥር ("1250.5")፤ ቀመር ሲፈለግ «=SUM(B2:B9)» ይጻፍ። (4) ሠንጠረዥ፦ እያንዳንዱ ረድፍ የ head ዓምዶች ብዛት ይኑረው። (5) ምልክቶችን በ Unicode ጻፍ (≥ ≤ ± × ÷ √ π α β Δ ° ² ₂ →)፤ ሥዕል/ኮድ አትጨምር።`;
  async function genDocSpec({ fmt, request, ctx, source, media, prev }) {
    const msg = `የሚፈለገው ፋይል አይነት፦ ${String(fmt).toUpperCase()}\n\n` + (ctx ? `[የቅርብ ውይይት — አስፈላጊ ከሆነ ተጠቀም]\n${ctx}\n\n` : '') + (prev ? `[ቀድሞ ያዘጋጀኸው ሰነድ JSON — ተጠቃሚው ለውጥ ይጠይቃል፤ ሙሉውን የተሻሻለ JSON ስጥ]\n${String(prev).slice(0, 30000)}\n\n` : '') + (source ? `[ምንጭ ፋይል ጽሑፍ]\n${String(source).slice(0, 30000)}\n\n` : '') + `የተጠቃሚው ጥያቄ፦ ${String(request).slice(0, 2500)}`;
    let last; for (let tr = 0; tr < 2; tr++) { try { const out = await ask({ system: GEN_SYS + ACC, max: 8000, ...(media ? { media } : {}), msgs: [{ role: 'user', content: msg }] }), a = out.indexOf('{'), z = out.lastIndexOf('}'); if (a < 0 || z < a) throw new Error('gen_parse'); return JSON.parse(out.slice(a, z + 1)); } catch (e) { last = e; if (/^ai_(busy|timeout|network)$/.test(e.message)) await sleep(3000); } } throw last;
  }
  /* 🎬 ቪድዮ፦ ከተጠቃሚ ሀሳቦች → ትዕይንት እቅድ (JSON) */
  const VID_KIND = {
    ad: 'ማስታወቂያ (ዋናው ትኩረት)። AIDA መዋቅር ተከተል፦ 1) hook — የመጀመሪያ 3 ሰከንድ ትኩረት የሚስብ ጥያቄ ወይም ድፍረት ያለው ዓረፍተ ነገር፤ 2) የደንበኛው ፍላጎት/ችግር፤ 3) ምርቱ/አገልግሎቱ እንደ መፍትሄ፤ 4) list — 3 ዋና ጥቅሞች (አጫጭር)፤ 5) offer — ዋጋ/ቅናሽ/ልዩ ሁኔታ (ተጠቃሚው ከሰጠ ብቻ)፤ 6) cta — ስም፣ ስልክ፣ አድራሻ፣ «አሁኑኑ ይደውሉ/ይምጡ» ጥሪ። ቃላት አጭር፣ ሕያው፣ አሳማኝ፣ ስሜት የሚነካ፤ ድግግሞሽ የለም።',
    product: 'የምርት ማሳያ — ምርቱን ባህሪ በባህሪ አሳይ፣ ጥቅም፣ ዋጋ፣ ለመግዛት ጥሪ።',
    edu: 'ትምህርታዊ/ማብራሪያ ቪድዮ — ርዕስ፣ ትርጉም፣ ደረጃ በደረጃ ማብራሪያ፣ ምሳሌ፣ ማጠቃለያ። ከገበያ/ክፍያ ጋር አታገናኝ።',
    greet: 'የምስጋና/የሰላምታ/የበዓል ቪድዮ — ሞቅ ያለ፣ አጭር፣ ልብ የሚነካ፤ ከላኪው ስም ጋር።',
    story: 'ታሪክ/ተረት — መግቢያ፣ ሂደት፣ ጫፍ፣ ፍጻሜ፤ በአጭር ትዕይንቶች።',
    other: 'ተጠቃሚው እንደገለጸው።'
  };
  const VID_SYS = `አንተ ልምድ ያለህ የኢትዮጵያ ቪድዮ ማስታወቂያ ጸሐፊና ዳይሬክተር ነህ። ተጠቃሚው የሰጠህን የተበታተኑ ሀሳቦች (ጽሑፍ፣ ፎቶ መግለጫ) ሰብስበህ ራስህ አቀነባብረህ አጭር ቪድዮ የሚሆን እቅድ ትሠራለህ።
ውጤት JSON ብቻ (ከJSON ውጪ ምንም ጽሑፍ ወይም \`\`\` የለም)፦
{"brand":"የንግዱ/ላኪው ስም (ካለ፤ አለበለዚያ '')","theme":0-6,"music":"calm|energetic|none","caption":"ለቴሌግራም የሚለጠፍ አጭር መግለጫ + 3-5 ሃሽታግ","scenes":[{"type":"hook|title|text|list|offer|cta","head":"ዋና ርዕስ (እስከ 38 ፊደል)","sub":"ንዑስ መስመር (እስከ 70 ፊደል፤ ባዶ ሊሆን ይችላል)","bullets":["እስከ 4 አጫጭር ነጥቦች (እስከ 28 ፊደል) — list ላይ ብቻ"],"price":"ዋጋ/ቅናሽ ጽሑፍ (offer ላይ፣ ተጠቃሚው ከሰጠ ብቻ)","phone":"ስልክ (cta ላይ፣ ከተሰጠ ብቻ)","addr":"አድራሻ (cta ላይ፣ ከተሰጠ ብቻ)","narr":"የዚህ ትዕይንት የድምፅ ማብራሪያ ንግግር፤ ተፈጥሯዊ ሕያው አማርኛ","dur":ሰከንድ,"img":የተሰጠ ፎቶ ቁጥር ወይም -1,"imgq":"ከተሰጠ ፎቶ ከሌለው ትዕይንት ዳራ የሚሆን ምስል መግለጫ በእንግሊዝኛ (ከ6–18 ቃላት፣ ፎቶግራፍ ዓይነት፣ ርዕሱን የሚያሳይ፣ ምንም ጽሑፍ/ፊደል የሌለው)፤ cta/list ላይ ባዶ ሊሆን ይችላል"}]}
ህጎች፦
- ተጠቃሚው በችኮላ፣ በፊደል ስህተት፣ በአነጋገር፣ በአማርኛ-እንግሊዝኛ ቅይጥ ወይም በድምፅ ግልባጭ ሊጽፍ ይችላል — ዋናውን ሀሳብ፣ ርዕስ፣ ዓላማ፣ ተመልካች እና የፈለገውን ስሜት/ቀለም/ቅጥ በጥንቃቄ ተረድተህ ተጠቀም፤ ቃል በቃል አትቅዳ፤ እንደ ሰው ባለሙያ አሳማኝና ያማረ ጽሑፍ ጻፍ። «ጥቁር/ወርቅ/ዘመናዊ/ቅንጡ/በዓል/ባንዲራ» የመሰሉ የቅጥ ፍንጮችን በ theme መርጥ።
- «ይህን ቦት/አገልግሎት አስተዋውቅ» ከተባለ እና [ስለ ቦቱ የተረጋገጡ እውነታዎች] ከተሰጡ፦ ያሉትን ዋና ዋና ክፍሎች ሁሉ (ገበያ፣ ሥራ፣ ትምህርት፣ AI፣ ቪድዮ…) በተለያዩ ትዕይንቶች በደንብ አስተዋውቅ፤ ከዝርዝሩ ውጪ ያለ ባህሪ አትጨምር።
- ተጠቃሚው ያልሰጠውን እውነታ (ዋጋ፣ ቅናሽ መቶኛ፣ ስልክ፣ አድራሻ፣ ሽልማት፣ ደንበኞች ብዛት፣ ሕክምናዊ/የተጋነነ ተስፋ) በጭራሽ አትፍጠር። ከሌለ ያንን መስክ ባዶ ተው።
- የትዕይንት ብዛት እና ርዝማኔ በጠየቀው ጠቅላላ ሰከንድ ልክ፦ በአማካይ ከ4–8 ሰከንድ በትዕይንት፤ ድምር dur ≈ ጠቅላላ ሰከንድ (አይበልጥ)። hook 3–5 ሰከንድ።
- narr ርዝመት ≈ dur × 13 ፊደል (ለምሳሌ 6 ሰከንድ ≈ 80 ፊደል)፤ ቁጥሮችን በፊደል ወይም በነጠላ አሃዝ ክፍተት ጻፍ (ስልክ፦ «ዜሮ ዘጠኝ አንድ አንድ…»)። narr ውስጥ ኢሞጂ/ምልክት አትጠቀም።
- head/sub/bullets በገጹ ላይ የሚታይ አጭር ጽሑፍ ነው — ከ narr ጋር ተመሳሳይ ቃል በቃል ሳይሆን አጭር ማጠቃለያ። ኢሞጂ አትጠቀም።
- ፎቶዎች ካሉ ከትዕይንቱ ጋር የሚሄዱትን በ img ቁጥር (0 ጀምሮ) መድብ፤ ሁሉንም ፎቶ ቢያንስ አንድ ጊዜ ተጠቀም፤ ፎቶ የሌለው ትዕይንት img:-1። ፎቶ ከሌለ ሁሉም -1።
- ሁልጊዜ የመጨረሻው ትዕይንት cta ይሁን (ማስታወቂያ/ምርት ከሆነ) ወይም ማጠቃለያ።
- theme፦ 0 ሰማያዊ-ወይንጠጅ፣ 1 አረንጓዴ፣ 2 ቀይ-ብርቱካን፣ 3 ጥቁር-ወርቅ (የቅንጦት)፣ 4 ሮዝ-ወይንጠጅ፣ 5 የኢትዮጵያ ባንዲራ ቀለም (በዓል/ሀገራዊ)፣ 6 ሰማያዊ-ሰማያዊ አረንጓዴ — ለይዘቱ የሚስማማውን ምረጥ። music፦ ማስታወቂያ/ምርት → energetic፣ ትምህርት/ታሪክ → calm።`;
  async function videoPlan({ kind, sec, notes, photos, voice, prev, change }) {
    const msg = `የቪድዮ አይነት፦ ${VID_KIND[kind] || VID_KIND.other}\nጠቅላላ ርዝማኔ፦ ~${sec} ሰከንድ\nድምፅ ማብራሪያ፦ ${voice === false ? 'የለም (ጽሑፍ ብቻ፤ narr ባዶ ይሁን)' : 'አለ'}\nፎቶዎች፦ ${photos && photos.length ? photos.length + ' (ቁጥር 0 እስከ ' + (photos.length - 1) + ')' + photos.map((c, i) => c ? ` [${i}] መግለጫ፦ ${c}` : '').join('') : 'የሉም'}\n\n[የተጠቃሚው ሀሳቦች]\n${String(notes || '').slice(0, 6000)}` + (prev ? `\n\n[ቀድሞ የሠራኸው እቅድ]\n${String(prev).slice(0, 12000)}\n\n[አሁን የሚፈልገው ለውጥ]\n${String(change || 'የተለየ አዲስ ስሪት ሥራ').slice(0, 1500)}` : '');
    let last; for (let tr = 0; tr < 2; tr++) { try { const out = await ask({ system: VID_SYS + ACC, max: 6000, msgs: [{ role: 'user', content: msg }] }), a = out.indexOf('{'), z = out.lastIndexOf('}'); if (a < 0 || z < a) throw new Error('gen_parse'); const j = JSON.parse(out.slice(a, z + 1)); if (!Array.isArray(j.scenes) || !j.scenes.length) throw new Error('gen_parse'); return j; } catch (e) { last = e; if (/^ai_(busy|timeout|network)$/.test(e.message)) await sleep(3000); } } throw last;
  }

  /* 🛠 ራስ-ማሻሻል (v40)፦ ጥያቄ → የትኞቹ ፋይሎች (selfPick) → የኮድ ለውጥ እቅድ (selfPatch)። JSON ብቻ። */
  const SELF_RULES = `ደንቦች፦ ለውጡ ትንሹ ብቻ ይሁን፤ ያለውን የኮድ ዘይቤ (ጥቅጥቅ ያሉ መስመሮች፣ የአማርኛ ጽሑፎች) ተከተል። አዲስ ጥገኛ (npm package) አትጨምር። ሚስጥር/ቶከን/ቁልፍ አትጻፍ ወይም አታንብብ። .github/፣ server/selfdev.js፣ package.json፣ render.yaml፣ .env አትንካ። ለአዲስ ባህሪ ቢያንስ አንድ node:test ፈተና በ tests/ ጨምር (ፋይል ስም tests/<ስም>.test.js፣ create)። ያለውን ፈተና አትሰብር።`;
  const jsonOf = out => { const a = out.indexOf('{'), z = out.lastIndexOf('}'); if (a < 0 || z < a) throw new Error('self_parse'); return JSON.parse(out.slice(a, z + 1)); };
  async function selfPick({ request, files, readme }) {
    const out = await ask({ system: 'አንተ ልምድ ያለህ የ Node.js መሐንዲስ ነህ። የተጠየቀውን ለውጥ ለማድረግ የትኞቹን ፋይሎች ማንበብ/መቀየር እንደሚያስፈልግ ምረጥ። JSON ብቻ፦ {"files":["path",…(እስከ 6)],"keywords":["በትልልቅ ፋይሎች የምትፈልጋቸው ቃላት/ተግባር ስሞች"],"why":"አጭር አማርኛ"}። ከተሰጠው ዝርዝር ውስጥ ያሉ መንገዶች ብቻ። ' + ACC, max: 800, msgs: [{ role: 'user', content: `ጥያቄ፦ ${request}\n\n[ፋይሎች]\n${files.join('\n')}\n\n[README መጀመሪያ]\n${String(readme || '').slice(0, 2500)}` }] });
    const j = jsonOf(out); return { files: (Array.isArray(j.files) ? j.files : []).filter(x => typeof x === 'string').slice(0, 6), keywords: (Array.isArray(j.keywords) ? j.keywords : []).map(String).slice(0, 12), why: String(j.why || '') };
  }
  async function selfPatch({ request, files, errors }) {
    const body = Object.entries(files).map(([p, c]) => `=== ${p} ===\n${c}`).join('\n\n');
    const out = await ask({ system: 'አንተ ልምድ ያለህ የ Node.js መሐንዲስ ነህ። የኢትዮ ዲጂታል ማርኬት ቦት ኮድ ላይ የተጠየቀውን ለውጥ አድርግ። JSON ብቻ (ያለ ``` ):\n{"summary":"ምን እንደተለወጠ በአማርኛ (2-4 መስመር)","files":[{"path":"…","edits":[{"old":"ከፋይሉ ላይ በትክክል አንድ ጊዜ ብቻ የሚገኝ ቃል-በቃል ቅንጣቢ","new":"መተኪያ"}]},{"path":"tests/x.test.js","create":"ሙሉ የአዲስ ፋይል ይዘት"}]}\n' + SELF_RULES + '\n«old» ከሰጠሁህ ጽሑፍ ላይ ቃል በቃል (ክፍተት ጭምር) መቅዳት አለበት እና በፋይሉ ውስጥ አንድ ጊዜ ብቻ መገኘት አለበት — በቂ አውድ ጨምር። ' + ACC, max: 12000, msgs: [{ role: 'user', content: `ጥያቄ፦ ${request}\n\n${errors && errors.length ? '[ያለፈው ሙከራ ስህተቶች — አርም]\n' + errors.join('\n') + '\n\n' : ''}[ፋይሎች]\n${body}` }] });
    return jsonOf(out);
  }

  /* 🗒 አጭር ማስታወሻ (v42)፦ የአንድ ገጽ-ቡድን/ስላይዶች/ጽሑፍ → አጭር የጥናት ማስታወሻ (አማርኛ)። lvl: s በጣም አጭር · m መካከለኛ · d ዝርዝር */
  const NOTE_LV = { s: 'በእያንዳንዱ ገጽ 2-4 ነጥብ ብቻ — ዋናውን ሐሳብ ብቻ።', m: 'በእያንዳንዱ ገጽ 4-7 ነጥብ — ዋና ሐሳብ፣ ትርጓሜ፣ አስፈላጊ ቁጥር/ቀመር።', d: 'በእያንዳንዱ ገጽ 6-12 ነጥብ — ትርጓሜዎች፣ ቀመሮች፣ ምሳሌዎች፣ ንጽጽሮች፣ ዝርዝሮች ሳይዘለሉ።' };
  async function noteChunk({ pdf, media, text, label, lvl, restrict }) {
    const sys = `አንተ ብቁ የኢትዮጵያ መምህር ነህ። ተማሪው ለፈተና የሚያጠናበት አጭር ማስታወሻ (short note) በአማርኛ አዘጋጅ።\nደንቦች፦ ${NOTE_LV[lvl] || NOTE_LV.m}\n• ከተሰጠው ይዘት ብቻ ተመርኩዘህ፤ ምንም አዲስ እውነታ አትጨምር፤ ምንም ገጽ/ስላይድ አትዝለል።\n• ለእያንዳንዱ ገጽ/ስላይድ «ገጽ N» (ወይም «ስላይድ N») የሚል አጭር ርዕስ መስመር ጻፍና ከስር ነጥቦችን በ «•» ጀምር። ገጹ ባዶ/ሥዕል ብቻ ከሆነ አንድ መስመር ብቻ።\n• የቴክኒክ ቃል ሲኖር አማርኛውን እና እንግሊዝኛውን በቅንፍ፤ ቀመር፣ ቁጥር፣ አሃድ እንዳሉ ጠብቅ።\n• ምልክት ሰንጠረዥ (|) ወይም markdown (** ##) አትጠቀም፤ ቀላል ጽሑፍ ብቻ። መግቢያ ወይም መደምደሚያ አትጻፍ።` + ACC;
    const head = `ክፍል፦ ${label}።` + (restrict ? ' ' + restrict : '');
    const o = pdf ? { pdf, msgs: [{ role: 'user', content: head + ' ይህ PDF ያለው ገጾች ብቻ ማስታወሻ ይሁኑ።' }] } : media ? { media, msgs: [{ role: 'user', content: head + ' ይህን ፎቶ/ምስል አንብበህ ማስታወሻ አዘጋጅ።' }] } : { msgs: [{ role: 'user', content: head + '\n\n[ይዘት]\n' + String(text || '').slice(0, 14000) }] };
    return (await ask({ system: sys, max: lvl === 'd' ? 3500 : 2200, ...o })).trim();
  }
  /* 🧑‍🏫 ሰሌዳ፦ የአንድ ገጽ/ስላይድ ሙሉ ይዘት (ምንም ሳይዘለል) መስመር በመስመር + የእያንዳንዱ መስመር የመምህር ማብራሪያ — JSON */
  const BOARD_SYS = `አንተ ትዕግሥተኛ፣ ብቁ የኢትዮጵያ መምህር ነህ። ለተማሪዎች አንድን የፋይል ገጽ/ስላይድ በሰሌዳ ላይ ልትለጥፍና መስመር በመስመር ልታስረዳ ነው።
ከገጹ ሙሉ ይዘት (ርዕስ፣ እያንዳንዱ ነጥብ/መስመር፣ ሠንጠረዥ ረድፍ፣ ቀመር፣ የሥዕል ጽሑፍ) ምንም ሳትዘልና ሳታሳጥር ሁሉንም አካትት።
ውጤቱን በዚህ JSON ቅርጸት ብቻ ስጥ (ከJSON ውጪ ምንም ጽሑፍ ወይም \`\`\` አትጨምር)፦
{"title":"የገጹ ርዕስ","lines":[{"k":"title|text|bullet|formula|note","t":"መስመሩ በገጹ ላይ እንዳለ (የገጹ ቋንቋ፣ አጭር)","am":"ገጹ እንግሊዝኛ ከሆነ የአማርኛ ትርጉሙ (የቴክኒክ ቃልን በድምፅ ብቻ አትጻፍ — ትርጉሙን በአጭሩ አብራራ) (አማርኛ ከሆነ ባዶ)","say":"ይህን መስመር እንደ መምህር የምታብራራበት ሙሉ ንግግር (3-6 አረፍተ ነገሮች፤ ትርጉም፣ ምክንያት፣ ምሳሌ)"}],"draw":[{"k":"rect","x":10,"y":8,"w":30,"h":14},{"k":"circle","x":70,"y":15,"r":8},{"k":"arrow","x1":40,"y1":15,"x2":62,"y2":15},{"k":"label","x":12,"y":18,"t":"ጽሑፍ"}]}
ህጎች፦ lines እስከ 28፤ በገጹ ቅደም ተከተል፤ say በቀላል ተፈጥሯዊ አማርኛ (የቴክኒክ ቃል እንግሊዝኛው በቅንፍ)፣ ለድምፅ ምቹ ሙሉ አረፍተ ነገሮች፣ ምልክት/ሰንጠረዥ አትጠቀም። draw አማራጭ ነው (ገጹ ሥዕላዊ መግለጫ ሲኖረው ወይም ለማብራራት ሲጠቅም፤ ሸራው 100×56)። ገጹ ባዶ ከሆነ lines: [] ስጥ።`;
  const LV = {
    d: '\n\n[የማብራሪያ ደረጃ፦ በጣም ዝርዝር] እያንዳንዱ መስመር say ከ7-12 አረፍተ ነገሮች፤ ትርጉሙን፣ ምክንያቱን፣ እንዴት እንደሚሠራ በደረጃ አብራራ፤ ቢያንስ አንድ ተጨባጭ ምሳሌ (የኢትዮጵያ የዕለት ተዕለት ሕይወት) ስጥ፤ ሒሳብ/ቀመር ከሆነ በቁጥር ተሠርቶ የተፈታ ምሳሌ አሳይ። ተማሪው ሊሳሳትበት የሚችለውን ነገርም ጥቀስ። lines እስከ 22።',
    s: '\n\n[የማብራሪያ ደረጃ፦ በገረፍ ገረፍ] በገጹ ላይ የተጻፈውን ብቻ በአማርኛ እያነበብክ አስረዳ፤ እያንዳንዱ say 1-2 አጭር አረፍተ ነገር። ተጨማሪ ምሳሌ፣ ታሪክ ወይም ከገጹ ውጪ ያለ ማብራሪያ አትጨምር። ምንም መስመር አትዝለል።'
  };
  const IMGS = k => `\n\n[ምስሎች] ይህ ገጽ ${k} ምስል/ሥዕል አለው (ቁጥራቸው 0 እስከ ${k - 1}፣ በገጹ ላይ ከላይ ወደ ታች ባለው ቅደም ተከተል)። እያንዳንዱን ምስል ከሚመለከተው መስመር ጋር "img":[ቁጥር] ብለህ አያይዝ (እያንዳንዱ ምስል በትክክል አንድ ጊዜ)፤ የዚያ መስመር say ውስጥ ምስሉ ምን እንደሚያሳይ፣ ክፍሎቹን እና ምን እንደሚያስተምር በግልጽ አብራራ። ምስል የሌለው መስመር "img" አይኖረውም።`;
  async function boardPage(title, n, total, src, domain, lv) {
    const sys = BOARD_SYS + (LV[lv] || '') + (src.imgs && src.imgs.length ? IMGS(src.imgs.length) : '') + (domain ? ctxText({ domain }) : ''); const head = `ሰነድ፦ «${title}» — ገጽ/ስላይድ ${n}${total ? ' ከ' + total : ''}።`;
    let o;
    if (src.pdfBuf) o = { pdf: src.pdfBuf, msgs: [{ role: 'user', content: head + (src.real ? ' ይህ PDF የዚህ አንድ ገጽ ብቻ ነው፤ ሙሉውን አስተምር።' : ` የዚህን PDF ገጽ ${n} ብቻ አስተምር።`) }] };
    else if (src.media) o = { media: src.media, msgs: [{ role: 'user', content: head + ' ይህን ፎቶ/ምስል አስተምር።' }] };
    else { const im = src.imgs && src.imgs[0] && src.imgs[0].buf && src.imgs[0].buf.length < 4e6 ? { mime: src.imgs[0].mime, buf: src.imgs[0].buf } : null; o = { ...(im ? { media: im } : {}), msgs: [{ role: 'user', content: head + '\n\n[የገጹ ጽሑፍ]\n' + String(src.text || '').slice(0, 12000) + (im ? '\n\n(የተያያዘው ምስል ቁጥር 0 ነው።)' : '') }] }; }
    const out = await ask({ system: sys + ACC, max: 8000, ...o }); const a = out.indexOf('{'), z = out.lastIndexOf('}'); if (a < 0 || z < a) throw new Error('board_parse'); return JSON.parse(out.slice(a, z + 1));
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
  let lastTts = '';
  /* ነፃ መጠባበቂያ ድምፅ (Gemini ኮታ ሲያልቅ)፦ የ Google Translate የድምፅ አገልግሎት (ይፋዊ API አይደለም፤ ያለ ቁልፍ፤ በ AI_TTS_FREE=0 ይጠፋል) → mp3 */
  async function speakFree(text) {
    if (env.AI_TTS_FREE === '0' || !text) return null; const chunks = []; let rest = String(text).replace(/\s+/g, ' ').trim();
    while (rest.length) { if (rest.length <= 160) { chunks.push(rest); break; } let cut = Math.max(rest.lastIndexOf('።', 160), rest.lastIndexOf('. ', 160), rest.lastIndexOf('፣', 160), rest.lastIndexOf(' ', 160)); if (cut < 40) cut = 160; chunks.push(rest.slice(0, cut + 1)); rest = rest.slice(cut + 1).trim(); }
    const bufs = []; for (const c of chunks.slice(0, 12)) { try { const ctl = typeof AbortController === 'function' ? new AbortController() : null, tm = ctl && setTimeout(() => ctl.abort(), 10000); const r = await fetchImpl('https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=am&q=' + encodeURIComponent(c), { signal: ctl && ctl.signal, headers: { 'user-agent': 'Mozilla/5.0 (compatible; EtioBot/1.0)' } }); clearTimeout(tm); if (!r.ok) { lastTts = 'free ' + r.status; return null; } const b = Buffer.from(await r.arrayBuffer()); if (b.length < 200) { lastTts = 'free empty'; return null; } bufs.push(b); } catch (e) { lastTts = 'free network'; return null; } }
    if (!bufs.length) return null; const out = Buffer.concat(bufs); out.mime = 'audio/mpeg'; return out;
  }
  async function speak(text) {
    if (prov !== 'gemini' || !text) return null; const list = String(env.AI_TTS_MODEL || 'gemini-2.5-flash-preview-tts,gemini-3.1-flash-tts-preview,gemini-2.5-pro-preview-tts').split(',').map(x => x.trim()).filter(Boolean), voice = env.AI_TTS_VOICE || 'Kore';
    for (const mdl of list) {
      if (dead.get('tts:' + mdl) > now()) continue;
      try {
        const r = await gfetch(`${base}/v1beta/models/${mdl}:generateContent`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ contents: [{ parts: [{ text: String(text).slice(0, 1200) }] }], generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } } } } }) });
        const j = await r.json().catch(() => null); if (!r.ok) { lastTts = r.status + ' ' + String(j && j.error && (j.error.message || j.error.status) || '').slice(0, 80); console.warn('AI tts ' + mdl + ' ' + lastTts); if (r.status === 404 || r.status === 400 || r.status === 403) dead.set('tts:' + mdl, now() + 6 * 3600e3); continue; }
        const part = j && j.candidates && j.candidates[0] && j.candidates[0].content && (j.candidates[0].content.parts || []).find(p => p.inlineData && p.inlineData.data); if (!part) { lastTts = 'no_audio'; continue; }
        const m = /rate=(\d+)/.exec(part.inlineData.mimeType || ''); return { pcm: Buffer.from(part.inlineData.data, 'base64'), rate: m ? +m[1] : 24000 };
      } catch (e) { lastTts = 'network'; /* ቀጣዩን ሞዴል ይሞክራል */ }
    }
    return null;
  }
  return { speakFree, ttsLast: () => lastTts, extras: extras.map(x => x.n), enabled: !!prov, provider: prov, model, lim, chat, reset, take, refund, usage, pdfPage, slideTr, domainBrief, boardPage, boardAsk, genDocSpec, videoPlan, selfPick, selfPatch, noteChunk, snap, has, restore, note, transcribe, speak };
}
let inst = null; const shared = () => inst || (inst = create());
module.exports = { nowInfo, create, shared, countPdfPages, chunkText, slideText, needsWeb, SYS, TR };
