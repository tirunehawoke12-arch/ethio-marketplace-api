const test = require('node:test'), assert = require('node:assert'), http = require('node:http'), crypto = require('crypto');
const SD = require('../server/selfdev');
test('selfdev፦ applyPlan — ትክክለኛ ለውጥ፣ ድርብ/የሌለ old፣ የተጠበቀ ፋይል፣ የአገባብ ስህተት፣ ብዛት', () => {
  const o = { 'server/a.js': "const x = 1;\nconst y = 2;\nmodule.exports = { x, y };\n" };
  let r = SD.applyPlan(o, { files: [{ path: 'server/a.js', edits: [{ old: 'const x = 1;', new: 'const x = 10;' }] }, { path: 'tests/a.test.js', create: "require('node:test');\n" }] });
  assert.ok(r.ok, r.errors.join()); assert.match(r.results[0].after, /x = 10/); assert.ok(r.results[1].isNew);
  assert.ok(!SD.applyPlan(o, { files: [{ path: 'server/a.js', edits: [{ old: 'const', new: 'let' }] }] }).ok, 'ድርብ old');
  assert.ok(!SD.applyPlan(o, { files: [{ path: 'server/a.js', edits: [{ old: 'zzz', new: 'q' }] }] }).ok, 'የሌለ old');
  for (const p of ['server/selfdev.js', '.github/workflows/test.yml', 'package.json', '.env', '../x.js', 'render.yaml', 'tests/selfdev.test.js']) assert.ok(!SD.pathOk(p), p);
  assert.ok(SD.pathOk('server/bot.js') && SD.pathOk('src/app/page.js') && SD.pathOk('tests/new.test.js'));
  assert.ok(!SD.applyPlan(o, { files: [{ path: 'server/a.js', edits: [{ old: 'const y = 2;', new: 'const y = (;' }] }] }).ok, 'የአገባብ ስህተት');
  assert.ok(!SD.applyPlan(o, { files: Array.from({ length: 9 }, (_, i) => ({ path: 'tests/n' + i + '.test.js', create: '1' })) }).ok, 'ከ 8 ፋይል በላይ');
  assert.ok(!SD.applyPlan(o, { files: [{ path: 'server/zz.js', edits: [{ old: 'a', new: 'b' }] }] }).ok, 'ያልተነበበ ፋይል');
});
test('selfdev፦ risks፣ diffText፣ windowOf', () => {
  const r = SD.applyPlan({ 'server/a.js': 'const a = 1;\n' }, { files: [{ path: 'server/a.js', edits: [{ old: 'const a = 1;', new: "const a = 1;\nrequire('child_process').execSync('ls');\nfetch('https://evil.example/x');" }] }] });
  const rk = SD.risks(r.results); assert.ok(rk.some(x => /ትዕዛዝ/.test(x)) && rk.some(x => /የውጭ/.test(x)));
  assert.match(SD.diffText(r.results), /^--- server\/a\.js/); assert.match(SD.stat(r.results)[0], /\+3 −1/);
  const big = Array.from({ length: 5000 }, (_, i) => i === 2500 ? 'function needle() {}' : 'line' + i).join('\n'), w = SD.windowOf(big, ['needle'], 5, 4000);
  assert.ok(w.includes('needle') && w.length < 5000);
});
function fakeGh() {
  const files = { 'server/hello.js': "module.exports = { hi: 'ሰላም' };\n", 'README.md': '# demo\n' }, st = { main: { ...files }, br: {}, prs: {}, ci: 'success', n: 0, c: 0, calls: [], closed: [] };
  const sha = s => crypto.createHash('sha1').update(s).digest('hex'), J = (o, code = 200) => ({ ok: code < 300, status: code, text: async () => JSON.stringify(o) });
  const fn = async (url, o = {}) => {
    const u = new URL(url), p = u.pathname.replace('/repos/o/r', ''), m = o.method || 'GET', body = o.body ? JSON.parse(o.body) : {}; st.calls.push(m + ' ' + p); let x;
    if (o.headers && !/^Bearer tok/.test(o.headers.authorization)) return J({ message: 'Bad credentials tok' }, 401);
    if (m === 'GET' && p === '/branches/main') return J({ commit: { sha: 'S' + st.c, commit: { tree: { sha: 'T' } } } });
    if (m === 'GET' && p === '/git/trees/T') return J({ tree: Object.entries(st.main).map(([path, c]) => ({ path, type: 'blob', size: c.length, sha: sha(c) })) });
    if (m === 'GET' && (x = /^\/contents\/(.+)$/.exec(p))) { const f = decodeURIComponent(x[1]), ref = u.searchParams.get('ref'), src = st.br[ref] || st.main; return src[f] == null ? J({ message: 'Not Found' }, 404) : J({ content: Buffer.from(src[f]).toString('base64'), sha: sha(src[f]) }); }
    if (m === 'POST' && p === '/git/refs') { st.br[body.ref.replace('refs/heads/', '')] = { ...st.main }; return J({}); }
    if (m === 'PUT' && (x = /^\/contents\/(.+)$/.exec(p))) { st.br[body.branch][decodeURIComponent(x[1])] = Buffer.from(body.content, 'base64').toString('utf8'); return J({ commit: { sha: 'C' + (++st.c) } }); }
    if (m === 'DELETE' && (x = /^\/contents\/(.+)$/.exec(p))) { delete st.br[body.branch][decodeURIComponent(x[1])]; return J({ commit: { sha: 'C' + (++st.c) } }); }
    if (m === 'POST' && p === '/pulls') { const n = ++st.n; st.prs[n] = { ...body, state: 'open' }; return J({ number: n, html_url: 'https://github.com/o/r/pull/' + n }); }
    if (m === 'GET' && /\/check-runs$/.test(p)) return J({ check_runs: st.ci === 'none' ? [] : [{ status: st.ci === 'pending' ? 'in_progress' : 'completed', conclusion: st.ci === 'success' ? 'success' : st.ci === 'failure' ? 'failure' : null }] });
    if (m === 'GET' && /\/status$/.test(p)) return J({ state: 'pending', statuses: [] });
    if (m === 'PUT' && (x = /^\/pulls\/(\d+)\/merge$/.exec(p))) { st.main = { ...st.br[st.prs[x[1]].head] }; st.prs[x[1]].state = 'merged'; st.c++; return J({ sha: 'M' }); }
    if (m === 'PATCH' && (x = /^\/pulls\/(\d+)$/.exec(p))) { st.prs[x[1]].state = 'closed'; st.closed.push(x[1]); return J({}); }
    if (m === 'DELETE' && /^\/git\/refs\/heads\//.test(p)) return J({}, 204);
    return J({ message: 'unhandled ' + m + p }, 404);
  };
  return { fn, st };
}
test('selfdev፦ GitHub client — PR መክፈት፣ ቴስት ሁኔታ፣ ማዋሃድ፣ መዝጋት፤ ቶከን በስህተት አይታይም', async () => {
  const g = fakeGh(), c = SD.client({ token: 'tok', repo: 'o/r', fetchImpl: g.fn }), tr = await c.tree(); assert.deepEqual(tr.files.map(f => f.path).sort(), ['README.md', 'server/hello.js']);
  const ap = SD.applyPlan({ 'server/hello.js': g.st.main['server/hello.js'] }, { files: [{ path: 'server/hello.js', edits: [{ old: "'ሰላም'", new: "'ሰላም ለሁሉም'" }] }] });
  const pr = await c.openPR({ branch: 'selfdev/t1', baseSha: tr.sha, title: 't', body: 'b', results: ap.results, shas: { 'server/hello.js': tr.files.find(f => f.path === 'server/hello.js').sha } });
  assert.equal(pr.number, 1); assert.equal(await c.checks(pr.head), 'success'); g.st.ci = 'pending'; assert.equal(await c.checks('x'), 'pending'); g.st.ci = 'failure'; assert.equal(await c.checks('x'), 'failure'); g.st.ci = 'none'; assert.equal(await c.checks('x'), 'none');
  await c.merge(1); assert.match(g.st.main['server/hello.js'], /ሰላም ለሁሉም/); await c.close(1, 'selfdev/t1'); assert.ok(g.st.closed.includes('1'));
  const bad = SD.client({ token: 'wrong', repo: 'o/r', fetchImpl: g.fn }); await assert.rejects(bad.tree(), e => /gh_401/.test(e.message) && !/wrong/.test(e.message)); assert.ok(!SD.client({ token: '', repo: 'o/r' }).configured);
});
test('ቦት /upgrade፦ AI ለውጥ ጻፈ → PR → ቴስት ሲያልፍ ✅ → ተዋህዷል → ↩️ መልስ PR፤ አድሚን ያልሆነ ይከለከላል', async () => {
  process.env.ANTHROPIC_API_KEY = 'k'; process.env.GITHUB_TOKEN = 'tok'; process.env.GITHUB_REPO = 'o/r'; delete process.env.GITHUB_BASE;
  const g = fakeGh(), srv = http.createServer((q, r) => { r.setHeader('content-type', 'application/json'); r.end(JSON.stringify({ ok: true, items: [] })); }); await new Promise(r => srv.listen(0, r)); const port = srv.address().port;
  let patchTries = 0, badFirst = false; const docs = []; const realFetch = global.fetch;
  global.fetch = async (url, o) => {
    if (/api\.github\.com/.test(url)) return g.fn(url, o);
    if (/sendDocument/.test(url)) { docs.push(o.body.get('document')); return { ok: true, status: 200 }; }
    if (/anthropic/.test(url)) { const s = o.body; let text;
      if (/keywords/.test(s)) text = JSON.stringify({ files: ['server/hello.js', 'nope.js'], keywords: ['hi'], why: 'x' });
      else { patchTries++; text = JSON.stringify({ summary: 'ሰላምታውን አራዘምኩ', files: [{ path: 'server/hello.js', edits: [{ old: badFirst && patchTries === 1 ? 'የለም' : "'ሰላም'", new: "'ሰላም ለሁሉም'" }] }, { path: 'tests/hello.test.js', create: "require('node:test')('h', () => {});\n" }] }); }
      return { ok: true, status: 200, json: async () => ({ content: [{ type: 'text', text }] }), text: async () => '' }; }
    return realFetch(url, o); };
  try {
    const sent = [], tg = async (m, p) => { sent.push([m, p]); return { ok: true, message_id: 1 }; };
    const svc = require('../server/aisvc')({ app: { get() { }, post() { } }, col: (() => { const d = {}; return p => d[p] || (d[p] = {}); })(), who: () => null, adminOnly: () => false, saveMany: async () => { }, bad() { }, S: (x, n) => String(x == null ? '' : x).slice(0, n || 1e9), N: Number, nid: () => 'x' + Math.random(), limit: () => true, ai: require('../server/ai').shared() });
    const bot = require('../server/bot')({ aisvc: svc, tg, tokFor: () => 't', port, baseUrl: 'https://x.et', adminChat: '999', bindAdmin() { }, adminPhone: '', token: 'T', botUsername: 'EtioBot', getDb: () => ({ accounts: { k: { chatId: 7 } } }), getStore: () => ({ docs: { 'data/users/U1': { acct: { name: 'ተ' } } } }), accKey: () => 'k', findUid: () => 'U1', normPhoneET: x => x, authApi: {}, pool: null, pgUpsert: async () => { }, isSusp: () => false });
    const T = () => JSON.stringify(sent.filter(x => x[0] === 'sendMessage').map(x => x[1])), say = (C, t) => bot.handle({ message: { chat: { id: C, type: 'private' }, from: { id: C }, text: t, message_id: 1 } }), cb = (C, d) => bot.handle({ callback_query: { id: 'q' + Math.random(), data: d, message: { chat: { id: C, type: 'private' } } } });
    await say(7, '/upgrade ሰላምታ ቀይር'); assert.ok(/አድሚን ብቻ/.test(T()) && !g.st.n, 'አድሚን ያልሆነ'); sent.length = 0;
    await say(999, '/upgrade'); assert.ok(/ተዋቅሯል/.test(T()) && !/tok/.test(T().replace(/token|GITHUB_TOKEN/gi, '')), 'አጠቃቀም፣ ቶከን አይታይም'); sent.length = 0;
    badFirst = true; await say(999, '/upgrade ሰላምታውን አራዝም'); assert.equal(patchTries, 2, 'የመጀመሪያው old ስህተት → ከስህተት ጋር እንደገና ሞከረ'); assert.equal(g.st.n, 1, 'PR ተከፈተ'); assert.ok(/Pull Request #1/.test(T()) && T().includes('sd:ok:1')); assert.equal(docs.length, 1, 'diff ተላከ');
    assert.ok(g.st.br[g.st.prs[1].head]['tests/hello.test.js'] && /ሰላም ለሁሉም/.test(g.st.br[g.st.prs[1].head]['server/hello.js']), 'ቅርንጫፉ ላይ ለውጡ አለ'); assert.match(g.st.main['server/hello.js'], /'ሰላም'/, 'main አልተነካም');
    sent.length = 0; g.st.ci = 'pending'; await cb(999, 'sd:ok:1'); assert.ok(/ገና እየሄደ/.test(T()) && g.st.prs[1].state === 'open', 'ቴስት እየሄደ → አይዋሃድም');
    g.st.ci = 'failure'; sent.length = 0; await cb(999, 'sd:ok:1'); assert.ok(/ወድቋል/.test(T()) && g.st.prs[1].state === 'open', 'ቴስት ወድቋል → አይዋሃድም');
    g.st.ci = 'none'; sent.length = 0; await cb(999, 'sd:ok:1'); assert.ok(/ምንም ቴስት/.test(T()) && T().includes('sd:fm:1') && g.st.prs[1].state === 'open', 'ቴስት የለም → ማረጋገጫ ይጠይቃል');
    await cb(7, 'sd:ok:1'); assert.equal(g.st.prs[1].state, 'open', 'አድሚን ያልሆነ ማዋሃድ አይችልም');
    g.st.ci = 'success'; sent.length = 0; await cb(999, 'sd:ok:1'); assert.equal(g.st.prs[1].state, 'merged'); assert.match(g.st.main['server/hello.js'], /ሰላም ለሁሉም/); assert.ok(/ተዋህዷል/.test(T()) && T().includes('sd:rv:1'));
    sent.length = 0; await cb(999, 'sd:rv:1'); assert.equal(g.st.n, 2, 'የመመለሻ PR'); assert.ok(T().includes('sd:ok:2')); assert.ok(!/ሰላም ለሁሉም/.test(g.st.br[g.st.prs[2].head]['server/hello.js']), 'ቅርንጫፉ ወደ ቀድሞ ተመልሷል'); assert.ok(!g.st.br[g.st.prs[2].head]['tests/hello.test.js'], 'አዲሱ ፋይል ተሰርዟል');
    sent.length = 0; await cb(999, 'sd:no:2'); assert.equal(g.st.prs[2].state, 'closed'); assert.ok(/ተዘግቷል/.test(T()));
  } finally { global.fetch = realFetch; srv.close(); delete process.env.GITHUB_TOKEN; delete process.env.GITHUB_REPO; }
});
