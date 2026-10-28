'use client';
import Link from 'next/link';
import { useApp } from '@/lib/app';
import { ETB } from '@/lib/api';
import { Thumb } from '@/components/Cards';
import { Empty, PageTitle } from '@/components/ui';
import { useT } from '@/lib/i18n';

export default function Cart() {
  const { cart, setQty, removeFromCart } = useApp(), { t } = useT();
  if (!cart.length) return <Empty><p className="text-4xl">🛒</p><p className="font-bold">{t('cart_empty')}</p><Link href="/market" className="btn-primary mt-3">{t('to_market')}</Link></Empty>;
  const by = {}; cart.forEach(i => (by[i.shopName] = by[i.shopName] || []).push(i)); const total = cart.reduce((a, i) => a + i.price * i.qty, 0);
  return (
    <div className="mx-auto max-w-2xl">
      <PageTitle>{t('cart_title')}</PageTitle>
      {Object.entries(by).map(([shop, items]) => (
        <div key={shop} className="card mb-3"><h2 className="mb-2 text-base">🏪 {shop}</h2>
          {items.map(i => (<div key={i.pid} className="flex items-center gap-3 border-t border-line py-3 first:border-0"><Thumb id={i.img} /><div className="min-w-0 flex-1"><Link href={`/p/${i.pid}`} className="line-clamp-1 font-bold">{i.title}</Link><p className="font-extrabold text-brand">{ETB(i.price * i.qty)}</p></div>
            <div className="flex items-center gap-1"><button className="btn-ghost !min-h-[36px] !px-3" onClick={() => setQty(i.pid, i.qty - 1)}>−</button><b className="w-6 text-center">{i.qty}</b><button className="btn-ghost !min-h-[36px] !px-3" onClick={() => setQty(i.pid, i.qty + 1)}>+</button></div>
            <button className="text-xl" aria-label="አስወግድ" onClick={() => removeFromCart(i.pid)}>🗑</button></div>))}
        </div>))}
      <div className="card"><div className="flex items-center justify-between"><b>{t('cart_sub')}</b><b className="text-xl text-brand">{ETB(total)}</b></div><p className="muted mt-1">ዋጋ እና ክምችት በትዕዛዝ ጊዜ በሰርቨር ይረጋገጣል።</p><Link href="/checkout" className="btn-primary mt-3 w-full">ወደ ክፍያ ደረጃ ቀጥል ›</Link></div>
    </div>
  );
}
