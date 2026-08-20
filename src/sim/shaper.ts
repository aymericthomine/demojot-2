/**
 * Shaper: a shape made of points, turning for six seconds, either way.
 *
 * The whole point of these videos is that you cannot tell which way the thing
 * is going round. That is not a trick played in the painting; it is a property
 * of the projection, and it survives only if nothing in the picture says which
 * side is nearer. So:
 *
 * - the projection is **orthographic**. Perspective is a depth cue — the near
 *   half of a turning shape would be drawn bigger, and the eye reads that
 *   instantly.
 * - a point is the **same size and the same colour at any depth**. No fog, no
 *   fading, no shrinking, no shading.
 * - **nothing is hidden**. There are no faces to occlude anything, which is the
 *   reason a point cloud is the right material for this and a solid is not.
 *
 * What that leaves is a silhouette moving in a way that fits two different
 * three-dimensional readings equally well — the shape turning left, or its
 * mirror image turning right — and the eye picks one, then the other.
 *
 * The loop is exactly one revolution in exactly six seconds, so the last frame
 * is the frame before the first and the video can be played end to end for ever.
 * Nothing else in the picture changes with time, which is what makes that true
 * rather than nearly true.
 */

import { buildFormula, dealFormula, describeFormula, nameFormula, type Formula } from './formula';
import { createRng, type Rng } from './random';

/** Seconds a loop runs for. One revolution, so it joins up exactly. */
export const LOOP_SECONDS = 6;

/**
 * How far the camera is tilted down, in radians.
 *
 * Straight on, a surface of revolution paints a flat outline and the illusion
 * has nothing to work with; tilted, you see it as a solid and the two readings
 * are both available. Twenty-four degrees is enough to open the shape up and
 * little enough that neither reading is favoured.
 */
export const TILT = 0.42;

/** How much of the frame's width the shape spans at its widest. */
export const FIT = 0.82;

export type ShapeName =
  | 'prism'
  | 'pyramid'
  | 'cube'
  | 'mobius'
  | 'torus'
  | 'horn'
  | 'sphere'
  | 'knot'
  | 'helix'
  | 'cone';

export const SHAPE_NAMES: readonly ShapeName[] = [
  'prism',
  'pyramid',
  'cube',
  'mobius',
  'torus',
  'horn',
  'sphere',
  'knot',
  'helix',
  'cone',
];

export const SHAPE_LABEL: Record<ShapeName, string> = {
  prism: 'hex prism',
  pyramid: 'pyramid',
  cube: 'cube',
  mobius: 'Möbius strip',
  torus: 'torus',
  horn: 'horn torus',
  sphere: 'sphere',
  knot: 'trefoil knot',
  helix: 'helix',
  cone: 'cone',
};

/**
 * A cloud of points in object space, y up, and a colour parameter each.
 *
 * Typed arrays rather than objects: a dense cloud is twenty thousand points
 * painted sixty times a second, and an array of little objects spends the whole
 * frame budget chasing pointers.
 */
export interface Cloud {
  x: Float32Array;
  y: Float32Array;
  z: Float32Array;
  /**
   * Where each point sits on the shape's own colour ramp, 0 to 1 and cyclic.
   *
   * Taken from the shape's turning parameter — the angle round the axis, or the
   * distance along the strip — never from depth. A tint that came from depth
   * would say which side is nearer and give the game away.
   */
  tint: Float32Array;
  count: number;
}

/** Collects points while a shape is being built. */
class Scatter {
  readonly x: number[] = [];
  readonly y: number[] = [];
  readonly z: number[] = [];
  readonly tint: number[] = [];

  add(x: number, y: number, z: number, tint: number): void {
    this.x.push(x);
    this.y.push(y);
    this.z.push(z);
    // Cyclic, so a ramp that wraps has no seam.
    this.tint.push(((tint % 1) + 1) % 1);
  }

  /** Colour taken from the angle round the axis, which is what turns. */
  addSpun(x: number, y: number, z: number): void {
    this.add(x, y, z, Math.atan2(z, x) / (Math.PI * 2));
  }

