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
 * Two is allowed, and for a while it was not: a two-ball round appeared never to
 * finish, because each ball is penned in its own half of the ring and can only
 * reach the rope on the boundary between them, so they trade the same threads
 * and neither runs out — played to a five-minute clock, ten seeds out of ten
 * were still going.
 *
 * That was measured before the holding limit became something the search moves.
 * A duel does finish, and reliably, as long as the limit is tight enough that
 * rope is broken rather than passed back and forth: at a limit of one and a
 * fifth what a ball opens with, eleven deals in twelve settle on five threads and
 * five in twelve on twenty. The ladder bisection finds that rung on its own,
 * because every looser one runs past the clock.
 *
 * Twelve is the palette, and the point at which a wedge is narrow enough that a
 * ball barely fits inside its own opening.
 */
export const FEWEST_BALLS = 2;
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
 * How big a ball is, as a multiple of the size measured off the reference.
 *
 * One is the reference — 67 px across in a 1080 px frame. The bigger sizes are
 * not only a look: a wide ball sweeps a wider corridor, so it runs through more
 * rope per pass and the fight moves faster. The hold limit is chosen per video
 * against the length asked for, so that speeding up does not shorten the video —
 * it makes it busier.
 *
 * Stops short of the point where a ball no longer fits in its own wedge at
 * twelve balls, which is what `startRadiusFor` guards.
 */
export const SIZE_CHOICES = [1, 1.4, 1.9] as const;
export type BallSize = (typeof SIZE_CHOICES)[number];

/** The reference size, and what every earlier video used. */
export const NORMAL_SIZE: BallSize = 1;

export const clampSize = (n: number): number => Math.max(1, Math.min(2.4, n || NORMAL_SIZE));

/** Ball radius for this round, in arena units. */
export const radiusFor = (size: number): number => BALL_RADIUS * clampSize(size);

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
  steady = false,
): { turn: number; palette: number[] } {
  // Steady is the one opening that never moves: no turn, no shuffle, the first
  // colour on the first ball. It exists for a mode whose whole point is that
  // every video starts on the same picture, which is the opposite of what the
  // rest of this function is for.
  if (steady) {
    return { turn: 0, palette: Array.from({ length: balls }, (_, i) => i) };
  }
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
 * The same huddle, opened up only as far as the balls force it to.
 *
 * Half a radius is the figure, and it stays the figure at the reference size.
 * Big balls do not fit round a ring that small — twelve of them at nearly twice
 * the width would open the round already overlapping, and two balls sharing a
 * point have their wedges crossing from the first frame. So the ring is pushed
 * out to whatever leaves a hair between neighbours, and no further, and it is
 * held off the wall so nobody starts embedded in it.
 */
const startRadiusFor = (setup: RoundSetup): number => {
  const r = radiusFor(setup.size);
  const clear = setup.ballCount > 1 ? (r * 1.05) / Math.sin(Math.PI / setup.ballCount) : 0;
  return Math.min(1 - r * 1.05, Math.max(START_RADIUS, clear));
};

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
  /**
   * Seconds the opening picture is held. Left out, it is `HOLD`.
   *
   * A knob because a mode where every video opens on the same figure does not
   * need to hold it as long: there is nothing new to read in a picture the
   * viewer has already seen.
   */
  hold?: number;
  /**
   * What the speed is multiplied by over the length of the video.
   *
   * Left out, nothing changes and a round runs at one speed from the first frame
   * to the last. Set, every ball is sped up by the same small factor each
   * substep, so the fight winds up rather than starting fast: relative speeds are
   * left alone, which matters because the balls do not all travel at the same
   * speed once they have hit each other.
   */
  rampTo?: number;
  /**
   * How the wind-up is spread over the round. One is a straight line; above one
   * the speed climbs slowly at first and ever faster towards the end.
   */
  rampCurve?: number;
}

export const DEFAULT_TUNING: Tuning = {
  speed: SPEED,
};

/**
 * How fast a ball travels, as a multiple of the speed measured off the
 * reference.
 *
 * One is the reference: 0.85 arena radii a second, tracked frame by frame, and
 * the first version of this ran at three times that and read as wrong
 * immediately. The faster settings are not a correction of that — they are a
 * choice, for a video that wants to be busier than the thing it came from.
 *
 * It scales the whole fight rather than the launch alone: the wall reflects
 * perfectly and two balls trade the part of their speed that lies along the line
 * between them, so nothing here puts energy in or takes it out, and the speed a
 * round is dealt is the speed it keeps.
 */
export const SPEED_CHOICES = [1, 1.5, 2] as const;
export type BallSpeed = (typeof SPEED_CHOICES)[number];

/** The reference, and what every earlier video used. */
export const NORMAL_SPEED: BallSpeed = 1;

/** The tuning for a chosen speed, ready to hand to `generateRound`. */
export const tuningFor = (speed: number): Tuning => ({
  ...DEFAULT_TUNING,
  speed: SPEED * speed,
});

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
  /** Ball radius as a multiple of the measured one. Physics and picture both. */
  size: number;
  /** Open on the fixed figure rather than one the seed turns and recolours. */
  steady?: boolean;
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
  const t =
    lengthSq > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq)) : 0;
  const cx = ax + dx * t;
  const cy = ay + dy * t;
  return { distanceSq: (px - cx) ** 2 + (py - cy) ** 2, t };
}

