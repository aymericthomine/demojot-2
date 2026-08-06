# Ball Battle

A generator for vertical 9:16 videos: seven balls fight inside a ring, laying
threads to the wall as they go, until one is left. Picture and sound are both
computed — there is no footage, no samples, and nothing downloaded.

Every video **opens on the same picture** — the same seven balls, same colours,
same places, same fans. The **seed** only decides which way they are fired, and
since a billiard in a circle never forgets its opening angle, that is enough to
make everything after the first second different, including how long the video
runs.

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

Four of them, and they are the whole game.

1. **Everybody starts with five threads**, and the seven fans meet edge to edge:
   the wall is claimed from the first frame. The rim holds a whole number of
   thread slots and no more, so nobody can grow until somebody loses — which is
   what makes the opening a knife fight and the rest of the video a land grab.
2. **Touching the wall claims free rim.** A fan grows from whichever edge faces
   the point the ball struck, taking every unclaimed slot it finds up to three at
   a time, and stopping dead at anybody else's rope. So a ball that runs into the
   arc a beaten rival left behind comes away with a handful of threads; a ball
   that hits wall already spoken for comes away with nothing.
3. **A ball cannot cross a thread without cutting it.** Everything its disc
   touches goes, that frame, with nothing to wait for — the only rope spared is
   the bundle within a few ball-widths of the ball that owns it, where the
   threads are packed tighter than a ball is wide and being alongside somebody is
   not the same as crossing their fan. Threads are life: a ball with none left is
   out, and its fan goes with it, which frees the rim for whoever gets there
   first.
4. **Rope turns the ball that snapped it**, and balls bounce off each other. The
   thread deflection is a bend rather than a bounce and only the direction
   changes — speed is a constant of the style — but it is what stops a ball
   crossing a fan of twenty in a straight line and taking the lot.

**Threads are never laid across each other.** A thread is only pinned into rim
nobody holds, on the side of the fan the ball came from, so the wall ends up
divided into coloured sectors that meet without tangling. What is *not* undone is
a crossing that appears afterwards: the rim end of a thread is fixed for ever and
only the ball end travels, so late on, when two balls are dragging fans of twenty
across each other, lines do pass over lines. The reference does the same, and
untangling it after the fact meant deleting threads nobody had cut.

The round ends with one ball left standing, so the length of a video is not a
setting — it is how long the fight took. Over sixty seeds: 21 to 93 seconds, a
quarter under 32, half under 38, and **a quarter past the minute**, which is the
line that matters for monetisation.

## Measured against the reference, not guessed

Every number that decides how it *feels* was taken off the reference videos frame
by frame rather than chosen:

- **The arena is 0.49 of the frame width and a ball is 0.051 of that** — 284 px
  of arena in a 576 px frame, balls with 419 px of solid interior.
- **A ball crosses 0.85 arena radii a second.** Tracking one frame by frame is
  the only way to get this right, and it is the thing that reads as wrong first:
  the first version ran at 2.6, three times too fast.
- **The rim is tiled from the first frame** and stays that way, with the
  survivors' sectors swallowing the sectors of the dead. That is why the
  reference's totals barely move — seven balls holding seven threads each becomes
  three balls holding fifteen.
- **The attrition is fast and the endgame is long.** The reference is down from
  seven balls to three inside ten seconds, then spends a minute and a half as a
  duel between two enormous fans. So does this.
- **Fans reach a dozen threads by the middle of a round and twenty-five by the
  end.** The rim divides into thirty-five slots — seven balls, five threads each
  — so a finalist tops out near thirty-five. The reference starts its balls on
  seven threads rather than five, which is why its fans read denser; the one
  change that would match it exactly is `OPENING_THREADS`.

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
