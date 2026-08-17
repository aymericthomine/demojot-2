/**
 * The dressing for the fixed mode, taken off the logo it is named after.
 *
 * Counted over both images of the logo: the cat is `#00b0d0` and covers a sixth
 * of each, the bolt through its head is `#e04080`, the outlines are black, and
 * the icon's ground is a pale sky between `#40e0ff` and `#a0f0ff` streaked with
 * white. The wide version is black for nearly three quarters of its area, which
 * is also what the videos this imitates use, so black is the ground here and the
 * pale sky is kept for the light that comes off the ring.
 */

/** The two colours the logo is built from, and the ink around them. */
export const BEAST = {
  cyan: '#00b0d0',
  pink: '#e04080',
  sky: '#40e0ff',
  ice: '#a0f0ff',
} as const;

/**
 * Seven balls out of two hues.
 *
 * A brand with two colours in it does not hand you seven that can be told apart,
 * so the two are spread across lightness instead: three blues from pale ice to
 * the logo's own cyan, three pinks from the logo's own to a deep magenta, and
 * white between them. Nothing here is outside the family.
 *
 * Two of them were moved after looking at a frame rather than at the list: the
 * palest blue was near enough to the white next to it to be mistaken for it at
 * the size a ball is drawn, and the deepest magenta was dark enough on black to
 * read as a hole. Both are a step back towards the middle.
 */
export const BEAST_BALLS: readonly string[] = [
  '#00b0d0',
  '#40e0ff',
  '#7ce8ff',
  '#ffffff',
  '#ff70a8',
  '#e04080',
  '#c01a63',
];

/** How many streaks cross the frame, and how far off vertical they lean. */
const STREAKS = 11;
const LEAN = 0.42;

/**
 * The ground: black, with the logo's lightning across it and a glow where the
 * ring will sit.
 *
 * Drawn dark on purpose. The icon puts white bolts on pale sky, which is the
 * right way round for a badge an inch across and the wrong way round for this —
 * every thread in the ring is a two-pixel coloured line, and a busy light ground
 * eats them. So the bolts are here at a tenth of their strength: texture that
 * reads as the logo without arguing with the picture on top of it.
 *
 * Fixed rather than dealt, like everything else in this mode: the same ground in
 * every video.
 */
export function paintBeastGround(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
): void {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.fillStyle = BEAST.cyan;
  for (let i = 0; i < STREAKS; i += 1) {
    // Spread across a width and a half so the lean does not leave a bare edge.
    const at = (i / (STREAKS - 1) - 0.25) * width * 1.5;
    const wide = width * (i % 3 === 0 ? 0.055 : 0.03);
    // A bolt rather than a slash: three kinks down the height of the frame.
    const kinks = [0, 0.34, 0.4, 0.74, 0.8, 1];
    const shift = [0, 0.16, -0.06, 0.1, -0.12, 0.04];
    ctx.beginPath();
    kinks.forEach((t, k) => {
      const x = at + t * height * LEAN + shift[k] * width * 0.12;
      const y = t * height;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    for (let k = kinks.length - 1; k >= 0; k -= 1) {
      const x = at + kinks[k] * height * LEAN + shift[k] * width * 0.12 + wide;
      ctx.lineTo(x, kinks[k] * height);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // The light the ring sits in. Nothing in the logo, everything in the videos.
  const glow = ctx.createRadialGradient(
    width / 2,
    height / 2,
    width * 0.1,
    width / 2,
    height / 2,
    width * 0.75,
  );
  glow.addColorStop(0, 'rgba(0, 176, 208, 0.16)');
  glow.addColorStop(0.55, 'rgba(0, 176, 208, 0.05)');
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);
}

/** The ring, as a sweep from one logo colour to the other and back. */
export function beastRing(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
): CanvasGradient {
  const sweep = ctx.createLinearGradient(cx - radius, cy - radius, cx + radius, cy + radius);
  sweep.addColorStop(0, BEAST.ice);
  sweep.addColorStop(0.42, BEAST.cyan);
  sweep.addColorStop(1, BEAST.pink);
  return sweep;
}
