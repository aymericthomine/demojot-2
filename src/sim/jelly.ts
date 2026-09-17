/**
 * Jelly.
 *
 * A flask — a chute feeding a round bowl — with a stream of the smallest object
 * coming down it for ever. Two of anything that touch become one of the next
 * thing up, which is bigger, so the bowl fills with small things that keep
 * turning into fewer large ones. The video ends when the top of the ladder is
 * reached.
 *
 * Everything here is measured off the references rather than chosen:
 *
 * - **The stream falls at a constant speed and is not pulled down.** Counted
 *   frame by frame in the chute: the objects are 112 pixels apart at the top and
 *   112 apart at the bottom of the bowl, and the whole column moves 5.5 pixels a
 *   frame — 330 pixels a second, flat. A falling object accelerates and its
 *   spacing opens out; this one does not, so it is a conveyor, not a drop. It
 *   only becomes a body with weight once it lands on something.
 * - **A new object every third of a second**, which is what 112 pixels of
 *   spacing at 330 pixels a second comes to.
 * - **The ladder climbs by a quarter each rung.** The smallest object is 51
 *   pixels across in a 1080-wide frame; the biggest, at the end, is about 380.
 *
 * The bowl is round and has no lid. Things can be pushed up the chute and they
 * can rest in its mouth, which is where a losing game silts up — but nothing is
 * ever removed for overflowing, because a minute of video wants the bowl full at
 * the end rather than tidied.
 */

import { createRng } from './random';
import { FPS } from './style';

/** Physics substeps per rendered frame. */
const SUBSTEPS = 4;

/**
 * The flask, in bowl radii, with the origin at the middle of the bowl.
 *
 * Measured at full size off the references: the bowl is 912 pixels across on the
 * inside of a 1080-wide frame and its middle sits 972 pixels down a 1920-tall
 * one, and the chute is 131 pixels wide on the inside. Everything the simulation
 * does is in these units, so the painter is the only place a pixel is named.
 */
export const CHUTE = 0.1425;

/** Where the chute's mouth stops being a chute and starts being the bowl. */
const MOUTH = -Math.sqrt(1 - CHUTE * CHUTE);

/** How high above the bowl an object is made, in bowl radii. */
const SPAWN = -2.4;

/** How fast the stream travels, in bowl radii a second. */
const FALL = 0.724;

/**
 * Seconds between one object entering the chute and the next.
 *
 * The references' own interval: 112 pixels of spacing at 330 pixels a second,
 * counted off the chute. It was overruled for a while — shortened to 0.28, which
 * fed the bowl faster and reached the last rung more often — and that showed up
 * in a measurement rather than in an opinion. Comparing the chute's frame-to-
 * frame motion against the references over the same fifteen seconds: theirs
 * 7.16, the shortened version 8.80. Too much was moving through the tube. At the
 * measured interval it is a match, and the reach of the ladder is paid for out
 * of the pile instead, which now jostles enough to keep finding pairs.
 */
const EVERY = 0.339;

/**
 * The smallest object's radius, in bowl radii, and what each rung multiplies by.
 *
 * Both measured: the stream's object is 51 pixels across in a 1080-wide frame
 * and the last rung is about 370, over the eight rungs the references deal. That
 * fixes the climb at a third again each time — it is not a free dial.
 */
const SMALLEST = 0.056;
const CLIMB = 1.32;

/**
 * Gravity on a landed object, in bowl radii a second squared, and how much of a
 * landing survives it.
 *
 * Slow and nearly floating, which is what was asked for: a fifth of the gravity
 * the first working version used, and half the bounce.
 *
 * An object arrives from the conveyor at 0.724 radii a second and leaves the
 * first bounce at half of that, so it rises about a ninth of the bowl's radius
 * — fifty pixels — and takes more than a second to go up and come back. The
 * pile keeps shifting for a long time after the last thing landed, because
 * there is almost no drag to stop it, but nothing in it ever moves quickly.
 *
 * An earlier version ran at 2.8 and 0.85 and was tuned to match a measurement
 * of the references' own motion. That measurement was reading a bug: everything
 * was being slammed downward by gravity from the tube's mouth rather than
 * arriving at the conveyor's speed, so the number it matched was violence, not
 * life.
 */
