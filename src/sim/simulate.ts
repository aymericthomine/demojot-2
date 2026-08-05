/**
 * The round.
 *
 * Balls travel in straight lines inside a circle at a fixed speed, and each one
 * trails a fan of threads pinned to the wall behind it.
 *
 * **How the fan is made matters, and it is not obvious.** Pinning a thread at
 * each bounce cannot produce the picture: a billiard in a circle keeps its angle
 * of incidence for ever, so its bounce points step around the rim by a fixed
 * angle, and the last twenty of them are either scattered all the way round or —
 * if the step is small enough to look like a fan — belong to a ball glued to the
 * wall. Neither is what the reference shows. So a thread is pinned on a clock
 * instead, at the point of the wall straight out from the ball, which sweeps
 * smoothly as the ball crosses the arena. That gives the evenly spaced,
 * contiguous, searchlight-shaped fan, with the ball anywhere it likes.
 *
 * The fan is a *trail*: a ball keeps exactly as many threads as it has life, and
 * each new pin pushes out the oldest. So the length of the fan is the health
 * bar, visible at a glance from across the room.
 *
 * One rule then decides everything: **crossing somebody else's thread cuts it**,
 * costing them a thread they never get back. A ball at zero is out, the round
 * ends when one is left standing, and the length of a video is therefore not a
 * setting — it is the result of the fight, and so of the seed.
 *
 * Everything here is pure arithmetic on a seeded generator: same seed, same
 * fight, same file, on any machine.
 */

import { createRng, type Rng } from './random';
import { BALL_RADIUS, COLORS, FPS, SPEED, THREAD_WIDTH } from './style';

/** Physics substeps per rendered frame. Enough that a bounce lands cleanly. */
const SUBSTEPS = 4;

export interface Tuning {
  /** Arena radii per second. */
  speed: number;
  /**
   * Radians the anchor point must sweep before another thread is pinned.
   *
   * Pinning on a clock would make a fan's width depend on how fast the ball
   * happens to be crossing the middle — wide smears near the centre, tight
   * bundles near the wall. Pinning by angle instead makes every fan exactly
   * `life × pinStep` wide, always evenly spaced, whatever the ball is doing.
   * That single change is what turns a web of lines into the reference's clean
   * searchlight beams.
   */
  pinStep: number;
  /**
   * Seconds before the same attacker may cut the same ball again. This is the
   * clock the whole fight runs on — threads are never replaced, so it sets how
   * fast a life can be spent, and with it how long a video lasts.
   */
  pairCooldown: number;
  /** How far along a thread, from its owner, a cut starts counting. 0..1 */
  hubGuard: number;
}

export const DEFAULT_TUNING: Tuning = {
  speed: SPEED,
  pinStep: 0.055,
  pairCooldown: 1.5,
  hubGuard: 0.3,
};

/** Seconds of victory lap once only one ball is left. */
const OUTRO = 2.2;

/** Nothing runs longer than this, whatever happens. */
const HARD_CAP = 95;

export interface BallState {
  index: number;
  color: string;
  x: number;
  y: number;
  /** Rim angles where this ball's threads are pinned, oldest first. */
  threads: readonly number[];
  alive: boolean;
  /** Counts up from 0 to 1 over the death animation. */
  fade: number;
}

export interface Frame {
  balls: BallState[];
}

export type EventKind = 'bounce' | 'cut' | 'death' | 'win';

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
  /** Threads each ball starts with, which is also its life. */
  threadCount: number;
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
  /** How many threads this ball is entitled to. Only ever goes down. */
  life: number;
  threads: number[];
  alive: boolean;
  fade: number;
  /** The anchor angle of the newest thread, for measuring the next step. */
  lastPin: number;
  /** When each other ball last cut this one, indexed by attacker. */
  hitBy: Float64Array;
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

/** How many balls fight, and how much life each one has. */
export function setupFor(seed: number, attempt = 0): RoundSetup {
  const rng = createRng(seed ^ (attempt * 0x9e3779b9));
  return {
    seed,
    attempt,
    ballCount: rng.int(5, 9),
    threadCount: rng.int(16, 30),
  };
}

