const INSTRUMENTS = {
  'trash-lid': {
    id: 'trash-lid',
    name: 'Trash Can Lid',
    emoji: '🥁',
    type: 'percussion',
    subtype: 'cymbal',
    hold: 'one-hand-up',
    cost: 0,
    crowdBonus: 1,
    starter: true,
  },
  drums: {
    id: 'drums',
    name: 'Drums',
    emoji: '🥁',
    type: 'percussion',
    subtype: 'drums',
    hold: 'two-hand',
    cost: 450,
    crowdBonus: 20,
  },
  bass: {
    id: 'bass',
    name: 'Bass',
    emoji: '🎸',
    type: 'melodic',
    subtype: 'bass',
    hold: 'guitar',
    progression: ['E', 'A', 'B', 'C#m'],
    cost: 200,
    crowdBonus: 10,
  },
  'electric-guitar': {
    id: 'electric-guitar',
    name: 'Electric Guitar',
    emoji: '🎸',
    type: 'melodic',
    subtype: 'electric',
    hold: 'guitar',
    progression: ['E', 'B', 'C#m', 'A'],
    cost: 220,
    crowdBonus: 12,
  },
  keys: {
    id: 'keys',
    name: 'Keys',
    emoji: '🎹',
    type: 'melodic',
    subtype: 'piano',
    hold: 'keys',
    progression: ['C', 'Am', 'F', 'G'],
    cost: 320,
    crowdBonus: 14,
  },
};

const VALID_INSTRUMENT_IDS = new Set(Object.keys(INSTRUMENTS));

const LEGACY_INSTRUMENT_MAP = {
  'drum-kit': 'drums',
  tambourine: 'drums',
  bongo: 'drums',
  cowbell: 'drums',
  triangle: 'drums',
  'bass-guitar': 'bass',
  piano: 'keys',
  keyboard: 'keys',
  organ: 'keys',
  'synth-lead': 'keys',
  accordion: 'keys',
};

function migrateInstrumentId(id) {
  if (!id) return 'trash-lid';
  if (VALID_INSTRUMENT_IDS.has(id)) return id;
  return LEGACY_INSTRUMENT_MAP[id] || 'trash-lid';
}

const INSTRUMENT_SHOP_ITEMS = Object.values(INSTRUMENTS)
  .sort((a, b) => (a.starter ? -1 : b.starter ? 1 : (a.cost ?? 0) - (b.cost ?? 0)))
  .map((i) => ({
    id: i.id,
    name: i.name,
    emoji: i.emoji,
    cost: i.cost ?? 100,
    crowdBonus: i.crowdBonus ?? 5,
    owned: !!i.starter,
    starter: !!i.starter,
  }));

function getEquippedInstrument(state) {
  const raw = state.equippedInstrument
    || state.inventories.instruments[state.inventories.instruments.length - 1]
    || 'trash-lid';
  const id = migrateInstrumentId(raw);
  return INSTRUMENTS[id] || INSTRUMENTS['trash-lid'];
}

function renderHeldInstrumentInner(inst, pose = 'idle') {
  if (!inst) return '';
  if (typeof InstrumentArt !== 'undefined') {
    return InstrumentArt.renderHeld(inst, pose);
  }
  return '';
}

function renderHeldInstrument(inst, pose = 'idle') {
  return renderHeldInstrumentInner(inst, pose);
}

function renderShopInstrumentPreview(inst, size = 48) {
  if (typeof InstrumentArt !== 'undefined') {
    return InstrumentArt.renderShopPreview(inst, size);
  }
  return `<span class="shop-emoji">${inst.emoji}</span>`;
}

function renderInventoryItemThumb(cat, item, size = 36) {
  if (cat === 'instruments' && INSTRUMENTS[item.id] && typeof InstrumentArt !== 'undefined') {
    return InstrumentArt.renderInventoryThumb(INSTRUMENTS[item.id], size);
  }
  return `<span class="brand-card-icon">${item.emoji}</span>`;
}

function renderShopItemPreview(cat, item, size = 72) {
  if (cat === 'instruments' && INSTRUMENTS[item.id]) {
    return renderShopInstrumentPreview(INSTRUMENTS[item.id], size);
  }
  return `<span class="brand-card-icon brand-card-icon-lg">${item.emoji}</span>`;
}
