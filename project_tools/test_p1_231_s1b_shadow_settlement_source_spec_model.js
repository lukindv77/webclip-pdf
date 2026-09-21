'use strict';

// Research-only deterministic source-spec model for P1-231 S1-B.
// Models passive shadow settlement only; no readiness/receipt/product artifact mutation.

const assert = require('assert');
const path = require('path');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SHADOW_IDENTITY_SCHEMA = 'webclip-shadow-identity/v1';
const SHADOW_SETTLEMENT_SCHEMA = 'webclip-shadow-settlement/v1';
const S0G_RESULT_SCHEMA = 'webclip-evidence-settlement-result/v1';
const NAMESPACE_SCHEMA = 'webclip-evidence-namespace-validation/v1';
const REQUIRED_SLOTS = Object.freeze(['unpacked-chrome', 'yandex-e2e', 'blocker-review', 'release-decision']);
const CURRENT = Object.freeze({
  rpf: 'sha256:feab25126c9d686062f8ed0da8c9d7ad39f468ebc819342bb34fbd2c47e0e843',
  chromeQcf: 'sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c',
  yandexQcf: 'sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1',
  rcf: 'sha256:cb34076d37c8dbe99392fac120fb21b03d192e4b53bc7a40650b5cd277311ffb',
  bcf: 'sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff',
});

let cases = 0;
function check(v, m) { cases += 1; assert(v, m); }
function eq(a, b, m) { cases += 1; assert.strictEqual(a, b, m); }
function deepEq(a, b, m) { cases += 1; assert.deepStrictEqual(a, b, m); }
function fail(code, detail) { const e = new Error(detail || code); e.code = code; throw e; }
function throwsCode(fn, code, m) { cases += 1; assert.throws(fn, (e) => e && e.code === code, m || `expected ${code}`); }
function git(...args) { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim(); }
function isSha(v) { return typeof v === 'string' && /^[0-9a-f]{40}$/.test(v); }
function isFp(v) { return typeof v === 'string' && /^sha256:[0-9a-f]{64}$/.test(v); }
function clone(v) { return structuredClone(v); }
function mutateFp(v) { return v.slice(0, -1) + (v.endsWith('0') ? '1' : '0'); }

function runNode(rel) {
  const proc = spawnSync(process.execPath, [path.join(ROOT, rel)], { cwd: ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  if (proc.status !== 0) fail('S1B_PREDECESSOR_FAILED', `${rel}\n${proc.stdout}\n${proc.stderr}`);
  return `${proc.stdout || ''}${proc.stderr || ''}`;
}

function validateShadowIdentity(raw, candidateSha) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.schema !== SHADOW_IDENTITY_SCHEMA) fail('S1B_SHADOW_IDENTITY_INVALID');
  if (!isSha(raw.candidateSha) || raw.candidateSha !== candidateSha) fail('S1B_SHADOW_CANDIDATE_MISMATCH');
  for (const k of ['rpf', 'chromeQcf', 'yandexQcf', 'rcf', 'bcf']) if (!isFp(raw[k])) fail('S1B_SHADOW_IDENTITY_INVALID', k);
  if (typeof raw.eligible !== 'boolean') fail('S1B_SHADOW_IDENTITY_INVALID');
  if (raw.eligible && raw.generationGate !== 'pass') fail('S1B_SHADOW_ELIGIBILITY_INCONSISTENT');
  if (raw.policyMutation !== false || raw.receiptMutation !== false || raw.artifactBuild !== false) fail('S1B_SHADOW_SIDE_EFFECT_INVALID');
  return raw;
}

function validateNamespace(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.schema !== NAMESPACE_SCHEMA) fail('S1B_NAMESPACE_RESULT_INVALID');
  if (raw.valid !== true) fail('S1B_RECEIPT_NAMESPACE_INVALID');
  if (!Number.isSafeInteger(raw.receiptCount) || raw.receiptCount < 0) fail('S1B_NAMESPACE_RESULT_INVALID');
  return raw;
}

function identityFromShadow(s) {
  return { rpf: s.rpf, chromeQcf: s.chromeQcf, yandexQcf: s.yandexQcf, rcf: s.rcf };
}
function identityFromSettlement(s) {
  return {
    rpf: s.identities?.rpf,
    chromeQcf: s.identities?.qcf?.['unpacked-chrome'],
    yandexQcf: s.identities?.qcf?.['yandex-e2e'],
    rcf: s.identities?.rcf,
  };
}
function sameSettlementIdentity(a, b) {
  return ['rpf', 'chromeQcf', 'yandexQcf', 'rcf'].every((k) => a[k] === b[k]);
}
function slotPass(kind, slot) {
  if (!slot || typeof slot !== 'object') return false;
  return kind === 'release-decision' ? slot.state === 'approved' : slot.state === 'pass';
}

