/**
 * Twelve fruits, drawn the way the sport balls are drawn.
 *
 * Fruit is the cast this project should have had first: the games put discs on
 * a board, and half of these already *are* discs — an orange, a watermelon and
 * a kiwi are circles the moment they are cut, and an apple, a cherry and a
 * blueberry are circles without being cut at all. The two that are not, the
 * banana and the bunch of grapes, are drawn on a ground of their own colour so
 * that the picture still fills the disc rather than floating on it.
 *
 * They are read at about forty pixels across in a Pachinko scoreboard and
 * thirty-five falling through its field, so each one carries the two or three
 * marks that survive there: the seeds, the segments, the crown, the stone.
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

/** Small round things — pips, seeds, berries. */
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

/** A leaf, at an angle, for the things that are picked with one still on. */
function leaf(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  dx: number,
  dy: number,
  size: number,
  turn: number,
  color: string,
): void {
  ctx.save();
  ctx.translate(x + dx * r, y + dy * r);
  ctx.rotate(turn);
  ctx.beginPath();
  ctx.ellipse(0, 0, size * r, size * r * 0.42, 0, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

const strawberry: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#e0324b');
  scatter(
    ctx,
    x,
    y,
    r,
    [
      [-0.34, 0.02, 0.06],
      [0.0, 0.16, 0.06],
      [0.36, 0.04, 0.06],
      [-0.2, 0.42, 0.06],
      [0.22, 0.44, 0.06],
      [-0.5, 0.34, 0.06],
      [0.52, 0.32, 0.06],
      [0.02, 0.68, 0.06],
      [-0.4, -0.28, 0.06],
      [0.42, -0.26, 0.06],
    ],
    '#f7d84a',
  );
  // The calyx: three leaves along the top edge, which is the whole of how a red
  // circle becomes a strawberry.
  leaf(ctx, x, y, r, -0.34, -0.62, 0.36, 0.5, '#3f8a2f');
  leaf(ctx, x, y, r, 0.34, -0.62, 0.36, -0.5, '#3f8a2f');
  leaf(ctx, x, y, r, 0, -0.74, 0.34, 0, '#4f9a3f');
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
  const seeds: [number, number, number][] = [];
  for (let i = 0; i < 10; i += 1) {
    const angle = (i / 10) * Math.PI * 2;
    seeds.push([Math.cos(angle) * 0.46, Math.sin(angle) * 0.46, 0.055]);
  }
  scatter(ctx, x, y, r, seeds, '#2b2b22');
};

const banana: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#e0982a');
  // A crescent between two circles about the same centre: the outer edge of the
  // fruit and its inner curve, which is all a banana is at this size.
  const cy = y + r * 0.72;
  ctx.beginPath();
  ctx.arc(x, cy, r * 1.12, -2.62, -0.52);
  ctx.arc(x, cy, r * 0.74, -0.52, -2.62, true);
  ctx.closePath();
  ctx.fillStyle = '#f7dd52';
  ctx.fill();
  // Both ends go brown, which is the other half of reading it as a banana.
  scatter(
    ctx,
    x,
    y,
    r,
    [
      [Math.cos(-2.62) * 0.93, 0.72 + Math.sin(-2.62) * 0.93, 0.1],
      [Math.cos(-0.52) * 0.93, 0.72 + Math.sin(-0.52) * 0.93, 0.1],
    ],
    '#7a5a2a',
  );
};

const apple: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#d42b2b');
  ctx.beginPath();
  ctx.arc(x - r * 0.34, y - r * 0.3, r * 0.26, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fill();
  ctx.strokeStyle = '#5a3a1a';
  ctx.lineWidth = r * 0.09;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x + r * 0.02, y - r * 0.5);
  ctx.quadraticCurveTo(x + r * 0.12, y - r * 0.78, x + r * 0.04, y - r * 0.95);
  ctx.stroke();
  ctx.lineCap = 'butt';
  leaf(ctx, x, y, r, 0.34, -0.68, 0.3, -0.5, '#4f9a3f');
};

const grape: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#7b4bc9');
  // A bunch: rows of berries narrowing towards the bottom, each one a shade off
  // the ground so the cluster reads without an outline.
  const rows: readonly (readonly [number, number])[] = [
    [-0.46, -0.36],
    [0.0, -0.36],
    [0.46, -0.36],
    [-0.24, 0.02],
    [0.24, 0.02],
    [0.0, 0.42],
  ];
  ctx.fillStyle = '#5f35a8';
  for (const [dx, dy] of rows) {
    ctx.beginPath();
    ctx.arc(x + dx * r, y + dy * r, r * 0.24, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#4f7a2a';
  ctx.lineWidth = r * 0.09;
  ctx.beginPath();
  ctx.moveTo(x, y - r * 0.56);
  ctx.lineTo(x, y - r * 0.95);
  ctx.stroke();
};

const pineapple: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#e0a02a');
  // The lattice, both ways, which is the skin of every pineapple ever drawn.
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
  // The crown, along the top edge.
  ctx.fillStyle = '#3f8a2f';
  for (let i = -2; i <= 2; i += 1) {
    ctx.beginPath();
    ctx.moveTo(x + i * r * 0.26 - r * 0.16, y - r * 0.5);
    ctx.lineTo(x + i * r * 0.26, y - r * 1.15);
    ctx.lineTo(x + i * r * 0.26 + r * 0.16, y - r * 0.5);
    ctx.closePath();
    ctx.fill();
  }
};

const lemon: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#f2edcc');
  disc(ctx, x, y, r * 0.86, '#f4e04d');
  segments(ctx, x, y, r, 6, 0.86, '#fbf6dc');
};

const cherry: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#d81e3f');
  // Two of them, because one cherry is an apple without a leaf.
  ctx.fillStyle = '#a80f2c';
  for (const dx of [-0.32, 0.34]) {
    ctx.beginPath();
    ctx.arc(x + dx * r, y + r * 0.34, r * 0.44, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.strokeStyle = '#4f7a2a';
  ctx.lineWidth = r * 0.08;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.32, y - r * 0.02);
  ctx.quadraticCurveTo(x - r * 0.1, y - r * 0.7, x + r * 0.06, y - r * 0.82);
  ctx.moveTo(x + r * 0.34, y - r * 0.02);
  ctx.quadraticCurveTo(x + r * 0.3, y - r * 0.6, x + r * 0.06, y - r * 0.82);
  ctx.stroke();
  leaf(ctx, x, y, r, 0.34, -0.78, 0.3, -0.4, '#4f9a3f');
};

const blueberry: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#4b5bbf');
  disc(ctx, x - r * 0.16, y - r * 0.16, r * 0.72, '#5f70d6');
  // The crown, which is the only mark a blueberry has and the whole of how it
  // is told from a plain blue circle.
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
  // being an apricot, and the stone is what stops it being an orange.
  disc(ctx, x, y, r, '#d94f2b');
  disc(ctx, x, y, r * 0.84, '#f2b134');
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.4);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.44, r * 0.26, 0, 0, Math.PI * 2);
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
