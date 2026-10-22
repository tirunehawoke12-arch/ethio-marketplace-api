import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mx-auto mt-10 max-w-6xl px-4 pb-28 pt-6 text-sm md:pb-10">
      <div className="card">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="font-extrabold">🇪🇹 ኢትዮ ዲጂታል ማርኬት</p><p className="muted mt-1 max-w-md">በመላው ኢትዮጵያ ሱቆችን፣ ሆቴሎችን፣ ሙያተኞችን እና ሥራዎችን በአንድ ቦታ የሚያገናኝ ዲጂታል ገበያ።</p></div>
          <nav className="flex flex-wrap gap-x-5 gap-y-2 font-bold text-brand"><Link href="/market">ገበያ</Link><Link href="/shops">ሱቆች</Link><Link href="/jobs">ሥራ</Link><Link href="/about">ስለ እኛ</Link></nav>
        </div>
        <p className="muted mt-4 border-t border-line pt-3">👨‍💻 የሠራው፦ <Link href="/about" className="font-bold text-brand">ጥሩነህ አወቀ (Tiruneh Awoke)</Link> · © 2026 ኢትዮ ዲጂታል ማርኬት · ethiodigitalmarket.pro.et</p>
      </div>
    </footer>
  );
}
