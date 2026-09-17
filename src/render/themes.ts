/**
 * The themes, and the objects they are made of.
 *
 * A theme is a **ladder**: eight things in order of size, where two of one make
 * one of the next. That is all the simulation knows about a theme — it counts
 * rungs and asks for a radius. Everything else is here.
 *
 * Each rung is a silhouette, a colour and, usually, a few marks drawn over the
 * shading. The silhouettes are parametric paths rather than pictures, for the
 * reason every other cast in this project is drawn rather than photographed: a
 * picture belongs to whoever made it, and this is a video generator that is
 * meant to be publishable without anybody's permission. What that costs is
 * honesty about the result — these are drawn gels, not the rendered assets in
 * the reference clips, and they will not be mistaken for them.
 *
 * Marks are drawn **inside the shading's clip and underneath the rim and the
 * highlight**, which is what keeps them looking like they are suspended in the
 * gel rather than printed on top of it. A stripe on Jupiter that sat over the
 * specular would read as a decal.
 *
 * Every mark is sized off the object's own radius, because the same object is
 * drawn at 51 pixels in the chute and 360 in the bowl, and anything sized in
 * pixels is either invisible at one end or crude at the other.
 */

import { fade, lift, sink, sphere, type JellyShape, type Marks } from './jelly3d';

export interface Rung {
  /** What it is called, for the ending's caption. */
  name: string;
  color: string;
  shape: JellyShape;
}

export interface Theme {
  key: ThemeName;
  /** What the picker calls it. */
  label: string;
  /** Eight, smallest first. */
  ladder: readonly Rung[];
}

export type ThemeName = 'fruit' | 'planets' | 'gems' | 'sweets' | 'ocean';

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

/* ---------------------------------------------------------------- shapes -- */

/** An ellipse, which is a sphere that has been sat on or stretched. */
const oval =
  (wide: number, tall: number) =>
  (ctx: Ctx, x: number, y: number, r: number): void => {
    ctx.beginPath();
    ctx.ellipse(x, y, r * wide, r * tall, 0, 0, Math.PI * 2);
  };

/** A drop: round at the bottom, drawn to a point at the top. */
const teardrop = (ctx: Ctx, x: number, y: number, r: number): void => {
  ctx.beginPath();
  ctx.moveTo(x, y - r * 1.15);
  ctx.bezierCurveTo(x + r * 0.62, y - r * 0.5, x + r, y + r * 0.12, x + r, y + r * 0.34);
  ctx.arc(x, y + r * 0.34, r, 0, Math.PI, false);
  ctx.bezierCurveTo(x - r, y + r * 0.12, x - r * 0.62, y - r * 0.5, x, y - r * 1.15);
  ctx.closePath();
};

/** A heart standing on its point, which is near enough a strawberry. */
const berry = (ctx: Ctx, x: number, y: number, r: number): void => {
  ctx.beginPath();
  ctx.moveTo(x, y + r * 1.05);
  ctx.bezierCurveTo(x - r * 1.15, y + r * 0.2, x - r * 1.0, y - r * 0.95, x - r * 0.32, y - r * 0.72);
  ctx.bezierCurveTo(x - r * 0.14, y - r * 0.62, x - r * 0.05, y - r * 0.55, x, y - r * 0.45);
  ctx.bezierCurveTo(x + r * 0.05, y - r * 0.55, x + r * 0.14, y - r * 0.62, x + r * 0.32, y - r * 0.72);
  ctx.bezierCurveTo(x + r * 1.0, y - r * 0.95, x + r * 1.15, y + r * 0.2, x, y + r * 1.05);
  ctx.closePath();
};

/** A pear: a small shoulder over a full bottom. */
const pearOutline = (ctx: Ctx, x: number, y: number, r: number): void => {
  ctx.beginPath();
  ctx.moveTo(x, y - r * 1.1);
  ctx.bezierCurveTo(x + r * 0.52, y - r * 0.92, x + r * 0.5, y - r * 0.2, x + r * 0.66, y + r * 0.12);
  ctx.bezierCurveTo(x + r * 1.06, y + r * 0.62, x + r * 0.6, y + r * 1.12, x, y + r * 1.12);
  ctx.bezierCurveTo(x - r * 0.6, y + r * 1.12, x - r * 1.06, y + r * 0.62, x - r * 0.66, y + r * 0.12);
  ctx.bezierCurveTo(x - r * 0.5, y - r * 0.2, x - r * 0.52, y - r * 0.92, x, y - r * 1.1);
  ctx.closePath();
};

