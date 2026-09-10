'use strict';

// Research-only deterministic model for the P1-231 release identity/admission chain.
// Logical package identity is deliberately separate from QA contracts, candidate-local
// generation consistency, builder/container identity, and Git release authority.

const assert = require('assert');
const crypto = require('crypto');

let cases = 0;
function check(name, fn) { fn(); cases += 1; return name; }
function sha256Buffer(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function digestText(value) { return `sha256:${sha256Buffer(Buffer.from(String(value), 'utf8'))}`; }
function u32(n) { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b; }
function u64(n) { const b = Buffer.alloc(8); b.writeBigUInt64BE(BigInt(n)); return b; }

const PACKAGE_SCHEMA = 'webclip-extension-package/v1';
const PATH_PROFILE = 'portable-ascii-v1';
const RPF_SCHEMA = 'WEBCLIP_RPF_V1';
const BCF_SCHEMA = 'WEBCLIP_BUILDER_CONTRACT_V1';

function canonicalTopologyDigest(paths, schema = PACKAGE_SCHEMA, profile = PATH_PROFILE) {
  const sorted = [...paths].sort((a, b) => Buffer.from(a).compare(Buffer.from(b)));
  const h = crypto.createHash('sha256');
  h.update(Buffer.from(`${schema}\0${profile}\0`, 'utf8'));
  for (const p of sorted) {
    const pb = Buffer.from(p, 'utf8');
    h.update(u32(pb.length));
    h.update(pb);
  }
  return h.digest('hex');
}

function rpf(fileMap, paths, { schema = RPF_SCHEMA, packageSchema = PACKAGE_SCHEMA, pathProfile = PATH_PROFILE } = {}) {
  const topology = canonicalTopologyDigest(paths, packageSchema, pathProfile);
  const sorted = [...paths].sort((a, b) => Buffer.from(a).compare(Buffer.from(b)));
  const h = crypto.createHash('sha256');
  h.update(Buffer.from(`${schema}\0`, 'utf8'));
  h.update(Buffer.from(topology, 'ascii'));
  h.update(Buffer.from([0]));
  for (const p of sorted) {
    const bytes = fileMap.get(p);
    if (!Buffer.isBuffer(bytes)) throw new Error(`missing package member: ${p}`);
    const pb = Buffer.from(p, 'utf8');
    h.update(u32(pb.length));
    h.update(pb);
    h.update(u64(bytes.length));
    h.update(bytes);
  }
  return `sha256:${h.digest('hex')}`;
}

function fingerprintProjection(schema, entries) {
  const sorted = Object.entries(entries).sort(([a], [b]) => Buffer.from(a).compare(Buffer.from(b)));
  const h = crypto.createHash('sha256');
  h.update(Buffer.from(`${schema}\0`, 'utf8'));
  for (const [path, value] of sorted) {
    const p = Buffer.from(path, 'utf8');
    const v = Buffer.from(String(value), 'utf8');
    h.update(u32(p.length)); h.update(p); h.update(u64(v.length)); h.update(v);
  }
  return `sha256:${h.digest('hex')}`;
}

function qcf(kind, contract) { return fingerprintProjection(`WEBCLIP_QCF_V1:${kind}`, contract[kind]); }
function rcf(contract) { return fingerprintProjection('WEBCLIP_RCF_V1', contract.full); }
function bcf(builderContract) { return fingerprintProjection(BCF_SCHEMA, builderContract); }

function officialMainAuthority({ dispatchRef, workflowRef, workflowSha, candidateSha, freshMainSha, checkoutSha }) {
  const expectedWorkflowRef = 'lukindv77/webclip-pdf/.github/workflows/release-gate.yml@refs/heads/main';
  if (dispatchRef !== 'refs/heads/main') return { ok: false, reason: 'dispatch-ref-not-main' };
  if (workflowRef !== expectedWorkflowRef) return { ok: false, reason: 'workflow-ref-not-canonical-main' };
  if (workflowSha !== candidateSha) return { ok: false, reason: 'workflow-sha-not-candidate' };
  if (freshMainSha !== candidateSha) return { ok: false, reason: 'candidate-not-fresh-main' };
  if (checkoutSha !== candidateSha) return { ok: false, reason: 'checkout-not-candidate' };
  return { ok: true };
}

function isAncestor(graph, ancestor, descendant) {
  let cur = descendant;
  const seen = new Set();
  while (cur && !seen.has(cur)) {
    if (cur === ancestor) return true;
    seen.add(cur);
    cur = graph.get(cur) || null;
  }
  return false;
}

function qaReceiptCurrent({ receipt, kind, candidateSha, candidateRpf, candidateQcf, graph, official = true }) {
  if (receipt.kind !== kind) return { ok: false, reason: 'wrong-kind' };
  if (receipt.rpf !== candidateRpf) return { ok: false, reason: 'rpf-mismatch' };
  if (receipt.qcf !== candidateQcf) return { ok: false, reason: 'qcf-mismatch' };
  if (receipt.outcome !== 'pass') return { ok: false, reason: `latest-${receipt.outcome}` };
  if (official && !isAncestor(graph, receipt.testedSourceSha, candidateSha)) return { ok: false, reason: 'tested-source-not-ancestor' };
  return { ok: true };
}

function candidateGenerationGate({ sourceGeneratedConsistent, packageManifestValid, packageBlobsValid }) {
  if (!packageManifestValid) return { ok: false, reason: 'package-manifest-invalid' };
  if (!packageBlobsValid) return { ok: false, reason: 'package-blobs-invalid' };
  if (!sourceGeneratedConsistent) return { ok: false, reason: 'generated-output-stale' };
  return { ok: true };
}

function archiveReceiptCurrent({ receipt, candidateSha, candidateRpf, candidateBcf, archiveVerificationPass, freshMainSha }) {
  if (receipt.sourceSha !== candidateSha) return { ok: false, reason: 'archive-source-not-candidate' };
  if (receipt.rpf !== candidateRpf) return { ok: false, reason: 'archive-rpf-mismatch' };
  if (receipt.bcf !== candidateBcf) return { ok: false, reason: 'builder-contract-mismatch' };
  if (!archiveVerificationPass) return { ok: false, reason: 'archive-contract-verification-failed' };
  if (freshMainSha !== candidateSha) return { ok: false, reason: 'main-advanced-after-build' };
  if (!/^sha256:[0-9a-f]{64}$/.test(receipt.artifactSha256)) return { ok: false, reason: 'bad-artifact-digest' };
  return { ok: true };
}

function finalDecisionCurrent({ receipt, candidateRpf, candidateRcf }) {
  if (receipt.rpf !== candidateRpf) return { ok: false, reason: 'decision-rpf-mismatch' };
  if (receipt.rcf !== candidateRcf) return { ok: false, reason: 'decision-rcf-mismatch' };
  if (receipt.outcome !== 'approved') return { ok: false, reason: `decision-${receipt.outcome}` };
  return { ok: true };
}

const paths = ['manifest.json', 'service-worker.js', 'public-suffix.js', 'popup.html'];
const packageA = new Map([
  ['manifest.json', Buffer.from('{"manifest_version":3,"version":"0.9.9"}')],
  ['service-worker.js', Buffer.from('worker-A')],
  ['public-suffix.js', Buffer.from('psl-A')],
  ['popup.html', Buffer.from('<main>A</main>')],
]);
const rpfA = rpf(packageA, paths);

const contractA = {
  'unpacked-chrome': {
    'USER_REQUIREMENTS.md': 'req-A',
    'TEST_PLAN.md': 'chrome-plan-A',
    'FIDELITY.md': 'fidelity-A',
  },
  'yandex-e2e': {
    'USER_REQUIREMENTS.md': 'req-A',
    'BUILD_RULES.md': 'yandex-contract-A',
  },
  full: {
    'USER_REQUIREMENTS.md': 'req-A',
    'TEST_PLAN.md': 'chrome-plan-A',
    'BUILD_RULES.md': 'release-rules-A',
    'release-gate.yml': 'gate-A',
    'builder-contract': 'builder-A',
  },
};
const builderA = {
  schema: BCF_SCHEMA,
  method: 'ZIP_STORED',
  timestamp: '1980-01-01T00:00:00',
  mode: '100644',
  order: 'unsigned-utf8-byte-lexicographic',
  directoryEntries: 'none',
  extras: 'none',
};
const builderB = { ...builderA, schema: 'WEBCLIP_BUILDER_CONTRACT_V2' };

const shaX = '1'.repeat(40);
const shaY = '2'.repeat(40);
const shaSide = '3'.repeat(40);
const graph = new Map([[shaX, null], [shaY, shaX], [shaSide, null]]);
const chromeReceiptX = { kind: 'unpacked-chrome', testedSourceSha: shaX, rpf: rpfA, qcf: qcf('unpacked-chrome', contractA), outcome: 'pass' };

check('RPF stable under package path input order', () => assert.strictEqual(rpf(packageA, [...paths].reverse()), rpfA));
check('package byte change changes RPF', () => {
  const changed = new Map(packageA); changed.set('service-worker.js', Buffer.from('worker-B'));
  assert.notStrictEqual(rpf(changed, paths), rpfA);
});
check('package topology addition changes RPF', () => {
  const changed = new Map(packageA); changed.set('new.bin', Buffer.from('x'));
  assert.notStrictEqual(rpf(changed, [...paths, 'new.bin']), rpfA);
});
check('path profile generation change changes RPF conservatively', () => assert.notStrictEqual(rpf(packageA, paths, { pathProfile: 'portable-ascii-v2' }), rpfA));
check('RPF schema change changes RPF', () => assert.notStrictEqual(rpf(packageA, paths, { schema: 'WEBCLIP_RPF_V2' }), rpfA));

check('full-contract-only change does not change RPF', () => {
  const changed = JSON.parse(JSON.stringify(contractA)); changed.full['release-gate.yml'] = 'gate-B';
  assert.strictEqual(rpf(packageA, paths), rpfA); assert.notStrictEqual(rcf(changed), rcf(contractA));
});
check('Chrome QCF-only change does not change RPF', () => {
  const changed = JSON.parse(JSON.stringify(contractA)); changed['unpacked-chrome']['TEST_PLAN.md'] = 'chrome-plan-B';
  assert.strictEqual(rpf(packageA, paths), rpfA); assert.notStrictEqual(qcf('unpacked-chrome', changed), qcf('unpacked-chrome', contractA));
});
check('builder contract change does not change logical RPF', () => {
  assert.strictEqual(rpf(packageA, paths), rpfA); assert.notStrictEqual(bcf(builderA), bcf(builderB));
});
check('PR runtime-impact policy change must not be implicit RPF input', () => {
  assert.notStrictEqual(digestText('runtime-impact-policy-A'), digestText('runtime-impact-policy-B'));
  assert.strictEqual(rpf(packageA, paths), rpfA);
});

check('ancestor evidence-only descendant can reuse Chrome QA when RPF and QCF equal', () => {
  assert.strictEqual(qaReceiptCurrent({ receipt: chromeReceiptX, kind: 'unpacked-chrome', candidateSha: shaY, candidateRpf: rpfA, candidateQcf: qcf('unpacked-chrome', contractA), graph }).ok, true);
});
check('same-RPF side branch cannot authorize official release QA', () => {
  const sideReceipt = { ...chromeReceiptX, testedSourceSha: shaSide };
  assert.strictEqual(qaReceiptCurrent({ receipt: sideReceipt, kind: 'unpacked-chrome', candidateSha: shaY, candidateRpf: rpfA, candidateQcf: qcf('unpacked-chrome', contractA), graph }).reason, 'tested-source-not-ancestor');
});
check('same-RPF side branch may remain verification evidence', () => {
  const sideReceipt = { ...chromeReceiptX, testedSourceSha: shaSide };
  assert.strictEqual(qaReceiptCurrent({ receipt: sideReceipt, kind: 'unpacked-chrome', candidateSha: shaY, candidateRpf: rpfA, candidateQcf: qcf('unpacked-chrome', contractA), graph, official: false }).ok, true);
});
check('Chrome QCF change invalidates Chrome PASS despite same RPF', () => {
  const changed = JSON.parse(JSON.stringify(contractA)); changed['unpacked-chrome']['TEST_PLAN.md'] = 'chrome-plan-B';
  assert.strictEqual(qaReceiptCurrent({ receipt: chromeReceiptX, kind: 'unpacked-chrome', candidateSha: shaY, candidateRpf: rpfA, candidateQcf: qcf('unpacked-chrome', changed), graph }).reason, 'qcf-mismatch');
});
check('Yandex-only QCF change need not invalidate Chrome receipt', () => {
  const changed = JSON.parse(JSON.stringify(contractA)); changed['yandex-e2e']['BUILD_RULES.md'] = 'yandex-contract-B';
  assert.strictEqual(qaReceiptCurrent({ receipt: chromeReceiptX, kind: 'unpacked-chrome', candidateSha: shaY, candidateRpf: rpfA, candidateQcf: qcf('unpacked-chrome', changed), graph }).ok, true);
});

check('source-generation input change with byte-identical output preserves RPF if consistency passes', () => {
  assert.strictEqual(candidateGenerationGate({ sourceGeneratedConsistent: true, packageManifestValid: true, packageBlobsValid: true }).ok, true);
  assert.strictEqual(rpf(packageA, paths), rpfA);
});
check('stale generated output blocks release even if package RPF equals old tested RPF', () => {
  assert.strictEqual(candidateGenerationGate({ sourceGeneratedConsistent: false, packageManifestValid: true, packageBlobsValid: true }).reason, 'generated-output-stale');
});
check('invalid package manifest blocks before RPF admission', () => assert.strictEqual(candidateGenerationGate({ sourceGeneratedConsistent: true, packageManifestValid: false, packageBlobsValid: true }).reason, 'package-manifest-invalid'));
check('invalid Git blob/mode projection blocks before RPF admission', () => assert.strictEqual(candidateGenerationGate({ sourceGeneratedConsistent: true, packageManifestValid: true, packageBlobsValid: false }).reason, 'package-blobs-invalid'));

const rcfA = rcf(contractA);
const chromeQcfA = qcf('unpacked-chrome', contractA);
const yandexQcfA = qcf('yandex-e2e', contractA);
check('full RCF and QA QCF are independently addressable', () => { assert.notStrictEqual(rcfA, chromeQcfA); assert.notStrictEqual(chromeQcfA, yandexQcfA); });
check('full RCF-only change stales final decision but not necessarily Chrome QA', () => {
  const decision = { rpf: rpfA, rcf: rcfA, outcome: 'approved' };
  const changed = JSON.parse(JSON.stringify(contractA)); changed.full['release-gate.yml'] = 'gate-B';
  assert.strictEqual(finalDecisionCurrent({ receipt: decision, candidateRpf: rpfA, candidateRcf: rcf(changed) }).reason, 'decision-rcf-mismatch');
  assert.strictEqual(qaReceiptCurrent({ receipt: chromeReceiptX, kind: 'unpacked-chrome', candidateSha: shaY, candidateRpf: rpfA, candidateQcf: chromeQcfA, graph }).ok, true);
});

const artifactA = `sha256:${'a'.repeat(64)}`;
const archiveReceipt = { sourceSha: shaY, rpf: rpfA, bcf: bcf(builderA), artifactSha256: artifactA };
check('archive receipt accepts exact source/RPF/BCF/artifact verification', () => {
  assert.strictEqual(archiveReceiptCurrent({ receipt: archiveReceipt, candidateSha: shaY, candidateRpf: rpfA, candidateBcf: bcf(builderA), archiveVerificationPass: true, freshMainSha: shaY }).ok, true);
});
check('builder contract change stales archive evidence while RPF stays equal', () => {
  assert.strictEqual(archiveReceiptCurrent({ receipt: archiveReceipt, candidateSha: shaY, candidateRpf: rpfA, candidateBcf: bcf(builderB), archiveVerificationPass: true, freshMainSha: shaY }).reason, 'builder-contract-mismatch');
});
check('wrong ZIP metadata/order fails archive contract even if logical content RPF matches', () => {
  assert.strictEqual(archiveReceiptCurrent({ receipt: archiveReceipt, candidateSha: shaY, candidateRpf: rpfA, candidateBcf: bcf(builderA), archiveVerificationPass: false, freshMainSha: shaY }).reason, 'archive-contract-verification-failed');
});
check('artifact digest is distinct from logical RPF', () => assert.notStrictEqual(archiveReceipt.artifactSha256, rpfA));
check('main advancing after archive build prevents publishing stale artifact', () => {
  assert.strictEqual(archiveReceiptCurrent({ receipt: archiveReceipt, candidateSha: shaY, candidateRpf: rpfA, candidateBcf: bcf(builderA), archiveVerificationPass: true, freshMainSha: '4'.repeat(40) }).reason, 'main-advanced-after-build');
});

const workflowRef = 'lukindv77/webclip-pdf/.github/workflows/release-gate.yml@refs/heads/main';
check('official main/workflow/checkout identity passes when all axes agree', () => {
  assert.strictEqual(officialMainAuthority({ dispatchRef: 'refs/heads/main', workflowRef, workflowSha: shaY, candidateSha: shaY, freshMainSha: shaY, checkoutSha: shaY }).ok, true);
});
check('old workflow SHA blocks official gate', () => assert.strictEqual(officialMainAuthority({ dispatchRef: 'refs/heads/main', workflowRef, workflowSha: shaX, candidateSha: shaY, freshMainSha: shaY, checkoutSha: shaY }).reason, 'workflow-sha-not-candidate'));
check('non-main workflow ref blocks official gate', () => assert.strictEqual(officialMainAuthority({ dispatchRef: 'refs/heads/main', workflowRef: 'lukindv77/webclip-pdf/.github/workflows/release-gate.yml@refs/heads/feature', workflowSha: shaY, candidateSha: shaY, freshMainSha: shaY, checkoutSha: shaY }).reason, 'workflow-ref-not-canonical-main'));
check('main advance before gate blocks', () => assert.strictEqual(officialMainAuthority({ dispatchRef: 'refs/heads/main', workflowRef, workflowSha: shaY, candidateSha: shaY, freshMainSha: '4'.repeat(40), checkoutSha: shaY }).reason, 'candidate-not-fresh-main'));
check('wrong checkout blocks official gate', () => assert.strictEqual(officialMainAuthority({ dispatchRef: 'refs/heads/main', workflowRef, workflowSha: shaY, candidateSha: shaY, freshMainSha: shaY, checkoutSha: shaX }).reason, 'checkout-not-candidate'));

check('old whole identity-config digest must not be one RPF axis', () => {
  assert.notStrictEqual(digestText('topology+runtime+QCF+RCF+builder=A'), digestText('topology+runtime+QCF+RCF+builder=B'));
  assert.strictEqual(rpf(packageA, paths), rpfA);
});
check('free-form evidence reference is navigation not subject authority', () => {
  assert.notStrictEqual('github-actions:run/1/job/2', 'archive:external-copy'); assert.strictEqual(chromeReceiptX.rpf, rpfA);
});

console.log(`P1-231 release identity chain refinement model: PASS; cases=${cases}; rpf=${rpfA}; chrome_qcf=${chromeQcfA}; rcf=${rcfA}; bcf=${bcf(builderA)}`);
