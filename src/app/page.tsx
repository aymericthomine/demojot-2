"use client";

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

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { previewKit, renderDropAudio, renderRoundAudio } from "../audio/render";
import {
  describeSupport,
  encodeVideo,
  fileNameFor,
  reserveEncoder,
  EncodeCancelled,
  type EncodeStage,
  type Reel,
} from "../export/encodeVideo";
import { battleReel, dropReel } from "../export/reels";
import { ELEMENTS, generateDrop } from "../sim/drop";
import { FRUITS } from "../sim/fruit";
import { dealPack } from "../sim/packs";
import { DEFAULT_KIT, KITS } from "../audio/kit";
import { SHAPE_LABEL, SHAPE_SETS, type ShapeSet } from "../render/shapes";
import {
  BALL_COUNT,
  DEFAULT_TUNING,
  FEWEST_BALLS,
  MOST_BALLS,
  NORMAL_SIZE,
  SIZE_CHOICES,
  THREAD_CHOICES,
  anchorsFor,
  clampBalls,
  generateRound,
  openingFor,
  type BallSize,
  type ThreadCount,
} from "../sim/simulate";
import { COLORS, FPS, HEIGHT, WIDTH } from "../sim/style";
import type { BallFace } from "../render/drawFrame";
import type { FruitFace } from "../render/drawDrop";

/**
 * The two things this site makes.
 *
 * They share the seed, the clock, the sound and the encoder, and nothing else:
 * the fight is a fixed set of threads changing hands, the drop is fruit piling
 * up and merging. Adding the second did not touch the first.
 */
type Mode = "battle" | "drop" | "beast";

/**
 * What the fixed mode is fixed to.
 *
 * Seven balls on five threads each, the opening that never turns or recolours,
 * and nothing else to decide. The seed still picks which way the balls are fired
 * and how long the video runs, which is all the variety this mode wants: every
 * one of them opens on the same picture, which is the point of it.
 */
const BEAST = {
  threads: 5,
  balls: 7,
  size: NORMAL_SIZE,
  /** Half of what the other fight holds its opening for. */
  hold: 0.5,
} as const;

/** Everything a press of the button needs, so the two modes share one runner. */
type Job =
  | {
      mode: "battle" | "beast";
      seed: number;
      invert: boolean;
      threads: ThreadCount;
      balls: number;
      size: BallSize;
      /** Open on the fixed figure. True for the mode that has nothing to set. */
      steady: boolean;
      faces: readonly BallFace[];
    }
  | {
      mode: "drop";
      seed: number;
      invert: boolean;
      kit: number;
      shape: ShapeSet | null;
      faces: readonly FruitFace[];
    };

type Stage =
  | { kind: "idle" }
  | { kind: "fighting" }
  | {
      kind: "encoding";
      step: EncodeStage;
      done: number;
      total: number;
      remaining: number | null;
    }
  | {
      kind: "done";
      /** One line about what came out, which each mode writes for itself. */
      summary: string;
      url: string;
      name: string;
      size: number;
      codec: string;
      silent?: string;
    }
  | { kind: "failed"; message: string };

const seconds = (value: number): string =>
  value >= 60
    ? `${Math.floor(value / 60)} min ${Math.round(value % 60)} s`
    : `${Math.max(1, Math.round(value))} s`;

const megabytes = (bytes: number): string =>
  `${(bytes / 1024 / 1024).toFixed(1)} MB`;

/**
 * One label per step of the encoder, so a page that is waiting says what on.
 * "Starting the encoder" used to cover half the work and told nobody which part
 * of it had stopped.
 */
const STEP_LABEL: Record<EncodeStage, string> = {
  loading: "Loading the encoder…",
  probing: "Looking for a video encoder…",
  sound: "Building the soundtrack…",
  "audio-codec": "Looking for an audio encoder…",
  starting: "Starting the encoder…",
  frames: "",
  writing: "Writing the file…",
};

const randomSeed = (): number => Math.floor(Math.random() * 1_000_000);

