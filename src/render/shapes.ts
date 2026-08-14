/**
 * The drawn sets.
 *
 * Emoji are somebody else's artwork rendered by the machine's font, which means
 * they look different on every device and cannot be tuned. These are drawn here,
 * out of arcs and polygons and gradients, so a gem is the same gem everywhere
 * and its colour is a number this file owns.
 *
 * Eight of each, smallest first, because the ladder is a size ladder. Every one
 * of them is drawn to fit a circle of radius `r` centred on the point given —
 * the simulation only knows about circles, so anything that spills outside would
 * hang over its neighbours.
 */

export type ShapeSet = 'gems' | 'diamonds' | 'jellies' | 'planets' | 'puddings';

export const SHAPE_SETS: readonly ShapeSet[] = [
  'gems',
  'diamonds',
  'puddings',
  'jellies',
  'planets',
];

export const SHAPE_LABEL: Record<ShapeSet, string> = {
  gems: 'gems',
  diamonds: 'diamonds',
  jellies: 'jelly cats',
  planets: 'planets',
  puddings: 'jellies',
};

/** Eight colours per set: the body of the piece, and the halo it throws. */
const PALETTE: Record<ShapeSet, readonly string[]> = {
  gems: ['#e11d48', '#f97316', '#facc15', '#84cc16', '#10b981', '#3b82f6', '#a855f7', '#f1f5f9'],
  diamonds: [
    '#e2e8f0',
    '#bae6fd',
    '#7dd3fc',
    '#a5b4fc',
    '#c4b5fd',
    '#f9a8d4',
    '#fde68a',
    '#94a3b8',
  ],
  jellies: ['#fde68a', '#fbcfe8', '#a7f3d0', '#ddd6fe', '#bfdbfe', '#fed7aa', '#fecdd3', '#e9d5ff'],
  planets: ['#9ca3af', '#f97316', '#fbbf24', '#60a5fa', '#34d399', '#c084fc', '#f472b6', '#fde047'],
  puddings: [
    '#dc2626',
    '#f97316',
    '#22c55e',
    '#0ea5e9',
    '#f59e0b',
    '#7c3aed',
    '#e11d48',
    '#f97316',
  ],
};

export const shapeColor = (set: ShapeSet, rank: number): string =>
  PALETTE[set][Math.min(rank, PALETTE[set].length - 1)];

