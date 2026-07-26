import Link from 'next/link';
import NamePreview from '@/components/name-preview';
import { PRODUCTS, formatUSD } from '@/lib/shop';

// The three steps are a real sequence with real waiting in between, which is
// why they are numbered. Order carries information here: the buyer is being
// told when they can still change their mind (before step two).
const STEPS = [
  {
    n: '01',
    title: 'You set the spec',
    body: 'Pick the piece, then the options. Engraving, chain length, stones. The order sheet builds itself as you go, so you see the exact piece and the exact price before you pay.',
  },
  {
    n: '02',
    title: 'Jenna cuts it',
    body: 'Every letter is pierced and filed by hand from a single sheet. This is the point of no return, which is why made-to-order pieces stop being returnable once it starts.',
  },
  {
    n: '03',
    title: 'It ships USPS',
    body: 'Finished, polished, boxed, and sent Ground Advantage with tracking. Shipping is quoted to your ZIP at checkout, and it is free over $150.',
  },
];

export default function Home() {
  return (
    <>
      <NamePreview />

      <section id="pieces" className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
        <div className="flex items-baseline justify-between gap-6 border-b border-rule pb-4">
          <h2 className="font-display text-2xl sm:text-3xl">Two pieces</h2>
          <p className="font-spec text-[0.62rem] uppercase tracking-[0.22em] text-ink-faint">
            Both made to order
          </p>
        </div>

        <div className="mt-10 grid gap-8 sm:grid-cols-2 sm:gap-10">
          {PRODUCTS.map((product) => (
            <Link
              key={product.slug}
              href={`/product/${product.slug}`}
              className="group block"
            >
              <article className="flex h-full flex-col rounded-sm border border-rule bg-paper p-7 transition-colors hover:border-brass">
                {/* Each piece gets its own metal, drawn rather than photographed
                    so the demo does not depend on product photos existing yet.
                    Swap this block for an Image once Jenna has shots. */}
                <div
                  className="mb-7 flex h-40 items-center justify-center rounded-sm"
                  style={{ background: `${product.swatch}14` }}
                >
                  <span
                    className="font-script text-5xl"
                    style={{ color: product.swatch }}
                  >
                    {product.slug === 'name-necklace' ? 'Jenna' : '• • •'}
                  </span>
                </div>

                <h3 className="font-display text-xl">{product.name}</h3>
                <p className="mt-1 text-sm text-ink-soft">{product.tagline}</p>

                <p className="mt-4 flex-1 text-sm leading-relaxed text-ink-soft">
                  {product.description}
                </p>

                <div className="mt-6 flex items-baseline justify-between border-t border-rule pt-4">
                  <span className="font-spec text-sm tabular-nums">
                    {formatUSD(product.priceCents)}
                  </span>
                  <span className="text-sm text-ink-soft transition-colors group-hover:text-brass">
                    Configure &rarr;
                  </span>
                </div>
              </article>
            </Link>
          ))}
        </div>
      </section>

      <section id="how" className="border-t border-rule bg-paper">
        <div className="mx-auto max-w-6xl px-5 py-20 sm:px-8">
          <h2 className="font-display text-2xl sm:text-3xl">How it&rsquo;s made</h2>

          <ol className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-10">
            {STEPS.map((step) => (
              <li key={step.n}>
                <span className="font-spec text-[0.62rem] tracking-[0.22em] text-brass">
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
