/**
 * One frame of Hold the Centre.
 *
 * Drawing order is the picture: the arena ring, the zone in the middle, the
 * holder's name written large behind everything, then the balls with their
 * progress rings on top. The name goes *behind* on purpose — it is the size of
 * the zone, and a label that covered the ball standing in the zone would hide
 * the one thing the viewer is watching.
 *
 * There is no writing anywhere else. The reference opens on a title over the
 * arena and this used to as well; asked for without it, what is left is the
 * board, and the board explains itself — a ring that fills is a ring that
 * fills.
 */

import { ink } from './ink';
import { BALL, MONTHS, ZONE, type MonthFrame } from '../sim/months';
import { ARENA, RIM_WIDTH } from '../sim/style';

export interface MonthsLook {
  width: number;
  height: number;
  /** White ground, every colour its complement. */
  invert?: boolean;
  /** Seconds a full ring stands for. */
  target: number;
}

/** Ball outline, and the progress ring outside it, in ball radii. */
const RING_GAP = 1.24;
const RING_WIDTH = 0.26;

/**
 * The empty ring, waiting to be filled.
 *
 * Drawn from the first frame, before anybody has banked anything: a track that
 * appears only once there is something in it reads as an ornament that came from
 * nowhere, and a viewer cannot see that a full ring is what the game is for
 * until they have seen an empty one.
 */
const TRACK = '#2a2d36';

/** How much of the zone's width the holder's name may take. */
const LABEL_FIT = 0.78;

const withAlpha = (hex: string, alpha: number): string => {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
};

export function drawMonthsFrame(
  ctx: CanvasRenderingContext2D,
  frame: MonthFrame,
  look: MonthsLook,
): void {
  const { width, height, invert = false, target } = look;
  const radius = width * ARENA;
  const cx = width / 2;
  const cy = height / 2;
  const ball = radius * BALL;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = ink('#000000', invert);
  ctx.fillRect(0, 0, width, height);

  // The arena.
  ctx.strokeStyle = ink('#ffffff', invert);
  // Measured off the reference: the ring is four pixels in a 576-wide frame,
  // which is seven and a half at ours — thinner than the fight's rim, but not
  // the hairline that a straight fraction of it came out as.
  ctx.lineWidth = radius * RIM_WIDTH * 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  // The zone. Dark and quiet when nobody is in it; when somebody is holding it
  // takes their colour, which is the only thing in the picture that says the
  // clock is running.
  const holder = frame.holder;
  const glow = holder >= 0 ? MONTHS[holder].color : null;
  ctx.beginPath();
  ctx.arc(cx, cy, radius * ZONE, 0, Math.PI * 2);
  ctx.fillStyle = glow ? withAlpha(glow, 0.22) : ink('#15161c', invert);
  ctx.fill();
  ctx.lineWidth = radius * 0.012;
  ctx.strokeStyle = glow ? glow : ink('#3a3d47', invert);
  ctx.stroke();

  // The holder's name, big and behind the balls — and inside the zone. Measured
  // rather than guessed at a size: three letters at a fixed size fit and four
  // would not, and a name that hangs over the edge of the zone stops looking
  // like the zone's own label.
  if (glow) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = withAlpha(glow, 0.85);
    const label = MONTHS[holder].label;
    let size = Math.round(radius * 0.3);
    ctx.font = `700 ${size}px system-ui, sans-serif`;
    const room = radius * ZONE * 2 * LABEL_FIT;
    const wide = ctx.measureText(label).width;
    if (wide > room) {
      size = Math.max(8, Math.floor((size * room) / wide));
      ctx.font = `700 ${size}px system-ui, sans-serif`;
    }
    ctx.fillText(label, cx, cy);
    ctx.restore();
  }

  for (let i = 0; i < frame.balls.length; i += 1) {
    const month = MONTHS[i];
    const x = cx + frame.balls[i].x * radius;
    const y = cy + frame.balls[i].y * radius;

    // The empty track first, then the banked seconds over it as an arc from the
    // top going clockwise. Both under the disc, so a full ring cannot creep over
    // the label.
    ctx.beginPath();
    ctx.strokeStyle = ink(TRACK, invert);
    ctx.lineWidth = ball * RING_WIDTH;
    ctx.arc(x, y, ball * RING_GAP, 0, Math.PI * 2);
    ctx.stroke();

    const share = Math.max(0, Math.min(1, frame.hold[i] / target));
    if (share > 0.002) {
      ctx.beginPath();
      ctx.strokeStyle = ink('#ffffff', invert);
      ctx.lineWidth = ball * RING_WIDTH;
      ctx.lineCap = 'round';
      ctx.arc(x, y, ball * RING_GAP, -Math.PI / 2, -Math.PI / 2 + share * Math.PI * 2);
      ctx.stroke();
      ctx.lineCap = 'butt';
    }

    ctx.beginPath();
    ctx.arc(x, y, ball, 0, Math.PI * 2);
    ctx.fillStyle = month.color;
    ctx.fill();
    ctx.lineWidth = ball * 0.16;
    ctx.strokeStyle = ink('#101216', invert);
    ctx.stroke();

    ctx.save();
    ctx.font = `700 ${Math.round(ball * 0.62)}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(month.label, x, y);
    ctx.restore();
  }
}
