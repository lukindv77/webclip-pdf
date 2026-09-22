'use strict';

// P1-231 S0-A deterministic production witness.
// Validates the passive package manifest/authority without activating release policy.

const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { execFileSync } = require('node:child_process');
const authority = require('./release_package_authority.js');

const ROOT = path.resolve(__dirname, '..');
let checks = 0;

function ok(value, message) { assert.ok(value, message); checks += 1; }
function eq(actual, expected, message) { assert.equal(actual, expected, message); checks += 1; }
function deep(actual, expected, message) { assert.deepStrictEqual(actual, expected, message); checks += 1; }
function throwsCode(fn, code, message) {
  assert.throws(fn, (error) => error?.code === code, message || code);
  checks += 1;
}

function git(cwd, args, options = {}) {
  return execFileSync('git', args, {
    cwd,
    encoding: options.encoding === null ? null : (options.encoding || 'utf8'),
    input: options.input,
    env: options.env || process.env,
    maxBuffer: 64 * 1024 * 1024
  });
}

function canonicalManifest(files, extra = {}) {
  return Buffer.from(JSON.stringify({
    schema: authority.SCHEMA,
    path_profile: authority.PATH_PROFILE,
    files,
    ...extra
  }), 'utf8');
}

function extractFrozenArray(source, name) {
  const re = new RegExp('const\\s+' + name + '\\s*=\\s*Object\\.freeze\\(\\[([\\s\\S]*?)\\]\\);');
  const match = re.exec(source);
  if (!match) throw new Error('array not found: ' + name);
  const value = vm.runInNewContext('[' + match[1] + ']', Object.create(null));
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new Error('invalid array fixture: ' + name);
  }
  return Array.from(value);
}

function initRepo() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'webclip-p1-231-s0a-'));
  git(dir, ['init', '-q']);
  git(dir, ['config', 'user.email', 'webclip@example.invalid']);
  git(dir, ['config', 'user.name', 'WebClip Test']);
  return dir;
}

function commitFiles(dir, files, message) {
  for (const [rel, bytes] of Object.entries(files)) {
    const target = path.join(dir, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, bytes);
  }
  git(dir, ['add', '--all']);
  git(dir, ['commit', '-q', '-m', message]);
  return git(dir, ['rev-parse', 'HEAD']).trim();
}

const manifestBytes = fs.readFileSync(authority.MANIFEST_PATH);
const topology = authority.parseManifestBytes(manifestBytes);
eq(topology.schema, 'webclip-extension-package/v1', 'canonical package schema');
eq(topology.path_profile, 'portable-ascii-v1', 'canonical path profile');
eq(topology.files.length, 34, 'canonical package count');
eq(new Set(topology.files).size, 34, 'canonical package has no duplicates');
eq(topology.files.filter((item) => item === 'manifest.json').length, 1, 'manifest.json admitted exactly once');
ok(!topology.files.includes('release_package_manifest_v1.json'), 'package authority file does not package itself');
ok(!topology.files.some((item) => item.startsWith('project_tools/')), 'project tools stay outside package');
ok(!topology.files.some((item) => item.startsWith('project_docs/')), 'project docs stay outside package');
ok(!topology.files.some((item) => item.startsWith('.github/')), 'GitHub control plane stays outside package');

