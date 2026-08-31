/**
 * Fusion war.
 *
 * Twelve sides in one ring, three balls each, and two rules that between them
 * are the whole game:
 *
 * 1. **Two balls of the same side fuse.** They become one ball carrying both
 *    their masses, and a ball's size is the square root of its mass, so a side
 *    that gathers itself up gets bigger rather than more numerous.
 * 2. **Two balls of different sides fight, and the heavier one eats the
 *    lighter.** It takes the mass with it. Nothing is destroyed and nothing is
 *    created: the mass in the ring at the end is the mass it opened with,
 *    thirty-six, and the whole video is that mass changing hands.
 *
 * And one rule to stop the first two ending the game in ten seconds: a ball
 * that reaches four **splits in half**, and the halves are fired apart. Without
 * it the winner is whoever happens to fuse first, and the ring ends up holding
 * two boulders that circle each other; with it a side that is winning spreads
 * instead of swelling, which is what a side that is winning should look like.
 *
 * Everything travels at the same speed whatever it weighs. That is a game rule
 * rather than physics — momentum would leave a heavy ball drifting while the
 * light ones dart about, and the mode would be over before it read as a fight.
 * Mass decides who eats whom; speed is the same for everyone.
 */

import { MONTHS } from './months';
import { createRng } from './random';
import { FPS } from './style';

/** Physics substeps per rendered frame. */
const SUBSTEPS = 4;

/** How fast anything travels, in arena radii a second. */
const SPEED = 0.5;

/** Balls each side opens with, and what each of them weighs. */
const EACH = 3;

/** A ball's radius at mass one, in arena radii. Size goes as the square root. */
const UNIT = 0.048;

/** The mass at which a ball splits into two halves. */
const SPLIT_AT = 6;

/**
 * How much heavier a ball has to be to eat another, rather than bounce off it.
 *
 * Without this the war is over in half a minute: every ball opens at one, so
 * every early meeting is a tie, and a tie decided by which ball was travelling
 * into the other snowballs immediately — three sides left at ten seconds and one
 * at thirty, measured. A quarter again as heavy is a real advantage rather than
 * a coin toss, so the opening is sides gathering themselves up while nothing is
 * lost, and the first side to get properly ahead is the one that starts eating.
 */
/**
 * **And it closes as the clock runs.** With a fixed edge the mode deadlocks:
 * splitting caps every ball at half the limit, so the survivors all end up the
 * same weight and none of them can touch the others — four sides frozen at nine
 * balls from the tenth second to the seventy-eighth, measured. So the advantage
 * a ball needs falls away as the ceiling comes into sight: the ring starts fair
 * and ends decisive, and a stand-off cannot outlive the video.
 */
const EDGE_AT_FIRST = 1.3;
const EDGE_GONE_BY = 0.78;

/** How hard the halves are pushed apart, as a fraction of a ball's width. */
const SPLIT_KICK = 1.15;

/** Where the twelve start, as a fraction of the arena. */
const OPENING_RING = 0.66;

/**
 * How long a ball is left alone after it appears.
 *
 * A split hands back two balls touching each other, and they are the same side
 * — so without this they fuse on the next substep, reach the limit again, split
 * again, and the pair spend the whole video doing it. Measured before the guard
 * was there: a hundred and thirty-six thousand fusions and as many splits in
 * one round, against fourteen fights, because every ball in the ring was too
 * busy to meet anybody.
 *
 * So a new ball can neither fuse nor be eaten until it is clear, and the kick
 * that separates the halves is a full ball's width rather than half of one.
 */
const NEW_BORN = 0.5;

/** How long a ball stays quiet after ringing off the wall, for the sound. */
const KNOCK_GAP = 0.12;

/** Seconds of winner held at the end. */
const OUTRO = 2.5;

/** The floor and the ceiling the whole video is kept between. */
const SHORTEST = 60;
const LONGEST = 78;

export interface FusionBall {
  x: number;
  y: number;
  /** Radius in arena radii, so the painter has nothing to work out. */
  r: number;
  /** Which side it belongs to. */
  who: number;
}

export interface FusionFrame {
  balls: readonly FusionBall[];
  /** What each side is worth, in mass. Nought means out. */
  held: readonly number[];
  /** Nought while the war is on, one from the moment it is decided. */
  reveal: number;
}

export type FusionEventKind = 'wall' | 'fuse' | 'eat' | 'split' | 'out' | 'win';

export interface FusionEvent {
  t: number;
  kind: FusionEventKind;
  month: number;
}

export interface FusionRound {
  seed: number;
  frames: FusionFrame[];
  events: FusionEvent[];
  /** The side left holding the ring. */
  winner: number;
  /** What it finished on, out of thirty-six. */
  best: number;
  /** Whether it was the last one standing, or merely ahead when time ran out. */
  swept: boolean;
  duration: number;
  durationInFrames: number;
}

