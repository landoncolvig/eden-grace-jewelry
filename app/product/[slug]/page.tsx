import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { PRODUCTS, getProduct } from '@/lib/shop';
import Configurator from '@/components/configurator';
import { ProductJsonLd } from '@/components/structured-data';

// Static export needs the full list of routes at build time. This stays
// correct as Jenna adds more products to the shared catalog.
export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(props: PageProps<'/product/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const product = getProduct(slug);
  if (!product) return { title: 'Not found' };

  const url = `/product/${product.slug}/`;
  // A baked JPEG, not the site's own WebP. Facebook, Instagram and X will not
  // render a WebP og:image, and Instagram is where these links get shared.
  // Built by scripts/og-cards.py; re-run it when a photo or a price changes.
  const card = `/og/${product.slug}.jpg`;

  return {
    title: product.name,
    description: product.description,
    alternates: { canonical: url },
    openGraph: {
      type: 'website',
      url,
      title: product.name,
      description: product.tagline,
      images: [{ url: card, width: 1200, height: 630, alt: `${product.name}, ${product.tagline.toLowerCase()}` }],
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description: product.tagline,
      images: [card],
    },
    // No `other` block for product:price:*. Next renders `other` as
    // <meta name="...">, and those are OpenGraph properties that Facebook
    // reads off <meta property="...">. The price is in the JSON-LD, correctly.
  };
}

export default async function ProductPage(props: PageProps<'/product/[slug]'>) {
  // params is a Promise in Next 16. Synchronous access was removed.
  const { slug } = await props.params;
  const product = getProduct(slug);
  if (!product) notFound();

  // No Suspense boundary here any more, and nothing below it may call
  // useSearchParams. That hook opts its boundary out of the static prerender,
  // and with the whole page inside one, the export wrote the empty fallback
  // into every product page: no heading, no photo, no price, no alt text.
  // Google read nine empty pages and indexed none of them. Verify with curl,
  // not a browser: the served HTML must contain the name, the price and an
  // <img>. See scripts/verify-prerender.mjs, which asserts exactly that.
  return (
    <>
      <ProductJsonLd product={product} />
      <Configurator product={product} />
    </>
  );
}
