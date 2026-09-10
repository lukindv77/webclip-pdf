'use strict';

// P1-231 deterministic research model: release evidence generation authority.
const assert = require('assert');
const crypto = require('crypto');

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

const PACKAGE_ROOT_SUFFIXES = new Set(['.js', '.html', '.css', '.png', '.svg', '.ico', '.webp']);
const PACKAGE_DIRS = new Set(['assets', 'icons']);

function suffix(path) {
  const i = path.lastIndexOf('.');
  return i >= 0 ? path.slice(i).toLowerCase() : '';
}

function isPackagePath(path) {
  if (path === 'manifest.json') return true;
  const parts = String(path).split('/');
  if (parts.length === 1 && PACKAGE_ROOT_SUFFIXES.has(suffix(path))) return true;
  return parts.length > 1 && PACKAGE_DIRS.has(parts[0]);
}

function sha256(text) {
  return crypto.createHash('sha256').update(text).digest('hex');
}

function fingerprint(files, predicate = () => true, schema = 'v1') {
  const rows = Object.entries(files)
    .filter(([path]) => predicate(path))
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([path, content]) => `${path}\0${sha256(String(content))}`);
  return `sha256:${sha256(`${schema}\n${rows.join('\n')}`)}`;
}

function runtimeFingerprint(files) {
  return fingerprint(files, isPackagePath, 'webclip-runtime-package/v1');
}

const CONTRACT_PATHS = new Set([
  'project_docs/RESEARCH_REGISTRY.md',
  'project_docs/TEST_STATUS.md',
  'project_docs/BUILD_AND_RECOVERY_RULES.md',
  'project_tools/check_release_readiness.py',
  '.github/workflows/release-gate.yml'
]);

function releaseContractFingerprint(files) {
  return fingerprint(files, (path) => CONTRACT_PATHS.has(path), 'webclip-release-contract/v1');
}

function manifestVersion(files) {
  const parsed = JSON.parse(files['manifest.json']);
  return String(parsed.version || '');
}

function currentCheckerLikeAccepts({ status, evidenceRef }) {
  const terminal = status === 'pass' || status === 'approved';
  const ref = String(evidenceRef || '').trim().toLowerCase();
  const placeholder = new Set(['', 'none', 'pending', 'n/a', 'na', 'unknown']);
  return terminal && !placeholder.has(ref);
}

function validSha(value) {
  return /^[0-9a-f]{40}$/.test(String(value || ''));
}

function validDigest(value) {
  return /^sha256:[0-9a-f]{64}$/.test(String(value || ''));
}

