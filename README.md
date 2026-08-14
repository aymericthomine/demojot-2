# Ball Battle

Two generators for vertical 9:16 videos, in one page. They share the seed, the
clock, the sound and the encoder, and nothing else.

**Ball battle** — balls in a ring fight over a fixed set of threads pinned to the
wall, taking them off each other until one ball is left holding rope.

**Fruit drop** — a chute lets go of a piece into a bowl three times a second, and
two of the same kind that touch become one of the next kind up. Eight kinds, and
the video ends when the eighth is made.

Both are computed frame by frame in the browser: no footage, no rendering
service, nothing uploaded anywhere.

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
cannot · soundtrack built from the collisions*

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

**Pick a colour** for any ball by clicking its swatch. The seed deals the palette
out; the picker overrides what it dealt, and the override follows the ball
everywhere it shows — the disc, its threads and its pins on the rim all change
together, so a captured thread still reads as a capture. The `↺` next to a
swatch hands the ball back the colour the seed gave it.

**Ball size** is ×1, ×1.4 or ×1.9. Not only a look: a wider ball sweeps a wider
corridor, so it runs through more rope per pass and the fight moves faster. It
does not make the video shorter — the holding limit is searched against the
length either way — it makes it busier. At twelve big balls the opening huddle
would not fit round its usual ring, so the ring opens out just far enough to
leave a hair between neighbours, and no further.

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

## Ball battle — the rules

Four of them, and they are the whole game.

1. **The anchors never move.** The rim is divided into a fixed ring of anchor
   points — seven balls with five threads each, or ten, or twenty — set before
   the first frame and unchanged to the last. Where the ring *starts* is the seed's,
   and it moves in whole anchors: turn by a fraction of one and the wedges would
   stop meeting.
2. **Touch a thread and it comes away with you** — new hub, new colour, same
   anchor. The ball is not turned by it: rope does not push back, and the only
   rebounds in the arena are off the wall and off other balls.
3. **Full hands break rope instead of taking it.** Run through one thread past
   what your hands hold and it snaps, and that anchor stays empty for the rest of
   the round. How much a ball can hold is the one number chosen per video rather
   than fixed, because it is what decides how long the fight lasts — see below.
4. **Threads are life.** A ball holding none is out.

Rule 3 is the one that finishes the fight, and it is worth saying why. Transfer
on its own conserves — nothing enters the ring and nothing leaves — and a
conserving economy has no drift towards a winner: the last two trade the same
rope back and forth and the count wanders for ever. Ten minutes, and still two
balls. Breakage makes it one-way. **So there is always a winner.**

## How long a video runs

**A minute to a minute and twenty, drawn from the seed.** Never less than a
minute. The fight is not a settable length — it takes as long as it takes — so
the seed picks a length first, then hunts for a fight that settles just inside
it, and the rest is the winner's victory lap: it keeps moving, holding every
thread in the ring, until the clock runs out. The lap is a fifth of the video at
most, so the ending is an ending rather than half the film.

A minute is a long fight, and simply asking for one does not produce it. At the
old fixed holding limit fights settle around thirty seconds at seven balls and
around twenty at twelve — most deals were finishing less than halfway through,
and no amount of re-dealing changes a distribution. **So the limit is searched,
not fixed.** Loosen it and rope survives longer and the fight runs long; tighten
it and the arena empties in seconds. Swept across every density it moves the
median settling time from ten seconds to past a hundred, monotonically, so a
video's limit is found by bisecting a ladder of them — four plays to bracket the
length asked for — and only then are deals tried, with the limit still stepping
after each miss.

That is what a search over deals alone could not do: at twelve balls there was
often no deal that lasted a minute to find.

Measured across every combination of ball count, thread count and ball size,
twenty seeds each: **the length is exact every time, and every video has a
winner.** The victory lap comes out five to eleven seconds typically, under
twenty for nine seeds in ten. Finding the fight costs a tenth of a second at
three balls and one to two seconds at twelve balls on a hundred and forty
anchors, worst case five.

