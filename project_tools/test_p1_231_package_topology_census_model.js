'use strict';

// Research-only deterministic model for P1-231 package-topology authority.
// This does not build/publish an extension and does not activate release policy.

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const PACKAGE_SCHEMA = 'webclip-extension-package/v1';

const PACKAGE_ROOT_FILES = Object.freeze([
  'application-generation.js',
  'content-injection-guard.js',
  'content.js',
  'frame-agent.js',
  'frame-proxy-budget-guard.js',
  'frame-proxy-inert-guard.js',
  'host-control-activation-guard.js',
  'journal-import-digest.js',
  'journal-import-stream.js',
  'journal-restore-envelope-guard.js',
  'journal-text-filter.js',
  'journal.css',
  'journal.html',
  'journal.js',
  'local-download-identity.js',
  'manifest.json',
  'offscreen-blob-admission-guard.js',
  'offscreen-bootstrap.js',
  'offscreen.html',
  'offscreen.js',
  'operation-log-redaction-guard.js',
  'options.css',
  'options.html',
  'options.js',
  'pdf-print-guard.js',
  'popup.css',
  'popup.html',
  'popup.js',
  'prepared-save-as.js',
  'public-suffix.js',
  'service-worker.js',
  'yandex-auth-help.css',
  'yandex-auth-help.html',
  'yandex-auth-help.js',
]);

const NON_PACKAGE_ROOT_FILES = new Set([
  '.gitignore',
  'GITHUB_REPOSITORY_STATE.md',
  'README.md',
  'public_suffix_list.dat',
]);
const NON_PACKAGE_DIRS = Object.freeze(['.github', 'project_docs', 'project_tools']);
const PACKAGE_SET = new Set(PACKAGE_ROOT_FILES);

let cases = 0;
function check(condition, message) {
  cases += 1;
  assert(condition, message);
}
function eq(actual, expected, message) {
  cases += 1;
  assert.strictEqual(actual, expected, message);
}
function deepEq(actual, expected, message) {
  cases += 1;
  assert.deepStrictEqual(actual, expected, message);
}