export default function HomePage() {
  const [mode, setMode] = useState<Mode>("battle");
  const [seed, setSeed] = useState(() => randomSeed());
  const [invert, setInvert] = useState(false);
  const [threads, setThreads] = useState<ThreadCount>(THREAD_CHOICES[0]);
  const [balls, setBalls] = useState(BALL_COUNT);
  const [size, setSize] = useState<BallSize>(NORMAL_SIZE);
  // MrBeast is Ball Battle with the dials taken away, so everything downstream
  // reads these rather than the state the missing dials would have set.
  const steady = mode === "beast";
  const useThreads = steady ? BEAST.threads : threads;
  const useBalls = steady ? BEAST.balls : balls;
  const useSize = steady ? BEAST.size : size;

  const [kit, setKit] = useState(DEFAULT_KIT);
  const [shape, setShape] = useState<ShapeSet | null>(null);
  // One entry per rank of the ladder, by index, same as the balls: kept at full
  // length so changing the ladder never loses what was already set.
  const [fruits, setFruits] = useState<FruitFace[]>(() =>
    Array.from({ length: ELEMENTS }, () => ({})),
  );

  const setFruit = (rank: number, patch: Partial<FruitFace>) =>
    setFruits((old) =>
      old.map((f, i) => (i === rank ? { ...f, ...patch } : f)),
    );

  const setFruitImage = async (rank: number, file: File | null) => {
    const image = file ? await createImageBitmap(file).catch(() => null) : null;
    setFruit(rank, { image });
  };

  // What the ladder is currently wearing, so the roll can say so and never deal
  // the same theme twice in a row.
  const [dressed, setDressed] = useState<string | null>(null);

  const rollFruits = () => {
    const dealt = dealPack(Math.random(), dressed ?? undefined);
    setDressed(dealt.name);
    // A roll is a set of emoji, so it turns the drawn set off.
    setShape(null);
    // Images are left alone: an uploaded picture beats a glyph anyway, and
    // losing one to a button labelled "emoji" would be a surprise.
    setFruits((old) =>
      old.map((face, rank) => ({ ...face, ...(dealt.faces[rank] ?? {}) })),
    );
  };

  const clearFruits = () => {
    setDressed(null);
    setFruits(Array.from({ length: ELEMENTS }, () => ({})));
  };

  const pickShape = (choice: ShapeSet | null) => {
    setShape(choice);
    // The drawn sets bring their own colours and shapes, so anything a roll or
    // a picker left behind would fight with them.
    if (choice) clearFruits();
  };
  // One entry per ball, by index, kept at full length so changing the count
  // never loses what was already set on the balls that stay.
  const [faces, setFaces] = useState<BallFace[]>(() =>
    Array.from({ length: MOST_BALLS }, () => ({})),
  );

  const setGlyph = (index: number, glyph: string) =>
    setFaces((old) => old.map((f, i) => (i === index ? { ...f, glyph } : f)));

  // What the seed dealt this ball, which is what the picker starts from and what
  // clearing an override goes back to. The panel used to show COLORS[i], which
  // was simply the wrong colour: the seed shuffles the palette, so ball three is
  // not the third colour in the list.
  const dealt = useMemo(() => {
    const { palette } = openingFor(
      seed,
      anchorsFor(useThreads, useBalls),
      useBalls,
      steady,
    );
    return palette.map((c) => COLORS[c % COLORS.length]);
  }, [seed, useThreads, useBalls, steady]);

  const setColor = (index: number, color: string | undefined) =>
    setFaces((old) => old.map((f, i) => (i === index ? { ...f, color } : f)));

  const setImage = async (index: number, file: File | null) => {
    // Decoded to a bitmap here rather than at encode time: the encoder draws it
    // three thousand times and should not be decoding a PNG on every frame.
    const image = file ? await createImageBitmap(file).catch(() => null) : null;
    setFaces((old) => old.map((f, i) => (i === index ? { ...f, image } : f)));
  };
  const [stage, setStage] = useState<Stage>({ kind: "idle" });

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
    if (stage.kind !== "failed" || support !== null) return;
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
    if (stage.kind !== "done" || savedRef.current === stage.url) return;
    savedRef.current = stage.url;
    linkRef.current?.click();
  }, [stage]);

  const run = useCallback((job: Job) => {
    if (abortRef.current) return;
    const controller = new AbortController();
    abortRef.current = controller;

    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
    setStage({ kind: "fighting" });

    // A tick's grace so the button paints its new state before the fight takes
    // the thread for a moment.
    window.setTimeout(() => {
      void (async () => {
        try {
          const startedAt = performance.now();
          let step: EncodeStage = "loading";
          let done = 0;
          let total = 0;
          const show = (remaining: number | null) =>
            setStage({ kind: "encoding", step, done, total, remaining });
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

          let reel: Reel;
          let audio: AudioBuffer | null;
          let summary: string;
          if (job.mode !== "drop") {
            const round = generateRound(
              job.seed,
              job.threads,
              job.balls,
              job.size,
              job.steady,
              // Half the opening hold in the mode whose opening never changes:
              // there is nothing new to read in a picture already seen.
              job.steady
                ? { ...DEFAULT_TUNING, hold: BEAST.hold }
                : DEFAULT_TUNING,
            );
            total = round.durationInFrames;
            onStage("sound");
            audio = await renderRoundAudio(round).catch(() => null);
            reel = battleReel(round, {
              invert: job.invert,
              faces: job.faces,
            });
            summary = `${round.duration.toFixed(1)}s · winner #${round.winner + 1}`;
          } else {
            // No length is asked for: the drop ends when the eighth element is
            // made, which is never inside a minute.
            const round = generateDrop(job.seed);
            total = round.durationInFrames;
            onStage("sound");
            audio = await renderDropAudio(round, job.kit).catch(() => null);
            reel = dropReel(round, {
              invert: job.invert,
              faces: job.faces,
              shape: job.shape ?? undefined,
            });
            // Not a glyph and not a fruit's name: the ladder may be wearing
            // diamonds, and every drop ends on the eighth anyway.
            summary = `${round.duration.toFixed(1)}s · ${round.best + 1} of ${ELEMENTS}`;
          }

          const result = await encodeVideo({
            reel,
            audio,
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
            kind: "done",
            summary,
            url,
            name: fileNameFor(reel, result.extension),
            size: result.blob.size,
            codec: result.codec,
            silent: result.silent,
          });
        } catch (cause) {
          setStage(
            cause instanceof EncodeCancelled
              ? { kind: "idle" }
              : {
                  kind: "failed",
                  message:
                    cause instanceof Error ? cause.message : String(cause),
                },
          );
        } finally {
          abortRef.current = null;
        }
      })();
    }, 20);
  }, []);

  const busy = stage.kind === "fighting" || stage.kind === "encoding";
  const percent =
    stage.kind === "encoding" ? stage.done / Math.max(1, stage.total) : 0;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center gap-6 px-5 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">
          {mode === "battle"
            ? "Ball Battle"
            : mode === "drop"
              ? "Fruit Drop"
              : "MrBeast"}
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-[#8b90a0]">
          {mode === "battle"
            ? "Balls in a ring fighting over threads pinned to the wall. The anchors never move; run through somebody else's thread and it comes away with you, turning your colour. Full hands break rope instead of taking it, and a ball holding none is out."
            : mode === "drop"
              ? "A chute drops a piece into the bowl three times a second. Two of the same kind that touch become one of the next kind up, eight kinds in all, and the video ends when the eighth is made — which takes between a minute and two and a half. Nothing is aimed; the pile does the rest."
              : "The same fight, with nothing left to set: seven balls, five threads each, and the one opening that never turns or recolours, so every video starts on the same picture. Roll a seed and go — they run a minute to a minute and twenty."}
        </p>
      </header>

      <div className="rounded-2xl border border-[#23262f] bg-[#101218] p-4">
        <div className="mb-3 flex gap-2">
          {(["battle", "drop", "beast"] as const).map((choice) => (
            <button
              key={choice}
              type="button"
              onClick={() => setMode(choice)}
              disabled={busy}
              className={`flex-1 rounded-xl border px-3 py-2 text-sm disabled:opacity-40 ${
                mode === choice
                  ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200"
                  : "border-[#23262f] bg-white/[0.04] hover:border-[#3a3f4d]"
              }`}
            >
              {choice === "battle"
                ? "Ball battle"
                : choice === "drop"
                  ? "Fruit drop"
                  : "MrBeast"}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <label className="flex flex-1 items-center gap-2 rounded-xl border border-[#23262f] bg-black/40 px-3 py-2">
            <span className="text-xs text-[#8b90a0]">Seed</span>
            <input
              type="number"
              min={0}
              value={seed}
              disabled={busy}
              onChange={(event) =>
                setSeed(Math.max(0, Math.floor(Number(event.target.value))))
              }
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

        {/* MrBeast has nothing to set — not the dials, not the dressing. */}
        {mode === "battle" && (
          <>
            <div className="mt-2 flex items-center gap-2">
              <span className="px-1 text-sm text-[#8b90a0]">
                Threads per ball
              </span>
              {THREAD_CHOICES.map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setThreads(count)}
                  disabled={busy}
                  className={`rounded-lg border px-3 py-1 text-sm disabled:opacity-40 ${
                    threads === count
                      ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200"
                      : "border-[#23262f] bg-white/[0.04] hover:border-[#3a3f4d]"
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>

            <div className="mt-2 flex items-center gap-2">
              <span className="px-1 text-sm text-[#8b90a0]">Balls</span>
              <input
                type="number"
                min={FEWEST_BALLS}
                max={MOST_BALLS}
                value={balls}
                disabled={busy}
                onChange={(event) =>
                  setBalls(clampBalls(Number(event.target.value)))
                }
                className="w-16 rounded-lg border border-[#23262f] bg-black/40 px-2 py-1 font-mono text-sm outline-none disabled:opacity-40"
              />
              <span className="text-[11px] text-[#5c616e]">
                {FEWEST_BALLS}–{MOST_BALLS}
              </span>
            </div>

            <div className="mt-2 flex items-center gap-2">
              <span className="px-1 text-sm text-[#8b90a0]">Ball size</span>
              {SIZE_CHOICES.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  onClick={() => setSize(choice)}
                  disabled={busy}
                  className={`rounded-lg border px-3 py-1 text-sm disabled:opacity-40 ${
                    size === choice
                      ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200"
                      : "border-[#23262f] bg-white/[0.04] hover:border-[#3a3f4d]"
                  }`}
                >
                  ×{choice}
                </button>
              ))}
            </div>

            <details className="mt-2 rounded-xl border border-[#23262f] bg-black/20">
              <summary className="cursor-pointer px-3 py-2 text-sm text-[#8b90a0]">
                Dress the balls — emoji, flag, letter or a logo
              </summary>
              <div className="grid grid-cols-2 gap-2 px-3 pt-1 pb-3">
                {Array.from({ length: useBalls }, (_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <label className="relative size-6 shrink-0 cursor-pointer">
                      <span
                        className={`block size-6 rounded-full border ${
                          faces[i]?.color
                            ? "border-emerald-400"
                            : "border-white/40"
                        }`}
                        style={{ background: faces[i]?.color ?? dealt[i] }}
                      />
                      <input
                        type="color"
                        value={faces[i]?.color ?? dealt[i] ?? "#ffffff"}
                        disabled={busy}
                        onChange={(event) => setColor(i, event.target.value)}
                        className="absolute inset-0 cursor-pointer opacity-0"
                      />
                    </label>
                    {faces[i]?.color && (
                      <button
                        type="button"
                        onClick={() => setColor(i, undefined)}
                        disabled={busy}
                        title="Back to the colour the seed dealt"
                        className="text-[11px] text-[#5c616e] hover:text-white"
                      >
                        ↺
                      </button>
                    )}
                    <input
                      type="text"
                      value={faces[i]?.glyph ?? ""}
                      disabled={busy}
                      placeholder="🔥"
                      onChange={(event) =>
                        setGlyph(i, event.target.value.slice(0, 4))
                      }
                      className="w-12 rounded-lg border border-[#23262f] bg-black/40 px-2 py-1 text-center text-sm outline-none disabled:opacity-40"
                    />
                    <label
                      className={`cursor-pointer rounded-lg border px-2 py-1 text-[11px] ${
                        faces[i]?.image
                          ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200"
                          : "border-[#23262f] bg-white/[0.04] text-[#8b90a0] hover:border-[#3a3f4d]"
                      }`}
                    >
                      {faces[i]?.image ? "logo ✓" : "logo"}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={busy}
                        onChange={(event) =>
                          void setImage(i, event.target.files?.[0] ?? null)
                        }
                        className="hidden"
                      />
                    </label>
                  </div>
                ))}
              </div>
              <p className="px-3 pb-3 text-[11px] leading-relaxed text-[#5c616e]">
                A logo wins over a glyph on the same ball. Leave both empty and
                the ball is just its colour. Flags are emoji — 🇫🇷 🇧🇷 — and paste
                like any other character.
              </p>
            </details>
          </>
        )}

        {mode === "drop" && (
          <>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="px-1 text-sm text-[#8b90a0]">Pieces</span>
              {([null, ...SHAPE_SETS] as const).map((choice) => (
                <button
                  key={choice ?? "emoji"}
                  type="button"
                  onClick={() => pickShape(choice)}
                  disabled={busy}
                  className={`rounded-lg border px-3 py-1 text-sm disabled:opacity-40 ${
                    shape === choice
                      ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200"
                      : "border-[#23262f] bg-white/[0.04] hover:border-[#3a3f4d]"
                  }`}
                >
                  {choice ? SHAPE_LABEL[choice] : "emoji"}
                </button>
              ))}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span className="px-1 text-sm text-[#8b90a0]">Sound</span>
              <button
                type="button"
                onClick={() => void previewKit(kit)}
                title="Hear it — four ticks at the rate the chute feeds"
                className="rounded-lg border border-[#23262f] bg-white/[0.04] px-2.5 py-1 text-sm hover:border-[#3a3f4d]"
              >
                ▶
              </button>
              {KITS.map((sound, index) => (
                <button
                  key={sound.name}
                  type="button"
                  onClick={() => {
                    setKit(index);
                    // Picking one plays it: a row of five words is not a thing
                    // anybody can choose between by reading.
                    void previewKit(index);
                  }}
                  disabled={busy}
                  title={sound.note}
                  className={`rounded-lg border px-3 py-1 text-sm disabled:opacity-40 ${
                    kit === index
                      ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200"
                      : "border-[#23262f] bg-white/[0.04] hover:border-[#3a3f4d]"
                  }`}
                >
                  {sound.name}
                </button>
              ))}
            </div>
            <p className="mt-1 px-1 text-[11px] leading-relaxed text-[#5c616e]">
              {KITS[kit].note}
            </p>

            <div className="mt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={rollFruits}
                disabled={busy}
                className="rounded-lg border border-[#23262f] bg-white/[0.04] px-3 py-1 text-sm hover:border-[#3a3f4d] disabled:opacity-40"
              >
                🎲 Random emoji
              </button>
              {dressed && (
                <>
                  <span className="text-[11px] text-emerald-300">
                    {dressed}
                  </span>
                  <button
                    type="button"
                    onClick={clearFruits}
                    disabled={busy}
                    title="Back to the fruit"
                    className="text-[11px] text-[#5c616e] hover:text-white"
                  >
                    ↺
                  </button>
                </>
              )}
            </div>

            <details className="mt-2 rounded-xl border border-[#23262f] bg-black/20">
              <summary className="cursor-pointer px-3 py-2 text-sm text-[#8b90a0]">
                Your own pieces — one image per rank
              </summary>
              <div className="grid grid-cols-2 gap-2 px-3 pt-1 pb-3">
                {FRUITS.map((fruit, rank) => (
                  <div key={fruit.name} className="flex items-center gap-2">
                    <label className="relative size-6 shrink-0 cursor-pointer">
                      <span
                        className={`block size-6 rounded-full border ${
                          fruits[rank]?.color
                            ? "border-emerald-400"
                            : "border-white/40"
                        }`}
                        style={{
                          background: fruits[rank]?.color ?? fruit.color,
                        }}
                      />
                      <input
                        type="color"
                        value={fruits[rank]?.color ?? fruit.color}
                        disabled={busy}
                        onChange={(event) =>
                          setFruit(rank, { color: event.target.value })
                        }
                        className="absolute inset-0 cursor-pointer opacity-0"
                      />
                    </label>
                    <input
                      type="text"
                      value={fruits[rank]?.glyph ?? ""}
                      disabled={busy}
                      placeholder={fruit.glyph}
                      onChange={(event) =>
                        setFruit(rank, {
                          glyph: event.target.value.slice(0, 4),
                        })
                      }
                      className="w-12 rounded-lg border border-[#23262f] bg-black/40 px-2 py-1 text-center text-sm outline-none disabled:opacity-40"
                    />
                    <label
                      className={`cursor-pointer rounded-lg border px-2 py-1 text-[11px] ${
                        fruits[rank]?.image
                          ? "border-emerald-400/40 bg-emerald-400/15 text-emerald-200"
                          : "border-[#23262f] bg-white/[0.04] text-[#8b90a0] hover:border-[#3a3f4d]"
                      }`}
                    >
                      {fruits[rank]?.image ? "image ✓" : "image"}
                      <input
                        type="file"
                        accept="image/*"
                        disabled={busy}
                        onChange={(event) =>
                          void setFruitImage(
                            rank,
                            event.target.files?.[0] ?? null,
                          )
                        }
                        className="hidden"
                      />
                    </label>
                  </div>
                ))}
              </div>
              <p className="px-3 pb-3 text-[11px] leading-relaxed text-[#5c616e]">
                Ranks run smallest first. An image is cropped square and clipped
                to the circle, so a cut-out photograph on transparent ground
                works best; it wins over the emoji. The colour is the halo.
              </p>
            </details>
          </>
        )}

        <label
          hidden={steady}
          className="mt-2 flex cursor-pointer items-center gap-2 px-1 py-1 text-sm text-[#8b90a0] select-none has-disabled:cursor-default has-disabled:opacity-40"
        >
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
          onClick={() =>
            run(
              mode === "drop"
                ? { mode, seed, invert, kit, shape, faces: fruits }
                : {
                    mode,
                    seed,
                    // Both of these belong to the mode that has the controls
                    // for them. Switching modes must not carry them across.
                    invert: steady ? false : invert,
                    threads: useThreads,
                    balls: useBalls,
                    size: useSize,
                    steady,
                    faces: steady ? [] : faces,
                  },
            )
          }
          disabled={busy}
          className="mt-3 w-full rounded-xl border border-emerald-400/40 bg-emerald-400/15 px-3 py-3 text-sm font-medium text-emerald-200 transition-colors hover:bg-emerald-400/25 disabled:opacity-40"
        >
          {stage.kind === "fighting"
            ? mode === "drop"
              ? "Dropping…"
              : "Fighting…"
            : stage.kind === "encoding"
              ? "Encoding…"
              : "Generate the video"}
        </button>

        {stage.kind === "encoding" && (
          <>
            <div className="mt-3 mb-2 flex items-center justify-between text-xs">
              <span>
                {stage.step === "frames"
                  ? `Frame ${stage.done.toLocaleString()} of ${stage.total.toLocaleString()}`
                  : STEP_LABEL[stage.step]}
                {stage.step === "frames" &&
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
                  stage.step === "frames" ? "" : "animate-pulse"
                }`}
                style={{
                  width: `${stage.step === "frames" ? Math.round(percent * 100) : 100}%`,
                }}
              />
            </div>
          </>
        )}

        {stage.kind === "failed" && (
          <p className="mt-3 text-xs text-rose-400">
            {stage.message}
            {support && (
              <span className="mt-1 block text-[10px] text-rose-300/70">
                {support}
              </span>
            )}
          </p>
        )}

        {stage.kind === "done" && (
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <code className="block truncate font-mono text-[11px] text-emerald-300">
                {stage.name}
              </code>
              {stage.silent && (
                <span className="block text-[11px] text-amber-400">
                  no sound: {stage.silent}
                </span>
              )}
              <span className="text-[11px] text-[#8b90a0]">
                {stage.summary} · {megabytes(stage.size)} ·{" "}
                {stage.codec.toUpperCase()}
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
          {WIDTH}×{HEIGHT} · {FPS} fps · sound included. Encoded here in the
          page — nothing is uploaded anywhere — and saved as soon as it is
          ready. Keep this tab in front while it runs; a phone will take several
          minutes and may run out of memory before it finishes.
        </p>
      </div>
    </main>
  );
}
