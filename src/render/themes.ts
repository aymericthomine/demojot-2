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
  | 'monsters'
  | 'instruments'
  | 'solar';

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
  { name: 'Blueberry', color: '#2a6fff', art: { file: 'fruit/0.webp', w: 228, h: 226, cx: 0.5066, cy: 0.4889, span: 209, reach: 1.051 } },
  { name: 'Strawberry', color: '#ff4126', art: { file: 'fruit/1.webp', w: 210, h: 250, cx: 0.5024, cy: 0.4940, span: 218, reach: 1.127 } },
  { name: 'Blackberry', color: '#714aff', art: { file: 'fruit/2.webp', w: 214, h: 218, cx: 0.5000, cy: 0.4885, span: 202.5, reach: 1.114 } },
  { name: 'Lemon', color: '#ffe020', art: { file: 'fruit/3.webp', w: 192, h: 242, cx: 0.4974, cy: 0.4917, span: 203.5, reach: 1.275 } },
  { name: 'Orange', color: '#ffb12e', art: { file: 'fruit/4.webp', w: 238, h: 246, cx: 0.5084, cy: 0.4980, span: 220.5, reach: 1.027 } },
  { name: 'Pear', color: '#d1ff2e', art: { file: 'fruit/5.webp', w: 200, h: 264, cx: 0.5075, cy: 0.4962, span: 220.5, reach: 1.171 } },
  { name: 'Apple', color: '#ff2e1d', art: { file: 'fruit/6.webp', w: 226, h: 246, cx: 0.4978, cy: 0.4939, span: 223, reach: 1.204 } },
  { name: 'Pineapple', color: '#ffb91e', art: { file: 'fruit/7.webp', w: 192, h: 304, cx: 0.4974, cy: 0.4951, span: 235, reach: 1.260 } },
];

const PLANETS_ART: readonly Rung[] = [
  { name: 'Moon', color: '#ffeee8', art: { file: 'planets/0.webp', w: 212, h: 222, cx: 0.5047, cy: 0.4977, span: 202.5, reach: 1.023 } },
  { name: 'Mars', color: '#ff3f28', art: { file: 'planets/1.webp', w: 210, h: 216, cx: 0.4976, cy: 0.4977, span: 201, reach: 1.025 } },
  { name: 'Saturn', color: '#ffb43f', art: { file: 'planets/2.webp', w: 292, h: 208, cx: 0.4983, cy: 0.4928, span: 237, reach: 1.289 } },
  { name: 'Earth', color: '#6bdfff', art: { file: 'planets/3.webp', w: 220, h: 230, cx: 0.5023, cy: 0.4935, span: 209, reach: 1.027 } },
  { name: 'Neptune', color: '#1d72ff', art: { file: 'planets/4.webp', w: 218, h: 228, cx: 0.5046, cy: 0.4934, span: 206.5, reach: 1.025 } },
  { name: 'Jupiter', color: '#ffca8e', art: { file: 'planets/5.webp', w: 222, h: 222, cx: 0.5023, cy: 0.4977, span: 211, reach: 1.025 } },
  { name: 'Venus', color: '#ff8727', art: { file: 'planets/6.webp', w: 222, h: 224, cx: 0.4977, cy: 0.4978, span: 209, reach: 1.019 } },
  { name: 'Sun', color: '#ffc31c', art: { file: 'planets/7.webp', w: 260, h: 262, cx: 0.4981, cy: 0.4981, span: 245, reach: 1.001 } },
];

const GEMS_ART: readonly Rung[] = [
  { name: 'Pearl', color: '#ffebe5', art: { file: 'gems/0.webp', w: 200, h: 208, cx: 0.5025, cy: 0.4976, span: 189, reach: 1.019 } },
  { name: 'Emerald', color: '#2cff61', art: { file: 'gems/1.webp', w: 190, h: 212, cx: 0.5000, cy: 0.4882, span: 188.5, reach: 1.146 } },
  { name: 'Ruby', color: '#ff2b6d', art: { file: 'gems/2.webp', w: 228, h: 220, cx: 0.5022, cy: 0.4932, span: 210, reach: 1.146 } },
  { name: 'Topaz', color: '#ff9e25', art: { file: 'gems/3.webp', w: 192, h: 256, cx: 0.4870, cy: 0.4863, span: 205, reach: 1.237 } },
  { name: 'Amethyst', color: '#ae49ff', art: { file: 'gems/4.webp', w: 206, h: 250, cx: 0.4927, cy: 0.4860, span: 210, reach: 1.110 } },
  { name: 'Sapphire', color: '#2354ff', art: { file: 'gems/5.webp', w: 214, h: 216, cx: 0.4930, cy: 0.4838, span: 195, reach: 1.204 } },
  { name: 'Peridot', color: '#37ff55', art: { file: 'gems/6.webp', w: 206, h: 214, cx: 0.4927, cy: 0.4790, span: 197, reach: 1.097 } },
  { name: 'Diamond', color: '#71bcff', art: { file: 'gems/7.webp', w: 232, h: 220, cx: 0.4978, cy: 0.4886, span: 208, reach: 1.089 } },
];

const SWEETS_ART: readonly Rung[] = [
  { name: 'Cookie', color: '#ffa33b', art: { file: 'sweets/0.webp', w: 218, h: 216, cx: 0.5000, cy: 0.4931, span: 206.5, reach: 1.010 } },
  { name: 'Jelly bean', color: '#a840ff', art: { file: 'sweets/1.webp', w: 212, h: 224, cx: 0.4976, cy: 0.4866, span: 200.5, reach: 1.184 } },
  { name: 'Lollipop', color: '#ffc3c0', art: { file: 'sweets/2.webp', w: 202, h: 256, cx: 0.5000, cy: 0.5059, span: 216.5, reach: 1.382 } },
  { name: 'Marshmallow', color: '#ffa9c3', art: { file: 'sweets/3.webp', w: 196, h: 218, cx: 0.5000, cy: 0.4931, span: 188.5, reach: 1.175 } },
  { name: 'Cupcake', color: '#ff9ea5', art: { file: 'sweets/4.webp', w: 212, h: 258, cx: 0.5000, cy: 0.4903, span: 222.5, reach: 1.114 } },
  { name: 'Ice cream', color: '#ffca85', art: { file: 'sweets/5.webp', w: 154, h: 272, cx: 0.4903, cy: 0.4982, span: 204, reach: 1.292 } },
  { name: 'Donut', color: '#ff6c7e', art: { file: 'sweets/6.webp', w: 244, h: 236, cx: 0.5020, cy: 0.4936, span: 226, reach: 1.026 } },
  { name: 'Gumball', color: '#ffaf2e', art: { file: 'sweets/7.webp', w: 216, h: 224, cx: 0.4977, cy: 0.4978, span: 202, reach: 1.019 } },
];

