'use strict';

const assert = require('assert');
const crypto = require('crypto');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const RECEIPT_SCHEMA = 'webclip-release-evidence/v2';
const ADMISSION_SCHEMA = 'webclip-candidate-generation-result/v1';
const SETTLEMENT_SCHEMA = 'webclip-evidence-settlement-result/v1';
const REPO = 'lukindv77/webclip-pdf';
const PHYSICAL_KINDS = new Set(['unpacked-chrome', 'yandex-e2e']);
const KINDS = ['unpacked-chrome', 'yandex-e2e', 'blocker-review', 'release-decision'];
const PHYSICAL_OUTCOMES = new Set(['pass', 'fail', 'inconclusive', 'invalidated']);
const DECISION_OUTCOMES = new Set(['approved', 'rejected', 'invalidated']);
const MAX_ATTEMPT = 0x7fffffff;
const MAX_SUMMARY_BYTES = 4096;
const MAX_REFS = 8;
const MAX_REF_CHARS = 512;
const SECRETISH = /(authorization\s*:|bearer\s+|oauth|access[_-]?token|refresh[_-]?token|github[_-]?token|gh[pousr]_[A-Za-z0-9_]+|token=|\.disk\.yandex\.(?:net|ru)\/[^\s?#]+\?)/i;
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

function sha256Text(value) {
  return `sha256:${crypto.createHash('sha256').update(Buffer.from(String(value), 'utf8')).digest('hex')}`;
}

function validDigest(value) {
  return /^sha256:[0-9a-f]{64}$/.test(String(value || ''));
}

function validSha(value) {
  return /^[0-9a-f]{40}$/.test(String(value || ''));
}

function parseKvLine(line) {
  const out = {};
  for (const raw of String(line).split(';').slice(1)) {
    const part = raw.trim();
    const eq = part.indexOf('=');
    if (eq <= 0) continue;
    out[part.slice(0, eq)] = part.slice(eq + 1);
  }
  return out;
}

function runModel(file, prefix) {
  const stdout = execFileSync(process.execPath, [path.join(ROOT, file)], {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const line = stdout.trim().split(/\r?\n/).reverse().find((x) => x.startsWith(prefix));
  assert(line, `missing predecessor output: ${prefix}`);
  return { line, kv: parseKvLine(line) };
}

const currentHead = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
assert(validSha(currentHead));

const s0e = runModel(
  'project_tools/test_p1_231_s0e_identity_engine_source_spec_model.js',
  'P1-231 S0-E identity engine source-spec model: PASS'
);
const s0f = runModel(
  'project_tools/test_p1_231_s0f_candidate_generation_verifier_source_spec_model.js',
  'P1-231 S0-F candidate-generation verifier source-spec model: PASS'
);

const currentIds = {
  rpf: s0e.kv.rpf,
  qcf: {
    'unpacked-chrome': s0e.kv.chrome_qcf,
    'yandex-e2e': s0e.kv.yandex_qcf,
  },
  rcf: s0e.kv.rcf,
  bcf: s0e.kv.bcf,
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function makeAdmission(candidateSha, overrides = {}) {
  return {
    schema: ADMISSION_SCHEMA,
    candidateSha,
    generationState: 'pass',
    identities: clone(currentIds),
    ...overrides,
  };
}

function expectedContract(ids, kind) {
  return PHYSICAL_KINDS.has(kind) ? ids.qcf[kind] : ids.rcf;
}

function keyOfReceipt(r) {
  return `${r.kind}\u0000${r.subject.rpf}\u0000${r.subject.contractFingerprint}`;
}

function keyForCandidate(admission, kind) {
  return `${kind}\u0000${admission.identities.rpf}\u0000${expectedContract(admission.identities, kind)}`;
}

function safeText(value, maxChars = MAX_REF_CHARS) {
  const text = String(value || '');
  return text.length > 0 && text.length <= maxChars && !SECRETISH.test(text);
}

function exactKeys(obj, allowed) {
  const keys = Object.keys(obj || {}).sort();
  const want = [...allowed].sort();
  return keys.length === want.length && keys.every((k, i) => k === want[i]);
}

function validateAdmission(a) {
  const errors = [];
  if (!a || a.schema !== ADMISSION_SCHEMA) errors.push('admission-schema');
  if (!validSha(a?.candidateSha)) errors.push('admission-sha');
  if (a?.generationState !== 'pass') errors.push('admission-state');
  if (!validDigest(a?.identities?.rpf)) errors.push('admission-rpf');
  if (!validDigest(a?.identities?.qcf?.['unpacked-chrome'])) errors.push('admission-chrome-qcf');
  if (!validDigest(a?.identities?.qcf?.['yandex-e2e'])) errors.push('admission-yandex-qcf');
  if (!validDigest(a?.identities?.rcf)) errors.push('admission-rcf');
  if (!validDigest(a?.identities?.bcf)) errors.push('admission-bcf');
  return errors;
}

function physicalProvenance(testedSourceSha, overrides = {}) {
  return {
    kind: 'github-actions',
    repository: REPO,
    workflowPath: '.github/workflows/release-qualification.yml',
    workflowSha: testedSourceSha,
    runId: 1001,
    runAttempt: 1,
    jobId: 2001,
    executionSha: testedSourceSha,
    ...overrides,
  };
}

function projectProvenance(testedSourceSha, overrides = {}) {
  return {
    kind: 'canonical-project',
    repository: REPO,
    recordedSourceSha: testedSourceSha,
    changeRef: 'pr:fixture-1',
    ...overrides,
  };
}

function makeReceipt({
  receiptId,
  kind,
  attemptSeq,
  testedSourceSha,
  identities = currentIds,
  outcome,
  testedVersion = '0.9.9',
  provenance,
  durableSummary,
  evidenceRefs = [],
  subject,
  extra = {},
}) {
  const summary = durableSummary || `${kind} fixture outcome ${outcome}`;
  return {
    schema: RECEIPT_SCHEMA,
    receiptId,
    kind,
    attemptSeq,
    testedSourceSha,
    testedVersion,
    subject: subject || {
      rpf: identities.rpf,
      contractFingerprint: expectedContract(identities, kind),
    },
    outcome,
    provenance: provenance || (PHYSICAL_KINDS.has(kind)
      ? physicalProvenance(testedSourceSha)
      : projectProvenance(testedSourceSha)),
    durableSummary: summary,
    durableSummaryDigest: sha256Text(summary),
    evidenceRefs,
    ...extra,
  };
}

function validateProvenance(r) {
  const p = r.provenance;
  const errors = [];
  if (!p || typeof p !== 'object' || Array.isArray(p)) return ['provenance-object'];
  if (PHYSICAL_KINDS.has(r.kind)) {
    const allowed = ['kind', 'repository', 'workflowPath', 'workflowSha', 'runId', 'runAttempt', 'jobId', 'executionSha'];
    if (!exactKeys(p, allowed)) errors.push('provenance-shape');
    if (p.kind !== 'github-actions') errors.push('provenance-kind');
    if (p.repository !== REPO) errors.push('provenance-repository');
    if (!/^\.github\/workflows\/[A-Za-z0-9._/-]+\.ya?ml$/.test(String(p.workflowPath || ''))) errors.push('provenance-workflow-path');
    if (!validSha(p.workflowSha)) errors.push('provenance-workflow-sha');
    if (!Number.isSafeInteger(p.runId) || p.runId < 1) errors.push('provenance-run-id');
    if (!Number.isSafeInteger(p.runAttempt) || p.runAttempt < 1) errors.push('provenance-run-attempt');
    if (!Number.isSafeInteger(p.jobId) || p.jobId < 1) errors.push('provenance-job-id');
    if (!validSha(p.executionSha)) errors.push('provenance-execution-sha');
  } else {
    const allowed = ['kind', 'repository', 'recordedSourceSha', 'changeRef'];
    if (!exactKeys(p, allowed)) errors.push('provenance-shape');
    if (p.kind !== 'canonical-project') errors.push('provenance-kind');
    if (p.repository !== REPO) errors.push('provenance-repository');
    if (!validSha(p.recordedSourceSha)) errors.push('provenance-recorded-sha');
    if (!safeText(p.changeRef, 256)) errors.push('provenance-change-ref');
  }
  for (const value of Object.values(p)) {
    if (typeof value === 'string' && SECRETISH.test(value)) errors.push('provenance-secret');
  }
  return [...new Set(errors)];
}

function validateReceipt(r) {
  const errors = [];
  const allowed = [
    'schema', 'receiptId', 'kind', 'attemptSeq', 'testedSourceSha', 'testedVersion',
    'subject', 'outcome', 'provenance', 'durableSummary', 'durableSummaryDigest', 'evidenceRefs'
  ];
  if (!r || typeof r !== 'object' || Array.isArray(r)) return ['receipt-object'];
  if (!exactKeys(r, allowed)) errors.push('receipt-shape');
  if (r.schema !== RECEIPT_SCHEMA) errors.push('schema');
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(String(r.receiptId || ''))) errors.push('receipt-id');
  if (!KINDS.includes(r.kind)) errors.push('kind');
  if (!Number.isSafeInteger(r.attemptSeq) || r.attemptSeq < 1 || r.attemptSeq > MAX_ATTEMPT) errors.push('attempt-seq');
  if (!validSha(r.testedSourceSha)) errors.push('tested-source-sha');
  if (!/^\d+\.\d+\.\d+(?:\.\d+)?$/.test(String(r.testedVersion || ''))) errors.push('tested-version');
  if (!r.subject || !exactKeys(r.subject, ['rpf', 'contractFingerprint'])) errors.push('subject-shape');
  if (!validDigest(r.subject?.rpf)) errors.push('subject-rpf');
  if (!validDigest(r.subject?.contractFingerprint)) errors.push('subject-contract');
  if (r.kind === 'release-decision') {
    if (!DECISION_OUTCOMES.has(r.outcome)) errors.push('outcome');
  } else if (!PHYSICAL_OUTCOMES.has(r.outcome)) {
    errors.push('outcome');
  }
  errors.push(...validateProvenance(r));
  const summary = String(r.durableSummary || '');
  const summaryBytes = Buffer.byteLength(summary, 'utf8');
  if (!summary || summaryBytes > MAX_SUMMARY_BYTES || SECRETISH.test(summary)) errors.push('summary');
  if (!validDigest(r.durableSummaryDigest)) errors.push('summary-digest');
  if (r.durableSummaryDigest !== sha256Text(summary)) errors.push('summary-digest-mismatch');
  if (!Array.isArray(r.evidenceRefs) || r.evidenceRefs.length > MAX_REFS) {
    errors.push('evidence-refs');
  } else {
    for (const ref of r.evidenceRefs) {
      if (!safeText(ref)) errors.push('evidence-ref');
    }
  }
  return [...new Set(errors)];
}

function validateNamespace(receipts) {
  const errors = [];
  const ids = new Set();
  const seqByKey = new Map();
  for (const r of receipts) {
    const receiptErrors = validateReceipt(r);
    if (receiptErrors.length) {
      errors.push({ reason: 'RECEIPT_NAMESPACE_INVALID', receiptId: r?.receiptId || '<invalid>', errors: receiptErrors });
      continue;
    }
    if (ids.has(r.receiptId)) {
      errors.push({ reason: 'RECEIPT_ID_DUPLICATE', receiptId: r.receiptId });
    }
    ids.add(r.receiptId);
    const key = keyOfReceipt(r);
    if (!seqByKey.has(key)) seqByKey.set(key, new Set());
    const seqs = seqByKey.get(key);
    if (seqs.has(r.attemptSeq)) {
      errors.push({ reason: 'RECEIPT_ATTEMPT_DUPLICATE', receiptId: r.receiptId, key, attemptSeq: r.attemptSeq });
    }
    seqs.add(r.attemptSeq);
  }
  return errors;
}

function receiptMatchesTestedAdmission(r, a) {
  if (validateAdmission(a).length) return { ok: false, reason: 'TESTED_SOURCE_GENERATION_NOT_ADMITTED' };
  if (a.candidateSha !== r.testedSourceSha) return { ok: false, reason: 'TESTED_SOURCE_GENERATION_NOT_ADMITTED' };
  if (a.identities.rpf !== r.subject.rpf) return { ok: false, reason: 'TESTED_SOURCE_IDENTITY_MISMATCH' };
  if (expectedContract(a.identities, r.kind) !== r.subject.contractFingerprint) {
    return { ok: false, reason: 'TESTED_SOURCE_IDENTITY_MISMATCH' };
  }
  return { ok: true };
}

function terminalPass(kind, outcome) {
  return kind === 'release-decision' ? outcome === 'approved' : outcome === 'pass';
}

function settle({ candidateSha, candidateAdmission, receipts, admissionBySha, isAncestor }) {
  const baseResult = {
    schema: SETTLEMENT_SCHEMA,
    candidateSha,
    candidateGenerationState: 'blocked',
    identities: null,
    slots: {},
    allRequiredSlotsPass: false,
  };
  if (!validSha(candidateSha) || validateAdmission(candidateAdmission).length || candidateAdmission.candidateSha !== candidateSha) {
    return { ...baseResult, reason: 'CANDIDATE_GENERATION_NOT_ADMITTED' };
  }
  baseResult.candidateGenerationState = 'pass';
  baseResult.identities = {
    rpf: candidateAdmission.identities.rpf,
    qcf: clone(candidateAdmission.identities.qcf),
    rcf: candidateAdmission.identities.rcf,
  };

  const nsErrors = validateNamespace(receipts);
  if (nsErrors.length) return { ...baseResult, reason: 'RECEIPT_NAMESPACE_INVALID', namespaceErrors: nsErrors };

  for (const kind of KINDS) {
    const currentKey = keyForCandidate(candidateAdmission, kind);
    const relevant = receipts.filter((r) => keyOfReceipt(r) === currentKey);
    if (!relevant.length) {
      baseResult.slots[kind] = { state: 'missing', reason: 'NO_CURRENT_RECEIPT' };
      continue;
    }

    const eligible = [];
    let blocker = null;
    for (const r of relevant) {
      const testedAdmission = admissionBySha.get(r.testedSourceSha);
      const match = receiptMatchesTestedAdmission(r, testedAdmission);
      if (!match.ok) {
        blocker = { state: 'blocked', reason: match.reason, receiptId: r.receiptId };
        break;
      }
      if (!isAncestor(r.testedSourceSha, candidateSha)) {
        blocker = { state: 'blocked', reason: 'TESTED_SOURCE_NOT_ANCESTOR', receiptId: r.receiptId };
        break;
      }
      eligible.push(r);
    }
    if (blocker) {
      baseResult.slots[kind] = blocker;
      continue;
    }
    eligible.sort((a, b) => a.attemptSeq - b.attemptSeq);
    const winner = eligible[eligible.length - 1];
    baseResult.slots[kind] = {
      state: terminalPass(kind, winner.outcome) ? 'pass' : 'blocked',
      reason: terminalPass(kind, winner.outcome) ? undefined : `LATEST_${String(winner.outcome).toUpperCase().replace(/-/g, '_')}`,
      receiptId: winner.receiptId,
      attemptSeq: winner.attemptSeq,
      testedSourceSha: winner.testedSourceSha,
      outcome: winner.outcome,
    };
  }
  baseResult.allRequiredSlotsPass = KINDS.every((kind) => baseResult.slots[kind]?.state === 'pass');
  return baseResult;
}

function validateAppendOnly(previousFiles, nextFiles) {
  const errors = [];
  for (const [name, bytes] of Object.entries(previousFiles)) {
    if (!(name in nextFiles)) errors.push(`deleted:${name}`);
    else if (nextFiles[name] !== bytes) errors.push(`modified:${name}`);
  }
  return errors;
}

function makeAncestry(edges) {
  const parents = new Map();
  for (const [parent, child] of edges) {
    if (!parents.has(child)) parents.set(child, []);
    parents.get(child).push(parent);
  }
  return (ancestor, descendant) => {
    if (ancestor === descendant) return true;
    const seen = new Set();
    const stack = [...(parents.get(descendant) || [])];
    while (stack.length) {
      const node = stack.pop();
      if (node === ancestor) return true;
      if (seen.has(node)) continue;
      seen.add(node);
      stack.push(...(parents.get(node) || []));
    }
    return false;
  };
}

const A = 'a'.repeat(40);
const B = 'b'.repeat(40);
const C = 'c'.repeat(40);
const D = 'd'.repeat(40);
const E = 'e'.repeat(40);
const isAncestor = makeAncestry([[A, B], [B, D], [A, C], [D, E]]);
const admissionA = makeAdmission(A);
const admissionB = makeAdmission(B);
const admissionC = makeAdmission(C);
const admissionD = makeAdmission(D);
const admissionE = makeAdmission(E);
const admissionBySha = new Map([[A, admissionA], [B, admissionB], [C, admissionC], [D, admissionD], [E, admissionE]]);

function baseReceipts(sourceSha = A) {
  return [
    makeReceipt({ receiptId: 'chrome-1', kind: 'unpacked-chrome', attemptSeq: 1, testedSourceSha: sourceSha, outcome: 'pass', evidenceRefs: ['github-actions:run/1001/job/2001'] }),
    makeReceipt({ receiptId: 'yandex-1', kind: 'yandex-e2e', attemptSeq: 1, testedSourceSha: sourceSha, outcome: 'pass', evidenceRefs: ['github-actions:run/1002/job/2002'] }),
    makeReceipt({ receiptId: 'review-1', kind: 'blocker-review', attemptSeq: 1, testedSourceSha: sourceSha, outcome: 'pass', evidenceRefs: ['canonical:review/1'] }),
    makeReceipt({ receiptId: 'decision-1', kind: 'release-decision', attemptSeq: 1, testedSourceSha: sourceSha, outcome: 'approved', evidenceRefs: ['canonical:decision/1'] }),
  ];
}

// Canonical predecessor integration.
test('current S0-E protocol is exact', () => assert.strictEqual(s0e.kv.protocol, 'WEBCLIP_RELEASE_IDENTITY_V1'));
test('current S0-E package count is 34', () => assert.strictEqual(s0e.kv.package_files, '34'));
test('current S0-E package identity is complete', () => assert.strictEqual(s0e.kv.current_package_complete, 'true'));
test('legacy S0-E package control remains 33', () => assert.strictEqual(s0e.kv.legacy_package_files, '33'));
test('legacy S0-E RPF remains reproducible control', () => assert.strictEqual(s0e.kv.legacy_rpf, 'sha256:958ce7c8f59c0c0f43c79a50483e91460e26a0ae4022d95f3a33c8afda6baf6e'));
test('current S0-E RPF is valid and distinct from legacy', () => {
  assert(validDigest(currentIds.rpf));
  assert.notStrictEqual(currentIds.rpf, s0e.kv.legacy_rpf);
});
test('current Chrome QCF exact', () => assert.strictEqual(currentIds.qcf['unpacked-chrome'], 'sha256:3715a3453333d3d679a1c1c00a0bab6a02b77c0153f1a4e8d138aa1e8f5a984c'));
test('current Yandex QCF exact', () => assert.strictEqual(currentIds.qcf['yandex-e2e'], 'sha256:8d6c9711b4f71b8485b49a6ab68f90bcf62bc74155ae0959dbdc4718648879a1'));
test('current full RCF exact', () => assert.strictEqual(currentIds.rcf, 'sha256:ce915ba229eec8d61a5527e921e94cbf89bfd096438568af6b91e585bdca646c'));
test('current BCF exact', () => assert.strictEqual(currentIds.bcf, 'sha256:9eebcc834fa32bd8fe5f03ef14564f0fc1c169d0308dcc2813941b4f913363ff'));
test('current S0-F generation gate passes after generator RCF binding', () => assert.strictEqual(s0f.kv.current_gate, 'pass'));
test('current S0-F RPF agrees with S0-E', () => assert.strictEqual(s0f.kv.rpf, currentIds.rpf));
test('current S0-F has no CGF axis', () => assert.strictEqual(s0f.kv.no_cgf, 'true'));
test('current head is exact git SHA', () => assert(validSha(currentHead)));

test('real current admitted candidate is evidence-missing without current receipts', () => {
  const currentAdmission = makeAdmission(currentHead);
  const out = settle({
    candidateSha: currentHead,
    candidateAdmission: currentAdmission,
    receipts: [],
    admissionBySha: new Map([[currentHead, currentAdmission]]),
    isAncestor: (x, y) => x === y,
  });
  assert.strictEqual(out.candidateGenerationState, 'pass');
  assert.strictEqual(out.allRequiredSlotsPass, false);
  for (const kind of KINDS) {
    assert.strictEqual(out.slots[kind].state, 'missing');
    assert.strictEqual(out.slots[kind].reason, 'NO_CURRENT_RECEIPT');
  }
});

// Admission validation matrix.
for (const [name, mutate, expected] of [
  ['bad schema', (a) => { a.schema = 'future'; }, 'admission-schema'],
  ['bad SHA', (a) => { a.candidateSha = 'nope'; }, 'admission-sha'],
  ['non-pass state', (a) => { a.generationState = 'blocked'; }, 'admission-state'],
  ['bad RPF', (a) => { a.identities.rpf = 'sha256:nope'; }, 'admission-rpf'],
  ['bad Chrome QCF', (a) => { a.identities.qcf['unpacked-chrome'] = ''; }, 'admission-chrome-qcf'],
  ['bad Yandex QCF', (a) => { a.identities.qcf['yandex-e2e'] = ''; }, 'admission-yandex-qcf'],
  ['bad RCF', (a) => { a.identities.rcf = ''; }, 'admission-rcf'],
  ['bad BCF', (a) => { a.identities.bcf = ''; }, 'admission-bcf'],
]) {
  test(`admission rejects ${name}`, () => {
    const a = clone(admissionA);
    mutate(a);
    assert(validateAdmission(a).includes(expected));
  });
}

// Receipt schema/shape matrix.
const validChrome = makeReceipt({ receiptId: 'schema-chrome', kind: 'unpacked-chrome', attemptSeq: 1, testedSourceSha: A, outcome: 'pass' });
test('valid Chrome v2 receipt accepted', () => assert.deepStrictEqual(validateReceipt(validChrome), []));
test('self-declared admitted field is not part of v2 schema', () => {
  const r = { ...validChrome, admitted: true };
  assert(validateReceipt(r).includes('receipt-shape'));
});
test('old research schema is not v2 receipt', () => {
  const r = { ...validChrome, schema: 'webclip-release-evidence/v2-research-model' };
  assert(validateReceipt(r).includes('schema'));
});
test('old conceptual v1 is not v2 receipt', () => {
  const r = { ...validChrome, schema: 'webclip-release-evidence/v1' };
  assert(validateReceipt(r).includes('schema'));
});
test('historical prose is not receipt object', () => assert(validateReceipt('TEST_EVIDENCE row').includes('receipt-object')));

for (const [name, mutate, expected] of [
  ['bad id empty', (r) => { r.receiptId = ''; }, 'receipt-id'],
  ['bad id slash', (r) => { r.receiptId = 'x/y'; }, 'receipt-id'],
  ['unknown kind', (r) => { r.kind = 'browser'; }, 'kind'],
  ['zero attempt', (r) => { r.attemptSeq = 0; }, 'attempt-seq'],
  ['negative attempt', (r) => { r.attemptSeq = -1; }, 'attempt-seq'],
  ['oversized attempt', (r) => { r.attemptSeq = MAX_ATTEMPT + 1; }, 'attempt-seq'],
  ['non-integer attempt', (r) => { r.attemptSeq = 1.5; }, 'attempt-seq'],
  ['bad tested SHA', (r) => { r.testedSourceSha = 'bad'; }, 'tested-source-sha'],
  ['bad version', (r) => { r.testedVersion = 'v0.9.9'; }, 'tested-version'],
  ['bad subject RPF', (r) => { r.subject.rpf = 'bad'; }, 'subject-rpf'],
  ['bad subject contract', (r) => { r.subject.contractFingerprint = 'bad'; }, 'subject-contract'],
  ['extra subject field', (r) => { r.subject.extra = 'x'; }, 'subject-shape'],
  ['bad physical outcome', (r) => { r.outcome = 'approved'; }, 'outcome'],
  ['summary empty', (r) => { r.durableSummary = ''; r.durableSummaryDigest = sha256Text(''); }, 'summary'],
  ['summary digest malformed', (r) => { r.durableSummaryDigest = 'bad'; }, 'summary-digest'],
  ['summary digest mismatch', (r) => { r.durableSummaryDigest = sha256Text('other'); }, 'summary-digest-mismatch'],
  ['refs non-array', (r) => { r.evidenceRefs = 'x'; }, 'evidence-refs'],
]) {
  test(`receipt rejects ${name}`, () => {
    const r = clone(validChrome);
    mutate(r);
    assert(validateReceipt(r).includes(expected));
  });
}

test('decision accepts approved', () => {
  const r = makeReceipt({ receiptId: 'decision-approved', kind: 'release-decision', attemptSeq: 1, testedSourceSha: A, outcome: 'approved' });
  assert.deepStrictEqual(validateReceipt(r), []);
});
test('decision accepts rejected', () => {
  const r = makeReceipt({ receiptId: 'decision-rejected', kind: 'release-decision', attemptSeq: 1, testedSourceSha: A, outcome: 'rejected' });
  assert.deepStrictEqual(validateReceipt(r), []);
});
test('decision accepts invalidated', () => {
  const r = makeReceipt({ receiptId: 'decision-invalidated', kind: 'release-decision', attemptSeq: 1, testedSourceSha: A, outcome: 'invalidated' });
  assert.deepStrictEqual(validateReceipt(r), []);
});
test('decision rejects pass outcome', () => {
  const r = makeReceipt({ receiptId: 'decision-pass', kind: 'release-decision', attemptSeq: 1, testedSourceSha: A, outcome: 'pass' });
  assert(validateReceipt(r).includes('outcome'));
});

for (const outcome of ['pass', 'fail', 'inconclusive', 'invalidated']) {
  test(`physical/review domain accepts ${outcome}`, () => {
    const r = makeReceipt({ receiptId: `review-${outcome}`, kind: 'blocker-review', attemptSeq: 1, testedSourceSha: A, outcome });
    assert.deepStrictEqual(validateReceipt(r), []);
  });
}

// Summary and secret/capability boundaries.
test('4096-byte summary accepted', () => {
  const summary = 'x'.repeat(4096);
  const r = makeReceipt({ receiptId: 'summary-4096', kind: 'unpacked-chrome', attemptSeq: 1, testedSourceSha: A, outcome: 'pass', durableSummary: summary });
  assert.deepStrictEqual(validateReceipt(r), []);
});
test('4097-byte summary rejected', () => {
  const summary = 'x'.repeat(4097);
  const r = makeReceipt({ receiptId: 'summary-4097', kind: 'unpacked-chrome', attemptSeq: 1, testedSourceSha: A, outcome: 'pass', durableSummary: summary });
  assert(validateReceipt(r).includes('summary'));
});
test('UTF-8 byte bound uses bytes not JS chars', () => {
  const summary = 'Ж'.repeat(2050);
  assert(Buffer.byteLength(summary, 'utf8') > 4096);
  const r = makeReceipt({ receiptId: 'summary-utf8', kind: 'unpacked-chrome', attemptSeq: 1, testedSourceSha: A, outcome: 'pass', durableSummary: summary });
  assert(validateReceipt(r).includes('summary'));
});

for (const secret of [
  'Authorization: Bearer abc',
  'Bearer supersecret',
  'access_token=abc',
  'refresh_token=abc',
  'github_token=abc',
  'ghp_abcdefghijklmnopqrstuvwxyz',
  'https://downloader.disk.yandex.net/disk/file?uid=1&token=abc',
]) {
  test(`secret-like summary rejected: ${secret.slice(0, 18)}`, () => {
    const r = makeReceipt({ receiptId: `secret-${cases}`, kind: 'unpacked-chrome', attemptSeq: 1, testedSourceSha: A, outcome: 'pass', durableSummary: secret });
    assert(validateReceipt(r).includes('summary'));
  });
  test(`secret-like evidence ref rejected: ${secret.slice(0, 18)}`, () => {
    const r = makeReceipt({ receiptId: `secret-ref-${cases}`, kind: 'unpacked-chrome', attemptSeq: 1, testedSourceSha: A, outcome: 'pass', evidenceRefs: [secret] });
    assert(validateReceipt(r).includes('evidence-ref'));
  });
}

test('bounded ordinary GitHub evidence ref accepted', () => {
  const r = makeReceipt({ receiptId: 'safe-ref', kind: 'unpacked-chrome', attemptSeq: 1, testedSourceSha: A, outcome: 'pass', evidenceRefs: ['github-actions:run/123/job/456/artifact/789'] });
  assert.deepStrictEqual(validateReceipt(r), []);
});
test('too many refs rejected', () => {
  const r = makeReceipt({ receiptId: 'many-refs', kind: 'unpacked-chrome', attemptSeq: 1, testedSourceSha: A, outcome: 'pass', evidenceRefs: Array.from({ length: 9 }, (_, i) => `ref:${i}`) });
  assert(validateReceipt(r).includes('evidence-refs'));
});
test('oversized ref rejected', () => {
  const r = makeReceipt({ receiptId: 'long-ref', kind: 'unpacked-chrome', attemptSeq: 1, testedSourceSha: A, outcome: 'pass', evidenceRefs: ['x'.repeat(513)] });
  assert(validateReceipt(r).includes('evidence-ref'));
});

// Provenance boundaries.
test('physical provenance permits synthetic merge execution SHA distinct from tested source', () => {
  const mergeSha = 'f'.repeat(40);
  const r = makeReceipt({
    receiptId: 'pr-merge-provenance', kind: 'unpacked-chrome', attemptSeq: 1, testedSourceSha: A, outcome: 'pass',
    provenance: physicalProvenance(A, { executionSha: mergeSha })
  });
  assert.deepStrictEqual(validateReceipt(r), []);
  assert.notStrictEqual(r.provenance.executionSha, r.testedSourceSha);
});
test('execution SHA does not retarget tested source', () => {
  const mergeSha = 'f'.repeat(40);
  const r = makeReceipt({
    receiptId: 'execution-not-source', kind: 'unpacked-chrome', attemptSeq: 1, testedSourceSha: A, outcome: 'pass',
    provenance: physicalProvenance(A, { executionSha: mergeSha })
  });
  assert.strictEqual(r.testedSourceSha, A);
  assert.strictEqual(r.provenance.executionSha, mergeSha);
});
test('physical provenance rejects wrong repository', () => {
  const r = clone(validChrome); r.provenance.repository = 'someone/else';
  assert(validateReceipt(r).includes('provenance-repository'));
});
test('physical provenance rejects missing run id', () => {
  const r = clone(validChrome); r.provenance.runId = 0;
  assert(validateReceipt(r).includes('provenance-run-id'));
});
test('physical provenance rejects bad workflow SHA', () => {
  const r = clone(validChrome); r.provenance.workflowSha = 'bad';
  assert(validateReceipt(r).includes('provenance-workflow-sha'));
});
test('physical provenance rejects secret field content', () => {
  const r = clone(validChrome); r.provenance.workflowPath = '.github/workflows/token=secret.yml';
  assert(validateReceipt(r).includes('provenance-secret'));
});
test('review uses canonical-project provenance', () => {
  const r = makeReceipt({ receiptId: 'review-provenance', kind: 'blocker-review', attemptSeq: 1, testedSourceSha: A, outcome: 'pass' });
  assert.strictEqual(r.provenance.kind, 'canonical-project');
  assert.deepStrictEqual(validateReceipt(r), []);
});
test('decision cannot masquerade github-actions provenance under v2 research contract', () => {
  const r = makeReceipt({ receiptId: 'decision-wrong-prov', kind: 'release-decision', attemptSeq: 1, testedSourceSha: A, outcome: 'approved', provenance: physicalProvenance(A) });
  assert(validateReceipt(r).includes('provenance-shape') || validateReceipt(r).includes('provenance-kind'));
});

// Namespace uniqueness and append-only properties.
test('base receipt namespace valid', () => assert.deepStrictEqual(validateNamespace(baseReceipts()), []));
test('duplicate receipt id blocks namespace', () => {
  const receipts = baseReceipts();
  receipts.push({ ...clone(receipts[0]), kind: 'yandex-e2e', subject: clone(receipts[1].subject), attemptSeq: 2 });
  assert(validateNamespace(receipts).some((e) => e.reason === 'RECEIPT_ID_DUPLICATE'));
});
test('duplicate attempt in same key blocks namespace', () => {
  const receipts = baseReceipts();
  receipts.push(makeReceipt({ receiptId: 'chrome-dup-seq', kind: 'unpacked-chrome', attemptSeq: 1, testedSourceSha: B, outcome: 'fail' }));
  assert(validateNamespace(receipts).some((e) => e.reason === 'RECEIPT_ATTEMPT_DUPLICATE'));
});
test('same attempt sequence in different kind allowed', () => {
  const receipts = [
    makeReceipt({ receiptId: 'same-seq-c', kind: 'unpacked-chrome', attemptSeq: 7, testedSourceSha: A, outcome: 'pass' }),
    makeReceipt({ receiptId: 'same-seq-y', kind: 'yandex-e2e', attemptSeq: 7, testedSourceSha: A, outcome: 'pass' }),
  ];
  assert.deepStrictEqual(validateNamespace(receipts), []);
});
test('same attempt sequence in changed Chrome QCF key allowed', () => {
  const changedIds = clone(currentIds); changedIds.qcf['unpacked-chrome'] = `sha256:${'1'.repeat(64)}`;
  const receipts = [
    makeReceipt({ receiptId: 'old-key-seq', kind: 'unpacked-chrome', attemptSeq: 1, testedSourceSha: A, outcome: 'pass' }),
    makeReceipt({ receiptId: 'new-key-seq', kind: 'unpacked-chrome', attemptSeq: 1, testedSourceSha: B, identities: changedIds, outcome: 'pass' }),
  ];
  assert.deepStrictEqual(validateNamespace(receipts), []);
});
test('malformed canonical receipt blocks settlement namespace', () => {
  const receipts = baseReceipts();
  receipts.push({ schema: RECEIPT_SCHEMA, receiptId: 'malformed' });
  const out = settle({ candidateSha: B, candidateAdmission: admissionB, receipts, admissionBySha, isAncestor });
  assert.strictEqual(out.reason, 'RECEIPT_NAMESPACE_INVALID');
});

test('append-only allows new receipt file', () => {
  const before = { 'r1.json': '{"a":1}' };
  const after = { ...before, 'r2.json': '{"b":2}' };
  assert.deepStrictEqual(validateAppendOnly(before, after), []);
});
test('append-only rejects receipt modification', () => {
  const before = { 'r1.json': '{"a":1}' };
  const after = { 'r1.json': '{"a":2}' };
  assert.deepStrictEqual(validateAppendOnly(before, after), ['modified:r1.json']);
});
test('append-only rejects receipt deletion', () => {
  const before = { 'r1.json': '{"a":1}' };
  const after = {};
  assert.deepStrictEqual(validateAppendOnly(before, after), ['deleted:r1.json']);
});

// Positive settlement and ancestry reuse.
test('synthetic future candidate settles all four slots from admitted ancestor', () => {
  const out = settle({ candidateSha: B, candidateAdmission: admissionB, receipts: baseReceipts(A), admissionBySha, isAncestor });
  assert.strictEqual(out.schema, SETTLEMENT_SCHEMA);
  assert.strictEqual(out.candidateGenerationState, 'pass');
  assert.strictEqual(out.allRequiredSlotsPass, true);
  for (const kind of KINDS) assert.strictEqual(out.slots[kind].state, 'pass');
});
test('exact same tested/current source settles', () => {
  const out = settle({ candidateSha: A, candidateAdmission: admissionA, receipts: baseReceipts(A), admissionBySha, isAncestor });
  assert.strictEqual(out.allRequiredSlotsPass, true);
});
test('two-hop docs descendant can reuse ancestor evidence', () => {
  const out = settle({ candidateSha: D, candidateAdmission: admissionD, receipts: baseReceipts(A), admissionBySha, isAncestor });
  assert.strictEqual(out.allRequiredSlotsPass, true);
});
test('three-hop descendant can reuse ancestor evidence', () => {
  const out = settle({ candidateSha: E, candidateAdmission: admissionE, receipts: baseReceipts(A), admissionBySha, isAncestor });
  assert.strictEqual(out.allRequiredSlotsPass, true);
});
test('same identity side branch cannot authorize candidate', () => {
  const out = settle({ candidateSha: B, candidateAdmission: admissionB, receipts: baseReceipts(C), admissionBySha, isAncestor });
  assert.strictEqual(out.allRequiredSlotsPass, false);
  assert.strictEqual(out.slots['unpacked-chrome'].reason, 'TESTED_SOURCE_NOT_ANCESTOR');
});

// Tested-source S0-F admission is mandatory.
test('missing tested-source admission blocks matching receipt', () => {
  const map = new Map(admissionBySha); map.delete(A);
  const out = settle({ candidateSha: B, candidateAdmission: admissionB, receipts: baseReceipts(A), admissionBySha: map, isAncestor });
  assert.strictEqual(out.slots['unpacked-chrome'].reason, 'TESTED_SOURCE_GENERATION_NOT_ADMITTED');
});
test('blocked tested-source admission blocks matching receipt', () => {
  const map = new Map(admissionBySha); map.set(A, makeAdmission(A, { generationState: 'blocked' }));
  const out = settle({ candidateSha: B, candidateAdmission: admissionB, receipts: baseReceipts(A), admissionBySha: map, isAncestor });
  assert.strictEqual(out.slots['unpacked-chrome'].reason, 'TESTED_SOURCE_GENERATION_NOT_ADMITTED');
});
test('tested-source admission SHA mismatch blocks', () => {
  const map = new Map(admissionBySha); map.set(A, makeAdmission(C));
  const out = settle({ candidateSha: B, candidateAdmission: admissionB, receipts: baseReceipts(A), admissionBySha: map, isAncestor });
  assert.strictEqual(out.slots['unpacked-chrome'].reason, 'TESTED_SOURCE_GENERATION_NOT_ADMITTED');
});
test('tested-source RPF mismatch blocks even if candidate matches receipt', () => {
  const bad = clone(admissionA); bad.identities.rpf = `sha256:${'2'.repeat(64)}`;
  const map = new Map(admissionBySha); map.set(A, bad);
  const out = settle({ candidateSha: B, candidateAdmission: admissionB, receipts: baseReceipts(A), admissionBySha: map, isAncestor });
  assert.strictEqual(out.slots['unpacked-chrome'].reason, 'TESTED_SOURCE_IDENTITY_MISMATCH');
});
test('tested-source QCF mismatch blocks physical receipt', () => {
  const bad = clone(admissionA); bad.identities.qcf['unpacked-chrome'] = `sha256:${'3'.repeat(64)}`;
  const map = new Map(admissionBySha); map.set(A, bad);
  const out = settle({ candidateSha: B, candidateAdmission: admissionB, receipts: baseReceipts(A), admissionBySha: map, isAncestor });
  assert.strictEqual(out.slots['unpacked-chrome'].reason, 'TESTED_SOURCE_IDENTITY_MISMATCH');
});
test('tested-source RCF mismatch blocks review', () => {
  const bad = clone(admissionA); bad.identities.rcf = `sha256:${'4'.repeat(64)}`;
  const map = new Map(admissionBySha); map.set(A, bad);
  const out = settle({ candidateSha: B, candidateAdmission: admissionB, receipts: baseReceipts(A), admissionBySha: map, isAncestor });
  assert.strictEqual(out.slots['blocker-review'].reason, 'TESTED_SOURCE_IDENTITY_MISMATCH');
});

// Current candidate S0-F admission is independently mandatory.
test('missing current candidate admission blocks before receipts', () => {
  const out = settle({ candidateSha: B, candidateAdmission: null, receipts: baseReceipts(A), admissionBySha, isAncestor });
  assert.strictEqual(out.reason, 'CANDIDATE_GENERATION_NOT_ADMITTED');
});
test('blocked current candidate admission blocks before receipts', () => {
  const out = settle({ candidateSha: B, candidateAdmission: makeAdmission(B, { generationState: 'blocked' }), receipts: baseReceipts(A), admissionBySha, isAncestor });
  assert.strictEqual(out.reason, 'CANDIDATE_GENERATION_NOT_ADMITTED');
});
test('current candidate admission SHA mismatch blocks', () => {
  const out = settle({ candidateSha: B, candidateAdmission: admissionA, receipts: baseReceipts(A), admissionBySha, isAncestor });
  assert.strictEqual(out.reason, 'CANDIDATE_GENERATION_NOT_ADMITTED');
});

// Latest-attempt settlement matrix for physical/review slots.
for (const kind of ['unpacked-chrome', 'yandex-e2e', 'blocker-review']) {
  for (const [laterOutcome, expectedState] of [
    ['fail', 'blocked'],
    ['inconclusive', 'blocked'],
    ['invalidated', 'blocked'],
    ['pass', 'pass'],
  ]) {
    test(`${kind} latest ${laterOutcome} controls earlier PASS`, () => {
      const receipts = baseReceipts(A).filter((r) => r.kind !== kind);
      receipts.push(makeReceipt({ receiptId: `${kind}-old-pass`, kind, attemptSeq: 1, testedSourceSha: A, outcome: 'pass' }));
      receipts.push(makeReceipt({ receiptId: `${kind}-later-${laterOutcome}`, kind, attemptSeq: 2, testedSourceSha: B, outcome: laterOutcome }));
      const out = settle({ candidateSha: D, candidateAdmission: admissionD, receipts, admissionBySha, isAncestor });
      assert.strictEqual(out.slots[kind].state, expectedState);
      assert.strictEqual(out.slots[kind].attemptSeq, 2);
    });
  }
}

test('later descendant PASS recovers after ancestor FAIL', () => {
  const receipts = baseReceipts(A).filter((r) => r.kind !== 'unpacked-chrome');
  receipts.push(makeReceipt({ receiptId: 'chrome-pass-1', kind: 'unpacked-chrome', attemptSeq: 1, testedSourceSha: A, outcome: 'pass' }));
  receipts.push(makeReceipt({ receiptId: 'chrome-fail-2', kind: 'unpacked-chrome', attemptSeq: 2, testedSourceSha: B, outcome: 'fail' }));
  receipts.push(makeReceipt({ receiptId: 'chrome-pass-3', kind: 'unpacked-chrome', attemptSeq: 3, testedSourceSha: D, outcome: 'pass' }));
  const out = settle({ candidateSha: E, candidateAdmission: admissionE, receipts, admissionBySha, isAncestor });
  assert.strictEqual(out.slots['unpacked-chrome'].state, 'pass');
  assert.strictEqual(out.slots['unpacked-chrome'].attemptSeq, 3);
});

for (const [laterOutcome, expectedState] of [
  ['rejected', 'blocked'],
  ['invalidated', 'blocked'],
  ['approved', 'pass'],
]) {
  test(`release decision latest ${laterOutcome} controls earlier approval`, () => {
    const receipts = baseReceipts(A).filter((r) => r.kind !== 'release-decision');
    receipts.push(makeReceipt({ receiptId: 'decision-old-approved', kind: 'release-decision', attemptSeq: 1, testedSourceSha: A, outcome: 'approved' }));
    receipts.push(makeReceipt({ receiptId: `decision-later-${laterOutcome}`, kind: 'release-decision', attemptSeq: 2, testedSourceSha: B, outcome: laterOutcome }));
    const out = settle({ candidateSha: D, candidateAdmission: admissionD, receipts, admissionBySha, isAncestor });
    assert.strictEqual(out.slots['release-decision'].state, expectedState);
    assert.strictEqual(out.slots['release-decision'].attemptSeq, 2);
  });
}

test('later approved decision recovers after rejected', () => {
  const receipts = baseReceipts(A).filter((r) => r.kind !== 'release-decision');
  receipts.push(makeReceipt({ receiptId: 'decision-a1', kind: 'release-decision', attemptSeq: 1, testedSourceSha: A, outcome: 'approved' }));
  receipts.push(makeReceipt({ receiptId: 'decision-r2', kind: 'release-decision', attemptSeq: 2, testedSourceSha: B, outcome: 'rejected' }));
  receipts.push(makeReceipt({ receiptId: 'decision-a3', kind: 'release-decision', attemptSeq: 3, testedSourceSha: D, outcome: 'approved' }));
  const out = settle({ candidateSha: E, candidateAdmission: admissionE, receipts, admissionBySha, isAncestor });
  assert.strictEqual(out.slots['release-decision'].state, 'pass');
  assert.strictEqual(out.slots['release-decision'].attemptSeq, 3);
});

// Identity projection independence.
test('Chrome QCF change invalidates Chrome receipt but preserves Yandex generation', () => {
  const changedIds = clone(currentIds); changedIds.qcf['unpacked-chrome'] = `sha256:${'5'.repeat(64)}`;
  const changedAdmission = makeAdmission(B, { identities: changedIds });
  const out = settle({ candidateSha: B, candidateAdmission: changedAdmission, receipts: baseReceipts(A), admissionBySha, isAncestor });
  assert.strictEqual(out.slots['unpacked-chrome'].state, 'missing');
  assert.strictEqual(out.slots['yandex-e2e'].state, 'pass');
});
test('Yandex QCF change invalidates Yandex receipt but preserves Chrome generation', () => {
  const changedIds = clone(currentIds); changedIds.qcf['yandex-e2e'] = `sha256:${'6'.repeat(64)}`;
  const changedAdmission = makeAdmission(B, { identities: changedIds });
  const out = settle({ candidateSha: B, candidateAdmission: changedAdmission, receipts: baseReceipts(A), admissionBySha, isAncestor });
  assert.strictEqual(out.slots['unpacked-chrome'].state, 'pass');
  assert.strictEqual(out.slots['yandex-e2e'].state, 'missing');
});
test('full RCF-only change preserves physical QA but invalidates review/decision', () => {
  const changedIds = clone(currentIds); changedIds.rcf = `sha256:${'7'.repeat(64)}`;
  const changedAdmission = makeAdmission(B, { identities: changedIds });
  const out = settle({ candidateSha: B, candidateAdmission: changedAdmission, receipts: baseReceipts(A), admissionBySha, isAncestor });
  assert.strictEqual(out.slots['unpacked-chrome'].state, 'pass');
  assert.strictEqual(out.slots['yandex-e2e'].state, 'pass');
  assert.strictEqual(out.slots['blocker-review'].state, 'missing');
  assert.strictEqual(out.slots['release-decision'].state, 'missing');
});
test('RPF change invalidates every old slot', () => {
  const changedIds = clone(currentIds); changedIds.rpf = `sha256:${'8'.repeat(64)}`;
  const changedAdmission = makeAdmission(B, { identities: changedIds });
  const out = settle({ candidateSha: B, candidateAdmission: changedAdmission, receipts: baseReceipts(A), admissionBySha, isAncestor });
  for (const kind of KINDS) assert.strictEqual(out.slots[kind].state, 'missing');
});
test('BCF alone is not a direct S0-G evidence key', () => {
  const changedIds = clone(currentIds); changedIds.bcf = `sha256:${'9'.repeat(64)}`;
  const changedAdmission = makeAdmission(B, { identities: changedIds });
  const out = settle({ candidateSha: B, candidateAdmission: changedAdmission, receipts: baseReceipts(A), admissionBySha, isAncestor });
  assert.strictEqual(out.allRequiredSlotsPass, true);
});
test('receipt cannot add BCF as extra subject authority', () => {
  const r = clone(validChrome); r.subject.bcf = currentIds.bcf;
  assert(validateReceipt(r).includes('subject-shape'));
});

// Provenance identities never substitute for subject identities.
test('same run/job cannot rescue wrong RPF', () => {
  const wrong = makeReceipt({ receiptId: 'wrong-rpf-same-run', kind: 'unpacked-chrome', attemptSeq: 1, testedSourceSha: A, outcome: 'pass', subject: { rpf: `sha256:${'a'.repeat(64)}`, contractFingerprint: currentIds.qcf['unpacked-chrome'] } });
  const out = settle({ candidateSha: B, candidateAdmission: admissionB, receipts: [wrong], admissionBySha, isAncestor });
  assert.strictEqual(out.slots['unpacked-chrome'].state, 'missing');
});
test('same workflow SHA cannot rescue wrong QCF', () => {
  const wrong = makeReceipt({ receiptId: 'wrong-qcf-same-workflow', kind: 'unpacked-chrome', attemptSeq: 1, testedSourceSha: A, outcome: 'pass', subject: { rpf: currentIds.rpf, contractFingerprint: `sha256:${'b'.repeat(64)}` } });
  const out = settle({ candidateSha: B, candidateAdmission: admissionB, receipts: [wrong], admissionBySha, isAncestor });
  assert.strictEqual(out.slots['unpacked-chrome'].state, 'missing');
});

// Result is evidence truth only, never readiness policy.
test('settlement result has no readiness status field', () => {
  const out = settle({ candidateSha: B, candidateAdmission: admissionB, receipts: baseReceipts(A), admissionBySha, isAncestor });
  assert.strictEqual(Object.prototype.hasOwnProperty.call(out, 'releaseReadiness'), false);
  assert.strictEqual(Object.prototype.hasOwnProperty.call(out, 'approvedForRelease'), false);
});
test('settlement result is exact candidate bound', () => {
  const out = settle({ candidateSha: D, candidateAdmission: admissionD, receipts: baseReceipts(A), admissionBySha, isAncestor });
  assert.strictEqual(out.candidateSha, D);
});
test('settlement result carries only RPF/QCF/RCF evidence identities', () => {
  const out = settle({ candidateSha: B, candidateAdmission: admissionB, receipts: baseReceipts(A), admissionBySha, isAncestor });
  assert.strictEqual(Object.prototype.hasOwnProperty.call(out.identities, 'bcf'), false);
});

console.log(
  `P1-231 S0-G evidence-settlement engine source-spec model: PASS; cases=${cases}; ` +
  `schema=${RECEIPT_SCHEMA}; current_gate=${s0f.kv.current_gate}; current_real_settlement=evidence-missing; ` +
  `synthetic_all_pass=true; tested_source_admission=required; ancestry=required; append_only=true; ` +
  `rpf=${currentIds.rpf}; chrome_qcf=${currentIds.qcf['unpacked-chrome']}; ` +
  `yandex_qcf=${currentIds.qcf['yandex-e2e']}; rcf=${currentIds.rcf}; head=${currentHead}`
);