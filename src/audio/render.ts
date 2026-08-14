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

import type { DropRound } from '../sim/drop';
import type { Round } from '../sim/simulate';
import { SLOT, SPRITE } from './hits';
import { DEFAULT_KIT, KITS } from './kit';

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

export function renderRoundAudio(round: Round): Promise<AudioBuffer> {
  const list: Hit[] = [];
  for (const event of round.events) {
    switch (event.kind) {
      // The wall, rope changing hands, two balls meeting: all the same noise,
      // all unthinned. Anything else would not be this video's sound.
      case 'wall':
      case 'take':
      case 'break':
      case 'clash':
        list.push({ t: event.t, slot: TICK, gain: 0.8 });
        break;
      case 'death':
        list.push({ t: event.t, slot: OCTAVE, gain: 0.9 });
        break;
      case 'win':
        [0, 0.12, 0.24].forEach((offset, i) =>
          list.push({
            t: event.t + offset,
            slot: i === 2 ? OCTAVE : TICK,
            gain: 0.85,
          }),
        );
        break;
    }
  }
  return renderHits(round.duration, list, sprite);
}

/**
 * The drop's sound.
 *
 * The same tick, on the same terms: a fruit landing and two fruits becoming one
 * are the same noise, because that is what the fight does and there is no reason
 * for the two modes to sound like different sites. The octave is kept for the
 * one thing worth marking — a pair at the top of the ladder bursting.
 */
export function renderDropAudio(round: DropRound, kit = DEFAULT_KIT): Promise<AudioBuffer> {
  const chosen = KITS[kit] ?? KITS[DEFAULT_KIT];
  const list: Hit[] = [];
  for (const event of round.events) {
    switch (event.kind) {
      case 'land':
        list.push({ t: event.t, slot: TICK, gain: 0.7 });
        break;
      case 'merge':
        list.push({ t: event.t, slot: TICK, gain: 0.85 });
        break;
      case 'burst':
        [0, 0.1, 0.2].forEach((offset, i) =>
          list.push({
            t: event.t + offset,
            slot: i === 2 ? OCTAVE : TICK,
            gain: 0.85,
          }),
        );
        break;
    }
  }
  return renderHits(round.duration, list, () => decode(chosen.name, chosen.sample), 0.16);
}

/** Interleaved float samples, which is what the encoder wants. */
export function interleave(buffer: AudioBuffer): Float32Array {
  const channels = buffer.numberOfChannels;
  const out = new Float32Array(buffer.length * channels);
  for (let c = 0; c < channels; c += 1) {
    const data = buffer.getChannelData(c);
    for (let i = 0; i < buffer.length; i += 1) out[i * channels + c] = data[i];
  }
  return out;
}

/**
 * Plays a few ticks of a kit, so the picker can be listened to rather than read.
 *
 * Four hits at the cadence the chute feeds at, which is what the choice actually
 * sounds like — one tick in isolation tells you very little. Decoded through the
 * live context rather than the offline one so the buffer is at the rate the
 * hardware is running at.
 */
let speaker: AudioContext | null = null;
const heard = new Map<string, Promise<AudioBuffer>>();

export async function previewKit(index: number): Promise<void> {
  const chosen = KITS[index] ?? KITS[DEFAULT_KIT];
  speaker ??= new AudioContext();
  const ctx = speaker;
  // Browsers start a context suspended until a gesture; this is called from a
  // click, so resuming here is allowed.
  if (ctx.state === 'suspended') await ctx.resume();

  let buffer = heard.get(chosen.name);
  if (!buffer) {
    buffer = (async () => {
      const binary = atob(chosen.sample);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      return ctx.decodeAudioData(bytes.buffer);
    })();
    heard.set(chosen.name, buffer);
  }
  const sample = await buffer;

  const master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  [0, 0.34, 0.5, 0.84].forEach((offset, i) => {
    const node = ctx.createBufferSource();
    node.buffer = sample;
    const amp = ctx.createGain();
    amp.gain.value = i === 3 ? 0.9 : 0.75;
    node.connect(amp).connect(master);
    node.start(ctx.currentTime + offset);
  });
}
