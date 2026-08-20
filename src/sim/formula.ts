/**
 * Shapes the seed writes for itself.
 *
 * The ten named shapes are a menu, and a menu runs out. This is the other half:
 * five families of formula, each with its numbers left free, so a seed is not a
 * choice between ten things but a point in a space of them. A supershape with
 * seven lobes and a soft profile, a (3,7) torus knot, a fluted column with a
 * waist and a twist — none of those are stored anywhere, they are what a
 * particular set of numbers comes out as.
 *
 * Every family is a **parametric surface or curve**, sampled by area rather than
 * by parameter. That distinction is the whole quality of the thing: a surface
 * sampled evenly in its parameters piles its points wherever the parameters are
 * squeezed — round a pole, along a crease, at the tip of a lobe — and the result
 * reads as a shape with bright patches rather than a shape made of points. So a
 * point is proposed and then kept in proportion to how much surface is there.
 */

import type { Rng } from './random';

export type FormulaKind = 'super' | 'column' | 'knot' | 'lattice' | 'ribbon';

/**
 * A shape, as the numbers that make it.
 *
 * Small enough to put in a file name, complete enough that the same numbers
 * always give the same shape.
 */
export type Formula =
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
      kind: 'column';
      sides: number;
      flute: number;
      twist: number;
      waist: number;
      ripples: number;
      rippleDepth: number;
      /** Wider at one end than the other: a vase rather than a column. */
      taper: number;
      tall: number;
    }
  | { kind: 'knot'; p: number; q: number; thickness: number; wind: number }
  | { kind: 'lattice'; rings: number; meridians: number; bulge: number; twist: number }
  | { kind: 'ribbon'; turns: number; twists: number; width: number; tall: number };

export type Point = readonly [number, number, number];

/** What a builder is handed: somewhere to put points, and a source of numbers. */
export interface Sink {
  add(x: number, y: number, z: number, tint: number): void;
  addSpun(x: number, y: number, z: number): void;
}

const round = (value: number, places = 2): number => Number(value.toFixed(places));

/** Short enough for a file name, exact enough to find the shape again. */
export function describeFormula(f: Formula): string {
  switch (f.kind) {
    case 'super':
      return `super-${round(f.m1, 0)}x${round(f.m2, 0)}-${round(f.n11)}-${round(f.n21)}`;
    case 'column':
      return `column-${f.sides}-t${round(f.twist)}-w${round(f.waist)}`;
    case 'knot':
      return `knot-${f.p}-${f.q}`;
    case 'lattice':
      return `lattice-${f.rings}x${f.meridians}`;
    case 'ribbon':
      return `ribbon-${round(f.turns)}-${f.twists}`;
  }
}

/** The same, in words, for the line under the button. */
export function nameFormula(f: Formula): string {
  switch (f.kind) {
    case 'super':
      return `supershape ${round(f.m1, 0)}×${round(f.m2, 0)}`;
    case 'column':
      return `${f.sides}-sided column${f.twist ? ', twisted' : ''}`;
    case 'knot':
      return `(${f.p},${f.q}) torus knot`;
    case 'lattice':
      return `lattice ${f.rings}×${f.meridians}`;
    case 'ribbon':
      return `ribbon, ${round(f.turns, 1)} turns`;
  }
}

/**
 * The Gielis superformula: one equation, and most of the shapes in nature.
 *
 * `m` is how many lobes go round; the three exponents decide whether a lobe is a
 * spike, a petal, a flat side or a bulge. m = 4 with big exponents is a rounded
 * box, m = 4 with small ones is a four-pointed star, m = 0 is a circle.
 */
const superRadius = (angle: number, m: number, n1: number, n2: number, n3: number): number => {
  const a = Math.abs(Math.cos((m * angle) / 4)) ** n2;
  const b = Math.abs(Math.sin((m * angle) / 4)) ** n3;
  const sum = a + b;
  // A shape can ask for a radius of infinity. Clamped rather than left to paint
  // a point at the edge of the number line.
  return sum <= 0 ? 0 : Math.min(4, (1 / sum) ** (1 / n1));
};

