# Ball Battle

A generator for vertical 9:16 videos: seven balls fight inside a ring over a fixed
set of thirty-five threads pinned to the wall, taking them off each other until one
ball is left holding rope. Picture and sound are both computed — there is no
footage, no samples, and nothing downloaded.

Every video **opens on the same figure** — seven wedges dividing the rim edge to
edge, an empty middle, the same seven colours on screen — but not on the same
*picture*: the seed turns the figure by a whole number of anchors and shuffles
which ball wears which colour. Thirty-five turns times five thousand and forty
shuffles, so two videos do not share a first frame. The seed also decides which
way the balls are fired, and since a billiard in a circle never forgets its
opening angle, that one number per ball is enough to make everything after the
first second different.

The first frame used to be identical everywhere, pixel for pixel. Combined with a
fixed length and one sound, that is a fingerprint, and a platform looking for
duplicates looks there first — so the figure stays and the arrangement moves.

*1080×1920 · 60 fps · H.264/MP4 where the machine can, AV1 or VP9 where it
cannot · soundtrack synthesised from the collisions*

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

**Balls** is three to twelve. Not two: a two-ball round never finishes, because
each is penned in its own half of the ring and can only reach the rope on the
boundary between them, so they trade the same threads for ever — ten seeds out of
ten were still going on a five-minute clock. Twelve is the palette.

**Dress the balls** with an emoji, a flag, a letter or a logo, or leave them as
colours. A glyph is drawn in the middle of the disc — colour emoji bring their own
colours, a plain character takes the ink — and an image is clipped to the circle
and cropped to fill it, so a rectangular logo keeps its proportions. A logo wins
over a glyph on the same ball. Images are decoded to a bitmap when you pick them,
not on every frame.

**Threads per ball** is five, ten or twenty — thirty-five anchors, seventy, or a
hundred and forty. Five gives wedges you can count and a picture that thins out as
rope is broken; twenty packs the rim tight enough to read as a ring of colour.
Each step doubles the territory to be taken before anybody runs out, so each is a
slower fight than the last, and the holding limit scales with it — otherwise the
dense game would be the sparse one played four times as long.

There is a checkbox for **white ground, colours inverted**: a true negative
rather than a swap of the black and the white, so the ring turns black and each
ball takes its complement — the green becomes magenta, the orange becomes blue.
The file is named `-white` so the two do not get mixed up. Everything else is the
same video: same seed, same fight, same sound.

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

Four of them, and they are the whole game.

1. **The anchors never move.** The rim is divided into a fixed ring of anchor
   points — seven balls with five threads each, or ten, or twenty — set before
   the first frame and unchanged to the last. Where the ring *starts* is the seed's,
   and it moves in whole anchors: turn by a fraction of one and the wedges would
   stop meeting.
2. **Touch a thread and it comes away with you** — new hub, new colour, same
   anchor. The ball is not turned by it: rope does not push back, and the only
   rebounds in the arena are off the wall and off other balls.
3. **Full hands break rope instead of taking it.** A ball can hold nine threads.
   Run through one more and it snaps, and that anchor stays empty for the rest of
   the round.
4. **Threads are life.** A ball holding none is out.

Rule 3 is the one that finishes the fight, and it is worth saying why. Transfer
on its own conserves — nothing enters the ring and nothing leaves — and a
conserving economy has no drift towards a winner: the last two trade the same
rope back and forth and the count wanders for ever. Ten minutes, and still two
balls. Breakage makes it one-way. **So there is always a winner.**

## How long a video runs

**Twenty seconds to a minute and twenty, drawn from the seed.** The fight is not
a settable length — it takes as long as it takes — so the seed picks a length
first, then hunts for a fight that settles just inside it, and the rest is the
winner's victory lap: it keeps moving, holding every thread in the ring, until
the clock runs out. The lap is capped at a third of the length, so a short video
does not spend half of itself on an ending.

Worth checking the range was reachable before promising it, at every density:
played out, fights settle anywhere from four seconds to a hundred and nine, median
around thirty. A fifth land under twenty seconds at five threads and a tenth at
twenty threads, so even the short end is found in a handful of deals rather than
by luck. Twenty seeds at each density: the length is respected every time and
nothing is cut off by the clock.

Over five thousand seeds the lengths come out uniform — about a sixth in each
ten-second band.

The first second is held on the opening picture before anybody moves. Seven
wedges dividing the rim is the most legible frame in the video and it is gone in
an instant otherwise.

**No two threads ever overlap.** Not as a repair, not as a constraint checked
afterwards: a ball takes every thread it touches, so it is never on the far side
of one. Checked on every frame of four full rounds and every sixth frame of
twelve: zero crossings.

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
  Because rope also breaks, the late game on thirty-five anchors is a sparse
  picture — a dozen threads left where the reference still has thirty. Raising
  `OPENING_THREADS` is the one change that fills it back in.
- **A ball crosses 0.85 arena radii a second.** Tracking one frame by frame is
  the only way to get this right, and it is the thing that reads as wrong first:
  the first version ran at 2.6, three times too fast.
- **Threads are both taken and broken.** Counted round the rim frame by frame:
  six balls on twenty threads each at the start, and the total falls to 47 by ten
  seconds and 30 by thirty-five — while individual colours climb, purple going
  from 3 to 22. So transfer is real and so is loss. Nobody is ever seen holding
  much past twenty-four, which is where the holding limit comes from.
- **The attrition is fast and the endgame is long.** The reference is down from
  six balls to four inside ten seconds, then spends the rest of the video as a
  duel. So does this.
- **No fan ever overlaps another**, all the way through. True here by
  construction rather than by repair.

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
