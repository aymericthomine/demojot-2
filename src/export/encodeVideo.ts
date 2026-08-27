'use client';

/**
 * Encoding the file, in the page.
 *
 * There is no server: the site is a static build, and the video is made where it
 * is watched. The browser paints every frame into an offscreen canvas and hands
 * it to the hardware encoder through WebCodecs, with the synthesised soundtrack
 * as a second track, and what comes back is a normal MP4 you can drop straight
 * into TikTok.
 *
 * Vertical 1080×1920 at 60 fps, H.264 where the machine has it, AV1 or VP9 where
 * it does not.
 *
 * Which of those the machine has is asked before anything else, and that
 * question turns out to be the fragile part: `isConfigSupported` returns a
 * promise, and on Safari some of those promises never settle. Silence is not a
 * refusal — the phone asking has a hardware H.264 encoder — so the browser is
 * given a deadline to answer in, and where it does not, it is asked to encode a
 * single frame instead. See `boundProbes` and `tryOneFrame`.
 */

import { FPS, HEIGHT, WIDTH } from '../sim/style';

/**
 * What the encoder needs to know about a video, and nothing more.
 *
 * There are two kinds of video on this site now — the fight and the drop — and
 * they share nothing but a frame rate. Rather than teach the encoder about both,
 * each hands it a reel: how many frames, what to call the file, and a function
 * that paints frame `n`. Painting is also where a frame is released, since only
 * the maker of a reel knows what it was holding.
 */
export interface Reel {
  durationInFrames: number;
  duration: number;
  /** The file name, without the dot or the extension. */
  name: string;
  paint(ctx: CanvasRenderingContext2D, index: number): void;
  /**
   * What this mode wants spent on the picture, before the codec's discount.
   *
   * Left out, the frame size decides. A mode whose every frame is thousands of
   * hard little dots is the worst case a codec has, and it is worth saying so.
   */
  bitrate?: number;
  /**
   * This mode has no soundtrack and is not missing one.
   *
   * Without it a silent mode reports itself as having failed to build a
   * soundtrack, which is a warning about something that was never going to
   * happen.
   */
  mute?: boolean;
}

export interface EncodeResult {
  blob: Blob;
  extension: 'mp4' | 'webm';
  codec: string;
  /** Set when the picture came out but the sound did not, and why. */
  silent?: string;
}

/**
 * What the encoder is busy with, for a UI that would otherwise look hung.
 *
 * Named finely on purpose. "Starting the encoder" used to cover half a dozen
 * awaits, so a phone stuck on it told nobody which one — a screenshot of this
 * now names the call.
 */
export type EncodeStage =
  | 'loading'
  | 'probing'
  | 'sound'
  | 'audio-codec'
  | 'starting'
  | 'frames'
  | 'writing';

export interface EncodeOptions {
  reel: Reel;
  audio: AudioBuffer | null;
  onProgress?: (done: number, total: number) => void;
  onStage?: (stage: EncodeStage) => void;
  signal?: AbortSignal;
}

export class EncodeCancelled extends Error {
  constructor() {
    super('Encoding cancelled');
    this.name = 'EncodeCancelled';
  }
}

/**
 * Thin, hard-edged shapes on black are a hard case for a codec — the default
 * quality curve softens the threads into mush — so the bitrate is set from the
 * pixel count instead, with the newer codecs credited for being more efficient.
 */
const bitrateFor = (codec: string, want?: number): number => {
  const efficiency = codec === 'av1' ? 0.6 : codec === 'vp9' ? 0.7 : 1;
  const asked = want ?? WIDTH * HEIGHT * FPS * 0.075;
  return Math.round(Math.min(20_000_000, asked * efficiency));
};

const breathe = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Starting the encoder is the one step that can hang rather than fail: a browser
 * that says it can encode H.264 and then never produces a frame leaves the page
 * sitting on "frame 0" for ever. Better to give up loudly.
 */
