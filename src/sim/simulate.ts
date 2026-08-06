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
const HARD_CAP = 110;

/**
 * Most threads a single touch of the wall can win.
 *
 * A fan should *grow* — that is the thing people are watching. Let one touch
 * take every free slot it can reach and a ball swallows a dead rival's whole
 * sector in a frame, then loses it again just as fast; the fans end up flickering
 * between four threads and twenty instead of climbing.
 */
const CLAIM_LIMIT = 3;

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
   * Radians between neighbouring threads, and so how much wall a ball takes per
   * touch. The rim holds a whole number of these and no more: it is divided into
   * slots, every slot is claimed at the start, and from then on the fight is over
   * slots. Cutting a thread frees one; touching the wall is how a free one is
   * taken. That is why the picture stays full while the fans get bigger.
   */
  threadStep: number;
  /**
   * How close a ball must come to a thread to cut it, as a fraction of its drawn
   * radius. One, and it should stay one: a ball cannot cross a thread without
   * cutting it, so anything the ball visibly touches goes. Below one, threads
   * pass through the middle of a ball and survive, which is the first thing
   * anybody notices.
   */
  hitRadius: number;
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
  threadStep: (Math.PI * 2) / (BALL_COUNT * OPENING_THREADS),
  hitRadius: 1,
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
  /** When this ball last bounced off another, so one contact is not counted twice. */
  clashedAt: number;
}

