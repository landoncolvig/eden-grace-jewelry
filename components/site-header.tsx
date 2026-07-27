'use client';

import Link from 'next/link';
import { useCart } from './cart-context';
import Logo from './logo';

/**
 * Dark chrome, light stage.
 *
 * The header, the process band, and the footer are all cocoa; everything that
 * shows a product is cream. An earlier version had the header cream on cream
 * with a hairline under it, which left the whole page one undifferentiated
 * field with nothing anchoring the top.
 *
 * The split is not decoration. A jeweller's shop is dark cases and lit
 * interiors, and the same logic works here: the furniture recedes, the pieces
 * are the only bright thing on the page.
 */
export default function SiteHeader() {
  const { count, ready } = useCart();

  return (
    <header className="sticky top-0 z-40 bg-ink text-bench">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-4 sm:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <Logo size={30} className="text-bench/85 transition-colors group-hover:text-bench" />
          <span className="flex items-baseline gap-2.5">
            <span className="font-display text-xl tracking-tight sm:text-2xl">Eden Grace</span>
            <span className="font-spec text-[0.6rem] uppercase tracking-[0.22em] text-bench/55 transition-colors group-hover:text-brass">
              Jewelry Co.
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-5 text-sm sm:gap-7">
          <Link href="/#pieces" className="text-bench/75 transition-colors hover:text-bench">
            Pieces
          </Link>
          <Link
            href="/about"
            className="hidden text-bench/75 transition-colors hover:text-bench sm:block"
          >
            About
          </Link>
          <Link
            href="/cart"
            className="relative rounded-full bg-bench px-4 py-1.5 text-sm text-ink transition-colors hover:bg-brass hover:text-ink"
          >
            Cart
            {/* Held back until localStorage is read, otherwise this renders 0
                during prerender and pops to the real count on hydrate. */}
            {ready && count > 0 && (
              <span className="ml-1.5 font-spec tabular-nums">{count}</span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
