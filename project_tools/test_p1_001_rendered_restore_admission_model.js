'use strict';
const assert = require('assert');

function currentAdmission(candidate) {
  return Boolean(candidate.connected && candidate.width >= 2 && candidate.height >= 2);
}

function renderedAdmission(candidate) {
  if (!candidate.connected || candidate.width < 2 || candidate.height < 2) {
    return { ok: false, reason: 'no-box' };
  }
  if (candidate.display === 'none') return { ok: false, reason: 'display-none' };
  if (candidate.visibility === 'hidden' || candidate.visibility === 'collapse') {
    return { ok: false, reason: 'visibility-hidden' };
  }
  if (Number(candidate.effectiveOpacity) === 0) return { ok: false, reason: 'opacity-zero' };
  if (candidate.contentVisibility === 'hidden' || candidate.renderSkipped === true) {
    return { ok: false, reason: 'content-visibility' };
  }
  if (candidate.fullyClipped === true) return { ok: false, reason: 'fully-clipped' };
  return { ok: true };
}

const highScoreHidden = {
  connected: true,
  width: 300,
  height: 100,
  display: 'block',
  visibility: 'visible',
  effectiveOpacity: 0,
  contentVisibility: 'visible'
};
assert.strictEqual(currentAdmission(highScoreHidden), true);
assert.deepStrictEqual(renderedAdmission(highScoreHidden), { ok: false, reason: 'opacity-zero' });

for (const candidate of [
  { ...highScoreHidden, effectiveOpacity: 1, visibility: 'hidden' },
  { ...highScoreHidden, effectiveOpacity: 1, contentVisibility: 'hidden' },
  { ...highScoreHidden, effectiveOpacity: 1, renderSkipped: true },
  { ...highScoreHidden, effectiveOpacity: 1, fullyClipped: true }
]) {
  assert.strictEqual(currentAdmission(candidate), true);
  assert.strictEqual(renderedAdmission(candidate).ok, false);
}

const visible = {
  connected: true,
  width: 300,
  height: 100,
  display: 'block',
  visibility: 'visible',
  effectiveOpacity: 1,
  contentVisibility: 'visible',
  fullyClipped: false
};
assert.deepStrictEqual(renderedAdmission(visible), { ok: true });

function restore(locatorScore, candidate) {
  if (locatorScore < 60) return { restored: false, reason: 'locator-confidence' };
  const admission = renderedAdmission(candidate);
  return admission.ok ? { restored: true } : { restored: false, reason: admission.reason };
}

// Structural confidence is not rendered-target authority.
assert.deepStrictEqual(restore(80, highScoreHidden), { restored: false, reason: 'opacity-zero' });
assert.deepStrictEqual(restore(80, visible), { restored: true });

console.log('P1-001 rendered restore admission model: PASS');