const WATCHDOG_MS = 60_000;

/**
 * Shorter for the probes. Asking a browser whether it can encode something is a
 * question it answers in milliseconds or never; a minute of waiting to find that
 * out is a minute of a page looking broken.
 */
const PROBE_MS = 20_000;

/**
 * One codec's leash, when the browser is being asked whether it can encode it.
 *
 * Shorter still, and per codec rather than over the whole search. A browser that
 * answers at all answers instantly; the only thing a longer wait buys is a
 * longer wait.
 */
const ASK_MS = 5_000;

/** And for actually encoding a frame, which is slower than being asked about it. */
const TRY_MS = 8_000;

function withWatchdog<T>(work: Promise<T>, what: string, limit = WATCHDOG_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const alarm = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () =>
        reject(
          new Error(
            `${what} gave no answer in ${Math.round(limit / 1000)}s. This browser says it can encode video but is not doing it.`,
          ),
        ),
      limit,
    );
  });
  return Promise.race([work, alarm]).finally(() => clearTimeout(timer)) as Promise<T>;
}

/**
 * What this browser can actually do, in one line.
 *
 * "It does not work on my phone" is not something anyone can act on, and the
 * failure modes here do not announce themselves: a browser with no WebCodecs at
 * all, one that has it but refuses 1080×1920, and one that accepts the job and
 * then runs out of memory all look identical from the outside. So the page says
 * up front what it found, and the answer travels in a screenshot.
 */
export async function describeSupport(): Promise<string> {
  const parts: string[] = [];

  const encoder = (globalThis as { VideoEncoder?: typeof VideoEncoder }).VideoEncoder;
  if (typeof OffscreenCanvas === 'undefined') parts.push('no OffscreenCanvas');
  if (!encoder) return [...parts, 'no WebCodecs video encoder'].join(' · ');

  // Both sizes, because a phone that refuses 1080×1920 at 60 will often take
  // 720×1280 at 30 — and that is a different problem with a different fix.
  const sizes: Array<[string, number, number, number]> = [
    ['1080×1920@60', WIDTH, HEIGHT, FPS],
    ['1080×1920@30', WIDTH, HEIGHT, 30],
    ['720×1280@30', 720, 1280, 30],
  ];
  const codecs: Array<[string, string]> = [
    ['H.264', 'avc1.640034'],
    ['AV1', 'av01.0.09M.08'],
    ['VP9', 'vp09.00.51.08'],
    ['VP8', 'vp8'],
  ];

  for (const [label, width, height, framerate] of sizes) {
    const ok: string[] = [];
    for (const [name, codec] of codecs) {
      try {
        // The browser's own answer, not the deadlined one, and raced: this is
        // the very call that hangs on Safari, and a diagnostic that never
        // appears is worse than no diagnostic at all.
        const probe = trueVideoProbe ?? encoder.isConfigSupported.bind(encoder);
        const result = await Promise.race([
          probe({ codec, width, height, bitrate: 8_000_000, framerate }),
          new Promise<null>((resolve) => setTimeout(() => resolve(null), ASK_MS)),
        ]);
        if (result === null) ok.push(`${name}?`);
        else if (result.supported) ok.push(name);
      } catch {
        // An unsupported codec string throws rather than answering; same thing.
      }
    }
    // A name with a question mark is one the browser never answered about.
    parts.push(`${label}: ${ok.length ? ok.join('/') : 'none'}`);
  }

  const audio = (globalThis as { AudioEncoder?: typeof AudioEncoder }).AudioEncoder;
  parts.push(audio ? 'audio encoder yes' : 'no audio encoder');
  const memory = (navigator as { deviceMemory?: number }).deviceMemory;
  if (memory) parts.push(`${memory} GB`);
  return parts.join(' · ');
}

type Mediabunny = typeof import('mediabunny');
type VideoCodec = NonNullable<Awaited<ReturnType<Mediabunny['getFirstEncodableVideoCodec']>>>;

