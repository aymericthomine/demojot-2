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

Every bounce off the wall leaves a thread pinned where the ball struck, and a
thread once laid is **never taken back**. So the arena silts up: seven clean fans
become a thicket.

That is the whole danger. **A ball that touches somebody else's thread is out**,
and its own threads go with it. Early on the place is crowded and balls fall
within seconds of each other; later there is room again, and the last two spend a
long time weaving through each other's fans. The round ends with one ball left,
so the length of a video is not a setting — it is how long the fight took.

Most land between 30 and 50 seconds, and **one in five runs past a minute**,
which is the line that matters for monetisation. Over sixty seeds: a quarter
under 31 s, half under 39 s, a fifth past 60 s.

Two numbers were found by measuring rather than guessing, and both are in
`DEFAULT_TUNING`:

- **Balls are fired inward, not tangentially.** A billiard in a circle keeps its
  angle of incidence for ever, so a ball sent off near the tangent spends the
  entire video hugging the wall in a tiny rosette: the picture stops moving and
  the fight stops happening.
- **A thread only kills along its outer half.** Threads converge on the ball that
  owns them, so without that a ball merely passing near another would be killed
  by the bundle at the hub rather than by anything you could see coming — and
  every fight would be over in ten seconds.

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
it cannot drift. A struck note per bounce, one pitch per ball; a short bright
a low hit for an elimination; one chord at the end. The notes climb
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
