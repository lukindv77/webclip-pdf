'use strict';

// P1-231 S0-I passive PR-impact authority.
// Classifies one exact synthetic merge candidate using S0-A/S0-B semantic
// authority views from both base and candidate. It does not mutate the current
// PR checker/workflow, compute release identities, verify S0-F, or authorize release.

const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { TextDecoder } = require('node:util');
const packageAuthority = require('./release_package_authority.js');
const sourceAuthority = require('./release_source_generation_authority.js');

const ROOT = path.resolve(__dirname, '..');
const SCHEMA = 'webclip-pr-impact/v1';
const MAX_CHANGES = 10000;
const MAX_PATH_BYTES = 1024;
const HEX40 = /^[0-9a-f]{40}$/;

const PACKAGE_AUTHORITY_SOURCE = 'release_package_manifest_v1.json';
const SOURCE_AUTHORITY_SOURCE = 'release_source_generation_v1.json';
const AUTHORITY_IMPLEMENTATION = Object.freeze([
  'project_tools/release_package_authority.js',
  'project_tools/release_source_generation_authority.js'
]);
const CHECKER_CONTROL_PLANE = Object.freeze([
  'project_tools/release_contract_authority.js',
  'project_tools/release_builder_contract_authority.js',
  'project_tools/release_identity.js',
  'project_tools/release_candidate_generation.js',
  'project_tools/release_pr_impact.js',
  'project_tools/release_shadow_identity.js',
  'project_tools/check_ci_pins.py',
  'project_tools/check_pr_change_contract.py',
  '.github/workflows/repository-integrity.yml'
]);

function fail(code, detail) {
  const error = new Error(String(detail || code).slice(0, 240));
  error.code = code;
  throw error;
}

function asciiCompare(a, b) {
  return Buffer.from(a, 'utf8').compare(Buffer.from(b, 'utf8'));
}

function sortedUnique(values) {
  return [...new Set(values)].sort(asciiCompare);
}

function validateSha(value) {
  const normalized = String(value || '').toLowerCase();
  if (!HEX40.test(normalized)) fail('PR_IMPACT_SHA_INVALID');
  return normalized;
}

function validatePath(value) {
  if (typeof value !== 'string' || !value || Buffer.byteLength(value, 'utf8') > MAX_PATH_BYTES) {
    fail('PR_IMPACT_PATH_INVALID');
  }
  if (
    !/^[\x20-\x7e]+$/.test(value)
    || value.startsWith('/')
    || value.endsWith('/')
    || value.includes('\\')
    || value.includes('//')
  ) {
    fail('PR_IMPACT_PATH_INVALID', value);
  }
  for (const part of value.split('/')) {
    if (!part || part === '.' || part === '..') fail('PR_IMPACT_PATH_INVALID', value);
  }
  return value;
}

function stable(value) {
  if (Array.isArray(value)) return '[' + value.map(stable).join(',') + ']';
  if (value && typeof value === 'object') {
    return '{' + Object.keys(value).sort(asciiCompare)
      .map((key) => JSON.stringify(key) + ':' + stable(value[key]))
      .join(',') + '}';
  }
  return JSON.stringify(value);
}

function git(repoRoot, args, options = {}) {
  try {
    return execFileSync('git', args, {
      cwd: repoRoot,
      encoding: options.encoding === null ? null : (options.encoding || 'utf8'),
      maxBuffer: options.maxBuffer || 64 * 1024 * 1024
    });
  } catch (error) {
    const wrapped = new Error('git command failed');
    wrapped.code = 'PR_IMPACT_GIT_FAILED';
    wrapped.cause = error;
    throw wrapped;
  }
}

function requireCommit(repoRoot, sha) {
  let type;
  try { type = String(git(repoRoot, ['cat-file', '-t', sha])).trim(); }
  catch (_) { fail('PR_IMPACT_SHA_INVALID', sha); }
  if (type !== 'commit') fail('PR_IMPACT_SHA_INVALID', sha);
}

