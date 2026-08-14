/**
 * The drop.
 *
 * A chute above a round bowl lets go of a strawberry every third of a second.
 * Fruit piles up, and two of the same kind that touch become one of the next
 * kind up. That is the whole game, and it is the second thing this site makes —
 * the fight in `simulate.ts` is untouched and shares nothing with it but the
 * clock and the encoder.
 *
 * Two things about it were measured off the reference rather than chosen, and
 * both matter to how it reads:
 *
 * - **The bowl is bigger than the frame is wide.** Radius 0.52 of the width,
 *   centred a little above the middle, so the ring is clipped by a few pixels
 *   at the left and right.
 * - **The chute is a conveyor, not a fall.** The column of strawberries above
 *   the bowl is evenly spaced from the top of the frame to the pile — 67 px
 *   apart, moving 6.5 px a frame at 30 fps, both constant. Fruit dropped under
 *   gravity would spread out as it fell. So a fruit descends at a fixed speed
 *   until it meets something, and only then does it start behaving like a body
 *   with weight.
 *
 * Everything is in bowl radii, centred on the bowl, y downwards.
 */

import { FRUITS, TOP_RANK, radiusOf } from './fruit';
import { createRng } from './random';
import { FPS } from './style';

/** Bowl radius as a fraction of the frame width. Measured: 299 px of 576. */
export const BOWL = 0.519;

/** Where the bowl sits in the frame, as fractions of width and height. */
export const BOWL_X = 0.5;
export const BOWL_Y = 0.488;

/** How fast the chute feeds, in bowl radii per second. Measured: 195 px/s of 576. */
const FEED_SPEED = 0.651;

/** Seconds between two fruits leaving the chute. Measured: 67 px of spacing. */
const FEED_EVERY = 0.344;

/**
 * The chute speeds up if the video is running long.
 *
 * The video ends when the last element is made, and the last element costs a
 * hundred and twenty-eight of the first, so at a fixed cadence it arrives
 * anywhere between a minute and a half and three minutes — the pile decides, and
 * the pile is not reliable. Rather than deal the round again and again looking
 * for one that finishes in time, at a second and a half a try, the chute simply
 * feeds faster the longer it goes on: nothing is searched, the ending is
 * guaranteed, and it reads as the thing getting busier.
 *
 * The first three quarters of a minute run at exactly the measured cadence, so
 * the part of the video anybody watches is the reference's, and so that no drop
 * can finish inside a minute.
 */
const RAMP_FROM = 55;
const RAMP_TO = 95;
const FEED_FLOOR = 0.16;
const feedEvery = (t: number, base: number): number =>
  t <= RAMP_FROM
    ? base
    : base + (FEED_FLOOR - base) * Math.min(1, (t - RAMP_FROM) / (RAMP_TO - RAMP_FROM));

/** How long the finished pile is held on screen after the last element is made. */
const TAIL = 3;

/**
 * No video is shorter than this, whatever the pile does.
 *
 * The ladder is normally finished somewhere past a minute and a quarter, but a
 * lucky pile finished one drop in twenty-four inside a minute, and a minute is
 * the floor that was asked for. When that happens the chute simply keeps going
 * to the line — the ladder is full, so any further pair at the top bursts, which
 * is a livelier way to spend twenty seconds than holding on a still bowl.
 */
const MINIMUM = 62;

/**
 * How close two of a kind have to be to become one, as a multiple of touching.
 *
 * A hair over touching, and it earns its keep. Nothing aims here — there is no
 * player — so a pair that never quite meets is the whole reason a drop runs
 * long, and the difference between merging on contact and merging at a tenth of
 * a radius apart is half a minute off the tail of the video. It is invisible:
 * the halos of two pieces that close have been overlapping for a while.
 */
const MERGE_REACH = 1.12;

/** Nothing runs longer than this, whatever the pile is doing. */
const HARD_STOP = 170;

/**
 * Where the column comes from, in bowl radii above the middle.
 *
 * Just off the top of the frame — the middle of the bowl sits at 0.488 of the
 * height, which is 1.67 bowl radii down from the top edge — so the column runs
 * out of the picture rather than starting inside it.
 */
const CHUTE_TOP = -1.78;

/**
 * How far off the middle of the chute a fruit may be let go, in its own radii.
 *
 * Not decoration. A column that falls down the exact middle of a round bowl
 * builds a tower rather than a pile: every contact normal points straight up, so
 * nothing is ever pushed sideways, and the whole video is one stack of fruit
 * growing up the chute. Half a radius of slack is barely visible in the column
 * and is enough to make each landing fall off to one side.
 */
