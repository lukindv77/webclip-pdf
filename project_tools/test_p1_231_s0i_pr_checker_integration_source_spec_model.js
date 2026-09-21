'use strict';

// Research-only deterministic model for P1-231 S0-I PR checker integration.
// It consumes synthetic typed S0-A/S0-B authority views, proves exact merge-candidate
// impact classification and self-modifying-control-plane fences, and does not modify
// production checker/workflow behavior or activate release policy.

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync, spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SCHEMA = 'webclip-pr-impact/v1';
const PACKAGE_SCHEMA = 'webclip-extension-package/v1';
const SOURCE_SCHEMA = 'webclip-source-generation/v1';
const MAX_CHANGES = 10000;
const MAX_PATH_BYTES = 1024;
const HEX40 = /^[0-9a-f]{40}$/;

const PACKAGE_AUTHORITY_SOURCE = 'release_package_manifest_v1.json';
const SOURCE_AUTHORITY_SOURCE = 'release_source_generation_v1.json';
const AUTHORITY_IMPLEMENTATION = Object.freeze([
  'project_tools/release_package_authority.py',
  'project_tools/release_source_generation.py',
]);
const CHECKER_CONTROL_PLANE = Object.freeze([
  'project_tools/release_pr_impact.py',
  'project_tools/check_pr_change_contract.py',
  '.github/workflows/repository-integrity.yml',
]);

const CURRENT_PACKAGE_FILES = Object.freeze([
  'application-generation.js',
  'content-injection-guard.js','content.js','frame-agent.js','frame-proxy-budget-guard.js',
  'frame-proxy-inert-guard.js','host-control-activation-guard.js','journal-import-digest.js',
  'journal-import-stream.js','journal-restore-envelope-guard.js','journal-text-filter.js','journal.css',
  'journal.html','journal.js','local-download-identity.js','manifest.json','offscreen-blob-admission-guard.js',
  'offscreen-bootstrap.js','offscreen.html','offscreen.js','operation-log-redaction-guard.js','options.css',
  'options.html','options.js','pdf-print-guard.js','popup.css','popup.html','popup.js','prepared-save-as.js',
  'public-suffix.js','service-worker.js','yandex-auth-help.css','yandex-auth-help.html','yandex-auth-help.js',
]);
const CURRENT_RELATIONS = Object.freeze([
  Object.freeze({
    id: 'public-suffix-js',
    runtime_profile: 'cpython-3.12.10-v1',
    generator: 'project_tools/build_public_suffix_js.py',
    inputs: Object.freeze(['public_suffix_list.dat']),
    outputs: Object.freeze(['public-suffix.js']),
  }),
]);

let cases = 0;
function check(v, m) { cases += 1; assert(v, m); }
function eq(a, b, m) { cases += 1; assert.strictEqual(a, b, m); }
function deepEq(a, b, m) { cases += 1; assert.deepStrictEqual(a, b, m); }
function throwsCode(fn, code, m) {
  cases += 1;
  assert.throws(fn, (e) => e && e.code === code, m || `expected ${code}`);
}
function fail(code, detail) { const e = new Error(detail || code); e.code = code; throw e; }
function asciiCompare(a, b) { return Buffer.from(a, 'utf8').compare(Buffer.from(b, 'utf8')); }
function sortedUnique(xs) { return [...new Set(xs)].sort(asciiCompare); }
function clone(v) { return structuredClone(v); }
function git(...args) { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim(); }
function sha256(text) { return crypto.createHash('sha256').update(text).digest('hex'); }

function validateSha(v) {
  if (typeof v !== 'string' || !HEX40.test(v)) fail('PR_IMPACT_SHA_INVALID');
  return v;
}

function validatePath(v) {
  if (typeof v !== 'string' || !v || Buffer.byteLength(v, 'utf8') > MAX_PATH_BYTES) fail('PR_IMPACT_PATH_INVALID');
  if (!/^[\x20-\x7e]+$/.test(v) || v.startsWith('/') || v.endsWith('/') || v.includes('\\') || v.includes('//')) fail('PR_IMPACT_PATH_INVALID');
  for (const part of v.split('/')) if (!part || part === '.' || part === '..') fail('PR_IMPACT_PATH_INVALID');
  return v;
}

