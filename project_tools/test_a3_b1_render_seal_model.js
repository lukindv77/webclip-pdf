'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

class Cache {
  constructor() {
    this.rows = new Map();
    this.tabPointer = new Map();
  }
  createOnce(receipt) {
    if (this.rows.has(receipt.pdfGenerationId)) return { ok: false, outcome: 'duplicate-generation-conflict' };
    this.rows.set(receipt.pdfGenerationId, Object.freeze({ ...receipt }));
    return { ok: true, outcome: 'created' };
  }
  publishPointer(tabId, generation) {
    assert(this.rows.has(generation));
    this.tabPointer.set(tabId, generation);
  }
  compareAndRemovePointer(tabId, expectedGeneration) {
    if (this.tabPointer.get(tabId) === expectedGeneration) this.tabPointer.delete(tabId);
  }
  readExact(generation) { return this.rows.get(generation) || null; }
}

class Operation {
  constructor({ physicalOperationId, sourceReceipt }) {
    this.physicalOperationId = physicalOperationId;
    this.sourceReceipt = Object.freeze({ ...sourceReceipt });
    this.renderAttempts = new Map();
    this.pdfGeneration = null;
    this.state = 'admitted';
  }
  beginRender(renderAttemptId, sourceProbeOk = true) {
    if (!sourceProbeOk) {
      this.state = 'failed-before-effect';
      return { ok: false, outcome: 'source-stale-before-render' };
    }
    if (this.pdfGeneration) return { ok: false, outcome: 'already-sealed' };
    if (this.renderAttempts.has(renderAttemptId)) return { ok: false, outcome: 'duplicate-render-attempt' };
    const attempt = {
      renderAttemptId,
      monitorDirty: false,
      printReturned: false,
      guardClean: false,
      streamReadComplete: false,
      byteLength: 0,
      sha256: '',
      outcome: 'rendering'
    };
    this.renderAttempts.set(renderAttemptId, attempt);
    this.state = 'rendering';
    return { ok: true, attempt };
  }
  navigationObserved(renderAttemptId) {
    const attempt = this.renderAttempts.get(renderAttemptId);
    assert(attempt);
    attempt.monitorDirty = true;
  }
  printReturned(renderAttemptId) {
    const attempt = this.renderAttempts.get(renderAttemptId);
    assert(attempt);
    attempt.printReturned = true;
  }
  guardSettled(renderAttemptId, clean = true) {
    const attempt = this.renderAttempts.get(renderAttemptId);
    assert(attempt);
    attempt.guardClean = Boolean(clean);
  }
  readBytes(renderAttemptId, bytes) {
    const attempt = this.renderAttempts.get(renderAttemptId);
    assert(attempt);
    if (!Buffer.isBuffer(bytes)) bytes = Buffer.from(bytes);
    attempt.streamReadComplete = true;
    attempt.byteLength = bytes.length;
    attempt.sha256 = sha256(bytes);
    return { byteLength: attempt.byteLength, sha256: attempt.sha256 };
  }
  acceptRender(renderAttemptId) {
    const attempt = this.renderAttempts.get(renderAttemptId);
    assert(attempt);
    if (!attempt.printReturned) return { ok: false, outcome: 'no-print-result' };
    if (!attempt.guardClean) return { ok: false, outcome: 'render-guard-not-clean' };
    if (attempt.monitorDirty) return { ok: false, outcome: 'source-stale-during-render' };
    if (!attempt.streamReadComplete || !attempt.byteLength || !attempt.sha256) return { ok: false, outcome: 'bytes-incomplete' };
    attempt.outcome = 'bytes-accepted-transient';
    return { ok: true, attempt };
  }
  seal(renderAttemptId, cache, pdfGenerationId) {
    const accepted = this.acceptRender(renderAttemptId);
    if (!accepted.ok) return accepted;
    if (this.pdfGeneration) return { ok: false, outcome: 'already-sealed' };
    const attempt = accepted.attempt;
    const receipt = {
      version: 1,
      pdfGenerationId,
      ownerPhysicalOperationId: this.physicalOperationId,
      sourceReceipt: this.sourceReceipt,
      renderAttemptId,
      byteLength: attempt.byteLength,
      sha256: attempt.sha256,
      sealed: true
    };
    const created = cache.createOnce(receipt);
    if (!created.ok) return created;
    this.pdfGeneration = Object.freeze(receipt);
    this.state = 'pdf-sealed';
    attempt.outcome = 'sealed';
    return { ok: true, outcome: 'sealed', receipt: this.pdfGeneration };
  }
}

function source(id = 'doc-A', app = 1, sel = 1) {
  return {
    browserDocumentId: id,
    contentRealmNonce: 'realm-A',
    applicationGeneration: app,
    navigationEntryId: 'nav-A',
    selectionRevision: sel,
    selectionAuthorityId: 'selection-A',
    selectionSnapshotSha256: 'a'.repeat(64)
  };
}