function start(setup: RoundSetup, rng: Rng, tuning: Tuning): Live[] {
  const balls: Live[] = [];
  const phase = rng.next() * Math.PI * 2;
  const colors = [...COLORS];
  // Shuffle so the same colour is not always ball zero.
  for (let i = colors.length - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    [colors[i], colors[j]] = [colors[j], colors[i]];
  }

  for (let i = 0; i < setup.ballCount; i += 1) {
    const around = phase + (i / setup.ballCount) * Math.PI * 2;
    // Each ball gets its own length of rope around the round's figure. Equal
    // lives make an opening frame of identical fans, which reads as a diagram
    // rather than a fight — and it is the difference in widths that tells you at
    // a glance who is winning.
    const life = Math.max(6, Math.round(setup.threadCount * rng.range(0.7, 1.3)));
    const radius = 0.58;
    const x = Math.cos(around) * radius;
    const y = Math.sin(around) * radius;
    // Any angle will do now. Pinning by swept angle rather than by the clock
    // means a ball charging through the middle lays its threads down just as
    // neatly as one skirting the wall, so the shots can be spread — which is
    // what stops every round from being a ring of balls hugging the rim.
    const incidence = rng.range(0.25, 1.3) * (rng.next() < 0.5 ? 1 : -1);
    const heading = around + Math.PI + incidence;

    // The opening fan, drawn as though the ball had already been running: the
    // same even arc it would have swept, so the first frame looks like the
    // middle of a fight rather than a starting grid.
    const threads: number[] = [];
    for (let k = life - 1; k >= 0; k -= 1) {
      threads.push(around - k * tuning.pinStep * Math.sign(incidence || 1));
    }

    balls.push({
      index: i,
      color: colors[i % colors.length],
      x,
      y,
      vx: Math.cos(heading) * tuning.speed,
      vy: Math.sin(heading) * tuning.speed,
      life,
      threads,
      alive: true,
      fade: 0,
      lastPin: Math.atan2(y, x),
      hitBy: new Float64Array(setup.ballCount).fill(-99),
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
  // The opening — where the balls stand and which way they face — is re-dealt
  // along with the counts, so a seed whose first fight was over too quickly gets
  // a genuinely different one rather than the same fight with more balls.
  const rng = createRng(setup.seed ^ 0x2545f491 ^ Math.imul(setup.attempt + 1, 0x85ebca6b));
  const balls = start(setup, rng, tuning);
  const frames: Frame[] = [];
  const events: SimEvent[] = [];

  const dt = 1 / (FPS * SUBSTEPS);
  const wall = 1 - BALL_RADIUS;
  const reach = (BALL_RADIUS + THREAD_WIDTH / 2) ** 2;

  let time = 0;
  let endAt = Infinity;
  let winner = balls[0]?.index ?? 0;
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
          events.push({ t: time, kind: 'bounce', ball: ball.index, alive: countAlive() });
        }

        // Straight out from the centre through the ball: the point that sweeps
        // the rim as the ball travels, and lays the fan down evenly.
        const spoke = Math.atan2(ball.y, ball.x);
        let swept = spoke - ball.lastPin;
        while (swept > Math.PI) swept -= Math.PI * 2;
        while (swept < -Math.PI) swept += Math.PI * 2;
        if (Math.abs(swept) >= tuning.pinStep) {
          ball.lastPin = spoke;
          const pinned = [...ball.threads, spoke];
          ball.threads = pinned.slice(Math.max(0, pinned.length - ball.life));
        }
      }

      // Cutting is resolved after every ball has moved, so the order balls were
      // created in cannot decide who cuts whom.
      for (const ball of balls) {
        if (!ball.alive) continue;

        let victim: Live | null = null;

        for (const other of balls) {
          if (other === ball || !other.alive) continue;
          // One attacker, one thread, then a wait. Threads are never replaced,
          // so this clock is what decides how fast a life is spent.
          if (time - other.hitBy[ball.index] < tuning.pairCooldown) continue;

          for (const angle of other.threads) {
            const hit = closestOnSegment(
              ball.x,
              ball.y,
              other.x,
              other.y,
              Math.cos(angle),
              Math.sin(angle),
            );
            // Threads all converge on the ball that owns them, so anything that
            // came near the hub would sever the whole fan at once — an instant
            // kill on contact, which is neither fair nor watchable. Cuts only
            // count out in the open, away from the owner.
            if (hit.distanceSq < reach && hit.t > tuning.hubGuard) {
              victim = other;
              break;
            }
          }
          if (victim) break;
        }

        if (victim) {
          victim.hitBy[ball.index] = time;
          victim.life -= 1;
          victim.threads = victim.threads.slice(Math.max(0, victim.threads.length - victim.life));
          events.push({ t: time, kind: 'cut', ball: ball.index, alive: countAlive() });

          if (victim.life <= 0) {
            victim.alive = false;
            const remaining = countAlive();
            events.push({ t: time, kind: 'death', ball: victim.index, alive: remaining });
            if (remaining <= 1) {
              winner = balls.find((b) => b.alive)?.index ?? victim.index;
              events.push({ t: time, kind: 'win', ball: winner, alive: 1 });
              endAt = time + OUTRO;
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
 *
 * The wider band is the safety net: some openings simply refuse to resolve
 * anywhere near the target, and a fight that lands in `ALLOWED` is better than
 * one forced.
 */
export const SHORT = { min: 28, max: 46 };
export const LONG = { min: 61, max: 75 };
export const ALLOWED = { min: 26, max: 78 };

/** One seed in four is a long one. */
export const aimsLong = (seed: number): boolean => createRng(seed ^ 0x1b873593).next() < 0.25;

/**
 * Rounds are found, not designed: the seed is played out, and if the fight was
 * over in eight seconds or still going at eighty, the same seed is dealt a
 * different opening and played again. Deterministic, so a seed always lands on
 * the same round — and the lengths that come out follow the fights rather than a
 * number somebody typed.
 */
export function generateRound(seed: number, tuning: Tuning = DEFAULT_TUNING): Round {
  const target = aimsLong(seed) ? LONG : SHORT;
  let fallback: Round | null = null;
  let closest: Round | null = null;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const round = play(setupFor(seed, attempt), tuning);
    if (round.duration >= target.min && round.duration <= target.max) return round;
    if (!fallback && round.duration >= ALLOWED.min && round.duration <= ALLOWED.max) {
      fallback = round;
    }
    const aim = (target.min + target.max) / 2;
    if (!closest || Math.abs(round.duration - aim) < Math.abs(closest.duration - aim)) {
      closest = round;
    }
  }

  return (fallback ?? closest) as Round;
}
