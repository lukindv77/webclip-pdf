'use strict';

// P1-231 S1-C passive builder equivalence.
// Current product candidates are observation-only. Positive physical equivalence
// is exposed only for an explicit synthetic fixture path.

const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const packageAuthority = require('./release_package_authority.js');
const identity = require('./release_identity.js');
const candidateGate = require('./release_candidate_generation.js');
const builderAuthority = require('./release_builder_contract_authority.js');
const passiveBuilder = require('./release_passive_builder.js');
const shadowIdentity = require('./release_shadow_identity.js');

const SCHEMA = 'webclip-builder-equivalence/v1';
const SHADOW_SCHEMA = shadowIdentity.SCHEMA;
const GOLDEN_FIXTURE_MEMBERS = 4;
const GOLDEN_ZIP_BYTES = 510;
const GOLDEN_ZIP_SHA256 = 'sha256:1db2cd15c7decdd0e380aab31363f12d75268d90573eb6ef46723b5287f740d7';

function fail(code, detail) {
  const error = new Error(String(detail || code).slice(0, 300));
  error.code = code;
  throw error;
}
function validDigest(value) {
  return /^sha256:[0-9a-f]{64}$/.test(String(value || ''));
}
function digestPrefixed(bytes) {
  if (!Buffer.isBuffer(bytes)) fail('S1C_ARTIFACT_INVALID');
  return 'sha256:' + crypto.createHash('sha256').update(bytes).digest('hex');
}
function normalizeShadow(value, candidate) {
  if (
    !value
    || value.schema !== SHADOW_SCHEMA
    || value.candidate_sha !== candidate
    || value.generation_gate !== 'pass'
    || typeof value.eligible !== 'boolean'
    || !validDigest(value.rpf)
    || !validDigest(value.bcf)
    || value.policy_mutation !== false
    || value.receipt_mutation !== false
    || value.evidence_settlement !== false
    || value.artifact_build !== false
    || value.release_authorized !== false
  ) fail('S1C_SHADOW_IDENTITY_INVALID');
  if (value.eligible && value.shadow_outcome !== 'eligible') fail('S1C_SHADOW_ELIGIBILITY_INCONSISTENT');
  if (!value.eligible && value.shadow_outcome === 'eligible') fail('S1C_SHADOW_ELIGIBILITY_INCONSISTENT');
  return Object.freeze({
    candidate_sha: candidate,
    eligible: value.eligible,
    shadow_outcome: value.shadow_outcome,
    rpf: value.rpf,
    bcf: value.bcf
  });
}
function observationResult(candidate, shadow) {
  const eligible = shadow.eligible === true;
  return Object.freeze({
    schema: SCHEMA,
    candidate_sha: candidate,
    state: eligible ? 'not-evaluated' : 'candidate-ineligible',
    identity_eligible: eligible,
    equivalence_evaluated: false,
    blocker_reason: eligible ? 'product-build-not-authorized' : shadow.shadow_outcome,
    rpf: shadow.rpf,
    bcf: shadow.bcf,
    paths: null,
    raw_bytes_equal: false,
    fixture_only: false,
    product_projection_loaded: false,
    product_zip_built: false,
    official_artifact: false,
    authoritative: false,
    policy_mutation: false,
    receipt_mutation: false,
    readiness_mutation: false,
    release_authorized: false
  });
}
function observeCandidate(input, options = {}) {
  if (!input || typeof input !== 'object') fail('S1C_INPUT_INVALID');
  const candidate = packageAuthority.normalizeCandidateSha(input.candidateSha);
  const shadowProvider = options.shadowProvider || ((shadowInput) => shadowIdentity.evaluateShadow(
    shadowInput,
    { ...(options.shadowOptions || {}), repoRoot: options.repoRoot }
  ));
  let raw;
  try {
    raw = shadowProvider({
      eventKind: input.eventKind,
      candidateSha: candidate,
      baseSha: input.baseSha,
      prHeadSha: input.prHeadSha
    });
  } catch (error) {
    if (error && error.code) throw error;
    fail('S1C_SHADOW_COMPUTATION_FAILED');
  }
  return observationResult(candidate, normalizeShadow(raw, candidate));
}

