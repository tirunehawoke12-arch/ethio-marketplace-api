'use client';
import { useEffect, useState } from 'react';
import { LANGS, useT } from '@/lib/i18n';

/* ገጽታ (ራስ-ሰር ☀️/🌙) እና ቋንቋ ምርጫ — በራስጌ ምናሌ ውስጥ */
const apply = m => { const d = m === 'dark' || (m === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches); document.documentElement.classList.toggle('dark', d); };
export default function ThemeLang() {
  const { lang, setLang, t } = useT(); const [mode, setMode] = useState('auto');
  useEffect(() => { try { setMode(localStorage.getItem('etm_theme') || 'auto'); } catch (e) { } const mq = matchMedia('(prefers-color-scheme: dark)'), f = () => { try { if ((localStorage.getItem('etm_theme') || 'auto') === 'auto') apply('auto'); } catch (e) { } }; mq.addEventListener && mq.addEventListener('change', f); return () => mq.removeEventListener && mq.removeEventListener('change', f); }, []);
  const pick = m => { setMode(m); try { localStorage.setItem('etm_theme', m); } catch (e) { } apply(m); };
  return (
    <div className="border-t border-line px-3 py-2 dark:border-[#25352c]">
      <p className="muted mb-1 font-bold">{t('theme')}</p>
      <div className="flex gap-1">{[['light', '☀️'], ['auto', '🌓'], ['dark', '🌙']].map(([k, i]) => <button key={k} onClick={() => pick(k)} aria-pressed={mode === k} className={'flex-1 rounded-xl py-1.5 text-lg ' + (mode === k ? 'bg-brand text-white' : 'bg-brand-light dark:bg-[#1b2b22]')}>{i}</button>)}</div>
      <p className="muted mb-1 mt-2 font-bold">{t('language')}</p>
      <div className="grid grid-cols-2 gap-1">{LANGS.map(([k, n]) => <button key={k} onClick={() => setLang(k)} aria-pressed={lang === k} className={'rounded-xl px-2 py-1.5 text-xs font-extrabold ' + (lang === k ? 'bg-brand text-white' : 'bg-brand-light dark:bg-[#1b2b22]')}>{n}</button>)}</div>
    </div>
  );
}
