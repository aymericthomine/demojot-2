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
import { BALL_RADIUS, COLORS, FPS, SPEED, THREAD_WIDTH } from './style';

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
 * as seven wedges meeting edge to edge with nothing between them.
 */
export const ANCHORS = BALL_COUNT * OPENING_THREADS;

/** An anchor whose thread has been broken. It stays empty for the rest of the round. */
const EMPTY = -1;

/** Where anchor `j` sits, so that ball `i` opens owning `j` in [5i, 5i+5). */
const anchorAngle = (j: number): number =>
  -Math.PI / 2 + (j - (OPENING_THREADS - 1) / 2) * ((Math.PI * 2) / ANCHORS);

/**
 * How far from the centre the balls start.
 *
 * Well out towards the rim, at the apex of its own wedge, which is where the
 * reference puts them: the middle of the arena is empty at the start and the six
 * fans point outward.
 */
const START_RADIUS = 0.6;

/**
 * Most rope a ball can hold.
 *
 * Counted off the reference, and it is the reason a round ever finishes. Six
 * balls open on twenty threads each and nobody is ever seen holding much past
 * twenty-four; the total in the arena falls from a hundred and twenty to thirty
 * across thirty-five seconds. So a ball that is already full does not take the
 * thread it runs through — it **breaks** it, and that anchor is empty for the
 * rest of the round.
 *
 * Transfer alone conserves, and a conserving economy has no drift towards a
 * winner: the last two trade the same rope back and forth for ever. Breakage is
 * what makes the fight one-way, and it is why there is always a winner.
 */
export const HOLD_LIMIT = Math.round(OPENING_THREADS * 1.8);

/** Seconds of victory lap once only one ball is left. */
const OUTRO = 2.4;

/**
 * Nothing runs longer than this, whatever happens.
 *
 * Comfortably past the longest band, so it only ever catches a freak fight —
 * and it bounds the work, which matters because the seed search plays a fight
 * many times over before it settles on one. On a phone that is the difference
 * between a wait and a hang.
 */
const HARD_CAP = 120;

export interface Tuning {
  /** Arena radii per second. */
  speed: number;
  /** Most rope one ball can hold; see `HOLD_LIMIT`. */
  holdLimit: number;
}

export const DEFAULT_TUNING: Tuning = {
  speed: SPEED,
  holdLimit: HOLD_LIMIT,
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

export type EventKind = 'wall' | 'clash' | 'take' | 'break' | 'death' | 'win';

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
  /** Which deal of this seed produced the round — see `generateRound`. */
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
  /** When this ball last bounced off another, so one contact is not counted twice. */
  clashedAt: number;
  /** Where it was at the start of this step. A thread is crossed, not sat on. */
  px: number;
  py: number;
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

/**
 * Runs one fight to the end — that is, until one ball is left holding rope.
 *
 * `record` off keeps no frames. The seed search plays a fight only to find out
 * how long it lasted and throws it away, and keeping five thousand snapshots per
 * discarded attempt is how a phone runs out of memory.
 */
export function play(setup: RoundSetup, tuning: Tuning, record = true): Round {
  const balls = start(setup, tuning);
  const frames: Frame[] = [];
  const events: SimEvent[] = [];

  const dt = 1 / (FPS * SUBSTEPS);
  const wall = 1 - BALL_RADIUS;
  const touching = (BALL_RADIUS * 2) ** 2;
  const reach = (BALL_RADIUS + THREAD_WIDTH / 2) ** 2;

  // Who holds each anchor. This is the state of the round: the balls only move.
  const owner = new Int8Array(ANCHORS);
  for (let j = 0; j < ANCHORS; j += 1) owner[j] = Math.floor(j / OPENING_THREADS);

  // The per-ball thread lists the renderer wants, rebuilt only when the ring
  // actually changes, so unchanged frames go on sharing one array.
  const rebuild = (): void => {
    for (const ball of balls) ball.threads = [];
    for (let j = 0; j < ANCHORS; j += 1) {
      if (owner[j] !== EMPTY) balls[owner[j]].threads.push(anchorAngle(j));
    }
    for (const ball of balls) {
      if (ball.alive && ball.threads.length === 0) {
        ball.alive = false;
        events.push({ t: time, kind: 'death', ball: ball.index, alive: countAlive() });
      }
    }
  };

  let time = 0;
  let endAt = Infinity;
  let winner = balls[0].index;
  const countAlive = () => balls.reduce((n, ball) => n + (ball.alive ? 1 : 0), 0);

  for (let frame = 0; ; frame += 1) {
    if (record) frames.push(snapshot(balls));
    else frames.length = frame + 1;
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

      // Touch a thread and it comes away with you — new hub, new colour, same
      // anchor. The ball is not turned by it: rope does not push back, and the
      // only rebounds in the arena are off the wall and off other balls. So a
      // ball crossing a fan takes every thread it passes through, which is what
      // makes a good run pay and why somebody always ends up holding all of it.
      for (const ball of balls) {
        if (!ball.alive) continue;

        let changed = false;
        let gained = 0;
        for (let j = 0; j < ANCHORS; j += 1) {
          const victim = owner[j];
          if (victim === ball.index || victim === EMPTY) continue;
          const hub = balls[victim];
          const angle = anchorAngle(j);
          const hit = closestOnSegment(
            ball.x,
            ball.y,
            hub.x,
            hub.y,
            Math.cos(angle),
            Math.sin(angle),
          );
          if (hit.distanceSq >= reach) continue;

          // Full hands break rope rather than take it, and the anchor stays
          // empty for good.
          const full = ball.threads.length + gained >= tuning.holdLimit;
          owner[j] = full ? EMPTY : ball.index;
          if (!full) gained += 1;
          changed = true;
          events.push({
            t: time,
            kind: full ? 'break' : 'take',
            ball: ball.index,
            alive: countAlive(),
          });
        }

        if (changed) {
          rebuild();
          if (countAlive() <= 1) {
            winner = balls.find((b) => b.alive)?.index ?? ball.index;
            events.push({ t: time, kind: 'win', ball: winner, alive: 1 });
            endAt = Math.min(endAt, time + OUTRO);
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
 * Not a setting — the length of a video is how long the fight took, and the
 * fight always ends with one ball holding every thread still in the ring. What
 * the seed chooses is which fight: the same seven balls are fired off in
 * different directions until one of those fights comes out the length wanted.
 *
 * Most videos want to be the length people actually watch — a little over half a
 * minute. A video past a minute is what monetisation asks for, so one seed in
 * four aims there instead. Which band a seed takes is part of the seed, so a
 * seed always gives the same video.
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
  const long = aimsLong(seed);
  const target = long ? LONG : SHORT;
  const aim = (target.min + target.max) / 2;

  let closest: Round | null = null;
  // A long fight is the rarer one, so a seed aiming there looks harder for it.
  const tries = long ? 60 : 24;
  let best = 0;
  for (let attempt = 0; attempt < tries; attempt += 1) {
    const round = play(setupFor(seed, attempt), tuning, false);
    if (round.duration >= target.min && round.duration <= target.max) {
      return play(setupFor(seed, attempt), tuning);
    }
    if (!closest || Math.abs(round.duration - aim) < Math.abs(closest.duration - aim)) {
      closest = round;
      best = attempt;
    }
  }
  // Nothing in the band: whichever came nearest, rather than one padded to length.
  return play(setupFor(seed, best), tuning);
}