function validateSettlement(raw, shadow) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw) || raw.schema !== S0G_RESULT_SCHEMA) fail('S1B_S0G_RESULT_INVALID');
  if (raw.candidateSha !== shadow.candidateSha) fail('S1B_S0G_CANDIDATE_MISMATCH');
  if (raw.candidateGenerationState !== 'pass') fail('S1B_S0G_GENERATION_INVALID');
  if (!sameSettlementIdentity(identityFromSettlement(raw), identityFromShadow(shadow))) fail('S1B_S0G_IDENTITY_MISMATCH');
  if (!raw.slots || typeof raw.slots !== 'object' || Array.isArray(raw.slots)) fail('S1B_S0G_SLOTS_INVALID');
  const keys = Object.keys(raw.slots).sort();
  deepEq(keys, [...REQUIRED_SLOTS].sort(), 'S0-G slot set must be closed');
  const derivedAll = REQUIRED_SLOTS.every((k) => slotPass(k, raw.slots[k]));
  if (raw.allRequiredSlotsPass !== derivedAll) fail('S1B_S0G_ALL_REQUIRED_INCONSISTENT');
  return { raw, derivedAll };
}

function notEvaluatedSlots() {
  return Object.fromEntries(REQUIRED_SLOTS.map((k) => [k, { state: 'not-evaluated' }]));
}

function shadowSettlement({ candidateSha, shadowIdentity, namespaceValidator, settlementProvider }) {
  if (!isSha(candidateSha)) fail('S1B_CANDIDATE_INVALID');
  if (typeof namespaceValidator !== 'function' || typeof settlementProvider !== 'function') fail('S1B_PROVIDER_INVALID');

  // S0-G-owned namespace integrity is checked before the candidate eligibility short circuit.
  const ns = validateNamespace(namespaceValidator());
  const shadow = validateShadowIdentity(shadowIdentity, candidateSha);

  if (!shadow.eligible) {
    return Object.freeze({
      schema: SHADOW_SETTLEMENT_SCHEMA,
      candidateSha,
      identityEligible: false,
      namespaceValid: true,
      namespaceReceiptCount: ns.receiptCount,
      settlementEvaluated: false,
      shadowOutcome: 'candidate-ineligible',
      blockerReason: shadow.shadowOutcome,
      slots: notEvaluatedSlots(),
      allRequiredSlotsPass: false,
      policyMutation: false,
      receiptMutation: false,
      artifactBuild: false,
    });
  }

  const checked = validateSettlement(settlementProvider(), shadow);
  return Object.freeze({
    schema: SHADOW_SETTLEMENT_SCHEMA,
    candidateSha,
    identityEligible: true,
    namespaceValid: true,
    namespaceReceiptCount: ns.receiptCount,
    settlementEvaluated: true,
    shadowOutcome: checked.derivedAll ? 'settled-pass' : 'settled-blocked',
    blockerReason: null,
    slots: clone(checked.raw.slots),
    allRequiredSlotsPass: checked.derivedAll,
    policyMutation: false,
    receiptMutation: false,
    artifactBuild: false,
  });
}

function shadowFixture(candidateSha, eligible, outcome = eligible ? 'eligible' : 'blocked-generation') {
  return {
    schema: SHADOW_IDENTITY_SCHEMA,
    candidateSha,
    eventKind: 'push',
    identityProtocol: 'WEBCLIP_RELEASE_IDENTITY_V1',
    ...CURRENT,
    generationGate: eligible ? 'pass' : 'blocked-generation',
    eligible,
    shadowOutcome: outcome,
    impactContext: { kind: 'push-main', candidateSha },
    policyMutation: false,
    receiptMutation: false,
    artifactBuild: false,
  };
}
function slotFixture(stateByKind = {}) {
  return Object.fromEntries(REQUIRED_SLOTS.map((kind, i) => [kind, {
    state: stateByKind[kind] || (kind === 'release-decision' ? 'approved' : 'pass'),
    receiptId: `r${i + 1}`,
    attemptSeq: 1,
    testedSourceSha: 'a'.repeat(40),
  }]));
}
function settlementFixture(candidateSha, slots = slotFixture()) {
  const all = REQUIRED_SLOTS.every((k) => slotPass(k, slots[k]));
  return {
    schema: S0G_RESULT_SCHEMA,
    candidateSha,
    candidateGenerationState: 'pass',
    identities: {
      rpf: CURRENT.rpf,
      qcf: { 'unpacked-chrome': CURRENT.chromeQcf, 'yandex-e2e': CURRENT.yandexQcf },
      rcf: CURRENT.rcf,
    },
    slots,
    allRequiredSlotsPass: all,
  };
}

