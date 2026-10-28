'use client';
/* አድሚን፦ ትንታኔ፣ ባዶ ፍለጋ፣ የሰርቨር ስህተቶች፣ ምትኬ */
import { useEffect, useState } from 'react';
import { get, tok, ETB } from '@/lib/api';
import { errText } from '@/lib/consts';
import { Spinner } from '@/components/ui';

export default function AdminOps() {
  const [d, setD] = useState(null), [busy, setBusy] = useState(false), [err, setErr] = useState('');
  useEffect(() => { get('/api/admin/ops').then(setD); }, []);
  async function backup() {
    setBusy(true); setErr('');
    try {
      const r = await fetch('/api/admin/backup', { headers: { authorization: 'Bearer ' + tok() } }); if (!r.ok) throw new Error('x');
      const a = document.createElement('a'); a.href = URL.createObjectURL(await r.blob()); a.download = 'etio-backup-' + new Date().toISOString().slice(0, 10) + '.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    } catch (e) { setErr('ምትኬ አልወረደም'); } setBusy(false);
  }
  if (!d) return <Spinner />; if (!d.ok) return <p className="msg-err">{errText(d.error)}</p>;
  const max = Math.max(1, ...d.days.map(x => x.gmv)), T = d.totals;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-2 text-center text-sm sm:grid-cols-6">{[['👥', 'ተጠቃሚ', T.users], ['🏪', 'ሱቅ', T.shops], ['🛍', 'ዕቃ', T.products], ['🧑‍🔧', 'ሙያተኛ', T.workers], ['💼', 'ሥራ', T.jobs], ['🌐', 'ገጽ', T.pages]].map(([i, l, n]) => <div key={l} className="card p-2"><div className="text-xl">{i}</div><b>{n}</b><div className="muted">{l}</div></div>)}</div>
      <div className="card p-3"><b>📈 የ14 ቀን ሽያጭ (የተከፈለ)</b>
        <div className="mt-2 flex h-28 items-end gap-1">{d.days.map(x => <div key={x.d} className="flex flex-1 flex-col items-center justify-end" title={`${x.d}: ${ETB(x.gmv)} · ${x.orders} ትዕዛዝ · ${x.users} አዲስ ተጠቃሚ`}><div className="w-full rounded-t bg-brand" style={{ height: Math.max(2, x.gmv / max * 100) + '%' }} /><span className="mt-1 text-[10px] muted">{x.d.slice(3)}</span></div>)}</div>
        <p className="muted mt-2 text-xs">አዲስ ተጠቃሚ በቀን፦ {d.days.map(x => x.users).join(' · ')}</p></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="card p-3"><b>🔎 በጣም የተፈለጉ</b>{d.top.length ? <ul className="mt-2 space-y-1 text-sm">{d.top.map(x => <li key={x.q} className="flex justify-between"><span>{x.q}</span><span className="muted">{x.n}</span></li>)}</ul> : <p className="muted mt-2 text-sm">ገና ፍለጋ የለም።</p>}</div>
        <div className="card p-3"><b>🕳 ባዶ የተመለሱ (ሻጮች ሊሸጧቸው ይችላሉ)</b>{d.empty.length ? <ul className="mt-2 space-y-1 text-sm">{d.empty.map(x => <li key={x.q} className="flex justify-between"><span>{x.q}</span><span className="muted">{x.miss}×</span></li>)}</ul> : <p className="muted mt-2 text-sm">ባዶ ፍለጋ የለም ✨</p>}</div>
      </div>
      <div className="card p-3"><b>🛠 የሰርቨር ስህተቶች</b> <span className="muted text-xs">(ሰርቨሩ ከተነሳ ጀምሮ {d.uptimeH} ሰዓት · {d.mem} MB)</span>
        {d.errors.length ? <ul className="mt-2 space-y-2 text-xs">{d.errors.slice(0, 20).map((e, i) => <li key={i} className="rounded-xl bg-brand-light p-2"><b>{new Date(e.ts).toLocaleString('en-GB')}</b> · {e.where}<br />{e.msg}<br /><span className="muted">{e.stack}</span></li>)}</ul> : <p className="muted mt-2 text-sm">ምንም ስህተት የለም ✅</p>}</div>
      <div className="card p-3"><b>💾 ምትኬ</b><p className="muted my-1 text-sm">ሁሉንም መረጃ (ምስሎች ሳይጨምር) በአንድ JSON ፋይል ያውርዱ። በሳምንት አንዴ ቢያደርጉት ይመከራል፤ ፋይሉ የተጠቃሚ መረጃ ስላለው ደህንነቱን ይጠብቁ።</p>
        <button className="btn" disabled={busy} onClick={backup}>{busy ? '…' : '⬇️ ምትኬ አውርድ'}</button>{err && <p className="msg-err mt-2">{err}</p>}</div>
    </div>
  );
}
