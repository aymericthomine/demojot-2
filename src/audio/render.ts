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

/**
 * Major pentatonic, in semitones — the pitch classes counted off the reference,
 * which leans on A#, C and D with an F and a G behind them. Minor pentatonic is
 * what was here before, and it is the difference between wistful and bright.
 */
const SCALE = [0, 2, 4, 7, 9];

/**
 * D5. Chosen by measurement, not by ear: the reference's median note is D6, and
 * the scale degrees plus the tension lift carry roughly an octave above the
 * root, so this is where the middle of the piece lands on the middle of theirs.
 */
const ROOT = 587.33;

const hz = (semitone: number): number => ROOT * 2 ** (semitone / 12);

/**
 * The note a ball speaks with, plus a lift as the field thins out.
 *
 * Everything stays inside one octave of the root. Giving the sixth and seventh
 * balls an octave of their own, and letting the tension climb a semitone per
 * elimination, put the median note an octave above the reference — measured at
 * 2243 Hz against its 1153. The lift is now a scale degree at a time, so it is
 * still audible without walking off the top.
 */
function pitchFor(event: SimEvent, ballCount: number): number {
  const step = SCALE[event.ball % SCALE.length];
  const lift = SCALE[Math.min(SCALE.length - 1, Math.max(0, ballCount - event.alive))];
  return hz(step + lift);
}

/**
 * One note. A plain sine with a soft attack and an exponential tail.
 *
 * Measured off the reference: the second harmonic sits at a hundredth of the
 * first, which is to say there are no harmonics — these are pure tones, and that
 * is most of why they sound soft. A triangle wave was here before, and its odd
 * harmonics are what made the old version buzz.
 *
 * The pitch is also held steady. A downward glide reads as *struck*, but on a
 * pure tone it reads as a boing; the reference has none.
 */
function struck(
  ctx: OfflineAudioContext,
  out: AudioNode,
  time: number,
  frequency: number,
  gain: number,
  decay: number,
): void {
  const osc = ctx.createOscillator();
  const amp = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(frequency, time);

  amp.gain.setValueAtTime(0.0001, time);
  // Six milliseconds rather than four: fast enough to be a hit, slow enough to
  // take the click off the front of it.
  amp.gain.exponentialRampToValueAtTime(gain, time + 0.006);
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

  // The reference plays about one and a half notes a second. The simulation
  // reports six to fifteen events a second, and playing all of them is what made
  // the old soundtrack a rattle: a ball sweeping a fan fired off a dozen ticks in
  // half a second. So the small events are thinned to a floor spacing, and a
  // burst becomes one note instead of a machine gun. Walls and eliminations are
  // never thinned — they are the events worth hearing. A floor of three tenths
  // is what brings the count down to the reference's rate; a tenth still left it
  // at four a second against the reference's one and a half.
  const FLOOR = 0.3;
  let lastSmall = -1;

  for (const event of round.events) {
    const t = event.t;
    const frequency = pitchFor(event, ballCount);

    switch (event.kind) {
      case 'wall':
        // The note of the piece: a pure tone, a tenth of a second, which is what
        // the reference's decay measures.
        struck(ctx, master, t, frequency, 0.22, 0.22);
        break;
      case 'take':
      case 'break':
        if (t - lastSmall < FLOOR) break;
        lastSmall = t;
        // An octave up and quieter, so taking rope glitters over the bounces
        // rather than competing with them. `break` is a shade lower and shorter,
        // which is enough to tell the two apart without adding a new colour.
        struck(ctx, master, t, frequency * (event.kind === 'take' ? 1.5 : 1.25), 0.09, 0.16);
        break;
      case 'clash':
        if (t - lastSmall < FLOOR) break;
        lastSmall = t;
        struck(ctx, master, t, frequency / 2, 0.14, 0.14);
        break;
      case 'death':
        struck(ctx, master, t, frequency / 4, 0.26, 0.7);
        struck(ctx, master, t, (frequency / 4) * 1.5, 0.13, 0.55);
        break;
      case 'win':
        // The only chord in the piece, rolled rather than struck at once.
        [0, 4, 7, 12].forEach((step, i) => {
          struck(ctx, master, t + i * 0.09, hz(step), 0.18, 0.8);
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
