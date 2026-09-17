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
import type { Art } from './jellyArt';

export interface Rung {
  /** What it is called, for the ending's caption. */
  name: string;
  /** What its sparks and its ring are coloured, taken off the picture itself. */
  color: string;
  /** The picture, which is what is actually drawn. */
  art: Art;
  /** What is drawn if the picture has not arrived. */
  shape?: JellyShape;
}

/** A drawn fallback: a shape and the colour it is drawn in. */
interface DrawnRung {
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

export type ThemeName =
  | 'fruit'
  | 'planets'
  | 'gems'
  | 'sweets'
  | 'ocean'
  | 'animals'
  | 'vegetables'
  | 'magic'
  | 'insects'
  | 'weather';

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

const FRUIT_DRAWN: readonly DrawnRung[] = [
  { name: 'Blueberry', color: '#2a4bd7', shape: { path: sphere } },
  { name: 'Strawberry', color: '#e5173f', shape: { path: berry, marks: speckle(11, 0.055, 'rgba(255,236,150,0.9)'), reach: 1.1 } },
  { name: 'Grape', color: '#7a2fbf', shape: { path: blob(5, 0.1) } },
  { name: 'Lemon', color: '#f5d915', shape: { path: oval(1.06, 0.82) } },
  { name: 'Peach', color: '#ff8a4c', shape: { path: blob(2, 0.045) } },
  { name: 'Pear', color: '#b7e02c', shape: { path: pearOutline, reach: 1.15 } },
  { name: 'Apple', color: '#e01b2e', shape: { path: appleWithStalk, marks: stalk, reach: 1.15, upright: true } },
  { name: 'Pineapple', color: '#f0a92b', shape: { path: oval(0.86, 1.08), marks: both(hatch, crown), reach: 1.5, upright: true } },
];

const PLANETS_DRAWN: readonly DrawnRung[] = [
  { name: 'Moon', color: '#cfd3da', shape: { path: sphere, marks: speckle(7, 0.1, 'rgba(120,125,135,0.5)') } },
  { name: 'Mars', color: '#d6462a', shape: { path: sphere, marks: speckle(5, 0.14, 'rgba(120,45,25,0.45)') } },
  { name: 'Venus', color: '#e8a33d', shape: { path: sphere, marks: bands([[-0.3, 0.1, 'rgba(255,225,170,0.35)'], [0.25, 0.12, 'rgba(180,110,40,0.35)']]) } },
  { name: 'Earth', color: '#2b7fd4', shape: { path: sphere, marks: land } },
  { name: 'Neptune', color: '#2f5bd8', shape: { path: sphere, marks: bands([[-0.35, 0.07, 'rgba(150,190,255,0.35)'], [0.3, 0.09, 'rgba(20,40,120,0.4)']]) } },
  { name: 'Saturn', color: '#e6c77a', shape: { path: sphere, marks: bands([[-0.2, 0.08, 'rgba(255,240,200,0.4)'], [0.28, 0.1, 'rgba(170,130,60,0.35)']]) } },
  { name: 'Jupiter', color: '#e08a4a', shape: { path: sphere, marks: bands([[-0.45, 0.08, 'rgba(255,225,190,0.45)'], [-0.12, 0.11, 'rgba(160,90,45,0.4)'], [0.22, 0.09, 'rgba(255,220,180,0.4)'], [0.5, 0.07, 'rgba(150,80,40,0.4)']]) } },
  { name: 'Sun', color: '#ffb02e', shape: { path: blob(14, 0.035), marks: speckle(9, 0.1, 'rgba(255,90,20,0.35)'), reach: 1.1 } },
];

const GEMS_DRAWN: readonly DrawnRung[] = [
  { name: 'Pearl', color: '#f2e6ef', shape: { path: sphere } },
  { name: 'Emerald', color: '#12b886', shape: { path: cut(8, Math.PI / 8), marks: facets(8, Math.PI / 8) } },
  { name: 'Ruby', color: '#e01050', shape: { path: cut(10, 0), marks: facets(10) } },
  { name: 'Topaz', color: '#ffa41b', shape: { path: teardrop, marks: facets(7), reach: 1.2 } },
  { name: 'Amethyst', color: '#9b3ce0', shape: { path: marquise, marks: facets(6), reach: 1.2 } },
  { name: 'Sapphire', color: '#2a55e0', shape: { path: cut(4, Math.PI / 4, 0.92), marks: facets(8, Math.PI / 4), reach: 1.05 } },
  { name: 'Peridot', color: '#a6e022', shape: { path: cut(12, 0), marks: facets(12) } },
  { name: 'Diamond', color: '#a8e6ff', shape: { path: cut(9, -Math.PI / 2), marks: facets(9, -Math.PI / 2) } },
];

const SWEETS_DRAWN: readonly DrawnRung[] = [
  { name: 'Cookie', color: '#c98a45', shape: { path: blob(9, 0.035), marks: speckle(8, 0.11, 'rgba(70,40,20,0.75)') } },
  { name: 'Jelly bean', color: '#8e44e0', shape: { path: bean, reach: 1.15 } },
  { name: 'Lollipop', color: '#ff5d8f', shape: { path: sphere, marks: swirl } },
  { name: 'Macaron', color: '#ffb3c6', shape: { path: oval(1.05, 0.78) } },
  { name: 'Cupcake', color: '#f06595', shape: { path: cupcake, marks: speckle(12, 0.05, 'rgba(255,255,255,0.85)', 0.6), reach: 1.2, upright: true } },
  { name: 'Ice cream', color: '#ffe8b0', shape: { path: iceCream, marks: speckle(9, 0.06, 'rgba(255,120,80,0.75)', 0.5), reach: 1.2, upright: true } },
  { name: 'Donut', color: '#ff7aa8', shape: { path: torus(0.42), marks: speckle(18, 0.05, 'rgba(255,255,255,0.9)', 0.92) } },
  { name: 'Birthday cake', color: '#ffd166', shape: { path: oval(1.05, 0.92), marks: speckle(14, 0.055, 'rgba(255,90,140,0.8)') } },
];

const OCEAN_DRAWN: readonly DrawnRung[] = [
  { name: 'Clownfish', color: '#ff6b1f', shape: { path: fish, marks: eye(0.5, -0.12, 0.14), reach: 1.15 } },
  { name: 'Starfish', color: '#ffa62b', shape: { path: star(5, 0.46), reach: 1.05 } },
  { name: 'Pufferfish', color: '#ffd23f', shape: { path: blob(13, 0.08), marks: eye(0.42, -0.18, 0.12), reach: 1.15 } },
  { name: 'Seahorse', color: '#2ec4a6', shape: { path: blob(3, 0.16), marks: eye(0.3, -0.34, 0.1), reach: 1.2 } },
  { name: 'Jellyfish', color: '#ff2e88', shape: { path: jellyBell, reach: 1.15, upright: true } },
  { name: 'Turtle', color: '#3fa34d', shape: { path: oval(1.1, 0.88), marks: facets(6) } },
  { name: 'Octopus', color: '#c026d3', shape: { path: blob(8, 0.11), marks: eye(0.3, -0.26, 0.12), reach: 1.15 } },
  { name: 'Whale', color: '#1e6fd9', shape: { path: whaleBody, marks: eye(0.55, -0.1, 0.1), reach: 1.2 } },
];

const FRUIT_ART: readonly Rung[] = [
  { name: 'Blueberry', color: '#1f5ed6', art: { file: 'fruit/0.webp', w: 136, h: 131, cx: 0.489, cy: 0.4885, span: 110.0 } },
  { name: 'Strawberry', color: '#d9381c', art: { file: 'fruit/1.webp', w: 130, h: 147, cx: 0.4962, cy: 0.4898, span: 121.0 } },
  { name: 'Blackberry', color: '#5d3fc6', art: { file: 'fruit/2.webp', w: 130, h: 143, cx: 0.4923, cy: 0.493, span: 116.0 } },
  { name: 'Lemon', color: '#ddc619', art: { file: 'fruit/3.webp', w: 131, h: 146, cx: 0.5382, cy: 0.4966, span: 118.0 } },
  { name: 'Orange', color: '#f09f21', art: { file: 'fruit/4.webp', w: 141, h: 140, cx: 0.4929, cy: 0.4857, span: 119.0 } },
  { name: 'Pear', color: '#abd124', art: { file: 'fruit/5.webp', w: 119, h: 150, cx: 0.5084, cy: 0.4767, span: 128.0 } },
  { name: 'Apple', color: '#dd2717', art: { file: 'fruit/6.webp', w: 131, h: 147, cx: 0.4847, cy: 0.5034, span: 119.0 } },
  { name: 'Pineapple', color: '#d4a317', art: { file: 'fruit/7.webp', w: 117, h: 152, cx: 0.4915, cy: 0.4539, span: 139.0 } },
];

const PLANETS_ART: readonly Rung[] = [
  { name: 'Moon', color: '#ddcec9', art: { file: 'planets/0.webp', w: 130, h: 131, cx: 0.4462, cy: 0.4924, span: 113.0 } },
  { name: 'Mars', color: '#d53621', art: { file: 'planets/1.webp', w: 129, h: 122, cx: 0.5426, cy: 0.4959, span: 113.0 } },
  { name: 'Saturn', color: '#e29e35', art: { file: 'planets/2.webp', w: 164, h: 116, cx: 0.4939, cy: 0.4784, span: 163.0 } },
  { name: 'Earth', color: '#52adc4', art: { file: 'planets/3.webp', w: 133, h: 133, cx: 0.4511, cy: 0.4962, span: 117.0 } },
  { name: 'Neptune', color: '#1360d9', art: { file: 'planets/4.webp', w: 132, h: 131, cx: 0.4924, cy: 0.4924, span: 110.0 } },
  { name: 'Jupiter', color: '#dfb07d', art: { file: 'planets/5.webp', w: 134, h: 132, cx: 0.4925, cy: 0.4962, span: 108.0 } },
  { name: 'Venus', color: '#d9711c', art: { file: 'planets/6.webp', w: 134, h: 133, cx: 0.4925, cy: 0.5075, span: 108.0 } },
  { name: 'Sun', color: '#e6a811', art: { file: 'planets/7.webp', w: 149, h: 152, cx: 0.5034, cy: 0.5, span: 127.0 } },
];

const GEMS_ART: readonly Rung[] = [
  { name: 'Pearl', color: '#e2cfc8', art: { file: 'gems/0.webp', w: 121, h: 121, cx: 0.4876, cy: 0.4917, span: 100.0 } },
  { name: 'Emerald', color: '#1eca4d', art: { file: 'gems/1.webp', w: 115, h: 130, cx: 0.4783, cy: 0.5077, span: 103.0 } },
  { name: 'Ruby', color: '#d61b5a', art: { file: 'gems/2.webp', w: 134, h: 133, cx: 0.4888, cy: 0.5, span: 110.0 } },
  { name: 'Topaz', color: '#dd8719', art: { file: 'gems/3.webp', w: 112, h: 149, cx: 0.4955, cy: 0.5, span: 124.0 } },
  { name: 'Amethyst', color: '#9435da', art: { file: 'gems/4.webp', w: 120, h: 142, cx: 0.5, cy: 0.4859, span: 121.0 } },
  { name: 'Sapphire', color: '#1545dc', art: { file: 'gems/5.webp', w: 125, h: 127, cx: 0.504, cy: 0.4921, span: 104.0 } },
  { name: 'Peridot', color: '#29ce46', art: { file: 'gems/6.webp', w: 121, h: 129, cx: 0.4917, cy: 0.5, span: 104.0 } },
  { name: 'Diamond', color: '#5ea7e7', art: { file: 'gems/7.webp', w: 133, h: 129, cx: 0.4887, cy: 0.5, span: 113.0 } },
];

const SWEETS_ART: readonly Rung[] = [
  { name: 'Cookie', color: '#dc8d34', art: { file: 'sweets/0.webp', w: 134, h: 120, cx: 0.4478, cy: 0.5, span: 117.0 } },
  { name: 'Jelly bean', color: '#8c33d7', art: { file: 'sweets/1.webp', w: 128, h: 133, cx: 0.4961, cy: 0.5075, span: 108.0 } },
  { name: 'Lollipop', color: '#cd9da3', art: { file: 'sweets/2.webp', w: 119, h: 147, cx: 0.5126, cy: 0.5068, span: 124.0 } },
  { name: 'Marshmallow', color: '#f09bb3', art: { file: 'sweets/3.webp', w: 120, h: 128, cx: 0.4958, cy: 0.4922, span: 105.0 } },
  { name: 'Cupcake', color: '#e88d94', art: { file: 'sweets/4.webp', w: 121, h: 147, cx: 0.5, cy: 0.4898, span: 125.0 } },
  { name: 'Ice cream', color: '#e6b574', art: { file: 'sweets/5.webp', w: 92, h: 152, cx: 0.5109, cy: 0.4836, span: 132.0 } },
  { name: 'Donut', color: '#e85e6a', art: { file: 'sweets/6.webp', w: 145, h: 133, cx: 0.4931, cy: 0.485, span: 118.0 } },
  { name: 'Gumball', color: '#ed9e26', art: { file: 'sweets/7.webp', w: 127, h: 132, cx: 0.5039, cy: 0.4962, span: 108.0 } },
];

const OCEAN_ART: readonly Rung[] = [
  { name: 'Clownfish', color: '#e0753a', art: { file: 'ocean/0.webp', w: 152, h: 118, cx: 0.5066, cy: 0.4746, span: 145.0 } },
  { name: 'Starfish', color: '#e8a92f', art: { file: 'ocean/1.webp', w: 140, h: 134, cx: 0.4571, cy: 0.4851, span: 125.0 } },
  { name: 'Pufferfish', color: '#e7b227', art: { file: 'ocean/2.webp', w: 147, h: 132, cx: 0.4932, cy: 0.5076, span: 118.0 } },
  { name: 'Jellyfish', color: '#2fcbd8', art: { file: 'ocean/3.webp', w: 125, h: 151, cx: 0.496, cy: 0.5, span: 124.0 } },
  { name: 'Pink jellyfish', color: '#e63996', art: { file: 'ocean/4.webp', w: 129, h: 150, cx: 0.4845, cy: 0.5133, span: 127.0 } },
  { name: 'Sea urchin', color: '#c4aa71', art: { file: 'ocean/5.webp', w: 141, h: 132, cx: 0.4965, cy: 0.5265, span: 115.0 } },
  { name: 'Sea jelly', color: '#8b3ada', art: { file: 'ocean/6.webp', w: 137, h: 145, cx: 0.5036, cy: 0.5, span: 122.0 } },
  { name: 'Blue tang', color: '#3d8ed0', art: { file: 'ocean/7.webp', w: 160, h: 129, cx: 0.5125, cy: 0.5233, span: 137.0 } },
];

const ANIMALS_ART: readonly Rung[] = [
  { name: 'Fox', color: '#ec7934', shape: { path: sphere }, art: { file: 'animals/0.webp', w: 120, h: 129, cx: 0.5208, cy: 0.4845, span: 108.0 } },
  { name: 'Rabbit', color: '#f07998', shape: { path: sphere }, art: { file: 'animals/1.webp', w: 106, h: 141, cx: 0.5189, cy: 0.4752, span: 117.0 } },
  { name: 'Chick', color: '#eeb412', shape: { path: sphere }, art: { file: 'animals/2.webp', w: 110, h: 122, cx: 0.5409, cy: 0.5, span: 93.0 } },
  { name: 'Frog', color: '#6dd72a', shape: { path: sphere }, art: { file: 'animals/3.webp', w: 116, h: 112, cx: 0.5474, cy: 0.4643, span: 98.0 } },
  { name: 'Cat', color: '#a259d6', shape: { path: sphere }, art: { file: 'animals/4.webp', w: 120, h: 125, cx: 0.5292, cy: 0.492, span: 100.0 } },
  { name: 'Whale', color: '#1d8ce6', shape: { path: sphere }, art: { file: 'animals/5.webp', w: 120, h: 140, cx: 0.5208, cy: 0.4786, span: 115.0 } },
  { name: 'Red panda', color: '#dd725e', shape: { path: sphere }, art: { file: 'animals/6.webp', w: 120, h: 116, cx: 0.5458, cy: 0.5086, span: 106.0 } },
  { name: 'Lion', color: '#e9a21e', shape: { path: sphere }, art: { file: 'animals/7.webp', w: 120, h: 133, cx: 0.525, cy: 0.4925, span: 114.0 } },
];

const VEGETABLES_ART: readonly Rung[] = [
  { name: 'Tomato', color: '#dd301b', shape: { path: sphere }, art: { file: 'vegetables/0.webp', w: 120, h: 124, cx: 0.5083, cy: 0.4758, span: 105.0 } },
  { name: 'Carrot', color: '#e18116', shape: { path: sphere }, art: { file: 'vegetables/1.webp', w: 114, h: 140, cx: 0.5088, cy: 0.4857, span: 117.0 } },
  { name: 'Broccoli', color: '#59c42d', shape: { path: sphere }, art: { file: 'vegetables/2.webp', w: 120, h: 138, cx: 0.5458, cy: 0.4928, span: 115.0 } },
  { name: 'Aubergine', color: '#a168c1', shape: { path: sphere }, art: { file: 'vegetables/3.webp', w: 115, h: 143, cx: 0.5043, cy: 0.458, span: 124.0 } },
  { name: 'Corn', color: '#d2c719', shape: { path: sphere }, art: { file: 'vegetables/4.webp', w: 113, h: 146, cx: 0.4779, cy: 0.4726, span: 123.0 } },
  { name: 'Chilli', color: '#dc3620', shape: { path: sphere }, art: { file: 'vegetables/5.webp', w: 112, h: 140, cx: 0.4688, cy: 0.4714, span: 117.0 } },
  { name: 'Cucumber', color: '#5ac537', shape: { path: sphere }, art: { file: 'vegetables/6.webp', w: 117, h: 144, cx: 0.4573, cy: 0.4688, span: 126.0 } },
  { name: 'Garlic', color: '#e3cfcb', shape: { path: sphere }, art: { file: 'vegetables/7.webp', w: 120, h: 136, cx: 0.4958, cy: 0.4816, span: 114.0 } },
];

const MAGIC_ART: readonly Rung[] = [
  { name: 'Crystal ball', color: '#bc5dd0', shape: { path: sphere }, art: { file: 'magic/0.webp', w: 120, h: 144, cx: 0.475, cy: 0.4896, span: 116.0 } },
  { name: 'Wand', color: '#e0a51f', shape: { path: sphere }, art: { file: 'magic/1.webp', w: 111, h: 145, cx: 0.5135, cy: 0.4862, span: 120.0 } },
  { name: 'Potion', color: '#439edb', shape: { path: sphere }, art: { file: 'magic/2.webp', w: 109, h: 148, cx: 0.4862, cy: 0.4764, span: 124.0 } },
  { name: 'Fairy wings', color: '#e369b6', shape: { path: sphere }, art: { file: 'magic/3.webp', w: 120, h: 145, cx: 0.4958, cy: 0.4862, span: 118.0 } },
  { name: 'Spell book', color: '#adc840', shape: { path: sphere }, art: { file: 'magic/4.webp', w: 120, h: 146, cx: 0.4792, cy: 0.5068, span: 121.0 } },
  { name: 'Flame', color: '#e56712', shape: { path: sphere }, art: { file: 'magic/5.webp', w: 120, h: 148, cx: 0.475, cy: 0.4831, span: 126.0 } },
  { name: 'Wizard hat', color: '#1089e5', shape: { path: sphere }, art: { file: 'magic/6.webp', w: 120, h: 142, cx: 0.4958, cy: 0.493, span: 118.0 } },
  { name: 'Unicorn horn', color: '#ceb09e', shape: { path: sphere }, art: { file: 'magic/7.webp', w: 111, h: 148, cx: 0.5045, cy: 0.4899, span: 122.0 } },
];

const INSECTS_ART: readonly Rung[] = [
  { name: 'Butterfly', color: '#ecaa15', shape: { path: sphere }, art: { file: 'insects/0.webp', w: 120, h: 136, cx: 0.4875, cy: 0.489, span: 116.0 } },
  { name: 'Ladybird', color: '#d53328', shape: { path: sphere }, art: { file: 'insects/1.webp', w: 116, h: 124, cx: 0.4957, cy: 0.4597, span: 107.0 } },
  { name: 'Caterpillar', color: '#72d025', shape: { path: sphere }, art: { file: 'insects/2.webp', w: 120, h: 101, cx: 0.5125, cy: 0.5099, span: 110.0 } },
  { name: 'Dragonfly', color: '#2a92e0', shape: { path: sphere }, art: { file: 'insects/3.webp', w: 120, h: 136, cx: 0.4958, cy: 0.4779, span: 118.0 } },
  { name: 'Bee', color: '#a64ed0', shape: { path: sphere }, art: { file: 'insects/4.webp', w: 120, h: 124, cx: 0.5, cy: 0.4798, span: 104.0 } },
  { name: 'Ant', color: '#e15518', shape: { path: sphere }, art: { file: 'insects/5.webp', w: 120, h: 132, cx: 0.5083, cy: 0.4773, span: 115.0 } },
  { name: 'Firefly', color: '#e275a5', shape: { path: sphere }, art: { file: 'insects/6.webp', w: 120, h: 147, cx: 0.5208, cy: 0.4966, span: 117.0 } },
  { name: 'Mantis', color: '#28d4c6', shape: { path: sphere }, art: { file: 'insects/7.webp', w: 120, h: 148, cx: 0.5, cy: 0.4932, span: 129.0 } },
];

const WEATHER_ART: readonly Rung[] = [
  { name: 'Cloud', color: '#dbd6e6', shape: { path: sphere }, art: { file: 'weather/0.webp', w: 120, h: 116, cx: 0.4833, cy: 0.4914, span: 115.0 } },
  { name: 'Lightning', color: '#e8b118', shape: { path: sphere }, art: { file: 'weather/1.webp', w: 96, h: 129, cx: 0.5, cy: 0.4961, span: 105.0 } },
  { name: 'Raindrop', color: '#1a8bde', shape: { path: sphere }, art: { file: 'weather/2.webp', w: 99, h: 140, cx: 0.4949, cy: 0.4929, span: 111.0 } },
  { name: 'Sun', color: '#e3760f', shape: { path: sphere }, art: { file: 'weather/3.webp', w: 120, h: 146, cx: 0.4583, cy: 0.4966, span: 118.0 } },
  { name: 'Tornado', color: '#a746dc', shape: { path: sphere }, art: { file: 'weather/4.webp', w: 120, h: 146, cx: 0.45, cy: 0.5068, span: 123.0 } },
  { name: 'Snowflake', color: '#29a8da', shape: { path: sphere }, art: { file: 'weather/5.webp', w: 116, h: 140, cx: 0.4698, cy: 0.4964, span: 110.0 } },
  { name: 'Rainbow', color: '#d4a180', shape: { path: sphere }, art: { file: 'weather/6.webp', w: 120, h: 118, cx: 0.4958, cy: 0.5042, span: 118.0 } },
  { name: 'Storm cloud', color: '#1661d1', shape: { path: sphere }, art: { file: 'weather/7.webp', w: 120, h: 144, cx: 0.5208, cy: 0.4965, span: 114.0 } },
];

/**
 * The ladders, each a picture, a name and a colour.
 *
 * The first five have drawn shapes above, kept and paired with them one for one:
 * if a theme's pictures do not arrive, the painter has something the right size
 * and the right colour that reads as the right object. The five from the second
 * sheet fall back to a plain sphere in their own colour, which is not the object
 * but is at least not nothing.
 */
const pair = (art: readonly Rung[], drawn: readonly DrawnRung[]): readonly Rung[] =>
  art.map((rung, i) => ({ ...rung, shape: drawn[i].shape }));

export const THEMES: Record<ThemeName, Theme> = {
  fruit: { key: 'fruit', label: 'Fruit', ladder: pair(FRUIT_ART, FRUIT_DRAWN) },
  planets: { key: 'planets', label: 'Planets', ladder: pair(PLANETS_ART, PLANETS_DRAWN) },
  gems: { key: 'gems', label: 'Gems', ladder: pair(GEMS_ART, GEMS_DRAWN) },
  sweets: { key: 'sweets', label: 'Sweets', ladder: pair(SWEETS_ART, SWEETS_DRAWN) },
  ocean: { key: 'ocean', label: 'Ocean', ladder: pair(OCEAN_ART, OCEAN_DRAWN) },
  animals: { key: 'animals', label: 'Animals', ladder: ANIMALS_ART },
  vegetables: { key: 'vegetables', label: 'Vegetables', ladder: VEGETABLES_ART },
  magic: { key: 'magic', label: 'Magic', ladder: MAGIC_ART },
  insects: { key: 'insects', label: 'Insects', ladder: INSECTS_ART },
  weather: { key: 'weather', label: 'Weather', ladder: WEATHER_ART },
};

export const THEME_NAMES: readonly ThemeName[] = [
  'fruit',
  'planets',
  'gems',
  'sweets',
  'ocean',
  'animals',
  'vegetables',
  'magic',
  'insects',
  'weather',
];

/** The theme a video is dressed in, defaulting to the one the references open with. */
export const themeFor = (name?: ThemeName): Theme => THEMES[name ?? 'fruit'];
