import type { Metadata } from 'next';
import { Fraunces, Inter, Pinyon_Script, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/components/cart-context';
import SiteHeader from '@/components/site-header';
import SiteFooter from '@/components/site-footer';

// Fraunces carries the personality: a variable serif with optical-size,
// softness, and "wonk" axes that give it the slight irregularity of hand-cut
// letters. Loaded with the axes it actually uses so the file stays small.
const fraunces = Fraunces({
  variable: '--font-fraunces',
  subsets: ['latin'],
  axes: ['SOFT', 'WONK', 'opsz'],
  display: 'swap',
});

const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

// Only ever used to render a buyer's name as the piece itself.
const pinyon = Pinyon_Script({
  variable: '--font-pinyon',
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
});

// The spec sheet. A work order should look like a work order.
const plexMono = IBM_Plex_Mono({
  variable: '--font-plex-mono',
  subsets: ['latin'],
  weight: ['400', '500'],
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://edengracejewelry.com'),
  title: {
    default: "Eden Grace Jewelry Co. | Beaded necklaces, strung by hand",
    template: "%s | Eden Grace Jewelry Co.",
  },
  description:
    'Gemstone and freshwater pearl necklaces, strung by hand and made to order. Natural stone varies, so no two strands come out the same.',
  openGraph: {
    type: 'website',
    siteName: "Eden Grace Jewelry Co.",
    title: "Eden Grace Jewelry Co.",
    description:
      'Gemstone strands, freshwater pearl necklaces, and mother-of-pearl name necklaces, made to order.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} ${pinyon.variable} ${plexMono.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-bench text-ink">
        <CartProvider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </CartProvider>
      </body>
    </html>
  );
}
