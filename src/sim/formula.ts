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
  | { kind: 'ribbon'; curve: Curve; width: number; twists: number }
  | {
      /** A face: an ovoid with sockets, a brow, a nose and a mouth cut into it. */
      kind: 'mask';
      wide: number;
      deep: number;
      socket: number;
      socketSpread: number;
      brow: number;
      nose: number;
      noseWidth: number;
      mouth: number;
      mouthWidth: number;
      jaw: number;
      horns: number;
    }
  | {
      /** A tube or a band winding outwards and upwards. */
      kind: 'spiral';
      turns: number;
      inner: number;
      rise: number;
      thickness: number;
      band: number;
      taper: number;
    }
  | {
      /** Rings stacked up struts: scaffolding, a tower, a stack of frames. */
      kind: 'tower';
      levels: number;
      sides: number;
      twistPer: number;
      taper: number;
      tall: number;
      waist: number;
    }
  | {
      /** A body with limbs, as a union of balls: the closest this gets to a beast. */
      kind: 'creature';
      body: readonly (readonly [number, number, number, number])[];
    };

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
  mask: 'mask',
  spiral: 'spiral',
  tower: 'tower',
  creature: 'creature',
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
    case 'mask':
      parts.push(`n${round(f.base.nose)}`, `h${round(f.base.horns)}`);
      break;
    case 'spiral':
      parts.push(`${round(f.base.turns, 1)}turns`);
      break;
    case 'tower':
      parts.push(`${f.base.levels}x${f.base.sides}`);
      break;
    case 'creature':
      parts.push(`${f.base.body.length}balls`);
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
  if (f.base.kind === 'mask' && f.base.horns > 0.05) bits.push('horned');
  if (f.base.kind === 'spiral') bits.push(`${round(f.base.turns, 1)} turns`);
  if (f.base.kind === 'tower') bits.push(`${f.base.levels} levels`);
  if (f.base.kind === 'creature') bits.push(`${f.base.body.length} lobes`);
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
    case 'revolve':
      return base.tall;
    case 'tower':
      return base.tall;
    case 'spiral':
      return Math.max(0.3, base.rise);
    case 'mask':
    case 'creature':
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
    case 'mask':
      return (u, v) => faceAt(base, f.deform, u, v);
    case 'spiral':
      return (u, v) => {
        // The band case. The tube case goes through `sampleTube` below.
        const t = u;
        const angle = t * Math.PI * 2 * base.turns;
        const radius = base.inner + (1 - base.inner) * t;
        const w = (v - 0.5) * 2 * base.band * (1 - base.taper * t);
        return bend(
          [
            Math.cos(angle) * (radius + w * 0.4),
            (t - 0.5) * 2 * base.rise + w,
            Math.sin(angle) * (radius + w * 0.4),
          ],
          f.deform,
          Math.max(0.3, base.rise),
        );
      };
    case 'tube':
    case 'tower':
    case 'creature':
      // Not surfaces: a solid tube, a scaffold of lines, and a union of balls.
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
  closed = true,
): void {
  for (let i = 0; i < count; i += 1) {
    const t = rng.next();
    const p = at(t);
    // A spiral has two ends: stepping past the last one to find the tangent
    // would wrap round to the first and hand back a direction across the whole
    // shape, which paints as a spray of points through the middle of it.
    const step = closed ? (t + 1e-3) % 1 : Math.min(1, t + 1e-3);
    const q = at(step);
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

type Mask = Extract<Base, { kind: 'mask' }>;

/**
 * A point on the head, from the two parameters that go round it and up it.
 *
 * The head is a star-shaped surface: every feature is a bump or a dent along the
 * direction the point looks out in, so however deep a socket is cut the surface
 * cannot fold through itself.
 */
function faceAt(base: Mask, d: Deform, u: number, v: number): Point {
  const theta = (u - 0.5) * Math.PI * 2;
  const phi = (v - 0.5) * Math.PI;
  const dx = Math.cos(phi) * Math.sin(theta);
  const dy = Math.sin(phi);
  const dz = Math.cos(phi) * Math.cos(theta);
  return faceFrom(base, d, dx, dy, dz);
}

/** The same, from a direction rather than from parameters. */
function faceFrom(base: Mask, d: Deform, dx: number, dy: number, dz: number): Point {
  // Features fade out round the sides rather than wrapping round to the back of
  // the skull.
  const front = Math.max(0, dz);
  const facing = front * front;
  const blob = (ax: number, ay: number, sx: number, sy: number): number =>
    facing * Math.exp(-(((dx - ax) / sx) ** 2) - (((dy - ay) / sy) ** 2));

  let r = 1;
  r += base.brow * (blob(base.socketSpread, 0.34, 0.26, 0.1) + blob(-base.socketSpread, 0.34, 0.26, 0.1));
  r += base.nose * blob(0, -0.05, base.noseWidth, 0.3);
  // The jaw: the lower half narrows, which is most of what makes an ovoid read
  // as a head rather than an egg.
  if (dy < 0) r *= 1 - base.jaw * dy * dy;
  if (base.horns > 0.05) {
    r += base.horns * 2.4 * (blob(0.52, 0.66, 0.11, 0.13) + blob(-0.52, 0.66, 0.11, 0.13));
  }
  return bend([dx * r * base.wide, dy * r * 1.15, dz * r * base.deep], d, 1);
}

/** The eyes, in direction units. Wide almonds: a small eye reads as a blemish. */
const EYE_W = 0.26;
const EYE_H = 0.135;
const EYE_Y = 0.2;
const MOUTH_Y = -0.34;
const MOUTH_H = 0.075;

/** How far inside an eye a direction is. Over 1 is outside it. */
const eyeAt = (base: Mask, dx: number, dy: number): number =>
  Math.min(
    ((dx - base.socketSpread) / EYE_W) ** 2 + ((dy - EYE_Y) / EYE_H) ** 2,
    ((dx + base.socketSpread) / EYE_W) ** 2 + ((dy - EYE_Y) / EYE_H) ** 2,
  );

const mouthAt = (base: Mask, dx: number, dy: number): number =>
  (dx / base.mouthWidth) ** 2 + ((dy - MOUTH_Y + dx * dx * 0.3) / MOUTH_H) ** 2;

/** The nostrils: two small holes, which are most of what says nose. */
const noseAt = (base: Mask, dx: number, dy: number): number =>
  Math.min(
    ((dx - base.noseWidth * 0.75) / (base.noseWidth * 0.42)) ** 2 + ((dy + 0.22) / 0.045) ** 2,
    ((dx + base.noseWidth * 0.75) / (base.noseWidth * 0.42)) ** 2 + ((dy + 0.22) / 0.045) ** 2,
  );

/**
 * A face, and the reason it is not simply a head with dents in it.
 *
 * Nothing in this mode is shaded and nothing is hidden, so a dent is invisible:
 * a socket cut into a cloud of points changes where the points are and not one
 * thing about how the picture reads. What reads is **absence and density** — a
 * hole where the eye is, and a line of points where the lid and the lip are.
 * That is what the faces in the reference videos are doing too, whatever their
 * geometry says: the eyes are dark, the mouth is a line.
 */
function sampleMask(into: Sink, rng: Rng, count: number, base: Mask, d: Deform): void {
  const skin = Math.round(count * 0.82);
  let made = 0;
  let tries = skin * 20;
  while (made < skin && tries > 0) {
    tries -= 1;
    const u = rng.next();
    const v = rng.next();
    const theta = (u - 0.5) * Math.PI * 2;
    const phi = (v - 0.5) * Math.PI;
    const dx = Math.cos(phi) * Math.sin(theta);
    const dy = Math.sin(phi);
    const dz = Math.cos(phi) * Math.cos(theta);
    // Sampled by area on the sphere the head is built from: cos(phi) is the
    // width of the band this point was drawn from, and without it the poles get
    // the same points as the equator and the crown of the head turns white.
    if (rng.next() > Math.cos(phi)) continue;
    // The holes. Only on the front — the back of the head has no eyes in it.
    // Cut through, not into. Nothing is hidden in this mode, so the back of the
    // head paints straight through a socket cut only in the front and the eye
    // comes out as full of points as the cheek beside it. A mask has holes in
    // it, so the hole is taken out of both sides and the eye goes dark.
    if (
      Math.abs(dz) > 0.25 &&
      (eyeAt(base, dx, dy) < 1 || mouthAt(base, dx, dy) < 1 || noseAt(base, dx, dy) < 1)
    ) {
      continue;
    }
    const p = faceFrom(base, d, dx, dy, dz);
    into.add(p[0], p[1], p[2], u);
    made += 1;
  }

  // And the lines: the rim of each eye, the lip, and the ridge of the nose.
  const rest = count - made;
  const onCurve = (t: number, which: number): Point => {
    const a = t * Math.PI * 2;
    let dx: number;
    let dy: number;
    if (which < 2) {
      // The lids, round each eye.
      const side = which === 0 ? 1 : -1;
      dx = side * base.socketSpread + Math.cos(a) * EYE_W;
      dy = EYE_Y + Math.sin(a) * EYE_H;
    } else if (which === 2) {
      // The lips, round the mouth.
      dx = (t * 2 - 1) * base.mouthWidth;
      dy = MOUTH_Y - dx * dx * 0.3 + (t < 0.5 ? MOUTH_H : -MOUTH_H);
    } else if (which === 3) {
      // The bridge of the nose, straight down the middle, and its tip.
      dx = (t - 0.5) * base.noseWidth * (t > 0.7 ? 2.6 : 0.5);
      dy = 0.22 - t * 0.44;
    } else {
      // A brow over each eye, arched.
      const side = t < 0.5 ? 1 : -1;
      const s2 = (t % 0.5) * 4 - 1;
      dx = side * base.socketSpread + s2 * EYE_W * 1.15;
      dy = EYE_Y + EYE_H * 2.1 - s2 * s2 * 0.05;
    }
    const flat = Math.hypot(dx, dy);
    const dz = Math.sqrt(Math.max(0.02, 1 - flat * flat));
    return faceFrom(base, d, dx, dy, dz);
  };
  for (let i = 0; i < rest; i += 1) {
    const which = i % 5;
    const p = onCurve(rng.next(), which);
    // The features are tinted at two ends of the ramp rather than by where they
    // sit, so they read as drawn lines and not as more of the surface.
    into.add(p[0], p[1], p[2], which === 3 ? 0.5 : 0.02);
  }
}

/**
 * Scaffolding: rings stacked up struts, drawn as lines.
 *
 * The thing the other bases cannot do is a straight edge, and an object made of
 * struts reads as built rather than grown — which is the whole difference
 * between a shape and a thing.
 */
function sampleTower(
  into: Sink,
  rng: Rng,
  count: number,
  base: Extract<Base, { kind: 'tower' }>,
  d: Deform,
): void {
  const corner = (level: number, index: number): Point => {
    const l = level / (base.levels - 1) - 0.5;
    const spin = base.twistPer * level;
    const taper = 1 + base.taper * l;
    const waist = 1 + base.waist * (l * l * 4 - 1) * 0.25;
    const r = taper * waist;
    const a = (index / base.sides) * Math.PI * 2 + spin;
    return [Math.cos(a) * r, l * 2 * base.tall, Math.sin(a) * r];
  };
  // Straight between the corners, not along the arc between them. Sampling the
  // arc gives a stack of circles however many sides were asked for, and a circle
  // is a shape where a hexagon is a thing somebody built.
  const at = (level: number, index: number, along: number): Point => {
    const a = corner(level, index);
    const b = corner(level, (index + 1) % base.sides);
    return bend(
      [
        a[0] + (b[0] - a[0]) * along,
        a[1] + (b[1] - a[1]) * along,
        a[2] + (b[2] - a[2]) * along,
      ],
      d,
      base.tall,
    );
  };
  // Two thirds on the rings, one third on the uprights: the rings are what the
  // eye follows round, and they are the longer lines.
  const ringShare = Math.round(count * 0.66);
  for (let i = 0; i < ringShare; i += 1) {
    const level = rng.int(0, base.levels - 1);
    const corner = rng.int(0, base.sides - 1);
    const p = at(level, corner, rng.next());
    into.addSpun(p[0], p[1], p[2]);
  }
  for (let i = ringShare; i < count; i += 1) {
    const level = rng.int(0, base.levels - 2);
    const corner = rng.int(0, base.sides - 1);
    const t = rng.next();
    const a = at(level, corner, 0);
    const b = at(level + 1, corner, 0);
    into.addSpun(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
  }
}

/**
 * A union of balls, sampled on its outside only.
 *
 * A body and a few limbs, which is as close to an animal as anything gets
 * without a model file to load. The trick that makes it read as one solid
 * creature rather than a bag of marbles is the rejection: a point on one ball's
 * surface is thrown away if it is inside another, so what is left is the outline
 * of the union and the joins disappear.
 */
function sampleCreature(
  into: Sink,
  rng: Rng,
  count: number,
  balls: readonly (readonly [number, number, number, number])[],
  d: Deform,
): void {
  const total = balls.reduce((sum, b) => sum + b[3] * b[3], 0);
  let made = 0;
  let tries = count * 40;
  while (made < count && tries > 0) {
    tries -= 1;
    // Picked in proportion to surface area, so a big body does not end up with
    // the same number of points on it as a small foot.
    let pick = rng.next() * total;
    let ball = balls[0];
    for (const b of balls) {
      pick -= b[3] * b[3];
      if (pick <= 0) {
        ball = b;
        break;
      }
    }
    const y = rng.range(-1, 1);
    const a = rng.next() * Math.PI * 2;
    const rad = Math.sqrt(1 - y * y);
    const x = ball[0] + rad * Math.cos(a) * ball[3];
    const py = ball[1] + y * ball[3];
    const z = ball[2] + rad * Math.sin(a) * ball[3];
    let inside = false;
    for (const other of balls) {
      if (other === ball) continue;
      if ((x - other[0]) ** 2 + (py - other[1]) ** 2 + (z - other[2]) ** 2 < other[3] ** 2) {
        inside = true;
        break;
      }
    }
    if (inside) continue;
    const p = bend([x, py, z], d, 1);
    into.addSpun(p[0], p[1], p[2]);
    made += 1;
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
  if (roll < 0.5) {
    return { kind: 'tube', curve: fitCurve(dealCurve(rng)), thickness: rng.range(0.07, 0.16) };
  }
  if (roll < 0.6) {
    return {
      kind: 'ribbon',
      curve: fitCurve(dealCurve(rng)),
      width: rng.range(0.14, 0.34),
      twists: rng.int(1, 5),
    };
  }
  if (roll < 0.72) {
    // A face. The ranges are narrow on purpose: a socket twice as deep is not a
    // stranger face, it is a hole, and a nose at twice the length is a beak.
    return {
      kind: 'mask',
      wide: rng.range(0.66, 0.84),
      deep: rng.range(0.72, 0.95),
      socket: rng.range(0.16, 0.3),
      socketSpread: rng.range(0.3, 0.42),
      brow: rng.range(0.05, 0.16),
      nose: rng.range(0.12, 0.3),
      noseWidth: rng.range(0.09, 0.16),
      mouth: rng.range(0.1, 0.22),
      mouthWidth: rng.range(0.24, 0.42),
      jaw: rng.range(0.15, 0.4),
      horns: rng.pick([0, 0, rng.range(0.1, 0.3)]),
    };
  }
  if (roll < 0.84) {
    return {
      kind: 'spiral',
      turns: rng.range(1.8, 5),
      inner: rng.range(0.05, 0.35),
      rise: rng.range(0.3, 1.6),
      thickness: rng.range(0.05, 0.13),
      // Nought means a tube rather than a band, which is a different picture
      // from the same curve.
      band: rng.pick([0, rng.range(0.12, 0.3)]),
      taper: rng.range(0, 0.8),
    };
  }
  if (roll < 0.93) {
    return {
      kind: 'tower',
      levels: rng.int(3, 9),
      sides: rng.int(3, 8),
      twistPer: rng.pick([0, rng.range(-0.5, 0.5)]),
      taper: rng.range(-0.6, 0.6),
      tall: rng.range(1.1, 2),
      waist: rng.range(-0.6, 0.8),
    };
  }
  // A creature: a body, a head, and a few limbs hung off it. Placed by hand
  // rather than at random — balls scattered anywhere are a cloud of balls, and
  // what makes this read as a thing is that it has one big part and several
  // small ones arranged around it.
  const balls: [number, number, number, number][] = [];
  const bodyR = rng.range(0.42, 0.6);
  balls.push([0, 0, 0, bodyR]);
  const headR = bodyR * rng.range(0.5, 0.75);
  const headUp = bodyR * rng.range(0.9, 1.25);
  balls.push([0, headUp, rng.range(-0.1, 0.1), headR]);
  const limbs = rng.int(3, 6);
  for (let i = 0; i < limbs; i += 1) {
    const a = (i / limbs) * Math.PI * 2 + rng.range(-0.3, 0.3);
    const r = bodyR * rng.range(0.22, 0.42);
    // Close enough to overlap the body. A limb that does not touch is not a limb,
    // it is a ball floating next to an animal, and the union has a gap in it.
    const out = bodyR + r * rng.range(0.1, 0.65);
    const drop = rng.range(-0.7, 0.2) * bodyR;
    balls.push([Math.cos(a) * out, drop, Math.sin(a) * out, r]);
    // Half of them get a second joint further out, which is what turns a bump
    // into a limb. Overlapping the first, for the same reason.
    if (rng.next() < 0.55) {
      const r2 = r * rng.range(0.6, 0.85);
      const out2 = out + (r + r2) * rng.range(0.4, 0.8);
      balls.push([Math.cos(a) * out2, drop - bodyR * rng.range(0, 0.45), Math.sin(a) * out2, r2]);
    }
  }
  return { kind: 'creature', body: balls };
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
  // A face wears no deformation but the gentle ones. A twist rotates the eyes
  // off the front of the head, and flutes run ridges through the mouth: both
  // are fine on a shape and neither is a face any more.
  const plain = base.kind === 'mask';
  // A mask is nearly always scattered: the wireframe styles draw rings and
  // meridians over it, which is a globe wearing a face rather than a face.
  const style: Style =
    base.kind === 'mask'
      ? rng.next() < 0.85
        ? 'scatter'
        : 'veil'
      : rng.next() < 0.62
        ? 'scatter'
        : rng.next() < 0.6
          ? 'wire'
          : 'veil';
  return {
    base,
    style,
    rings: rng.int(5, 14),
    meridians: rng.int(6, 18),
    deform: {
      twist: plain ? 0 : maybe(rng, 0.45, () => rng.range(-1.2, 1.2)),
      taper: maybe(rng, 0.4, () => rng.range(-0.45, 0.45)) * (plain ? 0.35 : 1),
      waist: maybe(rng, 0.4, () => rng.range(-0.7, 0.7)) * (plain ? 0.35 : 1),
      flutes: plain ? 0 : maybe(rng, 0.4, () => rng.int(3, 10)),
      fluteDepth: rng.range(0.08, 0.26),
      ripples: plain ? 0 : maybe(rng, 0.3, () => rng.int(2, 6)),
      rippleDepth: rng.range(0.05, 0.16),
      lean: plain ? 0 : maybe(rng, 0.25, () => rng.range(-0.3, 0.3)),
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
  if (f.base.kind === 'tower') {
    sampleTower(into, rng, count, f.base, f.deform);
    return;
  }
  if (f.base.kind === 'mask' && f.style === 'scatter') {
    sampleMask(into, rng, count, f.base, f.deform);
    return;
  }
  if (f.base.kind === 'creature') {
    sampleCreature(into, rng, count, f.base.body, f.deform);
    return;
  }
  if (f.base.kind === 'spiral' && f.base.band === 0) {
    const base = f.base;
    const reach = reachOf(base);
    sampleTube(
      into,
      rng,
      count,
      base.thickness,
      (t) => {
        const angle = t * Math.PI * 2 * base.turns;
        const radius = base.inner + (1 - base.inner) * t;
        return bend(
          [Math.cos(angle) * radius, (t - 0.5) * 2 * base.rise, Math.sin(angle) * radius],
          f.deform,
          reach,
        );
      },
      false,
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
