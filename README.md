# ABC Town

A letter-recognition game for 3–4 year olds. Pick a letter, hear its sound, play three
minigames (two from the rotation, then Build-a-Letter), and unlock a character who moves into the town square.

## Running it

**On this PC** – double-click `serve.ps1` (or right-click → *Run with PowerShell*) and open
<http://localhost:8000/> in Chrome or Edge.

**On the iPad** (same Wi-Fi):

1. Run `serve.ps1` once **as Administrator** (right-click PowerShell → *Run as administrator*).
   It prints an address like `http://192.168.1.23:8000/`. Allow it through Windows Firewall if asked.
2. Open that address in Safari on the iPad.
3. Tap the Share button → **Add to Home Screen**. Launching from the icon runs it full-screen
   with no browser bars, and the audio unlock works with the first tap.

Hold the iPad sideways – the game asks for landscape.

**Live site:** <https://abctown.netlify.app>

## Working on it

The source lives at <https://github.com/jstellini/abc-town> (private). Netlify is linked to the repo:
every push to `main` runs `build.sh` (copies just the runtime files into `deploy/`) and publishes it,
so nothing depends on any one PC.

- **From anywhere** – start a Claude Code cloud session on the repo (claude.ai/code or the Claude app's
  Code tab), describe the change, then merge the resulting pull request. Netlify posts a deploy preview
  link on every PR so you can try it on the iPad before merging.
- **On this PC** – run `git pull` first (cloud sessions will have pushed changes), edit, then
  `git commit` and `git push`.
- `deploy.ps1` still works as a manual upload if Netlify's Git build is ever unavailable.

## How it plays

- **Home** – 26 letter tiles. Tapping one speaks the letter and opens its intro.
- **Intro** – big `A a` card (tap to hear again) and a mystery silhouette.
  Voice: *"A. A says ah. ah, ah, Apple!"*
- **Find the letter** – six drifting balloons, tap the target three times. After two
  misses the right balloon glows.
- **Pop the bubbles** – bubbles rise carrying letters; pop five with the target letter.
  Wrong bubbles just jiggle.
- **Build the letter** – the letter's chunky strokes are scattered around a grey ghost;
  drag each piece onto the ghost to assemble it. Always played last.
- **Find all the A's** – magnetic letters litter a table; drag the four target letters onto
  the fridge. Wrong magnets wobble and slide back; after two misses the right ones glow.
- **Letter train** – carriages wait in a siding; couple the three with the target letter
  behind the engine. Then the train whistles and chugs off.
- **Smash the ice** – six letters frozen in frosted ice blocks; three taps crack and shatter a
  block. Smash the three target letters to win. Distractor letters just melt away once freed.
- **Paint the letter** – a big outlined letter filled with dots, spots or stripes. Tap a paint pot,
  then tap (or swipe across) the letter to fill each piece. After five pieces a big tick appears;
  keep painting or tap it to finish.
- **Feed the monster** – a hungry monster shows the letter it wants in a bubble. Letter snacks
  drift across the sky; tap one (or drag it to the mouth) to feed it. Five right ones fill him up.
  A wrong one gets chewed, then spat out spinning – "Yuck! Not that one!"

Each letter plays the next two games from the rotation (Find → Pop → Magnets → Train → Ice →
Paint → Monster, advancing two steps per play), then finishes with Build-a-Letter.
- **Reveal** – confetti, fanfare, the character bounces in: *"A is for Apple!"*
- **Town** – three screens wide: the **farm**, the **square** and the **park**. Drag the scenery
  (or tap the ◀ ▶ arrows) to scroll; the hills and clouds slide slower for depth. Unlocked
  characters wander, stop to chat ("..."), play tag and laugh. Tap one to hear its letter and see its
  personality reaction (Yo-yo boomerangs, Potato naps, Zipper zips, Volcano jumps…). Drag them
  anywhere – drop one in the sky and it falls; carry one to the edge of the screen and the town
  scrolls along. A newly unlocked friend arrives in the square.
  The scenery reacts too. Everywhere: the **sun** sets into night (moon, stars, lit windows,
  fireflies, sleepy characters – tap the **moon** for sunrise); **houses** light up and open their
  door – knock knock, a letter pops out and says its name; **trees** drop leaves; **clouds** rain, followed by a rainbow; the empty **sky** sends a
  bird by day or a shooting star by night; the **hot-air balloon** drops confetti.
  On the farm: the **barn** doors swing open and the cow comes out and moos a letter; the **duck pond**'s
  duck flaps and quacks, a frog hops across and a fish jumps; the **veggie patch** has a rabbit that
  pops up, nibbles a carrot and dives back down; the **scarecrow** spins and startles two crows,
  and its sign comes round showing a new letter, which it reads out;
  the **windmill** whirls and blows a gust; the **sheep** baas and leaps over its fence (and back
  next time – at night the friends nearby get sleepy watching); the **hens** flap and cluck, an
  egg rolls out, wobbles, cracks and a chick pops out; the **tractor** toots, puffs smoke and
  chugs forward, then beeps as it reverses; the **pig** oinks and bounces in its mud (getting
  muddy, then shaking it off next tap).
  In the square: the **fountain** fires a geyser that rains back down and knocks over anyone close;
  **flowers** grow a beanstalk; the tower **flag** changes colour; the **bakery** flaps its awning
  and floats out cupcakes; the **post box** pops out a letter of the alphabet and says its name;
  the **lamp post** lights up (and flickers); the **cat** on the bench wakes, stretches, meows and
  leaps after a butterfly before hopping back for another nap; the **balloon cart** lets one balloon
  go – it floats up carrying a letter (which it says) and pops at the top.
  In the park: the **ferris wheel** spins fast with flashing lights; the **station** bell brings the
  train chugging right across the whole town (everyone waves 🚂) – its three carriages spell a
  word (C‑A‑T…) read out letter by letter, then the word itself, which the station board shows; the **swing** swings high;
  the **slide** calls the nearest friend over to climb up and whoosh down; the **ice-cream van**
  plays its jingle, opens the hatch and floats out ice creams; the **rocket** counts down
  3‑2‑1, blasts off and floats back down under a parachute; the **sandpit** builds a sandcastle
  tier by tier (tap again and it crumbles); the **see-saw** flips and flings the teddy sky-high.