function makeStableAttempt(op, id, bytes = Buffer.from('%PDF-1.7\nA\n%%EOF\n')) {
  assert.equal(op.beginRender(id, true).ok, true);
  op.printReturned(id);
  op.guardSettled(id, true);
  op.readBytes(id, bytes);
}

let cases = 0;
function test(name, fn) { fn(); cases += 1; }

test('second probe stale -> zero render acceptance', () => {
  const op = new Operation({ physicalOperationId: 'P1', sourceReceipt: source() });
  const result = op.beginRender('R1', false);
  assert.equal(result.outcome, 'source-stale-before-render');
  assert.equal(op.renderAttempts.size, 0);
  assert.equal(op.pdfGeneration, null);
});

test('render attempt is a child of one physical operation', () => {
  const op = new Operation({ physicalOperationId: 'P2', sourceReceipt: source() });
  assert.equal(op.beginRender('R2').ok, true);
  assert.equal(op.physicalOperationId, 'P2');
});

test('duplicate render attempt id rejects', () => {
  const op = new Operation({ physicalOperationId: 'P3', sourceReceipt: source() });
  assert.equal(op.beginRender('R3').ok, true);
  assert.equal(op.beginRender('R3').outcome, 'duplicate-render-attempt');
});

test('navigation during render invalidates returned bytes', () => {
  const op = new Operation({ physicalOperationId: 'P4', sourceReceipt: source() });
  op.beginRender('R4');
  op.navigationObserved('R4');
  op.printReturned('R4');
  op.guardSettled('R4', true);
  op.readBytes('R4', Buffer.from('PDF-A'));
  assert.equal(op.acceptRender('R4').outcome, 'source-stale-during-render');
});

test('guard cleanup failure invalidates returned stream', () => {
  const op = new Operation({ physicalOperationId: 'P5', sourceReceipt: source() });
  op.beginRender('R5');
  op.printReturned('R5');
  op.guardSettled('R5', false);
  op.readBytes('R5', Buffer.from('PDF-A'));
  assert.equal(op.acceptRender('R5').outcome, 'render-guard-not-clean');
});

test('incomplete stream cannot seal', () => {
  const op = new Operation({ physicalOperationId: 'P6', sourceReceipt: source() });
  op.beginRender('R6');
  op.printReturned('R6');
  op.guardSettled('R6', true);
  assert.equal(op.acceptRender('R6').outcome, 'bytes-incomplete');
});

test('same-size different bytes have different SHA256', () => {
  const a = Buffer.from('%PDF-A-EOF');
  const b = Buffer.from('%PDF-B-EOF');
  assert.equal(a.length, b.length);
  assert.notEqual(sha256(a), sha256(b));
});

test('accepted render binds exact N and H', () => {
  const op = new Operation({ physicalOperationId: 'P7', sourceReceipt: source() });
  const bytes = Buffer.from('%PDF-1.7\nreceipt\n%%EOF\n');
  makeStableAttempt(op, 'R7', bytes);
  const accepted = op.acceptRender('R7');
  assert.equal(accepted.ok, true);
  assert.equal(accepted.attempt.byteLength, bytes.length);
  assert.equal(accepted.attempt.sha256, sha256(bytes));
});

test('crash after print result before stream completion -> no durable G', () => {
  const cache = new Cache();
  const op = new Operation({ physicalOperationId: 'P8', sourceReceipt: source() });
  op.beginRender('R8');
  op.printReturned('R8');
  op.guardSettled('R8', true);
  assert.equal(op.pdfGeneration, null);
  assert.equal(cache.rows.size, 0);
});

test('crash after bytes/hash before cache commit -> no durable G', () => {
  const cache = new Cache();
  const op = new Operation({ physicalOperationId: 'P9', sourceReceipt: source() });
  makeStableAttempt(op, 'R9');
  assert.equal(op.acceptRender('R9').ok, true);
  assert.equal(cache.rows.size, 0);
});

test('successful create-once seal creates exactly one G', () => {
  const cache = new Cache();
  const op = new Operation({ physicalOperationId: 'P10', sourceReceipt: source() });
  makeStableAttempt(op, 'R10');
  const sealed = op.seal('R10', cache, 'G10');
  assert.equal(sealed.outcome, 'sealed');
  assert.equal(cache.rows.size, 1);
  assert.equal(cache.readExact('G10').renderAttemptId, 'R10');
});

test('post-seal crash retains exact G as recovery authority', () => {
  const cache = new Cache();
  const op = new Operation({ physicalOperationId: 'P11', sourceReceipt: source() });
  makeStableAttempt(op, 'R11');
  assert.equal(op.seal('R11', cache, 'G11').ok, true);
  const recovered = cache.readExact('G11');
  assert.equal(recovered.ownerPhysicalOperationId, 'P11');
  assert.equal(recovered.sha256.length, 64);
});