interface Live {
  x: number;
  y: number;
  vx: number;
  vy: number;
  mass: number;
  who: number;
  /** When it appeared, so a fresh half is left alone until it is clear. */
  bornAt: number;
  /** When it last rang off the wall, for the soundtrack's sake. */
  knockedAt: number;
}

const sizeOf = (mass: number): number => UNIT * Math.sqrt(mass);

/** Point a ball somewhere, at the one speed everything travels at. */
function aim(ball: Live, dx: number, dy: number): void {
  const length = Math.hypot(dx, dy) || 1;
  ball.vx = (dx / length) * SPEED;
  ball.vy = (dy / length) * SPEED;
}

/**
 * The opening: twelve sides on one ring, three balls apiece.
 *
 * The three sit close together at their side's station rather than spread round
 * the ring, so the first thing that happens is each side gathering — and the
 * first fusions happen at home, which is what teaches the rule before the
 * fighting starts.
 */
function start(seed: number): Live[] {
  const rng = createRng(seed ^ 0x1d872b41);
  const balls: Live[] = [];
  for (let side = 0; side < MONTHS.length; side += 1) {
    const angle = -Math.PI / 2 + (side / MONTHS.length) * Math.PI * 2;
    for (let i = 0; i < EACH; i += 1) {
      const spread = angle + (i - 1) * 0.13;
      const out = OPENING_RING + (i === 1 ? -0.07 : 0.02);
      const ball: Live = {
        x: Math.cos(spread) * out,
        y: Math.sin(spread) * out,
        vx: 0,
        vy: 0,
        mass: 1,
        who: side,
        bornAt: -99,
        knockedAt: -99,
      };
      const heading = rng.next() * Math.PI * 2;
      aim(ball, Math.cos(heading), Math.sin(heading));
      balls.push(ball);
    }
  }
  return balls;
}