The first second is held on the opening picture before anybody moves. Seven
wedges dividing the rim is the most legible frame in the video and it is gone in
an instant otherwise.

**No two threads ever overlap.** Not as a repair, not as a constraint checked
afterwards: a ball takes every thread it touches, so it is never on the far side
of one. Checked on every frame of five full rounds spanning every ball count,
thread count and ball size: zero crossings.

## Fruit drop

The bowl is a flask: a circle with its top arc missing between two vertical
walls, which is where the chute comes in. Fruit falls in, piles up, and merges.
Nothing is aimed — there is no player — so the video is what the pile does.

Two things were measured off the reference rather than chosen, and both decide
how it reads:

- **The bowl is wider than the frame.** Radius 0.519 of the frame width, centred
  a little above the middle, so the ring is clipped by a few pixels either side.
  The outline is 8 px of 576, the neck 83 px across.
- **The chute is a conveyor, not a fall.** The column is evenly spaced, 67 px
  apart at 6.5 px a frame, and neither number drifts — measured across five of
  the reference videos, all the way from the top of the frame down to the pile.
  No falling body does that. So a piece comes down at one speed on one line until
  it meets something — the wall at the start of a round, or whatever is already
  in the bowl — and weight starts at the moment of contact, with the speed it
  arrived at. Letting gravity take over at the neck instead stretched the column
  out and lost it.
- **The outline is one colour at a time, and that colour drifts.** Sampled round
  the circle at four points twenty seconds apart: every point on the ring is the
  same colour as every other at any given moment — pink at three seconds,
  lavender at thirty, cream at ninety — and all of them are white with a tint,
  88 to 93 per cent lightness. Drawing it as a gradient across the bowl put
  visibly different colours on opposite sides of the same ring, which is not what
  the reference does.

**The bowl does not settle into a heap.** Four numbers decide that and all four
were set too cautiously. The wall gives back more than half of what hits it — it
is the one thing in the bowl that cannot move, so it is the only contact that
can return a piece to where it came from. Two pieces give back three fifths, so
a push passes along and keeps passing along instead of being absorbed. Almost
nothing is rubbed off a slide, which matters more than it looks: pieces at the
bottom are in contact constantly, so a twelfth per contact was quietly the
largest brake in the bowl. And the threshold below which a contact takes
everything instead of bouncing is now fifteen times lower, because anywhere near
the speed of an ordinary nudge it swallowed every one of them.

Measured on the same seed: three quarters of the pieces are moving at any moment
where it used to be under half, at half again the speed. The first piece of a
round bounces thirty-nine pixels off the floor of a 1080-wide frame.

**Gravity is weak, and that is measured too.** A loose fruit in the reference
drifts down at about thirty pixels a second and gathers speed so slowly it reads
as floating. It is worth keeping for two reasons beyond fidelity: a fruit under
earth gravity would double its spacing every few tenths of a second, so the bowl
would be empty between one fruit and the next; and weak gravity is what makes a
bounce worth having. A third of an impact comes back, which climbs about a fifth
of the bowl and takes two thirds of a second to do it — under a hard gravity the
same rebound would be a twitch. Below a threshold a contact takes everything
instead, or a pile of thirty would tremble for the whole video rather than
settle.

Growth up the ladder is 1.20 per rank, which is also measured: a strawberry is
40 px across in that frame and the dragon fruit seven ranks up is 122.

**A column down the exact middle of a round bowl builds a tower, not a pile.**
Every contact normal points straight up, nothing is ever pushed sideways, and
the first version spent the whole video growing one stack of fruit up the chute.
Two things fix it, and both are small: a fruit is let go within half a radius of
the middle, and a merge shoves what it makes off to one side. The column still
reads as straight.

