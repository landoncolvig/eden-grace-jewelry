'use client';

import { Suspense, useEffect } from 'react';
import Script from 'next/script';
import { usePathname, useSearchParams } from 'next/navigation';
import { GA_ID, analyticsEnabled, initAnalytics, trackPageView } from '@/lib/analytics';

/**
 * Reports a view on every client-side navigation.
 *
 * Split out from the loader below because useSearchParams opts a component
 * into client-side rendering, and Next refuses to prerender that without a
 * Suspense boundary.
 */
function PageViews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    initAnalytics();
    const query = searchParams.toString();
    trackPageView(query ? `${pathname}?${query}` : pathname);
  }, [pathname, searchParams]);

  return null;
}

/**
 * Google Analytics 4.
 *
 * Renders nothing at all when NEXT_PUBLIC_GA_ID is unset, so a local build
 * and a fork ship with no third-party script and no requests to Google.
 *
 * There is no inline bootstrap snippet here. lib/analytics.ts creates the
 * dataLayer queue on first use, which is what keeps `config` ahead of an
 * event fired during hydration. This tag only fetches the library that
 * drains the queue.
 *
 * afterInteractive, not beforeInteractive: measurement is not needed to
 * render the page, and blocking on an analytics download ahead of a 1500px
 * product photo costs more than the sessions it would capture.
 */
export default function Analytics() {
  if (!analyticsEnabled) return null;

  return (
    <>
      <Script
        id="ga-src"
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
      />
      <Suspense fallback={null}>
        <PageViews />
      </Suspense>
    </>
  );
}
