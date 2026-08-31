'use client';

/**
 * The sound, built from the fight.
 *
 * One recording, taken from the reference video, placed at every moment the
 * simulation says something happened. The sound is therefore not *synced* to the
 * picture — it is the same event list as the picture, and it cannot drift.
 *
 * **The same noise for threads and balls.** That is what the reference does and
 * what was asked for: three hundred and fourteen hits across its twenty-seven
 * seconds, all the same tick, whether a ball met the wall or took somebody's
 * rope. There is no scale, nothing climbs, and nothing is thinned — it plays a
 * dozen a second and that is the sound of the thing.
 *
 * The octave above is kept for the two moments worth marking: a ball going out,
 * and the end.
 *
 * The hits are borrowed. That was asked for over the synthesised version that
 * was here before, and it is worth knowing what it costs: this is somebody
 * else's audio, and a platform that recognises it can mute or demonetise a video
 * that uses it. Nothing else in the project has that exposure.
 */

import type { MonthsRound } from '../sim/months';
import type { PachinkoRound } from '../sim/pachinko';
import type { PotatoRound } from '../sim/potato';
import { SLOT, SPRITE } from './hits';

const SAMPLE_RATE = 48000;

/** The plain tick, and the same tick an octave up. */
const TICK = 0;
const OCTAVE = 1;

const decoded = new Map<string, Promise<AudioBuffer>>();

/** Any base64 WAV, decoded once and reused. */
function decode(key: string, base64: string): Promise<AudioBuffer> {
  let waiting = decoded.get(key);
  if (!waiting) {
    waiting = (async () => {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      // A throwaway context purely to decode; the samples are resampled to
      // whatever the rendering context runs at. Given a second of length rather
      // than a single frame: a context of length 1 is legal but degenerate, and
      // not every browser is happy being asked to decode through one.
      const ctx = new OfflineAudioContext(1, SAMPLE_RATE, SAMPLE_RATE);
      return ctx.decodeAudioData(bytes.buffer);
    })();
    decoded.set(key, waiting);
  }
  return waiting;
}

/** The fight's sprite: two slots, the tick and the same tick an octave up. */
const sprite = (): Promise<AudioBuffer> => decode('fight', SPRITE);

/** One tick: when, which slot of the sprite, how loud. */
interface Hit {
  t: number;
  slot: number;
  gain: number;
}

/**
 * The soundtrack, from a list of ticks.
 *
 * Both modes make one the same way — the same recording at every moment their
 * simulation says something happened — so only the list of moments differs.
 */
async function renderHits(
  duration: number,
  list: readonly Hit[],
  source: () => Promise<AudioBuffer>,
  slot = SLOT,
): Promise<AudioBuffer> {
  const hits = await source();
  // Exactly as long as the picture, not a frame more. A second of room used to
  // be left here so a tail could not be clipped, and it made a video that is
  // 61 seconds of picture report itself as 62: the container takes the longest
  // track. Nothing is lost — the last events land seconds before the end, and a
  // tick is a seventh of a second long.
  const length = Math.round(duration * SAMPLE_RATE);
  // Mono. Every hit is the same mono recording played at the same level, so the
  // two channels were identical and the second one cost eleven megabytes on a
  // minute-long round — memory a phone would rather spend on the encoder.
  const ctx = new OfflineAudioContext(1, length, SAMPLE_RATE);

  // Set by measurement, not by ear: the reference peaks at -7.5 dB, and at 0.5
  // this was hitting -1, which is a stretch away from clipping and reads as
  // shouty next to it.
  const master = ctx.createGain();
  master.gain.value = 0.22;
  master.connect(ctx.destination);

  /**
   * One hit. Slot 1 is the octave above — a second slot of the sprite where
   * there is one, and otherwise the same sample played twice as fast, which is
   * the same thing and costs nothing to ship.
   */
  const play = (time: number, index: number, gain: number): void => {
    const node = ctx.createBufferSource();
    node.buffer = hits;
    const octave = index === OCTAVE && hits.duration <= slot * 1.5;
    if (octave) node.playbackRate.value = 2;
    const amp = ctx.createGain();
    amp.gain.value = gain;
    node.connect(amp).connect(master);
    node.start(time, octave ? 0 : index * slot, slot);
  };

  for (const hit of list) {
    if (hit.t >= 0 && hit.t < duration) play(hit.t, hit.slot, hit.gain);
  }

  return ctx.startRendering();
}

