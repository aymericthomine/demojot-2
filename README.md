# Ball Battle

Four generators for vertical 9:16 videos, in one page. They share the seed, the
clock and the encoder, and nothing else.

**Ball battle** — balls in a ring fight over a fixed set of threads pinned to the
wall, taking them off each other until one ball is left holding rope.

**Fruit drop** — a chute lets go of a piece into a bowl three times a second, and
two of the same kind that touch become one of the next kind up. Eight kinds, and
the video ends when the eighth is made.

**Shaper** — a shape made of points turns once every six seconds, and you cannot
tell which way. Silent, and made to loop.

**Month** — twelve balls, one a month, loose in the ring. While exactly one of
them is in the zone in the middle, that month banks the seconds; the video ends
the moment one of the rings closes.

**Hot potato** — the same twelve, passing a fuse. Whoever is holding it when the
fuse runs out is out, and stops dead where it fell to become a wall everybody
else bounces off. Last month still in survives.

All of them are computed frame by frame in the browser: no footage, no rendering
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

**MrBeast** is the same fight with the dials taken away: seven balls, five
threads each, and the one opening that never turns or recolours, so every video
starts on the same picture. That is the opposite of what the opening does in Ball
Battle, where it is turned by a whole number of anchors and recoloured precisely
so that two videos do not share a first frame — here sharing it is the point.
Twelve seeds: one opening between them, lengths from sixty-three to seventy-nine
seconds, every one with a winner. The seed still decides which way the balls are
fired and how long the video runs. Nothing else is settable: no thread count, no
ball count, no size, no dressing and no ground — the panel is the seed, Roll and
Generate. The opening is held for half a second rather than a whole one, because
there is nothing new to read in a picture the viewer has already seen.

**And it plays on a chequerboard.** Ground white, ring black, every colour its
complement — the same true negative the other fight offers as a checkbox, except
that here it is not a choice — and behind it all, squares. Two greys a hair
apart, eleven across the frame: what is drawn over them is thread-thin, and a
chequer with any real contrast in it competes with the threads and wins. A mode
with no dials has to carry the answer itself, so the ground belongs to the mode
rather than to the page, and switching into MrBeast does not inherit whatever
Ball Battle was set to.

**And it winds up, harder and harder.** Every ball is sped up by the same small
factor each substep, and the factor itself grows: the wind-up is raised to three
and a half in time, so the video is not merely faster later, it is gaining speed
faster later, and gaining it fastest at the very end. By the last frame the fight
runs at twenty-eight times the speed it opened at. Relative speeds are left
alone, which matters because the balls do not all travel at the same speed once
they have hit each other.

Measured over eight seeds, the mean speed of the living balls at a sixth, four
tenths, seven tenths, nine tenths and the end of the video: 0.87, 1.89, 8.02,
18.33 and 29.74 arena radii a second, with bounces going from 2.7 a second over
the first quarter to 18.8 over the last, and rope changing hands 1720 times a
round against 640 at the six-times wind-up this started as. The straight line to
three times it began as gave 0.98 / 1.30 / 1.77 / 2.90 and bounced *less* at the
end than at the start — because a fight thins out as balls go, and a straight
line does not gain enough to cover that.

**What sets the ceiling is the frame rate, not the physics.** At the end of a
video a ball now crosses three and a half of its own widths between two frames.
That is the edge of reading as a ball rather than as a flicker, and winding up
harder than this makes the last seconds less legible rather than faster-looking:
at thirty-four times, the mean end speed measured *lower* than at twenty-eight,
because the curve spends so much of its gain in the final second that the fight
has already thinned out by the time it arrives.

**The simulation adds substeps to keep up.** A thread is caught by testing where
the ball *is*, not where it has been, so a ball that moves further than its own
reach in one substep steps clean over a thread without taking it — and over the
wall, too. Four substeps a frame is plenty at the speed a fight is dealt at and
is not plenty at twenty-eight times that: at a fixed four, the quickest ball was
already moving 0.084 arena units a substep against a reach of 0.072 at sixteen
times, and balls were poking through the wall. The count is now worked out from
the top speed the round will reach, against the fastest ball rather than the
mean, which comes to fourteen substeps here. Re-measured: no ball ever leaves the
ring, and the furthest one moves between two substeps is 0.0495. All eight seeds still end on a
knockout, on their exact length, and a video is searched in a second and a
half.

## Run it

```bash
npm install
npm run dev          # http://localhost:3000
```

