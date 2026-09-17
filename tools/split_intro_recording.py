"""Split one continuous "all 26 letters" take into per-letter recordings.

Record the whole alphabet in one go (see tools/recordings/README.md for the
script per letter), pausing about 1.5-2 seconds of silence between each
letter so the gaps are easy to detect. Then run:

    python tools/split_intro_recording.py my_take.m4a

It finds 26 non-silent chunks in order and writes them as
tools/recordings/A.wav .. Z.wav, ready for apply_intro_recordings.py.

If it finds a different number of chunks than expected, nothing is written --
it prints what it found (with timestamps) so you can adjust --silence-thresh
or --min-silence-ms and try again, or re-record a pause that got swallowed.
"""
import argparse
import string
import sys
from pathlib import Path

import static_ffmpeg
import pydub.utils
from pydub import AudioSegment, silence

_ffmpeg, _ffprobe = static_ffmpeg.run.get_or_fetch_platform_executables_else_raise()
AudioSegment.converter = _ffmpeg
pydub.utils.get_prober_name = lambda: _ffprobe

REC_DIR = Path(__file__).resolve().parent / "recordings"
LETTERS = list(string.ascii_uppercase)


def fmt_ts(ms):
    s = ms / 1000
    return f"{int(s // 60)}:{s % 60:05.2f}"


def main():
    p = argparse.ArgumentParser()
    p.add_argument("input", help="path to the single-take recording (any format ffmpeg reads)")
    p.add_argument("--silence-thresh", type=int, default=-40, help="dBFS below which audio counts as silence (default -40)")
    p.add_argument("--min-silence-ms", type=int, default=900, help="minimum gap length to treat as a split point (default 900)")
    p.add_argument("--pad-ms", type=int, default=150, help="padding kept around each chunk (default 150)")
    p.add_argument("--only", help="comma-separated letters to write, matched in order to the chunks found (default: A..Z)")
    args = p.parse_args()

    in_path = Path(args.input)
    if not in_path.exists():
        print(f"File not found: {in_path}", file=sys.stderr)
        sys.exit(1)

    audio = AudioSegment.from_file(in_path, format=in_path.suffix.lstrip(".").lower())
    ranges = silence.detect_nonsilent(
        audio,
        min_silence_len=args.min_silence_ms,
        silence_thresh=args.silence_thresh,
    )

    letters = [l.strip().upper() for l in args.only.split(",")] if args.only else LETTERS

    print(f"Found {len(ranges)} chunk(s) in {in_path.name} (expected {len(letters)}):")
    for i, (start, end) in enumerate(ranges):
        label = letters[i] if i < len(letters) else "?"
        print(f"  [{label}] {fmt_ts(start)} - {fmt_ts(end)}  ({(end - start) / 1000:.1f}s)")

    if len(ranges) != len(letters):
        print(
            f"\nExpected {len(letters)} chunks but found {len(ranges)} -- nothing written.\n"
            "Adjust --silence-thresh (try a smaller magnitude like -35 if a quiet gap wasn't caught,\n"
            "or a larger magnitude like -50 if background noise split a letter in two) or\n"
            "--min-silence-ms, then run again.",
            file=sys.stderr,
        )
        sys.exit(1)

    REC_DIR.mkdir(exist_ok=True)
    for (start, end), letter in zip(ranges, letters):
        chunk = audio[max(0, start - args.pad_ms): end + args.pad_ms]
        out_path = REC_DIR / f"{letter}.wav"
        chunk.export(out_path, format="wav")
        print(f"  wrote {out_path.name}")

    print(f"\nDone. Now run: python tools/apply_intro_recordings.py")


if __name__ == "__main__":
    main()
