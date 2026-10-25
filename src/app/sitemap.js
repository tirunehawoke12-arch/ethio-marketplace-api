import { SITE } from '@/lib/consts';
import { sget } from '@/lib/server';
export const dynamic = 'force-dynamic';
export default async function sitemap() {
  const now = new Date();
  const out = ['', '/market', '/shops', '/jobs', '/jobs?t=workers', '/employers', '/sites', '/about', '/help', '/privacy', '/terms'].map(p => ({ url: SITE + p, lastModified: now, changeFrequency: ['/privacy', '/terms', '/help', '/about'].includes(p) ? 'monthly' : 'daily', priority: p === '' ? 1 : ['/privacy', '/terms'].includes(p) ? 0.3 : 0.8 }));
  const [pr, sh, jb, wk, pg, em] = await Promise.all([sget('/api/market/products'), sget('/api/market/shops'), sget('/api/people/jobs'), sget('/api/people/workers'), sget('/api/pages'), sget('/api/people/employers')]);
  (em.items || []).forEach(e => out.push({ url: `${SITE}/employers/${e.id}`, lastModified: new Date(e.ts || now), priority: 0.5 }));
  (pg.items || []).forEach(p => out.push({ url: `${SITE}/site/${p.id}`, lastModified: new Date(p.ts || now), priority: 0.6 }));
  (pr.items || []).forEach(p => out.push({ url: `${SITE}/p/${p.id}`, lastModified: new Date(p.ts || now), priority: 0.7 }));
  (sh.items || []).forEach(s => out.push({ url: `${SITE}/shop/${s.id}`, lastModified: new Date(s.ts || now), priority: 0.6 }));
  (jb.items || []).forEach(j => out.push({ url: `${SITE}/jobs/${j.id}`, lastModified: new Date(j.ts || now), priority: 0.6 }));
  (wk.items || []).forEach(w => out.push({ url: `${SITE}/workers/${w.id}`, lastModified: new Date(w.ts || now), priority: 0.5 }));
  return out;
}
