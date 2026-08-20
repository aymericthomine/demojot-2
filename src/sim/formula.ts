/**
 * Shapes the seed writes for itself.
 *
 * The ten named shapes are a menu, and a menu runs out. The first version of
 * this file was a longer menu — five families, each with a handful of numbers,
 * most of them whole — and it ran out too: there are only so many (2,5) torus
 * knots, and rolling twice landed on the same one often enough to notice.
 *
 * So a shape is not picked here, it is *composed*, out of three things that vary
 * independently:
 *
 * - a **base**, the surface or curve itself. Two of the four are built on random
 *   Fourier series — a closed curve whose harmonics are dealt fresh — which is
 *   what replaces a list of named knots with a continuum of them.
 * - a **deformation**, applied to whatever the base produced: twist, taper,
 *   waist, flutes, ripples, lean. Every one of them is a continuous number, and
 *   every one applies to every base, so a knot can be tapered and a supershape
 *   can be twisted.
 * - a **style**: scattered over the surface, drawn as a wireframe of rings and
 *   meridians, or both at once. This is the multiplier that costs nothing — the
 *   same shape reads completely differently as a lattice.
 *
 * Nothing in that is stored. A seed is a point in the space, and two seeds are
 * two different points: the discrete parts (how many lobes, which harmonics) are
 * carried by a dozen continuous ones, so the same shape does not come round
 * twice.
 *
 * Everything is sampled **by area rather than by parameter**, which is the whole
 * quality of the thing: a surface sampled evenly in its parameters piles its
 * points wherever the parameters are squeezed — round a pole, along a crease, at
 * the tip of a lobe — and reads as a shape with bright patches rather than a
 * shape made of points. So a point is proposed and then kept in proportion to
 * how much surface is under it. The deformation is inside the function that is
 * measured, so a twist that stretches one side is accounted for too.
 */

import type { Rng } from './random';

export type Point = readonly [number, number, number];

/** What a builder is handed: somewhere to put points. */
export interface Sink {
  add(x: number, y: number, z: number, tint: number): void;
  addSpun(x: number, y: number, z: number): void;
}

/** One term of a Fourier series: how fast it goes round, how far, and from where. */
export interface Harmonic {
  k: number;
  a: number;
  phase: number;
}

/** A closed curve in space, as three Fourier series in the same parameter. */
export interface Curve {
  x: readonly Harmonic[];
  y: readonly Harmonic[];
  z: readonly Harmonic[];
}

export type Base =
  | {
      kind: 'super';
      /** Lobes round the equator, and how the corners between them are cut. */
      m1: number;
      n11: number;
      n12: number;
      /** The same again for the profile from pole to pole. */
      m2: number;
      n21: number;
      n22: number;
      tall: number;
    }
  | {
      kind: 'revolve';
      /** The silhouette, as a short Fourier series in height. */
      profile: readonly Harmonic[];
      girth: number;
      tall: number;
    }
  | { kind: 'tube'; curve: Curve; thickness: number }
  | { kind: 'ribbon'; curve: Curve; width: number; twists: number };

/** Applied to whatever the base produced, and to every base alike. */
export interface Deform {
  /** Turns from bottom to top. */
  twist: number;
  /** Wider at one end than the other. */
  taper: number;
  /** Pinched or barrelled in the middle. */
  waist: number;
  flutes: number;
  fluteDepth: number;
  ripples: number;
  rippleDepth: number;
  /** Leans the whole thing over, which breaks the symmetry of a body of revolution. */
  lean: number;
}

export type Style = 'scatter' | 'wire' | 'veil';

export interface Formula {
  base: Base;
  deform: Deform;
  style: Style;
  rings: number;
  meridians: number;
}

const round = (value: number, places = 2): number => Number(value.toFixed(places));

const BASE_WORD: Record<Base['kind'], string> = {
  super: 'supershape',
  revolve: 'body',
  tube: 'loop',
  ribbon: 'ribbon',
};

/** Short enough for a file name, particular enough to tell two shapes apart. */
export function describeFormula(f: Formula): string {
  const parts: string[] = [f.base.kind, f.style];
  switch (f.base.kind) {
    case 'super':
      parts.push(`${round(f.base.m1, 0)}x${round(f.base.m2, 0)}`, `${round(f.base.n11)}`);
      break;
    case 'revolve':
      parts.push(f.base.profile.map((h) => h.k).join(''), `${round(f.base.girth)}`);
      break;
    case 'tube':
    case 'ribbon':
      parts.push(f.base.curve.x.map((h) => h.k).join(''), f.base.curve.y.map((h) => h.k).join(''));
      break;
  }
  if (f.deform.twist) parts.push(`t${round(f.deform.twist, 1)}`);
  if (f.deform.flutes) parts.push(`f${f.deform.flutes}`);
  return parts.join('-');
}

