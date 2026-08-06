/**
 * The round.
 *
 * Seven balls travel in straight lines inside a circle, bouncing off the wall,
 * and each of them keeps laying threads from itself to the rim. A thread once
 * laid is never taken back, so the arena fills up: what starts as seven neat
 * fans becomes a thicket.
 *
 * That is the whole danger. **A ball that touches somebody else's thread is
 * out**, and its own threads go with it. Early on the place is crowded and balls
 * fall quickly; later there is room again, and the last two spend a long time
 * weaving through each other's fans. The round ends with one ball left standing,
 * so the length of a video is not a setting — it is how long the fight took.
 *
 * Two details are worth knowing:
 *
 * - **A thread is earned by bouncing**, and left where the ball struck. That is
 *   the rate the reference grows at — a fan gaining a thread every couple of
 *   seconds — and it is self-limiting in a way a clock is not: rope is only paid
 *   out for crossing the arena, which is exactly when a ball is exposed.
 * - **The opening is always the same.** Same seven balls, same colours, same
 *   places, same starting fans — only the directions they are fired in come from
 *   the seed. Every video therefore opens on the same picture and diverges
 *   immediately.
 *
 * Everything here is pure arithmetic on a seeded generator: same seed, same
 * fight, same file, on any machine.
 */

import { createRng } from './random';
import { BALL_RADIUS, COLORS, FPS, SPEED, THREAD_WIDTH } from './style';

/** Physics substeps per rendered frame. Enough that a bounce lands cleanly. */
const SUBSTEPS = 4;

/** The fixed cast. Seven balls, these colours, in this order. */
export const BALL_COUNT = 7;

/** How far from the centre the balls start. */
const START_RADIUS = 0.3;

/** Threads each ball opens with, fanned across its own slice of the circle. */
const OPENING_THREADS = 12;

/** Nobody can be knocked out in the first moments, whatever the opening looks like. */
const GRACE = 0.6;

/** Seconds of victory lap once only one ball is left. */
const OUTRO = 2.4;

/** Nothing runs longer than this, whatever happens. */
const HARD_CAP = 110;

export interface Tuning {
  /** Arena radii per second. */
  speed: number;
  /**
   * How far along a thread, measured from the ball that owns it, it starts being
   * lethal. Threads converge on their owner, so without this a ball that merely
   * came near another would be killed by the bundle at the hub rather than by
   * anything you could see coming.
   */
  hubGuard: number;
  /**
   * A thread every this many bounces. Threads are never taken away, so this is
   * the rate the arena silts up, and with it how long a fight can last.
   */
  pinEvery: number;
  /**
   * How close a ball has to come to a thread to be caught, as a fraction of its
   * drawn radius. Well under 1: a ball that clips a line by a hair should slip
   * through, or the whole thing is over in ten seconds. This is the dial that
   * sets how long a fight lasts.
   */
  hitRadius: number;
}

export const DEFAULT_TUNING: Tuning = {
  speed: SPEED,
  hubGuard: 0.5,
  pinEvery: 1,
  hitRadius: 0.12,
};

export interface BallState {
  index: number;
  color: string;
  x: number;
  y: number;
  /** Rim angles where this ball's threads are pinned. Only ever grows. */
  threads: readonly number[];
  alive: boolean;
  /** Counts up from 0 to 1 over the death animation. */
  fade: number;
}

export interface Frame {
  balls: BallState[];
}

export type EventKind = 'bounce' | 'death' | 'win';

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
  /** Which re-deal of this seed produced the round — see `generateRound`. */
  attempt: number;
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
  bounces: number;
}

/** Closest point on a segment: how far away, and how far along. */
function closestOnSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): { distanceSq: number; t: number } {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const t = lengthSq > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq)) : 0;
  const cx = ax + dx * t;
  const cy = ay + dy * t;
  return { distanceSq: (px - cx) ** 2 + (py - cy) ** 2, t };
}

export function setupFor(seed: number, attempt = 0): RoundSetup {
  return { seed, attempt, ballCount: BALL_COUNT };
}

/**
 * The opening, which is deliberately identical in every video: seven balls in a
 * ring, each fanned out across its own slice of the circle, like a cut pie. Only
 * the direction each one is fired in comes from the seed — and since a billiard
 * in a circle never forgets its opening angle, that one number per ball is
 * enough to make every fight different from the first second.
 */
