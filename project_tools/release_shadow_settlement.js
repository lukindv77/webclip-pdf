'use strict';

// P1-231 S1-B passive shadow settlement.
// Validates the S0-G receipt namespace before the S1-A eligibility short-circuit,
// then consumes S0-G exact-candidate settlement only for an eligible S1-A result.
// It never writes receipts, mutates readiness, builds artifacts, or authorizes release.

const path = require('node:path');
const packageAuthority = require('./release_package_authority.js');
const s0g = require('./release_evidence_settlement.js');
const s1a = require('./release_shadow_identity.js');

const ROOT = path.resolve(__dirname, '..');
const SCHEMA = 'webclip-shadow-settlement/v1';
const S1A_SCHEMA = 'webclip-shadow-identity/v1';
const REQUIRED_SLOTS = Object.freeze([...s0g.KINDS]);
const SETTLED_STATES = new Set(['pass', 'blocked', 'missing']);

function fail(code, detail) {
  const error = new Error(String(detail || code).slice(0, 500));
  error.code = code;
  throw error;
}

function validFingerprint(value) {
  return /^sha256:[0-9a-f]{64}$/.test(String(value || ''));
}

function normalizeShadow(value, candidateSha) {
  const candidate = packageAuthority.normalizeCandidateSha(candidateSha);
  if (
    !value
    || value.schema !== S1A_SCHEMA
    || value.candidate_sha !== candidate
    || value.identity_protocol !== 'WEBCLIP_RELEASE_IDENTITY_V1'
    || value.generation_gate !== 'pass'
    || typeof value.eligible !== 'boolean'
    || value.policy_mutation !== false
    || value.receipt_mutation !== false
    || value.evidence_settlement !== false
    || value.artifact_build !== false
    || value.release_authorized !== false
  ) {
    fail('S1B_SHADOW_IDENTITY_INVALID');
  }

  for (const [name, fingerprint] of Object.entries({
    rpf: value.rpf,
    chrome_qcf: value.chrome_qcf,
    yandex_qcf: value.yandex_qcf,
    rcf: value.rcf,
    bcf: value.bcf
  })) {
    if (!validFingerprint(fingerprint)) fail('S1B_SHADOW_IDENTITY_INVALID', name);
  }

  if (value.eligible === true && value.shadow_outcome !== 'eligible') {
    fail('S1B_SHADOW_ELIGIBILITY_INCONSISTENT');
  }
  if (value.eligible === false && value.shadow_outcome !== 'control-plane-review-required') {
    fail('S1B_SHADOW_ELIGIBILITY_INCONSISTENT');
  }

  return Object.freeze({
    candidate_sha: candidate,
    eligible: value.eligible,
    shadow_outcome: value.shadow_outcome,
    rpf: value.rpf,
    chrome_qcf: value.chrome_qcf,
    yandex_qcf: value.yandex_qcf,
    rcf: value.rcf,
    bcf: value.bcf
  });
}

function normalizeNamespace(receipts) {
  let validated;
  try {
    validated = s0g.validateNamespace(receipts);
  } catch (error) {
    if (error && error.code) throw error;
    fail('S1B_RECEIPT_NAMESPACE_INVALID');
  }
  return Object.freeze({
    valid: true,
    receipt_count: validated.length,
    receipts: validated
  });
}

function exactSlotKeys(slots) {
  if (!slots || typeof slots !== 'object' || Array.isArray(slots)) return false;
  const actual = Object.keys(slots).sort();
  const expected = [...REQUIRED_SLOTS].sort();
  return actual.length === expected.length
    && actual.every((key, index) => key === expected[index]);
}