let reserved: Promise<{ lib: Mediabunny; codec: VideoCodec }> | null = null;

type VideoProbe = (config: VideoEncoderConfig) => Promise<VideoEncoderSupport>;

/**
 * The browser's own answer, kept aside when the deadline goes on.
 *
 * The diagnostic below has to report what the browser really said, not what
 * this file decided to assume on its behalf — a support line that reads back
 * the optimism it was given is worse than none.
 */
let trueVideoProbe: VideoProbe | null = null;
let audioProbeBound = false;

/** Set when a probe ran out of patience and was answered on the browser's behalf. */
let assumed = false;

/**
 * Make the browser answer capability questions, one way or another.
 *
 * `isConfigSupported` returns a promise, and on Safari some of those promises
 * never settle. That is not a refusal — Safari has a perfectly good H.264
 * encoder sitting behind the question — but every layer asks it: this file
 * asks, and mediabunny asks again when it starts the encoder and once more per
 * track. One unanswerable question is therefore enough to hang the whole run,
 * which is exactly what "Looking for a video encoder gave no answer in 20s"
 * was, on a phone that could have made the video.
 *
 * So the question is given a deadline, once, at the source. A probe that goes
 * unanswered comes back as a yes — which is not a claim about the browser but a
 * decision to stop interviewing it and find out by encoding. Encoding is
 * watched and fails loudly; a capability query that never returns does not.
 *
 * A browser that answers normally never reaches the deadline and is left
 * exactly as it was.
 */
function boundProbes(): void {
  const video = (globalThis as { VideoEncoder?: typeof VideoEncoder }).VideoEncoder;
  if (video && !trueVideoProbe) {
    const original: VideoProbe = video.isConfigSupported.bind(video);
    trueVideoProbe = original;
    video.isConfigSupported = (config: VideoEncoderConfig) =>
      Promise.race([
        original(config),
        new Promise<VideoEncoderSupport>((resolve) =>
          setTimeout(() => {
            assumed = true;
            resolve({ supported: true, config });
          }, ASK_MS),
        ),
      ]);
  }

  const audio = (globalThis as { AudioEncoder?: typeof AudioEncoder }).AudioEncoder;
  if (audio && !audioProbeBound) {
    audioProbeBound = true;
    const original = audio.isConfigSupported.bind(audio);
    audio.isConfigSupported = (config: AudioEncoderConfig) =>
      Promise.race([
        original(config),
        new Promise<AudioEncoderSupport>((resolve) =>
          setTimeout(() => resolve({ supported: true, config }), ASK_MS),
        ),
      ]);
  }
}

/**
 * A plain codec string per family, for the try-it-and-see test.
 *
 * Deliberately conservative: High profile at level 4.0 covers 1080×1920, and a
 * browser with an H.264 encoder at all has this one.
 */
const PLAIN: Record<string, string> = {
  avc: 'avc1.640028',
  av1: 'av01.0.09M.08',
  vp9: 'vp09.00.51.08',
  vp8: 'vp8',
};

/** The codecs we will take, best first. */
const WANTED: readonly VideoCodec[] = ['avc', 'av1', 'vp9', 'vp8'];

/**
 * Can it actually do it?
 *
 * The one question a browser cannot dodge: hand it a real 1080×1920 frame and
 * see whether a packet comes back. It costs an encoder and a frame, which is
 * why it is not the opening move — but where the browser has been answered on
 * its own behalf, an assumption is all there is, and an hour of encoding is too
 * much to stake on one.
 */
