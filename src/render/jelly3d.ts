/**
 * Jelly, shaded.
 *
 * Every object in this mode is a flat silhouette turned into something that
 * reads as a solid of coloured gel. There is no mesh and no light vector: it is
 * five washes laid inside the silhouette's own clip, in an order taken off the
 * references frame by frame, and the order is the whole trick.
 *
 * 1. **Body.** A radial gradient whose centre sits up and to the left of the
 *    object's middle, running from a lifted tint through the colour itself to a
 *    darkened edge. This alone is a ball; it is not yet jelly.
 * 2. **Depth.** A second radial from the bottom-right corner in the darkened
 *    tint, which puts the far side of the object in its own shadow. A sphere
 *    lit from one side has a *terminator*, and without one the body gradient
 *    reads as a sticker of a ball rather than a ball.
 * 3. **Subsurface.** A wide, soft, saturated wash low in the object. This is the
 *    one that makes it gel rather than plastic: light that goes into a gummy
 *    sweet comes back out of its underside, so the bottom of a red jelly is
 *    brighter and more saturated than its middle, which is the opposite of what
 *    an opaque ball does.
 * 4. **Rim.** A bright hairline just inside the silhouette on the lower right,
 *    fading out towards the top. It is the light that has travelled through the
 *    object and caught the far wall, and it is what separates one jelly from the
 *    one behind it on a black ground.
 * 5. **Highlight.** A small soft ellipse up and left, and a smaller, harder one
 *    inside it. Two, not one: a single blurred blob reads as matte, and the hard
 *    core is what says the surface is wet.
 *
 * Round it all, a neon bloom in the object's own colour, drawn as a shadow
 * behind the silhouette so it never touches the object's own pixels.
 *
 * **Everything is painted through one offscreen canvas and blitted once.** The
 * washes overlap, and this project has been bitten twice by the same law: two
 * passes at partial alpha composite twice, so anything drawn in two goes comes
 * out denser where they meet. Building the object at full strength and putting
 * it down in a single draw is what keeps a jelly at the edge of a pile the same
 * colour as one in the middle.
 */

/** A silhouette: the caller has the context, the centre and the radius. */
export type Silhouette = (
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
) => void;

/** Whatever a shape wants to draw on top of the shading, inside the same clip. */
export type Marks = (
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
) => void;

export interface JellyShape {
  /** The outline the shading is poured into. */
  path: Silhouette;
  /** Anything drawn over the shading — bands, seeds, facets, sprinkles. */
  marks?: Marks;
  /** How far the silhouette reaches past the radius, for the glow's room. */
  reach?: number;
  /**
   * Never tumbled, however it lands.
   *
   * Most things look right at any angle. A few have an unmistakable up — a
   * pineapple's crown, an apple's stalk, a cone under a scoop — and a pineapple
   * lying on its side with its leaves out sideways reads as a mistake rather
   * than as a pineapple that has rolled.
   */
  upright?: boolean;
}

type Ctx = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

const clamp = (v: number, lo = 0, hi = 255): number => Math.max(lo, Math.min(hi, v));

/**
 * Pull a colour apart, hex or `rgb(...)`.
 *
 * The `rgb(...)` half is not decoration. These helpers return `rgb(...)`
 * strings, so composing them — `fade(sink(colour, 0.4), 0.2)`, which is how a
 * mark asks for a darker version of its object at partial strength — hands the
 * next one its own output. Parsing that as hex gives NaN, which canvas answers
 * by *keeping the style it already had*: the mark comes out in whatever was set
 * last, usually black, with nothing thrown. The pineapple's crosshatch drew
 * black for as long as it has existed.
 */
