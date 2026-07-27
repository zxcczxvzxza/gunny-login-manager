import { describe, it, expect } from 'vitest';
import { getSerialNumber } from './utils.js';

describe('getSerialNumber', () => {
  it('returns a 17-character string', () => {
    expect(getSerialNumber()).toHaveLength(17);
  });

  it('contains only uppercase letters and digits', () => {
    expect(getSerialNumber()).toMatch(/^[A-Z0-9]{17}$/);
  });

  it('produces different values across calls', () => {
    const values = new Set(Array.from({ length: 20 }, () => getSerialNumber()));
    // Collisions across 20 draws of a 36^17 space are astronomically unlikely.
    expect(values.size).toBeGreaterThan(1);
  });
});
