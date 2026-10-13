/**
 * A racing line chart, painted.
 *
 * Laid out off the reference rather than composed: its title block, its
 * scrubber, its plot and its label column all sit at measured fractions of the
 * frame, so a chart made here lands where one made there does. The numbers
 * below are that measurement, taken at 720 by 1280 and divided through.
 *
 * Three things in here are the whole look, and none of them is the line itself.
 *
 * **The axis grows.** Sized for the final maximum from the first frame, the
 * opening thirty seconds of any chart worth animating is a flat mat at the
 * bottom. The ceiling is taken over the data seen so far and eased between
 * steps, so the early years fill the plot and the lines settle downwards as the
 * scale opens out.
 *
 * **The labels sort themselves.** They sit at their own line's height and are
 * then pushed apart until none overlaps, from the top down and then from the
 * bottom up, so a pile-up in a crowded band spreads either way instead of
 * running off the plot. Without this, six series inside two points of each
 * other write on top of one another and the frame is unreadable exactly when
 * the race is closest.
 *
 * **The curve is sampled, not fitted.** A Catmull-Rom spline through the values
 * at uniform x, taken at twelve points a step and stroked as a polyline. At a
 * thousand pixels across that is indistinguishable from the curve, and it makes
 * a half-drawn segment free: the sweep simply stops sampling where it has got
 * to, instead of needing the curve split at an arbitrary parameter.
 */

import { niceStep, stepAt, type ChartRound } from '../sim/chart';
import { ink, legible } from './ink';

type Ctx = CanvasRenderingContext2D;

/* Measured off the reference, as fractions of the frame. */
const TITLE_BOTTOM = 0.262;
const TITLE_SIZE = 0.064;
const TITLE_WIDTH = 0.78;
const TRACK_Y = 0.3156;
const TRACK_X0 = 0.1417;
const TRACK_X1 = 0.8241;
const KNOB = 0.0236;
const PILL_SIZE = 0.0285;
const PLOT_X0 = 0.1639;
const PLOT_X1 = 0.6778;
const PLOT_Y0 = 0.3557;
const PLOT_Y1 = 0.7698;
const LABEL_X = 0.688;
const LABEL_SIZE = 0.0236;
const AXIS_SIZE = 0.0208;
const LINE_WIDTH = 0.005;
const DOT = 0.00625;

const EASE = (t: number): number => t * t * (3 - 2 * t);

