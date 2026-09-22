'use strict';

// P1-231 S0-G passive release-evidence settlement.
// Reads typed receipts from exact Git blobs and derives read-only settlement.
// It never writes receipts, mutates V1 readiness, builds artifacts, or authorizes release.

const crypto = require('node:crypto');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const { TextDecoder } = require('node:util');
const packageAuthority = require('./release_package_authority.js');
const candidateGate = require('./release_candidate_generation.js');

const ROOT = path.resolve(__dirname, '..');
const RECEIPT_DIR = 'project_docs/release_evidence/receipts';
const RECEIPT_SCHEMA = 'webclip-release-evidence/v2';
const SETTLEMENT_SCHEMA = 'webclip-evidence-settlement-result/v1';
const REPOSITORY = 'lukindv77/webclip-pdf';
const KINDS = Object.freeze(['unpacked-chrome', 'yandex-e2e', 'blocker-review', 'release-decision']);
const PHYSICAL_KINDS = new Set(['unpacked-chrome', 'yandex-e2e']);
const PHYSICAL_OUTCOMES = new Set(['pass', 'fail', 'inconclusive', 'invalidated']);
const DECISION_OUTCOMES = new Set(['approved', 'rejected', 'invalidated']);
const MAX_RECEIPTS = 4096;
const MAX_RECEIPT_BYTES = 64 * 1024;
const MAX_TOTAL_BYTES = 16 * 1024 * 1024;
const MAX_ATTEMPT = 0x7fffffff;
const MAX_SUMMARY_BYTES = 4096;
const MAX_REFS = 8;
const MAX_REF_CHARS = 512;
const SECRETISH = /(authorization\s*:|bearer\s+|oauth|access[_-]?token|refresh[_-]?token|github[_-]?token|gh[pousr]_[A-Za-z0-9_]+|token=|\.disk\.yandex\.(?:net|ru)\/[^\s?#]+\?)/i;

function fail(code, detail) {
  const error = new Error(String(detail || code).slice(0, 500));
  error.code = code;
  throw error;
}
function validSha(value) { return /^[0-9a-f]{40}$/.test(String(value || '')); }
function validDigest(value) { return /^sha256:[0-9a-f]{64}$/.test(String(value || '')); }
function exactKeys(obj, allowed) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
  const keys = Object.keys(obj).sort();
  const want = [...allowed].sort();
  return keys.length === want.length && keys.every((key, index) => key === want[index]);
}
function safeText(value, maxChars = MAX_REF_CHARS) {
  const text = String(value || '');
  return text.length > 0 && text.length <= maxChars && !SECRETISH.test(text);
}
function sha256Text(value) {
  return 'sha256:' + crypto.createHash('sha256').update(Buffer.from(String(value), 'utf8')).digest('hex');
}
function git(repoRoot, args, options = {}) {
  try {
    return execFileSync('git', args, {
      cwd: repoRoot,
      encoding: options.encoding === null ? null : (options.encoding || 'utf8'),
      maxBuffer: options.maxBuffer || 32 * 1024 * 1024
    });
  } catch (error) {
    const wrapped = new Error('git command failed');
    wrapped.code = 'RELEASE_EVIDENCE_GIT_READ_FAILED';
    wrapped.cause = error;
    throw wrapped;
  }
}

function forbiddenJsonConstantOutsideString(text) {
  let quoted = false;
  let escaped = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (escaped) { escaped = false; continue; }
      if (char === '\\') { escaped = true; continue; }
      if (char === '"') quoted = false;
      continue;
    }
    if (char === '"') { quoted = true; continue; }
    if (/^(?:NaN|Infinity|-Infinity)(?![A-Za-z0-9_])/.test(text.slice(index))) return true;
  }
  return false;
}

