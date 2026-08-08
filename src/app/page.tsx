'use client';

/**
 * The whole app: press the button, get a video.
 *
 * There is deliberately no preview. Watching a fight play out in the page costs
 * as long as the video lasts and tells you nothing you will not see in the file
 * a minute later, so the button runs the fight, paints every frame straight into
 * the encoder and hands over the finished MP4.
 *
 * A seed is the video. Every video opens on the same picture — seven balls, same
 * colours, same places — and only the directions they are fired in come from the
 * seed, so what follows is never the same twice.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import { renderRoundAudio } from '../audio/render';
import {
  describeSupport,
  encodeVideo,
  fileNameFor,
  reserveEncoder,
  EncodeCancelled,
  type EncodeStage,
} from '../export/encodeVideo';
import { generateRound, type Round } from '../sim/simulate';
import { FPS, HEIGHT, WIDTH } from '../sim/style';

type Stage =
  | { kind: 'idle' }
  | { kind: 'fighting' }
  | {
      kind: 'encoding';
      step: EncodeStage;
      done: number;
      total: number;
      remaining: number | null;
    }
  | {
      kind: 'done';
      round: Round;
      url: string;
      name: string;
      size: number;
      codec: string;
      silent?: string;
    }
  | { kind: 'failed'; message: string };

const seconds = (value: number): string =>
  value >= 60
    ? `${Math.floor(value / 60)} min ${Math.round(value % 60)} s`
    : `${Math.max(1, Math.round(value))} s`;

const megabytes = (bytes: number): string => `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/**
 * One label per step of the encoder, so a page that is waiting says what on.
 * "Starting the encoder" used to cover half the work and told nobody which part
 * of it had stopped.
 */
const STEP_LABEL: Record<EncodeStage, string> = {
  loading: 'Loading the encoder…',
  probing: 'Looking for a video encoder…',
  sound: 'Building the soundtrack…',
  'audio-codec': 'Looking for an audio encoder…',
  starting: 'Starting the encoder…',
  frames: '',
  writing: 'Writing the file…',
};

const randomSeed = (): number => Math.floor(Math.random() * 1_000_000);

