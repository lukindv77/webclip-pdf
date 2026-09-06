'use strict';
const assert = require('assert');

function currentGraph(node, remote = false) {
  const out = [];
  if (node.img) out.push(`img:${node.img}`);
  if (!remote) {
    if (node.background) out.push(`background:${node.background}`);
    if (node.font) out.push(`font:${node.font}`);
  }
  return out;
}

function targetGraph(node) {
  const out = [];
  const add = (kind, value) => { if (value) out.push(`${kind}:${value}`); };
  add('img', node.img);
  add('background', node.background);
  add('border-image', node.borderImage);
  add('list-style-image', node.listStyleImage);
  add('mask-image', node.maskImage);
  add('font', node.font);
  for (const pseudo of ['before', 'after', 'marker']) {
    const pseudoState = node[pseudo] || {};
    add(`${pseudo}-background`, pseudoState.background);
    add(`${pseudo}-content`, pseudoState.contentUrl);
    add(`${pseudo}-font`, pseudoState.font);
  }
  return [...new Set(out)];
}

function prepare(graph, states, limit = 500) {
  const attempted = graph.slice(0, limit);
  const omittedByLimit = Math.max(0, graph.length - attempted.length);
  let loaded = 0;
  let failed = 0;
  for (const resource of attempted) {
    if (states[resource] === 'failed') failed += 1;
    else loaded += 1;
  }
  return {
    attempted: attempted.length,
    loaded,
    failed,
    omittedByLimit,
    complete: failed === 0 && omittedByLimit === 0
  };
}

const top = {
  img: '/hero.jpg',
  background: '/card-bg.png',
  borderImage: '/border.png',
  font: '16px ArchiveFont',
  before: { background: '/badge.png', contentUrl: '/icon.svg', font: '12px BadgeFont' }
};
const remote = { background: '/frame-bg.png', font: '14px FrameFont' };

const current = [...currentGraph(top, false), ...currentGraph(remote, true)];
assert.deepStrictEqual(current, [
  'img:/hero.jpg',
  'background:/card-bg.png',
  'font:16px ArchiveFont'
]);

const target = [...targetGraph(top), ...targetGraph(remote)];
assert(target.includes('before-background:/badge.png'));
assert(target.includes('border-image:/border.png'));
assert(target.includes('background:/frame-bg.png'));
assert(target.includes('font:14px FrameFont'));

const states = {
  'before-background:/badge.png': 'failed',
  'background:/frame-bg.png': 'failed'
};
const currentReport = prepare(current, states);
assert.strictEqual(currentReport.failed, 0); // Missing graph edges falsely look healthy.
const targetReport = prepare(target, states);
assert.strictEqual(targetReport.failed, 2);
assert.strictEqual(targetReport.complete, false);

const limited = prepare(target, states, 2);
assert(limited.omittedByLimit > 0);
assert.strictEqual(limited.complete, false);

console.log('P1-003 selected visual resource graph model: PASS');
