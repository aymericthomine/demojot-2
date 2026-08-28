/**
 * Hot potato.
 *
 * The same twelve months in the same ring, but the thing being passed around is
 * a fuse. One month is holding it; whenever the holder touches another month
 * that is still in, the potato changes hands. When the fuse runs out, whoever is
 * holding it is out — and the last month still in survives.
 *
 * Two rules give the mode its shape:
 *
 * 1. **Out months become walls.** A month that goes out does not leave the
 *    picture: it stops dead and stays where it fell, and everybody else bounces
 *    off it. So the arena silts up as the game runs, the survivors get less
 *    room, and the last minute is played in a pinball table rather than an empty
 *    circle. It is also the honest way to lose twelve balls one at a time —
 *    removing them would make the arena emptier and the game calmer exactly when
 *    it should be getting worse.
 * 2. **The fuse never stops.** It is not a race to reach anything; it is a race
 *    to not be holding. Nothing a month does can add time, so there is no way to
 *    play for safety, only to pass it on.
 *
 * **The length is not searched for.** Eleven months go out, one per fuse, so a
 * round is eleven fuses and an ending — which means the length is a sum rather
 * than a hunt. The seed picks the fuse and the length follows; a floor of sixty
 * seconds and a ceiling of seventy-four are what the fuse is derived from,
 * rather than the other way about, so the number anybody actually has an
 * opinion about is the one written down.
 */

import { BALL, MONTHS } from './months';
import { createRng } from './random';
import { FPS } from './style';

/** Physics substeps per rendered frame. */
const SUBSTEPS = 4;

/** How fast a month travels, in arena radii a second. The fight's own pace. */
const SPEED = 0.58;

/** Where the twelve start, as a fraction of the arena. */
const OPENING_RING = 0.725;

/** Which month stands at twelve o'clock — October, then round clockwise. */
const FIRST_AT_TOP = 9;

/**
 * The run a round is meant to make, in seconds.
 *
 * Stated as the length and not as the fuse, because the length is the thing
 * anybody has an opinion about — a minute is the floor a video has to clear —
 * and the fuse is only how it is arrived at. Written the other way round, a
 * floor of sixty seconds is a sum somebody has to redo by hand every time the
 * cast or the ending changes.
 */
const SHORTEST = 60;
const LONGEST = 74;

/**
 * How long a month is safe from being handed it straight back.
 *
 * Two balls that touch do not separate in one step — they stay overlapped for a
 * few — so without this the potato would flicker between the pair for as long as
 * the contact lasted, which reads as a fault and wastes the fuse on nobody.
 */
const HANDS_OFF = 0.3;

/** Seconds of survivor held after the last month goes out. */
const OUTRO = 2;

/**
 * The fuse, in seconds, at its shortest and its longest — derived, not chosen.
 *
 * Eleven months go out, one per fuse, and then the ending: that sum *is* the
 * video, so the fuse is the length divided by the number of times it has to
 * burn. The seed picks one and it holds for the whole round, which is also the
 * only reason two rounds run to different lengths — eleven fixed fuses would
 * make every video the same length to the frame, and identical durations are
 * the first thing a duplicate detector reads.
 */
const FUSES = MONTHS.length - 1;
const FUSE_SHORT = (SHORTEST - OUTRO) / FUSES;
const FUSE_LONG = (LONGEST - OUTRO) / FUSES;

/**
 * How fast the holder's band blinks, in flashes a second.
 *
 * From slow at the top of a fuse to frantic at the bottom of it, because the
 * number in the middle only shows for the last three seconds and the ring needs
 * to carry the rest. Squared rather than straight so the acceleration is felt
 * near the end rather than spread evenly over the whole burn — a rate that rises
 * steadily reads as a constant, and a constant is not a countdown.
 */
const BLINK_SLOW = 1.2;
const BLINK_FAST = 7.5;

/**
 * How long a month stays quiet after ringing off something.
 *
 * A soundtrack is a list of moments, and a month wedged in a corner produces
 * contact on every substep — which is a real contact but not a real *knock*.
 * Month gets away without this because its arena is empty; here the floor fills
 * with eleven walls, and unguarded the list ran to twenty-five thousand hits on
 * a round where Month has eight hundred.
 */
const KNOCK_GAP = 0.08;

export interface PotatoState {
  x: number;
  y: number;
  /** Out of the game: frozen where it fell, and a wall from then on. */
  out: boolean;
}

