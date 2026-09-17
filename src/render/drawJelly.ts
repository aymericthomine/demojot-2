/**
 * One frame of Jelly.
 *
 * A flask on black: a chute running off the top of the frame into a round bowl,
 * drawn as a single hairline with a gradient down it — lavender at the top,
 * pink at the bottom — and nothing else. Every measurement here was taken off
 * the references at full size rather than chosen, which is why they are odd
 * numbers: the bowl is 912 pixels across on the inside of a 1080-wide frame and
 * its middle is 972 pixels down, and the chute is 131 wide between its walls.
 *
 * The flask is stroked **once**, as one path. Stroking the chute and the bowl
 * separately leaves two bright pips where they meet, because a join between two
 * strokes at partial alpha is two coats of paint — the same law that has caught
 * this project on text and on faded pictures.
 *
 * The objects are drawn back to front by size, so a big jelly sits in front of
 * the small ones it swallowed rather than behind them. Anything still falling
 * down the chute goes in front of everything: it is the only thing moving in the
 * top half of the frame and the eye is meant to follow it down.
 */

import { drawJelly } from './jelly3d';
import type { JellyFrame } from '../sim/jelly';
import { CHUTE, rungRadius } from '../sim/jelly';
import type { Theme } from './themes';

export interface JellyLook {
  width: number;
  height: number;
  /** Which ladder is being dropped. */
  theme: Theme;
}

/** The bowl, in fractions of the frame: middle, and radius. */
const BOWL_X = 0.5;
const BOWL_Y = 972 / 1920;
const BOWL_R = 456 / 1080;

/** The flask's hairline, as a fraction of the frame's width. */
const LINE = 11 / 1080;

/** The two ends of the gradient down the glass. */
const GLASS_TOP = '#c3aeed';
const GLASS_LOW = '#fbcbdf';

/** Where the opening caption sits, as a fraction of the frame's height. */
const HELLO_Y = 704 / 1920;

/** How big the writing is, as a fraction of the frame's width. */
const HELLO_SIZE = 62 / 1080;
const CROWN_SIZE = 66 / 1080;

/** The flask as one path: down the chute, round the bowl, back up the chute. */
function flask(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  r: number,
  top: number,
): void {
  const half = CHUTE * r;
  // Where the chute's wall meets the bowl's arc, as an angle from the middle.
  const meet = Math.asin(half / r);
  ctx.beginPath();
  ctx.moveTo(cx - half, top);
  ctx.lineTo(cx - half, cy - Math.cos(meet) * r);
  ctx.arc(cx, cy, r, -Math.PI / 2 - meet, -Math.PI / 2 + meet, true);
  ctx.lineTo(cx + half, top);
}

/** Plain centred writing, in the reference's typewriter face. */
function write(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  alpha: number,
  weight = 700,
): void {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = `${weight} ${Math.round(size)}px ui-monospace, "DejaVu Sans Mono", monospace`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = size * 0.35;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, x, y);
  ctx.restore();
}

export function drawJellyFrame(
  ctx: CanvasRenderingContext2D,
  frame: JellyFrame,
  look: JellyLook,
): void {
  const { width, height, theme } = look;
  const cx = width * BOWL_X;
  const cy = height * BOWL_Y;
  const r = width * BOWL_R;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  const place = (x: number, y: number): [number, number] => [cx + x * r, cy + y * r];

  // The glass. One path, one stroke, and a bloom laid under it in the same
  // shape so the line looks lit rather than drawn.
  const glass = ctx.createLinearGradient(0, 0, 0, cy + r);
  glass.addColorStop(0, GLASS_TOP);
  glass.addColorStop(0.55, '#d9b8e4');
  glass.addColorStop(1, GLASS_LOW);
  ctx.save();
  ctx.lineWidth = width * LINE;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = glass;
  ctx.shadowColor = 'rgba(200,170,240,0.55)';
  ctx.shadowBlur = width * LINE * 2.2;
  flask(ctx, cx, cy, r, -width * LINE);
  ctx.stroke();
  ctx.restore();

  // Rings: the shockwave a merge leaves behind.
  for (const ring of frame.rings) {
    const rung = theme.ladder[Math.min(ring.rung, theme.ladder.length - 1)];
    const [x, y] = place(ring.x, ring.y);
    const grow = ring.r * r * (1 + ring.age * 1.5);
    ctx.save();
    ctx.globalAlpha = (1 - ring.age) ** 2 * 0.9;
    ctx.strokeStyle = rung.color;
    ctx.lineWidth = Math.max(1, ring.r * r * 0.14 * (1 - ring.age));
    ctx.shadowColor = rung.color;
    ctx.shadowBlur = grow * 0.35;
    ctx.beginPath();
    ctx.arc(x, y, grow, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  // The pile, smallest first, so the big ones sit in front.
  const settled = frame.bodies.filter((b) => b.landed).slice().sort((a, b) => a.r - b.r);
  const falling = frame.bodies.filter((b) => !b.landed);
  for (const body of [...settled, ...falling]) {
    const rung = theme.ladder[Math.min(body.rung, theme.ladder.length - 1)];
    const [x, y] = place(body.x, body.y);
    drawJelly(ctx, rung.shape, rung.color, x, y, body.r * r, {
      glow: 1,
      pop: body.born,
      turn: body.turn,
    });
  }

  // Sparks last: they are thrown out over everything.
  for (const spark of frame.sparks) {
    const rung = theme.ladder[Math.min(spark.rung, theme.ladder.length - 1)];
    const [x, y] = place(spark.x, spark.y);
    const size = spark.r * r * (1 - spark.age * 0.35);
    ctx.save();
    ctx.globalAlpha = (1 - spark.age) ** 1.5;
    ctx.fillStyle = rung.color;
    ctx.shadowColor = rung.color;
    ctx.shadowBlur = size * 2.5;
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.6, size), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  // The captions. The opening one is held for a second and a bit and then goes;
  // the ending one names the rung that was reached, which is the only reason the
  // ladder has names at all.
  write(ctx, 'Relax...', cx, height * HELLO_Y, width * HELLO_SIZE, frame.hello);
  if (frame.reveal > 0) {
    const rung = theme.ladder[Math.min(frame.crowned, theme.ladder.length - 1)];
    write(ctx, rung.name, cx, height * HELLO_Y, width * CROWN_SIZE, frame.reveal);
    write(ctx, ':D', cx, height * HELLO_Y + width * CROWN_SIZE * 0.95, width * CROWN_SIZE * 0.6, frame.reveal);
  }
}

/** The biggest an object in this theme is ever drawn, for a preview to size by. */
export const biggestRadius = (): number => rungRadius(7);
