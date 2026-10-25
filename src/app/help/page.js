import { BOT } from '@/lib/consts';
import { FAQ, SECURITY } from '@/lib/aboutContent';
import { Block, Faq, Rows, BotCta, ContactCard, InfoNav, Ld, faqLd } from '@/components/InfoBlocks';

export const metadata = { title: 'እገዛ እና ተደጋጋሚ ጥያቄዎች', description: `ኢትዮ ዲጂታል ማርኬትን እንዴት መጠቀም፣ መክፈል፣ ሱቅ ወይም ገጽ መክፈት፣ ክርክር መክፈት እና በ Telegram ቦት @${BOT} መሥራት።`, alternates: { canonical: '/help' } };
export default function Help() {
  return (
    <div className="mx-auto max-w-3xl space-y-4"><Ld data={faqLd(FAQ)} /><InfoNav active="help" />
      <h1 className="text-2xl">❓ እገዛ</h1>
      <Block id="faq" icon="💬" title="ተደጋጋሚ ጥያቄዎች"><Faq rows={FAQ} /></Block>
      <Block id="safe" icon="🛡" title="ደህንነትዎን ይጠብቁ"><Rows rows={SECURITY.slice(-3)} /></Block>
      <BotCta /><ContactCard />
    </div>
  );
}
