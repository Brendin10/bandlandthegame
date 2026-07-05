# Bandland

A 2D web game about building a band from street-corner drums to sold-out shows.

## Play Locally

```bash
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080) in your browser.

## Game Flow

1. **Pick your character** — Benny or Lizzy
2. **Find your first instrument** — discover a drum kit on the street
3. **Play gigs** — tap rhythm gems synced to stem charts, grow the crowd, earn BandCash and Star Meter
4. **Shop** — buy Bass, Electric Guitar, Keys, clothes, makeup, accessories, songs, and band slots
5. **Unlock venues** — Street Corner → Local Tavern → Town Square → Local Talent Show → Small Concert Venue

## Progression

- **BandCash** — earned from tips during gigs; spent in the shop
- **Star Meter** — grows from crowd size, cheering, and tips; unlocks bigger venues
- **Band members** — recruited as your star power grows (Lead, Drums, Bass, Keys)

No build step required — vanilla HTML, CSS, and JavaScript.

## Instruments (4)

| ID | Name | Stem chart |
| --- | --- | --- |
| `drums` | Drums (starter) | `Drums` — kick + snare only |
| `bass` | Bass | `Bass` — note onsets |
| `electric-guitar` | Electric Guitar | `Lead` |
| `keys` | Keys | `Keys` |

Monster-brand PNG art lives in `assets/instruments/{id}.png`. Upload source files to `Assets/Instruments/` and run:

```bash
python3 scripts/sync-instrument-assets.py
```

## Adding Songs (stem upload workflow)

1. Create a folder under `Assets/Songs/{song-id}/` with these stems (WAV):

   ```
   Assets/Songs/my-song/
     song.json          # optional: name, emoji, cost, bpm, beatOffset
     Full.wav           # full mix (shop preview / ambience)
     Bass.wav
     Drums.wav
     Lead.wav
     Keys.wav
   ```

2. Install Python deps (first time):

   ```bash
   pip install -r requirements.txt
   ```

3. Sync and analyze stems:

   ```bash
   python3 scripts/sync-song-assets.py
   ```

   This writes `assets/songs/{song-id}/manifest.json`, `charts.json`, normalized WAV stems, and regenerates `js/song-manifest.js`.

4. Bump the cache version in `index.html` (`?v=…` and `SONG_ASSET_VERSION`) and deploy.

The starter song **Rebel Pulse** lives in `Assets/Songs/rebel-pulse/`. Add more songs under `Assets/Songs/{song-id}/` and run:

```bash
python3 scripts/sync-song-assets.py
```

Or sync everything at once:

```bash
python3 scripts/sync-all-assets.py
```

### Chart notes

- Drum charts include **kick and snare only** (hi-hats filtered out during analysis).
- Automatic chart extraction may need hand-tuning — edit `assets/songs/{id}/charts.json` after sync if needed.
- Optional `song.json` fields: `bpm`, `beatOffset`, `name`, `emoji`, `cost`.

## Audio Samples

Tap feedback and crowd audio use hybrid playback: short WAV samples in `audio/instruments/` plus procedural Web Audio synthesis as fallback. During gigs, **stem playback** (`js/stem-player.js`) plays synced song stems; the player's equipped instrument stem is muted so hits use synth confirmation.

**Custom instrument recordings:** upload to `Assets/Instrument audio/` (or `Assets/Instrument Audio/`) named like the instrument (`Bass Guitar.mp3` or `bass.mp3`), then run `python3 scripts/sync-instrument-audio.py` to copy into `audio/instruments/{instrument-id}.{ext}`. Crowd cheer/boo clips live in `audio/`.

## Visual Assets

The logo is `assets/brand/bandland-logo.png`. Regenerate placeholders with `python3 scripts/generate-brand-assets.py`.