const OCEAN_ART: readonly Rung[] = [
  { name: 'Clownfish', color: '#ff8846', art: { file: 'ocean/0.webp', w: 212, h: 204, cx: 0.4906, cy: 0.4828, span: 193.5, reach: 1.090 } },
  { name: 'Starfish', color: '#ffbe35', art: { file: 'ocean/1.webp', w: 236, h: 240, cx: 0.5000, cy: 0.5021, span: 222.5, reach: 1.201 } },
  { name: 'Pufferfish', color: '#ffc72c', art: { file: 'ocean/2.webp', w: 244, h: 220, cx: 0.5000, cy: 0.5000, span: 222, reach: 1.058 } },
  { name: 'Jellyfish', color: '#3aefff', art: { file: 'ocean/3.webp', w: 206, h: 256, cx: 0.5073, cy: 0.5039, span: 218.5, reach: 1.184 } },
  { name: 'Pink jellyfish', color: '#ff42a9', art: { file: 'ocean/4.webp', w: 220, h: 262, cx: 0.4932, cy: 0.4981, span: 228, reach: 1.146 } },
  { name: 'Sea urchin', color: '#ffe187', art: { file: 'ocean/5.webp', w: 220, h: 214, cx: 0.4977, cy: 0.4486, span: 196.5, reach: 1.243 } },
  { name: 'Sea jelly', color: '#a343ff', art: { file: 'ocean/6.webp', w: 230, h: 252, cx: 0.4891, cy: 0.4881, span: 222.5, reach: 1.256 } },
  { name: 'Blue tang', color: '#47aaff', art: { file: 'ocean/7.webp', w: 282, h: 228, cx: 0.5035, cy: 0.4978, span: 244.5, reach: 1.194 } },
];

const ANIMALS_ART: readonly Rung[] = [
  { name: 'Fox', color: '#ff863d', shape: { path: sphere }, art: { file: 'animals/0.webp', w: 230, h: 216, cx: 0.4891, cy: 0.4931, span: 208, reach: 1.280 } },
  { name: 'Rabbit', color: '#ff89a9', shape: { path: sphere }, art: { file: 'animals/1.webp', w: 186, h: 250, cx: 0.4866, cy: 0.4940, span: 199, reach: 1.315 } },
  { name: 'Chick', color: '#ffc61a', shape: { path: sphere }, art: { file: 'animals/2.webp', w: 196, h: 202, cx: 0.5026, cy: 0.4876, span: 180, reach: 1.086 } },
  { name: 'Frog', color: '#80ff33', shape: { path: sphere }, art: { file: 'animals/3.webp', w: 210, h: 194, cx: 0.5024, cy: 0.4871, span: 187, reach: 1.188 } },
  { name: 'Cat', color: '#c067ff', shape: { path: sphere }, art: { file: 'animals/4.webp', w: 210, h: 206, cx: 0.5000, cy: 0.4879, span: 195.5, reach: 1.307 } },
  { name: 'Whale', color: '#269eff', shape: { path: sphere }, art: { file: 'animals/5.webp', w: 270, h: 248, cx: 0.5019, cy: 0.4940, span: 239, reach: 1.132 } },
  { name: 'Red panda', color: '#ff8772', shape: { path: sphere }, art: { file: 'animals/6.webp', w: 222, h: 200, cx: 0.5000, cy: 0.4850, span: 199, reach: 1.340 } },
  { name: 'Lion', color: '#ffb527', shape: { path: sphere }, art: { file: 'animals/7.webp', w: 230, h: 240, cx: 0.5000, cy: 0.5062, span: 222.5, reach: 1.157 } },
];

const VEGETABLES_ART: readonly Rung[] = [
  { name: 'Tomato', color: '#ff3521', shape: { path: sphere }, art: { file: 'vegetables/0.webp', w: 218, h: 224, cx: 0.4977, cy: 0.4799, span: 207, reach: 1.056 } },
  { name: 'Carrot', color: '#ff931e', shape: { path: sphere }, art: { file: 'vegetables/1.webp', w: 198, h: 250, cx: 0.5076, cy: 0.4860, span: 209, reach: 1.356 } },
  { name: 'Broccoli', color: '#74ff4e', shape: { path: sphere }, art: { file: 'vegetables/2.webp', w: 214, h: 160, cx: 0.4883, cy: 0.4906, span: 174, reach: 1.290 } },
  { name: 'Aubergine', color: '#da99ff', shape: { path: sphere }, art: { file: 'vegetables/3.webp', w: 184, h: 260, cx: 0.5027, cy: 0.4942, span: 210, reach: 1.356 } },
  { name: 'Corn', color: '#ffeb21', shape: { path: sphere }, art: { file: 'vegetables/4.webp', w: 192, h: 250, cx: 0.4922, cy: 0.5000, span: 208.5, reach: 1.165 } },
  { name: 'Chilli', color: '#ff4029', shape: { path: sphere }, art: { file: 'vegetables/5.webp', w: 212, h: 248, cx: 0.4976, cy: 0.4859, span: 217, reach: 1.285 } },
  { name: 'Cucumber', color: '#84ff53', shape: { path: sphere }, art: { file: 'vegetables/6.webp', w: 204, h: 262, cx: 0.4975, cy: 0.4943, span: 222, reach: 1.328 } },
  { name: 'Garlic', color: '#ffe9e6', shape: { path: sphere }, art: { file: 'vegetables/7.webp', w: 212, h: 228, cx: 0.4976, cy: 0.4825, span: 208.5, reach: 1.130 } },
];

