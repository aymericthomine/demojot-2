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

**Jelly** — a flask with a chute running into it, and a stream of the smallest
object coming down for ever. Two of anything that touch become one of the next
thing up, eight rungs of it, and the video ends when the top is reached. The odd
one out: no cast of twelve, a theme instead, and a soundtrack of its own.

Who the twelve *are* is a separate choice — months, star signs, countries,
sports or fruit — and the same seed plays the same round whichever of them is
wearing it.

**A seed is the video, and it rolls itself after every finished one.** It used
to be rolled when the page opened and then never again unless somebody pressed
Roll, so pressing the button twice made the same video twice. It is still a
plain field — type a number to play that exact round again, and the seed of a
video just made is in the file's own name — but two presses now give two
different rounds. Measured on a pair of Jelly seeds: identical for the first
second, because the chute is a conveyor and nothing random has happened yet, and
from the first merge onwards a different video, ending 60 to 74 seconds later on
a different arrangement.

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

> **A ball can only hold ninety.** Full hands break the wire instead of taking
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
narrower, and each step up also pays for ball speed, which is why the rung is
high. At **ninety**, with the ball at 0.7, the earliest finish over forty seeds
is fifty-eight seconds — which *is* the whistle — so the fight lasts the whole
video every time; the winner comes home on 57% of about a hundred and twenty-five
wires with the runner-up twenty-eight behind, and the ring still thins by a third
over the round. The price is that it is scarcely ever emptied to one side: a
round is decided on the whistle, and being close is what that buys.

**Ball speed is bought, not set.** A ball takes every wire it touches, so the
fight's speed *is* the ball's speed, and a quick ball left on its own settles the
ring early: at 0.35 on ten wires a side it was over by the thirtieth second and
the video spent its rest on a winner that had already won. Two things buy the
time back, and both are used — dealing more wire, since a side with more of it
takes longer to strip, and holding back the breaking, which is what the limit
does. Between them the ball has gone from 0.24 to **0.7**, most of the way to the
old fight's 0.85, with the round still running to the whistle every time.

Dealing wire has a ceiling the picture sets rather than the pace: 0.45 on
twenty-five a side holds the length too, and three hundred wires read as twelve
solid triangles instead of fans of lines. A hundred and eighty is one pin every
seventeen pixels round the ring and still reads.

**A guard around each hub would have bought the same time more cheaply, and it
cannot be had.** Wires bundle together at their owner, so a ball among them
takes an armful at once, and refusing cuts within half a radius of the hub gave
a fine, slow fight — and 968 433 crossing pairs over the same six rounds. A wire
a ball may pass without taking is a wire it can end up on the far side of. The
guarantee and the guard are the same rule pointing opposite ways, and the
guarantee wins.

The wire count runs 180 at the opening and about 120 at the end; sides go twelve
to five by the fifth second, four by the fifteenth and two or three at the
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

## Jelly

The odd one out. Every other mode here is twelve of something in a ring; this is
a flask — a chute running into a round bowl — with a stream of the smallest
object coming down it for ever, and **two of anything that touch become one of
the next thing up**. The bowl fills with small things that keep turning into
fewer large ones, and the video ends when the top of the ladder is made.

Everything about the flask was measured off five reference clips rather than
chosen, which is why the numbers are odd: the bowl is 912 pixels across on the
inside of a 1080-wide frame and its middle sits 972 pixels down, the chute is
131 wide between its walls, the glass is an 11-pixel hairline running from
lavender at the top to pink at the bottom, and the opening caption is held for
1.4 seconds and then cut.

**The stream is a conveyor, not a drop.** Counted frame by frame in the
reference's chute: the objects are 112 pixels apart at the top and 112 apart at
the bottom of the bowl, and the whole column moves 5.5 pixels a frame — 330
pixels a second, flat. A falling object accelerates and its spacing opens out;
this one does not. So an object has no weight until it lands on something, and
then it gets gravity, drag and a pile to settle into. The chute also **starts
full**: every reference opens on a column already running into the bowl, about
four seconds of stream, and starting it empty gives the video a slow wrong
opening that none of them have.

