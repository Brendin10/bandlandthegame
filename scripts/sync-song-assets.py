#!/usr/bin/env python3
"""Analyze stem uploads in Assets/Songs/ and write assets/songs/{id}/ + song-manifest.js."""

from __future__ import annotations

import json
import math
import shutil
import subprocess
import wave
from pathlib import Path

import numpy as np

try:
    import librosa
    import soundfile as sf

    HAS_LIBROSA = True
except ImportError:
    HAS_LIBROSA = False

ROOT = Path(__file__).resolve().parents[1]
SRC_ROOT = ROOT / "Assets" / "Songs"
DST_ROOT = ROOT / "assets" / "songs"
MANIFEST_JS = ROOT / "js" / "song-manifest.js"
SR = 44100
STEM_UPLOAD = {
    "Bass.wav": ("Bass", "bass.wav"),
    "Drums.wav": ("Drums", "drums.wav"),
    "Lead.wav": ("Lead", "lead.wav"),
    "Keys.wav": ("Keys", "keys.wav"),
    "Full.wav": ("Full", "full.wav"),
}

NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]


def read_wav_mono(path: Path) -> tuple[np.ndarray, int]:
    if HAS_LIBROSA:
        y, sr = librosa.load(path, sr=SR, mono=True)
        return y.astype(np.float32), sr
    with wave.open(str(path), "r") as wf:
        sr = wf.getframerate()
        frames = wf.readframes(wf.getnframes())
        sw = wf.getsampwidth()
        if sw == 2:
            audio = np.frombuffer(frames, dtype=np.int16).astype(np.float32) / 32768.0
        else:
            audio = np.frombuffer(frames, dtype=np.int32).astype(np.float32) / 2147483648.0
        if wf.getnchannels() > 1:
            audio = audio.reshape(-1, wf.getnchannels()).mean(axis=1)
        if sr != SR:
            audio = resample_linear(audio, sr, SR)
        return audio.astype(np.float32), SR


def resample_linear(audio: np.ndarray, src_sr: int, dst_sr: int) -> np.ndarray:
    if src_sr == dst_sr:
        return audio
    duration = len(audio) / src_sr
    dst_len = int(duration * dst_sr)
    x_old = np.linspace(0, duration, num=len(audio), endpoint=False)
    x_new = np.linspace(0, duration, num=dst_len, endpoint=False)
    return np.interp(x_new, x_old, audio).astype(np.float32)


def write_wav_mono(path: Path, audio: np.ndarray, sr: int = SR) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if HAS_LIBROSA:
        sf.write(path, audio, sr, subtype="PCM_16")
        return
    pcm = np.clip(audio, -1, 1)
    pcm = (pcm * 32767).astype(np.int16)
    with wave.open(str(path), "w") as wf:
        wf.setnchannels(1)
        wf.setsampwidth(2)
        wf.setframerate(sr)
        wf.writeframes(pcm.tobytes())


def detect_bpm(audio: np.ndarray, sr: int, override: float | None) -> float:
    if override:
        return float(override)
    if HAS_LIBROSA:
        tempo, _ = librosa.beat.beat_track(y=audio, sr=sr, units="time")
        if isinstance(tempo, np.ndarray):
            tempo = float(tempo[0]) if tempo.size else 118.0
        return max(60.0, min(200.0, float(tempo)))
    peaks = onset_frames_simple(audio, sr)
    if len(peaks) < 4:
        return 118.0
    intervals = np.diff(peaks[: min(32, len(peaks))])
    median = float(np.median(intervals))
    if median <= 0:
        return 118.0
    bpm = 60.0 / median
    while bpm < 70:
        bpm *= 2
    while bpm > 160:
        bpm /= 2
    return bpm


def onset_frames_simple(audio: np.ndarray, sr: int) -> np.ndarray:
    hop = 512
    frame = 2048
    energy = []
    for i in range(0, len(audio) - frame, hop):
        chunk = audio[i : i + frame]
        energy.append(float(np.sqrt(np.mean(chunk * chunk))))
    energy = np.array(energy)
    if energy.size == 0:
        return np.array([])
    thresh = np.mean(energy) + 0.35 * np.std(energy)
    peaks = np.where(energy > thresh)[0]
    times = peaks * hop / sr
    filtered = []
    last = -1.0
    for t in times:
        if t - last >= 0.08:
            filtered.append(t)
            last = t
    return np.array(filtered)


def onset_times(audio: np.ndarray, sr: int) -> np.ndarray:
    if HAS_LIBROSA:
        onset_env = librosa.onset.onset_strength(y=audio, sr=sr)
        frames = librosa.onset.onset_detect(onset_envelope=onset_env, sr=sr, units="time")
        return np.asarray(frames, dtype=float)
    return onset_frames_simple(audio, sr)


