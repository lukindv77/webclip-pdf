'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const MAX_PDF_BYTES = 48 * 1024 * 1024;
const PDF_CACHE_DB_VERSION = 4;
const EXACT_TRUST = 'exact-v2';

let cases = 0;
function test(name, fn) { fn(); cases += 1; }

function hashBase64Url(parts) {
  const h = crypto.createHash('sha256');
  for (const part of parts) h.update(part);
  return h.digest('base64url');
}

function authority(overrides = {}) {
  return {
    protocolVersion: 2,
    documentId: 'doc-1',
    contentRealmNonce: 'realm-1',
    sourceGenerationId: 'source-1',
    selectionAuthorityId: 'selection-1',
    selectionRevision: 7,
    selectionSnapshotSha256: 'sel-hash-1',
    documentActivityGeneration: 3,
    applicationGeneration: 11,
    navigationTransitionGeneration: 5,
    ...overrides
  };
}

function sameAuthority(a, b) {
  return [
    'protocolVersion', 'documentId', 'contentRealmNonce', 'sourceGenerationId',
    'selectionAuthorityId', 'selectionRevision', 'selectionSnapshotSha256',
    'documentActivityGeneration', 'applicationGeneration', 'navigationTransitionGeneration'
  ].every((key) => a?.[key] === b?.[key]);
}

function probeA(reviewed, observed) {
  if (!sameAuthority(reviewed, observed)) throw Object.assign(new Error('source changed before attach'), { code: 'WEBCLIP_PDF_SOURCE_CHANGED' });
  return { reviewed, observed };
}

function probeB(a, observed, frameTree) {
  if (!sameAuthority(a.observed, observed)) throw Object.assign(new Error('source changed before print'), { code: 'WEBCLIP_PDF_SOURCE_CHANGED' });
  const top = frameTree?.frame || null;
  if (!top?.id || !top?.loaderId) throw Object.assign(new Error('renderer identity unavailable'), { code: 'WEBCLIP_PDF_RENDER_IDENTITY_UNAVAILABLE' });
  return { authority: observed, topFrameId: top.id, topLoaderId: top.loaderId };
}

function probeC(b, observed, frameTree, session) {
  if (session?.externallyDetached) throw Object.assign(new Error('debugger detached'), { code: 'WEBCLIP_PDF_RENDER_DETACHED' });
  if (!sameAuthority(b.authority, observed)) throw Object.assign(new Error('source changed after print'), { code: 'WEBCLIP_PDF_SOURCE_CHANGED' });
  const top = frameTree?.frame || null;
  if (top?.id !== b.topFrameId || top?.loaderId !== b.topLoaderId) {
    throw Object.assign(new Error('renderer changed during print'), { code: 'WEBCLIP_PDF_RENDER_CHANGED' });
  }
  return true;
}

function finalizeArtifact({ physicalOperationId, renderAttemptId, sourceAuthority, b, observedC, frameTreeC, session, chunks, now = 1 }) {
  probeC(b, observedC, frameTreeC, session);
  const buffers = chunks.map((x) => Buffer.from(x));
  const byteLength = buffers.reduce((n, x) => n + x.length, 0);
  if (!byteLength) throw Object.assign(new Error('empty PDF'), { code: 'WEBCLIP_PDF_EMPTY' });
  if (byteLength > MAX_PDF_BYTES) throw Object.assign(new Error('too large'), { code: 'PDF_TOO_LARGE' });
  const sha256 = hashBase64Url(buffers);
  const pdfGenerationId = `pdfg-${crypto.randomUUID()}`;
  return {
    blob: Buffer.concat(buffers),
    receipt: {
      version: 1,
      physicalOperationId,
      renderAttemptId,
      pdfGenerationId,
      sourceGenerationId: sourceAuthority.sourceGenerationId,
      sourceDocumentId: sourceAuthority.documentId,
      selectionAuthorityId: sourceAuthority.selectionAuthorityId,
      byteLength,
      sha256,
      topFrameId: b.topFrameId,
      topLoaderId: b.topLoaderId,
      createdAt: now
    }
  };
}

