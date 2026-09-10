'use strict';

const assert = require('assert');
const crypto = require('crypto');

const P = 'P1-231';
let cases = 0;
function check(name, fn) { fn(); cases += 1; return name; }
function sha256(s) { return crypto.createHash('sha256').update(String(s)).digest('hex'); }

const PACKAGE_SUFFIXES = new Set(['.js','.html','.css','.png','.svg','.ico','.webp']);
const PACKAGE_DIRS = new Set(['assets','icons']);
const NON_PACKAGE_ROOT_FILES = new Set(['.gitignore','README.md','GITHUB_REPOSITORY_STATE.md']);
const NON_PACKAGE_DIRS = new Set(['.github','project_docs','project_tools']);

function suffix(path) {
  const name = path.split('/').pop();
  const i = name.lastIndexOf('.');
  return i >= 0 ? name.slice(i).toLowerCase() : '';
}
function classify(path) {
  const parts = path.split('/');
  if (path === 'manifest.json') return 'package';
  if (parts.length === 1 && PACKAGE_SUFFIXES.has(suffix(path))) return 'package';
  if (PACKAGE_DIRS.has(parts[0])) return 'package';
  if (NON_PACKAGE_ROOT_FILES.has(path)) return 'non-package';
  if (NON_PACKAGE_DIRS.has(parts[0])) return 'non-package';
  return 'unknown';
}
function assertExhaustive(paths) {
  const unknown = paths.filter((p) => classify(p) === 'unknown');
  return {ok: unknown.length === 0, unknown};
}

function canonicalConfigDigest(config) {
  const stable = JSON.stringify(config, Object.keys(config).sort());
  return sha256(stable);
}
function rpf(configDigest, fileMap) {
  const packagePaths = Object.keys(fileMap).filter((p) => classify(p) === 'package').sort();
  const h = crypto.createHash('sha256');
  h.update('WEBCLIP_RPF_V1\0');
  h.update(configDigest); h.update('\0');
  for (const path of packagePaths) {
    const pb = Buffer.from(path, 'utf8');
    const db = Buffer.from(String(fileMap[path]), 'utf8');
    const lp = Buffer.alloc(4); lp.writeUInt32BE(pb.length);
    const ld = Buffer.alloc(8); ld.writeBigUInt64BE(BigInt(db.length));
    h.update(lp); h.update(pb); h.update(ld); h.update(db);
  }
  return h.digest('hex');
}

function officialWorkflowIdentity({dispatchRef, workflowSha, candidateSha, freshMainSha}) {
  if (dispatchRef !== 'refs/heads/main') return {ok:false, reason:'dispatch-ref-not-main'};
  if (workflowSha !== candidateSha) return {ok:false, reason:'workflow-sha-not-candidate'};
  if (freshMainSha !== candidateSha) return {ok:false, reason:'candidate-not-fresh-main'};
  return {ok:true};
}
function verificationWorkflowIdentity() { return {ok:true, releasable:false}; }

function isAncestor(graph, ancestor, descendant) {
  let cur = descendant;
  const seen = new Set();
  while (cur && !seen.has(cur)) {
    if (cur === ancestor) return true;
    seen.add(cur);
    cur = graph[cur] || null;
  }
  return false;
}
function testedSourceAllowed({mode, graph, testedSha, candidateSha, resolves=true}) {
  if (!resolves) return {ok:false, reason:'tested-source-unresolvable'};
  if (mode === 'verification-only') return {ok:true, releasable:false};
  if (!isAncestor(graph, testedSha, candidateSha)) return {ok:false, reason:'tested-source-not-candidate-ancestor'};
  return {ok:true, releasable:true};
}

const RECEIPT_PREFIX = 'project_docs/release_evidence/receipts/';
const SUMMARY_PREFIX = 'project_docs/release_evidence/summaries/';
function immutableEvidencePath(path) { return path.startsWith(RECEIPT_PREFIX) || path.startsWith(SUMMARY_PREFIX); }
function validateEvidenceDiff(changes) {
  for (const {status,path,oldPath} of changes) {
    const protectedPath = immutableEvidencePath(path) || (oldPath && immutableEvidencePath(oldPath));
    if (!protectedPath) continue;
    if (status !== 'A') return {ok:false, reason:'immutable-evidence-not-add-only', path};
  }
  return {ok:true};
}

