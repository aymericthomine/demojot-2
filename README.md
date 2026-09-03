# Twelve

Four generators for vertical 9:16 videos, in one page. They share the twelve,
the seed, the clock, the sound and the encoder, and nothing else.

**Month** — twelve balls loose in a ring. While exactly one of them is in the
zone in the middle, it banks the seconds; the video ends the moment one of the
rings closes.

**Hot potato** — the same twelve, passing a fuse. Whoever is holding it when the
fuse runs out is out, and stops dead where it fell to become a wall everybody
else bounces off. Last one still in survives.

**Pachinko** — the same twelve dropped down a field of pegs into seven slots,
over and over. A slot is worth what is written on it; where a ball lands is
added to whoever it belongs to, and the last wave lands on multipliers instead.

**Keep the wires** — a hundred and eighty wires pinned to the rim, fifteen a side,
each running to the ball that owns it. Run through a wire and it comes away with
you; because a ball takes what it touches, no two wires ever overlap. A side
holding none is out.

Who the twelve *are* is a separate choice — months, star signs, countries,
sports or fruit — and the same seed plays the same round whichever of them is
wearing it.

All of it is computed frame by frame in the browser: no footage, no rendering
service, nothing uploaded anywhere.

*1080×1920 · 60 fps · H.264/MP4 where the machine can, AV1 or VP9 where it
cannot · soundtrack built from the collisions*

