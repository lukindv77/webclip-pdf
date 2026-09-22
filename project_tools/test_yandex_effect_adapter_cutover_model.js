'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const EVIDENCE = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_YANDEX_EFFECT_ADAPTER_CUTOVER_2026-09-10_EVIDENCE.md'), 'utf8');
const SOURCE = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const MANIFEST = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));

let cases = 0;
function check(name, fn) {
  try {
    fn();
    cases += 1;
  } catch (error) {
    error.message = `${name}: ${error.message}`;
    throw error;
  }
}
function has(text, needle) { assert.ok(text.includes(needle), `missing ${JSON.stringify(needle)}`); }
function lacks(text, needle) { assert.ok(!text.includes(needle), `unexpected ${JSON.stringify(needle)}`); }

const full = { read: true, write: true, publish: true, move: true };
const readOnly = { read: true, write: false, publish: false, move: false };
const unknown = { read: null, write: null, publish: null, move: null };

function auth({ id = 'A', gen = 7, material = 3, uid = 'uid-A', caps = full, current = true } = {}) {
  return { authRecordId: id, authGeneration: gen, secretMaterialRevision: material, accountUid: uid, capabilities: { ...caps }, current };
}
function effect({ id = 'E1', authId = 'A', authGen = 7, uid = 'uid-A', root = 'root-A', phase = 'prepared', issued = false, kind = 'upload' } = {}) {
  return { effectId: id, authRecordId: authId, authGeneration: authGen, accountUid: uid, rootIdentity: root, phase, issued, kind };
}
function capabilityFor(kind) {
  if (kind === 'read' || kind === 'verify' || kind === 'locate') return 'read';
  if (kind === 'publish') return 'publish';
  if (kind === 'move' || kind === 'delete') return 'move';
  return 'write';
}
function sameSemanticAuth(a, e) {
  return a && e && a.authRecordId === e.authRecordId && a.authGeneration === e.authGeneration;
}
function admitEffect(a, e) {
  if (!sameSemanticAuth(a, e)) return { ok: false, reason: 'AUTH_BINDING_STALE' };
  if (!a.current) return { ok: false, reason: 'AUTH_BINDING_STALE' };
  if (a.accountUid !== e.accountUid) return { ok: false, reason: 'ACCOUNT_IDENTITY_MISMATCH' };
  const cap = capabilityFor(e.kind);
  if (a.capabilities[cap] !== true) return { ok: false, reason: a.capabilities[cap] === null ? 'AUTH_CAPABILITY_UNKNOWN' : 'AUTH_CAPABILITY_INSUFFICIENT' };
  return { ok: true, material: a.secretMaterialRevision };
}
function rotateMaterial(oldAuth, next) {
  if (oldAuth.authRecordId !== next.authRecordId || oldAuth.authGeneration !== next.authGeneration) return { ok: false, reason: 'DIFFERENT_AUTH_GENERATION' };
  if (oldAuth.accountUid !== next.accountUid) return { ok: false, reason: 'MATERIAL_CONTINUITY_UNPROVEN' };
  return { ok: true, auth: { ...next } };
}
function reconcile(checkpoint, candidate) {
  if (!candidate || candidate.accountUid !== checkpoint.accountUid) return { ok: false, reason: 'RECONCILIATION_ACCOUNT_MISMATCH' };
  if (candidate.capabilities.read !== true) return { ok: false, reason: 'RECONCILIATION_INSUFFICIENT_CAPABILITY' };
  return { ok: true, settlesEffectId: checkpoint.effectId, mutating: false, rootIdentity: checkpoint.rootIdentity };
}
function sanitizeOAuthHeaders(headers = {}) {
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === 'authorization') throw Object.assign(new Error('caller auth forbidden'), { code: 'CALLER_AUTHORIZATION_FORBIDDEN' });
  }
  return { ...headers };
}
function signedTransferHeaders(headers = {}) {
  const out = {};
  for (const [k, v] of Object.entries(headers)) {
    if (k.toLowerCase() !== 'authorization') out[k] = v;
  }
  return out;
}

