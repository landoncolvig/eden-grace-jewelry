import Link from 'next/link';
import Image from 'next/image';
import NamePreview from '@/components/name-preview';
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
      <NamePreview />

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
              <article className="flex h-full flex-col overflow-hidden rounded-xl border border-rule bg-paper transition-colors hover:border-rose">
                {/* A band of the piece's own stone across the top of each
                    card. An earlier attempt tinted the photo itself with a
                    multiply blend, which muddied the beads: the photo's cream
                    background multiplied down and the whole strand went hazy.
                    The colour belongs next to the product, not on top of it. */}
                <div className="h-1.5 w-full" style={{ backgroundColor: product.swatch }} />
                <Image
                  src={photo(product.image, 'sm')}
                  alt={`${product.name}, ${product.tagline.toLowerCase()}`}
                  width={600}
                  height={600}
                  className="w-full"
                />

                <div className="flex flex-1 flex-col p-6">
                  <h3 className="font-display text-xl">{product.name}</h3>
                  <p className="mt-1 text-sm text-ink-soft">{product.tagline}</p>

                  <p className="mt-4 flex-1 text-sm leading-relaxed text-ink-soft">
                    {product.description}
                  </p>

                  <div className="mt-6 flex items-baseline justify-between border-t border-rule pt-4">
                    <span className="font-spec text-sm tabular-nums text-rose">
                      {formatUSD(product.priceCents)}
                    </span>
                    <span className="text-sm text-ink-soft transition-colors group-hover:text-rose">
                      Make one &rarr;
                    </span>
                  </div>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </section>

      <section id="how" className="border-t border-rule bg-sage/12">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <h2 className="font-display text-2xl sm:text-3xl">How it&rsquo;s made</h2>

          <ol className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-10">
            {STEPS.map((step) => (
              <li key={step.n}>
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-rose font-spec text-[0.62rem] text-white">
                  {step.n}
                </span>
                <h3 className="mt-3 font-display text-lg">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-soft">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