/** A bean, for jelly beans and anything else that lolls. */
const bean = (ctx: Ctx, x: number, y: number, r: number): void => {
  ctx.beginPath();
  ctx.moveTo(x - r * 1.05, y - r * 0.1);
  ctx.bezierCurveTo(x - r * 1.1, y - r * 0.76, x - r * 0.2, y - r * 0.88, x + r * 0.34, y - r * 0.62);
  ctx.bezierCurveTo(x + r * 1.02, y - r * 0.3, x + r * 1.14, y + r * 0.5, x + r * 0.5, y + r * 0.72);
  ctx.bezierCurveTo(x - r * 0.12, y + r * 0.92, x - r * 0.98, y + r * 0.46, x - r * 1.05, y - r * 0.1);
  ctx.closePath();
};

/** A polygon on its point count, used for cut stones. */
const cut =
  (sides: number, turn: number, squash = 1) =>
  (ctx: Ctx, x: number, y: number, r: number): void => {
    ctx.beginPath();
    for (let i = 0; i < sides; i += 1) {
      const a = turn + (i / sides) * Math.PI * 2;
      const px = x + Math.cos(a) * r;
      const py = y + Math.sin(a) * r * squash;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  };

/** A star: a polygon whose points alternate between two radii. */
const star =
  (points: number, inner: number) =>
  (ctx: Ctx, x: number, y: number, r: number): void => {
    ctx.beginPath();
    for (let i = 0; i < points * 2; i += 1) {
      const a = -Math.PI / 2 + (i / (points * 2)) * Math.PI * 2;
      const rad = i % 2 === 0 ? r : r * inner;
      const px = x + Math.cos(a) * rad;
      const py = y + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  };

/** A marquise: a lens with a point at each end. */
const marquise = (ctx: Ctx, x: number, y: number, r: number): void => {
  ctx.beginPath();
  ctx.moveTo(x, y - r * 1.15);
  ctx.quadraticCurveTo(x + r * 0.95, y, x, y + r * 1.15);
  ctx.quadraticCurveTo(x - r * 0.95, y, x, y - r * 1.15);
  ctx.closePath();
};

/** A ring, wound the other way so the hole stays a hole. */
const torus =
  (hole: number) =>
  (ctx: Ctx, x: number, y: number, r: number): void => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.arc(x, y, r * hole, 0, Math.PI * 2, true);
  };

/** A blob with a soft wobble, seeded by its own lobe count. */
const blob =
  (lobes: number, wobble: number) =>
  (ctx: Ctx, x: number, y: number, r: number): void => {
    ctx.beginPath();
    const steps = 64;
    for (let i = 0; i <= steps; i += 1) {
      const a = (i / steps) * Math.PI * 2;
      const rad = r * (1 + Math.sin(a * lobes) * wobble);
      const px = x + Math.cos(a) * rad;
      const py = y + Math.sin(a) * rad;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
  };

/** A fish: a body with a notched tail behind it. */
const fish = (ctx: Ctx, x: number, y: number, r: number): void => {
  ctx.beginPath();
  ctx.moveTo(x + r * 0.95, y);
  ctx.bezierCurveTo(x + r * 0.7, y - r * 0.62, x - r * 0.25, y - r * 0.7, x - r * 0.52, y - r * 0.24);
  ctx.lineTo(x - r * 1.05, y - r * 0.6);
  ctx.lineTo(x - r * 0.92, y);
  ctx.lineTo(x - r * 1.05, y + r * 0.6);
  ctx.lineTo(x - r * 0.52, y + r * 0.24);
  ctx.bezierCurveTo(x - r * 0.25, y + r * 0.7, x + r * 0.7, y + r * 0.62, x + r * 0.95, y);
  ctx.closePath();
};

/** A bell with tentacles hanging off it. */
const jellyBell = (ctx: Ctx, x: number, y: number, r: number): void => {
  ctx.beginPath();
  ctx.moveTo(x - r * 0.95, y - r * 0.05);
  ctx.bezierCurveTo(x - r * 0.95, y - r * 0.95, x + r * 0.95, y - r * 0.95, x + r * 0.95, y - r * 0.05);
  for (let i = 4; i >= 0; i -= 1) {
    const at = x - r * 0.95 + (i / 4) * r * 1.9;
    const dip = i % 2 === 0 ? r * 0.95 : r * 0.45;
    ctx.lineTo(at + r * 0.12, y + dip);
    ctx.lineTo(at - r * 0.12, y - r * 0.05);
  }
  ctx.closePath();
};

/** A whale: a body with a fluke. */
const whaleBody = (ctx: Ctx, x: number, y: number, r: number): void => {
  ctx.beginPath();
  ctx.moveTo(x + r * 1.0, y + r * 0.05);
  ctx.bezierCurveTo(x + r * 0.9, y - r * 0.6, x - r * 0.2, y - r * 0.78, x - r * 0.6, y - r * 0.3);
  ctx.lineTo(x - r * 1.1, y - r * 0.72);
  ctx.lineTo(x - r * 0.95, y - r * 0.05);
  ctx.lineTo(x - r * 1.1, y + r * 0.62);
  ctx.lineTo(x - r * 0.6, y + r * 0.2);
  ctx.bezierCurveTo(x - r * 0.1, y + r * 0.72, x + r * 0.85, y + r * 0.6, x + r * 1.0, y + r * 0.05);
  ctx.closePath();
};

/** A scoop sitting in a cone. */
const iceCream = (ctx: Ctx, x: number, y: number, r: number): void => {
  ctx.beginPath();
  ctx.moveTo(x - r * 0.72, y - r * 0.1);
  ctx.bezierCurveTo(x - r * 0.95, y - r * 0.95, x + r * 0.95, y - r * 0.95, x + r * 0.72, y - r * 0.1);
  ctx.lineTo(x + r * 0.58, y - r * 0.02);
  ctx.lineTo(x, y + r * 1.12);
  ctx.lineTo(x - r * 0.58, y - r * 0.02);
  ctx.closePath();
};

/** A cupcake: a fluted case under a swirl of topping. */
const cupcake = (ctx: Ctx, x: number, y: number, r: number): void => {
  ctx.beginPath();
  ctx.moveTo(x - r * 0.82, y + r * 0.02);
  ctx.bezierCurveTo(x - r * 0.9, y - r * 0.72, x - r * 0.2, y - r * 1.12, x + r * 0.12, y - r * 0.82);
  ctx.bezierCurveTo(x + r * 0.62, y - r * 1.0, x + r * 0.94, y - r * 0.45, x + r * 0.82, y + r * 0.02);
  ctx.lineTo(x + r * 0.6, y + r * 1.0);
  ctx.lineTo(x - r * 0.6, y + r * 1.0);
  ctx.closePath();
};

/** An apple, with the dimple its stalk sits in. */
const appleWithStalk = (ctx: Ctx, x: number, y: number, r: number): void => {
  ctx.beginPath();
  ctx.moveTo(x, y - r * 0.6);
  ctx.bezierCurveTo(x + r * 0.22, y - r * 0.98, x + r * 1.02, y - r * 0.86, x + r * 1.0, y - r * 0.02);
  ctx.bezierCurveTo(x + r * 0.98, y + r * 0.7, x + r * 0.44, y + r * 1.06, x, y + r * 0.98);
  ctx.bezierCurveTo(x - r * 0.44, y + r * 1.06, x - r * 0.98, y + r * 0.7, x - r * 1.0, y - r * 0.02);
  ctx.bezierCurveTo(x - r * 1.02, y - r * 0.86, x - r * 0.22, y - r * 0.98, x, y - r * 0.6);
  ctx.closePath();
};

/* ----------------------------------------------------------------- marks -- */

/** Scattered dots, laid out the same way every time so they do not crawl. */
const speckle =
  (count: number, size: number, color: string, spread = 0.72) =>
  (ctx: Ctx, x: number, y: number, r: number): void => {
    ctx.save();
    ctx.fillStyle = color;
    for (let i = 0; i < count; i += 1) {
      // A cheap deterministic scatter: the golden angle, which never clumps.
      const a = i * 2.39996;
      const d = Math.sqrt((i + 0.5) / count) * r * spread;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

/** Horizontal bands, for a gas giant. */
const bands =
  (rows: readonly [number, number, string][]) =>
  (ctx: Ctx, x: number, y: number, r: number): void => {
    ctx.save();
    for (const [at, thick, color] of rows) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.ellipse(x, y + r * at, r * Math.sqrt(Math.max(0, 1 - at * at)) * 1.02, r * thick, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

/** The facet lines of a cut stone: spokes from the middle to the girdle. */
const facets =
  (spokes: number, turn = 0) =>
  (ctx: Ctx, x: number, y: number, r: number, color: string): void => {
    ctx.save();
    ctx.lineWidth = Math.max(0.6, r * 0.028);
    // Faint, and only from the table outwards. Spokes that ran to the middle
    // made a spider's web of every stone; a cut gem's crown facets start at the
    // flat top and the flat top is the brightest part of it.
    ctx.strokeStyle = fade(lift(color, 0.9), 0.3);
    for (let i = 0; i < spokes; i += 1) {
      const a = turn + (i / spokes) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r * 0.46, y + Math.sin(a) * r * 0.46);
      ctx.lineTo(x + Math.cos(a) * r * 1.05, y + Math.sin(a) * r * 1.05);
      ctx.stroke();
    }
    const table = ctx.createRadialGradient(x, y, 0, x, y, r * 0.5);
    table.addColorStop(0, fade(lift(color, 0.75), 0.4));
    table.addColorStop(1, fade(color, 0));
    ctx.fillStyle = table;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

/** A crosshatch, which is what says pineapple. */
const hatch = (ctx: Ctx, x: number, y: number, r: number, color: string): void => {
  ctx.save();
  ctx.lineWidth = Math.max(0.7, r * 0.035);
  ctx.strokeStyle = fade(sink(color, 0.45), 0.22);
  for (let i = -6; i <= 6; i += 1) {
    ctx.beginPath();
    ctx.moveTo(x - r * 1.2, y + i * r * 0.3 - r * 1.2);
    ctx.lineTo(x + r * 1.2, y + i * r * 0.3 + r * 1.2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - r * 1.2, y - i * r * 0.3 + r * 1.2);
    ctx.lineTo(x + r * 1.2, y - i * r * 0.3 - r * 1.2);
    ctx.stroke();
  }
  ctx.restore();
};

/** A swirl, for a lollipop. */
const swirl = (ctx: Ctx, x: number, y: number, r: number): void => {
  ctx.save();
  const colors = ['#ff4d6d', '#ffd166', '#4cc9f0', '#f8f9fa', '#8ac926'];
  ctx.lineWidth = r * 0.3;
  ctx.lineCap = 'round';
  for (let i = 0; i < colors.length; i += 1) {
    ctx.strokeStyle = fade(colors[i], 0.9);
    ctx.beginPath();
    for (let t = 0; t <= 60; t += 1) {
      const a = (t / 60) * Math.PI * 2.6 + (i / colors.length) * Math.PI * 2;
      const d = (t / 60) * r * 0.92;
      const px = x + Math.cos(a) * d;
      const py = y + Math.sin(a) * d;
      if (t === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
};

/** Continents, roughed in, so an ocean world reads as Earth. */
const land = (ctx: Ctx, x: number, y: number, r: number): void => {
  ctx.save();
  ctx.fillStyle = 'rgba(60,175,105,0.92)';
  const patches: [number, number, number, number][] = [
    [-0.34, -0.3, 0.42, 0.3],
    [-0.12, 0.26, 0.3, 0.42],
    [0.36, -0.14, 0.34, 0.46],
    [0.2, -0.52, 0.26, 0.2],
  ];
  for (const [px, py, w, h] of patches) {
    ctx.beginPath();
    ctx.ellipse(x + px * r, y + py * r, w * r, h * r, px, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(240,250,255,0.8)';
  ctx.beginPath();
  ctx.ellipse(x, y - r * 0.86, r * 0.5, r * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

/** A leafy crown, for the pineapple. */
const crown = (ctx: Ctx, x: number, y: number, r: number): void => {
  ctx.save();
  ctx.fillStyle = 'rgba(70,170,60,0.92)';
  for (let i = -2; i <= 2; i += 1) {
    ctx.save();
    ctx.translate(x, y - r * 0.9);
    ctx.rotate(i * 0.42);
    ctx.beginPath();
    ctx.moveTo(0, r * 0.12);
    ctx.quadraticCurveTo(r * 0.2, -r * 0.3, 0, -r * 0.78);
    ctx.quadraticCurveTo(-r * 0.2, -r * 0.3, 0, r * 0.12);
    ctx.fill();
    ctx.restore();
  }
  ctx.restore();
};

/** A stalk and a leaf. */
const stalk = (ctx: Ctx, x: number, y: number, r: number): void => {
  ctx.save();
  ctx.strokeStyle = 'rgba(95,60,30,0.9)';
  ctx.lineWidth = Math.max(1, r * 0.09);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, y - r * 0.62);
  ctx.quadraticCurveTo(x + r * 0.08, y - r * 0.9, x + r * 0.02, y - r * 1.05);
  ctx.stroke();
  ctx.fillStyle = 'rgba(70,170,60,0.9)';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.3, y - r * 0.9, r * 0.26, r * 0.13, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
};

/** An eye, which is what turns a blob into a creature. */
const eye =
  (at: number, high: number, size = 0.13) =>
  (ctx: Ctx, x: number, y: number, r: number): void => {
    ctx.save();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.beginPath();
    ctx.arc(x + r * at, y + r * high, r * size, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(20,20,30,0.95)';
    ctx.beginPath();
    ctx.arc(x + r * at + r * size * 0.25, y + r * high, r * size * 0.55, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

/** Two marks, one over the other. */
const both =
  (a: Marks, b: Marks): Marks =>
  (ctx, x, y, r, color) => {
    a(ctx, x, y, r, color);
    b(ctx, x, y, r, color);
  };

/* ---------------------------------------------------------------- themes -- */

const FRUIT: readonly Rung[] = [
  { name: 'Blueberry', color: '#2a4bd7', shape: { path: sphere } },
  { name: 'Strawberry', color: '#e5173f', shape: { path: berry, marks: speckle(11, 0.055, 'rgba(255,236,150,0.9)'), reach: 1.1 } },
  { name: 'Grape', color: '#7a2fbf', shape: { path: blob(5, 0.1) } },
  { name: 'Lemon', color: '#f5d915', shape: { path: oval(1.06, 0.82) } },
  { name: 'Peach', color: '#ff8a4c', shape: { path: blob(2, 0.045) } },
  { name: 'Pear', color: '#b7e02c', shape: { path: pearOutline, reach: 1.15 } },
  { name: 'Apple', color: '#e01b2e', shape: { path: appleWithStalk, marks: stalk, reach: 1.15, upright: true } },
  { name: 'Pineapple', color: '#f0a92b', shape: { path: oval(0.86, 1.08), marks: both(hatch, crown), reach: 1.5, upright: true } },
];

const PLANETS: readonly Rung[] = [
  { name: 'Moon', color: '#cfd3da', shape: { path: sphere, marks: speckle(7, 0.1, 'rgba(120,125,135,0.5)') } },
  { name: 'Mars', color: '#d6462a', shape: { path: sphere, marks: speckle(5, 0.14, 'rgba(120,45,25,0.45)') } },
  { name: 'Venus', color: '#e8a33d', shape: { path: sphere, marks: bands([[-0.3, 0.1, 'rgba(255,225,170,0.35)'], [0.25, 0.12, 'rgba(180,110,40,0.35)']]) } },
  { name: 'Earth', color: '#2b7fd4', shape: { path: sphere, marks: land } },
  { name: 'Neptune', color: '#2f5bd8', shape: { path: sphere, marks: bands([[-0.35, 0.07, 'rgba(150,190,255,0.35)'], [0.3, 0.09, 'rgba(20,40,120,0.4)']]) } },
  { name: 'Saturn', color: '#e6c77a', shape: { path: sphere, marks: bands([[-0.2, 0.08, 'rgba(255,240,200,0.4)'], [0.28, 0.1, 'rgba(170,130,60,0.35)']]) } },
  { name: 'Jupiter', color: '#e08a4a', shape: { path: sphere, marks: bands([[-0.45, 0.08, 'rgba(255,225,190,0.45)'], [-0.12, 0.11, 'rgba(160,90,45,0.4)'], [0.22, 0.09, 'rgba(255,220,180,0.4)'], [0.5, 0.07, 'rgba(150,80,40,0.4)']]) } },
  { name: 'Sun', color: '#ffb02e', shape: { path: blob(14, 0.035), marks: speckle(9, 0.1, 'rgba(255,90,20,0.35)'), reach: 1.1 } },
];

const GEMS: readonly Rung[] = [
  { name: 'Pearl', color: '#f2e6ef', shape: { path: sphere } },
  { name: 'Emerald', color: '#12b886', shape: { path: cut(8, Math.PI / 8), marks: facets(8, Math.PI / 8) } },
  { name: 'Ruby', color: '#e01050', shape: { path: cut(10, 0), marks: facets(10) } },
  { name: 'Topaz', color: '#ffa41b', shape: { path: teardrop, marks: facets(7), reach: 1.2 } },
  { name: 'Amethyst', color: '#9b3ce0', shape: { path: marquise, marks: facets(6), reach: 1.2 } },
  { name: 'Sapphire', color: '#2a55e0', shape: { path: cut(4, Math.PI / 4, 0.92), marks: facets(8, Math.PI / 4), reach: 1.05 } },
  { name: 'Peridot', color: '#a6e022', shape: { path: cut(12, 0), marks: facets(12) } },
  { name: 'Diamond', color: '#a8e6ff', shape: { path: cut(9, -Math.PI / 2), marks: facets(9, -Math.PI / 2) } },
];

const SWEETS: readonly Rung[] = [
  { name: 'Cookie', color: '#c98a45', shape: { path: blob(9, 0.035), marks: speckle(8, 0.11, 'rgba(70,40,20,0.75)') } },
  { name: 'Jelly bean', color: '#8e44e0', shape: { path: bean, reach: 1.15 } },
  { name: 'Lollipop', color: '#ff5d8f', shape: { path: sphere, marks: swirl } },
  { name: 'Macaron', color: '#ffb3c6', shape: { path: oval(1.05, 0.78) } },
  { name: 'Cupcake', color: '#f06595', shape: { path: cupcake, marks: speckle(12, 0.05, 'rgba(255,255,255,0.85)', 0.6), reach: 1.2, upright: true } },
  { name: 'Ice cream', color: '#ffe8b0', shape: { path: iceCream, marks: speckle(9, 0.06, 'rgba(255,120,80,0.75)', 0.5), reach: 1.2, upright: true } },
  { name: 'Donut', color: '#ff7aa8', shape: { path: torus(0.42), marks: speckle(18, 0.05, 'rgba(255,255,255,0.9)', 0.92) } },
  { name: 'Birthday cake', color: '#ffd166', shape: { path: oval(1.05, 0.92), marks: speckle(14, 0.055, 'rgba(255,90,140,0.8)') } },
];

const OCEAN: readonly Rung[] = [
  { name: 'Clownfish', color: '#ff6b1f', shape: { path: fish, marks: eye(0.5, -0.12, 0.14), reach: 1.15 } },
  { name: 'Starfish', color: '#ffa62b', shape: { path: star(5, 0.46), reach: 1.05 } },
  { name: 'Pufferfish', color: '#ffd23f', shape: { path: blob(13, 0.08), marks: eye(0.42, -0.18, 0.12), reach: 1.15 } },
  { name: 'Seahorse', color: '#2ec4a6', shape: { path: blob(3, 0.16), marks: eye(0.3, -0.34, 0.1), reach: 1.2 } },
  { name: 'Jellyfish', color: '#ff2e88', shape: { path: jellyBell, reach: 1.15, upright: true } },
  { name: 'Turtle', color: '#3fa34d', shape: { path: oval(1.1, 0.88), marks: facets(6) } },
  { name: 'Octopus', color: '#c026d3', shape: { path: blob(8, 0.11), marks: eye(0.3, -0.26, 0.12), reach: 1.15 } },
  { name: 'Whale', color: '#1e6fd9', shape: { path: whaleBody, marks: eye(0.55, -0.1, 0.1), reach: 1.2 } },
];

export const THEMES: Record<ThemeName, Theme> = {
  fruit: { key: 'fruit', label: 'Fruit', ladder: FRUIT },
  planets: { key: 'planets', label: 'Planets', ladder: PLANETS },
  gems: { key: 'gems', label: 'Gems', ladder: GEMS },
  sweets: { key: 'sweets', label: 'Sweets', ladder: SWEETS },
  ocean: { key: 'ocean', label: 'Ocean', ladder: OCEAN },
};

export const THEME_NAMES: readonly ThemeName[] = ['fruit', 'planets', 'gems', 'sweets', 'ocean'];

/** The theme a video is dressed in, defaulting to the one the references open with. */
export const themeFor = (name?: ThemeName): Theme => THEMES[name ?? 'fruit'];
