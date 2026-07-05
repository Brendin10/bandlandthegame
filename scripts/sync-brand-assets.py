#!/usr/bin/env python3
"""Copy uploaded Bandland Logo into assets/brand/bandland-logo.png."""

from pathlib import Path

try:
    from PIL import Image
except ImportError:
    Image = None

import shutil

ROOT = Path(__file__).resolve().parents[1]
SRC_CANDIDATES = [
    ROOT / "Assets" / "Logo" / "Bandland Logo.png",
    ROOT / "assets" / "Bandland Logo.png",
]
DST = ROOT / "assets" / "brand" / "bandland-logo.png"
MAX_EDGE = 960


def find_logo() -> Path | None:
    for path in SRC_CANDIDATES:
        if path.is_file():
            return path
    return None


def main() -> None:
    src = find_logo()
    if not src:
        raise SystemExit("Missing source logo (expected Assets/Logo/Bandland Logo.png)")
    DST.parent.mkdir(parents=True, exist_ok=True)
    if Image is None:
        shutil.copy2(src, DST)
    else:
        img = Image.open(src).convert("RGBA")
        w, h = img.size
        if max(w, h) > MAX_EDGE:
            scale = MAX_EDGE / max(w, h)
            img = img.resize((int(w * scale), int(h * scale)), Image.Resampling.LANCZOS)
        img.save(DST, "PNG", optimize=True)
    print(f"Copied {src.relative_to(ROOT)} -> {DST.relative_to(ROOT)} ({DST.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