function exactRow(artifact, extra = {}) {
  const r = artifact.receipt;
  return {
    key: `pdf-generation:${r.pdfGenerationId}`,
    schemaVersion: 4,
    trust: EXACT_TRUST,
    pdfGenerationId: r.pdfGenerationId,
    physicalOperationId: r.physicalOperationId,
    sourceGenerationId: r.sourceGenerationId,
    sourceDocumentId: r.sourceDocumentId,
    selectionAuthorityId: r.selectionAuthorityId,
    sha256: r.sha256,
    byteLength: r.byteLength,
    pdfBlob: artifact.blob,
    createdAt: r.createdAt,
    ...extra
  };
}

class PdfCacheV4 {
  constructor(v3Rows = []) {
    this.version = PDF_CACHE_DB_VERSION;
    this.pdfs = new Map(v3Rows.map((row) => [row.key, { ...row }]));
    this.retryIndex = new Map();
  }
  addExact(row) {
    assert.equal(row.trust, EXACT_TRUST);
    assert.equal(row.key, `pdf-generation:${row.pdfGenerationId}`);
    if (this.pdfs.has(row.key)) throw Object.assign(new Error('collision'), { code: 'WEBCLIP_PDF_GENERATION_COLLISION' });
    this.pdfs.set(row.key, Object.freeze({ ...row }));
  }
  bindRetry(slotKey, row) {
    if (!this.pdfs.has(row.key)) throw new Error('generation missing');
    this.retryIndex.set(slotKey, {
      slotKey,
      pdfGenerationId: row.pdfGenerationId,
      sha256: row.sha256,
      byteLength: row.byteLength,
      sourceGenerationId: row.sourceGenerationId,
      physicalOperationId: row.physicalOperationId,
      trust: row.trust
    });
  }
  commitExactAndRetry(slotKey, row) { this.addExact(row); this.bindRetry(slotKey, row); }
  resolveRetry(slotKey) {
    const idx = this.retryIndex.get(slotKey);
    if (!idx) return null;
    const row = this.pdfs.get(`pdf-generation:${idx.pdfGenerationId}`);
    if (!row) throw new Error('dangling retry index');
    return { idx, row };
  }
  getGeneration(g) { return this.pdfs.get(`pdf-generation:${g}`) || null; }
}

function migrateV3ToV4(v3Rows) {
  const db = new PdfCacheV4(v3Rows);
  for (const row of db.pdfs.values()) {
    if (row.schemaVersion !== 4 || row.trust !== EXACT_TRUST) {
      assert.equal(row.pdfGenerationId, undefined);
      assert.equal(row.sha256, undefined);
      assert.equal(row.sourceGenerationId, undefined);
    }
  }
  return db;
}

function offscreenExactFetch(db, spec) {
  const row = db.getGeneration(spec.pdfGenerationId);
  if (!row) throw Object.assign(new Error('generation not found'), { code: 'WEBCLIP_PDF_GENERATION_NOT_FOUND' });
  if (row.trust !== EXACT_TRUST || row.schemaVersion !== 4) throw Object.assign(new Error('legacy generation'), { code: 'WEBCLIP_PDF_GENERATION_LEGACY' });
  if (row.pdfGenerationId !== spec.pdfGenerationId) throw Object.assign(new Error('G mismatch'), { code: 'WEBCLIP_PDF_GENERATION_MISMATCH' });
  if (row.sha256 !== spec.expectedSha256) throw Object.assign(new Error('H mismatch'), { code: 'WEBCLIP_PDF_HASH_MISMATCH' });
  if (row.byteLength !== spec.expectedByteLength || row.pdfBlob.length !== spec.expectedByteLength) {
    throw Object.assign(new Error('N mismatch'), { code: 'WEBCLIP_PDF_LENGTH_MISMATCH' });
  }
  if (row.sourceGenerationId !== spec.sourceGenerationId) throw Object.assign(new Error('S mismatch'), { code: 'WEBCLIP_PDF_SOURCE_GENERATION_MISMATCH' });
  return row.pdfBlob;
}

