/**
 * The round.
 *
 * Seven balls travel in straight lines inside a ring. Four rules, and they are
 * the whole game:
 *
 * 1. **Touching the wall leaves a thread there**, pinned where the ball struck.
 *    A thread once laid never moves and never fades, so a ball that keeps
 *    working the wall keeps growing its fan.
 * 2. **Running through somebody else's thread destroys it** — one thread, not
 *    the fan. That is how balls take from each other.
 * 3. **Threads are life.** A ball with none left is out, and its fan goes with
 *    it, which gives the survivors room again.
 * 4. **Balls bounce off each other.** No damage in it; it just wrecks the plans
 *    of both, and it is what keeps a duel from settling into a rhythm.
 *
 * Everyone starts with five, so the opening is precarious for everybody. The
 * round ends with one ball left standing, so the length of a video is not a
 * setting — it is how long the fight took.
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
import { BALL_RADIUS, COLORS, FPS, SPEED, THREAD_WIDTH } from './style';

/** Physics substeps per rendered frame. Enough that a bounce lands cleanly. */
const SUBSTEPS = 4;

/** The fixed cast. Seven balls, these colours, in this order. */
export const BALL_COUNT = 7;

/** Threads everybody starts with. */
export const OPENING_THREADS = 5;

/** How far from the centre the balls start. */
const START_RADIUS = 0.3;

/** Nobody can lose a thread in the first moments, whatever the opening looks like. */
const GRACE = 0.5;

/** Seconds of victory lap once only one ball is left. */
const OUTRO = 2.4;

/** Nothing runs longer than this, whatever happens. */
const HARD_CAP = 110;

export interface Tuning {
  /** Arena radii per second. */
  speed: number;
  /**
   * How far along a thread, measured from the ball that owns it, it can be cut.
   * Threads converge on their owner, so without this a ball that merely came
   * near another would take the whole fan at once.
   */
  hubGuard: number;
  /**
   * Seconds before the same attacker can take another thread from the same
   * victim, with a full field. Threads are only replaced by working the wall, so
   * this is the clock the fight runs on — and with it, how long a video lasts.
   *
   * It shortens as balls are knocked out. Two survivors left alone at the
   * opening rate simply feed off the wall faster than they can hurt each other
   * and the fight never ends; tightening it as the field thins makes the endgame
   * quick and decisive, which is also how it should feel.
   */
  pairCooldown: number;
  /**
   * Seconds of respite a ball gets after losing a thread, whoever took it.
   *
   * Without this, being outnumbered is fatal in seconds — six attackers on a
   * per-pair clock can take threads six times faster than the wall pays them
   * back, so no fan ever grows and the arena looks bare. Capping the *victim's*
   * losses keeps the picture full: fans grow while a ball is left alone, and
   * shrink under sustained attention rather than instantly.
   */
  victimCooldown: number;
  /**
   * How close a ball must come to a thread to cut it, as a fraction of its drawn
   * radius. Under 1: clipping a line by a hair should not count.
   */
  hitRadius: number;
}

export const DEFAULT_TUNING: Tuning = {
  speed: SPEED,
  hubGuard: 0.3,
  pairCooldown: 1.3,
  victimCooldown: 0.8,
  hitRadius: 0.35,
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

export type EventKind = 'wall' | 'clash' | 'cut' | 'death' | 'win';

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
  /** When each other ball last took a thread from this one, indexed by attacker. */
  hitBy: Float64Array;
  /** When this ball last lost a thread to anybody. */
  lostAt: number;
  /** When this ball last bounced off another, so one contact is not counted twice. */
  clashedAt: number;
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

/** The opening, which is deliberately identical in every video. */
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
      threads.push(around + ((k + 0.5) / OPENING_THREADS - 0.5) * slice * 0.85);
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
      hitBy: new Float64Array(BALL_COUNT).fill(-99),
      lostAt: -99,
      clashedAt: -99,
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
  const touching = (BALL_RADIUS * 2) ** 2;

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

          // Reaching the wall is how rope is earned, and it stays where it was
          // pinned. Working the wall is therefore the only way back from a bad
          // start — and it is also the most exposed thing a ball can do.
          ball.threads = [...ball.threads, Math.atan2(ny, nx)];
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

      // Both clocks tighten as the field thins. A crowded arena should let fans
      // grow — that is the picture people came for — while the last two need to
      // settle it rather than feed off the wall for ever.
      const alive = countAlive();
      const pace = Math.max(0.12, ((alive - 1) / (BALL_COUNT - 1)) ** 1.6);
      const cooldown = tuning.pairCooldown * pace;
      const respite = tuning.victimCooldown * pace;

      // Who took what. Resolved after everyone has moved, so the order the balls
      // were created in cannot decide who cuts whom.
      for (const ball of balls) {
        if (!ball.alive) continue;

        let victim: Live | null = null;
        let victimThread = -1;

        for (const other of balls) {
          if (other === ball || !other.alive) continue;
          if (time - other.lostAt < respite) continue;
          if (time - other.hitBy[ball.index] < cooldown) continue;

          for (let k = 0; k < other.threads.length; k += 1) {
            const angle = other.threads[k];
            const hit = closestOnSegment(
              ball.x,
              ball.y,
              other.x,
              other.y,
              Math.cos(angle),
              Math.sin(angle),
            );
            if (hit.distanceSq < reach && hit.t > tuning.hubGuard) {
              victim = other;
              victimThread = k;
              break;
            }
          }
          if (victim) break;
        }

        if (victim && victimThread >= 0) {
          victim.hitBy[ball.index] = time;
          victim.lostAt = time;
          victim.threads = victim.threads.filter((_, k) => k !== victimThread);
          events.push({ t: time, kind: 'cut', ball: ball.index, alive: countAlive() });

          if (victim.threads.length === 0) {
            victim.alive = false;
            const remaining = countAlive();
            events.push({ t: time, kind: 'death', ball: victim.index, alive: remaining });
            if (remaining <= 1) {
              winner = balls.find((b) => b.alive)?.index ?? victim.index;
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
 * How long a video should run.
 *
 * Most want to be the length people actually watch — a little over half a
 * minute. But a video past a minute is what monetisation asks for, so one seed
 * in four aims there instead, and comes out a longer fight rather than the same
 * fight padded. Which band a seed aims for is part of the seed, so it never
 * changes under you.
 */
export const SHORT = { min: 28, max: 42 };
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
  // found: a minute of build-up is the point of those.
  if (long && longest && longest.duration >= ALLOWED.min) return longest;
  // Otherwise whichever came nearest the band — better a fight a few seconds
  // short than one padded to length.
  return closest as Round;
}
