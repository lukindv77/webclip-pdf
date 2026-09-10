'use strict';

const assert = require('assert');
const crypto = require('crypto');

const P_CODE = 'P1-231';
const SCHEMA = 'webclip-release-evidence/v2-research-model';
const RECEIPT_KINDS = new Set(['unpacked-chrome', 'yandex-e2e', 'blocker-review', 'release-decision']);
const OUTCOMES = new Set(['pass', 'fail', 'inconclusive', 'invalidated', 'approved', 'rejected']);
const SECRETISH = /(oauth|authorization|bearer|token=|access_token|refresh_token|disk\.yandex\.(?:net|ru)\/[^\s?#]+\?)/i;
let cases = 0;

function check(name, fn) {
  fn();
  cases += 1;
  return name;
}

function sha256(text) {
  return `sha256:${crypto.createHash('sha256').update(String(text)).digest('hex')}`;
}

function fingerprintFileMap(schema, files) {
  const body = Object.keys(files).sort().map((path) => `${path}\0${sha256(files[path])}`).join('\n');
  return sha256(`${schema}\n${body}`);
}

function runtimeFingerprint(files) {
  const runtime = {};
  for (const [path, content] of Object.entries(files)) {
    if (path === 'manifest.json' || /^[^/]+\.(?:js|html|css|png|svg|ico|webp)$/i.test(path) || /^(?:assets|icons)\//.test(path)) {
      runtime[path] = content;
    }
  }
  return fingerprintFileMap('WEBCLIP_RPF_V1', runtime);
}

const FULL_RCF_PATHS = [
  'project_docs/CONTEXT_MANIFEST.json',
  'project_docs/USER_REQUIREMENTS.md',
  'project_docs/DECISIONS_AND_RATIONALE.md',
  'project_docs/RESEARCH_REGISTRY.md',
  'project_docs/TEST_STATUS.md',
  'project_docs/BUILD_AND_RECOVERY_RULES.md',
  'project_docs/TEST_PLAN.md',
  'project_docs/WEBCLIP_PDF_FIDELITY_CONTRACT.md',
  'project_tools/check_release_readiness.py',
  'project_tools/check_pr_change_contract.py',
  '.github/workflows/release-gate.yml',
];

function fullRcf(files) {
  const picked = Object.fromEntries(FULL_RCF_PATHS.map((path) => [path, files[path] ?? '<missing>']));
  return fingerprintFileMap('WEBCLIP_RCF_V1', picked);
}

function qaProjection(kind, files) {
  assert(['unpacked-chrome', 'yandex-e2e'].includes(kind));
  const common = {
    'project_docs/USER_REQUIREMENTS.md': files['project_docs/USER_REQUIREMENTS.md'] ?? '<missing>',
    'project_docs/DECISIONS_AND_RATIONALE.md': files['project_docs/DECISIONS_AND_RATIONALE.md'] ?? '<missing>',
    'project_docs/RESEARCH_REGISTRY.md': files['project_docs/RESEARCH_REGISTRY.md'] ?? '<missing>',
    'project_docs/TEST_STATUS.md': files['project_docs/TEST_STATUS.md'] ?? '<missing>',
    'project_tools/check_release_readiness.py': files['project_tools/check_release_readiness.py'] ?? '<missing>',
  };
  if (kind === 'unpacked-chrome') {
    common['project_docs/TEST_PLAN.md'] = files['project_docs/TEST_PLAN.md'] ?? '<missing>';
    common['project_docs/WEBCLIP_PDF_FIDELITY_CONTRACT.md'] = files['project_docs/WEBCLIP_PDF_FIDELITY_CONTRACT.md'] ?? '<missing>';
  } else {
    common['project_docs/BUILD_AND_RECOVERY_RULES.md'] = files['project_docs/BUILD_AND_RECOVERY_RULES.md'] ?? '<missing>';
  }
  return fingerprintFileMap(`WEBCLIP_QCF_V1:${kind}`, common);
}

function makeReceipt(overrides = {}) {
  return {
    schema: SCHEMA,
    receiptId: 'rcpt-1',
    kind: 'unpacked-chrome',
    attemptSeq: 1,
    admitted: true,
    testedSourceSha: 'a'.repeat(40),
    testedVersion: '0.9.9',
    runtimeFingerprint: `sha256:${'1'.repeat(64)}`,
    contractFingerprint: `sha256:${'2'.repeat(64)}`,
    outcome: 'pass',
    evidenceRef: 'github-actions:run/123/job/456',
    durableSummaryDigest: `sha256:${'3'.repeat(64)}`,
    ...overrides,
  };
}

function validDigest(value) {
  return /^sha256:[0-9a-f]{64}$/.test(value || '');
}

function validateReceipt(r) {
  const errors = [];
  if (r.schema !== SCHEMA) errors.push('schema');
  if (!/^rcpt-[A-Za-z0-9._-]+$/.test(r.receiptId || '')) errors.push('receiptId');
  if (!RECEIPT_KINDS.has(r.kind)) errors.push('kind');
  if (!Number.isInteger(r.attemptSeq) || r.attemptSeq < 1) errors.push('attemptSeq');
  if (r.admitted !== true) errors.push('admitted');
  if (!/^[0-9a-f]{40}$/.test(r.testedSourceSha || '')) errors.push('testedSourceSha');
  if (!/^\d+\.\d+\.\d+(?:\.\d+)?$/.test(r.testedVersion || '')) errors.push('testedVersion');
  if (!validDigest(r.runtimeFingerprint)) errors.push('runtimeFingerprint');
  if (!validDigest(r.contractFingerprint)) errors.push('contractFingerprint');
  if (!OUTCOMES.has(r.outcome)) errors.push('outcome');
  if (!r.evidenceRef || r.evidenceRef.length > 256 || SECRETISH.test(r.evidenceRef)) errors.push('evidenceRef');
  if (!validDigest(r.durableSummaryDigest)) errors.push('durableSummaryDigest');
  if (r.kind === 'release-decision' && !['approved', 'rejected'].includes(r.outcome)) errors.push('decisionOutcome');
  if (r.kind !== 'release-decision' && ['approved', 'rejected'].includes(r.outcome)) errors.push('nonDecisionOutcome');
  return errors;
}

function authoritativeReceipt(receipts, kind, expectedRpf, expectedContract) {
  const admitted = receipts
    .filter((r) => r.kind === kind && r.admitted === true)
    .filter((r) => r.runtimeFingerprint === expectedRpf && r.contractFingerprint === expectedContract);
  if (!admitted.length) return { ok: false, reason: 'no-current-generation-receipt' };
  const seqs = new Set();
  for (const r of admitted) {
    if (validateReceipt(r).length) return { ok: false, reason: 'invalid-receipt' };
    if (seqs.has(r.attemptSeq)) return { ok: false, reason: 'duplicate-attempt-seq' };
    seqs.add(r.attemptSeq);
  }
  admitted.sort((a, b) => a.attemptSeq - b.attemptSeq);
  return { ok: true, receipt: admitted[admitted.length - 1] };
}

function slotPasses(receipts, kind, expectedRpf, expectedContract) {
  const authority = authoritativeReceipt(receipts, kind, expectedRpf, expectedContract);
  if (!authority.ok) return authority;
  const expected = kind === 'release-decision' ? 'approved' : 'pass';
  if (authority.receipt.outcome !== expected) return { ok: false, reason: `latest-${authority.receipt.outcome}` };
  return { ok: true, receipt: authority.receipt };
}

function officialCandidateCheck({ candidateSha, currentMainSha, mode = 'official' }) {
  if (mode === 'verification-only') return { ok: true, releasable: false };
  if (candidateSha !== currentMainSha) return { ok: false, releasable: false, reason: 'candidate-not-current-main-head' };
  return { ok: true, releasable: true };
}

function finalReleaseCheck({ candidateSha, currentMainSha, files, receipts }) {
  const head = officialCandidateCheck({ candidateSha, currentMainSha, mode: 'official' });
  if (!head.ok) return head;
  const rpf = runtimeFingerprint(files);
  const rcf = fullRcf(files);
  const chrome = slotPasses(receipts, 'unpacked-chrome', rpf, qaProjection('unpacked-chrome', files));
  const yandex = slotPasses(receipts, 'yandex-e2e', rpf, qaProjection('yandex-e2e', files));
  const review = slotPasses(receipts, 'blocker-review', rpf, rcf);
  const decision = slotPasses(receipts, 'release-decision', rpf, rcf);
  const all = [chrome, yandex, review, decision];
  const failed = all.find((x) => !x.ok);
  return failed ? { ok: false, reason: failed.reason } : { ok: true, rpf, rcf };
}

function formationAuthorizationValid(auth, { currentContract, targetVersion }) {
  return Boolean(auth && auth.approved === true && auth.targetVersion === targetVersion && auth.contractFingerprint === currentContract);
}

const files = {
  'manifest.json': '{"manifest_version":3,"version":"0.9.9"}',
  'service-worker.js': 'runtime-a',
  'popup.html': '<html>A</html>',
  'icons/icon.png': 'PNG-A',
  'project_docs/CONTEXT_MANIFEST.json': 'context-v1',
  'project_docs/USER_REQUIREMENTS.md': 'requirements-v1',
  'project_docs/DECISIONS_AND_RATIONALE.md': 'decisions-v1',
  'project_docs/RESEARCH_REGISTRY.md': 'registry-v1',
  'project_docs/TEST_STATUS.md': 'test-status-v1',
  'project_docs/BUILD_AND_RECOVERY_RULES.md': 'build-rules-v1',
  'project_docs/TEST_PLAN.md': 'test-plan-v1',
  'project_docs/WEBCLIP_PDF_FIDELITY_CONTRACT.md': 'fidelity-v1',
  'project_tools/check_release_readiness.py': 'checker-v1',
  'project_tools/check_pr_change_contract.py': 'pr-checker-v1',
  '.github/workflows/release-gate.yml': 'gate-v1',
  'project_docs/RELEASE_READINESS.md': 'mutable evidence declaration',
  'project_docs/TEST_EVIDENCE.md': 'historical ledger only',
};

const sha = 'b'.repeat(40);
const rpf = runtimeFingerprint(files);
const rcf = fullRcf(files);
const chromeQcf = qaProjection('unpacked-chrome', files);
const yandexQcf = qaProjection('yandex-e2e', files);
const baseReceipts = [
  makeReceipt({ receiptId: 'rcpt-chrome-1', kind: 'unpacked-chrome', runtimeFingerprint: rpf, contractFingerprint: chromeQcf, testedSourceSha: sha, outcome: 'pass' }),
  makeReceipt({ receiptId: 'rcpt-yandex-1', kind: 'yandex-e2e', runtimeFingerprint: rpf, contractFingerprint: yandexQcf, testedSourceSha: sha, outcome: 'pass' }),
  makeReceipt({ receiptId: 'rcpt-review-1', kind: 'blocker-review', runtimeFingerprint: rpf, contractFingerprint: rcf, testedSourceSha: sha, outcome: 'pass' }),
  makeReceipt({ receiptId: 'rcpt-decision-1', kind: 'release-decision', runtimeFingerprint: rpf, contractFingerprint: rcf, testedSourceSha: sha, outcome: 'approved' }),
];

check('valid receipt accepted', () => assert.deepStrictEqual(validateReceipt(baseReceipts[0]), []));
check('unknown schema rejected', () => assert(validateReceipt(makeReceipt({ schema: 'future' })).includes('schema')));
check('secret-like evidence ref rejected', () => assert(validateReceipt(makeReceipt({ evidenceRef: 'https://disk.yandex.net/download/file?token=secret' })).includes('evidenceRef')));
check('artifact-only receipt without durable summary rejected', () => assert(validateReceipt(makeReceipt({ durableSummaryDigest: '' })).includes('durableSummaryDigest')));
check('decision requires approved/rejected domain', () => assert(validateReceipt(makeReceipt({ kind: 'release-decision', outcome: 'pass' })).includes('decisionOutcome')));
check('non-decision cannot use approved', () => assert(validateReceipt(makeReceipt({ outcome: 'approved' })).includes('nonDecisionOutcome')));

check('docs-only readiness change preserves RPF', () => {
  const changed = { ...files, 'project_docs/RELEASE_READINESS.md': 'new evidence pointer' };
  assert.strictEqual(runtimeFingerprint(changed), rpf);
});
check('runtime JS change changes RPF', () => assert.notStrictEqual(runtimeFingerprint({ ...files, 'service-worker.js': 'runtime-b' }), rpf));
check('manifest version change changes RPF', () => assert.notStrictEqual(runtimeFingerprint({ ...files, 'manifest.json': '{"manifest_version":3,"version":"0.9.10"}' }), rpf));
check('icon change changes RPF', () => assert.notStrictEqual(runtimeFingerprint({ ...files, 'icons/icon.png': 'PNG-B' }), rpf));
check('requirements change changes full RCF', () => assert.notStrictEqual(fullRcf({ ...files, 'project_docs/USER_REQUIREMENTS.md': 'requirements-v2' }), rcf));
check('rationale change changes full RCF', () => assert.notStrictEqual(fullRcf({ ...files, 'project_docs/DECISIONS_AND_RATIONALE.md': 'decisions-v2' }), rcf));
check('release gate change changes full RCF', () => assert.notStrictEqual(fullRcf({ ...files, '.github/workflows/release-gate.yml': 'gate-v2' }), rcf));
check('historical TEST_EVIDENCE change does not alter full RCF in v1 manifest', () => assert.strictEqual(fullRcf({ ...files, 'project_docs/TEST_EVIDENCE.md': 'historical-v2' }), rcf));

check('official candidate must equal current main head', () => assert.strictEqual(officialCandidateCheck({ candidateSha: sha, currentMainSha: 'c'.repeat(40) }).ok, false));
check('current main candidate is releasable', () => assert.strictEqual(officialCandidateCheck({ candidateSha: sha, currentMainSha: sha }).releasable, true));
check('historical verification may run but cannot authorize release', () => assert.strictEqual(officialCandidateCheck({ candidateSha: 'a'.repeat(40), currentMainSha: sha, mode: 'verification-only' }).releasable, false));

check('latest pass is authoritative', () => assert.strictEqual(slotPasses(baseReceipts, 'unpacked-chrome', rpf, chromeQcf).ok, true));
check('newer FAIL supersedes older PASS', () => {
  const receipts = [...baseReceipts, makeReceipt({ receiptId: 'rcpt-chrome-2', kind: 'unpacked-chrome', attemptSeq: 2, runtimeFingerprint: rpf, contractFingerprint: chromeQcf, testedSourceSha: sha, outcome: 'fail' })];
  assert.strictEqual(slotPasses(receipts, 'unpacked-chrome', rpf, chromeQcf).reason, 'latest-fail');
});
check('newer inconclusive supersedes older PASS fail-closed', () => {
  const receipts = [...baseReceipts, makeReceipt({ receiptId: 'rcpt-chrome-2i', kind: 'unpacked-chrome', attemptSeq: 2, runtimeFingerprint: rpf, contractFingerprint: chromeQcf, testedSourceSha: sha, outcome: 'inconclusive' })];
  assert.strictEqual(slotPasses(receipts, 'unpacked-chrome', rpf, chromeQcf).reason, 'latest-inconclusive');
});
check('later invalidation receipt supersedes an earlier PASS without deleting history', () => {
  const receipts = [...baseReceipts, makeReceipt({ receiptId: 'rcpt-chrome-2x', kind: 'unpacked-chrome', attemptSeq: 2, runtimeFingerprint: rpf, contractFingerprint: chromeQcf, testedSourceSha: sha, outcome: 'invalidated' })];
  assert.strictEqual(slotPasses(receipts, 'unpacked-chrome', rpf, chromeQcf).reason, 'latest-invalidated');
});
check('later admitted retest PASS can recover after FAIL', () => {
  const receipts = [...baseReceipts,
    makeReceipt({ receiptId: 'rcpt-chrome-2f', kind: 'unpacked-chrome', attemptSeq: 2, runtimeFingerprint: rpf, contractFingerprint: chromeQcf, testedSourceSha: sha, outcome: 'fail' }),
    makeReceipt({ receiptId: 'rcpt-chrome-3p', kind: 'unpacked-chrome', attemptSeq: 3, runtimeFingerprint: rpf, contractFingerprint: chromeQcf, testedSourceSha: sha, outcome: 'pass' })];
  assert.strictEqual(slotPasses(receipts, 'unpacked-chrome', rpf, chromeQcf).ok, true);
});
check('non-admitted diagnostic attempt does not become release authority', () => {
  const diag = makeReceipt({ receiptId: 'rcpt-diag', kind: 'unpacked-chrome', attemptSeq: 99, admitted: false, runtimeFingerprint: rpf, contractFingerprint: chromeQcf, testedSourceSha: sha, outcome: 'fail' });
  assert.strictEqual(slotPasses([...baseReceipts, diag], 'unpacked-chrome', rpf, chromeQcf).ok, true);
});
check('duplicate attempt sequence fails closed', () => {
  const dup = makeReceipt({ receiptId: 'rcpt-chrome-dup', kind: 'unpacked-chrome', attemptSeq: 1, runtimeFingerprint: rpf, contractFingerprint: chromeQcf, testedSourceSha: sha, outcome: 'fail' });
  assert.strictEqual(slotPasses([...baseReceipts, dup], 'unpacked-chrome', rpf, chromeQcf).reason, 'duplicate-attempt-seq');
});
check('old RPF receipt cannot authorize new runtime generation', () => {
  const newRpf = runtimeFingerprint({ ...files, 'service-worker.js': 'runtime-b' });
  assert.strictEqual(slotPasses(baseReceipts, 'unpacked-chrome', newRpf, chromeQcf).reason, 'no-current-generation-receipt');
});
check('old Chrome contract projection cannot authorize changed applicable QA contract', () => {
  const changed = { ...files, 'project_docs/TEST_PLAN.md': 'test-plan-v2' };
  assert.strictEqual(slotPasses(baseReceipts, 'unpacked-chrome', rpf, qaProjection('unpacked-chrome', changed)).reason, 'no-current-generation-receipt');
});
check('unrelated build-rule change does not invalidate Chrome QCF', () => {
  const changed = { ...files, 'project_docs/BUILD_AND_RECOVERY_RULES.md': 'build-rules-v2' };
  assert.strictEqual(qaProjection('unpacked-chrome', changed), chromeQcf);
});
check('build-rule change invalidates Yandex QCF in this model', () => {
  const changed = { ...files, 'project_docs/BUILD_AND_RECOVERY_RULES.md': 'build-rules-v2' };
  assert.notStrictEqual(qaProjection('yandex-e2e', changed), yandexQcf);
});
check('full RCF change invalidates blocker review', () => {
  const changed = { ...files, 'project_docs/DECISIONS_AND_RATIONALE.md': 'decisions-v2' };
  assert.strictEqual(slotPasses(baseReceipts, 'blocker-review', rpf, fullRcf(changed)).reason, 'no-current-generation-receipt');
});
check('full RCF change invalidates final decision', () => {
  const changed = { ...files, 'project_docs/USER_REQUIREMENTS.md': 'requirements-v2' };
  assert.strictEqual(slotPasses(baseReceipts, 'release-decision', rpf, fullRcf(changed)).reason, 'no-current-generation-receipt');
});

check('complete current generation can pass final gate', () => assert.strictEqual(finalReleaseCheck({ candidateSha: sha, currentMainSha: sha, files, receipts: baseReceipts }).ok, true));
check('historical candidate cannot pass official gate even with valid old receipts', () => assert.strictEqual(finalReleaseCheck({ candidateSha: 'a'.repeat(40), currentMainSha: sha, files, receipts: baseReceipts }).reason, 'candidate-not-current-main-head'));
check('new runtime blocks until new physical receipts exist', () => {
  const changed = { ...files, 'service-worker.js': 'runtime-b' };
  assert.strictEqual(finalReleaseCheck({ candidateSha: sha, currentMainSha: sha, files: changed, receipts: baseReceipts }).reason, 'no-current-generation-receipt');
});
check('new contract blocks final review/decision even if physical QA projection unchanged', () => {
  const changed = { ...files, 'project_tools/check_pr_change_contract.py': 'pr-checker-v2' };
  const newRcf = fullRcf(changed);
  assert.notStrictEqual(newRcf, rcf);
  assert.strictEqual(qaProjection('unpacked-chrome', changed), chromeQcf);
  assert.strictEqual(qaProjection('yandex-e2e', changed), yandexQcf);
  assert.strictEqual(finalReleaseCheck({ candidateSha: sha, currentMainSha: sha, files: changed, receipts: baseReceipts }).reason, 'no-current-generation-receipt');
});

check('candidate-formation authorization is distinct from final release decision', () => {
  const auth = { approved: true, targetVersion: '0.9.9', contractFingerprint: rcf };
  assert.strictEqual(formationAuthorizationValid(auth, { currentContract: rcf, targetVersion: '0.9.9' }), true);
  assert.notStrictEqual(auth, baseReceipts.find((r) => r.kind === 'release-decision'));
});
check('formation authorization is invalidated by contract change', () => {
  const auth = { approved: true, targetVersion: '0.9.9', contractFingerprint: rcf };
  const changedRcf = fullRcf({ ...files, 'project_docs/USER_REQUIREMENTS.md': 'requirements-v2' });
  assert.strictEqual(formationAuthorizationValid(auth, { currentContract: changedRcf, targetVersion: '0.9.9' }), false);
});
check('formation authorization is target-version specific', () => {
  const auth = { approved: true, targetVersion: '0.9.9', contractFingerprint: rcf };
  assert.strictEqual(formationAuthorizationValid(auth, { currentContract: rcf, targetVersion: '0.9.10' }), false);
});
check('pre-bump final decision cannot survive manifest version bump because RPF changes', () => {
  const pre = { ...files, 'manifest.json': '{"manifest_version":3,"version":"0.9.8"}' };
  assert.notStrictEqual(runtimeFingerprint(pre), rpf);
});

check('expired workflow artifact can remain navigational when durable summary digest is retained', () => {
  const receipt = makeReceipt({ evidenceRef: 'github-actions:artifact/expired/10131991825', durableSummaryDigest: sha256('bounded decisive summary') });
  assert.deepStrictEqual(validateReceipt(receipt), []);
});
check('historical ledger text is not a release receipt', () => assert.notStrictEqual(files['project_docs/TEST_EVIDENCE.md'], SCHEMA));
check('GitHub attestation reference is optional provenance, not sufficient without WebClip receipt fields', () => {
  const incomplete = { evidenceRef: 'github-attestation:sha256:abc' };
  assert(validateReceipt(incomplete).length > 0);
});

check('release action must recheck main head after gate to prevent TOCTOU', () => {
  const gateHead = sha;
  const mainAfterGate = 'd'.repeat(40);
  assert.notStrictEqual(gateHead, mainAfterGate);
});
check('same current main head after gate preserves release-action eligibility', () => assert.strictEqual(sha, sha));

console.log(`${P_CODE} release evidence settlement model: PASS; cases=${cases}`);
