import type { Metadata, Viewport } from 'next';
import { Archivo, JetBrains_Mono } from 'next/font/google';
import './globals.css';

/*
 * One grotesque, used across its width axis — wide for display, normal for
 * text — plus a mono that carries record data. Two families on a real
 * contrast axis rather than two near-identical sans-serifs.
 */
const archivo = Archivo({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-archivo',
  display: 'swap',
  axes: ['wdth'],
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono-face',
  display: 'swap',
  weight: ['400', '500', '700'],
});

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
  themeColor: '#0a0b10',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${archivo.variable} ${mono.variable}`}>
      <head>
        {/* Without scripts no observer fires, so reveals must not hide content. */}
        <noscript>
          <style>{`[data-reveal]{opacity:1!important;transform:none!important}`}</style>
        </noscript>
      </head>
      <body className="min-h-screen antialiased">
        <div className="ambient-field" aria-hidden />
        <div className="relative" style={{ zIndex: 'var(--z-raised)' }}>
          {children}
        </div>
      </body>
    </html>
  );
}