/** `#rrggbb` mixed towards white (`amount` > 0) or black (< 0). */
function shade(hex: string, amount: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const mix = (channel: number): number =>
    Math.round(amount >= 0 ? channel + (255 - channel) * amount : channel * (1 + amount));
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * The cuts, as outlines on a unit circle.
 *
 * One per rank, because eight of the same octagon at eight sizes is a size
 * ladder and not a jeweller's tray — the reference has a heart and a kite and a
 * faceted ball in the same bowl. Every outline is normalised so its furthest
 * point sits at 1, which is the circle the simulation is using: anything drawn
 * beyond that would hang over its neighbours, and anything well inside it looks
 * like it is floating.
 */
type Outline = readonly (readonly [number, number])[];

/** A regular polygon as an outline, flat edge up. */
const ring = (sides: number, squashY = 1): Outline =>
  Array.from({ length: sides }, (_, i) => {
    const a = Math.PI / sides + (i / sides) * Math.PI * 2;
    return [Math.cos(a), Math.sin(a) * squashY] as const;
  });

/** Scaled so the furthest point of an outline lands exactly on the circle. */
function fit(points: Outline): Outline {
  const far = Math.max(...points.map(([x, y]) => Math.hypot(x, y)));
  return points.map(([x, y]) => [x / far, y / far] as const);
}

const ROUND = fit(ring(8));
const BRILLIANT = fit(ring(12));
const OVAL = fit(ring(12, 0.74));

/** A princess cut: a square standing on its point. */
const PRINCESS = fit([
  [0, -1],
  [1, 0],
  [0, 1],
  [-1, 0],
]);

/** An emerald cut: a tall rectangle with its corners taken off. */
const EMERALD = fit([
  [-0.4, -1],
  [0.4, -1],
  [0.68, -0.72],
  [0.68, 0.72],
  [0.4, 1],
  [-0.4, 1],
  [-0.68, 0.72],
  [-0.68, -0.72],
]);

/** A marquise: an eye, pointed at both ends. */
const MARQUISE = fit([
  [0, -1],
  [0.34, -0.45],
  [0.42, 0],
  [0.34, 0.45],
  [0, 1],
  [-0.34, 0.45],
  [-0.42, 0],
  [-0.34, -0.45],
]);

/** A pear: round at the bottom, drawn to a point at the top. */
const PEAR = fit([
  [0, -1],
  [0.36, -0.34],
  [0.5, 0.16],
  [0.36, 0.62],
  [0, 0.8],
  [-0.36, 0.62],
  [-0.5, 0.16],
  [-0.36, -0.34],
]);

/** A heart: two lobes and a point, as eight straight edges. */
const HEART = fit([
  [0, -0.62],
  [0.36, -1],
  [0.78, -0.86],
  [0.9, -0.32],
  [0.52, 0.36],
  [0, 0.88],
  [-0.52, 0.36],
  [-0.9, -0.32],
  [-0.78, -0.86],
  [-0.36, -1],
]);

/**
 * One cut for the whole ladder.
 *
 * The other outlines above were a jeweller's tray — a heart, a marquise, a
 * princess — and they are kept because the routine below draws any of them and
 * they cost nothing to leave in. But a bowl of one cut at eight sizes reads as
 * one thing growing, which is what this is, so every rank gets the round.
 */
const CUTS: readonly Outline[] = [ROUND, ROUND, ROUND, ROUND, ROUND, ROUND, ROUND, ROUND];

/** Drawn by nothing at the moment, and kept for when a set wants them. */
export const OTHER_CUTS = { PEAR, MARQUISE, EMERALD, OVAL, HEART, PRINCESS, BRILLIANT };

/** Traces an outline at a size and a place. */
function trace(ctx: CanvasRenderingContext2D, cut: Outline, x: number, y: number, r: number): void {
  ctx.beginPath();
  cut.forEach(([px, py], i) => {
    const sx = x + px * r;
    const sy = y + py * r;
    if (i === 0) ctx.moveTo(sx, sy);
    else ctx.lineTo(sx, sy);
  });
  ctx.closePath();
}

/**
 * Any cut, faceted: a table in the middle, and a crown of facets around it that
 * alternate light and dark so the stone reads as cut rather than as a sticker.
 */
function gem(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  hue: string,
  rank: number,
): void {
  const cut = CUTS[Math.min(rank, CUTS.length - 1)];
  trace(ctx, cut, x, y, r);
  const body = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  body.addColorStop(0, shade(hue, 0.45));
  body.addColorStop(0.5, hue);
  body.addColorStop(1, shade(hue, -0.45));
  ctx.fillStyle = body;
  ctx.fill();

  const table = 0.46;
  for (let i = 0; i < cut.length; i += 1) {
    const [ax, ay] = cut[i];
    const [bx, by] = cut[(i + 1) % cut.length];
    ctx.beginPath();
    ctx.moveTo(x + ax * r, y + ay * r);
    ctx.lineTo(x + bx * r, y + by * r);
    ctx.lineTo(x + ((ax + bx) / 2) * r * table, y + ((ay + by) / 2) * r * table);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? shade(hue, 0.3) : shade(hue, -0.25);
    ctx.fill();
  }

  trace(ctx, cut, x, y, r * table);
  ctx.fillStyle = shade(hue, 0.55);
  ctx.fill();
  ctx.strokeStyle = shade(hue, 0.8);
  ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.stroke();
}

/** A brilliant cut in profile: table, girdle, and a pavilion coming to a point. */
function diamond(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  hue: string,
): void {
  const top = y - r * 0.62;
  const girdle = y - r * 0.18;
  const half = r * 0.95;
  const table = r * 0.42;

  ctx.beginPath();
  ctx.moveTo(x - table, top);
  ctx.lineTo(x + table, top);
  ctx.lineTo(x + half, girdle);
  ctx.lineTo(x, y + r * 0.95);
  ctx.lineTo(x - half, girdle);
  ctx.closePath();
  const body = ctx.createLinearGradient(x - half, top, x + half, y + r);
  body.addColorStop(0, shade(hue, 0.6));
  body.addColorStop(0.45, hue);
  body.addColorStop(1, shade(hue, -0.35));
  ctx.fillStyle = body;
  ctx.fill();

  // The pavilion, split into facets that alternate light and dark.
  const spread = [-0.62, -0.2, 0.2, 0.62];
  for (let i = 0; i < spread.length - 1; i += 1) {
    ctx.beginPath();
    ctx.moveTo(x + half * spread[i] * 1.5, girdle);
    ctx.lineTo(x + half * spread[i + 1] * 1.5, girdle);
    ctx.lineTo(x, y + r * 0.95);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? shade(hue, 0.25) : shade(hue, -0.2);
    ctx.fill();
  }

  // The table, and the crown facets on either side of it.
  ctx.beginPath();
  ctx.moveTo(x - table, top);
  ctx.lineTo(x + table, top);
  ctx.lineTo(x + half * 0.75, girdle);
  ctx.lineTo(x - half * 0.75, girdle);
  ctx.closePath();
  ctx.fillStyle = shade(hue, 0.7);
  ctx.fill();

  ctx.strokeStyle = shade(hue, 0.85);
  ctx.lineWidth = Math.max(1, r * 0.045);
  ctx.beginPath();
  ctx.moveTo(x - table, top);
  ctx.lineTo(x + table, top);
  ctx.lineTo(x + half, girdle);
  ctx.lineTo(x, y + r * 0.95);
  ctx.lineTo(x - half, girdle);
  ctx.closePath();
  ctx.stroke();
}

/** A soft plush cat: a round body, two ears, and a face that fits inside it. */
function jelly(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, hue: string): void {
  // Far enough out to clear the body, which is drawn over them: an ear tucked
  // inside the head is an ear nobody sees.
  const ear = r * 0.5;
  for (const side of [-1, 1]) {
    const ex = x + side * r * 0.52;
    const ey = y - r * 0.78;
    ctx.beginPath();
    ctx.moveTo(ex - ear * 0.7, ey + ear * 0.8);
    ctx.quadraticCurveTo(ex - ear * 0.2, ey - ear, ex + ear * 0.75, ey + ear * 0.55);
    ctx.closePath();
    ctx.fillStyle = shade(hue, -0.12);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(ex - ear * 0.3, ey + ear * 0.7);
    ctx.quadraticCurveTo(ex - ear * 0.05, ey - ear * 0.35, ex + ear * 0.4, ey + ear * 0.55);
    ctx.closePath();
    ctx.fillStyle = shade('#fb7185', 0.45);
    ctx.fill();
  }

  const body = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.1, x, y, r);
  body.addColorStop(0, shade(hue, 0.45));
  body.addColorStop(1, shade(hue, -0.18));
  ctx.beginPath();
  ctx.arc(x, y, r * 0.92, 0, Math.PI * 2);
  ctx.fillStyle = body;
  ctx.fill();

  ctx.fillStyle = shade(hue, -0.75);
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(x + side * r * 0.33, y - r * 0.05, r * 0.1, r * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(x - r * 0.11, y + r * 0.2);
  ctx.lineTo(x + r * 0.11, y + r * 0.2);
  ctx.lineTo(x, y + r * 0.34);
  ctx.closePath();
  ctx.fillStyle = '#fb7185';
  ctx.fill();

  ctx.fillStyle = 'rgba(251, 113, 133, 0.35)';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(x + side * r * 0.6, y + r * 0.22, r * 0.16, r * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A lit sphere, with whatever this rank wears: craters, bands, or a ring. */
function planet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  hue: string,
  rank: number,
): void {
  if (rank === 5) {
    // The ringed one. Drawn behind the ball, then again in front of its lower
    // half, which is what sells it as going round rather than sitting on top.
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.35);
    ctx.scale(1, 0.3);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.98, 0, Math.PI * 2);
    ctx.strokeStyle = shade(hue, 0.35);
    ctx.lineWidth = r * 0.3;
    ctx.stroke();
    ctx.restore();
  }

  const lit = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r);
  lit.addColorStop(0, shade(hue, 0.55));
  lit.addColorStop(0.55, hue);
  lit.addColorStop(1, shade(hue, -0.6));
  // The ringed one gives up some of its width so the ring has somewhere to go
  // without hanging over its neighbours.
  const ball = rank === 5 ? r * 0.62 : r * 0.88;
  ctx.beginPath();
  ctx.arc(x, y, ball, 0, Math.PI * 2);
  ctx.fillStyle = lit;
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, ball, 0, Math.PI * 2);
  ctx.clip();
  if (rank === 0 || rank === 3) {
    // Craters.
    const spots: [number, number, number][] = [
      [-0.3, -0.25, 0.22],
      [0.25, 0.1, 0.3],
      [-0.1, 0.45, 0.18],
      [0.45, -0.4, 0.14],
    ];
    ctx.fillStyle = shade(hue, -0.35);
    for (const [dx, dy, size] of spots) {
      ctx.beginPath();
      ctx.arc(x + dx * r, y + dy * r, size * r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (rank >= 4) {
    // Bands, or continents on the blue one.
    ctx.fillStyle = shade(hue, rank === 6 ? -0.3 : 0.25);
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath();
      ctx.ellipse(x, y + i * r * 0.36, r, r * 0.13, 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  if (rank === 5) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - r * 1.2, y, r * 2.4, r * 1.2);
    ctx.clip();
    ctx.translate(x, y);
    ctx.rotate(-0.35);
    ctx.scale(1, 0.3);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.98, 0, Math.PI * 2);
    ctx.strokeStyle = shade(hue, 0.35);
    ctx.lineWidth = r * 0.3;
    ctx.stroke();
    ctx.restore();
  }

  if (rank === 7) {
    // The star: a corona rather than a surface.
    ctx.strokeStyle = shade(hue, 0.5);
    ctx.lineWidth = r * 0.08;
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9);
      ctx.lineTo(x + Math.cos(a) * r * 1.05, y + Math.sin(a) * r * 1.05);
      ctx.stroke();
    }
  }
}

