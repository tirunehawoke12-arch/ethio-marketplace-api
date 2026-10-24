'use strict';
/* ===== የምስል ማከማቻ — ከ Postgres ውጭ (S3-ተስማሚ፦ Cloudflare R2 / AWS S3 / Backblaze B2 / MinIO) =====
   ምንም ተጨማሪ ጥቅል አያስፈልግም (AWS Signature V4 በ Node crypto)።
   ቅንብር (Render → Environment)፦
     S3_ENDPOINT          ለምሳሌ  https://<accountid>.r2.cloudflarestorage.com   (AWS ከሆነ https://s3.<region>.amazonaws.com)
     S3_BUCKET            የባልዲው ስም
     S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY
     S3_REGION            (አማራጭ፤ R2 = auto፣ ነባሪ auto)
     S3_PUBLIC_URL        (አማራጭ ግን ይመከራል) ለህዝብ የሚነበብ የባልዲ አድራሻ (R2 Public URL ወይም CDN ዶሜይን) — ምስሎች ከሰርቨሩ ሳያልፉ በቀጥታ ይጫናሉ
   ካልተቀናበረ ምስሎች እንደ ቀድሞው በ Postgres ይቀመጣሉ (ምንም አይሰበርም)። */
const crypto = require('crypto');
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const hmac = (k, d) => crypto.createHmac('sha256', k).update(d).digest();
const enc = s => encodeURIComponent(s).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());

/* AWS SigV4 — ለሙከራ `now` ሊሰጥ ይችላል */
function sign({ method, url, headers = {}, body = '', region, accessKey, secretKey, now = new Date() }) {
  const u = new URL(url), amz = now.toISOString().replace(/[:-]|\.\d{3}/g, ''), day = amz.slice(0, 8), ph = sha(body);
  const h = { ...headers, host: u.host, 'x-amz-content-sha256': ph, 'x-amz-date': amz };
  const lower = {}; Object.keys(h).forEach(k => { lower[k.toLowerCase()] = String(h[k]).trim().replace(/\s+/g, ' '); });
  const names = Object.keys(lower).sort();
  const cpath = u.pathname.split('/').map(seg => enc(decodeURIComponent(seg))).join('/') || '/';
  const cq = [...u.searchParams.entries()].map(([k, v]) => [enc(k), enc(v)]).sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : a[1] < b[1] ? -1 : 1)).map(x => x.join('=')).join('&');
  const creq = [method, cpath, cq, names.map(n => n + ':' + lower[n] + '\n').join(''), names.join(';'), ph].join('\n');
  const scope = `${day}/${region}/s3/aws4_request`, sts = ['AWS4-HMAC-SHA256', amz, scope, sha(creq)].join('\n');
  const kS = hmac(hmac(hmac(hmac('AWS4' + secretKey, day), region), 's3'), 'aws4_request'), sig = crypto.createHmac('sha256', kS).update(sts).digest('hex');
  return { headers: { ...h, authorization: `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${names.join(';')}, Signature=${sig}` }, signature: sig };
}

function create(env = process.env, fetchImpl = (...a) => fetch(...a)) {
  const endpoint = String(env.S3_ENDPOINT || '').replace(/\/+$/, ''), bucket = env.S3_BUCKET || '', accessKey = env.S3_ACCESS_KEY_ID || '', secretKey = env.S3_SECRET_ACCESS_KEY || '', region = env.S3_REGION || 'auto';
  const pub = String(env.S3_PUBLIC_URL || '').replace(/\/+$/, '');
  const enabled = !!(endpoint && bucket && accessKey && secretKey);
  const urlOf = key => `${endpoint}/${bucket}/${key.split('/').map(encodeURIComponent).join('/')}`;
  async function call(method, key, { body, headers } = {}) {
    const s = sign({ method, url: urlOf(key), headers: headers || {}, body: body || '', region, accessKey, secretKey });
    const r = await fetchImpl(urlOf(key), { method, headers: s.headers, body: body && body.length ? body : undefined });
    return r;
  }
  return {
    enabled, publicUrl: pub, driver: enabled ? 's3' : 'db',
    keyFor: (id, mime) => `img/${id}.${mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg'}`,
    async put(key, buf, mime) {
      const r = await call('PUT', key, { body: buf, headers: { 'content-type': mime, 'cache-control': 'public, max-age=31536000, immutable' } });
      if (!r.ok) throw new Error('s3 put ' + r.status + ' ' + String(await r.text()).slice(0, 160));
    },
    async get(key) {
      const r = await call('GET', key); if (!r.ok) throw new Error('s3 get ' + r.status);
      return Buffer.from(await r.arrayBuffer());
    },
    async del(key) { const r = await call('DELETE', key); return r.ok || r.status === 404; },
    urlFor: key => (pub ? `${pub}/${key.split('/').map(encodeURIComponent).join('/')}` : ''),
  };
}
module.exports = { create, sign };