function rejectDuplicateObjectKeys(text) {
  const stack = [];
  let index = 0;
  function skipWs() {
    while (index < text.length && /[\x20\x09\x0a\x0d]/.test(text[index])) index += 1;
  }
  function readString() {
    const start = index++;
    let escaped = false;
    while (index < text.length) {
      const char = text[index++];
      if (escaped) { escaped = false; continue; }
      if (char === '\\') { escaped = true; continue; }
      if (char === '"') return text.slice(start, index);
    }
    fail('RECEIPT_JSON_INVALID');
  }
  while (index < text.length) {
    skipWs();
    if (index >= text.length) break;
    const char = text[index];
    if (char === '"') {
      const raw = readString();
      skipWs();
      const frame = stack[stack.length - 1];
      if (frame && frame.type === 'object' && frame.expectingKey && text[index] === ':') {
        let key;
        try { key = JSON.parse(raw); } catch (_) { fail('RECEIPT_JSON_INVALID'); }
        if (frame.keys.has(key)) fail('RECEIPT_JSON_DUPLICATE_KEY', key);
        frame.keys.add(key);
        frame.expectingKey = false;
      }
      continue;
    }
    if (char === '{') { stack.push({ type: 'object', keys: new Set(), expectingKey: true }); index += 1; continue; }
    if (char === '[') { stack.push({ type: 'array' }); index += 1; continue; }
    if (char === '}' || char === ']') { stack.pop(); index += 1; continue; }
    if (char === ',') {
      const frame = stack[stack.length - 1];
      if (frame && frame.type === 'object') frame.expectingKey = true;
      index += 1;
      continue;
    }
    index += 1;
  }
}

function provenanceErrors(receipt) {
  const provenance = receipt.provenance;
  const errors = [];
  if (!provenance || typeof provenance !== 'object' || Array.isArray(provenance)) return ['provenance-object'];

  if (PHYSICAL_KINDS.has(receipt.kind)) {
    const allowed = ['kind', 'repository', 'workflowPath', 'workflowSha', 'runId', 'runAttempt', 'jobId', 'executionSha'];
    if (!exactKeys(provenance, allowed)) errors.push('provenance-shape');
    if (provenance.kind !== 'github-actions') errors.push('provenance-kind');
    if (provenance.repository !== REPOSITORY) errors.push('provenance-repository');
    if (!/^\.github\/workflows\/[A-Za-z0-9._/-]+\.ya?ml$/.test(String(provenance.workflowPath || ''))) errors.push('provenance-workflow-path');
    if (!validSha(provenance.workflowSha)) errors.push('provenance-workflow-sha');
    if (!Number.isSafeInteger(provenance.runId) || provenance.runId < 1) errors.push('provenance-run-id');
    if (!Number.isSafeInteger(provenance.runAttempt) || provenance.runAttempt < 1) errors.push('provenance-run-attempt');
    if (!Number.isSafeInteger(provenance.jobId) || provenance.jobId < 1) errors.push('provenance-job-id');
    if (!validSha(provenance.executionSha)) errors.push('provenance-execution-sha');
  } else {
    const allowed = ['kind', 'repository', 'recordedSourceSha', 'changeRef'];
    if (!exactKeys(provenance, allowed)) errors.push('provenance-shape');
    if (provenance.kind !== 'canonical-project') errors.push('provenance-kind');
    if (provenance.repository !== REPOSITORY) errors.push('provenance-repository');
    if (!validSha(provenance.recordedSourceSha)) errors.push('provenance-recorded-sha');
    if (!safeText(provenance.changeRef, 256)) errors.push('provenance-change-ref');
  }

  for (const value of Object.values(provenance)) {
    if (typeof value === 'string' && SECRETISH.test(value)) errors.push('provenance-secret');
  }
  return [...new Set(errors)];
}

