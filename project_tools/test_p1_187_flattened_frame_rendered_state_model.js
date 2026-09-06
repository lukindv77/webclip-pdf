'use strict';

const assert = require('assert');

function admitRenderedState(canvases, budget) {
  let nodes = 0;
  let pixels = 0;
  let bytes = 0;
  const items = [];

  for (const raw of canvases) {
    const width = Number(raw.width);
    const height = Number(raw.height);
    if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 0 || height < 0) {
      return { ok: false, reason: 'invalid-dimensions', nodes, pixels, bytes, items: [] };
    }

    nodes += 1;
    if (nodes > budget.maxNodes) {
      return { ok: false, reason: 'nodes', nodes, pixels, bytes, items: [] };
    }

    const itemPixels = width * height;
    if (!Number.isSafeInteger(itemPixels)) {
      return { ok: false, reason: 'pixels-overflow', nodes, pixels, bytes, items: [] };
    }

    pixels += itemPixels;
    if (!Number.isSafeInteger(pixels) || pixels > budget.maxPixels) {
      return { ok: false, reason: 'pixels', nodes, pixels, bytes, items: [] };
    }

    const itemBytes = itemPixels * 4;
    if (!Number.isSafeInteger(itemBytes)) {
      return { ok: false, reason: 'bytes-overflow', nodes, pixels, bytes, items: [] };
    }

    bytes += itemBytes;
    if (!Number.isSafeInteger(bytes) || bytes > budget.maxBytes) {
      return { ok: false, reason: 'bytes', nodes, pixels, bytes, items: [] };
    }

    items.push({
      width,
      height,
      originClean: raw.originClean !== false
    });
  }

  return { ok: true, reason: '', nodes, pixels, bytes, items };
}

function materialize(canvases, budget) {
  const receipt = admitRenderedState(canvases, budget);
  if (!receipt.ok) return { receipt, copied: [] };

  // Architecture model: all admission finishes before the first bitmap copy.
  // A real implementation should use CanvasRenderingContext2D.drawImage(sourceCanvas, 0, 0)
  // rather than pixel readback / data-URL serialization.
  const copied = receipt.items.map((item) => ({ ...item, copiedBy: 'drawImage' }));
  return { receipt, copied };
}

const roomy = { maxNodes: 4, maxPixels: 100, maxBytes: 400 };

let out = materialize([
  { width: 5, height: 5, originClean: true },
  { width: 4, height: 5, originClean: false }
], roomy);
assert.equal(out.receipt.ok, true);
assert.equal(out.receipt.nodes, 2);
assert.equal(out.receipt.pixels, 45);
assert.equal(out.receipt.bytes, 180);
assert.equal(out.copied.length, 2);
assert.equal(out.copied[1].originClean, false,
  'a non-origin-clean bitmap must remain representable without JS pixel readback');
assert.ok(out.copied.every((item) => item.copiedBy === 'drawImage'));

out = materialize(
  [{ width: 1, height: 1 }, { width: 1, height: 1 }],
  { maxNodes: 1, maxPixels: 100, maxBytes: 400 }
);
assert.equal(out.receipt.reason, 'nodes');
assert.equal(out.copied.length, 0,
  'rendered-state node overflow must reject before the first bitmap copy');

out = materialize(
  [{ width: 11, height: 10 }],
  { maxNodes: 4, maxPixels: 100, maxBytes: 1000 }
);
assert.equal(out.receipt.reason, 'pixels');
assert.equal(out.copied.length, 0,
  'pixel overflow must reject before the first bitmap copy');

out = materialize(
  [{ width: 6, height: 5 }],
  { maxNodes: 4, maxPixels: 100, maxBytes: 100 }
);
assert.equal(out.receipt.reason, 'bytes');
assert.equal(out.copied.length, 0,
  'byte overflow must reject before the first bitmap copy');

out = materialize(
  [{ width: Number.MAX_SAFE_INTEGER, height: 2 }],
  { maxNodes: 4, maxPixels: Number.MAX_SAFE_INTEGER, maxBytes: Number.MAX_SAFE_INTEGER }
);
assert.equal(out.receipt.reason, 'pixels-overflow');
assert.equal(out.copied.length, 0,
  'unsafe arithmetic must fail closed before bitmap work');

out = materialize([{ width: 0, height: 100 }], roomy);
assert.equal(out.receipt.ok, true);
assert.equal(out.receipt.pixels, 0);
assert.equal(out.receipt.bytes, 0);

console.log('P1-187 flattened-frame rendered-state model: PASS');
