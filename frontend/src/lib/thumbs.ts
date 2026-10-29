/**
 * Small per-device photo thumbnails for past scans, so the wardrobe can show what
 * each item looked like. Kept in the browser only; the server never stores photos.
 */
const KEY = 'ecoscan.thumbs.v1';
const MAX = 40;

type ThumbMap = Record<string, { url: string; at: number }>;
let memory: ThumbMap = {};

function read(): ThumbMap {
  try {
    return { ...memory, ...(JSON.parse(localStorage.getItem(KEY) ?? '{}') as ThumbMap) };
  } catch {
    return memory;
  }
}

export function saveThumb(scanId: string, url: string) {
  const all = { ...read(), [scanId]: { url, at: Date.now() } };
  // Keep the newest MAX thumbnails.
  const kept = Object.fromEntries(
    Object.entries(all)
      .sort((a, b) => b[1].at - a[1].at)
      .slice(0, MAX),
  );
  memory = kept;
  try {
    localStorage.setItem(KEY, JSON.stringify(kept));
  } catch {
    // Storage full or blocked: the in-memory copy still works for this visit.
  }
}

export function getThumb(scanId: string): string | undefined {
  return read()[scanId]?.url;
}

/** A 200px square JPEG data URL, centre-cropped. */
export async function makeThumb(blob: Blob, size = 200): Promise<string | undefined> {
  try {
    const bitmap = await createImageBitmap(blob);
    const side = Math.min(bitmap.width, bitmap.height);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    canvas
      .getContext('2d')!
      .drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size);
    bitmap.close();
    return canvas.toDataURL('image/jpeg', 0.8);
  } catch {
    return undefined;
  }
}
