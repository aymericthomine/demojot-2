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

Each ball drags a fan of threads pinned to the wall behind it, and that fan is
its life. One rule then decides everything: **crossing somebody else's thread
cuts it**, and a thread is never replaced. A ball at zero is out, and the round
ends when one is left standing — so the length of a video is not a setting, it
is the result of the fight.

Most land between 30 and 45 seconds; **one seed in four aims past a minute**,
which is the line that matters for monetisation. Over sixty seeds: a quarter
below 35 s, half below 42 s, a third past 60 s.

Two details do the real work, and both were found by looking rather than
guessing:

- **The fan is pinned by swept angle, not by a clock.** A thread goes down each
  time the line from the centre through the ball has turned far enough, which
  makes every fan exactly `life × step` wide, evenly spaced, wherever the ball
  is and however fast it is going. Pinning at each bounce cannot produce the
  picture at all: a billiard in a circle keeps its angle of incidence for ever,
  so its bounce points step around the rim by a fixed angle, and the last twenty
  are either scattered all the way round or belong to a ball glued to the wall.
- **Cuts are rate-limited per pair.** One attacker can only take so much, so a
  duel is survivable and being surrounded is not — which is what makes the
  endgame a scramble instead of a coin toss.

## What is fixed and what varies

Every video is meant to read as an episode of the same thing, so the **style is
constant**: arena size, ball size, thread thickness, ball speed, the palette, the
black ground and the white ring. They live as constants in `src/sim/style.ts`.

What the seed varies: **how many balls** (5–9), **how many threads each one
starts with** (16–30, and every ball gets its own share of that, so the opening
frame is a set of different fans rather than a diagram), where they stand, which
way they are aimed — and therefore the whole fight and its length.

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
| `src/sim/simulate.ts` | The fight: physics, the rules, and the event list. |
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
