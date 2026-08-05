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
import {
  ANCHOR_TICK,
  ARENA,
  BALL_RADIUS,
  BALL_RING,
  RIM_WIDTH,
  THREAD_WIDTH,
} from '../sim/style';

export interface Viewport {
  width: number;
  height: number;
}

export function drawFrame(
  ctx: CanvasRenderingContext2D,
  frame: Frame,
  { width, height }: Viewport,
): void {
  const radius = width * ARENA;
  const cx = width / 2;
  const cy = height / 2;

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, width, height);

  // The arena.
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = radius * RIM_WIDTH;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

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
    ctx.strokeStyle = ball.color;
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
    ctx.strokeStyle = ball.color;
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
    const r = radius * BALL_RADIUS * scale;

    ctx.fillStyle = ball.color;
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = radius * BALL_RING;
    ctx.beginPath();
    ctx.arc(bx, by, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.globalAlpha = 1;
}
