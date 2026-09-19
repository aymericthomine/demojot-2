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
  | 'weather'
  | 'vehicles'
  | 'dessert'
  | 'tools'
  | 'sealife'
  | 'mythology'
  | 'dinosaurs'
  | 'music'
  | 'sports'
  | 'space'
  | 'fantasy'
  | 'flowers'
  | 'tropical'
  | 'candy'
  | 'hats'
  | 'monsters';

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
  { name: 'Blueberry', color: '#1f5ed6', art: { file: 'fruit/0.webp', w: 272, h: 262, cx: 0.489, cy: 0.4885, span: 220, reach: 1.120 } },
  { name: 'Strawberry', color: '#d9381c', art: { file: 'fruit/1.webp', w: 260, h: 294, cx: 0.4962, cy: 0.4898, span: 242, reach: 1.061 } },
  { name: 'Blackberry', color: '#5d3fc6', art: { file: 'fruit/2.webp', w: 260, h: 286, cx: 0.4923, cy: 0.493, span: 232, reach: 1.035 } },
  { name: 'Lemon', color: '#ddc619', art: { file: 'fruit/3.webp', w: 262, h: 292, cx: 0.5382, cy: 0.4966, span: 236, reach: 1.239 } },
  { name: 'Orange', color: '#f09f21', art: { file: 'fruit/4.webp', w: 282, h: 280, cx: 0.4929, cy: 0.4857, span: 238, reach: 1.061 } },
  { name: 'Pear', color: '#abd124', art: { file: 'fruit/5.webp', w: 238, h: 300, cx: 0.5084, cy: 0.4767, span: 256, reach: 1.059 } },
  { name: 'Apple', color: '#dd2717', art: { file: 'fruit/6.webp', w: 262, h: 294, cx: 0.4847, cy: 0.5034, span: 238, reach: 1.142 } },
  { name: 'Pineapple', color: '#d4a317', art: { file: 'fruit/7.webp', w: 234, h: 304, cx: 0.4915, cy: 0.4539, span: 278, reach: 1.049 } },
];

const PLANETS_ART: readonly Rung[] = [
  { name: 'Moon', color: '#ddcec9', art: { file: 'planets/0.webp', w: 260, h: 262, cx: 0.4462, cy: 0.4924, span: 226, reach: 1.100 } },
  { name: 'Mars', color: '#d53621', art: { file: 'planets/1.webp', w: 258, h: 244, cx: 0.5426, cy: 0.4959, span: 226, reach: 1.108 } },
  { name: 'Saturn', color: '#e29e35', art: { file: 'planets/2.webp', w: 328, h: 232, cx: 0.4939, cy: 0.4784, span: 326, reach: 1.064 } },
  { name: 'Earth', color: '#52adc4', art: { file: 'planets/3.webp', w: 266, h: 266, cx: 0.4511, cy: 0.4962, span: 234, reach: 1.097 } },
  { name: 'Neptune', color: '#1360d9', art: { file: 'planets/4.webp', w: 264, h: 262, cx: 0.4924, cy: 0.4924, span: 220, reach: 1.076 } },
  { name: 'Jupiter', color: '#dfb07d', art: { file: 'planets/5.webp', w: 268, h: 264, cx: 0.4925, cy: 0.4962, span: 216, reach: 1.083 } },
  { name: 'Venus', color: '#d9711c', art: { file: 'planets/6.webp', w: 268, h: 266, cx: 0.4925, cy: 0.5075, span: 216, reach: 1.078 } },
  { name: 'Sun', color: '#e6a811', art: { file: 'planets/7.webp', w: 298, h: 304, cx: 0.5034, cy: 0.5, span: 254, reach: 1.041 } },
];

const GEMS_ART: readonly Rung[] = [
  { name: 'Pearl', color: '#e2cfc8', art: { file: 'gems/0.webp', w: 242, h: 242, cx: 0.4876, cy: 0.4917, span: 200, reach: 1.070 } },
  { name: 'Emerald', color: '#1eca4d', art: { file: 'gems/1.webp', w: 230, h: 260, cx: 0.4783, cy: 0.5077, span: 206, reach: 1.113 } },
  { name: 'Ruby', color: '#d61b5a', art: { file: 'gems/2.webp', w: 268, h: 266, cx: 0.4888, cy: 0.5, span: 220, reach: 1.166 } },
  { name: 'Topaz', color: '#dd8719', art: { file: 'gems/3.webp', w: 224, h: 298, cx: 0.4955, cy: 0.5, span: 248, reach: 1.069 } },
  { name: 'Amethyst', color: '#9435da', art: { file: 'gems/4.webp', w: 240, h: 284, cx: 0.5, cy: 0.4859, span: 242, reach: 1.166 } },
  { name: 'Sapphire', color: '#1545dc', art: { file: 'gems/5.webp', w: 250, h: 254, cx: 0.504, cy: 0.4921, span: 208, reach: 1.232 } },
  { name: 'Peridot', color: '#29ce46', art: { file: 'gems/6.webp', w: 242, h: 258, cx: 0.4917, cy: 0.5, span: 208, reach: 1.097 } },
  { name: 'Diamond', color: '#5ea7e7', art: { file: 'gems/7.webp', w: 266, h: 258, cx: 0.4887, cy: 0.5, span: 226, reach: 1.097 } },
];

