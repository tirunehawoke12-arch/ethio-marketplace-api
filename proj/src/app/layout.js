import './globals.css';
import { AppProvider } from '@/lib/app';
import Header from '@/components/Header';
import BottomNav from '@/components/BottomNav';
import Footer from '@/components/Footer';
import { SITE, BOT_URL } from '@/lib/consts';

const TITLE = 'Etio Digital Market | ኢትዮ ዲጂታል ማርኬት — ሱቅ፣ ሆቴል፣ ሙያተኛ እና ሥራ በኢትዮጵያ';
const DESC = 'Etio Digital Market (ኢትዮ ዲጂታል ማርኬት) — በመላው ኢትዮጵያ ሱቆችን፣ ሆቴሎችን፣ ሙያተኞችን እና ሥራዎችን ያግኙ። ከፍለጋ እስከ ክፍያ በአንድ ቦታ፤ ደህንነቱ የተጠበቀ ግብይት በብር።';
export const metadata = {
  metadataBase: new URL(SITE),
  title: { default: TITLE, template: '%s | ኢትዮ ዲጂታል ማርኬት' },
  description: DESC,
  keywords: ['ኢትዮጵያ ገበያ', 'ኦንላይን ግብይት', 'ሆቴል', 'ሙያተኞች', 'ሥራ', 'Ethiopia online marketplace', 'Etio Digital Market', 'ethiodigitalmarket'],
  alternates: { canonical: '/', languages: { am: '/', 'x-default': '/' } },
  applicationName: 'Etio Digital Market',
  manifest: '/manifest.webmanifest',
  category: 'shopping',
  ...(process.env.GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } } : {}),
  robots: { index: true, follow: true, googleBot: { 'max-image-preview': 'large' } },
  openGraph: { type: 'website', siteName: 'Etio Digital Market', locale: 'am_ET', url: '/', title: TITLE, description: 'ሱቆች፣ ሆቴሎች፣ ሙያተኞች እና ሥራዎች በአንድ ቦታ — በመላው ኢትዮጵያ።', images: [{ url: '/og.png', width: 1200, height: 630 }] },
  twitter: { card: 'summary_large_image', title: TITLE, images: ['/og.png'] },
};
export const viewport = { themeColor: '#0a8a56', width: 'device-width', initialScale: 1, viewportFit: 'cover' };
const LD = { '@context': 'https://schema.org', '@graph': [
  { '@type': 'WebSite', '@id': SITE + '/#site', url: SITE + '/', name: 'Etio Digital Market', alternateName: ['ኢትዮ ዲጂታል ማርኬት', 'ethiodigitalmarket'], inLanguage: ['am', 'en'], potentialAction: { '@type': 'SearchAction', target: SITE + '/market?q={q}', 'query-input': 'required name=q' } },
  { '@type': 'Organization', '@id': SITE + '/#org', name: 'Etio Digital Market', url: SITE + '/', logo: SITE + '/og.png', areaServed: { '@type': 'Country', name: 'Ethiopia' }, sameAs: [BOT_URL], contactPoint: { '@type': 'ContactPoint', telephone: '+251946705941', contactType: 'customer support', availableLanguage: ['am', 'en'], areaServed: 'ET' }, founder: { '@type': 'Person', name: 'Tiruneh Awoke', alumniOf: { '@type': 'CollegeOrUniversity', name: 'Bahir Dar University' } } },
] };

export default function RootLayout({ children }) {
  return (
    <html lang="am">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(LD) }} />
        <AppProvider>
          <Header />
          <main className="mx-auto max-w-6xl px-3 pb-6 pt-4">{children}</main>
          <Footer />
          <BottomNav />
        </AppProvider>
      </body>
    </html>
  );
}