const MAGIC_ART: readonly Rung[] = [
  { name: 'Crystal ball', color: '#e570ff', shape: { path: sphere }, art: { file: 'magic/0.webp', w: 200, h: 250, cx: 0.5025, cy: 0.4860, span: 211, reach: 1.167 } },
  { name: 'Wand', color: '#ffc431', shape: { path: sphere }, art: { file: 'magic/1.webp', w: 184, h: 258, cx: 0.4973, cy: 0.4981, span: 203, reach: 1.365 } },
  { name: 'Potion', color: '#4fb9ff', shape: { path: sphere }, art: { file: 'magic/2.webp', w: 182, h: 262, cx: 0.4863, cy: 0.4905, span: 204, reach: 1.236 } },
  { name: 'Fairy wings', color: '#ff75cd', shape: { path: sphere }, art: { file: 'magic/3.webp', w: 262, h: 254, cx: 0.4905, cy: 0.4941, span: 241, reach: 1.339 } },
  { name: 'Spell book', color: '#dfff56', shape: { path: sphere }, art: { file: 'magic/4.webp', w: 222, h: 246, cx: 0.4932, cy: 0.4837, span: 221.5, reach: 1.221 } },
  { name: 'Flame', color: '#ff831b', shape: { path: sphere }, art: { file: 'magic/5.webp', w: 212, h: 272, cx: 0.4976, cy: 0.4908, span: 221, reach: 1.309 } },
  { name: 'Wizard hat', color: '#1a9bff', shape: { path: sphere }, art: { file: 'magic/6.webp', w: 264, h: 244, cx: 0.4981, cy: 0.4857, span: 235, reach: 1.190 } },
  { name: 'Unicorn horn', color: '#ffd8c2', shape: { path: sphere }, art: { file: 'magic/7.webp', w: 188, h: 262, cx: 0.5027, cy: 0.4905, span: 206, reach: 1.402 } },
];

const INSECTS_ART: readonly Rung[] = [
  { name: 'Butterfly', color: '#ffbd1c', shape: { path: sphere }, art: { file: 'insects/0.webp', w: 260, h: 234, cx: 0.4962, cy: 0.4915, span: 227, reach: 1.337 } },
  { name: 'Ladybird', color: '#ff3226', shape: { path: sphere }, art: { file: 'insects/1.webp', w: 184, h: 180, cx: 0.4701, cy: 0.5222, span: 160.5, reach: 1.204 } },
  { name: 'Caterpillar', color: '#89ff2e', shape: { path: sphere }, art: { file: 'insects/2.webp', w: 230, h: 152, cx: 0.5022, cy: 0.4901, span: 181, reach: 1.359 } },
  { name: 'Dragonfly', color: '#37a5ff', shape: { path: sphere }, art: { file: 'insects/3.webp', w: 272, h: 240, cx: 0.4982, cy: 0.4938, span: 241, reach: 1.361 } },
  { name: 'Bee', color: '#c95fff', shape: { path: sphere }, art: { file: 'insects/4.webp', w: 198, h: 218, cx: 0.4975, cy: 0.4931, span: 195, reach: 1.251 } },
  { name: 'Ant', color: '#ff6121', shape: { path: sphere }, art: { file: 'insects/5.webp', w: 242, h: 226, cx: 0.4979, cy: 0.4978, span: 222, reach: 1.361 } },
  { name: 'Firefly', color: '#ff86ba', shape: { path: sphere }, art: { file: 'insects/6.webp', w: 232, h: 248, cx: 0.5065, cy: 0.4819, span: 226, reach: 1.159 } },
  { name: 'Mantis', color: '#33ffee', shape: { path: sphere }, art: { file: 'insects/7.webp', w: 246, h: 268, cx: 0.4959, cy: 0.4963, span: 246, reach: 1.263 } },
];

const WEATHER_ART: readonly Rung[] = [
  { name: 'Cloud', color: '#f3edff', shape: { path: sphere }, art: { file: 'weather/0.webp', w: 244, h: 188, cx: 0.5000, cy: 0.5080, span: 205.5, reach: 1.218 } },
  { name: 'Lightning', color: '#ffca23', shape: { path: sphere }, art: { file: 'weather/1.webp', w: 150, h: 228, cx: 0.5033, cy: 0.4978, span: 170, reach: 1.360 } },
  { name: 'Raindrop', color: '#2aa5ff', shape: { path: sphere }, art: { file: 'weather/2.webp', w: 160, h: 240, cx: 0.4844, cy: 0.4875, span: 179.5, reach: 1.245 } },
  { name: 'Sun', color: '#ff8d17', shape: { path: sphere }, art: { file: 'weather/3.webp', w: 242, h: 250, cx: 0.4938, cy: 0.4980, span: 229, reach: 1.027 } },
  { name: 'Tornado', color: '#c04fff', shape: { path: sphere }, art: { file: 'weather/4.webp', w: 224, h: 262, cx: 0.4933, cy: 0.4924, span: 224.5, reach: 1.198 } },
  { name: 'Snowflake', color: '#39ccff', shape: { path: sphere }, art: { file: 'weather/5.webp', w: 204, h: 238, cx: 0.4975, cy: 0.4916, span: 203.5, reach: 1.082 } },
  { name: 'Rainbow', color: '#ffb490', shape: { path: sphere }, art: { file: 'weather/6.webp', w: 280, h: 200, cx: 0.4982, cy: 0.4925, span: 221, reach: 1.380 } },
  { name: 'Storm cloud', color: '#2474ff', shape: { path: sphere }, art: { file: 'weather/7.webp', w: 244, h: 250, cx: 0.4980, cy: 0.4960, span: 235.5, reach: 1.062 } },
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
  { name: 'Sports car', color: '#ff3636', shape: { path: sphere }, art: { file: 'vehicles/0.webp', w: 296, h: 168, cx: 0.5000, cy: 0.4970, span: 218.5, reach: 1.365 } },
  { name: 'Saloon', color: '#408fff', shape: { path: sphere }, art: { file: 'vehicles/1.webp', w: 276, h: 176, cx: 0.5018, cy: 0.4972, span: 213, reach: 1.328 } },
  { name: 'School bus', color: '#ffc025', shape: { path: sphere }, art: { file: 'vehicles/2.webp', w: 262, h: 198, cx: 0.4981, cy: 0.4722, span: 213, reach: 1.339 } },
  { name: 'Tractor', color: '#97ff61', shape: { path: sphere }, art: { file: 'vehicles/3.webp', w: 182, h: 184, cx: 0.5000, cy: 0.4918, span: 161.5, reach: 1.242 } },
  { name: 'Motorbike', color: '#bd4cff', shape: { path: sphere }, art: { file: 'vehicles/4.webp', w: 218, h: 182, cx: 0.5023, cy: 0.4808, span: 186, reach: 1.199 } },
  { name: 'Helicopter', color: '#48ceff', shape: { path: sphere }, art: { file: 'vehicles/5.webp', w: 264, h: 216, cx: 0.4981, cy: 0.4931, span: 229, reach: 1.311 } },
  { name: 'Aeroplane', color: '#ff7f20', shape: { path: sphere }, art: { file: 'vehicles/6.webp', w: 282, h: 186, cx: 0.4982, cy: 0.4946, span: 219.5, reach: 1.382 } },
  { name: 'Hot-air balloon', color: '#ff519f', shape: { path: sphere }, art: { file: 'vehicles/7.webp', w: 196, h: 264, cx: 0.4923, cy: 0.5019, span: 214, reach: 1.182 } },
];

