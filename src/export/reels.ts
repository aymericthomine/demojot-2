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
import { drawWiresFrame } from '../render/drawWires';
import { drawMonthsFrame } from '../render/drawMonths';
import { drawPachinkoFrame } from '../render/drawPachinko';
import { drawPotatoFrame } from '../render/drawPotato';
import { drawJellyFrame } from '../render/drawJelly';
import { themeFor, type ThemeName } from '../render/themes';
import type { WiresRound } from '../sim/wires';
import type { MonthsRound } from '../sim/months';
import type { PachinkoRound } from '../sim/pachinko';
import type { PotatoRound } from '../sim/potato';
import type { JellyRound } from '../sim/jelly';
import { HEIGHT, WIDTH } from '../sim/style';
import type { ChartRound } from '../sim/chart';
import { drawChartFrame } from '../render/drawChart';

export interface Dress {
  /** White ground and complementary colours instead of the usual black. */
  invert?: boolean;
  /** Who the twelve balls are, where the mode has a cast to dress. */
  cast?: CastName;
  /** Which ladder Jelly drops, where that is the mode being made. */
  theme?: ThemeName;
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

/** Keep the wires, painted from its own frames. */
export function wiresReel(round: WiresRound, dress: Dress = {}): Reel {
  return {
    durationInFrames: round.durationInFrames,
    duration: round.duration,
    name: `wires-${round.seed}-${castFor(dress.cast)[round.winner].key}-${Math.round(
      round.duration,
    )}s${dress.cast && dress.cast !== 'months' ? `-${dress.cast}` : ''}${
      dress.invert ? '-white' : ''
    }`,
    paint(ctx, index) {
      drawWiresFrame(ctx, round.frames[index], {
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

/**
 * Jelly, painted from its own frames.
 *
 * Named after the rung it reached rather than a winner, because there is no
 * winner — the video is about the ladder being climbed, and the thing at the top
 * of it is what the ending says.
 */
export function jellyReel(round: JellyRound, dress: Dress = {}): Reel {
  const theme = themeFor(dress.theme);
  const crown = theme.ladder[Math.min(round.best, theme.ladder.length - 1)];
  return {
    durationInFrames: round.durationInFrames,
    duration: round.duration,
    name: `jelly-${round.seed}-${theme.key}-${crown.name.toLowerCase().replace(/\s+/g, '-')}-${Math.round(
      round.duration,
    )}s`,
    paint(ctx, index) {
      drawJellyFrame(ctx, round.frames[index], { width: WIDTH, height: HEIGHT, theme });
      release(round.frames, index);
    },
  };
}

/**
 * A chart, painted from its data rather than from frames.
 *
 * Every other reel here hands back a snapshot the simulation took and then
 * drops it. This one has nothing stored: a line chart is a function of the
 * clock, so the painter is given the round itself and works the frame out. It
 * is also the one mode with nothing to listen to — a chart that ticked would be
 * a chart with a gimmick on it — so it says so rather than reporting a
 * soundtrack it failed to build.
 */
export function chartReel(round: ChartRound, dress: Dress = {}): Reel {
  const slug =
    round.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'chart';
  return {
    durationInFrames: round.durationInFrames,
    duration: round.duration,
    name: `chart-${slug}-${Math.round(round.duration)}s${dress.invert ? '-dark' : ''}`,
    mute: true,
    paint(ctx, index) {
      drawChartFrame(ctx, round, index, { width: WIDTH, height: HEIGHT, invert: dress.invert });
    },
  };
}
