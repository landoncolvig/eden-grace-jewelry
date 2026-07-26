import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PRODUCTS, getProduct } from '@/lib/shop';
import Configurator from '@/components/configurator';

// Static export needs the full list of routes at build time. Two products
// today; this stays correct as Jenna adds more.
export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata(props: PageProps<'/product/[slug]'>): Promise<Metadata> {
  const { slug } = await props.params;
  const product = getProduct(slug);
  if (!product) return { title: 'Not found' };

  return {
    title: product.name,
    description: product.description,
    openGraph: { title: product.name, description: product.tagline },
  };
}

export default async function ProductPage(props: PageProps<'/product/[slug]'>) {
  // params is a Promise in Next 16. Synchronous access was removed.
  const { slug } = await props.params;
  const product = getProduct(slug);
  if (!product) notFound();

  return (
    // The configurator reads ?name= from the hero, and useSearchParams needs a
    // Suspense boundary to prerender.
    <Suspense fallback={<div className="mx-auto max-w-6xl px-5 py-20 sm:px-8" />}>
      <Configurator product={product} />
    </Suspense>
  );
}