function validateCandidateRelation(repoRoot, baseSha, prHeadSha, candidateSha) {
  const base = validateSha(baseSha);
  const head = validateSha(prHeadSha);
  const candidate = validateSha(candidateSha);
  if (new Set([base, head, candidate]).size !== 3) fail('PR_IMPACT_CANDIDATE_RELATION_INVALID');

  for (const sha of [base, head, candidate]) requireCommit(repoRoot, sha);

  let line;
  try { line = String(git(repoRoot, ['rev-list', '--parents', '-n', '1', candidate])).trim(); }
  catch (_) { fail('PR_IMPACT_CANDIDATE_RELATION_INVALID'); }
  const fields = line.split(/\s+/);
  if (fields.length !== 3 || fields[0] !== candidate) fail('PR_IMPACT_CANDIDATE_RELATION_INVALID');
  const parents = fields.slice(1).sort(asciiCompare);
  const expected = [base, head].sort(asciiCompare);
  if (parents[0] !== expected[0] || parents[1] !== expected[1]) {
    fail('PR_IMPACT_CANDIDATE_RELATION_INVALID');
  }

  return Object.freeze({ baseSha: base, prHeadSha: head, candidateSha: candidate });
}

function readExactBlob(repoRoot, sha, rel) {
  const pathValue = validatePath(rel);
  let raw;
  try { raw = String(git(repoRoot, ['ls-tree', sha, '--', pathValue])).trim(); }
  catch (_) { fail('PR_IMPACT_AUTHORITY_VIEW_INVALID', pathValue); }
  if (!raw) fail('PR_IMPACT_AUTHORITY_VIEW_INVALID', pathValue);
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length !== 1) fail('PR_IMPACT_AUTHORITY_VIEW_INVALID', pathValue);
  const tab = lines[0].indexOf('\t');
  if (tab <= 0 || lines[0].slice(tab + 1) !== pathValue) {
    fail('PR_IMPACT_AUTHORITY_VIEW_INVALID', pathValue);
  }
  const [mode, type, oid] = lines[0].slice(0, tab).split(/\s+/);
  if (mode !== '100644' || type !== 'blob' || !/^[0-9a-f]{40}$/.test(oid)) {
    fail('PR_IMPACT_AUTHORITY_VIEW_INVALID', pathValue);
  }
  let bytes;
  try { bytes = git(repoRoot, ['cat-file', 'blob', oid], { encoding: null }); }
  catch (_) { fail('PR_IMPACT_AUTHORITY_VIEW_INVALID', pathValue); }
  if (!Buffer.isBuffer(bytes)) fail('PR_IMPACT_AUTHORITY_VIEW_INVALID', pathValue);
  return bytes;
}

function packageViewAt(repoRoot, sha) {
  let topology;
  try {
    topology = packageAuthority.parseManifestBytes(
      readExactBlob(repoRoot, sha, PACKAGE_AUTHORITY_SOURCE)
    );
  } catch (error) {
    const wrapped = new Error('package authority view invalid');
    wrapped.code = 'PR_IMPACT_PACKAGE_TOPOLOGY_INVALID';
    wrapped.cause = error;
    throw wrapped;
  }
  return Object.freeze({
    schema: topology.schema,
    files: Object.freeze([...topology.files]),
    topologyDigest: 'sha256:' + packageAuthority.topologyDigest(topology)
  });
}

function sourceViewAt(repoRoot, sha) {
  let authority;
  try {
    authority = sourceAuthority.parseManifestBytes(
      readExactBlob(repoRoot, sha, SOURCE_AUTHORITY_SOURCE)
    );
  } catch (error) {
    const wrapped = new Error('source generation authority view invalid');
    wrapped.code = 'PR_IMPACT_SOURCE_GENERATION_TOPOLOGY_INVALID';
    wrapped.cause = error;
    throw wrapped;
  }
  return Object.freeze({
    schema: authority.schema,
    relations: Object.freeze(authority.relations.map((relation) => Object.freeze({
      id: relation.id,
      runtime_profile: relation.runtime_profile,
      generator: relation.generator,
      inputs: Object.freeze([...relation.inputs]),
      outputs: Object.freeze([...relation.outputs])
    }))),
    topologyDigest: 'sha256:' + sourceAuthority.semanticTopology(authority)
  });
}

