#!/usr/bin/env python3
"""Copy uploaded instrument audio into audio/instruments/{id}.{ext} for the game."""

import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DST = ROOT / "audio" / "instruments"

SRC_DIRS = [
    ROOT / "Assets" / "Instrument audio",
    ROOT / "Assets" / "Instrument Audio",
    ROOT / "Assets" / "Instruments audio",
    ROOT / "Assets" / "Instruments Audio",
]

AUDIO_EXTS = [".mp3", ".wav", ".ogg", ".m4a"]

DISPLAY_TO_ID = {
    "Trash Can Lid": "trash-lid",
    "Tambourine": "tambourine",
    "Ukulele": "ukulele",
    "Electric Guitar": "electric-guitar",
    "Acoustic Guitar": "acoustic-guitar",
    "Bass Guitar": "bass-guitar",
    "Banjo": "banjo",
    "Piano": "piano",
    "Keyboard": "keyboard",
    "Organ": "organ",
    "Trumpet": "trumpet",
    "Trombone": "trombone",
    "Saxophone": "saxophone",
    "Violin": "violin",
    "Flute": "flute",
    "Harmonica": "harmonica",
    "Clarinet": "clarinet",
    "Accordion": "accordion",
    "Synth Lead": "synth-lead",
    "Triangle": "triangle",
    "Xylophone": "xylophone",
    "Cowbell": "cowbell",
    "Bongos": "bongo",
    "Drum Kit": "drum-kit",
}


def find_audio(display_name: str, inst_id: str) -> Path | None:
    candidates = []
    for ext in AUDIO_EXTS:
        candidates.append(f"{display_name}{ext}")
        candidates.append(f"{inst_id}{ext}")
    for src_dir in SRC_DIRS:
        if not src_dir.is_dir():
            continue
        for name in candidates:
            path = src_dir / name
            if path.is_file():
                return path
    return None


def main() -> None:
    DST.mkdir(parents=True, exist_ok=True)
    synced = []
    missing = []
    for display_name, inst_id in DISPLAY_TO_ID.items():
        src = find_audio(display_name, inst_id)
        if not src:
            missing.append(display_name)
            continue
        dst = DST / f"{inst_id}{src.suffix.lower()}"
        shutil.copy2(src, dst)
        synced.append(dst.name)

    print(f"Synced {len(synced)} instrument audio file(s): {', '.join(synced) if synced else '(none)'}")
    if missing:
        print(f"No audio upload ({len(missing)}): {', '.join(missing)}")


if __name__ == "__main__":
    main()
