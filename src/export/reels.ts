/**
 * Turning a played-out round into something the encoder will take.
 *
 * The encoder knows about frames and file names and nothing else; each mode
 * knows how to paint itself. This is the seam between them, and it is also where
 * a frame is let go of — the encoder never looks back, and a minute of round is
 * three and a half thousand snapshots that a phone would rather not still be
 * holding at the end.
 */

import type { Reel } from './encodeVideo';
import { CAST_FIT, CAST_WEIGHT, castFor, type CastName } from '../render/cast';
import { drawLineFrame } from '../render/drawLine';
import { drawMonthsFrame } from '../render/drawMonths';
import { drawPachinkoFrame } from '../render/drawPachinko';
import { drawPotatoFrame } from '../render/drawPotato';
import type { LineRound } from '../sim/line';
import type { MonthsRound } from '../sim/months';
import type { PachinkoRound } from '../sim/pachinko';
import type { PotatoRound } from '../sim/potato';
import { HEIGHT, WIDTH } from '../sim/style';

export interface Dress {
  /** White ground and complementary colours instead of the usual black. */
  invert?: boolean;
  /** Who the twelve balls are, where the mode has a cast to dress. */
  cast?: CastName;
}

/** Frames are dropped as they are painted; the array is the round's own. */
const release = <T>(frames: T[], index: number): void => {
  frames[index] = undefined as unknown as T;
};

/** Hold the Centre, painted from its own frames. */
export function monthsReel(round: MonthsRound, dress: Dress = {}): Reel {
  return {
    durationInFrames: round.durationInFrames,
    duration: round.duration,
    name: `month-${round.seed}-${castFor(dress.cast)[round.winner].key}-${Math.round(
      round.duration,
    )}s${dress.cast && dress.cast !== 'months' ? `-${dress.cast}` : ''}${
      dress.invert ? '-white' : ''
    }`,
    paint(ctx, index) {
      drawMonthsFrame(ctx, round.frames[index], {
        width: WIDTH,
        height: HEIGHT,
        invert: dress.invert,
        target: round.target,
        winner: round.winner,
        cast: castFor(dress.cast),
        fit: CAST_FIT[dress.cast ?? 'months'],
        weight: CAST_WEIGHT[dress.cast ?? 'months'],
      });
      release(round.frames, index);
    },
  };
}

/** Hot potato, painted from its own frames. */
export function potatoReel(round: PotatoRound, dress: Dress = {}): Reel {
  return {
    durationInFrames: round.durationInFrames,
    duration: round.duration,
    name: `potato-${round.seed}-${castFor(dress.cast)[round.survivor].key}-${Math.round(
      round.duration,
    )}s${dress.cast && dress.cast !== 'months' ? `-${dress.cast}` : ''}${
      dress.invert ? '-white' : ''
    }`,
    paint(ctx, index) {
      drawPotatoFrame(ctx, round.frames[index], {
        width: WIDTH,
        height: HEIGHT,
        invert: dress.invert,
        survivor: round.survivor,
        cast: castFor(dress.cast),
        fit: CAST_FIT[dress.cast ?? 'months'],
        weight: CAST_WEIGHT[dress.cast ?? 'months'],
      });
      release(round.frames, index);
    },
  };
}

/** Pachinko, painted from its own frames. */
export function pachinkoReel(round: PachinkoRound, dress: Dress = {}): Reel {
  return {
    durationInFrames: round.durationInFrames,
    duration: round.duration,
    name: `pachinko-${round.seed}-${castFor(dress.cast)[round.winner].key}-${Math.round(
      round.duration,
    )}s${dress.cast && dress.cast !== 'months' ? `-${dress.cast}` : ''}${
      dress.invert ? '-white' : ''
    }`,
    paint(ctx, index) {
      drawPachinkoFrame(ctx, round.frames[index], {
        width: WIDTH,
        height: HEIGHT,
        invert: dress.invert,
        winner: round.winner,
        cast: castFor(dress.cast),
        fit: CAST_FIT[dress.cast ?? 'months'],
        weight: CAST_WEIGHT[dress.cast ?? 'months'],
      });
      release(round.frames, index);
    },
  };
}

/** Line war, painted from its own frames. */
export function lineReel(round: LineRound, dress: Dress = {}): Reel {
  return {
    durationInFrames: round.durationInFrames,
    duration: round.duration,
    name: `line-${round.seed}-${castFor(dress.cast)[round.winner].key}-${Math.round(
      round.duration,
    )}s${dress.cast && dress.cast !== 'months' ? `-${dress.cast}` : ''}${
      dress.invert ? '-white' : ''
    }`,
    paint(ctx, index) {
      drawLineFrame(ctx, round.frames[index], {
        width: WIDTH,
        height: HEIGHT,
        invert: dress.invert,
        winner: round.winner,
        cast: castFor(dress.cast),
        fit: CAST_FIT[dress.cast ?? 'months'],
        weight: CAST_WEIGHT[dress.cast ?? 'months'],
      });
      release(round.frames, index);
    },
  };
}