/**
 * How much of its circle each set has to be scaled by to fill it.
 *
 * The simulation only knows circles, so a piece drawn inside its circle rather
 * than out to it looks like it is floating: two pieces resting against each
 * other show a gap the width of whatever the artwork left over, and on a white
 * ground there is no halo to cover it. An octagon's flat faces sit at 0.92 of
 * its radius, a lit sphere was drawn at 0.88, a brilliant cut is shorter than it
 * is wide. Each is pushed out until its silhouette meets the circle where
 * neighbours actually touch.
 */
const FILL: Record<ShapeSet, number> = {
  gems: 1.08,
  diamonds: 1.12,
  jellies: 1.07,
  planets: 1.13,
  puddings: 1.05,
};

/** A brilliant cut sits low in its circle, so it is lifted back to the middle. */
const DIAMOND_LIFT = -0.165;

/**
 * A turned-out jelly, translucent and glossy.
 *
 * Three things by size, which is what the reference does: the little ones are
 * smooth domes, the middle of the ladder is the fluted mould — a ring of round
 * lobes, drawn as overlapping circles because a canvas cannot union paths — and
 * the big ones are faceted, a flat polygon top over a skirt of trapezoids. All
 * of them get the same treatment underneath: a light centre falling to a deep
 * edge, a hard white highlight up on the left, and a bright rim.
 */
