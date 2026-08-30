/**
 * One frame of Pachinko.
 *
 * Three bands, top to bottom: the scoreboard, the field, the bar. The
 * scoreboard is the only place the twelve are named — the balls in the field
 * are too small to carry writing and go down as plain colour — so everything a
 * viewer needs to follow the game is in one place and stays there while the
 * board rattles underneath it.
 *
 * The geometry is not chosen here. The simulation works in units of the field's
 * width, and this multiplies by however wide the field is drawn: peg positions,
 * ball size and the line a ball is counted as landing on all come from there, so
 * the picture cannot disagree with the physics about where anything is.
 *
 * There is no writing that is not a number. The reference carries a title and a
 * follow-me line across the top; what is left without them is a board that
 * explains itself — seven slots with what they are worth written in them, and
 * twelve totals that go up.
 */

import { drawLabel, drawMember, type Member } from './cast';
import { ink, textOn } from './ink';
import {
  BALL,
  COLS,
  LAND_AT,
  PEG,
  ROWS,
  SLOT_DEPTH,
  SLOT_MULTIPLY,
  SLOT_VALUE,
  pegAt,
  pegsOn,
  type PachinkoFrame,
} from '../sim/pachinko';

export interface PachinkoLook {
  width: number;
  height: number;
  /** White ground, every colour its complement. */
  invert?: boolean;
  /** The month that finished on top. */
  winner: number;
  /** Who is playing: months, star signs or countries. */
  cast: readonly Member[];
  /** How much of a disc that cast's writing takes. */
  fit: number;
  /** How much that cast's writing is thickened. */
  weight: number;
}

/**
 * Where everything goes, as fractions of the frame.
 *
 * Measured off the reference at its own size and scaled: a 576-wide frame with
 * a field 468 across starting 333 down. The frame here is 1080 by 1920 and the
 * reference is 576 by 1024 — the same 9:16 — so every number is the reference's
 * own, divided by its frame rather than by ours.
 */
const FIELD_W = 0.8125;
const FIELD_TOP = 0.3252;

/** The two rows of the scoreboard, and where a total sits under its disc. */
const ROW_ONE = 0.2119;
const ROW_TWO = 0.2734;
const SCORE_DROP = 0.0254;
const DISC = 0.033;
const COL_STEP = 0.1233;

/** The bar under the board: how far along the playing time has got. */
const BAR_TOP = 0.791;
const BAR_HIGH = 0.0078;

/** Type sizes, as fractions of the frame width. */
const SCORE_SIZE = 0.0313;
const SLOT_SIZE = 0.034;

const FIELD = '#08090c';
const EDGE = '#3a3d47';
const PIN = '#82858f';
const CELL = '#1b1d23';
const TRACK = '#16181d';
const BAR = '#b9bcc8';
const GOLD = '#f2c94c';

/** What a month that did not win fades to. */
const SPENT = '#31343d';

/** A colour with the life going out of it, towards grey rather than the ground. */
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

const withAlpha = (hex: string, alpha: number): string => {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
};

/** Plain digits, centred. Not `drawLabel`: that is for glyphs, and these are numbers. */
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