const s0aSource = fs.readFileSync(path.join(ROOT, 'project_tools', 'test_p1_231_s0a_package_authority_source_spec_model.js'), 'utf8');
const s0eSource = fs.readFileSync(path.join(ROOT, 'project_tools', 'test_p1_231_s0e_identity_engine_source_spec_model.js'), 'utf8');
const currentS0a = extractFrozenArray(s0aSource, 'CURRENT_FILES');
deep([...topology.files], authority.asciiSort(currentS0a), 'production manifest migration equals current S0-A census');
ok(s0eSource.includes("const PACKAGE_TOPOLOGY = packageAuthority.readCanonicalManifest();"), 'S0-E consumes canonical package authority');
ok(s0eSource.includes("const PACKAGE_FILES = Object.freeze([...PACKAGE_TOPOLOGY.files]);"), 'S0-E current package membership comes from S0-A authority');
ok(s0eSource.includes("const LEGACY_PACKAGE_FILES = Object.freeze(PACKAGE_FILES.filter((rel) => rel !== 'application-generation.js'));"), 'S0-E retains explicit 33-file legacy subset control');
ok(s0eSource.includes("const CURRENT_RPF = 'sha256:880ad517fda59415bfcfcb476e29139718d386db708bd652b67c3c10aa38ecff';"), 'S0-E pins corrected current 34-file RPF');
ok(s0eSource.includes("const LEGACY_RPF = 'sha256:710d9a44279541adb6ef609b9cad4b34beba17610fb585e668fc1376c362b623';"), 'S0-E retains exact legacy incomplete RPF control');

const digest = authority.topologyDigest(topology);
ok(/^[0-9a-f]{64}$/.test(digest), 'topology digest is SHA-256 hex');
const reversed = authority.parseManifestBytes(canonicalManifest([...topology.files].reverse()));
eq(authority.topologyDigest(reversed), digest, 'files array order does not change topology digest');
const pretty = Buffer.from(JSON.stringify({
  files: [...topology.files].reverse(),
  path_profile: authority.PATH_PROFILE,
  schema: authority.SCHEMA
}, null, 2));
eq(authority.topologyDigest(authority.parseManifestBytes(pretty)), digest, 'JSON formatting/key order do not change topology digest');

throwsCode(() => authority.parseManifestBytes(Buffer.alloc(0)), 'PACKAGE_MANIFEST_JSON_INVALID', 'empty manifest rejected');
throwsCode(() => authority.parseManifestBytes(Buffer.alloc(authority.MAX_MANIFEST_BYTES + 1, 0x20)), 'PACKAGE_MANIFEST_TOO_LARGE', 'oversized manifest rejected');
throwsCode(
  () => authority.parseManifestBytes(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), manifestBytes])),
  'PACKAGE_MANIFEST_BOM_FORBIDDEN',
  'BOM rejected'
);
throwsCode(() => authority.parseManifestBytes(Buffer.from([0xc3, 0x28])), 'PACKAGE_MANIFEST_UTF8_INVALID', 'invalid UTF-8 rejected');
throwsCode(() => authority.parseManifestBytes(Buffer.from('{')), 'PACKAGE_MANIFEST_JSON_INVALID', 'malformed JSON rejected');
throwsCode(
  () => authority.parseManifestBytes(Buffer.from('{"schema":"x","schema":"y","path_profile":"portable-ascii-v1","files":["manifest.json"]}')),
  'PACKAGE_MANIFEST_DUPLICATE_KEY',
  'duplicate key rejected'
);
throwsCode(
  () => authority.parseManifestBytes(Buffer.from('{"schema":"webclip-extension-package/v1","path_profile":"portable-ascii-v1","files":["manifest.json"],"n":NaN}')),
  'PACKAGE_MANIFEST_CONSTANT_INVALID',
  'non-standard constant rejected'
);
eq(
  authority.parseManifestBytes(canonicalManifest(['manifest.json', 'NaN'])).files.includes('NaN'),
  true,
  'forbidden constant scanner ignores JSON string contents'
);
throwsCode(
  () => authority.parseManifestBytes(canonicalManifest(['manifest.json'], { extra: true })),
  'PACKAGE_MANIFEST_UNKNOWN_FIELD',
  'unknown top-level field rejected'
);
throwsCode(
  () => authority.parseManifestBytes(Buffer.from('{"schema":"webclip-extension-package/v1","files":["manifest.json"]}')),
  'PACKAGE_MANIFEST_REQUIRED_FIELD_MISSING',
  'missing required field rejected'
);
throwsCode(
  () => authority.parseManifestBytes(Buffer.from('{"schema":"v2","path_profile":"portable-ascii-v1","files":["manifest.json"]}')),
  'PACKAGE_MANIFEST_SCHEMA_UNSUPPORTED',
  'unsupported schema rejected'
);
throwsCode(
  () => authority.parseManifestBytes(Buffer.from('{"schema":"webclip-extension-package/v1","path_profile":"unicode-v2","files":["manifest.json"]}')),
  'PACKAGE_MANIFEST_PATH_PROFILE_UNSUPPORTED',
  'unsupported path profile rejected'
);

