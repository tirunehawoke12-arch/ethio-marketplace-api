'use client';
/* በአድሚን የሚቀናበር የጣቢያ ባነር — ሲዘጋ ለዚያ ጽሑፍ በዚያ መሳሪያ ላይ ዳግም አይታይም */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { get } from '@/lib/api';

const TONE = { info: 'bg-sky-600', warn: 'bg-amber-500', ok: 'bg-emerald-600' };
export default function SiteBanner() {
  const [b, setB] = useState(null), path = usePathname();
  useEffect(() => { get('/api/site/banner').then(r => { if (!r || !r.banner) return; let hid = ''; try { hid = localStorage.getItem('etm_bn') || ''; } catch (e) { } if (hid !== r.banner.text) setB(r.banner); }); }, []);
  if (!b || (path && path.startsWith('/learn'))) return null;
  const close = () => { try { localStorage.setItem('etm_bn', b.text); } catch (e) { } setB(null); };
  const T = <span className="font-bold">{b.text}</span>;
  return (<div role="status" className={'flex items-center gap-2 px-3 py-2 text-center text-sm text-white ' + (TONE[b.tone] || TONE.info)}><div className="min-w-0 flex-1">{b.link ? (/^https:/.test(b.link) ? <a href={b.link} rel="noopener noreferrer" className="underline">{T}</a> : <Link href={b.link} className="underline">{T}</Link>) : T}</div><button onClick={close} aria-label="ዝጋ" className="shrink-0 rounded-full px-2 text-lg leading-none">×</button></div>);
}
