# Song upload folder schema

Drop one folder per song under `Assets/Songs/{song-id}/`.

## Required files

| File | Purpose |
| --- | --- |
| `Bass.wav` | Bass stem — analyzed for note onsets |
| `Drums.wav` | Drum stem — kick + snare chart only |
| `Lead.wav` | Lead / guitar stem — chord or note gems |
| `Keys.wav` | Keys stem — chord or note gems |
| `Full.wav` | Full mix — shop preview and low-volume bed |

## Optional metadata (`song.json`)

```json
{
  "name": "My Song",
  "emoji": "🎶",
  "cost": 120,
  "bpm": 118,
  "beatOffset": 0
}
```

If `bpm` is omitted, `scripts/sync-song-assets.py` auto-detects tempo from `Full.wav` (or `Drums.wav`).

## After upload

```bash
python3 scripts/sync-song-assets.py
```

## Output (`assets/songs/{song-id}/`)

| File | Contents |
| --- | --- |
| `manifest.json` | `bpm`, `durationSec`, `beatCount`, stem filenames |
| `charts.json` | `{ Bass, Drums, Lead, Keys }` beat-aligned events |
| `bass.wav` … `full.wav` | Normalized mono 44.1 kHz stems |

`js/song-manifest.js` is regenerated with the song catalog for the shop and hub.
