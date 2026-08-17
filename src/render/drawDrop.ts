/**
 * One frame of the drop.
 *
 * Pure, like the fight's painter: same state in, same pixels out, on a canvas or
 * an offscreen one.
 *
 * The shape is a flask — a circle with its top arc missing between two vertical
 * walls, which is where the chute comes in. Every measurement is off the
 * reference: the bowl is 0.519 of the frame width in radius and wider than the
 * frame is, so it is clipped by a few pixels either side; the outline is 8 px of
 * 576; the neck is 83 px across.
 *
 * Drawing order is the look: the flask, then every halo added together, then the
 * fruit on top. Halos are drawn in one pass with `lighter` so two fruits close
 * together light each other rather than cutting each other out.
 */

import { BOWL, BOWL_X, BOWL_Y, CHUTE_TOP, NECK, type DropFrame } from '../sim/drop';
import { FRUITS, radiusOf } from '../sim/fruit';
import { ink, legible } from './ink';
import { drawShape, shapeColor, type ShapeSet } from './shapes';

/**
 * What a rank wears.
 *
 * An image is drawn clipped to the circle and cropped square, which is what a
 * cut-out photograph wants. Without one the glyph is drawn, and the halo takes
 * the colour either way.
 */
export interface FruitFace {
  glyph?: string;
  image?: CanvasImageSource | null;
  color?: string;
}

export interface DropViewport {
  width: number;
  height: number;
  /** Seconds into the video, which is what turns the outline's gradient. */
  time: number;
  invert?: boolean;
  /** One entry per rank. Missing means the glyph and colour off the ladder. */
  faces?: readonly (FruitFace | null | undefined)[];
  /**
   * Draw the pieces rather than typing them. Set, and every rank without an
   * image of its own is drawn from `shapes.ts` instead of an emoji.
   */
  shape?: ShapeSet;
}

/** Outline weight, in bowl radii. Measured: 8 px of 576, in a bowl of 0.519 W. */
const OUTLINE = 0.0285;

/** How much of the ramp each rail of the neck takes. */
const RAIL = 0.06;

/**
 * The ramp itself: red at the start, blue at the end, and white where it begins.
 *
 * Hue runs to 280 rather than all the way round, so the two ends of the outline
 * meet at the neck as red and violet rather than as the same red twice.
 */
function rainbow(t: number): string {
  const clamped = Math.min(1, Math.max(0, t));
  // The first stretch of the left rail is washed out, which is what makes the
  // reference's neck read as white on one side and violet on the other.
  const light = 0.62 + 0.33 * Math.max(0, 1 - clamped / RAIL);
  // Eased rather than straight: sampled round the reference, the hue barely
  // moves through the reds down the left of the bowl and then runs quickly
  // through the greens and blues on the way up the right.
  return hsl(Math.pow(clamped, 1.3) * 0.78, light);
}

/** `hsl` at full saturation, as a hex this file can invert. */
function hsl(turn: number, light: number): string {
  const h = ((turn % 1) + 1) % 1;
  const chroma = (1 - Math.abs(2 * light - 1)) * 1;
  const x = chroma * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = light - chroma / 2;
  const [r, g, b] =
    h < 1 / 6
      ? [chroma, x, 0]
      : h < 2 / 6
        ? [x, chroma, 0]
        : h < 3 / 6
          ? [0, chroma, x]
          : h < 4 / 6
            ? [0, x, chroma]
            : h < 5 / 6
              ? [x, 0, chroma]
              : [chroma, 0, x];
  const byte = (v: number) => Math.round((v + m) * 255);
  return `#${((byte(r) << 16) | (byte(g) << 8) | byte(b)).toString(16).padStart(6, '0')}`;
}

