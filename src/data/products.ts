export interface Product {
  id: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  badgeColor: 'primary' | 'accent';
  slug: string;        // e.g. 'dwellr' → maps to /products/dwellr
  imageSrc: string;    // path in /public/images/
  imageAlt: string;
  status: 'live' | 'coming-soon' | 'beta';
  externalUrl?: string; // primary live URL if applicable
}

export const products: Product[] = [
  {
    id: 'dwellr',
    name: 'Dwellr',
    tagline: 'Direct landlord-to-tenant rentals. No agent fees.',
    description:
      'A two-sided rental marketplace connecting landlords and tenants directly across Nigeria.',
    category: 'PropTech',
    badgeColor: 'primary',
    slug: 'dwellr',
    imageSrc: '/images/dwellr-preview.png',
    imageAlt: 'Dwellr rental platform screenshot',
    status: 'live',
    externalUrl: 'https://dwellr.ng',
  },
  {
    id: 'velopad',
    name: 'Velopad',
    tagline: 'Your phone, reimagined as a high-precision PC controller.',
    description:
      'Turns Android devices into low-latency PC game controllers using gyroscope and touch input.',
    category: 'Gaming Utility',
    badgeColor: 'accent',
    slug: 'velopad',
    imageSrc: '/images/velopad-preview.png',
    imageAlt: 'Velopad controller interface screenshot',
    status: 'live',
  },
];
