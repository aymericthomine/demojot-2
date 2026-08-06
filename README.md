# Ball Battle

A generator for vertical 9:16 videos: seven balls fight inside a ring over a
fixed set of thirty-five threads pinned to the wall, taking them off each other
one rebound at a time. Picture and sound are both computed — there is no footage, no samples,
and nothing downloaded.

Every video **opens on the same picture** — the same seven balls, same colours,
same places, seven wedges dividing the rim edge to edge. The **seed** decides which
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
   first frame and unchanged to the last. Every anchor holds a
   thread the whole way through, so the number of threads in the arena is a
   constant.
2. **Rope is solid.** A ball cannot pass through a thread that is not its own. It
   catches on it, the thread comes away with it — new hub, new colour, same
   anchor — and the ball rebounds off where the thread was lying.
3. **Threads are life.** A ball holding none is out. There is no fan to clear
   away: what was its belongs to somebody else now, on the same anchors.

Rule 2 is doing all the work, and it is worth saying what falls out of it.

**No two threads ever overlap.** Not as a repair, not as a constraint checked
afterwards — a ball is penned inside the region its own arc opens onto, so its
threads can never reach across somebody else's fan. Checked on every frame of
twelve full rounds: zero crossings.

**Every ball holds one unbroken arc**, for the same reason. The only rope you can
reach is the rope at the edge of your own territory, so a wedge grows one anchor
at a time, from the outside in.

**Nothing is created or destroyed.** It is all captured, which is why the picture
is always full and why the wedges push against each other instead of leaving gaps.

Balls also bounce off each other on the rare occasions they meet in the open
middle.

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

- **The arena is 0.449 of the frame width, a ball is 0.069 of that, a thread
  0.0062** — a rim 969 px across in a 1080 px frame, balls 67 px through, threads
  about 3 px wide.
- **The opening is wedges meeting edge to edge with an empty middle**, each ball
  at the apex of its own. The reference runs six balls on twenty-four threads
  each — a hundred and forty-four anchors — and reads denser than this does. The
  count here is seven balls on five, thirty-five anchors, which is a deliberate
  choice rather than a measurement; it is `BALL_COUNT` and `OPENING_THREADS`.
- **A ball crosses 0.85 arena radii a second.** Tracking one frame by frame is
  the only way to get this right, and it is the thing that reads as wrong first:
  the first version ran at 2.6, three times too fast.
- **The total never changes.** Counted off an earlier reference: seven balls
  holding seven threads each at the start, four balls holding 19, 2, 17 and 10
  eight seconds later — the same forty-eight threads, redistributed. That single
  observation is what the whole simulation is built on.
- **The attrition is fast and the endgame is long.** The reference is down from
  seven balls to four inside eight seconds, then spends a minute and a half
  grinding two enormous fans against each other. So does this.
- **Each ball holds one contiguous arc and no fan ever overlaps another**, all
  the way through. True here by construction rather than by repair.

One thing was measured and then deliberately *not* copied. The reference's
soundtrack runs at eight and a half onsets a second, but almost all of that is a
sustained tone around 480 Hz re-triggering — there is a music bed under it. The
sound here is collisions only, synthesised, and nothing is borrowed.

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
