#!/usr/bin/env python3
"""Copy uploaded instrument PNGs into assets/instruments/{id}.png for the game."""

from pathlib import Path

try:
    from PIL import Image
except ImportError:
    Image = None

ROOT = Path(__file__).resolve().parents[1]
DST = ROOT / "assets" / "instruments"

SRC_DIRS = [
    ROOT / "Assets" / "Instruments",
    ROOT / "assets" / "instruments",
    ROOT / "assets",
]

UPLOAD_MAP = {
    "Trash Can Lid.png": "trash-lid.png",
    "Drum Kit.png": "drums.png",
    "Bass Guitar.png": "bass.png",
    "Electric Guitar.png": "electric-guitar.png",
    "Piano.png": "keys.png",
}

MAX_EDGE = 1024


def find_source(name: str) -> Path | None:
    for src_dir in SRC_DIRS:
        candidate = src_dir / name
        if candidate.is_file():
            return candidate
    return None


def has_transparency(img) -> bool:
    if img.mode != "RGBA":
        return False
    alpha = img.getchannel("A")
    lo, hi = alpha.getextrema()
    return lo < 250


def optimize_png(src: Path, dst: Path) -> None:
    if Image is None:
        dst.write_bytes(src.read_bytes())
        return
    img = Image.open(src)
    if img.mode not in ("RGB", "RGBA"):
        img = img.convert("RGBA")
    if not has_transparency(img):
        print(f"  warn: {src.name} may not have transparent background (check alpha channel)")
    w, h = img.size
    if max(w, h) > MAX_EDGE:
        scale = MAX_EDGE / max(w, h)
        img = img.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    img.save(dst, "PNG", optimize=True)


def main() -> None:
    DST.mkdir(parents=True, exist_ok=True)
    synced = []
    missing = []
    for src_name, dst_name in UPLOAD_MAP.items():
        src = find_source(src_name)
        if not src:
            missing.append(src_name)
            continue
        dst = DST / dst_name
        optimize_png(src, dst)
        synced.append(dst_name)
    print(f"Synced {len(synced)} instrument(s): {', '.join(synced)}")
    if missing:
        print(f"Missing uploads ({len(missing)}): {', '.join(missing)}")


if __name__ == "__main__":
    main()
