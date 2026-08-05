'use client';

/**
 * Driving the encoder from the UI: how far along, how long is left, and a way to
 * stop. The object URL is released when it is replaced and when the page goes
 * away — a minute of 1080×1920 video is not something to leave lying in memory.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { EncodeCancelled, encodeVideo, fileNameFor } from '../export/encodeVideo';
import type { Round } from '../sim/simulate';

export interface ExportProgress {
  done: number;
  total: number;
  /** Seconds left, from the rate so far. Null until there is enough to go on. */
  remaining: number | null;
}

export interface ExportFile {
  url: string;
  name: string;
  size: number;
  codec: string;
}

export interface VideoExport {
  busy: boolean;
  progress: ExportProgress | null;
  error: string | null;
  file: ExportFile | null;
  start(round: Round, audio: AudioBuffer | null): void;
  cancel(): void;
  reset(): void;
}

export function useVideoExport(): VideoExport {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [file, setFile] = useState<ExportFile | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const urlRef = useRef<string | null>(null);

  const release = useCallback(() => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  const start = useCallback(
    (round: Round, audio: AudioBuffer | null) => {
      if (abortRef.current) return;
      const controller = new AbortController();
      abortRef.current = controller;

      release();
      setFile(null);
      setError(null);
      setBusy(true);
      setProgress({ done: 0, total: round.durationInFrames, remaining: null });

      const startedAt = performance.now();

      void (async () => {
        try {
          const result = await encodeVideo({
            round,
            audio,
            signal: controller.signal,
            onProgress: (done, total) => {
              const elapsed = (performance.now() - startedAt) / 1000;
              // Ten frames in is enough for the rate to mean something; before
              // that an estimate is just a number that jumps around.
              const remaining = done >= 10 ? (elapsed / done) * (total - done) : null;
              setProgress({ done, total, remaining });
            },
          });

          const url = URL.createObjectURL(result.blob);
          urlRef.current = url;
          setFile({
            url,
            name: fileNameFor(round, result.extension),
            size: result.blob.size,
            codec: result.codec,
          });
        } catch (cause) {
          if (!(cause instanceof EncodeCancelled)) {
            setError(cause instanceof Error ? cause.message : String(cause));
          }
        } finally {
          abortRef.current = null;
          setBusy(false);
          setProgress(null);
        }
      })();
    },
    [release],
  );

  const cancel = useCallback(() => abortRef.current?.abort(), []);

  const reset = useCallback(() => {
    release();
    setFile(null);
    setError(null);
  }, [release]);

  return { busy, progress, error, file, start, cancel, reset };
}