function canonicalRelation(raw) {
  if (!raw || typeof raw !== 'object' || !/^[a-z0-9][a-z0-9-]{0,63}$/.test(raw.id || '')) {
    fail('PR_IMPACT_SOURCE_GENERATION_TOPOLOGY_INVALID');
  }
  const generator = validatePath(raw.generator);
  const inputs = sortedUnique((raw.inputs || []).map(validatePath));
  const outputs = sortedUnique((raw.outputs || []).map(validatePath));
  if (
    !inputs.length
    || !outputs.length
    || typeof raw.runtime_profile !== 'string'
    || !raw.runtime_profile
    || inputs.length !== (raw.inputs || []).length
    || outputs.length !== (raw.outputs || []).length
  ) {
    fail('PR_IMPACT_SOURCE_GENERATION_TOPOLOGY_INVALID');
  }
  return Object.freeze({
    id: raw.id,
    runtime_profile: raw.runtime_profile,
    generator,
    inputs: Object.freeze(inputs),
    outputs: Object.freeze(outputs)
  });
}

function validatePackageView(value) {
  if (
    !value
    || value.schema !== packageAuthority.SCHEMA
    || !Array.isArray(value.files)
    || value.files.length === 0
    || value.files.length > packageAuthority.MAX_FILES
    || !/^sha256:[0-9a-f]{64}$/.test(value.topologyDigest || '')
  ) {
    fail('PR_IMPACT_PACKAGE_TOPOLOGY_INVALID');
  }
  const sorted = sortedUnique(value.files.map(validatePath));
  if (sorted.length !== value.files.length || !sorted.includes('manifest.json')) {
    fail('PR_IMPACT_PACKAGE_TOPOLOGY_INVALID');
  }
  return Object.freeze({
    schema: value.schema,
    files: Object.freeze(sorted),
    topologyDigest: value.topologyDigest
  });
}

function validateSourceView(value) {
  if (
    !value
    || value.schema !== sourceAuthority.SCHEMA
    || !Array.isArray(value.relations)
    || value.relations.length === 0
    || value.relations.length > sourceAuthority.MAX_RELATIONS
    || !/^sha256:[0-9a-f]{64}$/.test(value.topologyDigest || '')
  ) {
    fail('PR_IMPACT_SOURCE_GENERATION_TOPOLOGY_INVALID');
  }
  const relations = value.relations.map(canonicalRelation).sort((a, b) => asciiCompare(a.id, b.id));
  if (new Set(relations.map((relation) => relation.id)).size !== relations.length) {
    fail('PR_IMPACT_SOURCE_GENERATION_TOPOLOGY_INVALID');
  }
  return Object.freeze({
    schema: value.schema,
    relations: Object.freeze(relations),
    topologyDigest: value.topologyDigest
  });
}

function normalizeChanges(raw) {
  if (!Array.isArray(raw) || raw.length > MAX_CHANGES) fail('PR_IMPACT_DIFF_FAILED');
  const seen = new Set();
  const out = raw.map((change) => {
    if (!change || !['A', 'M', 'D', 'T'].includes(change.status)) {
      fail('PR_IMPACT_DIFF_STATUS_UNSUPPORTED');
    }
    const pathValue = validatePath(change.path);
    if (seen.has(pathValue)) fail('PR_IMPACT_DUPLICATE_PATH', pathValue);
    seen.add(pathValue);
    return Object.freeze({ status: change.status, path: pathValue });
  });
  return Object.freeze(out.sort((a, b) => asciiCompare(a.path, b.path) || asciiCompare(a.status, b.status)));
}

function readChanges(repoRoot, baseSha, candidateSha) {
  let raw;
  try {
    raw = git(repoRoot, ['diff', '--name-status', '-z', '--no-renames', baseSha, candidateSha], {
      encoding: null
    });
  } catch (_) {
    fail('PR_IMPACT_DIFF_FAILED');
  }
  let text;
  try { text = new TextDecoder('utf-8', { fatal: true }).decode(raw); }
  catch (_) { fail('PR_IMPACT_PATH_INVALID'); }
  const tokens = text.split('\0');
  if (tokens[tokens.length - 1] === '') tokens.pop();

  const changes = [];
  for (let index = 0; index < tokens.length;) {
    const token = tokens[index++];
    let status;
    let pathValue;
    const inline = /^([AMDT])\t(.*)$/.exec(token);
    if (inline) {
      status = inline[1];
      pathValue = inline[2];
    } else if (/^[AMDT]$/.test(token)) {
      status = token;
      if (index >= tokens.length) fail('PR_IMPACT_DIFF_FAILED');
      pathValue = tokens[index++];
    } else {
      fail('PR_IMPACT_DIFF_STATUS_UNSUPPORTED', token);
    }
    changes.push({ status, path: pathValue });
  }
  return normalizeChanges(changes);
}

