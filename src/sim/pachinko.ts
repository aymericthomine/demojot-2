/**
 * Pachinko.
 *
 * Twelve balls dropped down a field of pegs into seven slots, over and over.
 * A slot is worth what is written on it — twenty-five at the edges, two in the
 * middle — and where a ball lands is added to whoever it belongs to. Nobody is
 * eliminated and nothing is held: the whole mode is a scoreboard filling up.
 *
 * **They fall in waves.** All twelve are released together, a beat apart, and
 * the next wave waits until the board is empty. That is the reference's own
 * cadence and it is the only one that keeps the mode legible: a continuous
 * dribble of balls is a screensaver, whereas a wave has a beginning, a middle
 * where six of them are in the air at once, and an end where the last one is
 * still rattling and you are watching only it.
 *
 * **The middle is cheap and the edges are rich.** A ball that falls through
 * eleven staggered rows lands near the middle far more often than at an edge —
 * that is the shape of the thing, not a rule — so the twos and the fours are
 * what a score is mostly made of and a twenty-five is an event. Nothing has to
 * be weighted for that to be true.
 *
 * **The last drop multiplies.** The slots change to multipliers for one final
 * wave, and a ball landing on the three-times slot takes its month's whole
 * total with it. It is the reference's ending and it is deliberately violent:
 * a minute of scoring can be turned over in the last four seconds, which is
 * what makes the last four seconds worth watching. The leader still has the
 * best of it — a third of the slots multiply by two and the edges by three —
 * but it is not a procession.
 *
 * Balls do not collide with each other. Two dozen ball-to-ball contacts a
 * second in a field this tight reads as mush rather than as physics, and the
 * reference's own balls pass through one another. The pegs are the game.
 */

import { MONTHS } from './months';
import { createRng } from './random';
import { FPS } from './style';

/** Physics substeps per rendered frame. */
const SUBSTEPS = 4;

/**
 * The board, in units of the field's width.
 *
 * Everything here is a fraction of how wide the peg field is, so the painter
 * can put the board wherever it likes at whatever size and the two cannot
 * disagree about where a peg is. Read off the reference frame and scaled: its
 * field is 468 px across, its pegs are 12 px through and 66.5 apart.
 */
export const COLS = 7;

/** Where the columns sit: seven pegs on a row, one per slot, then six between. */
const COL_GAP = 1 / COLS;

/** Peg radius. */
export const PEG = 0.0128;

/** Ball radius — a shade fuller than the reference's, so a flag can be read. */
export const BALL = 0.024;

/** Eleven rows, the first near the top of the field and the last above the slots. */
export const ROWS = 11;
export const FIRST_ROW = 0.073;
export const ROW_GAP = 0.0683;

/** Where a ball is counted as landed: the mouth of the slots. */
export const LAND_AT = 0.812;

/** How deep the slots are drawn below their mouth. */
export const SLOT_DEPTH = 0.164;

/** What each slot is worth, left to right. */
export const SLOT_VALUE: readonly number[] = [25, 10, 4, 2, 4, 10, 25];

/** And what the same slots do on the last wave. */
export const SLOT_MULTIPLY: readonly number[] = [3, 2, 2, 1, 2, 2, 3];

/**
 * Gravity and what a peg gives back, in field widths a second squared.
 *
 * Tuned for a fall of about three seconds, which is the reference's: quicker
 * and the wave is over before the eye has found the ball it is following,
 * slower and the mode stops being a game and becomes a lava lamp.
 */
const GRAVITY = 0.95;
const BOUNCE = 0.28;

/** How much of its sideways speed a ball keeps off a peg. */
const GRIP = 0.92;