/**
 * Hold the Centre's sound.
 *
 * The same tick as the fight for every bounce, off the wall or off each other,
 * and the octave kept for the two things worth marking: somebody taking the
 * middle, and the ring closing at the end. Taking the middle is the only event
 * in that mode a viewer needs pointed out — the picture already shows a bounce,
 * and it does not already show that the clock has started.
 */
export function renderMonthsAudio(round: MonthsRound): Promise<AudioBuffer> {
  const list: Hit[] = [];
  for (const event of round.events) {
    switch (event.kind) {
      case 'wall':
      case 'clash':
        list.push({ t: event.t, slot: TICK, gain: 0.7 });
        break;
      case 'take':
        list.push({ t: event.t, slot: OCTAVE, gain: 0.8 });
        break;
      case 'win':
        [0, 0.12, 0.24].forEach((offset, i) =>
          list.push({
            t: event.t - 0.3 + offset,
            slot: i === 2 ? OCTAVE : TICK,
            gain: 0.9,
          }),
        );
        break;
    }
  }
  return renderHits(round.duration, list, sprite);
}

/**
 * Hot potato's sound.
 *
 * The same tick for every knock, as everywhere else on the site. The octave is
 * kept for the two things that change the game: the potato changing hands, and
 * a month going out — and going out gets three of them, because it is the only
 * moment in the mode that is worth a beat of its own.
 */
export function renderPotatoAudio(round: PotatoRound): Promise<AudioBuffer> {
  const list: Hit[] = [];
  for (const event of round.events) {
    switch (event.kind) {
      case 'wall':
        list.push({ t: event.t, slot: TICK, gain: 0.7 });
        break;
      case 'pass':
        list.push({ t: event.t, slot: OCTAVE, gain: 0.85 });
        break;
      case 'out':
        [0, 0.09, 0.18].forEach((offset) =>
          list.push({ t: event.t + offset, slot: OCTAVE, gain: 0.9 }),
        );
        break;
      case 'win':
        [0, 0.12, 0.24].forEach((offset, i) =>
          list.push({ t: event.t + offset, slot: i === 2 ? OCTAVE : TICK, gain: 0.95 }),
        );
        break;
    }
  }
  return renderHits(round.duration, list, sprite);
}

/**
 * Pachinko's sound.
 *
 * A pachinko machine is a rattle, and the rattle is the point: every peg a ball
 * touches is the same tick as everywhere else on the site, unthinned, which runs
 * to a dozen and a half a second at the height of a wave. Quieter than the other
 * modes for exactly that reason — at the fight's level a wave of twelve would be
 * a wall rather than a rattle.
 *
 * The octave is kept for landings, and a landing worth twenty-five — or a
 * multiplier on the last wave — gets three of them, because those are the only
 * moments in the mode that change who is winning.
 */
export function renderPachinkoAudio(round: PachinkoRound): Promise<AudioBuffer> {
  const list: Hit[] = [];
  for (const event of round.events) {
    switch (event.kind) {
      case 'peg':
        list.push({ t: event.t, slot: TICK, gain: 0.45 });
        break;
      case 'land':
        list.push({ t: event.t, slot: OCTAVE, gain: 0.7 });
        break;
      case 'rich':
        [0, 0.09, 0.18].forEach((offset) =>
          list.push({ t: event.t + offset, slot: OCTAVE, gain: 0.85 }),
        );
        break;
      case 'win':
        [0, 0.12, 0.24].forEach((offset, i) =>
          list.push({ t: event.t + offset, slot: i === 2 ? OCTAVE : TICK, gain: 0.95 }),
        );
        break;
    }
  }
  return renderHits(round.duration, list, sprite);
}
