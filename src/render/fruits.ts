/**
 * Twelve fruits, each of them filling its disc.
 *
 * The rule is that **the disc is the fruit**, not a circle with a picture of a
 * fruit in it. Half of these are cut open — an orange, a watermelon, a kiwi, an
 * apple through its core — and the rest are a piece of the fruit's own surface:
 * a strawberry's pips, a pineapple's lattice, the crown at the eye of a
 * blueberry. Nothing sits on a ground, because a small object floating in the
 * middle of a disc reads as an icon somebody mounted there, and at forty pixels
 * an icon is a smudge while a field of colour is still a colour.
 *
 * The first set had a bunch of grapes, two cherries on a stem and a banana
 * lying across its circle, and an apple and a strawberry wearing leaves. Those
 * were the ones that were pictures rather than fruit; they are now a cut grape,
 * a cut cherry, a slice of banana, an apple through its core and a field of
 * strawberry skin.
 *
 * They are read at about forty pixels across in a Pachinko scoreboard and
 * thirty-five falling through its field, so each one carries the two or three
 * marks that survive there: the seeds, the segments, the core, the stone.
 * Anything finer is mud at that size and has been left out.
 */

export type FruitName =
  | 'strawberry'
  | 'orange'
  | 'watermelon'
  | 'kiwi'
  | 'banana'
  | 'apple'
  | 'grape'
  | 'pineapple'
  | 'lemon'
  | 'cherry'
  | 'blueberry'
  | 'mango';

type Paint = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => void;

const disc = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
): void => {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
};

/** Small round things — pips, seeds, stones. */
function scatter(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  places: readonly (readonly [number, number, number])[],
  color: string,
): void {
  ctx.fillStyle = color;
  for (const [dx, dy, size] of places) {
    ctx.beginPath();
    ctx.arc(x + dx * r, y + dy * r, size * r, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** The segments of a cut citrus: spokes from a small core out to the rind. */
function segments(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  count: number,
  reach: number,
  color: string,
): void {
  ctx.strokeStyle = color;
  ctx.lineWidth = r * 0.07;
  for (let i = 0; i < count; i += 1) {
    const angle = (i / count) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * r * 0.06, y + Math.sin(angle) * r * 0.06);
    ctx.lineTo(x + Math.cos(angle) * r * reach, y + Math.sin(angle) * r * reach);
    ctx.stroke();
  }
  disc(ctx, x, y, r * 0.09, color);
}

/** Seeds set evenly round a circle — a kiwi's ring, an apple's core. */
function ring(count: number, out: number, size: number): [number, number, number][] {
  const places: [number, number, number][] = [];
  for (let i = 0; i < count; i += 1) {
    const angle = -Math.PI / 2 + (i / count) * Math.PI * 2;
    places.push([Math.cos(angle) * out, Math.sin(angle) * out, size]);
  }
  return places;
}

const strawberry: Paint = (ctx, x, y, r) => {
  // The skin, and nothing else. The calyx used to sit along the top edge and
  // was the one part of it that read as a badge stuck onto a circle.
  disc(ctx, x, y, r, '#e0324b');
  const pips: [number, number, number][] = [];
  for (let row = -2; row <= 2; row += 1) {
    for (let col = -2; col <= 2; col += 1) {
      const dx = (col + (row % 2 ? 0.5 : 0)) * 0.38;
      const dy = row * 0.36;
      if (dx * dx + dy * dy > 0.78) continue;
      pips.push([dx, dy, 0.058]);
    }
  }
  scatter(ctx, x, y, r, pips, '#f7d84a');
};

const orange: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#f2f0e4');
  disc(ctx, x, y, r * 0.88, '#f59a1e');
  segments(ctx, x, y, r, 8, 0.88, '#f7ede0');
};

const watermelon: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#2f7d3a');
  disc(ctx, x, y, r * 0.86, '#eef2e0');
  disc(ctx, x, y, r * 0.74, '#e14b5a');
  scatter(
    ctx,
    x,
    y,
    r,
    [
      [-0.28, -0.24, 0.08],
      [0.3, -0.18, 0.08],
      [0.02, 0.1, 0.08],
      [-0.24, 0.38, 0.08],
      [0.32, 0.34, 0.08],
    ],
    '#1f2430',
  );
};

const kiwi: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#8a6a3a');
  disc(ctx, x, y, r * 0.9, '#a8c94a');
  disc(ctx, x, y, r * 0.28, '#f2f0dc');
  // The ring of seeds, which is the one thing every kiwi has and nothing else
  // in the cast does.
  scatter(ctx, x, y, r, ring(10, 0.46, 0.055), '#2b2b22');
};

