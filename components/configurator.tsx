'use client';

import { useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatUSD, priceCart, type AddOn, type CartAddOn, type Product } from '@/lib/shop';
import { useCart } from './cart-context';

/**
 * The order sheet.
 *
 * A custom piece does not exist until it is specified, so the add-ons are not
 * upsells, they are the specification. The panel on the right is a work order
 * that writes itself as the buyer toggles options: what gets made and what it
 * costs, visible before anything is added to the cart. That transparency is
 * the reason to configure here rather than to discover the real total on the
 * Stripe page.
 */
export default function Configurator({ product }: { product: Product }) {
  const search = useSearchParams();
  const router = useRouter();
  const { addLine } = useCart();

  // Required specs (what a name necklace reads) are part of the piece, not
  // options, so they are always present and get their own input above the
  // options list.
  const requiredAddOns = useMemo(() => product.addOns.filter((a) => a.required), [product]);
  const optionalAddOns = useMemo(() => product.addOns.filter((a) => !a.required), [product]);

  // The hero passes the word the buyer already typed, so the hero is step one
  // of the order rather than a separate toy.
  const seeded = (search.get('name') ?? '').slice(0, 12);

  const [required, setRequired] = useState<Record<string, string>>(() =>
    Object.fromEntries(requiredAddOns.map((a) => [a.id, seeded])),
  );
  const [options, setOptions] = useState<Record<string, { qty: number; value: string }>>({});
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  function toggle(addOn: AddOn) {
    setAdded(false);
    setOptions((prev) => {
      const next = { ...prev };
      if (next[addOn.id]) delete next[addOn.id];
      else next[addOn.id] = { qty: 1, value: '' };
      return next;
    });
  }

  const cartAddOns: CartAddOn[] = useMemo(
    () => [
      ...requiredAddOns.map((a) => ({ id: a.id, qty: 1, value: required[a.id] ?? '' })),
      ...Object.entries(options).map(([id, v]) => ({ id, qty: v.qty, value: v.value })),
    ],
    [requiredAddOns, required, options],
  );

  // Priced by the same module the Cloud Function uses, so this figure and the
  // Stripe charge come from one implementation. missingRequired is the same
  // check the server will run, so the button disables for exactly the reason
  // the server would refuse.
  const preview = useMemo(
    () => priceCart([{ slug: product.slug, qty, addOns: cartAddOns }]),
    [product.slug, qty, cartAddOns],
  );
  const line = preview.lines[0];
  const blocked = preview.missingRequired.length > 0;

  function addToCart() {
    if (blocked) return;
    addLine(product.slug, cartAddOns, qty);
    setAdded(true);
  }

  const primaryWord = requiredAddOns[0] ? required[requiredAddOns[0].id]?.trim() : '';

  return (
    <div className="mx-auto max-w-6xl px-5 py-12 sm:px-8 sm:py-16">
      <button
        onClick={() => router.push('/')}
        className="font-spec text-[0.62rem] uppercase tracking-[0.22em] text-ink-faint hover:text-ink"
      >
        &larr; All pieces
      </button>

      <div className="mt-8 grid gap-12 lg:grid-cols-[1fr_400px] lg:gap-16">
        {/* Left: the piece and its specification */}
        <div>
          <div
            className="flex h-56 items-center justify-center rounded-sm px-6 sm:h-72"
            style={{ background: `${product.swatch}14` }}
          >
            <span
              className="text-center font-script text-5xl sm:text-6xl"
              style={{ color: product.swatch }}
            >
              {requiredAddOns.length > 0 ? primaryWord || 'your word' : '• • •'}
            </span>
          </div>

          <h1 className="mt-8 font-display text-3xl sm:text-4xl">{product.name}</h1>
          <p className="mt-1 text-ink-soft">{product.tagline}</p>
          <p className="mt-5 max-w-prose leading-relaxed text-ink-soft">{product.description}</p>

          <dl className="mt-6 grid gap-x-8 gap-y-2 border-t border-rule pt-5 text-sm sm:grid-cols-2">
            <div className="flex gap-2">
              <dt className="text-ink-faint">Material</dt>
              <dd>{product.material}</dd>
            </div>
            <div className="flex gap-2">
              <dt className="text-ink-faint">Lead time</dt>
              <dd>{product.leadTime}</dd>
            </div>
          </dl>

          {requiredAddOns.map((spec) => (
            <div key={spec.id} className="mt-10">
              <label
                htmlFor={spec.id}
                className="font-spec text-[0.62rem] uppercase tracking-[0.22em] text-ink-faint"
              >
                {spec.note}
              </label>
              <div className="mt-2 flex items-end gap-3 border-b border-ink pb-2">
                <input
                  id={spec.id}
                  value={required[spec.id] ?? ''}
                  onChange={(e) => {
                    const v = e.target.value.slice(0, spec.input?.maxLength ?? 40);
                    setRequired((prev) => ({ ...prev, [spec.id]: v }));
                    setAdded(false);
                  }}
                  maxLength={spec.input?.maxLength}
                  placeholder={spec.input?.placeholder}
                  autoComplete="off"
                  className="min-w-0 flex-1 bg-transparent font-display text-2xl outline-none placeholder:text-ink-faint"
                />
                <span className="font-spec text-xs tabular-nums text-ink-faint">
                  {(required[spec.id] ?? '').length}/{spec.input?.maxLength}
                </span>
              </div>
            </div>
          ))}

          <h2 className="mt-12 font-spec text-[0.62rem] uppercase tracking-[0.22em] text-ink-faint">
            Options
          </h2>
          <ul className="mt-4 divide-y divide-rule border-y border-rule">
            {optionalAddOns.map((addOn) => {
              const state = options[addOn.id];
              const active = Boolean(state);
              const max = addOn.maxQty ?? 1;

              return (
                <li key={addOn.id} className="py-4">
                  <div className="flex items-start gap-4">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={active}
                      aria-label={addOn.label}
                      onClick={() => toggle(addOn)}
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[3px] border transition-colors ${
                        active
                          ? 'border-patina bg-patina text-paper'
                          : 'border-ink-faint hover:border-ink'
                      }`}
                    >
                      {active && (
                        <svg viewBox="0 0 12 12" className="h-3 w-3" aria-hidden="true">
                          <path
                            d="M2.5 6.5l2.5 2.5 4.5-5"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      )}
                    </button>

                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => toggle(addOn)}
                        className="flex w-full items-baseline justify-between gap-4 text-left"
                      >
                        <span className="text-sm">{addOn.label}</span>
                        <span className="shrink-0 font-spec text-sm tabular-nums text-ink-soft">
                          +{formatUSD(addOn.priceCents)}
                        </span>
                      </button>
                      <p className="mt-1 text-sm text-ink-soft">{addOn.note}</p>

                      {active && max > 1 && (
                        <div className="mt-3 flex items-center gap-3">
                          <span className="font-spec text-[0.62rem] uppercase tracking-[0.2em] text-ink-faint">
                            How many
                          </span>
                          <div className="flex items-center rounded-sm border border-rule">
                            <button
                              type="button"
                              aria-label={`One fewer ${addOn.label}`}
                              onClick={() =>
                                setOptions((p) => ({
                                  ...p,
                                  [addOn.id]: { ...p[addOn.id], qty: Math.max(1, state.qty - 1) },
                                }))
                              }
                              className="px-2.5 py-1 text-ink-soft hover:text-ink"
                            >
                              &minus;
                            </button>
                            <span className="w-8 text-center font-spec text-sm tabular-nums">
                              {state.qty}
                            </span>
                            <button
                              type="button"
                              aria-label={`One more ${addOn.label}`}
                              onClick={() =>
                                setOptions((p) => ({
                                  ...p,
                                  [addOn.id]: { ...p[addOn.id], qty: Math.min(max, state.qty + 1) },
                                }))
                              }
                              className="px-2.5 py-1 text-ink-soft hover:text-ink"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      )}

                      {active && addOn.input && (
                        <input
                          value={state.value}
                          onChange={(e) =>
                            setOptions((p) => ({
                              ...p,
                              [addOn.id]: { ...p[addOn.id], value: e.target.value },
                            }))
                          }
                          maxLength={addOn.input.maxLength}
                          placeholder={addOn.input.placeholder}
                          aria-label={`${addOn.label} detail`}
                          autoComplete="off"
                          className="mt-3 w-full rounded-sm border border-rule bg-paper px-3 py-2 text-sm outline-none placeholder:text-ink-faint focus:border-brass"
                        />
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Right: the work order, which writes itself */}
        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-sm border border-ink bg-paper">
            <div className="border-b border-rule px-6 py-4">
              <h2 className="font-spec text-[0.62rem] uppercase tracking-[0.22em] text-ink-faint">
                Order sheet
              </h2>
            </div>

            <dl className="px-6 py-5 font-spec text-sm">
              <div className="flex justify-between gap-4 py-1.5">
                <dt className="text-ink-soft">Piece</dt>
                <dd className="text-right">{product.name}</dd>
              </div>

              {requiredAddOns.map((spec) => (
                <div key={spec.id} className="flex justify-between gap-4 py-1.5">
                  <dt className="text-ink-soft">{spec.label}</dt>
                  <dd className="min-w-0 text-right">
                    {required[spec.id]?.trim() ? (
                      <span className="font-script text-xl break-words text-brass">
                        {required[spec.id].trim()}
                      </span>
                    ) : (
                      <span className="text-ink-faint">not set</span>
                    )}
                  </dd>
                </div>
              ))}

              <div className="flex justify-between gap-4 border-b border-rule py-1.5 pb-3">
                <dt className="text-ink-soft">Base</dt>
                <dd className="tabular-nums">{formatUSD(product.priceCents)}</dd>
              </div>

              {line && line.addOns.some((a) => !a.required) ? (
                line.addOns
                  .filter((a) => !a.required)
                  .map((a) => (
                    <div key={a.id} className="flex justify-between gap-4 py-1.5">
                      <dt className="min-w-0 text-ink-soft">
                        {a.qty > 1 ? `${a.qty} x ` : ''}
                        {a.label}
                        {a.value && (
                          <span className="block truncate text-xs text-ink-faint">{a.value}</span>
                        )}
                      </dt>
                      <dd className="shrink-0 tabular-nums text-patina">
                        +{formatUSD(a.priceCents)}
                      </dd>
                    </div>
                  ))
              ) : (
                <p className="py-2 text-ink-faint">
                  No options yet. The piece ships as described.
                </p>
              )}
            </dl>

            <div className="border-t border-rule px-6 py-5">
              <div className="flex items-center justify-between gap-4">
                <span className="font-spec text-[0.62rem] uppercase tracking-[0.22em] text-ink-faint">
                  Quantity
                </span>
                <div className="flex items-center rounded-sm border border-rule">
                  <button
                    type="button"
                    aria-label="One fewer"
                    onClick={() => {
                      setQty((q) => Math.max(1, q - 1));
                      setAdded(false);
                    }}
                    className="px-3 py-1.5 text-ink-soft hover:text-ink"
                  >
                    &minus;
                  </button>
                  <span className="w-9 text-center font-spec text-sm tabular-nums">{qty}</span>
                  <button
                    type="button"
                    aria-label="One more"
                    onClick={() => {
                      setQty((q) => Math.min(20, q + 1));
                      setAdded(false);
                    }}
                    className="px-3 py-1.5 text-ink-soft hover:text-ink"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="mt-5 flex items-baseline justify-between border-t border-ink pt-4">
                <span className="font-display text-lg">Total</span>
                <span className="font-spec text-xl tabular-nums">
                  {formatUSD(line?.lineCents ?? product.priceCents)}
                </span>
              </div>
              <p className="mt-1.5 text-right font-spec text-xs text-ink-faint">
                plus USPS, quoted at checkout
              </p>

              <button
                onClick={addToCart}
                disabled={blocked}
                className="mt-5 w-full rounded-sm bg-ink px-5 py-3.5 text-sm text-bench transition-colors hover:bg-brass-deep disabled:cursor-not-allowed disabled:bg-ink-faint"
              >
                Add to cart
              </button>

              {blocked && (
                <p className="mt-2.5 text-center text-sm text-flag">
                  {preview.missingRequired[0]?.split(': ')[1] ?? 'Finish the spec first.'}
                </p>
              )}

              {added && !blocked && (
                <button
                  onClick={() => router.push('/cart')}
                  className="mt-3 w-full rounded-sm border border-ink px-5 py-3 text-sm transition-colors hover:bg-ink hover:text-bench"
                >
                  Added. Go to cart &rarr;
                </button>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
