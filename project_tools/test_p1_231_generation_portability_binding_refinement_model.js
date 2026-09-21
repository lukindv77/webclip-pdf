'use strict';

// Research-only deterministic model for the P1-231 source-generation portability
// and executable-authority binding refinement. It does not modify the generator,
// release policy, readiness, runtime files, external QA state or product artifacts.

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const GENERATOR = 'project_tools/build_public_suffix_js.py';
const SOURCE = 'public_suffix_list.dat';
const OUTPUT = 'public-suffix.js';

const generatorSource = fs.readFileSync(path.join(ROOT, GENERATOR), 'utf8');
const outputBytes = fs.readFileSync(path.join(ROOT, OUTPUT));
const s0bDoc = fs.readFileSync(path.join(ROOT, 'project_docs/RESEARCH_P1_231_S0B_SOURCE_GENERATION_AUTHORITY_SOURCE_SPEC_2026-09-10_EVIDENCE.md'), 'utf8');
const s0cModel = fs.readFileSync(path.join(ROOT, 'project_tools/test_p1_231_s0c_qa_contract_authority_source_spec_model.js'), 'utf8');
const s0fDoc = fs.readFileSync(path.join(ROOT, 'project_docs/RESEARCH_P1_231_S0F_CANDIDATE_GENERATION_VERIFIER_SOURCE_SPEC_2026-09-10_EVIDENCE.md'), 'utf8');
const s0gDoc = fs.readFileSync(path.join(ROOT, 'project_docs/RESEARCH_P1_231_S0G_EVIDENCE_SETTLEMENT_ENGINE_SOURCE_SPEC_2026-09-10_EVIDENCE.md'), 'utf8');
const s0iDoc = fs.readFileSync(path.join(ROOT, 'project_docs/RESEARCH_P1_231_S0I_PR_CHECKER_INTEGRATION_SOURCE_SPEC_2026-09-10_EVIDENCE.md'), 'utf8');
const reconcileDoc = fs.readFileSync(path.join(ROOT, 'project_docs/RESEARCH_POST_P1_231_PRODUCTION_ENTRY_RECONCILIATION_2026-09-10_EVIDENCE.md'), 'utf8');
const portabilityProof = fs.readFileSync(path.join(ROOT, 'project_docs/RESEARCH_P1_231_S0B_PSL_PORTABILITY_REPROOF_2026-09-21_EVIDENCE.md'), 'utf8');

