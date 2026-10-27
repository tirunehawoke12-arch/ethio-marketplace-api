'use client';
/* ቋንቋ ምርጫ — አማርኛ (ነባሪ) · English · Afaan Oromoo · ትግርኛ
   ማስታወሻ፦ የዋናው አሰሳ (ምናሌ፣ ትሮች፣ ዋና ቁልፎች) ብቻ ተተርጉሟል፤ ትርጉሙን አፍ-መፍቻ ተናጋሪ ቢያይ ይመረጣል። */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export const LANGS = [['am', 'አማርኛ'], ['en', 'English'], ['om', 'Afaan Oromoo'], ['ti', 'ትግርኛ']];
const D = {
  home: { am: 'መነሻ', en: 'Home', om: 'Jalqaba', ti: 'መእተዊ' },
  market: { am: 'ገበያ', en: 'Market', om: 'Gabaa', ti: 'ዕዳጋ' },
  products: { am: 'ዕቃዎች', en: 'Products', om: 'Meeshaalee', ti: 'ኣቑሑት' },
  shops: { am: 'ሱቆች', en: 'Shops', om: 'Suuqota', ti: 'ድኳናት' },
  sites: { am: 'ገጾች', en: 'Pages', om: 'Fuulota', ti: 'ገጻት' },
  workers: { am: 'ሙያተኞች', en: 'Workers', om: 'Ogeeyyii', ti: 'ክኢላታት' },
  employers: { am: 'አሰሪዎች', en: 'Employers', om: 'Hojjachiistota', ti: 'ኣሰራሕቲ' },
  jobs: { am: 'ሥራ', en: 'Jobs', om: 'Hojii', ti: 'ስራሕ' },
  cart: { am: 'ጋሪ', en: 'Cart', om: 'Gaarii', ti: 'ቅርጫት' },
  messages: { am: 'መልእክቶች', en: 'Messages', om: 'Ergaawwan', ti: 'መልእኽታት' },
  login: { am: 'ግባ', en: 'Log in', om: 'Seeni', ti: 'እቶ' },
  logout: { am: 'ውጣ', en: 'Log out', om: "Ba'i", ti: 'ውጻእ' },
  orders: { am: 'ትዕዛዞቼ', en: 'My orders', om: 'Ajajoota koo', ti: 'ትዕዛዛተይ' },
  mypages: { am: 'ገጾቼ', en: 'My page', om: 'Fuula koo', ti: 'ገጸይ' },
  apps: { am: 'ማመልከቻዎቼ', en: 'My applications', om: 'Iyyannoo koo', ti: 'ማመልከቻታተይ' },
  private: { am: 'የግል መረጃ', en: 'Private info', om: 'Odeeffannoo dhuunfaa', ti: 'ውልቃዊ ሓበሬታ' },
  security: { am: 'የይለፍ ቃል', en: 'Password', om: 'Jecha icciitii', ti: 'ምስጢራዊ ቃል' },
  search: { am: 'ዕቃ፣ ሱቅ፣ ገጽ ወይም ሙያ ፈልግ', en: 'Search products, shops, pages or jobs', om: 'Meeshaa, suuqa, fuula ykn hojii barbaadi', ti: 'ኣቑሑት፣ ድኳን፣ ገጽ ወይ ስራሕ ድለይ' },
  about: { am: 'ስለ እኛ', en: 'About us', om: "Waa'ee keenya", ti: 'ብዛዕባና' },
  help: { am: 'እገዛ', en: 'Help', om: 'Gargaarsa', ti: 'ሓገዝ' },
  privacy: { am: 'ግላዊነት', en: 'Privacy', om: 'Iccitii', ti: 'ምስጢራዊነት' },
  terms: { am: 'ደንቦች', en: 'Terms', om: 'Seerota', ti: 'ሕግታት' },
  theme: { am: 'ገጽታ', en: 'Theme', om: 'Bifa', ti: 'ገጽታ' },
  language: { am: 'ቋንቋ', en: 'Language', om: 'Afaan', ti: 'ቋንቋ' },
  install: { am: 'አፑን ጫን', en: 'Install app', om: 'Appii buusi', ti: 'ኣፕ ጸዓን' },
};
const Ctx = createContext({ lang: 'am', t: k => (D[k] || {}).am || k, setLang() { } });
export function LangProvider({ children }) {
  const [lang, setL] = useState('am');
  useEffect(() => { try { const v = localStorage.getItem('etm_lang'); if (v && LANGS.some(l => l[0] === v)) setL(v); } catch (e) { } }, []);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
  const setLang = useCallback(v => { setL(v); try { localStorage.setItem('etm_lang', v); } catch (e) { } }, []);
  const t = useCallback(k => (D[k] && (D[k][lang] || D[k].am)) || k, [lang]);
  const val = useMemo(() => ({ lang, t, setLang }), [lang, t, setLang]);
  return <Ctx.Provider value={val}>{children}</Ctx.Provider>;
}
export const useT = () => useContext(Ctx);
