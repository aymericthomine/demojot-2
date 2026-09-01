/**
 * Line war.
 *
 * The old Ball battle's rules, played by the twelve. Three of them, and they are
 * the whole game:
 *
 * 1. **The pins never move.** The rim is divided into sixty fixed points, five
 *    a side, set before the first frame. Every pin holds a thread that runs from
 *    it to the ball that owns it, so each side wears a fan that swings as its
 *    ball travels.
 * 2. **Touch a thread and it comes away with you.** The pin stays exactly where
 *    it was and the inner end swings across to the ball that took it. Rope does
 *    not push back — a ball is never turned by it — so a ball crossing a fan
 *    takes every thread it passed through, and a good run pays.
 * 3. **Threads are life.** A side holding none is out, and the only way back is
 *    to take somebody else's, which a side with no ball in the ring cannot do.
 *
 * Balls also shove each other apart, which wrecks the plans of both and keeps a
 * duel from settling into a rhythm.
 *
 * **A full ball breaks rope instead of taking it**, and that pin stays empty for
 * the rest of the round. This is the one rule that is not obvious and the reason
 * a round ever ends: transfer alone conserves, and a conserving economy has no
 * drift towards a winner — the last two would trade the same threads back and
 * forth for ever. Breaking is what makes the fight one-way.
 *
 * The fight runs until one side holds every thread left in the ring. Its own
 * length is no use as a video's, though — see the whistle below — so a round
 * that settles early keeps playing, the winner running the ring on its own.
 *
 * This replaced a version that scored the threads on a counter along the top and
 * ran to a whistle. It was a different game — a side could be stripped bare and
 * still be in it — and the counter was doing the work the picture should do.
 */

import { MONTHS } from './months';
import { createRng } from './random';
import { FPS } from './style';

/**
 * Physics substeps per rendered frame.
 *
 * A thread is caught by testing where the ball *is*, so a ball that moves
 * further than its own reach in one substep steps clean over rope without
 * taking it. Four is comfortably inside that at this speed.
 */
const SUBSTEPS = 4;

/** How fast a ball travels, in arena radii a second — measured off the reference. */
const SPEED = 0.85;

/** A ball's radius, in arena radii. */
const BALL = 0.05;

/** How wide a thread is, which is the rest of a ball's reach for one. */
const THREAD_WIDTH = 0.0062;

/** Threads each side opens with, and therefore the pins on the rim. */
const EACH = 5;
export const SIDES = MONTHS.length;
export const ANCHORS = SIDES * EACH;

/**
 * Most rope one ball can hold.
 *
 * This is the dial that says how full the ring looks, because everything above
 * the limit is destroyed rather than passed on. At nine — the old game's rung,
 * nearly twice what a ball opens with — the fight is decisive and the board is
 * bare: half the seeds are won outright, but by the twenty-fifth second only
 * fourteen threads are left and the rest of the video is two balls on a nearly
 * empty ring. At eighteen the board stays full and nothing is ever settled.
 *
 * Twelve keeps forty threads on the ring at the tenth second and sixteen at the
 * fifty-fifth, which is the reference's density, and the side that wins is
 * holding about two thirds of what is left — dominant enough to read without a
 * number under it.
 */
const HOLD_LIMIT = Math.round(EACH * 2.4);

/** A pin whose thread has been broken. It stays empty for the rest of the round. */
export const EMPTY = -1;

/**
 * How long a ball must clear a thread before it can take another.
 *
 * Without it a ball that runs the length of a fan takes the whole fan in one
 * substep, and a side is not stripped so much as deleted: twelve went to four in
 * the first five seconds and the video spent its remaining minute on a winner
 * that had already won. A cut costs time, so a fan is taken thread by thread and
 * the side it belongs to has a chance to be somewhere else.
 */
const TAKE_EVERY = 0.1;

/** Where the twelve start, as a fraction of the arena. */
const OPENING_RING = 0.5;

/**
 * Seconds the opening picture is held before anybody moves.
 *
 * The twelve fans dividing the rim are the most legible frame in the video and
 * they are gone in an instant otherwise. Nothing happens during the hold, so it
 * reads as a held breath rather than a slow start.
 */
const HOLD = 1;

/** Seconds of the winner alone at the end. */
const OUTRO = 2.5;

/** How long a beaten ball takes to fade off the board. */
const FADE = 3.5;

/**
 * The whistle, which the seed picks between these.
 *
 * The fight's own length is bimodal and neither mode is a video: most rounds are
 * settled inside forty seconds, and the ones that are not are two balls trading
 * the same rope for as long as you let them — at a hundred-second cap, a third
 * of seeds ran the whole hundred. So the round is given a length the way every
 * other mode here is. A fight settled early keeps playing, the winner running
 * the ring on its own until the whistle; a fight still going at the whistle is
 * given to whoever holds the most rope.
 */