def beat_grid(duration_sec: float, bpm: float, beat_offset: float = 0.0) -> np.ndarray:
    beat_dur = 60.0 / bpm
    count = int(math.ceil(duration_sec / beat_dur)) + 1
    return beat_offset + np.arange(count) * beat_dur


def snap_to_beats(times: np.ndarray, grid: np.ndarray) -> list[int]:
    beats = []
    for t in times:
        idx = int(np.argmin(np.abs(grid - t)))
        beats.append(idx)
    return beats


def freq_to_note(freq: float) -> str:
    if freq <= 0:
        return "C2"
    midi = 69 + 12 * math.log2(freq / 440.0)
    midi = int(round(midi))
    octave = midi // 12 - 1
    name = NOTE_NAMES[midi % 12]
    return f"{name}{octave}"


def filter_drum_events(events: list[dict]) -> list[dict]:
    return [ev for ev in events if ev.get("hit") in ("kick", "snare")]


def analyze_drums(audio: np.ndarray, sr: int, grid: np.ndarray) -> list[dict]:
    times = onset_times(audio, sr)
    if times.size == 0:
        return []
    events = []
    hop = 512
    for t in times:
        idx = int(t * sr)
        chunk = audio[max(0, idx - hop) : idx + hop]
        if chunk.size < 32:
            continue
        spec = np.abs(np.fft.rfft(chunk * np.hanning(len(chunk))))
        freqs = np.fft.rfftfreq(len(chunk), 1 / sr)
        low = spec[freqs < 150].sum()
        mid = spec[(freqs >= 150) & (freqs < 4000)].sum()
        high = spec[freqs >= 4000].sum()
        total = low + mid + high + 1e-9
        centroid = float(np.sum(freqs * spec) / (spec.sum() + 1e-9))
        duration_ms = len(chunk) / sr * 1000
        if high / total > 0.48 and duration_ms < 100 and centroid > 3200:
            continue
        if high / total > 0.62:
            continue
        if low / total > 0.42:
            hit = "kick"
        elif mid / total > 0.28:
            hit = "snare"
        else:
            continue
        beat = int(np.argmin(np.abs(grid - t)))
        events.append({"beat": beat, "hit": hit, "dur": 1, "timeSec": round(float(t), 4)})
    deduped = {}
    for ev in events:
        key = (ev["beat"], ev["hit"])
        deduped[key] = ev
    return filter_drum_events(sorted(deduped.values(), key=lambda e: e["beat"]))


def analyze_bass(audio: np.ndarray, sr: int, grid: np.ndarray) -> list[dict]:
    times = onset_times(audio, sr)
    events = []
    for t in times:
        idx = int(t * sr)
        chunk = audio[max(0, idx) : idx + int(0.12 * sr)]
        if chunk.size < 64:
            continue
        if HAS_LIBROSA:
            f0 = librosa.yin(chunk, fmin=40, fmax=220, sr=sr)
            freq = float(np.median(f0[np.isfinite(f0)])) if np.any(np.isfinite(f0)) else 0.0
        else:
            spec = np.abs(np.fft.rfft(chunk))
            freqs = np.fft.rfftfreq(len(chunk), 1 / sr)
            band = spec[(freqs >= 40) & (freqs <= 220)]
            if band.size == 0:
                continue
            freq = float(freqs[(freqs >= 40) & (freqs <= 220)][np.argmax(band)])
        if freq <= 0:
            continue
        beat = int(np.argmin(np.abs(grid - t)))
        events.append({"beat": beat, "note": freq_to_note(freq), "dur": 1, "timeSec": round(float(t), 4)})
    deduped = {}
    for ev in events:
        deduped[ev["beat"]] = ev
    return sorted(deduped.values(), key=lambda e: e["beat"])


def analyze_melodic(audio: np.ndarray, sr: int, grid: np.ndarray) -> list[dict]:
    times = onset_times(audio, sr)
    events = []
    for t in times:
        idx = int(t * sr)
        chunk = audio[max(0, idx) : idx + int(0.15 * sr)]
        if chunk.size < 64:
            continue
        beat = int(np.argmin(np.abs(grid - t)))
        if HAS_LIBROSA:
            chroma = librosa.feature.chroma_cqt(y=chunk, sr=sr)
            pitch_class = int(np.argmax(np.mean(chroma, axis=1)))
            chord = NOTE_NAMES[pitch_class]
        else:
            spec = np.abs(np.fft.rfft(chunk))
            freqs = np.fft.rfftfreq(len(chunk), 1 / sr)
            peak = freqs[np.argmax(spec)]
            chord = freq_to_note(float(peak))[:-1] if peak > 0 else "C"
        events.append({"beat": beat, "chord": chord, "dur": 1, "timeSec": round(float(t), 4)})
    deduped = {}
    for ev in events:
        if ev["beat"] not in deduped:
            deduped[ev["beat"]] = ev
    return sorted(deduped.values(), key=lambda e: e["beat"])


