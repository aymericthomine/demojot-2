'use client';

/**
 * The themes' artwork.
 *
 * Two hundred and fifty-six pictures, eight to a theme, cut off sixteen sheets
 * that were supplied for this mode. They replace the drawn gels that were here first — those were made
 * because there was nothing else, and the note in the README at the time said
 * plainly that they were drawn gels rather than rendered assets and nobody would
 * mistake one for the other. These are the rendered assets.
 *
 * They are kept at twice the size the sheets give, resampled and sharpened: the
 * sheets are about 130 pixels an object and the top of the ladder is drawn at
 * 620, so the canvas was stretching the biggest thing in the video four or five
 * times and it was the softest thing on screen.
 *
 * **They are files rather than data.** The flags in this project are carried as
 * base64 inside a module because twelve small icons come to ninety kilobytes and
 * data cannot fail to arrive. All of them together come to megabytes as base64,
 * which
 * is a page that will not load on a phone, so they are fetched — but only the
 * eight belonging to the theme being made.
 *
 * **The paths are relative on purpose.** A static export served from
 * `/demojot-2/` has no way to tell a hand-written `fetch` about its own prefix:
 * `assetPrefix` rewrites what Next emits, not what this asks for. A relative
 * path resolves against the page, so `jelly/fruit/0.webp` is right under the
 * sub-path and right at the root, with nothing to configure and nothing to get
 * out of step.
 *
 * A theme that fails to load is not fatal. The drawn shapes are still in the
 * build and the painter falls back to them, so a round comes out looking like
 * the older version of this mode rather than coming out broken.
 */

import { SKIN } from '../sim/jelly';
import type { ThemeName } from './themes';

/** Where a picture's body sits inside it, so the art can be put on a circle. */
export interface Art {
  /** Relative to `public/jelly/`. */
  file: string;
  w: number;
  h: number;
  /** The body's middle, as a fraction of the picture. */
  cx: number;
  cy: number;
  /** How many of the picture's pixels the body spans, corner to corner. */
  span: number;
  /**
   * The furthest any lit pixel of the picture sits from the body's middle, as a
   * multiple of half the span — which is to say, how far the drawing sticks out
   * past the circle the simulation is pushing around.
   *
   * It is never one. A hat has a brim, a dragonfly has wings and an ant has
   * legs, and across every picture the middle of this is 1.19: every
   * object was being drawn a fifth wider than the circle that holds it off the
   * glass. Resting against the bowl, an object the size of the one the video
   * ends on hung eighty pixels out through the side of the flask, which is what
   * the wall's own line then appeared to slice through.
   *
   * It is measured on the solid body rather than on the last visible speck of
   * glow, because glow crossing the glass is what the references do too — their
   * bloom bleeds over the line wherever an object rests against it. Solid
   * crossing the glass is not.
   *
   * The simulation holds every object `SKIN` radii off the glass, which is the
   * median of this number, so most pictures are drawn at their own size and
   * land exactly against the line. Only the handful that reach further — a
   * fairy's wings, a witch's hat — are scaled back to it.
   */
  reach: number;
}

const loaded = new Map<string, ImageBitmap>();
const loading = new Map<ThemeName, Promise<void>>();

/**
 * Fetch and decode one theme's eight pictures.
 *
 * Asked for twice — once when the theme is picked, so the wait is spent while
 * somebody is still reading the page, and once on the encoder's way in, because
 * a round that starts without them would draw the fallbacks for a whole video.
 * The second call is free.
 */
export function loadArt(theme: ThemeName, art: readonly Art[]): Promise<void> {
  let waiting = loading.get(theme);
  if (!waiting) {
    waiting = (async () => {
      await Promise.all(
        art.map(async (one) => {
          const answer = await fetch(`jelly/${one.file}`);
          if (!answer.ok) throw new Error(`jelly art ${one.file}: ${answer.status}`);
          loaded.set(one.file, await createImageBitmap(await answer.blob()));
        }),
      );
    })().catch((error: unknown) => {
      // A failed load must not be remembered, or every later round inherits it.
      loading.delete(theme);
      throw error;
    });
    loading.set(theme, waiting);
  }
  return waiting;
}

/** Whether a picture is ready to be drawn. */
export const artReady = (art: Art): boolean => loaded.has(art.file);

/**
 * Draw one picture so that its body fills a circle of the given radius.
 *
 * The pictures are not square and their bodies are not centred in them — a
 * pufferfish has a tail off one side, Saturn has a ring wider than it is tall,
 * a pineapple has a crown above it. So the scale comes from the body's span
 * rather than the picture's size, and the picture is hung off the body's own
 * middle. Fitting the picture's bounding box to the circle instead would draw
 * every object a little small and each one by a different amount.
 */
export function drawArt(
  ctx: CanvasRenderingContext2D,
  art: Art,
  x: number,
  y: number,
  radius: number,
  turn: number,
  glow: string,
  squash = 0,
): boolean {
  const picture = loaded.get(art.file);
  if (!picture) return false;
  // The glass is held a picture's-width off every object's circle, so a picture
  // that reaches no further than that needs no scaling at all; only the few that
  // reach beyond it are brought back in.
  const scale = (radius * 2) / (art.span * Math.max(1, art.reach / SKIN));
  const w = art.w * scale;
  const h = art.h * scale;
  ctx.save();
  ctx.translate(x, y);
  if (turn) ctx.rotate(turn);
  // The ring. Area is kept: as much wider as it is flatter, so a jelly pulses
  // rather than growing and shrinking. The axis is the frame's, not the
  // object's — a gel settles against the ground it is sitting on, whichever way
  // up the picture happens to have ended.
  if (squash) {
    if (turn) ctx.rotate(-turn);
    ctx.scale(1 + squash, 1 / (1 + squash));
    if (turn) ctx.rotate(turn);
  }
  const smoothing = ctx.imageSmoothingQuality;
  ctx.imageSmoothingQuality = 'high';
  // The bloom is cast by the picture's own alpha, in one pass, so it takes the
  // object's shape exactly and lands behind it. A disc of colour laid underneath
  // was the first try and it showed: a pineapple is tall and narrow, and the
  // parts of the disc it did not cover read as a dull smear around its foot.
  //
  // It is a tight bloom, and that is measured. Reading outwards from the middle
  // of an object in the references' chute, in radii: their light is gone by 1.25
  // and black from there on — 1.7 at 1.4 radii, 0.5 at 1.55, 0.4 at 1.7. This
  // was set to a blur of 0.55 radii and trailed 6, 12, 9, 13 over the same
  // stretch, which is nothing at all on a small object and a coloured fog the
  // size of a fist around the big one at the end of the video.
  ctx.shadowColor = glow;
  ctx.shadowBlur = radius * 0.22;
  ctx.drawImage(picture, -art.cx * w, -art.cy * h, w, h);
  ctx.imageSmoothingQuality = smoothing;
  ctx.restore();
  return true;
}