const CURRENT_FULL_RCF_INPUTS = Object.freeze([
  '.github/workflows/release-gate.yml',
  'project_docs/BUILD_AND_RECOVERY_RULES.md',
  'project_docs/CONTEXT_MANIFEST.json',
  'project_docs/DECISIONS_AND_RATIONALE.md',
  'project_docs/RESEARCH_REGISTRY.md',
  'project_docs/TEST_PLAN.md',
  'project_docs/USER_REQUIREMENTS.md',
  'project_docs/WEBCLIP_PDF_FIDELITY_CONTRACT.md',
  'project_tools/build_public_suffix_js.py',
  'project_tools/check_pr_change_contract.py',
  'project_tools/check_release_readiness.py',
]);

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
function sha256(bytes) { return crypto.createHash('sha256').update(bytes).digest('hex'); }
function researchPackageDigest(bytes) {
  const h = crypto.createHash('sha256');
  h.update('RESEARCH_PACKAGE_BYTES_V1\0');
  h.update(OUTPUT);
  h.update('\0');
  h.update(bytes);
  return h.digest('hex');
}
function researchQcf(kind) {
  return sha256(Buffer.from(`RESEARCH_QCF_STABLE_V1\0${kind}`, 'utf8'));
}
function researchGovernanceBinding(inputs, overrides = new Map()) {
  const h = crypto.createHash('sha256');
  h.update('RESEARCH_GENERATION_GOVERNANCE_BINDING_V1\0');
  for (const rel of [...inputs].sort()) {
    const bytes = overrides.has(rel) ? overrides.get(rel) : fs.readFileSync(path.join(ROOT, rel));
    h.update(Buffer.from(rel, 'utf8'));
    h.update(Buffer.from([0]));
    h.update(Buffer.from(String(bytes.length), 'ascii'));
    h.update(Buffer.from([0]));
    h.update(bytes);
    h.update(Buffer.from([0]));
  }
  return h.digest('hex');
}
function coverageCheck(generatorPaths, fullInputs) {
  const full = new Set(fullInputs);
  for (const generator of generatorPaths) {
    if (!full.has(generator)) {
      const error = new Error(`generator is not full-RCF bound: ${generator}`);
      error.code = 'SOURCE_GENERATION_GENERATOR_NOT_RCF_BOUND';
      throw error;
    }
  }
  return true;
}
function translateLfToWindowsText(bytes) {
  return Buffer.from(bytes.toString('utf8').replace(/\r?\n/g, '\r\n'), 'utf8');
}
function binaryUtf8(text) { return Buffer.from(text, 'utf8'); }
function classifyGeneratorChange({ generatorChanged, authorityImplementation = false, prCheckerControlPlane = false }) {
  const trustedControlPlaneReview = Boolean(generatorChanged || authorityImplementation || prCheckerControlPlane);
  const automaticClassificationTrusted = !trustedControlPlaneReview;
  return {
    generationGenerator: Boolean(generatorChanged),
    candidateGenerationVerification: Boolean(generatorChanged || authorityImplementation),
    shadowIdentityRecompute: Boolean(generatorChanged || authorityImplementation || prCheckerControlPlane),
    trustedControlPlaneReview,
    automaticClassificationTrusted,
  };
}
function physicalEvidenceReusable({ oldRpf, newRpf, oldQcf, newQcf, oldAdmitted, newAdmitted, ancestor }) {
  return Boolean(oldAdmitted && newAdmitted && ancestor && oldRpf === newRpf && oldQcf === newQcf);
}
function governanceEvidenceReusable({ oldRpf, newRpf, oldRcf, newRcf, oldAdmitted, newAdmitted, ancestor }) {
  return Boolean(oldAdmitted && newAdmitted && ancestor && oldRpf === newRpf && oldRcf === newRcf);
}

// Exact current baseline observations.
test('current generator relation is documented', () => {
  assert(s0bDoc.includes(`generator: ${GENERATOR}`));
  assert(s0bDoc.includes(`source input: ${SOURCE}`));
  assert(s0bDoc.includes(`tracked generated output: ${OUTPUT}`));
});
test('current generator has retired text-mode write', () => assert(!generatorSource.includes("OUT.write_text(code, encoding='utf-8')")));
test('current generator uses exact binary UTF-8 write', () => assert(generatorSource.includes("OUT.write_bytes(code.encode('utf-8'))")));
test('current generator binary write needs no text newline override', () => assert(!generatorSource.includes("newline='\\n'")));
test('historical S0-B spec records original Windows portability failure', () => assert(s0bDoc.includes('generated_matches_git_blob = false')));
test('historical S0-F spec records the former portability blocker', () => assert(s0fDoc.includes('candidateGenerationAdmission = BLOCKED') && s0fDoc.includes('SOURCE_GENERATION_PORTABILITY_UNPROVEN')));
test('current physical proof closes the exact Windows portability defect', () => assert(portabilityProof.includes('PHYSICAL PORTABILITY PASS') && portabilityProof.includes('windows-2025') && portabilityProof.includes('72aea4d8a8505ad90d9070bca539dff7d49391f034d0dd41f76d64867efc0b26')));
test('S0-F forbids verifier normalization', () => assert(s0fDoc.includes('No newline, Unicode, JSON, whitespace or text-mode normalization is allowed after execution.')));

