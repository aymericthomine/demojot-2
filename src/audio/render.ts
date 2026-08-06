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

import type { Round } from '../sim/simulate';
import { SLOT, SPRITE } from './hits';

const SAMPLE_RATE = 48000;
/** Room after the last event so a tail is not clipped. */
const TAIL = 1.2;

/** The plain tick, and the same tick an octave up. */
const TICK = 0;
const OCTAVE = 1;

let decoded: Promise<AudioBuffer> | null = null;

/** The sprite, decoded once and reused. */
function sprite(): Promise<AudioBuffer> {
  decoded ??= (async () => {
    const binary = atob(SPRITE);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    // A throwaway context purely to decode; the samples are resampled to
    // whatever the rendering context runs at.
    const ctx = new OfflineAudioContext(1, 1, SAMPLE_RATE);
    return ctx.decodeAudioData(bytes.buffer);
  })();
  return decoded;
}

export async function renderRoundAudio(round: Round): Promise<AudioBuffer> {
  const hits = await sprite();
  const length = Math.ceil((round.duration + TAIL) * SAMPLE_RATE);
  const ctx = new OfflineAudioContext(2, length, SAMPLE_RATE);

  // Set by measurement, not by ear: the reference peaks at -7.5 dB, and at 0.5
  // this was hitting -1, which is a stretch away from clipping and reads as
  // shouty next to it.
  const master = ctx.createGain();
  master.gain.value = 0.22;
  master.connect(ctx.destination);

  /** One hit: a slot of the sprite, at a level. */
  const play = (time: number, index: number, gain: number): void => {
    const source = ctx.createBufferSource();
    source.buffer = hits;
    const amp = ctx.createGain();
    amp.gain.value = gain;
    source.connect(amp).connect(master);
    source.start(time, index * SLOT, SLOT);
  };

  for (const event of round.events) {
    switch (event.kind) {
      // The wall, rope changing hands, two balls meeting: all the same noise,
      // all unthinned. Anything else would not be this video's sound.
      case 'wall':
      case 'take':
      case 'break':
      case 'clash':
        play(event.t, TICK, 0.8);
        break;
      case 'death':
        play(event.t, OCTAVE, 0.9);
        break;
      case 'win':
        [0, 0.12, 0.24].forEach((offset, i) => play(event.t + offset, i === 2 ? OCTAVE : TICK, 0.85));
        break;
    }
  }

  return ctx.startRendering();
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