const SHORTEST = 60;
const LONGEST = 78;

export interface LineBall {
  x: number;
  y: number;
  r: number;
  who: number;
  /** Nought while it is in the ring, one once it has faded off the board. */
  fade: number;
}

export interface LineFrame {
  balls: readonly LineBall[];
  /** Who holds each pin, by pin index, or EMPTY where the thread was broken. */
  threads: readonly number[];
  /** Nought while the fight is on, one from the moment it is decided. */
  reveal: number;
}

export type LineEventKind = 'wall' | 'clash' | 'take' | 'break' | 'out' | 'win';

export interface LineEvent {
  t: number;
  kind: LineEventKind;
  month: number;
  /** How many sides are still in, after the event. Drives the pitch rise. */
  alive: number;
}

export interface LineRound {
  seed: number;
  frames: LineFrame[];
  events: LineEvent[];
  winner: number;
  /** Threads it finished holding. */
  best: number;
  /** The same number, under the name the page's other modes use. */
  held: number;
  /** Whether it was the last side standing rather than the leader at the cap. */
  swept: boolean;
  duration: number;
  durationInFrames: number;
}

interface Live {
  x: number;
  y: number;
  vx: number;
  vy: number;
  who: number;
  held: number;
  alive: boolean;
  fade: number;
  /** When it last bounced off another ball, so one contact is not counted twice. */
  clashedAt: number;
  /** When it last took a thread. */
  cutAt: number;
}

/**
 * Where every pin sits, worked out once.
 *
 * The contact test asks for these sixty positions twelve times a substep and
 * four times a frame, so working them out each time with two trigonometric calls
 * was most of what a round cost.
 */
const PINS: readonly { x: number; y: number }[] = Array.from({ length: ANCHORS }, (_, pin) => {
  const angle = -Math.PI / 2 + ((pin - (EACH - 1) / 2) / ANCHORS) * Math.PI * 2;
  return { x: Math.cos(angle), y: Math.sin(angle) };
});

/** Where a pin sits on the rim. */
export const pinAt = (anchor: number): { x: number; y: number } => PINS[anchor];

/** Closest point on a segment: how far away it is, squared. */
function nearSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): number {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSq = dx * dx + dy * dy;
  const t =
    lengthSq > 0 ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lengthSq)) : 0;
  return (px - (ax + dx * t)) ** 2 + (py - (ay + dy * t)) ** 2;
}