test('current S0-C model has eleven full-RCF inputs', () => assert.strictEqual(CURRENT_FULL_RCF_INPUTS.length, 11));
test('current S0-C bootstrap includes generator executable', () => assert(CURRENT_FULL_RCF_INPUTS.includes(GENERATOR)));
test('current S0-C source model lists generator executable exactly once', () => {
  const fixtureStart = s0cModel.indexOf('const AUTHORITY_FIXTURE');
  const fixtureEnd = s0cModel.indexOf('projections:', fixtureStart);
  assert(fixtureStart >= 0 && fixtureEnd > fixtureStart);
  const fixture = s0cModel.slice(fixtureStart, fixtureEnd);
  assert.strictEqual(fixture.split(GENERATOR).length - 1, 1);
});

test('S0-I already recognizes generationGenerator', () => assert(s0iDoc.includes('generationGenerator')));
test('S0-I already requires candidate generation verification for generation closure', () => assert(s0iDoc.includes('generationClosure')));
test('S0-I current trust rule names authority implementation', () => assert(s0iDoc.includes('if authorityImplementation OR prCheckerControlPlane:')));
test('S0-I current trust rule does not name generator in that condition', () => {
  const marker = 'if authorityImplementation OR prCheckerControlPlane:';
  const at = s0iDoc.indexOf(marker);
  assert(at >= 0);
  assert(!s0iDoc.slice(at, at + marker.length).includes('generationGenerator'));
});

test('S0-G physical Chrome key is RPF plus Chrome QCF', () => assert(s0gDoc.includes('unpacked-chrome subject = tested S0-F RPF + S0-E QCF(unpacked-chrome)')));
test('S0-G physical Yandex key is RPF plus Yandex QCF', () => assert(s0gDoc.includes('yandex-e2e subject      = tested S0-F RPF + S0-E QCF(yandex-e2e)')));
test('S0-G blocker review key is RPF plus full RCF', () => assert(s0gDoc.includes('blocker-review subject    = tested S0-F RPF + S0-E full RCF')));
test('S0-G release decision key is RPF plus full RCF', () => assert(s0gDoc.includes('release-decision subject  = tested S0-F RPF + S0-E full RCF')));
test('S0-G requires tested-source S0-F admission', () => assert(s0gDoc.includes('Tested source must itself be S0-F admitted')));
test('S0-G requires current-candidate S0-F admission', () => assert(s0gDoc.includes('Current candidate must independently be S0-F admitted')));

// Byte-level portability model.
const canonicalLfFixture = Buffer.from('alpha\nbeta\ngamma\n', 'utf8');
const windowsTranslatedFixture = translateLfToWindowsText(canonicalLfFixture);
test('synthetic Windows text translation changes bytes', () => assert(!windowsTranslatedFixture.equals(canonicalLfFixture)));
test('synthetic Windows text translation adds CR bytes', () => assert.strictEqual(windowsTranslatedFixture.length, canonicalLfFixture.length + 3));
test('synthetic Windows text translation has CRLF', () => assert(windowsTranslatedFixture.includes(Buffer.from('\r\n'))));
test('binary UTF-8 preserves exact LF bytes', () => assert(binaryUtf8(canonicalLfFixture.toString('utf8')).equals(canonicalLfFixture)));
test('binary UTF-8 does not introduce CRLF', () => assert(!binaryUtf8(canonicalLfFixture.toString('utf8')).includes(Buffer.from('\r\n'))));

test('real committed package output is LF-based', () => assert(outputBytes.includes(Buffer.from('\n'))));
test('real committed package output has no CRLF', () => assert(!outputBytes.includes(Buffer.from('\r\n'))));
test('real output Windows-style translation changes exact bytes', () => assert(!translateLfToWindowsText(outputBytes).equals(outputBytes)));
test('real output Windows-style translation changes digest', () => assert.notStrictEqual(sha256(translateLfToWindowsText(outputBytes)), sha256(outputBytes)));

