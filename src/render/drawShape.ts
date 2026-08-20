/**
 * Painting one frame of a turning cloud.
 *
 * Everything here is in service of the one rule the mode lives by: nothing in
 * the picture may say which side of the shape is nearer. So the projection drops
 * z without dividing by it, every point is drawn at the same size, and the
 * colour of a point comes from where it sits on the shape rather than from how
 * far away it is.
 */

import { FIT, TILT, type Cloud } from '../sim/shaper';

export interface ShapeLook {
  width: number;
  height: number;
  /** The palette, flattened to RGB triples — see `rampFor`. */
  ramp: Uint8Array;
  /** Turn, in revolutions. Frame `n` of a loop of `N` is `n / N`. */
  turn: number;
  /** Dot radius in pixels, at this frame size. */
  dot?: number;
  /** White ground, for a page that wants one. Points keep their colours. */
  invert?: boolean;
  /**
   * How far the camera is tilted down. The mode's own tilt unless it is given.
   *
   * Nought is looking at the shape dead level, which is what a flat thing wants
   * if it is meant to be seen in its own proportions: a tilt foreshortens height
   * and nothing else, so a wide flat mark comes out three per cent wider than it
   * is drawn.
   */
  tilt?: number;
}

/**
 * How big a point is, as a fraction of the frame width.
 *
 * Measured off the reference videos: dots about three pixels across in a 720
 * frame, which is a shade over two thousandths of the width. Big enough to be a
 * dot rather than a speck of noise a codec will throw away, small enough that a
 * dense cloud stays a cloud instead of closing up into a solid.
 */
const DOT = 0.0024;

export function drawShapeFrame(
  ctx: CanvasRenderingContext2D,
  cloud: Cloud,
  look: ShapeLook,
): void {
  const { width, height, ramp } = look;
  ctx.fillStyle = look.invert ? '#ffffff' : '#000000';
  ctx.fillRect(0, 0, width, height);

  const angle = look.turn * Math.PI * 2;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tilt = look.tilt ?? TILT;
  const tiltCos = Math.cos(tilt);
  const tiltSin = Math.sin(tilt);

  const scale = (width * FIT) / 2;
  const cx = width / 2;
  const cy = height / 2;
  const dot = look.dot ?? Math.max(1, width * DOT);
  const steps = ramp.length / 3;

  // Batched by colour: setting fillStyle is the expensive call in a canvas, and
  // a dense cloud would otherwise set it twenty thousand times a frame. The
  // points are drawn in ramp order instead, which changes nothing in the picture
  // — no point ever covers another one up in any way the eye can read.
  const buckets: number[][] = Array.from({ length: steps }, () => []);
  for (let i = 0; i < cloud.count; i += 1) {
    const slot = Math.min(steps - 1, (cloud.tint[i] * steps) | 0);
    buckets[slot].push(i);
  }

  for (let slot = 0; slot < steps; slot += 1) {
    const list = buckets[slot];
    if (list.length === 0) continue;
    ctx.fillStyle = `rgb(${ramp[slot * 3]},${ramp[slot * 3 + 1]},${ramp[slot * 3 + 2]})`;
    ctx.beginPath();
    for (const i of list) {
      const x = cloud.x[i];
      const y = cloud.y[i];
      const z = cloud.z[i];
      // Turned about the upright axis, then the camera's own tilt. The depth
      // that comes out of it is thrown away rather than divided by: that is the
      // orthographic projection, and it is the whole illusion.
      const rx = x * cos + z * sin;
      const rz = -x * sin + z * cos;
      const sy = y * tiltCos - rz * tiltSin;
      ctx.moveTo(cx + rx * scale + dot, cy - sy * scale);
      ctx.arc(cx + rx * scale, cy - sy * scale, dot, 0, Math.PI * 2);
    }
    ctx.fill();
  }
}
