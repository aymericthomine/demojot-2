/**
 * One frame of Hot potato.
 *
 * Three states and the picture has to say which is which at a glance, on a
 * phone, in a second: a month still in is a filled disc, a month that is out is
 * the hollow ring it left behind, and the one holding the potato wears a red
 * band round it. Filled against hollow does the work that dimming alone would
 * not — a dark disc among bright ones reads as a colour choice, whereas a ring
 * with nothing in it reads as something that used to be there.
 *
 * The fuse is written across the middle, behind everything, because it is the
 * only number in the mode and the whole of its tension. It goes red for the last
 * second and a half, which is the reference's own tell.
 */

import { drawMember, type Member } from './cast';
import { ink, textOn } from './ink';
import { BALL } from '../sim/months';
import type { PotatoFrame } from '../sim/potato';
import { ARENA, RIM_WIDTH } from '../sim/style';

export interface PotatoLook {
  width: number;
  height: number;
  /** White ground, every colour its complement. */
  invert?: boolean;
  /** The month left standing, lit through the ending. */
  survivor: number;
  /** Who is playing: months, star signs or countries. */
  cast: readonly Member[];
  /** How much of a disc that cast's writing takes. */
  fit: number;
}

/** The dark line drawn around a month that is still in, in ball radii. */
const OUTLINE = 0.1;

/** The ring an out month leaves, in ball radii. Its outer edge is the wall. */
const WALL_WIDTH = 0.16;

/**
 * The holder's band, and where it sits.
 *
 * Not flush the way Month's gauge is, and for a reason: that ring is a reading
 * *of* the month and belongs against it, while this one is a thing the month is
 * carrying. It is also red, and two of the twelve are near enough to red that a
 * band laid straight on their rim would join up with them. The dark of the
 * ground shows through the step, so it reads as separate on every colour.
 */
const HALO_WIDTH = 0.26;
const HALO_STEP = 0.08;
const HALO_GAP = 1 + OUTLINE / 2 + HALO_WIDTH / 2 + HALO_STEP;

/** What the holder's band is painted in. Not a month's colour: the potato's. */
const HOT = '#ff2d3f';

/** How much of its colour an out month keeps. */
const SPENT = 0.42;

/**
 * The fuse: when it shows at all, and when it starts looking like a problem.
 *
 * It appears with three seconds left rather than running the whole round. A
 * number counting down from five for fifty-odd seconds is wallpaper — the eye
 * stops reading it — whereas one that arrives is an event, and it arrives at
 * the only point where it changes what you are watching for. The red is the
 * reference's own tell, kept for the last second and a half of the three.
 */
const FUSE_SHOWS = 3;
const FUSE_COLD = '#4c505c';
const FUSE_HOT = '#ff2d3f';
const PANIC = 1.5;

/** A colour with the light taken out of it, hue kept. */
const dim = (hex: string, keep: number): string => {
  const n = Number.parseInt(hex.slice(1), 16);
  const mix = (shift: number) => Math.round(((n >> shift) & 255) * keep);
  return `#${((mix(16) << 16) | (mix(8) << 8) | mix(0)).toString(16).padStart(6, '0')}`;
};

export function drawPotatoFrame(
  ctx: CanvasRenderingContext2D,
  frame: PotatoFrame,
  look: PotatoLook,
): void {
  const { width, height, invert = false, survivor, cast, fit } = look;
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
  ctx.lineWidth = radius * RIM_WIDTH * 1.2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  // The fuse, big and behind the balls. It goes with the game: once there is a
  // survivor there is nothing left to count, and a frozen nought on the last
  // two seconds would read as a clock that broke rather than as a game that
  // ended.
  if (frame.reveal < 1 && frame.fuse <= FUSE_SHOWS) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `700 ${Math.round(radius * 0.62)}px system-ui, sans-serif`;
    ctx.fillStyle = ink(frame.fuse < PANIC ? FUSE_HOT : FUSE_COLD, invert);
    ctx.fillText(frame.fuse.toFixed(1), cx, cy);
    ctx.restore();
  }

  for (let i = 0; i < frame.balls.length; i += 1) {
    const member = cast[i];
    const here = frame.balls[i];
    const x = cx + here.x * radius;
    const y = cy + here.y * radius;

    if (here.out) {
      // What is left of a month: the ring it was, with nothing in it. Drawn so
      // that its outer edge is exactly the surface everybody bounces off, which
      // is the only way the picture and the physics agree about where a wall is.
      ctx.beginPath();
      ctx.strokeStyle = ink(dim(member.color, SPENT), invert);
      ctx.lineWidth = ball * WALL_WIDTH;
      ctx.arc(x, y, ball * (1 - WALL_WIDTH / 2), 0, Math.PI * 2);
      ctx.stroke();

      if (!member.flag) {
        ctx.save();
        ctx.font = `700 ${Math.round(ball * fit)}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = ink(dim(member.color, SPENT), invert);
        ctx.fillText(member.label, x, y);
        ctx.restore();
      }
      continue;
    }

    // The survivor grows a little once it is the last one, so the eye lands on
    // it rather than hunting the ring for the one disc that is still filled.
    const disc = i === survivor ? ball * (1 + 0.14 * frame.reveal) : ball;

    if (i === frame.holder) {
      ctx.beginPath();
      ctx.strokeStyle = HOT;
      ctx.lineWidth = disc * HALO_WIDTH;
      ctx.arc(x, y, disc * HALO_GAP, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.beginPath();
    ctx.arc(x, y, disc, 0, Math.PI * 2);
    ctx.fillStyle = member.color;
    ctx.fill();
    ctx.lineWidth = disc * OUTLINE;
    // A flag with black in it on a black ground needs a rim that is neither:
    // Germany's top third *is* the ground, and with a near-black outline the
    // disc came out as a half circle of red and gold floating in nothing.
    ctx.strokeStyle = ink(member.flag ? '#585d69' : '#101216', invert);
    ctx.stroke();

    if (member.flag) {
      drawMember(ctx, member, x, y, disc * (1 - OUTLINE / 2));
    } else {
      ctx.save();
      ctx.font = `700 ${Math.round(disc * fit)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = textOn(member.color);
      ctx.fillText(member.label, x, y);
      ctx.restore();
    }
  }
}
