/**
 * The round.
 *
 * Balls travel in straight lines inside a circle at a fixed speed. Two rules do
 * all the work:
 *
 * - A ball **trails a thread** behind it, pinned to the wall it came from,
 *   several times a second. Left alone, its fan sweeps the rim and thickens.
 * - Crossing somebody else's thread **cuts it**. Threads are the only thing
 *   keeping a ball in the game, so cutting is how balls attack each other, and
 *   running through a dense fan is what kills.
 *
 * A ball with no threads left is out. The round ends when one is left standing,
 * which is why the length of a video is not something you set — it is the result
 * of the fight, and therefore of the seed.
 *
 * Everything here is pure arithmetic on a seeded generator: same seed, same
 * fight, same file, on any machine.
 */

import { createRng, type Rng } from './random';
import { BALL_RADIUS, COLORS, FPS, SPEED, THREAD_WIDTH } from './style';

/** Physics substeps per rendered frame. Enough that a bounce lands cleanly. */
const SUBSTEPS = 4;

/**
 * The numbers the whole thing balances on.
 *
 * A ball gains a thread every time it hits the wall, so a ball left alone grows
 * a bigger and bigger fan. It loses one whenever somebody runs through that fan.
 * Get those two rates wrong in either direction and there is no video: cutting
 * too cheap shaves every fan to nothing in the first seconds, too dear and
 * nobody ever dies.
 *
 * What keeps both alive at once is that the cut rate is **per pair**. One
 * attacker cannot cut faster than a victim's bounces replace, so a duel settles
 * nothing and the fans keep growing; two or three hunting the same ball beat the
 * replacement rate and shred it. Rounds therefore end because the arena gets
 * crowded, not because a timer ran out — and the big fans of the reference
 * survive.
 *
 * These are measured, not guessed: a sweep over speed and cooldown, scored on
 * how long rounds last and how big the fans get.
 */
export interface Tuning {
  /** Arena radii per second. */
  speed: number;
  /** Seconds before the same attacker may cut the same ball again, at the start. */
  pairCooldown: number;
  /** The same, once the fight is fully wound up. */
  pairCooldownEnd: number;
  /** Seconds over which the cooldown falls from one to the other. */
  escalation: number;
  /** How far along a thread, from its owner, a cut starts counting. 0..1 */
  hubGuard: number;
  /**
   * The most threads a ball can hold. At the cap a bounce still pins a thread,
   * but the oldest one lets go — so a fan keeps drifting around the rim without
   * growing. This is what makes a round end: once everyone is capped, any
   * attention at all is a net loss, and the arena only gets busier.
   */
  maxThreads: number;
}

export const DEFAULT_TUNING: Tuning = {
  speed: SPEED,
  pairCooldown: 11,
  pairCooldownEnd: 0.25,
  escalation: 12,
  hubGuard: 0.35,
  maxThreads: 18,
};

/**
 * Cutting gets easier as the round goes on.
 *
 * With a fixed rate there is no video: slow enough for fans to grow means nobody
 * ever dies, and fast enough to kill shaves every fan to a stub in the first ten
 * seconds. Both were measured, repeatedly, before this was written.
 *
 * Winding it up over the round gives the two halves the reference has — an
 * opening where fans swell and the arena fills with colour, and an endgame where
 * threads start falling faster than bounces can replace them and balls go out
 * one after another. It is also just how these videos are watched: it has to
 * build.
 */
const windUp = (time: number, tuning: Tuning): number => Math.min(1, time / tuning.escalation);

const cooldownAt = (time: number, tuning: Tuning): number => {
  const k = windUp(time, tuning);
  return tuning.pairCooldown + (tuning.pairCooldownEnd - tuning.pairCooldown) * k;
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
  /** Rim angles where this ball's threads are pinned. Immutable between changes. */
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
  threads: number[];
  alive: boolean;
  fade: number;
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

/** How many balls and threads this seed fights with. */
export function setupFor(seed: number, attempt = 0): RoundSetup {
  const rng = createRng(seed ^ (attempt * 0x9e3779b9));
  return {
    seed,
    attempt,
    ballCount: rng.int(5, 9),
    threadCount: rng.int(8, 16),
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
    const radius = 0.58;
    const x = Math.cos(around) * radius;
    const y = Math.sin(around) * radius;
    // Not a uniform heading. A billiard in a circle keeps its angle of
    // incidence for ever, so the shot fired at the start decides the shape of
    // every fan that ball will ever have: aim it near the middle and the anchor
    // point races around the rim, smearing threads over half the circle. Keeping
    // the angle away from the diameter is what gives the reference its narrow
    // searchlight fans.
    const incidence = rng.range(0.85, 1.4) * (rng.next() < 0.5 ? 1 : -1);
    const heading = around + Math.PI + incidence;

    // The opening fan: threads pinned on the arc the ball is facing, so the
    // first frame already looks like the middle of a fight.
    const threads: number[] = [];
    for (let k = 0; k < setup.threadCount; k += 1) {
      const spread = ((k + 0.5) / setup.threadCount - 0.5) * 1.1;
      threads.push(around + spread);
    }

    balls.push({
      index: i,
      color: colors[i % colors.length],
      x,
      y,
      vx: Math.cos(heading) * tuning.speed,
      vy: Math.sin(heading) * tuning.speed,
      threads,
      alive: true,
      fade: 0,
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

          const pinned = [...ball.threads, Math.atan2(ny, nx)];
          // At the cap the oldest thread lets go, so a fan drifts around the rim
          // instead of thickening for ever.
          ball.threads = pinned.length > tuning.maxThreads ? pinned.slice(1) : pinned;
          events.push({ t: time, kind: 'bounce', ball: ball.index, alive: countAlive() });
        }
      }

      // Cutting is resolved after every ball has moved, so the order balls were
      // created in cannot decide who cuts whom.
      for (const ball of balls) {
        if (!ball.alive) continue;

        let victim: Live | null = null;
        let victimThread = -1;

        for (const other of balls) {
          if (other === ball || !other.alive) continue;
          // One attacker, one thread, then a wait. Without this a single pass
          // through a fan would take all of it — threads bunch together near the
          // ball that owns them — and no fan could ever grow.
          if (time - other.hitBy[ball.index] < cooldownAt(time, tuning)) continue;
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
            // Threads all converge on the ball that owns them, so anything that
            // came near the hub would sever the entire fan at once — an instant
            // kill on contact, which is neither fair nor watchable. Cuts only
            // count out in the open, away from the owner.
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
          victim.threads = victim.threads.filter((_, k) => k !== victimThread);
          events.push({ t: time, kind: 'cut', ball: ball.index, alive: countAlive() });

          if (victim.threads.length === 0) {
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

/** Where a video's length should land: long enough to watch, short enough to finish. */
export const MIN_DURATION = 26;
export const MAX_DURATION = 75;

/**
 * Rounds are found, not designed: the seed is played out, and if the fight was
 * over in eight seconds or still going at eighty, the same seed is dealt a
 * different number of balls and threads and played again. Deterministic, so a
 * seed always lands on the same round — and the lengths that come out follow the
 * fights rather than a number somebody typed.
 */
export function generateRound(seed: number, tuning: Tuning = DEFAULT_TUNING): Round {
  let longest: Round | null = null;

  for (let attempt = 0; attempt < 24; attempt += 1) {
    const round = play(setupFor(seed, attempt), tuning);
    if (round.duration >= MIN_DURATION && round.duration <= MAX_DURATION) return round;
    if (!longest || Math.abs(round.duration - 40) < Math.abs(longest.duration - 40)) {
      longest = round;
    }
  }

  return longest as Round;
}