const DESSERT_ART: readonly Rung[] = [
  { name: 'Chocolate cake', color: '#ff9278', shape: { path: sphere }, art: { file: 'dessert/0.webp', w: 228, h: 206, cx: 0.4912, cy: 0.4587, span: 199.5, reach: 1.283 } },
  { name: 'Ice cream', color: '#ff6e6c', shape: { path: sphere }, art: { file: 'dessert/1.webp', w: 198, h: 262, cx: 0.4924, cy: 0.4981, span: 213, reach: 1.313 } },
  { name: 'Lemon tart', color: '#ffb934', shape: { path: sphere }, art: { file: 'dessert/2.webp', w: 256, h: 202, cx: 0.4980, cy: 0.5050, span: 216.5, reach: 1.150 } },
  { name: 'Macaron', color: '#ff5d81', shape: { path: sphere }, art: { file: 'dessert/3.webp', w: 220, h: 202, cx: 0.4932, cy: 0.5000, span: 195.5, reach: 1.100 } },
  { name: 'Blueberry muffin', color: '#60a3ff', shape: { path: sphere }, art: { file: 'dessert/4.webp', w: 222, h: 230, cx: 0.4955, cy: 0.5000, span: 215, reach: 1.050 } },
  { name: 'Creme brulee', color: '#ff7e25', shape: { path: sphere }, art: { file: 'dessert/5.webp', w: 250, h: 220, cx: 0.4940, cy: 0.4955, span: 223.5, reach: 1.130 } },
  { name: 'Cupcake', color: '#ea5bff', shape: { path: sphere }, art: { file: 'dessert/6.webp', w: 216, h: 252, cx: 0.4977, cy: 0.4960, span: 222.5, reach: 1.111 } },
  { name: 'Meringue', color: '#fff4e8', shape: { path: sphere }, art: { file: 'dessert/7.webp', w: 224, h: 228, cx: 0.4888, cy: 0.4934, span: 215, reach: 1.124 } },
];

const TOOLS_ART: readonly Rung[] = [
  { name: 'Hammer', color: '#ffb732', shape: { path: sphere }, art: { file: 'tools/0.webp', w: 202, h: 222, cx: 0.4975, cy: 0.5113, span: 195, reach: 1.264 } },
  { name: 'Spanner', color: '#fbfaff', shape: { path: sphere }, art: { file: 'tools/1.webp', w: 224, h: 238, cx: 0.4955, cy: 0.4853, span: 218.5, reach: 1.353 } },
  { name: 'Screwdriver', color: '#4790ff', shape: { path: sphere }, art: { file: 'tools/2.webp', w: 224, h: 254, cx: 0.5045, cy: 0.4921, span: 227, reach: 1.368 } },
  { name: 'Pliers', color: '#ff6666', shape: { path: sphere }, art: { file: 'tools/3.webp', w: 220, h: 260, cx: 0.5068, cy: 0.4942, span: 229, reach: 1.338 } },
  { name: 'Handsaw', color: '#6aff43', shape: { path: sphere }, art: { file: 'tools/4.webp', w: 280, h: 220, cx: 0.4982, cy: 0.4932, span: 239, reach: 1.325 } },
  { name: 'Drill', color: '#ff6216', shape: { path: sphere }, art: { file: 'tools/5.webp', w: 208, h: 230, cx: 0.5962, cy: 0.4891, span: 184.5, reach: 1.280 } },
  { name: 'Paintbrush', color: '#c357ff', shape: { path: sphere }, art: { file: 'tools/6.webp', w: 236, h: 246, cx: 0.5000, cy: 0.4980, span: 225.5, reach: 1.365 } },
  { name: 'Tape measure', color: '#71efff', shape: { path: sphere }, art: { file: 'tools/7.webp', w: 256, h: 216, cx: 0.5020, cy: 0.5023, span: 225, reach: 1.350 } },
];

const SEALIFE_ART: readonly Rung[] = [
  { name: 'Seahorse', color: '#ff9120', shape: { path: sphere }, art: { file: 'sealife/0.webp', w: 156, h: 234, cx: 0.4968, cy: 0.4979, span: 183, reach: 1.230 } },
  { name: 'Dolphin', color: '#3096ff', shape: { path: sphere }, art: { file: 'sealife/1.webp', w: 292, h: 228, cx: 0.5017, cy: 0.5044, span: 245.5, reach: 1.393 } },
  { name: 'Crab', color: '#ffbf1d', shape: { path: sphere }, art: { file: 'sealife/2.webp', w: 254, h: 226, cx: 0.4980, cy: 0.4934, span: 225, reach: 1.203 } },
  { name: 'Octopus', color: '#be45ff', shape: { path: sphere }, art: { file: 'sealife/3.webp', w: 278, h: 254, cx: 0.5000, cy: 0.4961, span: 253, reach: 1.153 } },
  { name: 'Turtle', color: '#77ff43', shape: { path: sphere }, art: { file: 'sealife/4.webp', w: 292, h: 200, cx: 0.4966, cy: 0.4925, span: 235.5, reach: 1.295 } },
  { name: 'Coral', color: '#ff4791', shape: { path: sphere }, art: { file: 'sealife/5.webp', w: 224, h: 258, cx: 0.5000, cy: 0.4922, span: 226, reach: 1.083 } },
  { name: 'Shark', color: '#3fcdff', shape: { path: sphere }, art: { file: 'sealife/6.webp', w: 294, h: 216, cx: 0.4983, cy: 0.5046, span: 241.5, reach: 1.355 } },
  { name: 'Lobster', color: '#ff2c29', shape: { path: sphere }, art: { file: 'sealife/7.webp', w: 300, h: 250, cx: 0.4983, cy: 0.4940, span: 262, reach: 1.176 } },
];