const SWEETS_ART: readonly Rung[] = [
  { name: 'Cookie', color: '#dc8d34', art: { file: 'sweets/0.webp', w: 268, h: 240, cx: 0.4478, cy: 0.5, span: 234, reach: 1.051 } },
  { name: 'Jelly bean', color: '#8c33d7', art: { file: 'sweets/1.webp', w: 256, h: 266, cx: 0.4961, cy: 0.5075, span: 216, reach: 1.224 } },
  { name: 'Lollipop', color: '#cd9da3', art: { file: 'sweets/2.webp', w: 238, h: 294, cx: 0.5126, cy: 0.5068, span: 248, reach: 1.244 } },
  { name: 'Marshmallow', color: '#f09bb3', art: { file: 'sweets/3.webp', w: 240, h: 256, cx: 0.4958, cy: 0.4922, span: 210, reach: 1.141 } },
  { name: 'Cupcake', color: '#e88d94', art: { file: 'sweets/4.webp', w: 242, h: 294, cx: 0.5, cy: 0.4898, span: 250, reach: 1.154 } },
  { name: 'Ice cream', color: '#e6b574', art: { file: 'sweets/5.webp', w: 184, h: 304, cx: 0.5109, cy: 0.4836, span: 264, reach: 1.031 } },
  { name: 'Donut', color: '#e85e6a', art: { file: 'sweets/6.webp', w: 290, h: 266, cx: 0.4931, cy: 0.485, span: 236, reach: 1.092 } },
  { name: 'Gumball', color: '#ed9e26', art: { file: 'sweets/7.webp', w: 254, h: 264, cx: 0.5039, cy: 0.4962, span: 216, reach: 1.066 } },
];

const OCEAN_ART: readonly Rung[] = [
  { name: 'Clownfish', color: '#e0753a', art: { file: 'ocean/0.webp', w: 304, h: 236, cx: 0.5066, cy: 0.4746, span: 290, reach: 1.041 } },
  { name: 'Starfish', color: '#e8a92f', art: { file: 'ocean/1.webp', w: 280, h: 268, cx: 0.4571, cy: 0.4851, span: 250, reach: 1.165 } },
  { name: 'Pufferfish', color: '#e7b227', art: { file: 'ocean/2.webp', w: 294, h: 264, cx: 0.4932, cy: 0.5076, span: 236, reach: 1.248 } },
  { name: 'Jellyfish', color: '#2fcbd8', art: { file: 'ocean/3.webp', w: 250, h: 302, cx: 0.496, cy: 0.5, span: 248, reach: 1.054 } },
  { name: 'Pink jellyfish', color: '#e63996', art: { file: 'ocean/4.webp', w: 258, h: 300, cx: 0.4845, cy: 0.5133, span: 254, reach: 1.057 } },
  { name: 'Sea urchin', color: '#c4aa71', art: { file: 'ocean/5.webp', w: 282, h: 264, cx: 0.4965, cy: 0.5265, span: 230, reach: 1.016 } },
  { name: 'Sea jelly', color: '#8b3ada', art: { file: 'ocean/6.webp', w: 274, h: 290, cx: 0.5036, cy: 0.5, span: 244, reach: 1.216 } },
  { name: 'Blue tang', color: '#3d8ed0', art: { file: 'ocean/7.webp', w: 320, h: 258, cx: 0.5125, cy: 0.5233, span: 274, reach: 1.091 } },
];

const ANIMALS_ART: readonly Rung[] = [
  { name: 'Fox', color: '#ec7934', shape: { path: sphere }, art: { file: 'animals/0.webp', w: 240, h: 258, cx: 0.5208, cy: 0.4845, span: 216, reach: 1.277 } },
  { name: 'Rabbit', color: '#f07998', shape: { path: sphere }, art: { file: 'animals/1.webp', w: 212, h: 282, cx: 0.5189, cy: 0.4752, span: 234, reach: 1.181 } },
  { name: 'Chick', color: '#eeb412', shape: { path: sphere }, art: { file: 'animals/2.webp', w: 220, h: 244, cx: 0.5409, cy: 0.5, span: 186, reach: 1.159 } },
  { name: 'Frog', color: '#6dd72a', shape: { path: sphere }, art: { file: 'animals/3.webp', w: 232, h: 224, cx: 0.5474, cy: 0.4643, span: 196, reach: 1.155 } },
  { name: 'Cat', color: '#a259d6', shape: { path: sphere }, art: { file: 'animals/4.webp', w: 240, h: 250, cx: 0.5292, cy: 0.492, span: 200, reach: 1.330 } },
  { name: 'Whale', color: '#1d8ce6', shape: { path: sphere }, art: { file: 'animals/5.webp', w: 240, h: 280, cx: 0.5208, cy: 0.4786, span: 230, reach: 1.189 } },
  { name: 'Red panda', color: '#dd725e', shape: { path: sphere }, art: { file: 'animals/6.webp', w: 240, h: 232, cx: 0.5458, cy: 0.5086, span: 212, reach: 1.351 } },
  { name: 'Lion', color: '#e9a21e', shape: { path: sphere }, art: { file: 'animals/7.webp', w: 240, h: 266, cx: 0.525, cy: 0.4925, span: 228, reach: 1.213 } },
];

const VEGETABLES_ART: readonly Rung[] = [
  { name: 'Tomato', color: '#dd301b', shape: { path: sphere }, art: { file: 'vegetables/0.webp', w: 240, h: 248, cx: 0.5083, cy: 0.4758, span: 210, reach: 1.142 } },
  { name: 'Carrot', color: '#e18116', shape: { path: sphere }, art: { file: 'vegetables/1.webp', w: 228, h: 280, cx: 0.5088, cy: 0.4857, span: 234, reach: 1.275 } },
  { name: 'Broccoli', color: '#59c42d', shape: { path: sphere }, art: { file: 'vegetables/2.webp', w: 240, h: 276, cx: 0.5458, cy: 0.4928, span: 230, reach: 1.068 } },
  { name: 'Aubergine', color: '#a168c1', shape: { path: sphere }, art: { file: 'vegetables/3.webp', w: 230, h: 286, cx: 0.5043, cy: 0.458, span: 248, reach: 1.173 } },
  { name: 'Corn', color: '#d2c719', shape: { path: sphere }, art: { file: 'vegetables/4.webp', w: 226, h: 292, cx: 0.4779, cy: 0.4726, span: 246, reach: 1.072 } },
  { name: 'Chilli', color: '#dc3620', shape: { path: sphere }, art: { file: 'vegetables/5.webp', w: 224, h: 280, cx: 0.4688, cy: 0.4714, span: 234, reach: 1.251 } },
  { name: 'Cucumber', color: '#5ac537', shape: { path: sphere }, art: { file: 'vegetables/6.webp', w: 234, h: 288, cx: 0.4573, cy: 0.4688, span: 252, reach: 1.185 } },
  { name: 'Garlic', color: '#e3cfcb', shape: { path: sphere }, art: { file: 'vegetables/7.webp', w: 240, h: 272, cx: 0.4958, cy: 0.4816, span: 228, reach: 1.035 } },
];

