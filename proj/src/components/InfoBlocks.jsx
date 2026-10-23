import Link from 'next/link';
import { BOT, BOT_URL, CONTACT_PHONE } from '@/lib/consts';

export const Block = ({ id, icon, title, sub, children }) => (
  <section id={id} className="card scroll-mt-24"><h2 className="flex items-center gap-2 text-xl"><span className="grid h-10 w-10 place-items-center rounded-2xl bg-brand-light text-xl dark:bg-brand/20" aria-hidden>{icon}</span>{title}</h2>{sub && <p className="muted mt-2">{sub}</p>}<div className="mt-3">{children}</div></section>
);
export const Rows = ({ rows }) => (<dl className="grid gap-2 sm:grid-cols-2">{rows.map(([i, t, d]) => (<div key={t} className="rounded-2xl bg-brand-light/60 p-3 dark:bg-white/5"><dt className="font-extrabold"><span aria-hidden>{i} </span>{t}</dt><dd className="muted mt-1 !text-[13.5px] leading-relaxed">{d}</dd></div>))}</dl>);
export const Numbered = ({ rows }) => (<ol className="space-y-2">{rows.map(([n, t, d]) => (<li key={n} className="flex gap-3 rounded-2xl bg-brand-light/60 p-3 dark:bg-white/5"><b className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand text-sm text-white">{n}</b><div><b>{t}</b><p className="muted mt-0.5 !text-[13.5px] leading-relaxed">{d}</p></div></li>))}</ol>);
export const Faq = ({ rows }) => (<div className="divide-y divide-line dark:divide-[#25352c]">{rows.map(([q, a]) => (<details key={q} className="group py-2"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 py-1 font-extrabold"><span>{q}</span><span className="text-brand transition group-open:rotate-180" aria-hidden>▾</span></summary><p className="muted mt-1 pb-1 leading-relaxed">{a}</p></details>))}</div>);
export const BotCta = () => (
  <div className="rounded-3xl bg-brand p-5 text-white shadow-lift"><p className="text-sm font-bold opacity-90">🤖 Telegram ቦት</p><p className="mt-1 text-xl font-black">@{BOT}</p><p className="mt-1 text-white/90">ድረ-ገጹ የሚሠራውን ሁሉ በ Telegram ውስጥ መሥራት ይችላሉ።</p><a href={BOT_URL} target="_blank" rel="noopener noreferrer" className="btn mt-3 bg-white text-brand">✈️ ቦቱን ክፈት</a></div>
);
export const ContactCard = () => (
  <div className="card"><h2 className="text-lg">📞 ያግኙን</h2><ul className="mt-2 space-y-1"><li>🤖 Telegram ቦት፦ <a className="font-bold text-brand" href={BOT_URL} target="_blank" rel="noopener noreferrer">@{BOT}</a> (ለእገዛ /help ይላኩ)</li><li>📞 ስልክ፦ <a className="font-bold text-brand" href={`tel:+251${CONTACT_PHONE.slice(1)}`}>{CONTACT_PHONE.replace(/(\d{4})(\d{3})(\d{3})/, '$1 $2 $3')}</a></li><li>🌐 ድረ-ገጽ፦ <Link href="/" className="font-bold text-brand">ethiodigitalmarket.pro.et</Link></li></ul></div>
);
export const InfoNav = ({ active }) => (
  <nav className="seg mb-4" aria-label="መረጃ">{[['about', '/about', 'ℹ️ ስለ እኛ'], ['help', '/help', '❓ እገዛ'], ['privacy', '/privacy', '🔒 ግላዊነት'], ['terms', '/terms', '📜 ደንቦች']].map(([k, h, l]) => <Link key={k} href={h} aria-current={active === k ? 'page' : undefined}>{l}</Link>)}</nav>
);
export const faqLd = rows => ({ '@context': 'https://schema.org', '@type': 'FAQPage', inLanguage: 'am', mainEntity: rows.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) });
export const Ld = ({ data }) => <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
