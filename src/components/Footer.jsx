'use client';
import Link from 'next/link';
import { useT } from '@/lib/i18n';
import { usePathname } from 'next/navigation';

export default function Footer() {
  const { t } = useT(), path = usePathname();
  if (path && path.startsWith('/learn')) return null;
  return (
    <footer className="mx-auto mt-10 max-w-6xl px-4 pb-28 pt-6 text-sm md:pb-10">
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="font-extrabold">🇪🇹 ኢትዮ ዲጂታል ማርኬት</p><p className="muted mt-1 max-w-md">በመላው ኢትዮጵያ ሱቆችን፣ ሆቴሎችን፣ ሙያተኞችን እና ሥራዎችን በአንድ ቦታ የሚያገናኝ ዲጂታል ገበያ።</p></div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 font-bold text-brand"><Link href="/market">{t('market')}</Link><Link href="/shops">{t('shops')}</Link><Link href="/jobs">{t('jobs')}</Link><Link href="/sites">{t('sites')}</Link><Link href="/about">{t('about')}</Link><Link href="/help">{t('help')}</Link><Link href="/privacy">{t('privacy')}</Link><Link href="/terms">{t('terms')}</Link><a href="https://t.me/Ethio_Digital_marketing_Bot" target="_blank" rel="noopener noreferrer">🤖 Telegram ቦት</a></nav>
        </div>
        <p className="muted mt-4 border-t border-line pt-3">👨‍💻 የሠራው፦ <Link href="/about" className="font-bold text-brand">ጥሩነህ አወቀ (Tiruneh Awoke)</Link> · © 2026 ኢትዮ ዲጂታል ማርኬት · ethiodigitalmarket.pro.et</p>
      </div>
    </footer>
  );
}
