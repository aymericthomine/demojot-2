/**
 * Hold the centre.
 *
 * Twelve balls, one a month, loose in the same ring the fight uses. There is a
 * zone in the middle; while exactly one ball is inside it, that month is
 * *holding*, and the seconds it holds are added up. Every ball wears a ring
 * showing how much of the target it has banked, and the video ends at the moment
 * one of those rings closes.
 *
 * Two rules do all the work:
 *
 * 1. **Only alone counts.** Two balls in the zone at once and nobody scores —
 *    which is what stops a scrum in the middle from being the whole game and
 *    makes a clean run through the middle worth something.
 * 2. **Nothing is ever lost.** Held seconds are banked, not defended. A month
 *    that led early and never came back still finishes with its arc where it
 *    was, and the picture stays a scoreboard rather than a fight.
 *
 * **The length is exact and there is no search for it.** The trajectories do not
 * depend on the target at all — the target only decides when to stop — so the
 * round is played once to a hard cap, the hold curves are recorded, and then the
 * target is *read off* them: it is whatever the leader has banked at the second
 * the video is meant to end. The winner is that leader, its ring closes on the
 * final frame by construction, and every other mode's search over a dial is
 * unnecessary here.
 */

import { createRng } from './random';
import { lengthFor } from './simulate';
import { FPS } from './style';

/** Physics substeps per rendered frame. */
const SUBSTEPS = 4;

/**
 * The cast, in calendar order, with the colours off the reference.
 *
 * Twelve is not a choice: it is the months, and the mode is the question the
 * reference asks with them.
 */
export const MONTHS: readonly { label: string; color: string }[] = [
  { label: 'JAN', color: '#e8194b' },
  { label: 'FEB', color: '#f5811f' },
  { label: 'MAR', color: '#e8b71a' },
  { label: 'APR', color: '#9ee626' },
  { label: 'MAY', color: '#22c55e' },
  { label: 'JUN', color: '#14b789' },
  { label: 'JUL', color: '#3ad6e8' },
  { label: 'AUG', color: '#2f5fe0' },
  { label: 'SEP', color: '#6f3ae0' },
  { label: 'OCT', color: '#c81ee0' },
  { label: 'NOV', color: '#e81e6f' },
  { label: 'DEC', color: '#96613a' },
];

/** Ball radius, in arena units. Measured off the reference: 22 px of 257. */
export const BALL = 0.085;

/** The zone in the middle, in arena units. Measured the same way: 67 of 257. */
export const ZONE = 0.26;

/**
 * How fast a ball travels, in arena radii a second.
 *
 * Slower than the fight, because this is a game of drifting through a place
 * rather than of running somebody down: at the fight's speed the middle is
 * crossed too quickly for a hold to mean anything.
 */
const SPEED = 0.62;

/** Long enough that the target can always be read off the curves. */
const HARD_CAP = 150;

/** Seconds the title stays up, and how long it takes to go. */
export const TITLE_HOLD = 4;
export const TITLE_FADE = 1.6;

export interface MonthState {
  x: number;
  y: number;
}

export interface MonthFrame {
  balls: readonly MonthState[];
  /** Seconds banked, per month, at this frame. */
  hold: readonly number[];
  /** Who is scoring right now, or -1 when the zone is empty or contested. */
  holder: number;
}

export type MonthEventKind = 'wall' | 'clash' | 'take' | 'win';

export interface MonthEvent {
  t: number;
  kind: MonthEventKind;
  month: number;
}

export interface MonthsRound {
  seed: number;
  frames: MonthFrame[];
  events: MonthEvent[];
  winner: number;
  /** Seconds of holding a ring stands for. */
  target: number;
  duration: number;
  durationInFrames: number;
}

interface Live {
  x: number;
  y: number;
  vx: number;
  vy: number;
  clashedAt: number;
}

/**
 * The opening: twelve balls on two rings, well clear of the middle.
 *
 * Off the centre on purpose — a ball starting inside the zone would be banking
 * seconds before the viewer has read what the game is.
 */
function start(seed: number): Live[] {
  const rng = createRng(seed ^ 0x51ed270b);
  const balls: Live[] = [];
  for (let i = 0; i < MONTHS.length; i += 1) {
    // Two rings of six, turned against each other, so the opening reads as an
    // arrangement rather than as a heap.
    const ring = i % 2;
    const around = Math.floor(i / 2);
    const angle = (around / 6) * Math.PI * 2 + ring * (Math.PI / 6) + rng.range(-0.1, 0.1);
    const radius = ring === 0 ? 0.52 : 0.78;
    const heading = rng.next() * Math.PI * 2;
    balls.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      vx: Math.cos(heading) * SPEED,
      vy: Math.sin(heading) * SPEED,
      clashedAt: -99,
    });
  }
  return balls;
}

