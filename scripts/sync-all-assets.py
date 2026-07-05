#!/usr/bin/env python3
"""Sync all uploaded Assets/ into game-ready assets/ paths."""

import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent


def run(name: str) -> None:
    script = ROOT / name
    print(f"\n==> {name}")
    subprocess.run([sys.executable, str(script)], check=True)


if __name__ == "__main__":
    run("sync-instrument-assets.py")
    run("sync-instrument-audio.py")
    run("sync-brand-assets.py")
    run("sync-song-assets.py")
    print("\nDone.")