for (const bad of [
  '/manifest.json', 'dir/', 'dir//x.js', 'dir\\x.js', './x.js', '../x.js',
  'dir/../x.js', 'foo bar.js', 'foo?.js', 'café.js', 'foo.', 'dir/.', 'dir/..', 'a\u0001.js'
]) {
  throwsCode(() => authority.validatePath(bad), 'PACKAGE_PATH_INVALID', 'bad portable path: ' + JSON.stringify(bad));
}
for (const bad of ['CON', 'nul.txt', 'dir/COM1.js', 'PrN.css', 'x/Lpt9.bin']) {
  throwsCode(() => authority.validatePath(bad), 'PACKAGE_PATH_RESERVED_NAME', 'reserved path: ' + bad);
}
throwsCode(() => authority.validatePath('a'.repeat(authority.MAX_PATH_BYTES + 1)), 'PACKAGE_PATH_TOO_LONG', 'long path rejected');
throwsCode(() => authority.validateFiles(['manifest.json', 'a.js', 'a.js']), 'PACKAGE_PATH_DUPLICATE', 'exact duplicate rejected');
throwsCode(() => authority.validateFiles(['manifest.json', 'Foo.js', 'foo.js']), 'PACKAGE_PATH_CASE_COLLISION', 'case collision rejected');
throwsCode(() => authority.validateFiles(['manifest.json', 'a', 'a/b.js']), 'PACKAGE_PATH_PREFIX_COLLISION', 'file/directory prefix collision rejected');
throwsCode(() => authority.validateFiles(['x.js']), 'PACKAGE_MANIFEST_REQUIRED_MEMBER_MISSING', 'manifest.json is required');

const head = git(ROOT, ['rev-parse', 'HEAD']).trim();
ok(/^[0-9a-f]{40}$/.test(head), 'test HEAD is exact commit');
const resolved = authority.resolvePackage(head, topology);
eq(resolved.candidate_sha, head, 'resolver returns exact candidate SHA');
eq(resolved.canonical_files.length, 34, 'resolver returns exact package membership');
eq(resolved.topology_digest, digest, 'resolver returns semantic topology digest');
ok(resolved.aggregate_bytes > 0 && resolved.aggregate_bytes < authority.MAX_TOTAL_BYTES, 'current aggregate bytes are bounded');
eq(resolved.members.length, 34, 'resolver returns one member record per package file');
for (const member of resolved.members) {
  ok(/^[0-9a-f]{40}$/.test(member.git_oid), member.path + ' has exact Git blob OID');
  ok(Number.isSafeInteger(member.byte_length) && member.byte_length >= 0, member.path + ' has bounded byte length');
  ok(/^[0-9a-f]{64}$/.test(member.sha256), member.path + ' has diagnostic SHA-256');
}
const identityInputs = authority.identityInputs(head, topology);
eq(identityInputs.schema, 'webclip-package-identity-inputs/v1', 'identity-input schema');
eq(identityInputs.candidate_sha, head, 'identity-input candidate');
eq(identityInputs.members.length, 34, 'identity-input member count');
for (let index = 0; index < identityInputs.members.length; index += 1) {
  const input = identityInputs.members[index];
  const admitted = resolved.members[index];
  eq(input.path, admitted.path, input.path + ' identity path');
  eq(input.bytes.length, admitted.byte_length, input.path + ' identity byte length');
  eq(crypto.createHash('sha256').update(input.bytes).digest('hex'), admitted.sha256, input.path + ' identity byte digest');
}
eq(identityInputs.policy_mutation, false, 'identity adapter does not mutate policy');
eq(identityInputs.release_authorized, false, 'identity adapter does not authorize release');
throwsCode(() => authority.resolvePackage('HEAD', topology), 'PACKAGE_CANDIDATE_SHA_INVALID', 'moving ref cannot enter low-level resolver');

