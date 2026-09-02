/**
 * One frame of Keep the wires.
 *
 * The ring and nothing else: no counter, no writing. The picture is the score —
 * a side that is winning wears a fan across half the rim, and a side that is
 * losing is a ball with three wires left. There was a counter along the top for
 * a while and it was doing the work the picture should do.
 *
 * The ring is the arena every other mode is played in, on the same centre and at
 * the same size, so this reads as another game on the same page rather than as a
 * different site.
 *
 * Wires go under the balls and are drawn thin: they are what the balls are
 * playing on, not the subject. A broken pin holds nothing and is drawn as
 * nothing — the gap in the fan is the record of it.
 */

import { drawLabel, drawMemberFaded, draws, type Member } from './cast';
import { ink, textOn } from './ink';
import { EMPTY, pinAt, type WiresFrame } from '../sim/wires';
import { ARENA, RIM_WIDTH } from '../sim/style';

export interface WiresLook {
  width: number;
  height: number;
  /** White ground, every colour its complement. */
  invert?: boolean;
  /** The side holding the ring at the end. */
  winner: number;
  /** Who is playing. */
  cast: readonly Member[];
  /** How much of a disc that cast's writing takes. */
  fit: number;
  /** How much that cast's writing is thickened. */
  weight: number;
}

/** How wide a wire is drawn, as a fraction of the ring's radius. */
const THREAD = 0.011;

/** The dark line round a ball that carries writing rather than a picture. */
const OUTLINE = 0.09;

/** What a picture sits on, so its clipped edge shows no colour of its own. */
const UNDER = '#31343d';

const withAlpha = (hex: string, alpha: number): string => {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
};

export function drawWiresFrame(
  ctx: CanvasRenderingContext2D,
  frame: WiresFrame,
  look: WiresLook,
): void {
  const { width, height, invert = false, winner, cast, fit, weight } = look;
  const radius = width * ARENA;
  const cx = width / 2;
  const cy = height / 2;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = ink('#000000', invert);
  ctx.fillRect(0, 0, width, height);

  const reveal = frame.reveal;

  // Where each side's ball is, so a wire knows the end it is pulled by.
  const ballOf = new Array<{ x: number; y: number } | undefined>(cast.length);
  for (const ball of frame.balls) ballOf[ball.who] = ball;

  // The ring.
  ctx.strokeStyle = ink('#ffffff', invert);
  ctx.lineWidth = radius * RIM_WIDTH * 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  // The board: every wire still on the rim, pin to owner.
  ctx.lineCap = 'round';
  ctx.lineWidth = radius * THREAD;
  for (let pin = 0; pin < frame.threads.length; pin += 1) {
    const who = frame.threads[pin];
    if (who === EMPTY) continue;
    const ball = ballOf[who];
    if (!ball) continue;
    const lost = reveal > 0 && who !== winner ? reveal : 0;
    if (lost >= 1) continue;
    const foot = pinAt(pin);
    ctx.beginPath();
    ctx.strokeStyle = withAlpha(cast[who].color, 0.85 * (1 - lost));
    ctx.moveTo(cx + foot.x * radius, cy + foot.y * radius);
    ctx.lineTo(cx + ball.x * radius, cy + ball.y * radius);
    ctx.stroke();
  }
  ctx.lineCap = 'butt';

  for (const ball of frame.balls) {
    const member = cast[ball.who];
    const mine = ball.who === winner;
    // A beaten ball fades off the board over its own moment; at the end
    // everybody but the winner goes with the same fade.
    const alpha = (1 - ball.fade) * (mine ? 1 : 1 - reveal);
    if (alpha <= 0.01) continue;
    const x = cx + ball.x * radius;
    const y = cy + ball.y * radius;
    // The winner grows through the ending, so the last frames are about it
    // rather than about the board it is standing on.
    const size = ball.r * radius * (mine ? 1 + 0.5 * reveal : 1);

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
