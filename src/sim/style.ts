/**
 * The look, fixed once.
 *
 * Every video is meant to be recognisably the same thing: same frame, same
 * clock, same ring at the same size whichever game is being played. So that
 * much lives here as constants, in units of the frame's width, and each painter
 * multiplies by whatever size it is drawing at.
 *
 * There used to be a great deal more of it — ball radii, thread widths, a
 * twelve-colour palette, a speed — belonging to a ball fight that has since
 * been taken out of the site. What is left is what all three games share, and
 * the casts carry their own colours.
 */

/** Output frame — 9:16, the size TikTok wants. */
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const FPS = 60;

/**
 * Arena radius as a fraction of the frame width.
 *
 * Measured off the reference at full size, not chosen: a rim 969 px across in a
 * 1080 px frame. Pachinko has no ring, and takes twice this as the height its
 * board is set to, so that a mode without an arena is still the size of one.
 */
export const ARENA = 0.449;

/** The white ring of the arena. */
export const RIM_WIDTH = 0.013;