function receiptErrors(receipt) {
  const errors = [];
  const allowed = [
    'schema', 'receiptId', 'kind', 'attemptSeq', 'testedSourceSha', 'testedVersion',
    'subject', 'outcome', 'provenance', 'durableSummary', 'durableSummaryDigest', 'evidenceRefs'
  ];
  if (!receipt || typeof receipt !== 'object' || Array.isArray(receipt)) return ['receipt-object'];
  if (!exactKeys(receipt, allowed)) errors.push('receipt-shape');
  if (receipt.schema !== RECEIPT_SCHEMA) errors.push('schema');
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(String(receipt.receiptId || ''))) errors.push('receipt-id');
  if (!KINDS.includes(receipt.kind)) errors.push('kind');
  if (!Number.isSafeInteger(receipt.attemptSeq) || receipt.attemptSeq < 1 || receipt.attemptSeq > MAX_ATTEMPT) errors.push('attempt-seq');
  if (!validSha(receipt.testedSourceSha)) errors.push('tested-source-sha');
  if (!/^\d+\.\d+\.\d+(?:\.\d+)?$/.test(String(receipt.testedVersion || ''))) errors.push('tested-version');

  if (!exactKeys(receipt.subject, ['rpf', 'contractFingerprint'])) errors.push('subject-shape');
  if (!validDigest(receipt.subject && receipt.subject.rpf)) errors.push('subject-rpf');
  if (!validDigest(receipt.subject && receipt.subject.contractFingerprint)) errors.push('subject-contract');

  if (receipt.kind === 'release-decision') {
    if (!DECISION_OUTCOMES.has(receipt.outcome)) errors.push('outcome');
  } else if (!PHYSICAL_OUTCOMES.has(receipt.outcome)) {
    errors.push('outcome');
  }

  errors.push(...provenanceErrors(receipt));

  const summary = String(receipt.durableSummary || '');
  if (!summary || Buffer.byteLength(summary, 'utf8') > MAX_SUMMARY_BYTES || SECRETISH.test(summary)) errors.push('summary');
  if (!validDigest(receipt.durableSummaryDigest)) errors.push('summary-digest');
  if (receipt.durableSummaryDigest !== sha256Text(summary)) errors.push('summary-digest-mismatch');

  if (!Array.isArray(receipt.evidenceRefs) || receipt.evidenceRefs.length > MAX_REFS) {
    errors.push('evidence-refs');
  } else {
    for (const ref of receipt.evidenceRefs) if (!safeText(ref)) errors.push('evidence-ref');
  }

  return [...new Set(errors)];
}

function parseReceiptBytes(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) fail('RECEIPT_JSON_INVALID');
  if (bytes.length > MAX_RECEIPT_BYTES) fail('RECEIPT_TOO_LARGE');
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) fail('RECEIPT_BOM_FORBIDDEN');
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: false }).decode(bytes); }
  catch (_) { fail('RECEIPT_UTF8_INVALID'); }
  if (forbiddenJsonConstantOutsideString(text)) fail('RECEIPT_JSON_INVALID');
  rejectDuplicateObjectKeys(text);
  let value;
  try { value = JSON.parse(text); } catch (_) { fail('RECEIPT_JSON_INVALID'); }
  const errors = receiptErrors(value);
  if (errors.length) fail('RECEIPT_INVALID', errors.join(','));
  return Object.freeze(structuredClone(value));
}

function receiptKey(receipt) {
  return receipt.kind + '\0' + receipt.subject.rpf + '\0' + receipt.subject.contractFingerprint;
}

function validateNamespace(receipts) {
  if (!Array.isArray(receipts) || receipts.length > MAX_RECEIPTS) fail('RECEIPT_NAMESPACE_INVALID');
  const ids = new Set();
  const attemptKeys = new Set();
  for (const receipt of receipts) {
    const errors = receiptErrors(receipt);
    if (errors.length) fail('RECEIPT_NAMESPACE_INVALID', receipt.receiptId || '<invalid>');
    if (ids.has(receipt.receiptId)) fail('RECEIPT_ID_DUPLICATE', receipt.receiptId);
    ids.add(receipt.receiptId);
    const attemptKey = receiptKey(receipt) + '\0' + receipt.attemptSeq;
    if (attemptKeys.has(attemptKey)) fail('RECEIPT_ATTEMPT_DUPLICATE', receipt.receiptId);
    attemptKeys.add(attemptKey);
  }
  return Object.freeze([...receipts]);
}

