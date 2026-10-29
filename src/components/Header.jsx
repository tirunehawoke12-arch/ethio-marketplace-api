'use client';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useApp } from '@/lib/app';
import { useUnread } from '@/lib/chat';
import { useT } from '@/lib/i18n';
import ThemeLang from '@/components/ThemeLang';

export default function Header() {
  const { user, isAdmin, cartCount, logout } = useApp(); const router = useRouter(); const unread = useUnread(); const { t } = useT();
  const path = usePathname();
  const search = e => { e.preventDefault(); const q = new FormData(e.target).get('q'); router.push('/search?q=' + encodeURIComponent(q || '')); };
  if (path && path.startsWith('/learn')) return null;       // ተማሪ አንባቢ (mini app) ያለ ድረ-ገጽ ምናሌ
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/85 backdrop-blur-xl dark:border-[#25352c] dark:bg-[#111b16]/85">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2.5">
        <Link href="/" className="shrink-0 bg-brand bg-clip-text text-lg font-black text-transparent sm:text-xl">🇪🇹 ኢትዮ ዲጂታል ማርኬት</Link>
        <form onSubmit={search} className="hidden flex-1 md:block"><input name="q" className="input !py-2" placeholder={"🔎 " + t("search")} /></form>
        <nav className="ml-auto hidden items-center gap-1 text-sm font-bold md:flex">
          <Link className="rounded-xl px-3 py-2 hover:bg-brand-light" href="/market">{t("market")}</Link><Link className="rounded-xl px-3 py-2 hover:bg-brand-light" href="/shops">{t("shops")}</Link><Link className="rounded-xl px-3 py-2 hover:bg-brand-light" href="/jobs">{t("jobs")}</Link><Link className="rounded-xl px-3 py-2 hover:bg-brand-light" href="/sites">{t("sites")}</Link><Link className="rounded-xl px-3 py-2 hover:bg-brand-light" href="/about">{t("about")}</Link>
        </nav>
        {user && !isAdmin && <Link href="/me/messages" aria-label="መልእክቶች" className="relative ml-auto grid h-11 w-11 place-items-center rounded-2xl border border-line bg-white text-xl md:ml-0 dark:border-[#25352c] dark:bg-[#16211b]">💬{unread > 0 && <b className="absolute -right-1.5 -top-1.5 min-w-[20px] rounded-full bg-red-600 px-1 text-center text-xs text-white">{unread}</b>}</Link>}
        <Link href="/cart" aria-label="ጋሪ" className={(user && !isAdmin ? "" : "ml-auto ") + "relative grid h-11 w-11 place-items-center rounded-2xl border border-line bg-white text-xl md:ml-0 dark:border-[#25352c] dark:bg-[#16211b]"}>🛒{cartCount > 0 && <b className="absolute -right-1.5 -top-1.5 min-w-[20px] rounded-full bg-red-600 px-1 text-center text-[11px] leading-5 text-white">{cartCount}</b>}</Link>
        {user ? (
          <details className="relative">
            <summary className="grid h-11 w-11 cursor-pointer list-none place-items-center rounded-2xl bg-brand text-lg text-white">👤</summary>
            <div className="absolute right-0 mt-2 w-60 rounded-3xl border border-line bg-white p-2 text-sm font-bold shadow-lift dark:border-[#25352c] dark:bg-[#16211b]">
              <p className="muted truncate px-3 py-2">{user.name || user.email}</p>
              {[['/me', '👤 ' + t('mypages')], ['/me/messages', '💬 ' + t('messages')], ['/orders', '📦 ' + t('orders')], ['/me/applications', '📄 ' + t('apps')], ['/me/private', '🪪 ' + t('private')], ['/me/security', '🔑 ' + t('security')], ...(isAdmin ? [['/admin', '🛡️ አድሚን']] : [])].map(([h, t]) => <Link key={h} href={h} className="block rounded-xl px-3 py-2.5 hover:bg-brand-light">{t}</Link>)}
              <button onClick={() => { logout(); router.push('/'); }} className="block w-full rounded-xl px-3 py-2.5 text-left text-red-600 hover:bg-red-50">🚪 {t('logout')}</button><ThemeLang />
            </div>
          </details>
        ) : (<>
          <details className="relative"><summary aria-label={t('theme')} className="grid h-11 w-11 cursor-pointer list-none place-items-center rounded-2xl border border-line bg-white text-lg dark:border-[#25352c] dark:bg-[#16211b]">🌓</summary><div className="absolute right-0 mt-2 w-60 rounded-3xl border border-line bg-white p-2 shadow-lift dark:border-[#25352c] dark:bg-[#16211b]"><ThemeLang /></div></details>
          <Link href="/login" className="btn-primary !min-h-[44px] !px-4">{t("login")}</Link></>)}
      </div>
      <form onSubmit={search} className="mx-auto max-w-6xl px-3 pb-2 md:hidden"><input name="q" className="input !rounded-full !py-2 !text-sm" placeholder={"🔎 " + t("search")} aria-label="ፈልግ" /></form>
      <div className="h-[3px] bg-flag" />
    </header>
  );
}
