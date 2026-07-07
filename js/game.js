const Game = (() => {
  const state = {
    screen: 'title',
    character: null,
    bandCash: 0,
    starMeter: 0,
    hasLid: false,
    tutorialStep: 0,
    inventories: {
      instruments: ['trash-lid'],
      clothes: [],
      makeup: [],
      accessories: [],
      songs: ['rebel-pulse'],
    },
    bandMembers: [],
    bandSlots: 1,
    currentVenue: 'street-corner',
    performance: null,
    pendingRecruit: null,
    equippedInstrument: 'trash-lid',
    equippedSong: 'rebel-pulse',
    equippedWear: { clothes: null, makeup: null, accessories: null },
    gigBandIds: [],
    hubPanelsOpen: {
      instruments: false,
      songs: false,
      clothes: false,
      makeup: false,
      accessories: false,
      band: false,
    },
    shopNotice: null,
    gigIntroRunning: false,
    suppressPerformUntil: 0,
    loadedSong: null,
    stemsReady: false,
    pendingGigResults: null,
    gigResultsShown: false,
    pendingGigEndMode: null,
  };

  let parallaxCleanup = null;
  let gigEndWatchdogInterval = null;
  let gigEndWatchdogStartedAt = 0;

  function getActiveInstrument() {
    const raw = state.equippedInstrument
      || state.inventories.instruments[state.inventories.instruments.length - 1]
      || 'trash-lid';
    const id = typeof migrateInstrumentId === 'function' ? migrateInstrumentId(raw) : raw;
    return INSTRUMENTS[id] || INSTRUMENTS['trash-lid'];
  }

  function getActiveSong() {
    if (state.loadedSong && state.loadedSong.id === (state.equippedSong || SongLoader?.getDefaultSongId?.())) {
      return state.loadedSong;
    }
    const id = state.equippedSong || (typeof SongLoader !== 'undefined' ? SongLoader.getDefaultSongId() : 'rebel-pulse');
    if (typeof SongLoader !== 'undefined') {
      const cached = SongLoader.getCached(id);
      if (cached) return cached;
    }
    return getSong(id);
  }

  async function ensureSongLoaded(songId) {
    const id = songId || state.equippedSong || SongLoader.getDefaultSongId();
    const song = await SongLoader.loadSong(id);
    state.loadedSong = song;
    return song;
  }

  function getPerformanceBpm() {
    return getActiveSong().bpm;
  }

  const INST_ANIM = {
    'trash-lid': 'anim-cymbal',
    drums: 'anim-drums',
    bass: 'anim-strum',
    'electric-guitar': 'anim-strum',
    keys: 'anim-keys',
  };

  const SUBTYPE_ANIM = {
    cymbal: 'anim-cymbal',
    drums: 'anim-drums',
    bass: 'anim-strum',
    electric: 'anim-strum',
    piano: 'anim-keys',
  };

  let activeHold = null;

  const REWIND_SECONDS = 5;
  const REWIND_ANIM_MS = REWIND_SECONDS * 1000;
  const GIG_COUNTDOWN_SEC = 4;
  const HOT_STREAK_COMBO = 10;
  const HOT_STREAK_MULT = 1.5;
  const SNAPSHOT_INTERVAL = 0.5;
  const SNAPSHOT_RETENTION = 12;
  let rewindSnapshots = [];
  let lastSnapshotAt = -1;
  let rewindCooldown = false;
  let rewindActive = false;
  let rewindAnimRaf = null;
  let playPointerId = null;
  let gigIntroToken = 0;

  function isHotStreak(p) {
    return !!p?.onFire;
  }

  function hotStreakMult(p) {
    return isHotStreak(p) ? HOT_STREAK_MULT : 1;
  }

  const ROLE_ANIM = {
    Lead: 'anim-strum',
    Guitar: 'anim-strum',
    Drums: 'anim-drums',
    Bass: 'anim-strum',
    Keys: 'anim-keys',
  };

  const ALL_ANIM_CLASSES = [
    'anim-cymbal', 'anim-shake', 'anim-drums', 'anim-strum',
    'anim-keys', 'anim-sing', 'anim-horn', 'anim-hit',
    'play-melodic', 'play-percussion', 'hit-flash',
  ];

  function getBandmateId(member) {
    if (member.id) return member.id;
    const found = typeof getBandmateByName === 'function' ? getBandmateByName(member.name) : null;
    return found?.id || 'riff';
  }

  function renderBandmateCharacter(member, size = 80) {
    return renderBandmate(getBandmateId(member), size);
  }

  function normalizeBandMembers() {
    state.bandMembers = state.bandMembers.map((m) => ({
      ...m,
      id: m.id || getBandmateId(m),
    }));
  }

  const WEAR_CATS = ['clothes', 'makeup', 'accessories'];

  function defaultHubPanelsOpen() {
    return {
      instruments: false,
      songs: false,
      clothes: false,
      makeup: false,
      accessories: false,
      band: false,
    };
  }

  function syncGigBandIds() {
    if (!state.gigBandIds) state.gigBandIds = [];
    const ids = state.bandMembers.map(getBandmateId);
    state.gigBandIds = state.gigBandIds.filter((id) => ids.includes(id));
    for (const id of ids) {
      if (!state.gigBandIds.includes(id)) state.gigBandIds.push(id);
    }
  }

  function getGigBandMembers() {
    syncGigBandIds();
    return state.bandMembers.filter((m) => state.gigBandIds.includes(getBandmateId(m)));
  }

  function toggleGigBandMember(id) {
    syncGigBandIds();
    const idx = state.gigBandIds.indexOf(id);
    if (idx >= 0) state.gigBandIds.splice(idx, 1);
    else state.gigBandIds.push(id);
    persist();
  }

  function dropBandMember(id) {
    const member = state.bandMembers.find((m) => getBandmateId(m) === id);
    if (!member) return false;
    if (!confirm(`Drop ${member.name} from your band? This frees a slot.`)) return false;
    state.bandMembers = state.bandMembers.filter((m) => getBandmateId(m) !== id);
    state.gigBandIds = (state.gigBandIds || []).filter((gid) => gid !== id);
    normalizeBandMembers();
    syncGigBandIds();
    persist();
    return true;
  }

  function getWearableItem(cat) {
    const id = state.equippedWear?.[cat];
    if (!id) return null;
    return SHOP_ITEMS[cat]?.find((i) => i.id === id) || null;
  }

  function renderHubPanel(key, title, countLabel, bodyHtml) {
    if (!state.hubPanelsOpen) state.hubPanelsOpen = defaultHubPanelsOpen();
    const open = !!state.hubPanelsOpen[key];
    return `
      <div class="inv-section hub-panel ${open ? 'open' : ''}" data-hub-panel="${key}">
        <button type="button" class="hub-panel-toggle" data-toggle-panel="${key}">
          <span class="hub-panel-chevron">▸</span>
          <span class="hub-panel-title">${title}</span>
          ${countLabel ? `<span class="hub-panel-count">${countLabel}</span>` : ''}
        </button>
        <div class="hub-panel-body">${bodyHtml}</div>
      </div>`;
  }

  function renderNoneChip(cat) {
    const equipped = !state.equippedWear?.[cat];
    return `<button type="button" class="inv-chip none-chip ${equipped ? 'equipped' : ''}" data-equip-cat="${cat}" data-equip="__none__" title="None">—</button>`;
  }

  function renderInventoryChips(cat) {
    const items = ownedItems(cat);
    const noneChip = WEAR_CATS.includes(cat) ? renderNoneChip(cat) : '';

    if (!items.length && !WEAR_CATS.includes(cat)) {
      return '<span class="inv-empty">Empty</span>';
    }

    const chips = items.map((i) => {
      const equipped = (cat === 'instruments' && state.equippedInstrument === i.id)
        || (cat === 'songs' && state.equippedSong === i.id)
        || (WEAR_CATS.includes(cat) && state.equippedWear?.[cat] === i.id);
      const equipAttr = (cat === 'instruments' || cat === 'songs' || WEAR_CATS.includes(cat)) ? i.id : '';
      const chipInner = cat === 'instruments' && INSTRUMENTS[i.id]
        ? (typeof renderInventoryItemThumb === 'function' ? renderInventoryItemThumb(cat, i, 36) : i.emoji)
        : `<span class="brand-card-icon">${i.emoji}</span>`;
      return `<button type="button" class="inv-chip ${equipped ? 'equipped' : ''}" data-equip-cat="${cat}" data-equip="${equipAttr}" title="${i.name}${equipped ? ' (on)' : ' — click to equip'}">${chipInner}</button>`;
    }).join('');

    return `<div class="inv-items">${noneChip}${chips}</div>`;
  }

  function renderGigLoadoutSummary({ compact } = {}) {
    const inst = getActiveInstrument();
    const song = getActiveSong();
    const gigBand = getGigBandMembers();

    if (compact) {
      const wearParts = WEAR_CATS.map((cat) => {
        const item = getWearableItem(cat);
        return item ? item.name : null;
      }).filter(Boolean);
      const bandPart = gigBand.length ? gigBand.map((m) => m.name).join(', ') : 'Solo';
      return [inst.name, song.name, ...wearParts, bandPart].join(' · ');
    }

    const wearRows = WEAR_CATS.map((cat) => {
      const label = cat.charAt(0).toUpperCase() + cat.slice(1);
      const item = getWearableItem(cat);
      const text = item ? `${item.emoji} ${item.name}` : 'None';
      return `<div class="loadout-row loadout-wear"><span class="loadout-label">${label}</span> <span>${text}</span></div>`;
    }).join('');

    const bandHtml = gigBand.length
      ? gigBand.map((m) => `
          <span class="loadout-band-member" title="${m.role}">
            ${renderBandmateCharacter(m, 28)}
            <span>${m.name}</span>
          </span>`).join('')
      : '<span class="loadout-solo">Solo</span>';

    return `
      <div class="loadout-row loadout-instrument">
        ${typeof renderShopInstrumentPreview === 'function' ? renderShopInstrumentPreview(inst, 32) : inst.emoji}
        <span>${inst.name}</span>
      </div>
      <div class="loadout-row"><span>${song.emoji}</span> ${song.name}</div>
      ${wearRows}
      <div class="loadout-row loadout-band">
        <span class="loadout-label">Band</span>
        <div class="loadout-band-list">${bandHtml}</div>
      </div>`;
  }

  function slotMax() {
    return typeof MAX_BAND_SLOTS !== 'undefined' ? MAX_BAND_SLOTS : 7;
  }

  function getSlotCosts() {
    const max = slotMax();
    if (typeof BAND_SLOT_COSTS !== 'undefined' && BAND_SLOT_COSTS.length >= max) {
      return BAND_SLOT_COSTS;
    }
    const costs = [0, 80, 200, 400];
    while (costs.length < max) {
      const tier = costs.length;
      const prev = costs[costs.length - 1];
      costs.push(Math.round(prev * 1.08 + tier * 35));
    }
    return costs;
  }

  function getBandSlotCount() {
    return Math.max(1, Math.floor(Number(state.bandSlots)) || 1);
  }

  function getOpenBandSlots() {
    return Math.max(0, getBandSlotCount() - state.bandMembers.length);
  }

  function canRecruitBandmate() {
    return getOpenBandSlots() > 0;
  }

  function nextBandSlotCost() {
    const slots = getBandSlotCount();
    if (slots >= slotMax()) return null;
    const costs = getSlotCosts();
    const cost = costs[slots];
    return cost != null ? cost : null;
  }

  function persist() {
    SaveManager.save(state);
  }

  function resetProgress() {
    state.character = null;
    state.bandCash = 0;
    state.starMeter = 0;
    state.hasLid = false;
    state.tutorialStep = 0;
    state.inventories = {
      instruments: ['trash-lid'],
      clothes: [],
      makeup: [],
      accessories: [],
      songs: [typeof SongLoader !== 'undefined' ? SongLoader.getDefaultSongId() : 'rebel-pulse'],
    };
    state.bandMembers = [];
    state.bandSlots = 1;
    state.currentVenue = 'street-corner';
    state.performance = null;
    state.pendingRecruit = null;
    state.equippedInstrument = 'trash-lid';
    state.equippedSong = typeof SongLoader !== 'undefined' ? SongLoader.getDefaultSongId() : 'rebel-pulse';
    state.loadedSong = null;
    state.equippedWear = { clothes: null, makeup: null, accessories: null };
    state.gigBandIds = [];
    state.hubPanelsOpen = defaultHubPanelsOpen();
    state.stemsReady = false;
  }

  const root = () => document.getElementById('screen-root');
  const hud = () => document.getElementById('hud');

  function updateHud() {
    document.getElementById('hud-cash').textContent = Math.floor(state.bandCash);
    document.getElementById('hud-stars').textContent = Math.floor(state.starMeter);
    const showHud = !['title', 'select'].includes(state.screen);
    hud().classList.toggle('hidden', !showHud);
  }

  function setScreen(name) {
    state.screen = name;
    if (name === 'shop') state.shopTab = state.shopTab || 'instruments';
    // Safety net: the stage curtain is a full-viewport overlay that's meant
    // to be interactive only mid-transition into a gig. If anything ever
    // leaves it in an active state (a missed edge case, an error mid-intro),
    // it would silently swallow every click on whatever screen is
    // underneath - looking exactly like "the buttons don't work". Since the
    // curtain should only ever be active while state.gigIntroRunning is true
    // and we're heading into 'perform', force it closed for every other
    // screen we land on.
    if (name !== 'perform' && !state.gigIntroRunning) {
      dismissStageCurtain();
    }
    updateHud();
    render();
  }

  function useStemHitAudio() {
    const song = getActiveSong();
    if (!song?.stemBacked || !state.stemsReady || typeof StemPlayer === 'undefined') return false;
    const stemKey = getPlayerStemForInstrument(getActiveInstrument());
    return StemPlayer.hasStem?.(stemKey) ?? false;
  }

  function isStemBackedGig() {
    const song = getActiveSong();
    return !!(song?.stemBacked && state.stemsReady);
  }

  function getPlayerStemForInstrument(inst) {
    return typeof getPlayerStemKey === 'function' ? getPlayerStemKey(inst) : getPlayerPartKey(inst);
  }

  function stopInstrumentSustain() {
    if (typeof StemPlayer !== 'undefined') StemPlayer.stopSustain();
  }

  function startInstrumentSustain(inst, note, volScale = 1) {
    if (!isStemBackedGig()) return;
    const song = getActiveSong();
    const p = state.performance;
    const stemKey = getPlayerStemForInstrument(inst);
    if (!StemPlayer.hasStem?.(stemKey)) return;
    StemPlayer.startSustain(stemKey, note, song, p?.bpm ?? song.bpm, volScale);
  }

  function playInstrumentHit(note, inst, volScale = 1) {
    if (!note) return false;
    const song = getActiveSong();
    if (!song?.stemBacked || typeof StemPlayer === 'undefined') return false;

    const stemKey = getPlayerStemForInstrument(inst);
    if (!StemPlayer.hasStem?.(stemKey)) return false;

    const p = state.performance;
    if (!state.stemsReady) return false;

    return StemPlayer.playHit(stemKey, note, song, p?.bpm ?? song.bpm, volScale);
  }

  function releasePerformInput() {
    onNoteRelease();
    activeHold = null;
    const playBtn = document.getElementById('btn-play-note');
    if (playBtn && playPointerId != null) {
      try { playBtn.releasePointerCapture(playPointerId); } catch { /* released */ }
    }
    playPointerId = null;
  }

  function abortGigIntro() {
    gigIntroToken += 1;
    state.gigIntroRunning = false;
  }

  function hideGigResultsOverlay() {
    const layer = document.getElementById('gig-results-layer');
    if (!layer) return;
    layer.classList.add('hidden');
    layer.setAttribute('aria-hidden', 'true');
    layer.innerHTML = '';
  }

  function openGigResultsOverlay(html) {
    const layer = document.getElementById('gig-results-layer');
    if (!layer) {
      root().innerHTML = html;
      bindEvents();
      return;
    }
    layer.innerHTML = html;
    layer.classList.remove('hidden');
    layer.setAttribute('aria-hidden', 'false');
    bindGigResultsExit(layer);
  }

  function bindGigResultsExit(layer) {
    if (!layer) return;
    layer.querySelectorAll('[data-action="back-hub"]').forEach((btn) => {
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
        setTimeout(() => exitGigToHub(), 0);
      };
    });
  }

  function teardownGigSession() {
    abortGigIntro();
    resetPerformanceTimers();
    if (typeof StemPlayer !== 'undefined') {
      StemPlayer.setOnFullMixEnd?.(null);
      StemPlayer.stopSustain();
      StemPlayer.stop();
    }
    state.performance = null;
    state.stemsReady = false;
    state.gigIntroRunning = false;
    activeHold = null;
    playPointerId = null;
    dismissStageCurtain();
  }

  const GIG_ACHIEVEMENT_DEFS = {
    hot_streak: { icon: '🔥', title: 'Hot Streak', desc: 'Crowd went wild on a combo run' },
    combo_king: { icon: '👑', title: 'Combo King', desc: 'Hit a combo of 15 or more' },
    perfectionist: { icon: '💎', title: 'Perfectionist', desc: 'Nailed 5 or more perfect hits' },
    crowd_favorite: { icon: '👥', title: 'Crowd Favorite', desc: 'Packed the venue floor' },
    big_earner: { icon: '💵', title: 'Big Earner', desc: 'Raked in serious BandCash' },
    venue_unlock: { icon: '🔓', title: 'Venue Unlocked', desc: 'A new stage is yours' },
    new_recruit: { icon: '🌟', title: 'New Bandmate', desc: 'Someone wants in your band' },
  };

  function computeGigAchievements(p, saved = null) {
    const cash = p ? Math.floor(p.sessionCash) : (saved?.sessionCash ?? 0);
    const peak = p ? Math.floor(p.peakCrowd) : (saved?.peakCrowd ?? 0);
    const crowdCap = p?.crowdCap ?? 20;
    const maxCombo = p?.maxCombo ?? saved?.maxCombo ?? 0;
    const perfectHits = p?.perfectHits ?? saved?.perfectHits ?? 0;
    const unlock = p?.newUnlock ?? saved?.newUnlock ?? null;
    const recruit = p?.recruitedThisGig ?? saved?.recruitedName ?? null;
    const earned = [];
    if (p?.hadHotStreak || saved?.hadHotStreak) earned.push('hot_streak');
    if (maxCombo >= 15) earned.push('combo_king');
    if (perfectHits >= 5) earned.push('perfectionist');
    if (peak >= crowdCap * 0.8) earned.push('crowd_favorite');
    if (cash >= 25) earned.push('big_earner');
    if (unlock) earned.push('venue_unlock');
    if (recruit) earned.push('new_recruit');
    return earned.map((id) => ({
      id,
      ...GIG_ACHIEVEMENT_DEFS[id],
      desc: id === 'venue_unlock' ? unlock : id === 'new_recruit' ? recruit : GIG_ACHIEVEMENT_DEFS[id].desc,
    }));
  }

  function snapshotPendingGigResults(p) {
    if (!p) return;
    state.pendingGigResults = {
      sessionCash: Math.floor(p.sessionCash),
      sessionStars: Math.floor(p.sessionStars),
      peakCrowd: Math.floor(p.peakCrowd),
      newUnlock: p.newUnlock || null,
      maxCombo: p.maxCombo || 0,
      perfectHits: p.perfectHits || 0,
      hadHotStreak: !!p.hadHotStreak,
      recruitedName: p.recruitedThisGig || null,
      achievements: computeGigAchievements(p),
    };
  }

  function isGigEndOverlayVisible() {
    const layer = document.getElementById('gig-results-layer');
    return !!(layer && !layer.classList.contains('hidden') && layer.innerHTML.trim());
  }

  function clearGigCompleteDelay(p) {
    if (p?.gigCompleteDelay) {
      clearTimeout(p.gigCompleteDelay);
      p.gigCompleteDelay = null;
    }
  }

  function clearGigEndWatchdog() {
    if (gigEndWatchdogInterval) {
      clearInterval(gigEndWatchdogInterval);
      gigEndWatchdogInterval = null;
    }
    gigEndWatchdogStartedAt = 0;
    state.pendingGigEndMode = null;
  }

  function startGigEndWatchdog() {
    gigEndWatchdogStartedAt = performance.now();
    if (gigEndWatchdogInterval) return;
    gigEndWatchdogInterval = setInterval(() => {
      if (state.gigResultsShown && isGigEndOverlayVisible()) {
        clearGigEndWatchdog();
        return;
      }
      const mode = state.pendingGigEndMode || 'results';
      presentGigEndScreen(mode);
      if (state.gigResultsShown && isGigEndOverlayVisible()) {
        clearGigEndWatchdog();
        return;
      }
      if (performance.now() - gigEndWatchdogStartedAt > 5000) {
        presentGigEndScreen(mode);
        clearGigEndWatchdog();
      }
    }, 200);
  }

  function presentGigEndScreen(mode) {
    if (state.gigResultsShown && isGigEndOverlayVisible()) return true;
    if (state.gigResultsShown && !isGigEndOverlayVisible()) {
      state.gigResultsShown = false;
    }

    const p = state.performance;
    if (p) {
      if (mode === 'booed') p.booed = true;
      snapshotPendingGigResults(p);
      p.rhythmActive = false;
      p.gigFinished = true;
      p.gigCompleting = false;
      clearGigCompleteDelay(p);
    } else if (!state.pendingGigResults) {
      return false;
    }

    const html = mode === 'booed' ? renderBooedMarkup() : renderResultsMarkup();
    openGigResultsOverlay(html);
    state.gigResultsShown = true;
    teardownGigSession();
    setScreen('hub');
    const layer = document.getElementById('gig-results-layer');
    if (layer) bindGigResultsExit(layer);
    clearGigEndWatchdog();
    return true;
  }

  function tryFinishGigCompletion() {
    const p = state.performance;
    if (!p?.gigCompleting || p.booed || state.gigResultsShown) return state.gigResultsShown;
    const waited = performance.now() - (p.gigCompleteAt || performance.now());
    if (waited < 400) return false;
    return completeGigResults();
  }

  function completeGigResults() {
    if (state.gigResultsShown) return true;
    const p = state.performance;
    if (!p && !state.pendingGigResults) return false;

    if (p) {
      clearGigCompleteDelay(p);
      p.gigCompleting = false;
      snapshotPendingGigResults(p);
      p.timeLeft = 0;
      const prevMax = VENUES.filter((v) => venueUnlocked(v)).length;
      updateHud();
      const newMax = VENUES.filter((v) => venueUnlocked(v)).length;
      if (newMax > prevMax) {
        const newest = VENUES.filter((v) => venueUnlocked(v)).pop();
        p.newUnlock = newest?.name;
        if (state.pendingGigResults) {
          state.pendingGigResults.newUnlock = newest?.name;
          state.pendingGigResults.achievements = computeGigAchievements(p, state.pendingGigResults);
        }
      }
      persist();
    }

    finishGigScreen('results');
    return state.gigResultsShown || isGigEndOverlayVisible();
  }

  function queueGigCompletion() {
    const p = state.performance;
    if (!p || p.booed || p.gigCompleting || state.gigResultsShown) return state.gigResultsShown;

    p.gigCompleting = true;
    p.gigCompleteAt = performance.now();
    p.timeLeft = 0;
    p.gigStuckSince = null;
    snapshotPendingGigResults(p);
    state.pendingGigEndMode = 'results';
    startGigEndWatchdog();

    const timer = document.getElementById('perf-timer');
    if (timer) timer.textContent = '⏱ 0s';

    clearGigCompleteDelay(p);
    p.gigCompleteDelay = setTimeout(() => {
      p.gigCompleteDelay = null;
      completeGigResults();
    }, 400);
    return true;
  }

  function syncGigTimerFromAudio() {
    const p = state.performance;
    if (!p?.backingStarted || p.booed || state.gigResultsShown || typeof StemPlayer === 'undefined') {
      return !!p?.gigCompleting;
    }
    if (p.gigCompleting) return true;

    const dur = p.gigDurationSec ?? StemPlayer.getDuration?.() ?? 60;
    const elapsed = StemPlayer.getElapsed?.() ?? 0;
    const remaining = Math.max(0, dur - elapsed);
    p.timeLeft = Math.max(0, Math.ceil(remaining));

    if (StemPlayer.hasPlaybackEnded?.() || remaining <= 0.05) {
      return queueGigCompletion();
    }

    if (p.gigAudioWallStart) {
      const wallElapsed = (performance.now() - p.gigAudioWallStart) / 1000;
      if (wallElapsed >= dur + 3) return queueGigCompletion();
    }

    const audioStoppedEarly = !StemPlayer.isRunning?.()
      && !StemPlayer.hasPlaybackEnded?.()
      && p.timeLeft <= 1;
    if (audioStoppedEarly) {
      p.gigStuckSince = p.gigStuckSince ?? performance.now();
      if (performance.now() - p.gigStuckSince >= 3000) return queueGigCompletion();
    } else {
      p.gigStuckSince = null;
    }

    return false;
  }

  function finishGigScreen(screenName) {
    if (screenName !== 'results' && screenName !== 'booed') return;
    releasePerformInput();
    dismissStageCurtain();
    const mode = screenName === 'booed' ? 'booed' : 'results';
    state.pendingGigEndMode = mode;
    startGigEndWatchdog();
    presentGigEndScreen(mode);
  }

  function startPerformanceBacking() {
    const p = state.performance;
    if (!p || p.backingStarted || !state.stemsReady || typeof StemPlayer === 'undefined') return;

    const song = getActiveSong();
    const inst = getActiveInstrument();
    const stemKey = getPlayerStemForInstrument(inst);
    const audioOffset = 0;
    p.audioStartOffset = audioOffset;

    StemPlayer.setPlayerStem(stemKey);
    StemPlayer.setPlayerStemAudible?.(true);
    if (StemPlayer.startPerformance(stemKey, audioOffset)) {
      p.backingStarted = true;
      p.gigDurationSec = StemPlayer.getDuration?.() || song.durationSec || 60;
      p.gigAudioWallStart = performance.now();
      p.timeLeft = Math.max(0, Math.ceil(p.gigDurationSec));
      p.gigCompleting = false;
      p.gigCompleteDelay = null;
      StemPlayer.setOnFullMixEnd?.(() => {
        setTimeout(() => queueGigCompletion(), 0);
      });
    }
  }

  function exitGigToHub() {
    clearGigEndWatchdog();
    hideGigResultsOverlay();
    teardownGigSession();
    AudioEngine.setCrowdBooing?.(false);
    state.suppressPerformUntil = performance.now() + 1500;
    state.pendingGigResults = null;
    state.gigResultsShown = false;
    persist();
    setScreen('hub');
  }

  function resetPerformanceTimers() {
    Metronome.stop();
    BandAudio.stop();
    if (typeof StemPlayer !== 'undefined') StemPlayer.stopSustain();
    AudioEngine.stopRewindSfx?.();
    AudioEngine.stopCrowdAmbience?.();
    AudioEngine.setCrowdBooing?.(false);
    activeHold = null;
    rewindSnapshots = [];
    lastSnapshotAt = -1;
    rewindCooldown = false;
    rewindActive = false;
    if (rewindAnimRaf) cancelAnimationFrame(rewindAnimRaf);
    rewindAnimRaf = null;
    Metronome.setBeatSuspended?.(false);
    if (state.perfUiRaf) cancelAnimationFrame(state.perfUiRaf);
    state.perfUiRaf = null;
    if (state.perfInterval) clearInterval(state.perfInterval);
    state.perfInterval = null;
  }

  function crowdAppeal() {
    let bonus = 0;
    // Equipped gear counts at full value — it's what's actually on stage.
    // Owned-but-benched items still count a little (so shopping isn't wasted),
    // but the loadout choice is what should really move the needle.
    const equippedIds = [
      state.equippedInstrument,
      state.equippedSong,
      state.equippedWear?.clothes,
      state.equippedWear?.makeup,
      state.equippedWear?.accessories,
    ].filter(Boolean);

    for (const cat of Object.keys(state.inventories)) {
      for (const itemId of state.inventories[cat]) {
        const item = SHOP_ITEMS[cat].find((i) => i.id === itemId);
        if (!item) continue;
        bonus += equippedIds.includes(itemId) ? item.crowdBonus : item.crowdBonus * 0.15;
      }
    }
    bonus += getGigBandMembers().length * 8;
    return bonus;
  }

  function ownedItems(cat) {
    return SHOP_ITEMS[cat].filter((i) => state.inventories[cat].includes(i.id));
  }

  function buyItem(cat, itemId) {
    const item = SHOP_ITEMS[cat].find((i) => i.id === itemId);
    if (!item || state.inventories[cat]?.includes(itemId)) return false;
    if (state.bandCash < item.cost) return false;
    if (!state.inventories[cat]) state.inventories[cat] = [];
    state.bandCash -= item.cost;
    state.inventories[cat].push(itemId);
    if (cat === 'instruments') state.equippedInstrument = itemId;
    if (cat === 'songs') {
      state.equippedSong = itemId;
      state.loadedSong = null;
      state.stemsReady = false;
    }
    if (['clothes', 'makeup', 'accessories'].includes(cat)) {
      state.equippedWear = state.equippedWear || { clothes: null, makeup: null, accessories: null };
      state.equippedWear[cat] = itemId;
    }
    updateHud();
    persist();
    return true;
  }

  function buyBandSlot() {
    const slots = getBandSlotCount();
    const nextCost = nextBandSlotCost();
    if (nextCost === null || state.bandCash < nextCost) return false;
    state.bandCash -= nextCost;
    state.bandSlots = slots + 1;
    state.shopNotice = `Band slot purchased! ${getOpenBandSlots()} open slot${getOpenBandSlots() === 1 ? '' : 's'} available.`;
    updateHud();
    persist();
    return true;
  }

  function acceptRecruit() {
    if (!state.pendingRecruit) return false;
    if (!canRecruitBandmate()) return false;
    state.bandMembers.push(state.pendingRecruit);
    normalizeBandMembers();
    syncGigBandIds();
    state.starMeter += 5;
    state.pendingRecruit = null;
    updateHud();
    persist();
    return true;
  }

  function venueUnlocked(venue) {
    return state.starMeter >= venue.starRequired;
  }

  function renderTitle() {
    const hasSave = SaveManager.hasSave();
    const idleChar = state.character
      ? renderCharacter(state.character, 180, { instrument: INSTRUMENTS['trash-lid'] })
      : renderCharacter('benny', 180, { instrument: INSTRUMENTS['trash-lid'] });
    return `
      <section class="screen title-screen">
        <div class="title-bg"></div>
        <div class="title-content">
          <img src="assets/brand/bandland-logo.png" alt="" class="brand-logo-hero" />
          <p class="subtitle">From trash can lids to sold-out shows.</p>
          <div class="title-idle-character" id="title-idle-char">${idleChar}</div>
          <div class="title-actions">
            ${hasSave ? '<button class="btn btn-primary btn-lg" id="btn-continue">Continue</button>' : ''}
            <button class="btn ${hasSave ? 'btn-secondary' : 'btn-primary'} btn-lg" id="btn-start">Start Your Journey</button>
          </div>
        </div>
        <div class="title-notes">🎵 🥁 🎸 ⭐</div>
      </section>
    `;
  }

  function renderSelect() {
    return `
      <section class="screen select-screen">
        <h2>Pick Your Star</h2>
        <p class="screen-desc">Two monsters. One dream. Infinite gigs.</p>
        <div class="character-grid">
          ${['benny', 'lizzy'].map((id) => {
            const c = CHARACTERS[id];
            return `
              <button class="character-card" data-character="${id}">
                <div class="character-preview">${c.render(160)}</div>
                <h3>${c.name}</h3>
                <p>${c.tagline}</p>
              </button>
            `;
          }).join('')}
        </div>
      </section>
    `;
  }

  function renderTutorial() {
    const char = CHARACTERS[state.character];
    if (state.tutorialStep === 0) {
      return `
        <section class="screen story-screen venue-street">
          <div class="story-panel row-layout">
            <div class="story-character">${char.render(140)}</div>
            <div class="story-text">
              <h2>The Corner of the Street</h2>
              <p>${char.name} arrives at their first venue, heart pounding. The crowd could be huge… if they had something to play.</p>
              <p class="muted">But wait — there's no instrument!</p>
              <button class="btn btn-primary" id="btn-tutorial-next">Look Around</button>
            </div>
          </div>
        </section>
      `;
    }

    return `
      <section class="screen story-screen venue-street">
        <div class="story-panel">
          <div class="lid-scene">
            <div class="trash-can">🗑️</div>
            <button class="lid-btn" id="btn-tap-lid" title="Tap the lid!">
              <span class="lid-icon">🔘</span>
              <span class="lid-label">Metal Lid</span>
            </button>
            <div class="story-character small">${renderCharacter(state.character, 100, { instrument: INSTRUMENTS['trash-lid'] })}</div>
          </div>
          <div class="story-text">
            <h2>Found It!</h2>
            <p>A metal trash can lid, just sitting there. ${char.name} taps it gently… <em>CRASH!</em></p>
            <p class="muted" id="lid-hint">👆 Tap the lid to hear it!</p>
          </div>
        </div>
      </section>
    `;
  }

  function renderHub() {
    const char = CHARACTERS[state.character] || CHARACTERS.benny;
    const appeal = crowdAppeal();

    const venueCards = VENUES.map((v) => {
      const unlocked = venueUnlocked(v);
      return `
        <button class="venue-card ${unlocked ? '' : 'locked'} ${state.currentVenue === v.id ? 'active' : ''}"
                data-venue="${v.id}" ${unlocked ? '' : 'disabled'}>
          <span class="venue-emoji">${v.emoji}</span>
          <span class="venue-name">${v.name}</span>
          ${unlocked
            ? `<span class="venue-meta">×${v.tipMultiplier} tips</span>`
            : `<span class="venue-lock">🔒 ${v.starRequired} ★</span>`}
        </button>
      `;
    }).join('');

    const inventorySections = ['instruments', 'songs', 'clothes', 'makeup', 'accessories'].map((cat) => {
      const items = ownedItems(cat);
      const label = cat === 'songs' ? 'Songs' : cat.charAt(0).toUpperCase() + cat.slice(1);
      return renderHubPanel(cat, label, `(${items.length})`, renderInventoryChips(cat));
    }).join('');

    const openSlots = getOpenBandSlots();
    const slotCount = getBandSlotCount();
    syncGigBandIds();
    const gigBand = getGigBandMembers();
    const gigCount = gigBand.length;
    const rosterCount = state.bandMembers.length;

    const bandBody = `
      <p class="band-open-slots">${openSlots} open slot${openSlots === 1 ? '' : 's'} · play gigs to recruit</p>
      <div class="band-roster-gig">
        ${state.bandMembers.map((m) => {
          const id = getBandmateId(m);
          const forGig = state.gigBandIds.includes(id);
          return `
            <div class="band-member-row ${forGig ? 'gig-active' : ''}">
              <button type="button" class="gig-toggle-btn ${forGig ? 'active' : ''}" data-gig-toggle="${id}" title="${forGig ? 'Playing this gig' : 'Bench for this gig'}">${forGig ? '✓' : '○'}</button>
              <div class="bandmate-chip" title="${m.role}">
                ${renderBandmateCharacter(m, 52)}
                <span>${m.name}</span>
              </div>
              <button type="button" class="btn-drop-member" data-drop-member="${id}" title="Drop from band">✕</button>
            </div>`;
        }).join('')}
        ${Array.from({ length: openSlots }, () => `
          <div class="bandmate-chip empty-slot" title="Open slot — recruit during gigs">
            <div class="empty-slot-icon">➕</div>
            <span>Open</span>
          </div>`).join('')}
        ${!state.bandMembers.length && !openSlots
          ? '<span class="inv-empty">Solo act</span>'
          : ''}
      </div>`;

    const bandSection = renderHubPanel(
      'band',
      'Band',
      `(${gigCount}/${rosterCount} gig · ${rosterCount}/${slotCount})`,
      bandBody,
    );

    const inst = getActiveInstrument();
    const loadoutCompact = renderGigLoadoutSummary({ compact: true });

    return `
      <section class="screen hub-screen">
        <div class="hub-layout">
          <aside class="hub-sidebar">
            <div class="hub-character">${renderCharacter(state.character, 120, { instrument: inst, equippedWear: state.equippedWear })}</div>
            <p class="hub-name">${char.name}</p>
            <p class="hub-appeal">Crowd Appeal: <strong>+${appeal}</strong></p>
            <div class="hub-loadout">
              <h4>Gig Loadout</h4>
              ${renderGigLoadoutSummary()}
            </div>
            ${inventorySections}
            ${bandSection}
          </aside>

          <div class="hub-main">
            <div class="hub-venue-preview">
              ${renderVenueBackdrop(state.currentVenue)}
              <div class="hub-venue-label">${VENUES.find((v) => v.id === state.currentVenue)?.name || 'Venue'}</div>
            </div>
            <h2>Choose Your Venue</h2>
            <div class="venue-grid">${venueCards}</div>

            <div class="hub-actions">
              <button class="btn btn-primary btn-lg" id="btn-perform">
                <span class="gig-loadout-preview">${typeof renderShopInstrumentPreview === 'function' ? renderShopInstrumentPreview(inst, 36) : inst.emoji}</span>
                <span class="gig-loadout-text">Play Gig<br><small>${loadoutCompact}</small></span>
              </button>
              <button class="btn btn-secondary" id="btn-shop">🛍️ Shop</button>
            </div>
          </div>
        </div>

        ${state.pendingRecruit && !state.gigResultsShown ? renderRecruitModal() : ''}
      </section>
    `;
  }

  function renderRecruitModal() {
    const r = state.pendingRecruit;
    const openSlots = getOpenBandSlots();
    const full = openSlots <= 0;
    const slotCount = getBandSlotCount();
    return `
      <div class="modal-overlay">
        <div class="modal recruit-modal">
          <div class="recruit-preview">${renderBandmateCharacter(r, 130)}</div>
          <h3>🌟 Someone Wants In!</h3>
          <p><strong>${r.name}</strong> (${r.role}) wants to join your band!</p>
          ${full
            ? `<p class="warn">No open band slots! Buy a slot in the shop. (${state.bandMembers.length}/${slotCount} filled)</p>`
            : `<p>${openSlots} open slot${openSlots === 1 ? '' : 's'} — they'll boost your crowd and star power.</p>`}
          <div class="modal-actions">
            ${full ? '' : `<button class="btn btn-primary" id="btn-accept-recruit">Welcome Aboard!</button>`}
            <button class="btn btn-ghost" id="btn-decline-recruit">Not Now</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderShopBandSlots() {
    const max = slotMax();
    const slotCount = getBandSlotCount();
    const costs = getSlotCosts();
    const nextCost = nextBandSlotCost();
    const atMax = slotCount >= max;
    const members = state.bandMembers;

    return Array.from({ length: max }, (_, idx) => {
      const slotNum = idx + 1;
      const member = members[idx];

      if (member) {
        return `
          <div class="shop-band-slot brand-card filled">
            <div class="bandmate-chip" title="${member.role}">
              ${renderBandmateCharacter(member, 52)}
              <span>${member.name}</span>
            </div>
            <span class="shop-slot-label">Slot ${slotNum}</span>
          </div>`;
      }

      if (slotNum <= slotCount) {
        return `
          <div class="shop-band-slot brand-card open">
            <div class="bandmate-chip empty-slot" title="Open slot — recruit during gigs">
              <div class="empty-slot-icon">➕</div>
              <span>Open</span>
            </div>
            <span class="shop-slot-label">Slot ${slotNum}</span>
          </div>`;
      }

      if (slotNum === slotCount + 1 && !atMax && nextCost != null) {
        return `
          <div class="shop-band-slot brand-card locked-next">
            <span class="brand-card-icon brand-card-icon-lg">🔒</span>
            <div class="shop-info">
              <strong class="brand-label">Slot ${slotNum}</strong>
              <span>Unlock band member slot</span>
            </div>
            <button class="btn btn-buy" data-buy-slot="1" ${state.bandCash < nextCost ? 'disabled' : ''}>$${nextCost}</button>
          </div>`;
      }

      const unlockCost = costs[slotNum - 1];
      return `
        <div class="shop-band-slot brand-card locked">
          <span class="brand-card-icon">🔒</span>
          <div class="shop-info">
            <strong class="brand-label">Slot ${slotNum}</strong>
            <span>${unlockCost != null ? `$${unlockCost} when unlocked` : 'Locked'}</span>
          </div>
          <span class="owned-badge">LOCKED</span>
        </div>`;
    }).join('');
  }

  function renderShop() {
    const tabs = ['instruments', 'songs', 'clothes', 'makeup', 'accessories', 'band'];
    const tabButtons = tabs.map((t) => `
      <button class="shop-tab ${state.shopTab === t ? 'active' : ''}" data-tab="${t}">
        ${t === 'band' ? '👥 Band Slots' : t === 'songs' ? '🎵 Songs' : t === 'instruments' ? `🎸 Instruments (${SHOP_ITEMS.instruments.length})` : t.charAt(0).toUpperCase() + t.slice(1)}
      </button>
    `).join('');

    let content = '';
    if (state.shopTab === 'band') {
      const openSlots = getOpenBandSlots();
      const slotCount = getBandSlotCount();
      const atMax = slotCount >= slotMax();
      content = `
        <div class="shop-list shop-band-list">
          ${state.shopNotice ? `<p class="shop-notice">${state.shopNotice}</p>` : ''}
          <p class="shop-band-summary">${state.bandMembers.length} bandmates · ${openSlots} open · ${slotCount} / ${slotMax()} slots${atMax ? ' · MAX' : ''}</p>
          <div class="shop-band-grid">${renderShopBandSlots()}</div>
        </div>
      `;
    } else {
      const items = SHOP_ITEMS[state.shopTab];
      content = `
        <div class="shop-list">
          ${items.map((item) => {
            const owned = state.inventories[state.shopTab].includes(item.id);
            const instObj = state.shopTab === 'instruments' ? INSTRUMENTS[item.id] : null;
            const preview = typeof renderShopItemPreview === 'function'
              ? renderShopItemPreview(state.shopTab, item, 72)
              : `<span class="brand-card-icon brand-card-icon-lg">${item.emoji}</span>`;
            const previewInst = instObj ? item.id : '';
            return `
              <div class="shop-item brand-card ${owned ? 'owned' : ''}">
                <button type="button" class="shop-preview-btn" data-preview-inst="${previewInst}" data-preview-cat="${state.shopTab}" title="${item.name}">${preview}</button>
                <div class="shop-info">
                  <strong class="brand-label">${item.name}</strong>
                  <span>+${item.crowdBonus} crowd appeal</span>
                </div>
                ${owned
                  ? '<span class="owned-badge">OWNED</span>'
                  : `<button class="btn btn-buy" data-buy-cat="${state.shopTab}" data-buy-id="${item.id}" ${state.bandCash < item.cost ? 'disabled' : ''}>$${item.cost}</button>`}
              </div>
            `;
          }).join('')}
        </div>
      `;
    }

    return `
      <section class="screen shop-screen">
        <div class="shop-header">
          <button class="btn btn-ghost" data-action="back-hub">← Back</button>
          <img src="assets/brand/bandland-logo.png" alt="Bandland" class="brand-logo" />
          <h2 class="brand-label">Shop</h2>
        </div>
        <div class="shop-tabs">${tabButtons}</div>
        ${content}
      </section>
    `;
  }

  function renderStageLineup(inst) {
    const gigBand = getGigBandMembers();
    const left = gigBand.filter((_, i) => i % 2 === 0);
    const right = gigBand.filter((_, i) => i % 2 === 1);
    const leftHtml = left.map((m, i) => `
      <div class="lineup-slot side" id="bandmate-${getBandmateId(m)}" style="--slot:${i}">
        ${renderBandmateCharacter(m, 88)}
      </div>`).join('');
    const rightHtml = right.map((m, i) => `
      <div class="lineup-slot side" id="bandmate-${getBandmateId(m)}" style="--slot:${i}">
        ${renderBandmateCharacter(m, 88)}
      </div>`).join('');
    return `
      <div class="stage-lineup">
        <div class="lineup-side left">${leftHtml}</div>
        <div class="lineup-slot lead" id="performer">${renderCharacter(state.character, 150, { instrument: inst, equippedWear: state.equippedWear })}</div>
        <div class="lineup-side right">${rightHtml}</div>
      </div>`;
  }

  function renderPerformance() {
    const venue = VENUES.find((v) => v.id === state.currentVenue);
    const song = getActiveSong();
    const p = state.performance;
    const inst = getActiveInstrument();
    const isMelodic = inst.type === 'melodic';
    const cheerPct = Math.min(100, (p.cheer / p.cheerGoal) * 100);
    const crowdPct = Math.min(100, (p.crowd / p.crowdCap) * 100);

    const crowdHtml = Array.from({ length: Math.min(p.crowd, 20) }, (_, i) =>
      `<div class="crowd-person" style="--delay:${i * 0.05}s">${renderCrowdMember(i)}</div>`
    ).join('');

    return `
      <section class="screen perform-screen ${venue.bg} stage-mounting">
        ${renderVenueBackdrop(venue.id)}
        <div class="perform-content">
        <div class="perform-header">
          <h2>${venue.emoji} ${venue.name}</h2>
          <div class="perform-timer" id="perf-timer">⏱ ${p.timeLeft}s</div>
        </div>

        <div class="perform-stage">
          <div class="crowd-row" id="crowd-row">${crowdHtml}</div>
          ${typeof renderStageLighting === 'function' ? renderStageLighting(venue.tier ?? 0) : '<div class="stage-lights"></div>'}
          <div class="performer-wrap ${p.onFire ? 'band-on-fire' : ''}">
            ${renderStageLineup(inst)}
            <div class="performer-stack">
              ${RhythmLane.renderHtml(song.name)}
              <div class="play-controls">
                <button type="button" class="rewind-btn" id="btn-rewind" title="Rewind 5 seconds" disabled>
                  <span aria-hidden="true">⏪</span>
                  <span>5s</span>
                </button>
                <button class="play-btn" id="btn-play-note">
                  <span class="instrument-emoji">${inst.emoji}</span>
                  <span>PLAY ${inst.name.toUpperCase()}!</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="perform-meters">
          <div class="meter">
            <label>Crowd <span id="crowd-label">${Math.floor(p.crowd)}/${p.crowdCap}</span></label>
            <div class="meter-bar"><div class="meter-fill crowd-fill" id="crowd-fill" style="width:${crowdPct}%"></div></div>
          </div>
          <div class="meter">
            <label>Cheer <span id="cheer-label">${Math.floor(p.cheer)}/${p.cheerGoal}</span></label>
            <div class="meter-bar"><div class="meter-fill cheer-fill" id="cheer-fill" style="width:${cheerPct}%"></div></div>
          </div>
        </div>

        <div class="perform-floaters" id="floaters"></div>
        <div class="perform-footer">
          <span class="gig-cash" id="gig-cash">+${Math.floor(p.sessionCash)} BandCash this gig</span>
        </div>
        </div>
      </section>
    `;
  }

  function renderBooedMarkup() {
    const p = state.performance;
    const saved = state.pendingGigResults;
    const keptCash = p ? Math.floor(p.sessionCash) : (saved?.sessionCash ?? 0);
    const achievements = computeGigAchievements(p, saved).filter((a) => a.id !== 'venue_unlock');
    return `
      <section class="screen booed-screen">
        <div class="booed-overlay">
          <h1 class="booed-title">YOU GOT BOOED OFF STAGE</h1>
          <p class="booed-sub">Five misses in a row — the crowd wasn't feeling it.</p>
          ${keptCash > 0 ? `<p class="booed-sub">You kept <strong>${keptCash}</strong> BandCash from this gig.</p>` : ''}
          ${achievements.length ? `
            <div class="achievements-section booed-achievements">
              <h3 class="achievements-heading">Before the Boo</h3>
              ${renderAchievementsMarkup(achievements)}
            </div>` : ''}
          <p class="booed-tip">Keep practicing those gems and come back stronger!</p>
          <button type="button" class="btn btn-primary btn-lg" id="btn-back-hub-booed" data-action="back-hub">Back to Map</button>
        </div>
      </section>
    `;
  }

  function renderBooed() {
    return renderBooedMarkup();
  }

  function renderAchievementsMarkup(achievements) {
    if (!achievements?.length) {
      return '<p class="achievements-empty">Solid gig — keep building that streak!</p>';
    }
    return `
      <div class="achievements-grid">
        ${achievements.map((a) => `
          <div class="achievement-badge" data-achievement="${a.id}">
            <span class="achievement-icon">${a.icon}</span>
            <strong class="achievement-title">${a.title}</strong>
            <small class="achievement-desc">${a.desc}</small>
          </div>
        `).join('')}
      </div>`;
  }

  function renderResultsMarkup() {
    const p = state.performance;
    const saved = state.pendingGigResults;
    const cash = p ? Math.floor(p.sessionCash) : (saved?.sessionCash ?? 0);
    const stars = p ? Math.floor(p.sessionStars) : (saved?.sessionStars ?? 0);
    const peak = p ? Math.floor(p.peakCrowd) : (saved?.peakCrowd ?? 0);
    const achievements = saved?.achievements?.length
      ? saved.achievements
      : computeGigAchievements(p, saved);
    return `
      <section class="screen results-screen">
        <h2>Gig Complete! 🎉</h2>
        <div class="results-grid">
          <div class="result-card"><span>💵</span><strong>+${cash}</strong><small>BandCash</small></div>
          <div class="result-card"><span>⭐</span><strong>+${stars}</strong><small>Star Meter</small></div>
          <div class="result-card"><span>👥</span><strong>${peak}</strong><small>Peak Crowd</small></div>
        </div>
        <div class="achievements-section">
          <h3 class="achievements-heading">Achievements</h3>
          ${renderAchievementsMarkup(achievements)}
        </div>
        <button type="button" class="btn btn-primary btn-lg" id="btn-back-hub-results" data-action="back-hub">Back to Map</button>
      </section>
    `;
  }

  function renderResults() {
    return renderResultsMarkup();
  }

  function renderTune() {
    const ids = Object.keys(INSTRUMENTS);
    const id = state.tuneInstId || ids[0];
    const inst = INSTRUMENTS[id];
    const charId = state.character || 'benny';
    const options = ids.map((i) =>
      `<option value="${i}" ${i === id ? 'selected' : ''}>${INSTRUMENTS[i].name}</option>`
    ).join('');
    return `
      <section class="screen tune-screen">
        <h2 class="brand-label">Instrument Grip Preview</h2>
        <p class="tune-hint-text">Use <code>?tune=1</code> or <code>tools/tune-instrument-grip.html</code> to fine-tune hand positions for all 4 instruments.</p>
        <select id="tune-inst-select" class="tune-select">${options}</select>
        <div class="tune-preview-wrap">${renderCharacter(charId, 200, { instrument: inst })}</div>
        <button class="btn btn-primary" id="btn-back-title">Back to Title</button>
      </section>`;
  }

  function updateHubVenueSelection() {
    if (state.screen !== 'hub') return false;
    const venue = VENUES.find((v) => v.id === state.currentVenue);
    if (!venue) return false;

    document.querySelectorAll('.venue-card:not(.locked)').forEach((btn) => {
      const isActive = btn.dataset.venue === state.currentVenue;
      btn.classList.toggle('active', isActive);
      if (isActive) {
        btn.classList.remove('venue-just-selected');
        void btn.offsetWidth;
        btn.classList.add('venue-just-selected');
        setTimeout(() => btn.classList.remove('venue-just-selected'), 400);
      }
    });

    const preview = document.querySelector('.hub-venue-preview');
    if (!preview) return false;
    preview.innerHTML = `${renderVenueBackdrop(state.currentVenue)}<div class="hub-venue-label">${venue.name}</div>`;

    if (parallaxCleanup) parallaxCleanup();
    parallaxCleanup = initVenueParallax(preview) || null;

    return true;
  }

  function render() {
    state.shopTab = state.shopTab || 'instruments';
    let html = '';
    switch (state.screen) {
      case 'title': html = renderTitle(); break;
      case 'select': html = renderSelect(); break;
      case 'tutorial': html = renderTutorial(); break;
      case 'hub': html = renderHub(); break;
      case 'shop': html = renderShop(); break;
      case 'perform': html = renderPerformance(); break;
      case 'results': html = renderResults(); break;
      case 'booed': html = renderBooed(); break;
      case 'tune': html = renderTune(); break;
      default: html = renderTitle();
    }
    root().innerHTML = html;
    bindEvents();
    if (parallaxCleanup) parallaxCleanup();
    parallaxCleanup = null;
    if (['hub', 'perform'].includes(state.screen)) {
      const parallaxRoot = state.screen === 'hub'
        ? document.querySelector('.hub-venue-preview')
        : document.querySelector('.perform-screen');
      if (parallaxRoot) parallaxCleanup = initVenueParallax(parallaxRoot);
    }
    if (state.screen === 'title') {
      startTitleIdleAnimation();
    }
    syncPerformerInstrumentPose();
  }

  function syncPerformerInstrumentPose() {
    if (!['hub', 'perform', 'tune'].includes(state.screen)) return;
    let performer = document.getElementById('performer');
    if (!performer && state.screen === 'hub') {
      performer = document.querySelector('.hub-character .character-layered');
    }
    if (!performer && state.screen === 'tune') {
      performer = document.querySelector('.tune-preview-wrap .character-layered');
    }
    const inst = getActiveInstrument();
    if (!performer || !inst || typeof CharacterRig === 'undefined') return;
    requestAnimationFrame(() => {
      CharacterRig.syncInstrumentPose(performer, inst);
    });
  }

  function triggerPlayPress(inst) {
    const performer = document.getElementById('performer');
    if (!performer || !inst || typeof CharacterRig === 'undefined') return;
    CharacterRig.playInstrumentPress(performer, inst);
  }

  function triggerPlayRelease(inst) {
    const performer = document.getElementById('performer');
    if (!performer || typeof CharacterRig === 'undefined') return;
    CharacterRig.playInstrumentRelease(performer, inst);
  }

  let titleIdleTimer = null;

  function startTitleIdleAnimation() {
    if (titleIdleTimer) clearInterval(titleIdleTimer);
    const el = document.getElementById('title-idle-char');
    if (!el) return;
    titleIdleTimer = setInterval(() => {
      const charEl = el.querySelector('.character-layered');
      if (!charEl) return;
      charEl.classList.remove('anim-cymbal');
      void charEl.offsetWidth;
      charEl.classList.add('anim-cymbal');
    }, 2400);
  }

  let navigationListenerAttached = false;

  function navigateBackToHub() {
    const layer = document.getElementById('gig-results-layer');
    const resultsOpen = layer && !layer.classList.contains('hidden');
    if (resultsOpen || state.gigResultsShown) {
      exitGigToHub();
      return;
    }
    setScreen('hub');
  }

  function onBackHubNavigation(e) {
    const resultsBtn = e.target.closest('#gig-results-layer [data-action="back-hub"]');
    if (resultsBtn) {
      e.preventDefault();
      e.stopPropagation();
      if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
      setTimeout(() => exitGigToHub(), 0);
      return;
    }
    const backBtn = e.target.closest('[data-action="back-hub"]');
    if (!backBtn) return;
    e.preventDefault();
    e.stopPropagation();
    if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
    setTimeout(() => navigateBackToHub(), 0);
  }

  function bindBackToHubButtons() {
    root().querySelectorAll('[data-action="back-hub"]').forEach((btn) => {
      btn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
        setTimeout(() => navigateBackToHub(), 0);
      };
    });
  }

  // Every clickable control in this game is a real <button>, so a single
  // selector covers navigation, selection chips, tabs, toggles, back
  // buttons, etc. - and automatically covers any button added later too.
  const UI_CLICK_SELECTOR = 'button';
  // Buttons that already trigger their own distinct sound effect on press -
  // adding the generic UI click on top would just muddy those cues.
  const UI_CLICK_EXCLUDE_IDS = new Set(['btn-play-note', 'btn-tap-lid']);

  function bindEvents() {
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => document.querySelectorAll(sel);

    if (!navigationListenerAttached) {
      document.addEventListener('click', onBackHubNavigation, true);
      document.addEventListener('keydown', (e) => {
        if (e.key !== 'Escape') return;
        const layer = document.getElementById('gig-results-layer');
        if (layer && !layer.classList.contains('hidden')) exitGigToHub();
      });
      document.addEventListener('click', (e) => {
        const shopPreview = e.target.closest('.shop-preview-btn[data-preview-inst]');
        if (shopPreview) e.stopPropagation();
      });
      document.addEventListener('click', (e) => {
        const el = e.target.closest(UI_CLICK_SELECTOR);
        if (!el || el.disabled || UI_CLICK_EXCLUDE_IDS.has(el.id)) return;
        AudioEngine.playUIClick?.();
      });
      navigationListenerAttached = true;
    }

    bindBackToHubButtons();

    $('#btn-start')?.addEventListener('click', () => {
      SaveManager.clear();
      resetProgress();
      setScreen('select');
    });

    $('#btn-continue')?.addEventListener('click', () => {
      const data = SaveManager.load();
      if (SaveManager.apply(state, data)) {
        normalizeBandMembers();
        syncGigBandIds();
        state.tutorialStep = state.hasLid ? 1 : 0;
        setScreen(state.hasLid ? 'hub' : 'tutorial');
      }
    });

    $$('.character-card').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.character = btn.dataset.character;
        state.tutorialStep = 0;
        persist();
        setScreen('tutorial');
      });
    });

    $('#btn-tutorial-next')?.addEventListener('click', () => {
      state.tutorialStep = 1;
      render();
    });

    $('#btn-tap-lid')?.addEventListener('click', () => {
      AudioEngine.playCrash();
      const charEl = document.querySelector('.lid-scene .character-layered');
      if (charEl && typeof CharacterRig !== 'undefined') {
        CharacterRig.applyPose(charEl, 'brass', 'hit');
      }
      const hint = $('#lid-hint');
      if (hint) hint.textContent = 'Perfect! That crash/cymbal sound is GOLD.';
      setTimeout(() => {
        state.hasLid = true;
        persist();
        setScreen('hub');
      }, 1200);
    });

    $$('.venue-card:not(.locked)').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.currentVenue = btn.dataset.venue;
        persist();
        if (!updateHubVenueSelection()) render();
      });
    });

    const performBtn = $('#btn-perform');
    if (performBtn) performBtn.onclick = () => startPerformance();
    $('#btn-shop')?.addEventListener('click', () => setScreen('shop'));

    $$('.shop-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        state.shopTab = tab.dataset.tab;
        state.shopNotice = null;
        render();
      });
    });

    $$('[data-buy-cat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        if (buyItem(btn.dataset.buyCat, btn.dataset.buyId)) render();
      });
    });

    $('[data-buy-slot]')?.addEventListener('click', () => {
      if (buyBandSlot()) {
        render();
      } else {
        state.shopNotice = 'Could not buy slot — need more BandCash or you are at max slots.';
        render();
      }
    });

    $('#btn-accept-recruit')?.addEventListener('click', () => {
      acceptRecruit();
      render();
    });

    $('#btn-decline-recruit')?.addEventListener('click', () => {
      state.pendingRecruit = null;
      persist();
      render();
    });

    $$('[data-equip-cat]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.equip;
        const cat = btn.dataset.equipCat;
        const wearCats = ['clothes', 'makeup', 'accessories'];
        if (wearCats.includes(cat) && (id === '__none__' || !id)) {
          state.equippedWear = state.equippedWear || { clothes: null, makeup: null, accessories: null };
          state.equippedWear[cat] = null;
          persist();
          render();
          return;
        }
        if (!id) return;
        if (cat === 'instruments' && state.inventories.instruments.includes(id)) {
          state.equippedInstrument = id;
          persist();
          render();
          return;
        }
        if (cat === 'songs' && state.inventories.songs?.includes(id)) {
          state.equippedSong = id;
          state.loadedSong = null;
          state.stemsReady = false;
          persist();
          render();
          return;
        }
        if (['clothes', 'makeup', 'accessories'].includes(cat) && state.inventories[cat]?.includes(id)) {
          state.equippedWear = state.equippedWear || { clothes: null, makeup: null, accessories: null };
          state.equippedWear[cat] = id;
          persist();
          render();
        }
      });
    });

    $$('[data-toggle-panel]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.togglePanel;
        state.hubPanelsOpen = state.hubPanelsOpen || defaultHubPanelsOpen();
        state.hubPanelsOpen[key] = !state.hubPanelsOpen[key];
        render();
      });
    });

    $$('[data-gig-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        toggleGigBandMember(btn.dataset.gigToggle);
        render();
      });
    });

    $$('[data-drop-member]').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (dropBandMember(btn.dataset.dropMember)) render();
      });
    });

    const playBtn = $('#btn-play-note');
    playBtn?.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      playPointerId = e.pointerId;
      playBtn.setPointerCapture(e.pointerId);
      triggerPlayPress(getActiveInstrument());
      onNotePress();
    });
    playBtn?.addEventListener('pointerup', (e) => {
      if (playPointerId === e.pointerId) playPointerId = null;
      playBtn.releasePointerCapture?.(e.pointerId);
      onNoteRelease();
      triggerPlayRelease(getActiveInstrument());
    });
    playBtn?.addEventListener('pointercancel', (e) => {
      if (playPointerId === e.pointerId) playPointerId = null;
      playBtn.releasePointerCapture?.(e.pointerId);
      onNoteRelease();
      triggerPlayRelease(getActiveInstrument());
    });

    $('#btn-rewind')?.addEventListener('click', rewindPerformance);

    $('#tune-inst-select')?.addEventListener('change', (e) => {
      state.tuneInstId = e.target.value;
      render();
    });
    $('#btn-back-title')?.addEventListener('click', () => setScreen('title'));
  }

  function updateFireState() {
    const p = state.performance;
    if (!p) return;
    const on = !!p.onFire;
    document.getElementById('performer')?.classList.toggle('on-fire', on);
    document.querySelectorAll('.lineup-slot.side').forEach((el) => el.classList.toggle('on-fire', on));
    document.querySelector('.performer-wrap')?.classList.toggle('band-on-fire', on);
    document.getElementById('rhythm-highway')?.classList.toggle('on-fire', on);
    document.querySelector('.play-controls')?.classList.toggle('on-fire', on);
    document.getElementById('btn-play-note')?.classList.toggle('on-fire', on);
    AudioEngine.setHotStreakCheering?.(on);
  }

  function endBooedOffStage() {
    const p = state.performance;
    if (!p || p.booed || state.gigResultsShown) return;
    clearGigCompleteDelay(p);
    clearGigEndWatchdog();
    p.booed = true;
    p.onFire = false;
    p.rhythmActive = false;
    p.gigCompleting = false;
    releasePerformInput();
    dismissStageCurtain();
    AudioEngine.setCrowdBooing?.(true);
    AudioEngine.playBoo?.();
    setTimeout(() => AudioEngine.playBoo?.(), 200);
    setTimeout(() => AudioEngine.playBoo?.(), 450);
    // Deduct once and reuse the same number for the "kept" display below, so the
    // results screen can never show a kept-amount that doesn't match the wallet.
    const booPenalty = Math.floor(p.sessionCash * 0.6);
    state.bandCash = Math.max(0, state.bandCash - booPenalty);
    p.sessionCash = Math.max(0, p.sessionCash - booPenalty);
    snapshotPendingGigResults(p);
    persist();
    state.pendingGigEndMode = 'booed';
    finishGigScreen('booed');
  }

  function beginRhythmGameplay(bpm) {
    const p = state.performance;
    if (!p || p.rhythmActive) return;

    p.rhythmActive = true;
    p.rhythmStartAt = performance.now();
    p.leadInBeat = (GIG_COUNTDOWN_SEC * bpm) / 60;

    Metronome.start(bpm, (beatIdx) => {
      if (Metronome.getElapsed() >= GIG_COUNTDOWN_SEC) {
        BandAudio.onBeat(beatIdx);
      }
    }, { silent: true });
  }

  function startGameplayAudio(p) {
    if (!p) return;
    const beatDur = 60 / p.bpm;
    const beatIdx = Math.floor(GIG_COUNTDOWN_SEC / beatDur);
    BandAudio.start(p.bpm);
    BandAudio.syncToBeat(beatIdx + 1);
  }

  function startPerformanceLoop() {
    const p = state.performance;
    if (!p) return;

    const song = getActiveSong();
    const bpm = p.bpm;
    const venue = VENUES.find((v) => v.id === state.currentVenue);
    const inst = getActiveInstrument();

    AudioEngine.initMix();
    AudioEngine.startCrowdAmbience?.(venue?.tier ?? 0, { intro: true });
    BandAudio.setBand(getGigBandMembers(), song);
    BandAudio.setOnMemberPlay((member) => triggerBandmateAnimation(member));

    beginRhythmGameplay(bpm);

    const uiLoop = () => {
      if (!state.performance || state.screen !== 'perform') return;
      updatePerformanceUI();
      state.perfUiRaf = requestAnimationFrame(uiLoop);
    };
    state.perfUiRaf = requestAnimationFrame(uiLoop);
  }

  function stopPerformanceLoop() {
    const performer = document.getElementById('performer');
    if (performer && typeof CharacterRig !== 'undefined') {
      CharacterRig.playInstrumentRelease(performer, getActiveInstrument());
    }
    resetPerformanceTimers();
    if (typeof StemPlayer !== 'undefined') StemPlayer.stop();
    state.stemsReady = false;
    document.querySelector('.perform-screen')?.classList.remove('rewinding');
    document.getElementById('btn-rewind')?.classList.remove('rewinding');
    document.getElementById('btn-play-note')?.classList.remove('rewind-disabled');
  }

  function captureRewindSnapshot(elapsed) {
    const p = state.performance;
    if (!p) return;

    rewindSnapshots.push({
      elapsed,
      timeLeft: p.timeLeft,
      crowd: p.crowd,
      cheer: p.cheer,
      sessionCash: p.sessionCash,
      sessionStars: p.sessionStars,
      peakCrowd: p.peakCrowd,
      combo: p.combo,
      missStreak: p.missStreak,
      onFire: p.onFire,
      booed: p.booed,
      recruitRolls: p.recruitRolls,
      hitBeats: [...p.hitBeats],
      missedBeats: [...(p.missedBeats || [])],
      bandCash: state.bandCash,
      starMeter: state.starMeter,
      pendingRecruit: state.pendingRecruit,
      gigTimerStarted: p.gigTimerStarted,
      countdownEnded: p.countdownEnded,
    });

    const cutoff = elapsed - SNAPSHOT_RETENTION;
    while (rewindSnapshots.length && rewindSnapshots[0].elapsed < cutoff) {
      rewindSnapshots.shift();
    }
    lastSnapshotAt = elapsed;
  }

  function findRewindSnapshot(targetElapsed) {
    if (!rewindSnapshots.length) return null;
    let best = rewindSnapshots[0];
    for (const snap of rewindSnapshots) {
      if (snap.elapsed <= targetElapsed) best = snap;
      else break;
    }
    return best;
  }

  function applyRewindSnapshot(snapshot) {
    const p = state.performance;
    if (!p || !snapshot) return;

    p.timeLeft = snapshot.timeLeft;
    p.crowd = snapshot.crowd;
    p.cheer = snapshot.cheer;
    p.sessionCash = snapshot.sessionCash;
    p.sessionStars = snapshot.sessionStars;
    p.peakCrowd = snapshot.peakCrowd;
    p.combo = snapshot.combo;
    p.missStreak = snapshot.missStreak;
    p.onFire = snapshot.onFire;
    p.booed = snapshot.booed;
    p.recruitRolls = snapshot.recruitRolls;
    p.hitBeats = new Set(snapshot.hitBeats);
    p.missedBeats = new Set(snapshot.missedBeats || []);
    state.bandCash = snapshot.bandCash;
    state.starMeter = snapshot.starMeter;
    state.pendingRecruit = snapshot.pendingRecruit;
    p.gigTimerStarted = snapshot.gigTimerStarted ?? false;
    p.countdownEnded = snapshot.countdownEnded ?? false;

    const beatDur = 60 / p.bpm;
    Metronome.seek(snapshot.elapsed);
    BandAudio.syncToBeat(Math.floor(snapshot.elapsed / beatDur));
  }

  function updateRewindButtonState() {
    const btn = document.getElementById('btn-rewind');
    if (!btn) return;
    const p = state.performance;
    const canRewind = !!p
      && state.screen === 'perform'
      && !p.booed
      && !rewindCooldown
      && !rewindActive
      && rewindSnapshots.length > 0
      && Metronome.running;
    btn.disabled = !canRewind;
  }

  function rewindPerformance() {
    const p = state.performance;
    if (!p || state.screen !== 'perform' || p.booed || rewindCooldown || rewindActive || !Metronome.running) return;

    const startElapsed = Metronome.getElapsed();
    const targetElapsed = Math.max(0, startElapsed - REWIND_SECONDS);
    const finalSnapshot = findRewindSnapshot(targetElapsed);
    if (!finalSnapshot) return;

    rewindActive = true;
    rewindCooldown = true;

    const rewindBtn = document.getElementById('btn-rewind');
    const playBtn = document.getElementById('btn-play-note');
    const performScreen = document.querySelector('.perform-screen');
    if (rewindBtn) {
      rewindBtn.disabled = true;
      rewindBtn.classList.add('rewinding');
    }
    if (playBtn) playBtn.classList.add('rewind-disabled');
    performScreen?.classList.add('rewinding');

    activeHold = null;
    stopInstrumentSustain();
    const zone = document.getElementById('hit-zone');
    if (zone) zone.classList.remove('holding');

    const floaters = document.getElementById('floaters');
    if (floaters) floaters.innerHTML = '';

    AudioEngine.playRewindSfx?.(0.85, REWIND_SECONDS);
    Metronome.setBeatSuspended?.(true);

    const inst = getActiveInstrument();
    const song = getActiveSong();
    const partKey = getPlayerPartKey(inst);
    const isMelodic = inst.type === 'melodic';
    const animStart = performance.now();

    const finishRewind = () => {
      if (rewindAnimRaf) cancelAnimationFrame(rewindAnimRaf);
      rewindAnimRaf = null;

      AudioEngine.stopRewindSfx?.();
      applyRewindSnapshot(finalSnapshot);
      AudioEngine.setCrowdBooing?.(p.missStreak >= 3);
      updateFireState();
      updateHud();
      updatePerformanceUI();
      persist();

      Metronome.setBeatSuspended?.(false);
      rewindActive = false;
      performScreen?.classList.remove('rewinding');
      rewindBtn?.classList.remove('rewinding');
      playBtn?.classList.remove('rewind-disabled');

      if (p.backingStarted && typeof StemPlayer !== 'undefined' && StemPlayer.seek) {
        const songElapsed = getSongPlayElapsed(Metronome.getElapsed(), GIG_COUNTDOWN_SEC);
        StemPlayer.seek(songElapsed);
      }

      setTimeout(() => {
        rewindCooldown = false;
        updateRewindButtonState();
      }, 1000);
    };

    const scrubFrame = (now) => {
      if (!state.performance || state.screen !== 'perform') {
        AudioEngine.stopRewindSfx?.();
        rewindActive = false;
        Metronome.setBeatSuspended?.(false);
        return;
      }

      const progress = Math.min(1, (now - animStart) / REWIND_ANIM_MS);
      const eased = 1 - (1 - progress) ** 2;
      const scrubElapsed = startElapsed + (targetElapsed - startElapsed) * eased;

      Metronome.seek(scrubElapsed);

      const displaySnap = findRewindSnapshot(scrubElapsed) || finalSnapshot;
      RhythmLane.update(
        song,
        partKey,
        scrubElapsed,
        p.bpm,
        isMelodic,
        new Set(displaySnap.hitBeats),
        new Set(displaySnap.missedBeats || []),
        null,
        p.leadInBeat ?? 0,
        null,
        displaySnap.onFire,
        inst,
        GIG_COUNTDOWN_SEC,
      );

      if (progress < 1) {
        rewindAnimRaf = requestAnimationFrame(scrubFrame);
      } else {
        finishRewind();
      }
    };

    rewindAnimRaf = requestAnimationFrame(scrubFrame);
  }

  function finalizeActiveHoldIfExpired() {
    const p = state.performance;
    if (!p || !activeHold) return;

    const elapsed = Metronome.getElapsed();
    const beatDur = 60 / p.bpm;
    const { note, inst } = activeHold;
    const hitElapsed = note.hitElapsed ?? noteHitElapsed(note, getActiveSong(), p.leadInBeat ?? 0, p.bpm);
    const endElapsed = note.endElapsed ?? (hitElapsed + (note.dur || 1) * beatDur);
    const songElapsed = getSongPlayElapsed(elapsed, GIG_COUNTDOWN_SEC);

    if (songElapsed < endElapsed) return;

    const { rating } = rateHoldRelease(note, elapsed, p.bpm, GIG_COUNTDOWN_SEC);
    activeHold = null;
    stopInstrumentSustain();
    const zone = document.getElementById('hit-zone');
    if (zone) zone.classList.remove('holding');
    applyHitScore(rating, note, inst);
  }

  function checkMissedNotes() {
    const p = state.performance;
    if (!p || p.booed || rewindActive || !isRhythmScoringEnabled()) return;

    const inst = getActiveInstrument();
    const song = getActiveSong();
    const partKey = getPlayerPartKey(inst);
    const isMelodic = inst.type === 'melodic';
    const elapsed = Metronome.getElapsed();
    const beatDur = 60 / p.bpm;
    const { tapLate: lateSec, holdLate: holdLateWindow } = getHitWindows(isMelodic, p.bpm);
    const leadInBeat = p.leadInBeat ?? 0;
    const songElapsed = getSongPlayElapsed(elapsed, GIG_COUNTDOWN_SEC);
    if (!p.countdownEnded || elapsed < GIG_COUNTDOWN_SEC) return;

    const part = typeof filterPartForInstrument === 'function'
      ? filterPartForInstrument(song.parts?.[partKey], inst)
      : (song.parts?.[partKey] || []);
    if (!p.missedBeats) p.missedBeats = new Set();

    let earliestMiss = null;
    for (const ev of part) {
      const key = noteKey(ev);
      if (p.hitBeats.has(key) || p.missedBeats.has(key)) continue;

      const hitElapsed = noteHitElapsed(ev, song, leadInBeat, p.bpm);
      if (hitElapsed < 0) continue;
      const gemChartStart = (typeof GEM_CHART_LEAD_SEC !== 'undefined' ? GEM_CHART_LEAD_SEC : 0)
        + (typeof GEM_MIN_APPROACH_SEC !== 'undefined' ? GEM_MIN_APPROACH_SEC : 0);
      if (hitElapsed < gemChartStart) continue;

      const dur = ev.dur || 1;
      const durSec = dur * beatDur;
      const isHold = dur > 1.05;
      const holdLateSec = holdLateWindow;
      const missAfterElapsed = isHold
        ? hitElapsed + durSec + holdLateSec * 0.25
        : hitElapsed + lateSec;

      const activeHoldKey = activeHold ? noteKey(activeHold.note) : null;
      if (activeHoldKey === key) continue;

      if (songElapsed <= missAfterElapsed) continue;

      const overdue = songElapsed - missAfterElapsed;
      if (overdue > beatDur * 0.2) {
        p.missedBeats.add(key);
        continue;
      }

      if (!earliestMiss || hitElapsed < (earliestMiss.hitElapsed ?? Infinity)) {
        earliestMiss = {
          ...ev,
          key,
          isHold,
          dur,
          hitElapsed,
          endElapsed: hitElapsed + durSec,
        };
      }
    }

    if (!earliestMiss) return;

    p.missedBeats.add(earliestMiss.key);
    applyHitScore('miss', earliestMiss, inst, { autoMiss: true });
  }

  function updatePerformanceUI() {
    const p = state.performance;
    if (!p || state._updatingPerfUi) return;
    state._updatingPerfUi = true;

    if (p.gigCompleting && !state.gigResultsShown) {
      const timer = document.getElementById('perf-timer');
      if (timer) timer.textContent = 'Wrapping up…';
      tryFinishGigCompletion();
      if (!state.gigResultsShown && performance.now() - (p.gigCompleteAt || 0) > 900) {
        finishGigScreen('results');
      }
      state._updatingPerfUi = false;
      return;
    }

    const inst = getActiveInstrument();
    const song = getActiveSong();
    const partKey = getPlayerPartKey(inst);
    const isMelodic = inst.type === 'melodic';
    const elapsed = Metronome.getElapsed();

    if (!p.rhythmActive) {
      state._updatingPerfUi = false;
      return;
    }

    if (rewindActive) {
      state._updatingPerfUi = false;
      return;
    }

    finalizeActiveHoldIfExpired();

    const crowdRow = document.getElementById('crowd-row');
    if (elapsed < GIG_COUNTDOWN_SEC) {
      const left = Math.max(1, Math.ceil(GIG_COUNTDOWN_SEC - elapsed));
      setRhythmHint(`Get ready… ${left}`, 'good');
      crowdRow?.classList.add('crowd-steady');
      const lane = document.getElementById('note-lane');
      if (lane) lane.innerHTML = '';
      const timer = document.getElementById('perf-timer');
      if (timer) timer.textContent = `Get ready… ${left}`;
      state._updatingPerfUi = false;
      return;
    } else if (!p.countdownEnded) {
      p.countdownEnded = true;
      p.gigTimerStarted = true;
      if (state.perfInterval) {
        clearInterval(state.perfInterval);
        state.perfInterval = setInterval(tickPerformance, 1000);
      }
      startGameplayAudio(p);
      startPerformanceBacking();
      AudioEngine.endCrowdIntro?.();
      crowdRow?.classList.remove('crowd-steady');
      setRhythmHint('Tap quick gems · hold long gems through the zone!', 'good');
    }

    if (p.backingStarted) {
      syncGigTimerFromAudio();
      if (p.gigCompleting || state.gigResultsShown) {
        state._updatingPerfUi = false;
        return;
      }
      if (p.timeLeft <= 5 && state.perfInterval && !p.gigCompleting) {
        clearInterval(state.perfInterval);
        state.perfInterval = setInterval(tickPerformance, 250);
      }
    }

    const timer = document.getElementById('perf-timer');
    if (timer && !p.gigCompleting) timer.textContent = `⏱ ${p.timeLeft}s`;

    checkMissedNotes();
    if (!state.performance || state.screen !== 'perform') {
      state._updatingPerfUi = false;
      return;
    }

    if (elapsed - lastSnapshotAt >= SNAPSHOT_INTERVAL) {
      captureRewindSnapshot(elapsed);
    }
    updateRewindButtonState();

    RhythmLane.update(song, partKey, elapsed, p.bpm, isMelodic, p.hitBeats, p.missedBeats, activeHold ? noteKey(activeHold.note) : null, p.leadInBeat ?? 0, activeHold?.note ?? null, p.onFire, inst, GIG_COUNTDOWN_SEC);

    const crowdPct = Math.min(100, (p.crowd / p.crowdCap) * 100);
    const cheerPct = Math.min(100, (p.cheer / p.cheerGoal) * 100);
    const crowdFill = document.getElementById('crowd-fill');
    const cheerFill = document.getElementById('cheer-fill');
    if (crowdFill) crowdFill.style.width = `${crowdPct}%`;
    if (cheerFill) cheerFill.style.width = `${cheerPct}%`;
    const crowdLabel = document.getElementById('crowd-label');
    const cheerLabel = document.getElementById('cheer-label');
    if (crowdLabel) crowdLabel.textContent = `${Math.floor(p.crowd)}/${p.crowdCap}`;
    if (cheerLabel) cheerLabel.textContent = `${Math.floor(p.cheer)}/${p.cheerGoal}`;
    const cashEl = document.getElementById('gig-cash');
    if (cashEl) cashEl.textContent = `+${Math.floor(p.sessionCash)} BandCash this gig`;
    const comboEl = document.getElementById('combo-display');
    if (comboEl) {
      if (p.onFire) comboEl.textContent = `🔥 HOT STREAK ×${p.combo}`;
      else if (p.missStreak >= 3) comboEl.textContent = `BOOED ×${p.missStreak}`;
      else comboEl.textContent = p.combo > 1 ? `COMBO ×${p.combo}` : '';
    }
    updateFireState();
    state._updatingPerfUi = false;
  }

  function triggerBandmateAnimation(member) {
    const el = document.getElementById(`bandmate-${getBandmateId(member)}`);
    if (!el) return;
    const anim = ROLE_ANIM[member.role] || 'anim-hit';
    el.classList.remove(...ALL_ANIM_CLASSES);
    void el.offsetWidth;
    el.classList.add(anim);
    if (typeof CharacterRig !== 'undefined') {
      CharacterRig.applyPoseFromRole(el, member.role, 'hit');
    }
  }

  function triggerPlayAnimation(inst, rating, note = null) {
    const performer = document.getElementById('performer');
    if (!performer) return;
    const anim = INST_ANIM[inst.id] || SUBTYPE_ANIM[inst.subtype] || 'anim-hit';
    performer.classList.remove(...ALL_ANIM_CLASSES);
    void performer.offsetWidth;
    if (rating !== 'miss') {
      performer.classList.add(anim);
      performer.classList.add('hit-flash');
      if (typeof CharacterRig !== 'undefined') {
        CharacterRig.playInstrumentHit(performer, inst);
        if (activeHold) CharacterRig.playInstrumentSustain(performer, inst);
      }
    }
    const held = performer.querySelector('.held-play');
    if (held) {
      held.classList.remove('inst-play-melodic', 'inst-play-percussion', 'inst-play-drums', 'inst-play-cymbal', 'inst-play-shake');
      void held.offsetWidth;
      if (rating !== 'miss') {
        const instAnim = {
          drums: 'inst-play-drums',
          'trash-lid': 'inst-play-cymbal',
        }[inst.id] || (inst.type === 'melodic' ? 'inst-play-melodic' : 'inst-play-percussion');
        held.classList.add(instAnim);
        if (inst.id === 'drums' && typeof InstrumentArt !== 'undefined' && !InstrumentArt.hasArt(inst)) {
          const mount = performer.querySelector('.held-mount');
          // Flash the drum piece that actually sounds for this note, so the
          // visual matches the kick/snare audio instead of just the rating.
          const hitType = note?.hit === 'kick' ? 'kick' : 'snare';
          InstrumentArt.triggerDrumHit(mount || held, hitType);
          if (rating === 'perfect') InstrumentArt.triggerDrumHit(mount || held, 'cymbal');
        }
      }
    }
  }

  function setRhythmHint(text, rating) {
    const el = document.getElementById('rhythm-hint');
    if (!el) return;
    if (!rating || !text.includes(rating)) {
      el.textContent = text;
      return;
    }
    el.innerHTML = text.replace(rating, `<span class="rating-${rating}">${rating.toUpperCase()}</span>`);
  }

  function setCurtainState(phase, message = '') {
    const curtain = document.getElementById('stage-curtain');
    const status = document.getElementById('curtain-status');
    if (!curtain) return;
    curtain.classList.remove('curtain-idle', 'curtain-closing', 'curtain-loading', 'curtain-opening', 'curtain-done');
    curtain.classList.add(`curtain-${phase}`);
    curtain.setAttribute('aria-hidden', phase === 'idle' || phase === 'done' ? 'true' : 'false');
    const blockPointer = ['closing', 'loading', 'opening'].includes(phase);
    curtain.style.pointerEvents = blockPointer ? 'auto' : 'none';
    if (status) status.textContent = message;
  }

  function dismissStageCurtain() {
    setCurtainState('idle');
    const curtain = document.getElementById('stage-curtain');
    if (curtain) {
      curtain.style.pointerEvents = 'none';
      curtain.style.visibility = 'hidden';
      curtain.style.opacity = '0';
    }
  }

  function waitMs(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async function runGigIntroSequence() {
    const introToken = ++gigIntroToken;
    const btn = document.getElementById('btn-perform');
    if (btn) btn.disabled = true;

    try {
      setCurtainState('closing');
      AudioEngine.resume();

      const inst = getActiveInstrument();
      const preload = Promise.all([
        AudioEngine.loadCheerSample?.().catch(() => null),
        AudioEngine.loadBooSample?.().catch(() => null),
        AudioEngine.loadRewindSample?.().catch(() => null),
        ensureSongLoaded(state.equippedSong).then(async (song) => {
          state.stemsReady = false;
          if (typeof StemPlayer !== 'undefined') {
            state.stemsReady = await StemPlayer.load(song, {
              playerStemKey: getPlayerStemForInstrument(inst),
            });
          }
          return song;
        }),
      ]);

      await waitMs(600);
      if (introToken !== gigIntroToken) return;
      setCurtainState('loading', 'Tuning up…');
      await preload;
      if (introToken !== gigIntroToken) return;

      const venue = VENUES.find((v) => v.id === state.currentVenue);
      const appeal = crowdAppeal();
      const crowdCap = venue.crowdCap + Math.floor(appeal * 0.5);
      const bpm = getPerformanceBpm();
      const song = getActiveSong();
      const gigDuration = Math.max(15, Math.ceil(song.durationSec || 60));

      state.performance = {
        timeLeft: gigDuration,
        crowd: Math.min(3 + Math.floor(appeal * 0.2), crowdCap),
        crowdCap,
        cheer: 0,
        cheerGoal: 50 + venue.starRequired * 0.3,
        sessionCash: 0,
        sessionStars: 0,
        peakCrowd: 0,
        appeal,
        tipMultiplier: venue.tipMultiplier,
        bpm,
        combo: 0,
        maxCombo: 0,
        perfectHits: 0,
        hadHotStreak: false,
        recruitedThisGig: null,
        missStreak: 0,
        onFire: false,
        booed: false,
        venueTier: venue.tier ?? 0,
        newUnlock: null,
        recruitRolls: 0,
        hitBeats: new Set(),
        missedBeats: new Set(),
        gigTimerStarted: false,
        countdownEnded: false,
        backingStarted: false,
      };

      activeHold = null;
      rewindSnapshots = [];
      lastSnapshotAt = -1;
      rewindCooldown = false;
      rewindActive = false;
      resetPerformanceTimers();
      state.perfInterval = setInterval(tickPerformance, 1000);
      if (introToken !== gigIntroToken) return;
      setScreen('perform');

      await waitMs(80);
      if (introToken !== gigIntroToken) return;
      setCurtainState('opening');
      const performContent = document.querySelector('.perform-content');
      if (performContent) {
        performContent.classList.add('stage-reveal');
        document.querySelector('.perform-screen')?.classList.remove('stage-mounting');
      }

      await waitMs(800);
      if (introToken !== gigIntroToken) return;
      setCurtainState('done');
      startPerformanceLoop();

      await waitMs(300);
    } finally {
      if (introToken === gigIntroToken) {
        dismissStageCurtain();
        if (btn) btn.disabled = false;
      }
    }
  }

  function startPerformance() {
    if (state.suppressPerformUntil && performance.now() < state.suppressPerformUntil) return;
    if (state.gigIntroRunning) return;
    state.gigIntroRunning = true;
    runGigIntroSequence()
      .catch((err) => {
        // If the intro throws before state.performance ever gets created
        // (e.g. song/stem loading fails), nothing else clears
        // gigIntroRunning, which would otherwise permanently lock out the
        // "Play Gig" button. Make sure a failed attempt always recovers.
        console.error('Failed to start gig:', err);
        state.gigIntroRunning = false;
        dismissStageCurtain();
        const btn = document.getElementById('btn-perform');
        if (btn) btn.disabled = false;
      })
      .finally(() => {
        if (state.performance) state.gigIntroRunning = false;
      });
  }

  function isRhythmScoringEnabled() {
    const p = state.performance;
    if (!p || !p.rhythmActive || !Metronome.running) return false;
    return Metronome.getElapsed() >= GIG_COUNTDOWN_SEC;
  }

  function applyHitScore(rating, note, inst, opts = {}) {
    const p = state.performance;
    if (!p || p.gigCompleting || p.gigFinished || p.booed || state.gigResultsShown) return;
    if (rating === 'miss' && !isRhythmScoringEnabled()) return;

    triggerPlayAnimation(inst, rating, note);

    if (rating === 'miss') {
      RhythmLane.flashHit(rating, false);
      if (!isStemBackedGig()) AudioEngine.playMiss();
      stopInstrumentSustain();
      p.combo = 0;
      p.onFire = false;
      const beatDur = 60 / p.bpm;
      if (!opts.autoMiss) {
        p.missStreak = (p.missStreak || 0) + 1;
      } else {
        const minGapMs = beatDur * 500;
        const now = performance.now();
        if (!p.lastAutoMissStreakAt || now - p.lastAutoMissStreakAt >= minGapMs) {
          p.lastAutoMissStreakAt = now;
          p.missStreak = (p.missStreak || 0) + 1;
        }
      }
      updateFireState();

      if (p.missStreak >= 5) {
        endBooedOffStage();
        return;
      }
      if (p.missStreak >= 3) {
        AudioEngine.setCrowdBooing?.(true);
        spawnFloater('BOO!', 'miss');
      }

      const isMelodic = inst.type === 'melodic';
      const starLoss = isMelodic ? 0.65 : 0.5;
      p.sessionStars = Math.max(0, p.sessionStars - starLoss);
      state.starMeter = Math.max(0, state.starMeter - starLoss);
      setRhythmHint(isMelodic ? 'miss — hit the gem in the zone!' : 'miss — hit the beat gem!', 'miss');
      spawnFloater(`-${starLoss.toFixed(1)} ★`, 'miss');
      updateHud();
      return;
    }

    p.missStreak = 0;
    AudioEngine.setCrowdBooing?.(false);

    const isMelodic = inst.type === 'melodic';
    p.combo += 1;
    p.maxCombo = Math.max(p.maxCombo || 0, p.combo);
    if (rating === 'perfect') p.perfectHits = (p.perfectHits || 0) + 1;
    if (p.combo >= HOT_STREAK_COMBO) p.onFire = true;
    if (p.onFire) p.hadHotStreak = true;
    updateFireState();

    const hot = isHotStreak(p);
    const streak = hotStreakMult(p);
    if (note) {
      playInstrumentHit(note, inst, (rating === 'perfect' ? 1.15 : 1.05) * streak);
      RhythmLane.explodeGem(note, rating, isMelodic, hot);
    } else {
      RhythmLane.explodeGem({ beat: -1 }, rating, isMelodic, hot);
    }
    RhythmLane.flashHit(rating, hot);

    const mult = rating === 'perfect' ? 1.5 : 1.0;
    const appeal = crowdAppeal();
    const crowdGain = ((rating === 'perfect' ? 0.7 : 0.35) * mult + appeal * 0.03) * streak;
    p.crowd = Math.min(p.crowdCap, p.crowd + crowdGain);
    p.cheer = Math.min(p.cheerGoal * 1.5, p.cheer + (rating === 'perfect' ? 4 : 2) * streak);

    const tip = (1 + p.crowd * 0.12) * p.tipMultiplier * mult * (0.85 + Math.random() * 0.3) * streak;
    p.sessionCash += tip;
    state.bandCash += tip;

    const starGain = (0.12 + p.crowd * 0.02) * mult * streak;
    p.sessionStars += starGain;
    state.starMeter += starGain;

    if (tip >= 2) {
      AudioEngine.playCoin();
      const tipLabel = hot ? `+$${Math.floor(tip)} ×${HOT_STREAK_MULT}` : `+$${Math.floor(tip)}`;
      spawnFloater(tipLabel, 'cash', { hot });
    }
    spawnFloater(rating.toUpperCase(), rating, { hot });

    p.peakCrowd = Math.max(p.peakCrowd, p.crowd);
    setRhythmHint(`${rating}!`, rating);

    if (state.starMeter >= 20 && canRecruitBandmate() && !state.pendingRecruit && p.recruitRolls < 2 && Math.random() < 0.08) {
      const recruit = RECRUIT_POOL[Math.floor(Math.random() * RECRUIT_POOL.length)];
      const recruitId = recruit.id || getBandmateId(recruit);
      if (!state.bandMembers.find((m) => getBandmateId(m) === recruitId)) {
        state.pendingRecruit = recruit;
        p.recruitedThisGig = recruit.name;
        p.recruitRolls += 1;
      }
    }

    updateHud();
    updatePerformanceUI();
    persist();

    const crowdRow = document.getElementById('crowd-row');
    if (crowdRow) {
      const count = Math.min(Math.floor(p.crowd), 20);
      if (crowdRow.children.length !== count) {
        crowdRow.innerHTML = Array.from({ length: count }, (_, i) =>
          `<div class="crowd-person" style="--delay:${i * 0.05}s">${renderCrowdMember(i)}</div>`
        ).join('');
      }
    }
  }

  function onNotePress() {
    const p = state.performance;
    if (!p || !p.rhythmActive || activeHold || rewindActive) return;
    if (!isRhythmScoringEnabled()) return;

    const inst = getActiveInstrument();
    const song = getActiveSong();
    const partKey = getPlayerPartKey(inst);
    const elapsed = Metronome.getElapsed();
    const isMelodic = inst.type === 'melodic';
    const notes = getUpcomingNotes(song, partKey, elapsed, p.bpm, RhythmLane.LOOKAHEAD, p.hitBeats, p.missedBeats, p.leadInBeat ?? 0, inst, GIG_COUNTDOWN_SEC);
    const { rating, note, phase } = rateNotePress(notes, elapsed, p.bpm, isMelodic, p.hitBeats, GIG_COUNTDOWN_SEC, song, p.leadInBeat ?? 0);

    if (!note || rating === 'miss') {
      const { tapLate, tapEarly, holdLate, holdEarly } = getHitWindows(isMelodic, p.bpm);
      const songElapsed = getSongPlayElapsed(elapsed, GIG_COUNTDOWN_SEC);
      const hittable = notes.some((n) => {
        const distSec = (n.hitElapsed ?? 0) - songElapsed;
        if (n.isHold) {
          const endElapsed = n.endElapsed ?? (n.hitElapsed + (n.dur || 1) * beatDur);
          const inBody = songElapsed >= n.hitElapsed && songElapsed < endElapsed;
          return (distSec >= -holdLate && distSec <= holdEarly) || inBody;
        }
        return distSec >= -tapLate && distSec <= tapEarly;
      });
      if (hittable) applyHitScore('miss', null, inst);
      return;
    }

    const key = noteKey(note);
    if (p.hitBeats.has(key)) return;

    if (note.isHold && phase === 'hold-start') {
      p.hitBeats.add(key);
      activeHold = { note, inst, pressElapsed: elapsed };
      startInstrumentSustain(inst, note);
      const zone = document.getElementById('hit-zone');
      if (zone) zone.classList.add('holding');
      triggerPlayAnimation(inst, rating, note);
      setRhythmHint('hold through the gem!', 'good');
      return;
    }

    p.hitBeats.add(key);
    applyHitScore(rating, note, inst);
  }

  function onNoteRelease() {
    const p = state.performance;
    if (!p || !activeHold || rewindActive) return;

    const { note, inst, pressElapsed } = activeHold;
    const elapsed = Metronome.getElapsed();
    const { rating } = rateHoldRelease(note, elapsed, p.bpm, GIG_COUNTDOWN_SEC);
    activeHold = null;
    stopInstrumentSustain();
    const zone = document.getElementById('hit-zone');
    if (zone) zone.classList.remove('holding');
    applyHitScore(rating, note, inst);
  }

  function onPlayNote() {
    onNotePress();
  }

  function spawnFloater(text, type, opts = {}) {
    const container = document.getElementById('floaters');
    if (!container) return;
    const el = document.createElement('div');
    el.className = `floater ${type}${opts.hot ? ' hot-streak' : ''}`;
    el.textContent = text;
    el.style.left = `${40 + Math.random() * 20}%`;
    container.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }

  function tickPerformance() {
    const p = state.performance;
    if (!p || rewindActive) return;

    if (!p.gigTimerStarted) {
      updatePerformanceUI();
      return;
    }

    if (p.backingStarted) syncGigTimerFromAudio();
    if (tryFinishGigCompletion()) return;

    if (p.timeLeft <= 0 && !state.gigResultsShown && !p.gigCompleting) {
      queueGigCompletion();
      return;
    }

    if (p.gigCompleting || state.gigResultsShown) return;

    if (!p.backingStarted) {
      p.timeLeft -= 1;
    }

    // Crowd decay must scale by real elapsed time, not by tick count: the
    // interval driving this function switches from 1000ms to 250ms ticks in
    // the last 5 seconds of a gig (see updatePerformanceUI), so a flat
    // per-tick decrement was quietly draining the crowd meter 4x faster right
    // before every gig ended.
    const decayNow = performance.now();
    const decayDt = p.lastCrowdDecayAt ? (decayNow - p.lastCrowdDecayAt) / 1000 : 1;
    p.lastCrowdDecayAt = decayNow;
    if (p.crowd > 2) {
      p.crowd = Math.max(2, p.crowd - 0.15 * decayDt);
    }

    if (p.timeLeft <= 0) {
      if (!state.gigResultsShown && !p.gigCompleting) queueGigCompletion();
      return;
    }

    updatePerformanceUI();
  }

  function initSettingsUI() {
    const gearBtn = document.getElementById('btn-settings-gear');
    const overlay = document.getElementById('settings-modal-overlay');
    const closeBtn = document.getElementById('settings-close-btn');
    const slider = document.getElementById('settings-volume-slider');
    const valueLabel = document.getElementById('settings-volume-value');
    const muteBtn = document.getElementById('settings-mute-btn');
    if (!gearBtn || !overlay || !slider) return;

    let volumeBeforeMute = null;

    const currentVolume = () => (typeof AudioEngine !== 'undefined' ? AudioEngine.getMasterVolume() : 1);

    const syncUI = () => {
      const pct = Math.round(currentVolume() * 100);
      slider.value = String(pct);
      valueLabel.textContent = `${pct}%`;
      muteBtn.textContent = pct === 0 ? 'Unmute' : 'Mute';
      muteBtn.classList.toggle('active', pct === 0);
    };

    const applyVolume = (pct) => {
      const v = Math.max(0, Math.min(1, pct / 100));
      if (typeof AudioEngine !== 'undefined') AudioEngine.setMasterVolume(v);
      syncUI();
    };

    const openModal = () => {
      syncUI();
      overlay.classList.remove('hidden');
      overlay.setAttribute('aria-hidden', 'false');
    };
    const closeModal = () => {
      overlay.classList.add('hidden');
      overlay.setAttribute('aria-hidden', 'true');
    };

    gearBtn.addEventListener('click', openModal);
    closeBtn.addEventListener('click', closeModal);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeModal();
    });

    slider.addEventListener('input', () => applyVolume(Number(slider.value)));

    muteBtn.addEventListener('click', () => {
      const pct = Math.round(currentVolume() * 100);
      if (pct === 0) {
        applyVolume(volumeBeforeMute ?? 100);
        volumeBeforeMute = null;
      } else {
        volumeBeforeMute = pct;
        applyVolume(0);
      }
    });

    // Apply the persisted volume once the audio graph exists.
    if (typeof AudioEngine !== 'undefined') AudioEngine.setMasterVolume(currentVolume());
  }

  function initAudioUnlock() {
    if (typeof AudioEngine === 'undefined') return;
    let unlocked = false;
    const unlock = () => {
      if (unlocked) return;
      unlocked = true;
      AudioEngine.resume();
      // iPhones with the physical mute (ring/silent) switch flipped to silent
      // will play zero sound from raw Web Audio API nodes, even at full volume
      // and even though other apps/media are unaffected — Safari treats
      // AudioContext output as "ambient" audio by default, which the mute
      // switch silences. Starting a real (silent) <audio> element flips the
      // page's audio session into "playback" mode, which iOS does NOT mute
      // with the switch, and the whole page's Web Audio output inherits that.
      AudioEngine.unlockIOSAudioSession?.();
      document.removeEventListener('pointerdown', unlock, true);
      document.removeEventListener('touchstart', unlock, true);
      document.removeEventListener('keydown', unlock, true);
    };
    // Mobile browsers (notably iOS Safari) only allow audio to start inside
    // a direct user-gesture handler, so grab the very first tap/click/key
    // anywhere on the page and use it to resume the AudioContext.
    document.addEventListener('pointerdown', unlock, true);
    document.addEventListener('touchstart', unlock, true);
    document.addEventListener('keydown', unlock, true);
  }

  function init() {
    window.Bandland = { exitToHub: exitGigToHub };
    initSettingsUI();
    initAudioUnlock();
    if (new URLSearchParams(window.location.search).get('test') === '1') {
      window.Bandland.endGig = (mode) => finishGigScreen(mode === 'booed' ? 'booed' : 'results');
    }
    clearGigEndWatchdog();
    hideGigResultsOverlay();
    state.pendingGigResults = null;
    state.gigResultsShown = false;
    if (new URLSearchParams(window.location.search).get('tune') === '1') {
      state.screen = 'tune';
      state.tuneInstId = Object.keys(INSTRUMENTS)[0];
      render();
      return;
    }
    setScreen('title');
  }

  return { init };
})();

document.addEventListener('DOMContentLoaded', () => Game.init());
