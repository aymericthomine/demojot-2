/**
 * The drawn sets.
 *
 * Emoji are somebody else's artwork rendered by the machine's font, which means
 * they look different on every device and cannot be tuned. These are drawn here,
 * out of arcs and polygons and gradients, so a gem is the same gem everywhere
 * and its colour is a number this file owns.
 *
 * Eight of each, smallest first, because the ladder is a size ladder. Every one
 * of them is drawn to fit a circle of radius `r` centred on the point given —
 * the simulation only knows about circles, so anything that spills outside would
 * hang over its neighbours.
 */

export type ShapeSet = 'gems' | 'diamonds' | 'jellies' | 'planets';

export const SHAPE_SETS: readonly ShapeSet[] = ['gems', 'diamonds', 'jellies', 'planets'];

export const SHAPE_LABEL: Record<ShapeSet, string> = {
  gems: 'gems',
  diamonds: 'diamonds',
  jellies: 'jelly cats',
  planets: 'planets',
};

/** Eight colours per set: the body of the piece, and the halo it throws. */
const PALETTE: Record<ShapeSet, readonly string[]> = {
  gems: ['#e11d48', '#f97316', '#facc15', '#84cc16', '#10b981', '#3b82f6', '#a855f7', '#f1f5f9'],
  diamonds: [
    '#e2e8f0',
    '#bae6fd',
    '#7dd3fc',
    '#a5b4fc',
    '#c4b5fd',
    '#f9a8d4',
    '#fde68a',
    '#94a3b8',
  ],
  jellies: ['#fde68a', '#fbcfe8', '#a7f3d0', '#ddd6fe', '#bfdbfe', '#fed7aa', '#fecdd3', '#e9d5ff'],
  planets: ['#9ca3af', '#f97316', '#fbbf24', '#60a5fa', '#34d399', '#c084fc', '#f472b6', '#fde047'],
};

export const shapeColor = (set: ShapeSet, rank: number): string =>
  PALETTE[set][Math.min(rank, PALETTE[set].length - 1)];

/** `#rrggbb` mixed towards white (`amount` > 0) or black (< 0). */
function shade(hex: string, amount: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const mix = (channel: number): number =>
    Math.round(amount >= 0 ? channel + (255 - channel) * amount : channel * (1 + amount));
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

/** A regular polygon, rotated so a flat edge sits on top. */
function polygon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  sides: number,
  turn: number,
): void {
  ctx.beginPath();
  for (let i = 0; i < sides; i += 1) {
    const a = turn + (i / sides) * Math.PI * 2;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/** A round brilliant seen from above: a table, a crown, and eight facets. */
function gem(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, hue: string): void {
  const turn = Math.PI / 8;
  polygon(ctx, x, y, r, 8, turn);
  const body = ctx.createLinearGradient(x - r, y - r, x + r, y + r);
  body.addColorStop(0, shade(hue, 0.45));
  body.addColorStop(0.5, hue);
  body.addColorStop(1, shade(hue, -0.45));
  ctx.fillStyle = body;
  ctx.fill();

  // The crown facets, every other one caught by the light.
  const inner = r * 0.5;
  for (let i = 0; i < 8; i += 1) {
    const a0 = turn + (i / 8) * Math.PI * 2;
    const a1 = turn + ((i + 1) / 8) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a0) * r, y + Math.sin(a0) * r);
    ctx.lineTo(x + Math.cos(a1) * r, y + Math.sin(a1) * r);
    ctx.lineTo(x + Math.cos((a0 + a1) / 2) * inner, y + Math.sin((a0 + a1) / 2) * inner);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? shade(hue, 0.3) : shade(hue, -0.25);
    ctx.fill();
  }

  polygon(ctx, x, y, inner, 8, turn);
  ctx.fillStyle = shade(hue, 0.55);
  ctx.fill();
  ctx.strokeStyle = shade(hue, 0.8);
  ctx.lineWidth = Math.max(1, r * 0.05);
  ctx.stroke();
}

/** A brilliant cut in profile: table, girdle, and a pavilion coming to a point. */
function diamond(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  hue: string,
): void {
  const top = y - r * 0.62;
  const girdle = y - r * 0.18;
  const half = r * 0.95;
  const table = r * 0.42;

  ctx.beginPath();
  ctx.moveTo(x - table, top);
  ctx.lineTo(x + table, top);
  ctx.lineTo(x + half, girdle);
  ctx.lineTo(x, y + r * 0.95);
  ctx.lineTo(x - half, girdle);
  ctx.closePath();
  const body = ctx.createLinearGradient(x - half, top, x + half, y + r);
  body.addColorStop(0, shade(hue, 0.6));
  body.addColorStop(0.45, hue);
  body.addColorStop(1, shade(hue, -0.35));
  ctx.fillStyle = body;
  ctx.fill();

  // The pavilion, split into facets that alternate light and dark.
  const spread = [-0.62, -0.2, 0.2, 0.62];
  for (let i = 0; i < spread.length - 1; i += 1) {
    ctx.beginPath();
    ctx.moveTo(x + half * spread[i] * 1.5, girdle);
    ctx.lineTo(x + half * spread[i + 1] * 1.5, girdle);
    ctx.lineTo(x, y + r * 0.95);
    ctx.closePath();
    ctx.fillStyle = i % 2 ? shade(hue, 0.25) : shade(hue, -0.2);
    ctx.fill();
  }

  // The table, and the crown facets on either side of it.
  ctx.beginPath();
  ctx.moveTo(x - table, top);
  ctx.lineTo(x + table, top);
  ctx.lineTo(x + half * 0.75, girdle);
  ctx.lineTo(x - half * 0.75, girdle);
  ctx.closePath();
  ctx.fillStyle = shade(hue, 0.7);
  ctx.fill();

  ctx.strokeStyle = shade(hue, 0.85);
  ctx.lineWidth = Math.max(1, r * 0.045);
  ctx.beginPath();
  ctx.moveTo(x - table, top);
  ctx.lineTo(x + table, top);
  ctx.lineTo(x + half, girdle);
  ctx.lineTo(x, y + r * 0.95);
  ctx.lineTo(x - half, girdle);
  ctx.closePath();
  ctx.stroke();
}

