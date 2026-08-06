# Ball Battle

A generator for vertical 9:16 videos: seven balls fight inside a ring over a
fixed set of threads pinned to the wall, taking them off each other one crossing
at a time. Picture and sound are both computed — there is no footage, no samples,
and nothing downloaded.

Every video **opens on the same picture** — the same seven balls, same colours,
same places, same fans dividing the rim edge to edge. The **seed** decides which
way they are fired and where the bell falls; since a billiard in a circle never
forgets its opening angle, the first of those is enough to make everything after
the first second different.

*1080×1920 · 60 fps · H.264/MP4 where the machine can, AV1 or VP9 where it
cannot · soundtrack synthesised from the collisions*

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

Press **Generate the video**. The fight is played out, every frame is painted
straight into the encoder, and the finished MP4 saves itself. There is no
preview on purpose: watching it in the page costs exactly as long as the video
and shows nothing the file will not.

```bash
npm run build        # production build
npm run build:static # the static folder GitHub Pages serves
npm run typecheck
npm run lint
```

## The rules

Three of them, and they are the whole game.

1. **The anchors never move.** The rim is divided into a fixed ring of anchor
   points — thirty-five of them, seven balls with five each — set before the
   first frame and unchanged to the last. Every anchor holds a thread the whole
   way through, so the number of threads in the arena is a constant.
2. **Touch a thread and it becomes yours** — but territory only ever changes
   hands at a border. Running through somebody's rope pushes your own arc one
   anchor further into theirs, at whichever of their two ends yours is already up
   against; the thread that turns keeps its anchor and swaps only its colour and
   its hub. Nothing is created and nothing destroyed — it is all captured, which
   is why the picture is always full.

   Because a border is the only place a thread can change hands, **every ball
   holds one unbroken arc of the wall** from the first frame to the last: nobody
   is ever left with two separate patches and somebody else's rope in between.
   That is what the reference looks like, and it is the shape of the whole thing —
   the wall is divided into coloured sectors, and the sectors push against each
   other. Run through the rope of a ball that is not your neighbour and nothing
   happens; there is no border between you to push.
3. **Threads are life.** A ball holding none is out. There is no fan to clear
   away: what was its belongs to somebody else now, still on the same anchors.

Balls bounce off each other, and rope bends the ball that ran through it — a
nudge rather than a bounce, and only the direction changes, since speed is a
constant of the style.

A thread is taken by being **crossed**, not by being leaned on: the step the ball
just travelled has to pass through the line. That distinction is not a detail. On
overlap instead, two balls that have come to rest against each other's rope swap
the same threads back and forth for ever — the take counts come out exactly equal,
which is what a stalemate looks like in a log file.

## Why there is a bell

This economy conserves. Nothing enters it and nothing leaves, so there is no
drift towards a winner: the last two balls trade the same rope back and forth and
the count wanders rather than converging. Played to the very last thread a round
takes a minute and a half at best and ten minutes at worst — and the reference
video itself needs ninety-six seconds to settle.

So a round is played to a bell instead, and **whoever holds the most rope when it
rings has won it.** A ball wiped out before then is out exactly as it would be.
Where the bell falls is part of the seed: mostly 28 to 42 seconds, and one seed in
four aims for 58 to 95 instead, which is the line that matters for monetisation.

The alternative — fighting to the last thread — is one constant away, but it
means videos of two to ten minutes.

## Measured against the reference, not guessed

Every number that decides how it *feels* was taken off the reference videos frame
by frame rather than chosen:

- **The arena is 0.49 of the frame width and a ball is 0.051 of that** — 284 px
  of arena in a 576 px frame, balls with 419 px of solid interior.
- **A ball crosses 0.85 arena radii a second.** Tracking one frame by frame is
  the only way to get this right, and it is the thing that reads as wrong first:
  the first version ran at 2.6, three times too fast.
- **The total never changes.** Counted off the reference: seven balls holding
  seven threads each at the start, four balls holding 19, 2, 17 and 10 eight
  seconds later — the same forty-eight threads, redistributed. That single
  observation is what the whole simulation is built on.
- **The attrition is fast and the endgame is long.** The reference is down from
  seven balls to four inside eight seconds, then spends a minute and a half
  grinding two enormous fans against each other. So does this.
- **Each ball holds one contiguous arc**, all the way through. Counted off every
  frame of the reference, and true here by construction.

One thing was measured and then deliberately *not* copied. The reference's
soundtrack runs at eight and a half onsets a second, but almost all of that is a
sustained tone around 480 Hz re-triggering — there is a music bed under it. The
sound here is collisions only, synthesised, and nothing is borrowed.

The reference starts its balls on seven threads rather than five, so its rim
divides into forty-nine anchors instead of thirty-five and its fans read denser.
That is `OPENING_THREADS`, and it is the one number that would match it exactly.

## What is fixed and what varies

Almost everything is fixed, and that is the point: the videos should read as
episodes of the same thing. Arena, ball size, thread thickness, speed, palette,
the black ground and the white ring are constants in `src/sim/style.ts`; the
cast — seven balls, these colours, these places, these opening fans — is a
constant in `src/sim/simulate.ts`.

The seed varies exactly one thing: **the direction each ball is fired in.**
Everything else follows from it.

## The sound

Every note is synthesised from the event list the simulation produced, so the
sound is not *synced* to the picture — it is the same thing as the picture, and
it cannot drift. A struck note per wall bounce, one pitch per ball, so you learn
to hear who is who; the same note an octave up and much shorter for a thread
going; a duller knock when two balls meet; a low hit for an elimination; one
chord at the end. The notes climb as the field thins out, which builds the
tension without anyone arranging it.

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
| `src/app/page.tsx` | One button: fight, encode, save. |

The simulation runs once, up front, and keeps a snapshot per frame; the encoder
reads those in order.

## Notes

- Encoding a 40-second video takes a minute or two on a machine without a
  hardware encoder, and far less on one with it. Progress and a cancel button are
  in the page; keep the tab in front while it runs.
- The container is MP4 with H.264 and AAC wherever the browser can encode them.
  Where it cannot — some Linux builds of Chromium, for instance — it falls back
  to AV1 or VP9 video and Opus audio, which every phone plays but some desktop
  editors do not.
