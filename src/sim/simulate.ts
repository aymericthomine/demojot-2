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

/**
 * How many balls a round may have.
 *
 * Three, not two. A two-ball round never finishes: each is penned in its own
 * half of the ring and can only reach the rope on the boundary between them, so
 * they trade the same threads and neither runs out — played to a five-minute
 * clock, ten seeds out of ten were still going. Three settles seven times in ten
 * over the same clock, and inside the search window every deal found an ending.
 *
 * Twelve is the palette, and the point at which a wedge is narrow enough that a
 * ball barely fits inside its own opening.
 */
export const FEWEST_BALLS = 3;
export const MOST_BALLS = 12;
export const clampBalls = (n: number): number =>
  Math.max(FEWEST_BALLS, Math.min(MOST_BALLS, Math.round(n) || BALL_COUNT));

/**
 * Threads everybody can start with.
 *
 * Five is the sparse game: thirty-five anchors, wedges you can count, a picture
 * that thins out as rope is broken. Ten is the dense one — seventy anchors, fans
 * that read as solid colour. Twenty is a hundred and forty, packed tight enough
 * that the rim reads as a ring of colour rather than as separate threads.
 *
 * Each step doubles the territory to be taken before anybody runs out, so each
 * one is a slower fight than the last.
 */
export const THREAD_CHOICES = [5, 10, 20] as const;
export type ThreadCount = (typeof THREAD_CHOICES)[number];

/** The default, and what every earlier video used. */
export const OPENING_THREADS: ThreadCount = 5;

/**
 * Anchor points on the rim, fixed for the whole round.
 *
 * Every one of them holds a thread from the first frame to the last, so this is
 * also the total number of threads in the arena and it never changes. Seven balls
 * with five each divides the rim exactly, which is why the opening reads as seven
 * wedges meeting edge to edge with nothing between them — and it divides exactly
 * for any thread count, which is why the choice is safe.
 */
export const anchorsFor = (threads: number, balls: number = BALL_COUNT): number => balls * threads;

/**
 * Most rope a ball can hold, and the reason a round ever finishes.
 *
 * Transfer alone conserves, and a conserving economy has no drift towards a
 * winner: the last two trade the same rope back and forth for ever. A full ball
 * breaks the thread it runs through instead of taking it, that anchor stays empty
 * for the rest of the round, and the fight becomes one-way.
 *
 * Proportional to what a ball opens with, so the dense game is not simply the
 * sparse one played for four times as long.
 */
export const holdLimitFor = (threads: number): number => Math.round(threads * 1.8);

/** An anchor whose thread has been broken. It stays empty for the rest of the round. */
const EMPTY = -1;

/** Radians between neighbouring anchors. */
const stepFor = (anchors: number): number => (Math.PI * 2) / anchors;

/**
 * Where anchor `j` sits, so that ball `i` opens owning the run starting at
 * `i * threads`.
 */
const anchorAngle = (j: number, setup: RoundSetup): number =>
  -Math.PI / 2 + (j - (setup.threads - 1) / 2) * stepFor(setup.anchors);

/**
 * How the opening is dealt out.
 *
 * Every video used to start on the same picture, pixel for pixel: same wedges in
 * the same places, same colours on the same balls. That was asked for, and the
 * figure still is the same figure — seven wedges meeting edge to edge with an
 * empty middle. What the seed now decides is where the figure starts and who
 * wears what.
 *
 * `turn` is a whole number of anchor slots, which is what keeps the figure from
 * deforming as it rotates: the anchors stay on their grid and the wedges still
 * meet without a gap. `palette` shuffles the same seven colours between the same
 * seven balls, so the screen holds exactly the palette it held before — only the
 * arrangement moves.
 *
 * Thirty-five turns times five thousand and forty shuffles is a hundred and
 * seventy-six thousand openings, which is enough that two videos do not share a
 * first frame.
 *
 * Taken from the seed alone, never from the deal: every attempt at a seed has to
 * share one opening, or "the seed is the video" stops being true.
 */
export function openingFor(
  seed: number,
  anchors: number,
  balls: number = BALL_COUNT,
): { turn: number; palette: number[] } {
  const rng = createRng(seed ^ 0x9e3779b9);
  const turn = rng.int(0, anchors - 1);
  const palette = Array.from({ length: balls }, (_, i) => i);
  for (let i = balls - 1; i > 0; i -= 1) {
    const j = rng.int(0, i);
    [palette[i], palette[j]] = [palette[j], palette[i]];
  }
  return { turn, palette };
}

/**
 * How far from the centre the balls start.
 *
 * Closer in than the reference puts them, so the opening reads as a huddle that
 * scatters rather than a ring already spread against the wall. There is a floor
 * on this: the fans have to leave each other alone from the first frame, and two
 * balls both sitting near the middle are nearly the same point, so their wedges
 * would open across each other. Half a radius keeps them clear.
 */
const START_RADIUS = 0.45;

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
/**
 * Seconds the opening picture is held before anybody moves.
 *
 * The seven wedges dividing the rim are the most legible frame in the video and
 * they are gone in an instant otherwise. Nothing happens during the hold — no
 * movement, no rope changing hands — so it reads as a held breath rather than a
 * slow start.
 */
