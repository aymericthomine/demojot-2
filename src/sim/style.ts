/**
 * The look, fixed once.
 *
 * Every video is meant to be recognisably the same thing: same arena, same ball
 * size, same thread weight, same speed. What changes from one video to the next
 * is how many balls there are, how many threads they start with, and what
 * happens — never the style. So all of that lives here as constants, in units of
 * the arena radius, and the renderer multiplies by whatever the frame size is.
 */

/** Output frame — 9:16, the size TikTok wants. */
export const WIDTH = 1080;
export const HEIGHT = 1920;
export const FPS = 60;

/**
 * Arena radius as a fraction of the frame width.
 *
 * Measured off the reference at full size, not chosen: a rim 969 px across in a
 * 1080 px frame, balls 67 px through, threads about 3 px wide.
 */
export const ARENA = 0.449;

/** Ball radius, in units of the arena radius. */
export const BALL_RADIUS = 0.069;
/** Thread width, arena units. */
export const THREAD_WIDTH = 0.0062;
/** The white ring of the arena. */
export const RIM_WIDTH = 0.013;
/**
 * The white outline that used to go round each ball.
 *
 * Nothing draws it any more. It was measured off the reference along with
 * everything else here, and it earned its place while a ball was a plain disc —
 * but a ball can be an image or an emoji now, and a white hoop round a club
 * badge is a white hoop round a club badge.
 */
export const BALL_RING = 0.008;
/** Length of the coloured tick left on the rim where a thread is pinned. */
export const ANCHOR_TICK = 0.018;

/** Ball speed in arena radii per second. Constant, and the same for every ball. */
export const SPEED = 0.85;

/**
 * Bright, saturated, and distinct at a glance on black. A round takes as many
 * of these as it has balls, without repeating.
 */
export const COLORS = [
  '#a855f7', // purple
  '#22d3ee', // cyan
  '#ef4444', // red
  '#3b82f6', // blue
  '#22c55e', // green
  '#f97316', // orange
  '#eab308', // yellow
  '#ec4899', // pink
  '#14b8a6', // teal
  '#84cc16', // lime
  '#8b5cf6', // violet
  '#06b6d4', // sky
] as const;
