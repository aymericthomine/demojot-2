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
  { key: 'aries', label: '\u2648\ufe0e', color: '#c02a31' },
  { key: 'taurus', label: '\u2649\ufe0e', color: '#5785b2' },
  { key: 'gemini', label: '\u264a\ufe0e', color: '#76ba63' },
  { key: 'cancer', label: '\u264b\ufe0e', color: '#e28338' },
  { key: 'leo', label: '\u264c\ufe0e', color: '#864799' },
  { key: 'virgo', label: '\u264d\ufe0e', color: '#e1d85d' },
  { key: 'libra', label: '\u264e\ufe0e', color: '#68c9c7' },
  { key: 'scorpio', label: '\u264f\ufe0e', color: '#c72e87' },
  { key: 'sagittarius', label: '\u2650\ufe0e', color: '#965535' },
  { key: 'capricorn', label: '\u2651\ufe0e', color: '#8bcbac' },
  { key: 'aquarius', label: '\u2652\ufe0e', color: '#9ca1c6' },
  { key: 'pisces', label: '\u2653\ufe0e', color: '#c9eb86' },
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
 * there is room for. Several of them collide, which does not matter: no ball is
 * ever identified by that colour alone, it wears its flag.
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
 * Where a glyph's ink sits inside its own line, measured by drawing it.
 *
 * Every metric the canvas will report about this has turned out to be a trap.
 * `textAlign = 'center'` centres the *advance width*, and a star sign's ink does
 * not sit in the middle of its advance in the face Safari picks — which put all
 * twelve of them the best part of half a radius to the right of their discs, the
 * same amount each, on the only screen that matters. `textBaseline` centres the
 * em box, which is a different lie in the vertical. And correcting either with
 * `actualBoundingBoxLeft` and `Right` swaps one engine's disagreement for
 * another's: those two are given relative to the alignment point, and engines do
 * not agree where that point is once `textAlign` has moved it.
 *
 * So nothing is asked and the thing is drawn instead. The glyph goes onto a
 * scratch canvas at a known size, the painted pixels are found, and the offset
 * from where it landed to where it should have landed is what comes back. That
 * is not a claim about fonts or engines; it is a measurement of the ink this
 * machine actually puts down, and it is right on any machine by construction.
 *
 * Once per label, kept — twelve small canvases at the start of a cast, and none
 * after.
 */
const INK = new Map<string, { dx: number; dy: number }>();

const MEASURE_AT = 128;

function inkCentre(text: string): { dx: number; dy: number } {
  const known = INK.get(text);
  if (known) return known;
  const middle = { dx: 0, dy: 0 };
  if (typeof OffscreenCanvas === 'undefined') return middle;

  const span = MEASURE_AT * 2;
  const sheet = new OffscreenCanvas(span, span);
  const probe = sheet.getContext('2d', { willReadFrequently: true });
  if (!probe) return middle;
  probe.font = `700 ${MEASURE_AT}px system-ui, sans-serif`;
  probe.textAlign = 'center';
  probe.textBaseline = 'alphabetic';
  probe.fillStyle = '#ffffff';
  probe.fillText(text, MEASURE_AT, MEASURE_AT);

  const pixels = probe.getImageData(0, 0, span, span).data;
  let left = span;
  let right = -1;
  let top = span;
  let bottom = -1;
  for (let y = 0; y < span; y += 1) {
    for (let x = 0; x < span; x += 1) {
      if (pixels[(y * span + x) * 4 + 3] < 24) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  // Nothing was painted: an empty label, or a glyph this machine has no face
  // for. Either way there is nothing to move.
  if (right < 0) {
    INK.set(text, middle);
    return middle;
  }
  const found = {
    dx: (MEASURE_AT - (left + right) / 2) / MEASURE_AT,
    dy: (MEASURE_AT - (top + bottom) / 2) / MEASURE_AT,
  };
  INK.set(text, found);
  return found;
}

/**
 * A colour split into the colour itself and how much of it there is.
 *
 * Only `rgba(...)` carries an alpha here — everything else in this project is a
 * hex triple — so anything that does not parse is simply opaque.
 */
const RGBA = /^rgba\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*\)$/;

function split(color: string): { solid: string; alpha: number } {
  const parts = RGBA.exec(color);
  if (!parts) return { solid: color, alpha: 1 };
  return { solid: `rgb(${parts[1]},${parts[2]},${parts[3]})`, alpha: Number(parts[4]) };
}

/**
 * A scratch sheet for writing that has to go down as one layer.
 *
 * Kept between calls and only ever grown, because the alternative is a canvas
 * the size of the zone allocated on every one of four thousand frames.
 */
let sheet: OffscreenCanvas | null = null;

/**
 * Thickened writing, laid down in one pass.
 *
 * The star signs are thickened by stroking the glyph as well as filling it,
 * because the faces that carry those symbols have no bold. That is fine while
 * the colour is opaque, and wrong the moment it is not: two passes over the
 * same ground composite twice, so the stroked band ends up denser than the
 * middle and the outline shows through as a seam. On the holder's sign, which
 * is written across the zone at eighty-five per cent, it looked like a glyph
 * drawn with a pen that had run out — exactly the lines it was not supposed to
 * have.
 *
 * So the two passes go onto a scratch sheet at full strength, where they may
 * overlap all they like, and the sheet is composited once at the alpha asked
 * for. One layer, one density, no seam.
 */
function layered(
  ctx: CanvasRenderingContext2D,
  text: string,
  at: number,
  on: number,
  size: number,
  solid: string,
  weight: number,
  alpha: number,
): boolean {
  if (typeof OffscreenCanvas === 'undefined') return false;
  // Three ems square, written about its middle: enough for a glyph that hangs
  // above its baseline and below it, plus the stroke that thickens it.
  const span = Math.ceil(size * 3);
  const pad = span / 2;
  if (!sheet || sheet.width < span || sheet.height < span) sheet = new OffscreenCanvas(span, span);
  const paint = sheet.getContext('2d');
  if (!paint) return false;
  paint.clearRect(0, 0, sheet.width, sheet.height);
  paint.font = `700 ${Math.round(size)}px system-ui, sans-serif`;
  paint.textAlign = 'center';
  paint.textBaseline = 'alphabetic';
  paint.strokeStyle = solid;
  paint.lineWidth = size * weight;
  paint.lineJoin = 'round';
  paint.strokeText(text, pad, pad);
  paint.fillStyle = solid;
  paint.fillText(text, pad, pad);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(sheet, 0, 0, span, span, at - pad, on - pad, span, span);
  ctx.restore();
  return true;
}

/**
 * Writing put in the middle of a disc, by where its ink lands.
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
  const { dx, dy } = inkCentre(text);
  const at = x + dx * size;
  const on = y + dy * size;
  const { solid, alpha } = split(color);
  // Thickened *and* see-through is the one combination that cannot be painted
  // straight onto the frame. Everything else is a single pass and goes down as
  // it always did.
  if (weight > 0 && alpha < 1 && layered(ctx, text, at, on, size, solid, weight, alpha)) return;
  ctx.save();
  ctx.font = `700 ${Math.round(size)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (weight > 0) {
    ctx.strokeStyle = color;
    ctx.lineWidth = size * weight;
    ctx.lineJoin = 'round';
    ctx.strokeText(text, at, on);
  }
  ctx.fillStyle = color;
  ctx.fillText(text, at, on);
  ctx.restore();
}

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