function gcCandidates(db, { now, ttlMs, protectedGenerations = new Set() }) {
  const retryRefs = new Set([...db.retryIndex.values()].map((x) => x.pdfGenerationId));
  const out = [];
  for (const row of db.pdfs.values()) {
    if (row.trust !== EXACT_TRUST) continue;
    if (protectedGenerations.has(row.pdfGenerationId)) continue;
    if (retryRefs.has(row.pdfGenerationId)) continue;
    if (now - Number(row.createdAt || 0) < ttlMs) continue;
    out.push(row.pdfGenerationId);
  }
  return out;
}

function makeArtifact(seed = 'A', overrides = {}) {
  const reviewed = authority(overrides.authority || {});
  const a = probeA(reviewed, authority(overrides.a || overrides.authority || {}));
  const b = probeB(a, authority(overrides.b || overrides.authority || {}), { frame: { id: overrides.frameId || 'frame-1', loaderId: overrides.loaderId || 'loader-1' } });
  return finalizeArtifact({
    physicalOperationId: overrides.physicalOperationId || `op-${seed}`,
    renderAttemptId: overrides.renderAttemptId || `attempt-${seed}`,
    sourceAuthority: reviewed,
    b,
    observedC: authority(overrides.c || overrides.authority || {}),
    frameTreeC: { frame: { id: overrides.frameIdC || overrides.frameId || 'frame-1', loaderId: overrides.loaderIdC || overrides.loaderId || 'loader-1' } },
    session: overrides.session || { externallyDetached: false },
    chunks: overrides.chunks || [Buffer.from(`PDF-${seed}`)],
    now: overrides.now || 100
  });
}

// A/B/C source authority.
test('Probe A accepts exact reviewed authority', () => probeA(authority(), authority()));
test('Probe A rejects documentId change', () => assert.throws(() => probeA(authority(), authority({ documentId: 'doc-2' })), /source changed/));
test('Probe A rejects SPA application generation change', () => assert.throws(() => probeA(authority(), authority({ applicationGeneration: 12 })), /source changed/));
test('Probe A rejects selection revision change', () => assert.throws(() => probeA(authority(), authority({ selectionRevision: 8 })), /source changed/));
test('Probe A rejects selection snapshot hash change', () => assert.throws(() => probeA(authority(), authority({ selectionSnapshotSha256: 'other' })), /source changed/));
test('Probe B accepts stable source and captures renderer identity', () => { const b = probeB(probeA(authority(), authority()), authority(), { frame: { id: 'f', loaderId: 'l' } }); assert.equal(b.topFrameId, 'f'); assert.equal(b.topLoaderId, 'l'); });
test('Probe B rejects source change during attach/setup', () => assert.throws(() => probeB(probeA(authority(), authority()), authority({ navigationTransitionGeneration: 6 }), { frame: { id: 'f', loaderId: 'l' } }), /source changed/));
test('Probe B rejects missing loader identity', () => assert.throws(() => probeB(probeA(authority(), authority()), authority(), { frame: { id: 'f' } }), /renderer identity/));
test('Probe C accepts exact source and renderer', () => { const b = probeB(probeA(authority(), authority()), authority(), { frame: { id: 'f', loaderId: 'l' } }); assert.equal(probeC(b, authority(), { frame: { id: 'f', loaderId: 'l' } }, { externallyDetached: false }), true); });
test('Probe C rejects source generation change', () => { const b = probeB(probeA(authority(), authority()), authority(), { frame: { id: 'f', loaderId: 'l' } }); assert.throws(() => probeC(b, authority({ sourceGenerationId: 'source-2' }), { frame: { id: 'f', loaderId: 'l' } }, {}), /source changed/); });
test('Probe C rejects loader change', () => { const b = probeB(probeA(authority(), authority()), authority(), { frame: { id: 'f', loaderId: 'l1' } }); assert.throws(() => probeC(b, authority(), { frame: { id: 'f', loaderId: 'l2' } }, {}), /renderer changed/); });
test('Probe C rejects frame change', () => { const b = probeB(probeA(authority(), authority()), authority(), { frame: { id: 'f1', loaderId: 'l' } }); assert.throws(() => probeC(b, authority(), { frame: { id: 'f2', loaderId: 'l' } }, {}), /renderer changed/); });
test('Probe C rejects externally detached debugger session', () => { const b = probeB(probeA(authority(), authority()), authority(), { frame: { id: 'f', loaderId: 'l' } }); assert.throws(() => probeC(b, authority(), { frame: { id: 'f', loaderId: 'l' } }, { externallyDetached: true }), /debugger detached/); });

