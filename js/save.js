const SAVE_KEY = 'bandland_save_v2';

function migrateSaveInventories(inventories) {
  const inv = inventories || {};
  if (!inv.instruments) inv.instruments = ['trash-lid'];
  inv.instruments = [...new Set(
    inv.instruments.map((id) => (typeof migrateInstrumentId === 'function' ? migrateInstrumentId(id) : id))
  )];
  if (!inv.instruments.includes('trash-lid')) inv.instruments.unshift('trash-lid');

  const defaultSong = typeof SongLoader !== 'undefined' ? SongLoader.getDefaultSongId() : 'rebel-pulse';
  if (!inv.songs) inv.songs = [defaultSong];
  const validSongs = typeof SONG_MANIFEST !== 'undefined'
    ? new Set(SONG_MANIFEST.map((s) => s.id))
    : new Set([defaultSong]);
  inv.songs = inv.songs
    .map((id) => (id === 'street-jam' ? 'rebel-pulse' : id))
    .filter((id) => validSongs.has(id));
  inv.songs = [...new Set(inv.songs)];
  if (!inv.songs.length) inv.songs = [defaultSong];
  return inv;
}

const SaveManager = {
  save(state) {
    const data = {
      character: state.character,
      bandCash: state.bandCash,
      starMeter: state.starMeter,
      hasLid: state.hasLid,
      tutorialComplete: state.hasLid,
      inventories: state.inventories,
      bandMembers: state.bandMembers,
      bandSlots: state.bandSlots,
      currentVenue: state.currentVenue,
      equippedInstrument: state.equippedInstrument,
      equippedSong: state.equippedSong,
      equippedWear: state.equippedWear,
      gigBandIds: state.gigBandIds,
      savedAt: Date.now(),
    };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    } catch (e) {
      console.warn('Could not save progress', e);
    }
  },

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY) || localStorage.getItem('bandland_save_v1');
      if (!raw) return null;
      return JSON.parse(raw);
    } catch {
      return null;
    }
  },

  apply(state, data) {
    if (!data) return false;
    state.character = data.character;
    state.bandCash = data.bandCash ?? 0;
    state.starMeter = data.starMeter ?? 0;
    state.hasLid = data.hasLid ?? data.tutorialComplete ?? false;
    state.inventories = migrateSaveInventories(data.inventories ?? state.inventories);
    state.bandMembers = (data.bandMembers ?? []).map((m) => ({
      ...m,
      role: m.role === 'Guitar' ? 'Lead' : m.role,
    }));
    if (state.bandMembers.length > MAX_BAND_SLOTS) {
      state.bandMembers = state.bandMembers.slice(0, MAX_BAND_SLOTS);
    }
    state.bandSlots = Math.min(Math.max(Math.floor(Number(data.bandSlots)) || 1, 1), MAX_BAND_SLOTS);
    if (state.bandSlots < state.bandMembers.length) {
      state.bandSlots = state.bandMembers.length;
    }
    state.currentVenue = data.currentVenue ?? 'street-corner';
    if (state.currentVenue === 'concert-venue') state.currentVenue = 'small-concert-venue';
    state.equippedInstrument = typeof migrateInstrumentId === 'function'
      ? migrateInstrumentId(data.equippedInstrument)
      : (data.equippedInstrument ?? 'trash-lid');
    const defaultSong = typeof SongLoader !== 'undefined' ? SongLoader.getDefaultSongId() : 'rebel-pulse';
    const validSongs = typeof SONG_MANIFEST !== 'undefined'
      ? new Set(SONG_MANIFEST.map((s) => s.id))
      : new Set([defaultSong]);
    const rawSong = data.equippedSong === 'street-jam' ? 'rebel-pulse' : (data.equippedSong ?? defaultSong);
    state.equippedSong = validSongs.has(rawSong) ? rawSong : defaultSong;
    state.equippedWear = data.equippedWear ?? { clothes: null, makeup: null, accessories: null };
    state.gigBandIds = Array.isArray(data.gigBandIds) ? data.gigBandIds : [];
    return true;
  },

  clear() {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem('bandland_save_v1');
  },

  hasSave() {
    return !!(localStorage.getItem(SAVE_KEY) || localStorage.getItem('bandland_save_v1'));
  },
};
