/**
 * One frame, drawn from one simulation state.
 *
 * Pure: give it the same state and it paints the same pixels, in a browser
 * canvas or an offscreen one. That is what lets the preview on screen and the
 * downloaded MP4 be the same picture rather than two implementations that drift.
 *
 * Drawing order matters and is the whole trick to the look: the arena ring
 * first, then every thread, then the coloured pins on the ring, then the balls
 * on top. Threads passing behind other balls is what gives the flat picture its
 * depth.
 */

import type { Frame } from '../sim/simulate';
import { ink, legible } from './ink';
import { ANCHOR_TICK, ARENA, BALL_RADIUS, RIM_WIDTH, THREAD_WIDTH } from '../sim/style';

/**
 * What a ball wears, if anything.
 *
 * A glyph is anything you can type — an emoji, a flag, a letter — drawn in the
 * middle of the disc. Colour emoji bring their own colours and ignore the fill;
 * a plain character takes the ink. An image is drawn clipped to the circle and
 * cropped to fill it, so a rectangular logo does not squash.
 *
 * Both empty is the default: the ball is just its colour, as it always was.
 */
export interface BallFace {
  glyph?: string;
  image?: CanvasImageSource | null;
  /** Overrides the colour the seed dealt this ball — threads and pins included. */
  color?: string;
}

export interface Viewport {
  width: number;
  height: number;
  /** Print the negative: white ground, and every colour its complement. */
  invert?: boolean;
  /** One entry per ball, by index. Missing or empty means colour only. */
  faces?: readonly (BallFace | null | undefined)[];
  /**
   * Ball radius as a multiple of the measured one. Has to be the same number the
   * fight was played at, or the balls would take rope they are not touching.
   */
  size?: number;
  /**
   * Lay a chequerboard behind everything instead of a flat ground.
   *
   * The two greys are a hair apart on purpose: the picture is thread-thin lines
   * over the top of it, and a chequer with any real contrast in it competes with
   * them and wins.
   */
  checker?: boolean;
}

/** Squares across the frame, and the two tones they alternate between. */
const CHECKER_ACROSS = 11;
const CHECKER_TONES = ['#ffffff', '#ececec'] as const;

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  { width, height, invert = false, faces, size = 1, checker = false }: Viewport,
): void {
  const radius = width * ARENA;
  const cx = width / 2;
  const cy = height / 2;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = ink('#000000', invert);
  ctx.fillRect(0, 0, width, height);

  if (checker) {
    // Drawn straight rather than through a pattern: a canvas pattern would have
    // to be built per frame or held across them, and this is one fill and a loop
    // of rectangles that the encoder never sees change.
    const cell = width / CHECKER_ACROSS;
    ctx.fillStyle = CHECKER_TONES[0];
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = CHECKER_TONES[1];
    const down = Math.ceil(height / cell);
    for (let row = 0; row < down; row += 1) {
      for (let col = row % 2; col < CHECKER_ACROSS; col += 2) {
        ctx.fillRect(col * cell, row * cell, cell, cell);
      }
    }
  }

  // The arena.
  ctx.strokeStyle = ink('#ffffff', invert);
  ctx.lineWidth = radius * RIM_WIDTH;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  // A ball's colour is its identity: it paints the disc, the threads and the
  // pins on the rim, so an override has to reach all three or the picture would
  // disagree with itself.
  /**
   * What colour this ball is drawn in, threads and rim pins included.
   *
   * A colour the seed dealt is turned inside out along with everything else when
   * the picture is printed as a negative. A colour somebody picked is not: they
   * picked it off a swatch, and handing them its complement is not a negative,
   * it is the wrong colour. It broke things as well as looking wrong — white,
   * inverted, is the same black as the ring, and black, inverted, is the same
   * white as the ground, so a ball dressed in either lost its entire fan of
   * threads to the background.
   *
   * Images and glyphs were already left alone; this makes the colour match them.
   */
  const hue = (ball: Frame['balls'][number]) => {
    const chosen = faces?.[ball.index]?.color;
    return chosen ? legible(chosen, invert) : ink(ball.color, invert);
  };

  const toScreenX = (x: number) => cx + x * radius;
  const toScreenY = (y: number) => cy + y * radius;

  // Threads. A beaten ball's fan fades out over its last moments rather than
  // blinking away, which is what makes an elimination read as an elimination.
  ctx.lineCap = 'butt';
  ctx.lineWidth = radius * THREAD_WIDTH;
  for (const ball of frame.balls) {
    if (ball.threads.length === 0) continue;
    const alpha = ball.alive ? 1 : 1 - ball.fade;
    if (alpha <= 0.01) continue;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = hue(ball);
    ctx.beginPath();
    const bx = toScreenX(ball.x);
    const by = toScreenY(ball.y);
    for (const angle of ball.threads) {
      ctx.moveTo(bx, by);
      ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    }
    ctx.stroke();
  }

  // The pins, sitting on the ring itself.
  ctx.lineCap = 'butt';
  ctx.lineWidth = radius * RIM_WIDTH * 1.15;
  for (const ball of frame.balls) {
    const alpha = ball.alive ? 1 : 1 - ball.fade;
    if (alpha <= 0.01 || ball.threads.length === 0) continue;
    ctx.globalAlpha = alpha;
    ctx.strokeStyle = hue(ball);
    const half = ANCHOR_TICK / 2;
    for (const angle of ball.threads) {
      ctx.beginPath();
      ctx.arc(cx, cy, radius, angle - half, angle + half);
      ctx.stroke();
    }
  }

  // The balls.
  for (const ball of frame.balls) {
    const alpha = ball.alive ? 1 : 1 - ball.fade;
    if (alpha <= 0.01) continue;
    // A beaten ball swells slightly as it goes, so the eye catches which one left.
    const scale = ball.alive ? 1 : 1 + ball.fade * 0.7;
    ctx.globalAlpha = alpha;

    const bx = toScreenX(ball.x);
    const by = toScreenY(ball.y);
    const r = radius * BALL_RADIUS * size * scale;

    ctx.fillStyle = hue(ball);
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();

    const face = faces?.[ball.index];
    if (face?.image) {
      // Cropped to fill rather than stretched: a logo that is not square keeps
      // its proportions and loses its edges instead of being squashed.
      const source = face.image;
      const sw = 'width' in source ? Number(source.width) : 0;
      const sh = 'height' in source ? Number(source.height) : 0;
      if (sw > 0 && sh > 0) {
        const side = Math.min(sw, sh);
        ctx.save();
        ctx.beginPath();
        ctx.arc(bx, by, r, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(
          source,
          (sw - side) / 2,
          (sh - side) / 2,
          side,
          side,
          bx - r,
          by - r,
          r * 2,
          r * 2,
        );
        ctx.restore();
      }
    } else if (face?.glyph) {
      // Sized to sit inside the disc with a little air. Colour emoji paint
      // themselves; a plain character takes the ground colour so it reads
      // against the ball rather than disappearing into it.
      ctx.save();
      ctx.beginPath();
      ctx.arc(bx, by, r, 0, Math.PI * 2);
      ctx.clip();
      ctx.font = `${r * 1.5}px "Apple Color Emoji", "Noto Color Emoji", "Segoe UI Emoji", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = ink('#000000', invert);
      ctx.fillText(face.glyph, bx, by);
      ctx.restore();
    }

  }

  ctx.globalAlpha = 1;
}
