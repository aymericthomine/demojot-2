/**
 * The round.
 *
 * Seven balls travel in straight lines inside a ring. Three rules, and they are
 * the whole game:
 *
 * 1. **The anchors never move.** The rim is divided into a fixed ring of
 *    anchor points, set before the first frame and unchanged to the last. Every
 *    anchor always holds a thread, so the *number* of threads in the arena is a
 *    constant — only who owns them changes.
 * 2. **Touch a thread and it becomes yours.** A ball that runs into somebody
 *    else's rope does not cut it: the thread changes hands, and changes colour,
 *    its rim end staying exactly where it was while its inner end swings across
 *    to the ball that took it. That is the whole economy — nothing is created,
 *    nothing is destroyed, it is all captured.
 * 3. **Threads are life.** A ball holding none is out. Its threads are not
 *    freed, because somebody already owns them.
 *
 * Balls also bounce off each other, which wrecks the plans of both and keeps a
 * duel from settling into a rhythm.
 *
 * Everyone starts with five, so the opening is precarious for everybody. The
 * round ends with one ball holding every thread in the ring, so the length of a
 * video is not a setting — it is how long the fight took.
 *
 * **The opening is identical in every video**: same seven balls, same colours,
 * same places, same five threads each, laid out as a cut pie. The seed decides
 * one thing only — which way each ball is fired. A billiard in a circle never
 * forgets its opening angle, so that one number per ball is enough to make every
 * fight diverge inside a second.
 *
 * Everything here is pure arithmetic on a seeded generator: same seed, same
 * fight, same file, on any machine.
 */

import { createRng } from './random';
import { BALL_RADIUS, COLORS, FPS, SPEED } from './style';

/** Physics substeps per rendered frame. Enough that a bounce lands cleanly. */
const SUBSTEPS = 4;

/** The fixed cast. Seven balls, these colours, in this order. */
export const BALL_COUNT = 7;

/** Threads everybody starts with. */
export const OPENING_THREADS = 5;

/**
 * Anchor points on the rim, fixed for the whole round.
 *
 * Every one of them holds a thread from the first frame to the last, so this is
 * also the total number of threads in the arena and it never changes. Seven
 * balls with five each divides the rim exactly, which is why the opening reads
 * as a cut pie with no gaps.
 */
export const ANCHORS = BALL_COUNT * OPENING_THREADS;

/** Where anchor `j` sits, so that ball `i` opens owning `j` in [5i, 5i+5). */
const anchorAngle = (j: number): number =>
  -Math.PI / 2 + (j - (OPENING_THREADS - 1) / 2) * ((Math.PI * 2) / ANCHORS);

/** How far from the centre the balls start — each one inside its own sector. */
const START_RADIUS = 0.45;

/**
 * No thread can be taken in the opening seconds.
 *
 * Seven balls with five threads each, all crowded into the middle, is a
 * massacre: without this most of the field is gone before anyone has been to the
 * wall twice, and the video is over before it has started. The truce gives
 * everybody time to earn some rope first.
 */
const GRACE = 0.5;

/** Seconds of victory lap once only one ball is left. */
const OUTRO = 2.4;

/** Nothing runs longer than this, whatever happens. */
const HARD_CAP = 600;

export interface Tuning {
  /** Arena radii per second. */
  speed: number;
  /**
   * How close to the ball that owns them a thread can still be cut, in arena
   * units. Threads converge on their owner, so at the hub they are packed closer
   * together than a ball is wide: without this, coming alongside somebody would
   * take their whole fan in one frame, which is not crossing threads — it is
   * standing on the knot they are tied in. A few ball-widths out they are
   * separate lines again and every one of them can be cut.
   */
  hubGuard: number;
  /**
   * How hard rope turns the ball that snapped it. Two would be a mirror, zero a
   * thread that gives way completely; this is well below a mirror — a bend, not
   * a bounce. Only the direction changes: speed is a constant of the style, so
   * the velocity is put back to length afterwards.
   *
   * It matters far more than its size suggests. At zero a ball crosses a fan of
   * twenty in one straight line and takes the lot, so the field is down to two
   * in four seconds and the fight is over in ten. Swept, not chosen: this is
   * where the rounds come out longest, the fans biggest and the wall busiest at
   * the same time.
   */
  threadBounce: number;
}

