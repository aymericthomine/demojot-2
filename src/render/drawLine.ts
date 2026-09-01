/**
 * One frame of Line war.
 *
 * Two bands: the counter along the top, and the ring underneath it. The counter
 * is laid out the way Pachinko's scoreboard is — two rows of six, each a disc
 * with its total under it — because that is the design the rest of the site
 * already uses for a mode where twelve sides carry a running number.
 *
 * Everything is a multiple of the ring's diameter, and the whole column is set
 * to the height of the arena the other modes are played in. A mode that arrives
 * on the same page half again the size of the ones next to it reads as a
 * different site rather than as another game.
 *
 * The board is the sixty threads: each runs from its own fixed pin on the rim
 * to whichever ball holds it now, so a side reads as a fan and losing threads
 * reads as a fan being thinned. Threads go under the balls and are drawn thin —
 * they are what the balls are playing on, not the subject.
 */

import { drawLabel, drawMemberFaded, draws, type Member } from './cast';
import { ink, textOn } from './ink';
import { pinAt, type LineFrame } from '../sim/line';
import { ARENA, RIM_WIDTH } from '../sim/style';

export interface LineLook {
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

/** The counter, in units of the ring's diameter. */
const DISC = 0.045;
const ROW_STEP = 0.135;
const SCORE_DROP = 0.075;
const COL_STEP = 0.155;
const HEAD_GAP = 0.05;
const SCORE_SIZE = 0.052;

/** The whole column, top of the discs to the bottom of the ring. */
const BLOCK = DISC + ROW_STEP + SCORE_DROP + HEAD_GAP + 1;

/** And the height it is set to: the arena the other modes are played in. */
const SPAN = ARENA * 2;

/** How wide a thread is drawn, as a fraction of the ring's radius. */
const THREAD = 0.011;

/** The dark line round a ball that carries writing rather than a picture. */
const OUTLINE = 0.09;

/** What a picture sits on, so its clipped edge shows no colour of its own. */
const UNDER = '#31343d';

/** What a side that is out fades to. */
const SPENT = '#31343d';

const withAlpha = (hex: string, alpha: number): string => {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
};

const drained = (hex: string, amount: number): string => {
  if (amount <= 0) return hex;
  const from = Number.parseInt(hex.slice(1), 16);
  const to = Number.parseInt(SPENT.slice(1), 16);
  const mix = (shift: number) => {
    const a = (from >> shift) & 255;
    const b = (to >> shift) & 255;
    return Math.round(a + (b - a) * amount);
  };
  return `#${((mix(16) << 16) | (mix(8) << 8) | mix(0)).toString(16).padStart(6, '0')}`;
};

/** Plain digits, centred. */
function write(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color: string,
): void {
  ctx.save();
  ctx.font = `700 ${Math.round(size)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function drawLineFrame(
  ctx: CanvasRenderingContext2D,
  frame: LineFrame,
  look: LineLook,
): void {
  const { width, height, invert = false, winner, cast, fit, weight } = look;
  const across = (width * SPAN) / BLOCK;
  const radius = across / 2;
  const cx = width / 2;
  const head = (height - BLOCK * across) / 2;
  const rowOne = head + DISC * across;
  const rowTwo = rowOne + ROW_STEP * across;
  const cy = rowTwo + SCORE_DROP * across + HEAD_GAP * across + radius;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = ink('#000000', invert);
  ctx.fillRect(0, 0, width, height);

  const reveal = frame.reveal;

  // How many threads each side is holding: the score, and what says who is
  // still in.
  const held = new Array<number>(cast.length).fill(0);
  for (const who of frame.threads) held[who] += 1;
  const most = Math.max(...held);

  // Where each side's ball is, so a thread knows the end it is being pulled by.
  const ballOf = new Array<{ x: number; y: number } | undefined>(cast.length);
  for (const ball of frame.balls) ballOf[ball.who] = ball;

  // The counter.
  const disc = DISC * across;
  for (let i = 0; i < cast.length; i += 1) {
    const member = cast[i];
    // A side on nothing is out, and reads as out whether the video has ended or
    // not: the disc goes grey and the number with it.
    const lost = held[i] === 0 ? 0.8 : reveal > 0 && i !== winner ? reveal : 0;
    const size = i === winner ? disc * (1 + 0.16 * reveal) : disc;
    const x = cx + ((i % 6) - 2.5) * COL_STEP * across;
    const y = i < 6 ? rowOne : rowTwo;

    const fill = draws(member) ? SPENT : drained(member.color, lost);
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    if (draws(member)) {
      drawMemberFaded(ctx, member, x, y, size, 1 - lost * 0.72);
    } else {
      drawLabel(ctx, member.label, x, y, size * fit, drained(textOn(fill), lost * 0.62), weight);
    }
    // The leader wears a white ring, which is the one thing twelve numbers
    // cannot say at a glance.
    if (held[i] === most && most > 0) {
      ctx.beginPath();
      ctx.strokeStyle = ink(drained('#ffffff', lost), invert);
      ctx.lineWidth = size * 0.12;
      ctx.arc(x, y, size * 1.1, 0, Math.PI * 2);
      ctx.stroke();
    }
    write(
      ctx,
      String(held[i]),
      x,
      y + SCORE_DROP * across,
      SCORE_SIZE * across,
      ink(drained('#ffffff', lost * 0.72), invert),
    );
  }

  // The ring.
  ctx.strokeStyle = ink('#ffffff', invert);
  ctx.lineWidth = radius * RIM_WIDTH * 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  // The board: sixty threads, pin to owner.
  ctx.lineCap = 'round';
  ctx.lineWidth = radius * THREAD;
  for (let pin = 0; pin < frame.threads.length; pin += 1) {
    const who = frame.threads[pin];
    const ball = ballOf[who];
    if (!ball) continue;
    const lost = reveal > 0 && who !== winner ? reveal : 0;
    if (lost >= 1) continue;
    const foot = pinAt(pin);
    ctx.beginPath();
    ctx.strokeStyle = withAlpha(cast[who].color, 0.8 * (1 - lost));
    ctx.moveTo(cx + foot.x * radius, cy + foot.y * radius);
    ctx.lineTo(cx + ball.x * radius, cy + ball.y * radius);
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