  done(): Cloud {
    return {
      x: Float32Array.from(this.x),
      y: Float32Array.from(this.y),
      z: Float32Array.from(this.z),
      tint: Float32Array.from(this.tint),
      count: this.x.length,
    };
  }
}

type Point = readonly [number, number, number];

/** Points along a straight edge, jittered so it reads as drawn rather than ruled. */
const edge = (into: Scatter, rng: Rng, a: Point, b: Point, count: number): void => {
  for (let i = 0; i < count; i += 1) {
    const t = rng.next();
    // A tenth of a per cent of wander. Dead straight looks like a vector line;
    // this looks like points that happen to lie on one.
    const wobble = () => (rng.next() - 0.5) * 0.012;
    into.addSpun(
      a[0] + (b[0] - a[0]) * t + wobble(),
      a[1] + (b[1] - a[1]) * t + wobble(),
      a[2] + (b[2] - a[2]) * t + wobble(),
    );
  }
};

/** Points spread evenly over a triangle, by area rather than by parameter. */
const triangle = (into: Scatter, rng: Rng, a: Point, b: Point, c: Point, count: number): void => {
  for (let i = 0; i < count; i += 1) {
    let u = rng.next();
    let v = rng.next();
    // Fold the far half of the square back over the diagonal: the naive u, v
    // pair covers a parallelogram, and half the points land outside the
    // triangle and pile up along its long edge.
    if (u + v > 1) {
      u = 1 - u;
      v = 1 - v;
    }
    into.addSpun(
      a[0] + (b[0] - a[0]) * u + (c[0] - a[0]) * v,
      a[1] + (b[1] - a[1]) * u + (c[1] - a[1]) * v,
      a[2] + (b[2] - a[2]) * u + (c[2] - a[2]) * v,
    );
  }
};

const quad = (into: Scatter, rng: Rng, a: Point, b: Point, c: Point, d: Point, n: number): void => {
  triangle(into, rng, a, b, c, n >> 1);
  triangle(into, rng, a, c, d, n - (n >> 1));
};

/**
 * The share of a solid's points spent on its edges.
 *
 * A polyhedron scattered evenly is a fog in the shape of a box: the edges are
 * where the shape is, and in the videos this is cut against they are drawn as
 * bright lines against a thin haze of face. Two fifths on the edges is what
 * reads as an edge without burying the faces.
 */
const EDGE_SHARE = 0.42;

const ring = (radius: number, y: number, sides: number): Point[] =>
  Array.from({ length: sides }, (_, i): Point => {
    const a = (i / sides) * Math.PI * 2;
    return [Math.cos(a) * radius, y, Math.sin(a) * radius];
  });

const prism = (rng: Rng, count: number, sides = 6): Cloud => {
  const into = new Scatter();
  // Taller than it is wide, like the reference: a prism as tall as its diameter
  // reads as a squat lump, and the tall one is what makes the six sides count
  // as you watch them go round.
  const top = ring(1, 1.35, sides);
  const bottom = ring(1, -1.35, sides);
  const edges = Math.round(count * EDGE_SHARE);
  const per = Math.round(edges / (sides * 3));
  for (let i = 0; i < sides; i += 1) {
    const j = (i + 1) % sides;
    edge(into, rng, top[i], top[j], per);
    edge(into, rng, bottom[i], bottom[j], per);
    edge(into, rng, top[i], bottom[i], per);
  }
  const faces = count - into.x.length;
  const perFace = Math.round(faces / (sides + 2));
  for (let i = 0; i < sides; i += 1) {
    const j = (i + 1) % sides;
    quad(into, rng, top[i], top[j], bottom[j], bottom[i], perFace);
  }
  for (let i = 0; i < sides; i += 1) {
    const j = (i + 1) % sides;
    triangle(into, rng, [0, 1.35, 0], top[i], top[j], perFace >> 1);
    triangle(into, rng, [0, -1.35, 0], bottom[i], bottom[j], perFace >> 1);
  }
  return into.done();
};

