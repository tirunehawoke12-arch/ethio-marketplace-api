// የገጽ አብነቶች — ተጠቃሚው ከአንዱ ይጀምራል ከዚያ ራሱ ያክላል፣ ይሰርዛል፣ ይቀይራል (እንደ Google Form)
let n = 0; const id = () => 'f' + Date.now().toString(36) + (n++).toString(36);
const F = (label, type = 'text', o = {}) => ({ id: id(), label, type, hint: '', required: false, options: [], priv: false, value: type === 'multi' || type === 'image' ? [] : '', ...o });
const S = (icon, title, fields) => ({ id: id(), icon, title, fields });

export const FIELD_TYPES = [
  ['text', '✏️ አጭር ጽሑፍ'], ['long', '📝 ረጅም ጽሑፍ'], ['number', '🔢 ቁጥር'], ['phone', '📞 ስልክ'], ['link', '🔗 ሊንክ'], ['date', '📅 ቀን'],
  ['choice', '🔘 አንድ ምርጫ'], ['multi', '☑️ ብዙ ምርጫ'], ['yesno', '✅ አዎ / አይደለም'], ['image', '🖼️ ፎቶ'],
];
export const THEMES = {
  green: ['#0a8a56', '#0b6e8f', 'አረንጓዴ'], ocean: ['#0b6e8f', '#2b4acb', 'ውቅያኖስ'], sunset: ['#e8590c', '#c2255c', 'ፀሐይ መጥለቂያ'], royal: ['#6741d9', '#364fc7', 'ሐምራዊ'],
  rose: ['#d6336c', '#ae3ec9', 'ጽጌረዳ'], night: ['#212529', '#495057', 'ሌሊት'], gold: ['#b8860b', '#e67700', 'ወርቅ'],
};
export const themeGrad = t => { const c = THEMES[t] || THEMES.green; return `linear-gradient(135deg, ${c[0]}, ${c[1]})`; };
export const themeColor = t => (THEMES[t] || THEMES.green)[0];

const PAYMENT = () => S('💳', 'ክፍያ እና የባንክ መረጃ', [
  F('የክፍያ መቀበያ ዘዴ', 'choice', { options: ['telebirr', 'CBE Birr', 'ንግድ ባንክ', 'አዋሽ ባንክ', 'ዳሽን ባንክ', 'አቢሲኒያ ባንክ', 'ሌላ'], priv: true }),
  F('የአካውንት / የስልክ ቁጥር', 'text', { priv: true }), F('የአካውንት ባለቤት ስም', 'text', { priv: true }),
  F('የሚቀበሏቸው የክፍያ ዘዴዎች', 'multi', { options: ['ጥሬ ገንዘብ', 'telebirr', 'ባንክ ማስተላለፍ', 'ካርድ'] }),
]);
const ADDRESS = () => S('📍', 'አድራሻ', [
  F('ክልል', 'text'), F('ዞን / ክፍለ ከተማ', 'text'), F('ወረዳ / ቀበሌ', 'text'), F('ከተማ', 'text'), F('ዝርዝር አድራሻ / ምልክት', 'long'), F('የካርታ ሊንክ (Google Maps)', 'link'), F('የሥራ ሰዓት', 'text', { hint: 'ለምሳሌ ሰኞ–ቅዳሜ 2:00–12:00' }),
]);
const CONTACT = () => S('☎️', 'ማግኛ', [F('ስልክ', 'phone'), F('Telegram', 'link', { hint: '@username ወይም ሊንክ' }), F('Facebook', 'link'), F('TikTok / Instagram', 'link'), F('ድረ-ገጽ', 'link')]);
const ABOUT_ME = () => S('🙋', 'ስለ እኔ', [F('ሙሉ ስም', 'text', { required: true }), F('ስለ እኔ አጭር መግለጫ', 'long'), F('ዕድሜ ክልል', 'choice', { options: ['18–25', '26–35', '36–45', '46+'] }), F('ቋንቋዎች', 'multi', { options: ['አማርኛ', 'ኦሮምኛ', 'ትግርኛ', 'ሶማሊኛ', 'ሲዳምኛ', 'እንግሊዝኛ', 'ዐረብኛ'] })]);
const ID_PRIV = () => S('🪪', 'መታወቂያ (ለአድሚን ብቻ)', [F('የመታወቂያ ዓይነት', 'choice', { options: ['ቀበሌ መታወቂያ', 'ፓስፖርት', 'መንጃ ፈቃድ', 'ብሔራዊ መታወቂያ'], priv: true }), F('የመታወቂያ ፎቶ', 'image', { priv: true }), F('የንግድ ፈቃድ ቁጥር', 'text', { priv: true })]);