const MYTHOLOGY_ART: readonly Rung[] = [
  { name: 'Thunderbolt', color: '#ffb927', shape: { path: sphere }, art: { file: 'mythology/0.webp', w: 166, h: 246, cx: 0.4970, cy: 0.5020, span: 189, reach: 1.420 } },
  { name: 'Trident', color: '#45c1ff', shape: { path: sphere }, art: { file: 'mythology/1.webp', w: 214, h: 300, cx: 0.4883, cy: 0.4983, span: 241, reach: 1.375 } },
  { name: 'Helmet', color: '#ff3d3c', shape: { path: sphere }, art: { file: 'mythology/2.webp', w: 210, h: 254, cx: 0.4976, cy: 0.4980, span: 220, reach: 1.228 } },
  { name: 'Owl', color: '#b248ff', shape: { path: sphere }, art: { file: 'mythology/3.webp', w: 200, h: 272, cx: 0.4975, cy: 0.4982, span: 224, reach: 1.347 } },
  { name: 'Medusa', color: '#6aff41', shape: { path: sphere }, art: { file: 'mythology/4.webp', w: 260, h: 272, cx: 0.4981, cy: 0.5000, span: 253.5, reach: 1.098 } },
  { name: 'Winged sandals', color: '#ff894f', shape: { path: sphere }, art: { file: 'mythology/5.webp', w: 282, h: 252, cx: 0.5000, cy: 0.4881, span: 255, reach: 1.220 } },
  { name: 'Lyre', color: '#33d7ff', shape: { path: sphere }, art: { file: 'mythology/6.webp', w: 216, h: 272, cx: 0.5000, cy: 0.4982, span: 230.5, reach: 1.255 } },
  { name: 'Heart', color: '#ff51bc', shape: { path: sphere }, art: { file: 'mythology/7.webp', w: 254, h: 248, cx: 0.4902, cy: 0.4879, span: 230.5, reach: 1.169 } },
];

const DINOSAURS_ART: readonly Rung[] = [
  { name: 'Tyrannosaur', color: '#7dff2e', shape: { path: sphere }, art: { file: 'dinosaurs/0.webp', w: 224, h: 238, cx: 0.5022, cy: 0.4979, span: 214, reach: 1.166 } },
  { name: 'Triceratops', color: '#26a7ff', shape: { path: sphere }, art: { file: 'dinosaurs/1.webp', w: 246, h: 224, cx: 0.4939, cy: 0.4933, span: 216, reach: 1.289 } },
  { name: 'Stegosaur', color: '#ffd717', shape: { path: sphere }, art: { file: 'dinosaurs/2.webp', w: 264, h: 228, cx: 0.4943, cy: 0.4978, span: 229, reach: 1.199 } },
  { name: 'Pterodactyl', color: '#c23aff', shape: { path: sphere }, art: { file: 'dinosaurs/3.webp', w: 240, h: 210, cx: 0.4854, cy: 0.5024, span: 209, reach: 1.337 } },
  { name: 'Brontosaur', color: '#ff8316', shape: { path: sphere }, art: { file: 'dinosaurs/4.webp', w: 184, h: 272, cx: 0.4810, cy: 0.4982, span: 213, reach: 1.338 } },
  { name: 'Red tyrannosaur', color: '#ff2f32', shape: { path: sphere }, art: { file: 'dinosaurs/5.webp', w: 206, h: 232, cx: 0.4951, cy: 0.4935, span: 205.5, reach: 1.162 } },
  { name: 'Ankylosaur', color: '#2cfff0', shape: { path: sphere }, art: { file: 'dinosaurs/6.webp', w: 268, h: 202, cx: 0.4963, cy: 0.5025, span: 218.5, reach: 1.275 } },
  { name: 'Hatching egg', color: '#ff87a5', shape: { path: sphere }, art: { file: 'dinosaurs/7.webp', w: 192, h: 236, cx: 0.4974, cy: 0.4936, span: 195, reach: 1.134 } },
];

const MUSIC_ART: readonly Rung[] = [
  { name: 'Record', color: '#ffc12b', shape: { path: sphere }, art: { file: 'music/0.webp', w: 212, h: 220, cx: 0.5024, cy: 0.4932, span: 200, reach: 1.026 } },
  { name: 'Guitar', color: '#2db8ff', shape: { path: sphere }, art: { file: 'music/1.webp', w: 242, h: 266, cx: 0.4979, cy: 0.4944, span: 235, reach: 1.369 } },
  { name: 'Microphone', color: '#ff5cb6', shape: { path: sphere }, art: { file: 'music/2.webp', w: 134, h: 244, cx: 0.4925, cy: 0.5020, span: 171.5, reach: 1.338 } },
  { name: 'Drum', color: '#c259ff', shape: { path: sphere }, art: { file: 'music/3.webp', w: 198, h: 202, cx: 0.5051, cy: 0.4975, span: 183.5, reach: 1.273 } },
  { name: 'Keyboard', color: '#ffd671', shape: { path: sphere }, art: { file: 'music/4.webp', w: 224, h: 192, cx: 0.4933, cy: 0.4948, span: 191.5, reach: 1.325 } },
  { name: 'Saxophone', color: '#ff8c18', shape: { path: sphere }, art: { file: 'music/5.webp', w: 210, h: 246, cx: 0.5071, cy: 0.4939, span: 209, reach: 1.220 } },
  { name: 'Headphones', color: '#2de5ff', shape: { path: sphere }, art: { file: 'music/6.webp', w: 216, h: 220, cx: 0.5162, cy: 0.4977, span: 206, reach: 1.237 } },
  { name: 'Music note', color: '#ff3430', shape: { path: sphere }, art: { file: 'music/7.webp', w: 204, h: 230, cx: 0.4951, cy: 0.4978, span: 198.5, reach: 1.343 } },
];