**Balls** is two to twelve. Two was barred for a long time, on a measurement that
had gone stale: a duel appeared never to finish, because each ball is penned in
its own half of the ring and can only reach the rope on the boundary between
them, so they trade the same threads for ever — ten seeds out of ten were still
going on a five-minute clock. That was true before the holding limit became
something the search moves. A duel does finish, as long as the limit is tight
enough that rope is broken rather than passed back and forth, and the ladder
bisection finds that rung on its own because every looser one runs past the
clock. It wanted one rung tighter than the ladder had, so the ladder got one:
thirty duels across five, ten and twenty threads, thirty knockouts. Twelve is the
palette.

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

**A colour somebody picked is used as picked, in both grounds.** Only the ones
this repository chose are turned inside out on the white ground: handing back the
complement of a colour that was picked off a swatch is not a negative, it is the
wrong colour — pick orange and the negative gives you blue. It broke things as
well as looking wrong. White, inverted, is the same black as the ring, and black,
inverted, is the same white as the ground, so a ball dressed in either lost its
entire fan of threads to the background and read as a ball that had been dealt
none.

The one thing a picked colour is not allowed to do is disappear. Somebody who
picks white for a team that plays in white is right, and on the black ground they
are previewing it looks right; on the white ground it is invisible. So a colour
is kept exactly as picked unless it is too close to the ground to survive, and
then it is walked towards the far end until it clears a contrast floor and no
further. White on white becomes a light grey. Orange stays orange.

**Speed** is ×1, ×1.5 or ×2. One is the reference — 0.85 arena radii a second,
tracked frame by frame, and the first version of this ran at three times that and
read as wrong immediately. The faster settings are not a correction of that; they
are a choice, for a video that wants to be busier than the thing it came from. It
scales the whole fight rather than the launch alone, because nothing in the arena
puts energy in or takes it out: the wall reflects perfectly and two balls trade
the part of their speed that lies along the line between them, so the speed a
round is dealt is the speed it keeps. Measured across seven, twelve and two balls:
bounces go from one and a half a second to three, and the length is still exact
and the winner still there at every setting.

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
- **The column falls.** Five earlier reference videos held their column at a
  constant 67 px of spacing and 6.5 px a frame, which no falling body does, so
  this was built as a conveyor. The reference it now follows does the opposite
  and does it cleanly: tracking seven pieces and fitting their speed against how
  far each had fallen gives 5.0 px a frame at the top of the chute rising to 11.6
  near the bottom of the bowl, one constant acceleration, and gaps that grow from
  107 px to 202 px down the column. A piece is let go at 280 px/s and gathers
  speed the whole way; it stays clear of everything until it meets the wall or
  the pile.
- **Gravity is 204 px/s² in a bowl 503 px across** — 0.41 bowl radii a second
  squared, a seventieth of earth's, which is why everything here floats. It is
  the same number for the falling column and for the bowl, because a piece does
  not know which one it is in, and it is the most reliable measurement in this
  file: one straight line through seven tracks.
- **The outline is a rainbow laid along its own length.** Sampled every thirty
  degrees round the reference at four times twenty seconds apart: red just below
  the left of the neck, orange and yellow down the left, green at the bottom,
  cyan and blue up the right, violet at the right of the neck — and it does not
  move, the same reading at two seconds and at thirty-two. So it is one hue ramp
  along the path, eased so the reds hold the left of the bowl, and the left rail
  of the neck is washed out to white where the ramp starts. Drawn as ninety-six
  short strokes, because a canvas gradient runs in a straight line and would put
  the same colour on the top and the bottom of the bowl.
- **The bowl is 503 px across in a 1080 px frame, its middle 1144 px down a 1920
  px one.** Smaller and lower than the earlier videos framed it.

**A piece weighs what it is wide.** Everything used to weigh the same, so a big
one landing on a small one shared the blow evenly and neither went anywhere
interesting. Weight by *area* was the first attempt and it overshot: twenty times
between the ends of the ladder turned the big ones at the bottom into a floor
rather than pieces, so nothing could move them and nothing above them could go
anywhere either. Width puts three and a half between the ends — enough that an
arriving piece throws what it lands on in proportion to its size, little enough
that the bottom still shifts. Mean speed by rank over one drop: 0.55 bowl radii a
second at the bottom of the ladder, 0.25 near the top.

**And overlap is turned into speed, not only position.** The relaxation passes
separate two pieces by moving them, which leaves both exactly where they were
put: a pile pressed together stays pressed together, and that is what reads as
jamming. A crowd now pushes itself apart — worth almost nothing for a resting
contact and a real shove for a crush. With sliding made frictionless as well,
nineteen pieces in twenty are moving at any moment.

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

Then further, because half measures were still a heap: the wall gives back four
fifths, two pieces give back two thirds, gravity is a third of what the reference
measures, and a merge kicks half again as hard sideways and upwards. That is past
what a real fruit does, and it is the point — the energy budget here is tiny,
since a piece arrives at the speed of the chute and nothing else puts anything
in. A merge is the only event that creates movement rather than passing it
around.