/**
 * The least sideways speed a peg may send a ball away with.
 *
 * A ball that arrives dead on a peg's crown has nowhere to go: the bounce is
 * straight back up, gravity brings it straight back down, and the two of them
 * can trade the same tenth of a second for four seconds while the rest of the
 * wave has long since landed and the video waits. A real ball does not balance
 * up there — the dome it is sitting on rolls it off — and this is that: a floor
 * on the speed it leaves with, on the side it was already leaning towards,
 * rather than a rolling force that would have to be integrated.
 *
 * Small enough that a ball with any speed of its own does not notice it.
 */
const SLIDE = 0.1;

/** The most a ball may be travelling, so nothing tunnels through a peg. */
const FASTEST = 1.9;

/**
 * How far a peg may lie about which way it is facing, in radians.
 *
 * A ball dropped exactly onto a peg's crown would bounce exactly upwards for
 * ever, and twelve balls dropped from the same place would fall in twelve
 * identical lines. The lie is small, seeded, and the only randomness in the
 * fall — everything else is arithmetic.
 */
const WOBBLE = 0.05;

/** Where a wave is released from, as a fraction of the field's width. */
const MOUTH = 0.2;

/** A beat between one ball being released and the next. */
const RELEASE_GAP = 0.13;

/** And a beat between the board going empty and the next wave. */
const WAVE_GAP = 0.9;

/**
 * The run, in seconds: how long balls keep being dropped for, and the floor and
 * ceiling the whole video is kept between.
 *
 * The playing time is seeded rather than fixed, because a mode whose videos are
 * all the same length to the frame is a mode whose videos a duplicate detector
 * can pair up. What follows it — the last wave, then the ending — takes as long
 * as it takes, so the total is held to the floor by waiting rather than by
 * cutting anything short.
 */
const PLAY_SHORT = 46;
const PLAY_LONG = 56;
const SHORTEST = 60;

/** Seconds of winner held at the end, at the very least. */
const OUTRO = 2.5;

/** How long a slot stays lit after something lands in it, in seconds. */
export const FLASH = 0.55;

export interface PachinkoBall {
  x: number;
  y: number;
  /** In the air. A ball that has landed is not drawn until its next wave. */
  live: boolean;
}

export type PachinkoPhase = 'play' | 'final' | 'over';

export interface PachinkoFrame {
  balls: readonly PachinkoBall[];
  /** What everybody has banked, in the order of the cast. */
  score: readonly number[];
  /** How lit each slot is, nought to one, and who lit it. */
  flash: readonly number[];
  flashBy: readonly number[];
  /** Which part of the video this is. */
  phase: PachinkoPhase;
  /** How much of the playing time has gone, nought to one. */
  progress: number;
  /** Nought while the game is on, one from the moment it is decided. */
  reveal: number;
}

export type PachinkoEventKind = 'peg' | 'land' | 'rich' | 'win';

export interface PachinkoEvent {
  t: number;
  kind: PachinkoEventKind;
  month: number;
}

export interface PachinkoRound {
  seed: number;
  frames: PachinkoFrame[];
  events: PachinkoEvent[];
  /** The month with the most at the end. */
  winner: number;
  /** What it finished on. */
  best: number;
  /** How many waves were dropped, the last one included. */
  waves: number;
  duration: number;
  durationInFrames: number;
}

interface Live {
  x: number;
  y: number;
  vx: number;
  vy: number;
  live: boolean;
  /** When this ball may be released, or -1 if it is not waiting for anything. */
  dueAt: number;
  /** When it last rang off a peg, so one contact is one knock. */
  pingedAt: number;
}

/** Where the peg in row `row`, place `at` stands. */
export function pegAt(row: number, at: number): { x: number; y: number } {
  const inset = row % 2 === 0 ? COL_GAP / 2 : COL_GAP;
  return { x: inset + at * COL_GAP, y: FIRST_ROW + row * ROW_GAP };
}

/** How many pegs a row carries: seven on the slot centres, six between them. */
export const pegsOn = (row: number): number => (row % 2 === 0 ? COLS : COLS - 1);

/** Which slot a ball at this height fell into. */
const slotUnder = (x: number): number =>
  Math.max(0, Math.min(COLS - 1, Math.floor(x * COLS)));