const PYTHON_SCRIPT = [
  "import base64,io,json,sys,zipfile",
  "payload=json.load(sys.stdin)",
  "entries=[(item['name'],base64.b64decode(item['data_b64'])) for item in payload['entries']]",
  "entries.sort(key=lambda item:item[0].encode('ascii'))",
  "variant=payload.get('variant','canonical')",
  "buf=io.BytesIO()",
  "with zipfile.ZipFile(buf,'w',compression=zipfile.ZIP_STORED,allowZip64=False) as archive:",
  "    archive.comment=b''",
  "    for name,data in entries:",
  "        dt=(1980,1,2,0,0,0) if variant=='timestamp-drift' else (1980,1,1,0,0,0)",
  "        info=zipfile.ZipInfo(name,date_time=dt)",
  "        info.compress_type=zipfile.ZIP_STORED",
  "        info.create_system=3",
  "        info.create_version=20",
  "        info.extract_version=20",
  "        info.external_attr=0o100644 << 16",
  "        info.internal_attr=0",
  "        info.extra=b''",
  "        info.comment=b''",
  "        info.flag_bits=0",
  "        archive.writestr(info,data)",
  "raw=buf.getvalue()",
  "print(json.dumps({'raw_b64':base64.b64encode(raw).decode('ascii'),'python':sys.version.split()[0]},sort_keys=True,separators=(',',':')))"
].join('\n');

