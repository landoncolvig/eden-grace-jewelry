import type { Metadata } from 'next';
import { Cormorant_Garamond, Manrope, Pinyon_Script } from 'next/font/google';
import './globals.css';
import { CartProvider } from '@/components/cart-context';
import SiteHeader from '@/components/site-header';
import SiteFooter from '@/components/site-footer';
import Analytics from '@/components/analytics';

// Cormorant gives the wordmark and display type the fine, high-contrast strokes
// found in jewelry editorial without turning small interface copy decorative.
const cormorant = Cormorant_Garamond({
  variable: '--font-cormorant',
  subsets: ['latin'],
  weight: 'variable',
  display: 'swap',
});

// One humanist sans handles body copy, controls, prices, and utility labels.
const manrope = Manrope({
  variable: '--font-manrope',
  subsets: ['latin'],
  weight: 'variable',
  display: 'swap',
});

// Only ever used to render a buyer's name as the piece itself.
const pinyon = Pinyon_Script({
  variable: '--font-pinyon',
  subsets: ['latin'],
  weight: '400',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://edengracejewelry.com'),
  title: {
    default: "Eden Grace Jewelry Co. | Beaded necklaces, strung by hand",
    template: "%s | Eden Grace Jewelry Co.",
  },
  description:
    'Gemstone and freshwater pearl necklaces, strung by hand in small batches and made to order. Natural stone varies, so no two strands come out the same.',
  // Google Search Console. The Analytics verification method cannot be used
  // here: gtag.js is injected on hydration, so it is not in the HTML that
  // Google's verifier fetches. This meta tag is, because Next renders it into
  // the static head at build time. Removing it un-verifies the property.
  verification: {
    google: 'Ajc8HB2F4kWdmRHPhhdzbYJ-e2XtJ1urRGUK8XVcU6g',
  },
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
      className={`${cormorant.variable} ${manrope.variable} ${pinyon.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-bench text-ink">
        <Analytics />
        <CartProvider>
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter />
        </CartProvider>
      </body>
    </html>
  );
}