/**
 * One ball, one substep.
 *
 * Returns the slot it landed in, or -1 if it is still falling.
 */
function fall(ball: Live, dt: number, rng: { next: () => number }): number {
  ball.vy += GRAVITY * dt;
  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed > FASTEST) {
    ball.vx *= FASTEST / speed;
    ball.vy *= FASTEST / speed;
  }
  ball.x += ball.vx * dt;
  ball.y += ball.vy * dt;

  // The two walls of the field. A ball leaves them at the speed it arrived
  // less the same bounce a peg gives, so a ball that comes in flat does not
  // ride the wall all the way down.
  if (ball.x < BALL) {
    ball.x = BALL;
    ball.vx = Math.abs(ball.vx) * BOUNCE;
  } else if (ball.x > 1 - BALL) {
    ball.x = 1 - BALL;
    ball.vx = -Math.abs(ball.vx) * BOUNCE;
  }

  // Only the rows this ball could possibly be touching. The field is a grid, so
  // which ones those are is arithmetic rather than a search.
  const near = Math.round((ball.y - FIRST_ROW) / ROW_GAP);
  for (let row = near - 1; row <= near + 1; row += 1) {
    if (row < 0 || row >= ROWS) continue;
    const inset = row % 2 === 0 ? COL_GAP / 2 : COL_GAP;
    const place = Math.round((ball.x - inset) / COL_GAP);
    for (let at = place - 1; at <= place + 1; at += 1) {
      if (at < 0 || at >= pegsOn(row)) continue;
      const peg = pegAt(row, at);
      const dx = ball.x - peg.x;
      const dy = ball.y - peg.y;
      const gap = Math.hypot(dx, dy);
      const reach = PEG + BALL;
      if (gap >= reach || gap === 0) continue;

      // The peg lies a little about which way it faces, so a ball landing on
      // its crown is sent off one side instead of straight back up.
      const lean = (rng.next() - 0.5) * 2 * WOBBLE;
      const angle = Math.atan2(dy, dx) + lean;
      const nx = Math.cos(angle);
      const ny = Math.sin(angle);
      const into = ball.vx * nx + ball.vy * ny;
      if (into < 0) {
        ball.vx -= (1 + BOUNCE) * into * nx;
        ball.vy -= (1 + BOUNCE) * into * ny;
        ball.vx *= GRIP;
        const downhill = nx >= 0 ? 1 : -1;
        if (ball.vx * downhill < SLIDE) ball.vx = downhill * SLIDE;
      }
      ball.x = peg.x + nx * reach;
      ball.y = peg.y + ny * reach;
      return -2;
    }
  }

  if (ball.y >= LAND_AT) return slotUnder(ball.x);
  return -1;
}