const rpfRun = execFileSync(
  process.execPath,
  [path.join(ROOT, 'project_tools', 'test_p1_231_s0e_identity_engine_source_spec_model.js')],
  { cwd: ROOT, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 }
);
const currentRpfMatch = /(?:^|;\s*)rpf=(sha256:[0-9a-f]{64})(?=;|$)/m.exec(rpfRun);
const legacyRpfMatch = /(?:^|;\s*)legacy_rpf=(sha256:[0-9a-f]{64})(?=;|$)/m.exec(rpfRun);
const packageCountMatch = /(?:^|;\s*)package_files=(\d+)(?=;|$)/m.exec(rpfRun);
const legacyCountMatch = /(?:^|;\s*)legacy_package_files=(\d+)(?=;|$)/m.exec(rpfRun);
ok(Boolean(currentRpfMatch), 'current S0-E output exposes corrected RPF');
ok(Boolean(legacyRpfMatch), 'S0-E output exposes explicit legacy RPF control');
eq(currentRpfMatch[1], 'sha256:880ad517fda59415bfcfcb476e29139718d386db708bd652b67c3c10aa38ecff', 'current S0-E RPF equals canonical 34-file identity');
eq(legacyRpfMatch[1], 'sha256:710d9a44279541adb6ef609b9cad4b34beba17610fb585e668fc1376c362b623', 'legacy S0-E RPF remains reproducible control');
eq(packageCountMatch && Number(packageCountMatch[1]), 34, 'S0-E output current package count');
eq(legacyCountMatch && Number(legacyCountMatch[1]), 33, 'S0-E output legacy package count');
ok(currentRpfMatch[1] !== legacyRpfMatch[1], 'current and legacy RPFs remain distinct');