function start(setup: RoundSetup, tuning: Tuning): Live[] {
  const rng = createRng(setup.seed ^ 0x2545f491 ^ Math.imul(setup.attempt + 1, 0x85ebca6b));
  const balls: Live[] = [];
  const slice = (Math.PI * 2) / BALL_COUNT;

  for (let i = 0; i < BALL_COUNT; i += 1) {
    const around = -Math.PI / 2 + i * slice;
    const x = Math.cos(around) * START_RADIUS;
    const y = Math.sin(around) * START_RADIUS;

    const threads: number[] = [];
    for (let k = 0; k < OPENING_THREADS; k += 1) {
      threads.push(around + ((k + 0.5) / OPENING_THREADS - 0.5) * slice * 0.92);
    }

    // Fired inward, and not far off it. A billiard in a circle keeps its angle
    // of incidence for ever, so a ball sent off near the tangent spends the
    // whole video hugging the wall in a tiny rosette — the picture stops moving
    // and the fight stops happening. Aiming across the middle keeps the chords
    // long and the balls travelling.
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
      bounces: 0,
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

/** Runs one fight to the end. */
function play(setup: RoundSetup, tuning: Tuning): Round {
  const balls = start(setup, tuning);
  const frames: Frame[] = [];
  const events: SimEvent[] = [];

  const dt = 1 / (FPS * SUBSTEPS);
  const wall = 1 - BALL_RADIUS;
  const reach = (BALL_RADIUS * tuning.hitRadius + THREAD_WIDTH / 2) ** 2;

  let time = 0;
  let endAt = Infinity;
  let winner = balls[0].index;
  const countAlive = () => balls.reduce((n, ball) => n + (ball.alive ? 1 : 0), 0);

  for (let frame = 0; ; frame += 1) {
    frames.push(snapshot(balls));
    if (time >= endAt || time > HARD_CAP) break;

    for (let step = 0; step < SUBSTEPS; step += 1) {
      time += dt;

      for (const ball of balls) {
        if (!ball.alive) {
          // Beaten balls linger a moment so the elimination reads on screen.
          ball.fade = Math.min(1, ball.fade + dt * 3.5);
          continue;
        }

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

          // A thread is left where the ball struck, and stays there for good.
          // Earning rope by crossing the arena is self-limiting in a way a clock
          // is not: a ball is only paid when it is exposed.
          ball.bounces += 1;
          if (ball.bounces % tuning.pinEvery === 0) {
            ball.threads = [...ball.threads, Math.atan2(ny, nx)];
          }
          events.push({ t: time, kind: 'bounce', ball: ball.index, alive: countAlive() });
        }
      }

      if (time < GRACE) continue;

      // Who ran into what. Resolved after everyone has moved, so the order the
      // balls were created in cannot decide who dies.
      const doomed: Live[] = [];
      for (const ball of balls) {
        if (!ball.alive) continue;
        for (const other of balls) {
          if (other === ball || !other.alive) continue;
          let caught = false;
          for (const angle of other.threads) {
            const hit = closestOnSegment(
              ball.x,
              ball.y,
              other.x,
              other.y,
              Math.cos(angle),
              Math.sin(angle),
            );
            if (hit.distanceSq < reach && hit.t > tuning.hubGuard) {
              caught = true;
              break;
            }
          }
          if (caught) {
            doomed.push(ball);
            break;
          }
        }
      }

      for (const ball of doomed) {
        ball.alive = false;
        // A dead ball's threads go with it, which is what gives the survivors
        // room to move again.
        ball.threads = [];
        const remaining = countAlive();
        events.push({ t: time, kind: 'death', ball: ball.index, alive: remaining });
        if (remaining <= 1) {
          winner = balls.find((b) => b.alive)?.index ?? ball.index;
          events.push({ t: time, kind: 'win', ball: winner, alive: 1 });
          endAt = Math.min(endAt, time + OUTRO);
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
 * How long a video should run.
 *
 * Most want to be the length people actually watch — a little over half a
 * minute. But a video past a minute is what monetisation asks for, so one seed
 * in four aims there instead, and comes out a longer fight rather than the same
 * fight padded. Which band a seed aims for is part of the seed, so it never
 * changes under you.
 *
 * The wider band is the safety net: some openings simply refuse to resolve
 * anywhere near the target, and a fight that lands in `ALLOWED` is better than
 * one forced.
 */
export const SHORT = { min: 27, max: 50 };
export const LONG = { min: 58, max: 95 };
export const ALLOWED = { min: 24, max: 95 };

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
  const long = aimsLong(seed);
  const target = long ? LONG : SHORT;
  let closest: Round | null = null;
  let longest: Round | null = null;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const round = play(setupFor(seed, attempt), tuning);
    if (round.duration >= target.min && round.duration <= target.max) return round;
    if (!longest || round.duration > longest.duration) longest = round;
    const aim = (target.min + target.max) / 2;
    if (!closest || Math.abs(round.duration - aim) < Math.abs(closest.duration - aim)) {
      closest = round;
    }
  }

  // A seed that wanted a long fight and never got one takes the longest it
  // found: a minute of build-up is the point of those, and second best is
  // better than dropping back to half a minute.
  if (long && longest && longest.duration >= ALLOWED.min) return longest;
  // Nothing landed in the band, so take whichever fight came nearest to it —
  // better a fight that is a few seconds short than one padded to length.
  return closest as Round;
}