Progress is saved in the browser (localStorage). Hold the ⚙️ button for a second to open
the grown-ups panel: pick the letter case, test the voice, unlock everyone (for trying the
town), or reset.

### Big, little and both

The **Letters** setting in the grown-ups panel chooses which form of each letter the
minigames show:

- **A (big)** – uppercase only. Where a new player starts.
- **a (little)** – the same games in lowercase.
- **Aa (both)** – the hard one: uppercase and lowercase letters share the screen, so the
  child has to recognise that `A` and `a` are the same letter. Either form counts as
  correct, and the target card shows both.

Build-a-Letter and Paint-the-Letter only ever show one letter, so there is nothing to
match against. Paint picks a form at random in mixed mode; Build instead plays **twice**,
the big letter then the little one, so the child assembles both shapes of the same letter
back to back — four minigames rather than three.

The setting is a grown-up's preference rather than progress, so resetting progress keeps it.

### Word Town

The 📖 button on the home screen opens **Word Town**, a hub of word games. It stays locked
(greyed, showing `n/26`) until every character is collected — tapping it before then says
what's still needed rather than doing nothing. The grown-ups panel's *Unlock everyone*
opens it for testing.

- **Who starts with…?** – a lineup of three or four friends and a target letter. Tap the one
  whose *name* starts with it. Four rounds, then confetti and back to the hub. A wrong tap
  wobbles; after two misses the right one glows.

Word games always ask about **spelling** ("which name starts with the letter X"), never about
sound. Three characters make a sound-framed question wrong: Xylophone starts with X but says
/z/, Ice Cream is a long i rather than the short `ih` the letter game teaches, and Queen is
`kwuh`. For the same reason nothing here plays a `{L}-intro` clip, which carries the phonic
sound, and the lineup keeps same-sounding letters apart (C/K) and never pairs X with Z — the
question is about spelling, but a child reasoning by ear shouldn't be punished for it.

## Tuning

- **Phonics sounds** – `js/data.js`, the `sound` column. The text-to-speech engine says
  these literally, so adjust by ear on the iPad (`"ah"` vs `"a"`, `"sss"` vs `"ss"`).
