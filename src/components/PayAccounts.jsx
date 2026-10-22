'use client';
import { useEffect, useState } from 'react';
import { ETB, get } from '@/lib/api';

function Copy({ text, label = 'ቅዳ' }) {
  const [ok, setOk] = useState(false);
  return <button type="button" className="btn-ghost !min-h-[36px] !px-3 text-xs" onClick={async () => { try { await navigator.clipboard.writeText(text); setOk(true); setTimeout(() => setOk(false), 1800); } catch (e) { } }}>{ok ? '✓ ተቀድቷል' : '📋 ' + label}</button>;
}
/** ገዥው ወደሚከፍልበት ቦታ ሁሉ በራስ-ሰር የሚመጣ የክፍያ አካውንቶች (ለገቡ ተጠቃሚዎች ብቻ) */
export default function PayAccounts({ amount, note }) {
  const [acc, setAcc] = useState(null);
  useEffect(() => { get('/api/market/config').then(r => setAcc(r.accounts || [])); }, []);
  if (acc === null) return <p className="muted my-3">⏳ የክፍያ አካውንቶች በመጫን ላይ…</p>;
  return (
    <div className="my-3 rounded-3xl border-2 border-brand/30 bg-brand-light p-3 dark:bg-brand/10">
      <p className="font-extrabold">💳 ወደ እነዚህ ይክፈሉ{amount ? <> — <span className="text-brand">{ETB(amount)}</span> <Copy text={String(amount)} label="መጠን ቅዳ" /></> : ''}</p>
      {acc.length ? acc.map(a => (
        <div key={a.number} className="mt-2 flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white p-3 dark:bg-[#16211b]">
          <div className="min-w-0"><p className="text-xs font-bold text-mute">{a.method}</p><p className="font-mono text-lg font-black tracking-wide">{a.number}</p><p className="muted">{a.holder}</p></div>
          <Copy text={a.number} label="ቁጥር ቅዳ" />
        </div>
      )) : <p className="mt-2 text-sm">የክፍያ አካውንት ገና አልተዘጋጀም — አድሚኑን ያነጋግሩ።</p>}
      <p className="muted mt-2">ከከፈሉ በኋላ የግብይት ማጣቀሻ ቁጥሩን (ከ telebirr / ባንክ የደረሰዎት መልዕክት) በትዕዛዝዎ ገጽ ያስገቡ።{note ? ' ' + note : ''}</p>
    </div>
  );
}
