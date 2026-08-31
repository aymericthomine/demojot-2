/**
 * Line war.
 *
 * Twelve balls loose in the ring, and every straight run any of them makes
 * stays on the board as a line in its own colour. The board is therefore a
 * record of where everybody has been, and it is also the game: **cut through
 * somebody else's line and you take one of their lives.** The line you cut is
 * gone with it.
 *
 * A ball's size is what it has left, so nothing has to be written down. A side
 * that is winning is a big ball with the ring full of its colour; a side that is
 * losing is a small one with hardly a line to its name; and a side on nothing is
 * gone, its remaining lines with it. Twelve numbers along the top would say the
 * same thing and would be the only writing in the project.
 *
 * The lines are what make it a war rather than a screensaver. They accumulate,
 * so the longer a ball has been somewhere the more dangerous that place is to
 * everybody else, and a ball that has been busy is surrounded by its own work.
 * Nothing else in this project has a memory.
 */

import { MONTHS } from './months';
import { createRng } from './random';
import { FPS } from './style';

/** Physics substeps per rendered frame. */
const SUBSTEPS = 4;

/** How fast a ball travels, in arena radii a second. */
const SPEED = 1.5;

/** Lives each side opens with. */
const LIVES = 6;

/** A ball's radius at full lives. Below that it goes as the square root. */
const FULL = 0.055;

/** Where the twelve start, as a fraction of the arena. */
const OPENING_RING = 0.72;

/**
 * How long a ball is safe after taking a life.
 *
 * A crossing is not an instant: the ball is over the line for several substeps,
 * and every one of them is another intersection with the same piece of somebody
 * else's work. Without a pause a single crossing empties a side.
 */
const STEAL_GAP = 1.7;

/**
 * How many lines a side may have on the board at once.
 *
 * Old ones are dropped as new ones are drawn. It is a limit on the picture
 * before it is a limit on the game — a ring holding six hundred lines is a ring
 * you cannot see a ball in — and it is also what keeps the crossing test cheap
 * enough to run four times a frame.
 */
const KEEP = 26;

/**
 * How many lives a cut is worth, and how that grows.
 *
 * One at the start, and towards the end a share of whatever the side being cut
 * still has. With a flat one the war never finishes: lives are a random walk
 * between twelve sides, and over forty seeds not one of them was ever swept
 * inside the ceiling — the mode always ended on a whistle with somebody merely
 * ahead. Stepping it up to three by the last third was not enough either, since
 * by then the survivors are holding ten and twenty. Taking a *share* is what
 * turns a drift into a rout, and it scales with whoever got fat: the collapse
 * belongs at the end of the video anyway.
 */
const bite = (time: number, whistle: number, held: number): number => {
  const rout = 1.1 * (time / whistle) ** 3;
  return 1 + Math.floor(held * rout);
};

/** Seconds of winner held at the end. */
const OUTRO = 2.5;

/**
 * The floor and the ceiling the whole video is kept between, and the whistle
 * the seed picks between them.
 *
 * Most rounds are decided by the whistle rather than by a sweep, and that is the
 * mode: twelve sides cutting each other's work with a clock running, and whoever
 * holds the most when it stops. A sweep happens — the ring can be taken — but it
 * is the exception, so the length is drawn from the seed rather than left at the
 * ceiling, or every video would be the same number of frames long and a
 * duplicate detector reads that first.
 */
const SHORTEST = 60;
const LONGEST = 78;

export interface LineBall {
  x: number;
  y: number;
  /** Radius in arena radii: what the side has left, as a size. */
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
  /** Lives left, in the order of the cast. Nought means out. */
  lives: readonly number[];
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
  /** What it finished on. */
  best: number;
  /** Whether it took the ring, or was merely ahead when time ran out. */
  swept: boolean;
  duration: number;
  durationInFrames: number;
}

interface Live {
  x: number;
  y: number;
  vx: number;
  vy: number;
  lives: number;
  who: number;
  /** The line this ball is currently drawing: where it set off from. */
  fromX: number;
  fromY: number;
  fromAt: number;
  stoleAt: number;
  knockedAt: number;
}