export interface PotatoFrame {
  balls: readonly PotatoState[];
  /** Who is holding it, or -1 once the game is decided. */
  holder: number;
  /** Seconds left on the fuse. */
  fuse: number;
  /** Nought while the game is on, one from the moment it is decided. */
  reveal: number;
  /**
   * Whether the holder's band is lit on this frame.
   *
   * Carried per frame rather than worked out from the fuse when painting: the
   * rate changes as the fuse burns, so the phase is the integral of a changing
   * rate and there is no closed form to read off a single frame's clock.
   */
  flash: boolean;
}

export type PotatoEventKind = 'wall' | 'pass' | 'out' | 'win';

export interface PotatoEvent {
  t: number;
  kind: PotatoEventKind;
  month: number;
}

export interface PotatoRound {
  seed: number;
  frames: PotatoFrame[];
  events: PotatoEvent[];
  /** The month left standing. */
  survivor: number;
  /** The fuse this round was played with, in seconds. */
  fuse: number;
  duration: number;
  durationInFrames: number;
}

interface Live {
  x: number;
  y: number;
  vx: number;
  vy: number;
  out: boolean;
  /** When this month last had the potato taken off it. */
  passedAt: number;
  /** When this month last rang off something, for the soundtrack's sake. */
  knockedAt: number;
}

/**
 * The opening: the twelve on one ring, as a clock face.
 *
 * The same picture every time and deliberately so — it is the frame a viewer
 * reads before anything moves, and it is the reference's own arrangement. The
 * seed decides which way each ball is fired, who starts holding, and how long
 * the fuse is; nothing else.
 */
function start(seed: number): { balls: Live[]; holder: number; fuse: number } {
  const rng = createRng(seed ^ 0x3c6ef372);
  const balls: Live[] = new Array<Live>(MONTHS.length);
  for (let slot = 0; slot < MONTHS.length; slot += 1) {
    // Twelve o'clock, then clockwise: the canvas has y downwards, so an angle
    // starting at minus a quarter turn and increasing runs clockwise on screen.
    const angle = -Math.PI / 2 + (slot / MONTHS.length) * Math.PI * 2;
    const month = (FIRST_AT_TOP + slot) % MONTHS.length;
    const heading = rng.next() * Math.PI * 2;
    balls[month] = {
      x: Math.cos(angle) * OPENING_RING,
      y: Math.sin(angle) * OPENING_RING,
      vx: Math.cos(heading) * SPEED,
      vy: Math.sin(heading) * SPEED,
      out: false,
      passedAt: -99,
      knockedAt: -99,
    };
  }
  return {
    balls,
    holder: Math.floor(rng.next() * MONTHS.length) % MONTHS.length,
    fuse: FUSE_SHORT + rng.next() * (FUSE_LONG - FUSE_SHORT),
  };
}

/**
 * Who picks it up when the holder goes out.
 *
 * The nearest month still in, which is the only choice that reads as a thing
 * that happened rather than as a thing that was decided: the potato was dropped
 * where its holder fell, and whoever was closest has it now.
 */
function nearestAlive(balls: readonly Live[], from: number): number {
  let best = -1;
  let closest = Infinity;
  for (let i = 0; i < balls.length; i += 1) {
    if (balls[i].out || i === from) continue;
    const gap = (balls[i].x - balls[from].x) ** 2 + (balls[i].y - balls[from].y) ** 2;
    if (gap < closest) {
      closest = gap;
      best = i;
    }
  }
  return best;
}