function relationSemanticKey(relation) {
  return stable([
    relation.id,
    relation.runtime_profile,
    relation.generator,
    relation.inputs,
    relation.outputs
  ]);
}

function indexRelations(baseRelations, candidateRelations) {
  const roles = { input: new Map(), generator: new Map(), output: new Map() };
  const byBase = new Map(baseRelations.map((relation) => [relation.id, relation]));
  const byCandidate = new Map(candidateRelations.map((relation) => [relation.id, relation]));

  function add(role, pathValue, id) {
    if (!roles[role].has(pathValue)) roles[role].set(pathValue, new Set());
    roles[role].get(pathValue).add(id);
  }

  for (const relation of [...baseRelations, ...candidateRelations]) {
    add('generator', relation.generator, relation.id);
    for (const item of relation.inputs) add('input', item, relation.id);
    for (const item of relation.outputs) add('output', item, relation.id);
  }
  return { roles, byBase, byCandidate };
}

function affectedRelations(changedSet, baseRelations, candidateRelations) {
  const { roles, byBase, byCandidate } = indexRelations(baseRelations, candidateRelations);
  const ids = new Set();
  const reasons = new Map();

  function reason(id, text) {
    ids.add(id);
    if (!reasons.has(id)) reasons.set(id, new Set());
    reasons.get(id).add(text);
  }

  for (const pathValue of changedSet) {
    for (const [role, index] of Object.entries(roles)) {
      for (const id of index.get(pathValue) || []) reason(id, role + '-path-touched');
    }
  }

  for (const id of sortedUnique([...byBase.keys(), ...byCandidate.keys()])) {
    const base = byBase.get(id);
    const candidate = byCandidate.get(id);
    if (!base && candidate) reason(id, 'relation-added');
    else if (base && !candidate) reason(id, 'relation-removed');
    else if (relationSemanticKey(base) !== relationSemanticKey(candidate)) {
      reason(id, 'relation-declaration-changed');
    }
  }

  return Object.freeze(sortedUnique([...ids]).map((id) => Object.freeze({
    relationId: id,
    reasons: Object.freeze(sortedUnique([...reasons.get(id)]))
  })));
}