export function setupFor(
  seed: number,
  attempt = 0,
  threads: number = OPENING_THREADS,
  balls: number = BALL_COUNT,
  size: number = NORMAL_SIZE,
  steady = false,
): RoundSetup {
  const ballCount = clampBalls(balls);
  return {
    seed,
    attempt,
    ballCount,
    threads,
    anchors: anchorsFor(threads, ballCount),
    size: clampSize(size),
    steady,
  };
}

/** The opening: the same figure in every video, turned and recoloured. */
function start(setup: RoundSetup, tuning: Tuning): Live[] {
  const rng = createRng(setup.seed ^ 0x2545f491 ^ Math.imul(setup.attempt + 1, 0x85ebca6b));
  const { turn, palette } = openingFor(setup.seed, setup.anchors, setup.ballCount, setup.steady);
  const balls: Live[] = [];
  const slice = (Math.PI * 2) / setup.ballCount;
  const ring = startRadiusFor(setup);

  for (let i = 0; i < setup.ballCount; i += 1) {
    const around = -Math.PI / 2 + i * slice + turn * stepFor(setup.anchors);
    const x = Math.cos(around) * ring;
    const y = Math.sin(around) * ring;

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
export function play(setup: RoundSetup, tuning: Tuning, record = true, runFor = HARD_CAP): Round {
  const balls = start(setup, tuning);
  const frames: Frame[] = [];
  const events: SimEvent[] = [];

  const dt = 1 / (FPS * SUBSTEPS);
  const radius = radiusFor(setup.size);
  const wall = 1 - radius;
  const touching = (radius * 2) ** 2;
  const reach = (radius + THREAD_WIDTH / 2) ** 2;

  // Who holds each anchor. This is the state of the round: the balls only move.
  // The modulo is not optional here — unlike the angles in `start`, these are
  // array indices, and a turn that runs off the end has to come back round.
  const { anchors } = setup;
  const holdLimit = tuning.holdLimit ?? holdLimitFor(setup.threads);
  const hold = tuning.hold ?? HOLD;

  /**
   * The wind-up, as a multiple of the speed the round was dealt.
   *
   * Bent rather than straight: the curve spends almost nothing early and most of
   * itself at the end, so the fight is not merely faster later, it is gaining
   * speed faster later. A straight line reads as a video that was set running
   * quickly; this reads as one that is winding up.
   */
  const rampTo = tuning.rampTo ?? 1;
  const bend = tuning.rampCurve ?? 1;
  const rampAt = (t: number) =>
    1 +
    (rampTo - 1) * Math.min(1, Math.max(0, (t - hold) / (runFor - hold))) ** bend;

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
  const { turn } = openingFor(setup.seed, anchors, setup.ballCount, setup.steady);
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
      const before = rampAt(time);
      time += dt;
      // Held on the opening picture. Nothing moves and nothing changes hands.
      if (time < hold) continue;

      if (rampTo !== 1) {
        const grow = rampAt(time) / before;
        for (const ball of balls) {
          ball.vx *= grow;
          ball.vy *= grow;
        }
      }

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
          const overlap = (radius * 2 - distance) / 2 + 1e-4;
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
 * Drawn from the seed, a minute to a minute and twenty. The fight itself is not
 * a settable length — it takes as long as it takes — so the seed picks a length
 * first, then hunts for a fight that settles just inside it, and whatever is
 * left over is the winner's victory lap: it keeps moving, holding every thread
 * in the ring, until the clock runs out.
 *
 * A minute is long for this fight, and that is the whole difficulty of the
 * range. Played at the old fixed hold limit, fights settle around thirty seconds
 * at seven balls and around twenty at twelve, so most deals were finishing less
 * than halfway through and the rest of the video would have been victory lap.
 * The hold limit is what the search moves to fix that — see `HOLD_LADDER`.
 */
export const SHORTEST = 60;
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
 * Twelve seconds on a minute-long video is an ending rather than an epilogue,
 * and it is a fifth of the video at most. It used to be nine, and nine was too
 * strict to be worth it: the search either spent its whole budget hunting a
 * fight that finished in exactly the right second, or gave up and handed back a
 * deal with a thirty-second lap. A window the search can actually hit produces
 * shorter endings than a window it misses.
 */
const lapFor = (length: number): number => Math.min(12, length * 0.2);

/**
 * How much rope a ball may hold, tight to loose, as multiples of what it opens
 * with. This is the dial the search turns to make a fight last a minute.
 *
 * The hold limit is what makes the economy one-way: a full ball breaks the
 * thread it runs through instead of taking it, and the arena empties until one
 * ball is left. Tighten it and rope disappears fast and the fight is over in
 * seconds; loosen it and the rope stays in play and the fight runs long. Swept
 * across every density, it moves the median settling time from around ten
 * seconds to past a hundred, monotonically, which is what makes it searchable.
 *
 * It does not go up for ever. Past the top of this ladder breakage is so rare
 * that the round is nearly conserving again, and a conserving round has no
 * winner — the last two trade the same rope until the clock stops.
 */
const HOLD_LADDER = [
  1.05, 1.2, 1.4, 1.6, 1.8, 2.0, 2.3, 2.6, 3.0, 3.4, 4.0, 4.6, 5.3, 6.2, 7.2, 8.4,
];

/**
 * Picks the fight this video will show.
 *
 * Two dials, turned in order. The **hold limit** decides roughly how long fights
 * at this density last, and it is found by bisecting the ladder — four plays to
 * bracket a minute, whatever the ball count and thread count are. The **deal**
 * then decides this particular fight, and deals are tried at the chosen rung
 * until one settles inside the window.
 *
 * Searching the limit first is what makes a one-minute video possible at all. A
 * deal-only search was hunting for the one fight in twenty that ran long enough,
 * and at twelve balls, where fights settle in twenty seconds, there was often no
 * such deal to find; bracketing the limit first puts the whole distribution
 * where the length wants it, and then almost any deal will do.
 */
export function generateRound(
  seed: number,
  threads: number = OPENING_THREADS,
  balls: number = BALL_COUNT,
  size: number = NORMAL_SIZE,
  steady = false,
  tuning: Tuning = DEFAULT_TUNING,
): Round {
  const deal = (attempt: number) => setupFor(seed, attempt, threads, balls, size, steady);
  const length = lengthFor(seed);
  const settleBy = length;
  const settleFrom = Math.max(3, length - lapFor(length));

  // A caller that has fixed the limit itself — the sweeps that chose these
  // numbers — is not looking for the search to move it back.
  const fixed = tuning.holdLimit !== undefined;
  const rungAt = (rung: number): Tuning => ({
    ...tuning,
    holdLimit: tuning.holdLimit ?? Math.max(threads + 1, Math.round(threads * HOLD_LADDER[rung])),
  });

  /** When the fight settled, or `Infinity` if it never did — or not in time. */
  const settlesAt = (attempt: number, rung: number): number =>
    // Run no further than the window: a fight still going at the far edge of it
    // is a reject, and how much further it would have gone does not matter. It
    // also bounds the search, which is the difference between a wait and a hang.
    play(deal(attempt), rungAt(rung), false, settleBy).events.find((e) => e.kind === 'win')?.t ??
    Infinity;

  // Falling short is better than overrunning: a fight cut off by the clock has
  // no ending, only a leader. So an overrun is scored a hundred seconds worse
  // than the longest possible shortfall.
  const miss = (at: number) => (at > settleBy ? at - settleBy + 100 : settleFrom - at);

  let bestAttempt = 0;
  let bestRung = 0;
  let bestMiss = Infinity;

  // Played without recording throughout: the search only wants to know when the
  // fight settled, and keeping four thousand snapshots per discarded attempt is
  // how a phone runs out of memory.
  const probe = (attempt: number, rung: number): number => {
    const at = settlesAt(attempt, rung);
    const gap = miss(at);
    if (gap < bestMiss) {
      bestMiss = gap;
      bestAttempt = attempt;
      bestRung = rung;
    }
    return at;
  };
  const lands = (at: number) => at >= settleFrom && at <= settleBy;

  if (!fixed) {
    let lo = 0;
    let hi = HOLD_LADDER.length - 1;
    while (lo <= hi) {
      const rung = (lo + hi) >> 1;
      const at = probe(0, rung);
      if (lands(at)) return play(deal(0), rungAt(rung), true, length);
      // Settled early means the rope ran out too fast: loosen. Otherwise it ran
      // past the clock, and the limit has to come back down.
      if (at < settleFrom) lo = rung + 1;
      else hi = rung - 1;
    }
  }

  // Then deals, with the limit still following what each one does: one deal is
  // a noisy reading of a rung — fights at the same limit vary by a factor of
  // three — so a rung fixed on the strength of a single play is often the wrong
  // one. Stepping after every miss lets the search walk back and forth across
  // the window instead of hammering one side of it.
  //
  // Capped rather than exhaustive: a seed that has not found its fight in two
  // dozen deals is one whose fights all sit on the wrong side of the window, and
  // the fallback below costs a few seconds of victory lap, which is cheaper than
  // a page that sits still.
  let rung = bestRung;
  for (let attempt = 1; attempt < 40; attempt += 1) {
    const at = probe(attempt, rung);
    if (lands(at)) return play(deal(attempt), rungAt(rung), true, length);
    if (at < settleFrom) rung = Math.min(HOLD_LADDER.length - 1, rung + 1);
    else rung = Math.max(0, rung - 1);
    // Two dozen is enough for almost every seed. The rest of the budget is spent
    // only where it is needed — on a seed whose best fight so far still leaves a
    // long ending — rather than on every generate.
    if (attempt >= 24 && bestMiss <= 8) break;
  }
  return play(deal(bestAttempt), rungAt(bestRung), true, length);
}