**It has to start where a dropped object is made, not one space below it**, and
getting that wrong put a hole in the stream visible for the first few seconds of
every video. The pre-filled column began one space under the point a real drop
appears, and the first real drop is not due for a whole interval, by which time
the column has moved on a space of its own — so the two ended up two spaces
apart. One missing object, made at the top of the chute in the very first frame
and carried all the way down through the bowl in plain view. Measured before and
after on the seed it was reported in: a worst gap of exactly twice the spacing,
and none at all now. Across twelve seeds no gap in the falling column has
nothing sitting in it, and the gaps that do open are objects that met the pile
and stopped, which is the mechanic rather than a fault.

**The ladder is eight rungs and that is arithmetic, not taste.** Each rung is
two of the one below, so the last needs 128 of the smallest — and the stream
delivers about 200 over a video. Nine rungs would need 512 and could never be
reached: measured, a ten-rung ladder tops out at the seventh every time.

**The rung sizes were measured twice, and the first reading was wrong.** A
bounding box off a still made the smallest object 51 pixels across and the last
about 370, which fixed the climb at a third again each rung. A bounding box is
the wrong ruler for a strawberry — the leaves are in it and the fruit is not — so
the second pass took each object's lit *area* and turned it back into a diameter,
a ruler that does not care what shape a thing is. Measured that way across all
five references, an object in the chute is 54, 60, 68, 70 and 71 pixels across
and the thing that ends the video is 576, 621, 629, 648 and 619: **65 at the
bottom of the ladder and 620 at the top**, which is nine and a fifth over seven
steps, or a climb of **1.37**. The old numbers cost more than they look: the bowl
held about two thirds of the material the references' bowl holds at the same
second, and the object the video ends on came out at 356 pixels against their
620 — the climax was a third of the size of the thing it was copying.

**A merge has to wait half a second before it can merge again.** Without any
wait, a merge is not an event but an avalanche: eight of a kind stacked under
the chute collapse to one of the next kind up inside a single substep, and at
the twentieth second the bowl held three objects where the references hold a
dozen. The wait, plus a sideways kick on every new object, is what spreads the
pile along the floor instead of stacking it in a column — and it is the one dial
that buys a fuller bowl without slowing the climb, because it moves *when*
merges happen rather than how many. Counted against the references, which hold
six objects at the eighth second, twelve at the twentieth, thirteen at the
thirty-fifth and twelve at the fiftieth: a quarter-second wait leaves the bowl a
quarter emptier at every mark, and half a second comes to six, nine, thirteen
and thirteen.

**The flask is the union of two shapes, and treating it as two regions with a
boundary between them was the worst bug this mode has had.** The tube's walls
hold a ball while it is in the tube and the tube has no floor; the bowl's rim
holds a ball everywhere *except across its mouth*, where the tube opens into it.
Without that last clause the rim was applied at the mouth as though it were
solid — at dead centre a ball's middle is 0.99 from the bowl's middle and the
bowl's usable radius is 0.944, so every object counted as embedded the instant
it left the tube. Each one was marked as landed there and fell the rest of the
way under gravity instead of at the conveyor's constant speed.

Everything that looked wrong about the descent came from that one line. The
column of falling objects stopped dead at the mouth; below it, objects fell at
whatever speed gravity had given them and ran into each other on the way down.
Measured in the simulation, the falling column now runs unbroken from y = −2.3
to y = +0.47 with a gap of 0.245 between every pair, top to bottom — against a
column that used to end at −1.0, the mouth, every single time.

**The references barely bounce at all, and that is measured rather than judged.**
Tracking single objects through their bowl frame by frame and finding the moment
each one lands: one arrives at 502 pixels a second and rebounds 1.3 pixels;
another arrives at 217 and rebounds 8. That is a restitution of about **0.05**.

