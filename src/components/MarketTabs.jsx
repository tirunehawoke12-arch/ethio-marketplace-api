'use client';
import Link from 'next/link';
import { useT } from '@/lib/i18n';

const TABS = [['market', '/market', '🛍', 'products'], ['shops', '/shops', '🏪', 'shops'], ['sites', '/sites', '🌐', 'sites'], ['workers', '/jobs?t=workers', '🧑‍🔧', 'workers'], ['employers', '/employers', '🏢', 'employers'], ['jobs', '/jobs', '💼', 'jobs']];
/* በሁሉም የገበያ ክፍሎች ላይ የሚታይ ትር — የተመዘገቡ ገጾችም እዚህ ይገኛሉ */
export default function MarketTabs({ active }) {
  const { t } = useT();
  return (<nav className="seg mb-4" aria-label="Market"><span className="sr-only">{t('market')}</span>{TABS.map(([k, h, i, l]) => <Link key={k} href={h} aria-current={active === k ? 'page' : undefined}><span aria-hidden>{i}</span>{t(l)}</Link>)}</nav>);
}