/** A Catmull-Rom spline through evenly spaced values, read at a fractional index. */
function curve(values: readonly number[], at: number): number {
  const last = values.length - 1;
  if (last <= 0) return values[0] ?? 0;
  const i = Math.max(0, Math.min(last - 1, Math.floor(at)));
  const t = Math.max(0, Math.min(1, at - i));
  const p0 = values[Math.max(0, i - 1)];
  const p1 = values[i];
  const p2 = values[i + 1];
  const p3 = values[Math.min(last, i + 2)];
  return (
    0.5 *
    (2 * p1 +
      (p2 - p0) * t +
      (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t +
      (3 * p1 - 3 * p2 + p3 - p0) * t * t * t)
  );
}

/** The stretches of a series that actually have numbers in them. */
function runs(values: readonly (number | null)[]): { from: number; to: number }[] {
  const out: { from: number; to: number }[] = [];
  let from = -1;
  for (let i = 0; i <= values.length; i += 1) {
    const here = i < values.length && values[i] !== null;
    if (here && from < 0) from = i;
    if (!here && from >= 0) {
      out.push({ from, to: i - 1 });
      from = -1;
    }
  }
  return out;
}

/**
 * The value a line is showing, which is also where its dot and its label sit.
 *
 * Catmull-Rom overshoots, which is most of what makes these curves pleasant to
 * look at — and which put *minus nought point one percent* under a series whose
 * every value is zero or more. So the sample is held inside the range the
 * series actually covers. Local overshoot between two neighbours survives; a
 * number the data never reaches does not.
 */
function reading(
  values: readonly (number | null)[],
  span: { from: number; to: number },
  at: number,
): number {
  const inside = values.slice(span.from, span.to + 1) as number[];
  const got = curve(inside, Math.max(0, Math.min(span.to - span.from, at - span.from)));
  return Math.max(Math.min(...inside), Math.min(Math.max(...inside), got));
}

function wrap(ctx: Ctx, text: string, width: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > width) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

const say = (value: number, unit: string): string =>
  `${Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(1)}${unit}`;

export function drawChartFrame(
  ctx: Ctx,
  round: ChartRound,
  frame: number,
  options: { width: number; height: number; invert?: boolean },
): void {
  const { width: w, height: h, invert = false } = options;
  const at = stepAt(round, frame);
  const { steps, series } = round.data;
  const last = steps.length - 1;

  ctx.fillStyle = ink('#ffffff', invert);
  ctx.fillRect(0, 0, w, h);

  const dark = ink('#15263d', invert);
  const grey = ink('#8e93a0', invert);
  const faint = ink('#e3e5e9', invert);

  /* The title, laid out upwards from its own baseline so a long one grows into
     the space above rather than down into the scrubber. */
  let size = TITLE_SIZE * w;
  let lines: string[] = [];
  for (let tries = 0; tries < 6; tries += 1) {
    ctx.font = `700 ${Math.round(size)}px system-ui, sans-serif`;
    lines = wrap(ctx, round.title, TITLE_WIDTH * w);
    if (lines.length <= 3) break;
    size *= 0.88;
  }
  ctx.fillStyle = dark;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  const leading = size * 1.14;
  for (let i = 0; i < lines.length; i += 1) {
    ctx.fillText(lines[i], w / 2, TITLE_BOTTOM * h - (lines.length - 1 - i) * leading);
  }

  /* The scrubber. */
  const x0 = TRACK_X0 * w;
  const x1 = TRACK_X1 * w;
  const ty = TRACK_Y * h;
  const along = last > 0 ? at / last : 1;
  const knobX = x0 + (x1 - x0) * along;
  ctx.lineCap = 'round';
  ctx.lineWidth = Math.max(2, 0.0037 * w);
  ctx.strokeStyle = faint;
  ctx.beginPath();
  ctx.moveTo(x0, ty);
  ctx.lineTo(x1, ty);
  ctx.stroke();
  ctx.strokeStyle = ink('#3d4654', invert);
  ctx.beginPath();
  ctx.moveTo(x0, ty);
  ctx.lineTo(knobX, ty);
  ctx.stroke();

  const label = steps[Math.max(0, Math.min(last, Math.round(at)))];
  ctx.font = `700 ${Math.round(PILL_SIZE * w)}px system-ui, sans-serif`;
  const pillW = ctx.measureText(label).width + PILL_SIZE * w * 1.1;
  const pillH = PILL_SIZE * w * 1.75;
  const pillX = Math.max(pillW / 2 + 0.02 * w, Math.min(w - pillW / 2 - 0.02 * w, knobX));
  const pillY = ty - KNOB * w - pillH * 0.75;
  ctx.fillStyle = ink('#f4f5f7', invert);
  ctx.strokeStyle = faint;
  ctx.lineWidth = Math.max(1, 0.0019 * w);
  ctx.beginPath();
  ctx.roundRect(pillX - pillW / 2, pillY - pillH / 2, pillW, pillH, pillH * 0.26);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = dark;
  ctx.textBaseline = 'middle';
  ctx.fillText(label, pillX, pillY + pillH * 0.04);

  /* The knob, which is a clock, and whose hands run with the sweep. */
  const r = KNOB * w;
  ctx.fillStyle = ink('#ffffff', invert);
  ctx.strokeStyle = ink('#3d4654', invert);
  ctx.lineWidth = Math.max(1.5, 0.0028 * w);
  ctx.beginPath();
  ctx.arc(knobX, ty, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = Math.max(1.5, 0.0024 * w);
  ctx.beginPath();
  ctx.moveTo(knobX, ty);
  ctx.lineTo(knobX + Math.sin(along * Math.PI * 8) * r * 0.5, ty - Math.cos(along * Math.PI * 8) * r * 0.5);
  ctx.moveTo(knobX, ty);
  ctx.lineTo(knobX + Math.sin(along * Math.PI * 24) * r * 0.72, ty - Math.cos(along * Math.PI * 24) * r * 0.72);
  ctx.stroke();

  /* The plot, and an axis that has grown to whatever the data has needed. */
  const py0 = PLOT_Y0 * h;
  const py1 = PLOT_Y1 * h;
  const px0 = PLOT_X0 * w;
  const px1 = PLOT_X1 * w;
  const lower = round.ceilings[Math.max(0, Math.min(last, Math.floor(at)))];
  const upper = round.ceilings[Math.max(0, Math.min(last, Math.floor(at) + 1))];
  const top = lower + (upper - lower) * EASE(at - Math.floor(at));
  const plotY = (value: number): number => py1 - (value / top) * (py1 - py0);
  const plotX = (index: number): number => px0 + (last > 0 ? index / last : 1) * (px1 - px0);

  const tick = niceStep(top / 4);
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.font = `600 ${Math.round(AXIS_SIZE * w)}px system-ui, sans-serif`;
  ctx.fillStyle = grey;
  for (let value = 0; value <= top * 1.0001; value += tick) {
    const y = plotY(value);
    ctx.fillText(`${Number(value.toFixed(6))}${round.unit}`, px0 - 0.022 * w, y);
  }
  ctx.strokeStyle = faint;
  ctx.lineWidth = Math.max(1, 0.0019 * w);
  ctx.beginPath();
  ctx.moveTo(px0, py0);
  ctx.lineTo(px0, py1);
  ctx.lineTo(px1, py1);
  ctx.stroke();

  /* The lines. */
  const SAMPLES = 12;
  const shown: { name: string; color: string; value: number; y: number }[] = [];
  for (const one of series) {
    const colour = legible(one.color, invert);
    for (const span of runs(one.values)) {
      if (span.from > at) continue;
      const stop = Math.min(span.to, at);
      ctx.strokeStyle = colour;
      ctx.lineWidth = LINE_WIDTH * w;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      const count = Math.max(1, Math.round((stop - span.from) * SAMPLES));
      for (let k = 0; k <= count; k += 1) {
        const u = span.from + ((stop - span.from) * k) / count;
        const value = reading(one.values, span, u);
        const x = plotX(u);
        const y = plotY(value);
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      if (at >= span.from && at <= span.to + 0.5) {
        const value = reading(one.values, span, stop);
        ctx.fillStyle = colour;
        ctx.beginPath();
        ctx.arc(plotX(stop), plotY(value), DOT * w, 0, Math.PI * 2);
        ctx.fill();
        shown.push({ name: one.name, color: colour, value, y: plotY(value) });
      }
    }
  }

  /* The label column.
   *
   * Each entry wants to sit at its own line's height; two entries that want the
   * same band have to be told apart. The pass down the stack opens every gap to
   * a whole entry, which is enough on its own until the stack runs past the
   * foot of the plot — six series inside two points of each other need more
   * room than there is below them — and then a pass back up pushes the overflow
   * into the space above instead of off the frame. */
  const lineH = LABEL_SIZE * w * 1.3;
  const entry = lineH * 2.35;
  shown.sort((a, b) => a.y - b.y);
  let cursor = py0;
  for (const one of shown) {
    one.y = Math.max(one.y - lineH * 0.6, cursor);
    cursor = one.y + entry;
  }
  if (cursor > py1 && shown.length) {
    cursor = py1;
    for (let i = shown.length - 1; i >= 0; i -= 1) {
      shown[i].y = Math.min(shown[i].y, cursor - entry);
      cursor = shown[i].y;
    }
  }
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `700 ${Math.round(LABEL_SIZE * w)}px system-ui, sans-serif`;
  for (const one of shown) {
    ctx.fillStyle = one.color;
    ctx.fillText(one.name, LABEL_X * w, one.y + LABEL_SIZE * w);
    ctx.fillText(say(one.value, round.unit), LABEL_X * w, one.y + LABEL_SIZE * w + lineH);
  }
}
