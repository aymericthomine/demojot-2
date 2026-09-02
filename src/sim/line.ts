/**
 * Line war.
 *
 * Threads are pinned to the rim — the pins never move — and each one runs from
 * its pin to the ball that owns it, so every side wears a fan. One rule does all
 * the work:
 *
 * > **Rope is solid.** A ball cannot pass through a thread that is not its own.
 * > It catches on it, the thread comes away with it — new hub, new colour, same
 * > pin — and the ball rebounds off where the thread was lying.
 *
 * Everything else falls out of that. A ball is penned inside the wedge its own
 * arc opens onto, so its threads can never reach across somebody else's fan:
 * **no two threads ever overlap**, and that is a consequence of the physics
 * rather than something repaired afterwards. Arcs stay whole for the same
 * reason — the only rope within reach is the rope at the edge of your own
 * territory — so a wedge grows one pin at a time, from the outside in.
 *
 * Territory changing hands only ever happens at a border, which is enforced as
 * well as implied: the pin that moves is the end of the victim's arc that the
 * taker's own arc is already up against. Run through the rope of a side that is
 * not your neighbour and you are turned by it and nothing else.
 *
 * **Threads are life.** A side whose wedge is taken down to nothing is out. Its
 * threads are not freed, because somebody already owns them, and the round ends
 * with one side holding every thread in the ring.
 *
 * This replaced a version where rope was not solid: a ball ran clean through a
 * fan, took whatever it passed, and the fans crossed each other into a plate of
 * spaghetti. Slowing the cutting down made that bearable; it did not make it the
 * reference's picture, and the picture is the point.
 */

import { MONTHS } from './months';
import { createRng } from './random';
import { FPS } from './style';

/**
 * Physics substeps per rendered frame.
 *
 * Rope is caught by testing where the ball *is*, so a ball that moves further
 * than its own reach in one substep steps clean over a thread. Four is
 * comfortably inside that at this speed.
 */
const SUBSTEPS = 8;

/**
 * How fast a ball travels, in arena radii a second.
 *
 * The reference runs at 0.85 and this is a shade quicker, because with twelve
 * wedges rather than the reference's eight there is more border to work and less
 * of a video to work it in.
 */
const SPEED = 1.1;

/** A ball's radius, in arena radii. */
const BALL = 0.05;

/** How wide a thread is, which is the rest of a ball's reach for one. */
const THREAD_WIDTH = 0.0062;

/**
 * Threads each side opens with, and therefore the pins on the rim.
 *
 * It does not change how wide a wedge is — that is always a twelfth of the ring
 * — only how many lines it is drawn with and how finely a border moves. The
 * reference deals its eight about ten each; five is the number the twelve have
 * been drawn with since the mode was built, and at twelve sides a coarser border
 * is what keeps the fight moving.
 */
const EACH = 5;
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
  /** Who holds each pin, by pin index. */
  threads: readonly number[];
  /** Nought while the fight is on, one from the moment it is decided. */
  reveal: number;
}

export type LineEventKind = 'wall' | 'clash' | 'take' | 'out' | 'win';

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

/**
 * The pin a victim gives up to a taker: the end of the victim's arc that the
 * taker's own arc is already up against, and of its two ends, the one nearer to
 * the pin that was actually caught.
 *
 * Solid rope already keeps a ball where its own territory is, so this is nearly
 * always the pin it caught. It is here for the case it is not — a ball that has
 * come round through the middle and reached a fan from behind — because an arc
 * that stays an arc is what keeps the fans from ever crossing, and a rule is a
 * better guarantee of that than a tendency.
 */
function borderPin(owner: Int8Array, taker: number, victim: number, caught: number): number {
  let best = -1;
  let closest = Infinity;
  for (let pin = 0; pin < ANCHORS; pin += 1) {
    if (owner[pin] !== victim) continue;
    const before = owner[(pin - 1 + ANCHORS) % ANCHORS];
    const after = owner[(pin + 1) % ANCHORS];
    if (before !== taker && after !== taker) continue;
    let gap = Math.abs(pin - caught);
    if (gap > ANCHORS / 2) gap = ANCHORS - gap;
    if (gap < closest) {
      closest = gap;
      best = pin;
    }
  }
  return best;
}

export function generateLine(seed: number): LineRound {
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

      // Rope is solid. Only the nearest thread matters: catching on one stops
      // the ball there, so it cannot be in among the bundle behind it in the
      // same instant.
      for (const ball of balls) {
        if (!ball.alive) continue;

        let caught = -1;
        let nearest = reach;
        for (let pin = 0; pin < ANCHORS; pin += 1) {
          const victim = owner[pin];
          if (victim === ball.who) continue;
          const hub = balls[victim];
          const foot = PINS[pin];
          const away = nearSegment(ball.x, ball.y, hub.x, hub.y, foot.x, foot.y);
          if (away >= nearest) continue;
          nearest = away;
          caught = pin;
        }
        if (caught < 0) continue;

        const hub = balls[owner[caught]];
        const foot = PINS[caught];

        // Rebound off the line the thread was lying along, and clear of it, so
        // the same rope cannot be caught twice in a row.
        const tx = foot.x - hub.x;
        const ty = foot.y - hub.y;
        const length = Math.hypot(tx, ty);
        if (length > 0) {
          const nx = -ty / length;
          const ny = tx / length;
          const dot = ball.vx * nx + ball.vy * ny;
          ball.vx -= 2 * dot * nx;
          ball.vy -= 2 * dot * ny;
          const side = (ball.x - hub.x) * nx + (ball.y - hub.y) * ny;
          const push = BALL + THREAD_WIDTH / 2 - Math.abs(side) + 1e-4;
          if (push > 0) {
            const away = side >= 0 ? 1 : -1;
            ball.x += nx * push * away;
            ball.y += ny * push * away;
          }
        }

        // Territory only changes hands at a border, so an arc stays an arc.
        const moved = borderPin(owner, ball.who, hub.who, caught);
        if (moved < 0) continue;
        owner[moved] = ball.who;
        hub.held -= 1;
        ball.held += 1;
        events.push({ t: time, kind: 'take', month: ball.who, alive });

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
