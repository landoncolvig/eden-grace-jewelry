'use client';

import Link from 'next/link';
import Image from 'next/image';
import { photo } from '@/lib/shop';

/**
 * The hero.
 *
 * An earlier version rendered a procedurally modelled necklace in WebGL and
 * let the visitor type a word onto it. The idea was sound and the execution
 * was not: next to photographs of real strung beads, generated geometry reads
 * as a diagram. Real product photography wins, so the hero is a photograph.
 *
 * The turquoise heishi piece specifically, because it is the most saturated
 * thing in the catalog and the page around it is deliberately quiet. On a
 * storefront the product should be the loudest element, and this is the shot
 * that makes that true.
 *
 * The word entry that used to live here has moved to the Name Necklace page.
 * A "set your word" field beside a turquoise strand asked the visitor to
 * personalise a piece that is not personalised; the configurator is where that
 * question actually belongs.
 */
export default function Hero() {
  return (
    <section className="border-b border-rule">
      <div className="mx-auto max-w-6xl px-5 py-14 sm:px-8 sm:py-20">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.1fr] lg:gap-16">
          <div>
            <p className="font-spec text-[0.62rem] uppercase tracking-[0.24em] text-ink-faint">
              Made to order
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
              the bench. The stones vary, so no two come out the same.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link
                href="#pieces"
                className="rounded-xl bg-rose px-7 py-3.5 text-sm text-white transition-colors hover:bg-rose-deep"
              >
                See the pieces
              </Link>
              <Link
                href="/product/name-necklace"
                className="rounded-xl border border-ink px-7 py-3.5 text-sm transition-colors hover:bg-ink hover:text-bench"
              >
                Put a name on one
              </Link>
            </div>

            <p className="mt-6 font-spec text-[0.62rem] uppercase tracking-[0.2em] text-ink-faint">
              From $42 &middot; Free shipping over $75
            </p>
          </div>

          <div className="overflow-hidden rounded-[28px] bg-paper ring-1 ring-rule">
            <Image
              src={photo('turquoise-heishi')}
              alt="A heishi disc necklace in turquoise, teal, pink and red, with gold spacers"
              width={1500}
              height={1500}
              priority
              className="w-full"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