/** The same, in words, for the line under the button. */
export function nameFormula(f: Formula): string {
  const word = BASE_WORD[f.base.kind];
  const bits: string[] = [];
  if (f.style === 'wire') bits.push('lattice');
  if (f.style === 'veil') bits.push('veiled');
  if (f.deform.flutes) bits.push(`${f.deform.flutes} flutes`);
  if (Math.abs(f.deform.twist) > 0.15) bits.push('twisted');
  if (f.base.kind === 'super') bits.push(`${round(f.base.m1, 0)}×${round(f.base.m2, 0)}`);
  if (f.base.kind === 'tube' || f.base.kind === 'ribbon') {
    bits.push(`${f.base.curve.x.length + f.base.curve.y.length} harmonics`);
  }
  return bits.length ? `${word}, ${bits.join(', ')}` : word;
}

/**
 * The Gielis superformula: one equation, and most of the shapes in nature.
 *
 * `m` is how many lobes go round; the exponents decide whether a lobe is a
 * spike, a facet or a bulge. Below about a half the lobes come to points and the
 * shape is a star, around one they are gem facets, above two everything inflates
 * back into a ball.
 */
const superRadius = (angle: number, m: number, n1: number, n2: number): number => {
  const a = Math.abs(Math.cos((m * angle) / 4)) ** n2;
  const b = Math.abs(Math.sin((m * angle) / 4)) ** n2;
  const sum = a + b;
  // A shape is allowed to ask for a radius of infinity. Clamped, rather than
  // left to paint a point at the edge of the number line.
  return sum <= 0 ? 0 : Math.min(4, (1 / sum) ** (1 / n1));
};

const series = (terms: readonly Harmonic[], t: number): number => {
  let sum = 0;
  for (const h of terms) sum += h.a * Math.cos(h.k * t + h.phase);
  return sum;
};

/** Where a curve is at `t`, `t` running 0 to 1 all the way round. */
const curveAt = (curve: Curve, t: number): Point => {
  const a = t * Math.PI * 2;
  return [series(curve.x, a), series(curve.y, a), series(curve.z, a)];
};

/**
 * The deformation, as a function of a point.
 *
 * Written to take and return a point so it can sit inside the parametric
 * function rather than after it: the sampler measures how much surface a step
 * covers, and it has to measure the surface that is actually drawn.
 */
const bend = (p: Point, d: Deform, reach: number): Point => {
  const [x0, y0, z0] = p;
  // Height, normalised to roughly -1..1 so the numbers mean the same thing on a
  // tall shape and a flat one.
  const h = reach > 0 ? y0 / reach : 0;
  const theta = Math.atan2(z0, x0);
  const r = Math.hypot(x0, z0);
  const taper = 1 + d.taper * h;
  const waist = 1 + d.waist * (h * h * 4 - 1) * 0.25;
  const flute = d.flutes ? 1 + d.fluteDepth * Math.cos(d.flutes * theta) : 1;
  const ripple = d.ripples ? 1 + d.rippleDepth * Math.sin(d.ripples * Math.PI * h) : 1;
  const scale = taper * waist * flute * ripple;
  const turn = theta + d.twist * h * Math.PI;
  const rr = r * scale;
  return [rr * Math.cos(turn) + d.lean * h * h, y0, rr * Math.sin(turn)];
};

/** How far the base reaches up, so the deformation knows what "the top" means. */
const reachOf = (base: Base): number => {
  switch (base.kind) {
    case 'super':
      return base.tall;
    case 'revolve':
      return base.tall;
    case 'tube':
    case 'ribbon':
      return 1;
  }
};

