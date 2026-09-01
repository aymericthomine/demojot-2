/**
 * Line war.
 *
 * Twelve balls in the ring, and sixty threads pinned to it. Every thread runs
 * from a fixed point on the rim to the ball that owns it, so each side wears a
 * fan that swings as its ball moves, and the whole game is one rule:
 *
 * > **Run through somebody else's thread and it comes away with you.**
 *
 * A thread that changes hands keeps its pin and swaps its owner, so the fan it
 * belonged to loses a line and the fan that took it gains one. Nothing is
 * created and nothing is destroyed: the sixty threads the ring opens with are
 * the sixty it ends with, and the video is those sixty changing hands.
 *
 * **The score is the count of threads**, which is what the counter along the
 * top shows and therefore what has to decide the round: a video whose numbers
 * say one thing and whose winner is another side is a broken video. Time spent
 * holding is kept underneath as the tie-break, so two sides finishing level on
 * twelve threads are separated by which of them held its twelve for longer
 * rather than by which comes first in the cast.
 *
 * **A side stripped of everything is out** — but not straight away, and not
 * early. A ball needs only to run through one enemy fan to be back in it, so a
 * side on nothing is given a few seconds to do exactly that, and nobody may go
 * out at all until the round is a good way in. Without both of those the war is
 * over before it is a war: at the eighth second of the first cut, six of the
 * twelve were already gone and the ring played out the remaining minute with
 * half a cast.
 *
 * This replaced a version where the lines were the balls' own trails and the
 * score was how many of them were still on the board. It was a different game
 * from the reference's and it did not work: the board either filled with felt or
 * was cut back to nothing in the first two seconds, depending on one dial.
 */

import { MONTHS } from './months';
import { createRng } from './random';
import { FPS } from './style';

/** Physics substeps per rendered frame. */
const SUBSTEPS = 4;

/** How fast a ball travels, in arena radii a second. */
const SPEED = 0.72;

/** A ball's radius, in arena radii. */
const BALL = 0.05;

/** Threads each side is pinned with, and therefore the pins on the rim. */
const EACH = 5;
export const ANCHORS = MONTHS.length * EACH;

/** What a thread is worth, a second at a time, to the tie-break. */
const PER_SECOND = 1;

/**
 * How far a ball has to be from a pin before it can take the thread on it.
 *
 * Every thread ends at the rim, and a ball that is *at* the rim sits inside the
 * thin end of every fan pinned near it — so without this a ball bouncing along
 * the wall harvests the neighbourhood on every substep. In arena radii from the
 * pin.
 */
const PIN_GUARD = 0.16;

/**
 * How long the ring is closed before anybody can leave it, and how long a side
 * that has been stripped is given to take something back.
 *
 * Both are the same fix for the same thing: a fan is stripped in a couple of
 * seconds by a ball that runs the length of it, and the side it belonged to
 * only has to cross one enemy thread to be back in the game. With neither of
 * them, six of the twelve were gone by the eighth second; with four seconds of
 * grace, nobody was ever knocked out at all — a stripped side always found
 * something to take. At a second and a half the ring keeps all twelve through
 * the first third of the video and thins to about eight by the end, which is
 * four knockouts spread over the half of the round where they mean something.
 */
const SAFE = 20;
const GRACE = 1.6;

/** Where the twelve start, as a fraction of the arena. */
const OPENING_RING = 0.55;

/** Seconds of winner held at the end. */
const OUTRO = 2.5;

/**
 * The floor and the ceiling the video is kept between, and the whistle the seed
 * picks between them.
 *
 * The war usually runs the whole way and is decided on the counter. A side can
 * be stripped of everything and leave, and if only one is left the winner keeps
 * playing until the minute has been cleared rather than the video being cut
 * short.
 */
const SHORTEST = 60;
const LONGEST = 78;

export interface LineBall {
  x: number;
  y: number;
  r: number;
  who: number;
}