const WOBBLE = 0.5;

/** Sideways shove a merge gives what it makes, in bowl radii per second. */
const SHOVE = 0.45;

/** How hard a merge kicks what it makes upwards, in bowl radii per second. */
const POP = 0.5;

/**
 * Half the neck, in bowl radii. Measured: 41.5 px of 576.
 *
 * The simulation needs it as much as the painter does: the neck is where the
 * chute ends and the fall begins.
 */
export const NECK = 0.139;

/**
 * Where the chute lets go — the height at which the neck meets the bowl.
 *
 * Above this line a fruit is on the conveyor, evenly spaced, exactly as the
 * reference's column is: measured across four videos it holds 67 px of spacing
 * at 6.5 px a frame from the top of the frame to the pile, and neither number
 * drifts, which no falling body does. Below it there is nothing to hold a fruit
 * up, so it falls, and that is where the weight in the picture comes from.
 */
const MOUTH = -Math.sqrt(1 - NECK * NECK);

/**
 * Gravity, in bowl radii per second squared.
 *
 * Weak, and measured off a rebound rather than off a fall. A piece coming off
 * the pile in the reference climbs eighteen pixels in a fifth of a second and
 * comes back down in about the same, which puts gravity near three bowl radii a
 * second squared — a twentieth of earth's, and the reason the whole thing reads
 * as floating.
 *
 * A loose piece drifting through open space measures far weaker still, but that
 * is not a free fall: it is a piece leaning on something. The arc is the honest
 * sample, so this sits just under it.
 *
 * Weak gravity is also what makes the bounce worth having: a quarter of an
 * impact climbs back a tenth of the bowl and takes a third of a second to do it,
 * where the same rebound under a hard gravity would be a twitch.
 */
const GRAVITY = 2.4;

/** Physics substeps per frame, and relaxation passes per substep. */
const SUBSTEPS = 8;
const PASSES = 3;

/**
 * How much of an impact comes back as bounce.
 *
 * A quarter, which is fruit and not a marble: dropped the height of the bowl it
 * comes back up about a tenth of it, which is the rebound measured off the
 * reference to within a few pixels. It only applies to a real impact — below
 * `CALM` a contact takes everything, or a pile of a dozen fruit would tremble
 * for the whole video instead of settling.
 */
const BOUNCE = 0.28;
const CALM = 0.45;

/**
 * How hard a contact has to be to make a noise.
 *
 * Higher than the bounce threshold, and deliberately: a pile settling is dozens
 * of small knocks a second, and ticking on every one of them turns a drop into
 * rain. This is roughly the speed of a fruit that has fallen a third of the bowl.
 */
const LOUD = 1.1;

/** Sliding is slowed on contact, which is what lets a pile hold its shape. */
const RUB = 0.82;

/** Bled off every substep so a pile stops trembling and settles. */
const DRAG = 0.9985;

/** Below this speed a resting fruit is simply stopped. */
const STILL = 0.02;

/**
 * The neighbour grid.
 *
 * Every pair of pieces used to be tested against every other, three times a
 * substep and eight substeps a frame. At sixty pieces in the bowl that is a
 * hundred thousand tests a frame and a ninety-second drop took sixteen seconds
 * to play out — fine on a laptop, a frozen page on a phone, and far too slow to
 * play one twice.
 *
 * So the bowl is divided into cells a little wider than a middling piece, each
 * piece is filed under every cell its box covers, and only pieces that share a
 * cell are tested. Two pieces that touch have overlapping boxes and therefore
 * share a cell, so nothing is missed; a pair sharing several cells is settled in
 * the one holding the point between them, so nothing is done twice.
 */
const CELL = 0.16;
const GRID_LEFT = -1.05;
const GRID_TOP = CHUTE_TOP - 0.1;
const GRID_W = Math.ceil(2.1 / CELL);
const GRID_H = Math.ceil((1.05 - GRID_TOP) / CELL);
const CELLS = GRID_W * GRID_H;
const cellOf = (x: number, y: number): number => {
  const ix = Math.min(GRID_W - 1, Math.max(0, Math.floor((x - GRID_LEFT) / CELL)));
  const iy = Math.min(GRID_H - 1, Math.max(0, Math.floor((y - GRID_TOP) / CELL)));
  return iy * GRID_W + ix;
};

export type DropEventKind = 'land' | 'merge' | 'burst';

export interface DropEvent {
  /** Seconds from the start. */
  t: number;
  kind: DropEventKind;
  /** The rank made, for a merge; the rank that landed, for a landing. */
  rank: number;
}

