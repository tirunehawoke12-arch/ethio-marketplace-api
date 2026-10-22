import Link from 'next/link';
export const metadata = { title: 'ስለ እኛ', description: 'ኢትዮ ዲጂታል ማርኬት ምንድን ነው፣ እንዴት ይሠራል፣ እና ማን ሠራው።', alternates: { canonical: '/about' } };
const FLOW = [['🔎', 'ፈልግ'], ['🛒', 'ምረጥ'], ['💳', 'ክፈል (escrow)'], ['📦', 'ሻጭ ያዘጋጃል'], ['🚚', 'ይላካል'], ['🤝', 'ተቀበል'], ['⭐', 'ገምግም']];
export default function About() {
  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="card"><h1 className="text-2xl">ℹ️ ስለ እኛ</h1><p className="mt-3"><b>Etio Digital Market — ኢትዮ ዲጂታል ማርኬት</b> በመላው ኢትዮጵያ የሚገኙ ሱቆችን፣ ሆቴሎችን፣ ሙያተኞችን (ባለሙያዎችን) እና የሥራ ዕድሎችን በአንድ ቦታ የሚያገናኝ የኢትዮጵያ ዲጂታል ገበያ ነው። ከአዲስ አበባ እስከ ክልል ከተሞች ድረስ ዕቃዎችን እና አገልግሎቶችን በዋጋ፣ በቦታ እና በዝርዝር ፈልገው ማግኘት ይችላሉ።</p></div>
      <div className="card"><h2 className="text-lg">እንዴት ይሠራል?</h2><ol className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{FLOW.map(([i, t], k) => <li key={t} className="rounded-2xl bg-brand-light p-3 text-center text-sm font-bold text-brand-dark dark:bg-brand/20"><span className="block text-2xl">{i}</span>{k + 1}. {t}</li>)}</ol><p className="muted mt-3">ክፍያ በአድሚን እምነት ይያዛል፤ ዕቃውን ሲቀበሉ ብቻ ለሻጭ ይተላለፋል። መግባት በ Telegram OTP (በተመዘገበው ስልክ ብቻ) የተጠበቀ ነው።</p></div>
      <div className="card"><h2 className="text-lg">ማን ይጠቀማል?</h2><ul className="mt-2 list-inside list-disc space-y-1"><li>🏪 ሱቅ፣ ነጋዴ፣ ሆቴል፣ አገልግሎት ሰጪ እና አምራች — ዕቃ እና አገልግሎት ይሸጣሉ</li><li>🧑‍🔧 ሠራተኛ እና ሙያተኛ — ገጽ ከፍተው ሥራ ያገኛሉ</li><li>🏢 አሰሪ — ሥራ አስታውቀው ሠራተኛ ይመርጣሉ</li><li>🛒 ደንበኛ — በደህንነት ይገበያያሉ</li></ul></div>
      <div className="card flex items-center gap-4"><div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-brand text-2xl font-black text-white">ጥ</div><div><p className="muted">👨‍💻 ድረ-ገጹን የሠራው</p><p className="text-lg font-extrabold">ጥሩነህ አወቀ (Tiruneh Awoke)</p><p className="muted">ባሕር ዳር ዩኒቨርሲቲ — ሚድዋይፈሪ (Midwifery) ክፍል፣ የመጀመሪያ ዲግሪ ፕሮግራም</p><a className="mt-1 inline-block font-bold text-brand" href="tel:+251946705941">📞 0946 705 941</a></div></div>
      <div className="flex gap-2"><Link href="/market" className="btn-primary flex-1">🛍️ ወደ ገበያ</Link><Link href="/register" className="btn-ghost flex-1">አካውንት ክፈት</Link></div>
    </div>
  );
}