function git(...args) {
  return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function classifyPackagePath(rel) {
  const normalized = String(rel).replace(/\\/g, '/').replace(/^\.\//, '');
  if (PACKAGE_SET.has(normalized)) return 'package';
  if (NON_PACKAGE_ROOT_FILES.has(normalized)) return 'non-package';
  for (const dir of NON_PACKAGE_DIRS) {
    if (normalized === dir || normalized.startsWith(`${dir}/`)) return 'non-package';
  }
  return 'unknown';
}

function writeU32(value) {
  const out = Buffer.alloc(4);
  out.writeUInt32BE(value);
  return out;
}
function writeU64(value) {
  const out = Buffer.alloc(8);
  out.writeBigUInt64BE(BigInt(value));
  return out;
}

function topologyDigest(packageFiles = PACKAGE_ROOT_FILES) {
  return crypto.createHash('sha256')
    .update(`${PACKAGE_SCHEMA}\0${[...packageFiles].sort().join('\0')}`, 'utf8')
    .digest('hex');
}

function computeRpf(fileMap, packageFiles = PACKAGE_ROOT_FILES) {
  const hash = crypto.createHash('sha256');
  hash.update(Buffer.from('WEBCLIP_RPF_V1\0', 'utf8'));
  hash.update(Buffer.from(topologyDigest(packageFiles), 'ascii'));
  hash.update(Buffer.from([0]));
  const sorted = [...packageFiles].sort((a, b) => Buffer.from(a).compare(Buffer.from(b)));
  for (const rel of sorted) {
    const content = fileMap.get(rel);
    if (!Buffer.isBuffer(content)) throw new Error(`missing package member: ${rel}`);
    const p = Buffer.from(rel, 'utf8');
    hash.update(writeU32(p.length));
    hash.update(p);
    hash.update(writeU64(content.length));
    hash.update(content);
  }
  return hash.digest('hex');
}

function currentPackageMap() {
  return new Map(PACKAGE_ROOT_FILES.map((rel) => [rel, fs.readFileSync(path.join(ROOT, rel))]));
}

function parseLsFilesStage() {
  const raw = git('ls-files', '-s');
  const entries = new Map();
  for (const line of raw.split(/\r?\n/)) {
    if (!line) continue;
    const tab = line.indexOf('\t');
    assert(tab > 0, `unexpected git ls-files -s line: ${line}`);
    const meta = line.slice(0, tab).split(/\s+/);
    const rel = line.slice(tab + 1);
    entries.set(rel, { mode: meta[0], oid: meta[1], stage: meta[2] });
  }
  return entries;
}

function provePslRegeneration() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'webclip-p1-231-psl-'));
  try {
    fs.mkdirSync(path.join(tmp, 'project_tools'));
    fs.copyFileSync(path.join(ROOT, 'public_suffix_list.dat'), path.join(tmp, 'public_suffix_list.dat'));
    fs.copyFileSync(
      path.join(ROOT, 'project_tools', 'build_public_suffix_js.py'),
      path.join(tmp, 'project_tools', 'build_public_suffix_js.py')
    );
    const python = process.platform === 'win32' ? 'python' : 'python3';
    execFileSync(python, [path.join(tmp, 'project_tools', 'build_public_suffix_js.py')], {
      cwd: tmp,
      stdio: 'pipe',
    });
    const regenerated = fs.readFileSync(path.join(tmp, 'public-suffix.js'));
    const committed = fs.readFileSync(path.join(ROOT, 'public-suffix.js'));
    return regenerated.equals(committed);
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

(function main() {
  eq(PACKAGE_ROOT_FILES.length, 34, 'current package census must contain exactly 34 root files');
  eq(PACKAGE_SET.size, PACKAGE_ROOT_FILES.length, 'package list must not contain duplicates');
  eq(PACKAGE_ROOT_FILES.filter((p) => p === 'manifest.json').length, 1, 'manifest.json must appear exactly once');
  eq(PACKAGE_ROOT_FILES.filter((p) => p.endsWith('.js')).length, 24, 'JS census drift');
  eq(PACKAGE_ROOT_FILES.filter((p) => p.endsWith('.html')).length, 5, 'HTML census drift');
  eq(PACKAGE_ROOT_FILES.filter((p) => p.endsWith('.css')).length, 4, 'CSS census drift');

  deepEq([...NON_PACKAGE_DIRS].sort(), ['.github', 'project_docs', 'project_tools'], 'known control dirs drift');
  eq(classifyPackagePath('public_suffix_list.dat'), 'non-package', 'PSL source data is source input, not package member');
  eq(classifyPackagePath('public-suffix.js'), 'package', 'generated PSL JS is package member');
  eq(classifyPackagePath('project_docs/example.md'), 'non-package', 'project docs are known non-package');
  eq(classifyPackagePath('project_tools/tool.py'), 'non-package', 'project tools are known non-package');
  eq(classifyPackagePath('.github/workflows/example.yml'), 'non-package', 'GitHub control files are known non-package');
  eq(classifyPackagePath('runtime.wasm'), 'unknown', 'new root wasm must fail closed');
  eq(classifyPackagePath('runtime-data.json'), 'unknown', 'new root data JSON must fail closed');
  eq(classifyPackagePath('helper.js'), 'unknown', 'new root JS must not be silently package-admitted by suffix');
  eq(classifyPackagePath('vendor/foo.js'), 'unknown', 'new top-level directory must fail closed');
  eq(classifyPackagePath('assets/model.bin'), 'unknown', 'assets are not current package topology until explicitly admitted');
  eq(classifyPackagePath('icons/icon.png'), 'unknown', 'icons are not current package topology until explicitly admitted');

  const tracked = git('ls-files').split(/\r?\n/).filter(Boolean);
  const unknownTracked = tracked.filter((p) => classifyPackagePath(p) === 'unknown');
  deepEq(unknownTracked, [], `all current tracked paths must be classified; unknown=${unknownTracked.join(',')}`);

  const packageTracked = tracked.filter((p) => classifyPackagePath(p) === 'package').sort();
  deepEq(packageTracked, [...PACKAGE_ROOT_FILES].sort(), 'tracked package projection must equal exact census');
  check(tracked.length > PACKAGE_ROOT_FILES.length, 'whole tracked tree must be larger than extension package');
  check(tracked.some((p) => p.startsWith('project_docs/')), 'tracked tree must contain project docs excluded from package');
  check(tracked.some((p) => p.startsWith('project_tools/')), 'tracked tree must contain project tools excluded from package');

  const rootDirs = git('ls-tree', '-d', '--name-only', 'HEAD').split(/\r?\n/).filter(Boolean).sort();
  deepEq(rootDirs, ['.github', 'project_docs', 'project_tools'], 'current top-level directory census drift');
  check(!rootDirs.includes('assets'), 'assets directory must not be silently assumed present');
  check(!rootDirs.includes('icons'), 'icons directory must not be silently assumed present');

  const stage = parseLsFilesStage();
  for (const rel of PACKAGE_ROOT_FILES) {
    const entry = stage.get(rel);
    check(Boolean(entry), `package member must be tracked: ${rel}`);
    eq(entry.mode, '100644', `package member must be a regular non-executable blob: ${rel}`);
    eq(entry.stage, '0', `package member must be stage 0: ${rel}`);
    check(fs.lstatSync(path.join(ROOT, rel)).isFile(), `package member must be regular file: ${rel}`);
  }

  for (const forbiddenPrefix of ['.github/', 'project_docs/', 'project_tools/']) {
    check(!PACKAGE_ROOT_FILES.some((p) => p.startsWith(forbiddenPrefix)), `package must exclude ${forbiddenPrefix}`);
  }

  const sw = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
  check(sw.includes("importScripts('public-suffix.js'"), 'runtime must load generated public-suffix.js');
  const builder = fs.readFileSync(path.join(ROOT, 'project_tools', 'build_public_suffix_js.py'), 'utf8');
  check(builder.includes("SRC = ROOT / 'public_suffix_list.dat'"), 'PSL builder input contract drift');
  check(builder.includes("OUT = ROOT / 'public-suffix.js'"), 'PSL builder output contract drift');
  const pslTest = fs.readFileSync(path.join(ROOT, 'project_tools', 'test_public_suffix.js'), 'utf8');
  check(!pslTest.includes('public_suffix_list.dat'), 'existing PSL behavior test must not be mistaken for regeneration proof');

  const regenMatches = provePslRegeneration();
  check(regenMatches, 'current public_suffix_list.dat must regenerate byte-identical public-suffix.js');

  const currentMap = currentPackageMap();
  const currentRpf = computeRpf(currentMap);
  check(/^[0-9a-f]{64}$/.test(currentRpf), 'current research RPF must be SHA-256 hex');

  const changedRuntime = new Map(currentMap);
  changedRuntime.set('public-suffix.js', Buffer.concat([changedRuntime.get('public-suffix.js'), Buffer.from('\n// synthetic change')]));
  check(computeRpf(changedRuntime) !== currentRpf, 'package byte change must change RPF');

  const docsOnlyMap = new Map(currentMap);
  check(computeRpf(docsOnlyMap) === currentRpf, 'non-package docs evidence must not change RPF');

  const sourceOnlyMap = new Map(currentMap);
  check(computeRpf(sourceOnlyMap) === currentRpf, 'source-only PSL input is outside logical package RPF');

  const reordered = [...PACKAGE_ROOT_FILES].reverse();
  check(computeRpf(currentMap, reordered) === currentRpf, 'package list order must not affect canonical RPF');

  const topologyChanged = [...PACKAGE_ROOT_FILES, 'synthetic-package-member.bin'];
  const topologyMap = new Map(currentMap);
  topologyMap.set('synthetic-package-member.bin', Buffer.from('x'));
  check(computeRpf(topologyMap, topologyChanged) !== currentRpf, 'package topology change must change RPF');

  check(topologyDigest([...PACKAGE_ROOT_FILES].reverse()) === topologyDigest(PACKAGE_ROOT_FILES), 'topology digest must canonicalize order');
  check(topologyDigest([...PACKAGE_ROOT_FILES, 'x']) !== topologyDigest(PACKAGE_ROOT_FILES), 'topology digest must change on membership change');

  const stagedMembers = [...PACKAGE_ROOT_FILES].sort();
  deepEq(stagedMembers, packageTracked, 'staged member model must equal package_paths projection');
  check(tracked.length !== stagedMembers.length, 'whole-repository archive must not equal official staged package projection');

  const packageBytes = PACKAGE_ROOT_FILES.reduce((sum, rel) => sum + fs.statSync(path.join(ROOT, rel)).size, 0);
  check(packageBytes > 0, 'package byte census must be non-zero');
  check(packageBytes < 512 * 1024 * 1024, 'package byte census must fit proposed conservative RPF bound');
  check(PACKAGE_ROOT_FILES.length < 4096, 'package file census must fit proposed conservative RPF count bound');

  console.log(`P1-231 package topology census model: PASS; cases=${cases}; package_files=${PACKAGE_ROOT_FILES.length}; package_bytes=${packageBytes}; research_rpf=${currentRpf}; psl_regen=match`);
})();