const HOLD = 1;

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
  /**
   * Most rope one ball can hold. Left out, it comes from the thread count via
   * `holdLimitFor`; set, it overrides — which is only wanted by the sweeps that
   * chose the multiplier in the first place.
   */
  holdLimit?: number;
}

export const DEFAULT_TUNING: Tuning = {
  speed: SPEED,
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
  /** Threads each ball opens with: five for the sparse game, ten for the dense. */
  threads: number;
  /** `ballCount * threads`, and so the total rope in the ring. */
  anchors: number;
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

export function setupFor(
  seed: number,
  attempt = 0,
  threads: number = OPENING_THREADS,
  balls: number = BALL_COUNT,
): RoundSetup {
  const ballCount = clampBalls(balls);
  return { seed, attempt, ballCount, threads, anchors: anchorsFor(threads, ballCount) };
}

/** The opening: the same figure in every video, turned and recoloured. */
function start(setup: RoundSetup, tuning: Tuning): Live[] {
  const rng = createRng(setup.seed ^ 0x2545f491 ^ Math.imul(setup.attempt + 1, 0x85ebca6b));
  const { turn, palette } = openingFor(setup.seed, setup.anchors, setup.ballCount);
  const balls: Live[] = [];
  const slice = (Math.PI * 2) / setup.ballCount;

  for (let i = 0; i < setup.ballCount; i += 1) {
    const around = -Math.PI / 2 + i * slice + turn * stepFor(setup.anchors);
    const x = Math.cos(around) * START_RADIUS;
    const y = Math.sin(around) * START_RADIUS;

    // Ball i opens holding five consecutive anchors, so the seven fans divide
    // the rim exactly and meet edge to edge. Nothing will be added to this ring
    // and nothing taken away — from here on the fight is only over who holds
    // what. No modulo here: this is an angle, and an anchor a full turn along is
    // the same point on the rim.
    const threads: number[] = [];
    for (let k = 0; k < setup.threads; k += 1) {
      threads.push(anchorAngle(i * setup.threads + k + turn, setup));
    }

    // Aimed across the arena, but loosely: a wide spread so no two balls set off
    // the same way and the first seconds do not look choreographed. Still built
    // around inward, because a billiard in a circle keeps its angle of incidence
    // for ever — a ball sent off near the tangent spends the whole video hugging
    // the wall in a tiny rosette, and the picture stops moving.
    const heading = around + Math.PI + rng.range(-1.3, 1.3);

    balls.push({
      index: i,
      color: COLORS[palette[i]],
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
export function play(
  setup: RoundSetup,
  tuning: Tuning,
  record = true,
  runFor = HARD_CAP,
): Round {
  const balls = start(setup, tuning);
  const frames: Frame[] = [];
  const events: SimEvent[] = [];

  const dt = 1 / (FPS * SUBSTEPS);
  const wall = 1 - BALL_RADIUS;
  const touching = (BALL_RADIUS * 2) ** 2;
  const reach = (BALL_RADIUS + THREAD_WIDTH / 2) ** 2;

  // Who holds each anchor. This is the state of the round: the balls only move.
  // The modulo is not optional here — unlike the angles in `start`, these are
  // array indices, and a turn that runs off the end has to come back round.
  const { anchors } = setup;
  const holdLimit = tuning.holdLimit ?? holdLimitFor(setup.threads);

  // Where every anchor sits, worked out once. These never move, and the contact
  // test below runs for every anchor against every ball on every substep — at
  // twenty threads that is a million sines a second of simulated time, all of
  // them recomputing the same hundred and forty numbers.
  const rimX = new Float64Array(anchors);
  const rimY = new Float64Array(anchors);
  const rimAngle = new Float64Array(anchors);
  for (let j = 0; j < anchors; j += 1) {
    const angle = anchorAngle(j, setup);
    rimAngle[j] = angle;
    rimX[j] = Math.cos(angle);
    rimY[j] = Math.sin(angle);
  }
  const owner = new Int8Array(anchors);
  const { turn } = openingFor(setup.seed, anchors, setup.ballCount);
  for (let i = 0; i < setup.ballCount; i += 1) {
    for (let k = 0; k < setup.threads; k += 1) {
      owner[(i * setup.threads + k + turn) % anchors] = i;
    }
  }

  // The per-ball thread lists the renderer wants, rebuilt only when the ring
  // actually changes, so unchanged frames go on sharing one array.
  const rebuild = (): void => {
    for (const ball of balls) ball.threads = [];
    for (let j = 0; j < anchors; j += 1) {
      if (owner[j] !== EMPTY) balls[owner[j]].threads.push(rimAngle[j]);
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

  const total = Math.round(runFor * FPS);

  for (let frame = 0; ; frame += 1) {
    if (record) frames.push(snapshot(balls));
    else frames.length = frame + 1;
    // The search only wants to know when the fight settled, so once it has that
    // there is nothing left to compute: the victory lap is only worth playing
    // out when somebody is going to watch it. This is most of the cost of a
    // generate — a hundred and fifty deals each running the full clock is
    // seconds of frozen page on a phone.
    if (!record && endAt !== Infinity) break;
    if (frame + 1 >= total) {
      // Only when somebody is going to watch it. The search reads the win event
      // to find out when a fight settled, and a consolation winner declared at
      // the buzzer looks exactly like one that settled on the last frame — which
      // had the search accepting fights that never finished at all.
      if (endAt === Infinity && record) {
        // Out of time rather than out of opponents: the clock ran out on a fight
        // still in progress. A video has to end on somebody, so whoever holds
        // the most rope takes it.
        winner = balls
          .filter((ball) => ball.alive)
          .reduce((best, ball) => (ball.threads.length > best.threads.length ? ball : best)).index;
        events.push({ t: time, kind: 'win', ball: winner, alive: countAlive() });
      }
      break;
    }

    for (let step = 0; step < SUBSTEPS; step += 1) {
      time += dt;
      // Held on the opening picture. Nothing moves and nothing changes hands.
      if (time < HOLD) continue;

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
        for (let j = 0; j < anchors; j += 1) {
          const victim = owner[j];
          if (victim === ball.index || victim === EMPTY) continue;
          const hub = balls[victim];
          const hit = closestOnSegment(ball.x, ball.y, hub.x, hub.y, rimX[j], rimY[j]);
          if (hit.distanceSq >= reach) continue;

          // Full hands break rope rather than take it, and the anchor stays
          // empty for good.
          const full = ball.threads.length + gained >= holdLimit;
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
          if (countAlive() <= 1 && endAt === Infinity) {
            winner = balls.find((b) => b.alive)?.index ?? ball.index;
            events.push({ t: time, kind: 'win', ball: winner, alive: 1 });
            // Noted, not acted on: the round runs to the clock either way, and
            // what is left is the winner's victory lap.
            endAt = time;
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
 * Drawn from the seed, twenty seconds to a minute and twenty. The fight itself
 * is not a settable length — it takes as long as it takes — so the seed picks a
 * length first, then hunts for a fight that settles just inside it, and whatever
 * is left over is the winner's victory lap: it keeps moving, holding every
 * thread in the ring, until the clock runs out.
 *
 * Reachable at every density, which is the thing worth checking before promising
 * a range. Played out, fights settle anywhere from four seconds to a hundred and
 * nine, median around thirty; a fifth of them land under twenty seconds at five
 * threads and a tenth at twenty threads, so even the short end of the range is
 * found in a handful of deals rather than by luck.
 */
export const SHORTEST = 20;
export const LONGEST = 80;

/** The length this seed asks for. From the seed alone, never from the deal. */
export const lengthFor = (seed: number): number => {
  const seconds = createRng(seed ^ 0x7feb352d).range(SHORTEST, LONGEST);
  // Whole frames, so the video is an exact number of them.
  return Math.round(seconds * FPS) / FPS;
};

/**
 * How early the fight has to settle, leaving the rest as the victory lap.
 *
 * Scaled rather than fixed: nine seconds of lap is an ending on a minute-long
 * video and nearly half a short one, so it is capped at a third of the length.
 */
const lapFor = (length: number): number => Math.min(9, length * 0.3);

export function generateRound(
  seed: number,
  threads: number = OPENING_THREADS,
  balls: number = BALL_COUNT,
  tuning: Tuning = DEFAULT_TUNING,
): Round {
  const deal = (attempt: number) => setupFor(seed, attempt, threads, balls);
  const length = lengthFor(seed);
  const settleBy = length;
  const settleFrom = Math.max(3, length - lapFor(length));

  /** When the fight settled, or `Infinity` if it never did. */
  const settlesAt = (attempt: number): number =>
    // Run no further than the window: a fight still going at the far edge of it
    // is a reject, and how much further it would have gone does not matter.
    play(deal(attempt), tuning, false, settleBy).events.find((e) => e.kind === 'win')?.t ??
    Infinity;

  let closest = 0;
  let closestGap = Infinity;
  // Capped rather than exhaustive. A seed that has not found its fight in eighty
  // deals is a seed whose fights mostly run long, and eighty is already a second
  // of work on a phone — the fallback below costs a few seconds of victory lap,
  // which is cheaper than a page that sits still.
  for (let attempt = 0; attempt < 80; attempt += 1) {
    // Played without recording first: the search only wants to know when the
    // fight settled, and keeping four thousand snapshots per discarded attempt
    // is how a phone runs out of memory.
    const at = settlesAt(attempt);
    if (at >= settleFrom && at <= settleBy) {
      return play(deal(attempt), tuning, true, length);
    }
    // Falling short is better than overrunning: a fight cut off by the clock has
    // no ending, only a leader.
    const gap = at > settleBy ? at - settleBy + 100 : settleFrom - at;
    if (gap < closestGap) {
      closestGap = gap;
      closest = attempt;
    }
  }
  return play(deal(closest), tuning, true, length);
}
