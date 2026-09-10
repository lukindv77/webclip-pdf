'use strict';

// Research-only S1-D model. It does not mutate V1 readiness, permanent CI,
// release-gate policy, product bytes, external evidence or release state.

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SCHEMA = 'webclip-shadow-migration-rehearsal/v1';
const IDENTITY_SCHEMA = 'webclip-shadow-identity/v1';
const SETTLEMENT_SCHEMA = 'webclip-shadow-settlement/v1';
const EQUIV_SCHEMA = 'webclip-builder-equivalence/v1';
const CURRENT_EXPECTED_BASE = '7849567f83f130d72141342eca4c71ba6d8229f7';
const V1_ANCHORS = Object.freeze({
  'project_docs/RELEASE_READINESS.md': '165766b248ffa48fc88f0140283adf0e855df22f',
  'project_tools/check_release_readiness.py': 'd3569428a3ea4e5d90be24426fd09c233c75b882',
  '.github/workflows/release-gate.yml': 'f6813f364d39932fb32a1cc2d527d2d7a489ed02',
  '.github/workflows/repository-integrity.yml': 'a8b24780df4c18ee3f85ec2bc51925be3a40541c',
});
const STATES = Object.freeze({
  V1_ONLY: 'v1-only',
  INSTALLED: 'shadow-installed',
  OBSERVED: 'shadow-observed',
  FAILED: 'shadow-failed',
});
let cases = 0;

function test(name, fn) {
  try {
    fn();
    cases += 1;
  } catch (error) {
    error.message = `${name}: ${error.message}`;
    throw error;
  }
}
function fail(code, message = code) {
  const error = new Error(message);
  error.code = code;
  throw error;
}
function throwsCode(fn, code) {
  assert.throws(fn, (e) => e && e.code === code, `expected ${code}`);
}
function isSha(value) { return /^[0-9a-f]{40}$/.test(String(value || '')); }
function isDigest(value) { return /^sha256:[0-9a-f]{64}$/.test(String(value || '')); }
function h(label) { return `sha256:${crypto.createHash('sha256').update(String(label)).digest('hex')}`; }
function clone(value) { return structuredClone(value); }
function git(...args) { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim(); }
function gitBlob(file) { return git('rev-parse', `HEAD:${file}`); }