const pyramid = (rng: Rng, count: number): Cloud => {
  const into = new Scatter();
  const h = 1.1;
  const base = ring(1.15, -h, 4);
  const apex: Point = [0, h, 0];
  const edges = Math.round(count * EDGE_SHARE);
  const per = Math.round(edges / 8);
  for (let i = 0; i < 4; i += 1) {
    edge(into, rng, base[i], base[(i + 1) % 4], per);
    edge(into, rng, base[i], apex, per);
  }
  const faces = count - into.x.length;
  const perFace = Math.round(faces / 5);
  for (let i = 0; i < 4; i += 1) {
    triangle(into, rng, base[i], base[(i + 1) % 4], apex, perFace);
  }
  quad(into, rng, base[0], base[1], base[2], base[3], perFace);
  return into.done();
};

const cube = (rng: Rng, count: number): Cloud => {
  const into = new Scatter();
  const s = 0.95;
  const corner = (i: number): Point => [
    i & 1 ? s : -s,
    i & 2 ? s : -s,
    i & 4 ? s : -s,
  ];
  const edges: [number, number][] = [];
  for (let i = 0; i < 8; i += 1) {
    for (const bit of [1, 2, 4]) {
      if (!(i & bit)) edges.push([i, i | bit]);
    }
  }
  const per = Math.round((count * EDGE_SHARE) / edges.length);
  for (const [a, b] of edges) edge(into, rng, corner(a), corner(b), per);
  const perFace = Math.round((count - into.x.length) / 6);
  const faces: [number, number, number, number][] = [
    [0, 1, 3, 2],
    [4, 5, 7, 6],
    [0, 1, 5, 4],
    [2, 3, 7, 6],
    [0, 2, 6, 4],
    [1, 3, 7, 5],
  ];
  for (const f of faces) {
    quad(into, rng, corner(f[0]), corner(f[1]), corner(f[2]), corner(f[3]), perFace);
  }
  return into.done();
};

const mobius = (rng: Rng, count: number): Cloud => {
  const into = new Scatter();
  const half = 0.42;
  for (let i = 0; i < count; i += 1) {
    const u = rng.next() * Math.PI * 2;
    const v = (rng.next() * 2 - 1) * half;
    const r = 1 + v * Math.cos(u / 2);
    // Tinted by the strip's own parameter rather than by the angle round the
    // axis: the strip is a band that comes back to itself, and running the ramp
    // along it is what makes the twist visible.
    into.add(r * Math.cos(u), v * Math.sin(u / 2), r * Math.sin(u), u / (Math.PI * 2));
  }
  return into.done();
};

/** A tube of the given radius around a curve, tinted along the curve. */
const tube = (
  into: Scatter,
  rng: Rng,
  count: number,
  thickness: number,
  at: (t: number) => Point,
): void => {
  const step = 1e-3;
  for (let i = 0; i < count; i += 1) {
    const t = rng.next();
    const p = at(t);
    const q = at((t + step) % 1);
    // A frame round the curve: any two directions across it will do, since the
    // points are scattered round the tube anyway.
    let tx = q[0] - p[0];
    let ty = q[1] - p[1];
    let tz = q[2] - p[2];
    const len = Math.hypot(tx, ty, tz) || 1;
    tx /= len;
    ty /= len;
    tz /= len;
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
    const c = Math.cos(a) * thickness;
    const s = Math.sin(a) * thickness;
    into.add(p[0] + ax * c + bx * s, p[1] + ay * c + by * s, p[2] + az * c + bz * s, t);
  }
};

const torus = (rng: Rng, count: number, r = 0.4): Cloud => {
  const into = new Scatter();
  for (let i = 0; i < count; i += 1) {
    const u = rng.next() * Math.PI * 2;
    const v = rng.next() * Math.PI * 2;
    // Rejected against the outer edge, so the points sit evenly over the
    // surface instead of bunching round the inside of the hole.
    if (rng.next() > (1 + (r / 1) * Math.cos(v)) / (1 + r / 1)) {
      i -= 1;
      continue;
    }
    const rad = 1 + r * Math.cos(v);
    into.addSpun(rad * Math.cos(u), r * Math.sin(v), rad * Math.sin(u));
  }
  return into.done();
};

