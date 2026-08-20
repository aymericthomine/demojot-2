"use client";

/**
 * The one mode with a preview, and the reason it has one.
 *
 * Everywhere else a preview would mean watching the video before making it, for
 * a minute of nothing gained. Here the video *is* one turn of one shape: it
 * costs a few thousand dots a frame at a fifth of the size, it is the only way
 * to choose a shape and a palette without generating ten files to look at them —
 * and the thing being chosen is an illusion, which nobody can judge from a still.
 */

import { useEffect, useRef } from "react";

import { drawShapeFrame } from "../render/drawShape";
import {
  LOOP_SECONDS,
  buildCloud,
  dealShaper,
  rampFor,
  type Density,
  type Palette,
  type Wanted,
} from "../sim/shaper";

export interface PreviewProps {
  seed: number;
  shape: Wanted;
  palette: Palette | null;
  count: Density;
  invert: boolean;
  /** Stopped while the encoder has the machine. */
  paused: boolean;
}

/** Preview points, whatever the video is set to. Enough to read, cheap to turn. */
const PREVIEW_POINTS = 6_000;
const SIZE = 260;

export function ShaperPreview(props: PreviewProps): React.JSX.Element {
  const { seed, shape, palette, count, invert, paused } = props;
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  // Kept across renders so a change of palette does not restart the turn: the
  // shape should carry on from where it was while you try colours on it.
  const turnRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;

    const setup = dealShaper(
      seed,
      shape,
      palette,
      Math.min(count, PREVIEW_POINTS) as Density,
    );
    const cloud = buildCloud(setup);
    const ramp = rampFor(setup.palette);

    let raf = 0;
    let last = performance.now();
    const paint = (now: number) => {
      if (!paused) {
        turnRef.current =
          (turnRef.current + (now - last) / 1000 / LOOP_SECONDS) % 1;
      }
      last = now;
      drawShapeFrame(ctx, cloud, {
        width: canvas.width,
        height: canvas.height,
        ramp,
        turn: turnRef.current,
        invert,
        // A dot on a preview a quarter of the size would be a quarter of a
        // pixel, which a canvas paints as a smudge. One pixel, always.
        dot: Math.max(1, dpr),
      });
      raf = window.requestAnimationFrame(paint);
    };
    raf = window.requestAnimationFrame(paint);
    return () => window.cancelAnimationFrame(raf);
  }, [seed, shape, palette, count, invert, paused]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: SIZE, height: SIZE }}
      className="mx-auto rounded-xl border border-[#23262f]"
    />
  );
}