function readReceiptNamespace(candidateSha, options = {}) {
  const candidate = packageAuthority.normalizeCandidateSha(candidateSha);
  const repoRoot = path.resolve(options.repoRoot || ROOT);
  let type;
  try { type = String(git(repoRoot, ['cat-file', '-t', candidate])).trim(); }
  catch (_) { fail('RECEIPT_CANDIDATE_NOT_COMMIT'); }
  if (type !== 'commit') fail('RECEIPT_CANDIDATE_NOT_COMMIT');

  let listing = '';
  try { listing = String(git(repoRoot, ['ls-tree', '-r', candidate, '--', RECEIPT_DIR])).trim(); }
  catch (_) { fail('RECEIPT_GIT_READ_FAILED'); }
  if (!listing) return Object.freeze([]);

  const lines = listing.split(/\r?\n/).filter(Boolean);
  if (lines.length > MAX_RECEIPTS) fail('RECEIPT_NAMESPACE_TOO_LARGE');
  const receipts = [];
  let totalBytes = 0;

  for (const line of lines) {
    const tab = line.indexOf('\t');
    if (tab <= 0) fail('RECEIPT_GIT_READ_FAILED');
    const [mode, objectType, oid] = line.slice(0, tab).split(/\s+/);
    const rel = line.slice(tab + 1);
    const relativeName = rel.startsWith(RECEIPT_DIR + '/') ? rel.slice(RECEIPT_DIR.length + 1) : '';
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}\.json$/.test(relativeName)) {
      fail('RECEIPT_NAMESPACE_PATH_INVALID', rel);
    }
    if (objectType !== 'blob') fail('RECEIPT_MEMBER_TYPE_INVALID', rel);
    if (mode !== '100644') fail('RECEIPT_MEMBER_MODE_INVALID', rel);
    if (!/^[0-9a-f]{40}$/.test(oid)) fail('RECEIPT_GIT_READ_FAILED', rel);
    const size = Number(String(git(repoRoot, ['cat-file', '-s', oid])).trim());
    if (!Number.isSafeInteger(size) || size <= 0 || size > MAX_RECEIPT_BYTES) fail('RECEIPT_TOO_LARGE', rel);
    totalBytes += size;
    if (totalBytes > MAX_TOTAL_BYTES) fail('RECEIPT_NAMESPACE_TOO_LARGE');
    const bytes = git(repoRoot, ['cat-file', 'blob', oid], {
      encoding: null,
      maxBuffer: Math.max(1024 * 1024, size + 1024)
    });
    const receipt = parseReceiptBytes(bytes);
    const filename = relativeName.slice(0, -5);
    if (filename !== receipt.receiptId) fail('RECEIPT_FILENAME_ID_MISMATCH', rel);
    receipts.push(receipt);
  }

  receipts.sort((a, b) => Buffer.from(a.receiptId).compare(Buffer.from(b.receiptId)));
  return validateNamespace(receipts);
}

function normalizeAdmission(value) {
  if (
    !value
    || value.schema !== candidateGate.RESULT_SCHEMA
    || value.generation_state !== 'pass'
    || !validSha(value.candidate_sha)
    || value.generator_rcf_binding !== 'bound'
    || value.policy_mutation !== false
    || value.receipt_interpretation !== false
    || value.evidence_settlement !== false
    || value.artifact_build !== false
    || value.release_authorized !== false
    || !value.identities
    || !validDigest(value.identities.rpf)
    || !validDigest(value.identities.qcf && value.identities.qcf['unpacked-chrome'])
    || !validDigest(value.identities.qcf && value.identities.qcf['yandex-e2e'])
    || !validDigest(value.identities.rcf)
    || !validDigest(value.identities.bcf)
  ) {
    fail('CANDIDATE_GENERATION_NOT_ADMITTED');
  }
  return value;
}

function expectedContract(admission, kind) {
  return PHYSICAL_KINDS.has(kind)
    ? admission.identities.qcf[kind]
    : admission.identities.rcf;
}

