/**
 * Twelve balls, drawn rather than photographed.
 *
 * The sport cast is the one that needed no research and no licence: a football
 * is a pattern, not a badge, and nobody owns the fact that a basketball has
 * seams on it. Clubs would have been the other reading of "sport" and it is the
 * reading this deliberately did not take — twelve club crests are twelve
 * trademarks, and putting them in a video that gets posted is somebody else's
 * decision to make, not this file's.
 *
 * Every one of them is painted into a disc the caller has already clipped, and
 * paints its own ground first: the disc under it is the same grey a flag sits
 * on, and the ball covers it completely. They are read at about forty pixels
 * across in the scoreboard and thirty-five falling through Pachinko, so the
 * markings are the few that survive at that size — the pentagons, the seams,
 * the stitches — and nothing that would turn to mud.
 */

export type BallName =
  | 'soccer'
  | 'basket'
  | 'tennis'
  | 'volley'
  | 'baseball'
  | 'cricket'
  | 'rugby'
  | 'billiard'
  | 'bowling'
  | 'golf'
  | 'pingpong'
  | 'waterpolo';

type Paint = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => void;

const disc = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
): void => {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
};

/** A regular polygon, pointing whichever way it is turned to. */
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
    const angle = turn + (i / sides) * Math.PI * 2;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

/**
 * The parenthesis a panel seam makes when a ball is drawn flat.
 *
 * A seam running over a sphere reads, face on, as an arc that bulges towards
 * the near side and runs off the top and bottom edges — the bracket on a tennis
 * ball, the stitching on a baseball, the side seams of a basketball. It is
 * drawn from a circle centred well outside the ball and deliberately longer
 * than the ball is tall: the disc's clip is what cuts it to length, so the ends
 * meet the edge instead of stopping short of it.
 *
 * The first attempt drew each seam pole to pole, which put its two ends
 * together at the top and bottom and made a lens — the same lens on the tennis
 * ball, the baseball and the volleyball, three balls that then looked like one
 * ball in three colours.
 */
function bow(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  side: number,
  reach: number,
  width: number,
  color: string,
  turn = 0,
): void {
  const away = r * 1.25;
  const big = away + reach * r;
  ctx.save();
  ctx.translate(x, y);
  if (turn) ctx.rotate(turn);
  ctx.scale(side, 1);
  ctx.beginPath();
  ctx.arc(-away, 0, big, -1.2, 1.2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.restore();
}

const soccer: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#f4f5f7');
  ctx.fillStyle = '#16181d';
  polygon(ctx, x, y, r * 0.36, 5, -Math.PI / 2);
  ctx.fill();
  // Five more round the rim, pointing inwards, clipped by the disc — which is
  // what makes them read as the half-hexagons of a real ball rather than as
  // five loose dots.
  for (let i = 0; i < 5; i += 1) {
    const angle = -Math.PI / 2 + (i / 5) * Math.PI * 2 + Math.PI / 5;
    polygon(
      ctx,
      x + Math.cos(angle) * r * 1.02,
      y + Math.sin(angle) * r * 1.02,
      r * 0.42,
      5,
      angle + Math.PI / 2,
    );
    ctx.fill();
  }
};

const basket: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#e8762c');
  const line = r * 0.11;
  ctx.strokeStyle = '#1b1207';
  ctx.lineWidth = line;
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x, y + r);
  ctx.moveTo(x - r, y);
  ctx.lineTo(x + r, y);
  ctx.stroke();
  bow(ctx, x, y, r, 1, 0.52, line, '#1b1207');
  bow(ctx, x, y, r, -1, 0.52, line, '#1b1207');
};

const tennis: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#c9e83a');
  bow(ctx, x, y, r, 1, 0.5, r * 0.14, '#fbfdf5');
  bow(ctx, x, y, r, -1, 0.5, r * 0.14, '#fbfdf5');
};

const volley: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#f4f5f7');
  const line = r * 0.13;
  // Three panels rather than two seams: the same bracket turned by a third of a
  // circle each time, which is how a volleyball's panels actually run.
  for (let i = 0; i < 3; i += 1) {
    bow(ctx, x, y, r, 1, 0.42, line, '#2f6ff0', (i / 3) * Math.PI * 2);
  }
};

const baseball: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#f4f5f7');
  const line = r * 0.075;
  for (const side of [1, -1]) {
    bow(ctx, x, y, r, side, 0.6, line, '#d33a3a');
    // The stitches, which are what tell a baseball from a tennis ball once the
    // colour has gone: short ticks leaning off the seam it runs along.
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(side, 1);
    ctx.strokeStyle = '#d33a3a';
    ctx.lineWidth = line;
    for (let i = -2; i <= 2; i += 1) {
      const along = (i / 2.6) * r;
      const out = r * (0.6 - 0.13 * (along / r) ** 2 * 2.4);
      ctx.beginPath();
      ctx.moveTo(out - r * 0.16, along);
      ctx.lineTo(out + r * 0.13, along);
      ctx.stroke();
    }
    ctx.restore();
  }
};