/**
 * Points over a parametric surface, spread by area.
 *
 * The Jacobian — how much surface one step of `u` and `v` covers — is measured
 * numerically rather than derived, because these surfaces are dealt at run time
 * and nobody is going to differentiate them by hand. A point is proposed
 * uniformly in parameters and kept in proportion to the surface under it.
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
  // will have missed the true maximum and a ceiling that is too low quietly
  // turns the rejection back into uniform sampling exactly where the surface is
  // most stretched.
  let ceiling = 0;
  const grid = 24;
  for (let i = 0; i <= grid; i += 1) {
    for (let j = 0; j <= grid; j += 1) {
      const value = area(i / grid, j / grid);
      if (Number.isFinite(value)) ceiling = Math.max(ceiling, value);
    }
  }
  ceiling *= 1.15;

  let made = 0;
  // Bounded: a surface whose area is concentrated in a sliver can reject for a
  // long time, and a shape that takes a second to build is worse than a shape
  // whose last few hundred points are a little uneven.
  let tries = count * 40;
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

/** Points scattered through a tube of the given radius around a closed curve. */
function sampleTube(
  into: Sink,
  rng: Rng,
  count: number,
  thickness: number,
  at: (t: number) => Point,
): void {
  const step = 1e-3;
  for (let i = 0; i < count; i += 1) {
    const t = rng.next();
    const p = at(t);
    const q = at((t + step) % 1);
    let tx = q[0] - p[0];
    let ty = q[1] - p[1];
    let tz = q[2] - p[2];
    const len = Math.hypot(tx, ty, tz) || 1;
    tx /= len;
    ty /= len;
    tz /= len;
    // Any two directions across the curve will do — the points go all the way
    // round the tube anyway, so the frame does not have to be a stable one.
    let ax = -ty;
    let ay = tx;
    let az = 0;
    if (Math.hypot(ax, ay, az) < 1e-6) {
      ax = 1;
      ay = 0;
      az = 0;
    }
    const al = Math.hypot(ax, ay, az);
    ax /= al;
    ay /= al;
    az /= al;
    const bx = ty * az - tz * ay;
    const by = tz * ax - tx * az;
    const bz = tx * ay - ty * ax;
    const a = rng.next() * Math.PI * 2;
    // Square-rooted, so the points fill the tube evenly instead of crowding its
    // axis. Nothing is hidden in this mode, so a tube is a solid tube.
    const r = Math.sqrt(rng.next()) * thickness;
    const c = Math.cos(a) * r;
    const s = Math.sin(a) * r;
    into.add(p[0] + ax * c + bx * s, p[1] + ay * c + by * s, p[2] + az * c + bz * s, t);
  }
}

/** A whole number of lobes, so the shape closes on itself rather than nearly. */
const lobes = (rng: Rng, low: number, high: number): number => rng.int(low, high);

/**
 * A shape, dealt.
 *
 * The ranges are the whole design: they are picked so that every draw is a shape
 * worth looking at for six seconds. Exponents below about a third give spikes so
 * thin they read as noise; a twist beyond a turn and a half stops reading as a
 * twist and starts reading as a mess.
 */
