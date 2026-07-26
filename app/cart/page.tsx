import type { Metadata } from 'next';
import CartView from '@/components/cart-view';

export const metadata: Metadata = {
  title: 'Cart',
  description: 'Review your pieces and get a USPS shipping quote before checkout.',
};

export default function CartPage() {
  return <CartView />;
}