/** A soft plush cat: a round body, two ears, and a face that fits inside it. */
function jelly(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, hue: string): void {
  // Far enough out to clear the body, which is drawn over them: an ear tucked
  // inside the head is an ear nobody sees.
  const ear = r * 0.5;
  for (const side of [-1, 1]) {
    const ex = x + side * r * 0.52;
    const ey = y - r * 0.78;
    ctx.beginPath();
    ctx.moveTo(ex - ear * 0.7, ey + ear * 0.8);
    ctx.quadraticCurveTo(ex - ear * 0.2, ey - ear, ex + ear * 0.75, ey + ear * 0.55);
    ctx.closePath();
    ctx.fillStyle = shade(hue, -0.12);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(ex - ear * 0.3, ey + ear * 0.7);
    ctx.quadraticCurveTo(ex - ear * 0.05, ey - ear * 0.35, ex + ear * 0.4, ey + ear * 0.55);
    ctx.closePath();
    ctx.fillStyle = shade('#fb7185', 0.45);
    ctx.fill();
  }

  const body = ctx.createRadialGradient(x - r * 0.3, y - r * 0.4, r * 0.1, x, y, r);
  body.addColorStop(0, shade(hue, 0.45));
  body.addColorStop(1, shade(hue, -0.18));
  ctx.beginPath();
  ctx.arc(x, y, r * 0.92, 0, Math.PI * 2);
  ctx.fillStyle = body;
  ctx.fill();

  ctx.fillStyle = shade(hue, -0.75);
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(x + side * r * 0.33, y - r * 0.05, r * 0.1, r * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.beginPath();
  ctx.moveTo(x - r * 0.11, y + r * 0.2);
  ctx.lineTo(x + r * 0.11, y + r * 0.2);
  ctx.lineTo(x, y + r * 0.34);
  ctx.closePath();
  ctx.fillStyle = '#fb7185';
  ctx.fill();

  ctx.fillStyle = 'rgba(251, 113, 133, 0.35)';
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(x + side * r * 0.6, y + r * 0.22, r * 0.16, r * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A lit sphere, with whatever this rank wears: craters, bands, or a ring. */
function planet(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  hue: string,
  rank: number,
): void {
  if (rank === 5) {
    // The ringed one. Drawn behind the ball, then again in front of its lower
    // half, which is what sells it as going round rather than sitting on top.
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.35);
    ctx.scale(1, 0.3);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.98, 0, Math.PI * 2);
    ctx.strokeStyle = shade(hue, 0.35);
    ctx.lineWidth = r * 0.3;
    ctx.stroke();
    ctx.restore();
  }

  const lit = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r);
  lit.addColorStop(0, shade(hue, 0.55));
  lit.addColorStop(0.55, hue);
  lit.addColorStop(1, shade(hue, -0.6));
  // The ringed one gives up some of its width so the ring has somewhere to go
  // without hanging over its neighbours.
  const ball = rank === 5 ? r * 0.62 : r * 0.88;
  ctx.beginPath();
  ctx.arc(x, y, ball, 0, Math.PI * 2);
  ctx.fillStyle = lit;
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(x, y, ball, 0, Math.PI * 2);
  ctx.clip();
  if (rank === 0 || rank === 3) {
    // Craters.
    const spots: [number, number, number][] = [
      [-0.3, -0.25, 0.22],
      [0.25, 0.1, 0.3],
      [-0.1, 0.45, 0.18],
      [0.45, -0.4, 0.14],
    ];
    ctx.fillStyle = shade(hue, -0.35);
    for (const [dx, dy, size] of spots) {
      ctx.beginPath();
      ctx.arc(x + dx * r, y + dy * r, size * r * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (rank >= 4) {
    // Bands, or continents on the blue one.
    ctx.fillStyle = shade(hue, rank === 6 ? -0.3 : 0.25);
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath();
      ctx.ellipse(x, y + i * r * 0.36, r, r * 0.13, 0.12, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  if (rank === 5) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x - r * 1.2, y, r * 2.4, r * 1.2);
    ctx.clip();
    ctx.translate(x, y);
    ctx.rotate(-0.35);
    ctx.scale(1, 0.3);
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.98, 0, Math.PI * 2);
    ctx.strokeStyle = shade(hue, 0.35);
    ctx.lineWidth = r * 0.3;
    ctx.stroke();
    ctx.restore();
  }

  if (rank === 7) {
    // The star: a corona rather than a surface.
    ctx.strokeStyle = shade(hue, 0.5);
    ctx.lineWidth = r * 0.08;
    for (let i = 0; i < 12; i += 1) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * r * 0.9, y + Math.sin(a) * r * 0.9);
      ctx.lineTo(x + Math.cos(a) * r * 1.05, y + Math.sin(a) * r * 1.05);
      ctx.stroke();
    }
  }
}

export function drawShape(
  ctx: CanvasRenderingContext2D,
  set: ShapeSet,
  rank: number,
  x: number,
  y: number,
  r: number,
): void {
  const hue = shapeColor(set, rank);
  if (set === 'gems') gem(ctx, x, y, r, hue);
  else if (set === 'diamonds') diamond(ctx, x, y, r, hue);
  else if (set === 'jellies') jelly(ctx, x, y, r, hue);
  else planet(ctx, x, y, r, hue, Math.min(rank, 7));
}
