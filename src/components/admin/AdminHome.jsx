'use client';
/* አድሚን ዋና ማዕከል — ቁጥሮች፣ ትኩረት የሚሻ ወረፋ፣ ቻርት፣ የቅርብ እንቅስቃሴ፣ ጤና (ሁሉም ጠቅ ሲደረግ ወደ ተገቢው ክፍል ይወስዳል) */
import Ico from './Ico';
import { ETB } from '@/lib/api';

const ago = ts => { if (!ts) return ''; const m = Math.max(0, Math.round((Date.now() - ts) / 60000)); return m < 1 ? 'አሁን' : m < 60 ? m + ' ደቂቃ' : m < 1440 ? Math.round(m / 60) + ' ሰዓት' : Math.round(m / 1440) + ' ቀን'; };
const Q = [['shops', 'ሱቅ ለማጽደቅ', 'store', 'market'], ['payments', 'ክፍያ ለማረጋገጥ', 'coins', 'market'], ['settle', 'ለሻጭ ለመክፈል', 'cart', 'market'], ['refunds', 'ተመላሽ', 'refresh', 'market'], ['disputes', 'ክርክር', 'alert', 'market'], ['badges', 'የባጅ ጥያቄ', 'shield', 'trust'], ['reports', 'ክፍት ሪፖርት', 'alert', 'trust']];
const K = [['users', 'ተጠቃሚዎች', 'users', 'accounts', 'new7', '+{n} በ7 ቀን'], ['activeShops', 'ንቁ ሱቆች', 'store', 'market'], ['products', 'ዕቃዎች', 'box', 'products'], ['orders', 'ትዕዛዞች', 'cart', 'market'], ['workers', 'ሙያተኞች', 'user', 'people'], ['employers', 'አሰሪዎች', 'briefcase', 'people'], ['jobs', 'ክፍት ሥራ', 'briefcase', 'people'], ['pages', 'ገጾች', 'globe', 'pages'], ['threads', 'ውይይቶች', 'chat', 'ops'], ['alerts', 'ማንቂያዎች', 'bell', 'ops']];