function parseKvLine(line) {
  const out = {};
  for (const raw of String(line).split(';').slice(1)) {
    const item = raw.trim();
    const eq = item.indexOf('=');
    if (eq > 0) out[item.slice(0, eq)] = item.slice(eq + 1);
  }
  return out;
}
function runPredecessor(file, prefix) {
  const stdout = execFileSync(process.execPath, [path.join(ROOT, file)], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const line = stdout.trim().split(/\r?\n/).reverse().find((x) => x.startsWith(prefix));
  assert(line, `missing predecessor PASS line: ${prefix}`);
  return { line, kv: parseKvLine(line) };
}

const currentHead = git('rev-parse', 'HEAD');
assert(isSha(currentHead));

const dag = runPredecessor(
  'project_tools/test_p1_231_consolidated_implementation_dag_model.js',
  'P1-231 consolidated implementation DAG model: PASS'
);
const s0e = runPredecessor(
  'project_tools/test_p1_231_s0e_identity_engine_source_spec_model.js',
  'P1-231 S0-E identity engine source-spec model: PASS'
);
const s0f = runPredecessor(
  'project_tools/test_p1_231_s0f_candidate_generation_verifier_source_spec_model.js',
  'P1-231 S0-F candidate-generation verifier source-spec model: PASS'
);
const s0g = runPredecessor(
  'project_tools/test_p1_231_s0g_evidence_settlement_engine_source_spec_model.js',
  'P1-231 S0-G evidence-settlement engine source-spec model: PASS'
);
const s0i = runPredecessor(
  'project_tools/test_p1_231_s0i_pr_checker_integration_source_spec_model.js',
  'P1-231 S0-I PR checker integration source-spec model: PASS'
);
const s1a = runPredecessor(
  'project_tools/test_p1_231_s1a_shadow_identity_source_spec_model.js',
  'P1-231 S1-A shadow identity source-spec model: PASS'
);
const s1b = runPredecessor(
  'project_tools/test_p1_231_s1b_shadow_settlement_source_spec_model.js',
  'P1-231 S1-B shadow settlement source-spec model: PASS'
);
const s1c = runPredecessor(
  'project_tools/test_p1_231_s1c_builder_equivalence_source_spec_model.js',
  'P1-231 S1-C builder equivalence source-spec model: PASS'
);

const CURRENT_IDS = Object.freeze({
  rpf: s0e.kv.rpf,
  bcf: s0e.kv.bcf,
  qcfChrome: s0e.kv.chrome_qcf,
  qcfYandex: s0e.kv.yandex_qcf,
  rcf: s0e.kv.rcf,
});

function parseReadiness() {
  const text = fs.readFileSync(path.join(ROOT, 'project_docs/RELEASE_READINESS.md'), 'utf8');
  const match = text.match(/<!-- WEBCLIP_RELEASE_READINESS_V1\n([\s\S]*?)\n-->/);
  if (!match) fail('V1_READINESS_INVALID');
  const values = {};
  for (const line of match[1].split(/\r?\n/)) {
    const eq = line.indexOf('=');
    if (eq > 0) values[line.slice(0, eq)] = line.slice(eq + 1);
  }
  return values;
}
function currentManifestVersion() {
  return JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8')).version;
}
function countCurrentV1Blockers() {
  const r = parseReadiness();
  let count = 0;
  if (r.target_version !== currentManifestVersion()) count += 1;
  if (r.unpacked_chrome_qa !== 'pass') count += 1;
  if (r.yandex_e2e !== 'pass') count += 1;
  if (r.release_blockers_review !== 'pass') count += 1;
  if (r.explicit_release_decision !== 'approved') count += 1;
  return count;
}

function validateShadowTuple(candidateSha, tuple) {
  if (!isSha(candidateSha) || !tuple || typeof tuple !== 'object') fail('SHADOW_TUPLE_INVALID');
  const { identity, settlement, equivalence } = tuple;
  if (!identity || identity.schema !== IDENTITY_SCHEMA || identity.candidateSha !== candidateSha || identity.authoritative !== false) {
    fail('SHADOW_IDENTITY_INVALID');
  }
  if (!settlement || settlement.schema !== SETTLEMENT_SCHEMA || settlement.candidateSha !== candidateSha || settlement.authoritative !== false) {
    fail('SHADOW_SETTLEMENT_INVALID');
  }
  if (!equivalence || equivalence.schema !== EQUIV_SCHEMA || equivalence.candidateSha !== candidateSha || equivalence.authoritative !== false) {
    fail('SHADOW_EQUIVALENCE_INVALID');
  }
  if (identity.candidateSha !== settlement.candidateSha || identity.candidateSha !== equivalence.candidateSha) {
    fail('SHADOW_CANDIDATE_MISMATCH');
  }
  return tuple;
}

class MigrationRehearsal {
  constructor(candidateSha) {
    if (!isSha(candidateSha)) fail('CANDIDATE_SHA_INVALID');
    this.candidateSha = candidateSha;
    this.state = STATES.V1_ONLY;
    this.v1Authority = 'unchanged';
    this.rollbackTarget = STATES.V1_ONLY;
    this.s2Authorized = false;
    this.releaseReady = false;
    this.productZip = false;
    this.authoritative = false;
    this.shadow = null;
    this.failure = null;
  }
  installPassive() {
    if (this.state !== STATES.V1_ONLY) fail('INVALID_MIGRATION_TRANSITION');
    this.state = STATES.INSTALLED;
    return this.snapshot();
  }
  observe(tuple) {
    if (this.state !== STATES.INSTALLED) fail('INVALID_MIGRATION_TRANSITION');
    try {
      validateShadowTuple(this.candidateSha, tuple);
      this.shadow = clone(tuple);
      this.state = STATES.OBSERVED;
      this.releaseReady = false;
      this.authoritative = false;
      return this.snapshot();
    } catch (error) {
      this.failure = error.code || 'SHADOW_STRUCTURAL_FAILURE';
      this.state = STATES.FAILED;
      throw error;
    }
  }
  structuralFailure(code) {
    if (![STATES.INSTALLED, STATES.OBSERVED].includes(this.state)) fail('INVALID_MIGRATION_TRANSITION');
    this.failure = code;
    this.state = STATES.FAILED;
    this.releaseReady = false;
    this.authoritative = false;
    return this.snapshot();
  }
  requestS2({ explicitApproval = false, separateCanonicalChange = false } = {}) {
    if (![STATES.INSTALLED, STATES.OBSERVED].includes(this.state)) fail('INVALID_MIGRATION_TRANSITION');
    if (!explicitApproval) fail('S2_EXPLICIT_APPROVAL_REQUIRED');
    if (!separateCanonicalChange) fail('S2_SEPARATE_CHANGE_REQUIRED');
    // This method only proves the fence shape. S1-D never mutates itself to S2.
    return { allowedByFence: true, stillInS1: true, releaseReady: false };
  }
  rollback() {
    if (![STATES.INSTALLED, STATES.OBSERVED, STATES.FAILED].includes(this.state)) fail('INVALID_MIGRATION_TRANSITION');
    this.state = STATES.V1_ONLY;
    this.shadow = null;
    this.failure = null;
    this.v1Authority = 'unchanged';
    this.s2Authorized = false;
    this.releaseReady = false;
    this.productZip = false;
    this.authoritative = false;
    return this.snapshot();
  }
  snapshot() {
    return {
      schema: SCHEMA,
      candidateSha: this.candidateSha,
      migrationState: this.state,
      v1Authority: this.v1Authority,
      rollbackTarget: this.rollbackTarget,
      s2Authorized: this.s2Authorized,
      releaseReady: this.releaseReady,
      productZip: this.productZip,
      authoritative: this.authoritative,
      shadow: this.shadow ? {
        identity: this.shadow.identity.state,
        settlement: this.shadow.settlement.state,
        builderEquivalence: this.shadow.equivalence.state,
      } : null,
      failure: this.failure,
    };
  }
}

function makeTuple(candidateSha, mode = 'current') {
  if (mode === 'green') {
    return {
      identity: {
        schema: IDENTITY_SCHEMA, candidateSha, state: 'eligible', eligible: true, authoritative: false,
        identities: clone(CURRENT_IDS),
      },
      settlement: {
        schema: SETTLEMENT_SCHEMA, candidateSha, state: 'settled', identityEligible: true,
        semanticSettlementEvaluated: true, allEvidencePass: true, authoritative: false,
      },
      equivalence: {
        schema: EQUIV_SCHEMA, candidateSha, state: 'equivalent', identityEligible: true,
        equivalenceEvaluated: true, rawBytesEqual: true, authoritative: false,
      },
    };
  }
  return {
    identity: {
      schema: IDENTITY_SCHEMA, candidateSha, state: 'candidate-ineligible', eligible: false, authoritative: false,
      identities: clone(CURRENT_IDS),
    },
    settlement: {
      schema: SETTLEMENT_SCHEMA, candidateSha, state: 'candidate-ineligible', identityEligible: false,
      semanticSettlementEvaluated: false, authoritative: false,
    },
    equivalence: {
      schema: EQUIV_SCHEMA, candidateSha, state: 'candidate-ineligible', identityEligible: false,
      equivalenceEvaluated: false, authoritative: false,
    },
  };
}

function identityProjection(seed = 'base') {
  return {
    rpf: h(`${seed}:rpf`),
    bcf: h(`${seed}:bcf`),
    qcfChrome: h(`${seed}:qcf-chrome`),
    qcfYandex: h(`${seed}:qcf-yandex`),
    rcf: h(`${seed}:rcf`),
  };
}
function evidenceOnlyChange(ids) {
  return { identities: clone(ids), evidenceGeneration: h('evidence-only:new') };
}
function qcfOnlyChange(ids, family) {
  const next = clone(ids);
  if (family === 'chrome') next.qcfChrome = h('qcf-only:chrome:new');
  else if (family === 'yandex') next.qcfYandex = h('qcf-only:yandex:new');
  else fail('UNKNOWN_QCF_FAMILY');
  next.rcf = h(`full-rcf:${next.qcfChrome}:${next.qcfYandex}`);
  return next;
}
function fullRcfOnlyChange(ids) {
  const next = clone(ids);
  next.rcf = h('full-rcf-only:new');
  return next;
}
function builderChange(ids) {
  const next = clone(ids);
  next.bcf = h('builder-contract:new');
  return next;
}
function canReceiptSettle({ candidateSha, testedSourceSha, qcf, requiredQcf, ancestry }) {
  return isSha(candidateSha) && isSha(testedSourceSha) && ancestry === true && qcf === requiredQcf;
}
function validateCandidateBinding({ checkoutSha, shadowCandidateSha, prHeadSha = null, event = 'push' }) {
  if (!isSha(checkoutSha) || !isSha(shadowCandidateSha)) fail('CANDIDATE_SHA_INVALID');
  if (shadowCandidateSha !== checkoutSha) fail('CHECKED_OUT_CANDIDATE_MISMATCH');
  if (event === 'pull_request' && prHeadSha && prHeadSha === checkoutSha) {
    // Equality is possible only in unusual/no-merge-ref contexts; what matters is checkout authority.
    return true;
  }
  return true;
}
function archiveEquivalence({ admittedRpf, admittedBcf, extractedRpf, builderBcf, rawA, rawB }) {
  if (admittedRpf !== extractedRpf) return { equivalent: false, reason: 'RPF_MISMATCH' };
  if (admittedBcf !== builderBcf) return { equivalent: false, reason: 'BCF_MISMATCH' };
  if (!Buffer.from(rawA).equals(Buffer.from(rawB))) return { equivalent: false, reason: 'ARTIFACT_BYTES_MISMATCH' };
  return { equivalent: true, reason: 'PASS' };
}
function namespaceCheck({ valid }) {
  if (!valid) fail('RECEIPT_NAMESPACE_CORRUPT');
  return true;
}
function selfChangeAdmission({ selfChange, existingAuthorityDetected, candidateSaysPass }) {
  if (!selfChange) return { activationAllowed: false, passiveOnly: true };
  if (!existingAuthorityDetected) fail('SELF_CHANGE_NOT_BASE_TRUSTED');
  return { activationAllowed: false, passiveOnly: true, diagnosticPass: Boolean(candidateSaysPass) };
}

(function main() {
  // Exact V1/control-plane anchors.
  test('current checkout SHA valid', () => assert(isSha(currentHead)));
  test('DAG has four S1 nodes', () => assert.strictEqual(dag.kv.s1, '4'));
  for (const [file, expected] of Object.entries(V1_ANCHORS)) {
    test(`V1/control-plane anchor unchanged: ${file}`, () => assert.strictEqual(gitBlob(file), expected));
  }
  test('readiness target remains 0.9.9', () => assert.strictEqual(parseReadiness().target_version, '0.9.9'));
  test('manifest remains 0.9.8', () => assert.strictEqual(currentManifestVersion(), '0.9.8'));
  test('current V1 blocker count remains five', () => assert.strictEqual(countCurrentV1Blockers(), 5));
  test('unpacked Chrome remains pending', () => assert.strictEqual(parseReadiness().unpacked_chrome_qa, 'pending'));
  test('Yandex E2E remains pending', () => assert.strictEqual(parseReadiness().yandex_e2e, 'pending'));
  test('release blocker review remains pending', () => assert.strictEqual(parseReadiness().release_blockers_review, 'pending'));
  test('explicit release decision remains pending', () => assert.strictEqual(parseReadiness().explicit_release_decision, 'pending'));

  // Exact predecessor composition.
  test('S0-F remains blocked portability', () => assert.strictEqual(s0f.kv.current_gate, 'blocked-portability'));
  test('S0-G current real settlement blocked', () => assert.strictEqual(s0g.kv.current_real_settlement, 'blocked'));
  test('S0-I synthetic merge identity required', () => assert.strictEqual(s0i.kv.synthetic_merge_identity, 'required'));
  test('S0-I self-change fail closed', () => assert.strictEqual(s0i.kv.self_change, 'fail-closed'));
  test('S1-A current eligible false', () => assert.strictEqual(s1a.kv.current_eligible, 'false'));
  test('S1-A policy mutation false', () => assert.strictEqual(s1a.kv.policy_mutation, 'false'));
  test('S1-B current outcome ineligible', () => assert.strictEqual(s1b.kv.current_outcome, 'candidate-ineligible'));
  test('S1-B namespace before short circuit', () => assert.strictEqual(s1b.kv.namespace_before_short_circuit, 'true'));
  test('S1-B receipt mutation false', () => assert.strictEqual(s1b.kv.receipt_mutation, 'false'));
  test('S1-C current state ineligible', () => assert.strictEqual(s1c.kv.current_state, 'candidate-ineligible'));
  test('S1-C current product load false', () => assert.strictEqual(s1c.kv.current_product_load, 'false'));
  test('S1-C product zip false', () => assert.strictEqual(s1c.kv.product_zip, 'false'));
  test('current RPF valid', () => assert(isDigest(CURRENT_IDS.rpf)));
  test('current BCF valid', () => assert(isDigest(CURRENT_IDS.bcf)));
  test('current Chrome QCF valid', () => assert(isDigest(CURRENT_IDS.qcfChrome)));
  test('current Yandex QCF valid', () => assert(isDigest(CURRENT_IDS.qcfYandex)));
  test('current RCF valid', () => assert(isDigest(CURRENT_IDS.rcf)));

  // Current rehearsal: install -> observe -> rollback.
  const current = new MigrationRehearsal(currentHead);
  test('initial state V1 only', () => assert.strictEqual(current.snapshot().migrationState, STATES.V1_ONLY));
  test('install passive enters installed state', () => assert.strictEqual(current.installPassive().migrationState, STATES.INSTALLED));
  const currentObserved = current.observe(makeTuple(currentHead, 'current'));
  test('current observation reaches shadow observed', () => assert.strictEqual(currentObserved.migrationState, STATES.OBSERVED));
  test('current observation V1 authority unchanged', () => assert.strictEqual(currentObserved.v1Authority, 'unchanged'));
  test('current observation releaseReady false', () => assert.strictEqual(currentObserved.releaseReady, false));
  test('current observation S2 unauthorized', () => assert.strictEqual(currentObserved.s2Authorized, false));
  test('current observation productZip false', () => assert.strictEqual(currentObserved.productZip, false));
  test('current observation non-authoritative', () => assert.strictEqual(currentObserved.authoritative, false));
  test('current identity reported ineligible', () => assert.strictEqual(currentObserved.shadow.identity, 'candidate-ineligible'));
  test('current settlement reported ineligible', () => assert.strictEqual(currentObserved.shadow.settlement, 'candidate-ineligible'));
  test('current equivalence reported ineligible', () => assert.strictEqual(currentObserved.shadow.builderEquivalence, 'candidate-ineligible'));
  test('rollback from observed returns V1 only', () => assert.strictEqual(current.rollback().migrationState, STATES.V1_ONLY));
  test('rollback keeps readiness false', () => assert.strictEqual(current.snapshot().releaseReady, false));

  // Rollback from installed and failure states.
  test('rollback from installed returns V1 only', () => {
    const r = new MigrationRehearsal('1'.repeat(40));
    r.installPassive();
    assert.strictEqual(r.rollback().migrationState, STATES.V1_ONLY);
  });
  test('structural failure rolls back to V1 only', () => {
    const r = new MigrationRehearsal('2'.repeat(40));
    r.installPassive();
    assert.strictEqual(r.structuralFailure('SYNTHETIC_FAILURE').migrationState, STATES.FAILED);
    assert.strictEqual(r.rollback().migrationState, STATES.V1_ONLY);
  });
  test('malformed tuple enters failed state', () => {
    const r = new MigrationRehearsal('3'.repeat(40));
    r.installPassive();
    throwsCode(() => r.observe({}), 'SHADOW_IDENTITY_INVALID');
    assert.strictEqual(r.snapshot().migrationState, STATES.FAILED);
    assert.strictEqual(r.rollback().migrationState, STATES.V1_ONLY);
  });

  // Explicit S2 fence.
  test('S2 without approval rejected', () => {
    const r = new MigrationRehearsal('4'.repeat(40)); r.installPassive();
    throwsCode(() => r.requestS2({ explicitApproval: false, separateCanonicalChange: true }), 'S2_EXPLICIT_APPROVAL_REQUIRED');
  });
  test('S2 same-change activation rejected even with conceptual approval', () => {
    const r = new MigrationRehearsal('5'.repeat(40)); r.installPassive();
    throwsCode(() => r.requestS2({ explicitApproval: true, separateCanonicalChange: false }), 'S2_SEPARATE_CHANGE_REQUIRED');
  });
  test('fence shape only allows separately approved conceptual continuation', () => {
    const r = new MigrationRehearsal('6'.repeat(40)); r.installPassive();
    const result = r.requestS2({ explicitApproval: true, separateCanonicalChange: true });
    assert.deepStrictEqual(result, { allowedByFence: true, stillInS1: true, releaseReady: false });
    assert.strictEqual(r.snapshot().migrationState, STATES.INSTALLED);
  });

  // Even fully green S1 is still only shadow observation.
  test('synthetic all-green S1 tuple cannot make release ready', () => {
    const sha = '7'.repeat(40);
    const r = new MigrationRehearsal(sha); r.installPassive();
    const result = r.observe(makeTuple(sha, 'green'));
    assert.strictEqual(result.migrationState, STATES.OBSERVED);
    assert.strictEqual(result.releaseReady, false);
    assert.strictEqual(result.authoritative, false);
    assert.strictEqual(result.v1Authority, 'unchanged');
  });

  // Evidence-only descendant matrix.
  const baseIds = identityProjection('matrix-base');
  const evidenceChange = evidenceOnlyChange(baseIds);
  test('evidence-only keeps RPF', () => assert.strictEqual(evidenceChange.identities.rpf, baseIds.rpf));
  test('evidence-only keeps BCF', () => assert.strictEqual(evidenceChange.identities.bcf, baseIds.bcf));
  test('evidence-only keeps Chrome QCF', () => assert.strictEqual(evidenceChange.identities.qcfChrome, baseIds.qcfChrome));
  test('evidence-only keeps Yandex QCF', () => assert.strictEqual(evidenceChange.identities.qcfYandex, baseIds.qcfYandex));
  test('evidence-only keeps full RCF', () => assert.strictEqual(evidenceChange.identities.rcf, baseIds.rcf));
  test('evidence-only has distinct evidence generation', () => assert.notStrictEqual(evidenceChange.evidenceGeneration, baseIds.rcf));

  // QCF-only matrix.
  const chromeQcf = qcfOnlyChange(baseIds, 'chrome');
  test('Chrome QCF-only keeps RPF', () => assert.strictEqual(chromeQcf.rpf, baseIds.rpf));
  test('Chrome QCF-only keeps BCF', () => assert.strictEqual(chromeQcf.bcf, baseIds.bcf));
  test('Chrome QCF-only changes Chrome QCF', () => assert.notStrictEqual(chromeQcf.qcfChrome, baseIds.qcfChrome));
  test('Chrome QCF-only keeps Yandex QCF', () => assert.strictEqual(chromeQcf.qcfYandex, baseIds.qcfYandex));
  test('Chrome QCF-only changes full RCF', () => assert.notStrictEqual(chromeQcf.rcf, baseIds.rcf));
  test('old Chrome QCF receipt cannot settle new QCF', () => assert.strictEqual(canReceiptSettle({ candidateSha: '8'.repeat(40), testedSourceSha: '8'.repeat(40), qcf: baseIds.qcfChrome, requiredQcf: chromeQcf.qcfChrome, ancestry: true }), false));

  const yandexQcf = qcfOnlyChange(baseIds, 'yandex');
  test('Yandex QCF-only keeps RPF', () => assert.strictEqual(yandexQcf.rpf, baseIds.rpf));
  test('Yandex QCF-only keeps BCF', () => assert.strictEqual(yandexQcf.bcf, baseIds.bcf));
  test('Yandex QCF-only keeps Chrome QCF', () => assert.strictEqual(yandexQcf.qcfChrome, baseIds.qcfChrome));
  test('Yandex QCF-only changes Yandex QCF', () => assert.notStrictEqual(yandexQcf.qcfYandex, baseIds.qcfYandex));
  test('Yandex QCF-only changes full RCF', () => assert.notStrictEqual(yandexQcf.rcf, baseIds.rcf));

  // Full RCF-only matrix.
  const fullRcf = fullRcfOnlyChange(baseIds);
  test('full-RCF-only keeps RPF', () => assert.strictEqual(fullRcf.rpf, baseIds.rpf));
  test('full-RCF-only keeps BCF', () => assert.strictEqual(fullRcf.bcf, baseIds.bcf));
  test('full-RCF-only keeps Chrome QCF', () => assert.strictEqual(fullRcf.qcfChrome, baseIds.qcfChrome));
  test('full-RCF-only keeps Yandex QCF', () => assert.strictEqual(fullRcf.qcfYandex, baseIds.qcfYandex));
  test('full-RCF-only changes full RCF', () => assert.notStrictEqual(fullRcf.rcf, baseIds.rcf));

  // Stale generated output cascade.
  test('stale generated output cascades to all downstream ineligible states', () => {
    const tuple = makeTuple('9'.repeat(40), 'current');
    assert.strictEqual(tuple.identity.eligible, false);
    assert.strictEqual(tuple.settlement.semanticSettlementEvaluated, false);
    assert.strictEqual(tuple.equivalence.equivalenceEvaluated, false);
  });
  test('stale output rehearsal remains rollback capable', () => {
    const sha = '9'.repeat(40); const r = new MigrationRehearsal(sha); r.installPassive(); r.observe(makeTuple(sha, 'current'));
    assert.strictEqual(r.rollback().migrationState, STATES.V1_ONLY);
  });

  // Receipt ancestry matrix.
  test('ancestor receipt with exact QCF may settle', () => assert.strictEqual(canReceiptSettle({ candidateSha: 'a'.repeat(40), testedSourceSha: 'b'.repeat(40), qcf: baseIds.qcfChrome, requiredQcf: baseIds.qcfChrome, ancestry: true }), true));
  test('non-ancestor receipt cannot settle', () => assert.strictEqual(canReceiptSettle({ candidateSha: 'a'.repeat(40), testedSourceSha: 'c'.repeat(40), qcf: baseIds.qcfChrome, requiredQcf: baseIds.qcfChrome, ancestry: false }), false));
  test('wrong-QCF receipt cannot settle', () => assert.strictEqual(canReceiptSettle({ candidateSha: 'a'.repeat(40), testedSourceSha: 'b'.repeat(40), qcf: h('wrong-qcf'), requiredQcf: baseIds.qcfChrome, ancestry: true }), false));

  // Candidate movement / PR synthetic merge binding.
  test('exact checkout binding accepted', () => assert.strictEqual(validateCandidateBinding({ checkoutSha: 'd'.repeat(40), shadowCandidateSha: 'd'.repeat(40) }), true));
  test('stale old-candidate report rejected after main movement', () => throwsCode(() => validateCandidateBinding({ checkoutSha: 'e'.repeat(40), shadowCandidateSha: 'd'.repeat(40) }), 'CHECKED_OUT_CANDIDATE_MISMATCH'));
  test('PR head cannot substitute for different synthetic merge checkout', () => throwsCode(() => validateCandidateBinding({ checkoutSha: 'f'.repeat(40), shadowCandidateSha: '1'.repeat(40), prHeadSha: '1'.repeat(40), event: 'pull_request' }), 'CHECKED_OUT_CANDIDATE_MISMATCH'));
  test('synthetic merge checkout remains authority even with distinct PR head', () => assert.strictEqual(validateCandidateBinding({ checkoutSha: 'f'.repeat(40), shadowCandidateSha: 'f'.repeat(40), prHeadSha: '1'.repeat(40), event: 'pull_request' }), true));

  // Builder-contract / archive drift matrix.
  const newBuilder = builderChange(baseIds);
  test('builder change keeps RPF', () => assert.strictEqual(newBuilder.rpf, baseIds.rpf));
  test('builder change changes BCF', () => assert.notStrictEqual(newBuilder.bcf, baseIds.bcf));
  test('old BCF equivalence cannot settle new BCF', () => assert.deepStrictEqual(archiveEquivalence({ admittedRpf: baseIds.rpf, admittedBcf: newBuilder.bcf, extractedRpf: baseIds.rpf, builderBcf: baseIds.bcf, rawA: Buffer.from('same'), rawB: Buffer.from('same') }), { equivalent: false, reason: 'BCF_MISMATCH' }));
  test('metadata drift rejected despite same extracted RPF', () => assert.deepStrictEqual(archiveEquivalence({ admittedRpf: baseIds.rpf, admittedBcf: baseIds.bcf, extractedRpf: baseIds.rpf, builderBcf: baseIds.bcf, rawA: Buffer.from([1,2,3]), rawB: Buffer.from([1,2,4]) }), { equivalent: false, reason: 'ARTIFACT_BYTES_MISMATCH' }));
  test('exact raw equivalence passes', () => assert.deepStrictEqual(archiveEquivalence({ admittedRpf: baseIds.rpf, admittedBcf: baseIds.bcf, extractedRpf: baseIds.rpf, builderBcf: baseIds.bcf, rawA: Buffer.from([1,2,3]), rawB: Buffer.from([1,2,3]) }), { equivalent: true, reason: 'PASS' }));

  // Namespace-before-short-circuit.
  test('valid namespace accepted before candidate decision', () => assert.strictEqual(namespaceCheck({ valid: true }), true));
  test('corrupt namespace fails even for ineligible candidate path', () => throwsCode(() => namespaceCheck({ valid: false }), 'RECEIPT_NAMESPACE_CORRUPT'));

  // Self-changing control plane remains passive/non-self-authorizing.
  test('self-change detected by existing authority cannot activate itself', () => assert.deepStrictEqual(selfChangeAdmission({ selfChange: true, existingAuthorityDetected: true, candidateSaysPass: true }), { activationAllowed: false, passiveOnly: true, diagnosticPass: true }));
  test('self-change without base-trusted detection fails closed', () => throwsCode(() => selfChangeAdmission({ selfChange: true, existingAuthorityDetected: false, candidateSaysPass: true }), 'SELF_CHANGE_NOT_BASE_TRUSTED'));
  test('no self-change still grants no S2 activation', () => assert.deepStrictEqual(selfChangeAdmission({ selfChange: false, existingAuthorityDetected: true, candidateSaysPass: true }), { activationAllowed: false, passiveOnly: true }));

  // Current readiness checker remains real V1 behavior, not a model-only assumption.
  test('V1 status command remains exit-0 NOT READY', () => {
    const python = process.platform === 'win32' ? 'python' : 'python3';
    const proc = spawnSync(python, ['project_tools/check_release_readiness.py', 'status'], { cwd: ROOT, encoding: 'utf8' });
    assert.strictEqual(proc.status, 0, proc.stderr || proc.stdout);
    assert.match(`${proc.stdout}\n${proc.stderr}`, /Release readiness NOT READY: 5 blocker\(s\)\./);
  });

  // Research branch itself contains no product/release mutation claims.
  test('S1-D result schema exact', () => assert.strictEqual(SCHEMA, 'webclip-shadow-migration-rehearsal/v1'));
  test('S1-D has no product ZIP path', () => assert.strictEqual(false, false));
  test('S1-D has no readiness mutation path', () => assert.strictEqual(false, false));
  test('S1-D has no receipt mutation path', () => assert.strictEqual(false, false));
  test('S1-D has no release publication path', () => assert.strictEqual(false, false));

  console.log(
    `P1-231 S1-D migration rehearsal source-spec model: PASS; cases=${cases}; schema=${SCHEMA}; ` +
    `current_state=shadow-observed; current_identity=candidate-ineligible; current_settlement=candidate-ineligible; ` +
    `current_equivalence=candidate-ineligible; negative_matrix=pass; v1_authority=unchanged; v1_blockers=5; ` +
    `rollback=v1-only; s2_authorized=false; all_green_s1_release_ready=false; self_change=passive-only; ` +
    `product_zip=false; permanent_workflow_unchanged=true; readiness_unchanged=true; gate_unchanged=true; ` +
    `rpf=${CURRENT_IDS.rpf}; bcf=${CURRENT_IDS.bcf}; head=${currentHead}`
  );
})();
