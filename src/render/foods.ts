/**
 * Twelve dishes, drawn the way the sport balls are drawn.
 *
 * The list is a given — pizza, burger, sushi, tacos, ramen, pasta, curry,
 * dumplings, fried chicken, burrito, kebab, chips — and it is a list of dishes
 * rather than of round things, which is the interesting part. A disc is what
 * every mode here puts on its board, so each of these is drawn as the view of
 * itself that *is* a disc: a pizza and a bowl of ramen from above, a maki roll
 * and a burrito from the cut end, a burger and a kebab side on. Nothing is a
 * picture of a plate with a thing on it.
 *
 * The country each comes from is not drawn. A flag inside a forty-pixel disc
 * that already has a dish in it is two pictures fighting, and the dish is the
 * one being named — the origins live in the list and not on the ball.
 *
 * They are read at about forty pixels across in a Pachinko scoreboard and
 * thirty-five falling through its field, so each one carries the two or three
 * marks that survive there: the pepperoni, the lettuce, the noodle, the bone.
 * Anything finer is mud at that size and has been left out.
 */

export type FoodName =
  | 'pizza'
  | 'burger'
  | 'sushi'
  | 'tacos'
  | 'ramen'
  | 'pasta'
  | 'curry'
  | 'dumpling'
  | 'chicken'
  | 'burrito'
  | 'kebab'
  | 'fries';

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

/** Small round things — pepperoni, spring onion, sesame, beans. */
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

/** A band straight across the disc, cut to shape by the caller's clip. */
function band(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  from: number,
  to: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.fillRect(x - r, y + from * r, r * 2, (to - from) * r);
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
  disc(ctx, x, y, r, '#d99a4e');
  band(ctx, x, y, r, -0.16, 0.06, '#5fa83c');
  band(ctx, x, y, r, 0.06, 0.42, '#7a4a2a');
  band(ctx, x, y, r, 0.42, 1, '#c98a3f');
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

const sushi: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#2f3d33');
  disc(ctx, x, y, r * 0.84, '#f2efe6');
  disc(ctx, x, y, r * 0.36, '#e8734a');
  // The green in the middle of a roll, which is what stops it reading as an egg.
  disc(ctx, x, y, r * 0.13, '#4f9a3f');
};

const tacos: Paint = (ctx, x, y, r) => {
  // Head on: the shell is the bottom of the disc and the filling stands above
  // its rim, which is the only view of a taco that fits in a circle.
  disc(ctx, x, y, r, '#f2b33d');
  // Gold above the filling as well as below it: with a darker band across the
  // top it read as a bun, and there is already a burger in the cast.
  band(ctx, x, y, r, -0.4, -0.04, '#8a4a2a');
  band(ctx, x, y, r, -0.04, 0.2, '#5fa83c');
  scatter(
    ctx,
    x,
    y,
    r,
    [
      [-0.44, -0.12, 0.1],
      [0.1, -0.2, 0.1],
      [0.46, -0.06, 0.09],
    ],
    '#d94f2b',
  );
  // No line under the filling. There was an arc there to say "shell", and at
  // this size an arc across the bottom of a circle is a smiling face.
};

const ramen: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#a34a1e');
  disc(ctx, x, y, r * 0.86, '#e0a13c');
  // Noodles: three shallow arcs, which is as much noodle as survives at this
  // size. Drawn before the toppings, because that is the order it is served in.
  ctx.strokeStyle = '#f7e6b8';
  ctx.lineWidth = r * 0.09;
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.arc(x, y + r * (0.34 - i * 0.26), r * 0.55, Math.PI * 0.15, Math.PI * 0.85);
    ctx.stroke();
  }
  // Nori on the left, the egg on the right.
  ctx.fillStyle = '#2f3d33';
  ctx.fillRect(x - r * 0.6, y - r * 0.46, r * 0.26, r * 0.54);
  disc(ctx, x + r * 0.42, y - r * 0.3, r * 0.26, '#f6f4ee');
  disc(ctx, x + r * 0.42, y - r * 0.3, r * 0.13, '#f7c948');
  scatter(
    ctx,
    x,
    y,
    r,
    [
      [-0.1, 0.6, 0.07],
      [0.24, 0.52, 0.07],
      [0.5, 0.3, 0.07],
    ],
    '#4f9a3f',
  );
};

const pasta: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#f2d489');
  // A nest: arcs at different radii, which reads as wound spaghetti where drawn
  // strands would read as a grille.
  ctx.strokeStyle = '#dfba5e';
  ctx.lineWidth = r * 0.1;
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.arc(x, y, r * (0.32 + i * 0.2), i * 1.7, i * 1.7 + Math.PI * 1.25);
    ctx.stroke();
  }
  disc(ctx, x, y, r * 0.3, '#c0392b');
  scatter(ctx, x, y, r, [[0.08, -0.06, 0.09]], '#4f9a3f');
};

const curry: Paint = (ctx, x, y, r) => {
  // Half rice, half sauce: the plate a curry is served on, from above.
  disc(ctx, x, y, r, '#f4f1e6');
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2);
  ctx.closePath();
  ctx.fillStyle = '#c4551f';
  ctx.fill();
  scatter(
    ctx,
    x,
    y,
    r,
    [
      [0.34, -0.38, 0.12],
      [0.52, 0.14, 0.1],
      [0.24, 0.42, 0.11],
    ],
    '#8a3a12',
  );
  // A few grains, so the pale half is rice rather than an empty plate.
  scatter(
    ctx,
    x,
    y,
    r,
    [
      [-0.4, -0.3, 0.05],
      [-0.5, 0.08, 0.05],
      [-0.3, 0.36, 0.05],
      [-0.16, -0.5, 0.05],
    ],
    '#ddd7c4',
  );
};

