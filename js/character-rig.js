const CharacterRig = (() => {
  const OUTLINE = '#1C1230';

  const HOLD_TO_POSE = {
    strum: 'strum',
    guitar: 'guitar',
    keys: 'keys',
    'two-hand': 'drums',
    'one-hand-up': 'brass',
  };

  const ROLE_TO_HOLD = {
    Lead: 'strum',
    Guitar: 'strum',
    Bass: 'strum',
    Drums: 'two-hand',
    Keys: 'keys',
    Vocals: 'one-hand-up',
    Horns: 'one-hand-up',
  };

  const SHOULDER = {
    L: { x: 58, y: 148 },
    R: { x: 142, y: 148 },
  };

  const DEFAULT_FOREARM = { strum: { L: 38, R: 44 }, guitar: { L: -34, R: 10 }, keys: { L: 26, R: 26 }, drums: { L: 20, R: 20 }, brass: { L: 8, R: 52 }, idle: { L: 18, R: 18 } };
  const DEFAULT_HAND = { strum: { L: 8, R: 6 }, guitar: { L: -20, R: 4 }, keys: { L: 0, R: 0 }, drums: { L: 0, R: 0 }, brass: { L: 0, R: 18 }, idle: { L: 0, R: 0 } };

  function poseFromHold(hold) {
    return HOLD_TO_POSE[hold] || 'idle';
  }

  function poseFromInstrument(inst) {
    if (!inst) return 'idle';
    return poseFromHold(inst.hold || 'strum');
  }

  function poseFromRole(role) {
    return poseFromHold(ROLE_TO_HOLD[role] || 'idle');
  }

  function computeArmAim(side, gripPoint, pose) {
    const sh = SHOULDER[side];
    const dx = gripPoint.x - sh.x;
    const dy = gripPoint.y - sh.y;
    const reachDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    const base = DEFAULT_FOREARM[pose] || DEFAULT_FOREARM.idle;
    const handBase = DEFAULT_HAND[pose] || DEFAULT_HAND.idle;
    const forearmOffset = side === 'L' ? -52 : 128;
    const forearm = reachDeg - forearmOffset;
    const hand = handBase[side] + (side === 'L' ? reachDeg * 0.08 : reachDeg * -0.06);
    return { forearm: Math.round(forearm * 10) / 10, hand: Math.round(hand * 10) / 10 };
  }

  // Per-pose joint offsets. The guitar pose reshapes the front arms so the
  // fret hand actually reaches up the neck and the strum hand hangs over
  // the strings, instead of both hands dangling at the hips.
  const FRONT_GEOM = {
    guitar: {
      L: { upper: { cx: 4, cy: 8 }, forearm: { x: -8, y: 8 }, hand: { x: -13, y: 15 } },
      R: { upper: { cx: -10, cy: 9 }, forearm: { x: -2, y: 16 }, hand: { x: -6, y: 29 } },
    },
  };


  function armChain(side, colors, pose, layer, options = {}) {
    const isLeft = side === 'L';
    const sx = SHOULDER[side].x;
    const shoulderY = layer === 'back' ? 154 : 148;
    const toward = isLeft ? 1 : -1;
    const fur = colors.fur || '#8E58FF';
    const furLight = colors.furLight || '#BC94FF';
    const hand = colors.hand || '#D2B2FF';
    const poseCls = `rig-pose-${pose}`;
    const geom = FRONT_GEOM[pose]?.[side] || { upper: { cx: 12 * toward, cy: 10 }, forearm: { x: 0, y: 18 }, hand: { x: 0, y: 32 } };

    const stick = pose === 'drums' && layer !== 'back' && !options.hideSticks
      ? `<line class="rig-stick" x1="${isLeft ? 28 : 172}" y1="188" x2="${isLeft ? 18 : 182}" y2="168" stroke="#8B7355" stroke-width="3" stroke-linecap="round"/>
         <ellipse class="rig-stick-tip" cx="${isLeft ? 16 : 184}" cy="166" rx="4" ry="3" fill="#deb887" stroke="${OUTLINE}" stroke-width="1"/>`
      : '';

    // The strumming hand holds a pick so the strum reads instantly.
    const pick = pose === 'guitar' && !isLeft && layer !== 'back'
      ? `<polygon class="rig-pick" points="-2,11 -8,20 4,19" fill="#f8f2e6" stroke="${OUTLINE}" stroke-width="1.6" stroke-linejoin="round"/>`
      : '';

    return `
      <g class="rig-arm rig-arm-${side} rig-layer-${layer} ${poseCls}" transform="translate(${sx},${shoulderY})">
        <g class="rig-upper-arm">
          <ellipse cx="${geom.upper.cx}" cy="${geom.upper.cy}" rx="17" ry="14" fill="${fur}" stroke="${OUTLINE}" stroke-width="3"/>
        </g>
        <g class="rig-forearm" transform="translate(${geom.forearm.x},${geom.forearm.y})">
          <g class="rig-forearm-pose" style="transform-box:fill-box;transform-origin:0 0">
            <ellipse cx="0" cy="14" rx="11" ry="13" fill="${furLight}" stroke="${OUTLINE}" stroke-width="2.5"/>
          </g>
        </g>
        <g class="rig-hand" transform="translate(${geom.hand.x},${geom.hand.y})">
          <g class="rig-hand-pose" style="transform-box:fill-box;transform-origin:0 0">
            <ellipse cx="0" cy="6" rx="9" ry="8" fill="${hand}" stroke="${OUTLINE}" stroke-width="2"/>
            ${pick}
          </g>
        </g>
        ${stick}
      </g>`;
  }

  function renderRiggedArms(colors, pose, layer = 'front', options = {}) {
    return armChain('L', colors, pose, layer, options) + armChain('R', colors, pose, layer, options);
  }

  function bennyColors() {
    return { fur: '#8E58FF', furLight: '#BC94FF', hand: '#D2B2FF' };
  }

  function lizzyColors() {
    return { fur: '#9458FF', furLight: '#C29AFF', hand: '#DAB6FF' };
  }

  function bandmateColors(m) {
    return { fur: m.fur, furLight: m.furLight, hand: m.belly };
  }

  function setArmClasses(arms, fn) {
    arms.forEach((arm) => {
      fn(arm);
    });
  }

  function hitClassForArm(side, pose, phase) {
    const isLeft = side === 'L';
    if (pose === 'guitar') {
      // The right hand always does the strumming; the fret hand only gets a
      // small finger-shift pulse via its -alt class.
      if (phase === 'press') return isLeft ? 'rig-press-alt' : 'rig-press';
      return isLeft ? 'rig-hit-alt' : 'rig-hit';
    }
    if (phase === 'press') {
      return isLeft ? 'rig-press' : 'rig-press-alt';
    }
    if (pose === 'strum') {
      return isLeft ? 'rig-hit-alt' : 'rig-hit';
    }
    return isLeft ? 'rig-hit' : 'rig-hit-alt';
  }

  function applyPose(rootEl, pose, phase = 'hit') {
    if (!rootEl) return;
    const poses = ['idle', 'strum', 'guitar', 'keys', 'drums', 'brass'];
    rootEl.querySelectorAll('.rig-arm').forEach((arm) => {
      poses.forEach((p) => arm.classList.remove(`rig-pose-${p}`));
      arm.classList.add(`rig-pose-${pose}`);
      arm.classList.remove('rig-hit', 'rig-hit-alt', 'rig-press', 'rig-press-alt');
      if (phase === 'hit' || phase === 'press') {
        void arm.offsetWidth;
        const side = arm.classList.contains('rig-arm-L') ? 'L' : 'R';
        arm.classList.add(hitClassForArm(side, pose, phase));
      }
    });
    rootEl.querySelectorAll('.rig-stick').forEach((s) => {
      s.classList.remove('rig-stick-hit', 'rig-stick-sustain');
      void s.offsetWidth;
      if ((phase === 'hit' || phase === 'press') && pose === 'drums') {
        s.classList.add(phase === 'press' ? 'rig-stick-sustain' : 'rig-stick-hit');
      }
    });
  }

  function applyGripAlignment(rootEl, inst) {
    if (!rootEl || !inst || typeof InstrumentGrips === 'undefined') return;
    const grip = InstrumentGrips.getGrip(inst);
    if (!grip) return;
    const pose = poseFromInstrument(inst);
    const grips = { L: grip.gripL, R: grip.gripR };

    rootEl.querySelectorAll('.rig-arm').forEach((arm) => {
      const side = arm.classList.contains('rig-arm-L') ? 'L' : 'R';
      // Grips can pin exact rest angles (used by the guitar pose, whose
      // custom chain geometry doesn't suit the generic aim solver).
      const aim = grip.rest?.[side] || computeArmAim(side, grips[side], pose);
      const fb = DEFAULT_FOREARM[pose] || DEFAULT_FOREARM.idle;
      const hb = DEFAULT_HAND[pose] || DEFAULT_HAND.idle;
      arm.style.setProperty('--rig-rest-forearm', `${aim.forearm}deg`);
      arm.style.setProperty('--rig-rest-hand', `${aim.hand}deg`);
      arm.style.setProperty('--rig-fallback-forearm', `${fb[side]}deg`);
      arm.style.setProperty('--rig-fallback-hand', `${hb[side]}deg`);
    });
  }

  function applyPoseFromInstrument(rootEl, inst, phase = 'hit') {
    applyPose(rootEl, poseFromInstrument(inst), phase);
  }

  function applyPoseFromRole(rootEl, role, phase = 'hit') {
    applyPose(rootEl, poseFromRole(role), phase);
  }

  function playInstrumentPress(rootEl, inst) {
    if (!rootEl || !inst) return;
    applyPoseFromInstrument(rootEl, inst, 'press');
    applyGripAlignment(rootEl, inst);
    rootEl.classList.add('rig-playing');
  }

  function playInstrumentHit(rootEl, inst) {
    if (!rootEl || !inst) return;
    applyPoseFromInstrument(rootEl, inst, 'hit');
    applyGripAlignment(rootEl, inst);
  }

  function playInstrumentRelease(rootEl, inst) {
    if (!rootEl) return;
    rootEl.classList.remove('rig-playing');
    applyPoseFromInstrument(rootEl, inst || { hold: 'idle' }, 'rest');
    if (inst) applyGripAlignment(rootEl, inst);
  }

  function playInstrumentSustain(rootEl, inst) {
    if (!rootEl || !inst) return;
    rootEl.classList.add('rig-playing');
    applyGripAlignment(rootEl, inst);
  }

  function syncInstrumentPose(rootEl, inst) {
    if (!rootEl || !inst) return;
    applyPoseFromInstrument(rootEl, inst, 'rest');
    applyGripAlignment(rootEl, inst);
  }

  return {
    poseFromHold,
    poseFromInstrument,
    poseFromRole,
    renderRiggedArms,
    computeArmAim,
    bennyColors,
    lizzyColors,
    bandmateColors,
    applyPose,
    applyGripAlignment,
    applyPoseFromInstrument,
    applyPoseFromRole,
    playInstrumentPress,
    playInstrumentHit,
    playInstrumentRelease,
    playInstrumentSustain,
    syncInstrumentPose,
  };
})();