function computeImpact(input) {
  if (!input || typeof input !== 'object') fail('PR_IMPACT_INTERNAL_FAILURE');
  const baseSha = validateSha(input.baseSha);
  const prHeadSha = validateSha(input.prHeadSha);
  const candidateSha = validateSha(input.candidateSha);
  const parents = sortedUnique((input.candidateParents || []).map(validateSha));
  if (
    new Set([baseSha, prHeadSha, candidateSha]).size !== 3
    || parents.length !== 2
    || !parents.includes(baseSha)
    || !parents.includes(prHeadSha)
  ) {
    fail('PR_IMPACT_CANDIDATE_RELATION_INVALID');
  }

  const changes = normalizeChanges(input.changes);
  const basePackage = validatePackageView(input.basePackage);
  const candidatePackage = validatePackageView(input.candidatePackage);
  const baseGeneration = validateSourceView(input.baseGeneration);
  const candidateGeneration = validateSourceView(input.candidateGeneration);
  const changedSet = new Set(changes.map((change) => change.path));

  const packageUnion = new Set([...basePackage.files, ...candidatePackage.files]);
  const packageMember = [...changedSet].some((item) => packageUnion.has(item));
  const packageTopologyChanged = basePackage.topologyDigest !== candidatePackage.topologyDigest;
  const sourceGenerationTopologyChanged =
    baseGeneration.topologyDigest !== candidateGeneration.topologyDigest;

  const relations = affectedRelations(
    changedSet,
    baseGeneration.relations,
    candidateGeneration.relations
  );
  const { roles } = indexRelations(baseGeneration.relations, candidateGeneration.relations);
  const generationInput = [...changedSet].some((item) => roles.input.has(item));
  const generationGenerator = [...changedSet].some((item) => roles.generator.has(item));
  const generatedOutput = [...changedSet].some((item) => roles.output.has(item));
  const generationClosure = generationInput || generationGenerator || generatedOutput;

  const packageAuthoritySource = changedSet.has(PACKAGE_AUTHORITY_SOURCE);
  const sourceGenerationAuthoritySource = changedSet.has(SOURCE_AUTHORITY_SOURCE);
  const authorityImplementation = AUTHORITY_IMPLEMENTATION.some((item) => changedSet.has(item));
  const prCheckerControlPlane = CHECKER_CONTROL_PLANE.some((item) => changedSet.has(item));

  const candidateGenerationVerification =
    packageMember
    || packageTopologyChanged
    || sourceGenerationTopologyChanged
    || generationClosure
    || authorityImplementation;
  const shadowIdentityRecompute = candidateGenerationVerification || prCheckerControlPlane;
  const trustedControlPlaneReview = authorityImplementation || prCheckerControlPlane;
  const automaticClassificationTrusted = !trustedControlPlaneReview;

  return Object.freeze({
    schema: SCHEMA,
    provenance: Object.freeze({ baseSha, prHeadSha, candidateSha }),
    authority: Object.freeze({
      basePackageTopologyDigest: basePackage.topologyDigest,
      candidatePackageTopologyDigest: candidatePackage.topologyDigest,
      packageTopologyChanged,
      baseSourceGenerationTopologyDigest: baseGeneration.topologyDigest,
      candidateSourceGenerationTopologyDigest: candidateGeneration.topologyDigest,
      sourceGenerationTopologyChanged
    }),
    changedPaths: changes,
    touched: Object.freeze({
      packageMember,
      generationInput,
      generationGenerator,
      generatedOutput,
      generationClosure,
      packageAuthoritySource,
      sourceGenerationAuthoritySource,
      authorityImplementation,
      prCheckerControlPlane
    }),
    affectedGenerationRelations: relations,
    requires: Object.freeze({
      candidateGenerationVerification,
      shadowIdentityRecompute,
      trustedControlPlaneReview
    }),
    trust: Object.freeze({ automaticClassificationTrusted }),
    policy_mutation: false,
    identity_computation: false,
    candidate_generation_verified: false,
    release_authorized: false
  });
}

function classifyPrImpact(baseSha, prHeadSha, candidateSha, options = {}) {
  const repoRoot = path.resolve(options.repoRoot || ROOT);
  const relation = validateCandidateRelation(repoRoot, baseSha, prHeadSha, candidateSha);
  const basePackage = packageViewAt(repoRoot, relation.baseSha);
  const candidatePackage = packageViewAt(repoRoot, relation.candidateSha);
  const baseGeneration = sourceViewAt(repoRoot, relation.baseSha);
  const candidateGeneration = sourceViewAt(repoRoot, relation.candidateSha);
  const changes = readChanges(repoRoot, relation.baseSha, relation.candidateSha);

  return computeImpact({
    baseSha: relation.baseSha,
    prHeadSha: relation.prHeadSha,
    candidateSha: relation.candidateSha,
    candidateParents: [relation.baseSha, relation.prHeadSha],
    changes,
    basePackage,
    candidatePackage,
    baseGeneration,
    candidateGeneration
  });
}

module.exports = Object.freeze({
  ROOT,
  SCHEMA,
  MAX_CHANGES,
  MAX_PATH_BYTES,
  PACKAGE_AUTHORITY_SOURCE,
  SOURCE_AUTHORITY_SOURCE,
  AUTHORITY_IMPLEMENTATION,
  CHECKER_CONTROL_PLANE,
  validateSha,
  validatePath,
  validatePackageView,
  validateSourceView,
  normalizeChanges,
  computeImpact,
  validateCandidateRelation,
  packageViewAt,
  sourceViewAt,
  readChanges,
  classifyPrImpact
});
