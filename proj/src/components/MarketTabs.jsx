import Link from 'next/link';

const TABS = [['market', '/market', '🛍', 'ዕቃዎች'], ['shops', '/shops', '🏪', 'ሱቆች'], ['sites', '/sites', '🌐', 'ገጾች'], ['workers', '/jobs?t=workers', '🧑‍🔧', 'ሙያተኞች'], ['jobs', '/jobs', '💼', 'ሥራ']];
/* በሁሉም የገበያ ክፍሎች ላይ የሚታይ ትር — የተመዘገቡ ገጾችም እዚህ ይገኛሉ */
export default function MarketTabs({ active }) {
  return (<nav className="seg mb-4" aria-label="የገበያ ክፍሎች">{TABS.map(([k, h, i, l]) => <Link key={k} href={h} aria-current={active === k ? 'page' : undefined}><span aria-hidden>{i}</span>{l}</Link>)}</nav>);
}
