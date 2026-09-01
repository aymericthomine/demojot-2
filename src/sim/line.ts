/**
 * Line war.
 *
 * Twelve balls loose in the ring. Every straight run any of them makes — bounce
 * to bounce — stays on the board as a line in its own colour, and **the number
 * of lines a side has on the board is its score**. That is the whole of it:
 * drawing is scoring, and there is one way to take a point off somebody, which
 * is to cut it.
 *
 * - **A ball draws.** Every bounce closes the line it was on and starts the
 *   next, so a side that is left alone climbs steadily.
 * - **A ball cuts.** Crossing a line belonging to somebody else destroys that
 *   line. Nothing is gained by the cutter — it gains by drawing — so a cut is
 *   pure damage, and a side under pressure loses ground faster than it can lay
 *   it down.
 * - **A side on nothing is out.** No lines on the board, no side: the ball goes
 *   and stops drawing. It is a real rule and it has never once fired — over a
 *   hundred and twenty seeds, nobody has been reduced to nothing — because a
 *   side draws faster than the other eleven can cut it. It is kept because the
 *   day the dials move it is the difference between a game and a deadlock.
 *
 * The counter is the mode's own idea and not a decoration. It is what the two
 * reference videos put along the top, and it is the only number in this project
 * that a viewer has to be able to read, because a board of two hundred lines
 * does not say who is second at a glance.
 */

import { MONTHS } from './months';
import { createRng } from './random';
import { FPS } from './style';

/**
 * Physics substeps per rendered frame.
 *
 * Two rather than the usual four. Every substep tests every ball against every
 * line on the board, and the board holds hundreds — the crossing test is what
 * this mode costs, and halving the substeps halves it. Nothing tunnels: a
 * crossing is tested against the segment the ball actually swept, however long
 * that segment is.
 */
const SUBSTEPS = 2;

/** How fast a ball travels, in arena radii a second. */
const SPEED = 1.35;

/** A ball's radius, in arena radii. */
const BALL = 0.05;

/** Where the twelve start, as a fraction of the arena. */
const OPENING_RING = 0.72;

/**
 * How long a ball may not cut for after it has cut.
 *
 * A crossing is not an instant — the ball sits over the line for a few substeps
 * and each one is another intersection with the same piece of work — but the
 * length of the pause is a game rule rather than a guard, and it is the dial the
 * whole mode turns on.
 *
 * A ball lays down about eight lines every ten seconds, one per bounce. Eleven
 * enemies cutting on a short leash take them away faster than that: at a pause
 * of one second the board never grew, every side was reduced to nothing inside
 * two seconds, and nine of the twelve were out before the first second was over.
 * At three and a half the arithmetic turns over — a side draws faster than the
 * other eleven can cut it — the board thickens the way the reference's does, and
 * being wiped out becomes the exception rather than the rule.
 */
const CUT_GAP = 3.5;

/**
 * The most lines a side may hold.
 *
 * A ceiling on the counter as much as on the picture. Left uncapped the leaders
 * run to several hundred while the board turns into felt, and the crossing test
 * — which is what this mode spends its time on — grows with it. Set at forty it
 * bound instead: five sides finished level on exactly forty and the winner was
 * whichever of them the tie-break happened to pick, which is not a game. Ninety
 * is above where a round actually gets to.
 */
const KEEP = 90;

/**
 * The stock a side opens with, and how long before it can be knocked out.
 *
 * Both are there for the same reason: the first seconds. A side draws its first
 * line only when it first reaches the wall, so for half a second everybody holds
 * nothing, and a rule that says nothing means out took nine of the twelve before
 * the first second was over. So each side is dealt a small fan at its station —
 * real lines, cuttable and counted — and nobody may be knocked out until the
 * board has had time to fill.
 */
const OPENING_FAN = 4;
const SETTLE = 12;

/** Seconds of winner held at the end. */
const OUTRO = 2.5;

/**
 * The floor and the ceiling the video is kept between, and the whistle the seed
 * picks between them.
 *
 * The war usually runs the whole way: twelve sides drawing and cutting, and
 * whoever has the most lines when the clock stops takes it. Being wiped out
 * happens and ends it early, in which case the winner keeps drawing until the
 * minute has been cleared rather than the video being cut short.
 */
const SHORTEST = 60;
const LONGEST = 78;

export interface LineBall {
  x: number;
  y: number;
  r: number;
  who: number;
}

/** A run somebody made, and the frames it is on the board for. */
export interface Trail {
  who: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  from: number;
  /** The frame it was cut on, or the end of the video. */
  to: number;
}

export interface LineFrame {
  balls: readonly LineBall[];
  /** Lines held, in the order of the cast. This is the score. */
  held: readonly number[];
  /** Nought while the war is on, one from the moment it is decided. */
  reveal: number;
}

