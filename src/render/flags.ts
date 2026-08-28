/**
 * Twelve flags, as pictures rather than as drawings.
 *
 * There was a drawn set here — twelve painters putting bands and charges on a
 * canvas — and it was replaced by cut-outs of the icon set this is matched to.
 * The drawing could get the arrangement right and never the *character*: a set
 * of flat icons is made by one hand making the same decisions twelve times, and
 * reproducing that by hand is reproducing a style rather than a picture. The
 * cut-outs are the picture.
 *
 * What has not changed is why they are not emoji. The regional-indicator emoji
 * is a smiley by another name, and half the platforms that matter refuse to draw
 * it — a video made on Windows would come out spelling `DE` where Germany should
 * be. A picture is the same picture on every machine.
 *
 * The pictures have to be decoded before a frame can be painted, and painting is
 * synchronous, so `loadFlags` is awaited once before the encode starts. A round
 * that starts without them draws the discs and no flags rather than failing, but
 * that is a guard and not a plan.
 */

import { FLAG_PNG } from './flagData';

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

export const FLAG_NAMES: readonly FlagName[] = [
  'us',
  'cn',
  'jp',
  'de',
  'in',
  'gb',
  'fr',
  'it',
  'ca',
  'ru',
  'es',
  'mx',
];

let decoded: Map<FlagName, ImageBitmap> | null = null;
let decoding: Promise<void> | null = null;

/**
 * Decode the twelve, once.
 *
 * Kept as a promise rather than a flag so that two calls in flight do not both
 * decode: the page asks for them when the cast is picked and the encoder asks
 * again on its way in, and decoding twelve PNGs twice is a wasted half second on
 * the device least able to spare it.
 */
export function loadFlags(): Promise<void> {
  decoding ??= (async () => {
    const pairs = await Promise.all(
      FLAG_NAMES.map(async (name) => {
        const png = await fetch(FLAG_PNG[name]);
        return [name, await createImageBitmap(await png.blob())] as const;
      }),
    );
    decoded = new Map(pairs);
  })().catch((error: unknown) => {
    // A failed decode must not be remembered, or every later round inherits it.
    decoding = null;
    throw error;
  });
  return decoding;
}

/** Whether a flag can be drawn at all yet. */
export const flagsReady = (): boolean => decoded !== null;

/**
 * Draw a flag filling a disc of the given radius.
 *
 * The caller has clipped to the circle already; the picture is square and
 * carries its own transparent corners, so both agree about where the edge is.
 */
export function drawFlag(
  ctx: CanvasRenderingContext2D,
  name: FlagName,
  x: number,
  y: number,
  radius: number,
): void {
  const picture = decoded?.get(name);
  if (!picture) return;
  // These are cut at a hundred and sixteen pixels and land on a ball of eighty,
  // so every one of them is a downscale. Asking for the good filter is the
  // difference between a flag with clean bands and one whose stripes crawl.
  const smoothing = ctx.imageSmoothingQuality;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(picture, x - radius, y - radius, radius * 2, radius * 2);
  ctx.imageSmoothingQuality = smoothing;
}