(function main() {
  const head = git('rev-parse', 'HEAD');
  check(isSha(head), 'HEAD must be exact SHA');

  const gOut = runNode('project_tools/test_p1_231_s0g_evidence_settlement_engine_source_spec_model.js');
  const aOut = runNode('project_tools/test_p1_231_s1a_shadow_identity_source_spec_model.js');
  check(/S0-G evidence-settlement engine source-spec model: PASS; cases=132/.test(gOut), 'S0-G predecessor PASS missing');
  check(/current_real_settlement=evidence-missing/.test(gOut), 'S0-G current evidence-missing truth missing');
  check(/S1-A shadow identity source-spec model: PASS; cases=\d+/.test(aOut), 'S1-A predecessor PASS missing');
  check(/current_shadow=eligible/.test(aOut), 'S1-A current eligible truth missing');
  check(/current_eligible=true/.test(aOut), 'S1-A current eligible truth missing');

  // Current real state: generation is eligible, namespace validation executes,
  // and absence of current receipts settles as blocked/missing evidence.
  let nsCalls = 0;
  let settlementCalls = 0;
  const currentSlots = slotFixture({
    'unpacked-chrome': 'missing',
    'yandex-e2e': 'missing',
    'blocker-review': 'missing',
    'release-decision': 'missing',
  });
  const current = shadowSettlement({
    candidateSha: head,
    shadowIdentity: shadowFixture(head, true),
    namespaceValidator: () => { nsCalls += 1; return { schema: NAMESPACE_SCHEMA, valid: true, receiptCount: 0 }; },
    settlementProvider: () => { settlementCalls += 1; return settlementFixture(head, currentSlots); },
  });
  eq(nsCalls, 1, 'namespace validator must execute before semantic settlement');
  eq(settlementCalls, 1, 'semantic settlement must execute for eligible current candidate');
  eq(current.schema, SHADOW_SETTLEMENT_SCHEMA);
  eq(current.identityEligible, true);
  eq(current.namespaceValid, true);
  eq(current.settlementEvaluated, true);
  eq(current.shadowOutcome, 'settled-blocked');
  eq(current.blockerReason, null);
  eq(current.allRequiredSlotsPass, false);
  for (const k of REQUIRED_SLOTS) eq(current.slots[k].state, 'missing', `${k} must remain evidence-missing`);

  // Corrupt canonical receipt control plane is structural failure before semantic settlement.
  settlementCalls = 0;
  throwsCode(() => shadowSettlement({
    candidateSha: head,
    shadowIdentity: shadowFixture(head, true),
    namespaceValidator: () => ({ schema: NAMESPACE_SCHEMA, valid: false, receiptCount: 0 }),
    settlementProvider: () => { settlementCalls += 1; return settlementFixture(head, currentSlots); },
  }), 'S1B_RECEIPT_NAMESPACE_INVALID');
  eq(settlementCalls, 0, 'corrupt namespace must fail before semantic settlement');
  throwsCode(() => shadowSettlement({
    candidateSha: head,
    shadowIdentity: shadowFixture(head, false),
    namespaceValidator: () => ({ schema: 'bad', valid: true, receiptCount: 0 }),
    settlementProvider: () => settlementFixture(head),
  }), 'S1B_NAMESPACE_RESULT_INVALID');

  // Synthetic eligible all-pass path.
  const allPass = shadowSettlement({
    candidateSha: head,
    shadowIdentity: shadowFixture(head, true),
    namespaceValidator: () => ({ schema: NAMESPACE_SCHEMA, valid: true, receiptCount: 4 }),
    settlementProvider: () => settlementFixture(head),
  });
  eq(allPass.identityEligible, true);
  eq(allPass.settlementEvaluated, true);
  eq(allPass.shadowOutcome, 'settled-pass');
  eq(allPass.allRequiredSlotsPass, true);

  // Every required slot can block independently.
  for (const [kind, state] of [
    ['unpacked-chrome', 'fail'],
    ['yandex-e2e', 'inconclusive'],
    ['blocker-review', 'missing'],
    ['release-decision', 'rejected'],
  ]) {
    const slots = slotFixture({ [kind]: state });
    const blocked = shadowSettlement({
      candidateSha: head,
      shadowIdentity: shadowFixture(head, true),
      namespaceValidator: () => ({ schema: NAMESPACE_SCHEMA, valid: true, receiptCount: 4 }),
      settlementProvider: () => settlementFixture(head, slots),
    });
    eq(blocked.shadowOutcome, 'settled-blocked', `${kind} ${state} must block`);
    eq(blocked.allRequiredSlotsPass, false);
  }

  // Candidate and identity binding fail closed.
  const stale = settlementFixture('b'.repeat(40));
  throwsCode(() => shadowSettlement({
    candidateSha: head, shadowIdentity: shadowFixture(head, true),
    namespaceValidator: () => ({ schema: NAMESPACE_SCHEMA, valid: true, receiptCount: 1 }),
    settlementProvider: () => stale,
  }), 'S1B_S0G_CANDIDATE_MISMATCH');
  for (const field of ['rpf', 'chromeQcf', 'yandexQcf', 'rcf']) {
    const s = settlementFixture(head);
    if (field === 'rpf') s.identities.rpf = mutateFp(s.identities.rpf);
    if (field === 'chromeQcf') s.identities.qcf['unpacked-chrome'] = mutateFp(s.identities.qcf['unpacked-chrome']);
    if (field === 'yandexQcf') s.identities.qcf['yandex-e2e'] = mutateFp(s.identities.qcf['yandex-e2e']);
    if (field === 'rcf') s.identities.rcf = mutateFp(s.identities.rcf);
    throwsCode(() => shadowSettlement({
      candidateSha: head, shadowIdentity: shadowFixture(head, true),
      namespaceValidator: () => ({ schema: NAMESPACE_SCHEMA, valid: true, receiptCount: 1 }),
      settlementProvider: () => s,
    }), 'S1B_S0G_IDENTITY_MISMATCH', field);
  }

  // Malformed shadow/S0-G semantics fail closed.
  throwsCode(() => shadowSettlement({
    candidateSha: head, shadowIdentity: { ...shadowFixture(head, true), schema: 'bad' },
    namespaceValidator: () => ({ schema: NAMESPACE_SCHEMA, valid: true, receiptCount: 0 }),
    settlementProvider: () => settlementFixture(head),
  }), 'S1B_SHADOW_IDENTITY_INVALID');
  throwsCode(() => shadowSettlement({
    candidateSha: head, shadowIdentity: { ...shadowFixture(head, true), generationGate: 'blocked-portability' },
    namespaceValidator: () => ({ schema: NAMESPACE_SCHEMA, valid: true, receiptCount: 0 }),
    settlementProvider: () => settlementFixture(head),
  }), 'S1B_SHADOW_ELIGIBILITY_INCONSISTENT');
  throwsCode(() => shadowSettlement({
    candidateSha: head, shadowIdentity: shadowFixture(head, true),
    namespaceValidator: () => ({ schema: NAMESPACE_SCHEMA, valid: true, receiptCount: 0 }),
    settlementProvider: () => ({ ...settlementFixture(head), schema: 'bad' }),
  }), 'S1B_S0G_RESULT_INVALID');

  const inconsistent = settlementFixture(head);
  inconsistent.allRequiredSlotsPass = false;
  throwsCode(() => shadowSettlement({
    candidateSha: head, shadowIdentity: shadowFixture(head, true),
    namespaceValidator: () => ({ schema: NAMESPACE_SCHEMA, valid: true, receiptCount: 4 }),
    settlementProvider: () => inconsistent,
  }), 'S1B_S0G_ALL_REQUIRED_INCONSISTENT');

  const extraSlot = settlementFixture(head);
  extraSlot.slots.extra = { state: 'pass' };
  throwsCode(() => shadowSettlement({
    candidateSha: head, shadowIdentity: shadowFixture(head, true),
    namespaceValidator: () => ({ schema: NAMESPACE_SCHEMA, valid: true, receiptCount: 5 }),
    settlementProvider: () => extraSlot,
  }), 'ERR_ASSERTION');

  // No authority/policy side effects or aggregate fingerprint.
  for (const result of [current, allPass]) {
    eq(result.policyMutation, false);
    eq(result.receiptMutation, false);
    eq(result.artifactBuild, false);
    for (const forbidden of ['releaseReadiness', 'approvedForRelease', 'shadowSettlementFingerprint', 'tagName', 'releaseId', 'deploymentId']) {
      check(!Object.prototype.hasOwnProperty.call(result, forbidden), `result must not expose ${forbidden}`);
    }
  }

  // Research-only tranche must not install permanent S1-B implementation/workflow step.
  const workflow = git('show', 'HEAD:.github/workflows/repository-integrity.yml');
  check(!workflow.includes('check_release_shadow_settlement.py'), 'research tranche must not install permanent S1-B checker');
  check(!workflow.includes('Shadow evidence settlement'), 'research tranche must not install permanent S1-B workflow step');

  console.log(
    `P1-231 S1-B shadow settlement source-spec model: PASS; cases=${cases}; schema=${SHADOW_SETTLEMENT_SCHEMA}; ` +
    `current_outcome=settled-blocked; current_identity_eligible=true; namespace_before_short_circuit=true; ` +
    `semantic_settlement_current=true; structural_errors=fail-closed; synthetic_all_pass=true; ` +
    `policy_mutation=false; receipt_mutation=false; product_zip=false; permanent_workflow_unchanged=true; head=${head}`
  );
})();