export interface LineFrame {
  balls: readonly LineBall[];
  /** Who holds each pin, by anchor index. */
  threads: readonly number[];
  /** Nought while the war is on, one from the moment it is decided. */
  reveal: number;
}

export type LineEventKind = 'wall' | 'take' | 'clash' | 'out' | 'win';

export interface LineEvent {
  t: number;
  kind: LineEventKind;
  month: number;
}

export interface LineRound {
  seed: number;
  frames: LineFrame[];
  events: LineEvent[];
  winner: number;
  /** Threads it finished holding, which is what it finished on. */
  best: number;
  /** The same number, under the name the page's other modes use. */
  held: number;
  /** Whether it was the last side standing. */
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
  knockedAt: number;
  /** When it last ran out of threads, or -1 if it is holding some. */
  strippedAt: number;
}

/**
 * Where every pin sits on the rim, worked out once.
 *
 * The take test asks for these sixty positions twelve times a substep and four
 * times a frame — a quarter of a million times a video — and working them out
 * each time with two trigonometric calls was most of what the round cost.
 */
const PINS: readonly { x: number; y: number }[] = Array.from({ length: ANCHORS }, (_, pin) => {
  const angle = -Math.PI / 2 + (pin / ANCHORS) * Math.PI * 2;
  return { x: Math.cos(angle), y: Math.sin(angle) };
});

/** Where a pin sits on the rim. */
export const pinAt = (anchor: number): { x: number; y: number } => PINS[anchor];

/** Whether two segments cross: the sign test on both pairs of ends. */
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
  return (
    side(ax, ay, bx, by, cx, cy) !== side(ax, ay, bx, by, dx, dy) &&
    side(cx, cy, dx, dy, ax, ay) !== side(cx, cy, dx, dy, bx, by)
  );
}

