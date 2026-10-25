'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/app';

export default function Header() {
  const { user, isAdmin, cartCount, logout } = useApp(); const router = useRouter();
  const search = e => { e.preventDefault(); const q = new FormData(e.target).get('q'); router.push('/search?q=' + encodeURIComponent(q || '')); };
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-white/85 backdrop-blur-xl dark:border-[#25352c] dark:bg-[#111b16]/85">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-3 py-2.5">
        <Link href="/" className="shrink-0 bg-brand bg-clip-text text-lg font-black text-transparent sm:text-xl">🇪🇹 ኢትዮ ዲጂታል ማርኬት</Link>
        <form onSubmit={search} className="hidden flex-1 md:block"><input name="q" className="input !py-2" placeholder="🔎 ዕቃ፣ ሱቅ ወይም አገልግሎት ፈልግ" /></form>
        <nav className="ml-auto hidden items-center gap-1 text-sm font-bold md:flex">
          <Link className="rounded-xl px-3 py-2 hover:bg-brand-light" href="/market">ገበያ</Link><Link className="rounded-xl px-3 py-2 hover:bg-brand-light" href="/shops">ሱቆች</Link><Link className="rounded-xl px-3 py-2 hover:bg-brand-light" href="/jobs">ሥራ</Link><Link className="rounded-xl px-3 py-2 hover:bg-brand-light" href="/sites">ገጾች</Link><Link className="rounded-xl px-3 py-2 hover:bg-brand-light" href="/about">ስለ እኛ</Link>
        </nav>
        <Link href="/cart" aria-label="ጋሪ" className="relative ml-auto grid h-11 w-11 place-items-center rounded-2xl border border-line bg-white text-xl md:ml-0 dark:border-[#25352c] dark:bg-[#16211b]">🛒{cartCount > 0 && <b className="absolute -right-1.5 -top-1.5 min-w-[20px] rounded-full bg-red-600 px-1 text-center text-[11px] leading-5 text-white">{cartCount}</b>}</Link>
        {user ? (
          <details className="relative">
            <summary className="grid h-11 w-11 cursor-pointer list-none place-items-center rounded-2xl bg-brand text-lg text-white">👤</summary>
            <div className="absolute right-0 mt-2 w-60 rounded-3xl border border-line bg-white p-2 text-sm font-bold shadow-lift dark:border-[#25352c] dark:bg-[#16211b]">
              <p className="muted truncate px-3 py-2">{user.name || user.email}</p>
              {[['/me', '👤 ገጾቼ'], ['/orders', '📦 ትዕዛዞቼ'], ['/me/applications', '📄 ማመልከቻዎቼ'], ['/me/private', '🪪 የግል መረጃ'], ['/me/security', '🔑 የይለፍ ቃል'], ...(isAdmin ? [['/admin', '🛡️ አድሚን']] : [])].map(([h, t]) => <Link key={h} href={h} className="block rounded-xl px-3 py-2.5 hover:bg-brand-light">{t}</Link>)}
              <button onClick={() => { logout(); router.push('/'); }} className="block w-full rounded-xl px-3 py-2.5 text-left text-red-600 hover:bg-red-50">🚪 ውጣ</button>
            </div>
          </details>
        ) : (<Link href="/login" className="btn-primary !min-h-[44px] !px-4">ግባ</Link>)}
      </div>
      <form onSubmit={search} className="mx-auto max-w-6xl px-3 pb-2 md:hidden"><input name="q" className="input !rounded-full !py-2 !text-sm" placeholder="🔎 ዕቃ፣ ሱቅ፣ ገጽ ወይም ሙያ ፈልግ" aria-label="ፈልግ" /></form>
      <div className="h-[3px] bg-flag" />
    </header>
  );
}