export type LineEventKind = 'wall' | 'cut' | 'out' | 'win';

export interface LineEvent {
  t: number;
  kind: LineEventKind;
  month: number;
}

export interface LineRound {
  seed: number;
  frames: LineFrame[];
  /** Every line ever drawn, with the frames it lives between. */
  trails: Trail[];
  events: LineEvent[];
  winner: number;
  /** Lines it finished on. */
  best: number;
  /** Whether it was the last side standing, or ahead when the clock stopped. */
  swept: boolean;
  duration: number;
  durationInFrames: number;
}

interface Live {
  x: number;
  y: number;
  vx: number;
  vy: number;
  who: number;
  /** Where the line it is currently drawing set off from. */
  fromX: number;
  fromY: number;
  fromAt: number;
  cutAt: number;
  knockedAt: number;
}

/**
 * How far along a ball's path it meets a line, or -1 if it does not.
 *
 * The distance and not merely the fact, because a ball's step often crosses
 * several lines at once and it has to cut the one it reached first. Cutting
 * whichever turned up first in the list is not a tie-break, it is a bias: the
 * search walked the sides in order, so the lowest-numbered side was cut every
 * time two of them were in the way, and over thirty seeds the first six members
 * of the cast never once won.
 */
function hitAt(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number,
): number {
  const rx = bx - ax;
  const ry = by - ay;
  const sx = dx - cx;
  const sy = dy - cy;
  const denom = rx * sy - ry * sx;
  if (denom === 0) return -1;
  const t = ((cx - ax) * sy - (cy - ay) * sx) / denom;
  const u = ((cx - ax) * ry - (cy - ay) * rx) / denom;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1 ? t : -1;
}

