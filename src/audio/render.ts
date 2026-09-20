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

import type { WiresRound } from '../sim/wires';
import type { MonthsRound } from '../sim/months';
import type { PachinkoRound } from '../sim/pachinko';
import type { PotatoRound } from '../sim/potato';
import type { JellyRound } from '../sim/jelly';
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

/**
 * Keep the wires' sound.
 *
 * The tick for a bounce off the wall, the octave for a thread changing hands,
 * and three of them for a side going out. A ball crossing a fan takes an armful
 * in one substep, so takes are held to one note every tenth of a second:
 * without that, a single pass is fifty octaves and the mode has no sound at
 * all, only noise.
 */
export function renderWiresAudio(round: WiresRound): Promise<AudioBuffer> {
  const list: Hit[] = [];
  let lastTake = -99;
  for (const event of round.events) {
    switch (event.kind) {
      case 'wall':
        list.push({ t: event.t, slot: TICK, gain: 0.55 });
        break;
      case 'take':
      case 'break':
        if (event.t - lastTake < 0.1) break;
        lastTake = event.t;
        list.push({ t: event.t, slot: OCTAVE, gain: event.kind === 'break' ? 0.6 : 0.8 });
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
 * Jelly's sound, which is the one thing here that is not borrowed.
 *
 * The references' soundtrack was measured rather than guessed: ninety per cent
 * of its energy sits between 200 Hz and 2 kHz with almost nothing above, and
 * there are about one and a half onsets a second. Reading the pitch at each
 * onset gives D4, E4, G4, C5, F3 — a pentatonic set, played soft. There is no
 * drum, no hat and no bed, which is why nothing above 2 kHz shows: it is a
 * handful of gentle tones and silence.
 *
 * That is synthesisable exactly, so it is synthesised. Every other mode on this
 * site plays a recording lifted from its reference, which is the one thing here
 * a platform could recognise and mute; this mode owes nobody anything.
 *
 * **A note a merge, and the pitch is the rung.** The ladder climbs and so does
 * the scale, so the video's soundtrack is its own progress: the opening is all
 * low notes coming thick and fast, and by the end the few notes left are the
 * high ones. Landings are not sounded at all — three a second of them would be
 * a rattle, and the references have nothing like it.
 */
/**
 * Jelly's soundtrack: the recording, laid over the round.
 *
 * It was synthesised for a while, and the synthesis was measured rather than
 * guessed — the pitches, the near-pure sine, the two-and-a-half-second ring.
 * The recording was supplied afterwards, so it is what plays now, and the
 * synthesis is kept underneath it for the case where the file does not arrive.
 *
 * **It is borrowed, like the other four modes' sound and unlike what it
 * replaced.** That is the same trade as the rest of the site and it is worth
 * knowing it is being made.
 *
 * The recording is 61.6 seconds and a round is 60 to 74, so the tail has to
 * come from somewhere. It cannot simply loop: it opens on silence and ends
 * mid-ring, so a seam would land as a hole. A second copy is started before the
 * first has finished, from eight seconds in — past the silent opening — and
 * faded up underneath it, which puts a crossfade where a gap would be.
 */
async function jellyRecording(round: JellyRound): Promise<AudioBuffer> {
  const answer = await fetch('jelly/song.mp3');
  if (!answer.ok) throw new Error(`jelly song: ${answer.status}`);
  const length = Math.round(round.duration * SAMPLE_RATE);
  const ctx = new OfflineAudioContext(2, length, SAMPLE_RATE);
  const song = await ctx.decodeAudioData(await answer.arrayBuffer());

  const master = ctx.createGain();
  master.gain.value = 1;
  master.connect(ctx.destination);

  const first = ctx.createBufferSource();
  first.buffer = song;
  first.connect(master);
  first.start(0);

  const LAP = 0.9;
  const INTO = 8;
  for (let at = song.duration - LAP; at < round.duration; at += song.duration - INTO - LAP) {
    const more = ctx.createBufferSource();
    more.buffer = song;
    const fade = ctx.createGain();
    fade.gain.setValueAtTime(0.0001, at);
    fade.gain.exponentialRampToValueAtTime(1, at + LAP);
    more.connect(fade).connect(master);
    more.start(at, INTO);
  }

  // Out on the ending rather than cut off mid-ring.
  const end = Math.max(0, round.duration - 0.45);
  master.gain.setValueAtTime(1, end);
  master.gain.exponentialRampToValueAtTime(0.0001, round.duration);

  return ctx.startRendering();
}

export function renderJellyAudio(round: JellyRound): Promise<AudioBuffer> {
  return jellyRecording(round).catch(() => synthesisedJellyAudio(round));
}

function synthesisedJellyAudio(round: JellyRound): Promise<AudioBuffer> {
  const length = Math.round(round.duration * SAMPLE_RATE);
  const ctx = new OfflineAudioContext(1, length, SAMPLE_RATE);

  const master = ctx.createGain();
  master.gain.value = 0.85;
  master.connect(ctx.destination);

  // A pentatonic run, low to high, one step per rung of the ladder. C, D, E, G
  // and A — the set the references play in, and the one set of five notes where
  // any two of them sound intended together, which matters when a dozen land on
  // top of each other in the first seconds.
  //
  // Pitched to sit where the references' energy sits. Measured on theirs, nine
  // tenths of it is between 200 Hz and 2 kHz; a first cut of this scale started
  // at F3 and put a third of the energy underneath 200, because the low rungs
  // are also the ones that merge most often. Starting at D4 keeps every note in
  // the band the references actually occupy.
  const SCALE = [293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25, 783.99, 880.0];

  /**
   * One note, taken off the references rather than invented.
   *
   * No note in any of the seven can be cut out and reused — the ring is so long
   * that every onset lands on top of the ones before it, and not one of them is
   * preceded by silence. So it was measured instead, which comes to the same
   * sound and comes out clean.
   *
   * **It is almost a pure sine.** Projecting each of six hundred onsets onto its
   * own harmonic comb, after subtracting what was already ringing underneath it:
   * the second harmonic sits at 0.04 to 0.17 of the fundamental depending on the
   * pitch, and the third and everything above it are nought. There is nothing at
   * all above 3 kHz in any of them, and no bed under the notes either.
   *
   * **And it rings for two and a half seconds.** Tracking the fundamental's own
   * amplitude through fifty-six onsets that have a clear second and a half after
   * them, the decay is a straight 23.5 dB a second — a t60 of 2.55 s. The note
   * this replaced fell 60 dB in 0.42 s, six times too fast, so where they have
   * four or five notes ringing together at any moment this had one plink at a
   * time. That, and not the pitches, is what made it sound unlike theirs.
   */
  const RING = 2.55;
  const play = (at: number, hz: number, gain: number, hold = RING): void => {
    if (at < 0 || at >= round.duration) return;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, at);
    amp.gain.exponentialRampToValueAtTime(gain, at + 0.008);
    amp.gain.exponentialRampToValueAtTime(gain * 0.001, at + hold);

    // The long ring is not the whole envelope. Theirs also loses about four
    // decibels over the first fifth of a second and then settles into the slow
    // decay — the knock of the strike dying away and leaving the tone behind.
    // Measured against a straight 23.5 dB a second: at a tenth of a second
    // theirs is 4.4 dB down where a straight line is 2.4, and at two tenths 9.0
    // against 4.7. With the knock the two agree to within half a decibel.
    const knock = ctx.createGain();
    knock.gain.setValueAtTime(1, at);
    knock.gain.exponentialRampToValueAtTime(0.63, at + 0.18);
    amp.connect(knock).connect(master);
    const stop = Math.min(at + hold, round.duration);

    const tone = ctx.createOscillator();
    tone.type = 'sine';
    tone.frequency.value = hz;
    tone.connect(amp);
    tone.start(at);
    tone.stop(stop);

    // The measured second harmonic, and a sine rather than a triangle: a
    // triangle at twice the pitch also lands partials at six and ten times it,
    // and the references have nothing there at all.
    const body = ctx.createOscillator();
    body.type = 'sine';
    body.frequency.value = hz * 2;
    const quiet = ctx.createGain();
    quiet.gain.value = 0.07;
    body.connect(quiet).connect(amp);
    body.start(at);
    body.stop(stop);
  };

  for (const event of round.events) {
    if (event.kind === 'merge') {
      const note = SCALE[Math.min(event.rung, SCALE.length - 1)];
      // The bigger the rung, the fewer there are and the more each one is
      // worth, so the loud notes are also the rare ones.
      play(event.t, note, 0.105 + event.rung * 0.03);
    }
    if (event.kind === 'crown') {
      // The ending: the top of the scale, arpeggiated, and left ringing.
      // Their endings are not an arpeggio laid over the top, they are the last
      // cascade of merges heard as one: nine notes inside eight tenths of a
      // second, climbing. This keeps the shape and the spacing they use — about
      // seventy milliseconds between the notes of a run.
      [0, 0.07, 0.15, 0.24, 0.34].forEach((offset, i) =>
        play(event.t + offset, SCALE[Math.min(SCALE.length - 1, 4 + i)], 0.25),
      );
    }
  }

  return ctx.startRendering();
}