/** `#rrggbb` at an opacity, which is what a halo's gradient stops need. */
function fade(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export function drawDropFrame(
  ctx: CanvasRenderingContext2D,
  frame: DropFrame,
  { width, height, invert = false, faces, shape }: DropViewport,
): void {
  const radius = width * BOWL;
  const cx = width * BOWL_X;
  const cy = height * BOWL_Y;
  const toX = (x: number) => cx + x * radius;
  const toY = (y: number) => cy + y * radius;

  ctx.fillStyle = invert ? '#ffffff' : '#000000';
  ctx.fillRect(0, 0, width, height);

  // The flask. The neck is an opening, not a line across the top: the arc
  // between the two walls is simply not drawn, which is how the reference lets
  // the chute through.
  const mouth = Math.asin(NECK);
  const wallY = toY(-Math.cos(mouth));
  ctx.lineWidth = radius * OUTLINE;
  ctx.lineCap = 'round';

  /**
   * The outline is a rainbow laid along its own length.
   *
   * Sampled every thirty degrees round the reference and at four times twenty
   * seconds apart: the hue runs from red just below the left of the neck, down
   * through orange and yellow to green at the bottom, up through cyan to blue on
   * the right, and it does not move — the same reading at two seconds and at
   * thirty-two. So it is one ramp along the path rather than anything animated,
   * and the left rail of the neck, where the ramp starts, is washed out to white.
   *
   * Drawn as segments rather than as a canvas gradient, which can only run in a
   * straight line and would put the same colour on the top and the bottom of the
   * bowl.
   */
  const STEPS = 96;
  const from = -Math.PI / 2 + mouth;
  const span = Math.PI * 2 - mouth * 2;
  const paint = (t: number) => ink(rainbow(t), invert);

  // The left rail: the start of the ramp, and white where it starts. It begins
  // where the chute does rather than at the top of the frame — measured at 312
  // px of 1920 in the reference, which is where a piece is let go.
  const railTop = toY(CHUTE_TOP);
  ctx.strokeStyle = paint(0);
  ctx.beginPath();
  ctx.moveTo(toX(-NECK), railTop);
  ctx.lineTo(toX(-NECK), wallY);
  ctx.stroke();

  // Round the bowl, anticlockwise from the left of the neck, which is the way
  // the reference's ramp runs.
  for (let i = 0; i < STEPS; i += 1) {
    const a0 = from - (i / STEPS) * span;
    const a1 = from - ((i + 1.02) / STEPS) * span;
    ctx.strokeStyle = paint(RAIL + (i / STEPS) * (1 - RAIL * 2));
    ctx.beginPath();
    ctx.arc(cx, cy, radius, a0, a1, true);
    ctx.stroke();
  }

  ctx.strokeStyle = paint(1);
  ctx.beginPath();
  ctx.moveTo(toX(NECK), railTop);
  ctx.lineTo(toX(NECK), wallY);
  ctx.stroke();

  /** What this rank looks like, after any override. */
  const dress = (rank: number) => {
    const fruit = FRUITS[Math.min(rank, FRUITS.length - 1)];
    const face = faces?.[rank];
    const own = shape ? shapeColor(shape, rank) : fruit.color;
    return {
      // A colour somebody picked is used as picked, in both grounds. Only the
      // ones this repository chose are turned inside out with the picture —
      // handing a chosen colour back as its complement is not a negative, it is
      // the wrong colour, and a chosen white or black would vanish into the
      // ground it was inverted onto.
      color: face?.color ? legible(face.color, invert) : ink(own, invert),
      glyph: face?.glyph || fruit.glyph,
      image: face?.image ?? null,
    };
  };

  /** The swell a merge leaves behind: up and back down over its quarter second. */
  const swell = (fresh: number) => (fresh < 0 ? 1 : 1 + 0.22 * Math.sin(Math.PI * fresh));

  ctx.globalCompositeOperation = 'lighter';
  for (const piece of frame.pieces) {
    const { color } = dress(piece.rank);
    const r = radiusOf(piece.rank) * radius * swell(piece.fresh);
    const x = toX(piece.x);
    const y = toY(piece.y);
    const halo = ctx.createRadialGradient(x, y, r * 0.6, x, y, r * 2.1);
    halo.addColorStop(0, fade(color, 0.55));
    halo.addColorStop(0.45, fade(color, 0.22));
    halo.addColorStop(1, fade(color, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.1, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalCompositeOperation = 'source-over';

  for (const piece of frame.pieces) {
    const { color, glyph, image } = dress(piece.rank);
    const r = radiusOf(piece.rank) * radius * swell(piece.fresh);
    const x = toX(piece.x);
    const y = toY(piece.y);

    // The ring left by a knock. Everything here is a rigid circle, so without
    // this an impact simply stops a piece dead and a pile of anything reads as
    // a pile of pebbles. Width and height only — nothing moves.
    const shake = piece.shake;
    ctx.save();
    if (shake !== 0) {
      ctx.translate(x, y);
      ctx.scale(1 + shake, 1 - shake);
      ctx.translate(-x, -y);
    }

    if (image) {
      const sw = 'width' in image ? Number(image.width) : 0;
      const sh = 'height' in image ? Number(image.height) : 0;
      if (sw > 0 && sh > 0) {
        // Cropped to fill rather than stretched, so a photograph that is not
        // square keeps its proportions and loses its edges instead.
        const side = Math.min(sw, sh);
        ctx.save();
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.clip();
        ctx.drawImage(
          image,
          (sw - side) / 2,
          (sh - side) / 2,
          side,
          side,
          x - r,
          y - r,
          r * 2,
          r * 2,
        );
        ctx.restore();
        ctx.restore();
        continue;
      }
    }

    if (shape) {
      // Drawn rather than typed: no font involved, so it is the same picture on
      // every machine.
      drawShape(ctx, shape, Math.min(piece.rank, 7), x, y, r);
      ctx.restore();
      continue;
    }

    // The glyph is the fruit here, not a badge on a disc, so it is drawn at the
    // full width of the circle. A core rather than a disc under it: an emoji has
    // transparent corners, so a disc the width of the circle would show as a
    // coloured ring around the fruit. Half the radius sits under the opaque
    // middle of the glyph — and is the whole fruit on a machine with no emoji
    // font at all.
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `${r * 2.1}px "Apple Color Emoji", "Noto Color Emoji", "Segoe UI Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(glyph, x, y);
    ctx.restore();
  }
}