export function generateFusion(seed: number): FusionRound {
  const balls = start(seed);
  const frames: FusionFrame[] = [];
  const events: FusionEvent[] = [];
  const dt = 1 / (FPS * SUBSTEPS);

  let time = 0;
  let decidedAt = -1;
  let winner = -1;
  let wonAt = 0;
  let swept = false;

  const held = (): number[] => {
    const mass = new Array<number>(MONTHS.length).fill(0);
    for (const ball of balls) mass[ball.who] += ball.mass;
    return mass;
  };

  const cap = Math.round((LONGEST + OUTRO + 1) * FPS);
  for (let frame = 0; frame < cap; frame += 1) {
    const mass = held();
    frames.push({
      balls: balls.map((b) => ({ x: b.x, y: b.y, r: sizeOf(b.mass), who: b.who })),
      held: mass,
      reveal: decidedAt >= 0 ? Math.min(1, (frame - decidedAt) / (FPS * OUTRO)) : 0,
    });
    if (decidedAt >= 0 && frame >= decidedAt + Math.round(OUTRO * FPS)) break;
    if (decidedAt >= 0) continue;

    for (let step = 0; step < SUBSTEPS; step += 1) {
      time += dt;
      // Taken before anything happens this substep, not at the top of the
      // frame: a side that went out on the first substep would otherwise be
      // reported as going out on all four of them.
      const before = held();

      for (const ball of balls) {
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;
        const reach = 1 - sizeOf(ball.mass);
        const out = Math.hypot(ball.x, ball.y);
        if (out > reach) {
          const nx = ball.x / out;
          const ny = ball.y / out;
          const along = ball.vx * nx + ball.vy * ny;
          ball.vx -= 2 * along * nx;
          ball.vy -= 2 * along * ny;
          ball.x = nx * reach;
          ball.y = ny * reach;
          // One contact is one knock: a ball worked into the rim touches it on
          // every substep, and a soundtrack made of those is a buzz.
          if (time - ball.knockedAt > KNOCK_GAP) {
            ball.knockedAt = time;
            events.push({ t: time, kind: 'wall', month: ball.who });
          }
        }
      }

      // One contact per pair per substep, and the list is walked backwards from
      // the end so that removing a ball cannot skip the next one.
      for (let i = 0; i < balls.length; i += 1) {
        for (let j = i + 1; j < balls.length; j += 1) {
          const a = balls[i];
          const b = balls[j];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const reach = sizeOf(a.mass) + sizeOf(b.mass);
          const gap = Math.hypot(dx, dy);
          if (gap >= reach || gap === 0) continue;

          // Nothing touches a ball that has just appeared: not to fuse with it
          // and not to eat it.
          if (time - a.bornAt < NEW_BORN || time - b.bornAt < NEW_BORN) continue;

          if (a.who === b.who) {
            // Fusion. The pair becomes one ball at their centre of mass,
            // carrying on the way the heavier of them was going.
            const lead = a.mass >= b.mass ? a : b;
            const total = a.mass + b.mass;
            a.x = (a.x * a.mass + b.x * b.mass) / total;
            a.y = (a.y * a.mass + b.y * b.mass) / total;
            a.mass = total;
            a.bornAt = Math.max(a.bornAt, b.bornAt);
            aim(a, lead.vx, lead.vy);
            balls.splice(j, 1);
            events.push({ t: time, kind: 'fuse', month: a.who });
            j -= 1;
            continue;
          }

          // A fight. The heavier eats the lighter and takes its mass; on a tie
          // it goes to whichever was travelling into the other, which is the
          // only tie-break that is about the two balls rather than about the
          // order they happen to be stored in.
          let winnerBall = a;
          let loserBall = b;
          let loserAt = j;
          if (b.mass > a.mass) {
            winnerBall = b;
            loserBall = a;
            loserAt = i;
          } else if (b.mass === a.mass) {
            const closing = (a.vx - b.vx) * dx + (a.vy - b.vy) * dy;
            if (closing < 0) {
              winnerBall = b;
              loserBall = a;
              loserAt = i;
            }
          }
          const edge =
            1 + (EDGE_AT_FIRST - 1) * Math.max(0, 1 - time / (LONGEST * EDGE_GONE_BY));
          if (winnerBall.mass < loserBall.mass * edge) {
            // Too close to call: they bounce, the way they would in any of the
            // other modes, and both walk away with everything they came with.
            const nx = dx / gap;
            const ny = dy / gap;
            const push = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
            if (push > 0) {
              aim(a, a.vx - push * nx, a.vy - push * ny);
              aim(b, b.vx + push * nx, b.vy + push * ny);
            }
            const overlap = (reach - gap) / 2;
            a.x -= nx * overlap;
            a.y -= ny * overlap;
            b.x += nx * overlap;
            b.y += ny * overlap;
            continue;
          }
          winnerBall.mass += loserBall.mass;
          events.push({ t: time, kind: 'eat', month: winnerBall.who });
          balls.splice(loserAt, 1);
          if (loserAt === i) {
            i -= 1;
            break;
          }
          j -= 1;
        }
      }

      // Splitting comes after the contacts, so a ball that has just eaten its
      // way past the limit goes in two on the same substep it did it.
      for (let i = balls.length - 1; i >= 0; i -= 1) {
        const ball = balls[i];
        if (ball.mass < SPLIT_AT) continue;
        const half = ball.mass / 2;
        const size = sizeOf(half);
        const away = Math.hypot(ball.vx, ball.vy) || 1;
        // Apart along the way it was going: sideways would send both halves
        // into whatever it was chasing.
        const ux = ball.vx / away;
        const uy = ball.vy / away;
        const step = size * SPLIT_KICK;
        const twin: Live = {
          x: ball.x - ux * step,
          y: ball.y - uy * step,
          vx: 0,
          vy: 0,
          mass: half,
          who: ball.who,
          bornAt: time,
          knockedAt: -99,
        };
        aim(twin, -ux + uy * 0.35, -uy - ux * 0.35);
        ball.x += ux * step;
        ball.y += uy * step;
        ball.mass = half;
        ball.bornAt = time;
        aim(ball, ux + uy * 0.35, uy - ux * 0.35);
        balls.push(twin);
        events.push({ t: time, kind: 'split', month: ball.who });
      }

      const now = held();
      for (let side = 0; side < MONTHS.length; side += 1) {
        if (before[side] > 0 && now[side] === 0) {
          events.push({ t: time, kind: 'out', month: side });
        }
      }
      const ahead = (): number => {
        let best = 0;
        for (let side = 1; side < MONTHS.length; side += 1) {
          if (now[side] > now[best]) best = side;
        }
        return best;
      };
      const standing = now.filter((m) => m > 0).length;
      if (winner < 0 && standing <= 1) {
        winner = ahead();
        swept = true;
        wonAt = time;
      }
      if (winner < 0 && time >= LONGEST - OUTRO) {
        // Nobody swept the ring inside the ceiling, so it goes to whoever holds
        // the most of it. Reported rather than hidden: `swept` says which of the
        // two endings this was.
        winner = ahead();
        wonAt = time;
      }
      // The war can be over long before the video may be. What follows a sweep
      // is the winner alone in the ring, still fusing and splitting, until the
      // minute the mode promises has been cleared — a lap rather than a freeze.
      if (winner >= 0 && time >= Math.max(wonAt, SHORTEST - OUTRO)) {
        decidedAt = frames.length;
        events.push({ t: time, kind: 'win', month: winner });
        break;
      }
    }
  }

  const durationInFrames = frames.length;
  return {
    seed,
    frames,
    events,
    winner: winner >= 0 ? winner : 0,
    best: winner >= 0 ? frames[frames.length - 1].held[winner] : 0,
    swept,
    duration: durationInFrames / FPS,
    durationInFrames,
  };
}