async function tryOneFrame(codec: VideoCodec): Promise<boolean> {
  const Encoder = (globalThis as { VideoEncoder?: typeof VideoEncoder }).VideoEncoder;
  if (!Encoder || typeof OffscreenCanvas === 'undefined') return false;

  let answer: (ok: boolean) => void = () => {};
  const settled = new Promise<boolean>((resolve) => {
    const timer = setTimeout(() => resolve(false), TRY_MS);
    answer = (ok) => {
      clearTimeout(timer);
      resolve(ok);
    };
  });

  let encoder: VideoEncoder | null = null;
  let frame: VideoFrame | null = null;
  try {
    encoder = new Encoder({ output: () => answer(true), error: () => answer(false) });
    encoder.configure({
      codec: PLAIN[codec],
      width: WIDTH,
      height: HEIGHT,
      bitrate: 4_000_000,
      framerate: FPS,
    });
    const canvas = new OffscreenCanvas(WIDTH, HEIGHT);
    canvas.getContext('2d')?.fillRect(0, 0, WIDTH, HEIGHT);
    frame = new VideoFrame(canvas, { timestamp: 0 });
    encoder.encode(frame, { keyFrame: true });
    void encoder.flush().catch(() => answer(false));
    return await settled;
  } catch {
    return false;
  } finally {
    frame?.close();
    try {
      if (encoder && encoder.state !== 'closed') encoder.close();
    } catch {
      // Closing a half-configured encoder is allowed to throw. Nothing to undo.
    }
  }
}

/** The first codec that will really encode a frame at this size. */
async function proved(): Promise<VideoCodec> {
  for (const codec of WANTED) {
    if (await tryOneFrame(codec)) return codec;
  }
  throw new Error(
    typeof (globalThis as { VideoEncoder?: unknown }).VideoEncoder === 'undefined'
      ? 'This browser has no video encoder. Try Chrome, Edge or Safari.'
      : 'This browser has a video encoder but would not encode 1080×1920 with any codec.',
  );
}

/**
 * Load the encoder and pick a codec — before anything else is allocated.
 *
 * Asking a phone for a hardware encoder is asking for a scarce resource, and it
 * is a request that stalls rather than fails when the device is under memory
 * pressure. A sixty-one second round holds twenty-five thousand snapshot objects
 * and its soundtrack is another eleven megabytes, and all of it used to be built
 * *before* this ran. So the page calls this first, while there is room, and the
 * answer is kept for the encode that follows.
 */
export async function reserveEncoder(
  onStage?: (stage: EncodeStage) => void,
): Promise<{ lib: Mediabunny; codec: VideoCodec }> {
  reserved ??= (async () => {
    boundProbes();
    onStage?.('loading');
    const lib = await withWatchdog(import('mediabunny'), 'Loading the encoder', PROBE_MS);

    onStage?.('probing');
    const codec = await withWatchdog(
      lib.getFirstEncodableVideoCodec(['avc', 'av1', 'vp9', 'vp8'], {
        width: WIDTH,
        height: HEIGHT,
      }),
      'Looking for a video encoder',
      PROBE_MS,
    );
    if (!codec) {
      throw new Error('This browser has no video encoder. Try Chrome, Edge or Safari.');
    }
    // A browser that would not answer got a yes it never gave. Where that
    // happened, the interview is worthless and the only thing left is to ask it
    // to encode one frame and watch.
    return { lib, codec: assumed ? await proved() : codec };
  })().catch((error: unknown) => {
    // A failed reservation must not be remembered, or the next press inherits it.
    reserved = null;
    throw error;
  });
  return reserved;
}