const parts = (color: string): [number, number, number] => {
  if (color.startsWith('rgb')) {
    const [r, g, b] = color
      .slice(color.indexOf('(') + 1)
      .split(',')
      .map((v) => Number.parseFloat(v));
    return [clamp(r), clamp(g), clamp(b)];
  }
  const n = Number.parseInt(color.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/** Towards white by `amount`, with a little extra saturation kept. */
export function lift(hex: string, amount: number): string {
  const [r, g, b] = parts(hex);
  return `rgb(${clamp(r + (255 - r) * amount)},${clamp(g + (255 - g) * amount)},${clamp(
    b + (255 - b) * amount,
  )})`;
}

/** Towards black by `amount`. */
export function sink(hex: string, amount: number): string {
  const [r, g, b] = parts(hex);
  return `rgb(${clamp(r * (1 - amount))},${clamp(g * (1 - amount))},${clamp(b * (1 - amount))})`;
}

/** The colour at a given alpha. */
export function fade(hex: string, alpha: number): string {
  const [r, g, b] = parts(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * The same colour with its most-of-the-way channel pushed up.
 *
 * Light coming back out of a gel is more saturated than the light going in, so
 * the underside wash cannot simply be the base colour — it has to be a
 * *purer* version of it, or the object reads as dusty.
 */
export function deepen(hex: string, alpha: number): string {
  const [r, g, b] = parts(hex);
  const top = Math.max(r, g, b);
  const pure = (v: number) => clamp(v + (v / (top || 1)) * 70 - 20);
  return `rgba(${pure(r)},${pure(g)},${pure(b)},${alpha})`;
}

/** A plain disc, which most objects are. */
export const sphere: Silhouette = (ctx, x, y, r) => {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
};

let scratch: OffscreenCanvas | HTMLCanvasElement | null = null;
let scratchCtx: Ctx | null = null;

/** One offscreen canvas, grown as needed and reused for every object. */
function board(size: number): { canvas: OffscreenCanvas | HTMLCanvasElement; ctx: Ctx } {
  const want = Math.max(64, Math.ceil(size));
  if (!scratch || scratch.width < want || scratch.height < want) {
    scratch =
      typeof OffscreenCanvas === 'undefined'
        ? Object.assign(document.createElement('canvas'), { width: want, height: want })
        : new OffscreenCanvas(want, want);
    scratchCtx = scratch.getContext('2d') as Ctx;
  }
  const ctx = scratchCtx as Ctx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, scratch.width, scratch.height);
  return { canvas: scratch, ctx };
}

/**
 * Paint one object.
 *
 * `glow` is how much bloom it wears, `pop` is the swell it is given in the
 * instant after a merge made it — nought normally, one at the moment of
 * creation, and it is a scale rather than a flash so it reads at any size.
 */
export function drawJelly(
  target: CanvasRenderingContext2D,
  shape: JellyShape,
  color: string,
  x: number,
  y: number,
  r: number,
  options: { glow?: number; pop?: number; turn?: number; alpha?: number } = {},
): void {
  const { glow = 1, pop = 1, alpha = 1 } = options;
  const turn = shape.upright ? 0 : (options.turn ?? 0);
  if (r <= 0.4 || alpha <= 0.01) return;

  // A merge's swell: the new object arrives small and springs open past its own
  // size. It is done here rather than in the simulation because it is a look,
  // not a physics — the body it collides with is always its true size.
  //
  // The same curve the pictures use, measured off a reference frame by frame:
  // 0.42 at the frame it appears, full at fifty milliseconds, a peak of 1.06 at
  // a hundred, settled by two hundred. This path kept the first guess long
  // after that measurement was made — a quarter too big, shrinking to fit,
  // which is the one thing the reference certainly does not do. Nothing drawn
  // had been watched closely enough to catch it.
  const swell = 1 - 0.58 * Math.exp(-4.5 * pop) * Math.cos(2 * Math.PI * pop);
  const reach = shape.reach ?? 1;
  const bloom = r * 0.75 * glow;
  const half = Math.ceil(r * reach * Math.max(swell, 1.06) + bloom + 4);
  const size = half * 2;
  const { canvas, ctx } = board(size);

  ctx.save();
  ctx.translate(half, half);
  const rr = r * swell;

  /**
   * Build the silhouette with the object turned, and hand back a context that
   * is the right way up again.
   *
   * The light does not turn with the object. Rotating the canvas and then
   * painting the washes through it put the highlight wherever the object
   * happened to be lying — a peach resting at a quarter turn was lit from
   * underneath, which reads as a hole rather than a gloss. Path points are
   * baked into user space as each command is issued, so the turn can be undone
   * the moment the outline is closed and everything after it is level.
   */
  const outline = (): void => {
    if (turn) ctx.rotate(turn);
    shape.path(ctx, 0, 0, rr);
    if (turn) ctx.rotate(-turn);
  };

  // The bloom first, as a shadow cast by the silhouette, so the object's own
  // pixels are never tinted by it.
  if (glow > 0) {
    ctx.save();
    ctx.shadowColor = fade(color, 0.85);
    ctx.shadowBlur = bloom;
    ctx.fillStyle = fade(color, 0.9);
    outline();
    ctx.fill();
    // Twice through the same shadow is what gives the references their depth of
    // bloom; the silhouette underneath is covered by the body wash that follows.
    ctx.shadowBlur = bloom * 0.45;
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  outline();
  ctx.clip();

  // 1. Body.
  const body = ctx.createRadialGradient(-rr * 0.3, -rr * 0.38, rr * 0.05, 0, 0, rr * 1.25);
  body.addColorStop(0, lift(color, 0.5));
  body.addColorStop(0.35, lift(color, 0.12));
  body.addColorStop(0.72, color);
  body.addColorStop(1, sink(color, 0.45));
  ctx.fillStyle = body;
  ctx.fillRect(-half, -half, size, size);

  // 2. Depth: the far side falls into its own shadow.
  const dark = ctx.createRadialGradient(rr * 0.55, rr * 0.6, rr * 0.05, rr * 0.3, rr * 0.35, rr * 1.5);
  dark.addColorStop(0, `rgba(0,0,0,0.42)`);
  dark.addColorStop(0.55, `rgba(0,0,0,0.12)`);
  dark.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = dark;
  ctx.fillRect(-half, -half, size, size);

  // 3. Subsurface: light coming back out of the underside.
  const under = ctx.createRadialGradient(rr * 0.1, rr * 0.52, rr * 0.04, rr * 0.05, rr * 0.5, rr * 0.95);
  under.addColorStop(0, deepen(color, 0.5));
  under.addColorStop(0.6, deepen(color, 0.16));
  under.addColorStop(1, fade(color, 0));
  ctx.fillStyle = under;
  ctx.fillRect(-half, -half, size, size);

  if (shape.marks) {
    if (turn) ctx.rotate(turn);
    shape.marks(ctx, 0, 0, rr, color);
    if (turn) ctx.rotate(-turn);
  }

  // 4. Rim: a hairline of travelled light, low and to the right.
  ctx.save();
  ctx.lineWidth = Math.max(1, rr * 0.11);
  const rim = ctx.createLinearGradient(-rr * 0.6, -rr, rr * 0.7, rr);
  rim.addColorStop(0, fade(color, 0));
  rim.addColorStop(0.45, lift(color, 0.25).replace('rgb', 'rgba').replace(')', ',0.35)'));
  rim.addColorStop(1, lift(color, 0.85).replace('rgb', 'rgba').replace(')', ',0.95)'));
  ctx.strokeStyle = rim;
  outline();
  ctx.stroke();
  ctx.restore();

  // 5. Highlight: a soft one and a hard one inside it.
  const soft = ctx.createRadialGradient(-rr * 0.36, -rr * 0.44, 0, -rr * 0.36, -rr * 0.44, rr * 0.5);
  soft.addColorStop(0, 'rgba(255,255,255,0.72)');
  soft.addColorStop(0.55, 'rgba(255,255,255,0.14)');
  soft.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = soft;
  ctx.fillRect(-half, -half, size, size);

  ctx.save();
  ctx.translate(-rr * 0.34, -rr * 0.46);
  ctx.rotate(-0.5);
  ctx.scale(1, 0.58);
  const hard = ctx.createRadialGradient(0, 0, 0, 0, 0, rr * 0.24);
  hard.addColorStop(0, 'rgba(255,255,255,0.95)');
  hard.addColorStop(0.6, 'rgba(255,255,255,0.5)');
  hard.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = hard;
  ctx.beginPath();
  ctx.arc(0, 0, rr * 0.24, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();
  ctx.restore();

  target.save();
  target.globalAlpha = alpha;
  target.drawImage(canvas as CanvasImageSource, x - half, y - half);
  target.restore();
}