def load_song_meta(song_dir: Path) -> dict:
    meta_path = song_dir / "song.json"
    if meta_path.is_file():
        return json.loads(meta_path.read_text())
    return {}


def sync_song(song_id: str, song_dir: Path) -> dict | None:
    stems_present = [name for name in STEM_UPLOAD if (song_dir / name).is_file()]
    if len(stems_present) < 4:
        print(f"  skip {song_id}: need Bass/Drums/Lead/Keys stems ({len(stems_present)} found)")
        return None

    meta = load_song_meta(song_dir)
    full_audio, sr = read_wav_mono(song_dir / "Full.wav") if (song_dir / "Full.wav").is_file() else read_wav_mono(song_dir / "Drums.wav")
    duration_sec = len(full_audio) / sr
    bpm = detect_bpm(full_audio, sr, meta.get("bpm"))
    beat_offset = float(meta.get("beatOffset", 0))
    grid = beat_grid(duration_sec, bpm, beat_offset)
    beat_count = max(1, int(math.floor(duration_sec / (60.0 / bpm))))

    dst_dir = DST_ROOT / song_id
    dst_dir.mkdir(parents=True, exist_ok=True)

    stem_paths = {}
    charts: dict[str, list] = {}
    for upload_name, (chart_key, out_name) in STEM_UPLOAD.items():
        src = song_dir / upload_name
        if not src.is_file():
            continue
        audio, _ = read_wav_mono(src)
        write_wav_mono(dst_dir / out_name, audio, SR)
        stem_paths[chart_key] = out_name
        if chart_key == "Drums":
            charts[chart_key] = analyze_drums(audio, SR, grid)
        elif chart_key == "Bass":
            charts[chart_key] = analyze_bass(audio, SR, grid)
        elif chart_key in ("Lead", "Keys"):
            charts[chart_key] = analyze_melodic(audio, SR, grid)
        else:
            charts[chart_key] = []

    for key in ("Bass", "Drums", "Lead", "Keys"):
        charts.setdefault(key, [])

    manifest = {
        "id": song_id,
        "name": meta.get("name", song_id.replace("-", " ").title()),
        "emoji": meta.get("emoji", "🎶"),
        "cost": meta.get("cost", 0),
        "bpm": round(bpm, 2),
        "durationSec": round(duration_sec, 3),
        "beatCount": beat_count,
        "beatOffset": beat_offset,
        "fullMixVolume": float(meta.get("fullMixVolume", 0.85)),
        "stems": stem_paths,
    }

    (dst_dir / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    (dst_dir / "charts.json").write_text(json.dumps(charts, indent=2) + "\n")

    print(f"  synced {song_id}: {beat_count} beats @ {bpm:.1f} BPM, charts Bass={len(charts['Bass'])} Drums={len(charts['Drums'])} Lead={len(charts['Lead'])} Keys={len(charts['Keys'])}")
    return manifest


def write_song_manifest_js(entries: list[dict]) -> None:
    catalog = []
    for m in entries:
        catalog.append({
            "id": m["id"],
            "name": m["name"],
            "emoji": m.get("emoji", "🎶"),
            "cost": m.get("cost", 0),
            "bpm": m.get("bpm", 118),
            "durationSec": m.get("durationSec", 60),
            "beatCount": m.get("beatCount", 118),
        })
    catalog.sort(key=lambda s: (s.get("cost", 0), s["id"]))
    lines = [
        "// Auto-generated by scripts/sync-song-assets.py — do not edit by hand.",
        "const SONG_MANIFEST = " + json.dumps(catalog, indent=2) + ";",
        "",
    ]
    MANIFEST_JS.write_text("\n".join(lines))


def main() -> None:
    if not SRC_ROOT.is_dir():
        print(f"No song uploads in {SRC_ROOT}")
        write_song_manifest_js([])
        return

    entries = []
    for song_dir in sorted(SRC_ROOT.iterdir()):
        if not song_dir.is_dir():
            continue
        manifest = sync_song(song_dir.name, song_dir)
        if manifest:
            entries.append(manifest)

    write_song_manifest_js(entries)
    print(f"Wrote {len(entries)} song(s) to {DST_ROOT} and {MANIFEST_JS.name}")


if __name__ == "__main__":
    main()
