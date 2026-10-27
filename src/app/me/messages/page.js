'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import RequireAuth from '@/components/RequireAuth';
import { get } from '@/lib/api';
import { Empty, PageTitle, Spinner } from '@/components/ui';
import { ago } from '@/lib/fmt';

function List() {
  const [d, setD] = useState(null); useEffect(() => { const l = () => get('/api/chat/threads').then(setD); l(); const t = setInterval(l, 20000); return () => clearInterval(t); }, []);
  if (!d) return <Spinner />;
  return (
    <div className="mx-auto max-w-2xl"><PageTitle sub="ከሻጮች፣ ገዥዎች፣ አሰሪዎች እና ሙያተኞች ጋር ያሉ ውይይቶች">💬 መልእክቶች</PageTitle>
      {d.items && d.items.length ? <div className="space-y-2">{d.items.map(t => (
        <Link key={t.id} href={'/me/messages/' + t.id} className="card flex items-center gap-3 !p-3 transition hover:shadow-lift">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand text-xl font-black text-white">{(t.label || '?').slice(0, 1)}</span>
          <div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-2"><b className="truncate">{t.label}</b>{t.last && <span className="muted shrink-0 text-xs">{ago(t.last.ts)}</span>}</div><p className={'truncate text-sm ' + (t.unread ? 'font-extrabold' : 'muted')}>{t.last ? t.last.text : 'ውይይት ይጀምሩ'}</p></div>
          {t.unread > 0 && <b className="min-w-[24px] rounded-full bg-red-600 px-1.5 text-center text-xs text-white">{t.unread}</b>}
        </Link>))}</div> : <Empty>እስካሁን ውይይት የለም — በማንኛውም ሱቅ፣ ዕቃ፣ ሙያተኛ ወይም ገጽ ላይ «💬 መልእክት ላክ» ይጫኑ</Empty>}
    </div>
  );
}
export default function Page() { return <RequireAuth><List /></RequireAuth>; }
