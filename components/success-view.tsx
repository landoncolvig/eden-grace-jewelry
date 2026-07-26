'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCart } from './cart-context';

export default function SuccessView() {
  const params = useSearchParams();
  const { clear } = useCart();
  const sessionId = params.get('session_id');

  // Emptying the cart is safe here because Stripe only ever redirects to this
  // URL after a completed payment. Fulfillment does not depend on this page
  // being reached, though: the webhook is what tells Jenna to start cutting,
  // so closing the tab at the wrong moment cannot lose an order.
  useEffect(() => {
    if (sessionId) clear();
  }, [sessionId, clear]);

  return (
    <div className="mx-auto max-w-2xl px-5 py-24 text-center sm:px-8">
      <p className="font-spec text-[0.62rem] uppercase tracking-[0.24em] text-ink-faint">
        Paid
      </p>
      <h1 className="mt-4 font-display text-4xl">It&rsquo;s on the bench</h1>
      <p className="mx-auto mt-5 max-w-md leading-relaxed text-ink-soft">
        Jenna has your order and the exact spec you built. A receipt is already in
        your inbox, and you&rsquo;ll get a tracking number the day it ships.
      </p>

      <div className="mx-auto mt-10 max-w-sm rounded-sm border border-rule bg-paper p-6 text-left">
        <h2 className="font-spec text-[0.62rem] uppercase tracking-[0.22em] text-ink-faint">
          What happens next
        </h2>
        <ol className="mt-4 space-y-3 text-sm leading-relaxed text-ink-soft">
          <li>
            <span className="font-spec text-brass">01</span> &nbsp;She cuts and finishes
            the piece by hand.
          </li>
          <li>
            <span className="font-spec text-brass">02</span> &nbsp;It ships USPS Ground
            Advantage with tracking.
          </li>
          <li>
            <span className="font-spec text-brass">03</span> &nbsp;Reply to your receipt
            if anything needs changing before cutting starts.
          </li>
        </ol>
      </div>

      <Link
        href="/"
        className="mt-10 inline-block rounded-sm border border-ink px-6 py-3 text-sm transition-colors hover:bg-ink hover:text-bench"
      >
        Back to the shop
      </Link>

      {sessionId && (
        <p className="mt-8 font-spec text-[0.65rem] text-ink-faint">
          {sessionId.slice(0, 28)}…
        </p>
      )}
    </div>
  );
}