/** A torus whose hole has closed to a point — the apple, with its spindle. */
const horn = (rng: Rng, count: number): Cloud => torus(rng, count, 1);

const sphere = (rng: Rng, count: number): Cloud => {
  const into = new Scatter();
  for (let i = 0; i < count; i += 1) {
    // Height uniform, not the polar angle: uniform in the angle piles the points
    // up at the poles, which reads as a shape with two bright spots.
    const y = rng.range(-1, 1);
    const a = rng.next() * Math.PI * 2;
    const r = Math.sqrt(1 - y * y);
    into.addSpun(r * Math.cos(a), y, r * Math.sin(a));
  }
  return into.done();
};

const knot = (rng: Rng, count: number): Cloud => {
  const into = new Scatter();
  tube(into, rng, count, 0.17, (t) => {
    const a = t * Math.PI * 2;
    return [
      (Math.sin(a) + 2 * Math.sin(2 * a)) * 0.42,
      (Math.cos(a) - 2 * Math.cos(2 * a)) * 0.42,
      -Math.sin(3 * a) * 0.42,
    ];
  });
  return into.done();
};

const helix = (rng: Rng, count: number): Cloud => {
  const into = new Scatter();
  const turns = 3;
  tube(into, rng, count, 0.13, (t) => {
    const a = t * Math.PI * 2 * turns;
    return [Math.cos(a) * 0.85, t * 2 - 1, Math.sin(a) * 0.85];
  });
  return into.done();
};

const cone = (rng: Rng, count: number): Cloud => {
  const into = new Scatter();
  const h = 1.1;
  const edges = Math.round(count * 0.3);
  for (let i = 0; i < edges; i += 1) {
    const a = rng.next() * Math.PI * 2;
    into.addSpun(Math.cos(a) * 1.05, -h, Math.sin(a) * 1.05);
  }
  for (let i = edges; i < count; i += 1) {
    // Square-rooted so the points do not crowd into the tip: the slice at
    // height t has a circumference proportional to t.
    const t = Math.sqrt(rng.next());
    const a = rng.next() * Math.PI * 2;
    into.addSpun(Math.cos(a) * 1.05 * t, h - t * 2 * h, Math.sin(a) * 1.05 * t);
  }
  return into.done();
};

const BUILDERS: Record<ShapeName, (rng: Rng, count: number) => Cloud> = {
  prism: (rng, count) => prism(rng, count),
  pyramid,
  cube,
  mobius,
  torus: (rng, count) => torus(rng, count),
  horn,
  sphere,
  knot,
  helix,
  cone,
};

/**
 * Colour palettes, as ramps that come back to where they started.
 *
 * Cyclic because the tint is cyclic: it is the angle round the axis, so a ramp
 * with different ends would paint a seam down one side of every shape, and the
 * seam would be a mark on the object that says which way it is turning.
 */
export interface Palette {
  name: string;
  stops: readonly string[];
}

export const PALETTES: readonly Palette[] = [
  { name: 'ember', stops: ['#ff2d1f', '#ff8a00', '#ffd400', '#2b6cff', '#7b2dff'] },
  { name: 'acid', stops: ['#7cff2d', '#00ffa3', '#00c8ff', '#2b6cff', '#b6ff3a'] },
  { name: 'sunset', stops: ['#ffd400', '#ff7a00', '#ff2d55', '#8a2be2', '#1e63ff'] },
  { name: 'ice', stops: ['#eaf6ff', '#8ad4ff', '#2b8cff', '#5f4bff', '#a6e9ff'] },
  { name: 'spectrum', stops: ['#ff2d55', '#ff9500', '#ffe600', '#34c759', '#00b3ff', '#af52de'] },
];

const channel = (hex: string, at: number): number => Number.parseInt(hex.slice(at, at + 2), 16);