That is what theirs do, and it is what this did — and what it reads as, watching
it, is an object arriving and sticking to the wall. So the restitution here is
**0.35, asked for rather than measured**, and it is worth writing down which is
which. With gravity this low a little of it buys a long, lazy arc instead of a
hop: an object arriving at the stream's own speed comes back up about twenty-four
pixels and takes over eight tenths of a second to do it. Nothing moves any
quicker than it did; there is simply somewhere for a landing to go. Gravity stays
at 0.6 to match how slowly their pile settles, and there is no drag at all, so
what motion there is carries on a long time without anything ever moving
quickly. Nothing ever settles back up inside the tube: over twelve seeds the
highest a resting object reached was 0.42 of the bowl's radius above centre,
against a mouth at 0.99.

**Two earlier versions got this wrong the same way, and it is worth writing down
why.** Both were tuned to match a *pixel* measurement of the references' motion —
the frame-to-frame change down the sides of their bowl, 1.79. Restitution is the
easiest dial for raising that number, so the tuning kept raising it: 0.85, then
0.5. Neither is remotely what their objects do. The aggregate was being matched
by making the pile violent, and the violence is what kept being reported back. A
measurement of the thing itself beats a measurement of its shadow.

**The stream falls dead centre, and dead upright.** It was given a small lean off
centre for a while, on the theory that a centred stream would stack the pile into
a cone. It does not, and the lean was the first thing the eye caught: a column of
objects sitting to one side of the tube it was falling down.

Every object was also handed a random angle at birth — a quarter of a radian
either way — and that was worse, because it applies to the whole stream at once:
a tube of butterflies each leaning a different way. **Nothing in any reference is
ever spawned crooked.** In all seven chutes every object is upright and identical
to the one above it; an angle is something an object picks up from what it
touched, never something it is born with, which is why a banana ends up lying
across a pile and a pearl does not. Measured on the fixed version against a
reference at the same second: three objects in the chute, each 0.5 pixels off the
tube's middle, each 71 pixels wide, 113 and 111 pixels apart. The reference's own
three are 0.0, 0.5 and 2.5 off.

Once an object *is* turning it is allowed to keep turning, but not far. Rotation
that only ever decays has no ceiling, and over a minute in a jostling pile an
object accumulates whatever it is given — a wizard's hat ended up lying on its
side with its point down. Nothing in the references tumbles like that: their pile
leans, a banana across a heap, a donut tipped on its rim, and settles. So the
lean is stopped at a quarter of a right angle, and an object at the stop spends
its spin rather than storing it.

**The glass is a hairline with a tight halo and a mitred elbow.** Measured across
the chute's wall: the references read 239 at the core and are back to nothing six
pixels out — 210, 239, ten pixels of 237, then 97, 52, 17, 7, 2, 0. This was set
to a blur of two and a bit line widths and came out as a plateau rather than a
falloff: 229 at the core and still sitting at 22 to 40 twenty pixels away, which
is not a glow but a haze over the whole frame.

The chute meets the bowl at a sharp corner — the wall arrives vertical and the arc
leaves it eight degrees off horizontal — and every reference mitres it to a clean
point. Rounding the join was tried, and at this line weight it lays a bead of
extra paint on the outside of the corner that reads as a blob hanging off the
elbow. It is mitred, with the limit at six so the point is never clipped.

**Two of a kind merge at 1.2 times touching, not at touching.** A pile that keeps
rearranging itself leaves a pair near rather than against, and a round ended with
an odd one stranded at every rung — five blueberries, three lemons, three
oranges, one apple and no pineapple, two hundred merges already spent. The last
rung needs 128 of the smallest and the stream delivers 210, so there is no room
for that. It has to be a *multiple* rather than a fixed gap: a fixed slack tops
out in 19 seeds of 24 however wide it is set, because the stranding that blocks
the ladder is at the top, where one leftover is worth sixty-four of the smallest.
The reach was 1.3 while the objects were too small and had to come back down when
they were put right: a bigger object touches more of its neighbours, so the same
reach spends the ladder faster. A reach of 1.0 keeps the references' object count
but takes seventy seconds to climb; 1.2 climbs in sixty-three and still reaches
the top from every seed.