/** The surface a formula describes, as a function of two parameters. */
function surfaceOf(f: Formula): ((u: number, v: number) => Point) | null {
  const reach = reachOf(f.base);
  const base = f.base;
  switch (base.kind) {
    case 'super':
      return (u, v) => {
        const theta = (u - 0.5) * Math.PI * 2;
        const phi = (v - 0.5) * Math.PI;
        const r1 = superRadius(theta, base.m1, base.n11, base.n12);
        const r2 = superRadius(phi, base.m2, base.n21, base.n22);
        return bend(
          [
            r1 * Math.cos(theta) * r2 * Math.cos(phi),
            r2 * Math.sin(phi) * base.tall,
            r1 * Math.sin(theta) * r2 * Math.cos(phi),
          ],
          f.deform,
          reach,
        );
      };
    case 'revolve':
      return (u, v) => {
        const theta = (u - 0.5) * Math.PI * 2;
        const y = (v - 0.5) * 2 * base.tall;
        // The profile is a Fourier series in height, kept positive: a radius
        // that goes negative turns the surface inside out through its own axis.
        const r = Math.max(0.05, base.girth + series(base.profile, v * Math.PI * 2));
        return bend([r * Math.cos(theta), y, r * Math.sin(theta)], f.deform, reach);
      };
    case 'ribbon':
      return (u, v) => {
        const p = curveAt(base.curve, u);
        const q = curveAt(base.curve, (u + 1e-3) % 1);
        const t = norm([q[0] - p[0], q[1] - p[1], q[2] - p[2]]);
        const [ax, ay, az] = across(t);
        const [bx, by, bz] = cross(t, [ax, ay, az]);
        const w = (v - 0.5) * 2 * base.width;
        const spin = u * Math.PI * 2 * base.twists;
        const c = Math.cos(spin) * w;
        const s = Math.sin(spin) * w;
        return bend(
          [p[0] + ax * c + bx * s, p[1] + ay * c + by * s, p[2] + az * c + bz * s],
          f.deform,
          reach,
        );
      };
    case 'tube':
      // Sampled as a solid tube rather than a surface — see `sampleTube`.
      return null;
  }
}

const norm = (v: Point): Point => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

const cross = (a: Point, b: Point): Point => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];

