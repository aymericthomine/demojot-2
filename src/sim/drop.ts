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

/**
 * Gravity, in bowl radii per second squared.
 *
 * Only what a fruit does after it lands is under gravity — the fall itself is
 * the conveyor — so this is really the strength of the settling, and it is set
 * so a fruit knocked off a pile crosses the bowl in about a second.
 */
const GRAVITY = 5.2;

/** Physics substeps per frame, and relaxation passes per substep. */
const SUBSTEPS = 8;
const PASSES = 3;

/** How much bounce is left after a contact. Fruit does not bounce much. */
const BOUNCE = 0.12;

/** Sliding is slowed on contact, which is what lets a pile hold its shape. */
const RUB = 0.82;

/** Bled off every substep so a pile stops trembling and settles. */
const DRAG = 0.9985;

/** Below this speed a resting fruit is simply stopped. */
const STILL = 0.02;

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
  const total = Math.round(seconds * FPS);

  /**
   * The column starts full, exactly as the reference opens: strawberries all the
   * way from the top of the frame down to the mouth of the bowl, evenly spaced.
   * An empty chute would spend the first second of every video showing nothing.
   */
  const spacing = FEED_SPEED * FEED_EVERY;
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
    });
  }
  let time = 0;
  let sinceFeed = 0;

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
      for (let i = 0; i < bodies.length; i += 1) {
        const a = bodies[i];
        if (a.riding) continue;
        for (let j = i + 1; j < bodies.length; j += 1) {
          const b = bodies[j];
          if (b.riding || b.rank !== a.rank) continue;
          const reach = radiusOf(a.rank) + radiusOf(b.rank);
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          if (dx * dx + dy * dy > reach * reach) continue;

          const x = (a.x + b.x) / 2;
          const y = (a.y + b.y) / 2;
          const vx = (a.vx + b.vx) / 2;
          const vy = (a.vy + b.vy) / 2;
          const rank = a.rank;
          bodies.splice(j, 1);
          bodies.splice(i, 1);
          if (rank >= top) {
            events.push({ t: time, kind: 'burst', rank });
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
              vy,
              riding: false,
              fresh: SWELL,
            });
            best = Math.max(best, rank + 1);
            events.push({ t: time, kind: 'merge', rank: rank + 1 });
          }
          merged = true;
          break;
        }
        if (merged) break;
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
    if (frame + 1 >= total) break;

    for (let step = 0; step < SUBSTEPS; step += 1) {
      time += dt;
      sinceFeed += dt;

      // The chute lets go on a fixed beat, and holds if the pile has come up to
      // meet it. Feeding into a blocked mouth is how a bowl overflows out of its
      // own ring.
      if (sinceFeed >= FEED_EVERY) {
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
          });
        }
      }

      for (const body of bodies) {
        if (body.fresh > 0) body.fresh = Math.max(0, body.fresh - dt);

        if (body.riding) {
          // Constant speed until it meets something. The moment it does it stops
          // riding and starts falling, keeping the speed it came in with.
          const r = radiusOf(body.rank);
          const ahead = body.y + FEED_SPEED * dt;
          const floor = Math.sqrt(Math.max(0, 1 - body.x * body.x)) - r;
          if (ahead >= floor || overlaps(body.x, ahead, r, body.id)) {
            body.riding = false;
            body.vy = FEED_SPEED;
            events.push({ t: time, kind: 'land', rank: body.rank });
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

      for (let pass = 0; pass < PASSES; pass += 1) {
        // Fruit against fruit. Equal weights, so an overlap is shared.
        for (let i = 0; i < bodies.length; i += 1) {
          const a = bodies[i];
          if (a.riding) continue;
          for (let j = i + 1; j < bodies.length; j += 1) {
            const b = bodies[j];
            if (b.riding) continue;
            const reach = radiusOf(a.rank) + radiusOf(b.rank);
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const gapSq = dx * dx + dy * dy;
            if (gapSq >= reach * reach || gapSq === 0) continue;

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
              const swap = closing * (1 + BOUNCE) * 0.5;
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
            body.vx -= into * (1 + BOUNCE) * nx;
            body.vy -= into * (1 + BOUNCE) * ny;
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

/** How many ranks a round may use. Fewer ranks means the pile turns over. */
export const FEWEST_RANKS = 5;
export const MOST_RANKS = FRUITS.length;

export const clampRanks = (n: number): number =>
  Math.max(FEWEST_RANKS, Math.min(MOST_RANKS, Math.round(n) || MOST_RANKS));
