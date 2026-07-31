import type { MetadataRoute } from 'next';

const SITE = 'https://edengracejewelry.com';

// Same constraint as sitemap.ts: a Route Handler under `output: export` has
// to declare itself static.
export const dynamic = 'force-static';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // A crawler has no cart and no order, so these are dead ends that waste
      // crawl budget. /success/ also carries a Square order id in the query
      // string, which does not belong in a search index.
      disallow: ['/cart/', '/success/'],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