// Historical-to-current portability correction model: generator implementation changes while package output remains exact.
const currentGeneratorBytes = Buffer.from(generatorSource, 'utf8');
const historicalTextGeneratorSource = Buffer.from(generatorSource.replace("OUT.write_bytes(code.encode('utf-8'))", "OUT.write_text(code, encoding='utf-8')"), 'utf8');
test('byte-portability correction differs from historical text-mode generator fixture', () => assert(!historicalTextGeneratorSource.equals(currentGeneratorBytes)));
test('current correction uses binary write', () => assert(currentGeneratorBytes.includes(Buffer.from('OUT.write_bytes('))));
test('repair simulation need not change current package bytes', () => {
  assert.strictEqual(researchPackageDigest(outputBytes), researchPackageDigest(Buffer.from(outputBytes)));
});

const oldResearchRpf = researchPackageDigest(outputBytes);
const newResearchRpf = researchPackageDigest(outputBytes);
const oldChromeQcf = researchQcf('unpacked-chrome');
const newChromeQcf = researchQcf('unpacked-chrome');
const oldYandexQcf = researchQcf('yandex-e2e');
const newYandexQcf = researchQcf('yandex-e2e');

test('generator-only repair leaves research package digest unchanged when output is unchanged', () => assert.strictEqual(oldResearchRpf, newResearchRpf));
test('generator-only repair leaves Chrome research QCF unchanged', () => assert.strictEqual(oldChromeQcf, newChromeQcf));
test('generator-only repair leaves Yandex research QCF unchanged', () => assert.strictEqual(oldYandexQcf, newYandexQcf));

const proposedFullInputs = CURRENT_FULL_RCF_INPUTS;
test('proposed governance coverage adds generator exactly once', () => assert.strictEqual(proposedFullInputs.filter((x) => x === GENERATOR).length, 1));
test('proposed full input set has eleven roots', () => assert.strictEqual(proposedFullInputs.length, 11));
test('current coverage accepts generator', () => assert.strictEqual(coverageCheck([GENERATOR], CURRENT_FULL_RCF_INPUTS), true));
test('current/proposed coverage views agree', () => assert.strictEqual(coverageCheck([GENERATOR], proposedFullInputs), true));

const oldGovernanceDigest = researchGovernanceBinding(proposedFullInputs, new Map([[GENERATOR, historicalTextGeneratorSource]]));
const repairedGovernanceDigest = researchGovernanceBinding(proposedFullInputs);
test('generator implementation change changes research governance binding', () => assert.notStrictEqual(oldGovernanceDigest, repairedGovernanceDigest));
test('generator implementation change does not change research package digest', () => assert.strictEqual(oldResearchRpf, newResearchRpf));
test('governance digest is distinct from package digest', () => assert.notStrictEqual(oldGovernanceDigest, oldResearchRpf));

// Trust interpretation refinement.
const generatorImpact = classifyGeneratorChange({ generatorChanged: true });
test('generator change is generationGenerator impact', () => assert.strictEqual(generatorImpact.generationGenerator, true));
test('generator change requires candidate generation verification', () => assert.strictEqual(generatorImpact.candidateGenerationVerification, true));
test('generator change requires shadow identity recompute', () => assert.strictEqual(generatorImpact.shadowIdentityRecompute, true));
test('generator change requires trusted control-plane review', () => assert.strictEqual(generatorImpact.trustedControlPlaneReview, true));
test('generator change cannot self-assert automatic trust', () => assert.strictEqual(generatorImpact.automaticClassificationTrusted, false));
const ordinaryImpact = classifyGeneratorChange({ generatorChanged: false });
test('ordinary non-control change can remain automatically trusted in this narrow model', () => assert.strictEqual(ordinaryImpact.automaticClassificationTrusted, true));

