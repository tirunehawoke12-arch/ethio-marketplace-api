# 🇪🇹 ኢትዮ ዲጂታል ማርኬት — Next.js + Tailwind CSS

አንድ ሰርቨር (Node): **Express API** (`server/`) + **Next.js 14** ገጾች (`src/`) + **Tailwind CSS**።
ውሂብ በ Postgres (Neon)፤ መግቢያ በይለፍ ቃል + በተመዘገበው ስልክ ብቻ የሚላክ Telegram OTP።

## አወቃቀር
```
server.js            ← መነሻ (Express + Next አንድ ላይ)
server/app.js        ← OTP/Telegram፣ ማከማቻ፣ አድሚን፣ ክፍለ-ጊዜ
server/auth.js       ← ምዝገባ/መግቢያ (PBKDF2 — ከድሮው ጋር ተኳሃኝ)
server/market.js     ← ሱቅ፣ ዕቃ፣ ትዕዛዝ (escrow)፣ ግምገማ
server/people.js     ← ሠራተኛ፣ አሰሪ፣ ሥራ፣ ማመልከቻ
src/app/**           ← ገጾች (App Router)
src/components/**    ← ክፍሎች     src/lib/** ← API፣ ቅጽ፣ ቋሚዎች
public/              ← og.png፣ Google ማረጋገጫ ፋይል
```

## በኮምፒዩተር ላይ መሞከር
```bash
npm install
cp .env.example .env     # ዋጋዎቹን ይሙሉ
npm run build
npm start                # http://localhost:3000
```

## 🚀 Render ላይ መጫን (ደረጃ በደረጃ)
1. **GitHub፦** በ repo ውስጥ ያሉትን የድሮ ፋይሎች በሙሉ ያጥፉ (`app.js`፣ `index.html`፣ `market.js`፣ `market-ui.js`፣ `people.js`፣ `package*.json`፣ `og.png`…)፤ ከዚያ ይህን ፕሮጀክት (ሁሉንም ፋይሎች እና አቃፊዎች) ይጫኑ። **አቃፊዎችን (`src`፣ `server`፣ `public`) መጎተት ኮምፒዩተር ላይ ብቻ ይሠራል።**
2. **Render → Settings፦**
   - Build Command፦ `npm install && npm run build`
   - Start Command፦ `npm start`
   - Health Check Path፦ `/api/health`
3. **Environment፦** `.env.example` ውስጥ ያሉትን ሁሉ ያስገቡ። ዋና ዋናዎቹ፦ `DATABASE_URL`፣ `ADMIN_PASSWORD`፣ `ADMIN_EMAIL`፣ `TOKEN_SECRET`፣ `TELEGRAM_*`፣ `SITE_URL`፣ `NEXT_PUBLIC_SITE_URL`፣ `NODE_OPTIONS=--max-old-space-size=460`።
4. **Deploy** ይጫኑ፤ Logs ውስጥ `Postgres storage ready` እና `listening on port` ይፈልጉ።
5. ያረጋግጡ፦ `/api/health` → `"ok":true`፤ `/robots.txt`፤ `/sitemap.xml`።
6. **አድሚን፦** `/login` → «አድሚን ነዎት?» → ኢሜይል (ADMIN_EMAIL) + የይለፍ ቃል (ADMIN_PASSWORD)። ከዚያ `/admin` → ገበያ → ⚙️ ቅንብር ውስጥ **የክፍያ አካውንቶችን** (ዘዴ|ቁጥር|ባለቤት) እና ኮሚሽን ያስገቡ።

