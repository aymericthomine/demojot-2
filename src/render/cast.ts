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

import { drawFlag, type FlagName } from './flags';
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
 * How much the writing is thickened, as a fraction of its size.
 *
 * The star signs come from whatever symbol face the machine has, and those faces
 * have no bold — asking for weight 700 gets the same hairline back. So the glyph
 * is stroked in its own colour as well as filled, which thickens it whatever
 * font drew it. The months are set in a real typeface that does have a bold and
 * want none of this.
 */
export const CAST_WEIGHT: Record<CastName, number> = {
  months: 0,
  zodiac: 0.055,
  countries: 0,
};

/**
 * Writing centred on its ink rather than on its line.
 *
 * `textBaseline = 'middle'` centres the em box, and where a glyph sits inside
 * its own em is the font's business, not the disc's: the star signs came out
 * visibly low and off to one side, each by a different amount, which reads as
 * twelve balls printed carelessly. Measuring the ink and centring *that* puts
 * every one of them in the middle of its disc whatever face drew it.
 */
export function drawLabel(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color: string,
  weight = 0,
): void {
  if (!text) return;
  ctx.save();
  ctx.font = `700 ${Math.round(size)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const ink = ctx.measureText(text);
  const dx = (ink.actualBoundingBoxLeft - ink.actualBoundingBoxRight) / 2;
  const dy = (ink.actualBoundingBoxAscent - ink.actualBoundingBoxDescent) / 2;
  if (weight > 0) {
    ctx.strokeStyle = color;
    ctx.lineWidth = size * weight;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, x + dx, y + dy);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, x + dx, y + dy);
  ctx.restore();
}

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
 * The twelve biggest countries, with the reference's own colours.
 *
 * Biggest by what they are worth rather than by what they cover: the twelve
 * largest economies that the reference set also draws, which is what a viewer
 * means by a big country and what makes a ring of twelve flags read as a
 * heavyweight bout rather than as an atlas.
 *
 * The colour on each is the one that stands for it when a single colour is all
 * there is room for — Germany's gold rather than its black, because a black ring
 * on a black ground is not a ring. Several of them collide, which does not
 * matter: no ball is ever identified by that colour alone, it wears its flag.
 */
export const COUNTRIES: readonly Member[] = [
  { key: 'us', label: '', color: '#3a386f', flag: 'us' },
  { key: 'cn', label: '', color: '#ff0b00', flag: 'cn' },
  { key: 'jp', label: '', color: '#ff0b00', flag: 'jp' },
  { key: 'de', label: '', color: '#fece00', flag: 'de' },
  { key: 'in', label: '', color: '#fe9c22', flag: 'in' },
  { key: 'gb', label: '', color: '#014ebf', flag: 'gb' },
  { key: 'fr', label: '', color: '#014ebf', flag: 'fr' },
  { key: 'it', label: '', color: '#009a56', flag: 'it' },
  { key: 'ca', label: '', color: '#ff0b00', flag: 'ca' },
  { key: 'ru', label: '', color: '#014ebf', flag: 'ru' },
  { key: 'es', label: '', color: '#fece00', flag: 'es' },
  { key: 'mx', label: '', color: '#01643e', flag: 'mx' },
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
 * A flag is clipped to the disc as well as carrying its own round edge: the
 * picture's corners are transparent, and the clip is what stops a half pixel of
 * its antialiased rim from standing outside the disc it is filling.
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
  drawFlag(ctx, member.flag, x, y, radius);
  ctx.restore();
}