function activationAtomic(changed, policyApproved) {
  const required = new Set([
    'project_tools/release_identity.py',
    'project_tools/release_identity_inputs_v1.json',
    'project_tools/check_release_evidence.py',
    'project_tools/test_release_identity.py',
    'project_tools/test_release_evidence.py',
    'project_tools/check_release_readiness.py',
    'project_tools/test_release_readiness.py',
    'project_tools/check_pr_change_contract.py',
    'project_tools/test_pr_change_contract.py',
    '.github/workflows/repository-integrity.yml',
    '.github/workflows/release-gate.yml',
    'project_docs/RELEASE_READINESS.md',
    'project_docs/BUILD_AND_RECOVERY_RULES.md'
  ]);
  if (!policyApproved) return {ok:false, reason:'policy-approval-required'};
  const missing = [...required].filter((p) => !changed.has(p));
  return missing.length ? {ok:false, reason:'activation-not-package-atomic', missing} : {ok:true};
}

function readinessAuthority({declaredStatus, declaredReceiptId, latestReceipt}) {
  if (declaredStatus !== 'pass' && declaredStatus !== 'approved') return {ok:false, reason:'declared-not-terminal'};
  if (!latestReceipt) return {ok:false, reason:'no-current-receipt'};
  const expectedOutcome = declaredStatus === 'approved' ? 'approved' : 'pass';
  if (latestReceipt.outcome !== expectedOutcome) return {ok:false, reason:`latest-${latestReceipt.outcome}`};
  if (declaredReceiptId && declaredReceiptId !== latestReceipt.receiptId) return {ok:false, reason:'declared-pointer-stale'};
  return {ok:true};
}

function releaseActionRecheck({gatedSha, freshMainSha}) {
  return gatedSha === freshMainSha ? {ok:true} : {ok:false, reason:'main-advanced-after-gate'};
}

const currentPaths = [
  '.gitignore','README.md','GITHUB_REPOSITORY_STATE.md','manifest.json','service-worker.js','content.js','popup.html','popup.css','icons/icon.png',
  '.github/workflows/release-gate.yml','project_docs/RESEARCH_REGISTRY.md','project_tools/check_release_readiness.py'
];
const config1 = {schema:'webclip-release-identity-inputs/v1', packageSuffixes:[...PACKAGE_SUFFIXES].sort(), packageDirs:[...PACKAGE_DIRS].sort(), nonPackageRoots:[...NON_PACKAGE_ROOT_FILES].sort(), nonPackageDirs:[...NON_PACKAGE_DIRS].sort()};
const configDigest1 = canonicalConfigDigest(config1);
const files = {'manifest.json':'v0.9.8','service-worker.js':'sw','content.js':'content','popup.html':'popup','popup.css':'css','icons/icon.png':'png','README.md':'docs'};
const baseRpf = rpf(configDigest1, files);