## 🆕 ስሪት 4 — የራስ ገጽ እና የክፍያ ደረሰኝ
- **🌐 የራስ ገጽ (`/me/sites/new`)፦** ማንኛውም የተመዘገበ ሰው (ሠራተኛ፣ አሰሪ፣ ሱቅ፣ ሆቴል፣ ክሊኒክ… ወይም ባዶ) ከአብነት ይጀምራል፤ ክፍሎችን እና ጥያቄዎችን እንደ Google Form ራሱ ይቀርጻል (10 የመልስ ዓይነቶች፦ ጽሑፍ፣ ቁጥር፣ ስልክ፣ ሊንክ፣ ቀን፣ ምርጫ፣ ብዙ ምርጫ፣ አዎ/አይደለም፣ ፎቶ)፣ ራሱ ይሞላል → ገጹ `/site/<id>` ላይ እንደ ራሱ ድረ-ገጽ ይታያል። ሁሉም ክፍል 👁 እና «ተጨማሪ ይመልከቱ» አለው። ዝርዝር፦ `/sites`።
- **🔒 «ለአድሚን ብቻ»፦** በመስክ ላይ ምልክት ሲደረግ (የክፍያ አካውንት፣ መታወቂያ…) ከህዝብ API ይወገዳል፤ አድሚን በ `/admin → 🌐 ገጾች` ያየዋል።
- **📝 የጎብኝ ቅጽ፦** ባለቤቱ ቀጠሮ/ክፍል ማስያዣ/ማመልከቻ ቅጽ ያዘጋጃል፤ የገቡ ተጠቃሚዎች ይሞላሉ → መልሶች በ «📬 መልሶች» ይታያሉ + Telegram ማሳወቂያ።
- **🧾 ደረሰኝ፦** አድሚን ክፍያ ሲያረጋግጥ (ለገዥ)፣ ለሻጭ ሲከፍል (ለሻጭ)፣ ተመላሽ ሲያደርግ (ለገዥ) bot «🧾 ደረሰኝ አውርድ» ቁልፍ ያለው መልዕክት ይልካል። ሊንኩ `/r/<የተፈረመ ቶከን>` (90 ቀን፣ ሊቀየር አይችልም)፤ `?dl=1` ፋይል ሆኖ ይወርዳል፣ «አትም / PDF» ቁልፍ አለው። በድረ-ገጹ ደግሞ በ ትዕዛዝ ገጽ እና በሻጭ ትዕዛዝ ዝርዝር ውስጥ ይገኛል። **ማስታወሻ፦** የ Telegram ቁልፍ እንዲሠራ `PUBLIC_BASE_URL` በ `https://` መጀመር አለበት።

## ማስታወሻዎች
- የድሮ አካውንቶች (የድሮው ገጽ የፈጠራቸው) በተመሳሳይ ኢሜይል/ስልክ እና የይለፍ ቃል ይገባሉ፤ Telegram ካልተገናኙ አንድ ጊዜ «ስልኬን አጋራ» ያደርጋሉ።
- የድሮው አጠቃላይ የዳታቤዝ API (`/api/db`፣ `/api/session`፣ `/api/account`) ተዘግቷል (ያለ OTP አካውንት መፍጠር እንዳይቻል)።
- Google Search Console ማረጋገጫ ፋይል (`public/google423971619482a954.html`) ተካትቷል።

## Telegram Mini App (አዲስ)
- የMini App መግቢያ፦ `${PUBLIC_BASE_URL}/telegram` (በTelegram ውስጥ ይከፈታል፤ ከwebsite ጋር ተመሳሳይ API/database ይጠቀማል)።
- `/start` ሲላክ Bot የMarketplace Mini App ቁልፍ ይልካል፤ webhook ሲዘጋጅ `setChatMenuButton` የBot menu ቁልፉንም ያዘጋጃል።
- `/api/telegram/webapp-auth` Telegram Mini App `initData` ፊርማን በBot Token ያረጋግጣል። ይህ ማረጋገጫ ብቻውን የwebsite መለያ መግቢያን አይተካም፤ የግል ገጾች አሁንም የአፕሊኬሽኑን login/session ይጠቀማሉ።
- Render `PUBLIC_BASE_URL` እና `SITE_URL` ትክክለኛውን HTTPS የሚሰራ የwebsite አድራሻ እንዲያመለክቱ ያረጋግጡ። `TELEGRAM_WEBHOOK_SECRET` በA-Z, a-z, 0-9, `_`, `-` ብቻ የተሠራ ይሁን። `TELEGRAM_BOT_TOKEN` እና `TELEGRAM_BOT_USERNAME` በRender Environment ውስጥ መሞላት አለባቸው።
- ለቋሚ መረጃ ማከማቻ `DATABASE_URL` (Neon Postgres) ይጠቀሙ፤ በRender የአካባቢ ፋይል ብቻ ላይ መተማመን አይመከርም።