/**
 * A ball's radius, from what its side is holding.
 *
 * The square root, so the area is the lives — and no floor under it, because
 * the size is not decoration. A ball cuts with its whole width, so a side that
 * is ahead sweeps a wider swath than a side that is behind, takes more lines
 * with every run, and gets wider still. That feedback is what finishes the war:
 * without it, lives are a symmetric walk between twelve sides and nobody is ever
 * knocked out inside the ceiling — measured over forty seeds, not one sweep.
 */
const sizeOf = (lives: number): number => FULL * Math.sqrt(Math.max(0.4, lives) / LIVES);

/**
 * Whether two segments cross.
 *
 * The usual sign-of-the-cross-product test on both pairs of ends. Touching
 * exactly counts as crossing, which matters only in the vanishing case where a
 * ball clips the very end of a line, and counting it is the answer that does
 * not depend on rounding.
 */
function crosses(
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number,
): boolean {
  const side = (px: number, py: number, qx: number, qy: number, rx: number, ry: number) =>
    Math.sign((qx - px) * (ry - py) - (qy - py) * (rx - px));
  const a = side(ax, ay, bx, by, cx, cy);
  const b = side(ax, ay, bx, by, dx, dy);
  const c = side(cx, cy, dx, dy, ax, ay);
  const d = side(cx, cy, dx, dy, bx, by);
  return a !== b && c !== d;
}