const GRAVITY = 0.6;

/** How much bounce is left in a landing. */
const BOUNCE = 0.5;

/** How much speed is rubbed off every second by everything it touches. */
const DRAG = 0.03;

/** Solver passes per substep. More passes, a firmer pile. */
const PASSES = 6;

/** How much of an overlap is pushed out per pass. */
const STIFFNESS = 0.42;

/**
 * Below this speed an object used to be treated as parked and had its movement
 * halved away.
 *
 * Nought, which is to say the rule is gone. It was there to settle the pile, and
 * settling the pile is exactly the thing that made this mode look wrong: the
 * references' bowl is never still.
 */
const ASLEEP = 0;

/**
 * How close two of a kind have to be to become one, as a multiple of their
 * touching distance.
 *
 * Exactly touching is the obvious rule and it strands material. A bouncy pile
 * keeps rearranging itself, so two of a kind spend most of their time near each
 * other rather than against each other, and a round ends with an odd one left
 * over at every rung — five blueberries, three lemons, three oranges, one apple
 * and no pineapple, with two hundred merges already spent. The last rung needs a
 * hundred and twenty-eight of the smallest and the stream delivers about two
 * hundred and ten, so there is no room for that much waste.
 *
 * A little reach is also what jelly does: two gels that meet flow together
 * rather than resting against each other.
 *
 * It has to be a multiple rather than a fixed slack, and that was measured too:
 * a fixed gap tied to the smallest rung reaches the last rung in 19 seeds of 24
 * however wide it is set, because the stranding that actually blocks the ladder
 * is at the *top*, where a leftover is worth sixty-four of the smallest. At a
 * multiple of 1.3 it is 23 of 24, and the median video comes to 67 seconds
 * against the references' 61 to 67.
 */
const MERGE_REACH = 1.3;

/**
 * How long a newly merged object has to wait before it can merge again.
 *
 * Without it a merge is not an event, it is an avalanche: eight of a kind
 * stacked under the stream collapse to one of the next kind up inside a single
 * substep, and the bowl is never more than two or three objects deep. At the
 * twentieth second this had three things in it where the references have a
 * dozen. A quarter of a second is enough for the new object to fall, roll and
 * find somewhere to sit before it is allowed to count again, which is what
 * spreads the pile across the floor instead of stacking it under the chute.
 */
const CALM = 0.26;

/** How hard a merge throws its new object sideways, in bowl radii a second. */
const KICK = 0.55;

/** Seconds the opening caption is held. */
export const CAPTION = 1.4;

/** Seconds of the ending held after the top of the ladder is reached. */
const OUTRO = 2.6;

/**
 * The floor and the ceiling on a video's length.
 *
 * The references run 61 to 67 seconds and end on the climb's last rung. The
 * stream's rate is what decides when that arrives, so this is not a whistle the
 * round is cut at — it is a floor the climax is not allowed to land below, and a
 * ceiling past which the biggest thing in the bowl takes the ending instead.
 */
const SHORTEST = 60;
const LONGEST = 74;

export interface JellyBody {
  x: number;
  y: number;
  r: number;
  /** Which rung of the ladder it is, from nought. */
  rung: number;
  /** Nought while it is falling down the chute, one once it has weight. */
  landed: boolean;
  /** Counts up from nought over the moment it was made by a merge. */
  born: number;
  /** Which way up it sits, in radians. */
  turn: number;
}

export interface JellySpark {
  x: number;
  y: number;
  r: number;
  /** Nought at the burst, one when it is gone. */
  age: number;
  rung: number;
}

