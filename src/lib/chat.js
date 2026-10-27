'use client';
import { useEffect, useState } from 'react';
import { get } from '@/lib/api';
import { useApp } from '@/lib/app';

/** ያልተነበቡ መልእክቶች ብዛት — ገጹ ሲታይ በየ 45 ሰከንድ */
export function useUnread() {
  const { user, isAdmin } = useApp(); const [n, setN] = useState(0);
  useEffect(() => {
    if (!user || isAdmin) { setN(0); return; }
    let on = true; const tick = () => { if (document.visibilityState === 'visible') get('/api/chat/unread').then(r => on && r.ok && setN(r.n | 0)).catch(() => { }); };
    tick(); const t = setInterval(tick, 45000); document.addEventListener('visibilitychange', tick);
    return () => { on = false; clearInterval(t); document.removeEventListener('visibilitychange', tick); };
  }, [user, isAdmin]);
  return n;
}
