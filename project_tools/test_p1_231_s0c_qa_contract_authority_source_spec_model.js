'use strict';

// Research-only deterministic source-spec model for P1-231 S0-C.
// Defines release-contract / QA projection authority without activating release policy
// and without running real Chrome or Yandex external qualification.

const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const SCHEMA = 'webclip-release-contract-inputs/v1';
const FP_PROFILE = 'webclip-contract-fingerprint-v1';
const QCF_PREFIX = 'WEBCLIP_QCF_V1';
const RCF_PREFIX = 'WEBCLIP_RCF_V1';
const MAX_MANIFEST_BYTES = 512 * 1024;
const MAX_FULL_INPUTS = 128;
const MAX_CASES = 128;
const MAX_TOKENS = 128;
const MAX_TOKEN_BYTES = 256;
const MAX_PATH_BYTES = 1024;
const TOP_KEYS = new Set(['schema', 'fingerprint_profile', 'full_rcf', 'projections']);
const FULL_KEYS = new Set(['blob_inputs']);
const PROJECTION_KEYS = new Set(['schema', 'subject', 'environment_policy', 'cases']);
const CASE_KEYS = new Set(['id', 'assertions']);
const PROJECTION_NAMES = Object.freeze(['unpacked-chrome', 'yandex-e2e']);
const PROJECTION_CONTRACT = Object.freeze({
  'unpacked-chrome': Object.freeze({ schema: 'webclip-qa-contract/unpacked-chrome/v1', subject: 'staged-unpacked', prefix: 'chrome.' }),
  'yandex-e2e': Object.freeze({ schema: 'webclip-qa-contract/yandex-e2e/v1', subject: 'live-yandex-provider', prefix: 'yandex.' }),
});
const FORBIDDEN_FULL_FILES = new Set([
  'project_docs/RELEASE_READINESS.md',
  'project_docs/TEST_STATUS.md',
  'project_docs/TEST_EVIDENCE.md',
]);
const FORBIDDEN_FULL_PREFIXES = Object.freeze([
  'project_docs/release_evidence/receipts/',
  'project_docs/release_evidence/summaries/',
]);
const RESERVED = new Set([
  'con', 'prn', 'aux', 'nul',
  ...Array.from({ length: 9 }, (_, i) => `com${i + 1}`),
  ...Array.from({ length: 9 }, (_, i) => `lpt${i + 1}`),
]);

let cases = 0;
function check(v, m) { cases += 1; assert(v, m); }
function eq(a, b, m) { cases += 1; assert.strictEqual(a, b, m); }
function deepEq(a, b, m) { cases += 1; assert.deepStrictEqual(a, b, m); }
function fail(code, detail) { const e = new Error(detail || code); e.code = code; throw e; }
function throwsCode(fn, code, msg) { cases += 1; assert.throws(fn, (e) => e && e.code === code, msg || `expected ${code}`); }
function lowerAscii(s) { return s.replace(/[A-Z]/g, (c) => c.toLowerCase()); }
function git(...args) { return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim(); }
function u32(n) { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b; }
function u64(n) { const b = Buffer.alloc(8); b.writeBigUInt64BE(BigInt(n)); return b; }
function sha256(buf) { return crypto.createHash('sha256').update(buf).digest('hex'); }

function rejectDuplicateObjectKeys(text) {
  const stack = [];
  let i = 0;
  function skipWs() { while (i < text.length && /[\x20\x09\x0a\x0d]/.test(text[i])) i += 1; }
  function readString() {
    const start = i;
    i += 1;
    let escaped = false;
    while (i < text.length) {
      const ch = text[i++];
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === '"') return text.slice(start, i);
    }
    fail('RELEASE_CONTRACT_MANIFEST_JSON_INVALID', 'unterminated string');
  }
  while (i < text.length) {
    skipWs();
    if (i >= text.length) break;
    const ch = text[i];
    if (ch === '{') { stack.push({ type: 'object', keys: new Set(), expectingKey: true }); i += 1; continue; }
    if (ch === '[') { stack.push({ type: 'array' }); i += 1; continue; }
    if (ch === '}' || ch === ']') { if (stack.length) stack.pop(); i += 1; continue; }
    if (ch === '"') {
      const raw = readString();
      skipWs();
      const frame = stack[stack.length - 1];
      if (frame && frame.type === 'object' && frame.expectingKey && text[i] === ':') {
        let key;
        try { key = JSON.parse(raw); } catch { fail('RELEASE_CONTRACT_MANIFEST_JSON_INVALID'); }
        if (frame.keys.has(key)) fail('RELEASE_CONTRACT_MANIFEST_DUPLICATE_KEY', key);
        frame.keys.add(key);
        frame.expectingKey = false;
      }
      continue;
    }
    if (ch === ',' && stack.length) {
      const frame = stack[stack.length - 1];
      if (frame.type === 'object') frame.expectingKey = true;
      i += 1;
      continue;
    }
    i += 1;
  }
}

