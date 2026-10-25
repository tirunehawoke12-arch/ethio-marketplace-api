import Link from 'next/link';
import { PRIVACY, SECURITY } from '@/lib/aboutContent';
import { Block, Rows, ContactCard, InfoNav } from '@/components/InfoBlocks';

export const metadata = { title: 'የግላዊነት መመሪያ (Privacy Policy)', description: 'ኢትዮ ዲጂታል ማርኬት ምን መረጃ እንደሚሰበስብ፣ ለምን እንደሚጠቀምበት፣ ማን ምን እንደሚያይ እና መብትዎ።', alternates: { canonical: '/privacy' } };
export default function Privacy() {
  return (
    <div className="mx-auto max-w-3xl space-y-4"><InfoNav active="privacy" />
      <h1 className="text-2xl">🔒 የግላዊነት መመሪያ</h1><p className="muted">ይህ መመሪያ ድረ-ገጹን እና የ Telegram ቦቱን ይመለከታል።</p>
      <Block id="p" icon="🔒" title="ግላዊነት"><Rows rows={PRIVACY} /></Block>
      <Block id="s" icon="🛡" title="የደህንነት እርምጃዎች"><Rows rows={SECURITY} /></Block>
      <p className="muted">ተዛማጅ፦ <Link className="font-bold text-brand" href="/terms">የአገልግሎት ደንቦች</Link> · <Link className="font-bold text-brand" href="/help">እገዛ</Link></p><ContactCard />
    </div>
  );
}
