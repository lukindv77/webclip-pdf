'use strict';

const assert = require('assert');

function axisScrollContainer(overflowX, overflowY) {
  const scrollable = new Set(['auto', 'scroll', 'hidden']);
  return {
    x: scrollable.has(overflowX),
    y: scrollable.has(overflowY)
  };
}

function nearestScrollContainerPerAxis(chain) {
  const result = { x: 'viewport', y: 'viewport' };
  for (const item of chain) {
    const axes = axisScrollContainer(item.overflowX, item.overflowY);
    if (result.x === 'viewport' && axes.x) result.x = item.id;
    if (result.y === 'viewport' && axes.y) result.y = item.id;
  }
  return result;
}

function legacyNearestAnyAxis(chain) {
  for (const item of chain) {
    const axes = axisScrollContainer(item.overflowX, item.overflowY);
    if (axes.x || axes.y) return item.id;
  }
  return 'viewport';
}

function staticPrintRepresentation(node) {
  return {
    ...node,
    overflowX: 'visible',
    overflowY: 'visible',
    position: node.position === 'fixed' || node.position === 'sticky' ? 'static' : node.position
  };
}

class UserReachedAxisHistory {
  constructor() {
    this.max = new Map();
  }
  admit(contextId, axis, extent, authority) {
    const key = `${contextId}:${axis}`;
    if (authority !== 'user') return;
    this.max.set(key, Math.max(this.max.get(key) || 0, Math.max(0, Number(extent) || 0)));
  }
  get(contextId, axis) { return this.max.get(`${contextId}:${axis}`) || 0; }
}

function currentShapeCounterexample() {
  const chain = [
    { id: 'table-wrapper', overflowX: 'auto', overflowY: 'clip' },
    { id: 'page', overflowX: 'visible', overflowY: 'auto' }
  ];
  const legacy = legacyNearestAnyAxis(chain);
  const perAxis = nearestScrollContainerPerAxis(chain);
  assert.strictEqual(legacy, 'table-wrapper');
  assert.deepStrictEqual(perAxis, { x: 'table-wrapper', y: 'page' });
  return 'PD7 counterexample: one nearest-scroll-container identity is false once x and y can have different scroll ancestors';
}

function run() {
  console.log(currentShapeCounterexample());

  // A. The same node can own horizontal scrolling but not vertical scrolling.
  {
    const axes = axisScrollContainer('auto', 'clip');
    assert.deepStrictEqual(axes, { x: true, y: false });
  }

  // B. Sticky top/bottom and left/right can resolve to different ancestors.
  {
    const chain = [
      { id: 'inner', overflowX: 'auto', overflowY: 'clip' },
      { id: 'outer', overflowX: 'clip', overflowY: 'auto' }
    ];
    assert.deepStrictEqual(nearestScrollContainerPerAxis(chain), { x: 'inner', y: 'outer' });
  }

  // C. Selected static-PDF normalization must remove retained scroll clipping on both axes.
  {
    const selected = { id: 'selected-scrollport', overflowX: 'auto', overflowY: 'clip', position: 'relative' };
    const normalized = staticPrintRepresentation(selected);
    assert.strictEqual(normalized.overflowX, 'visible');
    assert.strictEqual(normalized.overflowY, 'visible');
  }

  // D. Sticky/fixed descendants need one explicit static placement for PDF rather than inherited paged behavior.
  {
    assert.strictEqual(staticPrintRepresentation({ overflowX:'visible', overflowY:'visible', position:'sticky' }).position, 'static');
    assert.strictEqual(staticPrintRepresentation({ overflowX:'visible', overflowY:'visible', position:'fixed' }).position, 'static');
  }

  // E. P1-230 boundary is axis-qualified and monotonic; horizontal user reach must not imply vertical reach.
  {
    const h = new UserReachedAxisHistory();
    h.admit('panel', 'x', 500, 'user');
    h.admit('panel', 'y', 900, 'page-script');
    h.admit('panel', 'x', 120, 'user'); // scroll-back cannot shrink boundary.
    assert.strictEqual(h.get('panel', 'x'), 500);
    assert.strictEqual(h.get('panel', 'y'), 0);
  }

  // F. WebClip-owned programmatic movement cannot enlarge user reach, regardless of axis.
  {
    const h = new UserReachedAxisHistory();
    h.admit('panel', 'x', 700, 'webclip');
    h.admit('panel', 'y', 400, 'webclip');
    assert.strictEqual(h.get('panel', 'x'), 0);
    assert.strictEqual(h.get('panel', 'y'), 0);
  }

  // G. Staticizing overflow can change flex/grid min-size behavior, so geometry needs a post-normalization receipt.
  {
    const source = { overflowX: 'auto', overflowY: 'clip', minInlineAutoApplies: true, width: 520 };
    const print = { ...staticPrintRepresentation(source), width: 640 };
    assert.notStrictEqual(source.width, print.width);
    assert.strictEqual(print.overflowX, 'visible');
  }

  // H. Dual-axis ordinary scroller remains a positive control.
  {
    assert.deepStrictEqual(axisScrollContainer('auto', 'scroll'), { x: true, y: true });
  }

  console.log('PD7 single-axis scroll container semantic model: PASS');
}

run();
