/**
 * The ladder.
 *
 * Eight elements, each a fifth wider than the one below it. That growth rate is
 * not a guess: measured off the reference, a strawberry is 40 px across in a
 * 576 px frame and the dragon fruit six ranks up is 122 px, which is 1.20 per
 * rank to two figures.
 *
 * Two of the same rank that touch become one of the next, so the last element
 * costs a hundred and twenty-eight of the first. That is what sets the length of
 * a video: the drop ends when the watermelon is made, which at the measured
 * cadence takes between a minute and two and a half.
 *
 * The glyphs are the default dress. Each rank takes an image instead if one is
 * given, which is what the reference does with cut-out photographs.
 */

export interface Fruit {
  name: string;
  /** Drawn when the rank has no image of its own. */
  glyph: string;
  /** The halo, and the disc if the glyph will not draw. */
  color: string;
  /** Radius in bowl radii. */
  radius: number;
}

/** The smallest fruit, in bowl radii. Measured: 34 px across of 576, in a bowl of 0.519 W. */
const SMALLEST = 0.057;

/** How much wider each rank is than the one below. Measured, not chosen. */
const GROWTH = 1.2;

const LADDER: readonly (readonly [string, string, string])[] = [
  ['strawberry', '🍓', '#e8384f'],
  ['tangerine', '🍊', '#f97316'],
  ['kiwi', '🥝', '#84cc16'],
  ['lemon', '🍋', '#eab308'],
  ['apple', '🍎', '#ef4444'],
  ['peach', '🍑', '#fb923c'],
  ['pineapple', '🍍', '#facc15'],
  ['watermelon', '🍉', '#22c55e'],
];

export const FRUITS: readonly Fruit[] = LADDER.map(([name, glyph, color], rank) => ({
  name,
  glyph,
  color,
  radius: SMALLEST * GROWTH ** rank,
}));

/** The last rank. Two of these do not become anything — they burst. */
export const TOP_RANK = FRUITS.length - 1;

export const radiusOf = (rank: number): number => FRUITS[Math.min(rank, TOP_RANK)].radius;