// Artifact trust issuance.
test('successful render issues distinct renderAttemptId and pdfGenerationId', () => { const x = makeArtifact('1'); assert.equal(x.receipt.renderAttemptId, 'attempt-1'); assert.match(x.receipt.pdfGenerationId, /^pdfg-/); assert.notEqual(x.receipt.pdfGenerationId, x.receipt.renderAttemptId); });
test('artifact receipt binds physical operation', () => assert.equal(makeArtifact('2').receipt.physicalOperationId, 'op-2'));
test('artifact receipt binds source and selection authority', () => { const x = makeArtifact('3'); assert.equal(x.receipt.sourceGenerationId, 'source-1'); assert.equal(x.receipt.selectionAuthorityId, 'selection-1'); });
test('artifact N equals exact concatenated byte length', () => { const x = makeArtifact('4', { chunks: [Buffer.from('ab'), Buffer.from('cdef')] }); assert.equal(x.receipt.byteLength, 6); assert.equal(x.blob.length, 6); });
test('empty stream never issues trusted generation', () => assert.throws(() => makeArtifact('5', { chunks: [] }), /empty PDF/));
test('oversize stream never issues trusted generation', () => { const b = probeB(probeA(authority(), authority()), authority(), { frame: { id: 'f', loaderId: 'l' } }); assert.throws(() => finalizeArtifact({ physicalOperationId:'p', renderAttemptId:'r', sourceAuthority:authority(), b, observedC:authority(), frameTreeC:{frame:{id:'f',loaderId:'l'}}, session:{}, chunks:[Buffer.alloc(MAX_PDF_BYTES + 1)] }), /too large/); });

// Incremental digest invariance.
test('SHA-256 is invariant to chunk boundaries', () => { const bytes = Buffer.from('0123456789abcdefghijklmnopqrstuvwxyz'); assert.equal(hashBase64Url([bytes]), hashBase64Url([bytes.subarray(0, 1), bytes.subarray(1, 11), bytes.subarray(11)])); });
test('SHA-256 changes when one PDF byte changes', () => assert.notEqual(hashBase64Url([Buffer.from('PDF-A')]), hashBase64Url([Buffer.from('PDF-B')])));
test('artifact SHA matches direct Node SHA over exact bytes', () => { const chunks = [Buffer.from('hello'), Buffer.from(' world')]; const x = makeArtifact('6', { chunks }); assert.equal(x.receipt.sha256, crypto.createHash('sha256').update(Buffer.concat(chunks)).digest('base64url')); });

// DB4 immutable generations and retryIndex.
test('v4 exact row key is generation-owned', () => { const x=makeArtifact('7'); const r=exactRow(x); assert.equal(r.key, `pdf-generation:${x.receipt.pdfGenerationId}`); });
test('exact generation insert is add-only and collision fails', () => { const db = new PdfCacheV4(); const row = exactRow(makeArtifact('8')); db.addExact(row); assert.throws(() => db.addExact(row), /collision/); });
test('atomic generation+retry binding resolves exact row', () => { const db=new PdfCacheV4(); const row=exactRow(makeArtifact('9')); db.commitExactAndRetry('tab:9',row); assert.equal(db.resolveRetry('tab:9').row.pdfGenerationId,row.pdfGenerationId); });
test('second tab save advances retry pointer without deleting first G', () => { const db=new PdfCacheV4(); const r1=exactRow(makeArtifact('10a')); const r2=exactRow(makeArtifact('10b')); db.commitExactAndRetry('tab:10',r1); db.commitExactAndRetry('tab:10',r2); assert.equal(db.resolveRetry('tab:10').row.pdfGenerationId,r2.pdfGenerationId); assert.ok(db.getGeneration(r1.pdfGenerationId)); });
test('operation pinned to G1 remains on G1 after retry pointer advances to G2', () => { const db=new PdfCacheV4(); const r1=exactRow(makeArtifact('11a')); const r2=exactRow(makeArtifact('11b')); db.commitExactAndRetry('tab:11',r1); const pinned=r1.pdfGenerationId; db.commitExactAndRetry('tab:11',r2); assert.equal(db.getGeneration(pinned).pdfGenerationId,r1.pdfGenerationId); });
test('retryIndex cannot be bound to missing generation', () => { const db=new PdfCacheV4(); assert.throws(() => db.bindRetry('tab:x', exactRow(makeArtifact('12'))), /generation missing/); });