**A merge springs open, it does not shrink to fit.** Measured off one merge in a
reference frame by frame at sixty a second, as a fraction of the new object's
settled size: 0.42 at the frame it appears, then 0.70, 0.86, 0.95 — full at fifty
milliseconds — then 1.02, 1.05 and a peak of 1.06 at a hundred, back through 1.04
and 1.01 and settled by two hundred. The two objects it was made from vanish in
that same frame, with no shrink of their own. This was written the other way
round, starting a quarter too big and easing down to size, which is the one thing
the references certainly do not do.

**The bloom around an object is tight.** Reading outwards from the middle of an
object in the references' chute, in multiples of its own radius: their light is
gone by 1.25 and black from there on — 1.7 at 1.4 radii, 0.5 at 1.55, 0.4 at 1.7.
A blur of 0.55 radii trailed 6, 12, 9 and 13 over the same stretch, which is
nothing at all on a small object and a coloured fog the size of a fist around the
620-pixel one the video ends on. At 0.22 radii the two profiles agree to a couple
of levels out to 1.35 radii.

Videos run 60 to 71 seconds, median 63, and the last rung is reached in every
seed tried. The pile's own motion, as the mean frame-to-frame change over the
bowl between the thirtieth and forty-fourth seconds: the references read 5.37,
4.02 and 4.52, and this reads 4.50. Their quietest frames read 2.9 and its read
3.4 — their bowl is never still and neither is this one.

**Jelly wobbles, and it is the one thing in the references that is not a picture
being moved about.** It is plain once an object is watched at size: a raspberry
resting in their bowl goes tall and narrow, then wide and squat, then tall again,
about five times a second, and its area does not change while it does. That is a
gel ringing. Measured on a resting one, well into its decay, the width-to-height
ratio swings between 0.903 and 0.969 — a squash of under two per cent; fresh out
of a merge it is several times that. Here a merge starts the ring at nine per
cent and a landing gets a share of it in proportion to how hard it arrives, at
five a second, fading over half a second. Area is kept: as much wider as it is
flatter.

**The glass holds the picture, not the circle.** The references never need such a
thing — a pearl, a planet and a cut gem all fill the circle that carries them and
stop there. The pictures this mode was given do not: a hat has a brim, a
dragonfly has wings, an ant has legs, and across all of them the solid part
reaches a median of 1.144 times the radius the simulation is pushing around.
Resting against the bowl, the object the video ends on hung eighty pixels out
through the side of the flask and the wall's own line appeared to slice it in
half. Shrinking every picture to fit its circle was the first answer and it is
the wrong one — it takes a fifth off everything and leaves the bowl looking thin,
because a butterfly inside a circle covers far less of it than a pearl does. The
circle is held a picture's-width off the glass instead, and only the few pictures
that reach further than that are scaled back to it.

### The objects

Two hundred and eight pictures, eight to a theme, cut off ten sheets supplied
for this mode. They are sliced off by finding each cell's body, keeping the one blob nearest
the middle of the cell, and reading the alpha off the luminance so the neon halo
the artwork came with survives instead of getting a hard edge. Five things about
that were wrong for a long time, and all five were visible in finished videos.

**The glow is tapered, not gated.** A binary gate around the body leaves the halo
at whatever strength it had when the cell's edge arrived, so wherever a boundary
crossed one the sprite was sliced off square: the squid on the monsters strip had
a hard vertical edge at a third of full alpha, and it read in the video as a
straight line beside it. The alpha now falls to nothing within a fixed distance
of the body, so it is always nought before the crop reaches it.

**The paper is subtracted, not ramped from nearly nothing.** These sheets are
JPEGs and their black is not black — the dark's 99th percentile is 26 and its
brightest pixel 39. A ramp starting at 12 turned that into alpha as high as 0.47
across a whole cell, which is why four fifths of a finished sprite carried some
alpha and why a faint box followed each object about.

