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
 * **There is no search over a dial.** The trajectories do not depend on the
 * target at all — the target only decides when to stop — so the round is played
 * once to a hard cap, the hold curves are recorded, and then the target is
 * *read off* them: it is whatever the leader has banked at the second the round
 * ends. The winner is that leader and its ring closes on that frame by
 * construction, which every other mode has to hunt for.
 *
 * **What is not free is where that second falls.** A month's total is a
 * staircase — it climbs only while that month is alone in the middle, and sits
 * flat the rest of the time — so a whistle blown on a flat stretch reads the
 * total the leader reached back at the top of the last step. Its ring filled
 * there, and everything since was a full ring going nowhere: six seconds of it
 * on average and twelve at worst, measured, which is an age in a video that
 * runs a minute.
 *
 * So the round ends on a frame where the leader is *banking*, the one nearest
 * the length the seed asks for. The seed sets the aim and the play decides
 * where inside it the whistle can go, so the length is reported rather than
 * promised: over two hundred seeds it lands inside the mode's minute-to-eighty
 * range about nine times in ten, and never runs past the top of it — where the
 * play leaves no room, the round is cut short rather than run long.
 */

import { createRng } from './random';
import { FPS } from './style';

/** Physics substeps per rendered frame. */
const SUBSTEPS = 4;

/**
 * The minute to eighty seconds a round is aimed at.
 *
 * These lived with the ball fight, which shared the policy and has since been
 * taken out of the site; they are this mode's own now. The floor is what a video
 * has to clear to be worth posting and the ceiling is where a viewer leaves,
 * and the seed picks a length between them — a mode whose videos are all the
 * same length to the frame is a mode whose videos a duplicate detector can pair
 * up.
 */
export const SHORTEST = 60;
export const LONGEST = 80;

/** The length this seed asks for. From the seed alone, never from the play. */
export const lengthFor = (seed: number): number => {
  const seconds = createRng(seed ^ 0x7feb352d).range(SHORTEST, LONGEST);
  // Whole frames, so the video is an exact number of them.
  return Math.round(seconds * FPS) / FPS;
};

/**
 * The cast, in calendar order, with the colours sampled off the reference.
 *
 * Twelve is not a choice: it is the months, and the mode is the question the
 * reference asks with them.
 *
 * Every colour here was read out of a frame rather than matched by eye — the
 * median of an annulus inside each disc, taken clear of the writing at its
 * centre and of the compression at its rim. The hues were already right; what
 * was wrong was that they had been set at full saturation, and the reference's
 * are lighter and softer than that. Four of them are light enough to want black
 * writing on them, which is a rule and not a list — see `textOn`.
 */
export const MONTHS: readonly { label: string; color: string }[] = [
  { label: 'JAN', color: '#e94555' },
  { label: 'FEB', color: '#ef9544' },
  { label: 'MAR', color: '#f7d452' },
  { label: 'APR', color: '#c5ee63' },
  { label: 'MAY', color: '#5fc26d' },
  { label: 'JUN', color: '#50af9b' },
  { label: 'JUL', color: '#67d3ef' },
  { label: 'AUG', color: '#4169ee' },
  { label: 'SEP', color: '#8142ec' },
  { label: 'OCT', color: '#d04fed' },
  { label: 'NOV', color: '#ea508c' },
  { label: 'DEC', color: '#956d4a' },
];

/** Ball radius, in arena units. Measured off the reference: 22 px of 257. */
export const BALL = 0.085;

/** The zone in the middle, in arena units. Measured the same way: 67 of 257. */
export const ZONE = 0.26;

/**
 * How fast a ball travels, in arena radii a second.
 *
 * Measured off the reference by tracking one ball frame by frame: 0.555 arena
 * radii a second at the median and 0.61 at the ninetieth percentile, the spread
 * being what two balls trading speed on a bounce does. Slower than the fight,
 * because this is a game of drifting through a place rather than of running
 * somebody down: at the fight's speed the middle is crossed too fast for a hold
 * to mean anything.
 */