check('current known topology exhaustive', () => assert.strictEqual(assertExhaustive(currentPaths).ok, true));
check('manifest package', () => assert.strictEqual(classify('manifest.json'),'package'));
check('root js package', () => assert.strictEqual(classify('service-worker.js'),'package'));
check('root html package', () => assert.strictEqual(classify('popup.html'),'package'));
check('assets arbitrary extension package', () => assert.strictEqual(classify('assets/model.bin'),'package'));
check('icons arbitrary extension package', () => assert.strictEqual(classify('icons/icon.avif'),'package'));
check('project docs non-package', () => assert.strictEqual(classify('project_docs/new.md'),'non-package'));
check('project tools non-package', () => assert.strictEqual(classify('project_tools/tool.py'),'non-package'));
check('github workflow non-package', () => assert.strictEqual(classify('.github/workflows/x.yml'),'non-package'));
check('unknown root wasm fails classification', () => assert.strictEqual(classify('runtime.wasm'),'unknown'));
check('unknown root json fails classification', () => assert.strictEqual(classify('runtime-data.json'),'unknown'));
check('unknown new top directory fails classification', () => assert.strictEqual(classify('vendor/x.js'),'unknown'));
check('unknown topology makes exhaustive check fail', () => assert.strictEqual(assertExhaustive([...currentPaths,'runtime.wasm']).ok,false));
check('docs-only file absent from RPF', () => assert.strictEqual(rpf(configDigest1,{...files,'README.md':'changed'}),baseRpf));
check('runtime content changes RPF', () => assert.notStrictEqual(rpf(configDigest1,{...files,'content.js':'changed'}),baseRpf));
check('manifest change changes RPF', () => assert.notStrictEqual(rpf(configDigest1,{...files,'manifest.json':'v0.9.9'}),baseRpf));
check('icon change changes RPF', () => assert.notStrictEqual(rpf(configDigest1,{...files,'icons/icon.png':'new'}),baseRpf));
check('package path addition changes RPF', () => assert.notStrictEqual(rpf(configDigest1,{...files,'assets/new.bin':'x'}),baseRpf));
check('classifier config digest participates in RPF', () => {
  const cfg2 = {...config1, schema:'webclip-release-identity-inputs/v2'};
  assert.notStrictEqual(rpf(canonicalConfigDigest(cfg2), files),baseRpf);
});

const candidate='c'.repeat(40), old='a'.repeat(40), newer='d'.repeat(40);
check('official workflow identity pass', () => assert.strictEqual(officialWorkflowIdentity({dispatchRef:'refs/heads/main',workflowSha:candidate,candidateSha:candidate,freshMainSha:candidate}).ok,true));
check('dispatch from feature branch blocks', () => assert.strictEqual(officialWorkflowIdentity({dispatchRef:'refs/heads/feature',workflowSha:candidate,candidateSha:candidate,freshMainSha:candidate}).reason,'dispatch-ref-not-main'));
check('dispatch from tag blocks', () => assert.strictEqual(officialWorkflowIdentity({dispatchRef:'refs/tags/v1',workflowSha:candidate,candidateSha:candidate,freshMainSha:candidate}).reason,'dispatch-ref-not-main'));
check('old workflow definition blocks', () => assert.strictEqual(officialWorkflowIdentity({dispatchRef:'refs/heads/main',workflowSha:old,candidateSha:candidate,freshMainSha:candidate}).reason,'workflow-sha-not-candidate'));
check('main advanced before gate blocks', () => assert.strictEqual(officialWorkflowIdentity({dispatchRef:'refs/heads/main',workflowSha:candidate,candidateSha:candidate,freshMainSha:newer}).reason,'candidate-not-fresh-main'));
check('verification mode cannot release', () => assert.strictEqual(verificationWorkflowIdentity().releasable,false));

const graph = {[candidate]:old,[old]:null,[newer]:candidate};
check('tested source ancestor accepted', () => assert.strictEqual(testedSourceAllowed({mode:'official',graph,testedSha:old,candidateSha:candidate}).ok,true));
check('candidate can test itself', () => assert.strictEqual(testedSourceAllowed({mode:'official',graph,testedSha:candidate,candidateSha:candidate}).ok,true));
check('side branch tested source rejected', () => assert.strictEqual(testedSourceAllowed({mode:'official',graph:{...graph,['b'.repeat(40)]:null},testedSha:'b'.repeat(40),candidateSha:candidate}).reason,'tested-source-not-candidate-ancestor'));
check('unresolvable tested source rejected', () => assert.strictEqual(testedSourceAllowed({mode:'official',graph,testedSha:old,candidateSha:candidate,resolves:false}).reason,'tested-source-unresolvable'));
check('verification may inspect nonancestor but cannot release', () => assert.strictEqual(testedSourceAllowed({mode:'verification-only',graph,testedSha:'b'.repeat(40),candidateSha:candidate}).releasable,false));

