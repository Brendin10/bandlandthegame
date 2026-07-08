const InstrumentGrips = (() => {
  const PNG_BOOST = {
    'trash-lid': 2.68,
    drums: 2.22,
    bass: 1.14,
    'electric-guitar': 2.01,
    keys: 2.02,
  };

  const HOLD_DEFAULTS = {
    guitar: {
      // Slung low across the torso: mount anchors the strings under the
      // RIGHT (strum) hand, neck runs up-left through the fret hand.
      gripL: { x: 48, y: 163 },
      gripR: { x: 135, y: 183 },
      art: { w: 150, h: 136, anchorX: 0.34, anchorY: 0.545 },
      rot: -25,
      depth: 'sandwich',
      mountAt: 'R',
      rest: { L: { forearm: -34, hand: -20 }, R: { forearm: 10, hand: 4 } },
    },
    strum: {
      gripL: { x: 52, y: 172 },
      gripR: { x: 132, y: 158 },
      art: { w: 108, h: 136, anchorX: 0.36, anchorY: 0.76 },
      rot: -18,
      depth: 'sandwich',
    },
    keys: {
      gripL: { x: 64, y: 164 },
      gripR: { x: 136, y: 164 },
      art: { w: 148, h: 78, anchorX: 0.5, anchorY: 0.62 },
      rot: 0,
      depth: 'sandwich',
    },
    'two-hand': {
      gripL: { x: 68, y: 168 },
      gripR: { x: 132, y: 168 },
      art: { w: 168, h: 112, anchorX: 0.5, anchorY: 0.72 },
      rot: 0,
      depth: 'sandwich',
    },
    'one-hand-up': {
      gripL: { x: 84, y: 158 },
      gripR: { x: 116, y: 136 },
      art: { w: 88, h: 108, anchorX: 0.28, anchorY: 0.55 },
      rot: -22,
      depth: 'sandwich',
    },
  };

  const OVERRIDES = {
    'trash-lid': {
      gripL: { x: 98, y: 136 },
      gripR: { x: 118, y: 128 },
      art: { w: 140, h: 140, anchorX: 0.5, anchorY: 0.55 },
      rot: -4,
    },
    drums: {
      // The kit sits ON THE GROUND in front of the drummer, near full body
      // width, anchored by its bottom edge at the character's feet. The
      // rigged hands hold drumsticks that strike down onto it.
      gripL: { x: 64, y: 172 },
      gripR: { x: 136, y: 172 },
      art: { w: 154, h: 125, anchorX: 0.5, anchorY: 0.96 },
      rot: 0,
      hideSticks: false,
      mount: { x: 100, y: 250 },
      rest: { L: { forearm: 22, hand: 8 }, R: { forearm: -22, hand: -8 } },
    },
    bass: {
      // Vertical source art, rotated down into the slung position.
      art: { w: 60, h: 167, anchorX: 0.45, anchorY: 0.775 },
      rot: -68,
    },
    'electric-guitar': {
      // Source art has the neck pointing up-right; flip it so the neck
      // crosses the body up-left like a right-handed player.
      art: { w: 150, h: 136, anchorX: 0.34, anchorY: 0.545 },
      rot: -25,
      flip: true,
    },
    keys: {
      art: { w: 158, h: 92, anchorX: 0.5, anchorY: 0.68 },
      rot: 0,
    },
  };

  function getGrip(inst) {
    if (!inst) return null;
    const hold = inst.hold || 'strum';
    const base = HOLD_DEFAULTS[hold] || HOLD_DEFAULTS.strum;
    const over = OVERRIDES[inst.id] || {};
    return {
      hold,
      gripL: over.gripL || base.gripL,
      gripR: over.gripR || base.gripR,
      art: { ...base.art, ...(over.art || {}) },
      rot: over.rot ?? base.rot,
      depth: over.depth || base.depth,
      hideSticks: over.hideSticks ?? base.hideSticks ?? false,
      mountAt: over.mountAt || base.mountAt || 'L',
      flip: over.flip ?? base.flip ?? false,
      rest: over.rest || base.rest || null,
      mount: over.mount || base.mount || null,
    };
  }

  function pngBoost(instId) {
    return PNG_BOOST[instId] ?? 2.2;
  }

  function mountTransform(grip) {
    const { art, rot } = grip;
    const p = grip.mount || (grip.mountAt === 'R' ? grip.gripR : grip.gripL);
    const w = art.w;
    const h = art.h;
    const ax = art.anchorX * w;
    const ay = art.anchorY * h;
    const flip = grip.flip ? ' scale(-1,1)' : '';
    return {
      transform: `translate(${p.x},${p.y}) rotate(${rot})${flip} translate(${-ax},${-ay})`,
      w,
      h,
    };
  }

  return { getGrip, mountTransform, pngBoost, HOLD_DEFAULTS, OVERRIDES, PNG_BOOST };
})();