**The colour is unpremultiplied.** Art drawn as glow on black is premultiplied by
construction: a pixel at half strength carries half-strength colour. Kept as it
was and composited normally it is darkened twice, so a halo came out as a dark
smear rather than as light. Dividing the colour back out by the alpha makes a
sprite composite to exactly what the sheet shows.

**Only enclosed holes are filled.** The opaque part of an object used to be its
outline closed up and filled, which is black between a squid's tentacles and
through a donut's middle. It is now the lit pixels with their own enclosed holes
filled — a bus's windows are inside the bus, a squid's gaps open to the outside.
Where an object is genuinely mostly black, a tractor's tyres against a black
sheet, no matte can tell it from the paper; those give themselves away by falling
into three or more separate lit pieces, and for them the closed outline is taken
as solid, with anything under the paper's own level painted true black.

**The columns are worked out rather than assumed.** The objects are not on a grid
— the spacing wanders — so each row's runs are found and then forced to eight:
the widest run is split at the quietest column inside it, and the closest pair is
joined. That finds the squid and the imp's own boundary at 986, where measuring
the trough by hand had put it. A few pixels of a neighbour still land on the
wrong side of any straight cut, so only the largest piece of an object is kept.

**They are stored at twice the size they came at, sharpened in linear light.**
The sheets give about 130 pixels an object and the top of the ladder is drawn at
620, so the canvas was stretching every large object four or five times and the
climax — the one thing the video is about — was the softest thing on screen.
Doubling them with a Lanczos resample and an unsharp mask over the colour only,
leaving the alpha alone so the neon edge does not ring, halves that stretch and
puts the texture back.

Sharpening in linear rather than in sRGB was measured rather than assumed: at any
given sharpness it blows fewer pixels out to white, because an unsharp mask on
gamma-encoded values overshoots hardest exactly where the art is already bright.
Against the pass before it, the mean edge gradient over all two hundred pictures
goes from 18.6 to 24.2 — thirty per cent — with slightly less of the picture
clipped. A Richardson-Lucy deconvolution was tried in its place and is worse
here: the best of it reaches the same sharpness only by clipping a ninth of the
picture.

**They are files rather than data.** The flags in this project are carried as
base64 inside a module, because twelve small icons come to ninety kilobytes and
data cannot fail to arrive. All of them together come to megabytes that way,
which is
a page that will not load on a phone, so they are fetched as WebP — and only the
eight belonging to the theme being made, which is about two hundred kilobytes of
the two and a bit megabytes on disk. The paths
are **relative**, because a static export served from `/demojot-2/` has no way to
tell a hand-written `fetch` about its own prefix: `assetPrefix` rewrites what
Next emits, not what this asks for, and a relative path is right under the
sub-path and right at the root with nothing to configure.

**A picture is hung off its body, not its bounding box.** The pictures are not
square and their bodies are not centred in them — a pufferfish has a tail off one
side, Saturn's ring is wider than the planet is tall, a pineapple has a crown
above it. So each one carries where its solid body's middle sits and how far it
spans, both as fractions, and the scale comes from the body. Fitting the
bounding box to the collision circle instead drew every object a little small
and each one by a different amount.

**The bloom is cast by the picture's own alpha**, in the same pass that draws it,
so it takes the object's shape and lands behind it. A disc of colour laid
underneath was the first try and it showed: a pineapple is tall and narrow, and
the parts of the disc it did not cover read as a dull smear around its foot.

**Twenty-six ladders of eight.** Fruit, planets, gems, sweets and sea creatures
came first; then animals, vegetables, magic, insects and weather; then vehicles,
dessert, tools, ocean life and mythology; then dinosaurs, music, sports, space
and fantasy creatures; then flowers, tropical fruit, candy, hats, monsters and
instruments. Only the eight belonging to the theme being made are ever fetched.

Where two objects on a strip touch — the squid and the imp on the monsters one
are four pixels apart at the glow and nowhere apart at all in the projection —
the columns are given explicitly rather than found. Everything else is found.

