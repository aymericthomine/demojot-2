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

import { drawLabel, drawMember, type Member } from './cast';
import { ink, textOn } from './ink';
import { BALL, ZONE, type MonthFrame } from '../sim/months';
import { ARENA, RIM_WIDTH } from '../sim/style';

export interface MonthsLook {
  width: number;
  height: number;
  /** White ground, every colour its complement. */
  invert?: boolean;
  /** Seconds a full ring stands for. */
  target: number;
  /** The month the ending belongs to. */
  winner: number;
  /** Who is playing: months, star signs or countries. */
  cast: readonly Member[];
  /** How much of a disc that cast's writing takes. */
  fit: number;
  /** How much that cast's writing is thickened. */
  weight: number;
}

/**
 * The dark line drawn around a month, in ball radii.
 *
 * Thin, because it is what stands between the month and its gauge: the line is
 * centred on the ball's edge, so half of it sits outside and that half *is* the
 * gap the ring has to clear. Measured off the reference, the arc's inner edge
 * lands at 1.05 ball radii, which is this line and no more.
 */
const OUTLINE = 0.1;

/** The progress ring outside it, in ball radii. */
const RING_WIDTH = 0.18;

/**
 * Where the progress ring sits, in ball radii — derived, not chosen.
 *
 * Flush: the ring's inner edge is the outline's outer edge, so it rides on the
 * month's rim rather than floating off it. Both are strokes centred on their
 * radius, so the reach of one and the half-width of the other are what the
 * distance has to clear, and writing it that way keeps it true if either ever
 * changes thickness. Picked as a bare number it was 1.24, which left the ring
 * two and a half pixels clear of the ball at this frame size.
 */
const RING_GAP = 1 + OUTLINE / 2 + RING_WIDTH / 2;

/**
 * Half a round cap, as an angle at the ring's radius.
 *
 * The caps are what make the arc look like a gauge rather than a wedge, and
 * they are also why an arc lies: each one hangs half the stroke's width past
 * the angle actually drawn, so a ring closes to the eye at 97.6 per cent of its
 * target. A runner-up that plateaus just above that shows a full ring for the
 * rest of the video while nothing happens — and the ending, which fires the
 * instant a ring is genuinely full, then looks late.
 *
 * So the sweep is drawn short by exactly what the caps add back. The arc keeps
 * its rounded ends, covers exactly the share it stands for, and closes at one
 * and not before.
 */
const CAP = RING_WIDTH / 2 / RING_GAP;

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

/** What a month that did not win fades to. */
const SPENT = '#31343d';

/**
 * A colour with the life going out of it.
 *
 * Towards a grey rather than towards the ground: a ball that faded to black
 * would leave a hole in the ring where a month used to be, and twelve months
 * that end as eleven holes and a colour is a different picture from twelve
 * months of which one is still lit.
 */
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