/** The palette as a table of RGB, so a frame is a lookup and not a parse. */
export function rampFor(palette: Palette, steps = 256): Uint8Array {
  const table = new Uint8Array(steps * 3);
  const { stops } = palette;
  for (let i = 0; i < steps; i += 1) {
    const p = (i / steps) * stops.length;
    const from = stops[Math.floor(p) % stops.length];
    const to = stops[(Math.floor(p) + 1) % stops.length];
    const t = p - Math.floor(p);
    for (let c = 0; c < 3; c += 1) {
      const at = 1 + c * 2;
      table[i * 3 + c] = Math.round(channel(from, at) + (channel(to, at) - channel(from, at)) * t);
    }
  }
  return table;
}

export const DENSITIES = [5_000, 11_000, 22_000] as const;
export type Density = (typeof DENSITIES)[number];
export const NORMAL_DENSITY: Density = 11_000;

/**
 * What the seed decided to build.
 *
 * Either one of the named shapes, or a formula — a shape that exists only as the
 * numbers in it, which is what keeps the mode from being a menu of ten things.
 */
export type Recipe =
  | { kind: 'named'; shape: ShapeName }
  | { kind: 'formula'; formula: Formula };

export interface ShaperSetup {
  seed: number;
  recipe: Recipe;
  palette: Palette;
  count: Density;
}

/** For the file name. */
export const recipeSlug = (recipe: Recipe): string =>
  recipe.kind === 'named' ? recipe.shape : describeFormula(recipe.formula);

/** For the line under the button. */
export const recipeName = (recipe: Recipe): string =>
  recipe.kind === 'named' ? SHAPE_LABEL[recipe.shape] : nameFormula(recipe.formula);

/**
 * What the page asked for: a named shape, a formula, or nothing and let the seed
 * decide.
 */
export type Wanted = ShapeName | 'formula' | null;

/**
 * What this seed asks for when the shape and the palette are left to it.
 *
 * The dials override it. Left alone, the seed is the whole video — which is the
 * same bargain the other two modes make.
 */
export function dealShaper(
  seed: number,
  shape: Wanted,
  palette: Palette | null,
  count: Density,
): ShaperSetup {
  const rng = createRng(seed ^ 0x5bf03635);
  const recipe: Recipe =
    shape === 'formula'
      ? { kind: 'formula', formula: dealFormula(rng) }
      : shape !== null
        ? { kind: 'named', shape }
        : // Left to the seed, it deals a formula three times in four: the ten
          // named shapes are the ones worth having by name, and everything else
          // there could be is in the formulae.
          rng.next() < 0.25
          ? { kind: 'named', shape: rng.pick(SHAPE_NAMES) }
          : { kind: 'formula', formula: dealFormula(rng) };
  return {
    seed,
    recipe,
    palette: palette ?? rng.pick(PALETTES),
    count,
  };
}

/** Builds the cloud. Same seed, same shape, same points, for ever. */
export function buildCloud(setup: ShaperSetup): Cloud {
  const rng = createRng(setup.seed ^ 0x1f83d9ab);
  let cloud: Cloud;
  if (setup.recipe.kind === 'named') {
    cloud = BUILDERS[setup.recipe.shape](rng, setup.count);
  } else {
    const into = new Scatter();
    buildFormula(setup.recipe.formula, rng, into, setup.count);
    cloud = into.done();
  }

  // Scaled to the frame here rather than in the painter: how wide the shape is
  // depends on the shape, and the painter should not have to know that a horn
  // torus is twice as wide as it is tall.
  let widest = 0;
  for (let i = 0; i < cloud.count; i += 1) {
    widest = Math.max(widest, Math.hypot(cloud.x[i], cloud.z[i]), Math.abs(cloud.y[i]));
  }
  const scale = widest > 0 ? 1 / widest : 1;
  for (let i = 0; i < cloud.count; i += 1) {
    cloud.x[i] *= scale;
    cloud.y[i] *= scale;
    cloud.z[i] *= scale;
  }
  return cloud;
}
