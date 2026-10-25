import Link from 'next/link';
import { sget } from '@/lib/server';
import { ProductCard, ShopCard, JobCard, WorkerCard } from '@/components/Cards';
import PagesStrip from '@/components/PagesStrip';
import { ExpandGroup } from '@/components/Expand';
import { Section, Empty } from '@/components/ui';
export const dynamic = 'force-dynamic';

const TRUST = [['🔒', 'ደህንነቱ የተጠበቀ ክፍያ', 'ገንዘብዎ ዕቃው እስኪደርስ ይጠበቃል'], ['🏪', 'የራስዎ ገጽ', 'ሱቅ፣ ሆቴል፣ ሙያ — ነጻ ድረ-ገጽ'], ['📱', 'በ Telegram ም', 'ሁሉም ነገር በቦት ይሠራል'], ['🇪🇹', 'መላው ኢትዮጵያ', 'ከክልል እስከ ወረዳ']];
const ICON = { 'ሆቴል እና ማረፊያ': '🏨', 'ሱቅ': '🏪' };

export default async function Home() {
  const [h, cfg, jobs, workers] = await Promise.all([sget('/api/market/home'), sget('/api/market/config'), sget('/api/people/jobs'), sget('/api/people/workers')]);
  return (
    <div>
      <section className="relative overflow-hidden rounded-[2rem] bg-brand p-6 text-white shadow-lift sm:p-10">
        <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/10" /><div className="absolute -bottom-16 left-10 h-40 w-40 rounded-full bg-gold/20" />
        <p className="relative inline-block rounded-full bg-white/15 px-3 py-1 text-sm font-bold">🇪🇹 የኢትዮጵያ ዲጂታል ገበያ</p>
        <h1 className="relative mt-3 max-w-2xl text-3xl leading-tight sm:text-5xl">ሱቅ፣ ሆቴል፣ ሙያተኛ እና ሥራ — በአንድ ቦታ</h1>
        <p className="relative mt-3 max-w-xl text-white/90">ይፈልጉ፣ ይምረጡ፣ በደህንነት ይክፈሉ። ወይም የራስዎን ገጽ ከፍተው ለመላው ኢትዮጵያ ያሳዩ።</p>
        <form action="/market" className="relative mt-5 flex max-w-xl gap-2"><input name="q" className="input !border-0" placeholder="🔎 ምን ይፈልጋሉ?" aria-label="ፈልግ" /><button className="btn !bg-gold !text-ink shrink-0">ፈልግ</button></form>
        <div className="relative mt-4 flex flex-wrap gap-2"><Link href="/me/sites/new" className="btn bg-white text-brand">🌐 የራስዎን ገጽ ይክፈቱ</Link><Link href="/me/shop" className="btn bg-white/15 text-white ring-1 ring-white/40 hover:bg-white/25">🏪 ሱቅ ክፈት</Link><Link href="/jobs" className="btn bg-white/15 text-white ring-1 ring-white/40 hover:bg-white/25">💼 ሥራ</Link></div>
      </section>

      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">{TRUST.map(([i, t, d]) => <div key={t} className="card !rounded-2xl !p-3"><p className="text-2xl">{i}</p><p className="mt-1 text-sm font-extrabold">{t}</p><p className="muted !text-xs">{d}</p></div>)}</div>

      <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">{[['/market', '🛍', 'ዕቃዎች'], ['/shops', '🏪', 'ሱቆች'], ['/shops?kind=' + encodeURIComponent('ሆቴል እና ማረፊያ'), '🏨', 'ሆቴሎች'], ['/sites', '🌐', 'ገጾች'], ['/jobs?t=workers', '🧑‍🔧', 'ሙያተኞች'], ['/employers', '🏢', 'አሰሪዎች'], ['/jobs', '💼', 'ሥራ']].map(([hr, i, t]) => <Link key={hr} href={hr} className="card !rounded-2xl !p-3 text-center transition hover:-translate-y-1 hover:shadow-lift"><span className="block text-3xl">{i}</span><span className="mt-1 block text-sm font-extrabold">{t}</span></Link>)}</div>

      {h.cats && h.cats.length > 0 && <div className="mt-5 flex gap-2 overflow-x-auto pb-1">{h.cats.map(c => <Link key={c.c} href={`/market?cat=${encodeURIComponent(c.c)}`} className="chip">{c.c} <span className="text-mute">({c.n})</span></Link>)}</div>}
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">{(cfg.kinds || []).map(k => <Link key={k} href={`/shops?kind=${encodeURIComponent(k)}`} className="chip !bg-brand-light !text-brand">{ICON[k] || '🏷'} {k}</Link>)}</div>

      <Section title="✨ አዳዲስ ዕቃዎች" right={<Link href="/market" className="text-sm font-bold text-brand">ሁሉንም ተመልከት ›</Link>}>
        {h.latest && h.latest.length ? <ExpandGroup className="grid grid-cols-2 items-start gap-3 md:grid-cols-4">{h.latest.map(p => <ProductCard key={p.id} p={p} />)}</ExpandGroup>
          : <Empty><p className="text-3xl">🌱</p><p className="mt-1 font-bold">ገበያው አዲስ ነው</p><p className="muted">የመጀመሪያው ሻጭ ይሁኑ — ሱቅ ይክፈቱ እና ዕቃዎችዎን ይዘርዝሩ።</p><Link href="/me/shop" className="btn-primary mt-3">🏪 ሱቅ ክፈት</Link></Empty>}
      </Section>

      <PagesStrip title="🌐 አዳዲስ የተመዘገቡ ገጾች" hideEmpty={false} />

      {h.shops && h.shops.length > 0 && <Section title="🏪 ሱቆች እና ድርጅቶች" right={<Link href="/shops" className="text-sm font-bold text-brand">ሁሉም ›</Link>}><ExpandGroup className="grid items-start gap-3 md:grid-cols-2">{h.shops.map(s => <ShopCard key={s.id} s={s} />)}</ExpandGroup></Section>}
      {workers.items && workers.items.length > 0 && <Section title="🧑‍🔧 ሙያተኞች" right={<Link href="/jobs?t=workers" className="text-sm font-bold text-brand">ሁሉም ›</Link>}><ExpandGroup className="grid items-start gap-3 md:grid-cols-2">{workers.items.slice(0, 4).map(w => <WorkerCard key={w.id} w={w} />)}</ExpandGroup></Section>}
      <Section title="💼 አዳዲስ ሥራዎች" right={<Link href="/jobs" className="text-sm font-bold text-brand">ሁሉም ›</Link>}>
        {jobs.items && jobs.items.length ? <ExpandGroup className="grid items-start gap-3 md:grid-cols-2">{jobs.items.slice(0, 4).map(j => <JobCard key={j.id} j={j} />)}</ExpandGroup> : <Empty>ክፍት ሥራ እስካሁን የለም — <Link className="font-bold text-brand" href="/me/employer">አሰሪ ገጽ ይክፈቱ</Link></Empty>}
      </Section>
    </div>
  );
}