function validatePath(p) {
  if (typeof p !== 'string' || !p || Buffer.byteLength(p, 'utf8') > MAX_PATH_BYTES) fail('RELEASE_CONTRACT_INPUT_INVALID');
  if (!/^[\x00-\x7f]+$/.test(p) || p.startsWith('/') || p.endsWith('/') || p.includes('//') || p.includes('\\')) fail('RELEASE_CONTRACT_INPUT_INVALID');
  if (/[\x00-\x1f\x7f]/.test(p)) fail('RELEASE_CONTRACT_INPUT_INVALID');
  for (const seg of p.split('/')) {
    if (!seg || !/^[A-Za-z0-9._-]+$/.test(seg) || seg === '.' || seg === '..' || seg.endsWith('.')) fail('RELEASE_CONTRACT_INPUT_INVALID');
    if (RESERVED.has(lowerAscii(seg.split('.')[0]))) fail('RELEASE_CONTRACT_INPUT_INVALID');
  }
  if (FORBIDDEN_FULL_FILES.has(p) || FORBIDDEN_FULL_PREFIXES.some((prefix) => p.startsWith(prefix))) {
    fail('RELEASE_CONTRACT_MUTABLE_EVIDENCE_INPUT_FORBIDDEN', p);
  }
  return p;
}

function validateToken(value, prefix = null) {
  if (typeof value !== 'string' || !value || Buffer.byteLength(value, 'utf8') > MAX_TOKEN_BYTES) fail('RELEASE_CONTRACT_CASE_INVALID');
  if (!/^[a-z0-9][a-z0-9.-]*$/.test(value)) fail('RELEASE_CONTRACT_CASE_INVALID');
  if (prefix && !value.startsWith(prefix)) fail('RELEASE_CONTRACT_CASE_INVALID');
  return value;
}

function canonicalUniqueStrings(value, { max = MAX_TOKENS, pathMode = false, prefix = null } = {}) {
  if (!Array.isArray(value) || value.length === 0 || value.length > max) fail(pathMode ? 'RELEASE_CONTRACT_INPUT_INVALID' : 'RELEASE_CONTRACT_CASE_INVALID');
  const exact = new Set();
  const folded = new Set();
  for (const raw of value) {
    const v = pathMode ? validatePath(raw) : validateToken(raw, prefix);
    const foldedValue = lowerAscii(v);
    if (exact.has(v) || folded.has(foldedValue)) fail(pathMode ? 'RELEASE_CONTRACT_INPUT_INVALID' : 'RELEASE_CONTRACT_CASE_INVALID');
    exact.add(v); folded.add(foldedValue);
  }
  return [...exact].sort((a, b) => Buffer.from(a).compare(Buffer.from(b)));
}

function canonicalizeCase(raw, domainPrefix) {
  if (!raw || Array.isArray(raw) || typeof raw !== 'object') fail('RELEASE_CONTRACT_CASE_INVALID');
  for (const k of Object.keys(raw)) if (!CASE_KEYS.has(k)) fail('RELEASE_CONTRACT_MANIFEST_UNKNOWN_FIELD', k);
  for (const k of CASE_KEYS) if (!Object.prototype.hasOwnProperty.call(raw, k)) fail('RELEASE_CONTRACT_CASE_INVALID', k);
  const id = validateToken(raw.id, domainPrefix);
  const assertions = canonicalUniqueStrings(raw.assertions);
  return Object.freeze({ id, assertions: Object.freeze(assertions) });
}