const SPORTS_ART: readonly Rung[] = [
  { name: 'Basketball', color: '#ff601c', shape: { path: sphere }, art: { file: 'sports/0.webp', w: 206, h: 212, cx: 0.5024, cy: 0.4976, span: 190, reach: 1.023 } },
  { name: 'Football', color: '#fff7ec', shape: { path: sphere }, art: { file: 'sports/1.webp', w: 200, h: 204, cx: 0.4925, cy: 0.4951, span: 188.5, reach: 1.021 } },
  { name: 'Tennis ball', color: '#e4ff31', shape: { path: sphere }, art: { file: 'sports/2.webp', w: 198, h: 206, cx: 0.4975, cy: 0.4903, span: 185.5, reach: 1.026 } },
  { name: 'Rugby ball', color: '#ff504c', shape: { path: sphere }, art: { file: 'sports/3.webp', w: 198, h: 210, cx: 0.5076, cy: 0.5000, span: 183.5, reach: 1.292 } },
  { name: 'Baseball', color: '#b4ff38', shape: { path: sphere }, art: { file: 'sports/4.webp', w: 196, h: 212, cx: 0.5102, cy: 0.4929, span: 186.5, reach: 1.083 } },
  { name: 'Volleyball', color: '#2180ff', shape: { path: sphere }, art: { file: 'sports/5.webp', w: 204, h: 216, cx: 0.5025, cy: 0.4931, span: 186, reach: 1.111 } },
  { name: 'Bowling ball', color: '#9136ff', shape: { path: sphere }, art: { file: 'sports/6.webp', w: 208, h: 222, cx: 0.5024, cy: 0.4977, span: 191, reach: 1.120 } },
  { name: 'Hockey puck', color: '#18baff', shape: { path: sphere }, art: { file: 'sports/7.webp', w: 230, h: 190, cx: 0.4913, cy: 0.4947, span: 188, reach: 1.151 } },
];

const SPACE_ART: readonly Rung[] = [
  { name: 'Rocket', color: '#ffedf7', shape: { path: sphere }, art: { file: 'space/0.webp', w: 194, h: 234, cx: 0.4974, cy: 0.5021, span: 201, reach: 1.373 } },
  { name: 'Satellite', color: '#e0fff5', shape: { path: sphere }, art: { file: 'space/1.webp', w: 230, h: 216, cx: 0.5109, cy: 0.4931, span: 211, reach: 1.332 } },
  { name: 'Helmet', color: '#378dff', shape: { path: sphere }, art: { file: 'space/2.webp', w: 200, h: 230, cx: 0.4925, cy: 0.5000, span: 196.5, reach: 1.235 } },
  { name: 'Alien', color: '#aa40ff', shape: { path: sphere }, art: { file: 'space/3.webp', w: 192, h: 232, cx: 0.5104, cy: 0.4978, span: 189.5, reach: 1.157 } },
  { name: 'Comet', color: '#ff701f', shape: { path: sphere }, art: { file: 'space/4.webp', w: 218, h: 234, cx: 0.5069, cy: 0.4915, span: 207.5, reach: 1.409 } },
  { name: 'Flying saucer', color: '#3cd6ff', shape: { path: sphere }, art: { file: 'space/5.webp', w: 226, h: 192, cx: 0.5155, cy: 0.4922, span: 186, reach: 1.229 } },
  { name: 'Space station', color: '#ff58c3', shape: { path: sphere }, art: { file: 'space/6.webp', w: 240, h: 206, cx: 0.5021, cy: 0.4951, span: 202.5, reach: 1.169 } },
  { name: 'Shooting star', color: '#ffcd20', shape: { path: sphere }, art: { file: 'space/7.webp', w: 264, h: 194, cx: 0.4981, cy: 0.4948, span: 210.5, reach: 1.277 } },
];

const FANTASY_ART: readonly Rung[] = [
  { name: 'Dragon', color: '#74ff32', shape: { path: sphere }, art: { file: 'fantasy/0.webp', w: 238, h: 268, cx: 0.4937, cy: 0.4907, span: 242, reach: 1.253 } },
  { name: 'Unicorn', color: '#ffebd9', shape: { path: sphere }, art: { file: 'fantasy/1.webp', w: 226, h: 272, cx: 0.5022, cy: 0.4871, span: 236, reach: 1.404 } },
  { name: 'Phoenix', color: '#ff312d', shape: { path: sphere }, art: { file: 'fantasy/2.webp', w: 258, h: 292, cx: 0.5019, cy: 0.4949, span: 259, reach: 1.317 } },
  { name: 'Griffin', color: '#218bff', shape: { path: sphere }, art: { file: 'fantasy/3.webp', w: 234, h: 274, cx: 0.4979, cy: 0.4945, span: 235, reach: 1.392 } },
  { name: 'Mermaid tail', color: '#a741ff', shape: { path: sphere }, art: { file: 'fantasy/4.webp', w: 192, h: 272, cx: 0.5000, cy: 0.4945, span: 217.5, reach: 1.348 } },
  { name: 'Firebird feather', color: '#ff7920', shape: { path: sphere }, art: { file: 'fantasy/5.webp', w: 218, h: 288, cx: 0.4954, cy: 0.5000, span: 237, reach: 1.410 } },
  { name: 'Fairy', color: '#51fff9', shape: { path: sphere }, art: { file: 'fantasy/6.webp', w: 218, h: 270, cx: 0.4977, cy: 0.5019, span: 229, reach: 1.397 } },
  { name: 'Sphinx', color: '#ffb61b', shape: { path: sphere }, art: { file: 'fantasy/7.webp', w: 224, h: 282, cx: 0.5022, cy: 0.4982, span: 236, reach: 1.311 } },
];

const FLOWERS_ART: readonly Rung[] = [
  { name: 'Rose', color: '#ff70b9', shape: { path: sphere }, art: { file: 'flowers/0.webp', w: 294, h: 304, cx: 0.4949, cy: 0.4967, span: 273.5, reach: 1.134 } },
  { name: 'Sunflower', color: '#ffbe1b', shape: { path: sphere }, art: { file: 'flowers/1.webp', w: 308, h: 320, cx: 0.5114, cy: 0.4953, span: 293, reach: 1.036 } },
  { name: 'Tulip', color: '#b660ff', shape: { path: sphere }, art: { file: 'flowers/2.webp', w: 230, h: 314, cx: 0.4848, cy: 0.4952, span: 246, reach: 1.260 } },
  { name: 'Hydrangea', color: '#388fff', shape: { path: sphere }, art: { file: 'flowers/3.webp', w: 310, h: 322, cx: 0.5048, cy: 0.4953, span: 289, reach: 1.040 } },
  { name: 'Gerbera', color: '#ff7f16', shape: { path: sphere }, art: { file: 'flowers/4.webp', w: 294, h: 302, cx: 0.4762, cy: 0.4983, span: 272.5, reach: 1.046 } },
  { name: 'Poppy', color: '#ff2d30', shape: { path: sphere }, art: { file: 'flowers/5.webp', w: 302, h: 318, cx: 0.5099, cy: 0.4921, span: 277.5, reach: 1.118 } },
  { name: 'Orchid', color: '#32deff', shape: { path: sphere }, art: { file: 'flowers/6.webp', w: 300, h: 310, cx: 0.4917, cy: 0.5016, span: 282, reach: 1.237 } },
  { name: 'Lily', color: '#fffae8', shape: { path: sphere }, art: { file: 'flowers/7.webp', w: 306, h: 338, cx: 0.5016, cy: 0.4985, span: 305, reach: 1.078 } },
];

