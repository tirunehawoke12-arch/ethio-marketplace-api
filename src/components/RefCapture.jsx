'use client';
/* `/?ref=ኮድ` ን ያስታውሳል፤ ተጠቃሚው ከገባ በኋላ ራሱ ይቀበላል (አንዴ ብቻ፣ ጸጥ ብሎ) */
import { useEffect } from 'react';
import { post } from '@/lib/api';
import { useApp } from '@/lib/app';

export default function RefCapture() {
  const { user } = useApp();
  useEffect(() => { try { const r = new URLSearchParams(location.search).get('ref'); if (r && /^[A-Za-z0-9]{6}$/.test(r)) localStorage.setItem('etm_ref', r.toUpperCase()); } catch (e) { } }, []);
  useEffect(() => { if (!user) return; let c = ''; try { c = localStorage.getItem('etm_ref') || ''; } catch (e) { } if (!c) return; post('/api/referral/claim', { code: c }).then(() => { try { localStorage.removeItem('etm_ref'); } catch (e) { } }); }, [user]);
  return null;
}