**The eighth element is the ending, and it sets the length.** A piece of rank `k`
costs `2^k` of the first, so the eighth costs a hundred and twenty-eight
strawberries — anywhere from a minute to two and a quarter, and the pile decides
which. The cadence is not touched to fix that: the column comes down at one
speed, evenly spaced, and that is the whole look. What varies is the deal, and a
deal that runs past a minute and fifty is simply dealt again. That is affordable
only because of the grid below — a drop plays out in under a second, so the
search costs a second or two rather than a minute. Sixteen seeds: sixty-five
seconds at the shortest, eighty-four in the middle, a minute forty-two at the
longest, every one ending on the eighth and none inside a minute.

**The column comes down the exact middle.** It used to be let go within half a
radius of centre, because a column down the middle of a round bowl builds a
tower rather than a pile — every contact normal points straight up, so nothing
is ever pushed sideways. What breaks the symmetry now is the shove a merge gives
what it makes, which turns out to be enough on its own: the pile spreads across
four fifths of the bowl and the column stays straight.

Two of a kind merge a hair before they touch — a tenth of a radius. Nothing aims
here, so a pair that never quite meets is the whole reason a drop runs long, and
that tenth is half a minute off the tail of the video. It is invisible: the halos
of two pieces that close have been overlapping for a while.

**The neighbour grid.** Every pair of pieces used to be tested against every
other, three times a substep, eight substeps a frame — a hundred thousand tests
a frame at sixty pieces, and a long drop took sixteen seconds to play out. The
bowl is now divided into cells a little wider than a middling piece; each piece
is filed under every cell its box covers, and only pieces sharing a cell are
tested. Two that touch have overlapping boxes and therefore share a cell, so
nothing is missed, and a pair sharing two cells is settled in the one holding the
point between them, so nothing is done twice. Five times faster, and it is what
makes a two-minute drop bearable on a phone.

**Your own fruit.** Each rank takes an image — cropped square, clipped to the
circle, so a cut-out photograph on transparent ground works best — or an emoji,
or just its colour. The colour is the halo either way; emoji paint themselves,
so the halo is the only colour the page controls.

**🎲 Random emoji** deals the whole ladder at once. Eight themes — fruit, gems,
planets, animals, sweets, sea, sport, faces — each eight glyphs in size order,
because the ladder is a size ladder and a bee has to be a rank below a bear or
the merges read backwards. About one roll in five ignores the themes and deals
eight glyphs that have no business being in the same bowl. It never deals the
same thing twice running.

**Everything rings when it is hit.** A piece is a rigid circle, so an impact
that ought to deform something soft just stops it dead and a pile of anything
reads as a pile of pebbles. So a knock leaves a squash that decays over a third
of a second at eleven cycles a second, scaled by how hard the knock was. It is
drawn, not simulated: nothing moves and nothing merges because of it. Something
is ringing in about half the frames of a drop, one or two pieces at a time.

**Drawn sets** — gems, diamonds, jelly cats, planets — are not emoji at all.
Emoji are somebody else's artwork rendered by the machine's font, so they look
different on every device and cannot be tuned; these are drawn out of arcs and
polygons and gradients, which means a gem is the same gem everywhere and its
colour is a number this repository owns. A brilliant cut has a table, a girdle
and a pavilion; the ringed planet gives up some of its width so the ring has
somewhere to go without hanging over its neighbours.

Each set is scaled until its silhouette meets the circle the simulation is
actually using. A piece drawn inside its circle rather than out to it looks like
it is floating: two resting against each other show a gap the width of whatever
the artwork left over, and on a white ground there is no halo to cover it. An
octagon's flat faces sit at 0.92 of its radius, a lit sphere was drawn at 0.88, a
brilliant cut is shorter than it is wide.

**The sound** is one of five, each cut from a different reference video at its
most isolated hit — the loudest onset with the quietest two hundred milliseconds
either side, trimmed to its transient and faded so a cut sample cannot click.
They run from a 2.4 kHz glass tick that is gone in forty milliseconds to a
560 Hz knock. The octave used to mark the last element is the same sample played
at twice the rate rather than a second recording. **▶** plays four ticks at the
rate the chute feeds, which is what the choice actually sounds like — one tick in
isolation tells you very little — and picking one plays it, since a row of five
words is not something anybody can choose between by reading.

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