export function dealFormula(rng: Rng): Formula {
  const kind = rng.pick<FormulaKind>(['super', 'super', 'column', 'knot', 'lattice', 'ribbon']);
  switch (kind) {
    case 'super': {
      // The first exponent is the character of the thing, and it is not linear
      // in taste: below about a half the lobes come to points and the shape is a
      // star, around one they are gem facets, above two everything inflates back
      // into a ball. Dealt in bands rather than over a range, or nearly every
      // draw comes out a ball — which is what the first version of this did.
      const bands = [
        () => rng.range(0.16, 0.42), // points
        () => rng.range(0.5, 1.1), // facets
        () => rng.range(1.6, 3.2), // inflated
      ];
      const first = rng.pick([0, 0, 0, 1, 1, 2]);
      // Inflated in both directions is a ball, and a ball is the one shape in
      // this family not worth six seconds of anybody's time.
      const second = first === 2 ? rng.pick([0, 0, 1]) : rng.pick([0, 1, 1, 2]);
      return {
        kind,
        m1: lobes(rng, 3, 9),
        n11: bands[first](),
        // The other two exponents work against the first: the spikes come from
        // the ratio between them, so a low n1 with a middling n2 is a star and a
        // low n1 with a low n2 is a circle again.
        n12: rng.range(1.2, 2.4),
        // A profile of nought lobes is a circle, and a circle for a profile is a
        // ball however the equator is shaped, so it is the minority case.
        m2: rng.pick([0, lobes(rng, 2, 8), lobes(rng, 2, 8)]),
        n21: bands[second](),
        n22: rng.range(1.2, 2.4),
        tall: rng.range(0.7, 1.6),
      };
    }
    case 'column':
      return {
        kind,
        sides: lobes(rng, 3, 9),
        flute: rng.range(0.1, 0.34),
        twist: rng.pick([0, rng.range(-1.4, 1.4), rng.range(-1.4, 1.4)]),
        waist: rng.range(-0.35, 0.5),
        // Usually none. Flutes and ripples at once make a cabbage: two sets of
        // ridges crossing each other, and neither reads.
        ripples: rng.pick([0, 0, lobes(rng, 2, 5)]),
        rippleDepth: rng.range(0.04, 0.14),
        taper: rng.pick([0, rng.range(-0.55, 0.55)]),
        tall: rng.range(1, 2.2),
      };
    case 'knot': {
      // Two or three turns round the axis, no more: a (5,7) is a genuine knot
      // and it paints as a tangle, which is a worse thing to watch than a
      // trefoil even though it is a better piece of mathematics.
      const p = lobes(rng, 2, 3);
      // Coprime, or the curve closes early and is a plainer knot than it says.
      const options = [3, 4, 5].filter((q) => q > p && gcd(p, q) === 1);
      return {
        kind,
        p,
        q: rng.pick(options),
        // Thin rope and a shallow wind. Fat rope on a deep wind fills its own
        // holes in and the knot stops being legible as a knot.
        thickness: rng.range(0.08, 0.14),
        wind: rng.range(0.26, 0.38),
      };
    }
    case 'lattice':
      return {
        kind,
        rings: lobes(rng, 5, 12),
        meridians: lobes(rng, 6, 16),
        bulge: rng.range(-0.3, 0.5),
        twist: rng.pick([0, rng.range(-0.8, 0.8)]),
      };
    case 'ribbon':
      return {
        kind,
        turns: rng.range(2, 4),
        twists: lobes(rng, 1, 5),
        width: rng.range(0.15, 0.35),
        tall: rng.range(1, 2),
      };
  }
}

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/** Builds the cloud a formula describes. */
export function buildFormula(f: Formula, rng: Rng, into: Sink, count: number): void {
  switch (f.kind) {
    case 'super': {
      // The spherical product of two superformulae: one round the equator, one
      // from pole to pole. Between them they cover stars, gems, drops, boxes,
      // pinched spheres and most of what a shape can be.
      const at = (u: number, v: number): Point => {
        const theta = (u - 0.5) * Math.PI * 2;
        const phi = (v - 0.5) * Math.PI;
        const r1 = superRadius(theta, f.m1, f.n11, f.n12, f.n12);
        const r2 = superRadius(phi, f.m2, f.n21, f.n22, f.n22);
        return [
          r1 * Math.cos(theta) * r2 * Math.cos(phi),
          r2 * Math.sin(phi) * f.tall,
          r1 * Math.sin(theta) * r2 * Math.cos(phi),
        ];
      };
      sampleSurface(into, rng, count, at, (u) => u);
      return;
    }
    case 'column': {
      const at = (u: number, v: number): Point => {
        const y = (v - 0.5) * 2 * f.tall;
        const t = v - 0.5;
        // The profile: a waist or a barrel, plus however many ripples up it.
        const waist = (1 + f.waist * (4 * t * t - 1)) * (1 + f.taper * t);
        const ripple = 1 + f.rippleDepth * Math.sin(v * Math.PI * 2 * f.ripples);
        const theta = (u - 0.5) * Math.PI * 2 + f.twist * t * Math.PI;
        const flute = 1 + f.flute * Math.cos(theta * f.sides);
        const r = waist * ripple * flute;
        return [r * Math.cos(theta), y, r * Math.sin(theta)];
      };
      sampleSurface(into, rng, count, at, (u, v) => u + f.twist * (v - 0.5) * 0.5);
      return;
    }
    case 'knot': {
      sampleTube(into, rng, count, f.thickness, (t) => {
        const a = t * Math.PI * 2 * f.p;
        const b = t * Math.PI * 2 * f.q;
        const r = 1 + f.wind * Math.cos(b);
        return [r * Math.cos(a), f.wind * Math.sin(b), r * Math.sin(a)];
      });
      return;
    }
    case 'lattice': {
      // Lines rather than a surface: rings round it and meridians over it, with
      // nothing in between, which is the wireframe globe look. The two sets are
      // tinted half a palette apart so they read as two families of line.
      const surface = (theta: number, phi: number): Point => {
        const twist = f.twist * Math.sin(phi);
        const t = theta + twist;
        const r = Math.cos(phi) * (1 + f.bulge * Math.cos(phi * 2));
        return [r * Math.cos(t), Math.sin(phi), r * Math.sin(t)];
      };
      const half = count >> 1;
      for (let i = 0; i < half; i += 1) {
        const ring = Math.floor(rng.next() * f.rings);
        const phi = ((ring + 0.5) / f.rings - 0.5) * Math.PI;
        const theta = rng.next() * Math.PI * 2;
        const p = surface(theta, phi);
        into.add(p[0], p[1], p[2], 0.02);
      }
      for (let i = half; i < count; i += 1) {
        const meridian = Math.floor(rng.next() * f.meridians);
        const theta = (meridian / f.meridians) * Math.PI * 2;
        const phi = (rng.next() - 0.5) * Math.PI;
        const p = surface(theta, phi);
        into.add(p[0], p[1], p[2], 0.52);
      }
      return;
    }
    case 'ribbon': {
      // A band following a helix, turning about its own axis as it climbs: the
      // twisted streamer. One twist and it is a Möbius band with a stretch.
      const at = (u: number, v: number): Point => {
        const a = u * Math.PI * 2 * f.turns;
        const w = (v - 0.5) * 2 * f.width;
        const spin = u * Math.PI * f.twists;
        const r = 1 + w * Math.cos(spin);
        return [r * Math.cos(a), (u - 0.5) * 2 * f.tall + w * Math.sin(spin), r * Math.sin(a)];
      };
      sampleSurface(into, rng, count, at, (u) => u * f.turns);
      return;
    }
  }
}