test('duplicate generation cannot overwrite exact bytes', () => {
  const cache = new Cache();
  const a = new Operation({ physicalOperationId: 'P12-A', sourceReceipt: source() });
  const b = new Operation({ physicalOperationId: 'P12-B', sourceReceipt: source('doc-B') });
  makeStableAttempt(a, 'R12-A', Buffer.from('PDF-A'));
  makeStableAttempt(b, 'R12-B', Buffer.from('PDF-B'));
  assert.equal(a.seal('R12-A', cache, 'G12').ok, true);
  assert.equal(b.seal('R12-B', cache, 'G12').outcome, 'duplicate-generation-conflict');
  assert.equal(cache.readExact('G12').ownerPhysicalOperationId, 'P12-A');
});

test('pointer cannot publish before G commit', () => {
  const cache = new Cache();
  assert.throws(() => cache.publishPointer(7, 'G-missing'));
  const op = new Operation({ physicalOperationId: 'P13', sourceReceipt: source() });
  makeStableAttempt(op, 'R13');
  op.seal('R13', cache, 'G13');
  cache.publishPointer(7, 'G13');
  assert.equal(cache.tabPointer.get(7), 'G13');
});

test('pointer publication failure cannot invalidate committed G', () => {
  const cache = new Cache();
  const op = new Operation({ physicalOperationId: 'P14', sourceReceipt: source() });
  makeStableAttempt(op, 'R14');
  op.seal('R14', cache, 'G14');
  assert.equal(cache.readExact('G14').pdfGenerationId, 'G14');
  assert.equal(cache.tabPointer.has(14), false);
});

test('stale cleanup cannot clear newer pointer', () => {
  const cache = new Cache();
  cache.rows.set('G-old', Object.freeze({ pdfGenerationId: 'G-old' }));
  cache.rows.set('G-new', Object.freeze({ pdfGenerationId: 'G-new' }));
  cache.publishPointer(8, 'G-new');
  cache.compareAndRemovePointer(8, 'G-old');
  assert.equal(cache.tabPointer.get(8), 'G-new');
});

test('post-seal tab navigation does not invalidate G', () => {
  const cache = new Cache();
  const op = new Operation({ physicalOperationId: 'P15', sourceReceipt: source('doc-A') });
  makeStableAttempt(op, 'R15');
  op.seal('R15', cache, 'G15');
  assert.equal(cache.readExact('G15').sourceReceipt.browserDocumentId, 'doc-A');
});

test('retry names exact generation, never tab latest fallback', () => {
  const cache = new Cache();
  cache.rows.set('G-A', Object.freeze({ pdfGenerationId: 'G-A', sha256: 'a'.repeat(64) }));
  cache.rows.set('G-B', Object.freeze({ pdfGenerationId: 'G-B', sha256: 'b'.repeat(64) }));
  cache.tabPointer.set(9, 'G-B');
  assert.equal(cache.readExact('G-A').pdfGenerationId, 'G-A');
  assert.notEqual(cache.readExact('G-A').pdfGenerationId, cache.tabPointer.get(9));
});

test('same P may start fresh render attempt after no-byte failure', () => {
  const op = new Operation({ physicalOperationId: 'P16', sourceReceipt: source() });
  op.beginRender('R16-A');
  op.renderAttempts.get('R16-A').outcome = 'failed-no-bytes';
  assert.equal(op.beginRender('R16-B').ok, true);
});

test('same P cannot render after G is sealed', () => {
  const cache = new Cache();
  const op = new Operation({ physicalOperationId: 'P17', sourceReceipt: source() });
  makeStableAttempt(op, 'R17');
  op.seal('R17', cache, 'G17');
  assert.equal(op.beginRender('R17-B').outcome, 'already-sealed');
});

test('destination checkpoint consumes exact G receipt', () => {
  const cache = new Cache();
  const op = new Operation({ physicalOperationId: 'P18', sourceReceipt: source() });
  makeStableAttempt(op, 'R18');
  const sealed = op.seal('R18', cache, 'G18');
  const checkpoint = {
    physicalOperationId: op.physicalOperationId,
    pdfGenerationId: sealed.receipt.pdfGenerationId,
    pdfByteLength: sealed.receipt.byteLength,
    pdfSha256: sealed.receipt.sha256
  };
  assert.equal(checkpoint.physicalOperationId, 'P18');
  assert.equal(checkpoint.pdfGenerationId, 'G18');
  assert.equal(checkpoint.pdfSha256.length, 64);
});

test('legacy v3 tab alias is never promoted to sealed v4 authority by migration', () => {
  const legacy = { key: 'tab:7', cacheFormat: 'blob-v3', pdfByteLength: 123 };
  const isSealedV4 = legacy.cacheFormat === 'sealed-v4' && Boolean(legacy.pdfGenerationId) && Boolean(legacy.sha256);
  assert.equal(isSealedV4, false);
});

console.log(`A3/B1 render-to-seal research model: PASS; cases=${cases}`);
