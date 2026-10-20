'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/lib/app';
import { Spinner } from './ui';

export default function RequireAuth({ children, admin }) {
  const { user, ready, isAdmin } = useApp(); const path = usePathname();
  if (!ready) return <Spinner />;
  if (!user) return (<div className="card mx-auto mt-6 max-w-md text-center"><h2 className="text-xl">🔒 መጀመሪያ ይግቡ</h2><p className="muted my-3">ይህን ገጽ ለመጠቀም በአካውንትዎ መግባት ያስፈልጋል።</p><Link className="btn-primary w-full" href={`/login?next=${encodeURIComponent(path)}`}>ግባ</Link><Link className="btn-ghost mt-2 w-full" href="/register">አካውንት ክፈት</Link></div>);
  if (admin && !isAdmin) return <div className="card mt-6 text-center">አድሚን ብቻ</div>;
  return children;
}
