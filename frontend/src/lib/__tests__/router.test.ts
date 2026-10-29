import { describe, expect, it } from 'vitest';
import { hashToRoute, routeToHash } from '../router';

describe('hash routes', () => {
  it('round-trips every screen', () => {
    for (const r of [
      { name: 'scan' },
      { name: 'rewards' },
      { name: 'wardrobe' },
      { name: 'result', id: '3f2c9a1e-7b4d-4c1a-9e2f-0a1b2c3d4e5f' },
    ] as const) {
      expect(hashToRoute(routeToHash(r))).toEqual(r);
    }
  });

  it('falls back to the scan screen for empty or unknown hashes', () => {
    expect(hashToRoute('')).toEqual({ name: 'scan' });
    expect(hashToRoute('#nope')).toEqual({ name: 'scan' });
    expect(hashToRoute('#result-<script>')).toEqual({ name: 'scan' });
  });
});
