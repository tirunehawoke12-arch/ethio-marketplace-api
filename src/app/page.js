import Link from 'next/link';
import { sget } from '@/lib/server';
import { ProductCard, ShopCard, JobCard, WorkerCard } from '@/components/Cards';
import PagesStrip from '@/components/PagesStrip';
import { ExpandGroup } from '@/components/Expand';
import { Section, Empty } from '@/components/ui';
import { T } from '@/lib/i18n';
import HeroSearch from '@/components/HeroSearch';
export const dynamic = 'force-dynamic';

const TRUST = [['🔒', 'tr1', 'tr1d'], ['🏪', 'tr2', 'tr2d'], ['📱', 'tr3', 'tr3d'], ['🇪🇹', 'tr4', 'tr4d']];
const ICON = { 'ሆቴል እና ማረፊያ': '🏨', 'ሱቅ': '🏪' };

export default async function Home() {
  const [h, cfg, jobs, workers] = await Promise.all([sget('/api/market/home'), sget('/api/market/config'), sget('/api/people/jobs'), sget('/api/people/workers')]);
  return (
    <div>
      <section className="relative overflow-hidden rounded-[2rem] bg-brand p-6 text-white shadow-lift sm:p-10">
        <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/10" /><div className="absolute -bottom-16 left-10 h-40 w-40 rounded-full bg-gold/20" />
        <p className="relative inline-block rounded-full bg-white/15 px-3 py-1 text-sm font-bold"><T k="hero_badge" /></p>
        <h1 className="relative mt-3 max-w-2xl text-3xl leading-tight sm:text-5xl"><T k="hero_title" /></h1>
        <p className="relative mt-3 max-w-xl text-white/90"><T k="hero_sub" /></p>
        <HeroSearch />
        <div className="relative mt-4 flex flex-wrap gap-2"><Link href="/me/sites/new" className="btn bg-white text-brand"><T k="open_page" /></Link><Link href="/me/shop" className="btn bg-white/15 text-white ring-1 ring-white/40 hover:bg-white/25"><T k="open_shop" /></Link><Link href="/jobs" className="btn bg-white/15 text-white ring-1 ring-white/40 hover:bg-white/25"><T k="jobs_btn" /></Link></div>
      </section>

      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">{TRUST.map(([i, t, d]) => <div key={t} className="card !rounded-2xl !p-3"><p className="text-2xl">{i}</p><p className="mt-1 text-sm font-extrabold"><T k={t} /></p><p className="muted !text-xs"><T k={d} /></p></div>)}</div>

      <Link href="/study" className="card mt-5 flex items-center gap-3 !bg-brand-light transition hover:-translate-y-0.5 hover:shadow-lift dark:!bg-brand/20"><span className="text-4xl">🎓</span><span className="min-w-0 flex-1"><b className="block text-lg">የተማሪዎች መማሪያ</b><span className="muted text-sm">ማስታወሻ፣ ጥያቄዎች፣ ፒፒቲ፣ PDF — ክፈሉ እና በ Telegram ያንብቡ</span></span><span className="text-xl font-black text-brand">›</span></Link>
      <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-6">{[['/market', '🛍', 'ዕቃዎች'], ['/shops', '🏪', 'ሱቆች'], ['/shops?kind=' + encodeURIComponent('ሆቴል እና ማረፊያ'), '🏨', 'ሆቴሎች'], ['/sites', '🌐', 'ገጾች'], ['/jobs?t=workers', '🧑‍🔧', 'ሙያተኞች'], ['/employers', '🏢', 'አሰሪዎች'], ['/jobs', '💼', 'ሥራ']].map(([hr, i, t]) => <Link key={hr} href={hr} className="card !rounded-2xl !p-3 text-center transition hover:-translate-y-1 hover:shadow-lift"><span className="block text-3xl">{i}</span><span className="mt-1 block text-sm font-extrabold">{t}</span></Link>)}</div>

      {h.cats && h.cats.length > 0 && <div className="mt-5 flex gap-2 overflow-x-auto pb-1">{h.cats.map(c => <Link key={c.c} href={`/market?cat=${encodeURIComponent(c.c)}`} className="chip">{c.c} <span className="text-mute">({c.n})</span></Link>)}</div>}
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">{(cfg.kinds || []).map(k => <Link key={k} href={`/shops?kind=${encodeURIComponent(k)}`} className="chip !bg-brand-light !text-brand">{ICON[k] || '🏷'} {k}</Link>)}</div>

      <Section title={<T k="sec_new_products" />} right={<Link href="/market" className="text-sm font-bold text-brand"><T k="see_all" /></Link>}>
        {h.latest && h.latest.length ? <ExpandGroup className="grid grid-cols-2 items-start gap-3 md:grid-cols-4">{h.latest.map(p => <ProductCard key={p.id} p={p} />)}</ExpandGroup>
          : <Empty><p className="text-3xl">🌱</p><p className="mt-1 font-bold">ገበያው አዲስ ነው</p><p className="muted">የመጀመሪያው ሻጭ ይሁኑ — ሱቅ ይክፈቱ እና ዕቃዎችዎን ይዘርዝሩ።</p><Link href="/me/shop" className="btn-primary mt-3">🏪 ሱቅ ክፈት</Link></Empty>}
      </Section>

      <PagesStrip title="🌐 አዳዲስ የተመዘገቡ ገጾች" hideEmpty={false} />

      {h.shops && h.shops.length > 0 && <Section title={<T k="sec_shops" />} right={<Link href="/shops" className="text-sm font-bold text-brand"><T k="all_more" /></Link>}><ExpandGroup className="grid items-start gap-3 md:grid-cols-2">{h.shops.map(s => <ShopCard key={s.id} s={s} />)}</ExpandGroup></Section>}
      {workers.items && workers.items.length > 0 && <Section title={<T k="sec_workers" />} right={<Link href="/jobs?t=workers" className="text-sm font-bold text-brand"><T k="all_more" /></Link>}><ExpandGroup className="grid items-start gap-3 md:grid-cols-2">{workers.items.slice(0, 4).map(w => <WorkerCard key={w.id} w={w} />)}</ExpandGroup></Section>}
      <Section title={<T k="sec_jobs" />} right={<Link href="/jobs" className="text-sm font-bold text-brand"><T k="all_more" /></Link>}>
        {jobs.items && jobs.items.length ? <ExpandGroup className="grid items-start gap-3 md:grid-cols-2">{jobs.items.slice(0, 4).map(j => <JobCard key={j.id} j={j} />)}</ExpandGroup> : <Empty>ክፍት ሥራ እስካሁን የለም — <Link className="font-bold text-brand" href="/me/employer">አሰሪ ገጽ ይክፈቱ</Link></Empty>}
      </Section>
    </div>
  );
}
