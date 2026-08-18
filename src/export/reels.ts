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
import { drawDropFrame, type FruitFace } from '../render/drawDrop';
import type { ShapeSet } from '../render/shapes';
import { drawFrame, type BallFace } from '../render/drawFrame';
import type { DropRound } from '../sim/drop';
import type { Round } from '../sim/simulate';
import { FPS, HEIGHT, WIDTH } from '../sim/style';

export interface Dress {
  /** White ground and complementary colours instead of the usual black. */
  invert?: boolean;
}

export interface BattleDress extends Dress {
  faces?: readonly (BallFace | null | undefined)[];
  /**
   * How fast the balls were sent, for the file name only.
   *
   * The picture does not need it — the round was played at that speed and the
   * frames already show it — but two files of the same seed at two speeds are
   * two different videos and should not be named the same thing.
   */
  speed?: number;
}

export interface DropDress extends Dress {
  faces?: readonly (FruitFace | null | undefined)[];
  /** Draw the pieces from `shapes.ts` rather than typing emoji. */
  shape?: ShapeSet;
}

/** Frames are dropped as they are painted; the array is the round's own. */
const release = <T>(frames: T[], index: number): void => {
  frames[index] = undefined as unknown as T;
};

export function battleReel(round: Round, dress: BattleDress = {}): Reel {
  const { setup } = round;
  const size = setup.size === 1 ? '' : `-x${setup.size}`;
  const speed = !dress.speed || dress.speed === 1 ? '' : `-s${dress.speed}`;
  return {
    durationInFrames: round.durationInFrames,
    duration: round.duration,
    name: `balls-${setup.seed}-${setup.ballCount}b-${setup.threads}t-${Math.round(
      round.duration,
    )}s${size}${speed}${dress.invert ? '-white' : ''}`,
    paint(ctx, index) {
      drawFrame(ctx, round.frames[index], {
        width: WIDTH,
        height: HEIGHT,
        invert: dress.invert,
        faces: dress.faces,
        // From the round, never from the page: the fight was played with balls
        // this wide, so drawing them any other size would show rope being taken
        // at a distance.
        size: setup.size,
      });
      release(round.frames, index);
    },
  };
}

export function dropReel(round: DropRound, dress: DropDress = {}): Reel {
  return {
    durationInFrames: round.durationInFrames,
    duration: round.duration,
    name: `drop-${round.setup.seed}-${dress.shape ?? 'emoji'}-${Math.round(round.duration)}s${
      dress.invert ? '-white' : ''
    }`,
    paint(ctx, index) {
      drawDropFrame(ctx, round.frames[index], {
        width: WIDTH,
        height: HEIGHT,
        // The outline's gradient turns with the clock, so the painter has to
        // know where in the video this frame is.
        time: index / FPS,
        invert: dress.invert,
        faces: dress.faces,
        shape: dress.shape,
      });
      release(round.frames, index);
    },
  };
}
