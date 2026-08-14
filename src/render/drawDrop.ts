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

import { BOWL, BOWL_X, BOWL_Y, type DropFrame } from '../sim/drop';
import { FRUITS, radiusOf } from '../sim/fruit';

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
}

/** Outline weight, in bowl radii. Measured: 8 px of 576, in a bowl of 0.519 W. */
const OUTLINE = 0.0285;

/** Half the neck, in bowl radii. Measured: 41.5 px of 576. */
export const NECK = 0.139;

/** The outline's colours, in order round the gradient. Sampled off the reference. */
const FLASK = ['#a7b0f7', '#c9aef0', '#f5c3dd', '#bfe0f5'];

/** Seconds for the gradient to come back round to where it started. */
const TURN = 22;

function ink(hex: string, invert: boolean): string {
  if (!invert) return hex;
  const n = Number.parseInt(hex.slice(1), 16);
  return `#${(0xffffff - n).toString(16).padStart(6, '0')}`;
}

/** `#rrggbb` at an opacity, which is what a halo's gradient stops need. */
function fade(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export function drawDropFrame(
  ctx: CanvasRenderingContext2D,
  frame: DropFrame,
  { width, height, time, invert = false, faces }: DropViewport,
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
  const sweep = ctx.createLinearGradient(
    cx - radius * Math.cos((time / TURN) * Math.PI * 2),
    cy - radius * Math.sin((time / TURN) * Math.PI * 2),
    cx + radius * Math.cos((time / TURN) * Math.PI * 2),
    cy + radius * Math.sin((time / TURN) * Math.PI * 2),
  );
  FLASK.forEach((hex, i) => sweep.addColorStop(i / (FLASK.length - 1), ink(hex, invert)));
  ctx.strokeStyle = sweep;
  ctx.lineWidth = radius * OUTLINE;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(cx, cy, radius, -Math.PI / 2 + mouth, -Math.PI / 2 - mouth + Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(toX(-NECK), 0);
  ctx.lineTo(toX(-NECK), wallY);
  ctx.moveTo(toX(NECK), 0);
  ctx.lineTo(toX(NECK), wallY);
  ctx.stroke();

  /** What this rank looks like, after any override. */
  const dress = (rank: number) => {
    const fruit = FRUITS[Math.min(rank, FRUITS.length - 1)];
    const face = faces?.[rank];
    return {
      color: ink(face?.color ?? fruit.color, invert),
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
        continue;
      }
    }

    // The glyph is the fruit here, not a badge on a disc, so it is drawn at the
    // full width of the circle. A core rather than a disc under it: an emoji has transparent corners, so a disc the
    // width of the circle would show as a coloured ring around the fruit. Half
    // the radius sits under the opaque middle of the glyph — and is the whole
    // fruit on a machine with no emoji font at all.
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = `${r * 2.1}px "Apple Color Emoji", "Noto Color Emoji", "Segoe UI Emoji", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(glyph, x, y);
  }
}