const SPEED = 0.58;

/**
 * Where the twelve start, as a fraction of the arena.
 *
 * Off the reference: a ball's centre sits at 0.725 of the way out.
 */
const OPENING_RING = 0.725;

/**
 * Which month stands at twelve o'clock.
 *
 * October, and then round clockwise in calendar order — which is the reference's
 * arrangement and not an arbitrary one: it puts the turn of the year at the
 * right of the clock rather than at the top, and that is what the picture looks
 * like before anything has moved.
 */
const FIRST_AT_TOP = 9;

/** Long enough that the target can always be read off the curves. */
const HARD_CAP = 150;

/**
 * The ending, in seconds.
 *
 * The game stops here, not the video: the twelve keep drifting, but nothing is
 * banked any more and the eleven who lost lose their colour on the instant,
 * leaving the winner the only one lit. Without it the video simply stopped —
 * the leading ring closed and the picture cut, which reads as a file that ran
 * out rather than as somebody winning.
 *
 * It is taken *out of* the length rather than added to it. The target is read
 * off the hold curves at the moment the game ends instead of at the last frame,
 * so the winner's ring still closes exactly as the game does and the video is
 * still the length the seed asked for, to the frame.
 */
const OUTRO = 2;

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
  /**
   * Nought while the game is on, one from the whistle.
   *
   * The painter reads it as "how much colour have the eleven lost", and it
   * moves between the two in a single frame rather than over a fade: the ring
   * closes and the result is *there*. A drain spread over half a second makes
   * the moment the ring filled and the moment the picture answers two separate
   * events, and the second one is the one that lands.
   */
  reveal: number;
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
 * The opening: the twelve on one ring, as a clock face.
 *
 * The same picture in every video, deliberately — it is the reference's opening
 * and it is the one frame a viewer reads before anything moves, so there is
 * nothing to gain by shuffling it. The seed decides which way each ball is
 * fired and nothing else, which is enough: a billiard in a circle never forgets
 * its opening angle.
 */