/** One fruit, as the renderer sees it. */
export interface Piece {
  id: number;
  rank: number;
  x: number;
  y: number;
  /** Seconds since this one was made by a merge, or -1 if it fell in. */
  fresh: number;
}

export interface DropFrame {
  pieces: Piece[];
}

export interface DropSetup {
  seed: number;
  /** How many ranks are in play. Fewer means the pile turns over faster. */
  ranks: number;
  /** Seconds between two releases. Left out means the measured cadence. */
  every?: number;
}

export interface DropRound {
  setup: DropSetup;
  frames: DropFrame[];
  events: DropEvent[];
  /** The best fruit the pile reached. */
  best: number;
  durationInFrames: number;
  duration: number;
}

interface Body {
  id: number;
  rank: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  /** Still on the conveyor: constant speed, nothing touches it yet. */
  riding: boolean;
  /** Seconds left of the swell a merge leaves behind. */
  fresh: number;
  /** When this one last took a real knock, so one impact is not counted twice. */
  hitAt: number;
}

/** How long the swell after a merge lasts. */
const SWELL = 0.28;

/**
 * How long a video runs, and how the pile is dealt.
 *
 * The same rule as the fight: the length comes from the seed. The drop has no
 * ending to hunt for — the chute never stops — so the clock is the whole of it.
 */
export { lengthFor } from './simulate';

/**
 * Plays a drop out.
 *
 * `record` off keeps no frames, which is what the occupancy checks use.
 */