- **Voice** – every line the game speaks is a pre-recorded mp3 in `assets/voice/` (generated with
  Microsoft's free neural TTS, `en-GB-SoniaNeural`), looked up in `js/voice-manifest.js`. The old
  live browser text-to-speech in `js/audio.js` (`Voice.say`) only kicks in as a fallback if a clip
  is missing. To change the voice, edit a phonics sound, or regenerate everything after editing
  `js/data.js`, run:
  ```
  python tools/generate_voice.py --voice en-GB-SoniaNeural
  ```
  (`python -m edge_tts --list-voices` lists other options.) This rewrites `assets/voice/*.mp3` and
  `js/voice-manifest.js` from scratch. After adding a game or a new line, run it with `--missing`
  to generate only the clips that don't exist yet. The manifest only ever lists clips that are
  really on disk, and the script warns about any line that will fall back to browser TTS.
- **Difficulty** – `ROUNDS` (find) and `GOAL` (pop / magnet / train / ice / monster) in `js/games.js`; `HITS` (ice) is taps per block; balloon count is the
  `distractors(L, 5)` call; bubble spawn rate is the `spawnT > 1.0` check; distractor counts for
  magnet and train are their `distractors(L, n)` calls.
- **Letter case** – `js/case.js`. `Case.glyph()` / `Case.glyphs()` pick the form to draw and
  `Case.same()` is the "is this the target?" test every game uses, so `A` and `a` count as one
  letter in mixed mode. Games track their target as the uppercase letter throughout and keep
  the uppercase voice keys (the letter is spoken the same either way), so adding a case mode
  needs no new recordings.
- **Letter pieces** – `LETTER_STROKES` in `js/data.js`: each letter as SVG path strokes in a
  100×100 box, uppercase under `A`–`Z` and lowercase under `a`–`z`. Split a stroke in two for
  more pieces, or merge for fewer. Uppercase runs y=12 (cap top) to y=90 (baseline); lowercase
  has its own metrics so the letters line up with each other — y=10 ascender, y=42 x-height,
  y=80 baseline, y=94 descender, round letters r=19 about y=61. Keep to those and a new letter
  will sit with the rest. Lowercase ink is drawn thinner (`.build.lower` in the CSS), since the
  uppercase width across a 38-tall x-height swallows the letter.
- **Painted letter** – `paintGame` scales the glyph to fill the canvas, so lowercase and
  descenders fit without per-letter tweaking. It measures the glyph's *ink* with the canvas
  `measureText` metrics, not `getBBox()`: on an SVG `<text>` that returns the font's layout box
  (ascent to descent), which is as tall for `a` as for `A` and would leave lowercase at half
  size. The star goal counts only pattern pieces with a real footprint inside the letter — a
  piece clipped to a sliver stays paintable but never gates finishing.
- **Which games play** – `OTHER_GAMES` in `js/app.js` is the rotation order (Build-a-Letter always
  comes last, and twice in mixed mode – see `startGames`). The rotation position is stored with
  progress, so resetting progress restarts it. `Games.play` takes an optional `{ form }` to pin
  Build to a particular case; without it the game follows the case mode.
- **Train words** – `TRAIN_WORDS` in `js/data.js`. Adding one needs its voice clip: run
  `python tools/generate_voice.py --missing`.
- **Word games** – `js/words.js`. `GAMES` at the top is the hub registry: adding a game is one
  entry (`id`, `title`, `icon`, `make`) plus its function, and the menu builds itself. Each game
  returns `{ stop() }` like the letter minigames do. The unlock gate is `ALL_COLLECTED()` in
  `js/app.js`. New spoken lines go in `build_lines` in `tools/generate_voice.py`, then
  `python tools/generate_voice.py --missing` (use `--missing`, not `--only`, which splits keys
  on the first hyphen and would read `words-hub` as a letter).
- **Town behaviour** – `js/town.js`: `GROUND_TOP/BOT` (where characters can stand),
  `convoDist()` (how close they must be to chat), `roamTarget()` (how far they wander), and the
  `react()` switch for tap animations. The town is `.town-stage { width: 300% }` in `css/style.css`;
  scenery is placed with `left: %` of that width (0–33% farm, 33–67% square, 67–100% park), and the
  `.layer.far` / `.layer.mid` parallax layers move at 0.3× / 0.5× (`setScroll()`). Anything standing on
  the ground gets the `grounded` class so it sorts in depth with the characters. Scenery taps are
  registered with `on(el, fn)` and fire on release, so a drag that starts on a house still scrolls.
  The letter badge is measured per character in `place()` (`--cap`) so it sits just above the art.
- **Tap reactions** – each character has two layers: a whole-body move (`react` in `js/data.js`:
  jump, spin, dash…) and a personality animation on its own parts (drumsticks drum, toast pops,
  rain falls on the umbrella…). The parts are tagged in `tools/build_characters.py` (`arm-l`,
  `rays`, `bread`… each with a pivot) and the animations live at the bottom of `css/style.css`
  under *personality part animations*; `ACT_SECS` in `js/town.js` sets how long each runs.
  Hidden `fx` layers (hearts, sparks, rain) only appear while a character is reacting.
  Click any character in `tools/character-sheet.html` to preview its reaction.
- **Characters** – `assets/characters/*.svg` are generated by `tools/build_characters.py`, which
  shares one face / glove / leg kit across all 26 and draws a bespoke body for each. Edit a
  character's function there and re-run:
  ```
  python tools/build_characters.py
  ```
  Open `tools/character-sheet.html` (via `serve.ps1`) to review the whole roster at once, or
  `tools/character-lab.html` to roll random new characters in the same style. Renaming a
  character in `js/data.js` also needs its voice lines redone:
  `python tools/generate_voice.py --only B,I`. The original painted PNGs (cut from
  `Characters.png`) are still in `assets/characters/` if you want to swap back.

## Files

```
index.html          screens
css/style.css       all styling + animations
js/data.js          the 26 characters (names, sounds, reactions) + letter stroke pieces
js/case.js          uppercase / lowercase / mixed letter mode
js/voice-manifest.js  key → mp3 lookup for the recorded voice lines (auto-generated)
js/audio.js         Web Audio sound effects + voice playback (recorded clips, TTS fallback)
js/fx.js            sparkle / confetti particles
js/games.js         the eight minigames
js/town.js          town square simulation, drag & tap
js/words.js         Word Town: the word-game hub and its games
js/app.js           screen flow, progress, grown-ups panel
assets/voice/       recorded voice-over clips (mp3)
assets/characters/  character art (svg, generated) + the original png cut-outs
tools/build_characters.py  regenerates assets/characters/*.svg
tools/character-sheet.html review page for all 26 characters
tools/character-lab.html   random character generator in the same style
tools/generate_voice.py  regenerates assets/voice/ + js/voice-manifest.js
serve.ps1           tiny local web server (no Node/Python needed to *play* the game)
```