export function generateLine(seed: number): LineRound {
  const rng = createRng(seed ^ 0x6d2b79f5);
  const whistle = SHORTEST + rng.next() * (LONGEST - SHORTEST);

  const balls: Live[] = MONTHS.map((_, side) => {
    const angle = -Math.PI / 2 + (side / MONTHS.length) * Math.PI * 2;
    const heading = rng.next() * Math.PI * 2;
    const x = Math.cos(angle) * OPENING_RING;
    const y = Math.sin(angle) * OPENING_RING;
    return {
      x,
      y,
      vx: Math.cos(heading) * SPEED,
      vy: Math.sin(heading) * SPEED,
      who: side,
      fromX: x,
      fromY: y,
      fromAt: 0,
      cutAt: -99,
      knockedAt: -99,
    };
  });

  const frames: LineFrame[] = [];
  const trails: Trail[] = [];
  const events: LineEvent[] = [];
  /** What each side has on the board, oldest first, as indices into `trails`. */
  const mine: number[][] = MONTHS.map(() => []);
  const dt = 1 / (FPS * SUBSTEPS);

  let time = 0;
  let frame = 0;
  let decidedAt = -1;
  let winner = -1;
  let wonAt = 0;
  let swept = false;

  /** Close off the line a ball has been drawing and start the next one. */
  const layDown = (ball: Live): void => {
    if (Math.hypot(ball.x - ball.fromX, ball.y - ball.fromY) > 0.03) {
      const at = trails.length;
      trails.push({
        who: ball.who,
        x1: ball.fromX,
        y1: ball.fromY,
        x2: ball.x,
        y2: ball.y,
        from: ball.fromAt,
        to: Infinity,
      });
      const own = mine[ball.who];
      own.push(at);
      if (own.length > KEEP) {
        const oldest = own.shift();
        if (oldest !== undefined) trails[oldest].to = frame;
      }
    }
    ball.fromX = ball.x;
    ball.fromY = ball.y;
    ball.fromAt = frame;
  };

  // The opening fan: a few short spokes at each station, so that nobody starts
  // the video holding nothing.
  for (const ball of balls) {
    for (let i = 0; i < OPENING_FAN; i += 1) {
      const angle = (i / OPENING_FAN) * Math.PI * 2 + ball.who * 0.21;
      const at = trails.length;
      trails.push({
        who: ball.who,
        x1: ball.x + Math.cos(angle) * 0.05,
        y1: ball.y + Math.sin(angle) * 0.05,
        x2: ball.x + Math.cos(angle) * 0.2,
        y2: ball.y + Math.sin(angle) * 0.2,
        from: 0,
        to: Infinity,
      });
      mine[ball.who].push(at);
    }
  }

  const cap = Math.round((LONGEST + OUTRO + 1) * FPS);
  for (frame = 0; frame < cap; frame += 1) {
    frames.push({
      balls: balls.map((b) => ({ x: b.x, y: b.y, r: BALL, who: b.who })),
      held: mine.map((own) => own.length),
      reveal: decidedAt >= 0 ? Math.min(1, (frame - decidedAt) / (FPS * OUTRO)) : 0,
    });
    if (decidedAt >= 0 && frame >= decidedAt + Math.round(OUTRO * FPS)) break;
    if (decidedAt >= 0) continue;

    for (let step = 0; step < SUBSTEPS; step += 1) {
      time += dt;

      for (let i = balls.length - 1; i >= 0; i -= 1) {
        const ball = balls[i];
        const wasX = ball.x;
        const wasY = ball.y;
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        const reach = 1 - BALL;
        const out = Math.hypot(ball.x, ball.y);
        if (out > reach) {
          const nx = ball.x / out;
          const ny = ball.y / out;
          const along = ball.vx * nx + ball.vy * ny;
          ball.vx -= 2 * along * nx;
          ball.vy -= 2 * along * ny;
          ball.x = nx * reach;
          ball.y = ny * reach;
          // A bounce is where one line ends and the next begins, which is what
          // makes the board read as runs rather than as one long scribble — and
          // it is also the moment a side scores.
          layDown(ball);
          if (time - ball.knockedAt > 0.1) {
            ball.knockedAt = time;
            events.push({ t: time, kind: 'wall', month: ball.who });
          }
        }

        if (time - ball.cutAt < CUT_GAP) continue;

        // The ball cuts with its width rather than with its centre: three rays,
        // one down the middle and one along each flank.
        const ran = Math.hypot(ball.x - wasX, ball.y - wasY) || 1;
        const offX = (-(ball.y - wasY) / ran) * BALL * 0.85;
        const offY = ((ball.x - wasX) / ran) * BALL * 0.85;
        let cut = -1;
        let victim = -1;
        let soonest = 2;
        for (let side = 0; side < MONTHS.length; side += 1) {
          if (side === ball.who) continue;
          for (const at of mine[side]) {
            const line = trails[at];
            // Cheap rejection first: most of the board is nowhere near the ball.
            if (
              Math.min(line.x1, line.x2) > Math.max(wasX, ball.x) + BALL ||
              Math.max(line.x1, line.x2) < Math.min(wasX, ball.x) - BALL ||
              Math.min(line.y1, line.y2) > Math.max(wasY, ball.y) + BALL ||
              Math.max(line.y1, line.y2) < Math.min(wasY, ball.y) - BALL
            ) {
              continue;
            }
            for (const [ox, oy] of [
              [0, 0],
              [offX, offY],
              [-offX, -offY],
            ]) {
              const t = hitAt(
                wasX + ox,
                wasY + oy,
                ball.x + ox,
                ball.y + oy,
                line.x1,
                line.y1,
                line.x2,
                line.y2,
              );
              if (t >= 0 && t < soonest) {
                soonest = t;
                cut = at;
                victim = side;
              }
            }
          }
        }
        if (cut < 0) continue;

        trails[cut].to = frame;
        mine[victim] = mine[victim].filter((at) => at !== cut);
        ball.cutAt = time;
        events.push({ t: time, kind: 'cut', month: victim });

        if (mine[victim].length === 0 && time > SETTLE) {
          // Out. The ball goes, so nothing more is drawn for that side, and the
          // ring gets quieter as the field thins rather than louder.
          const gone = balls.findIndex((b) => b.who === victim);
          if (gone >= 0) {
            balls.splice(gone, 1);
            if (gone < i) i -= 1;
            events.push({ t: time, kind: 'out', month: victim });
          }
        }
      }

      const standing = balls.length;
      if (winner < 0 && standing <= 1) {
        winner = standing ? balls[0].who : 0;
        swept = true;
        wonAt = time;
      }
      if (winner < 0 && time >= whistle - OUTRO) {
        winner = mine.reduce(
          (best, own, side) => (own.length > mine[best].length ? side : best),
          0,
        );
        wonAt = time;
      }
      if (winner >= 0 && time >= Math.max(wonAt, SHORTEST - OUTRO)) {
        decidedAt = frames.length;
        events.push({ t: time, kind: 'win', month: winner });
        break;
      }
    }
  }

  // Whatever was still being drawn when the video ended is drawn to where it got.
  for (const ball of balls) layDown(ball);
  for (const line of trails) if (line.to === Infinity) line.to = frames.length;

  return {
    seed,
    frames,
    trails,
    events,
    winner: winner >= 0 ? winner : 0,
    best: winner >= 0 ? frames[frames.length - 1].held[winner] : 0,
    swept,
    duration: frames.length / FPS,
    durationInFrames: frames.length,
  };
}
