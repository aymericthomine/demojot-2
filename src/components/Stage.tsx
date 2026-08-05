'use client';

/**
 * The preview.
 *
 * It plays the exact frames the export will encode — same `drawFrame`, same
 * simulation, just scaled down to fit the screen — and it plays the synthesised
 * soundtrack alongside, started from the same instant, so what you hear here is
 * what lands in the file.
 *
 * Playback is driven by wall-clock time rather than by counting frames, so a
 * browser that drops one stays in sync with the sound instead of drifting.
 */

import { useEffect, useRef, useState } from 'react';

import { drawFrame } from '../render/drawFrame';
import type { Round } from '../sim/simulate';
import { FPS, HEIGHT, WIDTH } from '../sim/style';

export interface StageProps {
  round: Round;
  audio: AudioBuffer | null;
  muted: boolean;
  /** Reports playback position in seconds, for the scrub bar. */
  onTime?: (seconds: number) => void;
}

export function Stage({ round, audio, muted, onTime }: StageProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let raf = 0;
    let startedAt = performance.now();
    let audioCtx: AudioContext | null = null;
    let source: AudioBufferSourceNode | null = null;
    let stopped = false;

    const startAudio = () => {
      if (muted || !audio || stopped) return;
      audioCtx = new AudioContext();
      source = audioCtx.createBufferSource();
      source.buffer = audio;
      source.connect(audioCtx.destination);
      source.start();
    };

    const loop = () => {
      if (stopped) return;
      const elapsed = (performance.now() - startedAt) / 1000;

      if (elapsed >= round.duration) {
        // Round over: start it again from the top, sound included.
        startedAt = performance.now();
        source?.stop();
        void audioCtx?.close();
        audioCtx = null;
        source = null;
        startAudio();
      }

      const frame = Math.min(
        round.durationInFrames - 1,
        Math.max(0, Math.floor(((performance.now() - startedAt) / 1000) * FPS)),
      );
      drawFrame(ctx, round.frames[frame], { width: WIDTH, height: HEIGHT });
      onTime?.(frame / FPS);
      raf = requestAnimationFrame(loop);
    };

    setReady(true);
    startAudio();
    loop();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      source?.stop();
      void audioCtx?.close();
    };
  }, [round, audio, muted, onTime]);

  return (
    <canvas
      ref={canvasRef}
      width={WIDTH}
      height={HEIGHT}
      className="h-full w-full rounded-2xl bg-black"
      style={{ opacity: ready ? 1 : 0, transition: 'opacity 200ms' }}
    />
  );
}