export const TEMPLATES = [
  { key: 'worker', icon: '🧑‍🔧', kind: 'ሠራተኛ', name: 'ሠራተኛ / ሙያተኛ', tagline: 'ሙያዬን ያሳዩ — ሥራ ያግኙ', build: () => [
    ABOUT_ME(),
    S('🛠️', 'ስለ ሥራዬ', [F('ሙያ', 'text', { required: true }), F('ዘርፍ', 'choice', { options: ['ግንባታ', 'ጥገና እና ቴክኒክ', 'ትምህርት', 'ጤና', 'ሹፌር', 'ምግብ ማብሰል', 'ጽዳት', 'ደህንነት', 'ቴክኖሎጂ', 'ሌላ'] }), F('ክህሎቶች', 'long'), F('የልምድ ዓመት', 'number'), F('ትምህርት', 'text'), F('የሥራ ናሙና ፎቶዎች', 'image'), F('የሚጠይቁት ክፍያ (ብር)', 'number'), F('ክፍያ የሚሰላው በ', 'choice', { options: ['ሰዓት', 'ቀን', 'ወር', 'ሥራ'] }), F('ለሥራ ዝግጁ ነኝ', 'yesno')]),
    ADDRESS(), PAYMENT(), CONTACT(), ID_PRIV()] },
  { key: 'employer', icon: '🏢', kind: 'አሰሪ', name: 'አሰሪ / ድርጅት', tagline: 'ብቁ ሠራተኛ ይፈልጋሉ?', build: () => [
    S('🏢', 'ስለ ድርጅቱ', [F('የድርጅት ስም', 'text', { required: true }), F('ዘርፍ', 'text'), F('መጠን', 'choice', { options: ['1–10', '11–50', '51–200', '200+'] }), F('የተቋቋመበት ዓመት', 'number'), F('ስለ ድርጅታችን', 'long'), F('ፎቶዎች', 'image')]),
    S('💼', 'የሥራ ዕድሎች', [F('አሁን የሚፈለጉ ሙያዎች', 'long'), F('የሚፈለጉ ሰዎች ብዛት', 'number'), F('የሥራ ዓይነት', 'multi', { options: ['ሙሉ ጊዜ', 'ትርፍ ጊዜ', 'ኮንትራት', 'ጊዜያዊ', 'ልምምድ'] }), F('የደመወዝ ክልል', 'text'), F('ማመልከቻ የሚያልቅበት ቀን', 'date'), F('ጥቅማ ጥቅሞች', 'long')]),
    ADDRESS(), PAYMENT(), CONTACT(), ID_PRIV()] },
  { key: 'shop', icon: '🏪', kind: 'ሱቅ', name: 'ሱቅ / ነጋዴ', tagline: 'ዕቃዎችዎን ያሳዩ', build: () => [
    S('🏪', 'ስለ ሱቁ', [F('የሱቅ ስም', 'text', { required: true }), F('የምንሸጣቸው ዕቃዎች ዓይነት', 'multi', { options: ['ምግብ እና መጠጥ', 'ልብስ እና ጫማ', 'ኤሌክትሮኒክስ', 'ሞባይል', 'የቤት ዕቃ', 'ግንባታ', 'ግብርና', 'ውበት', 'መጻሕፍት'] }), F('ስለ ሱቃችን', 'long'), F('የተመሠረተበት ዓመት', 'number'), F('የዕቃ ፎቶዎች', 'image')]),
    S('🛍️', 'ዋጋ እና አገልግሎት', [F('ዋና ዋና ዕቃዎች እና ዋጋ', 'long'), F('ማድረስ አለ', 'yesno'), F('የማድረሻ ክፍያ (ብር)', 'number'), F('የሚደርስባቸው አካባቢዎች', 'text'), F('ቅናሽ / ማስታወቂያ', 'long')]),
    ADDRESS(), PAYMENT(), CONTACT(), ID_PRIV()] },
  { key: 'hotel', icon: '🏨', kind: 'ሆቴል', name: 'ሆቴል / ማረፊያ', tagline: 'እንግዶችን ይቀበሉ', build: () => [
    S('🏨', 'ስለ ሆቴሉ', [F('የሆቴል ስም', 'text', { required: true }), F('ደረጃ', 'choice', { options: ['1 ኮከብ', '2 ኮከብ', '3 ኮከብ', '4 ኮከብ', '5 ኮከብ', 'ደረጃ የለውም'] }), F('ስለ ሆቴላችን', 'long'), F('ፎቶዎች', 'image')]),
    S('🛏️', 'ክፍሎች እና ዋጋ', [F('የክፍል ዓይነቶች', 'multi', { options: ['ነጠላ', 'ድርብ', 'ቤተሰብ', 'ስዊት', 'ዶርም'] }), F('የክፍል ብዛት', 'number'), F('ዝቅተኛ ዋጋ በአንድ ሌሊት (ብር)', 'number'), F('አገልግሎቶች', 'multi', { options: ['ቁርስ', 'ዋይፋይ', 'ፓርኪንግ', 'ምግብ ቤት', 'ባር', 'ጂም', 'ስብሰባ አዳራሽ', 'ማጓጓዣ'] }), F('የመግቢያ ሰዓት', 'text'), F('የመውጫ ሰዓት', 'text')]),
    ADDRESS(), PAYMENT(), CONTACT(), ID_PRIV()] },
  { key: 'service', icon: '🧰', kind: 'አገልግሎት ሰጪ', name: 'አገልግሎት (ክሊኒክ፣ ትምህርት ቤት፣ ትራንስፖርት…)', tagline: 'አገልግሎትዎን ያስተዋውቁ', build: () => [
    S('🧰', 'ስለ አገልግሎቱ', [F('የአገልግሎት ስም', 'text', { required: true }), F('ዓይነት', 'text'), F('ዝርዝር መግለጫ', 'long'), F('ፎቶዎች', 'image')]),
    S('💰', 'ዋጋ እና ሁኔታ', [F('መነሻ ዋጋ (ብር)', 'number'), F('የዋጋ ዝርዝር', 'long'), F('ቀጠሮ ያስፈልጋል', 'yesno')]),
    ADDRESS(), PAYMENT(), CONTACT(), ID_PRIV()] },
  { key: 'blank', icon: '✨', kind: 'ሌላ', name: 'ባዶ — ራሴ እቀርጻለሁ', tagline: '', build: () => [S('🙋', 'ስለ እኔ', [F('ስም', 'text', { required: true }), F('መግለጫ', 'long')]), CONTACT()] },
];
export const blankField = () => F('አዲስ ጥያቄ', 'text');
export const blankSection = () => S('📌', 'አዲስ ክፍል', [F('አዲስ ጥያቄ', 'text')]);
export const blankFormField = () => ({ id: id(), label: 'አዲስ ጥያቄ', type: 'text', hint: '', required: false, options: [] });
export const VISITOR_PRESETS = [
  { name: '📅 ቀጠሮ / ክፍል ማስያዣ', title: 'ቀጠሮ ይያዙ', button: 'ላክ', fields: () => [{ ...blankFormField(), label: 'ሙሉ ስም', required: true }, { ...blankFormField(), label: 'ስልክ', type: 'phone', required: true }, { ...blankFormField(), label: 'የሚፈልጉት ቀን', type: 'date' }, { ...blankFormField(), label: 'ምን ዓይነት አገልግሎት?', type: 'long' }] },
  { name: '💼 ማመልከቻ', title: 'ያመልክቱ', button: 'አመልክት', fields: () => [{ ...blankFormField(), label: 'ሙሉ ስም', required: true }, { ...blankFormField(), label: 'ስልክ', type: 'phone', required: true }, { ...blankFormField(), label: 'ልምድ (ዓመት)', type: 'number' }, { ...blankFormField(), label: 'ስለ ራስዎ', type: 'long' }] },
  { name: '❓ ጥያቄ / ትዕዛዝ', title: 'ጥያቄዎን ይላኩ', button: 'ላክ', fields: () => [{ ...blankFormField(), label: 'ስም', required: true }, { ...blankFormField(), label: 'ስልክ', type: 'phone' }, { ...blankFormField(), label: 'መልዕክት', type: 'long', required: true }] },
];
