'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCart } from './cart-context';

export default function SuccessView() {
  const params = useSearchParams();
  const { clear } = useCart();
  const orderId = params.get('orderId');
  const transactionId = params.get('transactionId');
  const receiptId = orderId || transactionId || params.get('checkoutId');

  // Emptying the cart is safe here because Square only redirects to this URL
  // after a completed payment. Fulfillment does not depend on this page
  // being reached, though: the webhook is what tells Jenna to start cutting,
  // so closing the tab at the wrong moment cannot lose an order.
  useEffect(() => {
    if (receiptId) clear();
  }, [receiptId, clear]);

  return (
    <div className="mx-auto max-w-2xl px-5 py-24 text-center sm:px-8">
      <p className="font-spec text-[0.7rem] uppercase tracking-[0.16em] text-ink-faint">
        Paid
      </p>
      <h1 className="mt-4 font-display text-4xl">It&rsquo;s on the bench</h1>
      <p className="mx-auto mt-5 max-w-md leading-relaxed text-ink-soft">
        Jenna has your order and the exact spec you built. A receipt is already in
        your inbox, and you&rsquo;ll get a tracking number the day it ships.
      </p>

      <div className="mx-auto mt-10 max-w-sm rounded-xl border border-rule bg-paper p-6 text-left">
        <h2 className="font-spec text-[0.7rem] uppercase tracking-[0.16em] text-ink-faint">
          What happens next
        </h2>
        <ol className="mt-4 space-y-3 text-sm leading-relaxed text-ink-soft">
          <li>
            <span className="font-spec text-rose">01</span> &nbsp;She lays out the
            beads and strings the piece by hand.
          </li>
          <li>
            <span className="font-spec text-rose">02</span> &nbsp;It ships USPS Ground
            Advantage with tracking.
          </li>
          <li>
            <span className="font-spec text-rose">03</span> &nbsp;Reply to your receipt
            if anything needs changing before she starts.
          </li>
        </ol>
      </div>

      <Link
        href="/"
        className="mt-10 inline-block rounded-xl border border-ink px-6 py-3 text-sm font-medium transition-colors hover:bg-ink hover:text-bench"
      >
        Back to the shop
      </Link>

      {receiptId && (
        <p className="mt-8 font-spec text-[0.7rem] text-ink-faint">
          {receiptId.slice(0, 28)}…
        </p>
      )}
    </div>
  );
}
