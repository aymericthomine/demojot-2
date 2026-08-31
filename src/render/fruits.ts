/**
 * Twelve fruits, sliced.
 *
 * One rule and one view: every member is a **cut face**, filling its disc edge
 * to edge — skin at the rim, flesh inside it, and whatever the middle holds.
 * That is the only view under which twelve different fruits are twelve circles
 * rather than twelve pictures of things that happen to be round, and it is what
 * the reference sheets do: a slice is flat, has no background, and reads at any
 * size because it is made of rings.
 *
 * The twelve were asked for: avocado, kiwi, coconut, apple, orange, strawberry,
 * watermelon, melon, lemon, dragon fruit, guava — eleven — and the pineapple
 * makes up the number, since the games count to twelve and not to eleven. Every
 * one of them is a fruit somebody has actually seen cut in half, which is what
 * stops the drawing being a guess.
 *
 * They are read at about forty pixels across in a Pachinko scoreboard and
 * thirty-five falling through its field, so each carries the two or three marks
 * that survive there: the segments, the seed ring, the stone, the core.
 * Anything finer is mud at that size and has been left out.
 */

export type FruitName =
  | 'avocado'
  | 'kiwi'
  | 'coconut'
  | 'apple'
  | 'orange'
  | 'strawberry'
  | 'watermelon'
  | 'melon'
  | 'lemon'
  | 'dragonfruit'
  | 'guava'
  | 'pineapple';

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

/** Small round things — pips, seeds. */
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

/** Seeds set evenly round a circle — a kiwi's ring, an apple's core. */
function ring(count: number, out: number, size: number): [number, number, number][] {
  const places: [number, number, number][] = [];
  for (let i = 0; i < count; i += 1) {
    const angle = -Math.PI / 2 + (i / count) * Math.PI * 2;
    places.push([Math.cos(angle) * out, Math.sin(angle) * out, size]);
  }
  return places;
}

/**
 * A cut citrus: rind, pith, and wedges of flesh with the pith showing between
 * them.
 *
 * The wedges are drawn as shapes rather than the gaps as lines. A line between
 * two segments is one pixel of white at this size and disappears into the
 * flesh; a gap between two filled wedges is the same width and cannot, because
 * it is the pith showing through and the pith is the thing behind.
 */
function citrus(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  count: number,
  skin: string,
  pith: string,
  flesh: string,
): void {
  disc(ctx, x, y, r, skin);
  disc(ctx, x, y, r * 0.9, pith);
  const step = (Math.PI * 2) / count;
  const gap = step * 0.11;
  ctx.fillStyle = flesh;
  for (let i = 0; i < count; i += 1) {
    const from = -Math.PI / 2 + i * step + gap;
    const to = from + step - gap * 2;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.8, from, to);
    ctx.arc(x, y, r * 0.14, to, from, true);
    ctx.closePath();
    ctx.fill();
  }
}

const orange: Paint = (ctx, x, y, r) => {
  citrus(ctx, x, y, r, 10, '#e07a12', '#fbf1de', '#f59a1e');
};

const lemon: Paint = (ctx, x, y, r) => {
  citrus(ctx, x, y, r, 8, '#e8d024', '#fbf7dc', '#f4e04d');
};

const apple: Paint = (ctx, x, y, r) => {
  // Through the core: skin, flesh, and the five pips only an apple has in that
  // arrangement.
  disc(ctx, x, y, r, '#d42b2b');
  disc(ctx, x, y, r * 0.86, '#f8f1dc');
  ctx.strokeStyle = '#efe4c4';
  ctx.lineWidth = r * 0.07;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.44, 0, Math.PI * 2);
  ctx.stroke();
  scatter(ctx, x, y, r, ring(5, 0.3, 0.1), '#5a3a1a');
};

const strawberry: Paint = (ctx, x, y, r) => {
  // The cut face, not the skin: a red rim, pale flesh, a white core, and the
  // fine streaks that run out of it.
  disc(ctx, x, y, r, '#e0324b');
  disc(ctx, x, y, r * 0.86, '#f7b9bd');
  ctx.strokeStyle = '#f9dcdd';
  ctx.lineWidth = r * 0.06;
  for (let i = 0; i < 12; i += 1) {
    const angle = (i / 12) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * r * 0.2, y + Math.sin(angle) * r * 0.2);
    ctx.lineTo(x + Math.cos(angle) * r * 0.8, y + Math.sin(angle) * r * 0.8);
    ctx.stroke();
  }
  disc(ctx, x, y, r * 0.26, '#fbe9ea');
  scatter(ctx, x, y, r, ring(8, 0.62, 0.045), '#d94f2b');
};

const watermelon: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#2f7d3a');
  disc(ctx, x, y, r * 0.88, '#eef2e0');
  disc(ctx, x, y, r * 0.78, '#e14b5a');
  scatter(
    ctx,
    x,
    y,
    r,
    [
      [-0.3, -0.26, 0.075],
      [0.32, -0.2, 0.075],
      [0.02, 0.1, 0.075],
      [-0.26, 0.4, 0.075],
      [0.34, 0.36, 0.075],
      [0.06, -0.5, 0.075],
    ],
    '#1f2430',
  );
};