export async function encodeVideo(options: EncodeOptions): Promise<EncodeResult> {
  const { reel, audio } = options;

  const { lib, codec } = await reserveEncoder(options.onStage);
  const {
    AudioBufferSource,
    BufferTarget,
    CanvasSource,
    Mp4OutputFormat,
    Output,
    Quality,
    WebMOutputFormat,
    getFirstEncodableAudioCodec,
  } = lib;

  const webm = codec === 'vp9' || codec === 'vp8';
  const format = webm ? new WebMOutputFormat() : new Mp4OutputFormat({ fastStart: 'in-memory' });
  const target = new BufferTarget();
  const output = new Output({ format, target });

  const canvas = new OffscreenCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('This browser refused to give us a 2D canvas.');

  const video = new CanvasSource(canvas, {
    codec,
    quality: new Quality({ bitrate: bitrateFor(codec, reel.bitrate) }),
    keyFrameInterval: 2,
  });
  output.addVideoTrack(video, { frameRate: FPS });

  // The soundtrack is built by the page — each mode has its own — and it is
  // allowed to have failed. A video with no sound is a poor result; a page that
  // hangs for ever is not a result at all, so a soundtrack that did not arrive
  // is reported rather than fatal.
  const track = reel.mute ? null : audio;
  let silent: string | undefined =
    track || reel.mute ? undefined : 'the soundtrack could not be built';

  let audioSource: InstanceType<typeof AudioBufferSource> | null = null;
  if (track) {
    options.onStage?.('audio-codec');
    // The same short leash as the video codecs, and for the same reason: the
    // browser that will not answer about H.264 will not answer about AAC
    // either, and twenty seconds of waiting to be told nothing is twenty
    // seconds of a page that looks stuck.
    const audioCodec = await withWatchdog(
      getFirstEncodableAudioCodec(webm ? ['opus'] : ['aac', 'opus'], {
        numberOfChannels: track.numberOfChannels,
        sampleRate: track.sampleRate,
      }),
      'Looking for an audio encoder',
      ASK_MS * 2,
    ).catch((error: Error) => {
      silent = error.message;
      return null;
    });
    if (audioCodec) {
      audioSource = new AudioBufferSource({
        codec: audioCodec,
        bitrate: 160_000,
      });
      output.addAudioTrack(audioSource);
    } else if (!silent) {
      silent = 'this browser has no audio encoder';
    }
  }

  options.onStage?.('starting');

  await withWatchdog(output.start(), 'Starting the encoder');

  try {
    // The soundtrack goes in first, before any video sample.
    //
    // It was moved after the loop to stop the page sitting on "frame 0 of
    // 2,516" while it encoded — but that made the muxer hold every video sample
    // in memory waiting for a second track that only arrived at the end, which
    // roughly doubles peak memory on a ninety-second round. A desktop shrugs;
    // a phone gets the tab killed. The label is the right fix for a confusing
    // wait, not the ordering.
    if (audioSource && track) {
      options.onStage?.('sound');
      await audioSource.add(track);
    }

    const total = reel.durationInFrames;
    options.onStage?.('frames');
    options.onProgress?.(0, total);

    for (let frame = 0; frame < total; frame += 1) {
      if (options.signal?.aborted) throw new EncodeCancelled();
      // Painting also lets the frame go. A sixty-second round is three and a
      // half thousand snapshots and the encoder never looks back, so releasing
      // each one as it is drawn keeps the tail of a long encode cheaper than its
      // head.
      reel.paint(ctx as unknown as CanvasRenderingContext2D, frame);
      // Awaiting is what applies back-pressure: it resolves when the encoder is
      // ready for more, so raw frames never pile up in memory. The first one is
      // watched, because an encoder that is never going to produce anything
      // hangs here rather than throwing.
      const added = video.add(frame / FPS, 1 / FPS);
      // The first one gets a long leash: it carries the encoder's warm-up and
      // the first keyframe, and a phone is slow enough that a tight limit would
      // fail work that was going to finish.
      await (frame === 0 ? withWatchdog(added, 'The first frame', 180_000) : added);
      options.onProgress?.(frame + 1, total);
      if (frame % 4 === 3) await breathe();
    }
  } catch (error) {
    await output.cancel();
    throw error;
  }

  options.onStage?.('writing');
  await output.finalize();
  const buffer = target.buffer;
  if (!buffer) throw new Error('The encoder produced no data.');

  return {
    blob: new Blob([buffer], { type: format.mimeType }),
    extension: webm ? 'webm' : 'mp4',
    codec,
    silent,
  };
}

export const fileNameFor = (reel: Reel, extension: string): string => `${reel.name}.${extension}`;