There were three more generators here — a ball fight over threads pinned to a
wall, a fixed-dial version of it, and a turning point cloud — and they have been
taken out rather than left to rot: a page with six buttons on it where three are
never pressed is a page nobody finishes reading. Their code went with them, and
what they shared with what is left — the frame, the clock, the minute-to-eighty
length — stayed.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
npm run build:static # the GitHub Pages build, into out/
```

Pick a game, pick a cast, roll a seed, press the button. The round is played out
up front, every frame is painted straight into the encoder, and the file saves
itself when it is done.

## Month

Hold the centre. Twelve balls, one a month, loose in the same ring the fight
uses, with a zone in the middle. While **exactly one** ball is inside that zone,
its month banks the seconds; every ball wears a ring showing how much of the
target it has banked, and the video ends at the moment one of those rings closes.

Two rules carry the whole thing:

- **Only alone counts.** Two balls in the zone and nobody scores, which is what
  stops a scrum in the middle from being the entire game and makes a clean run
  through it worth something.
- **Nothing is ever lost.** Banked seconds are not defended. A month that led
  early and never came back still finishes with its arc where it was, so the
  picture is a scoreboard rather than a fight.

**Nothing is searched for.** This is the one mode that needs no dial hunted: the
trajectories do not depend on the target at all — the target only decides when to
stop — so the round is played once to a cap, the hold curves are recorded, and
the target is then *read off* them. It is whatever the leader has banked at the
second the round ends. The winner is that leader, its ring closes on that frame
by construction, and because banked time only ever grows, nobody reached that
target earlier.

**What is not free is where that second falls.** A month's total is a staircase:
it climbs only while that month is alone in the middle and sits flat the rest of
the time. A whistle blown on a flat stretch reads back the total the leader
reached at the top of the last step — its ring filled *there*, and everything
since was a full ring going nowhere, by six seconds on average and twelve at
worst. So the round ends on a frame where the leader is banking, the one nearest
the length the seed asks for. Checked over two hundred seeds: the winner's total
is below the target on the frame before and exactly on it at the whistle, all two
hundred. The colour goes one frame later, 17 ms.

The cost is the length, and it is a real one: the seed sets an aim rather than a
promise. Nine rounds in ten land inside the mode's sixty-to-eighty seconds, and
none runs past the top of it — where the play leaves no room to stop, the round
is cut short rather than run long.

**Every video opens on the same clock face.** October at twelve, then round
clockwise in calendar order, every ball at 0.725 of the way out — the
reference's arrangement, and deliberately not shuffled: it is the one frame a
viewer reads before anything moves. The seed decides which way each ball is
fired and nothing else, which is enough, because a billiard in a circle never
forgets its opening angle.

**The empty ring is drawn from the first frame**, in a dark grey, before anybody
has banked anything. A track that appears only once there is something in it
reads as an ornament that came from nowhere; and until a viewer has seen an
empty one, they cannot see that filling it is what the game is for.

Geometry off the reference frame by frame: the arena is the fight's own, the
balls are 0.085 of its radius against the fight's 0.069, the zone is 0.26 of it,
and the ring round the arena is four pixels in a 576-wide frame. The balls travel
at 0.58 arena radii a second, measured by tracking one of them frame by frame —
0.555 at the median, 0.61 at the ninetieth percentile, the spread being what two
balls trading speed on a bounce does. That is slower than the fight's 0.85: this
is a game of drifting through a place rather than of running somebody down, and
at the fight's speed the middle is crossed too fast for a hold to mean anything.
The holder's name is measured and shrunk to fit inside the zone rather than set
at a fixed size — a name that hangs over the edge stops reading as the zone's
own label.

**No writing anywhere but the balls.** The reference opens on a title over the
arena and this did too; asked for without it, what is left is the board on plain
black, and the board explains itself — a ring that fills is a ring that fills.
## Hot potato

The same twelve months in the same ring, but what is passed around is a fuse. One
month is holding it; whenever the holder touches another month that is still in,
it changes hands. When the fuse runs out, whoever is holding it is **out** — and
the last month still in survives.

Two rules give the mode its shape:

- **Out months become walls.** A month that goes out does not leave the picture:
  it stops dead where it fell and everybody else bounces off it. The arena silts
  up as the game runs, so the last minute is played in a pinball table rather
  than an empty circle. It is also the honest way to lose twelve balls one at a
  time — removing them would leave the arena emptier and the game calmer exactly
  when it should be getting worse.
- **The fuse never stops.** It is not a race to reach anything, it is a race not
  to be holding. Nothing a month can do adds time, so there is no playing for
  safety, only passing it on.

Three states, and the picture has to separate them at a glance on a phone: a
month still in is a **filled disc**, a month that is out is the **hollow ring**
it left behind, and the holder wears a **red band**. Filled against hollow does
work that dimming alone would not — a dark disc among bright ones reads as a
colour choice, while a ring with nothing in it reads as something that used to be
there. The out ring is drawn so its outer edge is exactly the surface everybody
bounces off, which is the only way the picture and the physics agree about where
a wall is. The band is stepped off the rim rather than laid flush like Month's
gauge: it is red, and two of the twelve are near enough to red that a flush band
would join up with them.

**The length is a sum, not a hunt.** Eleven months go out, one per fuse, so a
round is eleven fuses and an ending. That is written down as the *length* —
sixty seconds at the floor, seventy-four at the ceiling — and the fuse is
derived from it, rather than the other way about: a floor of a minute is the
number anybody has an opinion about, and stated as a fuse it is a sum somebody
has to redo by hand every time the cast or the ending changes. Measured over a
hundred and twenty seeds: 60.6 to 73.8 seconds, none under the minute, and a
hundred distinct lengths. The seed picking the fuse is also the only reason two
rounds differ in length at all — eleven fixed fuses would make every video the
same length to the frame, and identical durations are the first thing a
duplicate detector reads.

**The fuse only shows with three seconds left.** A number counting down from
five for the better part of a minute is wallpaper — the eye stops reading it —
whereas one that arrives is an event, and it arrives at the only point where it
changes what you are watching for. It goes red for the last second and a half of
the three, which is the reference's own tell.

The soundtrack needed a guard the other modes do not. A month wedged against a
wall produces contact on every substep — a real contact, but not a real knock —
and unguarded the hit list ran to twenty-five thousand on a round where Month has
eight hundred, which was enough to hang the page before a single frame was drawn.
A knock now needs 0.08 seconds of quiet behind it, and the list comes back to
about 270.
## Pachinko

Twelve balls down eleven staggered rows of pegs into seven slots — twenty-five
at the edges, two in the middle — and where a ball lands is added to whoever it
belongs to. Nobody is eliminated and nothing is held: the whole mode is a
scoreboard filling up, which is why the scoreboard and not the field is the top
third of the picture.

**They fall in waves.** All twelve are released a beat apart and the next wave
waits until the board is empty. That is the reference's own cadence and it is
the only one that keeps the mode legible: a continuous dribble of balls is a
screensaver, whereas a wave has a beginning, a middle where six are in the air
at once, and an end where the last one is still rattling and you are watching
only it. Measured off the reference: waves of about five seconds with a beat of
empty board between them, which comes out at eight or nine waves a video.

**The middle is cheap and the edges are rich**, and nothing had to be weighted
for that — a ball falling through eleven staggered rows lands near the middle
far more often than at an edge. Measured over forty seeds: 8 / 8 / 17 / 32 / 19
/ 10 / 6 per cent across the seven, which is seven and a half points a landing
and a twenty-five as an event rather than as a regular income.

**A ball cannot balance on a peg.** A ball arriving dead on a peg's crown
bounces straight up, comes straight back down, and the two of them can trade the
same tenth of a second for four seconds while the rest of the wave has long
since landed. A real ball rolls off the dome it is sitting on; this is that, as
a floor on the sideways speed a peg sends a ball away with, on the side it was
already leaning. Before it, the worst hang measured was 12.8 seconds and the
video ran to 87; after it the worst fall is 6.0 and the longest video 73.3.

**The last wave multiplies.** The slots change to ×3 ×2 ×2 ×1 ×2 ×2 ×3 for one
final drop and the bar under the board turns gold — the only two things that
say the ending has started, which is all it needs. It is deliberately violent: a
minute of scoring can be turned over in four seconds, and that is what makes the
four seconds worth watching. The leader still has the best of it, since five of
the seven slots multiply by two or three.

**The length is held to the floor by waiting.** The seed sets how long balls
keep being dropped for; the last wave and the ending take as long as they take,
and the winner is then held until the video has cleared a minute. Over a hundred
and twenty seeds: 60.0 to 73.3 seconds, none under the minute and none over the
ceiling.

Balls do not collide with each other — two dozen ball-to-ball contacts a second
in a field this tight reads as mush rather than as physics, and the reference's
own balls pass through one another. The pegs are the game. The geometry lives in
the simulation in units of the field's width and the painter multiplies by
however wide it draws the field, so the picture cannot disagree with the physics
about where a peg is.

**It is exactly as tall as the ring the other modes are played in.** Every part
of the column — the two rows of the scoreboard, the gap, the board, the bar — is
a multiple of the field's width, so the whole thing has one height written as a
sum, and the field's width is that height divided by it. Set to the arena's
diameter it comes out at 976 pixels against the ring's 978, on the same centre.
A mode that arrived on the same page half again the size of the ones next to it
would read as a different site rather than as another game.

## Keep the wires

A hundred and eighty wires pinned to the rim — fifteen a side — each running
from its pin to the ball that owns it. Two rules:

> **Run through a wire and it comes away with you** — new hub, new colour, same
> pin. Every wire the ball passed through, not the first one found: it is not
> turned by them, it cuts and carries on.

> **A ball can only hold seventy-two.** Full hands break the wire instead of taking
> it, and that pin is empty for the rest of the round.

**No two wires ever overlap, and that falls out of the first rule** rather than
being repaired afterwards: a ball takes what it touches, so it is never on the
far side of a wire it does not own, and a fan can therefore never reach across
another. Checked on every frame of six full rounds — **23 307 frames, zero
crossings.** Eight substeps a frame, not four, because a wire is caught by
testing where the ball *is*, and a ball moving further than its own reach in one
substep steps over one — and a wire stepped over rather than taken is exactly
the crossing this does not allow.

**The break is what makes a round finish, and the limit is how hard it pushes.**
Transfer alone conserves, and a conserving economy has no drift towards a
winner: with nothing entering or leaving the ring, the last two trade the same
wires back and forth for ever. Everything above the limit is destroyed rather
than passed on, so a ring being destroyed is a ring being decided — and the
limit therefore sets both how long the fight lasts and how close it stays.

At twenty-seven, near twice what a ball opens with, two rounds in three were over
by the fortieth second and the winner finished on 92% of what was left, running
the rest of the video alone. Each step up pushes the finish later and the margin
narrower: sixty ends at a median of sixty-five seconds on 66%, eighty-four never
finishes early at all and ends on 51%. **Seventy-two** is where the fight lasts
the whole video — the earliest finish over thirty seeds is fifty-eight seconds,
which *is* the whistle — and the winner comes home on 58% of about a hundred
wires with the runner-up twenty-two behind. The price is that the ring is
scarcely ever emptied to one side: a round is decided on the whistle, and being
close is what that buys.

**Ball speed and the wire count are one dial between them.** A ball takes every
wire it touches, so the fight's speed *is* the ball's speed: at the old fight's
0.85, twelve sides are down to two inside ten seconds and the video spends its
remaining minute on a winner that has already won. What buys the time back is
dealing more wire, since a side with more of it takes longer to strip. At 0.24
on ten a side the fight ran to a median of forty-one seconds; at **0.35 on
fifteen** it runs to forty — the same fight, with the balls travelling half again
as fast. Going further costs the picture rather than the pace: 0.45 on
twenty-five holds the length too, but three hundred wires read as twelve solid
triangles instead of fans of lines.

**A guard around each hub would have bought the same time more cheaply, and it
cannot be had.** Wires bundle together at their owner, so a ball among them
takes an armful at once, and refusing cuts within half a radius of the hub gave
a fine, slow fight — and 968 433 crossing pairs over the same six rounds. A wire
a ball may pass without taking is a wire it can end up on the far side of. The
guarantee and the guard are the same rule pointing opposite ways, and the
guarantee wins.

The wire count runs 180 at the opening and about 100 at the end; sides go twelve
to seven by the fifth second, four by the fifteenth and two or three at the
whistle, which the seed picks between sixty and seventy-eight seconds. Nine of
the twelve are knocked out over the course of a video and the last two or three
are still trading when it ends.

**Arcs are no longer guaranteed whole.** An earlier version moved the pin at the
border of the taker's own arc, which kept every side on one unbroken run of rim.
That bookkeeping is gone, because the pin that moves has to be the pin that was
touched — anything else breaks the no-crossing argument. A ball can therefore
hold a pin inside somebody else's fan, sitting alongside them, without any wire
crossing another.

**There is no counter.** There was one for a while and it was doing the work the
picture should do: a side that is winning wears a fan across half the rim.

## Who is playing

Month, Hot potato, Pachinko and Keep the wires are games about twelve things —
three of them around a ring, one falling down a board — and none of them cares
what the twelve *are*: the simulations count to twelve, and the painters ask for a
colour and something to put on the disc. So the cast is a **dress rather than a
mode** — the same seed plays the same round whichever cast is wearing it, and
there are five to pick from instead of fifteen copies of three games.

- **Months** — the twelve, in the colours sampled off the reference.
- **Zodiac** — the twelve signs, in the colours sampled off theirs, thickened by
  stroking them in their own colour because the symbol faces a machine has carry
  no bold and asking for weight 700 returns the same hairline.

Centring them took three goes, and the lesson is that **every metric the canvas
reports about a glyph is a trap**. `textBaseline` centres the em box, and where a
glyph sits inside its em is the font's business. `textAlign = 'center'` centres
the *advance width*, and a star sign's ink does not sit in the middle of its
advance in the face Safari picks — which put all twelve nearly half a radius to
the right, the same amount each. And correcting either with
`actualBoundingBoxLeft` and `Right` swaps one engine's disagreement for
another's: those are given relative to the alignment point, and engines do not
agree where that point is once `textAlign` has moved it.

So nothing is asked. The glyph is drawn onto a scratch canvas at a known size,
the painted pixels are found, and the offset from where it landed to where it
should have is what gets used. That is a measurement of the ink this machine
actually puts down, cached once per label, and it is right on any machine by
construction rather than by having been tested on one. They come out
  duller than the months' and that is the source's own choice, not a dimmed
  screenshot: white in that frame is 255 and its ground is 0. The glyphs carry
  U+FE0E behind them, because without it these twelve are emoji by default — the
  standard gives them emoji presentation — and would arrive as colour pictures on
  the very phones this is made for.
- **Countries** — the twelve biggest economies, as **pictures cut out of the icon
  set** they are matched to, one disc per country, masked to a circle a pixel
  inside the edge so none of the page they sat on survives the crop.

There was a drawn set here first — twelve painters putting bands and charges on a
canvas — and it was replaced. Drawing could get the arrangement right and never
the *character*: a set of flat icons is one hand making the same decisions twelve
times, and reproducing that by hand reproduces a style rather than a picture. It
also could not carry what does not survive being drawn from memory at eighty
pixels, and the failures were instructive — a maple leaf came out as an asterisk
until the notches were cut deep enough, and Mexico's eagle was a brown egg, then
a mushroom with a smile once a wreath was added under it.

What has not changed is why they are not emoji. The regional-indicator emoji is a
smiley by another name, and half the platforms that matter refuse to draw it, so
a video made on Windows would come out spelling `DE` where Germany should be.

The pictures are carried as data rather than as files, for two reasons: a static
export served under a path prefix has to be told that prefix for every asset it
fetches, and a fetch that fails leaves a video with holes in it. Quantised to
thirty-two colours each — which flat artwork loses nothing to — the set is
seventy kilobytes. They are decoded once before the first frame, because painting
a frame is synchronous and cannot wait for a picture.

In Hot potato a country that goes out keeps its flag faintly inside the ring it
leaves. Without it a wall is a coloured ring and nothing else, and several of the
twelve share a colour, so eleven of them would say nothing about who used to be
there — which is the whole point of leaving them on the floor.

A flag **is** the disc, painted out to its full radius. Drawn a little inside it
the fill showed round the edge as a ring in the member's colour — gold round
Spain, green round Mexico — which reads as a picture mounted in a coloured
surround rather than as a flag. Its circular edge is anti-aliased in the source
crop rather than cut on a pixel boundary, because a hard mask leaves a
stair-stepped rim once the picture is scaled down onto a ball, and that rim is
exactly what makes a bitmap look like a bitmap next to a drawn shape.

A flag disc carries **no rim**. A flag is already a finished picture with its
own edge, and a line round it reads as a badge somebody mounted it in. The cost
is Germany, whose top third is the ground it sits on and now runs into it —
which is what the flag looks like. It does keep Month's empty progress track,
which was taken off it for a while on the same argument and put back on a better
one: the track is not a frame round the picture, it is the gauge the mode is
about, and a country without one has no score to read until it has banked
something.

It also sits on **grey rather than on its own colour**. A picture clipped to a
disc has an antialiased edge, and an edge is a blend rather than a cut: the outer
ring of pixels comes out part flag and part whatever is underneath. On the
country's colour that showed as a hairline in it — blue round Russia, red round
Japan, yellow round Germany — which is a border, and a border is the one thing
the flags were asked not to have.

- **Sport** — twelve balls, painted rather than photographed: a football's
  pentagons, a basketball's seams, a baseball's stitching, an eight ball, a
  rugby ball's lacing on plain leather. Read "sport"
  as the equipment and not as the clubs — a football is a pattern and a crest is
  a trademark, and a cast of twelve crests could not be posted without somebody's
  permission. It is also the cast this project was always going to have: every
  mode here is balls in a box, and these are the balls.

  They are drawn at the size they are read at — forty pixels in a scoreboard,
  thirty-five falling through Pachinko — so each one carries the few markings
  that survive there and nothing that would turn to mud. The rugby ball started
  as an oval on a dark pitch, which is what makes a rugby ball a rugby ball and
  also what made it the one picture in the cast that was a scene rather than a
  ball; the leather now fills the disc like every other, and the lacing does the
  identifying on its own. Its panel seams went the same way — brown on brown at
  this size is a smudge, not a seam.

  **A faded picture goes down as one layer.** A painted ball is a ground with
  markings that cross, and drawn straight onto the frame with the alpha turned
  down, every pass composites separately: a crossing comes out denser than the
  strokes that made it, and the ball arrives with a ghost of its own drawing on
  top of it. Measured on a basketball at 55 per cent, which is how the holder's
  picture is written across Month's zone: the two straight seams read (72,39,14)
  and (47,27,10) — the same seam, two densities — where painting it whole on a
  plate and compositing once gives (14,9,3) everywhere. The same fix, and the
  same reason, as the star signs. The first attempt drew
  every seam from pole to pole, which put its two ends together and made a lens:
  the tennis ball, the baseball and the volleyball came out as one ball in three
  colours. A seam is now an arc bulging towards the near side and running off the
  top and bottom edges, which is what a seam on a sphere looks like flattened.

**They are somebody else's artwork.** That is worth knowing rather than
discovering; the drawn set they replaced owed nothing to anyone.
- **Fruit** — avocado, kiwi, coconut, apple, orange, strawberry, watermelon,
  melon, lemon, dragon fruit, guava, pineapple. Every one of them **sliced**.
  Eleven of the twelve were asked for by name; the pineapple makes up the
  number, because the games count to twelve and not to eleven.

  One rule and one view: each member is a cut face filling its disc edge to
  edge — skin at the rim, flesh inside it, and whatever the middle holds. That
  is the only view under which twelve different fruits are twelve circles rather
  than twelve pictures of things that happen to be round, and it is what the
  reference sheets do: a slice is flat, has no background, and reads at any size
  because it is made of rings.

  It took three goes to get there, and the two wrong ones are worth keeping in
  mind. A cast of dishes needed a plate drawn round half of it. A cast of whole
  fruit put a bunch of grapes, two cherries on a stem and a banana lying across
  their circles — a small object floating in the middle of a disc reads as an
  icon somebody mounted there, and at forty pixels an icon is a smudge while a
  field of colour is still a colour.

  The citrus segments are drawn as wedges with the pith showing between them
  rather than as white lines over the flesh: a line between two segments is one
  pixel at this size and disappears, whereas a gap between two filled wedges is
  the pith behind them and cannot.

  Fruit runs to reds and yellows, so several of the twelve colours sit close
  together — the watermelon is named by its rind rather than its middle purely
  to put one more green in the set. That is the same trade the countries make,
  and it costs nothing: no member is ever identified by its colour alone.

## The sound

One recording — a short tick and the same tick an octave up — placed at every
moment the simulation says something happened. The sound is therefore not
*synced* to the picture: it is the same event list as the picture, and it cannot
drift. The plain tick is every bounce, every knock, every peg; the octave is
kept for the few things that change who is winning, and the end gets three of
them.

The tick is **borrowed**, cut from the reference video. That was asked for over
the synthesised version that was here before, and it is worth knowing what it
costs: it is somebody else's audio, and a platform that recognises it can mute or
demonetise a video that uses it. Nothing else in this project has that exposure.

## How it is put together

| Path | What it does |
| --- | --- |
| `src/sim/random.ts` | Seeded generator. `Math.random` appears nowhere in the simulation. |
| `src/sim/style.ts` | The frame, the clock and the ring, as constants. |
| `src/sim/months.ts` | Hold the centre: twelve balls, one zone, and the banked seconds. |
| `src/render/drawMonths.ts` | One frame of it: arena, zone, balls, progress rings. |
| `src/sim/potato.ts` | The fuse, who is holding it, and the walls the out ones leave. |
| `src/render/drawPotato.ts` | One frame of it: discs, rings, the holder's band, the fuse. |
| `src/sim/line.ts` | The lines, the cutting, and the counter that follows from them. |
| `src/render/drawLine.ts` | One frame of it: the counter, the board, the balls. |
| `src/sim/pachinko.ts` | The peg field, the waves, the slots and the multiplying last drop. |
| `src/render/drawPachinko.ts` | One frame of it: scoreboard, field, slots, bar. |
| `src/render/cast.ts` | Who the twelve are, and how a member is put on a disc. |
| `src/render/flags.ts`, `flagData.ts` | The twelve flags, as pictures. |
| `src/render/balls.ts` | The twelve sports, as paintings. |
| `src/render/fruits.ts` | The twelve fruits, likewise. |
| `src/audio/render.ts` | The event list, offline, into an `AudioBuffer`. |
| `src/export/reels.ts` | A played round, as something the encoder will take. |
| `src/export/encodeVideo.ts` | Frames plus soundtrack into an MP4, via WebCodecs. |
| `src/app/page.tsx` | One button: play, encode, save. |

Each simulation runs once, up front, and keeps a snapshot per frame; the encoder
reads those in order and drops each one as it is painted.

## Notes

- Encoding a 40-second video takes a minute or two on a machine without a
  hardware encoder, and far less on one with it. Progress and a cancel button are
  in the page; keep the tab in front while it runs.
- The container is MP4 with H.264 and AAC wherever the browser can encode them.
  Where it cannot — some Linux builds of Chromium, for instance — it falls back
  to AV1 or VP9 video and Opus audio, which every phone plays but some desktop
  editors do not.
