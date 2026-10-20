import Link from 'next/link';
import { sget } from '@/lib/server';
import { ProductCard, ShopCard, JobCard } from '@/components/Cards';
import { Section, Empty } from '@/components/ui';
export const dynamic = 'force-dynamic';

export default async function Home() {
  const [h, cfg, jobs] = await Promise.all([sget('/api/market/home'), sget('/api/market/config'), sget('/api/people/jobs')]);
  return (
    <div>
      <section className="relative overflow-hidden rounded-[2rem] bg-brand p-6 text-white shadow-lift sm:p-10">
        <div className="absolute -right-10 -top-10 h-56 w-56 rounded-full bg-white/10" /><div className="absolute -bottom-16 left-10 h-40 w-40 rounded-full bg-gold/20" />
        <p className="relative text-sm font-bold opacity-90">🇪🇹 የኢትዮጵያ ዲጂታል ገበያ</p>
        <h1 className="relative mt-2 max-w-2xl text-3xl leading-tight sm:text-5xl">ሱቅ፣ ሆቴል፣ ሙያተኛ እና ሥራ — በአንድ ቦታ</h1>
        <p className="relative mt-3 max-w-xl text-white/90">ይፈልጉ፣ ይምረጡ፣ በደህንነት ይክፈሉ። ወይም የራስዎን ሱቅ እና ገጽ ከፍተው ለመላው ኢትዮጵያ ይሽጡ።</p>
        <form action="/market" className="relative mt-5 flex max-w-xl gap-2"><input name="q" className="input !border-0" placeholder="🔎 ምን ይፈልጋሉ?" /><button className="btn !bg-gold !text-ink shrink-0">ፈልግ</button></form>
        <div className="relative mt-4 flex flex-wrap gap-2"><Link href="/me/shop" className="btn bg-white/15 text-white ring-1 ring-white/40 hover:bg-white/25">🏪 ሱቅ ክፈት</Link><Link href="/jobs" className="btn bg-white/15 text-white ring-1 ring-white/40 hover:bg-white/25">💼 ሥራ እና ሙያተኞች</Link></div>
      </section>

      {h.cats && h.cats.length > 0 && <div className="mt-5 flex gap-2 overflow-x-auto pb-1">{h.cats.map(c => <Link key={c.c} href={`/market?cat=${encodeURIComponent(c.c)}`} className="chip">{c.c} <span className="text-mute">({c.n})</span></Link>)}</div>}
      <div className="mt-2 flex gap-2 overflow-x-auto pb-1">{(cfg.kinds || []).map(k => <Link key={k} href={`/shops?kind=${encodeURIComponent(k)}`} className="chip-on !bg-brand-light !text-brand">{k}</Link>)}</div>

      <Section title="✨ አዳዲስ ዕቃዎች" right={<Link href="/market" className="text-sm font-bold text-brand">ሁሉንም ተመልከት ›</Link>}>
        {h.latest && h.latest.length ? <div className="grid grid-cols-2 gap-3 md:grid-cols-4">{h.latest.map(p => <ProductCard key={p.id} p={p} />)}</div>
          : <Empty><p className="text-3xl">🌱</p><p className="mt-1 font-bold">ገበያው አዲስ ነው</p><p className="muted">የመጀመሪያው ሻጭ ይሁኑ — ሱቅ ይክፈቱ እና ዕቃዎችዎን ይዘርዝሩ።</p><Link href="/me/shop" className="btn-primary mt-3">🏪 ሱቅ ክፈት</Link></Empty>}
      </Section>
      {h.shops && h.shops.length > 0 && <Section title="🏪 ሱቆች" right={<Link href="/shops" className="text-sm font-bold text-brand">ሁሉም ›</Link>}><div className="grid gap-3 md:grid-cols-2">{h.shops.map(s => <ShopCard key={s.id} s={s} />)}</div></Section>}
      <Section title="💼 አዳዲስ ሥራዎች" right={<Link href="/jobs" className="text-sm font-bold text-brand">ሁሉም ›</Link>}>
        {jobs.items && jobs.items.length ? <div className="grid gap-3 md:grid-cols-2">{jobs.items.slice(0, 4).map(j => <JobCard key={j.id} j={j} />)}</div> : <Empty>ክፍት ሥራ እስካሁን የለም — <Link className="font-bold text-brand" href="/me/employer">አሰሪ ገጽ ይክፈቱ</Link></Empty>}
      </Section>
    </div>
  );
}
