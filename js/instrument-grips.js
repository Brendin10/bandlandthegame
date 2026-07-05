const InstrumentGrips = (() => {
  const PNG_BOOST = {
    'trash-lid': 2.68,
    drums: 2.22,
    bass: 1.14,
    'electric-guitar': 2.01,
    keys: 2.02,
  };

  const HOLD_DEFAULTS = {
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
      gripL: { x: 64, y: 172 },
      gripR: { x: 136, y: 172 },
      art: { w: 178, h: 118, anchorX: 0.5, anchorY: 0.78 },
      rot: 0,
      hideSticks: true,
    },
    bass: {
      art: { w: 114, h: 136, anchorX: 0.36, anchorY: 0.76 },
      rot: -16,
    },
    'electric-guitar': {
      art: { w: 118, h: 152, anchorX: 0.36, anchorY: 0.76 },
      rot: -18,
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
    };
  }

  function pngBoost(instId) {
    return PNG_BOOST[instId] ?? 2.2;
  }

  function mountTransform(grip) {
    const { gripL, art, rot } = grip;
    const w = art.w;
    const h = art.h;
    const ax = art.anchorX * w;
    const ay = art.anchorY * h;
    return {
      transform: `translate(${gripL.x},${gripL.y}) rotate(${rot}) translate(${-ax},${-ay})`,
      w,
      h,
    };
  }

  return { getGrip, mountTransform, pngBoost, HOLD_DEFAULTS, OVERRIDES, PNG_BOOST };
})();
