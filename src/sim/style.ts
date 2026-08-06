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

/** Arena radius as a fraction of the frame width. */
export const ARENA = 0.44;

/** Ball radius, in units of the arena radius. */
export const BALL_RADIUS = 0.037;
/** Thread width, arena units. */
export const THREAD_WIDTH = 0.0085;
/** The white ring of the arena. */
export const RIM_WIDTH = 0.013;
/** The white outline around each ball. */
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
  '#22c55e', // green
  '#22d3ee', // cyan
  '#2563eb', // blue
  '#a855f7', // purple
  '#ec4899', // pink
  '#f97316', // orange
  '#eab308', // yellow
  '#ef4444', // red
  '#14b8a6', // teal
  '#84cc16', // lime
  '#8b5cf6', // violet
  '#06b6d4', // sky
] as const;