function start(seed: number): Live[] {
  const rng = createRng(seed ^ 0x51ed270b);
  const balls: Live[] = new Array<Live>(MONTHS.length);
  for (let slot = 0; slot < MONTHS.length; slot += 1) {
    // Twelve o'clock, then clockwise. The canvas has y downwards, so an angle
    // starting at minus a quarter turn and increasing runs clockwise on screen.
    const angle = -Math.PI / 2 + (slot / MONTHS.length) * Math.PI * 2;
    const month = (FIRST_AT_TOP + slot) % MONTHS.length;
    const heading = rng.next() * Math.PI * 2;
    balls[month] = {
      x: Math.cos(angle) * OPENING_RING,
      y: Math.sin(angle) * OPENING_RING,
      vx: Math.cos(heading) * SPEED,
      vy: Math.sin(heading) * SPEED,
      clashedAt: -99,
    };
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
      reveal: 0,
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
 * Is the leader banking a second on this very frame?
 *
 * The one question that decides when a round may end. A month's total only
 * climbs while it is alone in the middle, so it is a staircase: it rises for a
 * second or two, then sits flat for as long as the middle is somebody else's.
 * If the whistle goes on a flat stretch, the leader reached its total — and so
 * filled its ring — back at the top of the last step, and everything since has
 * been a full ring going nowhere.
 */
function climbing(frames: readonly MonthFrame[], at: number): boolean {
  if (at < 1 || at >= frames.length) return false;
  let lead = 0;
  for (let i = 1; i < MONTHS.length; i += 1) {
    if (frames[at].hold[i] > frames[at].hold[lead]) lead = i;
  }
  return frames[at].hold[lead] > frames[at - 1].hold[lead];
}

/**
 * The frame the whistle goes on.
 *
 * The nearest banking frame to the length asked for — but inside the run the
 * mode promises first, and only outside it if nothing in range banks at all. A
 * round that ends where the play allows rather than where the clock says will
 * drift, and left unbounded that drift ran to ninety-nine seconds on one seed
 * in sixty: half as long again as the mode says it is, and on a phone that is
 * paid for in memory as well as in patience. Bounded, it stays a video of the
 * length it claims to be, and the seeds with nowhere in range to stop are the
 * ones where a wait would otherwise be unavoidable.
 */
function whistleFor(frames: readonly MonthFrame[], wanted: number, ending: number): number {
  const lo = Math.max(1, Math.round(SHORTEST * FPS) - ending);
  const hi = Math.min(frames.length - 1, Math.round(LONGEST * FPS) - ending);
  for (let step = 0; step <= Math.max(wanted - lo, hi - wanted); step += 1) {
    if (wanted - step >= lo && climbing(frames, wanted - step)) return wanted - step;
    if (wanted + step <= hi && climbing(frames, wanted + step)) return wanted + step;
  }
  // Nothing in range banks. Then the last one that does before the range runs
  // out, which is to say: short rather than long. A round with nowhere to stop
  // inside its own window is one where the leader went quiet early, and running
  // on past the promise to find its next second costs a bigger file and a
  // phone's memory to show a ring that stopped moving a minute ago.
  for (let at = hi; at >= 1; at -= 1) {
    if (climbing(frames, at)) return at;
  }
  // Nobody ever led while banking, which twelve balls loose for two minutes will
  // not manage. The old fixed whistle is still a round, just one with a wait.
  return Math.max(1, Math.min(wanted, frames.length - 1));
}

/**
 * A round, ending on the frame the winner's ring closes.
 *
 * The target is read off the play rather than searched for: whatever the leader
 * has banked at the moment the game ends is what a full ring means, so the
 * winner's ring closes exactly as the game does and nobody else's ever did.
 *
 * **Which moment that is has to be earned.** The seed still asks for a length,
 * but a round cannot end wherever it likes: it can only end on a frame where
 * the leader is banking, or the ring will have been full and waiting — by six
 * seconds on average and by twelve at worst, measured over ten seeds, which is
 * an eternity in a video that runs a minute. So the round ends on the banking
 * frame nearest the length asked for, in either direction. The seed sets the
 * aim and the play decides where inside it the whistle can go, and the length
 * that comes out is reported rather than promised.
 *
 * After the whistle comes the ending: the balls keep moving, because a frozen
 * picture reads as a stall rather than as a result, but nothing is banked any
 * more, the zone belongs to the winner, and the other eleven go out.
 */
export function generateMonths(seed: number): MonthsRound {
  const { frames, events } = play(seed);
  const ending = Math.round(OUTRO * FPS);
  const wanted = Math.round(lengthFor(seed) * FPS) - ending;

  const decidedAt = whistleFor(frames, wanted, ending);

  const durationInFrames = Math.min(frames.length, decidedAt + ending);
  const decided = frames[decidedAt];

  let winner = 0;
  for (let i = 1; i < MONTHS.length; i += 1) {
    if (decided.hold[i] > decided.hold[winner]) winner = i;
  }
  const target = decided.hold[winner];

  const cut = frames.slice(0, durationInFrames).map((frame, i) => {
    if (i <= decidedAt) return frame;
    return {
      balls: frame.balls,
      // Frozen at the whistle: an arc that crept on after the result would say
      // the game was still being played.
      hold: decided.hold,
      holder: winner,
      reveal: 1,
    };
  });

  const duration = durationInFrames / FPS;
  const decidedAtSeconds = decidedAt / FPS;
  const kept = events.filter(
    // The balls still meet the wall and each other through the ending, and that
    // still ticks. Taking the middle does not: there is nothing left to take.
    (e) => e.t < duration && (e.t < decidedAtSeconds || e.kind !== 'take'),
  );
  kept.push({ t: decidedAtSeconds, kind: 'win', month: winner });

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
