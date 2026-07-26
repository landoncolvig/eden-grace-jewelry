import Link from 'next/link';
import Image from 'next/image';
import Hero from '@/components/hero';
import { PRODUCTS, formatUSD, photo } from '@/lib/shop';

// A real sequence with real waiting in between, which is why it is numbered.
// The order carries information the buyer needs: when they can still change
// their mind, and when the piece stops being changeable.
const STEPS = [
  {
    n: '01',
    title: 'You pick the piece',
    body: 'Choose the stone, the length, and whether it carries pearls or letters. The order sheet builds itself as you go, so you see the exact necklace and the exact price before you pay.',
  },
  {
    n: '02',
    title: 'Jenna strings it',
    body: 'Beads are laid out on the board, then strung one at a time on nylon-coated steel wire and finished with a clasp. Natural stone varies, so your strand will not be identical to the photo.',
  },
  {
    n: '03',
    title: 'It ships USPS',
    body: 'Boxed and sent Ground Advantage with tracking. Shipping is quoted to your ZIP at checkout, and it is free over $75.',
  },
];

export default function Home() {
  return (
    <>
      <Hero />

      <section id="pieces" className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <div className="flex items-baseline justify-between gap-6 border-b border-rule pb-4">
          <h2 className="font-display text-2xl sm:text-3xl">Three ways to wear it</h2>
          <p className="font-spec text-[0.62rem] uppercase tracking-[0.22em] text-ink-faint">
            All made to order
          </p>
        </div>

        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3 sm:gap-10">
          {PRODUCTS.map((product) => (
            <Link key={product.slug} href={`/product/${product.slug}`} className="group block">
              <article className="flex h-full flex-col overflow-hidden rounded-2xl bg-paper ring-1 ring-rule transition-all group-hover:ring-2 group-hover:ring-rose">
                {/* No decorative colour band here. Two earlier attempts at
                    adding one, a multiply tint over the photo and a stripe
                    across the card top, both read as colour bolted onto the
                    card rather than belonging to it. The stones are the colour
                    on this page; the card's job is to stay out of the way. */}
                <Image
                  src={photo(product.image, 'sm')}
                  alt={`${product.name}, ${product.tagline.toLowerCase()}`}
                  width={600}
                  height={600}
                  className="w-full"
                />

                {/* Name, tagline, price. The full description used to sit
                    here as well, which made every card a wall of text and
                    buried the photograph under it. Detail belongs on the
                    product page; a grid's only job is to help someone choose
                    which one to open. */}
                <div className="flex flex-1 flex-col px-5 pb-5 pt-4">
                  <h3 className="font-display text-lg">{product.name}</h3>
                  <p className="mt-1 flex-1 text-sm text-ink-soft">{product.tagline}</p>

                  <div className="mt-4 flex items-baseline justify-between">
                    <span className="font-spec text-base tabular-nums text-rose">
                      {formatUSD(product.priceCents)}
                    </span>
                    <span className="font-spec text-[0.62rem] uppercase tracking-[0.2em] text-ink-faint transition-colors group-hover:text-rose">
                      Make one &rarr;
                    </span>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </section>

      <section id="how" className="bg-ink text-bench">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <h2 className="font-display text-2xl sm:text-3xl">How it&rsquo;s made</h2>

          <ol className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-10">
            {STEPS.map((step) => (
              <li key={step.n}>
                {/* Cream fill, cocoa numeral. Brass was the obvious choice
                    against the dark band and it measured 3.33:1 with the
                    numeral on it, under the 4.5 that 10px text needs. Every
                    brass and rose combination failed the same way; a cream
                    disc is the one that clears it, at 10:1. */}
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-bench font-spec text-[0.62rem] text-ink">
                  {step.n}
                </span>
                <h3 className="mt-3 font-display text-lg">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-bench/70">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