function canonicalizeProjection(kind, raw) {
  if (!raw || Array.isArray(raw) || typeof raw !== 'object') fail('RELEASE_CONTRACT_PROJECTION_INVALID');
  for (const k of Object.keys(raw)) if (!PROJECTION_KEYS.has(k)) fail('RELEASE_CONTRACT_MANIFEST_UNKNOWN_FIELD', k);
  for (const k of PROJECTION_KEYS) if (!Object.prototype.hasOwnProperty.call(raw, k)) fail('RELEASE_CONTRACT_PROJECTION_INVALID', k);
  const expected = PROJECTION_CONTRACT[kind];
  if (!expected) fail('RELEASE_CONTRACT_PROJECTION_SET_INVALID', kind);
  if (raw.schema !== expected.schema || raw.subject !== expected.subject) fail('RELEASE_CONTRACT_PROJECTION_INVALID', kind);
  const environment_policy = canonicalUniqueStrings(raw.environment_policy);
  if (!Array.isArray(raw.cases) || raw.cases.length === 0 || raw.cases.length > MAX_CASES) fail('RELEASE_CONTRACT_PROJECTION_INVALID');
  const ids = new Set();
  const projectionCases = raw.cases.map((c) => canonicalizeCase(c, expected.prefix));
  for (const c of projectionCases) {
    const f = lowerAscii(c.id);
    if (ids.has(f)) fail('RELEASE_CONTRACT_CASE_INVALID', c.id);
    ids.add(f);
  }
  projectionCases.sort((a, b) => Buffer.from(a.id).compare(Buffer.from(b.id)));
  return Object.freeze({ schema: raw.schema, subject: raw.subject, environment_policy: Object.freeze(environment_policy), cases: Object.freeze(projectionCases) });
}

function validateAuthority(raw) {
  if (!raw || Array.isArray(raw) || typeof raw !== 'object') fail('RELEASE_CONTRACT_MANIFEST_SHAPE_INVALID');
  for (const k of Object.keys(raw)) if (!TOP_KEYS.has(k)) fail('RELEASE_CONTRACT_MANIFEST_UNKNOWN_FIELD', k);
  for (const k of TOP_KEYS) if (!Object.prototype.hasOwnProperty.call(raw, k)) fail('RELEASE_CONTRACT_MANIFEST_SHAPE_INVALID', k);
  if (raw.schema !== SCHEMA) fail('RELEASE_CONTRACT_SCHEMA_UNSUPPORTED');
  if (raw.fingerprint_profile !== FP_PROFILE) fail('RELEASE_CONTRACT_FINGERPRINT_PROFILE_UNSUPPORTED');
  if (!raw.full_rcf || Array.isArray(raw.full_rcf) || typeof raw.full_rcf !== 'object') fail('RELEASE_CONTRACT_MANIFEST_SHAPE_INVALID');
  for (const k of Object.keys(raw.full_rcf)) if (!FULL_KEYS.has(k)) fail('RELEASE_CONTRACT_MANIFEST_UNKNOWN_FIELD', k);
  for (const k of FULL_KEYS) if (!Object.prototype.hasOwnProperty.call(raw.full_rcf, k)) fail('RELEASE_CONTRACT_MANIFEST_SHAPE_INVALID', k);
  const blob_inputs = canonicalUniqueStrings(raw.full_rcf.blob_inputs, { max: MAX_FULL_INPUTS, pathMode: true });

  if (!raw.projections || Array.isArray(raw.projections) || typeof raw.projections !== 'object') fail('RELEASE_CONTRACT_PROJECTION_SET_INVALID');
  const names = Object.keys(raw.projections).sort();
  deepEqInternal(names, [...PROJECTION_NAMES].sort(), 'projection-set');
  const projections = {};
  for (const kind of PROJECTION_NAMES) projections[kind] = canonicalizeProjection(kind, raw.projections[kind]);
  return Object.freeze({ schema: SCHEMA, fingerprint_profile: FP_PROFILE, full_rcf: Object.freeze({ blob_inputs: Object.freeze(blob_inputs) }), projections: Object.freeze(projections) });
}

