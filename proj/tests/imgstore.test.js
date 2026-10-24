const test = require('node:test'), assert = require('node:assert');
const { create, sign } = require('../server/imgstore');
const AK = 'AKIAIOSFODNN7EXAMPLE', SK = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', NOW = new Date('2013-05-24T00:00:00Z');

test('AWS SigV4 — ይፋዊ GET ምሳሌ', () => {
  const r = sign({ method: 'GET', url: 'https://examplebucket.s3.amazonaws.com/test.txt', headers: { Range: 'bytes=0-9' }, region: 'us-east-1', accessKey: AK, secretKey: SK, now: NOW });
  assert.equal(r.signature, 'f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41');
});
test('AWS SigV4 — ይፋዊ PUT ምሳሌ', () => {
  const r = sign({ method: 'PUT', url: 'https://examplebucket.s3.amazonaws.com/test$file.text', headers: { Date: 'Fri, 24 May 2013 00:00:00 GMT', 'x-amz-storage-class': 'REDUCED_REDUNDANCY' }, body: 'Welcome to Amazon S3.', region: 'us-east-1', accessKey: AK, secretKey: SK, now: NOW });
  assert.equal(r.signature, '98ad721746da40c64f1a55b78f14c238d841ea1380cd77a1b5971af0ece108bd');
});
test('ያለ ቅንብር ጠፍቷል (Postgres ይቀጥላል)', () => { const s = create({}); assert.equal(s.enabled, false); assert.equal(s.driver, 'db'); });
test('put/get/del ፊርማ ያለው ጥያቄ ወደ ትክክለኛው አድራሻ ይልካል', async () => {
  const calls = []; const f = async (u, o) => { calls.push([o.method, u, !!o.headers.authorization]); return { ok: true, status: 200, text: async () => '', arrayBuffer: async () => Buffer.from('abc') }; };
  const s = create({ S3_ENDPOINT: 'https://acc.r2.cloudflarestorage.com/', S3_BUCKET: 'etio', S3_ACCESS_KEY_ID: 'k', S3_SECRET_ACCESS_KEY: 's', S3_PUBLIC_URL: 'https://pub.example.dev/' }, f);
  await s.put('img/a1.jpg', Buffer.from('xyz'), 'image/jpeg'); assert.equal((await s.get('img/a1.jpg')).toString(), 'abc'); await s.del('img/a1.jpg');
  assert.deepEqual(calls.map(c => c[0]), ['PUT', 'GET', 'DELETE']); assert.ok(calls.every(c => c[1] === 'https://acc.r2.cloudflarestorage.com/etio/img/a1.jpg' && c[2]));
  assert.equal(s.urlFor('img/a1.jpg'), 'https://pub.example.dev/img/a1.jpg'); assert.equal(s.keyFor('a1', 'image/png'), 'img/a1.png');
});
test('PUT ቢወድቅ ስህተት ይወረወራል', async () => { const s = create({ S3_ENDPOINT: 'https://x', S3_BUCKET: 'b', S3_ACCESS_KEY_ID: 'k', S3_SECRET_ACCESS_KEY: 's' }, async () => ({ ok: false, status: 500, text: async () => 'boom' })); await assert.rejects(() => s.put('img/a.jpg', Buffer.from('x'), 'image/jpeg'), /s3 put 500/); });
