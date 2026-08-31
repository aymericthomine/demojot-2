/**
 * One frame of Fusion war.
 *
 * The same ring as Month and Hot potato, at the same size, with nothing written
 * anywhere: twelve sides fighting over a circle is a picture that explains
 * itself, and how much of the ring a colour covers *is* the score.
 *
 * A ball's size comes from the simulation rather than from here — it is the
 * square root of the mass it is carrying — so the picture cannot disagree with
 * the game about who is winning.
 *
 * The ending gathers the winner up. Its balls run to the middle and swell into
 * the one ball their mass adds up to, which is the last thing the video shows:
 * a mode about fusing ends by fusing.
 */

import { drawLabel, drawMemberFaded, draws, type Member } from './cast';
import { ink, textOn } from './ink';
import type { FusionFrame } from '../sim/fusion';
import { ARENA, RIM_WIDTH } from '../sim/style';

export interface FusionLook {
  width: number;
  height: number;
  /** White ground, every colour its complement. */
  invert?: boolean;
  /** The side left holding the ring. */
  winner: number;
  /** Who is playing. */
  cast: readonly Member[];
  /** How much of a disc that cast's writing takes. */
  fit: number;
  /** How much that cast's writing is thickened. */
  weight: number;
}

/** The dark line round a ball that carries writing rather than a picture. */
const OUTLINE = 0.08;

/** What a picture sits on, so its clipped edge shows no colour of its own. */
const UNDER = '#31343d';

/** A step in and out of the ending, so nothing jumps on the frame it starts. */
const ease = (t: number): number => t * t * (3 - 2 * t);

export function drawFusionFrame(
  ctx: CanvasRenderingContext2D,
  frame: FusionFrame,
  look: FusionLook,
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

  ctx.strokeStyle = ink('#ffffff', invert);
  ctx.lineWidth = radius * RIM_WIDTH * 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  const gather = ease(frame.reveal);
  // What the winner's mass comes to as one ball. Taken from the frame rather
  // than from a constant: on a round that ran out of time instead of being
  // swept, the winner holds less than everything, and the ball it ends as
  // should be the size of what it actually holds.
  const whole = frame.balls
    .filter((ball) => ball.who === winner)
    .reduce((sum, ball) => sum + ball.r * ball.r, 0);
  const merged = Math.sqrt(whole) * radius;

  // The two halves of the ending, kept apart so the change reads as one thing
  // becoming another rather than as a stack: the winner's balls run in and fade
  // out as they arrive, and the ball they add up to fades in and grows behind
  // them.
  const arriving = 1 - Math.max(0, Math.min(1, (gather - 0.45) / 0.4));
  const arrived = Math.max(0, Math.min(1, (gather - 0.35) / 0.4));

  // Biggest last, so a ball that has just eaten covers what it ate rather than
  // hiding behind it.
  const order = frame.balls.map((_, i) => i).sort((a, b) => frame.balls[a].r - frame.balls[b].r);

  for (const index of order) {
    const ball = frame.balls[index];
    const member = cast[ball.who];
    const mine = ball.who === winner;
    // The winner is gathered into the middle; everybody else goes out with the
    // war, which on a swept round is nobody.
    const pull = mine ? gather : 0;
    const x = cx + ball.x * radius * (1 - pull);
    const y = cy + ball.y * radius * (1 - pull);
    const size = ball.r * radius;
    const alpha = mine ? arriving : 1 - gather;
    if (alpha <= 0.01) continue;

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

  // And the one ball they come to, drawn once and at full strength — a stack of
  // nine half-transparent copies of the same picture is a smear, and this is
  // the frame the video ends on.
  if (arrived > 0) {
    const member = cast[winner];
    const size = merged * (0.55 + 0.45 * arrived);
    ctx.save();
    ctx.globalAlpha = arrived;
    ctx.beginPath();
    ctx.arc(cx, cy, size, 0, Math.PI * 2);
    ctx.fillStyle = draws(member) ? UNDER : member.color;
    ctx.fill();
    if (!draws(member)) {
      ctx.lineWidth = size * OUTLINE;
      ctx.strokeStyle = ink('#101216', invert);
      ctx.stroke();
    }
    ctx.restore();
    if (draws(member)) {
      drawMemberFaded(ctx, member, cx, cy, size, arrived);
    } else {
      ctx.save();
      ctx.globalAlpha = arrived;
      drawLabel(ctx, member.label, cx, cy, size * fit, textOn(member.color), weight);
      ctx.restore();
    }
  }
}