function deepEqInternal(a, b, detail) {
  if (JSON.stringify(a) !== JSON.stringify(b)) fail('RELEASE_CONTRACT_PROJECTION_SET_INVALID', detail);
}

function parseStrictManifest(bytes) {
  if (!Buffer.isBuffer(bytes) || bytes.length === 0) fail('RELEASE_CONTRACT_MANIFEST_JSON_INVALID');
  if (bytes.length > MAX_MANIFEST_BYTES) fail('RELEASE_CONTRACT_MANIFEST_TOO_LARGE');
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) fail('RELEASE_CONTRACT_MANIFEST_BOM_FORBIDDEN');
  const text = bytes.toString('utf8');
  if (!Buffer.from(text, 'utf8').equals(bytes)) fail('RELEASE_CONTRACT_MANIFEST_UTF8_INVALID');
  rejectDuplicateObjectKeys(text);
  let value;
  try { value = JSON.parse(text); } catch { fail('RELEASE_CONTRACT_MANIFEST_JSON_INVALID'); }
  return validateAuthority(value);
}

function pushString(h, value) { const b = Buffer.from(value, 'utf8'); h.update(u32(b.length)); h.update(b); }
function pushList(h, list) { h.update(u32(list.length)); for (const x of list) pushString(h, x); }

function qcf(kind, authority) {
  const p = authority.projections[kind];
  if (!p) fail('RELEASE_CONTRACT_PROJECTION_INVALID');
  const h = crypto.createHash('sha256');
  pushString(h, `${QCF_PREFIX}:${kind}`);
  pushString(h, p.schema);
  pushString(h, p.subject);
  pushList(h, p.environment_policy);
  h.update(u32(p.cases.length));
  for (const c of p.cases) { pushString(h, c.id); pushList(h, c.assertions); }
  return `sha256:${h.digest('hex')}`;
}

function semanticAuthorityDigest(authority) {
  const h = crypto.createHash('sha256');
  pushString(h, 'WEBCLIP_RELEASE_CONTRACT_AUTHORITY_SEMANTICS_V1');
  pushString(h, authority.schema);
  pushString(h, authority.fingerprint_profile);
  pushList(h, authority.full_rcf.blob_inputs);
  for (const kind of [...PROJECTION_NAMES].sort()) pushString(h, qcf(kind, authority));
  return h.digest('hex');
}

function rcf(authority, overrides = new Map()) {
  const h = crypto.createHash('sha256');
  pushString(h, RCF_PREFIX);
  pushString(h, semanticAuthorityDigest(authority));
  for (const rel of authority.full_rcf.blob_inputs) {
    const data = overrides.has(rel) ? overrides.get(rel) : fs.readFileSync(path.join(ROOT, rel));
    if (!Buffer.isBuffer(data)) fail('RELEASE_CONTRACT_INPUT_INVALID', rel);
    pushString(h, rel);
    h.update(u64(data.length)); h.update(data);
  }
  return `sha256:${h.digest('hex')}`;
}

function gitEntry(commit, rel) {
  const raw = execFileSync('git', ['ls-tree', commit, '--', rel], { cwd: ROOT, encoding: 'utf8' }).trim();
  if (!raw) return null;
  const tab = raw.indexOf('\t');
  const [mode, type, oid] = raw.slice(0, tab).split(/\s+/);
  return { mode, type, oid, path: raw.slice(tab + 1) };
}

function clone(obj) { return JSON.parse(JSON.stringify(obj)); }