/** Plays the whole thing out to the cap, recording where everybody was. */
function play(seed: number): { frames: MonthFrame[]; events: MonthEvent[] } {
  const balls = start(seed);
  const frames: MonthFrame[] = [];
  const events: MonthEvent[] = [];
  const hold = new Array<number>(MONTHS.length).fill(0);
  const dt = 1 / (FPS * SUBSTEPS);
  const wall = 1 - BALL;
  const touching = (BALL * 2) ** 2;
  let time = 0;
  let holder = -1;

  const total = Math.round(HARD_CAP * FPS);
  for (let frame = 0; frame < total; frame += 1) {
    frames.push({
      balls: balls.map((b) => ({ x: b.x, y: b.y })),
      hold: hold.slice(),
      holder,
    });

    for (let step = 0; step < SUBSTEPS; step += 1) {
      time += dt;
      for (const ball of balls) {
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;
        const distance = Math.hypot(ball.x, ball.y);
        if (distance > wall) {
          // Reflected about the inward normal, and put back on the wall rather
          // than left outside it: a ball nudged past the rim would reflect again
          // next step and buzz along the edge.
          const nx = ball.x / distance;
          const ny = ball.y / distance;
          const along = ball.vx * nx + ball.vy * ny;
          ball.vx -= 2 * along * nx;
          ball.vy -= 2 * along * ny;
          ball.x = nx * wall;
          ball.y = ny * wall;
          events.push({ t: time, kind: 'wall', month: balls.indexOf(ball) });
        }
      }

      for (let i = 0; i < balls.length; i += 1) {
        for (let j = i + 1; j < balls.length; j += 1) {
          const a = balls[i];
          const b = balls[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const gap = dx * dx + dy * dy;
          if (gap >= touching || gap === 0) continue;
          const distance = Math.sqrt(gap);
          const nx = dx / distance;
          const ny = dy / distance;
          // Equal masses trading the part of their speed that lies along the
          // line between them: the arena neither gains nor loses energy.
          const push = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
          if (push > 0) {
            a.vx -= push * nx;
            a.vy -= push * ny;
            b.vx += push * nx;
            b.vy += push * ny;
          }
          const overlap = BALL * 2 - distance;
          a.x -= nx * overlap * 0.5;
          a.y -= ny * overlap * 0.5;
          b.x += nx * overlap * 0.5;
          b.y += ny * overlap * 0.5;
          if (time - a.clashedAt > 0.08) {
            a.clashedAt = time;
            events.push({ t: time, kind: 'clash', month: i });
          }
          b.clashedAt = time;
        }
      }

      // Who is in the middle. Alone, or it does not count.
      let inside = -1;
      let crowd = 0;
      for (let i = 0; i < balls.length; i += 1) {
        if (Math.hypot(balls[i].x, balls[i].y) < ZONE) {
          crowd += 1;
          inside = i;
        }
      }
      const now = crowd === 1 ? inside : -1;
      if (now !== holder) {
        if (now >= 0) events.push({ t: time, kind: 'take', month: now });
        holder = now;
      }
      if (holder >= 0) hold[holder] += dt;
    }
  }

  return { frames, events };
}

/**
 * A round, cut to the length this seed asks for.
 *
 * The target is read off the play rather than searched for: whatever the leader
 * has banked at the final frame is what a full ring means, so the winner's ring
 * closes exactly as the video ends and nobody else's ever did.
 */
export function generateMonths(seed: number): MonthsRound {
  const { frames, events } = play(seed);
  const length = lengthFor(seed);
  const durationInFrames = Math.min(frames.length, Math.round(length * FPS));
  const last = frames[durationInFrames - 1];

  let winner = 0;
  for (let i = 1; i < MONTHS.length; i += 1) {
    if (last.hold[i] > last.hold[winner]) winner = i;
  }
  const target = last.hold[winner];

  const cut = frames.slice(0, durationInFrames);
  const duration = durationInFrames / FPS;
  const kept = events.filter((e) => e.t < duration);
  kept.push({ t: duration, kind: 'win', month: winner });

  return {
    seed,
    frames: cut,
    events: kept,
    winner,
    // A target of nought would make every ring full. It cannot happen with
    // twelve balls loose for a minute, but a ring is drawn as hold over target
    // and dividing by nought is not worth risking for the sake of a guard.
    target: Math.max(0.001, target),
    duration,
    durationInFrames,
  };
}
