'use client';

import Link from 'next/link';
import { useCart } from './cart-context';

export default function SiteHeader() {
  const { count, ready } = useCart();

  return (
    <header className="sticky top-0 z-40 border-b border-rule bg-bench/90 backdrop-blur-sm">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-4 sm:px-8">
        <Link href="/" className="group flex items-baseline gap-2.5">
          <span className="font-display text-xl tracking-tight sm:text-2xl">Jenna&rsquo;s</span>
          <span className="font-spec text-[0.6rem] uppercase tracking-[0.22em] text-ink-faint transition-colors group-hover:text-brass">
            Jewelry
          </span>
        </Link>

        <nav className="flex items-center gap-5 text-sm sm:gap-7">
          <Link href="/#pieces" className="text-ink-soft transition-colors hover:text-ink">
            Pieces
          </Link>
          <Link href="/#how" className="hidden text-ink-soft transition-colors hover:text-ink sm:block">
            How it&rsquo;s made
          </Link>
          <Link
            href="/cart"
            className="relative rounded-sm border border-ink px-3.5 py-1.5 text-sm transition-colors hover:bg-ink hover:text-bench"
          >
            Cart
            {/* Suppressed until localStorage is read, otherwise the badge
                renders 0 on the server and pops to the real count on hydrate. */}
            {ready && count > 0 && (
              <span className="ml-1.5 font-spec tabular-nums text-brass">{count}</span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}
