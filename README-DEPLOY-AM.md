# Etio Digital Market — የHosting ማስገቢያ መመሪያ

**Domain:** https://ethiodigitalmarket.pro.et

ይህ ጥቅል የMarketplace ድረ-ገጹን እና Node.js/Express Backend ይዟል። የTelegram Bot በቀጣይነት long-polling ከማድረግ ይልቅ **Webhook** ይጠቀማል። Bot token በHTML ውስጥ አይቀመጥም።

## 1. ከመጫን በፊት
1. የቀድሞው Telegram Bot token በዚህ ቻት ስለተጋራ፣ በ@BotFather ውስጥ **Revoke** አድርገህ አዲስ token ፍጠር። አዲሱን token ለማንም አትላክ።
2. Domain `ethiodigitalmarket.pro.et` ወደ ይህ Hosting እንደተመራ (DNS) እና HTTPS/SSL እንደተሰራ አረጋግጥ።
3. Ethio telecom በዚህ Linux Bronze መለያ ላይ **Node.js Toolkit** እንደፈቀደ አረጋግጥ። Plesk መኖሩ ብቻ Node.js ተፈቅዷል ማለት አይደለም።

## 2. Plesk ላይ መጫን
1. Plesk → **Websites & Domains** → `ethiodigitalmarket.pro.et` ግባ።
2. የጥቅሉን ፋይሎች በApplication Root ውስጥ አስገባ። `app.js`, `package.json`, `index.html` በአንድ የApplication Root ውስጥ መሆን አለባቸው።
3. **Node.js** ክፈት፤ Node.js 18+ የሚደገፍ LTS ስሪት ምረጥ፣ Application startup file = `app.js`, Application mode = `Production` አድርግ።
4. **NPM Install** ጫን።
5. Plesk ውስጥ Environment Variables አክል፦
   - `TELEGRAM_BOT_TOKEN` = በBotFather የፈጠርኸው አዲስ token
   - `TELEGRAM_BOT_USERNAME` = `EtioMekelMarketBot` (`@` ሳይኖር)
   - `PUBLIC_BASE_URL` = `https://ethiodigitalmarket.pro.et`
   - `TELEGRAM_WEBHOOK_SECRET` = 32+ ቁምፊ ያለው ሚስጥራዊ የፊደል/ቁጥር ኮድ፤ እንደ A-Z, a-z, 0-9, `_`, `-` ብቻ ቢሆን ይሻላል።
   - `PORT` = Plesk በራሱ ካዘጋጀው አትጨምር፤ ካልሆነ የHosting ድጋፍ የሚለውን ተከተል።
6. አፕሊኬሽኑን **Restart** አድርግ።

**ደህንነት:** `.env`, `telegram-otp-data.json`, `node_modules` እና server code በሕዝብ የሚታይ document root ውስጥ እንዳይታዩ አድርግ። Plesk የApplication Root እና Document Root ለይቶ እንዲያዘጋጅ ይጠቀም፤ ይህን ካላወቅህ የHosting ድጋፍን ጠይቅ።

## 3. መፈተሽ
1. በBrowser ይህን ክፈት፦ `https://ethiodigitalmarket.pro.et/api/health` — `ok: true` የሚል JSON መመለስ አለበት።
2. Plesk Logs ውስጥ `Telegram webhook configured` የሚል መልዕክት ፈልግ።
3. Website ላይ አዲስ መለያ ፍጠር፣ Telegram Bot ክፈት፣ **Start** ተጫን እና OTP ፈትሽ።

## ማስታወሻዎች
- ይህ ፋይል ጥቅሉን ለHosting አዘጋጅቷል፤ እኔ ወደ Hosting መለያህ መግባት ስለማልችል በቀጥታ በLive Domain ላይ አልጫንኩትም።
- Node.js በLinux Bronze መለያህ ላይ ካልተፈቀደ፣ የHosting አቅራቢው ማስኬድ አይችልም።
- OTP/account linking መረጃ `telegram-otp-data.json` ውስጥ ይቀመጣል። የHosting ማሻሻያ ወይም የፋይል ገደብ ከመጣ የውሂብ መጥፋት እንዳይኖር በደህና ባክአፕ አድርግ።
- የEscrow/payment ገጾቹ የክፍያ እይታ ናቸው፤ እውነተኛ የTelebirr/CBE ክፍያ በራስ-ሰር እንዲፈጸም የተፈቀደ Payment API እና የሰርቨር ማረጋገጫ ያስፈልጋል።

---
## 🔁 የጋራ ዳታቤዝ (በሁሉም መሣሪያ ተመሳሳይ ውሂብ) — አዲስ
ውሂቡ (አካውንቶች፣ ዝርዝሮች፣ ትዕዛዞች፣ ውይይቶች) አሁን በአሳሽ ሳይሆን በሰርቨሩ ላይ በ `market-data.json` ውስጥ ይቀመጣል። ከማንኛውም ስልክ ወይም ኮምፒዩተር በተመሳሳይ ኢሜይል/ስልክ እና የይለፍ ቃል ሲገቡ ተመሳሳይ መረጃ ይታያል።

**በ Plesk ተጨማሪ Environment variables፦**
- `ADMIN_PASSWORD` = አሁን የሚጠቀሙት የአድሚን የይለፍ ቃል (በ `index.html` ከተቀመጠው ሃሽ ጋር አንድ ዓይነት መሆን አለበት)። ካልተሞላ አድሚን መግባት አይችልም።
- `TOKEN_SECRET` = ረጅም ምስጢራዊ ጽሑፍ (አማራጭ)።

**ማወቅ ያለብዎት**
- `market-data.json` እና `.token-secret` በይፋ ከሚታይ አቃፊ (httpdocs) ውጭ መሆን አለባቸው፤ በየጊዜው ቅጂ ያስቀምጡ (backup)።
- ሰርቨሩ ካልተገኘ (ለምሳሌ ፋይሉን በቀጥታ ከከፈቱ) ድረ-ገጹ በራሱ ወደ «የአካባቢ ሁነታ» ይመለሳል፤ ያኔ ውሂቡ በዚያ አሳሽ ብቻ ይሆናል።
- ብዙ ሺህ ተጠቃሚ ሲደርሱ ከJSON ፋይል ወደ እውነተኛ ዳታቤዝ (MySQL/SQLite) መሸጋገር ያስፈልጋል።

---
## ☁️ Render (ነጻ ዕቅድ) + Neon ቋሚ ዳታቤዝ
Render ነጻ ዕቅድ ፋይሎችን በእያንዳንዱ ዳግም ማስነሳት ያጠፋል። ስለዚህ `DATABASE_URL` (Neon Postgres) ያስፈልጋል። ሲዘጋጅ ሁሉም ውሂብ (አካውንቶች፣ ዝርዝሮች፣ ትዕዛዞች፣ የ Telegram ግንኙነቶች) በዚያ ይቀመጣል፤ `market-data.json` አያስፈልግም።
Render Environment፦ `DATABASE_URL`, `ADMIN_PASSWORD`, `TOKEN_SECRET` (ግዴታ፣ ካልተሞላ በእያንዳንዱ ዲፕሎይ ሁሉም ይወጣል)፣ `PUBLIC_BASE_URL`, `TELEGRAM_*`።
ሰርቨሩ እንዳይተኛ UptimeRobot (ነጻ) በየ5 ደቂቃ `https://ethiodigitalmarket.pro.et/api/health` ይጥራ።