const MAGIC_ART: readonly Rung[] = [
  { name: 'Crystal ball', color: '#bc5dd0', shape: { path: sphere }, art: { file: 'magic/0.webp', w: 240, h: 288, cx: 0.475, cy: 0.4896, span: 232, reach: 1.150 } },
  { name: 'Wand', color: '#e0a51f', shape: { path: sphere }, art: { file: 'magic/1.webp', w: 222, h: 290, cx: 0.5135, cy: 0.4862, span: 240, reach: 1.246 } },
  { name: 'Potion', color: '#439edb', shape: { path: sphere }, art: { file: 'magic/2.webp', w: 218, h: 296, cx: 0.4862, cy: 0.4764, span: 248, reach: 1.106 } },
  { name: 'Fairy wings', color: '#e369b6', shape: { path: sphere }, art: { file: 'magic/3.webp', w: 240, h: 290, cx: 0.4958, cy: 0.4862, span: 236, reach: 1.414 } },
  { name: 'Spell book', color: '#adc840', shape: { path: sphere }, art: { file: 'magic/4.webp', w: 240, h: 292, cx: 0.4792, cy: 0.5068, span: 242, reach: 1.146 } },
  { name: 'Flame', color: '#e56712', shape: { path: sphere }, art: { file: 'magic/5.webp', w: 240, h: 296, cx: 0.475, cy: 0.4831, span: 252, reach: 1.211 } },
  { name: 'Wizard hat', color: '#1089e5', shape: { path: sphere }, art: { file: 'magic/6.webp', w: 240, h: 284, cx: 0.4958, cy: 0.493, span: 236, reach: 1.259 } },
  { name: 'Unicorn horn', color: '#ceb09e', shape: { path: sphere }, art: { file: 'magic/7.webp', w: 222, h: 296, cx: 0.5045, cy: 0.4899, span: 244, reach: 1.235 } },
];

const INSECTS_ART: readonly Rung[] = [
  { name: 'Butterfly', color: '#ecaa15', shape: { path: sphere }, art: { file: 'insects/0.webp', w: 240, h: 272, cx: 0.4875, cy: 0.489, span: 232, reach: 1.366 } },
  { name: 'Ladybird', color: '#d53328', shape: { path: sphere }, art: { file: 'insects/1.webp', w: 232, h: 248, cx: 0.4957, cy: 0.4597, span: 214, reach: 1.102 } },
  { name: 'Caterpillar', color: '#72d025', shape: { path: sphere }, art: { file: 'insects/2.webp', w: 240, h: 202, cx: 0.5125, cy: 0.5099, span: 220, reach: 1.167 } },
  { name: 'Dragonfly', color: '#2a92e0', shape: { path: sphere }, art: { file: 'insects/3.webp', w: 240, h: 272, cx: 0.4958, cy: 0.4779, span: 236, reach: 1.366 } },
  { name: 'Bee', color: '#a64ed0', shape: { path: sphere }, art: { file: 'insects/4.webp', w: 240, h: 248, cx: 0.5, cy: 0.4798, span: 208, reach: 1.232 } },
  { name: 'Ant', color: '#e15518', shape: { path: sphere }, art: { file: 'insects/5.webp', w: 240, h: 264, cx: 0.5083, cy: 0.4773, span: 230, reach: 1.327 } },
  { name: 'Firefly', color: '#e275a5', shape: { path: sphere }, art: { file: 'insects/6.webp', w: 240, h: 294, cx: 0.5208, cy: 0.4966, span: 234, reach: 1.189 } },
  { name: 'Mantis', color: '#28d4c6', shape: { path: sphere }, art: { file: 'insects/7.webp', w: 240, h: 296, cx: 0.5, cy: 0.4932, span: 258, reach: 1.241 } },
];

