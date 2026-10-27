'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/lib/app';
import { useT } from '@/lib/i18n';

export default function BottomNav() {
  const p = usePathname(), { cartCount } = useApp(), { t } = useT();
  const items = [['/', '🏠', t('home'), p === '/' || p.startsWith('/market') || p.startsWith('/p/') || p.startsWith('/shop')], ['/jobs', '💼', t('jobs'), p.startsWith('/jobs') || p.startsWith('/workers') || p.startsWith('/employers')], ['/cart', '🛒', t('cart'), p === '/cart' || p === '/checkout'], ['/orders', '📦', t('orders'), p.startsWith('/orders')], ['/me', '👤', t('mypages'), p.startsWith('/me') || p.startsWith('/admin')]];
  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-lg rounded-3xl border border-line bg-white/90 p-1.5 shadow-lift backdrop-blur-xl md:hidden dark:border-[#25352c] dark:bg-[#111b16]/90" style={{ marginBottom: 'env(safe-area-inset-bottom)' }}>
      {items.map(([h, i, t, on]) => (
        <Link key={h} href={h} className={'relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-2xl text-[11px] font-bold ' + (on ? 'bg-brand text-white' : 'text-mute')}>
          <span className="text-xl leading-none">{i}</span>{t}{h === '/cart' && cartCount > 0 && <b className="absolute right-3 top-1 min-w-[18px] rounded-full bg-red-600 px-1 text-center text-[10px] text-white">{cartCount}</b>}
        </Link>
      ))}
    </nav>
  );
}