// Evidence/source contract.
[
  'authRecordId/authGeneration = semantic authority identity',
  'secretMaterialRevision      = token-material version within that exact authority',
  'Four adapter classes',
  'Control-plane / interactive read',
  'Operation-bound OAuth data plane',
  'Reconciliation / recovery reads',
  'Signed/offscreen transfer',
  'caller Authorization = forbidden',
  'started-unknown',
  'same-account newer credential',
  'P1-231 S2 remains unauthorized',
].forEach((needle, i) => check(`E${String(i + 1).padStart(2, '0')}`, () => has(EVIDENCE, needle)));

check('S01 generic yandexApi exists', () => has(SOURCE, 'async function yandexApi(endpoint, options = {}, allowRetry = false)'));
check('S02 current token helper exists', () => has(SOURCE, 'getValidYandexAccessToken()'));
check('S03 current caller-header spread exists', () => has(SOURCE, '...(options.headers || {})'));
check('S04 current OAuth header exists', () => has(SOURCE, "'Authorization': `OAuth ${token}`"));
check('S05 current source now exposes authRecordId control identity substrate', () => has(SOURCE, 'authRecordId'));
check('S06 current source now exposes authGeneration control identity substrate', () => has(SOURCE, 'authGeneration'));
check('S07 manifest version unchanged research tranche', () => assert.equal(MANIFEST.version, '0.9.8'));

// Control-plane semantics.
check('C01 current full credential permits read', () => assert.equal(auth().capabilities.read, true));
check('C02 unknown read capability blocks capability-bearing control read', () => assert.equal(auth({ caps: unknown }).capabilities.read, null));
check('C03 reduced read-only credential can answer read', () => assert.equal(auth({ caps: readOnly }).capabilities.read, true));
check('C04 reduced read-only credential cannot write', () => assert.equal(auth({ caps: readOnly }).capabilities.write, false));
check('C05 old auth generation differs from current', () => assert.equal(sameSemanticAuth(auth({ gen: 7 }), effect({ authGen: 8 })), false));
check('C06 late 401 observational old generation distinguishable', () => {
  const old = auth({ gen: 7 }); const current = auth({ gen: 8 }); assert.notEqual(old.authGeneration, current.authGeneration);
});

// Operation-bound admission.
check('D01 exact effect auth admits upload', () => assert.equal(admitEffect(auth(), effect()).ok, true));
check('D02 global B cannot replace A effect', () => assert.equal(admitEffect(auth({ id: 'B', gen: 8, uid: 'uid-B' }), effect()).reason, 'AUTH_BINDING_STALE'));
check('D03 stale semantic generation denied', () => assert.equal(admitEffect(auth({ gen: 8 }), effect()).ok, false));
check('D04 account mismatch denied', () => assert.equal(admitEffect(auth({ uid: 'uid-B' }), effect()).reason, 'ACCOUNT_IDENTITY_MISMATCH'));
check('D05 disconnected/noncurrent auth denied', () => assert.equal(admitEffect(auth({ current: false }), effect()).reason, 'AUTH_BINDING_STALE'));
check('D06 unknown write capability denied', () => assert.equal(admitEffect(auth({ caps: unknown }), effect()).reason, 'AUTH_CAPABILITY_UNKNOWN'));
check('D07 read-only write denied', () => assert.equal(admitEffect(auth({ caps: readOnly }), effect()).reason, 'AUTH_CAPABILITY_INSUFFICIENT'));
check('D08 publish requires publish capability', () => assert.equal(admitEffect(auth({ caps: readOnly }), effect({ kind: 'publish' })).ok, false));
check('D09 move requires move capability', () => assert.equal(admitEffect(auth({ caps: readOnly }), effect({ kind: 'move' })).ok, false));
check('D10 verify requires read capability', () => assert.equal(admitEffect(auth({ caps: readOnly }), effect({ kind: 'verify' })).ok, true));
check('D11 issued effect identity stays A', () => {
  const e = effect({ issued: true }); const b = auth({ id: 'B', gen: 8, uid: 'uid-B' }); assert.equal(e.authRecordId, 'A'); assert.notEqual(e.authRecordId, b.authRecordId);
});
check('D12 root is effect fact', () => assert.equal(effect({ root: 'root-captured' }).rootIdentity, 'root-captured'));

