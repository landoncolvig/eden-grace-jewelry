import type { MetadataRoute } from 'next';
import { PRODUCTS } from '@/lib/shop';

const SITE = 'https://edengracejewelry.com';

// sitemap.ts compiles to a Route Handler, and `output: export` refuses to
// build one that has not declared itself static.
export const dynamic = 'force-static';

/**
 * Emitted as a static sitemap.xml at build time, so it grows with the catalog
 * instead of being a file someone remembers to edit.
 *
 * /cart and /success are left out on purpose. Neither has anything to index,
 * and /success is already noindex in its own metadata.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  // Every build stamps today, which is honest for a static export: the pages
  // really are regenerated on each deploy.
  const lastModified = new Date();

  return [
    { url: `${SITE}/`, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE}/about/`, lastModified, changeFrequency: 'monthly', priority: 0.5 },
    ...PRODUCTS.map((product) => ({
      url: `${SITE}/product/${product.slug}/`,
      lastModified,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ];
}