function candidateKey(admission, kind) {
  return kind + '\0' + admission.identities.rpf + '\0' + expectedContract(admission, kind);
}

function receiptMatchesAdmission(receipt, admission) {
  try { normalizeAdmission(admission); } catch (_) {
    return Object.freeze({ ok: false, reason: 'TESTED_SOURCE_GENERATION_NOT_ADMITTED' });
  }
  if (admission.candidate_sha !== receipt.testedSourceSha) {
    return Object.freeze({ ok: false, reason: 'TESTED_SOURCE_GENERATION_NOT_ADMITTED' });
  }
  if (
    admission.identities.rpf !== receipt.subject.rpf
    || expectedContract(admission, receipt.kind) !== receipt.subject.contractFingerprint
  ) {
    return Object.freeze({ ok: false, reason: 'TESTED_SOURCE_IDENTITY_MISMATCH' });
  }
  return Object.freeze({ ok: true });
}

function gitIsAncestor(ancestorSha, descendantSha, options = {}) {
  const repoRoot = path.resolve(options.repoRoot || ROOT);
  if (!validSha(ancestorSha) || !validSha(descendantSha)) return false;
  const proc = spawnSync(
    'git',
    ['merge-base', '--is-ancestor', ancestorSha, descendantSha],
    { cwd: repoRoot, stdio: 'ignore' }
  );
  if (proc.status === 0) return true;
  if (proc.status === 1) return false;
  fail('RECEIPT_ANCESTRY_CHECK_FAILED');
}

function terminalPass(kind, outcome) {
  return kind === 'release-decision' ? outcome === 'approved' : outcome === 'pass';
}

function settleEvidence(options) {
  const candidateSha = packageAuthority.normalizeCandidateSha(options && options.candidateSha);
  const candidateAdmission = normalizeAdmission(options && options.candidateAdmission);
  if (candidateAdmission.candidate_sha !== candidateSha) fail('CANDIDATE_RESULT_SHA_MISMATCH');
  const receipts = validateNamespace((options && options.receipts) || []);
  const admissionProvider = options && options.admissionProvider;
  const isAncestor = (options && options.isAncestor) || ((a, b) => gitIsAncestor(a, b, options || {}));

  const slots = {};
  for (const kind of KINDS) {
    const relevant = receipts.filter((receipt) => receiptKey(receipt) === candidateKey(candidateAdmission, kind));
    if (!relevant.length) {
      slots[kind] = Object.freeze({ state: 'missing', reason: 'NO_CURRENT_RECEIPT' });
      continue;
    }

    const eligible = [];
    let blocked = null;
    for (const receipt of relevant) {
      const testedAdmission = typeof admissionProvider === 'function'
        ? admissionProvider(receipt.testedSourceSha)
        : null;
      const match = receiptMatchesAdmission(receipt, testedAdmission);
      if (!match.ok) {
        blocked = Object.freeze({ state: 'blocked', reason: match.reason, receiptId: receipt.receiptId });
        break;
      }
      if (!isAncestor(receipt.testedSourceSha, candidateSha)) {
        blocked = Object.freeze({ state: 'blocked', reason: 'TESTED_SOURCE_NOT_ANCESTOR', receiptId: receipt.receiptId });
        break;
      }
      eligible.push(receipt);
    }
    if (blocked) {
      slots[kind] = blocked;
      continue;
    }

    eligible.sort((a, b) => a.attemptSeq - b.attemptSeq);
    const winner = eligible[eligible.length - 1];
    const pass = terminalPass(kind, winner.outcome);
    slots[kind] = Object.freeze({
      state: pass ? 'pass' : 'blocked',
      reason: pass ? null : 'LATEST_' + String(winner.outcome).toUpperCase().replace(/-/g, '_'),
      receiptId: winner.receiptId,
      attemptSeq: winner.attemptSeq,
      testedSourceSha: winner.testedSourceSha,
      outcome: winner.outcome
    });
  }

  const allRequiredSlotsPass = KINDS.every((kind) => slots[kind].state === 'pass');
  const anyBlocked = KINDS.some((kind) => slots[kind].state === 'blocked');
  const settlementState = allRequiredSlotsPass ? 'settled-pass' : (anyBlocked ? 'evidence-blocked' : 'evidence-missing');

  return Object.freeze({
    schema: SETTLEMENT_SCHEMA,
    candidate_sha: candidateSha,
    candidate_generation_state: 'pass',
    identities: Object.freeze({
      rpf: candidateAdmission.identities.rpf,
      qcf: Object.freeze({
        'unpacked-chrome': candidateAdmission.identities.qcf['unpacked-chrome'],
        'yandex-e2e': candidateAdmission.identities.qcf['yandex-e2e']
      }),
      rcf: candidateAdmission.identities.rcf
    }),
    slots: Object.freeze(slots),
    all_required_slots_pass: allRequiredSlotsPass,
    settlement_state: settlementState,
    policy_mutation: false,
    receipt_mutation: false,
    readiness_mutation: false,
    artifact_build: false,
    release_authorized: false
  });
}