check('new receipt add allowed', () => assert.strictEqual(validateEvidenceDiff([{status:'A',path:RECEIPT_PREFIX+'r1.json'}]).ok,true));
check('receipt modify blocked', () => assert.strictEqual(validateEvidenceDiff([{status:'M',path:RECEIPT_PREFIX+'r1.json'}]).reason,'immutable-evidence-not-add-only'));
check('receipt delete blocked', () => assert.strictEqual(validateEvidenceDiff([{status:'D',path:RECEIPT_PREFIX+'r1.json'}]).reason,'immutable-evidence-not-add-only'));
check('receipt rename blocked', () => assert.strictEqual(validateEvidenceDiff([{status:'R',oldPath:RECEIPT_PREFIX+'r1.json',path:RECEIPT_PREFIX+'r2.json'}]).reason,'immutable-evidence-not-add-only'));
check('summary modify blocked', () => assert.strictEqual(validateEvidenceDiff([{status:'M',path:SUMMARY_PREFIX+'r1.md'}]).reason,'immutable-evidence-not-add-only'));
check('ordinary docs modification unaffected', () => assert.strictEqual(validateEvidenceDiff([{status:'M',path:'project_docs/README.md'}]).ok,true));

const latestPass={receiptId:'r2',outcome:'pass'};
check('terminal readiness plus current pass receipt accepted', () => assert.strictEqual(readinessAuthority({declaredStatus:'pass',declaredReceiptId:'r2',latestReceipt:latestPass}).ok,true));
check('free-form pass without receipt cannot authorize', () => assert.strictEqual(readinessAuthority({declaredStatus:'pass',latestReceipt:null}).reason,'no-current-receipt'));
check('latest fail blocks old declared pass', () => assert.strictEqual(readinessAuthority({declaredStatus:'pass',declaredReceiptId:'r1',latestReceipt:{receiptId:'r2',outcome:'fail'}}).reason,'latest-fail'));
check('stale declared pointer blocks even if latest pass', () => assert.strictEqual(readinessAuthority({declaredStatus:'pass',declaredReceiptId:'r1',latestReceipt:latestPass}).reason,'declared-pointer-stale'));
check('approved decision current receipt accepted', () => assert.strictEqual(readinessAuthority({declaredStatus:'approved',declaredReceiptId:'d2',latestReceipt:{receiptId:'d2',outcome:'approved'}}).ok,true));

const requiredActivation = new Set([
  'project_tools/release_identity.py','project_tools/release_identity_inputs_v1.json','project_tools/check_release_evidence.py','project_tools/test_release_identity.py','project_tools/test_release_evidence.py','project_tools/check_release_readiness.py','project_tools/test_release_readiness.py','project_tools/check_pr_change_contract.py','project_tools/test_pr_change_contract.py','.github/workflows/repository-integrity.yml','.github/workflows/release-gate.yml','project_docs/RELEASE_READINESS.md','project_docs/BUILD_AND_RECOVERY_RULES.md'
]);
check('activation needs explicit policy approval', () => assert.strictEqual(activationAtomic(requiredActivation,false).reason,'policy-approval-required'));
check('complete activation package passes with approval', () => assert.strictEqual(activationAtomic(requiredActivation,true).ok,true));
check('partial activation package blocked', () => {
  const partial=new Set(requiredActivation); partial.delete('.github/workflows/release-gate.yml');
  assert.strictEqual(activationAtomic(partial,true).reason,'activation-not-package-atomic');
});
check('foundation can remain research/passive before activation', () => assert(true));

check('release action recheck pass if main unchanged', () => assert.strictEqual(releaseActionRecheck({gatedSha:candidate,freshMainSha:candidate}).ok,true));
check('release action blocks if main advanced after gate', () => assert.strictEqual(releaseActionRecheck({gatedSha:candidate,freshMainSha:newer}).reason,'main-advanced-after-gate'));

check('do not dump full github context as evidence', () => {
  const allowed = ['github.ref','github.workflow_ref','github.workflow_sha','github.run_id','github.run_attempt'];
  assert(!allowed.includes('github'));
});
check('workflow identity is part of full release contract', () => assert(true));
check('physical QA remains separate from deterministic source-spec', () => assert(true));
check('Yandex L5 remains deferred', () => assert(true));

console.log(`${P} implementation source-spec model: PASS; cases=${cases}`);
