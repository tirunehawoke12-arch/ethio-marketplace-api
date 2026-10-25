import Link from 'next/link';
import { SITE, BOT } from '@/lib/consts';
import { FLOW, FEATURES, BOT_FEATURES, SECURITY, PRIVACY, FAQ } from '@/lib/aboutContent';
import { Block, Rows, Faq, BotCta, ContactCard, InfoNav, Ld, faqLd } from '@/components/InfoBlocks';

export const metadata = {
  title: 'ስለ እኛ — ኢትዮ ዲጂታል ማርኬት (Etio Digital Market)',
  description: `ኢትዮ ዲጂታል ማርኬት ምንድን ነው፣ እንዴት ይሠራል፣ በ Telegram ቦት @${BOT} እንዴት ይጠቀማሉ፣ ደህንነት፣ ግላዊነት እና እገዛ።`,
  alternates: { canonical: '/about' },
  openGraph: { title: 'ስለ እኛ — ኢትዮ ዲጂታል ማርኬት', description: 'ሱቅ፣ ሆቴል፣ ሙያተኛ እና ሥራ በአንድ ቦታ — በድረ-ገጽ እና በ Telegram ቦት።', url: '/about' },
};
const TOC = [['what', 'ምንድን ነው'], ['how', 'እንዴት ይሠራል'], ['bot', 'Telegram ቦት'], ['security', 'ደህንነት'], ['privacy', 'ግላዊነት'], ['help', 'እገዛ'], ['team', 'ማን ሠራው']];
const LD = { '@context': 'https://schema.org', '@type': 'AboutPage', url: SITE + '/about', name: 'ስለ ኢትዮ ዲጂታል ማርኬት', inLanguage: 'am', isPartOf: { '@id': SITE + '/#site' }, about: { '@id': SITE + '/#org' } };