const WEATHER_ART: readonly Rung[] = [
  { name: 'Cloud', color: '#dbd6e6', shape: { path: sphere }, art: { file: 'weather/0.webp', w: 240, h: 232, cx: 0.4833, cy: 0.4914, span: 230, reach: 1.133 } },
  { name: 'Lightning', color: '#e8b118', shape: { path: sphere }, art: { file: 'weather/1.webp', w: 192, h: 258, cx: 0.5, cy: 0.4961, span: 210, reach: 1.180 } },
  { name: 'Raindrop', color: '#1a8bde', shape: { path: sphere }, art: { file: 'weather/2.webp', w: 198, h: 280, cx: 0.4949, cy: 0.4929, span: 222, reach: 1.111 } },
  { name: 'Sun', color: '#e3760f', shape: { path: sphere }, art: { file: 'weather/3.webp', w: 240, h: 292, cx: 0.4583, cy: 0.4966, span: 236, reach: 1.073 } },
  { name: 'Tornado', color: '#a746dc', shape: { path: sphere }, art: { file: 'weather/4.webp', w: 240, h: 292, cx: 0.45, cy: 0.5068, span: 246, reach: 1.199 } },
  { name: 'Snowflake', color: '#29a8da', shape: { path: sphere }, art: { file: 'weather/5.webp', w: 232, h: 280, cx: 0.4698, cy: 0.4964, span: 220, reach: 1.073 } },
  { name: 'Rainbow', color: '#d4a180', shape: { path: sphere }, art: { file: 'weather/6.webp', w: 240, h: 236, cx: 0.4958, cy: 0.5042, span: 236, reach: 1.291 } },
  { name: 'Storm cloud', color: '#1661d1', shape: { path: sphere }, art: { file: 'weather/7.webp', w: 240, h: 288, cx: 0.5208, cy: 0.4965, span: 228, reach: 1.211 } },
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

const VEHICLES_ART: readonly Rung[] = [
  { name: 'Sports car', color: '#ff3f3f', shape: { path: sphere }, art: { file: 'vehicles/0.webp', w: 310, h: 190, cx: 0.4968, cy: 0.4789, span: 220, reach: 1.369 } },
  { name: 'Saloon', color: '#4a98ff', shape: { path: sphere }, art: { file: 'vehicles/1.webp', w: 290, h: 202, cx: 0.4983, cy: 0.4827, span: 214, reach: 1.330 } },
  { name: 'School bus', color: '#ffc02f', shape: { path: sphere }, art: { file: 'vehicles/2.webp', w: 274, h: 230, cx: 0.4909, cy: 0.4891, span: 224, reach: 1.283 } },
  { name: 'Tractor', color: '#a3ff6f', shape: { path: sphere }, art: { file: 'vehicles/3.webp', w: 168, h: 212, cx: 0.4970, cy: 0.4764, span: 176.5, reach: 1.258 } },
  { name: 'Motorbike', color: '#c761ff', shape: { path: sphere }, art: { file: 'vehicles/4.webp', w: 238, h: 216, cx: 0.4790, cy: 0.5139, span: 204, reach: 1.233 } },
  { name: 'Helicopter', color: '#51d1ff', shape: { path: sphere }, art: { file: 'vehicles/5.webp', w: 280, h: 238, cx: 0.4964, cy: 0.4811, span: 230.5, reach: 1.313 } },
  { name: 'Aeroplane', color: '#ff8226', shape: { path: sphere }, art: { file: 'vehicles/6.webp', w: 296, h: 200, cx: 0.4966, cy: 0.4925, span: 221.5, reach: 1.372 } },
  { name: 'Hot-air balloon', color: '#ff5ba2', shape: { path: sphere }, art: { file: 'vehicles/7.webp', w: 212, h: 280, cx: 0.5047, cy: 0.5000, span: 216, reach: 1.210 } },
];

const DESSERT_ART: readonly Rung[] = [
  { name: 'Chocolate cake', color: '#ff7d58', shape: { path: sphere }, art: { file: 'dessert/0.webp', w: 226, h: 224, cx: 0.5177, cy: 0.5201, span: 207.5, reach: 1.388 } },
  { name: 'Ice cream', color: '#ff756e', shape: { path: sphere }, art: { file: 'dessert/1.webp', w: 218, h: 278, cx: 0.5115, cy: 0.5000, span: 220.5, reach: 1.306 } },
  { name: 'Lemon tart', color: '#ffbb3b', shape: { path: sphere }, art: { file: 'dessert/2.webp', w: 272, h: 220, cx: 0.4982, cy: 0.4932, span: 217, reach: 1.164 } },
  { name: 'Macaron', color: '#ff6184', shape: { path: sphere }, art: { file: 'dessert/3.webp', w: 234, h: 228, cx: 0.4979, cy: 0.4846, span: 197, reach: 1.127 } },
  { name: 'Blueberry muffin', color: '#8db7ff', shape: { path: sphere }, art: { file: 'dessert/4.webp', w: 244, h: 252, cx: 0.5020, cy: 0.4980, span: 217, reach: 1.043 } },
  { name: 'Creme brulee', color: '#ff852b', shape: { path: sphere }, art: { file: 'dessert/5.webp', w: 268, h: 240, cx: 0.5000, cy: 0.4896, span: 224.5, reach: 1.133 } },
  { name: 'Cupcake', color: '#eb63ff', shape: { path: sphere }, art: { file: 'dessert/6.webp', w: 234, h: 274, cx: 0.5021, cy: 0.4945, span: 224, reach: 1.141 } },
  { name: 'Meringue', color: '#fff4e9', shape: { path: sphere }, art: { file: 'dessert/7.webp', w: 240, h: 246, cx: 0.5000, cy: 0.4858, span: 216.5, reach: 1.134 } },
];

const TOOLS_ART: readonly Rung[] = [
  { name: 'Hammer', color: '#ffbc3b', shape: { path: sphere }, art: { file: 'tools/0.webp', w: 220, h: 242, cx: 0.4955, cy: 0.5083, span: 197, reach: 1.292 } },
  { name: 'Spanner', color: '#fbfaff', shape: { path: sphere }, art: { file: 'tools/1.webp', w: 242, h: 262, cx: 0.4979, cy: 0.4924, span: 222.5, reach: 1.304 } },
  { name: 'Screwdriver', color: '#529aff', shape: { path: sphere }, art: { file: 'tools/2.webp', w: 240, h: 274, cx: 0.5021, cy: 0.4836, span: 228, reach: 1.363 } },
  { name: 'Pliers', color: '#ff6f70', shape: { path: sphere }, art: { file: 'tools/3.webp', w: 238, h: 276, cx: 0.5000, cy: 0.4946, span: 229.5, reach: 1.338 } },
  { name: 'Handsaw', color: '#74ff4e', shape: { path: sphere }, art: { file: 'tools/4.webp', w: 294, h: 240, cx: 0.5017, cy: 0.4938, span: 239, reach: 1.331 } },
  { name: 'Drill', color: '#ff681d', shape: { path: sphere }, art: { file: 'tools/5.webp', w: 190, h: 246, cx: 0.4763, cy: 0.4919, span: 192.5, reach: 1.263 } },
  { name: 'Paintbrush', color: '#c861ff', shape: { path: sphere }, art: { file: 'tools/6.webp', w: 252, h: 268, cx: 0.5000, cy: 0.4888, span: 227, reach: 1.372 } },
  { name: 'Tape measure', color: '#77f1ff', shape: { path: sphere }, art: { file: 'tools/7.webp', w: 270, h: 236, cx: 0.5056, cy: 0.5021, span: 226, reach: 1.350 } },
];

const SEALIFE_ART: readonly Rung[] = [
  { name: 'Seahorse', color: '#ff9426', shape: { path: sphere }, art: { file: 'sealife/0.webp', w: 172, h: 254, cx: 0.5000, cy: 0.5059, span: 184.5, reach: 1.276 } },
  { name: 'Dolphin', color: '#389cff', shape: { path: sphere }, art: { file: 'sealife/1.webp', w: 308, h: 246, cx: 0.5000, cy: 0.4980, span: 246.5, reach: 1.404 } },
  { name: 'Crab', color: '#ffbf22', shape: { path: sphere }, art: { file: 'sealife/2.webp', w: 270, h: 244, cx: 0.4963, cy: 0.5020, span: 228.5, reach: 1.180 } },
  { name: 'Octopus', color: '#c14fff', shape: { path: sphere }, art: { file: 'sealife/3.webp', w: 294, h: 272, cx: 0.5000, cy: 0.4945, span: 254.5, reach: 1.152 } },
  { name: 'Turtle', color: '#82ff4e', shape: { path: sphere }, art: { file: 'sealife/4.webp', w: 310, h: 220, cx: 0.4984, cy: 0.4932, span: 236, reach: 1.303 } },
  { name: 'Coral', color: '#ff4f94', shape: { path: sphere }, art: { file: 'sealife/5.webp', w: 240, h: 280, cx: 0.5000, cy: 0.4911, span: 227.5, reach: 1.088 } },
  { name: 'Shark', color: '#46cfff', shape: { path: sphere }, art: { file: 'sealife/6.webp', w: 308, h: 238, cx: 0.5049, cy: 0.4895, span: 243, reach: 1.340 } },
  { name: 'Lobster', color: '#ff3532', shape: { path: sphere }, art: { file: 'sealife/7.webp', w: 318, h: 268, cx: 0.5016, cy: 0.4944, span: 263, reach: 1.179 } },
];

const MYTHOLOGY_ART: readonly Rung[] = [
  { name: 'Thunderbolt', color: '#ffbb2f', shape: { path: sphere }, art: { file: 'mythology/0.webp', w: 182, h: 258, cx: 0.5000, cy: 0.4903, span: 191.5, reach: 1.529 } },
  { name: 'Trident', color: '#4cc6ff', shape: { path: sphere }, art: { file: 'mythology/1.webp', w: 230, h: 314, cx: 0.5022, cy: 0.5000, span: 242.5, reach: 1.386 } },
  { name: 'Helmet', color: '#ff4b4a', shape: { path: sphere }, art: { file: 'mythology/2.webp', w: 228, h: 268, cx: 0.4846, cy: 0.4869, span: 224, reach: 1.285 } },
  { name: 'Owl', color: '#b752ff', shape: { path: sphere }, art: { file: 'mythology/3.webp', w: 218, h: 292, cx: 0.5023, cy: 0.4897, span: 224.5, reach: 1.353 } },
  { name: 'Medusa', color: '#6cff45', shape: { path: sphere }, art: { file: 'mythology/4.webp', w: 280, h: 292, cx: 0.5000, cy: 0.4846, span: 254.5, reach: 1.104 } },
  { name: 'Winged sandals', color: '#ff8e54', shape: { path: sphere }, art: { file: 'mythology/5.webp', w: 300, h: 272, cx: 0.5050, cy: 0.4908, span: 256, reach: 1.222 } },
  { name: 'Lyre', color: '#3bdbff', shape: { path: sphere }, art: { file: 'mythology/6.webp', w: 234, h: 296, cx: 0.5043, cy: 0.4916, span: 231.5, reach: 1.272 } },
  { name: 'Heart', color: '#ff59be', shape: { path: sphere }, art: { file: 'mythology/7.webp', w: 264, h: 268, cx: 0.5019, cy: 0.4963, span: 234.5, reach: 1.192 } },
];

const DINOSAURS_ART: readonly Rung[] = [
  { name: 'Tyrannosaur', color: '#82ff35', shape: { path: sphere }, art: { file: 'dinosaurs/0.webp', w: 234, h: 252, cx: 0.5214, cy: 0.4980, span: 215.5, reach: 1.179 } },
  { name: 'Triceratops', color: '#2eabff', shape: { path: sphere }, art: { file: 'dinosaurs/1.webp', w: 246, h: 242, cx: 0.5305, cy: 0.4897, span: 218, reach: 1.285 } },
  { name: 'Stegosaur', color: '#ffd81c', shape: { path: sphere }, art: { file: 'dinosaurs/2.webp', w: 246, h: 244, cx: 0.4980, cy: 0.4857, span: 231, reach: 1.212 } },
  { name: 'Pterodactyl', color: '#c543ff', shape: { path: sphere }, art: { file: 'dinosaurs/3.webp', w: 234, h: 228, cx: 0.5278, cy: 0.4956, span: 208.5, reach: 1.340 } },
  { name: 'Brontosaur', color: '#ff861a', shape: { path: sphere }, art: { file: 'dinosaurs/4.webp', w: 182, h: 284, cx: 0.5495, cy: 0.5000, span: 210, reach: 1.342 } },
  { name: 'Red tyrannosaur', color: '#ff413e', shape: { path: sphere }, art: { file: 'dinosaurs/5.webp', w: 246, h: 250, cx: 0.4980, cy: 0.5020, span: 234, reach: 1.297 } },
  { name: 'Ankylosaur', color: '#34fff1', shape: { path: sphere }, art: { file: 'dinosaurs/6.webp', w: 246, h: 220, cx: 0.4980, cy: 0.4977, span: 217, reach: 1.280 } },
  { name: 'Hatching egg', color: '#ff8ca8', shape: { path: sphere }, art: { file: 'dinosaurs/7.webp', w: 226, h: 254, cx: 0.4580, cy: 0.5039, span: 214.5, reach: 1.113 } },
];

const MUSIC_ART: readonly Rung[] = [
  { name: 'Record', color: '#ffc630', shape: { path: sphere }, art: { file: 'music/0.webp', w: 228, h: 240, cx: 0.4912, cy: 0.4979, span: 201.5, reach: 1.064 } },
  { name: 'Guitar', color: '#35bdff', shape: { path: sphere }, art: { file: 'music/1.webp', w: 246, h: 280, cx: 0.4878, cy: 0.5018, span: 239.5, reach: 1.374 } },
  { name: 'Microphone', color: '#ff63bb', shape: { path: sphere }, art: { file: 'music/2.webp', w: 156, h: 262, cx: 0.4872, cy: 0.5038, span: 175, reach: 1.356 } },
  { name: 'Drum', color: '#c762ff', shape: { path: sphere }, art: { file: 'music/3.webp', w: 200, h: 224, cx: 0.4525, cy: 0.4844, span: 184, reach: 1.293 } },
  { name: 'Keyboard', color: '#ffd874', shape: { path: sphere }, art: { file: 'music/4.webp', w: 216, h: 212, cx: 0.4653, cy: 0.4953, span: 190.5, reach: 1.368 } },
  { name: 'Saxophone', color: '#ff8f1d', shape: { path: sphere }, art: { file: 'music/5.webp', w: 210, h: 260, cx: 0.4595, cy: 0.5038, span: 211.5, reach: 1.222 } },
  { name: 'Headphones', color: '#35e6ff', shape: { path: sphere }, art: { file: 'music/6.webp', w: 212, h: 240, cx: 0.4693, cy: 0.4896, span: 206, reach: 1.219 } },
  { name: 'Music note', color: '#ff3a37', shape: { path: sphere }, art: { file: 'music/7.webp', w: 212, h: 246, cx: 0.4741, cy: 0.5061, span: 204, reach: 1.334 } },
];

const SPORTS_ART: readonly Rung[] = [
  { name: 'Basketball', color: '#ff6320', shape: { path: sphere }, art: { file: 'sports/0.webp', w: 220, h: 232, cx: 0.4795, cy: 0.4914, span: 193.5, reach: 1.055 } },
  { name: 'Football', color: '#fff8ed', shape: { path: sphere }, art: { file: 'sports/1.webp', w: 206, h: 228, cx: 0.4709, cy: 0.4978, span: 189.5, reach: 1.054 } },
  { name: 'Tennis ball', color: '#e4ff37', shape: { path: sphere }, art: { file: 'sports/2.webp', w: 198, h: 224, cx: 0.4571, cy: 0.4866, span: 186.5, reach: 1.053 } },
  { name: 'Rugby ball', color: '#ff5651', shape: { path: sphere }, art: { file: 'sports/3.webp', w: 192, h: 224, cx: 0.4583, cy: 0.4844, span: 185.5, reach: 1.323 } },
  { name: 'Baseball', color: '#b6ff3c', shape: { path: sphere }, art: { file: 'sports/4.webp', w: 194, h: 230, cx: 0.4562, cy: 0.4978, span: 187, reach: 1.114 } },
  { name: 'Volleyball', color: '#2686ff', shape: { path: sphere }, art: { file: 'sports/5.webp', w: 202, h: 236, cx: 0.4480, cy: 0.4936, span: 191, reach: 1.156 } },
  { name: 'Bowling ball', color: '#943bff', shape: { path: sphere }, art: { file: 'sports/6.webp', w: 204, h: 236, cx: 0.4510, cy: 0.5000, span: 195, reach: 1.166 } },
  { name: 'Hockey puck', color: '#1dbeff', shape: { path: sphere }, art: { file: 'sports/7.webp', w: 230, h: 210, cx: 0.4543, cy: 0.4857, span: 191.5, reach: 1.167 } },
];

const SPACE_ART: readonly Rung[] = [
  { name: 'Rocket', color: '#ffeff9', shape: { path: sphere }, art: { file: 'space/0.webp', w: 208, h: 250, cx: 0.4832, cy: 0.5020, span: 201, reach: 1.378 } },
  { name: 'Satellite', color: '#e1ffed', shape: { path: sphere }, art: { file: 'space/1.webp', w: 234, h: 232, cx: 0.4594, cy: 0.4935, span: 211, reach: 1.344 } },
  { name: 'Helmet', color: '#3f93ff', shape: { path: sphere }, art: { file: 'space/2.webp', w: 206, h: 248, cx: 0.4539, cy: 0.5020, span: 200, reach: 1.226 } },
  { name: 'Alien', color: '#ab46ff', shape: { path: sphere }, art: { file: 'space/3.webp', w: 188, h: 248, cx: 0.4388, cy: 0.5060, span: 192, reach: 1.205 } },
  { name: 'Comet', color: '#ff7724', shape: { path: sphere }, art: { file: 'space/4.webp', w: 216, h: 252, cx: 0.4606, cy: 0.4980, span: 210, reach: 1.396 } },
  { name: 'Flying saucer', color: '#4dd7ff', shape: { path: sphere }, art: { file: 'space/5.webp', w: 246, h: 214, cx: 0.4980, cy: 0.4883, span: 211, reach: 1.295 } },
  { name: 'Space station', color: '#ff62c9', shape: { path: sphere }, art: { file: 'space/6.webp', w: 242, h: 222, cx: 0.4545, cy: 0.4977, span: 205.5, reach: 1.166 } },
  { name: 'Shooting star', color: '#ffcd25', shape: { path: sphere }, art: { file: 'space/7.webp', w: 248, h: 212, cx: 0.4919, cy: 0.5024, span: 213.5, reach: 1.270 } },
];

const FANTASY_ART: readonly Rung[] = [
  { name: 'Dragon', color: '#7aff39', shape: { path: sphere }, art: { file: 'fantasy/0.webp', w: 238, h: 284, cx: 0.5273, cy: 0.4912, span: 240, reach: 1.264 } },
  { name: 'Unicorn', color: '#ffecda', shape: { path: sphere }, art: { file: 'fantasy/1.webp', w: 220, h: 288, cx: 0.5250, cy: 0.4913, span: 234, reach: 1.406 } },
  { name: 'Phoenix', color: '#ff3834', shape: { path: sphere }, art: { file: 'fantasy/2.webp', w: 246, h: 308, cx: 0.4939, cy: 0.4968, span: 262.5, reach: 1.317 } },
  { name: 'Griffin', color: '#2790ff', shape: { path: sphere }, art: { file: 'fantasy/3.webp', w: 242, h: 292, cx: 0.5083, cy: 0.4914, span: 237.5, reach: 1.400 } },
  { name: 'Mermaid tail', color: '#ad4cff', shape: { path: sphere }, art: { file: 'fantasy/4.webp', w: 214, h: 290, cx: 0.4930, cy: 0.4931, span: 219.5, reach: 1.345 } },
  { name: 'Firebird feather', color: '#ff7f25', shape: { path: sphere }, art: { file: 'fantasy/5.webp', w: 218, h: 300, cx: 0.4610, cy: 0.5050, span: 239, reach: 1.425 } },
  { name: 'Fairy', color: '#5dfffa', shape: { path: sphere }, art: { file: 'fantasy/6.webp', w: 224, h: 288, cx: 0.4777, cy: 0.5052, span: 229.5, reach: 1.407 } },
  { name: 'Sphinx', color: '#ffba21', shape: { path: sphere }, art: { file: 'fantasy/7.webp', w: 240, h: 300, cx: 0.5000, cy: 0.4933, span: 239, reach: 1.310 } },
];

const FLOWERS_ART: readonly Rung[] = [
  { name: 'Rose', color: '#ff76bc', shape: { path: sphere }, art: { file: 'flowers/0.webp', w: 274, h: 324, cx: 0.4982, cy: 0.4969, span: 281.5, reach: 1.145 } },
  { name: 'Sunflower', color: '#ffbf20', shape: { path: sphere }, art: { file: 'flowers/1.webp', w: 288, h: 340, cx: 0.4983, cy: 0.4897, span: 297, reach: 1.049 } },
  { name: 'Tulip', color: '#b969ff', shape: { path: sphere }, art: { file: 'flowers/2.webp', w: 214, h: 334, cx: 0.5047, cy: 0.5060, span: 253, reach: 1.253 } },
  { name: 'Hydrangea', color: '#4296ff', shape: { path: sphere }, art: { file: 'flowers/3.webp', w: 288, h: 340, cx: 0.5017, cy: 0.4897, span: 293, reach: 1.096 } },
  { name: 'Gerbera', color: '#ff831b', shape: { path: sphere }, art: { file: 'flowers/4.webp', w: 272, h: 326, cx: 0.4982, cy: 0.4985, span: 279, reach: 1.054 } },
  { name: 'Poppy', color: '#ff373a', shape: { path: sphere }, art: { file: 'flowers/5.webp', w: 274, h: 332, cx: 0.5000, cy: 0.5045, span: 284.5, reach: 1.126 } },
  { name: 'Orchid', color: '#3ce0ff', shape: { path: sphere }, art: { file: 'flowers/6.webp', w: 284, h: 330, cx: 0.5018, cy: 0.4924, span: 288, reach: 1.234 } },
  { name: 'Lily', color: '#fffbeb', shape: { path: sphere }, art: { file: 'flowers/7.webp', w: 290, h: 352, cx: 0.5017, cy: 0.5014, span: 307, reach: 1.080 } },
];

const TROPICAL_ART: readonly Rung[] = [
  { name: 'Mango', color: '#ffd423', shape: { path: sphere }, art: { file: 'tropical/0.webp', w: 238, h: 340, cx: 0.5021, cy: 0.4941, span: 271.5, reach: 1.244 } },
  { name: 'Kiwi', color: '#d9ff52', shape: { path: sphere }, art: { file: 'tropical/1.webp', w: 252, h: 310, cx: 0.5020, cy: 0.4952, span: 261, reach: 1.071 } },
  { name: 'Papaya', color: '#ff7e19', shape: { path: sphere }, art: { file: 'tropical/2.webp', w: 274, h: 336, cx: 0.4982, cy: 0.4970, span: 286.5, reach: 1.294 } },
  { name: 'Dragon fruit', color: '#ff6791', shape: { path: sphere }, art: { file: 'tropical/3.webp', w: 252, h: 370, cx: 0.5020, cy: 0.4932, span: 298, reach: 1.251 } },
  { name: 'Passion fruit', color: '#ffafb6', shape: { path: sphere }, art: { file: 'tropical/4.webp', w: 266, h: 314, cx: 0.5019, cy: 0.5016, span: 270, reach: 1.097 } },
  { name: 'Lychee', color: '#ff4550', shape: { path: sphere }, art: { file: 'tropical/5.webp', w: 250, h: 316, cx: 0.5020, cy: 0.4968, span: 263.5, reach: 1.086 } },
  { name: 'Coconut', color: '#73fffb', shape: { path: sphere }, art: { file: 'tropical/6.webp', w: 274, h: 320, cx: 0.5018, cy: 0.5031, span: 279.5, reach: 1.080 } },
  { name: 'Pineapple', color: '#ffc52c', shape: { path: sphere }, art: { file: 'tropical/7.webp', w: 238, h: 428, cx: 0.5021, cy: 0.5000, span: 317.5, reach: 1.285 } },
];

const CANDY_ART: readonly Rung[] = [
  { name: 'Peppermint', color: '#ff7d84', shape: { path: sphere }, art: { file: 'candy/0.webp', w: 264, h: 292, cx: 0.5019, cy: 0.4914, span: 267, reach: 1.028 } },
  { name: 'Gumball', color: '#2a97ff', shape: { path: sphere }, art: { file: 'candy/1.webp', w: 250, h: 282, cx: 0.5040, cy: 0.4787, span: 252, reach: 1.065 } },
  { name: 'Lemon drop', color: '#ffda2c', shape: { path: sphere }, art: { file: 'candy/2.webp', w: 266, h: 258, cx: 0.5038, cy: 0.4864, span: 249.5, reach: 1.073 } },
  { name: 'Apple sweet', color: '#9bff3e', shape: { path: sphere }, art: { file: 'candy/3.webp', w: 254, h: 308, cx: 0.5039, cy: 0.4854, span: 269.5, reach: 1.237 } },
  { name: 'Grapes', color: '#be5bff', shape: { path: sphere }, art: { file: 'candy/4.webp', w: 254, h: 296, cx: 0.5020, cy: 0.4865, span: 263.5, reach: 1.191 } },
  { name: 'Orange swirl', color: '#ff9648', shape: { path: sphere }, art: { file: 'candy/5.webp', w: 258, h: 288, cx: 0.5039, cy: 0.4878, span: 260.5, reach: 1.086 } },
  { name: 'Heart', color: '#ff72a8', shape: { path: sphere }, art: { file: 'candy/6.webp', w: 262, h: 270, cx: 0.5019, cy: 0.4833, span: 253, reach: 1.180 } },
  { name: 'Star', color: '#2ee3ff', shape: { path: sphere }, art: { file: 'candy/7.webp', w: 270, h: 288, cx: 0.5037, cy: 0.4809, span: 266.5, reach: 1.165 } },
];

const HATS_ART: readonly Rung[] = [
  { name: 'Cap', color: '#ff2e30', shape: { path: sphere }, art: { file: 'hats/0.webp', w: 278, h: 308, cx: 0.5036, cy: 0.5081, span: 272.5, reach: 1.216 } },
  { name: 'Wizard hat', color: '#257eff', shape: { path: sphere }, art: { file: 'hats/1.webp', w: 276, h: 364, cx: 0.5036, cy: 0.5014, span: 299.5, reach: 1.221 } },
  { name: 'Top hat', color: '#ffd31a', shape: { path: sphere }, art: { file: 'hats/2.webp', w: 254, h: 314, cx: 0.5020, cy: 0.5143, span: 264, reach: 1.176 } },
  { name: 'Beret', color: '#59ff36', shape: { path: sphere }, art: { file: 'hats/3.webp', w: 260, h: 248, cx: 0.5019, cy: 0.5141, span: 238, reach: 1.179 } },
  { name: 'Crown', color: '#b040ff', shape: { path: sphere }, art: { file: 'hats/4.webp', w: 276, h: 294, cx: 0.5000, cy: 0.5017, span: 267.5, reach: 1.145 } },
  { name: 'Cowboy hat', color: '#ff7726', shape: { path: sphere }, art: { file: 'hats/5.webp', w: 306, h: 300, cx: 0.5016, cy: 0.5067, span: 283.5, reach: 1.136 } },
  { name: 'Party hat', color: '#34ebff', shape: { path: sphere }, art: { file: 'hats/6.webp', w: 202, h: 370, cx: 0.5050, cy: 0.4946, span: 268, reach: 1.317 } },
  { name: 'Sun hat', color: '#ff41ae', shape: { path: sphere }, art: { file: 'hats/7.webp', w: 340, h: 298, cx: 0.5015, cy: 0.5134, span: 300.5, reach: 1.195 } },
];

const MONSTERS_ART: readonly Rung[] = [
  { name: 'Cyclops', color: '#3588ff', shape: { path: sphere }, art: { file: 'monsters/0.webp', w: 284, h: 332, cx: 0.4912, cy: 0.4895, span: 278, reach: 1.222 } },
  { name: 'Fluffball', color: '#ff97bd', shape: { path: sphere }, art: { file: 'monsters/1.webp', w: 268, h: 362, cx: 0.5000, cy: 0.5014, span: 290.5, reach: 1.282 } },
  { name: 'Spikeball', color: '#ffd02b', shape: { path: sphere }, art: { file: 'monsters/2.webp', w: 294, h: 336, cx: 0.5034, cy: 0.4955, span: 297.5, reach: 1.141 } },
  { name: 'Blob', color: '#76ff3e', shape: { path: sphere }, art: { file: 'monsters/3.webp', w: 290, h: 312, cx: 0.4914, cy: 0.4952, span: 282, reach: 1.191 } },
  { name: 'Fangs', color: '#a142ff', shape: { path: sphere }, art: { file: 'monsters/4.webp', w: 280, h: 340, cx: 0.4946, cy: 0.5029, span: 286.5, reach: 1.300 } },
  { name: 'Antennae', color: '#ff8b24', shape: { path: sphere }, art: { file: 'monsters/5.webp', w: 266, h: 344, cx: 0.4981, cy: 0.5000, span: 282.5, reach: 1.284 } },
  { name: 'Squidlet', color: '#39f8ff', shape: { path: sphere }, art: { file: 'monsters/6.webp', w: 236, h: 344, cx: 0.5169, cy: 0.5000, span: 272, reach: 1.340 } },
  { name: 'Imp', color: '#ff292d', shape: { path: sphere }, art: { file: 'monsters/7.webp', w: 380, h: 332, cx: 0.5013, cy: 0.5000, span: 342.5, reach: 1.126 } },
];

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
  vehicles: { key: 'vehicles', label: 'Vehicles', ladder: VEHICLES_ART },
  dessert: { key: 'dessert', label: 'Dessert', ladder: DESSERT_ART },
  tools: { key: 'tools', label: 'Tools', ladder: TOOLS_ART },
  sealife: { key: 'sealife', label: 'Ocean life', ladder: SEALIFE_ART },
  mythology: { key: 'mythology', label: 'Mythology', ladder: MYTHOLOGY_ART },
  dinosaurs: { key: 'dinosaurs', label: 'Dinosaurs', ladder: DINOSAURS_ART },
  music: { key: 'music', label: 'Music', ladder: MUSIC_ART },
  sports: { key: 'sports', label: 'Sports', ladder: SPORTS_ART },
  space: { key: 'space', label: 'Space', ladder: SPACE_ART },
  fantasy: { key: 'fantasy', label: 'Fantasy', ladder: FANTASY_ART },
  flowers: { key: 'flowers', label: 'Flowers', ladder: FLOWERS_ART },
  tropical: { key: 'tropical', label: 'Tropical', ladder: TROPICAL_ART },
  candy: { key: 'candy', label: 'Candy', ladder: CANDY_ART },
  hats: { key: 'hats', label: 'Hats', ladder: HATS_ART },
  monsters: { key: 'monsters', label: 'Monsters', ladder: MONSTERS_ART },
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
  'vehicles',
  'dessert',
  'tools',
  'sealife',
  'mythology',
  'dinosaurs',
  'music',
  'sports',
  'space',
  'fantasy',
  'flowers',
  'tropical',
  'candy',
  'hats',
  'monsters',
];

/** The theme a video is dressed in, defaulting to the one the references open with. */
export const themeFor = (name?: ThemeName): Theme => THEMES[name ?? 'fruit'];