export function generateLine(seed: number): LineRound {
  const rng = createRng(seed ^ 0x6d2b79f5);
  const whistle = SHORTEST + rng.next() * (LONGEST - SHORTEST);
  const balls: Live[] = MONTHS.map((_, side) => {
    const angle = -Math.PI / 2 + (side / MONTHS.length) * Math.PI * 2;
    const heading = rng.next() * Math.PI * 2;
    return {
      x: Math.cos(angle) * OPENING_RING,
      y: Math.sin(angle) * OPENING_RING,
      vx: Math.cos(heading) * SPEED,
      vy: Math.sin(heading) * SPEED,
      lives: LIVES,
      who: side,
      fromX: Math.cos(angle) * OPENING_RING,
      fromY: Math.sin(angle) * OPENING_RING,
      fromAt: 0,
      stoleAt: -99,
      knockedAt: -99,
    };
  });

  const frames: LineFrame[] = [];
  const trails: Trail[] = [];
  const events: LineEvent[] = [];
  // What each side has on the board, newest last, as indices into `trails`.
  const mine: number[][] = MONTHS.map(() => []);
  const dt = 1 / (FPS * SUBSTEPS);

  let time = 0;
  let frame = 0;
  let decidedAt = -1;
  let winner = -1;
  let wonAt = 0;
  let swept = false;

  /** Close off the line a ball has been drawing and start a new one. */
  const layDown = (ball: Live): void => {
    if (Math.hypot(ball.x - ball.fromX, ball.y - ball.fromY) > 0.02) {
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

  const cap = Math.round((LONGEST + OUTRO + 1) * FPS);
  for (frame = 0; frame < cap; frame += 1) {
    const lives = MONTHS.map((_, side) => {
      const found = balls.find((b) => b.who === side);
      return found ? found.lives : 0;
    });
    frames.push({
      balls: balls.map((b) => ({ x: b.x, y: b.y, r: sizeOf(b.lives), who: b.who })),
      lives,
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

        const reach = 1 - sizeOf(ball.lives);
        const out = Math.hypot(ball.x, ball.y);
        if (out > reach) {
          const nx = ball.x / out;
          const ny = ball.y / out;
          const along = ball.vx * nx + ball.vy * ny;
          ball.vx -= 2 * along * nx;
          ball.vy -= 2 * along * ny;
          ball.x = nx * reach;
          ball.y = ny * reach;
          // A bounce ends the line it was drawing and starts another: a line is
          // a straight run, which is what makes the board readable as paths
          // rather than as one long scribble.
          layDown(ball);
          if (time - ball.knockedAt > 0.1) {
            ball.knockedAt = time;
            events.push({ t: time, kind: 'wall', month: ball.who });
          }
        }

        // The crossing test, against everybody else's board.
        if (time - ball.stoleAt < STEAL_GAP) continue;
        let cut = -1;
        let victim = -1;
        // The ball cuts with its width, not with its centre: three rays, one
        // down the middle and one along each flank.
        const ran = Math.hypot(ball.x - wasX, ball.y - wasY) || 1;
        const offX = (-(ball.y - wasY) / ran) * sizeOf(ball.lives) * 0.8;
        const offY = ((ball.x - wasX) / ran) * sizeOf(ball.lives) * 0.8;
        const rays: [number, number, number, number][] = [
          [wasX, wasY, ball.x, ball.y],
          [wasX + offX, wasY + offY, ball.x + offX, ball.y + offY],
          [wasX - offX, wasY - offY, ball.x - offX, ball.y - offY],
        ];
        for (let side = 0; side < MONTHS.length && cut < 0; side += 1) {
          if (side === ball.who) continue;
          for (const at of mine[side]) {
            const line = trails[at];
            if (line.to !== Infinity) continue;
            // Cheap rejection first: most of the board is nowhere near the ball.
            const wide = sizeOf(ball.lives);
            if (
              Math.min(line.x1, line.x2) > Math.max(wasX, ball.x) + wide ||
              Math.max(line.x1, line.x2) < Math.min(wasX, ball.x) - wide ||
              Math.min(line.y1, line.y2) > Math.max(wasY, ball.y) + wide ||
              Math.max(line.y1, line.y2) < Math.min(wasY, ball.y) - wide
            ) {
              continue;
            }
            if (rays.some((r) => crosses(r[0], r[1], r[2], r[3], line.x1, line.y1, line.x2, line.y2))) {
              cut = at;
              victim = side;
              break;
            }
          }
        }
        if (cut < 0) continue;

        // The cut: the line goes, a life goes with it, and the ball that did it
        // is a life better off. Nothing is created — the ninety-six lives the
        // ring opens with are the ninety-six it ends with.
        trails[cut].to = frame;
        mine[victim] = mine[victim].filter((at) => at !== cut);
        ball.stoleAt = time;
        
        events.push({ t: time, kind: 'cut', month: ball.who });
        const loser = balls.find((b) => b.who === victim);
        if (!loser) continue;
        const moved = Math.min(bite(time, whistle, loser.lives), loser.lives);
        ball.lives += moved;
        loser.lives -= moved;
        if (loser.lives <= 0) {
          // Out, and the board forgets it: its lines go with it, which is what
          // makes the ring get quieter as the field thins rather than louder.
          layDown(loser);
          for (const at of mine[victim]) trails[at].to = frame;
          mine[victim] = [];
          balls.splice(balls.indexOf(loser), 1);
          events.push({ t: time, kind: 'out', month: victim });
          if (balls.indexOf(ball) < i) i -= 1;
        }
      }

      const standing = balls.length;
      if (winner < 0 && standing <= 1) {
        winner = balls.length ? balls[0].who : 0;
        swept = true;
        wonAt = time;
      }
      if (winner < 0 && time >= whistle - OUTRO) {
        winner = balls.reduce((best, b) => (b.lives > best.lives ? b : best), balls[0]).who;
        wonAt = time;
      }
      // What follows a sweep is the winner alone in the ring, still drawing,
      // until the minute the mode promises has been cleared — a lap rather than
      // a freeze.
      if (winner >= 0 && time >= Math.max(wonAt, SHORTEST - OUTRO)) {
        decidedAt = frames.length;
        events.push({ t: time, kind: 'win', month: winner });
        break;
      }
    }
  }

  // Whatever is still being drawn when the video ends is drawn to where it got.
  for (const ball of balls) layDown(ball);
  for (const line of trails) if (line.to === Infinity) line.to = frames.length;

  const last = frames[frames.length - 1];
  return {
    seed,
    frames,
    trails,
    events,
    winner: winner >= 0 ? winner : 0,
    best: winner >= 0 ? last.lives[winner] : 0,
    swept,
    duration: frames.length / FPS,
    durationInFrames: frames.length,
  };
}