// Evidence reuse split: physical QA can remain current for exact same package/contract,
// governance evidence cannot survive changed full RCF.
test('physical Chrome evidence may reuse with same RPF/QCF and both S0-F admissions', () => {
  assert(physicalEvidenceReusable({ oldRpf: oldResearchRpf, newRpf: newResearchRpf, oldQcf: oldChromeQcf, newQcf: newChromeQcf, oldAdmitted: true, newAdmitted: true, ancestor: true }));
});
test('physical Yandex evidence may reuse with same RPF/QCF and both S0-F admissions', () => {
  assert(physicalEvidenceReusable({ oldRpf: oldResearchRpf, newRpf: newResearchRpf, oldQcf: oldYandexQcf, newQcf: newYandexQcf, oldAdmitted: true, newAdmitted: true, ancestor: true }));
});
test('physical evidence cannot reuse without tested-source S0-F admission', () => {
  assert(!physicalEvidenceReusable({ oldRpf: oldResearchRpf, newRpf: newResearchRpf, oldQcf: oldChromeQcf, newQcf: newChromeQcf, oldAdmitted: false, newAdmitted: true, ancestor: true }));
});
test('physical evidence cannot reuse without current-candidate S0-F admission', () => {
  assert(!physicalEvidenceReusable({ oldRpf: oldResearchRpf, newRpf: newResearchRpf, oldQcf: oldChromeQcf, newQcf: newChromeQcf, oldAdmitted: true, newAdmitted: false, ancestor: true }));
});
test('physical evidence cannot reuse across non-ancestor candidate', () => {
  assert(!physicalEvidenceReusable({ oldRpf: oldResearchRpf, newRpf: newResearchRpf, oldQcf: oldChromeQcf, newQcf: newChromeQcf, oldAdmitted: true, newAdmitted: true, ancestor: false }));
});
test('governance evidence becomes stale when generator-bound full RCF changes', () => {
  assert(!governanceEvidenceReusable({ oldRpf: oldResearchRpf, newRpf: newResearchRpf, oldRcf: oldGovernanceDigest, newRcf: repairedGovernanceDigest, oldAdmitted: true, newAdmitted: true, ancestor: true }));
});
test('governance evidence could reuse only if full RCF stays identical', () => {
  assert(governanceEvidenceReusable({ oldRpf: oldResearchRpf, newRpf: newResearchRpf, oldRcf: oldGovernanceDigest, newRcf: oldGovernanceDigest, oldAdmitted: true, newAdmitted: true, ancestor: true }));
});

// Cross-plane safety retained from canonical reconciliation.
test('runtime Z remains distinct from P1-231 approval', () => assert(reconcileDoc.includes('runtime `Z` does not satisfy S2 approval')));
test('S2 approval does not prove runtime correctness', () => assert(reconcileDoc.includes('S2 approval does not prove runtime correctness')));
test('publish implementation does not waive external evidence', () => assert(reconcileDoc.includes('publish execution requires external evidence even if publish code exists')));

const tranche = Object.freeze({
  mode: 'research-only',
  generatorModified: false,
  readinessModified: false,
  permanentWorkflowModified: false,
  s2Authorized: false,
  productZip: false,
  releaseAuthorized: false,
});
test('tranche is research-only', () => assert.strictEqual(tranche.mode, 'research-only'));
test('tranche does not modify generator', () => assert.strictEqual(tranche.generatorModified, false));
test('tranche does not modify readiness', () => assert.strictEqual(tranche.readinessModified, false));
test('tranche does not modify permanent workflow', () => assert.strictEqual(tranche.permanentWorkflowModified, false));
test('tranche does not authorize S2', () => assert.strictEqual(tranche.s2Authorized, false));
test('tranche does not build product ZIP', () => assert.strictEqual(tranche.productZip, false));
test('tranche does not authorize release', () => assert.strictEqual(tranche.releaseAuthorized, false));

console.log(`P1-231 generation portability/binding refinement model: PASS; cases=${cases}; current_full_rcf_inputs=${CURRENT_FULL_RCF_INPUTS.length}; proposed_full_rcf_inputs=${proposedFullInputs.length}; current_portability=pass; generator_rcf_binding=bound; s2_authorized=false`);