const TROPICAL_ART: readonly Rung[] = [
  { name: 'Mango', color: '#ffd41e', shape: { path: sphere }, art: { file: 'tropical/0.webp', w: 252, h: 320, cx: 0.5000, cy: 0.4875, span: 267, reach: 1.249 } },
  { name: 'Kiwi', color: '#d7ff4a', shape: { path: sphere }, art: { file: 'tropical/1.webp', w: 262, h: 286, cx: 0.5057, cy: 0.4948, span: 261, reach: 1.066 } },
  { name: 'Papaya', color: '#ff7a15', shape: { path: sphere }, art: { file: 'tropical/2.webp', w: 290, h: 316, cx: 0.4948, cy: 0.4937, span: 280.5, reach: 1.274 } },
  { name: 'Dragon fruit', color: '#ff5c89', shape: { path: sphere }, art: { file: 'tropical/3.webp', w: 258, h: 358, cx: 0.4961, cy: 0.4972, span: 297, reach: 1.250 } },
  { name: 'Passion fruit', color: '#ffa7ae', shape: { path: sphere }, art: { file: 'tropical/4.webp', w: 276, h: 288, cx: 0.5054, cy: 0.5052, span: 270, reach: 1.064 } },
  { name: 'Lychee', color: '#ff3944', shape: { path: sphere }, art: { file: 'tropical/5.webp', w: 258, h: 296, cx: 0.4981, cy: 0.4932, span: 260.5, reach: 1.071 } },
  { name: 'Coconut', color: '#6afffa', shape: { path: sphere }, art: { file: 'tropical/6.webp', w: 286, h: 304, cx: 0.5052, cy: 0.4934, span: 275.5, reach: 1.059 } },
  { name: 'Pineapple', color: '#ffbe24', shape: { path: sphere }, art: { file: 'tropical/7.webp', w: 252, h: 412, cx: 0.5000, cy: 0.4915, span: 314.5, reach: 1.282 } },
];

const CANDY_ART: readonly Rung[] = [
  { name: 'Peppermint', color: '#ff747b', shape: { path: sphere }, art: { file: 'candy/0.webp', w: 270, h: 280, cx: 0.4963, cy: 0.5000, span: 266, reach: 1.023 } },
  { name: 'Gumball', color: '#2592ff', shape: { path: sphere }, art: { file: 'candy/1.webp', w: 256, h: 268, cx: 0.4980, cy: 0.4963, span: 249.5, reach: 1.052 } },
  { name: 'Lemon drop', color: '#ffda25', shape: { path: sphere }, art: { file: 'candy/2.webp', w: 272, h: 248, cx: 0.4963, cy: 0.4798, span: 247, reach: 1.078 } },
  { name: 'Apple sweet', color: '#96ff37', shape: { path: sphere }, art: { file: 'candy/3.webp', w: 260, h: 300, cx: 0.4981, cy: 0.4917, span: 270, reach: 1.235 } },
  { name: 'Grapes', color: '#bb54ff', shape: { path: sphere }, art: { file: 'candy/4.webp', w: 260, h: 284, cx: 0.4962, cy: 0.5018, span: 262.5, reach: 1.190 } },
  { name: 'Orange swirl', color: '#ff9243', shape: { path: sphere }, art: { file: 'candy/5.webp', w: 264, h: 276, cx: 0.4981, cy: 0.5018, span: 261, reach: 1.057 } },
  { name: 'Heart', color: '#ff6da6', shape: { path: sphere }, art: { file: 'candy/6.webp', w: 272, h: 256, cx: 0.4982, cy: 0.4941, span: 253, reach: 1.176 } },
  { name: 'Star', color: '#26e1ff', shape: { path: sphere }, art: { file: 'candy/7.webp', w: 276, h: 276, cx: 0.5000, cy: 0.4946, span: 266.5, reach: 1.161 } },
];

const HATS_ART: readonly Rung[] = [
  { name: 'Cap', color: '#ff282a', shape: { path: sphere }, art: { file: 'hats/0.webp', w: 290, h: 284, cx: 0.4966, cy: 0.4842, span: 266.5, reach: 1.224 } },
  { name: 'Wizard hat', color: '#1f74ff', shape: { path: sphere }, art: { file: 'hats/1.webp', w: 286, h: 346, cx: 0.5035, cy: 0.4899, span: 294.5, reach: 1.200 } },
  { name: 'Top hat', color: '#ffd215', shape: { path: sphere }, art: { file: 'hats/2.webp', w: 268, h: 298, cx: 0.4981, cy: 0.4849, span: 261, reach: 1.162 } },
  { name: 'Beret', color: '#52ff2f', shape: { path: sphere }, art: { file: 'hats/3.webp', w: 272, h: 234, cx: 0.5037, cy: 0.4679, span: 230.5, reach: 1.206 } },
  { name: 'Crown', color: '#a736ff', shape: { path: sphere }, art: { file: 'hats/4.webp', w: 284, h: 278, cx: 0.5018, cy: 0.4784, span: 264.5, reach: 1.140 } },
  { name: 'Cowboy hat', color: '#ff7020', shape: { path: sphere }, art: { file: 'hats/5.webp', w: 320, h: 282, cx: 0.5000, cy: 0.4787, span: 279, reach: 1.128 } },
  { name: 'Party hat', color: '#2be9ff', shape: { path: sphere }, art: { file: 'hats/6.webp', w: 220, h: 356, cx: 0.4909, cy: 0.4930, span: 264.5, reach: 1.311 } },
  { name: 'Sun hat', color: '#ff38aa', shape: { path: sphere }, art: { file: 'hats/7.webp', w: 360, h: 280, cx: 0.5153, cy: 0.4839, span: 296, reach: 1.199 } },
];

