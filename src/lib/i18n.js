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
  hero_badge: { am: '🇪🇹 የኢትዮጵያ ዲጂታል ገበያ', en: "🇪🇹 Ethiopia's Digital Market", om: '🇪🇹 Gabaa Dijitaalaa Itiyoophiyaa', ti: '🇪🇹 ዲጂታላዊ ዕዳጋ ኢትዮጵያ' },
  hero_title: { am: 'ሱቅ፣ ሆቴል፣ ሙያተኛ እና ሥራ — በአንድ ቦታ', en: 'Shops, hotels, professionals and jobs — in one place', om: 'Suuqa, hoteelota, ogeeyyii fi hojii — iddoo tokkotti', ti: 'ድኳን፣ ሆቴል፣ ክኢላታትን ስራሕን — ኣብ ሓደ ቦታ' },
  hero_sub: { am: 'ይፈልጉ፣ ይምረጡ፣ በደህንነት ይክፈሉ። ወይም የራስዎን ገጽ ከፍተው ለመላው ኢትዮጵያ ያሳዩ።', en: 'Search, choose and pay safely. Or open your own page and show it to all of Ethiopia.', om: 'Barbaadaa, filadhaa, nageenyaan kaffalaa. Ykn fuula keessan banaatii Itiyoophiyaa guutuu agarsiisaa.', ti: 'ደልዩ፣ ምረጹ፣ ብውሑስ መገዲ ኽፈሉ። ወይ ናትኩም ገጽ ከፊትኩም ንዅሉ ኢትዮጵያ ኣርእዩ።' },
  ph_search_home: { am: '🔎 ምን ይፈልጋሉ?', en: '🔎 What are you looking for?', om: '🔎 Maal barbaaddu?', ti: '🔎 እንታይ ትደልዩ?' },
  btn_search: { am: 'ፈልግ', en: 'Search', om: 'Barbaadi', ti: 'ደሊ' },
  open_page: { am: '🌐 የራስዎን ገጽ ይክፈቱ', en: '🌐 Open your own page', om: '🌐 Fuula keessan banaa', ti: '🌐 ናትኩም ገጽ ክፈቱ' },
  open_shop: { am: '🏪 ሱቅ ክፈት', en: '🏪 Open a shop', om: '🏪 Suuqa bani', ti: '🏪 ድኳን ክፈት' },
  jobs_btn: { am: '💼 ሥራ', en: '💼 Jobs', om: '💼 Hojii', ti: '💼 ስራሕ' },
  tr1: { am: 'ደህንነቱ የተጠበቀ ክፍያ', en: 'Safe payment', om: 'Kaffaltii eegamaa', ti: 'ውሑስ ክፍሊት' },
  tr1d: { am: 'ገንዘብዎ ዕቃው እስኪደርስ ይጠበቃል', en: 'Your money is held until the item arrives', om: 'Maallaqni keessan hanga meeshaan ga’utti eegama', ti: 'ገንዘብኩም ኣቑሑቱ ክሳብ ዝበጽሕ ይሕለው' },
  tr2: { am: 'የራስዎ ገጽ', en: 'Your own page', om: 'Fuula keessan', ti: 'ናትኩም ገጽ' },
  tr2d: { am: 'ሱቅ፣ ሆቴል፣ ሙያ — ነጻ ድረ-ገጽ', en: 'Shop, hotel, profession — a free web page', om: 'Suuqa, hoteela, ogummaa — fuula weebii bilisaa', ti: 'ድኳን፣ ሆቴል፣ ሞያ — ነጻ ገጽ ወብ' },
  tr3: { am: 'በ Telegram ም', en: 'Also on Telegram', om: 'Telegram irrattis', ti: 'ብ Telegram እውን' },
  tr3d: { am: 'ሁሉም ነገር በቦት ይሠራል', en: 'Everything works in the bot', om: 'Hundi isaa boot keessatti hojjata', ti: 'ኩሉ ነገር ብቦት ይሰርሕ' },
  tr4: { am: 'መላው ኢትዮጵያ', en: 'All of Ethiopia', om: 'Itiyoophiyaa guutuu', ti: 'ኩሉ ኢትዮጵያ' },
  tr4d: { am: 'ከክልል እስከ ወረዳ', en: 'From region to woreda', om: 'Naannoo irraa hanga aanaatti', ti: 'ካብ ክልል ክሳብ ወረዳ' },
  sec_new_products: { am: '✨ አዳዲስ ዕቃዎች', en: '✨ New products', om: '✨ Meeshaalee haaraa', ti: '✨ ሓደስቲ ኣቑሑት' },
  sec_shops: { am: '🏪 ሱቆች እና ድርጅቶች', en: '🏪 Shops and businesses', om: '🏪 Suuqotaa fi dhaabbilee', ti: '🏪 ድኳናትን ትካላትን' },
  sec_workers: { am: '🧑‍🔧 ሙያተኞች', en: '🧑‍🔧 Professionals', om: '🧑‍🔧 Ogeeyyii', ti: '🧑‍🔧 ክኢላታት' },
  sec_jobs: { am: '💼 አዳዲስ ሥራዎች', en: '💼 New jobs', om: '💼 Hojiiwwan haaraa', ti: '💼 ሓደስቲ ስራሕቲ' },
  see_all: { am: 'ሁሉንም ተመልከት ›', en: 'See all ›', om: 'Hunda ilaali ›', ti: 'ኩሉ ርአ ›' },
  all_more: { am: 'ሁሉም ›', en: 'All ›', om: 'Hunda ›', ti: 'ኩሉ ›' },
  cart_title: { am: '🛒 ጋሪዬ', en: '🛒 My cart', om: '🛒 Gaarii koo', ti: '🛒 ቅርጫተይ' },
  cart_empty: { am: 'ጋሪዎ ባዶ ነው', en: 'Your cart is empty', om: 'Gaariin keessan duwwaa dha', ti: 'ቅርጫትኩም ባዶ እዩ' },
  to_market: { am: 'ወደ ገበያ', en: 'Go to market', om: 'Gara gabaatti', ti: 'ናብ ዕዳጋ' },
  cart_sub: { am: 'ድምር (ያለ ማድረሻ ክፍያ)', en: 'Subtotal (excl. delivery)', om: 'Waliigala (kaffaltii ergaa malee)', ti: 'ጠቕላላ (ብዘይ ክፍሊት ምብጻሕ)' },
  add_cart: { am: '🛒 ወደ ጋሪ', en: '🛒 Add to cart', om: '🛒 Gaariitti ida’i', ti: '🛒 ናብ ቅርጫት' },
  buy_now: { am: '⚡ አሁን ግዛ', en: '⚡ Buy now', om: '⚡ Amma bitadhu', ti: '⚡ ሕጂ ግዛእ' },
  added: { am: '✅ ወደ ጋሪ ተጨምሯል', en: '✅ Added to cart', om: '✅ Gaariitti ida’ameera', ti: '✅ ናብ ቅርጫት ተወሲኹ' },
  coupon_ph: { am: '🎟 የኩፖን ኮድ (አማራጭ)', en: '🎟 Coupon code (optional)', om: '🎟 Koodii kuuppoonii (filannoo)', ti: '🎟 ኮድ ኩፖን (ዘይግዱድ)' },
  apply: { am: 'ተግብር', en: 'Apply', om: 'Hojiirra oolchi', ti: 'ተግብር' },
  discount: { am: 'ቅናሽ', en: 'Discount', om: 'Hir’ina', ti: 'ቅናሽ' },
  total: { am: 'ድምር', en: 'Total', om: 'Waliigala', ti: 'ጠቕላላ' },
  invite: { am: '🎁 ጓደኛ ጋብዝ', en: '🎁 Invite a friend', om: '🎁 Hiriyaa affeeri', ti: '🎁 ዓርኪ ዓድም' },
  checkout_title: { am: 'ክፍያ ደረጃ', en: 'Checkout', om: 'Sadarkaa kaffaltii', ti: 'ደረጃ ክፍሊት' },
  next: { am: 'ቀጥል ›', en: 'Continue ›', om: 'Itti fufi ›', ti: 'ቀጽል ›' },
  back: { am: '‹ ተመለስ', en: '‹ Back', om: '‹ Duubatti', ti: '‹ ተመለስ' },
  place_order: { am: '✅ ትዕዛዝ አስገባ', en: '✅ Place order', om: '✅ Ajaja galchi', ti: '✅ ትዕዛዝ የእትው' },
  pickup: { am: '🏬 በአካል እወስዳለሁ', en: '🏬 I will pick up', om: '🏬 Ofiin fudhadha', ti: '🏬 ባዕለይ ክወስድ እየ' },
  deliver: { am: '🚚 ይድረሰኝ', en: '🚚 Deliver to me', om: '🚚 Natti haa ergamu', ti: '🚚 ይበጽሓኒ' },
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
/* በ server component ውስጥም ይሰራል፦ <T k="hero_title" /> */
export const T = ({ k }) => { const { t } = useContext(Ctx); return t(k); };