/** Any direction across the given one. Which one does not matter. */
const across = (t: Point): Point => {
  const guess: Point = Math.abs(t[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0];
  return norm(cross(t, guess));
};

/**
 * Points over a parametric surface, spread by area.
 *
 * The Jacobian — how much surface one step of `u` and `v` covers — is measured
 * numerically rather than derived, because these surfaces are dealt at run time
 * and nobody is going to differentiate them by hand.
 */
function sampleSurface(
  into: Sink,
  rng: Rng,
  count: number,
  at: (u: number, v: number) => Point,
  tintAt: (u: number, v: number) => number,
): void {
  const step = 1e-3;
  const area = (u: number, v: number): number => {
    const p = at(u, v);
    const pu = at(u + step, v);
    const pv = at(u, v + step);
    const ax = (pu[0] - p[0]) / step;
    const ay = (pu[1] - p[1]) / step;
    const az = (pu[2] - p[2]) / step;
    const bx = (pv[0] - p[0]) / step;
    const by = (pv[1] - p[1]) / step;
    const bz = (pv[2] - p[2]) / step;
    return Math.hypot(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx);
  };

  // The ceiling for the rejection, off a coarse grid. Padded, because the grid
  // will have missed the true maximum, and a ceiling that is too low quietly
  // turns the rejection back into uniform sampling exactly where the surface is
  // most stretched.
  let ceiling = 0;
  const grid = 20;
  for (let i = 0; i <= grid; i += 1) {
    for (let j = 0; j <= grid; j += 1) {
      const value = area(i / grid, j / grid);
      if (Number.isFinite(value)) ceiling = Math.max(ceiling, value);
    }
  }
  ceiling *= 1.15;

  let made = 0;
  // Bounded: a surface whose area is nearly all in a sliver can reject for a
  // long time, and a shape that takes a second to build is worse than a shape
  // whose last few hundred points are a little uneven.
  let tries = count * 30;
  while (made < count && tries > 0) {
    tries -= 1;
    const u = rng.next();
    const v = rng.next();
    const value = area(u, v);
    if (!Number.isFinite(value)) continue;
    if (ceiling > 0 && rng.next() * ceiling > value) continue;
    const p = at(u, v);
    if (!Number.isFinite(p[0] + p[1] + p[2])) continue;
    into.add(p[0], p[1], p[2], tintAt(u, v));
    made += 1;
  }
  while (made < count) {
    const u = rng.next();
    const v = rng.next();
    const p = at(u, v);
    if (Number.isFinite(p[0] + p[1] + p[2])) into.add(p[0], p[1], p[2], tintAt(u, v));
    made += 1;
  }
}

/**
 * The same surface drawn as a wireframe: rings across it and meridians up it.
 *
 * The two families are tinted half a palette apart, which is what makes a
 * lattice read as a lattice rather than as a shape with gaps in it.
 */
function sampleWire(
  into: Sink,
  rng: Rng,
  count: number,
  at: (u: number, v: number) => Point,
  rings: number,
  meridians: number,
): void {
  const half = count >> 1;
  for (let i = 0; i < count; i += 1) {
    const onRing = i < half;
    const u = onRing ? rng.next() : Math.floor(rng.next() * meridians) / meridians;
    const v = onRing ? (Math.floor(rng.next() * rings) + 0.5) / rings : rng.next();
    const p = at(u, v);
    if (!Number.isFinite(p[0] + p[1] + p[2])) continue;
    into.add(p[0], p[1], p[2], onRing ? 0.02 : 0.52);
  }
}

/** Points scattered through a solid tube around a closed curve. */
function sampleTube(
  into: Sink,
  rng: Rng,
  count: number,
  thickness: number,
  at: (t: number) => Point,
): void {
  for (let i = 0; i < count; i += 1) {
    const t = rng.next();
    const p = at(t);
    const q = at((t + 1e-3) % 1);
    const tangent = norm([q[0] - p[0], q[1] - p[1], q[2] - p[2]]);
    const a = across(tangent);
    const b = cross(tangent, a);
    const angle = rng.next() * Math.PI * 2;
    // Square-rooted, so the points fill the tube evenly instead of crowding its
    // axis. Nothing is hidden in this mode, so a tube is a solid tube.
    const r = Math.sqrt(rng.next()) * thickness;
    const c = Math.cos(angle) * r;
    const s = Math.sin(angle) * r;
    into.add(p[0] + a[0] * c + b[0] * s, p[1] + a[1] * c + b[1] * s, p[2] + a[2] * c + b[2] * s, t);
  }
}

/**
 * A closed curve, dealt.
 *
 * Three or four harmonics an axis, with the higher ones weaker: the first term
 * is the loop, the rest are what make it a knot, a pretzel or a figure of eight.
 * Amplitudes and phases are continuous, so this is the part of the generator
 * that does not repeat — a named (p,q) torus knot is one point in here.
 */
function dealCurve(rng: Rng): Curve {
  const axis = (first: number, phase: number): Harmonic[] => {
    const terms: Harmonic[] = [{ k: 1, a: first, phase }];
    const extra = rng.int(1, 3);
    for (let i = 0; i < extra; i += 1) {
      const k = rng.int(2, 5);
      // Falling off as the square root rather than as `k`: divided by `k` the
      // higher terms are so faint that every curve comes out a slightly wobbly
      // ring, and it is the higher terms that make a knot a knot.
      terms.push({ k, a: rng.range(0.25, 0.8) / Math.sqrt(k), phase: rng.range(0, Math.PI * 2) });
    }
    return terms;
  };
  // The x and z series share a size and sit a quarter turn apart, so the curve
  // goes round the upright axis rather than lying in a plane — which is what
  // keeps it interesting to watch from the side.
  const size = rng.range(0.8, 1.1);
  return {
    x: axis(size, 0),
    // Enough height to leave the plane. A curve whose rise is much smaller than
    // its width is a ring seen edge-on for half of every turn.
    y: axis(rng.range(0.45, 0.95), rng.range(0, Math.PI * 2)),
    z: axis(size, Math.PI / 2),
  };
}

/** Scaled so every curve fills the frame the same way, whatever it came out as. */
function fitCurve(curve: Curve): Curve {
  let widest = 0;
  for (let i = 0; i < 256; i += 1) {
    const p = curveAt(curve, i / 256);
    widest = Math.max(widest, Math.hypot(p[0], p[2]), Math.abs(p[1]));
  }
  const s = widest > 0 ? 1 / widest : 1;
  const scale = (terms: readonly Harmonic[]) => terms.map((h) => ({ ...h, a: h.a * s }));
  return { x: scale(curve.x), y: scale(curve.y), z: scale(curve.z) };
}

const maybe = (rng: Rng, chance: number, value: () => number): number =>
  rng.next() < chance ? value() : 0;

function dealBase(rng: Rng): Base {
  const roll = rng.next();
  if (roll < 0.3) {
    const bands = [
      () => rng.range(0.16, 0.42), // points
      () => rng.range(0.5, 1.1), // facets
      () => rng.range(1.6, 3.2), // inflated
    ];
    let first = rng.pick([0, 0, 0, 1, 1, 2]);
    // Inflated in both directions is a ball, and a ball is the one shape in this
    // family not worth six seconds of anybody's time.
    const second = first === 2 ? rng.pick([0, 0, 1]) : rng.pick([0, 1, 1, 2]);
    const m2 = rng.pick([0, rng.int(2, 8), rng.int(2, 8)]);
    // A profile of nought lobes is a circle, so an inflated equator on top of it
    // is a sphere however many lobes were asked for. Measured: over three
    // hundred rolls this was the only pair whose silhouettes came out alike.
    if (m2 === 0 && first === 2) first = 0;
    return {
      kind: 'super',
      m1: rng.int(3, 9),
      n11: bands[first](),
      // The other exponent works against the first: the spikes come from the
      // ratio between them, so a low n1 against a middling n2 is a star and a
      // low n1 against a low n2 is a circle again.
      n12: rng.range(1.2, 2.4),
      m2,
      n21: bands[second](),
      n22: rng.range(1.2, 2.4),
      tall: rng.range(0.7, 1.6),
    };
  }
  if (roll < 0.55) {
    // A silhouette drawn by two or three sine waves in height: vases, spindles,
    // bells, hourglasses, strings of beads, all from the same three numbers.
    const terms = rng.int(2, 3);
    const profile: Harmonic[] = [];
    for (let i = 0; i < terms; i += 1) {
      const k = i === 0 ? rng.int(1, 2) : rng.int(2, 5);
      profile.push({ k, a: rng.range(0.12, 0.5) / (i + 1), phase: rng.range(0, Math.PI * 2) });
    }
    return { kind: 'revolve', profile, girth: rng.range(0.55, 0.95), tall: rng.range(0.9, 1.9) };
  }
  if (roll < 0.82) {
    return { kind: 'tube', curve: fitCurve(dealCurve(rng)), thickness: rng.range(0.07, 0.16) };
  }
  return {
    kind: 'ribbon',
    curve: fitCurve(dealCurve(rng)),
    width: rng.range(0.14, 0.34),
    twists: rng.int(1, 5),
  };
}

/**
 * A shape, dealt.
 *
 * The ranges are the design: they are picked so that every draw is a shape worth
 * looking at for six seconds. Deformations are mostly absent — a shape wearing
 * all six at once is a mess, and a shape wearing one or two is a variation.
 */
export function dealFormula(rng: Rng): Formula {
  const base = dealBase(rng);
  const style = rng.next() < 0.62 ? 'scatter' : rng.next() < 0.6 ? 'wire' : 'veil';
  return {
    base,
    style,
    rings: rng.int(5, 14),
    meridians: rng.int(6, 18),
    deform: {
      twist: maybe(rng, 0.45, () => rng.range(-1.2, 1.2)),
      taper: maybe(rng, 0.4, () => rng.range(-0.45, 0.45)),
      waist: maybe(rng, 0.4, () => rng.range(-0.7, 0.7)),
      flutes: maybe(rng, 0.4, () => rng.int(3, 10)),
      fluteDepth: rng.range(0.08, 0.26),
      ripples: maybe(rng, 0.3, () => rng.int(2, 6)),
      rippleDepth: rng.range(0.05, 0.16),
      lean: maybe(rng, 0.25, () => rng.range(-0.3, 0.3)),
    },
  };
}

/** Builds the cloud a formula describes. */
export function buildFormula(f: Formula, rng: Rng, into: Sink, count: number): void {
  if (f.base.kind === 'tube') {
    const base = f.base;
    const reach = reachOf(base);
    sampleTube(into, rng, count, base.thickness, (t) =>
      bend(curveAt(base.curve, t), f.deform, reach),
    );
    return;
  }

  const at = surfaceOf(f);
  if (!at) return;
  const tintAt = (u: number) => u;
  if (f.style === 'wire' || f.style === 'veil') {
    // The veil is the wireframe with a haze of surface behind it — enough to
    // show where the surface goes between the lines without filling it in.
    const wire = f.style === 'wire' ? count : Math.round(count * 0.7);
    sampleWire(into, rng, wire, at, f.rings, f.meridians);
    if (wire < count) sampleSurface(into, rng, count - wire, at, tintAt);
    return;
  }
  sampleSurface(into, rng, count, at, tintAt);
}
