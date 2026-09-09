'use strict';

const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const LIMITS = Object.freeze({
  idChars: 180,
  operationKindChars: 80,
  subjectKeyChars: 512,
  domainReceiptIdChars: 240,
  receiptJsonChars: 64 * 1024,
  activeReceipts: 256,
  totalReceipts: 2048,
  terminalRetentionMs: 30 * 24 * 60 * 60 * 1000
});
const PROTOCOL = Object.freeze({ worker: 2, content: 2, offscreen: 2, extensionPage: 2 });
const ID_RE = /^[A-Za-z0-9._:-]+$/;

function id(value, {required = false, max = LIMITS.idChars, label = 'id'} = {}) {
  const s = String(value ?? '').trim();
  if (!s) {
    if (required) throw new Error(`${label}-required`);
    return '';
  }
  if (s.length > max || !ID_RE.test(s)) throw new Error(`${label}-invalid`);
  return s;
}
function operationKind(value) {
  const s = id(value, {required:true, max:LIMITS.operationKindChars, label:'operation-kind'});
  if (!/^[a-z0-9][a-z0-9.-]*$/.test(s)) throw new Error('operation-kind-invalid');
  return s;
}
function subjectKey(value) {
  const s = String(value ?? '').trim();
  if (!s || s.length > LIMITS.subjectKeyChars || /[\r\n\0]/.test(s)) throw new Error('subject-key-invalid');
  if (/https?:\/\//i.test(s) || /oauth|authorization|access[_-]?token/i.test(s)) throw new Error('subject-key-secret-or-url');
  return s;
}
function sha256Hex(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function fingerprint(kind, canonicalImmutable) {
  const k = operationKind(kind);
  const payload = JSON.stringify([k, canonicalImmutable]);
  return `sha256:${sha256Hex(payload)}`;
}
function physicalId(prefix = 'op') { return `${prefix}:${crypto.randomUUID()}`; }

class ReceiptStore {
  constructor() { this.byPhysical = new Map(); this.byRequest = new Map(); this.revision = 0; }
  activeCount() { return [...this.byPhysical.values()].filter((x) => !x.terminalAt).length; }
  admit({clientRequestId = '', clientCorrelationId = '', kind, subject, requestFingerprint}) {
    const requestId = id(clientRequestId, {max:LIMITS.idChars, label:'client-request'});
    const correlationId = id(clientCorrelationId, {max:LIMITS.idChars, label:'client-correlation'});
    const k = operationKind(kind);
    const subjectNormalized = subjectKey(subject);
    assert.match(requestFingerprint, /^sha256:[0-9a-f]{64}$/);
    if (requestId && this.byRequest.has(requestId)) {
      const existing = this.byPhysical.get(this.byRequest.get(requestId));
      if (!existing || existing.operationKind !== k || existing.subjectKey !== subjectNormalized || existing.requestFingerprint !== requestFingerprint) {
        const e = new Error('client-request-mismatch'); e.code = 'WEBCLIP_CLIENT_REQUEST_MISMATCH'; throw e;
      }
      return {receipt: existing, deduplicated: true};
    }
    if (this.activeCount() >= LIMITS.activeReceipts) {
      const e = new Error('capacity'); e.code = 'WEBCLIP_OPERATION_RECEIPT_CAPACITY'; throw e;
    }
    const now = Date.now();
    const receipt = {
      schemaVersion: 1,
      identityVersion: 2,
      protocolVersion: PROTOCOL.worker,
      physicalOperationId: physicalId(k.slice(0, 24)),
      ...(requestId ? {clientRequestId: requestId} : {}),
      ...(correlationId ? {clientCorrelationId: correlationId} : {}),
      operationKind: k,
      subjectKey: subjectNormalized,
      requestFingerprint,
      receiptRevision: 1,
      phase: 'admitted',
      admittedAt: now,
      updatedAt: now
    };
    assert.ok(JSON.stringify(receipt).length <= LIMITS.receiptJsonChars);
    this.byPhysical.set(receipt.physicalOperationId, receipt);
    if (requestId) this.byRequest.set(requestId, receipt.physicalOperationId);
    return {receipt, deduplicated:false};
  }
  cas(physicalOperationId, expectedRevision, patch) {
    const p = id(physicalOperationId, {required:true, label:'physical'});
    const current = this.byPhysical.get(p);
    if (!current) throw new Error('not-found');
    if (current.receiptRevision !== expectedRevision) {
      const e = new Error('revision-mismatch'); e.code = 'WEBCLIP_OPERATION_RECEIPT_STALE'; throw e;
    }
    const next = {...current, ...patch, receiptRevision: current.receiptRevision + 1, updatedAt: Date.now()};
    assert.equal(next.physicalOperationId, current.physicalOperationId);
    assert.equal(next.clientRequestId || '', current.clientRequestId || '');
    assert.equal(next.operationKind, current.operationKind);
    assert.equal(next.subjectKey, current.subjectKey);
    assert.equal(next.requestFingerprint, current.requestFingerprint);
    this.byPhysical.set(p, next);
    return next;
  }
  bySubject(kind, subject) {
    const k = operationKind(kind); const s = subjectKey(subject);
    return [...this.byPhysical.values()].filter((r) => r.operationKind === k && r.subjectKey === s && !r.terminalAt);
  }
}

function protocolInfo(kind, bundleVersion='0.9.9-dev') {
  assert.ok(Object.hasOwn(PROTOCOL, kind));
  return Object.freeze({kind, protocolVersion:PROTOCOL[kind], bundleVersion});
}
function requireProtocol(actual, kind) {
  if (!actual || actual.protocolVersion !== PROTOCOL[kind]) {
    const e = new Error('protocol-mismatch'); e.code = 'WEBCLIP_PROTOCOL_MISMATCH'; throw e;
  }
  return true;
}

function contentReceipt(state) {
  for (const key of ['contentRealmNonce','selectionAuthorityId']) id(state[key], {required:true,label:key});
  for (const key of ['documentActivityGeneration','applicationGeneration','navigationTransitionGeneration','selectionRevision']) {
    assert.ok(Number.isSafeInteger(state[key]) && state[key] > 0, `${key} invalid`);
  }
  return Object.freeze({
    version: 1,
    protocolVersion: PROTOCOL.content,
    contentRealmNonce: state.contentRealmNonce,
    selectionAuthorityId: state.selectionAuthorityId,
    documentActivityGeneration: state.documentActivityGeneration,
    applicationGeneration: state.applicationGeneration,
    navigationTransitionGeneration: state.navigationTransitionGeneration,
    selectionRevision: state.selectionRevision,
    selectionSnapshotSha256: `sha256:${sha256Hex(state.selectionSnapshotCanonical || '')}`,
    reviewedAt: state.reviewedAt
  });
}
function contentReceiptCurrent(receipt, state) {
  return receipt.protocolVersion === PROTOCOL.content
    && receipt.contentRealmNonce === state.contentRealmNonce
    && receipt.documentActivityGeneration === state.documentActivityGeneration
    && receipt.applicationGeneration === state.applicationGeneration
    && receipt.navigationTransitionGeneration === state.navigationTransitionGeneration
    && receipt.selectionRevision === state.selectionRevision
    && receipt.selectionSnapshotSha256 === `sha256:${sha256Hex(state.selectionSnapshotCanonical || '')}`;
}

function mapLegacyOperationId(operationId) {
  const correlation = id(operationId, {max:LIMITS.idChars,label:'legacy-operation'});
  return {clientRequestId:'', clientCorrelationId:correlation, physicalOperationId:''};
}

function mutationAdmission({senderProtocol, contentAuthority, browserDocumentId, clientRequestId, clientCorrelationId, kind, subject, immutableArgs}, store) {
  requireProtocol(senderProtocol, 'content');
  if (!contentAuthority || contentAuthority.protocolVersion !== PROTOCOL.content) { const e = new Error('review'); e.code='WEBCLIP_REVIEW_REQUIRED'; throw e; }
  id(browserDocumentId, {required:true,label:'browser-document'});
  const fp = fingerprint(kind, immutableArgs);
  return store.admit({clientRequestId, clientCorrelationId, kind, subject, requestFingerprint:fp});
}

const cases = [];
function check(name, fn) { fn(); cases.push(name); }
function rejects(name, fn, code) { check(name, () => { assert.throws(fn, (e) => !code || e.code === code); }); }

check('id accepts bounded ids', () => assert.equal(id('req:abc'), 'req:abc'));
rejects('id rejects spaces', () => id('bad id',{required:true}), null);
rejects('id rejects oversize', () => id('x'.repeat(181),{required:true}), null);
check('subject rejects raw URL', () => assert.throws(() => subjectKey('https://example.com/x')));
check('subject rejects token words', () => assert.throws(() => subjectKey('access_token:abc')));
check('fingerprint stable', () => assert.equal(fingerprint('pdf.save',['A',1]), fingerprint('pdf.save',['A',1])));
check('fingerprint changes', () => assert.notEqual(fingerprint('pdf.save',['A',1]), fingerprint('pdf.save',['B',1])));
check('physical ids unique', () => assert.notEqual(physicalId(), physicalId()));

const store = new ReceiptStore();
const baseArgs = {clientRequestId:'req:1',clientCorrelationId:'ui:1',kind:'pdf.save',subject:'source:docA:S1',requestFingerprint:fingerprint('pdf.save',['docA','S1'])};
let first;
check('first admission', () => { first = store.admit(baseArgs); assert.equal(first.deduplicated,false); });
check('same request dedup', () => { const x=store.admit(baseArgs); assert.equal(x.deduplicated,true); assert.equal(x.receipt.physicalOperationId,first.receipt.physicalOperationId); });
rejects('request mismatch rejected', () => store.admit({...baseArgs,subject:'source:docB:S2'}), 'WEBCLIP_CLIENT_REQUEST_MISMATCH');
check('display correlation can repeat on another request', () => { const x=store.admit({...baseArgs,clientRequestId:'req:2'}); assert.notEqual(x.receipt.physicalOperationId,first.receipt.physicalOperationId); });
check('background request may omit clientRequestId', () => { const x=store.admit({clientCorrelationId:'',kind:'maintenance.backup',subject:'journal-revision:R1',requestFingerprint:fingerprint('maintenance.backup',['R1'])}); assert.equal(x.receipt.clientRequestId,undefined); });
check('CAS advances receipt revision', () => { const x=store.cas(first.receipt.physicalOperationId,1,{phase:'rendering'}); assert.equal(x.receiptRevision,2); });
rejects('stale CAS rejected', () => store.cas(first.receipt.physicalOperationId,1,{phase:'wrong'}), 'WEBCLIP_OPERATION_RECEIPT_STALE');
check('subject discovery exact', () => assert.equal(store.bySubject('pdf.save','source:docA:S1').length,2));

check('worker protocol info', () => assert.equal(protocolInfo('worker').protocolVersion,2));
check('content protocol accepted', () => assert.equal(requireProtocol(protocolInfo('content'),'content'),true));
rejects('old content protocol rejected', () => requireProtocol({protocolVersion:1},'content'), 'WEBCLIP_PROTOCOL_MISMATCH');
rejects('missing protocol rejected', () => requireProtocol(null,'content'), 'WEBCLIP_PROTOCOL_MISMATCH');

const state = {
  contentRealmNonce:'realm:1', selectionAuthorityId:'sel:1', documentActivityGeneration:1,
  applicationGeneration:4, navigationTransitionGeneration:3, selectionRevision:8,
  selectionSnapshotCanonical:'include:A|exclude:B', reviewedAt:Date.now()
};
const reviewed = contentReceipt(state);
check('selection receipt current', () => assert.equal(contentReceiptCurrent(reviewed,state),true));
check('reload/activity generation invalidates', () => assert.equal(contentReceiptCurrent(reviewed,{...state,documentActivityGeneration:2}),false));
check('SPA app generation invalidates', () => assert.equal(contentReceiptCurrent(reviewed,{...state,applicationGeneration:5}),false));
check('navigation generation invalidates', () => assert.equal(contentReceiptCurrent(reviewed,{...state,navigationTransitionGeneration:4}),false));
check('selection revision invalidates', () => assert.equal(contentReceiptCurrent(reviewed,{...state,selectionRevision:9}),false));
check('snapshot digest invalidates', () => assert.equal(contentReceiptCurrent(reviewed,{...state,selectionSnapshotCanonical:'include:C'}),false));

check('legacy operation id becomes correlation only', () => {
  const x=mapLegacyOperationId('legacy:123');
  assert.equal(x.clientCorrelationId,'legacy:123'); assert.equal(x.clientRequestId,''); assert.equal(x.physicalOperationId,'');
});

const admissionStore = new ReceiptStore();
check('v2 mutation admission creates physical id', () => {
  const x=mutationAdmission({senderProtocol:protocolInfo('content'),contentAuthority:reviewed,browserDocumentId:'doc:abc',clientRequestId:'request:save1',clientCorrelationId:'ui:save1',kind:'pdf.save',subject:'source:docabc:S9',immutableArgs:['S9','read']},admissionStore);
  assert.match(x.receipt.physicalOperationId,/:/);
  assert.notEqual(x.receipt.physicalOperationId,'ui:save1');
});
rejects('mutation from old content rejected', () => mutationAdmission({senderProtocol:{protocolVersion:1},contentAuthority:reviewed,browserDocumentId:'doc:abc',clientRequestId:'request:x',clientCorrelationId:'ui:x',kind:'pdf.save',subject:'source:docabc:S9',immutableArgs:['S9']},admissionStore), 'WEBCLIP_PROTOCOL_MISMATCH');
rejects('mutation without reviewed receipt rejected', () => mutationAdmission({senderProtocol:protocolInfo('content'),contentAuthority:null,browserDocumentId:'doc:abc',clientRequestId:'request:y',clientCorrelationId:'ui:y',kind:'pdf.save',subject:'source:docabc:S9',immutableArgs:['S9']},admissionStore), 'WEBCLIP_REVIEW_REQUIRED');

check('receipt contains no raw URL/token', () => {
  for (const r of store.byPhysical.values()) {
    const json=JSON.stringify(r);
    assert.doesNotMatch(json,/https?:\/\//i);
    assert.doesNotMatch(json,/access[_-]?token|authorization/i);
  }
});
check('receipt json bound', () => assert.ok(JSON.stringify(first.receipt).length < LIMITS.receiptJsonChars));
check('terminal retention is 30 days', () => assert.equal(LIMITS.terminalRetentionMs,30*24*60*60*1000));
check('active capacity bounded', () => assert.equal(LIMITS.activeReceipts,256));
check('total capacity bounded', () => assert.equal(LIMITS.totalReceipts,2048));

const errorCodes = [
  'WEBCLIP_PROTOCOL_MISMATCH','WEBCLIP_REVIEW_REQUIRED','WEBCLIP_CLIENT_REQUEST_MISMATCH',
  'WEBCLIP_OPERATION_RECEIPT_CAPACITY','WEBCLIP_OPERATION_RECEIPT_STALE',
  'WEBCLIP_OPERATION_RECEIPT_NOT_FOUND','WEBCLIP_OPERATION_RECEIPT_AMBIGUOUS',
  'WEBCLIP_OFFSCREEN_PROTOCOL_MISMATCH','WEBCLIP_EXTENSION_PAGE_RELOAD_REQUIRED'
];
check('error codes unique', () => assert.equal(new Set(errorCodes).size,errorCodes.length));

const messages = Object.freeze({
  CONTENT_PROTOCOL_INFO: 'WEBCLIP_CONTENT_PROTOCOL_INFO',
  CONTENT_PROBE: 'WEBCLIP_CONTENT_PROBE',
  USER_OPERATION_RECONCILE: 'WEBCLIP_USER_OPERATION_RECONCILE',
  OFFSCREEN_PROTOCOL_INFO: 'WEBCLIP_OFFSCREEN_PROTOCOL_INFO',
  EXTENSION_PAGE_ACK: 'WEBCLIP_EXTENSION_PAGE_PROTOCOL_ACK'
});
check('message names unique', () => assert.equal(new Set(Object.values(messages)).size,Object.keys(messages).length));

const indexes = Object.freeze([
  {name:'clientRequestId', keyPath:'clientRequestId', unique:true},
  {name:'subject', keyPath:['operationKind','subjectKey'], unique:false},
  {name:'updatedAt', keyPath:'updatedAt', unique:false}
]);
check('clientRequest unique index', () => assert.equal(indexes.find(x=>x.name==='clientRequestId').unique,true));
check('subject index compound', () => assert.deepEqual(indexes.find(x=>x.name==='subject').keyPath,['operationKind','subjectKey']));

console.log('Wave 1 foundation source specification model: PASS');
console.log(`cases=${cases.length}`);
console.log(`protocol=${JSON.stringify(PROTOCOL)}`);
console.log(`receiptLimits=${JSON.stringify(LIMITS)}`);
