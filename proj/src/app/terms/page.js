import Link from 'next/link';
import { TERMS } from '@/lib/aboutContent';
import { Block, Numbered, ContactCard, InfoNav } from '@/components/InfoBlocks';

export const metadata = { title: 'የአገልግሎት ደንቦች (Terms of Service)', description: 'ኢትዮ ዲጂታል ማርኬትን ለመጠቀም ደንቦች፦ አጠቃቀም፣ የተከለከሉ፣ ክፍያ እና ኮሚሽን፣ ክርክር እና ተመላሽ።', alternates: { canonical: '/terms' } };
export default function Terms() {
  return (
    <div className="mx-auto max-w-3xl space-y-4"><InfoNav active="terms" />
      <h1 className="text-2xl">📜 የአገልግሎት ደንቦች</h1>
      <Block id="t" icon="📜" title="ደንቦች"><Numbered rows={TERMS} /></Block>
      <p className="muted">ተዛማጅ፦ <Link className="font-bold text-brand" href="/privacy">የግላዊነት መመሪያ</Link> · <Link className="font-bold text-brand" href="/help">እገዛ</Link></p><ContactCard />
    </div>
  );
}
