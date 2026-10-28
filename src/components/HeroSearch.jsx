'use client';
import { useT } from '@/lib/i18n';
export default function HeroSearch() {
  const { t } = useT();
  return (<form action="/market" className="relative mt-5 flex max-w-xl gap-2"><input name="q" className="input !border-0" placeholder={t('ph_search_home')} aria-label={t('btn_search')} /><button className="btn !bg-gold !text-ink shrink-0">{t('btn_search')}</button></form>);
}
