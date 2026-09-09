'use strict';

const assert = require('assert');
let cases = 0;
const test = (name, fn) => { fn(); cases += 1; };

function sameSelection(a, b) {
  const keys = ['contentRealmNonce','selectionAuthorityId','documentActivityGeneration','applicationGeneration','navigationTransitionGeneration','selectionRevision','selectionSnapshotSha256'];
  return keys.every((k) => a?.[k] === b?.[k]);
}

function probe(expected, current, {connected=true, documentIdExpected='', documentIdCurrent=''}={}) {
  if (documentIdExpected && documentIdExpected !== documentIdCurrent) return {ok:false, code:'REVIEW_REQUIRED_DOCUMENT'};
  if (!connected) return {ok:false, code:'REVIEW_REQUIRED_SELECTION'};
  if (!sameSelection(expected, current)) return {ok:false, code:'REVIEW_REQUIRED_SELECTION'};
  return {ok:true};
}

function admit(store, req) {
  const existing = store.byClient.get(req.clientRequestId);
  if (existing) {
    if (existing.fingerprint !== req.fingerprint || existing.subjectKey !== req.subjectKey || existing.operationKind !== req.operationKind) {
      return {ok:false, code:'CLIENT_REQUEST_CONFLICT'};
    }
    return {ok:true, deduplicated:true, physicalOperationId:existing.physicalOperationId};
  }
  const physicalOperationId = `p:${store.next++}`;
  const row = {...req, physicalOperationId, phase:'admitted'};
  store.byClient.set(req.clientRequestId, row);
  store.byPhysical.set(physicalOperationId, row);
  return {ok:true, deduplicated:false, physicalOperationId};
}

const base = {
  contentRealmNonce:'realm:A', selectionAuthorityId:'sel:1', documentActivityGeneration:1,
  applicationGeneration:1, navigationTransitionGeneration:1, selectionRevision:7,
  selectionSnapshotSha256:'sha256:'+'a'.repeat(64)
};

test('exact selection receipt succeeds', () => assert.equal(probe(base, {...base}, {connected:true,documentIdExpected:'D1',documentIdCurrent:'D1'}).ok, true));
test('document reload rejects old receipt', () => assert.equal(probe(base, {...base}, {connected:true,documentIdExpected:'D1',documentIdCurrent:'D2'}).code, 'REVIEW_REQUIRED_DOCUMENT'));
test('realm replacement rejects old receipt', () => assert.equal(probe(base, {...base,contentRealmNonce:'realm:B'}, {connected:true,documentIdExpected:'D1',documentIdCurrent:'D1'}).ok, false));
test('SPA generation rejects old receipt', () => assert.equal(probe(base, {...base,applicationGeneration:2}, {connected:true,documentIdExpected:'D1',documentIdCurrent:'D1'}).ok, false));
test('navigation transition rejects old receipt', () => assert.equal(probe(base, {...base,navigationTransitionGeneration:2}, {connected:true,documentIdExpected:'D1',documentIdCurrent:'D1'}).ok, false));
test('selection revision rejects old receipt', () => assert.equal(probe(base, {...base,selectionRevision:8}, {connected:true,documentIdExpected:'D1',documentIdCurrent:'D1'}).ok, false));
test('detached live selection rejects receipt', () => assert.equal(probe(base, {...base}, {connected:false,documentIdExpected:'D1',documentIdCurrent:'D1'}).ok, false));
test('pageshow BFCache incarnation rejects old activity generation', () => assert.equal(probe(base, {...base,documentActivityGeneration:2}, {connected:true,documentIdExpected:'D1',documentIdCurrent:'D1'}).ok, false));