const dumpling: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#efe6d2');
  // The belly, and the pleats along the top: a dumpling is a plain dough shape
  // and the pleats are the whole of what names it.
  ctx.fillStyle = '#e2d5b8';
  ctx.beginPath();
  ctx.arc(x, y + r * 0.24, r * 0.72, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c9b892';
  ctx.lineWidth = r * 0.08;
  ctx.lineCap = 'round';
  for (let i = -2; i <= 2; i += 1) {
    const lean = i * 0.34;
    ctx.beginPath();
    ctx.moveTo(x + Math.sin(lean) * r * 0.62, y - r * 0.62 + Math.abs(i) * r * 0.06);
    ctx.lineTo(x + Math.sin(lean) * r * 0.36, y - r * 0.2 + Math.abs(i) * r * 0.04);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
};

const chicken: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#d9a441');
  // Crust: bumps rather than a texture, because a texture at this size is noise.
  scatter(
    ctx,
    x,
    y,
    r,
    [
      [-0.38, -0.36, 0.18],
      [0.24, -0.46, 0.16],
      [0.46, 0.0, 0.18],
      [-0.16, -0.06, 0.15],
      [-0.5, 0.16, 0.14],
    ],
    '#c08425',
  );
  // The bone, which is what says fried chicken rather than fried anything.
  ctx.strokeStyle = '#f6f4ee';
  ctx.lineWidth = r * 0.16;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.26, y + r * 0.5);
  ctx.lineTo(x + r * 0.28, y + r * 0.34);
  ctx.stroke();
  ctx.lineCap = 'butt';
  // A knob at each end, which is what makes a white bar a bone.
  scatter(
    ctx,
    x,
    y,
    r,
    [
      [-0.3, 0.42, 0.11],
      [-0.24, 0.62, 0.11],
      [0.32, 0.26, 0.1],
      [0.36, 0.44, 0.1],
    ],
    '#f6f4ee',
  );
};

const burrito: Paint = (ctx, x, y, r) => {
  // The cut end, which is the only view of a rolled thing that is a circle. The
  // roll has the same shape — a ring and a middle — and is told apart by what
  // the ring is: near black seaweed there, tortilla here, and a filling that is
  // several things rather than one.
  disc(ctx, x, y, r, '#e0c08a');
  disc(ctx, x, y, r * 0.78, '#f4f1e6');
  scatter(
    ctx,
    x,
    y,
    r,
    [
      [-0.28, -0.2, 0.17],
      [0.24, -0.3, 0.14],
      [0.3, 0.22, 0.16],
      [-0.2, 0.32, 0.13],
    ],
    '#6b3f1e',
  );
  scatter(
    ctx,
    x,
    y,
    r,
    [
      [0.02, 0.02, 0.13],
      [-0.44, 0.1, 0.1],
    ],
    '#c0392b',
  );
  scatter(ctx, x, y, r, [[0.06, -0.46, 0.1]], '#5fa83c');
};

const kebab: Paint = (ctx, x, y, r) => {
  // Side on in a pita: bread top and bottom, meat and salad through the middle.
  disc(ctx, x, y, r, '#e8cf9a');
  band(ctx, x, y, r, -0.24, 0.04, '#8a4a2a');
  band(ctx, x, y, r, 0.04, 0.2, '#5fa83c');
  scatter(
    ctx,
    x,
    y,
    r,
    [
      [-0.42, 0.12, 0.09],
      [0.16, 0.14, 0.09],
      [0.52, 0.08, 0.08],
    ],
    '#d94f2b',
  );
  // The white sauce, which is the other thing every one of them has on it.
  ctx.strokeStyle = '#f6f4ee';
  ctx.lineWidth = r * 0.09;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.66, y - r * 0.34);
  ctx.lineTo(x - r * 0.2, y - r * 0.42);
  ctx.lineTo(x + r * 0.24, y - r * 0.3);
  ctx.lineTo(x + r * 0.66, y - r * 0.4);
  ctx.stroke();
};

const fries: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#1f2430');
  // The chips first, fanned out of the carton, then the carton over them.
  ctx.strokeStyle = '#f2c94c';
  ctx.lineWidth = r * 0.16;
  ctx.lineCap = 'round';
  for (let i = -2; i <= 2; i += 1) {
    const lean = i * 0.3;
    ctx.beginPath();
    ctx.moveTo(x + Math.sin(lean) * r * 0.2, y + r * 0.3);
    ctx.lineTo(x + Math.sin(lean) * r * 1.1, y - r * 0.85 + Math.abs(i) * r * 0.16);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';
  ctx.fillStyle = '#e63946';
  ctx.beginPath();
  ctx.moveTo(x - r * 0.66, y + r * 0.1);
  ctx.lineTo(x + r * 0.66, y + r * 0.1);
  ctx.lineTo(x + r * 0.5, y + r * 1.1);
  ctx.lineTo(x - r * 0.5, y + r * 1.1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f6f4ee';
  ctx.fillRect(x - r * 0.66, y + r * 0.1, r * 1.32, r * 0.12);
};

const PAINT: Record<FoodName, Paint> = {
  pizza,
  burger,
  sushi,
  tacos,
  ramen,
  pasta,
  curry,
  dumpling,
  chicken,
  burrito,
  kebab,
  fries,
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
