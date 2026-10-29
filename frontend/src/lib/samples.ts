import denimShirtPhoto from '../assets/samples/denim-shirt.jpg';
import jeansPhoto from '../assets/samples/jeans.jpg';
import sweaterPhoto from '../assets/samples/knit-sweater.jpg';
import sneakersPhoto from '../assets/samples/leather-sneakers.jpg';
import pufferPhoto from '../assets/samples/puffer-jacket.jpg';
import shirtPhoto from '../assets/samples/white-shirt.jpg';

/** One-tap examples: real photos (CC0, from the public-domain "clothing-dataset" by Alexey Grigorev).
 * The filename steers the sample matcher to the matching garment. */
export const SAMPLES = [
  { label: 'Jeans', file: 'sample-jeans.jpg', src: jeansPhoto },
  { label: 'Denim shirt', file: 'sample-vintage.jpg', src: denimShirtPhoto },
  { label: 'Knit sweater', file: 'sample-merino.jpg', src: sweaterPhoto },
  { label: 'Linen shirt', file: 'sample-linen.jpg', src: shirtPhoto },
  { label: 'Puffer jacket', file: 'sample-puffer.jpg', src: pufferPhoto },
  { label: 'Sneakers', file: 'sample-sneakers.jpg', src: sneakersPhoto },
];

/** Turn a bundled image URL into a Blob. The demo inlines images as data: URLs, which are decoded directly. */
export async function urlToBlob(url: string): Promise<Blob> {
  const match = /^data:([^;,]+)(;base64)?,(.*)$/.exec(url);
  if (match) {
    const [, type, base64, data] = match;
    const text = base64 ? atob(data) : decodeURIComponent(data);
    return new Blob([Uint8Array.from(text, (c) => c.charCodeAt(0))], { type });
  }
  return (await fetch(url)).blob();
}
