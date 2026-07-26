import type { Metadata } from 'next';
import { Suspense } from 'react';
import SuccessView from '@/components/success-view';

export const metadata: Metadata = {
  title: 'Order placed',
  description: 'Your piece is queued at the bench.',
  robots: { index: false },
};

export default function SuccessPage() {
  return (
    <Suspense fallback={<div className="mx-auto max-w-2xl px-5 py-24 sm:px-8" />}>
      <SuccessView />
    </Suspense>
  );
}
