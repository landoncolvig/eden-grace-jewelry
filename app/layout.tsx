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
    // No freshwater pearl claim. The Rowan was the pearl piece and it is not
    // pearls. The only pearl claims left on the site are the mother of pearl
    // in The Blair and The Ellie, which is Jenna's own wording for those
    // pieces and stays there rather than in a site-wide description that would
    // generalise it across the whole catalog.
    'Beaded gemstone necklaces, strung by hand in small batches and made to order. Natural stone varies, so no two strands come out the same.',
  // Google Search Console. The Analytics verification method cannot be used
  // here: gtag.js is injected on hydration, so it is not in the HTML that
  // Google's verifier fetches. This meta tag is, because Next renders it into
  // the static head at build time. Removing it un-verifies the property.
  verification: {
    google: 'Ajc8HB2F4kWdmRHPhhdzbYJ-e2XtJ1urRGUK8XVcU6g',
  },
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: "Eden Grace Jewelry Co.",
    title: "Eden Grace Jewelry Co.",
    description:
      'Gemstone strands and monogram necklaces, made to order in small batches.',
    // Baked JPEG rather than one of the site's own WebPs: Facebook, Instagram
    // and X refuse to render a WebP og:image, and Instagram is the channel
    // these links actually travel on. Without this the store shared as a bare
    // text card with no photograph, which for a jewelry business is the most
    // expensive tag on the site to be missing. Built by scripts/og-cards.py.
    images: [
      {
        url: '/og/default.jpg',
        width: 1200,
        height: 630,
        alt: 'An Eden necklace in brown, cream and gold-tone beads with a horseshoe charm',
      },
    ],
  },
  twitter: {
    // summary_large_image, not summary. The small card crops to a thumbnail
    // and the piece is the entire pitch.
    card: 'summary_large_image',
    title: "Eden Grace Jewelry Co.",
    description:
      'Gemstone strands and monogram necklaces, made to order in small batches.',
    images: ['/og/default.jpg'],
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