/** Do two segments cross? Standard orientation test, endpoints excluded. */
function segmentsCross(
  ax: number, ay: number, bx: number, by: number,
  cx: number, cy: number, dx: number, dy: number,
): boolean {
  const side = (px: number, py: number, qx: number, qy: number, rx: number, ry: number): number =>
    (qx - px) * (ry - py) - (qy - py) * (rx - px);
  const d1 = side(ax, ay, bx, by, cx, cy);
  const d2 = side(ax, ay, bx, by, dx, dy);
  const d3 = side(cx, cy, dx, dy, ax, ay);
  const d4 = side(cx, cy, dx, dy, bx, by);
  return ((d1 > 0) !== (d2 > 0)) && ((d3 > 0) !== (d4 > 0));
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

    // Everybody's fan covers its own slice of the rim, and the slices meet: the
    // wall is claimed edge to edge from the first frame. Nobody can grow until
    // somebody loses, which is what makes the opening a knife fight and the rest
    // of the video a land grab.
    const threads: number[] = [];
    for (let k = 0; k < OPENING_THREADS; k += 1) {
      threads.push(around + (k - (OPENING_THREADS - 1) / 2) * tuning.threadStep);
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

/** Signed angular difference in (-pi, pi]. */
function angleDelta(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

/**
 * Where the new threads go.
 *
 * Not simply at the point the ball touched: threads have to stay a *contiguous*
 * fan, or they cross each other the moment two balls share ground. A fan grows
 * from whichever of its two edges faces the strike, outward, taking every free
 * slot it finds until it reaches the strike point or runs into somebody else's
 * rope. So a ball that runs into a stretch of wall nobody holds — the arc a
 * beaten ball left behind — comes away with a handful of threads at once, and a
 * ball that hits a wall already spoken for comes away with nothing.
 *
 * That single rule is what gives the picture its shape: the rim ends up divided
 * into coloured sectors that meet without ever tangling, and the sectors of the
 * survivors swallow the sectors of the dead.
 */
function claimAt(balls: Live[], ball: Live, contact: number, step: number): number[] {
  if (ball.threads.length === 0) return [];

  // The two edges of the fan, found by walking round from the first thread.
  const sorted = [...ball.threads].sort(
    (a, b) => angleDelta(a, ball.threads[0]) - angleDelta(b, ball.threads[0]),
  );
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  // Grow from the edge the ball struck nearest, in the direction of the strike.
  const toFirst = angleDelta(contact, first);
  const toLast = angleDelta(contact, last);
  const fromLast = Math.abs(toLast) < Math.abs(toFirst);
  const edge = fromLast ? last : first;
  const direction = fromLast ? 1 : -1;
  // How far round the strike is, in slots. Growing past it would be claiming
  // wall the ball never went near.
  const span = Math.min(CLAIM_LIMIT, Math.floor(Math.abs(fromLast ? toLast : toFirst) / step));

  const taken: number[] = [];
  for (let k = 1; k <= span; k += 1) {
    const candidate = edge + direction * step * k;
    let free = true;
    for (const other of balls) {
      if (other === ball || !other.alive) continue;
      for (const theirs of other.threads) {
        if (Math.abs(angleDelta(candidate, theirs)) < step * 0.9) {
          free = false;
          break;
        }
      }
      if (!free) break;
    }
    // Somebody else's rope is a wall: the fan stops there rather than jumping it,
    // which is the whole reason threads never end up crossing.
    if (!free || crossesAnyThread(balls, ball, candidate)) break;
    taken.push(candidate);
  }
  return taken;
}

/**
 * Threads are rope, not light: they cannot pass through one another. Keeping
 * that true is what gives the picture its shape — each ball ends up holding a
 * contiguous slice of the wall, and the fans meet without ever tangling.
 *
 * The rule is on the laying: a thread is never pinned where it would cross rope
 * that is already there, so fans grow as contiguous sectors that meet edge to
 * edge. A thread already pinned is not moved or taken back afterwards — the rim
 * end is fixed and only the ball end travels, so late in a round, when two balls
 * are dragging fans of twenty across each other, lines do pass over lines. The
 * reference does exactly the same thing, and undoing it after the fact meant
 * deleting threads nobody had cut, which changed the fight.
 */
function crossesAnyThread(balls: Live[], owner: Live, angle: number): boolean {
  const ax = owner.x;
  const ay = owner.y;
  const bx = Math.cos(angle);
  const by = Math.sin(angle);
  for (const other of balls) {
    if (!other.alive) continue;
    for (const theirs of other.threads) {
      if (other === owner) continue;
      if (
        segmentsCross(ax, ay, bx, by, other.x, other.y, Math.cos(theirs), Math.sin(theirs))
      ) {
        return true;
      }
    }
  }
  return false;
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
          // start — and it is also the most exposed thing a ball can do. Rope
          // cannot pass through rope, so a thread that would cross one already
          // there is simply not laid: the wall is territory, and it has to be
          // free to be claimed.
          const claimed = claimAt(balls, ball, Math.atan2(ny, nx), tuning.threadStep);
          if (claimed.length > 0) ball.threads = [...ball.threads, ...claimed];
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

      // A ball cannot cross a thread without cutting it. Every thread it is
      // touching goes, this frame, with nothing to wait for: no per-pair timer,
      // no one-at-a-time. A cut thread is gone from the list, so there is nothing
      // to double-charge — and anything less than this leaves threads running
      // straight through the middle of a ball, which is the first thing anybody
      // notices.
      for (const ball of balls) {
        if (!ball.alive) continue;

        for (const other of balls) {
          if (other === ball || !other.alive) continue;

          const survivors: number[] = [];
          let cuts = 0;
          let hitAngle = 0;
          for (const angle of other.threads) {
            const hit = closestOnSegment(
              ball.x,
              ball.y,
              other.x,
              other.y,
              Math.cos(angle),
              Math.sin(angle),
            );
            // `t` runs from the owner to the rim along a thread of length
            // `hypot(cos - x, sin - y)`, so this is the contact's distance from
            // the hub in arena units.
            const fromHub = hit.t * Math.hypot(Math.cos(angle) - other.x, Math.sin(angle) - other.y);
            if (hit.distanceSq < reach && fromHub > tuning.hubGuard) {
              cuts += 1;
              hitAngle = angle;
              continue;
            }
            survivors.push(angle);
          }
          if (cuts === 0) continue;

          other.threads = survivors;

          if (tuning.threadBounce > 0) {
            // Rope turns the ball that ran into it. Without this a ball crosses a
            // fan of twenty in one straight line and takes the lot, and the duel
            // that should be the body of the video is over in six seconds.
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
          for (let k = 0; k < cuts; k += 1) {
            events.push({ t: time, kind: 'cut', ball: ball.index, alive: countAlive() });
          }

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

  // A minute-long fight has to be a close one, and close ones are rare, so a
  // seed aiming there is allowed to look much harder before it settles.
  const tries = long ? 60 : 20;
  for (let attempt = 0; attempt < tries; attempt += 1) {
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
