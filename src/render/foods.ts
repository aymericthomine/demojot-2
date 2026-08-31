/**
 * Twelve things to eat, drawn the way the sport balls are drawn.
 *
 * The cast had to be round before it was anything else: every mode here puts a
 * disc on a board, so the twelve are foods that already *are* discs — a pizza
 * from above, a maki roll from the end, a slice of orange, an avocado cut in
 * half. Nothing is a picture of a plate, and nothing needs a scene round it to
 * be read, which was the mistake the rugby ball made before it gave up its
 * pitch.
 *
 * They are read at about forty pixels across in a Pachinko scoreboard and
 * thirty-five falling through its field, so each one carries the two or three
 * marks that survive there: the pepperoni, the sprinkles, the yolk, the stone.
 * Anything finer is mud at that size and has been left out.
 */

export type FoodName =
  | 'pizza'
  | 'burger'
  | 'donut'
  | 'sushi'
  | 'egg'
  | 'orange'
  | 'watermelon'
  | 'avocado'
  | 'cookie'
  | 'blueberry'
  | 'cheese'
  | 'coffee';

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

/** A ring of small round things — pepperoni, chocolate, seeds. */
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

const pizza: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#e8b76a');
  disc(ctx, x, y, r * 0.8, '#d94f2b');
  scatter(
    ctx,
    x,
    y,
    r,
    [
      [0, -0.42, 0.15],
      [-0.4, -0.1, 0.15],
      [0.4, -0.1, 0.15],
      [-0.24, 0.42, 0.15],
      [0.24, 0.42, 0.15],
      [0, 0.05, 0.13],
    ],
    '#a3241c',
  );
};

const burger: Paint = (ctx, x, y, r) => {
  // Side on, in bands: the one food here that is not a circle from above, and
  // the bands are what make it read as one anyway.
  disc(ctx, x, y, r, '#d99a4e');
  const band = (from: number, to: number, color: string) => {
    ctx.fillStyle = color;
    ctx.fillRect(x - r, y + from * r, r * 2, (to - from) * r);
  };
  band(-0.16, 0.06, '#5fa83c');
  band(0.06, 0.42, '#7a4a2a');
  band(0.42, 1, '#c98a3f');
  // Sesame on the crown.
  scatter(
    ctx,
    x,
    y,
    r,
    [
      [-0.34, -0.5, 0.06],
      [0.04, -0.62, 0.06],
      [0.38, -0.44, 0.06],
    ],
    '#f6e6c8',
  );
};

const donut: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#e8b76a');
  disc(ctx, x, y, r * 0.9, '#f06fa8');
  // The hole, in the grey a picture sits on: a doughnut without one is a biscuit.
  disc(ctx, x, y, r * 0.3, '#31343d');
  ctx.lineCap = 'round';
  ctx.lineWidth = r * 0.08;
  const sprinkles: readonly (readonly [number, number, number])[] = [
    [-0.5, -0.3, 0.6],
    [0.45, -0.4, -0.4],
    [0.55, 0.25, 1.1],
    [-0.3, 0.55, 0.2],
    [0.1, -0.62, 0.9],
    [-0.62, 0.15, -0.7],
  ];
  const colours = ['#fbe15a', '#4fd1c5', '#ffffff', '#7ee081', '#ffffff', '#fbe15a'];
  sprinkles.forEach(([dx, dy, turn], i) => {
    ctx.strokeStyle = colours[i];
    ctx.beginPath();
    ctx.moveTo(x + dx * r - Math.cos(turn) * r * 0.11, y + dy * r - Math.sin(turn) * r * 0.11);
    ctx.lineTo(x + dx * r + Math.cos(turn) * r * 0.11, y + dy * r + Math.sin(turn) * r * 0.11);
    ctx.stroke();
  });
  ctx.lineCap = 'butt';
};

const sushi: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#2f3d33');
  disc(ctx, x, y, r * 0.84, '#f2efe6');
  disc(ctx, x, y, r * 0.36, '#e8734a');
  // The green in the middle of a roll, which is what stops it reading as an egg.
  disc(ctx, x, y, r * 0.13, '#4f9a3f');
};

const egg: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#f6f4ee');
  disc(ctx, x + r * 0.08, y - r * 0.05, r * 0.42, '#f7c948');
  ctx.beginPath();
  ctx.arc(x - r * 0.04, y - r * 0.18, r * 0.14, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.fill();
};

const orange: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#f2f0e4');
  disc(ctx, x, y, r * 0.88, '#f59a1e');
  ctx.strokeStyle = '#f7ede0';
  ctx.lineWidth = r * 0.07;
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(angle) * r * 0.06, y + Math.sin(angle) * r * 0.06);
    ctx.lineTo(x + Math.cos(angle) * r * 0.88, y + Math.sin(angle) * r * 0.88);
    ctx.stroke();
  }
  disc(ctx, x, y, r * 0.09, '#f7ede0');
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

const avocado: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#3f6b2b');
  disc(ctx, x, y, r * 0.86, '#c8de6a');
  disc(ctx, x, y, r * 0.62, '#a9cf5a');
  disc(ctx, x, y, r * 0.3, '#8a5a2b');
};

const cookie: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#c99a5b');
  scatter(
    ctx,
    x,
    y,
    r,
    [
      [-0.4, -0.32, 0.14],
      [0.28, -0.44, 0.11],
      [0.46, 0.12, 0.13],
      [-0.14, 0.16, 0.12],
      [-0.44, 0.38, 0.1],
      [0.16, 0.5, 0.13],
    ],
    '#4a2c1a',
  );
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

const cheese: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#e8b93a');
  scatter(
    ctx,
    x,
    y,
    r,
    [
      [-0.36, -0.3, 0.19],
      [0.34, -0.36, 0.13],
      [0.4, 0.22, 0.17],
      [-0.28, 0.42, 0.14],
      [0.0, 0.04, 0.11],
    ],
    '#c08e1e',
  );
};

const coffee: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#e8e2d6');
  disc(ctx, x, y, r * 0.86, '#4a2c1a');
  // The crema, and a swirl through it: black coffee alone is a black disc, and
  // there is already one of those in the sport cast.
  ctx.strokeStyle = '#b98a4e';
  ctx.lineWidth = r * 0.16;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.6, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = r * 0.1;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.28, -0.4, Math.PI * 1.4);
  ctx.stroke();
};

const PAINT: Record<FoodName, Paint> = {
  pizza,
  burger,
  donut,
  sushi,
  egg,
  orange,
  watermelon,
  avocado,
  cookie,
  blueberry,
  cheese,
  coffee,
};

/** Paint one, filling a disc the caller has clipped. */
export function drawFood(
  ctx: CanvasRenderingContext2D,
  name: FoodName,
  x: number,
  y: number,
  radius: number,
): void {
  PAINT[name](ctx, x, y, radius);
}
