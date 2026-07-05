#!/usr/bin/env python3
"""Generate a bundled example song with 4 stems + full mix for Street Jam."""

import json
import math
import wave
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SONG_DIR = ROOT / "Assets" / "Songs" / "street-jam"
SR = 44100
BPM = 118
DURATION_SEC = 60

NOTE_FREQ = {
    "C2": 65.41, "G1": 49.0, "A1": 55.0, "F1": 43.65, "E2": 82.41, "B1": 61.74,
    "C3": 130.81, "E3": 164.81, "G3": 196.0, "A3": 220.0, "F3": 174.61,
    "C4": 261.63, "E4": 329.63, "G4": 392.0, "A4": 440.0, "F4": 349.23,
}

CHORDS = ["C", "G", "Am", "F"]
CHORD_NOTES = {
    "C": ["C3", "E3", "G3"],
    "G": ["G3", "B1", "D4"] if "D4" in NOTE_FREQ else ["G3", "B1", "G4"],
    "Am": ["A3", "C4", "E4"],
    "F": ["F3", "A3", "C4"],
}
CHORD_NOTES["G"] = ["G3", "B1", "G4"]
NOTE_FREQ["D4"] = 293.66
NOTE_FREQ["B1"] = 61.74

BASS_PATTERN = ["C2", "C2", "G1", "G1", "A1", "A1", "F1", "F1"]


def beat_dur() -> float:
    return 60.0 / BPM


def total_beats() -> int:
    return int(DURATION_SEC / beat_dur())


def env(t: np.ndarray, attack: float = 0.004, release: float = 0.08) -> np.ndarray:
    n = len(t)
    out = np.ones(n)
    a = min(n, int(attack * SR))
    r = min(n, int(release * SR))
    if a > 0:
        out[:a] = np.linspace(0, 1, a)
    if r > 0:
        out[-r:] = np.linspace(1, 0, r)
    return out


def sine(freq: float, length: int, amp: float = 0.3) -> np.ndarray:
    t = np.arange(length) / SR
    return np.sin(2 * math.pi * freq * t) * env(t) * amp


def kick(length: int) -> np.ndarray:
    t = np.arange(length) / SR
    freq = 150 * np.exp(-t * 28)
    return np.sin(2 * math.pi * freq * t) * np.exp(-t * 12) * 0.9


def snare(length: int) -> np.ndarray:
    t = np.arange(length) / SR
    noise = np.random.randn(length) * 0.35
    tone = np.sin(2 * math.pi * 180 * t) * 0.15
    return (noise + tone) * np.exp(-t * 18) * 0.75


def mix_stems(*stems: np.ndarray) -> np.ndarray:
    length = max(len(s) for s in stems)
    out = np.zeros(length)
    for s in stems:
        out[: len(s)] += s
    peak = np.max(np.abs(out)) or 1.0
    return (out / peak * 0.92).astype(np.float32)


def write_wav(path: Path, audio: np.ndarray) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    pcm = np.clip(audio, -1, 1)
    pcm = (pcm * 32767).astype(np.int16)
    with wave.open(str(path), "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(SR)
        wf.writeframes(pcm.tobytes())


def build_drums(total_samples: int) -> np.ndarray:
    out = np.zeros(total_samples)
    bd = int(beat_dur() * SR)
    kick_len = int(0.18 * SR)
    snare_len = int(0.12 * SR)
    beat = 0
    while beat * bd < total_samples:
        pos = beat * bd
        if beat % 4 == 0:
            end = min(pos + kick_len, total_samples)
            out[pos:end] += kick(end - pos)
        if beat % 4 == 2:
            end = min(pos + snare_len, total_samples)
            out[pos:end] += snare(end - pos)
        beat += 1
    return out


def build_bass(total_samples: int) -> np.ndarray:
    out = np.zeros(total_samples)
    eighth = int(beat_dur() * SR / 2)
    note_len = int(0.22 * SR)
    idx = 0
    pos = 0
    while pos < total_samples:
        note = BASS_PATTERN[idx % len(BASS_PATTERN)]
        freq = NOTE_FREQ[note]
        chunk = sine(freq, min(note_len, total_samples - pos), 0.42)
        out[pos : pos + len(chunk)] += chunk
        pos += eighth
        idx += 1
    return out


def build_harmonic(total_samples: int, amp: float) -> np.ndarray:
    out = np.zeros(total_samples)
    bar = int(beat_dur() * SR * 4)
    pos = 0
    ci = 0
    while pos < total_samples:
        chord = CHORDS[ci % len(CHORDS)]
        notes = CHORD_NOTES[chord]
        length = min(bar, total_samples - pos)
        t = np.arange(length) / SR
        layer = np.zeros(length)
        for n in notes:
            layer += np.sin(2 * math.pi * NOTE_FREQ[n] * t) * (amp / len(notes))
        layer *= env(t, 0.02, 0.15)
        out[pos : pos + length] += layer
        pos += bar
        ci += 1
    return out


def main() -> None:
    np.random.seed(42)
    SONG_DIR.mkdir(parents=True, exist_ok=True)
    total_samples = int(DURATION_SEC * SR)

    drums = build_drums(total_samples)
    bass = build_bass(total_samples)
    lead = build_harmonic(total_samples, 0.28)
    keys = build_harmonic(total_samples, 0.18)
    full = mix_stems(drums * 0.85, bass * 0.9, lead * 0.75, keys * 0.65)

    write_wav(SONG_DIR / "Drums.wav", drums)
    write_wav(SONG_DIR / "Bass.wav", bass)
    write_wav(SONG_DIR / "Lead.wav", lead)
    write_wav(SONG_DIR / "Keys.wav", keys)
    write_wav(SONG_DIR / "Full.wav", full)

    meta = {
        "name": "Street Jam",
        "emoji": "🎶",
        "cost": 0,
        "bpm": BPM,
    }
    (SONG_DIR / "song.json").write_text(json.dumps(meta, indent=2) + "\n")
    print(f"Generated example song in {SONG_DIR}")


if __name__ == "__main__":
    main()
