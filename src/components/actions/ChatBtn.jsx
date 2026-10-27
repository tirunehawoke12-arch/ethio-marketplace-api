'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { post } from '@/lib/api';
import { errText } from '@/lib/consts';
import { useApp } from '@/lib/app';

/** «💬 መልእክት ላክ» — t፦ s ሱቅ · p ዕቃ · w ሙያተኛ · e አሰሪ · j ሥራ · g ገጽ */
export default function ChatBtn({ t, id, className = 'btn-ghost', children }) {
  const { user } = useApp(), router = useRouter(); const [busy, setBusy] = useState(false), [m, setM] = useState('');
  async function go() {
    if (!user) return router.push('/login?next=' + encodeURIComponent(location.pathname));
    setBusy(true); setM(''); const r = await post('/api/chat/start', { t, id }); setBusy(false);
    r.ok ? router.push('/me/messages/' + r.id) : setM(errText(r.error));
  }
  return (<><button type="button" className={className + ' w-full'} disabled={busy} onClick={go}>{busy ? '⏳…' : children || '💬 መልእክት ላክ'}</button>{m && <p className="msg-err mt-2">{m}</p>}</>);
}
