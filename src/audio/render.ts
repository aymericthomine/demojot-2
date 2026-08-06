'use client';

/**
 * The sound, built from the fight.
 *
 * Every note is one of six recordings taken from the reference video, placed at
 * the moment the simulation says something happened. The sound is therefore not
 * *synced* to the picture — it is the same event list as the picture, and it
 * cannot drift.
 *
 * The hits are borrowed. That was asked for over the synthesised version that
 * was here before, and it is worth knowing what it costs: this is somebody
 * else's audio, and a platform that recognises it can mute or demonetise a video
 * that uses it. Nothing else in the project has that exposure.
 *
 * Five voices, all cut from the same six samples:
 *
 * - **Wall** — the note, one sample per ball, so you learn to hear who is who.
 * - **Take / break** — the ball's own sample, quieter and a touch quicker, so
 *   rope changing hands glitters over the bounces rather than competing with
 *   them. Always sounding the top note instead put the median of the whole
 *   soundtrack on one shrill pitch.
 * - **Clash** — a sample played slow, which drops it an octave and lengthens it.
 * - **Elimination** — slower still, and left to ring.
 * - **Win** — the six of them rolled in order, the only chord in the piece.
 *
 * The pitch climbs as balls are knocked out: the sample index walks up the set,
 * which builds tension towards the finish without anyone arranging it.
 */

import type { Round, SimEvent } from '../sim/simulate';
import { HITS, SLOT, SPRITE } from './hits';

const SAMPLE_RATE = 48000;
/** Room after the last event so a tail is not clipped. */
const TAIL = 1.2;

/**
 * The reference plays about one and a half notes a second. The simulation
 * reports six to fifteen events a second, and playing all of them is what made
 * the old soundtrack a rattle — a ball sweeping a fan fired off a dozen ticks in
 * half a second.
 *
 * So every ordinary event shares one clock: nothing sounds within a third of a
 * second of the last thing that did. Eliminations and the win ignore it, being
 * the two moments worth interrupting for.
 */
const FLOOR = 0.32;

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

/** Which sample a ball speaks with, walking up the set as the field thins. */
function slotFor(event: SimEvent, ballCount: number): number {
  const lift = Math.max(0, ballCount - event.alive);
  return (event.ball + lift) % HITS.length;
}

export async function renderRoundAudio(round: Round): Promise<AudioBuffer> {
  const hits = await sprite();
  const length = Math.ceil((round.duration + TAIL) * SAMPLE_RATE);
  const ctx = new OfflineAudioContext(2, length, SAMPLE_RATE);

  const master = ctx.createGain();
  master.gain.value = 0.8;
  master.connect(ctx.destination);

  /** One hit: a slot of the sprite, at a speed, at a level. */
  const play = (time: number, index: number, gain: number, rate = 1): void => {
    const source = ctx.createBufferSource();
    source.buffer = hits;
    source.playbackRate.value = rate;
    const amp = ctx.createGain();
    amp.gain.value = gain;
    source.connect(amp).connect(master);
    source.start(time, (index % HITS.length) * SLOT, SLOT);
  };

  const ballCount = round.setup.ballCount;
  let lastNote = -1;

  for (const event of round.events) {
    const t = event.t;
    const slot = slotFor(event, ballCount);

    switch (event.kind) {
      case 'wall':
        if (t - lastNote < FLOOR) break;
        lastNote = t;
        play(t, slot, 0.85);
        break;
      case 'take':
      case 'break':
        if (t - lastNote < FLOOR) break;
        lastNote = t;
        // The ball's own note, quieter, and `break` a shade slower — enough to
        // tell the two apart without adding a colour outside the set.
        play(t, slot, 0.38, event.kind === 'take' ? 1.06 : 0.94);
        break;
      case 'clash':
        if (t - lastNote < FLOOR) break;
        lastNote = t;
        play(t, slot, 0.5, 0.5);
        break;
      case 'death':
        play(t, slot, 0.7, 0.4);
        break;
      case 'win':
        HITS.forEach((_, i) => play(t + i * 0.1, i, 0.6));
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