export const DEFAULT_TUNING: Tuning = {
  speed: SPEED,
  hubGuard: BALL_RADIUS * 3,
  threadBounce: 0.8,
};

export interface BallState {
  index: number;
  color: string;
  x: number;
  y: number;
  /** Rim angles where this ball's threads are pinned. */
  threads: readonly number[];
  alive: boolean;
  /** Counts up from 0 to 1 over the death animation. */
  fade: number;
}

export interface Frame {
  balls: BallState[];
}

export type EventKind = 'wall' | 'clash' | 'take' | 'death' | 'win';

export interface SimEvent {
  /** Seconds from the start. */
  t: number;
  kind: EventKind;
  /** Which ball made the sound. */
  ball: number;
  /** How many balls are still in, after the event. Drives the pitch rise. */
  alive: number;
}

export interface RoundSetup {
  seed: number;
  ballCount: number;
}

export interface Round {
  setup: RoundSetup;
  frames: Frame[];
  events: SimEvent[];
  /** Index of the winning ball. */
  winner: number;
  durationInFrames: number;
  duration: number;
}

interface Live {
  index: number;
  color: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  threads: number[];
  alive: boolean;
  fade: number;
  /** When this ball last bounced off another, so one contact is not counted twice. */
  clashedAt: number;
  /** Where it was at the start of this step. A thread is crossed, not sat on. */
  px: number;
  py: number;
}

/**
 * Do two segments cross, and how far along the second? Standard orientation
 * test; `t` is the crossing point's position along c→d, which is what says how
 * far from a thread's hub the ball went through it.
 */
function crossing(
  ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, dx: number, dy: number,
): number | null {
  const rx = bx - ax;
  const ry = by - ay;
  const sx = dx - cx;
  const sy = dy - cy;
  const denominator = rx * sy - ry * sx;
  if (denominator === 0) return null;
  const u = ((cx - ax) * ry - (cy - ay) * rx) / denominator;
  const t = ((cx - ax) * sy - (cy - ay) * sx) / denominator;
  if (t < 0 || t > 1 || u < 0 || u > 1) return null;
  return u;
}

export function setupFor(seed: number): RoundSetup {
  return { seed, ballCount: BALL_COUNT };
}

/** The opening, which is deliberately identical in every video. */
function start(setup: RoundSetup, tuning: Tuning): Live[] {
  const rng = createRng(setup.seed ^ 0x2545f491);
  const balls: Live[] = [];
  const slice = (Math.PI * 2) / BALL_COUNT;

  for (let i = 0; i < BALL_COUNT; i += 1) {
    const around = -Math.PI / 2 + i * slice;
    const x = Math.cos(around) * START_RADIUS;
    const y = Math.sin(around) * START_RADIUS;

    // Ball i opens holding anchors 5i to 5i+4, so the seven fans divide the rim
    // exactly and meet edge to edge. Nothing will be added to this ring and
    // nothing taken away — from here on the fight is only over who holds what.
    const threads: number[] = [];
    for (let k = 0; k < OPENING_THREADS; k += 1) {
      threads.push(anchorAngle(i * OPENING_THREADS + k));
    }

    // Fired inward, and not far off it. A billiard in a circle keeps its angle
    // of incidence for ever, so a ball sent off near the tangent spends the
    // whole video hugging the wall in a tiny rosette — the picture stops moving
    // and the fight stops happening.
    const heading = around + Math.PI + rng.range(-0.7, 0.7);

    balls.push({
      index: i,
      color: COLORS[i],
      x,
      y,
      vx: Math.cos(heading) * tuning.speed,
      vy: Math.sin(heading) * tuning.speed,
      threads,
      alive: true,
      fade: 0,
      clashedAt: -99,
      px: x,
      py: y,
    });
  }
  return balls;
}

function snapshot(balls: Live[]): Frame {
  return {
    balls: balls.map((ball) => ({
      index: ball.index,
      color: ball.color,
      x: ball.x,
      y: ball.y,
      // Shared until the list actually changes, so a frame costs a reference.
      threads: ball.threads,
      alive: ball.alive,
      fade: ball.fade,
    })),
  };
}