function pythonCommand() {
  for (const command of (process.platform === 'win32' ? ['python'] : ['python3', 'python'])) {
    const probe = spawnSync(command, ['--version'], { encoding: 'utf8' });
    if (probe.status === 0) return command;
  }
  fail('S1C_PATH_B_BUILD_FAILED', 'Python runtime unavailable');
}
function buildPythonZip(entries, options = {}) {
  if (!Array.isArray(entries) || entries.length === 0) fail('S1C_PATH_B_BUILD_FAILED');
  const payload = {
    variant: options.variant || 'canonical',
    entries: entries.map((entry) => ({
      name: passiveBuilder.validateEntryName(entry.name),
      data_b64: Buffer.from(entry.bytes).toString('base64')
    }))
  };
  const proc = spawnSync(options.pythonExecutable || pythonCommand(), ['-c', PYTHON_SCRIPT], {
    input: JSON.stringify(payload),
    encoding: 'utf8',
    env: { ...process.env, ...(options.env || {}) },
    timeout: options.timeoutMs || 30000,
    maxBuffer: options.maxBuffer || (16 * 1024 * 1024)
  });
  if (proc.error || proc.status !== 0) fail('S1C_PATH_B_BUILD_FAILED', String(proc.stderr || proc.stdout || proc.error));
  let parsed;
  try { parsed = JSON.parse(proc.stdout); }
  catch (_) { fail('S1C_PATH_B_BUILD_FAILED'); }
  const raw = Buffer.from(String(parsed.raw_b64 || ''), 'base64');
  if (raw.length === 0) fail('S1C_PATH_B_BUILD_FAILED');
  return Object.freeze({ raw, python: String(parsed.python || '') });
}
function normalizeFixtureInputs(value, candidate) {
  let normalized;
  try { normalized = identity.normalizePackageInputs(value); }
  catch (_) { fail('S1C_FIXTURE_INPUT_INVALID'); }
  if (normalized.candidate_sha !== candidate) fail('S1C_CANDIDATE_SHA_MISMATCH');
  if (normalized.members.length !== GOLDEN_FIXTURE_MEMBERS) fail('S1C_FIXTURE_SCOPE_INVALID');
  return normalized;
}
function extractedRpf(candidate, packageInputs, verified) {
  return identity.fingerprintRpf(passiveBuilder.extractedInputs(candidate, packageInputs, verified));
}
function normalizeFixtureShadow(value, candidate) {
  const shadow = normalizeShadow(value, candidate);
  if (!shadow.eligible) fail('S1C_FIXTURE_SHADOW_INELIGIBLE');
  return shadow;
}
function normalizeFixtureAdmission(value, candidate) {
  let admission;
  try { admission = passiveBuilder.validateAdmission(candidate, value); }
  catch (error) {
    if (error && error.code) throw error;
    fail('S1C_CANDIDATE_GENERATION_NOT_ADMITTED');
  }
  if (admission.schema !== candidateGate.RESULT_SCHEMA) fail('S1C_CANDIDATE_GENERATION_NOT_ADMITTED');
  return admission;
}
function evaluateFixtureEquivalence(input, options = {}) {
  if (!input || input.fixtureOnly !== true) fail('S1C_FIXTURE_SCOPE_INVALID');
  const candidate = packageAuthority.normalizeCandidateSha(input.candidateSha);
  const shadow = normalizeFixtureShadow(input.shadowIdentity, candidate);
  const admission = normalizeFixtureAdmission(input.candidateAdmission, candidate);
  if (shadow.rpf !== admission.identities.rpf) fail('S1C_RPF_MISMATCH');
  if (shadow.bcf !== admission.identities.bcf) fail('S1C_BCF_MISMATCH');

  const packageManifest = input.packageManifest;
  if (!packageManifest) fail('S1C_FIXTURE_INPUT_INVALID');
  const builderManifest = input.builderManifest || builderAuthority.readCanonicalManifest();
  if (passiveBuilder.expectedBcf(builderManifest, packageManifest) !== admission.identities.bcf) {
    fail('S1C_BCF_MISMATCH');
  }

  const packageInputs = normalizeFixtureInputs(input.packageInputs, candidate);
  const stagedRpf = identity.fingerprintRpf({
    schema: 'webclip-package-identity-inputs/v1',
    candidate_sha: candidate,
    package_schema: packageInputs.package_schema,
    path_profile: packageInputs.path_profile,
    members: packageInputs.members
  });
  if (stagedRpf !== admission.identities.rpf) fail('S1C_RPF_MISMATCH');

  const entries = passiveBuilder.normalizedEntries(packageInputs);
  let rawA;
  let pathB;
  try { rawA = (options.builderA || passiveBuilder.buildClassicStoredZip)(entries); }
  catch (error) {
    if (error && error.code) throw error;
    fail('S1C_PATH_A_BUILD_FAILED', error && error.message);
  }
  try { pathB = (options.builderB || buildPythonZip)(entries, options.pythonOptions || {}); }
  catch (error) {
    if (error && error.code) throw error;
    fail('S1C_PATH_B_BUILD_FAILED', error && error.message);
  }
  const rawB = pathB && pathB.raw;
  if (!Buffer.isBuffer(rawA) || !Buffer.isBuffer(rawB)) fail('S1C_ARTIFACT_INVALID');

  let verifiedA;
  let verifiedB;
  try {
    verifiedA = passiveBuilder.verifyClassicStoredZip(rawA, entries);
    verifiedB = passiveBuilder.verifyClassicStoredZip(rawB, entries);
  } catch (error) {
    if (error && error.code) throw error;
    fail('S1C_ZIP_VERIFICATION_FAILED');
  }

  const rpfA = extractedRpf(candidate, packageInputs, verifiedA);
  const rpfB = extractedRpf(candidate, packageInputs, verifiedB);
  if (rpfA !== admission.identities.rpf || rpfB !== admission.identities.rpf) fail('S1C_EXTRACTED_RPF_MISMATCH');

  const digestA = digestPrefixed(rawA);
  const digestB = digestPrefixed(rawB);
  if (rawA.length !== rawB.length) fail('S1C_ARTIFACT_SIZE_MISMATCH');
  if (digestA !== digestB) fail('S1C_ARTIFACT_SHA_MISMATCH');
  if (!rawA.equals(rawB)) fail('S1C_ARTIFACT_BYTES_MISMATCH');

  return Object.freeze({
    schema: SCHEMA,
    candidate_sha: candidate,
    state: 'equivalent',
    identity_eligible: true,
    equivalence_evaluated: true,
    blocker_reason: null,
    rpf: admission.identities.rpf,
    bcf: admission.identities.bcf,
    builder_profile: builderManifest.builder_profile,
    paths: Object.freeze({
      node_raw: Object.freeze({
        artifact_bytes: rawA.length,
        artifact_sha256: digestA,
        extracted_rpf: rpfA,
        implementation: 'node-raw-zip-v1'
      }),
      python_zipfile: Object.freeze({
        artifact_bytes: rawB.length,
        artifact_sha256: digestB,
        extracted_rpf: rpfB,
        implementation: 'python-zipfile-v1',
        python: String(pathB.python || '')
      })
    }),
    raw_bytes_equal: true,
    fixture_only: true,
    product_projection_loaded: false,
    product_zip_built: false,
    official_artifact: false,
    authoritative: false,
    policy_mutation: false,
    receipt_mutation: false,
    readiness_mutation: false,
    release_authorized: false
  });
}

module.exports = Object.freeze({
  SCHEMA,
  SHADOW_SCHEMA,
  GOLDEN_FIXTURE_MEMBERS,
  GOLDEN_ZIP_BYTES,
  GOLDEN_ZIP_SHA256,
  validDigest,
  digestPrefixed,
  normalizeShadow,
  observationResult,
  observeCandidate,
  buildPythonZip,
  normalizeFixtureInputs,
  evaluateFixtureEquivalence
});
