const SongLoader = (() => {
  const BASE = 'assets/songs/';
  const cache = new Map();

  function loadSongCatalog() {
    return typeof SONG_MANIFEST !== 'undefined' ? [...SONG_MANIFEST] : [];
  }

  function getCached(id) {
    return cache.get(id) || null;
  }

  function getDefaultSongId() {
    const catalog = loadSongCatalog();
    return catalog[0]?.id || 'rebel-pulse';
  }

  async function fetchJson(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to load ${url}: ${res.status}`);
    return res.json();
  }

  async function loadSong(id) {
    const songId = id || getDefaultSongId();
    if (cache.has(songId)) return cache.get(songId);

    const catalog = loadSongCatalog();
    const entry = catalog.find((s) => s.id === songId) || catalog[0];
    if (!entry) throw new Error(`Unknown song: ${songId}`);

    const bust = typeof SONG_ASSET_VERSION !== 'undefined' ? SONG_ASSET_VERSION : '1';
    const base = `${BASE}${songId}/`;
    const [manifest, charts] = await Promise.all([
      fetchJson(`${base}manifest.json?v=${bust}`),
      fetchJson(`${base}charts.json?v=${bust}`),
    ]);

    const totalBeats = manifest.beatCount || entry.beatCount || Math.round((manifest.durationSec || 60) * (manifest.bpm || 118) / 60);
    const song = {
      id: songId,
      name: manifest.name || entry.name,
      emoji: manifest.emoji || entry.emoji,
      cost: manifest.cost ?? entry.cost ?? 0,
      bpm: manifest.bpm || entry.bpm || 118,
      durationSec: manifest.durationSec || entry.durationSec || 60,
      totalBeats,
      sections: typeof buildSections === 'function' ? buildSections(totalBeats) : [],
      parts: charts,
      stems: {
        Bass: `${base}${manifest.stems?.Bass || 'bass.wav'}`,
        Drums: `${base}${manifest.stems?.Drums || 'drums.wav'}`,
        Lead: `${base}${manifest.stems?.Lead || 'lead.wav'}`,
        Keys: `${base}${manifest.stems?.Keys || 'keys.wav'}`,
        Full: `${base}${manifest.stems?.Full || 'full.wav'}`,
      },
      stemMap: { ...INSTRUMENT_STEM_MAP },
      stemBacked: true,
      beatOffset: manifest.beatOffset || 0,
      fullMixVolume: manifest.fullMixVolume ?? 0.85,
    };

    cache.set(songId, song);
    return song;
  }

  async function preloadSong(id) {
    return loadSong(id);
  }

  function clearCache() {
    cache.clear();
  }

  return {
    loadSongCatalog,
    loadSong,
    preloadSong,
    getCached,
    getDefaultSongId,
    clearCache,
  };
})();