export function drawMonthsFrame(
  ctx: CanvasRenderingContext2D,
  frame: MonthFrame,
  look: MonthsLook,
): void {
  const { width, height, invert = false, target, winner, cast, fit, weight } = look;
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
  const glow = holder >= 0 ? cast[holder].color : null;
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
  //
  // It goes out over the ending. It answers "who is holding the middle", and at
  // the end nobody is: what is left is a winner, said by the one disc that kept
  // its colour. Kept on, it also lands under the winner's own ball whenever the
  // ball happens to finish near the centre, and a name half-hidden behind the
  // thing it names reads as a fault rather than as a flourish.
  if (glow && frame.reveal < 1 && cast[holder].flag) {
    // A cast that draws puts its picture here instead of its name, at the size
    // the name would have taken and behind everything for the same reason.
    ctx.save();
    ctx.globalAlpha = 0.55 * (1 - frame.reveal);
    drawMember(ctx, cast[holder], cx, cy, radius * ZONE * LABEL_FIT);
    ctx.restore();
  } else if (glow && frame.reveal < 1) {
    const label = cast[holder].label;
    let size = Math.round(radius * 0.3);
    ctx.save();
    ctx.font = `700 ${size}px system-ui, sans-serif`;
    const room = radius * ZONE * 2 * LABEL_FIT;
    const wide = ctx.measureText(label).width;
    ctx.restore();
    if (wide > room) size = Math.max(8, Math.floor((size * room) / wide));
    drawLabel(ctx, label, cx, cy, size, withAlpha(glow, 0.85 * (1 - frame.reveal)), weight);
  }

  // The ending: every month but one loses its colour, so the last thing the
  // video shows is the winner as the only lit thing in the ring.
  const reveal = frame.reveal;

  for (let i = 0; i < frame.balls.length; i += 1) {
    const member = cast[i];
    const lost = i === winner ? 0 : reveal;
    const x = cx + frame.balls[i].x * radius;
    const y = cy + frame.balls[i].y * radius;
    // And the winner grows a little, so the eye lands on it rather than
    // hunting the ring for the one disc that still has a colour.
    const disc = i === winner ? ball * (1 + 0.14 * reveal) : ball;

    // The empty track first, then the banked seconds over it as an arc from the
    // top going clockwise. Both under the disc, so a full ring cannot creep over
    // the label.
    ctx.beginPath();
    ctx.strokeStyle = ink(TRACK, invert);
    ctx.lineWidth = disc * RING_WIDTH;
    ctx.arc(x, y, disc * RING_GAP, 0, Math.PI * 2);
    ctx.stroke();

    const share = Math.max(0, Math.min(1, frame.hold[i] / target));
    const sweep = share * Math.PI * 2;
    const full = share >= 1;
    // Below two caps there is no arc left to draw once they are paid for, and
    // what would be drawn is a dot standing for a share too small to read.
    if (full || sweep > CAP * 2) {
      ctx.beginPath();
      // The losers' arcs go out with them; the winner's stays white and full,
      // which is what a closed ring was for.
      ctx.strokeStyle = ink(drained('#ffffff', lost), invert);
      ctx.lineWidth = disc * RING_WIDTH;
      ctx.lineCap = 'round';
      if (full) {
        // A closed ring is drawn closed, not as an arc trimmed until its two
        // caps happen to meet. A cap is a flat half-disc, not a piece of the
        // circle, so trimming by the angle it spans leaves the outer edge of
        // the band short — a notch at twelve o'clock on the one ring the whole
        // video is about.
        ctx.arc(x, y, disc * RING_GAP, 0, Math.PI * 2);
      } else {
        ctx.arc(x, y, disc * RING_GAP, -Math.PI / 2 + CAP, -Math.PI / 2 + sweep - CAP);
      }
      ctx.stroke();
      ctx.lineCap = 'butt';
    }

    const fill = drained(member.color, lost);
    ctx.beginPath();
    ctx.arc(x, y, disc, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    // No rim on a flag. A flag is already a finished picture with its own edge,
    // and a line round it reads as a badge somebody mounted it in. The cost is
    // Germany, whose top third is the ground it sits on and now runs into it —
    // which is what the flag looks like, and was asked for.
    if (!member.flag) {
      ctx.lineWidth = disc * OUTLINE;
      ctx.strokeStyle = ink('#101216', invert);
      ctx.stroke();
    }

    if (member.flag) {
      // The flag goes inside the outline, not over it, so the disc keeps the
      // edge that separates it from the ground and from anything behind it.
      ctx.save();
      ctx.globalAlpha = 1 - lost * 0.72;
      drawMember(ctx, member, x, y, disc * (1 - OUTLINE / 2));
      ctx.restore();
    } else {
      // Whichever of black and white can be read on the colour actually under
      // it — which is why it is asked of the drained fill and not of the
      // member's own colour. The pale ones carry black writing while the game
      // is on, and a pale one that goes out ends up on a dark grey where black
      // would disappear; asking the fill answers both without a special case.
      drawLabel(
        ctx,
        member.label,
        x,
        y,
        disc * fit,
        drained(textOn(fill), lost * 0.62),
        weight,
      );
    }
  }
}
