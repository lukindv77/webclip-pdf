'use strict';

const assert = require('assert');

function carrierNeutralStyle(style = {}) {
  return {
    ...style,
    overflow: 'visible',
    contain: 'none',
    clipPath: 'none',
    mask: 'none',
    opacity: 1,
    filter: 'none',
    transform: 'none',
    position: 'static',
    background: 'transparent',
    border: 'none',
    boxShadow: 'none',
    beforeContent: 'none',
    afterContent: 'none'
  };
}

function renderSelected({ carriers = [], selectedStyle = {}, siblingSelected = false }) {
  let visible = true;
  let opacity = Number(selectedStyle.opacity ?? 1);
  let carrierPresentation = false;
  let shiftedByCarrier = false;

  for (const raw of carriers) {
    const style = raw.neutralized ? carrierNeutralStyle(raw) : raw;
    if (
      style.overflow === 'hidden'
      || style.overflow === 'clip'
      || /paint/.test(String(style.contain || ''))
      || (style.clipPath && style.clipPath !== 'none')
    ) visible = false;
    opacity *= Number(style.opacity ?? 1);
    if (
      (style.background && style.background !== 'transparent')
      || (style.border && style.border !== 'none')
      || (style.boxShadow && style.boxShadow !== 'none')
      || (style.beforeContent && style.beforeContent !== 'none')
      || (style.afterContent && style.afterContent !== 'none')
    ) carrierPresentation = true;
    if (
      style.position === 'fixed'
      || style.position === 'absolute'
      || (style.transform && style.transform !== 'none')
    ) shiftedByCarrier = true;
  }

  return { visible, opacity, carrierPresentation, shiftedByCarrier, siblingSelected };
}

const hostileCarrier = {
  overflow: 'hidden',
  contain: 'paint',
  clipPath: 'circle(10px)',
  opacity: 0.25,
  position: 'fixed',
  transform: 'translateX(300px)',
  background: 'red',
  border: '5px solid',
  boxShadow: '0 0 20px black',
  beforeContent: 'AD',
  afterContent: 'PROMO'
};

const current = renderSelected({ carriers: [hostileCarrier], selectedStyle: { opacity: 0.8 } });
assert.strictEqual(current.visible, false);
assert.strictEqual(current.opacity, 0.2);
assert.strictEqual(current.carrierPresentation, true);
assert.strictEqual(current.shiftedByCarrier, true);

const corrected = renderSelected({
  carriers: [{ ...hostileCarrier, neutralized: true }],
  selectedStyle: { opacity: 0.8 }
});
assert.strictEqual(corrected.visible, true);
assert.strictEqual(corrected.opacity, 0.8);
assert.strictEqual(corrected.carrierPresentation, false);
assert.strictEqual(corrected.shiftedByCarrier, false);

// A selected node's own presentation remains selected content; it is not
// neutralized merely because carrier ancestors must be neutral.
const selectedOwn = renderSelected({ carriers: [], selectedStyle: { opacity: 0.6, background: 'blue' } });
assert.strictEqual(selectedOwn.opacity, 0.6);
assert.strictEqual(selectedOwn.visible, true);

// An unselected sibling does not become selected merely because a carrier
// ancestor remains in the structural path to another selected descendant.
const siblingIsolation = renderSelected({
  carriers: [{ neutralized: true }],
  selectedStyle: {},
  siblingSelected: false
});
assert.strictEqual(siblingIsolation.siblingSelected, false);

console.log('P0-004 selection carrier fidelity model: PASS');
