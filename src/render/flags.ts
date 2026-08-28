/**
 * Twelve flags, drawn rather than typed.
 *
 * The obvious way to put a flag on a ball is the regional-indicator emoji, and
 * it is the wrong way twice over: it is a smiley by another name, and half the
 * platforms that matter refuse to draw it at all — Windows shows two letters,
 * and a video made there would come out spelling `DE` where Germany should be.
 * A drawn flag is the same picture on every machine, and it is the only kind
 * that survives being encoded at eighty pixels across.
 *
 * **The palette is the reference's, not the flags'.** Sampled off the icon set
 * this was matched to, every red in it is the same red, every blue the same
 * blue, every gold the same gold — which is what makes a set of flat icons look
 * like a set rather than like twelve pictures that happen to be round. Official
 * colours would be more correct and would look worse: France's navy beside
 * Russia's brighter blue reads as one of the two being a mistake.
 *
 * Eighty pixels is the other half of the brief. These are read at the size of a
 * thumbnail on a phone, so what has to survive is the *arrangement* — which way
 * the bands run, where the charge sits, what two colours meet — and not the fine
 * detail of an emblem. Spain's arms and Mexico's eagle are drawn as the marks
 * they read as at that size; everything that carries recognition at a glance is
 * exact.
 *
 * Each painter draws into a box from `-r` to `r` about the origin. The caller
 * has already clipped to the disc, so a flag is painted square and the circle
 * does the cropping — which is what the reference does, and why the bands run
 * off the edge instead of being fitted inside it.
 */

export type FlagName =
  | 'us'
  | 'cn'
  | 'jp'
  | 'de'
  | 'in'
  | 'gb'
  | 'fr'
  | 'it'
  | 'ca'
  | 'ru'
  | 'es'
  | 'mx';

type Painter = (ctx: CanvasRenderingContext2D, r: number) => void;

/** The set's own colours, read off the reference icons. */
const RED = '#ff0b00';
const BLUE = '#014ebf';
const GOLD = '#fece00';
const NAVY = '#3a386f';
const WHITE = '#ffffff';
const BLACK = '#000000';
const SAFFRON = '#fe9c22';
const INDIA_GREEN = '#018900';
const ITALY_GREEN = '#009a56';
const MEXICO_GREEN = '#01643e';
const CHAKRA = '#080467';
const EAGLE = '#5c4a2a';

/**
 * Equal bands across the box.
 *
 * Each is drawn half a pixel long so the next one starts under it: abutting
 * fills leave a seam of ground showing between them once the canvas antialiases
 * the shared edge, and a hairline of black across the middle of a tricolour is
 * the first thing the eye finds.
 */
const bands =
  (colors: readonly string[], vertical: boolean): Painter =>
  (ctx, r) => {
    const step = (2 * r) / colors.length;
    colors.forEach((color, i) => {
      ctx.fillStyle = color;
      const at = -r + step * i;
      if (vertical) ctx.fillRect(at, -r, step + 0.5, 2 * r);
      else ctx.fillRect(-r, at, 2 * r, step + 0.5);
    });
  };

/** Bands of unequal width, given as fractions of the box. */
const split =
  (parts: readonly (readonly [number, string])[], vertical: boolean): Painter =>
  (ctx, r) => {
    let at = -r;
    for (const [share, color] of parts) {
      const size = 2 * r * share;
      ctx.fillStyle = color;
      if (vertical) ctx.fillRect(at, -r, size + 0.5, 2 * r);
      else ctx.fillRect(-r, at, 2 * r, size + 0.5);
      at += size;
    }
  };

