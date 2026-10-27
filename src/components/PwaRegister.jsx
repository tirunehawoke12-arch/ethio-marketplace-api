'use client';
import { useEffect, useState } from 'react';

/* service worker ይመዘግባል + «አፑን ጫን» ቁልፍ (አንድሮይድ) + ከመስመር ውጭ ማስታወቂያ */
export default function PwaRegister() {
  const [ev, setEv] = useState(null), [off, setOff] = useState(false), [hide, setHide] = useState(false);
  useEffect(() => {
    if ('serviceWorker' in navigator && location.protocol === 'https:') navigator.serviceWorker.register('/sw.js').catch(() => { });
    const bip = e => { e.preventDefault(); setEv(e); }, on = () => setOff(false), of = () => setOff(true);
    window.addEventListener('beforeinstallprompt', bip); window.addEventListener('online', on); window.addEventListener('offline', of); setOff(!navigator.onLine);
    try { if (localStorage.getItem('etm_pwa_hide') === '1') setHide(true); } catch (e) { }
    return () => { window.removeEventListener('beforeinstallprompt', bip); window.removeEventListener('online', on); window.removeEventListener('offline', of); };
  }, []);
  const dismiss = () => { setHide(true); try { localStorage.setItem('etm_pwa_hide', '1'); } catch (e) { } };
  return (<>
    {off && <div role="status" className="fixed inset-x-0 top-0 z-[60] bg-amber-500 px-3 py-1.5 text-center text-sm font-bold text-white">📡 ኢንተርኔት የለም — የቆዩ ገጾች ይታያሉ</div>}
    {ev && !hide && <div className="fixed inset-x-3 bottom-24 z-50 mx-auto flex max-w-md items-center gap-3 rounded-3xl bg-white p-3 shadow-lift dark:bg-[#16211b] md:bottom-4"><span className="text-3xl">📲</span><div className="min-w-0 flex-1"><b className="block">አፑን በስልክዎ ይጫኑ</b><span className="muted">ፈጣን መክፈት፣ እንደ መተግበሪያ</span></div><button className="btn-primary !min-h-[40px] !px-4" onClick={async () => { ev.prompt(); try { await ev.userChoice; } catch (e) { } setEv(null); }}>ጫን</button><button onClick={dismiss} aria-label="ዝጋ" className="text-xl text-mute">✕</button></div>}
  </>);
}
