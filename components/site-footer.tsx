import Link from 'next/link';
import Logo from './logo';

/**
 * Closes the dark chrome the header opens. Between them the page is cream and
 * the products are the only bright thing on it.
 */
export default function SiteFooter() {
  return (
    <footer className="bg-ink text-bench">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:grid-cols-3 sm:px-8">
        <div>
          <div className="flex items-center gap-3">
            <Logo size={28} className="text-bench/85" />
            <p className="font-display text-lg">Eden Grace Jewelry Co.</p>
          </div>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-bench/65">
            Made to order at the bench. Every strand is laid out, strung, and
            finished by hand before it ships.
          </p>
        </div>

        <div className="text-sm">
          <h2 className="font-spec text-[0.6rem] uppercase tracking-[0.22em] text-bench/45">
            Shop
          </h2>
          <ul className="mt-3 space-y-2">
            <li>
              <Link href="/product/gemstone-strand" className="text-bench/75 hover:text-bench">
                Gemstone Strand
              </Link>
            </li>
            <li>
              <Link href="/product/name-necklace" className="text-bench/75 hover:text-bench">
                Name Necklace
              </Link>
            </li>
            <li>
              <Link href="/about" className="text-bench/75 hover:text-bench">
                About Jenna
              </Link>
            </li>
            <li>
              <Link href="/cart" className="text-bench/75 hover:text-bench">
                Cart
              </Link>
            </li>
          </ul>
        </div>

        <div className="text-sm">
          <h2 className="font-spec text-[0.6rem] uppercase tracking-[0.22em] text-bench/45">
            Shipping
          </h2>
          <p className="mt-3 leading-relaxed text-bench/65">
            USPS Ground Advantage, quoted to your ZIP at checkout. Free over $75.
            Personalised pieces are not returnable once stringing starts.
          </p>
        </div>
      </div>

      <div className="border-t border-bench/12">
        <div className="mx-auto max-w-6xl px-5 py-5 sm:px-8">
          <p className="font-spec text-[0.65rem] tracking-wide text-bench/45">
            &copy; {new Date().getFullYear()} Eden Grace Jewelry Co.
          </p>
        </div>
      </div>
    </footer>
  );
}
