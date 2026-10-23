import { SITE } from '@/lib/consts';
export default function robots() {
  return { rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/me', '/admin', '/cart', '/checkout', '/orders', '/login', '/register', '/r/'] }], sitemap: SITE + '/sitemap.xml', host: SITE };
}
