'use client';

/**
 * The whole app: pick a seed, watch the fight, download the file.
 *
 * A seed is the video. It decides how many balls fight, how many threads they
 * start with, where they stand and which way they go — and from there the fight
 * decides how long the video is. Nothing about the look changes between videos,
 * which is the point: they should read as episodes of the same thing.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { Stage } from '../components/Stage';
import { useVideoExport } from '../hooks/useVideoExport';
import { renderRoundAudio } from '../audio/render';
import { generateRound, type Round } from '../sim/simulate';
import { COLORS, FPS, HEIGHT, WIDTH } from '../sim/style';

const seconds = (value: number): string =>
  value >= 60
    ? `${Math.floor(value / 60)} min ${Math.round(value % 60)} s`
    : `${Math.max(1, Math.round(value))} s`;

const megabytes = (bytes: number): string => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

const FIRST_SEED = 1234;

/** A round and its soundtrack, kept together so the two can never mismatch. */
interface Scene {
  round: Round;
  audio: AudioBuffer | null;
}

export default function HomePage() {
  const [seed, setSeed] = useState(FIRST_SEED);
  // Fought during the first render: there is something to watch immediately,
  // and no effect that has to set state on mount.
  const [scene, setScene] = useState<Scene>(() => ({
    round: generateRound(FIRST_SEED),
    audio: null,
  }));
  const [working, setWorking] = useState(false);
  const [muted, setMuted] = useState(true);
  const [time, setTime] = useState(0);
  const video = useVideoExport();

  const linkRef = useRef<HTMLAnchorElement | null>(null);
  const savedRef = useRef<string | null>(null);

  const { round, audio } = scene;

  // The soundtrack is synthesised from the round, so it is derived state and
  // arrives a moment after the picture. Attaching it to the round it came from
  // means the preview never plays one fight's sound over another's.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      let rendered: AudioBuffer | null = null;
      try {
        rendered = await renderRoundAudio(round);
      } catch {
        // A browser without OfflineAudioContext still gets the picture.
        rendered = null;
      }
      if (cancelled) return;
      setScene((current) => (current.round === round ? { ...current, audio: rendered } : current));
    })();
    return () => {
      cancelled = true;
    };
  }, [round]);

  const generate = useCallback(
    (nextSeed: number) => {
      setWorking(true);
      video.reset();
      // A tick's grace so the button paints its new state before the simulation
      // takes the thread for a moment.
      window.setTimeout(() => {
        setScene({ round: generateRound(nextSeed), audio: null });
        setWorking(false);
      }, 20);
    },
    [video],
  );

  useEffect(() => {
    if (!video.file || savedRef.current === video.file.url) return;
    savedRef.current = video.file.url;
    linkRef.current?.click();
  }, [video.file]);

  const roll = () => {
    const next = Math.floor(Math.random() * 1_000_000);
    setSeed(next);
    generate(next);
  };

  const percent = video.progress ? video.progress.done / Math.max(1, video.progress.total) : 0;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 px-4 py-6 lg:flex-row lg:py-10">
      <section className="mx-auto w-full max-w-[22rem] shrink-0 lg:mx-0">
        <div
          className="relative overflow-hidden rounded-2xl border border-[#23262f] bg-black"
          style={{ aspectRatio: `${WIDTH} / ${HEIGHT}` }}
        >
          <Stage round={round} audio={audio} muted={muted} onTime={setTime} />
          {working && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-xs text-[#8b90a0]">
              Fighting…
            </div>
          )}
        </div>

        <div className="mt-2 flex items-center justify-between text-[11px] text-[#8b90a0]">
          <span className="font-mono">
            {seconds(time)} / {seconds(round.duration)}
          </span>
          <button
            type="button"
            onClick={() => setMuted((value) => !value)}
            className="rounded-lg border border-[#23262f] px-2 py-1 hover:border-[#3a3f4d] hover:text-white"
          >
            {muted ? 'Sound off' : 'Sound on'}
          </button>
        </div>
      </section>

      <section className="flex w-full flex-col gap-4">
        <header>
          <h1 className="text-xl font-semibold tracking-tight">Ball Battle</h1>
          <p className="mt-1 text-sm text-[#8b90a0]">
            Balls bounce inside the ring. Every bounce pins a thread; crossing someone else&apos;s
            thread cuts it. Out of threads, out of the game — and the last one standing decides how
            long the video runs.
          </p>
        </header>

        <div className="rounded-2xl border border-[#23262f] bg-[#101218] p-4">
          <div className="flex items-center gap-2">
            <label className="flex flex-1 items-center gap-2 rounded-xl border border-[#23262f] bg-black/40 px-3 py-2">
              <span className="text-xs text-[#8b90a0]">Seed</span>
              <input
                type="number"
                min={0}
                value={seed}
                onChange={(event) => setSeed(Math.max(0, Math.floor(Number(event.target.value))))}
                className="w-full bg-transparent font-mono text-sm outline-none"
              />
            </label>
            <button
              type="button"
              onClick={() => generate(seed)}
              disabled={working}
              className="rounded-xl border border-[#23262f] bg-white/[0.04] px-3 py-2 text-sm hover:border-[#3a3f4d] disabled:opacity-40"
            >
              Generate
            </button>
            <button
              type="button"
              onClick={roll}
              disabled={working}
              className="rounded-xl border border-[#23262f] bg-white/[0.04] px-3 py-2 text-sm hover:border-[#3a3f4d] disabled:opacity-40"
            >
              Random
            </button>
          </div>

          <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-[#8b90a0] sm:grid-cols-4">
              <div>
                <dt className="text-[10px] uppercase tracking-wider">Length</dt>
                <dd className="font-mono text-sm text-white">{round.duration.toFixed(1)}s</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider">Balls</dt>
                <dd className="font-mono text-sm text-white">{round.setup.ballCount}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider">Threads each</dt>
                <dd className="font-mono text-sm text-white">{round.setup.threadCount}</dd>
              </div>
              <div>
                <dt className="text-[10px] uppercase tracking-wider">Winner</dt>
                <dd className="flex items-center gap-1.5 font-mono text-sm text-white">
                  <span
                    className="inline-block h-3 w-3 rounded-full ring-1 ring-white/70"
                    style={{
                      background:
                        round.frames[round.frames.length - 1].balls.find(
                          (ball) => ball.index === round.winner,
                        )?.color ?? COLORS[0],
                    }}
                  />
                  #{round.winner + 1}
                </dd>
              </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-[#23262f] bg-[#101218] p-4">
          {!video.busy && (
            <button
              type="button"
              onClick={() => video.start(round, audio)}
              disabled={working}
              className="w-full rounded-xl border border-emerald-400/40 bg-emerald-400/15 px-3 py-2.5 text-sm font-medium text-emerald-200 hover:bg-emerald-400/25 disabled:opacity-40"
            >
              Download the MP4
            </button>
          )}

          {video.busy && video.progress && (
            <>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span>
                  Encoding · frame {video.progress.done.toLocaleString()} of{' '}
                  {video.progress.total.toLocaleString()}
                  {video.progress.remaining !== null &&
                    ` · ${seconds(video.progress.remaining)} left`}
                </span>
                <button
                  type="button"
                  onClick={video.cancel}
                  className="text-[11px] text-[#8b90a0] hover:text-white"
                >
                  cancel
                </button>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-emerald-400 transition-[width] duration-200"
                  style={{ width: `${Math.round(percent * 100)}%` }}
                />
              </div>
            </>
          )}

          {video.error && <p className="mt-2 text-xs text-rose-400">{video.error}</p>}

          {video.file && (
            <div className="mt-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <code className="block truncate font-mono text-[11px] text-emerald-300">
                  {video.file.name}
                </code>
                <span className="text-[11px] text-[#8b90a0]">
                  {megabytes(video.file.size)} · {video.file.codec.toUpperCase()} · {WIDTH}×{HEIGHT}{' '}
                  · {FPS} fps
                </span>
              </div>
              <a ref={linkRef} href={video.file.url} download={video.file.name}>
                <span className="rounded-lg border border-[#23262f] px-2.5 py-1 text-xs hover:border-[#3a3f4d]">
                  Save again
                </span>
              </a>
            </div>
          )}

          <p className="mt-2 text-[11px] leading-relaxed text-[#8b90a0]">
            Encoded here in the page, sound included — nothing is uploaded anywhere. Keep this tab in
            front while it runs.
          </p>
        </div>
      </section>
    </main>
  );
}
