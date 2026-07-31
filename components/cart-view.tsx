'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { useCart } from './cart-context';
import {
  API_BASE,
  formatUSD,
  FREE_SHIPPING_THRESHOLD_CENTS,
  applyShippingRules,
} from '@/lib/shop';

type Quote = {
  cents: number;
  service: string;
  estimate: string;
  /** True when the live lookup failed and a flat rate was substituted. */
  fallback: boolean;
};

/**
 * The cart collects the destination ZIP before handing off to Square.
 *
 * That ordering is deliberate. Square's hosted checkout page cannot call back
 * to a server to recalculate shipping after the customer types an address, so
 * the only way to charge a real USPS rate and still use the hosted page is to
 * quote it here first and pass the result into the session. The alternative,
 * embedded checkout, supports live recalculation but turns off Apple Pay and
 * Google Pay, which costs more in abandoned mobile carts than the rate
 * precision is worth on a $48 order.
 */
export default function CartView() {
  const { lines, priced, setQty, removeLine, ready } = useCart();

  const [zip, setZip] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const zipValid = /^\d{5}$/.test(zip);
  const empty = ready && lines.length === 0;

  const shipping = quote ? applyShippingRules(priced.subtotalCents, quote.cents) : null;
  const total = priced.subtotalCents + (shipping?.chargedCents ?? 0);

  const getQuote = useCallback(async () => {
    if (!zipValid) return;
    setQuoting(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/shipping-quote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zip, cart: lines }),
      });
      if (!res.ok) throw new Error(`quote failed: ${res.status}`);
      const data = await res.json();
      setQuote(data);
    } catch {
      setError('Could not reach the shipping service. Try again in a moment.');
      setQuote(null);
    } finally {
      setQuoting(false);
    }
  }, [zip, zipValid, lines]);

  const checkout = useCallback(async () => {
    setCheckingOut(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/create-payment-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ zip, cart: lines }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? `checkout failed: ${res.status}`);
      // Square hosts the payment page; leaving the site here is expected.
      window.location.href = data.url;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Checkout could not start.');
      setCheckingOut(false);
    }
  }, [zip, lines]);

  if (!ready) {
    return <div className="mx-auto max-w-5xl px-5 py-20 sm:px-8" aria-busy="true" />;
  }

  if (empty) {
    return (
      <div className="mx-auto max-w-5xl px-5 py-24 text-center sm:px-8">
        <h1 className="font-display text-3xl">Nothing in the cart yet</h1>
        <p className="mx-auto mt-3 max-w-sm text-ink-soft">
          Pick a piece and set it up. You will see the full price, including USPS,
          before you pay anything.
        </p>
        <Link
          href="/#pieces"
          className="mt-8 inline-block rounded-xl bg-rose px-6 py-3.5 text-sm font-medium text-white transition-colors hover:bg-rose-deep"
        >
          See the pieces
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
      <h1 className="font-display text-3xl sm:text-4xl">Your order</h1>

      <div className="mt-10 grid gap-12 lg:grid-cols-[1fr_360px] lg:gap-16">
        <section>
          <ul className="divide-y divide-rule border-y border-rule">
            {priced.lines.map((line, i) => {
              const raw = lines[i];
              return (
                <li key={raw?.key ?? line.slug} className="py-6">
                  <div className="flex items-baseline justify-between gap-4">
                    <h2 className="font-display text-lg">{line.name}</h2>
                    <span className="shrink-0 font-spec tabular-nums">
                      {formatUSD(line.lineCents)}
                    </span>
                  </div>

                  {/* The work order, carried through from the configurator.
                      This is what Jenna reads to know what to make. */}
                  <dl className="mt-3 space-y-1 font-spec text-sm">
                    {line.addOns.map((a) => (
                      <div key={a.id} className="flex gap-2">
                        <dt className="text-ink-faint">
                          {a.qty > 1 ? `${a.qty} x ` : ''}
                          {a.label}
                        </dt>
                        <dd className={a.required ? 'text-rose' : 'text-ink-soft'}>
                          {a.value || '—'}
                        </dd>
                      </div>
                    ))}
                    {line.addOns.length === 0 && (
                      <p className="text-ink-faint">{line.description}</p>
                    )}
                  </dl>

                  <div className="mt-4 flex items-center gap-5">
                    <div className="flex items-center rounded-xl border border-control">
                      <button
                        aria-label={`One fewer ${line.name}`}
                        onClick={() => raw && setQty(raw.key, line.qty - 1)}
                        className="px-3 py-1.5 text-ink-soft hover:text-ink"
                      >
                        &minus;
                      </button>
                      <span className="w-9 text-center font-spec text-sm tabular-nums">
                        {line.qty}
                      </span>
                      <button
                        aria-label={`One more ${line.name}`}
                        onClick={() => raw && setQty(raw.key, line.qty + 1)}
                        className="px-3 py-1.5 text-ink-soft hover:text-ink"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => raw && removeLine(raw.key)}
                      className="text-sm text-ink-faint underline-offset-4 hover:text-flag hover:underline"
                    >
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-xl border border-ink bg-paper">
            <div className="border-b border-rule px-6 py-4">
              <h2 className="font-spec text-[0.7rem] uppercase tracking-[0.16em] text-ink-faint">
                Shipping
              </h2>
            </div>

            <div className="px-6 py-5">
              <label
                htmlFor="zip"
                className="font-spec text-[0.7rem] uppercase tracking-[0.16em] text-ink-faint"
              >
                Where is it going
              </label>
              <div className="mt-2 flex gap-2">
                <input
                  id="zip"
                  value={zip}
                  onChange={(e) => {
                    setZip(e.target.value.replace(/\D/g, '').slice(0, 5));
                    setQuote(null);
                  }}
                  inputMode="numeric"
                  placeholder="ZIP code"
                  autoComplete="postal-code"
                  className="min-w-0 flex-1 rounded-xl border border-control bg-bench px-3 py-2 font-spec text-sm tabular-nums outline-none placeholder:text-ink-faint focus:border-rose"
                />
                <button
                  onClick={getQuote}
                  disabled={!zipValid || quoting}
                  className="shrink-0 rounded-xl border border-ink px-4 py-2 text-sm transition-colors hover:bg-ink hover:text-bench disabled:cursor-not-allowed disabled:border-rule disabled:text-ink-faint disabled:hover:bg-transparent"
                >
                  {quoting ? 'Checking' : 'Quote'}
                </button>
              </div>

              {quote && (
                <div className="mt-4 border-t border-rule pt-4 font-spec text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-ink-soft">{quote.service}</span>
                    <span className="tabular-nums">
                      {shipping?.free ? (
                        <span className="text-sage">Free</span>
                      ) : (
                        formatUSD(quote.cents)
                      )}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-ink-faint">{quote.estimate}</p>
                  {shipping?.free && (
                    <p className="mt-1 text-xs text-sage">
                      Covered, this order is over {formatUSD(FREE_SHIPPING_THRESHOLD_CENTS ?? 0)}.
                    </p>
                  )}
                  {quote.fallback && (
                    <p className="mt-2 text-xs text-ink-faint">
                      Live USPS pricing was unavailable, so this is our standard rate.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="border-t border-rule px-6 py-5 font-spec text-sm">
              <div className="flex justify-between gap-4 py-1">
                <span className="text-ink-soft">Subtotal</span>
                <span className="tabular-nums">{formatUSD(priced.subtotalCents)}</span>
              </div>
              <div className="flex justify-between gap-4 py-1">
                <span className="text-ink-soft">Shipping</span>
                <span className="tabular-nums">
                  {shipping ? formatUSD(shipping.chargedCents) : <span className="text-ink-faint">enter ZIP</span>}
                </span>
              </div>

              <div className="mt-4 flex items-baseline justify-between border-t border-ink pt-4">
                <span className="font-display text-lg">Total</span>
                <span className="text-xl tabular-nums">{formatUSD(total)}</span>
              </div>

              <button
                onClick={checkout}
                disabled={!quote || checkingOut || priced.missingRequired.length > 0}
                className="mt-5 w-full rounded-xl bg-rose px-5 py-3.5 text-sm font-medium text-white transition-colors hover:bg-rose-deep disabled:cursor-not-allowed disabled:bg-ink-faint"
              >
                {checkingOut ? 'Opening checkout…' : 'Check out'}
              </button>

              {!quote && (
                <p className="mt-2.5 text-center text-xs text-ink-faint">
                  Get a shipping quote to continue.
                </p>
              )}

              {priced.missingRequired.length > 0 && (
                <p className="mt-2.5 text-center text-sm text-flag">
                  {priced.missingRequired[0]}
                </p>
              )}

              {error && <p className="mt-2.5 text-center text-sm text-flag">{error}</p>}

              <p className="mt-4 text-center text-xs leading-relaxed text-ink-faint">
                Payment is handled by Square. Card details never touch this site.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