The later sheets carry their names down the left in neon type, close enough to
the first object that closing an object's own gaps swallows the label with it.
Text is short and wide where every object on these sheets is tall, so that is
what takes them off before anything else is looked at. And the body is found at
four brightnesses rather than one, keeping the highest that has most of the
object: a chocolate cake is bands of dark sponge between lighter cream, and at
the brightness that suits a neon object only one of the cream lines survives.

**The drawn gels are still in the build.** Before the sheet arrived, each object
was a silhouette with five washes laid inside its own clip — body, depth,
subsurface, rim and two highlights — with the light kept level while the object
tumbled, and the whole thing built offscreen and blitted once for the law this
project has now been caught by three times. They are kept, paired one for one
with the pictures, so a theme whose files do not arrive comes out looking like
the older version of this mode rather than coming out broken.

### The sound

**The recording, supplied afterwards.** Everything below this paragraph describes
the soundtrack that was synthesised before it arrived, and that synthesis is
still in the build: it plays if the file does not. But the sound of a Jelly video
is now the recording itself, 61.6 seconds of it, which makes this mode borrowed
like the other four rather than the exception it used to be — the same trade as
the rest of the site, made deliberately.

A round runs 60 to 74 seconds and the recording is 61.6, so the tail has to come
from somewhere. It cannot simply loop: it opens on silence and ends mid-ring, so
a seam would land as a hole. A second copy starts nine tenths of a second before
the first ends, from eight seconds in — past the silent opening — and fades up
underneath it, which puts a crossfade where a gap would be. Checked on a
seventy-second round: 0.9999 correlation with the supplied track over its first
fifty-five seconds, and no quarter-second anywhere that is quieter than the
track's own quiet moments.

#### What it replaced

The one thing on this site that was not borrowed — not for want of trying. **No
note in any of the seven references can be cut out and reused.** Their ring is so
long that every onset lands on top of the ones before it: across all seven, not
one of six hundred onsets has even three hundredths of a second of true silence
in front of it, and every clean-looking cut carries two other pitches ringing
underneath. So it was measured instead, which comes to the same sound and comes
out clean.

**The pitches.** Classifying every onset in all seven gives D4, E4, G4, A4, C5,
D5, E5, G5 and A5 and nothing else — a pentatonic set over two octaves, one step
a rung. There is no bed under them and nothing at all above 3 kHz.

**The timbre is almost a pure sine.** Projecting each onset onto its own harmonic
comb, after subtracting what was already ringing underneath it, puts the second
harmonic at 0.04 to 0.17 of the fundamental depending on the pitch and the third
and everything above at nought. The version before this one added a *triangle* at
twice the pitch, which also lands partials at six and ten times it, where the
references have nothing.

**And it rings for two and a half seconds.** Tracking the fundamental's own
amplitude through fifty-six onsets that have a clear second and a half after
them: a straight 23.5 dB a second, a t60 of 2.55. The note this replaced fell 60
dB in 0.42 s — six times too fast — so where they have four or five notes ringing
together at any moment, this had one plink at a time. That, and not the pitches,
was what made it sound unlike theirs. There is a knock on the front of it too:
theirs loses about four decibels over the first fifth of a second before settling
into the long decay, and with that in the two agree to within half a decibel at
every mark.

**A note a merge, and the pitch is the rung**, so the soundtrack is the video's
own progress — the opening is low notes coming thick and fast, and by the end the
few notes left are the high ones. Landings are not sounded at all; three a second
of them would be a rattle. The ending is not an arpeggio laid over the top
either: theirs is the last cascade of merges heard as one, nine notes inside
eight tenths of a second, climbing, with about seventy milliseconds between them.

Measured on the finished track against the references: peak 0.48 against their
0.59 to 0.75, RMS 0.049 against their 0.060, and a decay of −2.7, −5.9, −9.2 and
−11.0 dB at a tenth, a fifth, two fifths and seven tenths of a second against
their −4.4, −9.0, −10.5 and −8.9.

Every other mode here plays a recording lifted from its reference, which is the
one thing a platform could recognise and mute. This mode owes nobody anything.

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
