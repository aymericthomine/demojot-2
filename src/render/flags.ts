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
 * Eighty pixels is also the brief. These are read at the size of a thumbnail on
 * a phone, so what has to survive is the *arrangement* — which way the bands
 * run, where the charge sits, what two colours meet — and not the fine detail of
 * an emblem. Mexico's eagle, Spain's arms and the fifty stars are all beyond the
 * pixel budget and are drawn as the marks they read as at that size. Everything
 * that carries recognition at a glance is exact.
 *
 * Each painter draws into a box from `-r` to `r` about the origin. The caller
 * has already clipped to the disc, so a flag is painted square and the circle
 * does the cropping — which is what the reference does, and why the bands run
 * off the edge instead of being fitted inside it.
 */

export type FlagName =
  | 'de'
  | 'fr'
  | 'es'
  | 'gb'
  | 'ru'
  | 'us'
  | 'br'
  | 'ca'
  | 'mx'
  | 'in'
  | 'il'
  | 'dz';

type Painter = (ctx: CanvasRenderingContext2D, r: number) => void;

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
  de: bands(['#000000', '#dd0000', '#ffce00'], false),
  fr: bands(['#002395', '#ffffff', '#ed2939'], true),
  ru: bands(['#ffffff', '#0039a6', '#d52b1e'], false),

  es: split(
    [
      [0.25, '#aa151b'],
      [0.5, '#f1bf00'],
      [0.25, '#aa151b'],
    ],
    false,
  ),

  ca: (ctx, r) => {
    split(
      [
        [0.25, '#d80621'],
        [0.5, '#ffffff'],
        [0.25, '#d80621'],
      ],
      true,
    )(ctx, r);
    ctx.fillStyle = '#d80621';
    leaf(ctx, r * 0.52);
  },

  mx: (ctx, r) => {
    bands(['#006847', '#ffffff', '#ce1126'], true)(ctx, r);
    // The eagle, and only the eagle. The emblem is a bird on a cactus over a
    // wreath and at a dozen pixels none of that survives — a first try with the
    // wreath under it read as a mouth, and the whole mark as a face. What reads
    // as a bird at any size is a body between two wings, so that is all there
    // is, in the flat manner the rest of the set is drawn in.
    ctx.fillStyle = '#5c4a2a';
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

  in: (ctx, r) => {
    bands(['#ff9933', '#ffffff', '#138808'], false)(ctx, r);
    ctx.strokeStyle = '#000080';
    ctx.lineWidth = Math.max(1, r * 0.05);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2);
    ctx.stroke();
    // Spokes, thinned to eight: twenty-four at this size is a filled disc.
    for (let i = 0; i < 8; i += 1) {
      const angle = (i * Math.PI) / 4;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * r * 0.28, Math.sin(angle) * r * 0.28);
      ctx.stroke();
    }
  },

  il: (ctx, r) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-r, -r, 2 * r, 2 * r);
    ctx.fillStyle = '#0038b8';
    ctx.fillRect(-r, -r * 0.72, 2 * r, r * 0.22);
    ctx.fillRect(-r, r * 0.5, 2 * r, r * 0.22);
    ctx.strokeStyle = '#0038b8';
    ctx.lineWidth = Math.max(1, r * 0.07);
    for (const flip of [1, -1]) {
      ctx.beginPath();
      for (let i = 0; i < 3; i += 1) {
        const angle = -Math.PI / 2 + (i * Math.PI * 2) / 3;
        const x = Math.cos(angle) * r * 0.42;
        const y = Math.sin(angle) * r * 0.42 * flip;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
    }
  },

  dz: (ctx, r) => {
    ctx.fillStyle = '#006233';
    ctx.fillRect(-r, -r, r + 0.5, 2 * r);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, -r, r, 2 * r);
    // The crescent is a red disc with a white one laid over it, not a hole cut
    // out of one. Cutting would want `destination-out`, and the canvas the
    // encoder paints into is opaque — punching a hole in it has nothing behind
    // it to reveal, so what the flag would get is whatever that browser does
    // with a composite mode on a surface that has no alpha.
    ctx.fillStyle = '#d21034';
    ctx.beginPath();
    ctx.arc(-r * 0.04, 0, r * 0.44, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(r * 0.1, 0, r * 0.36, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d21034';
    star(ctx, r * 0.3, 0, r * 0.22);
  },

  br: (ctx, r) => {
    ctx.fillStyle = '#009c3b';
    ctx.fillRect(-r, -r, 2 * r, 2 * r);
    ctx.fillStyle = '#ffdf00';
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.8);
    ctx.lineTo(r * 0.86, 0);
    ctx.lineTo(0, r * 0.8);
    ctx.lineTo(-r * 0.86, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#002776';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.38, 0, Math.PI * 2);
    ctx.fill();
    // The band crosses the globe rather than arching over it. Drawn as a wide
    // arc clipped to the globe, which is what it is on the flag: a curve whose
    // centre is far below, cutting the disc on a gentle rise. Unclipped it came
    // out as a hoop floating above the blue, joined to nothing.
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.38, 0, Math.PI * 2);
    ctx.clip();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = r * 0.13;
    ctx.beginPath();
    ctx.arc(0, r * 0.86, r * 0.82, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();
    ctx.restore();
  },

  gb: (ctx, r) => {
    ctx.fillStyle = '#012169';
    ctx.fillRect(-r, -r, 2 * r, 2 * r);
    // The saltire twice — white behind, red in front and thinner — then the
    // cross of St George over both, which is the order the flag is built in.
    ctx.lineCap = 'butt';
    for (const [color, width] of [
      ['#ffffff', 0.34],
      ['#c8102e', 0.16],
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
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-r, -r * 0.3, 2 * r, r * 0.6);
    ctx.fillRect(-r * 0.3, -r, r * 0.6, 2 * r);
    ctx.fillStyle = '#c8102e';
    ctx.fillRect(-r, -r * 0.17, 2 * r, r * 0.34);
    ctx.fillRect(-r * 0.17, -r, r * 0.34, 2 * r);
  },

  us: (ctx, r) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-r, -r, 2 * r, 2 * r);
    ctx.fillStyle = '#b31942';
    const stripe = (2 * r) / 13;
    for (let i = 0; i < 13; i += 2) ctx.fillRect(-r, -r + stripe * i, 2 * r, stripe + 0.5);
    ctx.fillStyle = '#0a3161';
    ctx.fillRect(-r, -r, r * 0.9, stripe * 7);
    // Twenty dots for fifty stars. At this size a star is three pixels and a
    // grid of them is what the canton reads as anyway.
    ctx.fillStyle = '#ffffff';
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