const AUTHORITY_FIXTURE = {
  schema: SCHEMA,
  fingerprint_profile: FP_PROFILE,
  full_rcf: {
    blob_inputs: [
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
    ],
  },
  projections: {
    'unpacked-chrome': {
      schema: 'webclip-qa-contract/unpacked-chrome/v1',
      subject: 'staged-unpacked',
      environment_policy: [
        'browser-meets-candidate-minimum', 'browser-version-recorded-in-receipt', 'chrome-or-chrome-for-testing',
        'no-enterprise-policy-bypass', 'real-download-boundary', 'real-extension-debugger-path',
        'real-unpacked-mv3', 'real-user-permission-ui',
      ],
      cases: [
        { id: 'chrome.unpacked-load', assertions: ['extension-startup-operational','manifest-v3','real-unpacked-extension-load','staged-bytes-equal-candidate-git-blobs','staged-file-set-equals-package','staged-rpf-equals-candidate-rpf'] },
        { id: 'chrome.optional-host-permission', assertions: ['cross-origin-frame','navigation','real-user-deny','real-user-grant','regrant','reload','revoke','stale-frame-or-document-fails-closed'] },
        { id: 'chrome.debugger-print', assertions: ['actual-extension-chrome-debugger','actual-page-print-to-pdf','bounded-failure-is-truthful','no-policy-bypass','render-fidelity-contract','selected-or-full-document-contract-as-applicable'] },
        { id: 'chrome.download-save-as', assertions: ['automatic-download','complete-and-interrupted-handling','late-settlement-reconciliation','native-save-as','no-duplicate-start-after-unknown','restart-recovery','terminal-downloaditem-truth'] },
      ],
    },
    'yandex-e2e': {
      schema: 'webclip-qa-contract/yandex-e2e/v1',
      subject: 'live-yandex-provider',
      environment_policy: [
        'account-root-capability-recorded-without-secret','immutable-live-account-root-context','no-secret-in-receipt',
        'no-signed-transfer-url-in-durable-evidence','real-oauth','real-yandex-rest-api','same-rpf-runtime-generation',
      ],
      cases: [
        { id: 'yandex.oauth-context', assertions: ['account-identity','account-switch-fails-stale-context','capability-identity','manual-resume-after-reauth','real-oauth','reauth-fencing','root-identity','root-switch-fails-stale-context'] },
        { id: 'yandex.remote-effects', assertions: ['delete','exact-object-reconciliation','exact-remote-byte-verification','move','namespace-ownership','publish','unpublish','upload'] },
        { id: 'yandex.backup-restore', assertions: ['backup','journal-generation-admission','no-destructive-retarget','restore','selected-object-binding','staging-receipt-binding'] },
        { id: 'yandex.failure-settlement', assertions: ['account-root-switching','auth-expiry','reconciliation','restart-recovery','retry-no-duplicate-effect','started-unknown','timeout','transport-failure'] },
      ],
    },
  },
};