const kiwi: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#8a6a3a');
  disc(ctx, x, y, r * 0.9, '#a8c94a');
  // The pale heart, with the fibres running out of it.
  ctx.strokeStyle = '#e2eec0';
  ctx.lineWidth = r * 0.05;
  for (let i = 0; i < 14; i += 1) {
    const angle = (i / 14) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * r * 0.22, y + Math.sin(angle) * r * 0.22);
    ctx.lineTo(x + Math.cos(angle) * r * 0.62, y + Math.sin(angle) * r * 0.62);
    ctx.stroke();
  }
  disc(ctx, x, y, r * 0.26, '#f2f0dc');
  scatter(ctx, x, y, r, ring(11, 0.46, 0.05), '#2b2b22');
};

const pineapple: Paint = (ctx, x, y, r) => {
  // A ring, the way it is sold: notched rim, fibres, pale core.
  disc(ctx, x, y, r, '#d9a52a');
  ctx.fillStyle = '#c08e1e';
  for (const [dx, dy, size] of ring(12, 0.94, 0.13)) {
    ctx.beginPath();
    ctx.arc(x + dx * r, y + dy * r, size * r, 0, Math.PI * 2);
    ctx.fill();
  }
  disc(ctx, x, y, r * 0.82, '#f2c94c');
  ctx.strokeStyle = '#e0b232';
  ctx.lineWidth = r * 0.06;
  for (let i = 0; i < 16; i += 1) {
    const angle = (i / 16) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * r * 0.3, y + Math.sin(angle) * r * 0.3);
    ctx.lineTo(x + Math.cos(angle) * r * 0.8, y + Math.sin(angle) * r * 0.8);
    ctx.stroke();
  }
  disc(ctx, x, y, r * 0.28, '#f9e6a8');
};

const avocado: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#3f6b2b');
  disc(ctx, x, y, r * 0.88, '#cfe07a');
  disc(ctx, x, y, r * 0.66, '#aecf58');
  disc(ctx, x, y, r * 0.34, '#8a5a2b');
};

const coconut: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#6b4a2a');
  disc(ctx, x, y, r * 0.84, '#8a6a45');
  disc(ctx, x, y, r * 0.74, '#f7f3e6');
  // The hollow in the middle, which is what stops a white disc being an egg.
  disc(ctx, x, y, r * 0.4, '#e6dfcb');
};

const melon: Paint = (ctx, x, y, r) => {
  // A cantaloupe half: netted rind, orange flesh, and the seeds in the hollow
  // it is scooped from — which is the only thing separating it from a peach.
  disc(ctx, x, y, r, '#8fa04a');
  disc(ctx, x, y, r * 0.9, '#cfd98a');
  disc(ctx, x, y, r * 0.8, '#f2a04a');
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(-0.3);
  ctx.beginPath();
  ctx.ellipse(0, 0, r * 0.42, r * 0.3, 0, 0, Math.PI * 2);
  ctx.fillStyle = '#e8853a';
  ctx.fill();
  ctx.restore();
  scatter(
    ctx,
    x,
    y,
    r,
    [
      [-0.2, -0.08, 0.075],
      [0.0, -0.14, 0.075],
      [0.2, -0.04, 0.075],
      [-0.12, 0.1, 0.075],
      [0.1, 0.12, 0.075],
    ],
    '#f7e3b8',
  );
};

const dragonfruit: Paint = (ctx, x, y, r) => {
  // White flesh, seeds all through it rather than gathered in the middle, and a
  // rind that is the brightest thing in the cast.
  disc(ctx, x, y, r, '#e8449b');
  disc(ctx, x, y, r * 0.86, '#f8f4f2');
  const seeds: [number, number, number][] = [];
  for (let row = -2; row <= 2; row += 1) {
    for (let col = -2; col <= 2; col += 1) {
      const dx = (col + (row % 2 ? 0.5 : 0)) * 0.32;
      const dy = row * 0.3;
      if (dx * dx + dy * dy > 0.56) continue;
      seeds.push([dx, dy, 0.055]);
    }
  }
  scatter(ctx, x, y, r, seeds, '#2b2b30');
};

const guava: Paint = (ctx, x, y, r) => {
  // Green skin, pink flesh, and the seeds packed into a ring in the middle,
  // which is how a guava is told from a dragon fruit at this size.
  disc(ctx, x, y, r, '#7fae3a');
  disc(ctx, x, y, r * 0.88, '#f2e6c4');
  disc(ctx, x, y, r * 0.76, '#e8677f');
  disc(ctx, x, y, r * 0.42, '#f2a3ae');
  scatter(ctx, x, y, r, ring(7, 0.24, 0.07), '#c98a4a');
  scatter(ctx, x, y, r, [[0, 0, 0.07]], '#c98a4a');
};

const PAINT: Record<FruitName, Paint> = {
  avocado,
  kiwi,
  coconut,
  apple,
  orange,
  strawberry,
  watermelon,
  melon,
  lemon,
  dragonfruit,
  guava,
  pineapple,
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