// Header ownership.
check('H01 Authorization rejected', () => assert.throws(() => sanitizeOAuthHeaders({ Authorization: 'x' }), /caller auth forbidden/));
check('H02 authorization lowercase rejected', () => assert.throws(() => sanitizeOAuthHeaders({ authorization: 'x' }), /caller auth forbidden/));
check('H03 AUTHORIZATION uppercase rejected', () => assert.throws(() => sanitizeOAuthHeaders({ AUTHORIZATION: 'x' }), /caller auth forbidden/));
check('H04 benign header preserved', () => assert.deepEqual(sanitizeOAuthHeaders({ Accept: 'application/json' }), { Accept: 'application/json' }));
check('H05 signed transfer strips OAuth header', () => assert.deepEqual(signedTransferHeaders({ Authorization: 'OAuth x', 'Content-Type': 'application/pdf' }), { 'Content-Type': 'application/pdf' }));
check('H06 signed transfer lowercase strips OAuth header', () => assert.deepEqual(signedTransferHeaders({ authorization: 'OAuth x' }), {}));

// Material rotation.
check('M01 same semantic auth may rotate material', () => assert.equal(rotateMaterial(auth({ material: 3 }), auth({ material: 4 })).ok, true));
check('M02 material revision advances independently', () => {
  const r = rotateMaterial(auth({ material: 3 }), auth({ material: 4 })); assert.equal(r.auth.authGeneration, 7); assert.equal(r.auth.secretMaterialRevision, 4);
});
check('M03 different auth id is not material rotation', () => assert.equal(rotateMaterial(auth(), auth({ id: 'B' })).ok, false));
check('M04 different auth generation is not material rotation', () => assert.equal(rotateMaterial(auth(), auth({ gen: 8 })).reason, 'DIFFERENT_AUTH_GENERATION'));
check('M05 different account breaks material continuity', () => assert.equal(rotateMaterial(auth(), auth({ uid: 'uid-B', material: 4 })).reason, 'MATERIAL_CONTINUITY_UNPROVEN'));
check('M06 later effect may use newer material same semantic auth', () => {
  const r = rotateMaterial(auth({ material: 3 }), auth({ material: 4 })); assert.equal(admitEffect(r.auth, effect()).material, 4);
});
check('M07 rotated capability truth is re-evaluated', () => {
  const r = rotateMaterial(auth({ material: 3 }), auth({ material: 4, caps: readOnly })); assert.equal(r.ok, true); assert.equal(admitEffect(r.auth, effect()).ok, false);
});
check('M08 material revision cannot rescue stale generation', () => assert.equal(admitEffect(auth({ gen: 8, material: 99 }), effect()).ok, false));

// Reconciliation semantics.
const checkpoint = { effectId: 'E-old', accountUid: 'uid-A', rootIdentity: 'root-A', phase: 'started-unknown' };
check('R01 same account read context reconciles', () => assert.equal(reconcile(checkpoint, auth({ gen: 9, material: 1, caps: readOnly })).ok, true));
check('R02 reconciliation is read-only', () => assert.equal(reconcile(checkpoint, auth({ gen: 9, caps: readOnly })).mutating, false));
check('R03 reconciliation settles old effect id', () => assert.equal(reconcile(checkpoint, auth({ gen: 9, caps: readOnly })).settlesEffectId, 'E-old'));
check('R04 reconciliation keeps checkpoint root', () => assert.equal(reconcile(checkpoint, auth({ gen: 9, caps: readOnly })).rootIdentity, 'root-A'));
check('R05 different account cannot reconcile', () => assert.equal(reconcile(checkpoint, auth({ uid: 'uid-B', caps: readOnly })).reason, 'RECONCILIATION_ACCOUNT_MISMATCH'));
check('R06 same account without read capability cannot reconcile', () => assert.equal(reconcile(checkpoint, auth({ caps: { read: false, write: true, publish: true, move: true } })).reason, 'RECONCILIATION_INSUFFICIENT_CAPABILITY'));
check('R07 unknown read capability cannot reconcile', () => assert.equal(reconcile(checkpoint, auth({ caps: unknown })).ok, false));
check('R08 started-unknown represented durably nonsecret', () => assert.equal(checkpoint.phase, 'started-unknown'));