function evidenceRefSafe(value) {
  const text = String(value || '').trim();
  if (!text || text.length > 2048) return false;
  if (/^(none|pending|n\/a|na|unknown)$/i.test(text)) return false;
  if (/authorization\s*:/i.test(text)) return false;
  if (/oauth|access[_-]?token=/i.test(text)) return false;
  if (/https:\/\/[^\s]*\.disk\.yandex\.(?:net|ru)\//i.test(text)) return false;
  return true;
}

function makeReceipt({ kind, testedSourceSha, testedVersion, runtimeFingerprint: rpf, releaseContractFingerprint: rcf = '', evidenceRef }) {
  return {
    schema: 'webclip-release-evidence/v1',
    kind,
    testedSourceSha,
    testedVersion,
    runtimeFingerprint: rpf,
    releaseContractFingerprint: rcf,
    evidenceRef
  };
}

function validateReceipt({ receipt, candidateFiles, sourceFilesBySha, rcfRequiredKinds = new Set(['blocker-review', 'release-decision']) }) {
  const errors = [];
  if (receipt?.schema !== 'webclip-release-evidence/v1') errors.push('unknown-schema');
  if (!['unpacked-chrome', 'yandex-e2e', 'blocker-review', 'release-decision'].includes(receipt?.kind)) errors.push('bad-kind');
  if (!validSha(receipt?.testedSourceSha)) errors.push('bad-tested-sha');
  if (!/^\d+\.\d+\.\d+(?:\.\d+)?$/.test(String(receipt?.testedVersion || ''))) errors.push('bad-tested-version');
  if (!validDigest(receipt?.runtimeFingerprint)) errors.push('bad-runtime-fingerprint');
  if (!evidenceRefSafe(receipt?.evidenceRef)) errors.push('bad-evidence-ref');

  const testedFiles = sourceFilesBySha.get(receipt?.testedSourceSha);
  if (!testedFiles) {
    errors.push('tested-sha-unresolvable');
    return errors;
  }

  const testedRpf = runtimeFingerprint(testedFiles);
  const candidateRpf = runtimeFingerprint(candidateFiles);
  if (receipt.runtimeFingerprint !== testedRpf) errors.push('receipt-rpf-not-tested-source');
  if (testedRpf !== candidateRpf) errors.push('candidate-runtime-differs');
  if (receipt.testedVersion !== manifestVersion(testedFiles)) errors.push('tested-version-mismatch');
  if (receipt.testedVersion !== manifestVersion(candidateFiles)) errors.push('candidate-version-mismatch');

  if (rcfRequiredKinds.has(receipt.kind)) {
    if (!validDigest(receipt.releaseContractFingerprint)) errors.push('missing-or-bad-contract-fingerprint');
    const candidateRcf = releaseContractFingerprint(candidateFiles);
    if (receipt.releaseContractFingerprint !== candidateRcf) errors.push('candidate-contract-differs');
  }
  return [...new Set(errors)];
}

function clone(files, changes = {}) {
  return { ...files, ...changes };
}

const shaX = '1111111111111111111111111111111111111111';
const shaY = '2222222222222222222222222222222222222222';
const shaZ = '3333333333333333333333333333333333333333';

const base = {
  'manifest.json': JSON.stringify({ manifest_version: 3, version: '0.9.9' }),
  'service-worker.js': 'worker-v1',
  'journal.js': 'journal-v1',
  'content.js': 'content-v1',
  'offscreen.js': 'offscreen-v1',
  'popup.html': '<main>popup</main>',
  'options.css': '.x{}',
  'icons/icon128.png': 'PNG-A',
  'project_docs/RESEARCH_REGISTRY.md': 'P1-231 ACTIVE contract-v1',
  'project_docs/TEST_STATUS.md': 'release requirements-v1',
  'project_docs/BUILD_AND_RECOVERY_RULES.md': 'exact candidate or byte-identical runtime tree',
  'project_tools/check_release_readiness.py': 'checker-contract-v1',
  '.github/workflows/release-gate.yml': 'release-gate-contract-v1',
  'project_docs/RELEASE_READINESS.md': 'pending evidence'
};

const docsEvidenceCommit = clone(base, {
  'project_docs/RELEASE_READINESS.md': 'chrome=pass evidence=run:123'
});
const runtimeChanged = clone(docsEvidenceCommit, { 'service-worker.js': 'worker-v2' });
const journalChanged = clone(docsEvidenceCommit, { 'journal.js': 'journal-v2' });
const iconChanged = clone(docsEvidenceCommit, { 'icons/icon128.png': 'PNG-B' });
const versionChanged = clone(docsEvidenceCommit, {
  'manifest.json': JSON.stringify({ manifest_version: 3, version: '0.9.10' })
});
const registryChanged = clone(docsEvidenceCommit, {
  'project_docs/RESEARCH_REGISTRY.md': 'P1-231 ACTIVE contract-v2; new release owner'
});
const testStatusChanged = clone(docsEvidenceCommit, {
  'project_docs/TEST_STATUS.md': 'release requirements-v2'
});
const unrelatedResearchChanged = clone(docsEvidenceCommit, {
  'project_docs/RESEARCH_SOMETHING_EVIDENCE.md': 'new research narrative'
});

// P1-231 negative control: current-like checker does not bind evidence to source generation.
test('P1-231 current-like checker accepts arbitrary non-empty chrome evidence', () => {
  assert.strictEqual(currentCheckerLikeAccepts({ status: 'pass', evidenceRef: 'fixture:chrome' }), true);
});
test('P1-231 current-like checker accepts stale evidence text after runtime changes', () => {
  assert.notStrictEqual(runtimeFingerprint(base), runtimeFingerprint(runtimeChanged));
  assert.strictEqual(currentCheckerLikeAccepts({ status: 'pass', evidenceRef: 'old-run:999' }), true);
});
test('P1-231 current-like checker rejects placeholder only', () => {
  assert.strictEqual(currentCheckerLikeAccepts({ status: 'pass', evidenceRef: 'none' }), false);
});

// Runtime package fingerprint invariants.
test('P1-231 readiness-doc-only commit keeps runtime fingerprint', () => {
  assert.strictEqual(runtimeFingerprint(base), runtimeFingerprint(docsEvidenceCommit));
});
test('P1-231 unrelated research doc keeps runtime fingerprint', () => {
  assert.strictEqual(runtimeFingerprint(base), runtimeFingerprint(unrelatedResearchChanged));
});
test('P1-231 service worker change changes runtime fingerprint', () => {
  assert.notStrictEqual(runtimeFingerprint(base), runtimeFingerprint(runtimeChanged));
});
test('P1-231 journal change changes runtime fingerprint', () => {
  assert.notStrictEqual(runtimeFingerprint(base), runtimeFingerprint(journalChanged));
});
test('P1-231 manifest version change changes runtime fingerprint', () => {
  assert.notStrictEqual(runtimeFingerprint(base), runtimeFingerprint(versionChanged));
});
test('P1-231 icon byte change changes runtime fingerprint', () => {
  assert.notStrictEqual(runtimeFingerprint(base), runtimeFingerprint(iconChanged));
});
test('P1-231 package classifier includes root JS', () => assert(isPackagePath('service-worker.js')));
test('P1-231 package classifier includes manifest', () => assert(isPackagePath('manifest.json')));
test('P1-231 package classifier includes icon dir', () => assert(isPackagePath('icons/icon128.png')));
test('P1-231 package classifier excludes release readiness docs', () => assert(!isPackagePath('project_docs/RELEASE_READINESS.md')));

// Release-contract generation.
test('P1-231 evidence-only readiness edit does not change release contract fingerprint', () => {
  assert.strictEqual(releaseContractFingerprint(base), releaseContractFingerprint(docsEvidenceCommit));
});
test('P1-231 registry change changes release contract fingerprint', () => {
  assert.notStrictEqual(releaseContractFingerprint(base), releaseContractFingerprint(registryChanged));
});
test('P1-231 TEST_STATUS change changes release contract fingerprint', () => {
  assert.notStrictEqual(releaseContractFingerprint(base), releaseContractFingerprint(testStatusChanged));
});
test('P1-231 runtime change alone need not change release contract fingerprint', () => {
  assert.strictEqual(releaseContractFingerprint(base), releaseContractFingerprint(runtimeChanged));
});

const sourceMap = new Map([
  [shaX, base],
  [shaY, docsEvidenceCommit],
  [shaZ, runtimeChanged]
]);

const chromeReceipt = makeReceipt({
  kind: 'unpacked-chrome',
  testedSourceSha: shaX,
  testedVersion: '0.9.9',
  runtimeFingerprint: runtimeFingerprint(base),
  evidenceRef: 'github-run:123/job:456'
});
const yandexReceipt = makeReceipt({
  kind: 'yandex-e2e',
  testedSourceSha: shaX,
  testedVersion: '0.9.9',
  runtimeFingerprint: runtimeFingerprint(base),
  evidenceRef: 'project-evidence:Y-L5-001'
});
const blockerReceipt = makeReceipt({
  kind: 'blocker-review',
  testedSourceSha: shaX,
  testedVersion: '0.9.9',
  runtimeFingerprint: runtimeFingerprint(base),
  releaseContractFingerprint: releaseContractFingerprint(base),
  evidenceRef: 'project-evidence:blocker-review-001'
});
const decisionReceipt = makeReceipt({
  kind: 'release-decision',
  testedSourceSha: shaX,
  testedVersion: '0.9.9',
  runtimeFingerprint: runtimeFingerprint(base),
  releaseContractFingerprint: releaseContractFingerprint(base),
  evidenceRef: 'project-evidence:release-decision-001'
});

// Exact tested source and docs-only candidate equivalence.
for (const receipt of [chromeReceipt, yandexReceipt, blockerReceipt, decisionReceipt]) {
  test(`P1-231 ${receipt.kind} accepts byte-identical package candidate`, () => {
    assert.deepStrictEqual(validateReceipt({ receipt, candidateFiles: docsEvidenceCommit, sourceFilesBySha: sourceMap }), []);
  });
}

// Runtime differences invalidate physical evidence and final decisions.
for (const receipt of [chromeReceipt, yandexReceipt, blockerReceipt, decisionReceipt]) {
  test(`P1-231 ${receipt.kind} rejects changed runtime candidate`, () => {
    assert(validateReceipt({ receipt, candidateFiles: runtimeChanged, sourceFilesBySha: sourceMap }).includes('candidate-runtime-differs'));
  });
}

test('P1-231 manifest version bump invalidates old chrome evidence', () => {
  const errors = validateReceipt({ receipt: chromeReceipt, candidateFiles: versionChanged, sourceFilesBySha: sourceMap });
  assert(errors.includes('candidate-runtime-differs'));
  assert(errors.includes('candidate-version-mismatch'));
});

test('P1-231 unresolved tested SHA is rejected', () => {
  const receipt = { ...chromeReceipt, testedSourceSha: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' };
  assert(validateReceipt({ receipt, candidateFiles: docsEvidenceCommit, sourceFilesBySha: sourceMap }).includes('tested-sha-unresolvable'));
});

test('P1-231 malformed tested SHA is rejected', () => {
  const receipt = { ...chromeReceipt, testedSourceSha: 'not-a-sha' };
  const errors = validateReceipt({ receipt, candidateFiles: docsEvidenceCommit, sourceFilesBySha: sourceMap });
  assert(errors.includes('bad-tested-sha'));
  assert(errors.includes('tested-sha-unresolvable'));
});

test('P1-231 malformed digest is rejected', () => {
  const receipt = { ...chromeReceipt, runtimeFingerprint: 'sha256:nope' };
  assert(validateReceipt({ receipt, candidateFiles: docsEvidenceCommit, sourceFilesBySha: sourceMap }).includes('bad-runtime-fingerprint'));
});

test('P1-231 fabricated receipt digest differing from tested source is rejected', () => {
  const receipt = { ...chromeReceipt, runtimeFingerprint: `sha256:${'f'.repeat(64)}` };
  assert(validateReceipt({ receipt, candidateFiles: docsEvidenceCommit, sourceFilesBySha: sourceMap }).includes('receipt-rpf-not-tested-source'));
});

test('P1-231 wrong tested version is rejected', () => {
  const receipt = { ...chromeReceipt, testedVersion: '0.9.8' };
  const errors = validateReceipt({ receipt, candidateFiles: docsEvidenceCommit, sourceFilesBySha: sourceMap });
  assert(errors.includes('tested-version-mismatch'));
  assert(errors.includes('candidate-version-mismatch'));
});

test('P1-231 unknown receipt schema fails closed', () => {
  const receipt = { ...chromeReceipt, schema: 'webclip-release-evidence/v99' };
  assert(validateReceipt({ receipt, candidateFiles: docsEvidenceCommit, sourceFilesBySha: sourceMap }).includes('unknown-schema'));
});

test('P1-231 placeholder evidence ref is rejected', () => {
  const receipt = { ...chromeReceipt, evidenceRef: 'pending' };
  assert(validateReceipt({ receipt, candidateFiles: docsEvidenceCommit, sourceFilesBySha: sourceMap }).includes('bad-evidence-ref'));
});

test('P1-231 Authorization header is rejected as evidence metadata', () => {
  const receipt = { ...chromeReceipt, evidenceRef: 'Authorization: Bearer SECRET' };
  assert(validateReceipt({ receipt, candidateFiles: docsEvidenceCommit, sourceFilesBySha: sourceMap }).includes('bad-evidence-ref'));
});

test('P1-231 signed Yandex transport URL is rejected as evidence metadata', () => {
  const receipt = { ...yandexReceipt, evidenceRef: 'https://abc.disk.yandex.net/signed/path?token=secret' };
  assert(validateReceipt({ receipt, candidateFiles: docsEvidenceCommit, sourceFilesBySha: sourceMap }).includes('bad-evidence-ref'));
});

// Contract-sensitive receipts reject stale review/decision while runtime remains byte-identical.
test('P1-231 blocker review rejects later Registry contract generation', () => {
  const errors = validateReceipt({ receipt: blockerReceipt, candidateFiles: registryChanged, sourceFilesBySha: sourceMap });
  assert(errors.includes('candidate-contract-differs'));
  assert(!errors.includes('candidate-runtime-differs'));
});
test('P1-231 release decision rejects later TEST_STATUS contract generation', () => {
  const errors = validateReceipt({ receipt: decisionReceipt, candidateFiles: testStatusChanged, sourceFilesBySha: sourceMap });
  assert(errors.includes('candidate-contract-differs'));
  assert(!errors.includes('candidate-runtime-differs'));
});
test('P1-231 blocker review without contract digest is rejected', () => {
  const receipt = { ...blockerReceipt, releaseContractFingerprint: '' };
  assert(validateReceipt({ receipt, candidateFiles: docsEvidenceCommit, sourceFilesBySha: sourceMap }).includes('missing-or-bad-contract-fingerprint'));
});

test('P1-231 Chrome receipt does not require RCF under initial policy', () => {
  const receipt = { ...chromeReceipt, releaseContractFingerprint: '' };
  assert.deepStrictEqual(validateReceipt({ receipt, candidateFiles: registryChanged, sourceFilesBySha: sourceMap }), []);
});
test('P1-231 Yandex receipt does not require RCF under initial policy', () => {
  const receipt = { ...yandexReceipt, releaseContractFingerprint: '' };
  assert.deepStrictEqual(validateReceipt({ receipt, candidateFiles: testStatusChanged, sourceFilesBySha: sourceMap }), []);
});

test('P1-231 policy can require RCF for Chrome when acceptance suite semantics demand it', () => {
  const receipt = { ...chromeReceipt, releaseContractFingerprint: releaseContractFingerprint(base) };
  const required = new Set(['unpacked-chrome', 'blocker-review', 'release-decision']);
  assert.deepStrictEqual(validateReceipt({ receipt, candidateFiles: docsEvidenceCommit, sourceFilesBySha: sourceMap, rcfRequiredKinds: required }), []);
});
test('P1-231 policy-required Chrome RCF rejects stale contract', () => {
  const receipt = { ...chromeReceipt, releaseContractFingerprint: releaseContractFingerprint(base) };
  const required = new Set(['unpacked-chrome', 'blocker-review', 'release-decision']);
  assert(validateReceipt({ receipt, candidateFiles: registryChanged, sourceFilesBySha: sourceMap, rcfRequiredKinds: required }).includes('candidate-contract-differs'));
});

console.log(`P1-231 release evidence generation model: PASS; cases=${cases}`);