/** A five-pointed star, point up, of the given outer radius. */
function star(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const reach = i % 2 === 0 ? size : size * 0.382;
    const angle = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(angle) * reach;
    const y = cy + Math.sin(angle) * reach;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * The maple leaf, as a half outline mirrored about the stem.
 *
 * What makes it read as a maple leaf and not as a star is the *depth of the
 * notches*: three lobes separated by cuts that come most of the way back to the
 * middle, with a pair of small serrations either side of the crown. A first
 * version with shallow notches and evenly spread points came out as an asterisk,
 * which is the failure this list is shaped to avoid.
 *
 * Right half only, from the crown down to the stem, x out and y up.
 */
const LEAF: readonly (readonly [number, number])[] = [
  [0.0, 1.0],
  [0.16, 0.42],
  [0.34, 0.48],
  [0.27, 0.3],
  [0.58, 0.36],
  [0.5, 0.2],
  [0.86, 0.09],
  [0.66, -0.04],
  [0.72, -0.16],
  [0.34, -0.12],
  [0.4, -0.54],
  [0.15, -0.48],
  [0.15, -0.88],
];

function leaf(ctx: CanvasRenderingContext2D, size: number): void {
  ctx.beginPath();
  ctx.moveTo(0, -size);
  for (let i = 1; i < LEAF.length; i += 1) {
    ctx.lineTo(LEAF[i][0] * size, -LEAF[i][1] * size);
  }
  for (let i = LEAF.length - 1; i >= 1; i -= 1) {
    ctx.lineTo(-LEAF[i][0] * size, -LEAF[i][1] * size);
  }
  ctx.closePath();
  ctx.fill();
}

export const FLAGS: Record<FlagName, Painter> = {
  ru: bands([WHITE, BLUE, RED], false),
  de: bands([BLACK, RED, GOLD], false),
  fr: bands([BLUE, WHITE, RED], true),
  it: bands([ITALY_GREEN, WHITE, RED], true),

  jp: (ctx, r) => {
    ctx.fillStyle = WHITE;
    ctx.fillRect(-r, -r, 2 * r, 2 * r);
    ctx.fillStyle = RED;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.44, 0, Math.PI * 2);
    ctx.fill();
  },

  cn: (ctx, r) => {
    ctx.fillStyle = RED;
    ctx.fillRect(-r, -r, 2 * r, 2 * r);
    ctx.fillStyle = GOLD;
    star(ctx, -r * 0.5, -r * 0.42, r * 0.26);
    // The four small ones in their arc to the right of it. Each really points at
    // the big star; that rotation is a pixel's worth of difference here and is
    // not drawn.
    for (const [x, y] of [
      [-0.09, -0.68],
      [0.05, -0.5],
      [0.05, -0.26],
      [-0.09, -0.08],
    ] as const) {
      star(ctx, x * r, y * r, r * 0.1);
    }
  },

  in: (ctx, r) => {
    bands([SAFFRON, WHITE, INDIA_GREEN], false)(ctx, r);
    ctx.strokeStyle = CHAKRA;
    ctx.lineWidth = Math.max(1, r * 0.05);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.26, 0, Math.PI * 2);
    ctx.stroke();
    // Spokes, thinned to eight: twenty-four at this size is a filled disc.
    for (let i = 0; i < 8; i += 1) {
      const angle = (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * r * 0.26, Math.sin(angle) * r * 0.26);
      ctx.stroke();
    }
  },

  ca: (ctx, r) => {
    split(
      [
        [0.25, RED],
        [0.5, WHITE],
        [0.25, RED],
      ],
      true,
    )(ctx, r);
    ctx.fillStyle = RED;
    leaf(ctx, r * 0.52);
  },

  es: (ctx, r) => {
    split(
      [
        [0.25, RED],
        [0.5, GOLD],
        [0.25, RED],
      ],
      false,
    )(ctx, r);
    // The arms, as the shield-shaped mark they come down to. The quarters, the
    // pillars and the crown are all under a pixel here; what is left is that
    // Spain's gold band carries a small red charge to the left of centre.
    ctx.fillStyle = RED;
    ctx.beginPath();
    ctx.moveTo(-r * 0.46, -r * 0.17);
    ctx.lineTo(-r * 0.22, -r * 0.17);
    ctx.lineTo(-r * 0.22, r * 0.06);
    ctx.quadraticCurveTo(-r * 0.34, r * 0.22, -r * 0.46, r * 0.06);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = GOLD;
    ctx.fillRect(-r * 0.4, -r * 0.11, r * 0.05, r * 0.18);
    ctx.fillRect(-r * 0.31, -r * 0.11, r * 0.05, r * 0.18);
  },

  mx: (ctx, r) => {
    bands([MEXICO_GREEN, WHITE, RED], true)(ctx, r);
    // The eagle, and only the eagle. The emblem is a bird on a cactus over a
    // wreath and at a dozen pixels none of that survives — a first try with the
    // wreath under it read as a mouth, and the whole mark as a face. What reads
    // as a bird at any size is a body between two wings, so that is all there
    // is, in the flat manner the rest of the set is drawn in.
    ctx.fillStyle = EAGLE;
    ctx.beginPath();
    ctx.ellipse(0, r * 0.02, r * 0.055, r * 0.16, 0, 0, Math.PI * 2);
    ctx.fill();
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * r * 0.03, -r * 0.09);
      ctx.quadraticCurveTo(side * r * 0.2, -r * 0.28, side * r * 0.32, -r * 0.17);
      ctx.quadraticCurveTo(side * r * 0.19, -r * 0.11, side * r * 0.05, r * 0.02);
      ctx.closePath();
      ctx.fill();
    }
  },

  gb: (ctx, r) => {
    ctx.fillStyle = NAVY;
    ctx.fillRect(-r, -r, 2 * r, 2 * r);
    // The saltire twice — white behind, red in front and thinner — then the
    // cross of St George over both, which is the order the flag is built in.
    ctx.lineCap = 'butt';
    for (const [color, width] of [
      [WHITE, 0.34],
      [RED, 0.16],
    ] as const) {
      ctx.strokeStyle = color;
      ctx.lineWidth = r * width;
      ctx.beginPath();
      ctx.moveTo(-r, -r);
      ctx.lineTo(r, r);
      ctx.moveTo(r, -r);
      ctx.lineTo(-r, r);
      ctx.stroke();
    }
    ctx.fillStyle = WHITE;
    ctx.fillRect(-r, -r * 0.3, 2 * r, r * 0.6);
    ctx.fillRect(-r * 0.3, -r, r * 0.6, 2 * r);
    ctx.fillStyle = RED;
    ctx.fillRect(-r, -r * 0.17, 2 * r, r * 0.34);
    ctx.fillRect(-r * 0.17, -r, r * 0.34, 2 * r);
  },

  us: (ctx, r) => {
    ctx.fillStyle = WHITE;
    ctx.fillRect(-r, -r, 2 * r, 2 * r);
    ctx.fillStyle = RED;
    const stripe = (2 * r) / 13;
    for (let i = 0; i < 13; i += 2) ctx.fillRect(-r, -r + stripe * i, 2 * r, stripe + 0.5);
    ctx.fillStyle = NAVY;
    ctx.fillRect(-r, -r, r * 0.9, stripe * 7);
    // Twenty dots for fifty stars. At this size a star is three pixels and a
    // grid of them is what the canton reads as anyway.
    ctx.fillStyle = WHITE;
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 5; col += 1) {
        ctx.beginPath();
        ctx.arc(
          -r * 0.86 + col * r * 0.19,
          -r * 0.86 + row * stripe * 1.7,
          Math.max(0.8, r * 0.045),
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
    }
  },
};
