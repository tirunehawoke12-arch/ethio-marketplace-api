'use strict';
/* 🛠 ራስ-ማሻሻል (በአድሚን ፈቃድ)፦ AI የኮድ ለውጥ ይጽፋል → ደህንነት ፍተሻ → GitHub ላይ Pull Request → ቴስት (GitHub Actions) አልፎ አድሚኑ ሲፈቅድ ብቻ ይዋሃዳል → Render ከ GitHub ራሱ ዲፕሎይ ያደርጋል።
   ይህ ፋይል እና .github/ በ AI እንዳይለወጡ የተጠበቁ ናቸው (ጠባቂውን ራሱ መቀየር አይቻልም)። ያለ ጥገኛ — fetch ብቻ። */
const vm = require('vm');
const ALLOWED = /^(server\/[\w.-]+\.(js|json)|src\/[\w./\[\]-]+\.(js|jsx|css)|tests\/[\w.-]+\.js|public\/[\w./-]+\.(html|js|json)|README\.md|server\.js)$/;
const PROTECTED = [/^\.github\//, /^server\/selfdev\.js$/, /^tests\/selfdev/, /^package(-lock)?\.json$/, /^\.env/, /^render\.ya?ml$/, /^next\.config\.js$/, /^\.gitignore$/, /(^|\/)node_modules\//];
const pathOk = p => typeof p === 'string' && p.length < 160 && !p.includes('..') && !p.startsWith('/') && ALLOWED.test(p) && !PROTECTED.some(r => r.test(p));
const LIM = { files: 8, fileBytes: 200 * 1024, changedLines: 700 };
const lines = s => (s === '' ? 0 : String(s).split('\n').length);

/* orig = { path: content }፤ plan = { summary, files:[{path, edits:[{old,new}]} | {path, create}] } → { ok, results:[{path,before,after,isNew,edits}], errors[] } */
function applyPlan(orig, plan) {
  const errors = [], results = []; if (!plan || !Array.isArray(plan.files) || !plan.files.length) return { ok: false, results, errors: ['ምንም የፋይል ለውጥ የለም'] };
  if (plan.files.length > LIM.files) errors.push(`ከ ${LIM.files} ፋይል በላይ`);
  let changed = 0, seen = new Set();
  for (const f of plan.files.slice(0, LIM.files)) {
    if (!f || !pathOk(f.path)) { errors.push('ያልተፈቀደ ፋይል፦ ' + (f && f.path)); continue; } if (seen.has(f.path)) { errors.push('ፋይሉ ድርብ ነው፦ ' + f.path); continue; } seen.add(f.path);
    if (typeof f.create === 'string') { if (orig[f.path] != null) { errors.push('ፋይሉ አለ (create አይቻልም)፦ ' + f.path); continue; } if (f.create.length > LIM.fileBytes) { errors.push('ፋይል በጣም ትልቅ፦ ' + f.path); continue; } results.push({ path: f.path, before: '', after: f.create, isNew: true, create: f.create }); changed += lines(f.create); continue; }
    const before = orig[f.path]; if (before == null) { errors.push('ፋይሉ አልተነበበም፦ ' + f.path); continue; } if (!Array.isArray(f.edits) || !f.edits.length) { errors.push('ለውጥ የለም፦ ' + f.path); continue; }
    let after = before; const done = [];
    for (const e of f.edits) {
      if (!e || typeof e.old !== 'string' || typeof e.new !== 'string' || !e.old) { errors.push('ልክ ያልሆነ ለውጥ፦ ' + f.path); continue; }
      const n = after.split(e.old).length - 1; if (n !== 1) { errors.push(`«old» ${n === 0 ? 'አልተገኘም' : n + ' ጊዜ ተገኘ (አንድ ጊዜ መሆን አለበት)'}፦ ${f.path} — ${e.old.slice(0, 50).replace(/\n/g, '⏎')}`); continue; }
      after = after.replace(e.old, () => e.new); done.push({ old: e.old, new: e.new }); changed += Math.max(lines(e.old), lines(e.new));
    }
    if (after.length > LIM.fileBytes) { errors.push('ፋይል በጣም ትልቅ፦ ' + f.path); continue; } if (after !== before) results.push({ path: f.path, before, after, isNew: false, edits: done });
  }
  if (changed > LIM.changedLines) errors.push(`ለውጡ በጣም ትልቅ ነው (${changed} መስመር > ${LIM.changedLines})`);
  for (const r of results) { const e = syntax(r.path, r.after); if (e) errors.push(`የአገባብ ስህተት፦ ${r.path} — ${e}`); }
  if (!results.length && !errors.length) errors.push('ምንም ለውጥ አልተደረገም');
  return { ok: !errors.length, results, errors };
}
function syntax(path, code) {          // server/tests/server.js ብቻ (src ፋይሎች JSX/ESM ስለሆኑ በቴስት/ግንባታ ይፈተናሉ)
  try { if (/\.json$/.test(path)) { JSON.parse(code); return ''; } if (/^(server\/|tests\/|server\.js$)/.test(path) && /\.js$/.test(path)) new vm.Script('(function(exports,require,module,__filename,__dirname){' + code.replace(/^#!.*/, '') + '\n})', { filename: path }); return ''; } catch (e) { return String(e.message).slice(0, 120); }
}
/* አዲስ የተጨመሩ መስመሮች ላይ አደገኛ ምልክቶች (ማስጠንቀቂያ ብቻ፤ አድሚኑ ያያል) */
const RISK = [[/child_process|execSync|\bspawn\(|\bexec\(/, 'የስርዓት ትዕዛዝ'], [/\beval\(|new Function\(/, 'eval'], [/process\.env\.\w*(TOKEN|KEY|SECRET|PASS)\w*/i, 'ሚስጥር ማንበብ'], [/fetch\(\s*['"`]https?:\/\/(?!api\.telegram\.org)/, 'አዲስ የውጭ አድራሻ'], [/\bunlink|rmSync|rmdir|\.rm\(/, 'ፋይል ማጥፋት'], [/\.github\/|selfdev/, 'ጠባቂ ፋይል']];
function risks(results) {
  const out = []; for (const r of results) { const bl = new Set(String(r.before).split('\n')); for (const ln of String(r.after).split('\n')) { if (bl.has(ln)) continue; for (const [re, why] of RISK) if (re.test(ln)) out.push(`${r.path}: ${why} → ${ln.trim().slice(0, 90)}`); } } return [...new Set(out)].slice(0, 12);
}
function diffText(results) {
  return results.map(r => r.isNew ? `+++ ${r.path} (አዲስ)\n` + r.after.split('\n').slice(0, 80).map(l => '+' + l).join('\n') : `--- ${r.path}\n` + r.edits.map(e => e.old.split('\n').map(l => '-' + l).join('\n') + '\n' + e.new.split('\n').map(l => '+' + l).join('\n')).join('\n@@\n')).join('\n\n');
}
const stat = results => results.map(r => `${r.path} (+${r.isNew ? lines(r.after) : r.edits.reduce((a, e) => a + lines(e.new), 0)} −${r.isNew ? 0 : r.edits.reduce((a, e) => a + lines(e.old), 0)})`);
/* ትልቅ ፋይል → በቁልፍ ቃላት ዙሪያ መስኮቶች ብቻ (AI ሙሉ bot.js ማንበብ አይችልም) */
function windowOf(content, kws, ctx = 35, max = 40000) {
  if (content.length <= max) return content; const L = content.split('\n'), keep = new Set(), ks = (kws || []).map(k => String(k).toLowerCase()).filter(Boolean);
  L.forEach((l, i) => { const x = l.toLowerCase(); if (ks.some(k => x.includes(k))) for (let j = Math.max(0, i - ctx); j <= Math.min(L.length - 1, i + ctx); j++) keep.add(j); });
  let out = '', prev = -2, used = 0; for (const i of [...keep].sort((a, b) => a - b)) { const piece = L[i] + '\n'; if (used + piece.length > max) break; if (i !== prev + 1) out += `\n/* … ያልተካተተ ክፍል (መስመር ${i + 1} ጀምሮ) … */\n`; out += piece; used += piece.length; prev = i; }
  return out || content.slice(0, max);
}
const b64 = s => Buffer.from(s, 'utf8').toString('base64');
function client({ token, repo, base = 'main', fetchImpl }) {
  const f = fetchImpl || ((...a) => fetch(...a)), configured = !!(token && /^[\w.-]+\/[\w.-]+$/.test(repo || ''));
  const api = async (method, p, body) => {
    const r = await f(`https://api.github.com/repos/${repo}${p}`, { method, headers: { authorization: 'Bearer ' + token, accept: 'application/vnd.github+json', 'user-agent': 'etio-selfdev', 'x-github-api-version': '2022-11-28', ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined });
    const t = await r.text(); let j = null; try { j = t ? JSON.parse(t) : null; } catch (e) { } if (!r.ok) { const e = new Error(`gh_${r.status}: ${String((j && j.message) || '').replace(token || '\u0000', '***').slice(0, 160)}`); e.status = r.status; throw e; } return j;
  };
  return {
    configured, repo, base,
    async tree() { const b = await api('GET', `/branches/${encodeURIComponent(base)}`), t = await api('GET', `/git/trees/${b.commit.commit.tree.sha}?recursive=1`); return { sha: b.commit.sha, files: (t.tree || []).filter(x => x.type === 'blob' && pathOk(x.path)).map(x => ({ path: x.path, size: x.size, sha: x.sha })) }; },
    async read(path, ref) { const j = await api('GET', `/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(ref || base)}`); return { content: Buffer.from(j.content || '', 'base64').toString('utf8'), sha: j.sha }; },
    async openPR({ branch, baseSha, title, body, results, shas }) {          // results: applyPlan().results፤ shas: { path: blobSha }
      await api('POST', '/git/refs', { ref: 'refs/heads/' + branch, sha: baseSha }); let head = baseSha;
      for (const r of results) { if (r.del) { const j = await api('DELETE', `/contents/${r.path.split('/').map(encodeURIComponent).join('/')}`, { message: `selfdev: remove ${r.path}`, branch, sha: shas[r.path] }); head = (j.commit && j.commit.sha) || head; continue; } const j = await api('PUT', `/contents/${r.path.split('/').map(encodeURIComponent).join('/')}`, { message: `selfdev: ${r.path}`, content: b64(r.after), branch, ...(r.isNew || !shas[r.path] ? {} : { sha: shas[r.path] }) }); head = (j.commit && j.commit.sha) || head; }
      const pr = await api('POST', '/pulls', { title: String(title).slice(0, 120), head: branch, base, body: String(body).slice(0, 6000) }); return { number: pr.number, url: pr.html_url, head };
    },
    async checks(sha) {          // 'success' | 'failure' | 'pending' | 'none'
      const cr = await api('GET', `/commits/${sha}/check-runs`).catch(() => ({ total_count: 0, check_runs: [] })), runs = cr.check_runs || [];
      if (runs.length) { if (runs.some(r => ['failure', 'cancelled', 'timed_out', 'action_required'].includes(r.conclusion))) return 'failure'; if (runs.some(r => r.status !== 'completed')) return 'pending'; return 'success'; }
      const st = await api('GET', `/commits/${sha}/status`).catch(() => null); if (st && (st.statuses || []).length) return st.state === 'success' ? 'success' : st.state === 'pending' ? 'pending' : 'failure'; return 'none';
    },
    async merge(n) { const j = await api('PUT', `/pulls/${n}/merge`, { merge_method: 'squash' }); return { sha: j.sha }; },
    async close(n, branch) { await api('PATCH', `/pulls/${n}`, { state: 'closed' }).catch(() => { }); if (branch) await api('DELETE', `/git/refs/heads/${branch.split('/').map(encodeURIComponent).join('/')}`).catch(() => { }); },
  };
}
module.exports = { applyPlan, pathOk, risks, diffText, stat, windowOf, client, syntax, LIM };