export function generatePotato(seed: number): PotatoRound {
  const { balls, holder: opening, fuse: length } = start(seed);
  const frames: PotatoFrame[] = [];
  const events: PotatoEvent[] = [];
  const dt = 1 / (FPS * SUBSTEPS);
  const wall = 1 - BALL;
  const touching = (BALL * 2) ** 2;

  let holder = opening;
  let fuse = length;
  let time = 0;
  let phase = 0;
  let decidedAt = -1;
  let survivor = -1;

  const cap = Math.round((MONTHS.length * FUSE_LONG + OUTRO + 4) * FPS);
  for (let frame = 0; frame < cap; frame += 1) {
    frames.push({
      balls: balls.map((b) => ({ x: b.x, y: b.y, out: b.out })),
      holder: decidedAt >= 0 ? -1 : holder,
      fuse: Math.max(0, fuse),
      reveal: decidedAt >= 0 ? 1 : 0,
      flash: Math.floor(phase) % 2 === 0,
    });
    if (decidedAt >= 0 && frame >= decidedAt + Math.round(OUTRO * FPS)) break;

    for (let step = 0; step < SUBSTEPS; step += 1) {
      time += dt;

      for (let i = 0; i < balls.length; i += 1) {
        const ball = balls[i];
        if (ball.out) continue;
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;
        const distance = Math.hypot(ball.x, ball.y);
        if (distance > wall) {
          // Reflected about the inward normal and put back on the wall rather
          // than left outside it: a ball nudged past the rim would reflect again
          // next step and buzz along the edge.
          const nx = ball.x / distance;
          const ny = ball.y / distance;
          const along = ball.vx * nx + ball.vy * ny;
          ball.vx -= 2 * along * nx;
          ball.vy -= 2 * along * ny;
          ball.x = nx * wall;
          ball.y = ny * wall;
          if (time - ball.knockedAt > KNOCK_GAP) {
            ball.knockedAt = time;
            events.push({ t: time, kind: 'wall', month: i });
          }
        }
      }

      for (let i = 0; i < balls.length; i += 1) {
        for (let j = i + 1; j < balls.length; j += 1) {
          const a = balls[i];
          const b = balls[j];
          if (a.out && b.out) continue;
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const gap = dx * dx + dy * dy;
          if (gap >= touching || gap === 0) continue;
          const distance = Math.sqrt(gap);
          const nx = dx / distance;
          const ny = dy / distance;
          const overlap = BALL * 2 - distance;

          if (a.out || b.out) {
            // One of them is a wall. The wall does not move and does not take
            // any speed off the other: it is scenery with a curved face, and a
            // month that bounces off it leaves at the speed it arrived.
            //
            // `sign * n` points from the wall towards the month, so the month is
            // coming *in* when its speed along that direction is negative. Read
            // the other way round it never turns anything away: the month is
            // pushed clear each substep, keeps its speed into the wall, and
            // arrives again on the next one — which sounds like a month held
            // against a wall ringing two hundred times a second, and did.
            const moving = a.out ? b : a;
            const away = a.out ? 1 : -1;
            const along = moving.vx * nx + moving.vy * ny;
            if (along * away < 0) {
              moving.vx -= 2 * along * nx;
              moving.vy -= 2 * along * ny;
              const who = a.out ? j : i;
              if (time - moving.knockedAt > KNOCK_GAP) {
                moving.knockedAt = time;
                events.push({ t: time, kind: 'wall', month: who });
              }
            }
            moving.x += nx * overlap * away;
            moving.y += ny * overlap * away;
            continue;
          }

          // Equal masses trading the part of their speed that lies along the
          // line between them: the arena neither gains nor loses energy.
          const push = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          if (push > 0) {
            a.vx -= push * nx;
            a.vy -= push * ny;
            b.vx += push * nx;
            b.vy += push * ny;
          }
          a.x -= nx * overlap * 0.5;
          a.y -= ny * overlap * 0.5;
          b.x += nx * overlap * 0.5;
          b.y += ny * overlap * 0.5;

          if (decidedAt < 0 && (i === holder || j === holder)) {
            const taker = i === holder ? j : i;
            if (time - balls[taker].passedAt > HANDS_OFF) {
              balls[holder].passedAt = time;
              holder = taker;
              events.push({ t: time, kind: 'pass', month: taker });
            }
          }
        }
      }

      if (decidedAt >= 0) continue;

      fuse -= dt;
      // The phase is accumulated rather than derived, because the rate it is
      // accumulating at is itself a function of how much fuse is left.
      const burnt = 1 - Math.max(0, fuse) / length;
      phase += (BLINK_SLOW + (BLINK_FAST - BLINK_SLOW) * burnt * burnt) * dt;
      if (fuse <= 0) {
        balls[holder].out = true;
        balls[holder].vx = 0;
        balls[holder].vy = 0;
        events.push({ t: time, kind: 'out', month: holder });

        const left = balls.filter((b) => !b.out).length;
        if (left <= 1) {
          survivor = balls.findIndex((b) => !b.out);
          decidedAt = frames.length;
          events.push({ t: time, kind: 'win', month: survivor });
        } else {
          holder = nearestAlive(balls, holder);
          fuse = length;
        }
      }
    }
  }

  const durationInFrames = frames.length;
  return {
    seed,
    frames,
    events,
    // Twelve balls and eleven fuses always leaves one, but a survivor of -1
    // would index the palette off its end and paint nothing.
    survivor: survivor >= 0 ? survivor : 0,
    fuse: length,
    duration: durationInFrames / FPS,
    durationInFrames,
  };
}
