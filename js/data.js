const BASE_VENUES = [
  {
    id: 'street-corner',
    name: 'Street Corner',
    emoji: '🏙️',
    tier: 0,
    description: 'Your very first stage. Passersby might toss a coin if you\'re lucky.',
    bg: 'venue-street',
    handcrafted: true,
  },
  {
    id: 'local-tavern',
    name: 'Local Tavern',
    emoji: '🍺',
    tier: 1,
    description: 'Sticky floors, warm lights, and a crowd that actually came to listen.',
    bg: 'venue-tavern',
    handcrafted: true,
  },
  {
    id: 'town-square',
    name: 'Town Square',
    emoji: '🏛️',
    tier: 2,
    description: 'The whole town gathers when the music hits just right.',
    bg: 'venue-square',
    handcrafted: true,
  },
  {
    id: 'talent-show',
    name: 'Local Talent Show',
    emoji: '🎤',
    tier: 3,
    description: 'Judges are watching. The crowd is roaring. Show them what you\'ve got.',
    bg: 'venue-talent',
    handcrafted: true,
  },
  {
    id: 'small-concert-venue',
    name: 'Small Concert Venue',
    emoji: '🎸',
    tier: 4,
    description: 'Real stage lights. Real sound. You\'re not busking anymore.',
    bg: 'venue-concert',
    handcrafted: true,
  },
];

const EXTRA_VENUES = [
  { name: 'Neon Nightclub', emoji: '💃' },
  { name: 'Riverside Amphitheater', emoji: '🌊' },
  { name: 'Campus Green', emoji: '🎓' },
  { name: 'County Fairgrounds', emoji: '🎡' },
  { name: 'Jazz Cellar', emoji: '🎷' },
  { name: 'Bowling Palace', emoji: '🎳' },
  { name: 'Night Market Stage', emoji: '🏮' },
  { name: 'Rooftop Skyline', emoji: '🌆' },
  { name: 'Harbor Pier', emoji: '⚓' },
  { name: 'Radio Live Room', emoji: '📻' },
  { name: 'Regional Playhouse', emoji: '🎭' },
  { name: 'Summer Fest Field', emoji: '🌻' },
  { name: 'Grand Theater', emoji: '🎪' },
  { name: 'Crystal Atrium', emoji: '💎' },
  { name: 'Castle Courtyard', emoji: '🏰' },
  { name: 'City Stadium', emoji: '🏟️' },
  { name: 'TV Broadcast Studio', emoji: '📺' },
  { name: 'Continental Arena', emoji: '🌐' },
  { name: 'Global Mega Fest', emoji: '🎆' },
  { name: "The World's Biggest Stage", emoji: '🌍' },
];

function venueSlug(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function buildVenues() {
  const defs = [
    ...BASE_VENUES,
    ...EXTRA_VENUES.map((v, i) => ({
      id: venueSlug(v.name),
      name: v.name,
      emoji: v.emoji,
      tier: 5 + i,
      description: `A bigger stage for a bigger band — welcome to ${v.name}!`,
      bg: `venue-tier-${5 + i}`,
    })),
  ];

  return defs.map((v) => {
    const tier = v.tier;
    return {
      ...v,
      starRequired: tier === 0 ? 0 : Math.round(12 + tier * tier * 2.6),
      tipMultiplier: +(1 + tier * 0.5).toFixed(1),
      crowdCap: Math.round(10 + tier * 14 + tier * tier * 0.55),
      bpm: Math.min(88 + Math.floor(tier * 1.1), 118),
    };
  });
}

const VENUES = buildVenues();

const SHOP_ITEMS = {
  instruments: typeof INSTRUMENT_SHOP_ITEMS !== 'undefined' ? INSTRUMENT_SHOP_ITEMS : [
    { id: 'trash-lid', name: 'Trash Can Lid', emoji: '🥁', cost: 0, crowdBonus: 1, owned: true, starter: true },
  ],
  clothes: [
    { id: 'street-tee', name: 'Street Tee', emoji: '👕', cost: 20, crowdBonus: 2 },
    { id: 'sparkle-jacket', name: 'Sparkle Jacket', emoji: '✨', cost: 75, crowdBonus: 5 },
    { id: 'stage-outfit', name: 'Stage Outfit', emoji: '🕺', cost: 180, crowdBonus: 10 },
  ],
  makeup: [
    { id: 'glitter-eyes', name: 'Glitter Eyes', emoji: '💄', cost: 30, crowdBonus: 3 },
    { id: 'rock-star-face', name: 'Rock Star Face', emoji: '🌟', cost: 85, crowdBonus: 6 },
  ],
  accessories: [
    { id: 'cool-shades', name: 'Cool Shades', emoji: '🕶️', cost: 25, crowdBonus: 2 },
    { id: 'chain-necklace', name: 'Chain Necklace', emoji: '📿', cost: 60, crowdBonus: 4 },
    { id: 'top-hat', name: 'Top Hat', emoji: '🎩', cost: 120, crowdBonus: 8 },
  ],
  songs: typeof SONG_MANIFEST !== 'undefined'
    ? SONG_MANIFEST.map((s) => ({
      id: s.id,
      name: s.name,
      emoji: s.emoji,
      cost: s.cost ?? 0,
      crowdBonus: (s.cost ?? 0) > 0 ? Math.floor((s.cost ?? 0) / 40) + 4 : 2,
    }))
    : [],
};

const MAX_BAND_SLOTS = 7;

function buildBandSlotCosts() {
  const costs = [0, 80, 200, 400];
  while (costs.length < MAX_BAND_SLOTS) {
    const tier = costs.length;
    const prev = costs[costs.length - 1];
    costs.push(Math.round(prev * 1.08 + tier * 35));
  }
  return costs;
}

const BAND_SLOT_COSTS = buildBandSlotCosts();

const RECRUIT_POOL = [
  { id: 'riff', name: 'Riff', emoji: '🎸', role: 'Lead' },
  { id: 'boom', name: 'Boom', emoji: '🥁', role: 'Drums' },
  { id: 'melody', name: 'Melody', emoji: '🎹', role: 'Keys' },
  { id: 'slap', name: 'Slap', emoji: '🎸', role: 'Bass' },
];