'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RequireAuth from '@/components/RequireAuth';
import SiteBuilder from '@/components/SiteBuilder';
import { Spinner } from '@/components/ui';
import { get } from '@/lib/api';
// አንድ ሰው አንድ ገጽ ብቻ — ካለው ወደ ነባሩ ገጹ ይወስዳል
function Gate() {
  const router = useRouter(); const [ok, setOk] = useState(false);
  useEffect(() => { get('/api/pages/my/list').then(r => { const one = r.ok && r.items && r.items[0]; if (one) router.replace('/me/sites/' + one.id); else setOk(true); }); }, [router]);
  return ok ? <SiteBuilder /> : <Spinner />;
}
export default function Page() { return <RequireAuth><Gate /></RequireAuth>; }
