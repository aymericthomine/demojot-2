/**
 * Seeded randomness.
 *
 * Everything in a video — how many balls, how many threads, where they start,
 * which way they go — comes out of here, so a seed is the whole video. Same
 * seed, same file, forever. `Math.random` appears nowhere in the simulation.
 */

export interface Rng {
  /** Uniform in [0, 1). */
  next(): number;
  /** Uniform in [min, max). */
  range(min: number, max: number): number;
  /** Integer in [min, max], inclusive. */
  int(min: number, max: number): number;
  /** Picks one entry. */
  pick<T>(items: readonly T[]): T;
}

/** mulberry32 — small, fast, and good enough for scattering points. */
export function createRng(seed: number): Rng {
  let state = (seed >>> 0) || 0x9e3779b9;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (min, max) => min + next() * (max - min),
    int: (min, max) => min + Math.floor(next() * (max - min + 1)),
    pick: (items) => items[Math.floor(next() * items.length)],
  };
}

/** FNV-1a, so a typed word can be a seed. */
export function hashString(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}