/** Runs one fight until the bell, or until only one ball is left. */
export function play(setup: RoundSetup, tuning: Tuning, bell: number): Round {
  const balls = start(setup, tuning);
  const frames: Frame[] = [];
  const events: SimEvent[] = [];

  const dt = 1 / (FPS * SUBSTEPS);
  const wall = 1 - BALL_RADIUS;
  const touching = (BALL_RADIUS * 2) ** 2;

  let time = 0;
  let endAt = Infinity;
  let winner = balls[0].index;
  const countAlive = () => balls.reduce((n, ball) => n + (ball.alive ? 1 : 0), 0);

  for (let frame = 0; ; frame += 1) {
    frames.push(snapshot(balls));
    if (time >= bell && endAt === Infinity) {
      // The bell. Whoever holds the most rope has won it.
      winner = balls
        .filter((b) => b.alive)
        .reduce((best, b) => (b.threads.length > best.threads.length ? b : best)).index;
      events.push({ t: time, kind: 'win', ball: winner, alive: countAlive() });
      endAt = time + OUTRO;
    }
    if (time >= endAt || time > HARD_CAP) break;

    for (let step = 0; step < SUBSTEPS; step += 1) {
      time += dt;

      for (const ball of balls) {
        if (!ball.alive) {
          // Beaten balls linger a moment so the elimination reads on screen.
          ball.fade = Math.min(1, ball.fade + dt * 3.5);
          continue;
        }

        ball.px = ball.x;
        ball.py = ball.y;
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        const distance = Math.hypot(ball.x, ball.y);
        if (distance > wall) {
          const nx = ball.x / distance;
          const ny = ball.y / distance;
          const dot = ball.vx * nx + ball.vy * ny;
          ball.vx -= 2 * dot * nx;
          ball.vy -= 2 * dot * ny;
          ball.x = nx * wall;
          ball.y = ny * wall;

          // The wall gives nothing. Threads are not earned here — every one of
          // them was on the rim before the first frame — so a bounce is only a
          // bounce, and a note.
          events.push({ t: time, kind: 'wall', ball: ball.index, alive: countAlive() });
        }
      }

      // Balls shove each other apart. There is no damage in it — it simply
      // wrecks both plans, which is what stops a duel settling into a rhythm.
      for (let i = 0; i < balls.length; i += 1) {
        const a = balls[i];
        if (!a.alive) continue;
        for (let j = i + 1; j < balls.length; j += 1) {
          const b = balls[j];
          if (!b.alive) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const gap = dx * dx + dy * dy;
          if (gap > touching || gap === 0) continue;

          const distance = Math.sqrt(gap);
          const nx = dx / distance;
          const ny = dy / distance;
          const closing = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (closing < 0) {
            // Equal masses, head-on: they simply trade the part of their speed
            // that lies along the line between them.
            a.vx += closing * nx;
            a.vy += closing * ny;
            b.vx -= closing * nx;
            b.vy -= closing * ny;
          }
          // Push them apart so they cannot stick together.
          const overlap = (BALL_RADIUS * 2 - distance) / 2 + 1e-4;
          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;

          if (time - a.clashedAt > 0.08) {
            a.clashedAt = time;
            events.push({ t: time, kind: 'clash', ball: a.index, alive: countAlive() });
          }
          b.clashedAt = time;
        }
      }

      if (time < GRACE) continue;

      // Touch a thread and it is yours. Everything the ball's disc is touching
      // changes hands this frame — no timer, no one-at-a-time — and the rim end
      // does not move an inch: the thread keeps its anchor and swaps its colour
      // and its hub. Anything less leaves rope running through the middle of a
      // ball untouched, which is the first thing anybody notices.
      for (const ball of balls) {
        if (!ball.alive) continue;

        for (const other of balls) {
          if (other === ball || !other.alive) continue;

          const kept: number[] = [];
          const taken: number[] = [];
          let hitAngle = 0;
          for (const angle of other.threads) {
            const rimX = Math.cos(angle);
            const rimY = Math.sin(angle);
            // A thread is taken by being *crossed*, not by being sat on: the
            // step the ball just travelled has to pass through the line. Testing
            // overlap instead lets two balls that have come to rest against each
            // other's rope swap the same threads back and forth for ever, which
            // is exactly what stopped a round from ever finishing.
            const where = crossing(
              ball.px,
              ball.py,
              ball.x,
              ball.y,
              other.x,
              other.y,
              rimX,
              rimY,
            );
            const fromHub =
              where === null ? 0 : where * Math.hypot(rimX - other.x, rimY - other.y);
            if (where !== null && fromHub > tuning.hubGuard) {
              taken.push(angle);
              hitAngle = angle;
              continue;
            }
            kept.push(angle);
          }
          if (taken.length === 0) continue;

          other.threads = kept;
          ball.threads = [...ball.threads, ...taken];

          if (tuning.threadBounce > 0) {
            // Rope turns the ball that ran into it.
            const tx = Math.cos(hitAngle) - other.x;
            const ty = Math.sin(hitAngle) - other.y;
            const length = Math.hypot(tx, ty);
            if (length > 0) {
              const nx = -ty / length;
              const ny = tx / length;
              const dot = ball.vx * nx + ball.vy * ny;
              ball.vx -= tuning.threadBounce * dot * nx;
              ball.vy -= tuning.threadBounce * dot * ny;
              // A partial reflection is not a reflection: it takes speed out as
              // well as turning, and after fifty threads the ball is crawling.
              // Speed is a constant of the style, so only the direction changes.
              const moving = Math.hypot(ball.vx, ball.vy);
              if (moving > 0) {
                ball.vx = (ball.vx / moving) * tuning.speed;
                ball.vy = (ball.vy / moving) * tuning.speed;
              }
            }
          }

          // One tick per thread, so running through a fan rattles.
          for (let k = 0; k < taken.length; k += 1) {
            events.push({ t: time, kind: 'take', ball: ball.index, alive: countAlive() });
          }

          // Holding nothing is being out. There is no fan to clear away — the
          // threads that were its are somebody else's now, still on their
          // anchors.
          if (other.threads.length === 0) {
            other.alive = false;
            const remaining = countAlive();
            events.push({ t: time, kind: 'death', ball: other.index, alive: remaining });
            if (remaining <= 1) {
              winner = balls.find((b) => b.alive)?.index ?? other.index;
              events.push({ t: time, kind: 'win', ball: winner, alive: 1 });
              endAt = Math.min(endAt, time + OUTRO);
            }
          }
        }
      }
    }
  }

  return {
    setup,
    frames,
    events,
    winner,
    durationInFrames: frames.length,
    duration: frames.length / FPS,
  };
}

