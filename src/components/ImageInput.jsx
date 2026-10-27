'use client';
import { useState } from 'react';
import { imgUrl, post } from '@/lib/api';
import { errText } from '@/lib/consts';

async function compress(file) {
  const url = await new Promise(r => { const f = new FileReader(); f.onload = () => r(f.result); f.readAsDataURL(file); });
  const im = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  const k = Math.min(1, 1000 / Math.max(im.width, im.height)), c = document.createElement('canvas');
  c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
  // WebP ከተደገፈ (ከ JPEG ~30% ያነሰ) — ካልሆነ JPEG። ከ ~220KB እስኪያንስ ጥራት ይቀንሳል፤ ያ ካልበቃ መጠን ይቀነሳል
  const mime = c.toDataURL('image/webp', 0.8).startsWith('data:image/webp') ? 'image/webp' : 'image/jpeg';
  let q = 0.82, d = c.toDataURL(mime, q); while (d.length > 300000 && q > 0.45) { q -= 0.08; d = c.toDataURL(mime, q); } return d;
}
/** value፦ የምስል መታወቂያዎች ዝርዝር፤ max=1 ከሆነ አንድ ምስል */
export default function ImageInput({ label, value = [], onChange, max = 4 }) {
  const [busy, setBusy] = useState(false); const [err, setErr] = useState('');
  async function add(e) {
    const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return; setBusy(true); setErr('');
    try { const r = await post('/api/market/upload', { dataUrl: await compress(f) }); if (!r.ok) throw new Error(r.error); onChange(max === 1 ? [r.id] : [...value, r.id].slice(0, max)); } catch (x) { setErr(errText(x.message)); }
    setBusy(false);
  }
  return (
    <div>
      {label && <p className="label">{label}</p>}
      <div className="flex flex-wrap gap-2">
        {value.map((id, k) => (
          <div key={id} className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imgUrl(id)} alt="" className="h-16 w-16 rounded-2xl bg-brand-light object-cover" />
            <button type="button" onClick={() => onChange(value.filter((_, i) => i !== k))} className="absolute -right-2 -top-2 grid h-6 w-6 place-items-center rounded-full bg-red-600 text-xs text-white" aria-label="አስወግድ">✕</button>
          </div>
        ))}
        {value.length < max && (<label className="grid h-16 w-16 cursor-pointer place-items-center rounded-2xl border-2 border-dashed border-line text-2xl text-mute hover:border-brand">{busy ? '⏳' : '＋'}<input type="file" accept="image/*" className="hidden" onChange={add} disabled={busy} /></label>)}
      </div>
      {err && <p className="msg-err mt-2">{err}</p>}
    </div>
  );
}
