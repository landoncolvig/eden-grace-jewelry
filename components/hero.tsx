'use client';

import Image from 'next/image';
import Link from 'next/link';
import { PRODUCTS, formatUSD } from '@/lib/shop';

// Read from the catalog rather than written in. This said "From $42" through a
// repricing that made the cheapest piece $35, which is the kind of stale claim
// nobody thinks to check.
//
// Whole dollars, not formatUSD, because this is a "starting at" line and every
// piece is priced evenly. "From $35.00" reads like a checkout total.
const cheapestCents = Math.min(...PRODUCTS.map((p) => p.priceCents));
const cheapestLabel =
  cheapestCents % 100 === 0 ? `$${cheapestCents / 100}` : formatUSD(cheapestCents);

/**
 * The hero uses one of Jenna's finished pieces against the same warm studio
 * background as the product grid. Keeping the whole necklace in frame matters
 * more here than filling a taller crop, so the square source keeps its natural
 * aspect ratio on every screen.
 *
 * The word entry that used to live here has moved to the monogram pages. A
 * "set your word" field beside a strand that is not personalised asked the
 * wrong question in the wrong place; the configurator is where it belongs.
 */
export default function Hero() {
  return (
    <section className="border-b border-rule">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <div>
            <p className="font-spec text-[0.7rem] uppercase tracking-[0.16em] text-ink-faint">
              Small batch, made to order
            </p>
            <h1 className="mt-4 font-display text-4xl leading-[1.06] sm:text-5xl lg:text-[3.4rem]">
              Necklaces strung
              <br />
              by hand, one bead
              <br />
              at a time.
            </h1>
            <p className="mt-6 max-w-md leading-relaxed text-ink-soft">
              Natural gemstone strands, laid out on the board and finished at
              the bench. Every colour is strung from a small lot of beads, and
              the stones vary, so no two come out the same.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="#pieces"
                className="rounded-xl bg-rose px-7 py-3.5 text-sm font-medium text-white transition-colors hover:bg-rose-deep"
              >
                See the pieces
              </Link>
              <Link
                href="/product/the-delicate-monogram"
                className="rounded-xl border border-ink px-7 py-3.5 text-sm font-medium transition-colors hover:bg-ink hover:text-bench"
              >
                Add a monogram
              </Link>
            </div>

            <p className="mt-6 font-spec text-[0.7rem] uppercase tracking-[0.16em] text-ink-faint">
              {/* One template string rather than text around an expression:
                  JSX drops the space between an expression and the text that
                  follows it, which silently ran "$35" into the separator. */}
              {`From ${cheapestLabel} · Free shipping over $75`}
            </p>
          </div>

          <div className="overflow-hidden rounded-[28px] bg-paper ring-1 ring-rule">
            <Image
              src="/products/eden-onyx-ivory-toggle.webp"
              alt="A black, ivory, and gold-tone Eden necklace with a toggle clasp"
              width={1254}
              height={1254}
              priority
              sizes="(min-width: 1024px) 52vw, 100vw"
              className="w-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