export function drawPachinkoFrame(
  ctx: CanvasRenderingContext2D,
  frame: PachinkoFrame,
  look: PachinkoLook,
): void {
  const { width, height, invert = false, winner, cast, fit, weight } = look;
  const field = width * FIELD_W;
  const left = (width - field) / 2;
  const top = height * FIELD_TOP;
  // The simulation's units are field widths, so this pair is the whole mapping.
  const at = (x: number) => left + x * field;
  const on = (y: number) => top + y * field;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = ink('#000000', invert);
  ctx.fillRect(0, 0, width, height);

  const reveal = frame.reveal;
  const best = Math.max(...frame.score);

  // The scoreboard. Two rows of six in the cast's own order, which is the order
  // anybody reading months expects and the only one that lets the eye find a
  // month without hunting.
  const disc = width * DISC;
  for (let i = 0; i < cast.length; i += 1) {
    const member = cast[i];
    const row = i < 6 ? ROW_ONE : ROW_TWO;
    const cx = width / 2 + ((i % 6) - 2.5) * width * COL_STEP;
    const cy = height * row;
    const lost = reveal > 0 && i !== winner ? reveal : 0;
    // The winner grows a little once it is decided, so the eye lands on it
    // rather than reading twelve totals to find the biggest.
    const size = i === winner ? disc * (1 + 0.16 * reveal) : disc;

    // A month that has just scored wears a halo of its own colour, which is how
    // the scoreboard says *who* the ball that just landed belonged to. Taken
    // from the slot it landed in, so the halo and the lit slot are one event.
    let glow = 0;
    for (let s = 0; s < COLS; s += 1) {
      if (frame.flashBy[s] === i) glow = Math.max(glow, frame.flash[s]);
    }
    if (glow > 0 && reveal === 0) {
      ctx.beginPath();
      ctx.strokeStyle = withAlpha(member.color, 0.55 * glow);
      ctx.lineWidth = size * 0.42;
      ctx.arc(cx, cy, size * 1.2, 0, Math.PI * 2);
      ctx.stroke();
    }

    const fill = member.flag ? SPENT : drained(member.color, lost);
    ctx.beginPath();
    ctx.arc(cx, cy, size, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();

    if (member.flag) {
      ctx.save();
      ctx.globalAlpha = 1 - lost * 0.72;
      drawMember(ctx, member, cx, cy, size);
      ctx.restore();
    } else {
      drawLabel(ctx, member.label, cx, cy, size * fit, drained(textOn(fill), lost * 0.62), weight);
    }

    // The leader wears a white ring, which is the reference's own tell and the
    // one thing twelve numbers cannot say at a glance.
    if (frame.score[i] === best && best > 0) {
      ctx.beginPath();
      ctx.strokeStyle = ink(drained('#ffffff', lost), invert);
      ctx.lineWidth = size * 0.12;
      ctx.arc(cx, cy, size * 1.09, 0, Math.PI * 2);
      ctx.stroke();
    }

    write(
      ctx,
      String(frame.score[i]),
      cx,
      cy + height * SCORE_DROP + disc * 0.35,
      width * SCORE_SIZE,
      ink(drained('#ffffff', lost * 0.72), invert),
    );
  }

  // The board: the field, then the slots under it, inside one outline.
  const boardTop = on(0);
  const boardEnd = on(LAND_AT + SLOT_DEPTH);
  const mouth = on(LAND_AT);
  ctx.save();
  // Everything below the scoreboard goes out with the game, so the last thing
  // the video shows is a winner rather than a machine nobody is playing.
  ctx.globalAlpha = 1 - 0.72 * reveal;

  ctx.fillStyle = ink(FIELD, invert);
  ctx.fillRect(left, boardTop, field, boardEnd - boardTop);

  // The board is a box, and nothing outside it is drawn. Balls are released
  // above the field — they have to be, or the first row would be the top of
  // their fall rather than something they arrive at — and without this they
  // appear whole, hanging over the scoreboard, before dropping into the
  // machine. Clipped, they come out of its mouth.
  ctx.save();
  ctx.beginPath();
  ctx.rect(left, boardTop, field, boardEnd - boardTop);
  ctx.clip();

  // The slots. Their cells are what a ball lands in, so the cell that has just
  // been landed in takes the lander's colour for as long as the flash lasts.
  const cell = field / COLS;
  const multiplying = frame.phase !== 'play';
  for (let s = 0; s < COLS; s += 1) {
    const x = left + s * cell;
    ctx.fillStyle = ink(CELL, invert);
    ctx.fillRect(x, mouth, cell, boardEnd - mouth);
    if (frame.flash[s] > 0 && frame.flashBy[s] >= 0) {
      ctx.fillStyle = withAlpha(cast[frame.flashBy[s]].color, 0.3 * frame.flash[s]);
      ctx.fillRect(x, mouth, cell, boardEnd - mouth);
    }
    ctx.strokeStyle = ink('#000000', invert);
    ctx.lineWidth = Math.max(1, width * 0.0028);
    ctx.strokeRect(x, mouth, cell, boardEnd - mouth);
    write(
      ctx,
      multiplying ? `x${SLOT_MULTIPLY[s]}` : `+${SLOT_VALUE[s]}`,
      x + cell / 2,
      (mouth + boardEnd) / 2,
      width * SLOT_SIZE,
      ink(multiplying ? GOLD : '#ffffff', invert),
    );
  }

  // The pegs.
  ctx.fillStyle = ink(PIN, invert);
  for (let row = 0; row < ROWS; row += 1) {
    for (let place = 0; place < pegsOn(row); place += 1) {
      const peg = pegAt(row, place);
      ctx.beginPath();
      ctx.arc(at(peg.x), on(peg.y), PEG * field, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // The ring a landing leaves at the mouth of its slot: it opens outwards and
  // fades, which is what makes a landing an event rather than a ball quietly
  // going missing at the bottom of the picture.
  for (let s = 0; s < COLS; s += 1) {
    const lit = frame.flash[s];
    if (lit <= 0 || frame.flashBy[s] < 0) continue;
    ctx.beginPath();
    ctx.strokeStyle = withAlpha(cast[frame.flashBy[s]].color, lit * 0.8);
    ctx.lineWidth = BALL * field * 0.4;
    ctx.arc(left + (s + 0.5) * cell, mouth, BALL * field * (0.7 + 1.6 * (1 - lit)), 0, Math.PI * 2);
    ctx.stroke();
  }

  // The balls. Plain colour where the cast writes — three letters in a disc
  // this size would be a smudge, and the twelve colours are distinct — and the
  // picture itself where the cast draws, because four of the twelve countries
  // share a flag colour and would otherwise be the same ball.
  const ball = BALL * field;
  for (let i = 0; i < frame.balls.length; i += 1) {
    const here = frame.balls[i];
    if (!here.live) continue;
    const member = cast[i];
    const x = at(here.x);
    const y = on(here.y);
    ctx.beginPath();
    ctx.arc(x, y, ball, 0, Math.PI * 2);
    ctx.fillStyle = member.flag ? SPENT : member.color;
    ctx.fill();
    if (member.flag) drawMember(ctx, member, x, y, ball);
  }
  ctx.restore();

  // The outline last, and outside the clip: a stroke laid on the boundary of
  // its own clip comes out half the width it was asked for.
  ctx.strokeStyle = ink(EDGE, invert);
  ctx.lineWidth = Math.max(1, width * 0.0028);
  ctx.strokeRect(left, boardTop, field, boardEnd - boardTop);
  ctx.restore();

  // The bar: how much playing time is left, and gold once there is none — which
  // is the only warning the last wave gets, and all it needs, because the slots
  // change to multipliers in the same instant.
  const barTop = height * BAR_TOP;
  const barHigh = height * BAR_HIGH;
  ctx.fillStyle = ink(TRACK, invert);
  ctx.fillRect(left, barTop, field, barHigh);
  ctx.fillStyle = ink(frame.phase === 'play' ? BAR : GOLD, invert);
  ctx.fillRect(left, barTop, field * (frame.phase === 'play' ? frame.progress : 1), barHigh);
}
