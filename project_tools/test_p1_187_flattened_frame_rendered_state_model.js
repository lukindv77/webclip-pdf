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
      originClean: raw.originClean !== false,
      copyFails: Boolean(raw.copyFails)
    });
  }

  return { ok: true, reason: '', nodes, pixels, bytes, items };
}

function materialize(canvases, budget) {
  // P1-187 requires raster admission before a target canvas backing bitmap can
  // be materialized by the inert deep clone.
  const receipt = admitRenderedState(canvases, budget);
  if (!receipt.ok) {
    return {
      receipt,
      targetCanvasesCreated: 0,
      copied: 0,
      connected: false,
      discarded: true
    };
  }

  // Architecture model: target allocation starts only after aggregate admission.
  const targetCanvasesCreated = receipt.items.length;
  let copied = 0;
  for (const item of receipt.items) {
    if (item.width === 0 || item.height === 0) continue;
    if (item.copyFails) {
      return {
        receipt: { ...receipt, ok: false, reason: 'copy-failed' },
        targetCanvasesCreated,
        copied,
        connected: false,
        discarded: true
      };
    }
    // Real implementation: target.getContext('2d').drawImage(source, 0, 0).
    // No getImageData()/toDataURL() page-pixel extraction is required.
    copied += 1;
  }

  return {
    receipt,
    targetCanvasesCreated,
    copied,
    connected: true,
    discarded: false
  };
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
assert.equal(out.targetCanvasesCreated, 2);
assert.equal(out.copied, 2);
assert.equal(out.connected, true);

out = materialize(
  [{ width: 1, height: 1 }, { width: 1, height: 1 }],
  { maxNodes: 1, maxPixels: 100, maxBytes: 400 }
);
assert.equal(out.receipt.reason, 'nodes');
assert.equal(out.targetCanvasesCreated, 0,
  'rendered-state node overflow must reject before target canvas allocation');
assert.equal(out.copied, 0);
assert.equal(out.connected, false);

out = materialize(
  [{ width: 11, height: 10 }],
  { maxNodes: 4, maxPixels: 100, maxBytes: 1000 }
);
assert.equal(out.receipt.reason, 'pixels');
assert.equal(out.targetCanvasesCreated, 0,
  'pixel overflow must reject before target canvas allocation');

out = materialize(
  [{ width: 6, height: 5 }],
  { maxNodes: 4, maxPixels: 100, maxBytes: 100 }
);
assert.equal(out.receipt.reason, 'bytes');
assert.equal(out.targetCanvasesCreated, 0,
  'byte overflow must reject before target canvas allocation');

out = materialize(
  [{ width: Number.MAX_SAFE_INTEGER, height: 2 }],
  { maxNodes: 4, maxPixels: Number.MAX_SAFE_INTEGER, maxBytes: Number.MAX_SAFE_INTEGER }
);
assert.equal(out.receipt.reason, 'pixels-overflow');
assert.equal(out.targetCanvasesCreated, 0,
  'unsafe arithmetic must fail closed before target canvas allocation');

out = materialize([{ width: 0, height: 100 }], roomy);
assert.equal(out.receipt.ok, true);
assert.equal(out.copied, 0,
  'zero-area canvas has no bitmap pixels to copy');
assert.equal(out.connected, true);

out = materialize([
  { width: 2, height: 2 },
  { width: 2, height: 2, copyFails: true }
], roomy);
assert.equal(out.receipt.reason, 'copy-failed');
assert.equal(out.copied, 1,
  'a physical copy can fail after an earlier disconnected target was populated');
assert.equal(out.connected, false,
  'copy failure must discard the entire disconnected representation');
assert.equal(out.discarded, true);

console.log('P1-187 flattened-frame rendered-state model: PASS');