function normalizeSlot(kind, value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !SETTLED_STATES.has(value.state)) {
    fail('S1B_S0G_SLOTS_INVALID', kind);
  }

  const out = { state: value.state };
  if (value.reason != null) out.reason = String(value.reason).slice(0, 160);
  if (value.receiptId != null) out.receipt_id = String(value.receiptId).slice(0, 128);
  if (value.attemptSeq != null) {
    if (!Number.isSafeInteger(value.attemptSeq) || value.attemptSeq < 1) {
      fail('S1B_S0G_SLOTS_INVALID', kind);
    }
    out.attempt_seq = value.attemptSeq;
  }
  if (value.testedSourceSha != null) {
    if (!/^[0-9a-f]{40}$/.test(String(value.testedSourceSha))) {
      fail('S1B_S0G_SLOTS_INVALID', kind);
    }
    out.tested_source_sha = value.testedSourceSha;
  }
  if (value.outcome != null) out.outcome = String(value.outcome).slice(0, 64);
  return Object.freeze(out);
}

function normalizeSettlement(value, shadow) {
  if (
    !value
    || value.schema !== s0g.SETTLEMENT_SCHEMA
    || value.candidate_sha !== shadow.candidate_sha
    || value.candidate_generation_state !== 'pass'
    || value.policy_mutation !== false
    || value.receipt_mutation !== false
    || value.readiness_mutation !== false
    || value.artifact_build !== false
    || value.release_authorized !== false
    || !value.identities
    || !value.identities.qcf
  ) {
    fail('S1B_S0G_RESULT_INVALID');
  }

  if (
    value.identities.rpf !== shadow.rpf
    || value.identities.qcf['unpacked-chrome'] !== shadow.chrome_qcf
    || value.identities.qcf['yandex-e2e'] !== shadow.yandex_qcf
    || value.identities.rcf !== shadow.rcf
  ) {
    fail('S1B_S0G_IDENTITY_MISMATCH');
  }

  if (!exactSlotKeys(value.slots)) fail('S1B_S0G_SLOTS_INVALID');

  const slots = {};
  for (const kind of REQUIRED_SLOTS) slots[kind] = normalizeSlot(kind, value.slots[kind]);

  const derivedAll = REQUIRED_SLOTS.every((kind) => slots[kind].state === 'pass');
  if (value.all_required_slots_pass !== derivedAll) {
    fail('S1B_S0G_ALL_REQUIRED_INCONSISTENT');
  }

  const anyBlocked = REQUIRED_SLOTS.some((kind) => slots[kind].state === 'blocked');
  const expectedSettlementState = derivedAll
    ? 'settled-pass'
    : (anyBlocked ? 'evidence-blocked' : 'evidence-missing');
  if (value.settlement_state !== expectedSettlementState) {
    fail('S1B_S0G_SETTLEMENT_STATE_INCONSISTENT');
  }

  return Object.freeze({
    slots: Object.freeze(slots),
    all_required_slots_pass: derivedAll,
    settlement_state: expectedSettlementState
  });
}

function notEvaluatedSlots() {
  return Object.freeze(Object.fromEntries(
    REQUIRED_SLOTS.map((kind) => [kind, Object.freeze({ state: 'not-evaluated' })])
  ));
}