The low gravity is what makes it read as soft rather than sharp: the same
rebound climbs further and stays up longer, so the bowl is busy without anything
in it snapping about. It ended up at a sixteenth of what the reference measures,
which is a choice and not a reading — a rebound now climbs sixteen times as far
and hangs sixteen times as long, and the pile stops being pressed together by its
own weight. Three fifths of the pieces are in the upper half of the bowl at any
moment, drifting through it rather than heaped in the bottom of it. Measured on the same seed: **four fifths of the pieces are
moving at any moment**, at half again the speed, where before it was under half
of them. Sixteen drops run sixty-five seconds to a minute fifty-three, every one
ending on the eighth element and none inside a minute.

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

**The column is laid out downwards from the top of the frame**, not upwards from
the mouth of the bowl. Upwards, the last piece of the opening column landed
wherever the spacing happened to leave it — a sixth of a gap short of the top —
so the first piece the chute released came a gap and a half behind the one in
front of it. That hole then travelled down the column and through the whole
video, which is exactly what the even spacing exists to prevent.

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
somewhere to go without hanging over its neighbours. The gems are one cut at eight
sizes: a tray of hearts and marquises and princesses was tried and it read as a
collection rather than as one thing growing, which is what this is. The other
outlines are still in the file and the faceting routine draws any of them.

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

## Shaper

A shape made of points, turning once every six seconds. The whole mode exists for
one effect: **you cannot tell which way it is going round**, and after a few
seconds of watching it appears to change direction, because your eye gave up on
one reading and took the other.

That is not painted in. It is what is left when every cue that would settle the
question is taken out, and each of the three has to go:

- **The projection is orthographic.** Depth is dropped rather than divided by, so
  the near half of the shape is drawn exactly the same size as the far half.
  Perspective alone would give the answer away in one frame.
- **A point is the same size and the same colour at any depth.** No fog, no
  fading, no shading. A dot that dimmed as it went round the back would be an
  arrow pointing at the direction of travel.
- **Nothing is hidden.** There are no faces to occlude anything — which is the
  reason a cloud of points is the right material for this and a solid is not.

What is left fits two three-dimensional readings equally well: the shape turning
one way, or its mirror image turning the other. There is no fact of the matter in
the picture, and the eye picks a side, holds it, and drops it.

**And a shape generator, because ten shapes is a menu and a menu runs out.**
Pick **∿ formula** and the seed does not choose from a list, it writes one. Left
on *seed picks*, three draws in four are a formula.

The first version of this was a longer menu — five families, each with a handful
of numbers, most of them whole — and it ran out too: there are only so many
(2,5) torus knots, and rolling twice landed on the same one often enough to
notice. So a shape is not picked, it is **composed**, out of three things that
vary independently.

| Part | What it is | What moves |
| --- | --- | --- |
| base | one of nine: supershape, body of revolution, loop, ribbon, mask, spiral, tower, creature, arrow | lobes and exponents, a Fourier silhouette, a closed Fourier curve, a face, a winding, a stack of frames, or a union of balls |
| deformation | applied to whatever the base produced, and to every base alike | twist, taper, waist, flutes, ripples, lean — all continuous, mostly absent, one or two at a time |
| style | scattered over the surface, drawn as a wireframe of rings and meridians, or both at once | how many rings, how many meridians |

The five that are things rather than shapes:

- **arrow** — a band round the axis that stops short of a whole turn and ends in
  a head. The gap between the tail and the head is what says which way it points,
  and the head is a step rather than a taper: a band that merely swells into a
  horn is not an arrow. It is the one base tinted *across* the band rather than
  along it, so one colour runs the top edge and another the bottom the whole way
  round — a tint that ran along the ring would put a seam through the head.
  Height is safe for the illusion: unlike depth, it does not change as the shape
  turns.

- **tower** — rings stacked up struts. Straight between the corners, not along
  the arc between them: sampling the arc gives a stack of circles however many
  sides were asked for, and a circle is a shape where a hexagon is something
  somebody built.
- **spiral** — a tube or a band winding outwards and upwards. A tube that is not
  closed, which needed the tangent to stop wrapping: stepping past the last point
  of an open curve to find its direction hands back a line across the whole
  shape, and it paints as a spray of points through the middle.
- **creature** — a body, a head and a few limbs, as a union of balls sampled on
  the outside only. A point on one ball is thrown away if it is inside another,
  so the joins disappear and what is left is the outline of the whole animal
  rather than a bag of marbles. Limbs are placed to overlap what they hang off;
  a limb that does not touch is a ball floating next to a creature.
