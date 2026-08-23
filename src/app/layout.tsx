import type { Metadata, Viewport } from 'next';
import { Inter, JetBrains_Mono, Sora } from 'next/font/google';
import './globals.css';

const sora = Sora({ subsets: ['latin'], variable: '--font-sora', display: 'swap', weight: ['400', '600', '700', '800'] });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono-face', display: 'swap', weight: ['400', '500', '700'] });

export const metadata: Metadata = {
  title: {
    default: 'KarRent — rent a car from someone who owns one',
    template: '%s · KarRent',
  },
  description:
    'A peer-to-peer car rental marketplace for Germany and Lebanon. Owners set their price and choose who drives. Renters get verified once and book anywhere.',
  keywords: ['car rental', 'peer to peer', 'Germany', 'Lebanon', 'Autovermietung', 'car sharing'],
  openGraph: {
    title: 'KarRent',
    description: 'Rent a car from someone who owns one. Germany and Lebanon.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#06070a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${sora.variable} ${inter.variable} ${mono.variable}`}>
      <body className="grain min-h-screen antialiased">
        <div className="ambient-field" aria-hidden />
        <div className="relative z-[2]">{children}</div>
      </body>
    </html>
  );
}
