'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/lib/app';
import { Msg } from '@/components/ui';

export default function ProductActions({ product }) {
  const { addToCart } = useApp(); const router = useRouter(); const [q, setQ] = useState(1); const [m, setM] = useState('');
  const add = () => { addToCart(product, q); setM('✅ ወደ ጋሪ ተጨምሯል'); };
  return (
    <div className="mt-4">
      <div className="flex items-center gap-3"><button className="btn-ghost !min-h-[40px] !px-4" onClick={() => setQ(Math.max(1, q - 1))}>−</button><b className="w-8 text-center text-lg">{q}</b><button className="btn-ghost !min-h-[40px] !px-4" onClick={() => setQ(Math.min(product.stock, q + 1))}>+</button></div>
      <div className="mt-3 grid grid-cols-2 gap-2"><button className="btn-ghost" onClick={add}>🛒 ወደ ጋሪ</button><button className="btn-primary" onClick={() => { addToCart(product, q); router.push('/checkout'); }}>⚡ አሁን ግዛ</button></div>
      <Msg m={m} ok />
    </div>
  );
}
