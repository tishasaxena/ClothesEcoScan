import type { Offer } from '../types.js';

// Partner names are fictional placeholders for the demo.
export const OFFERS: Offer[] = [
  {
    id: 'tree',
    partner: 'Canopy Collective',
    title: 'Plant a tree',
    description: 'We plant a native tree in a reforestation project on your behalf.',
    cost: 150,
    tags: ['any'],
    emoji: '🌳',
  },
  {
    id: 'thrift-5',
    partner: 'LoopThrift',
    title: '£5 off second-hand',
    description: '£5 off any order over £20 at our pre-loved marketplace.',
    cost: 250,
    tags: ['second-hand', 'any'],
    emoji: '♻️',
  },
  {
    id: 'repair',
    partner: 'Stitch & Mend',
    title: 'Free garment repair',
    description: 'One free repair — zips, seams, buttons or denim patching.',
    cost: 400,
    tags: ['jeans', 'jacket', 'coat', 'shoes', 'second-hand'],
    emoji: '🧵',
  },
  {
    id: 'washbag',
    partner: 'ClearWater',
    title: 'Microfibre wash bag',
    description: 'Catches microplastic fibres shed by synthetics in the wash.',
    cost: 300,
    tags: ['synthetic'],
    emoji: '🫧',
  },
  {
    id: 'organic-15',
    partner: 'Field & Fibre',
    title: '15% off organic basics',
    description: 'Organic cotton, hemp and linen essentials.',
    cost: 350,
    tags: ['cotton', 't-shirt', 'shirt'],
    emoji: '🌱',
  },
  {
    id: 'swap-ticket',
    partner: 'SwapShop',
    title: 'Clothes swap ticket',
    description: 'Entry to a community clothes swap — bring 5, take 5.',
    cost: 100,
    tags: ['any'],
    emoji: '🔁',
  },
];
