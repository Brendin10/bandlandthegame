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
    { id: 'ripped-skull-tee', name: 'Ripped Skull Tee', emoji: '💀', cost: 35, crowdBonus: 3 },
    { id: 'tie-dye-tee', name: 'Tie-Dye Tee', emoji: '🌀', cost: 50, crowdBonus: 4 },
    { id: 'grunge-flannel', name: 'Grunge Flannel', emoji: '🪵', cost: 65, crowdBonus: 4 },
    { id: 'sparkle-jacket', name: 'Sparkle Jacket', emoji: '✨', cost: 75, crowdBonus: 5 },
    { id: 'band-hoodie', name: 'Band Hoodie', emoji: '🧢', cost: 90, crowdBonus: 6 },
    { id: 'denim-vest', name: 'Denim Vest', emoji: '👖', cost: 110, crowdBonus: 7 },
    { id: 'neon-windbreaker', name: 'Neon Windbreaker', emoji: '🌈', cost: 130, crowdBonus: 8 },
    { id: 'world-tour-tee', name: 'World Tour Tee', emoji: '🌍', cost: 150, crowdBonus: 9 },
    { id: 'stage-outfit', name: 'Stage Outfit', emoji: '🕺', cost: 180, crowdBonus: 10 },
    { id: 'leopard-shirt', name: 'Leopard Shirt', emoji: '🐆', cost: 210, crowdBonus: 11 },
    { id: 'punk-plaid', name: 'Punk Plaid', emoji: '🧷', cost: 250, crowdBonus: 12 },
    { id: 'fringe-jacket', name: 'Fringe Jacket', emoji: '🤠', cost: 300, crowdBonus: 14 },
    { id: 'studded-vest', name: 'Studded Vest', emoji: '🔩', cost: 360, crowdBonus: 16 },
    { id: 'velvet-blazer', name: 'Velvet Blazer', emoji: '🍇', cost: 430, crowdBonus: 18 },
    { id: 'leather-jacket', name: 'Leather Jacket', emoji: '🧥', cost: 520, crowdBonus: 20 },
    { id: 'sequin-top', name: 'Sequin Top', emoji: '💖', cost: 620, crowdBonus: 23 },
    { id: 'glam-cape', name: 'Glam Cape', emoji: '🦸', cost: 750, crowdBonus: 26 },
    { id: 'battle-vest', name: 'Metal Battle Vest', emoji: '⚔️', cost: 900, crowdBonus: 30 },
    { id: 'tuxedo-rocker', name: 'Rocker Tuxedo', emoji: '🤵', cost: 1050, crowdBonus: 33 },
    { id: 'white-jumpsuit', name: 'Vegas Jumpsuit', emoji: '🕴️', cost: 1250, crowdBonus: 36 },
    { id: 'gold-lame-suit', name: 'Gold Lamé Suit', emoji: '🏆', cost: 1450, crowdBonus: 40 },
    { id: 'holo-jacket', name: 'Holo Chrome Jacket', emoji: '🔮', cost: 1700, crowdBonus: 45 },
  ],
  makeup: [
    { id: 'cat-eyeliner', name: 'Cat Eyeliner', emoji: '🐱', cost: 22, crowdBonus: 2 },
    { id: 'glitter-eyes', name: 'Glitter Eyes', emoji: '💄', cost: 30, crowdBonus: 3 },
    { id: 'stage-blush', name: 'Stage Blush', emoji: '🌸', cost: 40, crowdBonus: 3 },
    { id: 'heart-cheek', name: 'Heart Cheek', emoji: '💗', cost: 55, crowdBonus: 4 },
    { id: 'star-cheeks', name: 'Star Cheeks', emoji: '⭐', cost: 70, crowdBonus: 5 },
    { id: 'rock-star-face', name: 'Rock Star Face', emoji: '🌟', cost: 85, crowdBonus: 6 },
    { id: 'glitter-tears', name: 'Glitter Tears', emoji: '💧', cost: 95, crowdBonus: 6 },
    { id: 'smoky-eyes', name: 'Smoky Eyes', emoji: '🌫️', cost: 115, crowdBonus: 7 },
    { id: 'neon-warpaint', name: 'Neon Warpaint', emoji: '🎨', cost: 140, crowdBonus: 8 },
    { id: 'punk-x-eye', name: 'Punk X Eye', emoji: '❌', cost: 170, crowdBonus: 9 },
    { id: 'rainbow-arc', name: 'Rainbow Arc', emoji: '🌈', cost: 200, crowdBonus: 10 },
    { id: 'ziggy-bolt', name: 'Ziggy Bolt', emoji: '⚡', cost: 240, crowdBonus: 12 },
    { id: 'gold-shimmer', name: 'Gold Shimmer', emoji: '✨', cost: 290, crowdBonus: 13 },
    { id: 'flame-brows', name: 'Flame Brows', emoji: '🔥', cost: 340, crowdBonus: 15 },
    { id: 'tiger-stripes', name: 'Tiger Stripes', emoji: '🐯', cost: 400, crowdBonus: 17 },
    { id: 'galaxy-freckles', name: 'Galaxy Freckles', emoji: '🌌', cost: 470, crowdBonus: 19 },
    { id: 'checker-jaw', name: 'Ska Checker Jaw', emoji: '🏁', cost: 550, crowdBonus: 21 },
    { id: 'red-bolt-cheeks', name: 'Red Bolt Cheeks', emoji: '🌩️', cost: 640, crowdBonus: 23 },
    { id: 'mirror-gem', name: 'Mirror Gem', emoji: '💎', cost: 740, crowdBonus: 26 },
    { id: 'starchild-eye', name: 'Starchild Eye', emoji: '🎸', cost: 860, crowdBonus: 29 },
    { id: 'skull-paint', name: 'Skull Face Paint', emoji: '☠️', cost: 1000, crowdBonus: 33 },
    { id: 'corpse-paint', name: 'Corpse Paint', emoji: '🖤', cost: 1150, crowdBonus: 38 },
  ],
  accessories: [
    { id: 'cool-shades', name: 'Cool Shades', emoji: '🕶️', cost: 25, crowdBonus: 2 },
    { id: 'hoop-earrings', name: 'Hoop Earrings', emoji: '⭕', cost: 40, crowdBonus: 3 },
    { id: 'red-bandana', name: 'Red Bandana', emoji: '🔴', cost: 55, crowdBonus: 4 },
    { id: 'chain-necklace', name: 'Chain Necklace', emoji: '📿', cost: 60, crowdBonus: 4 },
    { id: 'pick-necklace', name: 'Pick Necklace', emoji: '🎸', cost: 80, crowdBonus: 5 },
    { id: 'blue-beanie', name: 'Slouch Beanie', emoji: '🧶', cost: 100, crowdBonus: 6 },
    { id: 'round-glasses', name: 'Round Glasses', emoji: '👓', cost: 115, crowdBonus: 7 },
    { id: 'top-hat', name: 'Top Hat', emoji: '🎩', cost: 120, crowdBonus: 8 },
    { id: 'backstage-pass', name: 'Backstage Pass', emoji: '🎫', cost: 140, crowdBonus: 9 },
    { id: 'heart-glasses', name: 'Heart Glasses', emoji: '😍', cost: 165, crowdBonus: 10 },
    { id: 'studded-choker', name: 'Studded Choker', emoji: '⚫', cost: 195, crowdBonus: 11 },
    { id: 'silk-scarf', name: 'Silk Scarf', emoji: '🧣', cost: 230, crowdBonus: 12 },
    { id: 'black-beret', name: 'Jazz Beret', emoji: '🎷', cost: 270, crowdBonus: 13 },
    { id: 'aviator-shades', name: 'Aviator Shades', emoji: '🛩️', cost: 320, crowdBonus: 15 },
    { id: 'eye-patch', name: 'Rebel Eye Patch', emoji: '🏴‍☠️', cost: 370, crowdBonus: 16 },
    { id: 'cowboy-hat', name: 'Outlaw Cowboy Hat', emoji: '🤠', cost: 430, crowdBonus: 18 },
    { id: 'headset-mic', name: 'Headset Mic', emoji: '🎤', cost: 500, crowdBonus: 20 },
    { id: 'dj-headphones', name: 'DJ Headphones', emoji: '🎧', cost: 580, crowdBonus: 22 },
    { id: 'devil-horns', name: 'Devil Horns', emoji: '😈', cost: 680, crowdBonus: 25 },
    { id: 'feather-boa', name: 'Feather Boa', emoji: '🪶', cost: 800, crowdBonus: 28 },
    { id: 'star-glasses', name: 'Superstar Glasses', emoji: '🌟', cost: 950, crowdBonus: 31 },
    { id: 'spiked-mohawk', name: 'Spiked Mohawk', emoji: '🦔', cost: 1100, crowdBonus: 35 },
    { id: 'rock-crown', name: 'Crown of Rock', emoji: '👑', cost: 1300, crowdBonus: 40 },
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