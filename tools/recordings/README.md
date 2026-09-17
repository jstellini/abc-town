# Recording all 26 letter intros

Record one clean take per letter, saying the whole line naturally (like you're
teaching a toddler) — this fully replaces the TTS-generated version of that
line with your real voice, so the phonetic sounds come out correct everywhere
instead of just for the letters TTS was mangling.

Then run:

```
python tools/apply_intro_recordings.py
```

It trims silence, normalizes loudness to match the rest of the game, and
writes straight to `assets/voice/{LETTER}-intro.mp3`. Nothing else in the
game changes — every other line (game prompts, "well done", reveals) still
uses the TTS voice as before.

## Recording all 26 in one take instead

You don't have to record 26 separate files. Record the whole alphabet in one
continuous take, pausing about 1.5-2 seconds of silence between each letter
so the gaps are easy to detect automatically, then run:

```
python tools/split_intro_recording.py path/to/your_take.m4a
```

It finds 26 silence-separated chunks in order and writes them as
`tools/recordings/A.wav` .. `Z.wav`. If it finds the wrong number of chunks
it won't write anything — it prints the chunks it found with timestamps so
you can lengthen a pause that got swallowed, or re-run with
`--silence-thresh`/`--min-silence-ms` tweaked, then try again. Once it
reports exactly 26, run `apply_intro_recordings.py` as usual.

## What to say, per letter

Read the sound part (`buh`, `kuh`, etc.) as an actual sound, not as if
reading the word aloud — say it the way you'd naturally teach a toddler the
letter, not spell out "b-u-h".

| File | Say |
|---|---|
| `A.mp3` | A. A says ah. ah, ah, Apple! |
| `B.mp3` | B. B says buh. buh, buh, Banana! |
| `C.mp3` | C. C says kuh. kuh, kuh, Cookie! |
| `D.mp3` | D. D says duh. duh, duh, Drum! |
| `E.mp3` | E. E says eh. eh, eh, Egg! |
| `F.mp3` | F. F says fff. fff, fff, Flower! |
| `G.mp3` | G. G says guh. guh, guh, Glasses! |
| `H.mp3` | H. H says huh. huh, huh, Hat! |
| `I.mp3` | I. I says ih. ih, ih, Ice Cream! |
| `J.mp3` | J. J says juh. juh, juh, Jam Jar! |
| `K.mp3` | K. K says kuh. kuh, kuh, Key! |
| `L.mp3` | L. L says lll. lll, lll, Lollipop! |
| `M.mp3` | M. M says mmm. mmm, mmm, Moon! |
| `N.mp3` | N. N says nnn. nnn, nnn, Nest! |
| `O.mp3` | O. O says oh. oh, oh, Octopus! |
| `P.mp3` | P. P says puh. puh, puh, Potato! |
| `Q.mp3` | Q. Q says kwuh. kwuh, kwuh, Queen! |
| `R.mp3` | R. R says rrr. rrr, rrr, Robot! |
| `S.mp3` | S. S says sss. sss, sss, Sun! |
| `T.mp3` | T. T says tuh. tuh, tuh, Toaster! |
| `U.mp3` | U. U says uh. uh, uh, Umbrella! |
| `V.mp3` | V. V says vvv. vvv, vvv, Volcano! |
| `W.mp3` | W. W says wuh. wuh, wuh, Water Bottle! |
| `X.mp3` | X. X says ks. ks, ks, Xylophone! |
| `Y.mp3` | Y. Y says yuh. yuh, yuh, Yo-yo! |
| `Z.mp3` | Z. Z says zzz. zzz, zzz, Zipper! |

## How to record

- Any phone voice memo app is fine. Quiet room, phone close to your mouth,
  consistent distance/volume across all 26 so they don't jump around in the
  finished game.
- Keep a warm, upbeat, unhurried pace — this is what a toddler hears first
  for every letter.
- If you fluff a take, just redo the whole line — easier than trying to
  splice a save.
- Export/share as `.mp3`, `.m4a`, or `.wav` and name the file exactly the
  letter (`B.mp3`, `B.m4a`, `B.wav` — any of those work), dropped in this
  folder.
- A little silence before/after each take is fine — the script trims it
  automatically. Don't worry about matching loudness by ear; that's
  normalized automatically too.

## Then

```
python tools/apply_intro_recordings.py
```

Only touches letters you've actually recorded — run it again any time you
add or re-record one. Reload the game (or reload the page) to hear the
result.