export function generateLine(seed: number): LineRound {
  const rng = createRng(seed ^ 0x6d2b79f5);
  const whistle = SHORTEST + rng.next() * (LONGEST - SHORTEST);

  // The opening: each side's five pins sit together on the rim and its ball
  // stands in front of them, so the first frame is twelve fans meeting edge to
  // edge with an empty middle.
  const owner = new Int8Array(ANCHORS);
  for (let pin = 0; pin < ANCHORS; pin += 1) owner[pin] = Math.floor(pin / EACH);

  const balls: Live[] = MONTHS.map((_, side) => {
    const around = -Math.PI / 2 + (side / SIDES) * Math.PI * 2;
    // Aimed across the arena, but loosely, so the first seconds do not look
    // choreographed. Still built around inward: a billiard in a circle keeps its
    // angle of incidence for ever, and a ball sent off near the tangent spends
    // the whole video hugging the wall in a tiny rosette.
    const heading = around + Math.PI + rng.range(-1.3, 1.3);
    return {
      x: Math.cos(around) * OPENING_RING,
      y: Math.sin(around) * OPENING_RING,
      vx: Math.cos(heading) * SPEED,
      vy: Math.sin(heading) * SPEED,
      who: side,
      held: EACH,
      alive: true,
      fade: 0,
      clashedAt: -99,
      cutAt: -99,
    };
  });

  const frames: LineFrame[] = [];
  const events: LineEvent[] = [];
  const dt = 1 / (FPS * SUBSTEPS);
  const wall = 1 - BALL;
  const touching = (BALL * 2) ** 2;
  const reach = (BALL + THREAD_WIDTH / 2) ** 2;

  let time = 0;
  let decidedAt = -1;
  let winner = -1;
  let wonAt = 0;
  let swept = false;
  let alive = SIDES;

  const cap = Math.round((LONGEST + 1) * FPS);
  for (let frame = 0; frame < cap; frame += 1) {
    frames.push({
      balls: balls
        .filter((ball) => ball.fade < 1)
        .map((ball) => ({ x: ball.x, y: ball.y, r: BALL, who: ball.who, fade: ball.fade })),
      threads: Array.from(owner),
      reveal: decidedAt >= 0 ? Math.min(1, (frame - decidedAt) / (FPS * OUTRO)) : 0,
    });
    if (decidedAt >= 0 && frame >= decidedAt + Math.round(OUTRO * FPS)) break;
    if (decidedAt >= 0) continue;

    for (let step = 0; step < SUBSTEPS; step += 1) {
      time += dt;
      // Held on the opening picture. Nothing moves and nothing changes hands.
      if (time < HOLD) continue;

      for (const ball of balls) {
        if (!ball.alive) {
          // Beaten balls linger a moment so the elimination reads on screen.
          ball.fade = Math.min(1, ball.fade + dt * FADE);
          continue;
        }
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        const out = Math.hypot(ball.x, ball.y);
        if (out > wall) {
          const nx = ball.x / out;
          const ny = ball.y / out;
          const along = ball.vx * nx + ball.vy * ny;
          ball.vx -= 2 * along * nx;
          ball.vy -= 2 * along * ny;
          ball.x = nx * wall;
          ball.y = ny * wall;
          // The wall gives nothing: every thread was on the rim before the first
          // frame, so a bounce is only a bounce, and a note.
          events.push({ t: time, kind: 'wall', month: ball.who, alive });
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

          const span = Math.sqrt(gap);
          const nx = dx / span;
          const ny = dy / span;
          const closing = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
          if (closing < 0) {
            // Equal masses, head on: they trade the part of their speed that
            // lies along the line between them.
            a.vx += closing * nx;
            a.vy += closing * ny;
            b.vx -= closing * nx;
            b.vy -= closing * ny;
          }
          const overlap = (BALL * 2 - span) / 2 + 1e-4;
          a.x -= nx * overlap;
          a.y -= ny * overlap;
          b.x += nx * overlap;
          b.y += ny * overlap;

          if (time - a.clashedAt > 0.08) {
            a.clashedAt = time;
            events.push({ t: time, kind: 'clash', month: a.who, alive });
          }
          b.clashedAt = time;
        }
      }

      // Touch a thread and it comes away with you — new hub, same pin. Full
      // hands break it instead, and that pin is empty for good. One at a time:
      // the nearest thread the ball is on, and then it has to clear.
      for (const ball of balls) {
        if (!ball.alive || time - ball.cutAt < TAKE_EVERY) continue;

        let caught = -1;
        let nearest = reach;
        for (let pin = 0; pin < ANCHORS; pin += 1) {
          const victim = owner[pin];
          if (victim === ball.who || victim === EMPTY) continue;
          const hub = balls[victim];
          const foot = PINS[pin];
          const away = nearSegment(ball.x, ball.y, hub.x, hub.y, foot.x, foot.y);
          if (away >= nearest) continue;
          nearest = away;
          caught = pin;
        }
        if (caught < 0) continue;

        const hub = balls[owner[caught]];
        ball.cutAt = time;
        hub.held -= 1;
        const full = ball.held >= HOLD_LIMIT;
        owner[caught] = full ? EMPTY : ball.who;
        if (!full) ball.held += 1;
        events.push({ t: time, kind: full ? 'break' : 'take', month: ball.who, alive });

        if (hub.held === 0) {
          hub.alive = false;
          alive -= 1;
          events.push({ t: time, kind: 'out', month: hub.who, alive });
        }
      }

      if (winner < 0 && alive <= 1) {
        winner = balls.find((ball) => ball.alive)?.who ?? 0;
        swept = true;
        wonAt = time;
        events.push({ t: time, kind: 'win', month: winner, alive });
      }
      if (winner < 0 && time >= whistle - OUTRO) {
        // Out of time rather than out of opponents. A video has to end on
        // somebody, so whoever holds the most rope takes it.
        winner = balls.reduce((best, ball) => (ball.held > balls[best].held ? ball.who : best), 0);
        wonAt = time;
        events.push({ t: time, kind: 'win', month: winner, alive });
      }
      // A fight that settled early keeps playing: the winner runs the ring on
      // its own until the minute has been cleared.
      if (winner >= 0 && time >= Math.max(wonAt, whistle - OUTRO)) {
        decidedAt = frames.length;
        break;
      }
    }
  }

  const held = winner >= 0 ? balls[winner].held : 0;
  return {
    seed,
    frames,
    events,
    winner: winner >= 0 ? winner : 0,
    best: held,
    held,
    swept,
    duration: frames.length / FPS,
    durationInFrames: frames.length,
  };
}
