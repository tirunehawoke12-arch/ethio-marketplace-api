const test = require('node:test'), assert = require('node:assert'), cp = require('child_process');
const has = (() => { try { require.resolve('express'); require.resolve('pg'); return true; } catch (e) { return false; } })();
test('ዳታቤዝ ቢወድቅ (ገደብ/ግንኙነት)፦ አገልግሎቱ አይሞትም፤ API 503፣ health ok፣ ጽሑፍ ታግዷል', { skip: !has && 'express/pg አልተጫኑም (npm i በኋላ ይሠራል)' }, () => {
  const code = `
    const { app, ready } = require('./server/app');
    (async () => { await ready(); const srv = app.listen(0); const port = srv.address().port;
      const h = await (await fetch('http://127.0.0.1:' + port + '/api/health')).json();
      const r = await fetch('http://127.0.0.1:' + port + '/api/shops'); const j = await r.json();
      console.log(JSON.stringify({ storage: h.storage, status: r.status, err: j.error })); srv.close(); process.exit(0); })().catch(e => { console.log('CRASH ' + e.message); process.exit(1); });`;
  const out = cp.execFileSync(process.execPath, ['-e', code], { cwd: __dirname + '/..', env: { ...process.env, DATABASE_URL: 'postgres://u:p@127.0.0.1:1/db', NODE_ENV: 'test', SKIP_NEXT: '1' }, timeout: 20000, encoding: 'utf8' });
  const j = JSON.parse(out.trim().split('\n').pop()); assert.equal(j.storage, 'down'); assert.equal(j.status, 503); assert.equal(j.err, 'storage_unavailable');
});
