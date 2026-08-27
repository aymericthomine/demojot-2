/**
 * Colour, and the two rules both painters share.
 *
 * There were two copies of `ink` and they had already drifted apart in spelling
 * if not in behaviour. `legible` is the reason this file exists: it is a rule
 * about what the page owes somebody who picks a colour, and a rule like that
 * cannot live in two places.
 */

/**
 * A colour, possibly turned inside out.
 *
 * A true negative rather than a swap of the black and the white: the ground
 * becomes white and every colour takes its complement, so the picture holds
 * together as one image instead of a light background with a dark palette
 * sitting awkwardly on it.
 */
export function ink(hex: string, invert: boolean): string {
  if (!invert) return hex;
  const n = Number.parseInt(hex.slice(1), 16);
  return `#${(0xffffff - n).toString(16).padStart(6, '0')}`;
}

/** How far a colour has to be from the ground, on the same 0-to-1 scale. */
const FLOOR = 0.28;

/**
 * Where writing stops wanting white under it and starts wanting black.
 *
 * Read off the reference rather than chosen: its twelve months split into eight
 * carrying white and four carrying black, and on perceived brightness those two
 * sets do not overlap — white tops out at 0.607 and black starts at 0.654. This
 * sits between them. Relative luminance, the other obvious measure, does *not*
 * separate them: it puts an orange that carries black below a green that
 * carries white, so the rule it would give is not the rule in the picture.
 */
const READABLE = 0.63;

const brightness = (n: number): number =>
  (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;

/**
 * A chosen colour, nudged only as far as it must be to be seen at all.
 *
 * Somebody who picks white for a team that plays in white is right, and on the
 * black ground they are previewing it looks right. Generate the same video on
 * the white ground and every thread and every rim pin that ball owns is white on
 * white — the ball keeps its outline and so still shows, but its whole fan
 * disappears, which reads as a ball that was dealt no threads at all.
 *
 * So a colour is kept exactly as picked unless it is too close to the ground to
 * survive, and then it is walked towards the far end until it clears the floor
 * and no further. White on white becomes a light grey; orange stays orange.
 */
export function legible(hex: string, invert: boolean): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const ground = invert ? 1 : 0;
  const here = brightness(n);
  const gap = Math.abs(here - ground);
  if (gap >= FLOOR) return hex;

  // How far towards the other end of the range it has to move. Mixing towards
  // black or white moves brightness proportionally, so the amount is the
  // shortfall over the room left in that direction.
  const towards = invert ? 0 : 255;
  const room = Math.abs(here - (invert ? 0 : 1));
  const mix = room > 0 ? Math.min(1, (FLOOR - gap) / room) : 1;
  const blend = (channel: number) => Math.round(channel + (towards - channel) * mix);
  const r = blend((n >> 16) & 255);
  const g = blend((n >> 8) & 255);
  const b = blend(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/**
 * Black or white, whichever can be read on this colour.
 *
 * The rule, not a list: a colour dark enough takes white writing and a colour
 * light enough takes black, so a palette can be changed without anybody having
 * to remember which of its entries were the pale ones.
 */
export function textOn(hex: string): string {
  return brightness(Number.parseInt(hex.slice(1), 16)) > READABLE ? '#000000' : '#ffffff';
}