- **mask** — a face, and the one that needed the renderer thought about. Nothing
  here is shaded and nothing is hidden, so a socket cut into a cloud of points is
  *invisible*: it moves the points and changes nothing about how the picture
  reads. What reads is absence and density — so the eyes and the mouth are cut
  through both sides of the head, which is what a mask is anyway, and the lids,
  lips, brows and the ridge of the nose are drawn as lines of points. It is a
  procedural face and it looks like one; the faces in the reference videos are
  scanned models, and this is not that.

The **Fourier curve** is what replaces a list of named knots with a continuum of
them: three or four harmonics an axis, amplitudes and phases dealt fresh, falling
off as the square root of the harmonic rather than as the harmonic itself —
divided by `k` the higher terms are so faint that every curve comes out a
slightly wobbly ring, and it is the higher terms that make a knot a knot. A named
(p,q) torus knot is one point inside that.

The deformation being a **function of a point** rather than a step afterwards is
what lets it apply to everything: it sits inside the parametric function, so the
area sampler measures the surface that is actually drawn, and a twist that
stretches one side is accounted for.

**Everything fills the frame it is given.** A shape used to be measured by its
radius and fitted to the width, which on a frame half as wide as it is tall left
two thirds of the picture empty whenever the shape was tall. What is measured now
is the widest and the tallest it ever gets *on screen*, over a whole turn, and
whichever runs out of room first sets the size. Clouds are centred on their own
bounding box first, so a creature with its limbs to one side turns on the spot
rather than orbiting the middle of the frame.

**Measured, not assumed.** Three hundred rolls, each turned to four angles and
reduced to two 32×32 grids — where the shape is, and how many points are in each
cell — and every one of the 44,850 pairs compared. By silhouette the closest two
differ in 1.2% of cells, the median pair in 23%. By density, which is the one
that sees inside a lattice or a face, the closest differ in 1.16% and nothing at
all falls under 1%. Silhouette alone is not enough on its own: every mask is an
ovoid, so two of them agree on their outline and differ entirely in the face.

The formula goes in the file name — `shaper-77-tube-scatter-1445-123-t-1-ice.mp4`
— so a shape that came out well can be found again.

**Ten named shapes, from formulae rather than models.** Hex prism, pyramid, cube,
Möbius strip, torus, horn torus, sphere, trefoil knot, helix and cone. The solids
spend two fifths of their points on their edges, because a polyhedron scattered
evenly is a fog in the shape of a box and the edges are where the shape is.
Points are spread by area rather than by parameter — a triangle sampled the naive
way piles half its points along one edge, and a sphere sampled by its polar angle
grows a bright spot at each pole.

**Colour comes from the shape, never from depth.** Each point carries where it
sits on the shape's own turning parameter — the angle round the axis, or the
distance along the strip — and that indexes a palette that comes back to where it
started. A ramp with two different ends would paint a seam down one side of the
object, and a seam is a mark that says which way it is turning. Five palettes;
the seed picks one unless you do.

**The loop joins exactly.** Six seconds at sixty frames is three hundred and
sixty of them, and the turn is the frame number over that, so the frame after the
last is the first. Nothing else in the picture changes with time, which is what
makes that exactly true rather than nearly true.

**Twenty megabits, asked for by the mode.** Thousands of hard-edged dots on flat
black is the worst thing a codec is ever handed; at the bitrate the frame size
asks for they smear into grey porridge and the shape stops reading as points.
This is the one mode with a preview, too, and for the same kind of reason: what
is being chosen is an illusion, and nobody can judge one from a still.

Dense prism, the heaviest setting there is — twenty-eight thousand points, three
hundred and sixty frames — takes twenty-eight seconds from button to file.

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

**The length is neither searched for nor asked of the seed.** Eleven months go
out, one per fuse, so a round is eleven fuses and an ending — which would make
every video exactly the same length, the one property a duplicate detector reads
first. So the seed sets the *fuse* instead and the length follows: 4.4 to 5.6
seconds puts a round between fifty and sixty-four, with no search and no two
videos running to the same frame.

The soundtrack needed a guard the other modes do not. A month wedged against a
wall produces contact on every substep — a real contact, but not a real knock —
and unguarded the hit list ran to twenty-five thousand on a round where Month has
eight hundred, which was enough to hang the page before a single frame was drawn.
A knock now needs 0.08 seconds of quiet behind it, and the list comes back to
about 270.

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
| `src/sim/months.ts` | Hold the centre: twelve balls, one zone, and the banked seconds. |
| `src/render/drawMonths.ts` | One frame of it: arena, zone, balls, progress rings. |
| `src/sim/shaper.ts` | The point clouds, the palettes, and the rules of the illusion. |
| `src/render/drawShape.ts` | One turn of a cloud, orthographic and unshaded. |
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