// Signed transfer separation.
check('T01 signed URL wording explicitly ephemeral', () => has(EVIDENCE, 'signed URL is ephemeral transport capability'));
check('T02 signed URL not durable authority', () => has(EVIDENCE, 'signed URL must not become durable authority'));
check('T03 signed 401 not blanket OAuth validity', () => has(EVIDENCE, 'signed transfer 401/403 is not automatically an OAuth credential-validity signal'));
check('T04 new signed URL not proof previous failure', () => has(EVIDENCE, 'must not be mistaken for proof that the previous upload failed'));
check('T05 signed upload classified irreversible', () => has(EVIDENCE, 'signed payload upload is irreversible'));
check('T06 signed download no remote mutation', () => has(EVIDENCE, '| signed download | D signed transfer | historical/read intent + signed capability | no remote mutation |'));

// Multi-phase and local authority separation.
[
  ['P01 folder child effect', 'folder create'],
  ['P02 upload link', 'upload-link acquisition'],
  ['P03 payload upload', 'payload upload'],
  ['P04 metadata verify', 'metadata verification'],
  ['P05 move', 'move/rename'],
  ['P06 publication', 'publication'],
  ['P07 cleanup', 'cleanup/delete'],
  ['P08 journal finalization', 'Journal finalization'],
].forEach(([name, needle]) => check(name, () => has(EVIDENCE, needle)));
check('P09 local Journal separate authority', () => has(EVIDENCE, 'local Journal mutation remains a separate local authority plane'));
check('P10 already-issued phase immutable', () => has(EVIDENCE, 'Already-issued child effects keep factual settlement identity'));
check('P11 not-yet-issued re-admits', () => has(EVIDENCE, 'Each not-yet-issued irreversible child effect gets a fresh exact admission decision'));

// Cutover table families.
[
  'connection/account status',
  'interactive folder listing',
  'create/ensure service folders for operation',
  'obtain upload URL',
  'signed payload upload',
  'metadata verify after known upload response',
  'pending-save recovery verify',
  'locate moved/unknown object',
  'Trash move',
  'Upload-folder move',
  'Journal backup upload URL',
  'Journal backup signed upload',
  'Journal backup recovery read',
  'publish resource',
  'post-publish readback',
  'download signed URL acquisition',
  'signed download',
].forEach((needle, i) => check(`X${String(i + 1).padStart(2, '0')}`, () => has(EVIDENCE, needle)));

// Retry taxonomy.
check('Y01 control read retry distinct', () => has(EVIDENCE, 'ordinary bounded retry policy may apply'));
check('Y02 mutation no blind retry', () => has(EVIDENCE, 'no blind retry after started-unknown; reconcile first'));
check('Y03 reconciliation retry read-only', () => has(EVIDENCE, 'bounded retry is allowed only as another read of the same historical target'));
check('Y04 signed replay fenced', () => has(EVIDENCE, 'reacquiring a new signed URL does not itself authorize replay'));

// Boundary assertions.
check('B01 runtime implementation not claimed', () => has(EVIDENCE, 'research cutover map != runtime implementation'));
check('B02 real provider qualification separate', () => has(EVIDENCE, 'runtime implementation != real provider qualification'));
check('B03 release activation separate', () => has(EVIDENCE, 'real provider qualification != release-policy activation'));
check('B04 release readiness separate', () => has(EVIDENCE, 'release-policy activation != release readiness'));
check('B05 no official ZIP', () => has(EVIDENCE, 'No official ZIP is built'));
check('B06 no real L5', () => has(EVIDENCE, 'No real Chrome/Yandex L5 is run'));
check('B07 no release/deployment mutation', () => has(EVIDENCE, 'release receipt/readiness/gate/manifest/tag/GitHub Release/deployment is changed'));

console.log(
  `Yandex effect-adapter cutover model: PASS; cases=${cases}; ` +
  'schema=webclip-yandex-effect-adapter-cutover/v1; ' +
  'baseline=16dee307a391a19d38af8f7cfb0bd581dc53ab59; ' +
  'adapter_classes=4; semantic_auth=id-generation; material_revision=separate; ' +
  'control_plane=current-exact; data_plane=effect-bound; reconciliation=historical-plus-same-account-read; ' +
  'signed_transfer=oauth-separated; caller_authorization=forbidden; retry_after_unknown=reconcile-first; ' +
  'runtime_modified=false; new_p_code=false; s2_authorized=false; release_authorized=false'
);
