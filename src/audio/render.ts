'use client';

/**
 * The sound, built from the fight.
 *
 * Nothing here is a recording. Every note is synthesised from the event list the
 * simulation produced, so the sound is not *synced* to the picture — it is the
 * same thing as the picture, and it cannot drift. It also means the audio is
 * ours: nothing borrowed, nothing that can get a video muted or demonetised.
 *
 * The register is taken from the reference: bright plucks between roughly 800
 * and 1300 Hz, about nine a second at their busiest, short enough that a dozen
 * can overlap without turning to mud.
 *
 * Four voices:
 *
 * - **Wall** — a struck note, one pitch per ball, so you learn to hear who is
 *   who. The scale is pentatonic, which is the cheap trick that makes a random
 *   sequence of notes sound deliberate.
 * - **Take** — the same note an octave up and much shorter: the tick of a thread
 *   changing hands.
 * - **Clash** — two balls meeting, a duller knock, low and quick.
 * - **Elimination** — a low hit with a fifth over it; and one chord at the end.
 *
 * The whole thing rises as balls are knocked out: fewer left, higher the notes,
 * which builds tension towards the finish without anyone arranging it.
 */

import type { Round, SimEvent } from '../sim/simulate';

const SAMPLE_RATE = 48000;
/** Room after the last event so a tail is not clipped. */
const TAIL = 1.2;

/** Minor pentatonic, in semitones. Hard to make ugly. */
const SCALE = [0, 3, 5, 7, 10];

/** E5, which puts the plucks in the reference's register. */
const ROOT = 659.25;

const hz = (semitone: number): number => ROOT * 2 ** (semitone / 12);

/** The note a ball speaks with, plus a lift as the field thins out. */
function pitchFor(event: SimEvent, ballCount: number): number {
  const step = SCALE[event.ball % SCALE.length];
  const octave = 12 * Math.floor(event.ball / SCALE.length);
  // `alive` counts down through the round, so this climbs.
  const tension = Math.max(0, ballCount - event.alive) * 1.2;
  return hz(step + octave + tension);
}

function struck(
  ctx: OfflineAudioContext,
  out: AudioNode,
  time: number,
  frequency: number,
  gain: number,
  decay: number,
  type: OscillatorType,
): void {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency, time);
  // A touch of downward glide is what makes a tone read as *struck* rather than
  // switched on.
  osc.frequency.exponentialRampToValueAtTime(frequency * 0.92, time + decay);

  amp.gain.setValueAtTime(0.0001, time);
  amp.gain.exponentialRampToValueAtTime(gain, time + 0.004);
  amp.gain.exponentialRampToValueAtTime(0.0001, time + decay);

  osc.connect(amp).connect(out);
  osc.start(time);
  osc.stop(time + decay + 0.02);
}

export async function renderRoundAudio(round: Round): Promise<AudioBuffer> {
  const length = Math.ceil((round.duration + TAIL) * SAMPLE_RATE);
  const ctx = new OfflineAudioContext(2, length, SAMPLE_RATE);

  // A dense round stacks a dozen notes a second, so the master sits low and a
  // limiter-ish curve is left to the encoder rather than clipping here.
  const master = ctx.createGain();
  master.gain.value = 0.75;
  master.connect(ctx.destination);

  const ballCount = round.setup.ballCount;

  for (const event of round.events) {
    const t = event.t;
    const frequency = pitchFor(event, ballCount);

    switch (event.kind) {
      case 'wall':
        struck(ctx, master, t, frequency, 0.2, 0.3, 'triangle');
        // A quiet octave above gives the note its edge without raising the level.
        struck(ctx, master, t, frequency * 2, 0.05, 0.1, 'sine');
        break;
      case 'take':
        struck(ctx, master, t, frequency * 2, 0.12, 0.08, 'triangle');
        break;
      case 'clash':
        struck(ctx, master, t, frequency / 2, 0.16, 0.13, 'sine');
        break;
      case 'death':
        struck(ctx, master, t, frequency / 4, 0.3, 0.9, 'sine');
        struck(ctx, master, t, (frequency / 4) * 1.5, 0.16, 0.7, 'triangle');
        break;
      case 'win':
        // The only chord in the piece.
        [0, 4, 7, 12].forEach((step, i) => {
          struck(ctx, master, t + i * 0.09, hz(step), 0.2, 0.8, 'triangle');
        });
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
