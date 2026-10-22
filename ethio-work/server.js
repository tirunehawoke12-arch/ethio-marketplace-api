/* ኢትዮ ዲጂታል ማርኬት — Express API + Next.js (አንድ ሰርቨር፣ Render ላይ ይሠራል) */
require('dotenv').config();
const dev = process.env.NODE_ENV !== 'production';
const { app, ready, configureWebhook, PORT } = require('./server/app');
app.set('trust proxy', 1);                          // Render proxy ጀርባ ትክክለኛ IP ለፍጥነት ገደብ

async function main() {
  await ready();
  if (!process.env.SKIP_NEXT) {                      // SKIP_NEXT=1 ለ API ሙከራ ብቻ
    const next = require('next');
    const n = next({ dev, dir: __dirname });
    const handle = n.getRequestHandler();
    await n.prepare();
    app.all('*', (req, res) => handle(req, res));
  }
  app.listen(PORT, () => { console.log(`Etio Digital Market (Next.js) listening on port ${PORT}`); configureWebhook(); });
}
main().catch(e => { console.error('Startup failed:', e); process.exit(1); });
