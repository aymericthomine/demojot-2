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
 */

import { renderRoundAudio } from '../audio/render';
import { drawFrame } from '../render/drawFrame';
import type { Round } from '../sim/simulate';
import { FPS, HEIGHT, WIDTH } from '../sim/style';

export interface EncodeResult {
  blob: Blob;
  extension: 'mp4' | 'webm';
  codec: string;
}

/** What the encoder is busy with, for a UI that would otherwise look hung. */
export type EncodeStage = 'starting' | 'frames' | 'sound' | 'finishing';

export interface EncodeOptions {
  round: Round;
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
const bitrateFor = (codec: string): number => {
  const efficiency = codec === 'av1' ? 0.6 : codec === 'vp9' ? 0.7 : 1;
  return Math.round(Math.min(20_000_000, WIDTH * HEIGHT * FPS * 0.075 * efficiency));
};

const breathe = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Starting the encoder is the one step that can hang rather than fail: a browser
 * that says it can encode H.264 and then never produces a frame leaves the page
 * sitting on "frame 0" for ever. Better to give up loudly.
 */
const WATCHDOG_MS = 60_000;

function withWatchdog<T>(work: Promise<T>, what: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const alarm = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error(`${what} did not respond within a minute. This browser says it can encode video but is not doing it — try Chrome on a desktop.`)),
      WATCHDOG_MS,
    );
  });
  return Promise.race([work, alarm]).finally(() => clearTimeout(timer)) as Promise<T>;
}

export async function encodeVideo(options: EncodeOptions): Promise<EncodeResult> {
  const {
    AudioBufferSource,
    BufferTarget,
    CanvasSource,
    Mp4OutputFormat,
    Output,
    Quality,
    WebMOutputFormat,
    getFirstEncodableAudioCodec,
    getFirstEncodableVideoCodec,
  } = await import('mediabunny');

  const { round, audio } = options;
  options.onStage?.('starting');

  const codec = await withWatchdog(
    getFirstEncodableVideoCodec(['avc', 'av1', 'vp9', 'vp8'], { width: WIDTH, height: HEIGHT }),
    'Looking for a video encoder',
  );
  if (!codec) {
    throw new Error('This browser has no video encoder. Try Chrome, Edge or Safari.');
  }

  const webm = codec === 'vp9' || codec === 'vp8';
  const format = webm
    ? new WebMOutputFormat()
    : new Mp4OutputFormat({ fastStart: 'in-memory' });
  const target = new BufferTarget();
  const output = new Output({ format, target });

  const canvas = new OffscreenCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) throw new Error('This browser refused to give us a 2D canvas.');

  const video = new CanvasSource(canvas, {
    codec,
    quality: new Quality({ bitrate: bitrateFor(codec) }),
    keyFrameInterval: 2,
  });
  output.addVideoTrack(video, { frameRate: FPS });

  // The page normally hands the soundtrack over ready-made; make it here if not,
  // so a video can never come out silent. A browser that cannot encode audio at
  // all still gets the picture rather than an error.
  const track = audio ?? (await renderRoundAudio(round).catch(() => null));

  let audioSource: InstanceType<typeof AudioBufferSource> | null = null;
  if (track) {
    const audioCodec = await getFirstEncodableAudioCodec(webm ? ['opus'] : ['aac', 'opus'], {
      numberOfChannels: track.numberOfChannels,
      sampleRate: track.sampleRate,
    });
    if (audioCodec) {
      audioSource = new AudioBufferSource({ codec: audioCodec, bitrate: 160_000 });
      output.addAudioTrack(audioSource);
    }
  }

  await withWatchdog(output.start(), 'Starting the encoder');

  try {
    const total = round.durationInFrames;
    options.onStage?.('frames');
    options.onProgress?.(0, total);

    for (let frame = 0; frame < total; frame += 1) {
      if (options.signal?.aborted) throw new EncodeCancelled();
      drawFrame(ctx as unknown as CanvasRenderingContext2D, round.frames[frame], {
        width: WIDTH,
        height: HEIGHT,
      });
      // Awaiting is what applies back-pressure: it resolves when the encoder is
      // ready for more, so raw frames never pile up in memory. The first one is
      // watched, because an encoder that is never going to produce anything
      // hangs here rather than throwing.
      const added = video.add(frame / FPS, 1 / FPS);
      await (frame === 0 ? withWatchdog(added, 'The first frame') : added);
      options.onProgress?.(frame + 1, total);
      if (frame % 4 === 3) await breathe();
    }

    // The soundtrack goes in last, on purpose. Encoding it takes a while on a
    // phone, and doing it before the loop meant the page sat on "frame 0 of
    // 2,500" the whole time, looking hung when it was working perfectly.
    if (audioSource && track) {
      options.onStage?.('sound');
      await audioSource.add(track);
    }
  } catch (error) {
    await output.cancel();
    throw error;
  }

  options.onStage?.('finishing');
  await output.finalize();
  const buffer = target.buffer;
  if (!buffer) throw new Error('The encoder produced no data.');

  return {
    blob: new Blob([buffer], { type: format.mimeType }),
    extension: webm ? 'webm' : 'mp4',
    codec,
  };
}

export const fileNameFor = (round: Round, extension: string): string =>
  `balls-${round.setup.seed}-${Math.round(round.duration)}s.${extension}`;