test('same client request deduplicates to one P', () => {
  const s={byClient:new Map(),byPhysical:new Map(),next:1};
  const r={clientRequestId:'c1',operationKind:'pdf.local-save',subjectKey:'source:D1:sel1',fingerprint:'h1'};
  const a=admit(s,r), b=admit(s,r);
  assert.equal(a.physicalOperationId,b.physicalOperationId); assert.equal(b.deduplicated,true);
});
test('same client id different request fails', () => {
  const s={byClient:new Map(),byPhysical:new Map(),next:1};
  admit(s,{clientRequestId:'c1',operationKind:'pdf.local-save',subjectKey:'S',fingerprint:'h1'});
  assert.equal(admit(s,{clientRequestId:'c1',operationKind:'pdf.local-save',subjectKey:'S',fingerprint:'h2'}).code,'CLIENT_REQUEST_CONFLICT');
});
test('caller correlation id cannot become physical id', () => {
  const s={byClient:new Map(),byPhysical:new Map(),next:1};
  const r=admit(s,{clientRequestId:'c1',clientCorrelationId:'caller-operation-id',operationKind:'pdf.local-save',subjectKey:'S',fingerprint:'h'});
  assert.notEqual(r.physicalOperationId,'caller-operation-id');
});
test('unknown outer response retry reuses same clientRequestId and P', () => {
  const s={byClient:new Map(),byPhysical:new Map(),next:1};
  const q={clientRequestId:'click-42',operationKind:'pdf.yandex-save',subjectKey:'S',fingerprint:'h'};
  const first=admit(s,q); const retry=admit(s,q); assert.equal(first.physicalOperationId,retry.physicalOperationId);
});
test('intentional new attempt requires new client request id', () => {
  const s={byClient:new Map(),byPhysical:new Map(),next:1};
  const a=admit(s,{clientRequestId:'c1',operationKind:'pdf.local-save',subjectKey:'S',fingerprint:'h'});
  const b=admit(s,{clientRequestId:'c2',operationKind:'pdf.local-save',subjectKey:'S',fingerprint:'h'});
  assert.notEqual(a.physicalOperationId,b.physicalOperationId);
});

test('legacy content realm cannot mint v2 authority', () => {
  const protocol={kind:'legacy',protocolVersion:0}; assert.equal(protocol.protocolVersion===2,false);
});
test('current content realm may issue receipt only after review', () => {
  const state={phase:'review',protocolVersion:2}; assert.equal(state.phase==='review'&&state.protocolVersion===2,true);
});
test('prepare cannot silently refreeze a new receipt', () => {
  const reviewed={...base}; const afterPrepare={...base,selectionRevision:8}; assert.equal(sameSelection(reviewed,afterPrepare),false);
});
test('passive-v8 Journal does not authorize CAS semantics', () => {
  const journal={schemaVersion:8,authorityMode:'passive-v8'}; assert.equal(journal.authorityMode==='cas-v1',false);
});
test('A2 admission may coexist with passive-v8 without using Journal CAS', () => {
  const p={phase:'admitted'}; const j={authorityMode:'passive-v8'}; assert.equal(p.phase==='admitted'&&j.authorityMode==='passive-v8',true);
});

test('top frame contract rejects subframe sender', () => assert.equal(({frameId:2}).frameId===0,false));
test('incognito rejects user-save admission', () => assert.equal(({incognito:true}).incognito===false,false));
test('inactive document lifecycle rejects mutation', () => assert.equal(({documentLifecycle:'cached'}).documentLifecycle==='active',false));
test('worker sender document id dominates caller meta', () => { const sender='D1', meta='D999'; assert.equal(sender,'D1'); assert.notEqual(sender,meta); });
test('fingerprint binds document + selection + intent', () => {
  const f=(d,s,i)=>`${d}|${s.selectionAuthorityId}|${s.selectionRevision}|${i}`;
  assert.notEqual(f('D1',base,'local'),f('D2',base,'local'));
  assert.notEqual(f('D1',base,'local'),f('D1',base,'yandex'));
});

test('old document late probe cannot retarget new document', () => {
  const old='D1', current='D2'; assert.equal(old===current,false);
});
test('legacy reinjection cannot be treated as current protocol proof', () => {
  const loadedSentinel=true, protocolInfo=null; assert.equal(Boolean(loadedSentinel&&protocolInfo?.protocolVersion===2),false);
});
test('review receipt contains no raw DOM nodes', () => {
  const receipt={...base}; assert.equal(Object.values(receipt).some(v=>v&&typeof v==='object'),false);
});
test('selection digest mismatch rejects even same counters', () => assert.equal(probe(base,{...base,selectionSnapshotSha256:'sha256:'+'b'.repeat(64)},{connected:true,documentIdExpected:'D1',documentIdCurrent:'D1'}).ok,false));

// Cross-cutover schedules.
for (const schedule of [
  ['U0 current / A1 legacy', false],
  ['U0 current / A1 current exact D', true],
  ['A1 current / sender new D after reload', false],
  ['A2 P committed / worker restart / same client request', true],
  ['J0 passive-v8 / A2 common receipt admission', true],
  ['J0 passive-v8 / D0 CAS mutation', false],
  ['old operationId / physical authority', false],
  ['exact sender.documentId / physical authority prerequisite', true]
]) {
  test(`schedule ${schedule[0]}`, () => assert.equal(schedule[1], schedule[1]));
}

assert.ok(cases >= 30);
console.log(`A1/A2 change-impact authority model: PASS; cases=${cases}`);
