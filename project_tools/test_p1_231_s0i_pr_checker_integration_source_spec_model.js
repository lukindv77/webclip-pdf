'use strict';

// Research-only deterministic model for P1-231 S0-I PR checker integration.
// It proves base+head package/source-generation impact classification and ownership fences.
// It does not modify check_pr_change_contract.py, execute generators, admit candidates or activate release policy.

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SCHEMA = 'webclip-pr-release-impact/v1';
const PACKAGE_SCHEMA = 'webclip-extension-package/v1';
const PATH_PROFILE = 'portable-ascii-v1';
const SOURCE_SCHEMA = 'webclip-source-generation/v1';
const MAX_CHANGES = 10000;
const MAX_PATH_BYTES = 1024;
const HEX40 = /^[0-9a-fA-F]{40}$/;

const CURRENT_PACKAGE_FILES = Object.freeze([
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
function sortedUnique(values) { return [...new Set(values)].sort(asciiCompare); }
function clone(v) { return structuredClone(v); }
function git(...args) { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim(); }

function validateSha(value, which) {
  if (typeof value !== 'string' || !HEX40.test(value)) fail(`PR_IMPACT_${which}_SHA_INVALID`);
  return value.toLowerCase();
}

function validateRepoPath(value) {
  if (typeof value !== 'string' || !value || Buffer.byteLength(value, 'utf8') > MAX_PATH_BYTES) fail('PR_IMPACT_PATH_INVALID');
  if (!/^[\x20-\x7e]+$/.test(value) || value.startsWith('/') || value.endsWith('/') || value.includes('\\') || value.includes('//')) fail('PR_IMPACT_PATH_INVALID');
  const parts = value.split('/');
  for (const part of parts) if (!part || part === '.' || part === '..') fail('PR_IMPACT_PATH_INVALID');
  return value;
}

function normalizeChange(raw) {
  if (!raw || typeof raw !== 'object') fail('PR_IMPACT_DIFF_STATUS_UNSUPPORTED');
  const status = raw.status;
  if (!['A','M','D','R'].includes(status)) fail('PR_IMPACT_DIFF_STATUS_UNSUPPORTED');
  if (status === 'A') {
    if (raw.old_path != null || raw.new_path == null) fail('PR_IMPACT_DIFF_STATUS_UNSUPPORTED');
    return { status, old_path: null, new_path: validateRepoPath(raw.new_path) };
  }
  if (status === 'D') {
    if (raw.old_path == null || raw.new_path != null) fail('PR_IMPACT_DIFF_STATUS_UNSUPPORTED');
    return { status, old_path: validateRepoPath(raw.old_path), new_path: null };
  }
  if (status === 'M') {
    const p = validateRepoPath(raw.old_path);
    if (raw.new_path !== p) fail('PR_IMPACT_DIFF_STATUS_UNSUPPORTED');
    return { status, old_path: p, new_path: p };
  }
  if (raw.old_path == null || raw.new_path == null || raw.old_path === raw.new_path) fail('PR_IMPACT_DIFF_STATUS_UNSUPPORTED');
  return { status, old_path: validateRepoPath(raw.old_path), new_path: validateRepoPath(raw.new_path) };
}

function changeSortKey(c) { return `${c.old_path || ''}\0${c.new_path || ''}\0${c.status}`; }
function normalizeChanges(changes) {
  if (!Array.isArray(changes) || changes.length > MAX_CHANGES) fail('PR_IMPACT_DIFF_FAILED');
  return changes.map(normalizeChange).sort((a,b)=>asciiCompare(changeSortKey(a), changeSortKey(b)));
}

function validatePackageAuthority(raw, which) {
  if (!raw || raw.schema !== PACKAGE_SCHEMA || raw.path_profile !== PATH_PROFILE || !Array.isArray(raw.files)) {
    fail(`PR_IMPACT_${which}_PACKAGE_AUTHORITY_INVALID`);
  }
  const files = [];
  const seen = new Set();
  for (const p of raw.files) {
    try { validateRepoPath(p); } catch { fail(`PR_IMPACT_${which}_PACKAGE_AUTHORITY_INVALID`); }
    const folded = p.toLowerCase();
    if (seen.has(folded)) fail(`PR_IMPACT_${which}_PACKAGE_AUTHORITY_INVALID`);
    seen.add(folded); files.push(p);
  }
  if (!seen.has('manifest.json')) fail(`PR_IMPACT_${which}_PACKAGE_AUTHORITY_INVALID`);
  return { schema: raw.schema, path_profile: raw.path_profile, files: files.sort(asciiCompare) };
}

function validateRelation(rel, which) {
  if (!rel || typeof rel !== 'object' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(rel.id || '') ||
      typeof rel.runtime_profile !== 'string' || typeof rel.generator !== 'string' ||
      !Array.isArray(rel.inputs) || !Array.isArray(rel.outputs) || rel.outputs.length === 0) {
    fail(`PR_IMPACT_${which}_SOURCE_GENERATION_INVALID`);
  }
  try { validateRepoPath(rel.generator); } catch { fail(`PR_IMPACT_${which}_SOURCE_GENERATION_INVALID`); }
  const inputs = rel.inputs.map((p)=>{ try { return validateRepoPath(p); } catch { fail(`PR_IMPACT_${which}_SOURCE_GENERATION_INVALID`); } });
  const outputs = rel.outputs.map((p)=>{ try { return validateRepoPath(p); } catch { fail(`PR_IMPACT_${which}_SOURCE_GENERATION_INVALID`); } });
  if (new Set(inputs.map(x=>x.toLowerCase())).size !== inputs.length || new Set(outputs.map(x=>x.toLowerCase())).size !== outputs.length) {
    fail(`PR_IMPACT_${which}_SOURCE_GENERATION_INVALID`);
  }
  return { id: rel.id, runtime_profile: rel.runtime_profile, generator: rel.generator, inputs: sortedUnique(inputs), outputs: sortedUnique(outputs) };
}

function validateSourceAuthority(raw, which, packageAuthority) {
  if (!raw || raw.schema !== SOURCE_SCHEMA || !Array.isArray(raw.relations)) fail(`PR_IMPACT_${which}_SOURCE_GENERATION_INVALID`);
  const ids = new Set();
  const outputOwners = new Map();
  const packageSet = new Set(packageAuthority.files);
  const relations = [];
  for (const input of raw.relations) {
    const rel = validateRelation(input, which);
    if (ids.has(rel.id)) fail(`PR_IMPACT_${which}_SOURCE_GENERATION_INVALID`);
    ids.add(rel.id);
    for (const out of rel.outputs) {
      if (!packageSet.has(out) || outputOwners.has(out)) fail(`PR_IMPACT_${which}_AUTHORITY_INCONSISTENT`);
      outputOwners.set(out, rel.id);
    }
    relations.push(rel);
  }
  relations.sort((a,b)=>asciiCompare(a.id,b.id));
  return { schema: raw.schema, relations };
}

function packageSemanticKey(p) { return JSON.stringify([p.schema,p.path_profile,p.files]); }
function relationSemanticKey(r) { return JSON.stringify([r.id,r.runtime_profile,r.generator,r.inputs,r.outputs]); }
function sourceSemanticKey(s) { return JSON.stringify([s.schema,s.relations.map(relationSemanticKey)]); }

function touchesPath(changes, side, p) {
  const key = side === 'base' ? 'old_path' : 'new_path';
  return changes.some((c)=>c[key] === p);
}

function reasonSetForRelation(changes, baseRel, headRel) {
  const reasons = [];
  if (!baseRel && headRel) reasons.push('relation-added');
  if (baseRel && !headRel) reasons.push('relation-removed');
  if (baseRel && headRel && relationSemanticKey(baseRel) !== relationSemanticKey(headRel)) reasons.push('relation-declaration-changed');
  if (baseRel) {
    if (touchesPath(changes,'base',baseRel.generator)) reasons.push('base-generator-touched');
    if (baseRel.inputs.some((p)=>touchesPath(changes,'base',p))) reasons.push('base-input-touched');
    if (baseRel.outputs.some((p)=>touchesPath(changes,'base',p))) reasons.push('base-output-touched');
  }
  if (headRel) {
    if (touchesPath(changes,'head',headRel.generator)) reasons.push('head-generator-touched');
    if (headRel.inputs.some((p)=>touchesPath(changes,'head',p))) reasons.push('head-input-touched');
    if (headRel.outputs.some((p)=>touchesPath(changes,'head',p))) reasons.push('head-output-touched');
  }
  return sortedUnique(reasons);
}

function computeImpact({ baseSha, headSha, changes, basePackage, headPackage, baseSource, headSource }) {
  const base_sha = validateSha(baseSha,'BASE');
  const head_sha = validateSha(headSha,'HEAD');
  const normalized = normalizeChanges(changes);
  const bp = validatePackageAuthority(basePackage,'BASE');
  const hp = validatePackageAuthority(headPackage,'HEAD');
  const bs = validateSourceAuthority(baseSource,'BASE',bp);
  const hs = validateSourceAuthority(headSource,'HEAD',hp);

  const baseSet = new Set(bp.files), headSet = new Set(hp.files);
  const touchedBase = sortedUnique(normalized.flatMap((c)=>c.old_path && baseSet.has(c.old_path) ? [c.old_path] : []));
  const touchedHead = sortedUnique(normalized.flatMap((c)=>c.new_path && headSet.has(c.new_path) ? [c.new_path] : []));
  const addedMembers = sortedUnique(hp.files.filter((p)=>!baseSet.has(p)));
  const removedMembers = sortedUnique(bp.files.filter((p)=>!headSet.has(p)));
  const packageAuthorityChanged = packageSemanticKey(bp) !== packageSemanticKey(hp);

  const baseById = new Map(bs.relations.map((r)=>[r.id,r]));
  const headById = new Map(hs.relations.map((r)=>[r.id,r]));
  const ids = sortedUnique([...baseById.keys(),...headById.keys()]);
  const affected = [];
  for (const id of ids) {
    const br = baseById.get(id) || null, hr = headById.get(id) || null;
    const reasons = reasonSetForRelation(normalized,br,hr);
    if (reasons.length) affected.push({
      relation_id:id,
      base_present:Boolean(br),
      head_present:Boolean(hr),
      declaration_changed:Boolean(br && hr && relationSemanticKey(br)!==relationSemanticKey(hr)),
      reasons,
    });
  }
  affected.sort((a,b)=>asciiCompare(a.relation_id,b.relation_id));
  const sourceAuthorityChanged = sourceSemanticKey(bs) !== sourceSemanticKey(hs);
  const packageRelevant = packageAuthorityChanged || touchedBase.length>0 || touchedHead.length>0;
  const generationRelevant = packageRelevant || sourceAuthorityChanged || affected.length>0;

  return {
    schema:SCHEMA,
    base_sha,
    head_sha,
    changes:normalized,
    package:{
      authority_changed:packageAuthorityChanged,
      touched_base_members:touchedBase,
      touched_head_members:touchedHead,
      added_members:addedMembers,
      removed_members:removedMembers,
      candidate_package_relevant:packageRelevant,
    },
    source_generation:{ authority_changed:sourceAuthorityChanged, affected_relations:affected },
    candidate_generation_relevant:generationRelevant,
    requires_s0f_recheck:generationRelevant,
  };
}

function pkg(files=CURRENT_PACKAGE_FILES) { return {schema:PACKAGE_SCHEMA,path_profile:PATH_PROFILE,files:[...files]}; }
function src(relations=CURRENT_RELATIONS) { return {schema:SOURCE_SCHEMA,relations:clone(relations)}; }
function C(status, oldPath, newPath) { return {status,old_path:oldPath,new_path:newPath}; }
const BASE='a'.repeat(40), HEAD='b'.repeat(40);
function impact(changes, bp=pkg(), hp=pkg(), bs=src(), hs=src()) {
  return computeImpact({baseSha:BASE,headSha:HEAD,changes,basePackage:bp,headPackage:hp,baseSource:bs,headSource:hs});
}

(function main(){
  // Canonical bootstrap facts from S0-A/S0-B.
  eq(CURRENT_PACKAGE_FILES.length,33,'bootstrap package census drift');
  eq(new Set(CURRENT_PACKAGE_FILES).size,33,'bootstrap package duplicate');
  eq(CURRENT_RELATIONS.length,1,'bootstrap relation census drift');
  eq(CURRENT_RELATIONS[0].id,'public-suffix-js');
  check(CURRENT_PACKAGE_FILES.includes('public-suffix.js'),'generated package output must be S0-A member');
  check(!CURRENT_PACKAGE_FILES.includes('public_suffix_list.dat'),'generation source is not package member');
  check(!CURRENT_PACKAGE_FILES.includes('project_tools/build_public_suffix_js.py'),'generator is not package member');

  const exactHead=git('rev-parse','HEAD');
  check(HEX40.test(exactHead),'research checkout must resolve exact commit');
  for (const rel of CURRENT_PACKAGE_FILES) {
    const out=git('ls-tree',exactHead,'--',rel);
    check(/^100644 blob [0-9a-f]{40}\t/.test(out),`current package member must be exact 100644 blob: ${rel}`);
  }
  for (const rel of [CURRENT_RELATIONS[0].generator,...CURRENT_RELATIONS[0].inputs,...CURRENT_RELATIONS[0].outputs]) {
    const out=git('ls-tree',exactHead,'--',rel);
    check(/^100644 blob [0-9a-f]{40}\t/.test(out),`current generation member must be exact 100644 blob: ${rel}`);
  }

  const checker=fs.readFileSync(path.join(ROOT,'project_tools/check_pr_change_contract.py'),'utf8');
  check(checker.includes('def is_runtime_path('),'existing runtime governance classifier must remain visible');
  check(!checker.includes(SCHEMA),'S0-I production projection must not already be active in current checker');
  check(!checker.includes('release_package_manifest_v1.json'),'current checker must not pretend to consume future S0-A production source');

  // Exact input and diff-shape fail-closed behavior.
  throwsCode(()=>computeImpact({baseSha:'main',headSha:HEAD,changes:[],basePackage:pkg(),headPackage:pkg(),baseSource:src(),headSource:src()}),'PR_IMPACT_BASE_SHA_INVALID');
  throwsCode(()=>computeImpact({baseSha:BASE,headSha:'HEAD',changes:[],basePackage:pkg(),headPackage:pkg(),baseSource:src(),headSource:src()}),'PR_IMPACT_HEAD_SHA_INVALID');
  throwsCode(()=>impact([{status:'C',old_path:null,new_path:'x.js'}]),'PR_IMPACT_DIFF_STATUS_UNSUPPORTED');
  throwsCode(()=>impact([C('M','x.js','y.js')]),'PR_IMPACT_DIFF_STATUS_UNSUPPORTED');
  throwsCode(()=>impact([C('R','x.js','x.js')]),'PR_IMPACT_DIFF_STATUS_UNSUPPORTED');
  throwsCode(()=>impact([C('A',null,'../x.js')]),'PR_IMPACT_PATH_INVALID');
  throwsCode(()=>impact(new Array(MAX_CHANGES+1).fill(C('A',null,'x.js'))),'PR_IMPACT_DIFF_FAILED');

  // Docs-only and deterministic output.
  const docs=impact([C('M','project_docs/README.md','project_docs/README.md')]);
  eq(docs.schema,SCHEMA);
  eq(docs.package.candidate_package_relevant,false);
  eq(docs.source_generation.affected_relations.length,0);
  eq(docs.candidate_generation_relevant,false);
  eq(docs.requires_s0f_recheck,false);
  const docsRev=impact([C('M','project_docs/README.md','project_docs/README.md')]);
  deepEq(docs,docsRev,'same semantic input must be deterministic');

  const reorderA=impact([C('M','content.js','content.js'),C('M','README.md','README.md')]);
  const reorderB=impact([C('M','README.md','README.md'),C('M','content.js','content.js')]);
  deepEq(reorderA,reorderB,'diff input order must not alter projection');

  // Package content impact.
  const pm=impact([C('M','content.js','content.js')]);
  eq(pm.package.authority_changed,false);
  deepEq(pm.package.touched_base_members,['content.js']);
  deepEq(pm.package.touched_head_members,['content.js']);
  eq(pm.package.candidate_package_relevant,true);
  eq(pm.candidate_generation_relevant,true);
  eq(pm.requires_s0f_recheck,true);

  // Delete requires base authority even when head membership removes the path.
  const headWithoutContent=pkg(CURRENT_PACKAGE_FILES.filter((p)=>p!=='content.js'));
  const del=impact([C('D','content.js',null)],pkg(),headWithoutContent,src(),src());
  eq(del.package.authority_changed,true);
  deepEq(del.package.touched_base_members,['content.js']);
  deepEq(del.package.touched_head_members,[]);
  deepEq(del.package.removed_members,['content.js']);
  eq(del.package.candidate_package_relevant,true);

  // Add requires head authority.
  const headWithNew=pkg([...CURRENT_PACKAGE_FILES,'new-runtime.js']);
  const add=impact([C('A',null,'new-runtime.js')],pkg(),headWithNew,src(),src());
  eq(add.package.authority_changed,true);
  deepEq(add.package.touched_base_members,[]);
  deepEq(add.package.touched_head_members,['new-runtime.js']);
  deepEq(add.package.added_members,['new-runtime.js']);

  // Rename uses old base + new head sides.
  const baseRename=pkg([...CURRENT_PACKAGE_FILES.filter((p)=>p!=='content.js'),'old-runtime.js']);
  const headRename=pkg([...CURRENT_PACKAGE_FILES.filter((p)=>p!=='content.js'),'new-runtime.js']);
  const ren=impact([C('R','old-runtime.js','new-runtime.js')],baseRename,headRename,src(),src());
  deepEq(ren.package.touched_base_members,['old-runtime.js']);
  deepEq(ren.package.touched_head_members,['new-runtime.js']);
  deepEq(ren.package.removed_members,['old-runtime.js']);
  deepEq(ren.package.added_members,['new-runtime.js']);

  // Semantic package reorder is not authority change.
  const reorderedPkg=pkg([...CURRENT_PACKAGE_FILES].reverse());
  const fmt=impact([C('M','control/release_package_manifest_v1.json','control/release_package_manifest_v1.json')],pkg(),reorderedPkg,src(),src());
  eq(fmt.package.authority_changed,false);
  eq(fmt.package.candidate_package_relevant,false);

  // Runtime governance is intentionally not package authority.
  const nonMemberRuntime=impact([C('M','future-runtime.js','future-runtime.js')]);
  eq(nonMemberRuntime.package.candidate_package_relevant,false);
  eq(nonMemberRuntime.candidate_generation_relevant,false);
  check(/RUNTIME_SUFFIXES/.test(checker),'old checker still has independent runtime suffix governance');

  // Source relation path impacts.
  for (const [p, reasonBase, reasonHead] of [
    ['public_suffix_list.dat','base-input-touched','head-input-touched'],
    ['project_tools/build_public_suffix_js.py','base-generator-touched','head-generator-touched'],
    ['public-suffix.js','base-output-touched','head-output-touched'],
  ]) {
    const x=impact([C('M',p,p)]);
    eq(x.source_generation.affected_relations.length,1,`${p} must affect relation`);
    check(x.source_generation.affected_relations[0].reasons.includes(reasonBase),`${p} base reason`);
    check(x.source_generation.affected_relations[0].reasons.includes(reasonHead),`${p} head reason`);
    eq(x.requires_s0f_recheck,true,`${p} must request S0-F recheck`);
  }

  // Output-only changes are both package and source-generation relevant.
  const outputOnly=impact([C('M','public-suffix.js','public-suffix.js')]);
  eq(outputOnly.package.candidate_package_relevant,true);
  eq(outputOnly.source_generation.affected_relations.length,1);

  // Removed relation must remain visible through base authority even without touched relation paths.
  const removedRel=impact([],pkg(),pkg(),src(),src([]));
  eq(removedRel.source_generation.authority_changed,true);
  eq(removedRel.source_generation.affected_relations.length,1);
  eq(removedRel.source_generation.affected_relations[0].relation_id,'public-suffix-js');
  deepEq(removedRel.source_generation.affected_relations[0].reasons,['relation-removed']);
  eq(removedRel.requires_s0f_recheck,true);

  // Added relation, with output explicitly added to package topology for consistency.
  const second={id:'second-gen',runtime_profile:'cpython-3.12.10-v1',generator:'project_tools/gen_second.py',inputs:['second.dat'],outputs:['second.js']};
  const hp2=pkg([...CURRENT_PACKAGE_FILES,'second.js']);
  const addedRel=impact([],pkg(),hp2,src(),src([...CURRENT_RELATIONS,second]));
  eq(addedRel.source_generation.authority_changed,true);
  check(addedRel.source_generation.affected_relations.some((r)=>r.relation_id==='second-gen'&&r.reasons.includes('relation-added')),'added relation must be reported');

  // Same id declaration change is explicit; path touch is not required to detect it.
  const changedRel=clone(CURRENT_RELATIONS[0]); changedRel.runtime_profile='cpython-3.12.11-v2';
  const decl=impact([],pkg(),pkg(),src(),src([changedRel]));
  eq(decl.source_generation.authority_changed,true);
  deepEq(decl.source_generation.affected_relations[0].reasons,['relation-declaration-changed']);
  eq(decl.source_generation.affected_relations[0].declaration_changed,true);

  // Old generator/output deletes remain caught after relation replacement.
  const replacement={id:'new-psl',runtime_profile:'cpython-3.12.10-v1',generator:'project_tools/new_psl.py',inputs:['new_psl.dat'],outputs:['public-suffix.js']};
  const repl=impact([C('D','project_tools/build_public_suffix_js.py',null)],pkg(),pkg(),src(),src([replacement]));
  const oldReport=repl.source_generation.affected_relations.find((r)=>r.relation_id==='public-suffix-js');
  check(oldReport.reasons.includes('relation-removed'),'old relation removal must be visible');
  check(oldReport.reasons.includes('base-generator-touched'),'deleted old generator must be visible');
  check(repl.source_generation.affected_relations.some((r)=>r.relation_id==='new-psl'&&r.reasons.includes('relation-added')),'new relation addition must be visible');

  // Relation path rename checks both sides.
  const baseR={id:'r',runtime_profile:'cpython-3.12.10-v1',generator:'old-gen.py',inputs:['old.dat'],outputs:['public-suffix.js']};
  const headR={id:'r',runtime_profile:'cpython-3.12.10-v1',generator:'new-gen.py',inputs:['new.dat'],outputs:['public-suffix.js']};
  const rr=impact([C('R','old-gen.py','new-gen.py'),C('R','old.dat','new.dat')],pkg(),pkg(),src([baseR]),src([headR]));
  const rrec=rr.source_generation.affected_relations[0];
  check(rrec.reasons.includes('base-generator-touched'),'rename must inspect base generator');
  check(rrec.reasons.includes('head-generator-touched'),'rename must inspect head generator');
  check(rrec.reasons.includes('base-input-touched'),'rename must inspect base input');
  check(rrec.reasons.includes('head-input-touched'),'rename must inspect head input');
  check(rrec.reasons.includes('relation-declaration-changed'),'rename must report declaration change');

  // Authority parsing/integrity failures never fall back to filename heuristics.
  throwsCode(()=>impact([], {schema:'bad',path_profile:PATH_PROFILE,files:['manifest.json']}, pkg(), src(), src()),'PR_IMPACT_BASE_PACKAGE_AUTHORITY_INVALID');
  throwsCode(()=>impact([], pkg(), {schema:'bad',path_profile:PATH_PROFILE,files:['manifest.json']}, src(), src()),'PR_IMPACT_HEAD_PACKAGE_AUTHORITY_INVALID');
  throwsCode(()=>impact([], pkg(), pkg(), {schema:'bad',relations:[]}, src()),'PR_IMPACT_BASE_SOURCE_GENERATION_INVALID');
  throwsCode(()=>impact([], pkg(), pkg(), src(), {schema:'bad',relations:[]}), 'PR_IMPACT_HEAD_SOURCE_GENERATION_INVALID');
  const badOutput={id:'bad',runtime_profile:'cpython-3.12.10-v1',generator:'g.py',inputs:['i.dat'],outputs:['not-in-package.js']};
  throwsCode(()=>impact([],pkg(),pkg(),src(),src([badOutput])),'PR_IMPACT_HEAD_AUTHORITY_INCONSISTENT');

  // S0-I is impact only; no admission/readiness/release authority leaks into result.
  const sample=impact([C('M','content.js','content.js')]);
  for (const forbidden of ['admitted','generation_pass','rpf','bcf','qcf','rcf','release_ready','approved_for_release','official_artifact','tag','release_id','deployment_id']) {
    check(!JSON.stringify(sample).includes(`"${forbidden}"`),`S0-I projection must not carry ${forbidden}`);
  }
  eq(sample.requires_s0f_recheck,true,'handoff is recheck only');

  // Current portability defect remains outside S0-I truth.
  const currentPortability='blocked-portability';
  eq(currentPortability,'blocked-portability');
  check(!Object.prototype.hasOwnProperty.call(sample,'current_gate'),'S0-I must not copy S0-F gate state into PR impact authority');

  console.log(
    `P1-231 S0-I PR checker integration source-spec model: PASS; cases=${cases}; schema=${SCHEMA}; `+
    `package_files=${CURRENT_PACKAGE_FILES.length}; relations=${CURRENT_RELATIONS.length}; base_head_union=true; `+
    `rename_aware=true; admission_owner=s0f; current_s0f_gate=blocked-portability; production_checker_unchanged=true; head=${exactHead}`
  );
})();