(function main() {
  const raw = Buffer.from(JSON.stringify(AUTHORITY_FIXTURE), 'utf8');
  const authority = parseStrictManifest(raw);
  eq(authority.full_rcf.blob_inputs.length, 11, 'full RCF input count');
  eq(authority.projections['unpacked-chrome'].cases.length, 4, 'Chrome case-family count');
  eq(authority.projections['yandex-e2e'].cases.length, 4, 'Yandex case-family count');

  // Raw parser / closed shape.
  throwsCode(() => parseStrictManifest(Buffer.alloc(0)), 'RELEASE_CONTRACT_MANIFEST_JSON_INVALID');
  throwsCode(() => parseStrictManifest(Buffer.alloc(MAX_MANIFEST_BYTES + 1, 0x20)), 'RELEASE_CONTRACT_MANIFEST_TOO_LARGE');
  throwsCode(() => parseStrictManifest(Buffer.concat([Buffer.from([0xef,0xbb,0xbf]), raw])), 'RELEASE_CONTRACT_MANIFEST_BOM_FORBIDDEN');
  throwsCode(() => parseStrictManifest(Buffer.from([0xc3,0x28])), 'RELEASE_CONTRACT_MANIFEST_UTF8_INVALID');
  throwsCode(() => parseStrictManifest(Buffer.from('{')), 'RELEASE_CONTRACT_MANIFEST_JSON_INVALID');
  throwsCode(() => parseStrictManifest(Buffer.from('{"schema":"webclip-release-contract-inputs/v1","schema":"x","fingerprint_profile":"webclip-contract-fingerprint-v1","full_rcf":{"blob_inputs":["x"]},"projections":{}}')), 'RELEASE_CONTRACT_MANIFEST_DUPLICATE_KEY');
  const nestedDup = JSON.stringify(AUTHORITY_FIXTURE).replace('"subject":"staged-unpacked"', '"subject":"staged-unpacked","subject":"x"');
  throwsCode(() => parseStrictManifest(Buffer.from(nestedDup)), 'RELEASE_CONTRACT_MANIFEST_DUPLICATE_KEY');
  throwsCode(() => validateAuthority({ ...AUTHORITY_FIXTURE, command: 'run-tests' }), 'RELEASE_CONTRACT_MANIFEST_UNKNOWN_FIELD');
  throwsCode(() => validateAuthority({ ...AUTHORITY_FIXTURE, schema: 'webclip-release-contract-inputs/v2' }), 'RELEASE_CONTRACT_SCHEMA_UNSUPPORTED');
  throwsCode(() => validateAuthority({ ...AUTHORITY_FIXTURE, fingerprint_profile: 'webclip-contract-fingerprint-v2' }), 'RELEASE_CONTRACT_FINGERPRINT_PROFILE_UNSUPPORTED');
  throwsCode(() => validateAuthority({ ...AUTHORITY_FIXTURE, full_rcf: { ...AUTHORITY_FIXTURE.full_rcf, extra: true } }), 'RELEASE_CONTRACT_MANIFEST_UNKNOWN_FIELD');

  // Projection set/shape and executor separation.
  const missingProjection = clone(AUTHORITY_FIXTURE); delete missingProjection.projections['yandex-e2e'];
  throwsCode(() => validateAuthority(missingProjection), 'RELEASE_CONTRACT_PROJECTION_SET_INVALID');
  const extraProjection = clone(AUTHORITY_FIXTURE); extraProjection.projections.other = clone(extraProjection.projections['unpacked-chrome']);
  throwsCode(() => validateAuthority(extraProjection), 'RELEASE_CONTRACT_PROJECTION_SET_INVALID');
  const wrongChromeSchema = clone(AUTHORITY_FIXTURE); wrongChromeSchema.projections['unpacked-chrome'].schema = 'webclip-qa-contract/unpacked-chrome/v2';
  throwsCode(() => validateAuthority(wrongChromeSchema), 'RELEASE_CONTRACT_PROJECTION_INVALID');
  const wrongYandexSubject = clone(AUTHORITY_FIXTURE); wrongYandexSubject.projections['yandex-e2e'].subject = 'mock-provider';
  throwsCode(() => validateAuthority(wrongYandexSubject), 'RELEASE_CONTRACT_PROJECTION_INVALID');
  const commandInProjection = clone(AUTHORITY_FIXTURE); commandInProjection.projections['unpacked-chrome'].command = 'node browser.js';
  throwsCode(() => validateAuthority(commandInProjection), 'RELEASE_CONTRACT_MANIFEST_UNKNOWN_FIELD');
  const argsInCase = clone(AUTHORITY_FIXTURE); argsInCase.projections['unpacked-chrome'].cases[0].args = ['--x'];
  throwsCode(() => validateAuthority(argsInCase), 'RELEASE_CONTRACT_MANIFEST_UNKNOWN_FIELD');

  // Case/token uniqueness and domain binding.
  const dupCase = clone(AUTHORITY_FIXTURE); dupCase.projections['unpacked-chrome'].cases.push(clone(dupCase.projections['unpacked-chrome'].cases[0]));
  throwsCode(() => validateAuthority(dupCase), 'RELEASE_CONTRACT_CASE_INVALID');
  const wrongCaseDomain = clone(AUTHORITY_FIXTURE); wrongCaseDomain.projections['unpacked-chrome'].cases[0].id = 'yandex.wrong';
  throwsCode(() => validateAuthority(wrongCaseDomain), 'RELEASE_CONTRACT_CASE_INVALID');
  const dupAssertion = clone(AUTHORITY_FIXTURE); dupAssertion.projections['yandex-e2e'].cases[0].assertions.push(dupAssertion.projections['yandex-e2e'].cases[0].assertions[0].toUpperCase());
  throwsCode(() => validateAuthority(dupAssertion), 'RELEASE_CONTRACT_CASE_INVALID');
  const dupPolicy = clone(AUTHORITY_FIXTURE); dupPolicy.projections['unpacked-chrome'].environment_policy.push('REAL-UNPACKED-MV3');
  throwsCode(() => validateAuthority(dupPolicy), 'RELEASE_CONTRACT_CASE_INVALID');

  // Mutable evidence/status exclusions.
  for (const forbidden of [...FORBIDDEN_FULL_FILES, 'project_docs/release_evidence/receipts/r1.json', 'project_docs/release_evidence/summaries/r1.md']) {
    const x = clone(AUTHORITY_FIXTURE); x.full_rcf.blob_inputs = [forbidden];
    throwsCode(() => validateAuthority(x), 'RELEASE_CONTRACT_MUTABLE_EVIDENCE_INPUT_FORBIDDEN', forbidden);
  }
  const dupInput = clone(AUTHORITY_FIXTURE); dupInput.full_rcf.blob_inputs.push(dupInput.full_rcf.blob_inputs[0].toUpperCase());
  throwsCode(() => validateAuthority(dupInput), 'RELEASE_CONTRACT_INPUT_INVALID');

  // Fingerprint independence matrix.
  const chromeQcf = qcf('unpacked-chrome', authority);
  const yandexQcf = qcf('yandex-e2e', authority);
  const fullRcf = rcf(authority);
  check(/^sha256:[0-9a-f]{64}$/.test(chromeQcf), 'Chrome QCF shape');
  check(/^sha256:[0-9a-f]{64}$/.test(yandexQcf), 'Yandex QCF shape');
  check(/^sha256:[0-9a-f]{64}$/.test(fullRcf), 'full RCF shape');
  check(chromeQcf !== yandexQcf, 'physical projections must be independently addressable');

  const chromeChangedRaw = clone(AUTHORITY_FIXTURE);
  chromeChangedRaw.projections['unpacked-chrome'].cases[0].assertions.push('synthetic-new-release-assertion');
  const chromeChanged = validateAuthority(chromeChangedRaw);
  check(qcf('unpacked-chrome', chromeChanged) !== chromeQcf, 'Chrome contract change must change Chrome QCF');
  eq(qcf('yandex-e2e', chromeChanged), yandexQcf, 'Chrome contract change must not change Yandex QCF');
  check(rcf(chromeChanged) !== fullRcf, 'Chrome contract change must change full RCF');

  const yandexChangedRaw = clone(AUTHORITY_FIXTURE);
  yandexChangedRaw.projections['yandex-e2e'].cases[1].assertions.push('synthetic-new-provider-assertion');
  const yandexChanged = validateAuthority(yandexChangedRaw);
  eq(qcf('unpacked-chrome', yandexChanged), chromeQcf, 'Yandex contract change must not change Chrome QCF');
  check(qcf('yandex-e2e', yandexChanged) !== yandexQcf, 'Yandex contract change must change Yandex QCF');
  check(rcf(yandexChanged) !== fullRcf, 'Yandex contract change must change full RCF');

  const gateOverride = new Map([[ '.github/workflows/release-gate.yml', Buffer.from('synthetic gate change') ]]);
  eq(qcf('unpacked-chrome', authority), chromeQcf, 'full-only blob override must not change Chrome QCF');
  eq(qcf('yandex-e2e', authority), yandexQcf, 'full-only blob override must not change Yandex QCF');
  check(rcf(authority, gateOverride) !== fullRcf, 'release gate byte change must change full RCF');

  // Evidence/status/package/attempt values are not QCF/full-RCF direct inputs.
  const statusText = fs.readFileSync(path.join(ROOT, 'project_docs', 'TEST_STATUS.md'));
  const mutatedStatus = Buffer.concat([statusText, Buffer.from('\nSynthetic evidence receipt line\n')]);
  check(sha256(statusText) !== sha256(mutatedStatus), 'status fixture must physically differ');
  eq(qcf('unpacked-chrome', authority), chromeQcf, 'status evidence mutation must not change Chrome QCF');
  eq(qcf('yandex-e2e', authority), yandexQcf, 'status evidence mutation must not change Yandex QCF');
  eq(rcf(authority), fullRcf, 'status evidence mutation must not change full RCF because TEST_STATUS is excluded');

  const receiptMetadataA = JSON.stringify({ browser: '152.0.7977.54', runId: 1, account: 'acct-A', attemptSeq: 1, outcome: 'pass' });
  const receiptMetadataB = JSON.stringify({ browser: '153.0.8000.1', runId: 2, account: 'acct-B', attemptSeq: 2, outcome: 'fail' });
  check(receiptMetadataA !== receiptMetadataB, 'attempt metadata fixture must differ');
  eq(qcf('unpacked-chrome', authority), chromeQcf, 'actual attempt metadata not in Chrome QCF');
  eq(qcf('yandex-e2e', authority), yandexQcf, 'actual attempt metadata not in Yandex QCF');
  eq(rcf(authority), fullRcf, 'attempt metadata not in full RCF');

  // Set-like representation order must not matter.
  const reordered = clone(AUTHORITY_FIXTURE);
  reordered.full_rcf.blob_inputs.reverse();
  reordered.projections['unpacked-chrome'].environment_policy.reverse();
  reordered.projections['unpacked-chrome'].cases.reverse();
  for (const c of reordered.projections['unpacked-chrome'].cases) c.assertions.reverse();
  reordered.projections['yandex-e2e'].environment_policy.reverse();
  reordered.projections['yandex-e2e'].cases.reverse();
  for (const c of reordered.projections['yandex-e2e'].cases) c.assertions.reverse();
  const reorderedAuthority = validateAuthority(reordered);
  eq(qcf('unpacked-chrome', reorderedAuthority), chromeQcf, 'Chrome QCF representation order invariant');
  eq(qcf('yandex-e2e', reorderedAuthority), yandexQcf, 'Yandex QCF representation order invariant');
  eq(rcf(reorderedAuthority), fullRcf, 'full RCF representation order invariant');

  // Exact candidate Git objects for full-RCF blob roots.
  const head = git('rev-parse', 'HEAD');
  eq(git('cat-file', '-t', head), 'commit', 'HEAD must be exact commit for research proof');
  for (const rel of authority.full_rcf.blob_inputs) {
    const e = gitEntry(head, rel);
    check(Boolean(e), `missing full-RCF input ${rel}`);
    eq(e.type, 'blob', `${rel} Git type`);
    eq(e.mode, '100644', `${rel} Git mode`);
    check(/^[0-9a-f]{40}$/.test(e.oid), `${rel} Git oid`);
  }

  // Current release-boundary positive controls from canonical TEST_STATUS.
  const testStatus = fs.readFileSync(path.join(ROOT, 'project_docs', 'TEST_STATUS.md'), 'utf8');
  for (const marker of [
    'real **unpacked Manifest V3**',
    'real Chrome extension permission UI',
    '`chrome.debugger` / `Page.printToPDF`',
    'automatic download / native Save As / terminal DownloadItem',
    'real Yandex OAuth/API E2E',
    'upload/move/publish/unpublish/delete/backup/restore',
    'failure/timeout/unknown-settlement',
    'account/root switching scenarios',
  ]) check(testStatus.includes(marker), `TEST_STATUS release boundary marker missing: ${marker}`);

  // Existing browser harness is engineering execution evidence, not contract authority.
  const harness = fs.readFileSync(path.join(ROOT, 'project_tools', 'test_p1_007_browser_harness.js'), 'utf8');
  check(harness.includes("Extensions.loadUnpacked"), 'unpacked harness positive control drift');
  check(harness.includes('mocked external boundaries'), 'managed harness boundary marker drift');
  check(!authority.full_rcf.blob_inputs.includes('project_tools/test_p1_007_browser_harness.js'), 'browser harness must not be raw full-RCF input');
  check(!JSON.stringify(authority.projections).includes('browser_p1_007_unpacked_integration.js'), 'QCF must not own executor path');

  // No identity-axis contamination.
  const projectionText = JSON.stringify(authority.projections);
  for (const forbiddenToken of ['runtimeFingerprint','artifactSha256','attemptSeq','outcome','receiptId','evidenceRef','builderContractFingerprint']) {
    check(!projectionText.includes(forbiddenToken), `${forbiddenToken} must not be QCF semantic field`);
  }

  console.log(`P1-231 S0-C QA contract authority source-spec model: PASS; cases=${cases}; full_inputs=${authority.full_rcf.blob_inputs.length}; chrome_cases=${authority.projections['unpacked-chrome'].cases.length}; yandex_cases=${authority.projections['yandex-e2e'].cases.length}; chrome_qcf=${chromeQcf}; yandex_qcf=${yandexQcf}; full_rcf=${fullRcf}; head=${head}`);
})();