const tmp = initRepo();
try {
  const mini = authority.parseManifestBytes(canonicalManifest(['manifest.json', 'a.js']));
  const commit = commitFiles(tmp, {
    'manifest.json': Buffer.from('{"name":"fixture"}\n'),
    'a.js': Buffer.from('alpha\n')
  }, 'base');
  const before = authority.resolvePackage(commit, mini, { repoRoot: tmp });
  const beforeA = before.members.find((item) => item.path === 'a.js');
  fs.writeFileSync(path.join(tmp, 'a.js'), 'working-tree mutation\n');
  const after = authority.resolvePackage(commit, mini, { repoRoot: tmp });
  const afterA = after.members.find((item) => item.path === 'a.js');
  eq(afterA.git_oid, beforeA.git_oid, 'working-tree mutation cannot change exact candidate OID');
  eq(afterA.sha256, beforeA.sha256, 'working-tree mutation cannot change exact candidate bytes');

  const missing = authority.parseManifestBytes(canonicalManifest(['manifest.json', 'missing.js']));
  throwsCode(
    () => authority.resolvePackage(commit, missing, { repoRoot: tmp }),
    'PACKAGE_MEMBER_MISSING',
    'missing exact member rejected'
  );

  git(tmp, ['checkout', '--', 'a.js']);
  git(tmp, ['update-index', '--chmod=+x', 'a.js']);
  git(tmp, ['commit', '-q', '-m', 'executable']);
  const executableCommit = git(tmp, ['rev-parse', 'HEAD']).trim();
  throwsCode(
    () => authority.resolvePackage(executableCommit, mini, { repoRoot: tmp }),
    'PACKAGE_MEMBER_MODE_INVALID',
    '100755 package member rejected'
  );

  const blobOid = git(tmp, ['hash-object', '-w', 'a.js']).trim();
  throwsCode(
    () => authority.resolvePackage(blobOid, mini, { repoRoot: tmp }),
    'PACKAGE_CANDIDATE_NOT_COMMIT',
    'blob object cannot masquerade as candidate commit'
  );

  const linkBlob = git(tmp, ['hash-object', '-w', '--stdin'], { input: 'a.js\n' }).trim();
  git(tmp, ['read-tree', commit]);
  git(tmp, ['update-index', '--add', '--cacheinfo', '120000', linkBlob, 'a.js']);
  const linkTree = git(tmp, ['write-tree']).trim();
  const linkCommit = git(tmp, ['commit-tree', linkTree, '-p', commit, '-m', 'symlink member']).trim();
  throwsCode(
    () => authority.resolvePackage(linkCommit, mini, { repoRoot: tmp }),
    'PACKAGE_MEMBER_MODE_INVALID',
    '120000 symlink member rejected'
  );

  const emptyTree = git(tmp, ['mktree'], { input: '' }).trim();
  const rootTree = git(tmp, ['mktree'], {
    input: `040000 tree ${emptyTree}\tmanifest.json\n`
  }).trim();
  const treeCommit = git(tmp, ['commit-tree', rootTree, '-m', 'tree member']).trim();
  const one = authority.parseManifestBytes(canonicalManifest(['manifest.json']));
  throwsCode(
    () => authority.resolvePackage(treeCommit, one, { repoRoot: tmp }),
    'PACKAGE_MEMBER_TYPE_INVALID',
    'tree where file expected rejected'
  );

  throwsCode(
    () => authority.resolvePackage(commit, mini, { repoRoot: tmp, maxBlobBytes: 1 }),
    'PACKAGE_MEMBER_TOO_LARGE',
    'per-member byte bound enforced before blob read'
  );
  throwsCode(
    () => authority.resolvePackage(commit, mini, { repoRoot: tmp, maxTotalBytes: 10 }),
    'PACKAGE_TOTAL_BYTES_EXCEEDED',
    'aggregate byte bound enforced'
  );
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

throwsCode(
  () => authority.normalizedLimits({ maxBlobBytes: authority.MAX_BLOB_BYTES + 1 }),
  'PACKAGE_LIMIT_BLOB_INVALID',
  'caller cannot weaken canonical blob limit'
);
throwsCode(
  () => authority.normalizedLimits({ maxTotalBytes: authority.MAX_TOTAL_BYTES + 1 }),
  'PACKAGE_LIMIT_TOTAL_INVALID',
  'caller cannot weaken canonical aggregate limit'
);

eq(authority.parseArgs(['--candidate', head]).candidate, head, 'CLI exact candidate parsed');
throwsCode(() => authority.parseArgs(['--candidate', head, '--candidate', head]), 'PACKAGE_ARGUMENT_CONFLICT', 'duplicate candidate arg rejected');
throwsCode(() => authority.parseArgs(['--unknown']), 'PACKAGE_ARGUMENT_INVALID', 'unknown CLI arg rejected');

const source = fs.readFileSync(path.join(ROOT, 'project_tools', 'release_package_authority.js'), 'utf8');
ok(!source.includes('git archive'), 'authority does not derive bytes from git archive');
ok(!source.includes('readdirSync'), 'authority does not discover package membership by filesystem scan');
ok(source.includes("['cat-file', 'blob', oid]"), 'authority reads immutable Git blob bytes');
ok(source.includes("mode !== '100644'"), 'authority enforces regular non-executable Git mode');
ok(!source.includes('release-gate'), 'passive authority does not activate release gate');

console.log(
  `P1-231 S0-A package authority: PASS; checks=${checks}; package_files=${topology.files.length}; topology_sha256=${digest}; candidate=${head}; runtime_changed=false; s0e_current_package_complete=true; release_gate_activated=false`
);
