/**
 * One frame of Line war.
 *
 * The same ring as Month and Hot potato, at the same size, and the picture is
 * made of two things: the lines everybody has drawn, and the balls still
 * drawing them. Nothing is written down — a side's standing is its ball's size
 * and how much of the ring is its colour, which is a scoreboard a viewer reads
 * without being told to.
 *
 * Lines are drawn under the balls and thin. They are the board rather than the
 * subject: a line thick enough to compete with a ball turns the ring into a
 * plate of spaghetti by the fortieth second, when there are two hundred of them
 * on it.
 */

import { drawLabel, drawMemberFaded, draws, type Member } from './cast';
import { ink, textOn } from './ink';
import type { LineFrame, Trail } from '../sim/line';
import { ARENA, RIM_WIDTH } from '../sim/style';

export interface LineLook {
  width: number;
  height: number;
  /** White ground, every colour its complement. */
  invert?: boolean;
  /** Every line ever drawn, with the frames it is on the board for. */
  trails: readonly Trail[];
  /** Which frame this is, so the board can be asked what it held then. */
  at: number;
  /** The side holding the ring at the end. */
  winner: number;
  /** Who is playing. */
  cast: readonly Member[];
  /** How much of a disc that cast's writing takes. */
  fit: number;
  /** How much that cast's writing is thickened. */
  weight: number;
}

/**
 * How wide a line is drawn, as a fraction of the arena's radius.
 *
 * A hairline. The board holds two hundred of these by the fortieth second, and
 * the first attempt drew them at four times this — the ring came out as a plate
 * of spaghetti with the balls lost in it, which is the mode drawing its own
 * bookkeeping instead of its game.
 */
const THREAD = 0.008;

/** The dark line round a ball that carries writing rather than a picture. */
const OUTLINE = 0.09;

/** What a picture sits on, so its clipped edge shows no colour of its own. */
const UNDER = '#31343d';

const withAlpha = (hex: string, alpha: number): string => {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
};

export function drawLineFrame(
  ctx: CanvasRenderingContext2D,
  frame: LineFrame,
  look: LineLook,
): void {
  const { width, height, invert = false, trails, at, winner, cast, fit, weight } = look;
  const radius = width * ARENA;
  const cx = width / 2;
  const cy = height / 2;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = ink('#000000', invert);
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = ink('#ffffff', invert);
  ctx.lineWidth = radius * RIM_WIDTH * 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  const reveal = frame.reveal;

  // The board. Every line the round has drawn is in one list with the frames it
  // was on the board for, so a frame is a filter rather than a snapshot — two
  // hundred lines held per frame would be a hundred thousand copies of the same
  // line over a video.
  ctx.lineCap = 'round';
  ctx.lineWidth = radius * THREAD;
  for (const line of trails) {
    if (line.from > at || at >= line.to) continue;
    const lost = reveal > 0 && line.who !== winner ? reveal : 0;
    if (lost >= 1) continue;
    ctx.beginPath();
    ctx.strokeStyle = withAlpha(cast[line.who].color, 0.72 * (1 - lost));
    ctx.moveTo(cx + line.x1 * radius, cy + line.y1 * radius);
    ctx.lineTo(cx + line.x2 * radius, cy + line.y2 * radius);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';

  for (const ball of frame.balls) {
    const member = cast[ball.who];
    const mine = ball.who === winner;
    const alpha = mine ? 1 : 1 - reveal;
    if (alpha <= 0.01) continue;
    const x = cx + ball.x * radius;
    const y = cy + ball.y * radius;
    // The winner grows a little through the ending, so the last frames are
    // about it rather than about the board it is standing on.
    const size = ball.r * radius * (mine ? 1 + 0.35 * reveal : 1);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = draws(member) ? UNDER : member.color;
    ctx.fill();
    if (!draws(member)) {
      ctx.lineWidth = size * OUTLINE;
      ctx.strokeStyle = ink('#101216', invert);
      ctx.stroke();
    }
    ctx.restore();

    if (draws(member)) {
      drawMemberFaded(ctx, member, x, y, size, alpha);
    } else {
      ctx.save();
      ctx.globalAlpha = alpha;
      drawLabel(ctx, member.label, x, y, size * fit, textOn(member.color), weight);
      ctx.restore();
    }
  }
}