function pudding(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  hue: string,
  rank: number,
): void {
  const glass = ctx.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.05, x, y, r);
  glass.addColorStop(0, shade(hue, 0.55));
  glass.addColorStop(0.55, hue);
  glass.addColorStop(1, shade(hue, -0.4));
  ctx.fillStyle = glass;

  if (rank <= 1) {
    // A dome: round on top, sat down on its own base.
    ctx.beginPath();
    ctx.ellipse(x, y + r * 0.12, r * 0.92, r * 0.8, 0, Math.PI, 0);
    ctx.ellipse(x, y + r * 0.12, r * 0.92, r * 0.28, 0, 0, Math.PI);
    ctx.fill();
  } else if (rank <= 5) {
    // The mould: a body with a ring of lobes round it, all one colour, so the
    // overlaps disappear and what is left is the scalloped outline.
    const lobes = 6;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.62, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < lobes; i += 1) {
      const a = (i / lobes) * Math.PI * 2 + Math.PI / lobes;
      ctx.beginPath();
      ctx.arc(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.37, 0, Math.PI * 2);
      ctx.fill();
    }
    // A gloss on each lobe rather than a line between them. Lines read as the
    // spokes of a flower; what makes a jelly a jelly is that every rounded part
    // of it catches the light separately.
    for (let i = 0; i < lobes; i += 1) {
      const a = (i / lobes) * Math.PI * 2 + Math.PI / lobes;
      const lx = x + Math.cos(a) * r * 0.62;
      const ly = y + Math.sin(a) * r * 0.62;
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.beginPath();
      ctx.ellipse(lx - r * 0.1, ly - r * 0.12, r * 0.16, r * 0.09, -0.6, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = shade(hue, 0.3);
    ctx.beginPath();
    ctx.arc(x, y, r * 0.3, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Faceted: a flat top with a skirt of trapezoids under it.
    const sides = 8;
    const top = 0.5;
    const at = (i: number, ring: number, lift: number) => {
      const a = (i / sides) * Math.PI * 2 + Math.PI / sides;
      return [x + Math.cos(a) * r * ring, y + Math.sin(a) * r * ring * 0.9 - r * lift] as const;
    };
    ctx.beginPath();
    for (let i = 0; i <= sides; i += 1) {
      const [px, py] = at(i, 0.96, 0);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.fill();
    for (let i = 0; i < sides; i += 1) {
      const [ax, ay] = at(i, 0.96, 0);
      const [bx, by] = at(i + 1, 0.96, 0);
      const [cx2, cy2] = at(i + 1, top, 0.28);
      const [dx2, dy2] = at(i, top, 0.28);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(bx, by);
      ctx.lineTo(cx2, cy2);
      ctx.lineTo(dx2, dy2);
      ctx.closePath();
      ctx.fillStyle = i % 2 ? shade(hue, 0.2) : shade(hue, -0.15);
      ctx.fill();
      ctx.strokeStyle = shade(hue, 0.6);
      ctx.lineWidth = Math.max(1, r * 0.02);
      ctx.stroke();
    }
    ctx.beginPath();
    for (let i = 0; i <= sides; i += 1) {
      const [px, py] = at(i, top, 0.28);
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fillStyle = shade(hue, 0.35);
    ctx.fill();
    ctx.strokeStyle = shade(hue, 0.7);
    ctx.stroke();
  }

  // The gloss, which is what makes a thing look wet rather than painted.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
  ctx.beginPath();
  ctx.ellipse(x - r * 0.32, y - r * 0.34, r * 0.22, r * 0.13, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.beginPath();
  ctx.ellipse(x + r * 0.28, y - r * 0.2, r * 0.1, r * 0.06, -0.4, 0, Math.PI * 2);
  ctx.fill();
}

export function drawShape(
  ctx: CanvasRenderingContext2D,
  set: ShapeSet,
  rank: number,
  x: number,
  y: number,
  radius: number,
): void {
  const hue = shapeColor(set, rank);
  const r = radius * FILL[set];
  if (set === 'gems') gem(ctx, x, y, r, hue, rank);
  else if (set === 'diamonds') diamond(ctx, x, y + r * DIAMOND_LIFT, r, hue);
  else if (set === 'jellies') jelly(ctx, x, y, r, hue);
  else if (set === 'puddings') pudding(ctx, x, y, r, hue, Math.min(rank, 7));
  else planet(ctx, x, y, r, hue, Math.min(rank, 7));
}