export function playDrop(setup: DropSetup, seconds: number, record = true): DropRound {
  const rng = createRng(setup.seed ^ 0x5bd1e995);
  const top = Math.min(TOP_RANK, Math.max(3, setup.ranks - 1));

  const bodies: Body[] = [];
  const frames: DropFrame[] = [];
  const events: DropEvent[] = [];
  let best = 0;
  let nextId = 0;

  const dt = 1 / (FPS * SUBSTEPS);
  const total = Math.round(Math.min(seconds, HARD_STOP) * FPS);

  /**
   * The column starts full, exactly as the reference opens: strawberries all the
   * way from the top of the frame down to the mouth of the bowl, evenly spaced.
   * An empty chute would spend the first second of every video showing nothing.
   */
  const base = setup.every ?? FEED_EVERY;
  const spacing = FEED_SPEED * base;
  const wobble = () => (rng.next() - 0.5) * 2 * WOBBLE * radiusOf(0);
  for (let y = -radiusOf(0); y > CHUTE_TOP; y -= spacing) {
    bodies.push({
      id: nextId++,
      rank: 0,
      x: wobble(),
      y,
      vx: 0,
      vy: FEED_SPEED,
      riding: true,
      fresh: 0,
      hitAt: -1,
    });
  }
  let time = 0;
  let sinceFeed = 0;
  /** When the ladder was finished, and when the video stops because of it. */
  let topAt = Infinity;
  let endAt = Infinity;

  // Rebuilt every substep by counting sort, into arrays that are reused rather
  // than reallocated — this runs half a million times in a long drop.
  const counts = new Int32Array(CELLS + 1);
  const at = new Int32Array(CELLS + 1);
  let filed = new Int32Array(256);
  const shelve = (): void => {
    counts.fill(0);
    let entries = 0;
    for (const body of bodies) {
      if (body.riding) continue;
      const r = radiusOf(body.rank);
      const lo = cellOf(body.x - r, body.y - r);
      const hi = cellOf(body.x + r, body.y + r);
      const x0 = lo % GRID_W;
      const x1 = hi % GRID_W;
      const y0 = (lo - x0) / GRID_W;
      const y1 = (hi - x1) / GRID_W;
      for (let iy = y0; iy <= y1; iy += 1) {
        for (let ix = x0; ix <= x1; ix += 1) {
          counts[iy * GRID_W + ix + 1] += 1;
          entries += 1;
        }
      }
    }
    for (let c = 0; c < CELLS; c += 1) counts[c + 1] += counts[c];
    if (filed.length < entries) filed = new Int32Array(entries * 2);
    at.set(counts);
    for (let i = 0; i < bodies.length; i += 1) {
      const body = bodies[i];
      if (body.riding) continue;
      const r = radiusOf(body.rank);
      const lo = cellOf(body.x - r, body.y - r);
      const hi = cellOf(body.x + r, body.y + r);
      const x0 = lo % GRID_W;
      const x1 = hi % GRID_W;
      const y0 = (lo - x0) / GRID_W;
      const y1 = (hi - x1) / GRID_W;
      for (let iy = y0; iy <= y1; iy += 1) {
        for (let ix = x0; ix <= x1; ix += 1) {
          const c = iy * GRID_W + ix;
          filed[at[c]] = i;
          at[c] += 1;
        }
      }
    }
  };

  const overlaps = (x: number, y: number, r: number, skip: number): boolean => {
    for (const other of bodies) {
      if (other.id === skip) continue;
      const gap = radiusOf(other.rank) + r;
      const dx = other.x - x;
      const dy = other.y - y;
      if (dx * dx + dy * dy < gap * gap) return true;
    }
    return false;
  };

  /**
   * Two of a kind that touch become one of the next kind, at the point between
   * them. At the top of the ladder there is nothing to become, so they burst and
   * the room they were taking comes back — which is what lets the chute keep
   * feeding for as long as the clock runs.
   */
  const settle = (): void => {
    for (let round = 0; round < 4; round += 1) {
      let merged = false;
      if (round > 0) shelve();
      for (let cell = 0; cell < CELLS && !merged; cell += 1) {
        const from = counts[cell];
        const to = counts[cell + 1];
        for (let ai = from; ai < to && !merged; ai += 1) {
          const i = filed[ai];
          const a = bodies[i];
          for (let bi = ai + 1; bi < to; bi += 1) {
            const j = filed[bi];
            const b = bodies[j];
            if (b.rank !== a.rank) continue;
            const reach = (radiusOf(a.rank) + radiusOf(b.rank)) * MERGE_REACH;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            if (dx * dx + dy * dy > reach * reach) continue;

            const x = (a.x + b.x) / 2;
            const y = (a.y + b.y) / 2;
            const vx = (a.vx + b.vx) / 2;
            const vy = (a.vy + b.vy) / 2;
            const rank = a.rank;
            // Indices into `bodies`, and the higher one first so the lower stays
            // where it is.
            const [lo, hi] = i < j ? [i, j] : [j, i];
            bodies.splice(hi, 1);
            bodies.splice(lo, 1);
            if (rank >= top) {
              // Nothing above the top of the ladder to become. The bowl has been
              // filled, and that is the end of the video.
              events.push({ t: time, kind: 'burst', rank });
              best = Math.max(best, rank);
              if (topAt === Infinity) topAt = time;
            } else {
              bodies.push({
                id: nextId++,
                rank: rank + 1,
                x,
                y,
                // Shoved off to one side. Two fruits meeting head-on leave their
                // replacement with nowhere to go but up the middle, and a pile
                // that only ever grows upwards is a tower.
                vx: vx + (rng.next() - 0.5) * 2 * SHOVE,
                // And kicked upwards, so a merge is a thing that happens rather
                // than a swap of one sprite for another.
                vy: vy - POP,
                riding: false,
                fresh: SWELL,
                hitAt: time,
              });
              best = Math.max(best, rank + 1);
              events.push({ t: time, kind: 'merge', rank: rank + 1 });
              // The last element on the ladder is what the video was for.
              if (rank + 1 >= top && topAt === Infinity) topAt = time;
            }
            merged = true;
            break;
          }
        }
      }
      if (!merged) return;
    }
  };

  for (let frame = 0; ; frame += 1) {
    if (record) {
      frames.push({
        pieces: bodies.map((body) => ({
          id: body.id,
          rank: body.rank,
          x: body.x,
          y: body.y,
          fresh: body.fresh > 0 ? 1 - body.fresh / SWELL : -1,
        })),
      });
    } else {
      frames.length = frame + 1;
    }
    if (frame + 1 >= total || (frame + 1) / FPS >= endAt) break;

    for (let step = 0; step < SUBSTEPS; step += 1) {
      time += dt;
      sinceFeed += dt;
      // Wrapping up: the ladder is finished and the clock has passed the floor.
      if (endAt === Infinity && topAt !== Infinity && time >= MINIMUM) endAt = time + TAIL;

      // The chute lets go on a fixed beat, and holds if the pile has come up to
      // meet it. Feeding into a blocked mouth is how a bowl overflows out of its
      // own ring.
      if (endAt === Infinity && sinceFeed >= feedEvery(time, base)) {
        const x = wobble();
        if (!overlaps(x, CHUTE_TOP, radiusOf(0), -1)) {
          sinceFeed = 0;
          bodies.push({
            id: nextId++,
            rank: 0,
            x,
            y: CHUTE_TOP,
            vx: 0,
            vy: FEED_SPEED,
            riding: true,
            fresh: 0,
            hitAt: -1,
          });
        }
      }

      for (const body of bodies) {
        if (body.fresh > 0) body.fresh = Math.max(0, body.fresh - dt);

        if (body.riding) {
          // Constant speed down the chute, and then the neck ends and it is
          // simply falling. Anything it meets on the way stops the ride early —
          // a pile that has come up into the neck is something to land on.
          const r = radiusOf(body.rank);
          const ahead = body.y + FEED_SPEED * dt;
          if (ahead >= MOUTH || overlaps(body.x, ahead, r, body.id)) {
            body.riding = false;
            body.vy = FEED_SPEED;
          } else {
            body.y = ahead;
          }
          continue;
        }

        body.vy += GRAVITY * dt;
        body.vx *= DRAG;
        body.vy *= DRAG;
        body.x += body.vx * dt;
        body.y += body.vy * dt;
      }

      shelve();
      for (let pass = 0; pass < PASSES; pass += 1) {
        // Fruit against fruit. Equal weights, so an overlap is shared.
        for (let cell = 0; cell < CELLS; cell += 1) {
          const from = counts[cell];
          const to = counts[cell + 1];
          for (let ai = from; ai < to; ai += 1) {
            const a = bodies[filed[ai]];
            for (let bi = ai + 1; bi < to; bi += 1) {
              const b = bodies[filed[bi]];
              const reach = radiusOf(a.rank) + radiusOf(b.rank);
              const dx = b.x - a.x;
              const dy = b.y - a.y;
              const gapSq = dx * dx + dy * dy;
              if (gapSq >= reach * reach || gapSq === 0) continue;
              // Settled where the point between them falls, so a pair filed under
              // two cells is not pushed apart twice.
              if (cellOf(a.x + dx / 2, a.y + dy / 2) !== cell) continue;

              const gap = Math.sqrt(gapSq);
              const nx = dx / gap;
              const ny = dy / gap;
              const overlap = (reach - gap) / 2;
              a.x -= nx * overlap;
              a.y -= ny * overlap;
              b.x += nx * overlap;
              b.y += ny * overlap;

              const closing = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
              if (closing < 0) {
                // A knock worth hearing, and worth bouncing. Slow contacts — a
                // pile shuffling into place — take everything and make no noise.
                const hard = -closing > CALM;
                if (-closing > LOUD && time - a.hitAt > 0.09) {
                  a.hitAt = time;
                  b.hitAt = time;
                  events.push({ t: time, kind: 'land', rank: a.rank });
                }
                const swap = closing * (1 + (hard ? BOUNCE : 0)) * 0.5;
                a.vx += swap * nx;
                a.vy += swap * ny;
                b.vx -= swap * nx;
                b.vy -= swap * ny;
                // What is left of the sliding is rubbed off, which is the
                // difference between a pile and a heap of marbles.
                const tx = -ny;
                const ty = nx;
                const slide = (b.vx - a.vx) * tx + (b.vy - a.vy) * ty;
                const rub = slide * (1 - RUB) * 0.5;
                a.vx += rub * tx;
                a.vy += rub * ty;
                b.vx -= rub * tx;
                b.vy -= rub * ty;
              }
            }
          }
        }

        // The bowl. A circle, so everything rolls towards the middle.
        for (const body of bodies) {
          if (body.riding) continue;
          const r = radiusOf(body.rank);
          const far = Math.sqrt(body.x * body.x + body.y * body.y);
          const wall = 1 - r;
          if (far <= wall || far === 0) continue;
          const nx = body.x / far;
          const ny = body.y / far;
          body.x = nx * wall;
          body.y = ny * wall;
          const into = body.vx * nx + body.vy * ny;
          if (into > 0) {
            const hard = into > CALM;
            if (into > LOUD && time - body.hitAt > 0.09) {
              body.hitAt = time;
              events.push({ t: time, kind: 'land', rank: body.rank });
            }
            const back = 1 + (hard ? BOUNCE : 0);
            body.vx -= into * back * nx;
            body.vy -= into * back * ny;
            const tx = -ny;
            const ty = nx;
            const slide = body.vx * tx + body.vy * ty;
            body.vx -= slide * (1 - RUB) * tx;
            body.vy -= slide * (1 - RUB) * ty;
          }
        }
      }

      for (const body of bodies) {
        if (body.riding) continue;
        if (Math.abs(body.vx) < STILL) body.vx = 0;
        if (Math.abs(body.vy) < STILL) body.vy = 0;
      }

      settle();
    }
  }

  return {
    setup,
    frames,
    events,
    best,
    durationInFrames: frames.length,
    duration: frames.length / FPS,
  };
}

/**
 * How many things are on the ladder.
 *
 * Eight, always. The video ends when the eighth is made, and the eighth costs a
 * hundred and twenty-eight of the first, which is what sets the length.
 */
export const ELEMENTS = FRUITS.length;