export interface JellyRing {
  x: number;
  y: number;
  r: number;
  age: number;
  rung: number;
}

export interface JellyFrame {
  bodies: readonly JellyBody[];
  sparks: readonly JellySpark[];
  rings: readonly JellyRing[];
  /** One while the opening caption is up, falling to nought as it goes. */
  hello: number;
  /** Nought until the climax, then one: the rung's name is shown. */
  reveal: number;
  /** The rung the ending is about. */
  crowned: number;
}

export type JellyEventKind = 'drop' | 'land' | 'merge' | 'crown';

export interface JellyEvent {
  t: number;
  kind: JellyEventKind;
  /** The rung it happened to, which is what the note is picked from. */
  rung: number;
}

export interface JellyRound {
  seed: number;
  frames: JellyFrame[];
  events: JellyEvent[];
  /** The highest rung reached. */
  best: number;
  /** Whether the top of the ladder was actually made. */
  topped: boolean;
  /** How many merges it took. */
  merges: number;
  duration: number;
  durationInFrames: number;
}

/** How big a rung is, in bowl radii. */
export const rungRadius = (rung: number): number => SMALLEST * CLIMB ** rung;

interface Live extends JellyBody {
  vx: number;
  vy: number;
  spin: number;
  /** Seconds left before it may merge again. */
  calm: number;
}

/**
 * How far outside the flask a point is, and which way is out.
 *
 * The flask is the **union** of two shapes — a tube running off the top of the
 * frame and a bowl hanging under it — and treating them as two separate regions
 * with a boundary between them was the worst bug this mode has had.
 *
 * The tube's walls hold a ball while it is in the tube, and the tube has no
 * floor. The bowl's rim holds a ball everywhere except across its mouth, where
 * the tube opens into it: **the rim does not exist there**, and a ball passing
 * through is held by nothing at all.
 *
 * Without that last clause the rim was applied at the mouth as though it were
 * solid, and every object in the stream hit a wall the instant it left the tube
 * — at dead centre, a ball's middle is 0.99 from the bowl's middle and the
 * bowl's usable radius is 0.944, so it counted as embedded. Each one was marked
 * landed at the mouth and fell the rest of the way under gravity instead of at
 * the conveyor's constant speed. The column of falling objects stopped at the
 * mouth, the ones below it fell at whatever speed gravity had given them, and
 * they ran into each other on the way down. That is the descent not being
 * linear, and it is objects touching before they land.
 */
function outside(x: number, y: number, r: number): { nx: number; ny: number; depth: number } | null {
  if (y <= MOUTH) {
    // In the tube: two flat walls, and no floor.
    const edge = CHUTE - r;
    if (x > edge) return { nx: -1, ny: 0, depth: x - edge };
    if (x < -edge) return { nx: 1, ny: 0, depth: -edge - x };
    return null;
  }
  const away = Math.hypot(x, y);
  if (away <= 1 - r) return null;
  // Across the mouth the rim is open, so nothing is holding it.
  if (y < 0 && Math.abs(x) <= CHUTE) return null;
  return { nx: -x / away, ny: -y / away, depth: away - (1 - r) };
}