// v3->v4 migration preserves legacy provenance exactly as legacy.
test('v3 migration preserves legacy row bytes/key', () => { const legacy={key:'tab:1',tabId:1,pdfBlob:Buffer.from('old'),createdAt:1}; const db=migrateV3ToV4([legacy]); assert.deepEqual(db.pdfs.get('tab:1').pdfBlob,legacy.pdfBlob); });
test('v3 migration does not synthesize G', () => { const db=migrateV3ToV4([{key:'tab:1'}]); assert.equal(db.pdfs.get('tab:1').pdfGenerationId,undefined); });
test('v3 migration does not synthesize H', () => { const db=migrateV3ToV4([{key:'tab:1'}]); assert.equal(db.pdfs.get('tab:1').sha256,undefined); });
test('v3 migration does not synthesize sourceGenerationId', () => { const db=migrateV3ToV4([{key:'tab:1'}]); assert.equal(db.pdfs.get('tab:1').sourceGenerationId,undefined); });
test('v3 migration leaves exact retryIndex empty', () => { const db=migrateV3ToV4([{key:'tab:1'}]); assert.equal(db.retryIndex.size,0); });
test('DB4 is the forward migration target', () => assert.equal(PDF_CACHE_DB_VERSION,4));

// Offscreen exact retrieval.
test('offscreen exact retrieval succeeds on G/H/N/S match', () => { const db=new PdfCacheV4(); const row=exactRow(makeArtifact('13')); db.addExact(row); const body=offscreenExactFetch(db,{pdfGenerationId:row.pdfGenerationId,expectedSha256:row.sha256,expectedByteLength:row.byteLength,sourceGenerationId:row.sourceGenerationId}); assert.deepEqual(body,row.pdfBlob); });
test('offscreen rejects unknown G', () => assert.throws(() => offscreenExactFetch(new PdfCacheV4(),{pdfGenerationId:'missing'}), /not found/));
test('offscreen rejects H mismatch', () => { const db=new PdfCacheV4(); const row=exactRow(makeArtifact('14')); db.addExact(row); assert.throws(() => offscreenExactFetch(db,{pdfGenerationId:row.pdfGenerationId,expectedSha256:'bad',expectedByteLength:row.byteLength,sourceGenerationId:row.sourceGenerationId}), /H mismatch/); });
test('offscreen rejects expected N mismatch', () => { const db=new PdfCacheV4(); const row=exactRow(makeArtifact('15')); db.addExact(row); assert.throws(() => offscreenExactFetch(db,{pdfGenerationId:row.pdfGenerationId,expectedSha256:row.sha256,expectedByteLength:row.byteLength+1,sourceGenerationId:row.sourceGenerationId}), /N mismatch/); });
test('offscreen rejects stored Blob N mismatch', () => { const db=new PdfCacheV4(); const row={...exactRow(makeArtifact('16')),byteLength:999}; db.addExact(row); assert.throws(() => offscreenExactFetch(db,{pdfGenerationId:row.pdfGenerationId,expectedSha256:row.sha256,expectedByteLength:999,sourceGenerationId:row.sourceGenerationId}), /N mismatch/); });
test('offscreen rejects source generation mismatch', () => { const db=new PdfCacheV4(); const row=exactRow(makeArtifact('17')); db.addExact(row); assert.throws(() => offscreenExactFetch(db,{pdfGenerationId:row.pdfGenerationId,expectedSha256:row.sha256,expectedByteLength:row.byteLength,sourceGenerationId:'other'}), /S mismatch/); });
test('legacy tab row cannot satisfy exact offscreen generation lookup', () => { const db=migrateV3ToV4([{key:'tab:2',pdfBlob:Buffer.from('x')}]); assert.throws(() => offscreenExactFetch(db,{pdfGenerationId:'tab:2'}), /not found/); });

