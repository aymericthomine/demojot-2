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

export interface EncodeOptions {
  round: Round;
  audio: AudioBuffer | null;
  onProgress?: (done: number, total: number) => void;
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

  const codec = await getFirstEncodableVideoCodec(['avc', 'av1', 'vp9', 'vp8'], {
    width: WIDTH,
    height: HEIGHT,
  });
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

  // The soundtrack is normally rendered while the preview plays, but a download
  // clicked before that finished must not come out silent — so make it here if
  // it is not ready. A browser that cannot encode audio at all still gets the
  // picture rather than an error.
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

  await output.start();

  try {
    if (audioSource && track) await audioSource.add(track);

    const total = round.durationInFrames;
    for (let frame = 0; frame < total; frame += 1) {
      if (options.signal?.aborted) throw new EncodeCancelled();
      drawFrame(ctx as unknown as CanvasRenderingContext2D, round.frames[frame], {
        width: WIDTH,
        height: HEIGHT,
      });
      // Awaiting is what applies back-pressure: it resolves when the encoder is
      // ready for more, so raw frames never pile up in memory.
      await video.add(frame / FPS, 1 / FPS);
      options.onProgress?.(frame + 1, total);
      if (frame % 4 === 3) await breathe();
    }
  } catch (error) {
    await output.cancel();
    throw error;
  }

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