const cricket: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#a01f2b');
  ctx.strokeStyle = '#f0e3d0';
  ctx.lineWidth = r * 0.08;
  ctx.beginPath();
  ctx.moveTo(x - r, y);
  ctx.lineTo(x + r, y);
  ctx.stroke();
  // The stitching either side of the seam, which is the only thing that says
  // this is a cricket ball and not a red circle.
  ctx.lineWidth = r * 0.06;
  for (let i = -2; i <= 2; i += 1) {
    const across = (i / 2.4) * r;
    ctx.beginPath();
    ctx.moveTo(x + across, y - r * 0.22);
    ctx.lineTo(x + across, y - r * 0.06);
    ctx.moveTo(x + across, y + r * 0.06);
    ctx.lineTo(x + across, y + r * 0.22);
    ctx.stroke();
  }
};

const rugby: Paint = (ctx, x, y, r) => {
  // The leather takes the whole disc, like every other ball here. It had a dark
  // green ground under an oval for a while — the shape is what makes a rugby
  // ball a rugby ball — but a ball on a pitch inside a cast of plain balls reads
  // as a different kind of picture, so the shape gives way and the lacing does
  // the identifying.
  disc(ctx, x, y, r, '#8a5a2b');
  // The lacing and nothing else. Panel seams were drawn in a darker brown as
  // well and taken off again: brown on brown at this size is not a seam, it is
  // a smudge, and the white is what says rugby ball on its own.
  ctx.strokeStyle = '#f0e3d0';
  ctx.lineWidth = r * 0.08;
  ctx.beginPath();
  ctx.moveTo(x - r * 0.36, y);
  ctx.lineTo(x + r * 0.36, y);
  ctx.stroke();
  for (let i = -2; i <= 2; i += 1) {
    const along = (i / 6.5) * r;
    ctx.beginPath();
    ctx.moveTo(x + along, y - r * 0.17);
    ctx.lineTo(x + along, y + r * 0.17);
    ctx.stroke();
  }
};

const billiard: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#15171b');
  disc(ctx, x, y, r * 0.46, '#f4f5f7');
  ctx.save();
  ctx.font = `700 ${Math.round(r * 0.7)}px system-ui, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#15171b';
  ctx.fillText('8', x, y + r * 0.03);
  ctx.restore();
};

const bowling: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#5d34a0');
  ctx.fillStyle = '#241146';
  for (const [dx, dy] of [
    [-0.3, -0.3],
    [0.3, -0.3],
    [0, 0.18],
  ]) {
    ctx.beginPath();
    ctx.arc(x + dx * r, y + dy * r, r * 0.15, 0, Math.PI * 2);
    ctx.fill();
  }
};

const golf: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#eef1f5');
  ctx.fillStyle = '#c3cad4';
  const step = r * 0.31;
  for (let row = -3; row <= 3; row += 1) {
    for (let col = -3; col <= 3; col += 1) {
      const dx = (col + (row % 2 ? 0.5 : 0)) * step;
      const dy = row * step * 0.88;
      if (dx * dx + dy * dy > (r * 0.82) ** 2) continue;
      ctx.beginPath();
      ctx.arc(x + dx, y + dy, r * 0.085, 0, Math.PI * 2);
      ctx.fill();
    }
  }
};

const pingpong: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#ff8a1f');
  // A plain ball needs the one thing that says it is a sphere and not a dot.
  ctx.beginPath();
  ctx.arc(x - r * 0.28, y - r * 0.3, r * 0.3, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fill();
};

const waterpolo: Paint = (ctx, x, y, r) => {
  disc(ctx, x, y, r, '#f2d02c');
  // The grid, straight and clipped by the disc: a water polo ball is the one
  // that is yellow and squared off, and curving these would make it a beach
  // ball instead.
  ctx.strokeStyle = '#1f7ab8';
  ctx.lineWidth = r * 0.075;
  for (const at of [-0.42, 0.42]) {
    ctx.beginPath();
    ctx.moveTo(x - r, y + at * r);
    ctx.lineTo(x + r, y + at * r);
    ctx.moveTo(x + at * r, y - r);
    ctx.lineTo(x + at * r, y + r);
    ctx.stroke();
  }
};

const PAINT: Record<BallName, Paint> = {
  soccer,
  basket,
  tennis,
  volley,
  baseball,
  cricket,
  rugby,
  billiard,
  bowling,
  golf,
  pingpong,
  waterpolo,
};

/** Paint one, filling a disc the caller has clipped. */
export function drawBall(
  ctx: CanvasRenderingContext2D,
  name: BallName,
  x: number,
  y: number,
  radius: number,
): void {
  PAINT[name](ctx, x, y, radius);
}
