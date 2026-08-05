# Ball Battle

A generator for vertical 9:16 videos: coloured balls fight inside a ring, each
trailing threads pinned to the wall, until one is left. Picture and sound are
both computed — there is no footage, no samples, and nothing downloaded.

A **seed is the video**. It decides how many balls fight, how many threads they
start with, where they stand and which way they are aimed. Everything after that
follows, including how long the video runs.

*1080×1920 · 60 fps · H.264/MP4 where the machine can, AV1 or VP9 where it
cannot · soundtrack synthesised from the collisions*

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

Type a seed (or press **Random**), watch the fight, press **Download the MP4**.
The file is encoded in the page — nothing is uploaded anywhere — and lands in
your downloads ready to post.

```bash
npm run build        # production build
npm run build:static # the static folder GitHub Pages serves
npm run typecheck
npm run lint
```

## The rules

Two of them, and they are the whole game.

1. **Bouncing off the wall pins a thread there.** Left alone, a ball's fan grows
   and drifts around the rim.
2. **Crossing somebody else's thread cuts it.** A ball with no threads left is
   out.

The round ends when one ball is left standing, so the length of a video is not a
setting — it is the result of the fight. Most land between 30 and 45 seconds and
some run past a minute, which is the line that matters for monetisation.

Two details stop that from collapsing into a stalemate or a bloodbath, and both
were found by measuring, not guessing:

- **Cuts are rate-limited per pair.** One attacker cannot cut faster than its
  victim's bounces replace, so a duel settles nothing and fans keep growing; two
  or three hunting the same ball beat the replacement rate and shred it.
- **The fight winds up.** That per-pair limit falls over the round, so the
  opening is about building fans and the endgame is about losing them. With a
  fixed rate there is no video: slow enough for fans to grow means nobody ever
  dies, fast enough to kill shaves every fan to a stub in the first ten seconds.

## What is fixed and what varies

Every video is meant to read as an episode of the same thing, so the **style is
constant**: arena size, ball size, thread thickness, ball speed, the palette, the
black ground and the white ring. They live as constants in `src/sim/style.ts`.

What the seed varies: **how many balls** (5–9), **how many threads** they start
with (8–16), where they stand, which way they are aimed — and therefore the whole
fight and its length.

## The sound

Every note is synthesised from the event list the simulation produced, so the
sound is not *synced* to the picture — it is the same thing as the picture, and
it cannot drift. A struck note per bounce, one pitch per ball; a short bright
tick per cut; a low hit for an elimination; one chord at the end. The notes climb
as the field thins out, which builds the tension without anyone arranging it.

Nothing is borrowed, so nothing can get a video muted or demonetised.

## How it is put together

| Path | What it does |
| --- | --- |
| `src/sim/random.ts` | Seeded generator. `Math.random` appears nowhere in the simulation. |
| `src/sim/style.ts` | The look and the speed, as constants. |
| `src/sim/simulate.ts` | The fight: physics, the two rules, and the event list. |
| `src/render/drawFrame.ts` | One frame from one state, on any canvas. |
| `src/audio/render.ts` | The event list, offline, into an `AudioBuffer`. |
| `src/export/encodeVideo.ts` | Frames plus soundtrack into an MP4, via WebCodecs. |
| `src/components/Stage.tsx` | The preview — the same frames the export encodes. |
| `src/app/page.tsx` | Seed, fight, download. |

The simulation runs once, up front, and keeps a snapshot per frame; the preview
and the export both read those, so what you watch is what you get.

## Notes

- Encoding a 40-second video takes a couple of minutes on a machine without a
  hardware encoder, and seconds on one with it. Progress and a cancel button are
  in the page; keep the tab in front while it runs.
- The container is MP4 with H.264 and AAC wherever the browser can encode them.
  Where it cannot — some Linux builds of Chromium, for instance — it falls back
  to AV1 or VP9 video and Opus audio, which every phone plays but some desktop
  editors do not.
