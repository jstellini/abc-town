"""Turn hand-recorded full intro lines into the game's {LETTER}-intro.mp3
clips, replacing the TTS version for that line with a real human voice.

Put recordings in tools/recordings/ (see tools/recordings/README.md for the
exact script per letter), then run:

    python tools/apply_intro_recordings.py            # all letters found
    python tools/apply_intro_recordings.py --only B,G # just these letters

Trims leading/trailing silence, normalizes loudness to match the rest of the
game's clips, and writes assets/voice/{LETTER}-intro.mp3. Leaves
js/voice-manifest.js untouched (same filename, so no key changes) and doesn't
touch any other line for that letter.
"""
import argparse
import sys
from pathlib import Path

import static_ffmpeg
import pydub.utils
from pydub import AudioSegment, silence

from generate_voice import load_characters, VOICE_DIR

_ffmpeg, _ffprobe = static_ffmpeg.run.get_or_fetch_platform_executables_else_raise()
AudioSegment.converter = _ffmpeg
pydub.utils.get_prober_name = lambda: _ffprobe

REC_DIR = Path(__file__).resolve().parent / "recordings"
RECORDING_EXTS = [".mp3", ".m4a", ".wav", ".aac", ".ogg"]
TARGET_DBFS = -16.0  # roughly matches the TTS clips' loudness


def find_recording(letter):
    for ext in RECORDING_EXTS:
        p = REC_DIR / f"{letter}{ext}"
        if p.exists():
            return p
    return None


def clean_recording(path):
    audio = AudioSegment.from_file(path, format=path.suffix.lstrip(".").lower())
    front = silence.detect_leading_silence(audio, silence_threshold=-40)
    back = silence.detect_leading_silence(audio.reverse(), silence_threshold=-40)
    audio = audio[front: len(audio) - back]
    if len(audio) == 0:
        raise ValueError(f"{path.name} is silent after trimming — check the recording")
    audio = audio.apply_gain(TARGET_DBFS - audio.dBFS)
    return audio


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--only", help="comma-separated letters to apply, e.g. B,G (default: all with a recording present)")
    args = p.parse_args()

    chars = {c["letter"] for c in load_characters()}
    letters = [l.strip().upper() for l in args.only.split(",")] if args.only else sorted(chars)

    todo = [(L, find_recording(L)) for L in letters]
    todo = [(L, rec) for L, rec in todo if rec]
    if not todo:
        print("No recordings found in tools/recordings/ for the requested letters.", file=sys.stderr)
        print("See tools/recordings/README.md.", file=sys.stderr)
        return

    print(f"Applying {len(todo)} recording(s): {', '.join(L for L, _ in todo)}")
    for L, rec in todo:
        audio = clean_recording(rec)
        out_path = VOICE_DIR / f"{L}-intro.mp3"
        audio.export(out_path, format="mp3")
        print(f"  {out_path.name}  <-  {rec.name}  ({len(audio) / 1000:.1f}s)")

    print("\nDone. Reload the game to hear the new intro clips.")


if __name__ == "__main__":
    main()