const MONSTERS_ART: readonly Rung[] = [
  { name: 'Cyclops', color: '#2f83ff', shape: { path: sphere }, art: { file: 'monsters/0.webp', w: 268, h: 308, cx: 0.4981, cy: 0.4968, span: 276.5, reach: 1.225 } },
  { name: 'Fluffball', color: '#ff96bd', shape: { path: sphere }, art: { file: 'monsters/1.webp', w: 262, h: 346, cx: 0.4943, cy: 0.4928, span: 289, reach: 1.281 } },
  { name: 'Spikeball', color: '#ffcf24', shape: { path: sphere }, art: { file: 'monsters/2.webp', w: 294, h: 322, cx: 0.4966, cy: 0.4891, span: 296.5, reach: 1.147 } },
  { name: 'Blob', color: '#70ff37', shape: { path: sphere }, art: { file: 'monsters/3.webp', w: 290, h: 300, cx: 0.4983, cy: 0.4933, span: 281.5, reach: 1.191 } },
  { name: 'Fangs', color: '#9c39ff', shape: { path: sphere }, art: { file: 'monsters/4.webp', w: 272, h: 326, cx: 0.5018, cy: 0.4985, span: 286, reach: 1.293 } },
  { name: 'Antennae', color: '#ff8920', shape: { path: sphere }, art: { file: 'monsters/5.webp', w: 262, h: 326, cx: 0.4981, cy: 0.4969, span: 280.5, reach: 1.269 } },
  { name: 'Squidlet', color: '#31f8ff', shape: { path: sphere }, art: { file: 'monsters/6.webp', w: 252, h: 328, cx: 0.5020, cy: 0.4985, span: 279, reach: 1.281 } },
  { name: 'Imp', color: '#ff2226', shape: { path: sphere }, art: { file: 'monsters/7.webp', w: 370, h: 318, cx: 0.4986, cy: 0.4969, span: 327.5, reach: 1.120 } },
];

const INSTRUMENTS_ART: readonly Rung[] = [
  { name: 'Electric guitar', color: '#ff676b', shape: { path: sphere }, art: { file: 'instruments/0.webp', w: 242, h: 616, cx: 0.4938, cy: 0.4959, span: 408, reach: 1.481 } },
  { name: 'Acoustic guitar', color: '#2971ff', shape: { path: sphere }, art: { file: 'instruments/1.webp', w: 256, h: 604, cx: 0.4961, cy: 0.4934, span: 403, reach: 1.457 } },
  { name: 'Saxophone', color: '#ffcd27', shape: { path: sphere }, art: { file: 'instruments/2.webp', w: 288, h: 530, cx: 0.5052, cy: 0.4972, span: 390, reach: 1.406 } },
  { name: 'Snare drum', color: '#7bff60', shape: { path: sphere }, art: { file: 'instruments/3.webp', w: 298, h: 296, cx: 0.5017, cy: 0.4932, span: 279.5, reach: 1.145 } },
  { name: 'Keyboard', color: '#b15fff', shape: { path: sphere }, art: { file: 'instruments/4.webp', w: 360, h: 294, cx: 0.4792, cy: 0.4881, span: 307, reach: 1.197 } },
  { name: 'Trumpet', color: '#ff7021', shape: { path: sphere }, art: { file: 'instruments/5.webp', w: 342, h: 410, cx: 0.4927, cy: 0.4976, span: 347.5, reach: 1.394 } },
  { name: 'Violin', color: '#2bd1ff', shape: { path: sphere }, art: { file: 'instruments/6.webp', w: 246, h: 594, cx: 0.4858, cy: 0.4975, span: 399, reach: 1.468 } },
  { name: 'Microphone', color: '#ff4dba', shape: { path: sphere }, art: { file: 'instruments/7.webp', w: 184, h: 482, cx: 0.4973, cy: 0.5031, span: 312, reach: 1.479 } },
];

const SOLAR_ART: readonly Rung[] = [
  { name: 'Moon', color: '#fffaf7', shape: { path: sphere }, art: { file: 'solar/0.webp', w: 252, h: 262, cx: 0.4901, cy: 0.5019, span: 236, reach: 1.033 } },
  { name: 'Mars', color: '#ff472e', shape: { path: sphere }, art: { file: 'solar/1.webp', w: 268, h: 282, cx: 0.4981, cy: 0.5000, span: 249.5, reach: 1.049 } },
  { name: 'Earth', color: '#7de9ff', shape: { path: sphere }, art: { file: 'solar/2.webp', w: 292, h: 308, cx: 0.4932, cy: 0.5016, span: 271.5, reach: 1.054 } },
  { name: 'Saturn', color: '#ffad44', shape: { path: sphere }, art: { file: 'solar/3.webp', w: 388, h: 250, cx: 0.4781, cy: 0.5020, span: 294, reach: 1.292 } },
  { name: 'Jupiter', color: '#ffcc91', shape: { path: sphere }, art: { file: 'solar/4.webp', w: 290, h: 298, cx: 0.5034, cy: 0.5000, span: 265, reach: 1.043 } },
  { name: 'Neptune', color: '#286fff', shape: { path: sphere }, art: { file: 'solar/5.webp', w: 280, h: 292, cx: 0.5018, cy: 0.4983, span: 254, reach: 1.058 } },
  { name: 'Venus', color: '#ff7e1d', shape: { path: sphere }, art: { file: 'solar/6.webp', w: 284, h: 292, cx: 0.4754, cy: 0.4966, span: 256, reach: 1.051 } },
  { name: 'Sun', color: '#ffc71e', shape: { path: sphere }, art: { file: 'solar/7.webp', w: 320, h: 336, cx: 0.5047, cy: 0.4985, span: 292, reach: 1.049 } },
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
  instruments: { key: 'instruments', label: 'Instruments', ladder: INSTRUMENTS_ART },
  solar: { key: 'solar', label: 'Solar system', ladder: SOLAR_ART },
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
  'instruments',
  'solar',
];

/** The theme a video is dressed in, defaulting to the one the references open with. */
export const themeFor = (name?: ThemeName): Theme => THEMES[name ?? 'fruit'];
