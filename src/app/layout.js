import { Sora, Inter } from 'next/font/google';
import '@/styles/tokens.css';
import './globals.css';
import ServiceWorkerRegister from '@/components/layout/ServiceWorkerRegister';
import SplashScreen from '@/components/layout/SplashScreen';

const sora = Sora({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sora',
  display: 'swap',
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata = {
  title: 'ClaimPoint Solutions — Recovery and Banking, One Platform',
  description:
    'ClaimPoint helps you pursue funds lost to fraud and scams, and gives you a real financial account to manage what you have and grow what you recover.',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
};

// Forces light rendering regardless of the visitor's OS/browser theme
// setting. Do not add a prefers-color-scheme media query anywhere in this
// project — this is the one and only theme.
export const viewport = {
  colorScheme: 'only light',
  themeColor: '#5B4BFF',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${sora.variable} ${inter.variable}`}>
      <body>
        <SplashScreen />
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}