/**
 * How long a video runs.
 *
 * The economy here conserves: nothing is created and nothing destroyed, only
 * captured, so there is no drift towards a winner — two balls left trade the
 * same rope back and forth and the count wanders. Played to the last thread a
 * round takes a minute and a half at best and ten minutes at worst, and the
 * reference itself needs ninety-six seconds. So the round is played to a bell
 * instead, and whoever holds the most rope when it goes has won it. A ball wiped
 * out before then is still out, exactly as it would be.
 *
 * Most videos want to be the length people actually watch — a little over half a
 * minute. A video past a minute is what monetisation asks for, so one seed in
 * four aims there instead. Which band a seed takes, and where in it, are both
 * part of the seed, so a seed always gives the same video.
 */
export const SHORT = { min: 28, max: 42 };
export const LONG = { min: 58, max: 95 };

/** One seed in four is a long one. */
export const aimsLong = (seed: number): boolean => createRng(seed ^ 0x1b873593).next() < 0.25;

/**
 * Rounds are found, not designed: the seed is played out, and if the fight was
 * over in eight seconds or still going at ninety, the same seed fires the balls
 * off in different directions and plays again. Deterministic, so a seed always
 * lands on the same round — and the lengths that come out follow the fights
 * rather than a number somebody typed.
 */
export function generateRound(seed: number, tuning: Tuning = DEFAULT_TUNING): Round {
  const target = aimsLong(seed) ? LONG : SHORT;
  const bell = createRng(seed ^ 0x27d4eb2f).range(target.min, target.max);
  return play(setupFor(seed), tuning, bell);
}
