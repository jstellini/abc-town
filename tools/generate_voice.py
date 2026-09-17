"""Generate pre-recorded voice-over clips for ABC Town using Microsoft Edge's
free neural text-to-speech (the `edge-tts` package).

Reads the character list straight out of js/data.js (so it never drifts out
of sync), synthesizes every line the game ever speaks, writes the mp3s into
assets/voice/, and regenerates js/voice-manifest.js so audio.js can find them.

Usage:
    python tools/generate_voice.py
    python tools/generate_voice.py --voice en-GB-LibbyNeural --rate -5%

Run `python -m edge_tts --list-voices` to see other available voices.
"""
import argparse
import asyncio
import re
import sys
from pathlib import Path

import edge_tts

ROOT = Path(__file__).resolve().parent.parent
DATA_JS = ROOT / "js" / "data.js"
VOICE_DIR = ROOT / "assets" / "voice"
MANIFEST_JS = ROOT / "js" / "voice-manifest.js"

WELCOME_TEXT = "Welcome to A B C Town! Pick a letter!"
ALPHABET = [chr(c) for c in range(ord("A"), ord("Z") + 1)]

ROW_RE = re.compile(
    r"letter:\s*'([^']+)'.*?name:\s*'([^']+)'.*?sound:\s*'([^']+)'"
)


def load_characters():
    text = DATA_JS.read_text(encoding="utf-8")
    block = text.split("const CHARACTERS = [", 1)[1].split("\n];", 1)[0]
    chars = []
    for line in block.splitlines():
        m = ROW_RE.search(line)
        if m:
            letter, name, sound = m.groups()
            chars.append({"letter": letter, "name": name, "sound": sound})
    if len(chars) != 26:
        print(f"warning: parsed {len(chars)} characters, expected 26", file=sys.stderr)
    return chars


def load_train_words():
    """The three-letter words the town train spells (TRAIN_WORDS in js/data.js)."""
    text = DATA_JS.read_text(encoding="utf-8")
    block = text.split("const TRAIN_WORDS = [", 1)[1].split("];", 1)[0]
    return re.findall(r"'([a-z]+)'", block)


def load_picture_words():
    """The words Finish-the-Word shows a picture of (PICTURE_WORDS in js/data.js)."""
    text = DATA_JS.read_text(encoding="utf-8")
    block = text.split("const PICTURE_WORDS = [", 1)[1].split("\n];", 1)[0]
    words = re.findall(r"word:\s*'([a-z]+)'", block)
    # The game hides the letter being learned, so a letter with no word here has
    # nothing to play.
    empty = [L for L in ALPHABET if not any(L in w.upper() for w in words)]
    if empty:
        print(f"warning: no picture word contains {', '.join(empty)} — "
              "Finish-the-Word will skip those letters", file=sys.stderr)
    return words


def load_words():
    """Every word the game says aloud, from both lists, in order and deduped."""
    return list(dict.fromkeys(load_train_words() + load_picture_words()))


def build_lines(chars):
    """Returns a list of (key, text) — must match every Voice.say() call site
    in js/app.js, js/games.js and js/town.js."""
    lines = [("welcome", WELCOME_TEXT), ("monster-yuck", "Yuck! Not that one!")]
    lines += [(f"word-{w}", f"{w.capitalize()}!") for w in load_words()]
    for c in chars:
        L, name, sound = c["letter"], c["name"], c["sound"]
        lines += [
            (f"{L}-intro", f"{L}. {L} says {sound}. {sound}, {sound}, {name}!"),
            (f"{L}-find", f"Find the letter {L}!"),
            (f"{L}-pop", f"Pop the bubbles with the letter {L}!"),
            (f"{L}-magnet", f"Find all the {L}'s and stick them on the fridge!"),
            (f"{L}-build", f"Let's build the letter {L}! Put the pieces together!"),
            (f"{L}-train", f"All aboard the {L} train! Find the carriages with the letter {L}!"),
            (f"{L}-ice", f"The letters are frozen! Tap the ice to smash it and find the letter {L}!"),
            (f"{L}-paint", f"Let's paint the letter {L}! Tap a colour, then tap the letter!"),
            (f"{L}-monster", f"The monster is hungry! Feed him the letter {L}!"),
            (f"{L}-word", f"Let's finish the words! Find the missing letter {L}!"),
            (f"{L}-tick", f"{L}!"),
            (f"{L}-find-done", f"{L}! Well done!"),
            (f"{L}-pop-done", f"{L}! Hooray!"),
            (f"{L}-magnet-done", f"{L}! You found them all!"),
            (f"{L}-build-done", f"{L}! You built the letter {L}!"),
            (f"{L}-train-done", f"{L}! Off we go! Choo choo!"),
            (f"{L}-ice-done", f"{L}! You smashed them all!"),
            (f"{L}-paint-done", f"{L}! Beautiful! Tap the big tick when you're finished!"),
            (f"{L}-monster-done", f"{L}! Yum yum! The monster is full!"),
            (f"{L}-word-done", f"{L}! You finished all the words!"),
            (f"{L}-reveal", f"{L} is for {name}!"),
            (f"{L}-reveal-tap", f"{name}!"),
        ]
    return lines


