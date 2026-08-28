/**
 * Who is playing.
 *
 * Month and Hot potato are games about twelve things going round a ring, and
 * nothing in either of them cares what the twelve *are*: the simulations count
 * to twelve, and the painters ask for a colour and something to put on the disc.
 * So the cast is a dress rather than a mode — the same seed plays the same round
 * whether the balls are months, star signs or countries, and swapping them costs
 * a picker rather than a second copy of the game.
 *
 * Three of them, and the third is the reason this file draws rather than writes.
 * A country could be a flag emoji, and a flag emoji is a smiley by another name
 * as well as a thing half the platforms refuse to render — so countries carry a
 * painter from `flags.ts` and no text at all.
 */

import { FLAGS, type FlagName } from './flags';
import { MONTHS } from '../sim/months';

export type CastName = 'months' | 'zodiac' | 'countries';

export interface Member {
  /** For file names: lower case, no spaces. */
  key: string;
  /** What goes on the disc, where the cast writes rather than draws. */
  label: string;
  /**
   * The disc's colour — and, for a cast that draws, the colour that stands for
   * it everywhere a single colour is needed: the zone it is holding, the ring it
   * leaves when it goes out.
   */
  color: string;
  /** Draw this flag on the disc instead of writing the label. */
  flag?: FlagName;
}

/**
 * How much of a disc the label is set at, per cast.
 *
 * Three letters and one sign want different sizes out of the same circle, and
 * the difference is not a matter of counting characters: a sign is one glyph
 * that does not fill its own em, so set at the size that suits `JAN` it comes
 * out looking like a footnote. Stated per cast rather than guessed from the
 * label, because it is a fact about the alphabet being used.
 */
export const CAST_FIT: Record<CastName, number> = {
  months: 0.62,
  zodiac: 1.05,
  countries: 0.62,
};

/**
 * The star signs, with the colours read off the reference frame.
 *
 * Sampled the same way the months were — the median of an annulus inside each
 * disc, clear of the glyph at its centre and the compression at its rim. They
 * come out duller than the months', and that is the source's own choice rather
 * than a dimmed screenshot: white in that frame is 255 and its ground is 0.
 *
 * The glyphs carry U+FE0E after them. Without it these twelve are emoji by
 * default — the standard gives them emoji presentation — and would arrive as
 * colour pictures on the very phones this is made for. The selector asks for the
 * text form, which is the monochrome sign the reference shows.
 */
export const ZODIAC: readonly Member[] = [
  { key: 'aries', label: '♈︎', color: '#c02a31' },
  { key: 'taurus', label: '♉︎', color: '#5785b2' },
  { key: 'gemini', label: '♊︎', color: '#76ba63' },
  { key: 'cancer', label: '♋︎', color: '#e28338' },
  { key: 'leo', label: '♌︎', color: '#864799' },
  { key: 'virgo', label: '♍︎', color: '#e1d85d' },
  { key: 'libra', label: '♎︎', color: '#68c9c7' },
  { key: 'scorpio', label: '♏︎', color: '#c72e87' },
  { key: 'sagittarius', label: '♐︎', color: '#965535' },
  { key: 'capricorn', label: '♑︎', color: '#8bcbac' },
  { key: 'aquarius', label: '♒︎', color: '#9ca1c6' },
  { key: 'pisces', label: '♓︎', color: '#c9eb86' },
];

/**
 * The twelve countries off the reference, in the order it lists them.
 *
 * The colour on each is the one that stands for the flag when a single colour is
 * all there is room for — Germany's gold rather than its black, because a black
 * ring on a black ground is not a ring.
 */
export const COUNTRIES: readonly Member[] = [
  { key: 'de', label: '', color: '#ffce00', flag: 'de' },
  { key: 'fr', label: '', color: '#3355c8', flag: 'fr' },
  { key: 'es', label: '', color: '#f1bf00', flag: 'es' },
  { key: 'gb', label: '', color: '#c8102e', flag: 'gb' },
  { key: 'ru', label: '', color: '#2f6fd0', flag: 'ru' },
  { key: 'us', label: '', color: '#3f6fb0', flag: 'us' },
  { key: 'br', label: '', color: '#009c3b', flag: 'br' },
  { key: 'ca', label: '', color: '#d80621', flag: 'ca' },
  { key: 'mx', label: '', color: '#00875c', flag: 'mx' },
  { key: 'in', label: '', color: '#ff9933', flag: 'in' },
  { key: 'il', label: '', color: '#2f6fd8', flag: 'il' },
  { key: 'dz', label: '', color: '#009450', flag: 'dz' },
];

const AS_MONTHS: readonly Member[] = MONTHS.map((m) => ({
  key: m.label.toLowerCase(),
  label: m.label,
  color: m.color,
}));

export const CASTS: Record<CastName, readonly Member[]> = {
  months: AS_MONTHS,
  zodiac: ZODIAC,
  countries: COUNTRIES,
};

export const CAST_LABEL: Record<CastName, string> = {
  months: 'Months',
  zodiac: 'Zodiac',
  countries: 'Countries',
};

/** Every cast is twelve, because the games are. */
export const castFor = (name: CastName | undefined): readonly Member[] =>
  CASTS[name ?? 'months'] ?? AS_MONTHS;

/**
 * Put a cast member on a disc already drawn at `x, y`.
 *
 * A flag is clipped to the disc and painted square, so the circle does the
 * cropping and the bands run off the edge — which is what the reference does,
 * and the only way a tricolour reads as a flag rather than as a fitted picture.
 */
export function drawMember(
  ctx: CanvasRenderingContext2D,
  member: Member,
  x: number,
  y: number,
  radius: number,
): void {
  if (!member.flag) return;
  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(x, y);
  FLAGS[member.flag](ctx, radius);
  ctx.restore();
}
