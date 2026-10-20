import { SITE } from '@/lib/consts';
import { sget } from '@/lib/server';
export const dynamic = 'force-dynamic';
export default async function sitemap() {
  const now = new Date();
  const out = ['', '/market', '/shops', '/jobs', '/about'].map(p => ({ url: SITE + p, lastModified: now, changeFrequency: 'daily', priority: p === '' ? 1 : 0.8 }));
  const [pr, sh, jb, wk] = await Promise.all([sget('/api/market/products'), sget('/api/market/shops'), sget('/api/people/jobs'), sget('/api/people/workers')]);
  (pr.items || []).forEach(p => out.push({ url: `${SITE}/p/${p.id}`, lastModified: new Date(p.ts || now), priority: 0.7 }));
  (sh.items || []).forEach(s => out.push({ url: `${SITE}/shop/${s.id}`, lastModified: new Date(s.ts || now), priority: 0.6 }));
  (jb.items || []).forEach(j => out.push({ url: `${SITE}/jobs/${j.id}`, lastModified: new Date(j.ts || now), priority: 0.6 }));
  (wk.items || []).forEach(w => out.push({ url: `${SITE}/workers/${w.id}`, lastModified: new Date(w.ts || now), priority: 0.5 }));
  return out;
}