def has_clip(key):
    """True when a non-empty mp3 exists for `key` (a failed download can leave
    a 0-byte file behind)."""
    out = VOICE_DIR / f"{key}.mp3"
    return out.exists() and out.stat().st_size > 0


async def synth_one(sem, key, text, voice, rate, pitch, attempts=5):
    async with sem:
        out = VOICE_DIR / f"{key}.mp3"
        for attempt in range(1, attempts + 1):
            try:
                communicate = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch)
                await communicate.save(str(out))
                if out.stat().st_size > 0:
                    print(f"  {key}.mp3  <-  {text!r}")
                    return True
                raise edge_tts.exceptions.NoAudioReceived("empty file")
            except Exception as e:  # the free endpoint throttles bursts; back off and retry
                out.unlink(missing_ok=True)
                if attempt == attempts:
                    print(f"  FAILED {key}.mp3 after {attempts} attempts: {e}", file=sys.stderr)
                    return False
                await asyncio.sleep(2 * attempt)


async def main_async(args):
    chars = load_characters()
    lines = build_lines(chars)
    VOICE_DIR.mkdir(parents=True, exist_ok=True)

    todo = lines
    if args.only:
        letters = {s.strip().upper() for s in args.only.split(",")}
        todo = [(k, t) for k, t in lines if k.split("-", 1)[0] in letters]
    if args.keys:
        suffixes = {s.strip() for s in args.keys.split(",")}
        todo = [(k, t) for k, t in todo if k.split("-", 1)[-1] in suffixes]
    if args.missing:
        todo = [(k, t) for k, t in todo if not has_clip(k)]

    sem = asyncio.Semaphore(3)  # be polite to the (free) TTS endpoint
    print(f"Generating {len(todo)} clips with voice={args.voice} rate={args.rate} pitch={args.pitch} ...")
    results = await asyncio.gather(*(
        synth_one(sem, key, text, args.voice, args.rate, args.pitch) for key, text in todo
    ))
    failed = [k for (k, _), ok in zip(todo, results) if not ok]

    # Only list clips that really exist: audio.js skips text-to-speech
    # whenever the manifest has a key, so a phantom entry means silence.
    present = [key for key, _ in lines if has_clip(key)]
    absent = [key for key, _ in lines if key not in present]
    manifest_lines = [f'  "{key}": "assets/voice/{key}.mp3",' for key in present]
    manifest = (
        "// Auto-generated by tools/generate_voice.py — do not hand-edit.\n"
        "// Maps a Voice.say() key to its pre-recorded audio clip.\n"
        "window.VOICE_MANIFEST = {\n" + "\n".join(manifest_lines) + "\n};\n"
    )
    MANIFEST_JS.write_text(manifest, encoding="utf-8")
    print(f"\nWrote {len(todo) - len(failed)} clips to {VOICE_DIR}"
          + (f" ({len(failed)} failed)" if failed else ""))
    print(f"Wrote manifest to {MANIFEST_JS} ({len(present)} clips)")
    if absent:
        print(f"warning: {len(absent)} lines have no clip and will fall back to browser TTS "
              f"(rerun with --missing): {', '.join(absent[:8])}{' ...' if len(absent) > 8 else ''}",
              file=sys.stderr)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--voice", default="en-GB-SoniaNeural")
    p.add_argument("--rate", default="-8%", help="edge-tts rate offset, e.g. -10%%")
    p.add_argument("--pitch", default="+0Hz", help="edge-tts pitch offset, e.g. +20Hz")
    p.add_argument("--only", help="comma-separated letters to regenerate, e.g. F,N,Q (manifest is still rebuilt in full)")
    p.add_argument("--keys", help="comma-separated line kinds to regenerate, e.g. reveal,reveal-tap")
    p.add_argument("--missing", action="store_true", help="only generate clips that don't exist yet")
    args = p.parse_args()
    asyncio.run(main_async(args))


if __name__ == "__main__":
    main()
