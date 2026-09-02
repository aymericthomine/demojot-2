/**
 * Keep the wires.
 *
 * Wires are pinned to the rim — the pins never move — and each one runs from its
 * pin to the ball that owns it, so every side wears a fan. Two rules:
 *
 * > **Run through a wire and it comes away with you** — new hub, new colour,
 * > same pin. Every wire the ball passed through, not the first one found: it is
 * > not turned by them, it cuts and carries on.
 *
 * > **A ball can only hold so much.** Full hands break the wire instead of
 * > taking it, and that pin is empty for the rest of the round.
 *
 * **No two wires ever overlap**, and that falls out of the first rule rather
 * than being repaired afterwards: a ball takes what it touches, so it is never
 * on the far side of a wire it does not own, and a fan can therefore never reach
 * across another. It keeps each side's pins in one unbroken run of the rim for
 * the same reason — a patch of somebody else's rim inside your own would need
 * their wire to cross yours to get out.
 *
 * **Wires are life.** A side holding none is out; its wires are not freed,
 * because somebody already owns them.
 *
 * The break is what makes a round finish. Transfer alone conserves, and a
 * conserving economy has no drift towards a winner: with nothing entering or
 * leaving the ring, the last two trade the same wires back and forth for ever.
 *
 * A version of this made rope solid — a ball could not pass through a wire at
 * all, it caught on it and rebounded. That kept the picture just as clean and
 * cost the fight: every border settled into an equilibrium and twelve sides
 * became three and stayed three.
 */

import { MONTHS } from './months';
import { createRng } from './random';
import { FPS } from './style';

/**
 * Physics substeps per rendered frame.
 *
 * A wire is caught by testing where the ball *is*, so a ball that moves further
 * than its own reach in one substep steps clean over one — and a wire stepped
 * over rather than taken is exactly the crossing this mode does not allow.
 * Eight, because at four two frames in ten thousand had a fan swung across
 * another.
 */
const SUBSTEPS = 8;

/**
 * How fast a ball travels, in arena radii a second.
 *
 * Half what the old fight ran at, and it is paid for by the wire count rather
 * than given away. A ball takes every wire it touches, so the fight's speed is
 * the ball's speed: at this speed on ten wires a side the ring was settled by
 * the thirtieth second and the video spent its rest on a winner that had already
 * won, and a guard around each hub would have bought the time back but cannot be
 * had — a wire a ball may pass without taking is a wire it can end up on the far
 * side of, which is a crossing.
 *
 * What does buy it is dealing more wire: a side with more of it takes longer to
 * strip. At fifteen a side the fight lasts exactly as long as it did at 0.24 on
 * ten — a median of forty seconds out of a sixty-eight-second video — with the
 * balls travelling half again as fast. Twenty-five a side buys enough for 0.45,
 * and costs the picture: three hundred wires read as twelve solid triangles
 * rather than as fans of lines.
 */
const SPEED = 0.35;

/** A ball's radius, in arena radii. */
const BALL = 0.05;

/** How wide a wire is, which is the rest of a ball's reach for one. */
const THREAD_WIDTH = 0.0062;

/**
 * Wires each side opens with, and therefore the pins on the rim.
 *
 * The reference deals its cast about ten each; this is fifteen, and the extra is
 * what pays for the ball speed. It is about as far as the rim will go: a hundred
 * and eighty pins is one every seventeen pixels round the ring, and at three
 * hundred the fans stop reading as lines and come out as solid triangles.
 */
const EACH = 15;

/**
 * Most wire one ball can hold, and the reason a round ever finishes.
 *
 * Nearly twice what a ball opens with, which is the rung the old fight settled
 * on and the one that keeps the ring emptying at the reference's rate.
 */
const HOLD_LIMIT = 27;

/** A pin whose wire has been broken. It stays empty for the rest of the round. */
export const EMPTY = -1;

export const SIDES = MONTHS.length;
export const ANCHORS = SIDES * EACH;

/** Where the twelve start, as a fraction of the arena. */
const OPENING_RING = 0.5;