function evaluateShadowSettlement(input, options = {}) {
  if (!input || typeof input !== 'object') fail('S1B_INPUT_INVALID');
  const candidate = packageAuthority.normalizeCandidateSha(input.candidateSha);

  const namespaceReader = options.namespaceReader
    || ((sha) => s0g.readReceiptNamespace(sha, { ...(options.namespaceOptions || {}), repoRoot: options.repoRoot || ROOT }));
  let namespaceRaw;
  try {
    namespaceRaw = namespaceReader(candidate);
  } catch (error) {
    if (error && error.code) throw error;
    fail('S1B_RECEIPT_NAMESPACE_INVALID');
  }
  const namespace = normalizeNamespace(namespaceRaw);

  const shadowProvider = options.shadowProvider || ((shadowInput) => s1a.evaluateShadow(
    shadowInput,
    { ...(options.shadowOptions || {}), repoRoot: options.repoRoot || ROOT }
  ));

  let shadowRaw;
  try {
    shadowRaw = shadowProvider({
      eventKind: input.eventKind,
      candidateSha: candidate,
      baseSha: input.baseSha,
      prHeadSha: input.prHeadSha
    });
  } catch (error) {
    if (error && error.code) throw error;
    fail('S1B_SHADOW_COMPUTATION_FAILED');
  }
  const shadow = normalizeShadow(shadowRaw, candidate);

  if (!shadow.eligible) {
    return Object.freeze({
      schema: SCHEMA,
      candidate_sha: candidate,
      identity_eligible: false,
      namespace_valid: true,
      namespace_receipt_count: namespace.receipt_count,
      settlement_evaluated: false,
      shadow_outcome: 'candidate-ineligible',
      blocker_reason: shadow.shadow_outcome,
      slots: notEvaluatedSlots(),
      all_required_slots_pass: false,
      s0g_settlement_state: null,
      policy_mutation: false,
      receipt_mutation: false,
      readiness_mutation: false,
      artifact_build: false,
      release_authorized: false
    });
  }

  const settlementProvider = options.settlementProvider || ((sha, receipts) => s0g.settleCurrentCandidate(
    sha,
    {
      ...(options.settlementOptions || {}),
      repoRoot: options.repoRoot || ROOT,
      receipts
    }
  ));

  let settlementRaw;
  try {
    settlementRaw = settlementProvider(candidate, namespace.receipts);
  } catch (error) {
    if (error && error.code) throw error;
    fail('S1B_S0G_SETTLEMENT_FAILED');
  }
  const settlement = normalizeSettlement(settlementRaw, shadow);

  return Object.freeze({
    schema: SCHEMA,
    candidate_sha: candidate,
    identity_eligible: true,
    namespace_valid: true,
    namespace_receipt_count: namespace.receipt_count,
    settlement_evaluated: true,
    shadow_outcome: settlement.all_required_slots_pass ? 'settled-pass' : 'settled-blocked',
    blocker_reason: null,
    slots: settlement.slots,
    all_required_slots_pass: settlement.all_required_slots_pass,
    s0g_settlement_state: settlement.settlement_state,
    policy_mutation: false,
    receipt_mutation: false,
    readiness_mutation: false,
    artifact_build: false,
    release_authorized: false
  });
}

function parseArgs(argv) {
  const out = {
    eventKind: '',
    candidateSha: '',
    baseSha: null,
    prHeadSha: null,
    help: false
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') { out.help = true; continue; }
    if (arg === '--event') { out.eventKind = String(argv[++index] || ''); continue; }
    if (arg === '--candidate') { out.candidateSha = String(argv[++index] || ''); continue; }
    if (arg === '--base') { out.baseSha = String(argv[++index] || ''); continue; }
    if (arg === '--pr-head') { out.prHeadSha = String(argv[++index] || ''); continue; }
    fail('S1B_ARGUMENT_INVALID', arg);
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(
      'node project_tools/release_shadow_settlement.js --event <push|pull_request> ' +
      '--candidate <exact-sha> [--base <exact-sha> --pr-head <exact-sha>]\n'
    );
    return;
  }
  if (!args.eventKind || !args.candidateSha) fail('S1B_ARGUMENT_INVALID');
  if (args.eventKind === 'pull_request' && (!args.baseSha || !args.prHeadSha)) {
    fail('S1B_ARGUMENT_INVALID');
  }
  if (args.eventKind === 'push' && (args.baseSha || args.prHeadSha)) {
    fail('S1B_ARGUMENT_INVALID');
  }
  process.stdout.write(JSON.stringify(evaluateShadowSettlement({
    eventKind: args.eventKind,
    candidateSha: args.candidateSha,
    baseSha: args.baseSha,
    prHeadSha: args.prHeadSha
  }), null, 2) + '\n');
}

if (require.main === module) {
  try { main(); }
  catch (error) {
    process.stderr.write(String(error && error.code || 'S1B_FAILED') + ': ' +
      String(error && error.message || 'failed').slice(0, 500) + '\n');
    process.exitCode = 1;
  }
}

module.exports = Object.freeze({
  ROOT,
  SCHEMA,
  S1A_SCHEMA,
  REQUIRED_SLOTS,
  normalizeShadow,
  normalizeNamespace,
  normalizeSettlement,
  notEvaluatedSlots,
  evaluateShadowSettlement,
  parseArgs
});