export default function About() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <Ld data={LD} /><Ld data={faqLd(FAQ)} />
      <InfoNav active="about" />
      <section id="what" className="relative scroll-mt-24 overflow-hidden rounded-[2rem] bg-brand p-6 text-white shadow-lift sm:p-8">
        <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10" />
        <h1 className="relative text-3xl leading-tight">ስለ ኢትዮ ዲጂታል ማርኬት</h1>
        <p className="relative mt-3 text-white/95"><b>Etio Digital Market</b> በመላው ኢትዮጵያ የሚገኙ ሱቆችን፣ ሆቴሎችን፣ ሙያተኞችን እና የሥራ ዕድሎችን በአንድ ቦታ የሚያገናኝ ዲጂታል ገበያ ነው። ከአዲስ አበባ እስከ ክልል ከተሞች ዕቃዎችን እና አገልግሎቶችን ፈልገው ያግኙ፣ በደህንነት ይክፈሉ፤ ወይም የራስዎን ሱቅ እና ድረ-ገጽ ከፍተው ለመላው ሀገር ያሳዩ።</p>
        <div className="relative mt-4 flex flex-wrap gap-2"><Link href="/market" className="btn bg-white text-brand">🛍 ወደ ገበያ</Link><Link href="/register" className="btn bg-white/15 text-white ring-1 ring-white/40">አካውንት ክፈት</Link></div>
      </section>
      <nav className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1" aria-label="በዚህ ገጽ ላይ">{TOC.map(([i, t]) => <a key={i} href={'#' + i} className="chip">{t}</a>)}</nav>

      <Block id="how" icon="🧭" title="እንዴት ይሠራል?" sub="ገንዘብዎ ዕቃውን እስኪቀበሉ በአድሚን እምነት (escrow) ይያዛል፤ ከዚያ ለሻጭ ይተላለፋል።">
        <ol className="grid grid-cols-2 gap-2 sm:grid-cols-4">{FLOW.map(([i, t], k) => <li key={t} className="rounded-2xl bg-brand-light p-3 text-center text-sm font-bold text-brand-dark dark:bg-brand/20"><span className="block text-2xl">{i}</span>{k + 1}. {t}</li>)}</ol>
        <h3 className="mb-2 mt-5 text-base">ድረ-ገጹ የሚሰጠው</h3><Rows rows={FEATURES} />
        <h3 className="mb-2 mt-5 text-base">ማን ይጠቀማል?</h3>
        <ul className="grid gap-2 sm:grid-cols-2"><li className="rounded-2xl bg-brand-light/60 p-3 dark:bg-white/5">🏪 <b>ሱቅ፣ ነጋዴ፣ ሆቴል፣ አምራች</b><br /><span className="muted">ዕቃ እና አገልግሎት ይሸጣሉ</span></li><li className="rounded-2xl bg-brand-light/60 p-3 dark:bg-white/5">🧑‍🔧 <b>ሠራተኛ እና ሙያተኛ</b><br /><span className="muted">ገጽ ከፍተው ሥራ ያገኛሉ</span></li><li className="rounded-2xl bg-brand-light/60 p-3 dark:bg-white/5">🏢 <b>አሰሪ</b><br /><span className="muted">ሥራ አስታውቀው ሠራተኛ ይመርጣሉ</span></li><li className="rounded-2xl bg-brand-light/60 p-3 dark:bg-white/5">🛒 <b>ደንበኛ</b><br /><span className="muted">በደህንነት ይገበያያሉ</span></li></ul>
      </Block>

      <section id="bot" className="scroll-mt-24 space-y-3"><BotCta />
        <Block id="bot-do" icon="🤖" title={`በ Telegram ቦት (@${BOT}) ም ይሠራል`} sub="ድረ-ገጹ የሚሠራው ሁሉ በቦቱ ውስጥም ይሠራል — ከአካውንት መክፈት እስከ ክፍያ እና ደረሰኝ።">
          <Rows rows={BOT_FEATURES} />
          <p className="muted mt-3">በቦቱ ላይ <b>/start</b> ይላኩ → «📱 ስልኬን አጋራ» ይጫኑ። ዋና ትዕዛዞች፦ <b>/menu</b> · <b>/account</b> · <b>/login</b> · <b>/logout</b> · <b>/help</b> · <b>/cancel</b></p>
        </Block>
      </section>

      <Block id="security" icon="🛡" title="ደህንነት (Security)" sub="የእርስዎን መለያ እና ገንዘብ ለመጠበቅ የምንወስዳቸው እርምጃዎች።"><Rows rows={SECURITY} /></Block>
      <Block id="privacy" icon="🔒" title="ግላዊነት (Privacy)" sub="ምን እንደምንሰበስብ፣ ለምን እንደምንጠቀም እና ማን ምን እንደሚያይ።"><Rows rows={PRIVACY} /><p className="muted mt-3">ሙሉ ጽሑፍ፦ <Link className="font-bold text-brand" href="/privacy">የግላዊነት መመሪያ</Link> · <Link className="font-bold text-brand" href="/terms">የአገልግሎት ደንቦች</Link></p></Block>
      <Block id="help" icon="❓" title="እገዛ እና ተደጋጋሚ ጥያቄዎች"><Faq rows={FAQ.slice(0, 6)} /><p className="mt-3"><Link href="/help" className="btn-ghost w-full">ሁሉንም ጥያቄዎች ይመልከቱ ›</Link></p></Block>

      <section id="team" className="card scroll-mt-24 flex items-center gap-4"><div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-brand text-2xl font-black text-white">ጥ</div><div><p className="muted">👨‍💻 ድረ-ገጹን የሠራው</p><p className="text-lg font-extrabold">ጥሩነህ አወቀ (Tiruneh Awoke)</p><p className="muted">ባሕር ዳር ዩኒቨርሲቲ — ሚድዋይፈሪ (Midwifery) ክፍል፣ የመጀመሪያ ዲግሪ ፕሮግራም</p></div></section>
      <ContactCard />
    </div>
  );
}