/**
 * Seconds the opening picture is held before anybody moves.
 *
 * The twelve wedges dividing the rim are the most legible frame in the video and
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
 * The fight's own length is not a video's: a round can settle inside half a
 * minute or grind on well past two. So a fight settled early keeps playing, the
 * winner running the ring on its own until the whistle, and a fight still going
 * at the whistle is given to whoever holds the most rope.
 */
const SHORTEST = 60;
const LONGEST = 78;

export interface WiresBall {
  x: number;
  y: number;
  r: number;
  who: number;
  /** Nought while it is in the ring, one once it has faded off the board. */
  fade: number;
}

export interface WiresFrame {
  balls: readonly WiresBall[];
  /** Who holds each pin, by pin index, or EMPTY where the wire was broken. */
  threads: readonly number[];
  /** Nought while the fight is on, one from the moment it is decided. */
  reveal: number;
}

export type WiresEventKind = 'wall' | 'clash' | 'take' | 'break' | 'out' | 'win';

export interface WiresEvent {
  t: number;
  kind: WiresEventKind;
  month: number;
  /** How many sides are still in, after the event. Drives the pitch rise. */
  alive: number;
}

export interface WiresRound {
  seed: number;
  frames: WiresFrame[];
  events: WiresEvent[];
  winner: number;
  /** Threads it finished holding. */
  best: number;
  /** The same number, under the name the page's other modes use. */
  held: number;
  /** Whether it was the last side standing rather than the leader at the whistle. */
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
}

/**
 * Where every pin sits, worked out once.
 *
 * The contact test asks for these positions for every ball on every substep, so
 * working them out each time with two trigonometric calls was most of what a
 * round cost. The half-step offset is what centres a side's arc on the angle its
 * ball opens at.
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

export function generateWires(seed: number): WiresRound {
  const rng = createRng(seed ^ 0x6d2b79f5);
  const whistle = SHORTEST + rng.next() * (LONGEST - SHORTEST);

  // The opening: each side's pins sit together on the rim and its ball stands in
  // front of them, so the first frame is twelve wedges meeting edge to edge with
  // an empty middle.
  const owner = new Int8Array(ANCHORS);
  for (let pin = 0; pin < ANCHORS; pin += 1) owner[pin] = Math.floor(pin / EACH);

  const balls: Live[] = MONTHS.map((_, side) => {
    const around = -Math.PI / 2 + (side / SIDES) * Math.PI * 2;
    // Aimed across the arena, but loosely, so the first seconds do not look
    // choreographed. Still built around inward: a billiard in a circle keeps its
    // angle of incidence for ever, and a ball sent off near the tangent spends
    // the whole video hugging the wall in a tiny rosette.
    const heading = around + Math.PI + rng.range(-1.1, 1.1);
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
    };
  });

  const frames: WiresFrame[] = [];
  const events: WiresEvent[] = [];
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

      // Run through a wire and it comes away with you. Every one the ball is on,
      // not the first found: a ball crossing a fan takes the fan, and taking
      // what it touches is exactly what keeps it from ever being on the far side
      // of somebody else's wire.
      for (const ball of balls) {
        if (!ball.alive) continue;
        for (let pin = 0; pin < ANCHORS; pin += 1) {
          const victim = owner[pin];
          if (victim === ball.who || victim === EMPTY) continue;
          const hub = balls[victim];
          const foot = PINS[pin];
          if (nearSegment(ball.x, ball.y, hub.x, hub.y, foot.x, foot.y) >= reach) continue;

          // Full hands break the wire rather than take it, and the pin stays
          // empty for good.
          const full = ball.held >= HOLD_LIMIT;
          owner[pin] = full ? EMPTY : ball.who;
          hub.held -= 1;
          if (!full) ball.held += 1;
          events.push({ t: time, kind: full ? 'break' : 'take', month: ball.who, alive });

          if (hub.held === 0) {
            hub.alive = false;
            alive -= 1;
            events.push({ t: time, kind: 'out', month: hub.who, alive });
          }
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
      // its own until the whistle.
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