export function generatePachinko(seed: number): PachinkoRound {
  const rng = createRng(seed ^ 0x5bd1e995);
  const playFor = PLAY_SHORT + rng.next() * (PLAY_LONG - PLAY_SHORT);

  const balls: Live[] = MONTHS.map(() => ({
    x: 0.5,
    y: -0.2,
    vx: 0,
    vy: 0,
    live: false,
    dueAt: -1,
    pingedAt: -99,
  }));
  const score = new Array<number>(MONTHS.length).fill(0);
  const flash = new Array<number>(COLS).fill(0);
  const flashBy = new Array<number>(COLS).fill(-1);

  const frames: PachinkoFrame[] = [];
  const events: PachinkoEvent[] = [];
  const dt = 1 / (FPS * SUBSTEPS);

  let time = 0;
  let phase: PachinkoPhase = 'play';
  let waves = 0;
  let decidedAt = -1;
  let winner = -1;
  let endAt = 0;

  /** Send the twelve down again, in a seeded order and a beat apart. */
  const release = (from: number): void => {
    const order = MONTHS.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rng.next() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    order.forEach((who, place) => {
      const ball = balls[who];
      ball.dueAt = from + place * RELEASE_GAP;
      ball.live = false;
      // Across the mouth rather than from one spout: a single spout sends every
      // ball down the same first three rows, and the wave comes out as one
      // clump with the same slot under it every time.
      ball.x = 0.5 + (rng.next() - 0.5) * MOUTH;
      ball.y = -0.06;
      ball.vx = (rng.next() - 0.5) * 0.08;
      ball.vy = 0;
    });
    waves += 1;
  };

  release(0);

  const cap = Math.round((PLAY_LONG + 30) * FPS);
  for (let frame = 0; frame < cap; frame += 1) {
    frames.push({
      balls: balls.map((b) => ({ x: b.x, y: b.y, live: b.live })),
      score: score.slice(),
      flash: flash.slice(),
      flashBy: flashBy.slice(),
      phase,
      progress: Math.max(0, Math.min(1, time / playFor)),
      reveal: decidedAt >= 0 ? Math.min(1, (frame - decidedAt) / (FPS * 0.4)) : 0,
    });
    if (decidedAt >= 0 && time >= endAt) break;

    for (let step = 0; step < SUBSTEPS; step += 1) {
      time += dt;
      for (let i = 0; i < COLS; i += 1) {
        if (flash[i] > 0) flash[i] = Math.max(0, flash[i] - dt / FLASH);
      }

      let flying = 0;
      for (let i = 0; i < balls.length; i += 1) {
        const ball = balls[i];
        if (!ball.live) {
          if (ball.dueAt >= 0 && time >= ball.dueAt) {
            ball.live = true;
            ball.dueAt = -1;
          } else {
            if (ball.dueAt >= 0) flying += 1;
            continue;
          }
        }
        flying += 1;

        const landed = fall(ball, dt, rng);
        if (landed === -2) {
          // One contact is one knock. A ball resting against a peg touches it
          // on every substep, and a soundtrack made of those is a buzz.
          if (time - ball.pingedAt > 0.05) {
            ball.pingedAt = time;
            events.push({ t: time, kind: 'peg', month: i });
          }
          continue;
        }
        if (landed < 0) continue;

        ball.live = false;
        flying -= 1;
        flash[landed] = 1;
        flashBy[landed] = i;
        if (phase === 'final') {
          score[i] = Math.round(score[i] * SLOT_MULTIPLY[landed]);
          events.push({
            t: time,
            kind: SLOT_MULTIPLY[landed] >= 3 ? 'rich' : 'land',
            month: i,
          });
        } else {
          score[i] += SLOT_VALUE[landed];
          events.push({
            t: time,
            kind: SLOT_VALUE[landed] >= 25 ? 'rich' : 'land',
            month: i,
          });
        }
      }

      if (decidedAt >= 0 || flying > 0) continue;

      // The board is empty. What happens next is the whole shape of the video:
      // another wave while there is playing time left, the multiplying wave
      // once there is not, and the ending once that one has come down.
      if (phase === 'play') {
        if (time < playFor) {
          release(time + WAVE_GAP);
        } else {
          phase = 'final';
          release(time + WAVE_GAP);
        }
      } else if (phase === 'final') {
        phase = 'over';
        winner = 0;
        for (let i = 1; i < score.length; i += 1) {
          if (score[i] > score[winner]) winner = i;
        }
        decidedAt = frames.length;
        events.push({ t: time, kind: 'win', month: winner });
        // Held for the outro, or for as long as it takes to clear the floor the
        // mode promises — a video that came out at fifty-eight seconds because
        // its last wave fell quickly is a video that missed the minute.
        endAt = Math.max(time + OUTRO, SHORTEST);
      }
    }
  }

  const durationInFrames = frames.length;
  return {
    seed,
    frames,
    events,
    winner: winner >= 0 ? winner : 0,
    best: winner >= 0 ? score[winner] : 0,
    waves,
    duration: durationInFrames / FPS,
    durationInFrames,
  };
}