const banana: Paint = (ctx, x, y, r) => {
  // A slice. A whole banana is a crescent lying in a circle, which is the
  // definition of an icon on a ground; cut across it is a disc with a
  // three-part core, and the core is what names it.
  disc(ctx, x, y, r, '#e8d98a');
  disc(ctx, x, y, r * 0.88, '#f7e9a8');
  ctx.strokeStyle = '#d9c169';
  ctx.lineWidth = r * 0.11;
  ctx.lineCap = 'round';
  for (let i = 0; i < 3; i += 1) {
    const angle = -Math.PI / 2 + (i / 3) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(angle) * r * 0.42, y + Math.sin(angle) * r * 0.42);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  scatter(ctx, x, y, r, ring(3, 0.22, 0.05), '#8a7434');
};

const apple: Paint = (ctx, x, y, r) => {
  // Through the core: skin, flesh, and the five pips that only an apple has in
  // that arrangement.
  disc(ctx, x, y, r, '#d42b2b');
  disc(ctx, x, y, r * 0.84, '#f6efd6');
  scatter(ctx, x, y, r, ring(5, 0.32, 0.1), '#5a3a1a');
  disc(ctx, x, y, r * 0.1, '#e8d9ae');
};

const grape: Paint = (ctx, x, y, r) => {
  // One grape, cut. The bunch that was here was seven circles inside a circle,
  // which at this size is a smudge with a stem on it.
  disc(ctx, x, y, r, '#7b4bc9');
  disc(ctx, x, y, r * 0.78, '#d9c6ee');
  scatter(
    ctx,
    x,
    y,
    r,
    [
      [-0.17, -0.09, 0.13],
      [0.19, 0.15, 0.13],
    ],
    '#5a3a7a',
  );
};

const pineapple: Paint = (ctx, x, y, r) => {
  // The skin: a field of lattice, which fills the disc where a whole pineapple
  // with its crown would have been a small object standing in one.
  disc(ctx, x, y, r, '#e0a02a');
  ctx.strokeStyle = '#b57d18';
  ctx.lineWidth = r * 0.08;
  for (let i = -3; i <= 3; i += 1) {
    const at = i * r * 0.42;
    ctx.beginPath();
    ctx.moveTo(x + at - r * 1.2, y - r * 1.2);
    ctx.lineTo(x + at + r * 1.2, y + r * 1.2);
    ctx.moveTo(x + at - r * 1.2, y + r * 1.2);
    ctx.lineTo(x + at + r * 1.2, y - r * 1.2);
    ctx.stroke();
  }
};

const lemon: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#f2edcc');
  disc(ctx, x, y, r * 0.86, '#f4e04d');
  segments(ctx, x, y, r, 6, 0.86, '#fbf6dc');
};

const cherry: Paint = (ctx, x, y, r) => {
  // Cut as well, and told from the mango by its colour and by a stone that is
  // round rather than long.
  disc(ctx, x, y, r, '#a80f2c');
  disc(ctx, x, y, r * 0.82, '#d81e3f');
  disc(ctx, x, y, r * 0.34, '#e8d8b0');
  disc(ctx, x, y, r * 0.18, '#c9a86a');
};

const blueberry: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#4b5bbf');
  disc(ctx, x - r * 0.16, y - r * 0.16, r * 0.72, '#5f70d6');
  // The crown at its eye, which is the only mark a blueberry has and the whole
  // of how it is told from a plain blue circle.
  disc(ctx, x, y, r * 0.3, '#2c3670');
  ctx.strokeStyle = '#2c3670';
  ctx.lineWidth = r * 0.1;
  ctx.lineCap = 'round';
  for (let i = 0; i < 5; i += 1) {
    const angle = (i / 5) * Math.PI * 2 - Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * r * 0.16, y + Math.sin(angle) * r * 0.16);
    ctx.lineTo(x + Math.cos(angle) * r * 0.42, y + Math.sin(angle) * r * 0.42);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
};

const mango: Paint = (ctx, x, y, r) => {
  // Cut in half: skin, flesh, stone. The blush on the skin is what stops it
  // being an apricot, and the long stone is what stops it being a cherry.
  disc(ctx, x, y, r, '#d94f2b');
  disc(ctx, x, y, r * 0.84, '#f2b134');
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.4);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.46, r * 0.26, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#f7e8c0';
  ctx.fill();
  ctx.restore();
};

const PAINT: Record<FruitName, Paint> = {
  strawberry,
  orange,
  watermelon,
  kiwi,
  banana,
  apple,
  grape,
  pineapple,
  lemon,
  cherry,
  blueberry,
  mango,
};

/** Paint one, filling a disc the caller has clipped. */
export function drawFruit(
  ctx: CanvasRenderingContext2D,
  name: FruitName,
  x: number,
  y: number,
  radius: number,
): void {
  PAINT[name](ctx, x, y, radius);
}