export function generateLine(seed: number): LineRound {
  const rng = createRng(seed ^ 0x6d2b79f5);
  const whistle = SHORTEST + rng.next() * (LONGEST - SHORTEST);

  // The opening: each side's five pins are together on the rim and its ball
  // stands in front of them, so the first frame is twelve fans and not one
  // thread crossing another.
  const owner = new Array<number>(ANCHORS);
  for (let pin = 0; pin < ANCHORS; pin += 1) owner[pin] = Math.floor(pin / EACH);

  const balls: Live[] = MONTHS.map((_, side) => {
    const angle = -Math.PI / 2 + ((side + 0.5) / MONTHS.length) * Math.PI * 2;
    const heading = rng.next() * Math.PI * 2;
    return {
      x: Math.cos(angle) * OPENING_RING,
      y: Math.sin(angle) * OPENING_RING,
      vx: Math.cos(heading) * SPEED,
      vy: Math.sin(heading) * SPEED,
      who: side,
      knockedAt: -99,
      strippedAt: -1,
    };
  });

  const frames: LineFrame[] = [];
  const events: LineEvent[] = [];
  const score = new Array<number>(MONTHS.length).fill(0);
  const dt = 1 / (FPS * SUBSTEPS);

  let time = 0;
  let decidedAt = -1;
  let winner = -1;
  let wonAt = 0;
  let swept = false;

  const countOf = (side: number): number => owner.filter((who) => who === side).length;

  /** The ball each side still has in the ring, by side, or nothing. */
  const standing: (Live | undefined)[] = MONTHS.map((_, side) => balls.find((b) => b.who === side));

  const cap = Math.round((LONGEST + OUTRO + 1) * FPS);
  for (let frame = 0; frame < cap; frame += 1) {
    frames.push({
      balls: balls.map((b) => ({ x: b.x, y: b.y, r: BALL, who: b.who })),
      threads: owner.slice(),
      reveal: decidedAt >= 0 ? Math.min(1, (frame - decidedAt) / (FPS * OUTRO)) : 0,
    });
    if (decidedAt >= 0 && frame >= decidedAt + Math.round(OUTRO * FPS)) break;
    if (decidedAt >= 0) continue;

    for (let step = 0; step < SUBSTEPS; step += 1) {
      time += dt;

      // The tie-break is time held, so it is banked before anything has a
      // chance to change hands this substep.
      for (let pin = 0; pin < ANCHORS; pin += 1) score[owner[pin]] += PER_SECOND * dt;

      for (const ball of balls) {
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
          if (time - ball.knockedAt > 0.1) {
            ball.knockedAt = time;
            events.push({ t: time, kind: 'wall', month: ball.who });
          }
        }

        // Every thread the ball ran through comes away with it — all of them and
        // not the first one found: a ball crossing a fan takes the fan, which is
        // the thing the reference does that a rule about single lines cannot.
        for (let pin = 0; pin < ANCHORS; pin += 1) {
          const holder = owner[pin];
          if (holder === ball.who) continue;
          const held = standing[holder];
          if (!held) continue;
          const foot = PINS[pin];
          if (Math.hypot(ball.x - foot.x, ball.y - foot.y) < PIN_GUARD) continue;
          if (!crosses(wasX, wasY, ball.x, ball.y, foot.x, foot.y, held.x, held.y)) continue;
          owner[pin] = ball.who;
          events.push({ t: time, kind: 'take', month: ball.who });
        }
      }

      // Two balls meeting trade the part of their speed that lies along the line
      // between them: the ring neither gains nor loses pace.
      for (let i = 0; i < balls.length; i += 1) {
        for (let j = i + 1; j < balls.length; j += 1) {
          const a = balls[i];
          const b = balls[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const gap = Math.hypot(dx, dy);
          if (gap >= BALL * 2 || gap === 0) continue;
          const nx = dx / gap;
          const ny = dy / gap;
          const push = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          if (push > 0) {
            a.vx -= push * nx;
            a.vy -= push * ny;
            b.vx += push * nx;
            b.vy += push * ny;
            events.push({ t: time, kind: 'clash', month: a.who });
          }
          const overlap = (BALL * 2 - gap) / 2;
          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;
        }
      }

      // A side stripped of everything leaves the ring, once it has had its few
      // seconds to take something back and once the ring is open.
      for (let i = balls.length - 1; i >= 0; i -= 1) {
        const ball = balls[i];
        if (countOf(ball.who) > 0) {
          ball.strippedAt = -1;
          continue;
        }
        if (ball.strippedAt < 0) ball.strippedAt = time;
        if (time < SAFE || time - ball.strippedAt < GRACE) continue;
        events.push({ t: time, kind: 'out', month: ball.who });
        standing[ball.who] = undefined;
        balls.splice(i, 1);
      }

      if (winner < 0 && balls.length <= 1) {
        winner = balls.length ? balls[0].who : 0;
        swept = true;
        wonAt = time;
      }
      if (winner < 0 && time >= whistle - OUTRO) {
        // Threads decide it, and time held only breaks a tie: the counter on
        // screen is the count of threads, so the side the video says is winning
        // has to be the side that wins.
        winner = 0;
        for (let side = 1; side < MONTHS.length; side += 1) {
          const mine = countOf(side);
          const best = countOf(winner);
          if (mine > best || (mine === best && score[side] > score[winner])) winner = side;
        }
        wonAt = time;
      }
      if (winner >= 0 && time >= Math.max(wonAt, SHORTEST - OUTRO)) {
        decidedAt = frames.length;
        events.push({ t: time, kind: 'win', month: winner });
        break;
      }
    }
  }

  const last = frames[frames.length - 1];
  const held = winner >= 0 ? last.threads.filter((who) => who === winner).length : 0;
  return {
    seed,
    frames,
    events,
    winner: winner >= 0 ? winner : 0,
    best: held,
    held,
    swept,
    duration: frames.length / FPS,
    durationInFrames: frames.length,
  };
}
