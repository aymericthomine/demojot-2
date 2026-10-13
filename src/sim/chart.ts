/**
 * A chart, as a thing that can be played.
 *
 * The other five modes simulate something and record what happened. This one
 * has nothing to simulate: a line chart over time is a pure function of the
 * data and the clock, so there is no frame array here and no physics. What this
 * file does is read the numbers, work out the shape of the run, and hand the
 * painter the few things it cannot cheaply recompute sixty times a second.
 *
 * The reference this is cut to is a racing line chart: a title, a scrubber that
 * walks from the first step to the last, curves that draw themselves left to
 * right, and a stack of labels down the right-hand side that sorts itself as
 * the lines cross. Measured off it — the sweep is linear, it holds at each end,
 * and the vertical axis grows as the data needs it rather than being set to the
 * final maximum from the first frame. That last one is the whole trick: an axis
 * sized for the end makes the beginning look like nothing is happening.
 */

import { FPS } from './style';

/** One line: what it is called, what colour it is, and its number per step. */
export interface Series {
  name: string;
  color: string;
  /** One per step. A gap in the data is null and is not drawn. */
  values: readonly (number | null)[];
}

export interface ChartData {
  /** What the scrubber counts through — years, usually. */
  steps: readonly string[];
  series: readonly Series[];
}

export interface ChartRound {
  title: string;
  unit: string;
  data: ChartData;
  /** The axis ceiling after each step, already rounded to something sayable. */
  ceilings: readonly number[];
  durationInFrames: number;
  duration: number;
  /** Frames held on the first step before the sweep, and on the last after it. */
  introFrames: number;
  outroFrames: number;
}

/**
 * The palette, which is the reference's own.
 *
 * Sampled off its six lines rather than picked: a tan, an olive, a mid blue, a
 * mauve, a navy and a teal. They are muted and far apart in hue at the same
 * time, which is what lets six of them sit on one white ground without any two
 * reading as the same line. Four more follow in the same register for data that
 * has more than six columns in it.
 */
export const PALETTE: readonly string[] = [
  '#008ab1',
  '#b2814d',
  '#5087c6',
  '#86955b',
  '#27429e',
  '#96809f',
  '#c2553f',
  '#3f8f7a',
  '#8a6ab5',
  '#b08a2e',
];

/** 1, 2, 2.5 and 5 times a power of ten — the sizes a tick is allowed to be. */
export function niceStep(value: number): number {
  if (!(value > 0)) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  for (const step of [1, 2, 2.5, 5, 10]) {
    if (value <= step * power * 1.0001) return step * power;
  }
  return 10 * power;
}

/**
 * Where the axis stops.
 *
 * Rounding the maximum itself up to a nice number is the obvious thing and it
 * is wrong: fifty-eight rounds to a hundred, and the first half of the chart
 * then plays out in the bottom half of the plot with the top half empty. So the
 * tick is chosen first, at about a quarter of the maximum, and the axis stops
 * at the first whole tick above it — fifty-eight gives a tick of twenty and an
 * axis of sixty, which is a plot that is full.
 */
function ceiling(value: number): number {
  if (!(value > 0)) return 1;
  const step = niceStep(value / 4);
  return Math.ceil(value / step - 1e-9) * step;
}

/**
 * Read a table.
 *
 * The first row names the columns and its first cell is ignored — it names the
 * step column, which the scrubber shows rather than plots. Every row after it
 * is one step. A cell that is empty, or that is not a number, is a gap: the
 * line is not drawn there and picks up again where the numbers do, which is how
 * a series that starts late behaves without having to say so.
 */
export function parseChart(text: string): ChartData {
  const rows = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)
    .map((line) => line.split(/[,;\t]/).map((cell) => cell.trim()));
  if (rows.length < 2) throw new Error('A chart needs a header row and at least one step.');
  const head = rows[0];
  if (head.length < 2) throw new Error('A chart needs a step column and at least one series.');
  const steps = rows.slice(1).map((row) => row[0]);
  const series: Series[] = head.slice(1).map((name, column) => ({
    name,
    color: PALETTE[column % PALETTE.length],
    values: rows.slice(1).map((row) => {
      const cell = (row[column + 1] ?? '').replace(/[%\s]/g, '').replace(/,/g, '.');
      const value = Number.parseFloat(cell);
      return Number.isFinite(value) ? value : null;
    }),
  }));
  if (series.every((one) => one.values.every((value) => value === null))) {
    throw new Error('None of the cells read as numbers.');
  }
  return { steps, series };
}

/**
 * Work out the run.
 *
 * The axis ceiling is kept per step rather than for the whole chart, taken over
 * everything up to and including that step, so it only ever grows. A ceiling
 * that could fall would make the lines shrink back down as the leader passed,
 * which reads as the chart changing its mind.
 */
export function generateChart(
  data: ChartData,
  title: string,
  unit: string,
  seconds: number,
): ChartRound {
  let high = 0;
  const ceilings = data.steps.map((_, index) => {
    for (const one of data.series) {
      const value = one.values[index];
      if (value !== null && value > high) high = value;
    }
    return ceiling(high);
  });
  const durationInFrames = Math.max(FPS * 4, Math.round(seconds * FPS));
  return {
    title,
    unit,
    data,
    ceilings,
    durationInFrames,
    duration: durationInFrames / FPS,
    introFrames: Math.round(FPS * 1.5),
    outroFrames: Math.round(FPS * 2.5),
  };
}

/** Where the sweep has got to, as a fractional step index. */
export function stepAt(round: ChartRound, frame: number): number {
  const last = round.data.steps.length - 1;
  const span = round.durationInFrames - round.introFrames - round.outroFrames;
  if (span <= 0) return last;
  const t = (frame - round.introFrames) / span;
  return Math.max(0, Math.min(1, t)) * last;
}