export default function AdminHome({ hub, go }) {
  if (!hub) return <p className="muted py-10 text-center">⏳ በመጫን ላይ…</p>; if (!hub.ok) return <p className="msg-err">መረጃ አልተገኘም</p>;
  const { counts: c, money: m, queue, health: h } = hub, max = Math.max(1, ...hub.days.map(x => x.gmv)), qn = Q.filter(([k]) => queue[k] > 0);
  const Pill = ({ ok, label, tab }) => <button onClick={() => tab && go(tab)} className={'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ' + (ok ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800')}><span className={'h-2 w-2 rounded-full ' + (ok ? 'bg-emerald-500' : 'bg-amber-500')} />{label}</button>;
  return (
    <div className="space-y-4">
      <section className="card">
        <div className="flex items-center gap-2"><Ico n="alert" className={hub.attention ? 'text-red-600' : 'text-brand'} /><h2 className="text-lg">ትኩረት የሚሻ</h2><span className={hub.attention ? 'tag-bad ml-auto' : 'tag ml-auto'}>{hub.attention || 0}</span></div>
        {qn.length ? <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">{qn.map(([k, l, i, t]) => (
          <button key={k} onClick={() => go(t)} className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-left text-red-800 transition hover:shadow-soft active:scale-95 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
            <Ico n={i} /><span className="min-w-0 flex-1 text-sm font-bold">{l}</span><b className="rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">{queue[k]}</b></button>))}</div>
          : <p className="msg-ok mt-3"><Ico n="check" s={16} className="mr-1 inline" />ምንም የሚጠብቅ ነገር የለም — ሁሉም ተጠናቅቋል።</p>}
      </section>

      <section className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {[['ዛሬ', m.today, 'activity'], ['የ7 ቀን', m.week, 'chart'], ['ጠቅላላ ግብይት', m.gmv, 'coins'], ['የተገኘ ኮሚሽን', m.commission, 'tag']].map(([l, v, i]) => (
          <div key={l} className="card flex items-center gap-3 !p-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-brand-light text-brand dark:bg-brand/20"><Ico n={i} /></span><div className="min-w-0"><b className="block truncate text-lg">{ETB(v)}</b><span className="muted">{l}</span></div></div>))}
      </section>

      <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {K.map(([k, l, i, t, ex, exl]) => (
          <button key={k} onClick={() => go(t)} className="card !p-3 text-left transition hover:-translate-y-0.5 hover:shadow-soft active:scale-95"><div className="flex items-center justify-between text-brand"><Ico n={i} s={18} /><Ico n="arrow" s={14} className="opacity-40" /></div>
            <b className="mt-1 block text-2xl">{c[k]}</b><span className="muted">{l}</span>{ex && c[ex] > 0 && <span className="mt-0.5 block text-xs font-bold text-emerald-600">{exl.replace('{n}', c[ex])}</span>}</button>))}
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <div className="card"><div className="flex items-center gap-2"><Ico n="chart" className="text-brand" /><b>የ7 ቀን ሽያጭ</b></div>
          <div className="mt-3 flex h-32 items-end gap-2">{hub.days.map(x => <div key={x.d} className="flex flex-1 flex-col items-center justify-end" title={`${x.d}: ${ETB(x.gmv)} · ${x.orders} ትዕዛዝ · ${x.users} አዲስ ተጠቃሚ`}><div className="w-full rounded-t-lg bg-brand/80 transition-all" style={{ height: Math.max(3, (x.gmv / max) * 100) + '%' }} /><span className="mt-1 text-[10px] text-mute">{x.d}</span></div>)}</div>
          <p className="muted mt-2 text-xs">አዲስ ተጠቃሚ በቀን፦ {hub.days.map(x => x.users).join(' · ')}</p></div>
        <div className="card"><div className="flex items-center gap-2"><Ico n="server" className="text-brand" /><b>የሥርዓት ጤና</b></div>
          <div className="mt-3 flex flex-wrap gap-2"><Pill ok={h.db === 'postgres'} label={h.db === 'postgres' ? 'Postgres' : 'ፋይል ማከማቻ (ጊዜያዊ)'} /><Pill ok={h.telegram} label="Telegram" /><Pill ok={h.email} label="ኢሜይል" /><Pill ok={h.s3} label={h.s3 ? 'ውጫዊ ምስል ማከማቻ' : 'ምስል በ Postgres'} tab="market" /><Pill ok={h.errors === 0} label={h.errors ? h.errors + ' ስህተት' : 'ስህተት የለም'} tab="ops" /></div>
          <p className="muted mt-3">⏱ {h.uptimeH} ሰዓት ሲሰራ · 🧠 {h.memMB} MB · Node {h.node}</p>
          <div className="mt-3 flex flex-wrap gap-2"><button className="btn-soft" onClick={() => go('comms')}><Ico n="megaphone" s={16} />ማስታወቂያ</button><button className="btn-soft" onClick={() => go('ops')}><Ico n="download" s={16} />ምትኬ</button><button className="btn-soft" onClick={() => go('comms')}><Ico n="log" s={16} />የኦዲት መዝገብ</button></div></div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[['users', 'አዲስ ተጠቃሚዎች', 'users', 'accounts'], ['orders', 'የቅርብ ትዕዛዞች', 'cart', 'market'], ['shops', 'አዲስ ሱቆች', 'store', 'market'], ['jobs', 'አዲስ ሥራዎች', 'briefcase', 'people']].map(([k, l, i, t]) => (
          <div key={k} className="card !p-3"><button className="flex w-full items-center gap-2 text-left" onClick={() => go(t)}><Ico n={i} s={18} className="text-brand" /><b className="flex-1">{l}</b><Ico n="arrow" s={14} className="opacity-40" /></button>
            <ul className="mt-2 space-y-2">{hub.recent[k].length ? hub.recent[k].map(x => <li key={x.id} className="flex items-start gap-2 text-sm"><span className="min-w-0 flex-1"><b className="block truncate">{x.title}</b><span className="muted block truncate !text-xs">{x.sub}</span></span><span className="muted shrink-0 !text-xs">{ago(x.ts)}</span></li>) : <li className="muted">—</li>}</ul></div>))}
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="card"><div className="flex items-center gap-2"><Ico n="search" className="text-brand" /><b>በጣም የተፈለጉ</b></div><ul className="mt-2 space-y-1 text-sm">{hub.top.length ? hub.top.map(x => <li key={x.q} className="flex justify-between"><span>{x.q}</span><span className="muted">{x.n}</span></li>) : <li className="muted">ገና የለም</li>}</ul></div>
        <div className="card"><div className="flex items-center gap-2"><Ico n="alert" className="text-amber-600" /><b>ባዶ የተመለሱ (ሻጮች ሊሸጧቸው ይችላሉ)</b></div><ul className="mt-2 space-y-1 text-sm">{hub.empty.length ? hub.empty.map(x => <li key={x.q} className="flex justify-between"><span>{x.q}</span><span className="muted">{x.miss}×</span></li>) : <li className="muted">ገና የለም</li>}</ul></div>
      </section>
    </div>
  );
}