function stable(value) {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort(asciiCompare).map((k)=>`${JSON.stringify(k)}:${stable(value[k])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function packageView(files = CURRENT_PACKAGE_FILES, digestOverride = null) {
  const canonical = sortedUnique(files.map(validatePath));
  return Object.freeze({
    schema: PACKAGE_SCHEMA,
    files: Object.freeze(canonical),
    topologyDigest: digestOverride || `sha256:${sha256(`pkg\0${canonical.join('\0')}`)}`,
  });
}

function canonicalRelation(raw) {
  if (!raw || typeof raw !== 'object' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(raw.id || '')) fail('PR_IMPACT_SOURCE_GENERATION_TOPOLOGY_INVALID');
  const generator = validatePath(raw.generator);
  const inputs = sortedUnique((raw.inputs || []).map(validatePath));
  const outputs = sortedUnique((raw.outputs || []).map(validatePath));
  if (!outputs.length || typeof raw.runtime_profile !== 'string' || !raw.runtime_profile) fail('PR_IMPACT_SOURCE_GENERATION_TOPOLOGY_INVALID');
  return { id: raw.id, runtime_profile: raw.runtime_profile, generator, inputs, outputs };
}

function sourceView(relations = CURRENT_RELATIONS, digestOverride = null) {
  const canonical = relations.map(canonicalRelation).sort((a,b)=>asciiCompare(a.id,b.id));
  if (new Set(canonical.map((r)=>r.id)).size !== canonical.length) fail('PR_IMPACT_SOURCE_GENERATION_TOPOLOGY_INVALID');
  return Object.freeze({
    schema: SOURCE_SCHEMA,
    relations: Object.freeze(canonical.map(Object.freeze)),
    topologyDigest: digestOverride || `sha256:${sha256(`src\0${stable(canonical)}`)}`,
  });
}

function validatePackageView(v) {
  if (!v || v.schema !== PACKAGE_SCHEMA || !Array.isArray(v.files) || !/^sha256:[0-9a-f]{64}$/.test(v.topologyDigest || '')) fail('PR_IMPACT_PACKAGE_TOPOLOGY_INVALID');
  const sorted = sortedUnique(v.files.map(validatePath));
  if (sorted.length !== v.files.length || !sorted.includes('manifest.json')) fail('PR_IMPACT_PACKAGE_TOPOLOGY_INVALID');
  return { schema:v.schema, files:sorted, topologyDigest:v.topologyDigest };
}

function validateSourceView(v) {
  if (!v || v.schema !== SOURCE_SCHEMA || !Array.isArray(v.relations) || !/^sha256:[0-9a-f]{64}$/.test(v.topologyDigest || '')) fail('PR_IMPACT_SOURCE_GENERATION_TOPOLOGY_INVALID');
  const relations = v.relations.map(canonicalRelation).sort((a,b)=>asciiCompare(a.id,b.id));
  if (new Set(relations.map((r)=>r.id)).size !== relations.length) fail('PR_IMPACT_SOURCE_GENERATION_TOPOLOGY_INVALID');
  return { schema:v.schema, relations, topologyDigest:v.topologyDigest };
}

function normalizeChanges(raw) {
  if (!Array.isArray(raw) || raw.length > MAX_CHANGES) fail('PR_IMPACT_DIFF_FAILED');
  const seen = new Set();
  const out = raw.map((c) => {
    if (!c || !['A','M','D','T'].includes(c.status)) fail('PR_IMPACT_DIFF_STATUS_UNSUPPORTED');
    const p = validatePath(c.path);
    if (seen.has(p)) fail('PR_IMPACT_DUPLICATE_PATH');
    seen.add(p);
    return { status:c.status, path:p };
  });
  return out.sort((a,b)=>asciiCompare(a.path,b.path) || asciiCompare(a.status,b.status));
}

function relationSemanticKey(r) { return stable([r.id,r.runtime_profile,r.generator,r.inputs,r.outputs]); }

function indexRelations(baseRelations, candidateRelations) {
  const roles = { input:new Map(), generator:new Map(), output:new Map() };
  const byBase = new Map(baseRelations.map((r)=>[r.id,r]));
  const byCandidate = new Map(candidateRelations.map((r)=>[r.id,r]));
  function add(role, p, id) {
    if (!roles[role].has(p)) roles[role].set(p,new Set());
    roles[role].get(p).add(id);
  }
  for (const rel of [...baseRelations,...candidateRelations]) {
    add('generator',rel.generator,rel.id);
    for (const p of rel.inputs) add('input',p,rel.id);
    for (const p of rel.outputs) add('output',p,rel.id);
  }
  return { roles, byBase, byCandidate };
}

function affectedRelations(changedSet, baseRelations, candidateRelations) {
  const { roles, byBase, byCandidate } = indexRelations(baseRelations,candidateRelations);
  const ids = new Set();
  const reasons = new Map();
  function reason(id, text) { ids.add(id); if (!reasons.has(id)) reasons.set(id,new Set()); reasons.get(id).add(text); }
  for (const p of changedSet) {
    for (const [role,map] of Object.entries(roles)) {
      for (const id of map.get(p) || []) reason(id,`${role}-path-touched`);
    }
  }
  for (const id of sortedUnique([...byBase.keys(),...byCandidate.keys()])) {
    const b=byBase.get(id), c=byCandidate.get(id);
    if (!b && c) reason(id,'relation-added');
    else if (b && !c) reason(id,'relation-removed');
    else if (relationSemanticKey(b)!==relationSemanticKey(c)) reason(id,'relation-declaration-changed');
  }
  return sortedUnique([...ids]).map((id)=>({ relationId:id, reasons:sortedUnique([...reasons.get(id)]) }));
}

function computeImpact(input) {
  const baseSha = validateSha(input.baseSha);
  const prHeadSha = validateSha(input.prHeadSha);
  const candidateSha = validateSha(input.candidateSha);
  const parents = sortedUnique((input.candidateParents || []).map(validateSha));
  if (parents.length !== 2 || !parents.includes(baseSha) || !parents.includes(prHeadSha)) fail('PR_IMPACT_CANDIDATE_RELATION_INVALID');

  const changes = normalizeChanges(input.changes);
  const bp = validatePackageView(input.basePackage);
  const cp = validatePackageView(input.candidatePackage);
  const bg = validateSourceView(input.baseGeneration);
  const cg = validateSourceView(input.candidateGeneration);
  const changedSet = new Set(changes.map((c)=>c.path));

  const packageUnion = new Set([...bp.files,...cp.files]);
  const packageMemberTouched = [...changedSet].some((p)=>packageUnion.has(p));
  const packageTopologyChanged = bp.topologyDigest !== cp.topologyDigest;
  const sourceGenerationTopologyChanged = bg.topologyDigest !== cg.topologyDigest;

  const rels = affectedRelations(changedSet,bg.relations,cg.relations);
  const { roles } = indexRelations(bg.relations,cg.relations);
  const generationInput = [...changedSet].some((p)=>roles.input.has(p));
  const generationGenerator = [...changedSet].some((p)=>roles.generator.has(p));
  const generatedOutput = [...changedSet].some((p)=>roles.output.has(p));
  const generationClosure = generationInput || generationGenerator || generatedOutput;

  const packageAuthoritySource = changedSet.has(PACKAGE_AUTHORITY_SOURCE);
  const sourceGenerationAuthoritySource = changedSet.has(SOURCE_AUTHORITY_SOURCE);
  const authorityImplementation = AUTHORITY_IMPLEMENTATION.some((p)=>changedSet.has(p));
  const prCheckerControlPlane = CHECKER_CONTROL_PLANE.some((p)=>changedSet.has(p));

  const candidateGenerationVerification = packageMemberTouched || packageTopologyChanged || sourceGenerationTopologyChanged || generationClosure || authorityImplementation;
  const shadowIdentityRecompute = candidateGenerationVerification || prCheckerControlPlane;
  const trustedControlPlaneReview = authorityImplementation || prCheckerControlPlane;
  const automaticClassificationTrusted = !trustedControlPlaneReview;

  return {
    schema: SCHEMA,
    provenance:{baseSha,prHeadSha,candidateSha},
    authority:{
      basePackageTopologyDigest:bp.topologyDigest,
      candidatePackageTopologyDigest:cp.topologyDigest,
      packageTopologyChanged,
      baseSourceGenerationTopologyDigest:bg.topologyDigest,
      candidateSourceGenerationTopologyDigest:cg.topologyDigest,
      sourceGenerationTopologyChanged,
    },
    changedPaths:changes,
    touched:{
      packageMember:packageMemberTouched,
      generationInput,
      generationGenerator,
      generatedOutput,
      generationClosure,
      packageAuthoritySource,
      sourceGenerationAuthoritySource,
      authorityImplementation,
      prCheckerControlPlane,
    },
    affectedGenerationRelations:rels,
    requires:{candidateGenerationVerification,shadowIdentityRecompute,trustedControlPlaneReview},
    trust:{automaticClassificationTrusted},
  };
}

const BASE='a'.repeat(40), HEAD='b'.repeat(40), CAND='c'.repeat(40);
function run(changes, opts={}) {
  return computeImpact({
    baseSha:BASE,prHeadSha:HEAD,candidateSha:CAND,candidateParents:[BASE,HEAD],changes,
    basePackage:opts.basePackage || packageView(),
    candidatePackage:opts.candidatePackage || packageView(),
    baseGeneration:opts.baseGeneration || sourceView(),
    candidateGeneration:opts.candidateGeneration || sourceView(),
  });
}
function C(status,path) { return {status,path}; }

(function main(){
  // Predecessor bootstrap facts are current and exact.
  eq(CURRENT_PACKAGE_FILES.length,33,'S0-A bootstrap package census');
  eq(new Set(CURRENT_PACKAGE_FILES).size,33,'S0-A package members unique');
  eq(CURRENT_RELATIONS.length,1,'S0-B relation census');
  eq(CURRENT_RELATIONS[0].id,'public-suffix-js');
  check(CURRENT_PACKAGE_FILES.includes('public-suffix.js'),'generated target is package member');
  check(!CURRENT_PACKAGE_FILES.includes('public_suffix_list.dat'),'generation input is not package member');
  check(!CURRENT_PACKAGE_FILES.includes('project_tools/build_public_suffix_js.py'),'generator is not package member');

  const exactHead=git('rev-parse','HEAD');
  check(HEX40.test(exactHead),'research checkout exact SHA');
  for (const rel of CURRENT_PACKAGE_FILES) {
    const out=git('ls-tree',exactHead,'--',rel);
    check(/^100644 blob [0-9a-f]{40}\t/.test(out),`package member exact blob: ${rel}`);
  }
  for (const rel of [CURRENT_RELATIONS[0].generator,...CURRENT_RELATIONS[0].inputs,...CURRENT_RELATIONS[0].outputs]) {
    const out=git('ls-tree',exactHead,'--',rel);
    check(/^100644 blob [0-9a-f]{40}\t/.test(out),`generation path exact blob: ${rel}`);
  }

  // Current production checker remains legacy and S0-I is not activated.
  const checker=fs.readFileSync(path.join(ROOT,'project_tools/check_pr_change_contract.py'),'utf8');
  const workflow=fs.readFileSync(path.join(ROOT,'.github/workflows/repository-integrity.yml'),'utf8');
  check(checker.includes('def is_runtime_path('),'legacy runtime classifier present');
  check(checker.includes('RUNTIME_SUFFIXES'),'legacy suffix policy present');
  check(!checker.includes(SCHEMA),'S0-I not active in current checker');
  check(!workflow.includes('PR_CANDIDATE_SHA'),'candidate-aware S0-I not active in canonical workflow');

  // Exact identity and candidate relation fail closed.
  throwsCode(()=>computeImpact({baseSha:'main',prHeadSha:HEAD,candidateSha:CAND,candidateParents:[BASE,HEAD],changes:[],basePackage:packageView(),candidatePackage:packageView(),baseGeneration:sourceView(),candidateGeneration:sourceView()}),'PR_IMPACT_SHA_INVALID');
  throwsCode(()=>computeImpact({baseSha:BASE,prHeadSha:'HEAD',candidateSha:CAND,candidateParents:[BASE,HEAD],changes:[],basePackage:packageView(),candidatePackage:packageView(),baseGeneration:sourceView(),candidateGeneration:sourceView()}),'PR_IMPACT_SHA_INVALID');
  throwsCode(()=>computeImpact({baseSha:BASE,prHeadSha:HEAD,candidateSha:'merge',candidateParents:[BASE,HEAD],changes:[],basePackage:packageView(),candidatePackage:packageView(),baseGeneration:sourceView(),candidateGeneration:sourceView()}),'PR_IMPACT_SHA_INVALID');
  throwsCode(()=>computeImpact({baseSha:BASE,prHeadSha:HEAD,candidateSha:CAND,candidateParents:[BASE,'d'.repeat(40)],changes:[],basePackage:packageView(),candidatePackage:packageView(),baseGeneration:sourceView(),candidateGeneration:sourceView()}),'PR_IMPACT_CANDIDATE_RELATION_INVALID');
  throwsCode(()=>computeImpact({baseSha:BASE,prHeadSha:HEAD,candidateSha:CAND,candidateParents:[BASE,HEAD,'d'.repeat(40)],changes:[],basePackage:packageView(),candidatePackage:packageView(),baseGeneration:sourceView(),candidateGeneration:sourceView()}),'PR_IMPACT_CANDIDATE_RELATION_INVALID');

  // Diff normalization deliberately has no rename heuristic.
  for (const s of ['A','M','D','T']) eq(run([C(s,'content.js')]).changedPaths[0].status,s,`status ${s}`);
  throwsCode(()=>run([C('R','content.js')]),'PR_IMPACT_DIFF_STATUS_UNSUPPORTED');
  throwsCode(()=>run([C('C','copy.js')]),'PR_IMPACT_DIFF_STATUS_UNSUPPORTED');
  throwsCode(()=>run([C('M','../x.js')]),'PR_IMPACT_PATH_INVALID');
  throwsCode(()=>run([C('M','x.js'),C('A','x.js')]),'PR_IMPACT_DUPLICATE_PATH');
  throwsCode(()=>run(new Array(MAX_CHANGES+1).fill(0).map((_,i)=>C('A',`x${i}.js`))),'PR_IMPACT_DIFF_FAILED');

  // Docs-only path is not S0-I package/generation impact.
  const docs=run([C('M','README.md')]);
  eq(docs.touched.packageMember,false);
  eq(docs.touched.generationClosure,false);
  eq(docs.requires.candidateGenerationVerification,false);
  eq(docs.requires.shadowIdentityRecompute,false);
  eq(docs.trust.automaticClassificationTrusted,true);

  // Input ordering cannot change output.
  deepEq(run([C('M','README.md'),C('M','content.js')]),run([C('M','content.js'),C('M','README.md')]),'diff order invariance');

  // Package member touched under base+candidate union.
  const pm=run([C('M','content.js')]);
  eq(pm.touched.packageMember,true);
  eq(pm.requires.candidateGenerationVerification,true);
  eq(pm.requires.shadowIdentityRecompute,true);

  // Package delete evasion: candidate removed member, base union catches deleted path.
  const cpWithout=packageView(CURRENT_PACKAGE_FILES.filter((p)=>p!=='content.js'));
  const del=run([C('D','content.js')],{candidatePackage:cpWithout});
  eq(del.authority.packageTopologyChanged,true);
  eq(del.touched.packageMember,true);
  eq(del.requires.candidateGenerationVerification,true);

  // Package add detected from candidate view.
  const cpWith=packageView([...CURRENT_PACKAGE_FILES,'new-runtime.js']);
  const add=run([C('A','new-runtime.js')],{candidatePackage:cpWith});
  eq(add.authority.packageTopologyChanged,true);
  eq(add.touched.packageMember,true);

  // Rename is exact D+A, not R similarity semantics.
  const bpRename=packageView([...CURRENT_PACKAGE_FILES.filter((p)=>p!=='content.js'),'old-runtime.js']);
  const cpRename=packageView([...CURRENT_PACKAGE_FILES.filter((p)=>p!=='content.js'),'new-runtime.js']);
  const ren=run([C('D','old-runtime.js'),C('A','new-runtime.js')],{basePackage:bpRename,candidatePackage:cpRename});
  eq(ren.touched.packageMember,true);
  eq(ren.changedPaths.length,2);

  // Nonmember root JS demonstrates release package != legacy runtime suffix policy.
  const nonmember=run([C('M','diagnostic.js')]);
  eq(nonmember.touched.packageMember,false);
  eq(nonmember.requires.candidateGenerationVerification,false);
  check(checker.includes('.js'),'legacy checker can still classify root JS independently');

  // Generation roles are consumed from explicit S0-B relation only.
  for (const [p,key] of [
    ['public_suffix_list.dat','generationInput'],
    ['project_tools/build_public_suffix_js.py','generationGenerator'],
    ['public-suffix.js','generatedOutput'],
  ]) {
    const x=run([C('M',p)]);
    eq(x.touched[key],true,`${p} role`);
    eq(x.touched.generationClosure,true,`${p} closure`);
    eq(x.affectedGenerationRelations.length,1,`${p} relation`);
    eq(x.affectedGenerationRelations[0].relationId,'public-suffix-js');
    eq(x.requires.candidateGenerationVerification,true);
  }
  const unrelatedBuilder=run([C('M','project_tools/build_recovery_archive.py')]);
  eq(unrelatedBuilder.touched.generationClosure,false,'build_* heuristic forbidden');

  // Relation removal remains visible even if candidate declaration disappears.
  const removed=run([C('D','project_tools/build_public_suffix_js.py')],{candidateGeneration:sourceView([])});
  eq(removed.authority.sourceGenerationTopologyChanged,true);
  eq(removed.touched.generationGenerator,true);
  check(removed.affectedGenerationRelations[0].reasons.includes('relation-removed'),'removed relation reason');
  check(removed.affectedGenerationRelations[0].reasons.includes('generator-path-touched'),'old generator union reason');

  // Relation addition detected from candidate view.
  const second={id:'second-gen',runtime_profile:'cpython-3.12.10-v1',generator:'project_tools/gen_second.py',inputs:['second.dat'],outputs:['second.js']};
  const addedRel=run([C('A','second.dat')],{candidateGeneration:sourceView([...CURRENT_RELATIONS,second])});
  eq(addedRel.authority.sourceGenerationTopologyChanged,true);
  check(addedRel.affectedGenerationRelations.some((r)=>r.relationId==='second-gen'&&r.reasons.includes('relation-added')),'new relation reported');
  eq(addedRel.touched.generationInput,true);

  // Same relation id with changed paths/profile is semantic topology change.
  const changed=clone(CURRENT_RELATIONS[0]); changed.generator='project_tools/new_psl.py'; changed.inputs=['new_psl.dat'];
  const changedRel=run([C('D','project_tools/build_public_suffix_js.py'),C('A','project_tools/new_psl.py')],{candidateGeneration:sourceView([changed])});
  eq(changedRel.authority.sourceGenerationTopologyChanged,true);
  check(changedRel.affectedGenerationRelations[0].reasons.includes('relation-declaration-changed'),'declaration change reason');
  eq(changedRel.touched.generationGenerator,true);

  // Authority source formatting-only touches remain provenance, not semantic topology change.
  const pkgFmt=run([C('M',PACKAGE_AUTHORITY_SOURCE)]);
  eq(pkgFmt.touched.packageAuthoritySource,true);
  eq(pkgFmt.authority.packageTopologyChanged,false);
  eq(pkgFmt.requires.candidateGenerationVerification,false);
  const srcFmt=run([C('M',SOURCE_AUTHORITY_SOURCE)]);
  eq(srcFmt.touched.sourceGenerationAuthoritySource,true);
  eq(srcFmt.authority.sourceGenerationTopologyChanged,false);
  eq(srcFmt.requires.candidateGenerationVerification,false);

  // Semantic authority change requires later candidate-generation verification even without direct package path diff.
  const semanticPkg=run([C('M',PACKAGE_AUTHORITY_SOURCE)],{candidatePackage:packageView([...CURRENT_PACKAGE_FILES,'new-runtime.js'])});
  eq(semanticPkg.authority.packageTopologyChanged,true);
  eq(semanticPkg.requires.candidateGenerationVerification,true);
  const semanticSrc=run([C('M',SOURCE_AUTHORITY_SOURCE)],{candidateGeneration:sourceView([])});
  eq(semanticSrc.authority.sourceGenerationTopologyChanged,true);
  eq(semanticSrc.requires.candidateGenerationVerification,true);

  // Control-plane self-change cannot self-certify automatic trust.
  for (const p of AUTHORITY_IMPLEMENTATION) {
    const x=run([C('M',p)]);
    eq(x.touched.authorityImplementation,true,p);
    eq(x.requires.trustedControlPlaneReview,true,p);
    eq(x.trust.automaticClassificationTrusted,false,p);
    eq(x.requires.candidateGenerationVerification,true,p);
  }
  for (const p of CHECKER_CONTROL_PLANE) {
    const x=run([C('M',p)]);
    eq(x.touched.prCheckerControlPlane,true,p);
    eq(x.requires.trustedControlPlaneReview,true,p);
    eq(x.trust.automaticClassificationTrusted,false,p);
    eq(x.requires.shadowIdentityRecompute,true,p);
  }

  // Typed predecessor-view validation is fail closed, not heuristic fallback.
  throwsCode(()=>run([], {basePackage:{schema:'bad',files:['manifest.json'],topologyDigest:`sha256:${'0'.repeat(64)}`}}),'PR_IMPACT_PACKAGE_TOPOLOGY_INVALID');
  throwsCode(()=>run([], {candidateGeneration:{schema:'bad',relations:[],topologyDigest:`sha256:${'0'.repeat(64)}`}}),'PR_IMPACT_SOURCE_GENERATION_TOPOLOGY_INVALID');
  throwsCode(()=>run([], {basePackage:{schema:PACKAGE_SCHEMA,files:['manifest.json','manifest.json'],topologyDigest:`sha256:${'0'.repeat(64)}`}}),'PR_IMPACT_PACKAGE_TOPOLOGY_INVALID');

  // S0-I never leaks identity/admission/readiness authority.
  const sample=run([C('M','content.js')]);
  const serialized=JSON.stringify(sample);
  for (const forbidden of ['"rpf"','"qcf"','"rcf"','"bcf"','"admitted"','"generationPass"','"releaseReady"','"approvedForRelease"','"officialArtifact"','"tag"','"releaseId"','"deploymentId"']) {
    check(!serialized.includes(forbidden),`forbidden authority field ${forbidden}`);
  }
  check(!Object.prototype.hasOwnProperty.call(sample,'currentGate'),'S0-F current gate not copied into S0-I result');

  // Current S0-A package truth stays explicit in this fixture while package authority remains separate.
  eq(CURRENT_PACKAGE_FILES.length,34,'current package file count');
  check(CURRENT_PACKAGE_FILES.includes('application-generation.js'),'current package includes application-generation.js');

  // Research result digest is diagnostic only.
  const diagDigest=sha256(stable(sample));
  check(/^[0-9a-f]{64}$/.test(diagDigest),'diagnostic digest shape');

  // Run predecessor models as composition smoke tests on this exact checkout.
  const predecessorOutputs=new Map();
  for (const test of [
    'test_p1_231_s0a_package_authority_source_spec_model.js',
    'test_p1_231_s0b_source_generation_authority_source_spec_model.js',
    'test_p1_231_s0b_strict_parser_composition_refinement_model.js',
    'test_p1_231_s0f_candidate_generation_verifier_source_spec_model.js',
  ]) {
    const p=spawnSync(process.execPath,[path.join(ROOT,'project_tools',test)],{encoding:'utf8'});
    eq(p.status,0,`${test} predecessor status`);
    check(/PASS/.test(p.stdout),`${test} predecessor PASS`);
    predecessorOutputs.set(test,p.stdout);
  }
  check(/package_files=34/.test(predecessorOutputs.get('test_p1_231_s0a_package_authority_source_spec_model.js')),'S0-A current 34-file package truth');
  check(/current_gate=pass/.test(predecessorOutputs.get('test_p1_231_s0f_candidate_generation_verifier_source_spec_model.js')),'S0-F current admission truth');

  console.log(
    `P1-231 S0-I PR checker integration source-spec model: PASS; cases=${cases}; schema=${SCHEMA}; `+
    `package_files=${CURRENT_PACKAGE_FILES.length}; relations=${CURRENT_RELATIONS.length}; `+
    `base_candidate_union=true; synthetic_merge_identity=required; no_renames=true; `+
    `self_change=fail-closed; admission_owner=s0f; current_s0f_gate=pass; `+
    `production_checker_unchanged=true; head=${exactHead}`
  );
})();
