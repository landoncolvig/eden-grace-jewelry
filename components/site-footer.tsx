import Link from 'next/link';

export default function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-rule">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:grid-cols-3 sm:px-8">
        <div>
          <p className="font-display text-lg">Jenna&rsquo;s Jewelry</p>
          <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-soft">
            Made to order at the bench. Every strand is laid out, strung, and
            finished by hand before it ships.
          </p>
        </div>

        <div className="text-sm">
          <h2 className="font-spec text-[0.6rem] uppercase tracking-[0.22em] text-ink-faint">
            Shop
          </h2>
          <ul className="mt-3 space-y-2">
            <li>
              <Link href="/product/gemstone-strand" className="text-ink-soft hover:text-ink">
                Gemstone Strand
              </Link>
            </li>
            <li>
              <Link href="/product/pearl-strand" className="text-ink-soft hover:text-ink">
                Freshwater Pearl Strand
              </Link>
            </li>
            <li>
              <Link href="/product/name-necklace" className="text-ink-soft hover:text-ink">
                Name Necklace
              </Link>
            </li>
            <li>
              <Link href="/cart" className="text-ink-soft hover:text-ink">
                Cart
              </Link>
            </li>
          </ul>
        </div>

        <div className="text-sm">
          <h2 className="font-spec text-[0.6rem] uppercase tracking-[0.22em] text-ink-faint">
            Shipping
          </h2>
          <p className="mt-3 leading-relaxed text-ink-soft">
            USPS Ground Advantage, quoted to your ZIP at checkout. Free over $75.
            Personalised pieces are not returnable once stringing starts.
          </p>
        </div>
      </div>

      <div className="border-t border-rule">
        <div className="mx-auto max-w-6xl px-5 py-5 sm:px-8">
          <p className="font-spec text-[0.65rem] tracking-wide text-ink-faint">
            &copy; {new Date().getFullYear()} Jenna&rsquo;s Jewelry
          </p>
        </div>
      </div>
    </footer>
  );
}
