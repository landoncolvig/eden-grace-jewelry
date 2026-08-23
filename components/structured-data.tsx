import { PRODUCTS, photo, type Product } from '@/lib/shop';

/**
 * Schema.org JSON-LD.
 *
 * Two things need it. Rich results in search put the price and the in-stock
 * line under the blue link, and Google's free Shopping listings will not take
 * a product without an Offer. For a nine-piece store with no ad budget those
 * listings are the only product-level search traffic available.
 *
 * Every figure is read from shared/catalog.js, the same module that prices the
 * cart and that the Cloud Function charges from, so a price cannot drift
 * between what Google is told and what Square collects. That is not a detail:
 * a mismatch is what gets a merchant suspended from Shopping.
 *
 * These are server components. The script tag has to be in the HTML Google
 * fetches, which is the whole reason the rest of this page moved back into the
 * prerender.
 */

const SITE = 'https://edengracejewelry.com';

function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // JSON.stringify escapes nothing dangerous here, but a product name is
      // Jenna's text and a stray </script> in it would break out of the tag.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, '\\u003c'),
      }}
    />
  );
}

const ORGANIZATION = {
  '@type': 'Organization',
  '@id': `${SITE}/#organization`,
  name: 'Eden Grace Jewelry Co.',
  url: SITE,
  logo: `${SITE}/og/default.jpg`,
  image: `${SITE}/og/default.jpg`,
  description:
    'Beaded gemstone necklaces, strung by hand in small batches and made to order.',
  address: {
    '@type': 'PostalAddress',
    // The street address is deliberately absent. It is a private residence and
    // this repo is public. See functions/api/origin.js.
    addressLocality: 'Bedford',
    addressRegion: 'TX',
    addressCountry: 'US',
  },
};

export function ProductJsonLd({ product }: { product: Product }) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'Product',
        '@id': `${SITE}/product/${product.slug}/#product`,
        name: product.name,
        description: product.description,
        image: [`${SITE}${photo(product.image)}`, `${SITE}/og/${product.slug}.jpg`],
        ...(product.material ? { material: product.material } : {}),
        ...(product.size ? { size: product.size } : {}),
        category: 'Necklaces',
        brand: { '@type': 'Brand', name: 'Eden Grace Jewelry Co.' },
        offers: {
          '@type': 'Offer',
          url: `${SITE}/product/${product.slug}/`,
          // Priced from the catalog in cents so this never rounds differently
          // to the Square charge.
          price: (product.priceCents / 100).toFixed(2),
          priceCurrency: 'USD',
          // Made to order, so the piece is available whether or not one is
          // finished. The lead time is what actually varies and it is stated.
          availability: 'https://schema.org/InStock',
          itemCondition: 'https://schema.org/NewCondition',
          seller: { '@type': 'Organization', name: 'Eden Grace Jewelry Co.' },
          shippingDetails: {
            '@type': 'OfferShippingDetails',
            shippingDestination: {
              '@type': 'DefinedRegion',
              addressCountry: 'US',
            },
          },
        },
      }}
    />
  );
}

export function HomeJsonLd() {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@graph': [
          ORGANIZATION,
          {
            '@type': 'WebSite',
            '@id': `${SITE}/#website`,
            url: SITE,
            name: 'Eden Grace Jewelry Co.',
            publisher: { '@id': `${SITE}/#organization` },
          },
          {
            // The grid, as a list, so the pieces can surface individually
            // rather than the homepage standing in for all nine.
            '@type': 'ItemList',
            name: 'The pieces',
            numberOfItems: PRODUCTS.length,
            itemListElement: PRODUCTS.map((p, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              url: `${SITE}/product/${p.slug}/`,
              name: p.name,
            })),
          },
        ],
      }}
    />
  );
}