export default function HomePage() {
  const [seed, setSeed] = useState(() => randomSeed());
  const [invert, setInvert] = useState(false);
  const [stage, setStage] = useState<Stage>({ kind: 'idle' });

  const [support, setSupport] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const urlRef = useRef<string | null>(null);
  const linkRef = useRef<HTMLAnchorElement | null>(null);
  const savedRef = useRef<string | null>(null);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    },
    [],
  );

  // Asked only when something has gone wrong, never on load. The probe calls
  // isConfigSupported a dozen times, and on some browsers that spins up a real
  // encoder each time — exactly the resource the next attempt needs.
  useEffect(() => {
    if (stage.kind !== 'failed' || support !== null) return;
    let live = true;
    void describeSupport().then((text) => {
      if (live) setSupport(text);
    });
    return () => {
      live = false;
    };
  }, [stage.kind, support]);

  // Saving is what the button was pressed for, so it happens without a second
  // click. Guarded by the URL so a re-render cannot download the same file twice.
  useEffect(() => {
    if (stage.kind !== 'done' || savedRef.current === stage.url) return;
    savedRef.current = stage.url;
    linkRef.current?.click();
  }, [stage]);

  const run = useCallback((forSeed: number, negative: boolean) => {
    if (abortRef.current) return;
    const controller = new AbortController();
    abortRef.current = controller;

    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setStage({ kind: 'fighting' });

    // A tick's grace so the button paints its new state before the fight takes
    // the thread for a moment.
    window.setTimeout(() => {
      void (async () => {
        try {
          const startedAt = performance.now();
          let step: EncodeStage = 'loading';
          let done = 0;
          let total = 0;
          const show = (remaining: number | null) =>
            setStage({ kind: 'encoding', step, done, total, remaining });
          const onStage = (next: EncodeStage) => {
            step = next;
            show(null);
          };
          show(null);

          // The encoder is reserved before the round exists. Asking a phone for
          // a hardware encoder once twenty-five thousand snapshots and a
          // soundtrack are already resident is asking under memory pressure, and
          // that is a request which stalls rather than fails.
          await reserveEncoder(onStage);

          const round = generateRound(forSeed);
          total = round.durationInFrames;
          onStage('sound');
          const audio = await renderRoundAudio(round).catch(() => null);

          const result = await encodeVideo({
            round,
            audio,
            invert: negative,
            signal: controller.signal,
            onStage,
            onProgress: (at, of) => {
              done = at;
              total = of;
              const elapsed = (performance.now() - startedAt) / 1000;
              // Ten frames in is enough for the rate to mean something; before
              // that an estimate is just a number that jumps around.
              show(done >= 10 ? (elapsed / done) * (total - done) : null);
            },
          });

          const url = URL.createObjectURL(result.blob);
          urlRef.current = url;
          setStage({
            kind: 'done',
            round,
            url,
            name: fileNameFor(round, result.extension, negative),
            size: result.blob.size,
            codec: result.codec,
            silent: result.silent,
          });
        } catch (cause) {
          setStage(
            cause instanceof EncodeCancelled
              ? { kind: 'idle' }
              : {
                  kind: 'failed',
                  message: cause instanceof Error ? cause.message : String(cause),
                },
          );
        } finally {
          abortRef.current = null;
        }
      })();
    }, 20);
  }, []);

  const busy = stage.kind === 'fighting' || stage.kind === 'encoding';
  const percent = stage.kind === 'encoding' ? stage.done / Math.max(1, stage.total) : 0;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center gap-6 px-5 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Ball Battle</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-[#8b90a0]">
          Seven balls, one ring, and a fixed set of thirty-five threads pinned to the wall. The anchors
          never
          move; run through somebody else&apos;s thread and it comes away with you, turning your
          colour. Full hands break rope instead of taking it, and a ball holding none is out.
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
              disabled={busy}
              onChange={(event) => setSeed(Math.max(0, Math.floor(Number(event.target.value))))}
              className="w-full bg-transparent font-mono text-sm outline-none disabled:opacity-50"
            />
          </label>
          <button
            type="button"
            onClick={() => setSeed(randomSeed())}
            disabled={busy}
            className="rounded-xl border border-[#23262f] bg-white/[0.04] px-3 py-2 text-sm hover:border-[#3a3f4d] disabled:opacity-40"
          >
            Roll
          </button>
        </div>

        <label className="mt-2 flex cursor-pointer items-center gap-2 px-1 py-1 text-sm text-[#8b90a0] select-none has-disabled:cursor-default has-disabled:opacity-40">
          <input
            type="checkbox"
            checked={invert}
            disabled={busy}
            onChange={(event) => setInvert(event.target.checked)}
            className="size-4 accent-emerald-400"
          />
          White ground, colours inverted
        </label>

        <button
          type="button"
          onClick={() => run(seed, invert)}
          disabled={busy}
          className="mt-3 w-full rounded-xl border border-emerald-400/40 bg-emerald-400/15 px-3 py-3 text-sm font-medium text-emerald-200 transition-colors hover:bg-emerald-400/25 disabled:opacity-40"
        >
          {stage.kind === 'fighting'
            ? 'Fighting…'
            : stage.kind === 'encoding'
              ? 'Encoding…'
              : 'Generate the video'}
        </button>

        {stage.kind === 'encoding' && (
          <>
            <div className="mt-3 mb-2 flex items-center justify-between text-xs">
              <span>
                {stage.step === 'frames'
                  ? `Frame ${stage.done.toLocaleString()} of ${stage.total.toLocaleString()}`
                  : STEP_LABEL[stage.step]}
                {stage.step === 'frames' &&
                  stage.remaining !== null &&
                  ` · ${seconds(stage.remaining)} left`}
              </span>
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                className="text-[11px] text-[#8b90a0] hover:text-white"
              >
                cancel
              </button>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full bg-emerald-400 transition-[width] duration-200 ${
                  stage.step === 'frames' ? '' : 'animate-pulse'
                }`}
                style={{ width: `${stage.step === 'frames' ? Math.round(percent * 100) : 100}%` }}
              />
            </div>
          </>
        )}

        {stage.kind === 'failed' && (
          <p className="mt-3 text-xs text-rose-400">
            {stage.message}
            {support && <span className="mt-1 block text-[10px] text-rose-300/70">{support}</span>}
          </p>
        )}

        {stage.kind === 'done' && (
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <code className="block truncate font-mono text-[11px] text-emerald-300">
                {stage.name}
              </code>
              {stage.silent && (
                <span className="block text-[11px] text-amber-400">no sound: {stage.silent}</span>
              )}
              <span className="text-[11px] text-[#8b90a0]">
                {stage.round.duration.toFixed(1)}s · winner #{stage.round.winner + 1} ·{' '}
                {megabytes(stage.size)} · {stage.codec.toUpperCase()}
              </span>
            </div>
            <a ref={linkRef} href={stage.url} download={stage.name}>
              <span className="whitespace-nowrap rounded-lg border border-[#23262f] px-2.5 py-1 text-xs hover:border-[#3a3f4d]">
                Save again
              </span>
            </a>
          </div>
        )}

        <p className="mt-3 text-[11px] leading-relaxed text-[#8b90a0]">
          {WIDTH}×{HEIGHT} · {FPS} fps · sound included. Encoded here in the page — nothing is
          uploaded anywhere — and saved as soon as it is ready. Keep this tab in front while it runs;
          a phone will take several minutes and may run out of memory before it finishes.
        </p>


      </div>
    </main>
  );
}