function validateAppendOnly(previousFiles, nextFiles) {
  if (!previousFiles || !nextFiles || typeof previousFiles !== 'object' || typeof nextFiles !== 'object') {
    fail('RECEIPT_APPEND_ONLY_INPUT_INVALID');
  }
  const errors = [];
  for (const [name, value] of Object.entries(previousFiles)) {
    if (!Object.prototype.hasOwnProperty.call(nextFiles, name)) errors.push('deleted:' + name);
    else if (nextFiles[name] !== value) errors.push('modified:' + name);
  }
  return Object.freeze(errors);
}

function settleCurrentCandidate(candidateSha, options = {}) {
  const candidate = packageAuthority.normalizeCandidateSha(candidateSha);
  const candidateAdmission = options.candidateAdmission || candidateGate.admitCandidate(candidate, options.candidateOptions || {});
  const receipts = options.receipts || readReceiptNamespace(candidate, options);
  const provider = options.admissionProvider || ((sha) => sha === candidate ? candidateAdmission : null);
  return settleEvidence({
    ...options,
    candidateSha: candidate,
    candidateAdmission,
    receipts,
    admissionProvider: provider
  });
}

function parseArgs(argv) {
  const out = { candidate: '', help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') { out.help = true; continue; }
    if (arg === '--candidate') {
      if (out.candidate) fail('RELEASE_EVIDENCE_ARGUMENT_INVALID');
      out.candidate = String(argv[++index] || '');
      continue;
    }
    fail('RELEASE_EVIDENCE_ARGUMENT_INVALID', arg);
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write('node project_tools/release_evidence_settlement.js --candidate <exact-40-hex-commit>\n');
    return;
  }
  if (!args.candidate) fail('RELEASE_EVIDENCE_CANDIDATE_SHA_REQUIRED');
  process.stdout.write(JSON.stringify(settleCurrentCandidate(args.candidate), null, 2) + '\n');
}

if (require.main === module) {
  try { main(); }
  catch (error) {
    process.stderr.write(String(error && error.code || 'RELEASE_EVIDENCE_SETTLEMENT_FAILED') + ': ' +
      String(error && error.message || 'failed').slice(0, 500) + '\n');
    process.exitCode = 1;
  }
}

module.exports = Object.freeze({
  ROOT,
  RECEIPT_DIR,
  RECEIPT_SCHEMA,
  SETTLEMENT_SCHEMA,
  REPOSITORY,
  KINDS,
  PHYSICAL_KINDS,
  MAX_RECEIPTS,
  MAX_RECEIPT_BYTES,
  MAX_TOTAL_BYTES,
  sha256Text,
  receiptErrors,
  parseReceiptBytes,
  receiptKey,
  validateNamespace,
  readReceiptNamespace,
  normalizeAdmission,
  expectedContract,
  candidateKey,
  receiptMatchesAdmission,
  gitIsAncestor,
  terminalPass,
  settleEvidence,
  validateAppendOnly,
  settleCurrentCandidate,
  parseArgs
});
