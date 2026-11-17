export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  slug: string; // e.g. 'dwellr' → maps to /products/dwellr
  status: 'live' | 'coming-soon';
  statusLabel: string; // shown next to the status dot
  imageSrc?: string; // path in /public/images/ (live products)
  imageAlt?: string;
  externalUrl?: string; // the product's own site, if it has one
  externalLabel?: string;
}

// Live products are listed first.
export const products: Product[] = [
  {
    id: 'velopad',
    name: 'VeloPad',
    description:
      'An Android phone that plays as a PC game controller. Tilt to aim, tap to shoot, over Wi-Fi or USB.',
    category: 'Gaming utility',
    slug: 'velopad',
    status: 'live',
    statusLabel: 'Live on Google Play',
    imageSrc: '/images/velopad/controller.jpg',
    imageAlt: 'VeloPad controller layout on a phone, with sticks, triggers and face buttons',
    externalUrl: 'https://velopad.bluewavehz.com',
    externalLabel: 'Visit the VeloPad site',
  },
  {
    id: 'dwellr',
    name: 'Dwellr',
    description:
      'A rental marketplace that connects landlords and tenants in Nigeria directly, with no agent in between.',
    category: 'PropTech',
    slug: 'dwellr',
    status: 'coming-soon',
    statusLabel: 'In development',
  },
];