export function generateJelly(seed: number): JellyRound {
  const rng = createRng(seed ^ 0x51ed270b);

  /**
   * The ladder's last rung: the thing the video is named after.
   *
   * Eight rungs, which is what every reference deals, and it is arithmetic
   * rather than taste. Each rung is two of the one below, so the last needs a
   * hundred and twenty-eight of the smallest — and the stream delivers three a
   * second, about two hundred over a video. Nine rungs would need five hundred
   * and twelve and could never be reached: measured, a ten-rung ladder tops out
   * at the seventh every time.
   */
  const top = 7;

  const bodies: Live[] = [];
  const sparks: JellySpark[] = [];
  const rings: JellyRing[] = [];
  const frames: JellyFrame[] = [];
  const events: JellyEvent[] = [];

  const dt = 1 / (FPS * SUBSTEPS);
  let time = 0;
  let nextDrop = 0;
  let merges = 0;
  let best = 0;
  let topped = false;
  let toppedAt = -1;
  let decidedAt = -1;
  let crowned = 0;

  /**
   * Where the stream comes down: the middle of the chute, exactly.
   *
   * It used to be given a small lean off centre, different every seed, on the
   * theory that a dead-centre stream would stack the pile into a cone. It does
   * not — the pile spreads on its own — and the lean was visible: the column of
   * falling objects sat to one side of the tube it was falling down, which is
   * the first thing the eye checks.
   */
  const lean = 0;

  // The chute starts full. Every reference opens on a column already running
  // from the top of the frame down into the bowl — the stream has been going for
  // about four seconds before the first frame — and starting it empty gives the
  // video a slow, wrong first few seconds that none of them have.
  const spacing = FALL * EVERY;
  for (let k = 1; (SPAWN + k * spacing) < 0.3; k += 1) {
    bodies.push({
      x: lean,
      y: SPAWN + k * spacing,
      r: rungRadius(0),
      rung: 0,
      landed: false,
      born: 1,
      turn: rng.range(-0.25, 0.25),
      vx: 0,
      vy: FALL,
      spin: 0,
      calm: 0,
    });
  }
  nextDrop = EVERY;

  const cap = Math.round((LONGEST + OUTRO + 1) * FPS);
  for (let frame = 0; frame < cap; frame += 1) {
    frames.push({
      bodies: bodies.map((b) => ({
        x: b.x,
        y: b.y,
        r: b.r,
        rung: b.rung,
        landed: b.landed,
        born: b.born,
        turn: b.turn,
      })),
      sparks: sparks.map((s) => ({ x: s.x, y: s.y, r: s.r, age: s.age, rung: s.rung })),
      rings: rings.map((g) => ({ x: g.x, y: g.y, r: g.r, age: g.age, rung: g.rung })),
      // Held solid and then cut, rather than fading from the first frame. The
      // references hold it for a second and a bit at full strength and it is
      // gone inside a tenth of a second after that.
      hello: time < CAPTION ? 1 : Math.max(0, 1 - (time - CAPTION) / 0.22),
      reveal: decidedAt >= 0 ? Math.min(1, (frame - decidedAt) / (FPS * 0.5)) : 0,
      crowned,
    });
    if (decidedAt >= 0 && frame >= decidedAt + Math.round(OUTRO * FPS)) break;

    for (let step = 0; step < SUBSTEPS; step += 1) {
      time += dt;

      // The conveyor. A new object every third of a second, for ever — the
      // stream never stops, which is why the chute is still full of them in the
      // reference's last frame.
      if (decidedAt < 0 && time >= nextDrop) {
        nextDrop += EVERY;
        bodies.push({
          x: lean,
          y: SPAWN,
          r: rungRadius(0),
          rung: 0,
          landed: false,
          born: 0,
          turn: rng.range(-0.25, 0.25),
          vx: 0,
          vy: FALL,
          spin: 0,
          calm: 0,
        });
        events.push({ t: time, kind: 'drop', rung: 0 });
      }

      for (const body of bodies) {
        body.born = Math.min(1, body.born + dt * 5);
        body.calm = Math.max(0, body.calm - dt);
        if (!body.landed) {
          // Falling down the chute: a constant speed and nothing else. It stops
          // being a parcel and starts being a body the moment it meets one.
          body.y += FALL * dt;
          let touched = false;
          for (const other of bodies) {
            if (other === body || !other.landed) continue;
            const gap = Math.hypot(other.x - body.x, other.y - body.y);
            if (gap < other.r + body.r) {
              touched = true;
              break;
            }
          }
          if (!touched && outside(body.x, body.y, body.r)) touched = true;
          if (touched) {
            body.landed = true;
            body.vx = 0;
            body.vy = FALL;
            events.push({ t: time, kind: 'land', rung: body.rung });
          }
          continue;
        }

        body.vy += GRAVITY * dt;
        const slow = Math.max(0, 1 - DRAG * dt);
        body.vx *= slow;
        body.vy *= slow;
        body.x += body.vx * dt;
        body.y += body.vy * dt;
        body.turn += body.spin * dt;
        body.spin *= Math.max(0, 1 - 3 * dt);
      }

      // The pile. Overlaps are pushed apart rather than solved exactly, several
      // passes a substep: a stack of jelly wants to settle and stay settled, and
      // an exact solver on a hundred touching circles is a phone's whole budget.
      for (let pass = 0; pass < PASSES; pass += 1) {
        for (let i = 0; i < bodies.length; i += 1) {
          const a = bodies[i];
          if (!a.landed) continue;
          for (let j = i + 1; j < bodies.length; j += 1) {
            const b = bodies[j];
            if (!b.landed) continue;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const gap = Math.hypot(dx, dy);
            const want = a.r + b.r;
            if (gap >= want || gap === 0) continue;
            const nx = dx / gap;
            const ny = dy / gap;
            const push = (want - gap) * STIFFNESS;
            // Big things shove small things, not the other way about: weight
            // goes as the area, so a rung shoves the one below it four to one.
            const wa = a.r * a.r;
            const wb = b.r * b.r;
            const total = wa + wb;
            a.x -= nx * push * (wb / total);
            a.y -= ny * push * (wb / total);
            b.x += nx * push * (wa / total);
            b.y += ny * push * (wa / total);
            if (pass === 0) {
              const closing = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
              if (closing < 0) {
                const swap = closing * (1 + BOUNCE);
                a.vx += swap * nx * (wb / total);
                a.vy += swap * ny * (wb / total);
                b.vx -= swap * nx * (wa / total);
                b.vy -= swap * ny * (wa / total);
                a.spin += closing * ny * 0.4;
                b.spin -= closing * ny * 0.4;
              }
            }
          }
        }
        for (const body of bodies) {
          if (!body.landed) continue;
          const wall = outside(body.x, body.y, body.r);
          if (!wall) continue;
          body.x += wall.nx * wall.depth;
          body.y += wall.ny * wall.depth;
          if (pass === 0) {
            const into = body.vx * wall.nx + body.vy * wall.ny;
            if (into < 0) {
              body.vx -= (1 + BOUNCE) * into * wall.nx;
              body.vy -= (1 + BOUNCE) * into * wall.ny;
            }
          }
        }
      }

      for (const body of bodies) {
        if (!body.landed) continue;
        if (Math.hypot(body.vx, body.vy) < ASLEEP) {
          body.vx *= 0.5;
          body.vy *= 0.5;
        }
      }

      // Two of a kind that touch become one of the next kind up. Only settled
      // bodies merge: a parcel still coming down the chute passes through the
      // column above it, and merging on the way down would empty the chute.
      let merged = true;
      while (merged) {
        merged = false;
        for (let i = 0; i < bodies.length && !merged; i += 1) {
          const a = bodies[i];
          if (!a.landed || a.rung >= top || a.calm > 0) continue;
          for (let j = i + 1; j < bodies.length; j += 1) {
            const b = bodies[j];
            if (!b.landed || b.rung !== a.rung || b.calm > 0) continue;
            const gap = Math.hypot(b.x - a.x, b.y - a.y);
            if (gap > (a.r + b.r) * MERGE_REACH) continue;

            const rung = a.rung + 1;
            const r = rungRadius(rung);
            const x = (a.x + b.x) / 2;
            const y = (a.y + b.y) / 2;
            const vx = (a.vx + b.vx) / 2;
            const vy = (a.vy + b.vy) / 2;
            bodies.splice(j, 1);
            bodies.splice(i, 1);
            bodies.push({
              x,
              y,
              r,
              rung,
              landed: true,
              born: 0,
              turn: rng.range(-0.2, 0.2),
              // Thrown sideways as well as inheriting the pair's travel: a merge
              // that only ever dropped straight down built a column under the
              // chute and left the sides of the bowl bare.
              vx: vx + rng.range(-KICK, KICK),
              vy: vy - Math.abs(rng.range(0, KICK * 0.5)),
              spin: rng.range(-1, 1),
              calm: CALM,
            });
            merges += 1;
            best = Math.max(best, rung);
            events.push({ t: time, kind: 'merge', rung });

            rings.push({ x, y, r, age: 0, rung });
            // The last rung throws a burst across the whole frame: it is the
            // one moment the video is built towards, and the references make
            // far more of it than of any merge on the way up.
            const burst = rung >= top ? 90 : 6 + rung * 3;
            for (let k = 0; k < burst; k += 1) {
              const angle = rng.next() * Math.PI * 2;
              const speed = rng.range(0.15, 0.5) * (1 + rung * 0.25) * (rung >= top ? 3.2 : 1);
              sparks.push({
                x: x + Math.cos(angle) * r * 0.6,
                y: y + Math.sin(angle) * r * 0.6,
                r: rungRadius(0) * rng.range(0.12, 0.42),
                age: 0,
                rung,
              });
              // The spark's flight is kept on the spark itself rather than in a
              // second list, so a frame is one array and not two.
              const spark = sparks[sparks.length - 1];
              (spark as JellySpark & { vx: number; vy: number }).vx = Math.cos(angle) * speed;
              (spark as JellySpark & { vx: number; vy: number }).vy = Math.sin(angle) * speed;
            }

            if (rung >= top && toppedAt < 0) {
              toppedAt = time;
              topped = true;
            }
            merged = true;
            break;
          }
        }
      }

      for (let i = sparks.length - 1; i >= 0; i -= 1) {
        const spark = sparks[i] as JellySpark & { vx: number; vy: number };
        spark.age += dt / 1.1;
        spark.x += spark.vx * dt;
        spark.y += spark.vy * dt;
        spark.vy += GRAVITY * 0.25 * dt;
        spark.vx *= Math.max(0, 1 - 1.2 * dt);
        if (spark.age >= 1) sparks.splice(i, 1);
      }
      for (let i = rings.length - 1; i >= 0; i -= 1) {
        rings[i].age += dt / 0.55;
        if (rings[i].age >= 1) rings.splice(i, 1);
      }

      // Nothing that has fallen out of the picture is worth carrying.
      for (let i = bodies.length - 1; i >= 0; i -= 1) {
        if (bodies[i].y > 3.2) bodies.splice(i, 1);
      }

      // The climax is the last rung being made, held to the floor: a stream that
      // gets there at the fiftieth second keeps running until the minute has
      // been cleared, and the ending fires then rather than cutting the video
      // short. The first version fired only on the merge itself, so a seed that
      // topped out early never fired at all and ran to the ceiling instead.
      if (decidedAt < 0 && toppedAt >= 0 && time >= Math.max(toppedAt, SHORTEST - OUTRO)) {
        crowned = top;
        events.push({ t: time, kind: 'crown', rung: top });
        decidedAt = frames.length;
        break;
      }
      // Out of time rather than out of ladder: the biggest thing in the bowl
      // takes the ending instead, so a slow seed still ends on something.
      if (decidedAt < 0 && time >= LONGEST - OUTRO) {
        crowned = bodies.reduce((high, b) => Math.max(high, b.rung), 0);
        events.push({ t: time, kind: 'crown', rung: crowned });
        decidedAt = frames.length;
        break;
      }
    }
  }

  return {
    seed,
    frames,
    events,
    best,
    topped,
    merges,
    duration: frames.length / FPS,
    durationInFrames: frames.length,
  };
}