// Local download / GC semantics.
test('local download can pin direct G without retryIndex', () => { const db=new PdfCacheV4(); const row=exactRow(makeArtifact('18'),{temporary:true}); db.addExact(row); assert.equal(db.retryIndex.size,0); assert.ok(db.getGeneration(row.pdfGenerationId)); });
test('retry-referenced generation is protected from TTL GC', () => { const db=new PdfCacheV4(); const row=exactRow(makeArtifact('19',{now:1})); db.commitExactAndRetry('tab:19',row); assert.deepEqual(gcCandidates(db,{now:100000,ttlMs:10}),[]); });
test('operation-protected generation is protected from TTL GC', () => { const db=new PdfCacheV4(); const row=exactRow(makeArtifact('20',{now:1})); db.addExact(row); assert.deepEqual(gcCandidates(db,{now:100000,ttlMs:10,protectedGenerations:new Set([row.pdfGenerationId])}),[]); });
test('expired unreferenced exact generation is GC candidate', () => { const db=new PdfCacheV4(); const row=exactRow(makeArtifact('21',{now:1})); db.addExact(row); assert.deepEqual(gcCandidates(db,{now:100000,ttlMs:10}),[row.pdfGenerationId]); });
test('fresh unreferenced exact generation is not GC candidate', () => { const db=new PdfCacheV4(); const row=exactRow(makeArtifact('22',{now:95})); db.addExact(row); assert.deepEqual(gcCandidates(db,{now:100,ttlMs:10}),[]); });
test('legacy rows are not silently classified as exact-G GC candidates', () => { const db=migrateV3ToV4([{key:'tab:legacy',createdAt:1}]); assert.deepEqual(gcCandidates(db,{now:100000,ttlMs:10}),[]); });

// Debugger/session identity.
test('render session maps external detach to sole active attempt for tab', () => { const map=new Map(); map.set(7,{renderAttemptId:'r1',externallyDetached:false}); const s=map.get(7); s.externallyDetached=true; assert.equal(map.get(7).renderAttemptId,'r1'); assert.equal(map.get(7).externallyDetached,true); });
test('second concurrent render on same tab is forbidden by session ownership', () => { const map=new Map([[7,{renderAttemptId:'r1'}]]); const admit=(tab,id)=>{ if(map.has(tab)) throw new Error('busy'); map.set(tab,{renderAttemptId:id}); }; assert.throws(()=>admit(7,'r2'),/busy/); });
test('same PDF bytes under distinct successful renders receive distinct G', () => { const a=makeArtifact('23a',{chunks:[Buffer.from('same')]}); const b=makeArtifact('23b',{chunks:[Buffer.from('same')]}); assert.equal(a.receipt.sha256,b.receipt.sha256); assert.notEqual(a.receipt.pdfGenerationId,b.receipt.pdfGenerationId); });
test('G is identity while H is content equality evidence', () => { const a=makeArtifact('24a',{chunks:[Buffer.from('same')]}); const b=makeArtifact('24b',{chunks:[Buffer.from('same')]}); assert.notEqual(a.receipt.pdfGenerationId,b.receipt.pdfGenerationId); assert.equal(a.receipt.sha256,b.receipt.sha256); });

console.log('Wave 1 PDF generation source specification model: PASS');
console.log(`cases=${cases}`);
console.log(`dbVersion=${PDF_CACHE_DB_VERSION}`);
console.log('identity=renderAttemptId -> EOF+H+N+ProbeC -> pdfGenerationId');
console.log('cache=immutable G rows + mutable retryIndex');
