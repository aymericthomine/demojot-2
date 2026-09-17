'use client';

/**
 * The themes' artwork.
 *
 * Forty pictures, eight to a theme, cut out of a sheet that was supplied for
 * this mode. They replace the drawn gels that were here first — those were made
 * because there was nothing else, and the note in the README at the time said
 * plainly that they were drawn gels rather than rendered assets and nobody would
 * mistake one for the other. These are the rendered assets.
 *
 * **They are files rather than data.** The flags in this project are carried as
 * base64 inside a module because twelve small icons come to ninety kilobytes and
 * data cannot fail to arrive. Forty of these come to 1.6 megabytes as base64,
 * which is a page that will not load on a phone, so they are fetched — but only
 * the eight belonging to the theme being made, which is fifty kilobytes.
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
): boolean {
  const picture = loaded.get(art.file);
  if (!picture) return false;
  const scale = (radius * 2) / art.span;
  const w = art.w * scale;
  const h = art.h * scale;
  ctx.save();
  ctx.translate(x, y);
  if (turn) ctx.rotate(turn);
  const smoothing = ctx.imageSmoothingQuality;
  ctx.imageSmoothingQuality = 'high';
  // The bloom is cast by the picture's own alpha, in one pass, so it takes the
  // object's shape exactly and lands behind it. A disc of colour laid underneath
  // was the first try and it showed: a pineapple is tall and narrow, and the
  // parts of the disc it did not cover read as a dull smear around its foot.
  ctx.shadowColor = glow;
  ctx.shadowBlur = radius * 0.55;
  ctx.drawImage(picture, -art.cx * w, -art.cy * h, w, h);
  ctx.imageSmoothingQuality = smoothing;
  ctx.restore();
  return true;
}
