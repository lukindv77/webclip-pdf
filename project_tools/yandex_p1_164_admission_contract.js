'use strict';

// P1-164 source admission-contract witness.
// This tool proves only source ordering/negative-replay properties on one exact
// clean checkout and can bind those properties to a sanitized observer output.
// It performs no provider call, consumes no OAuth credential and never proves
// that the running extension executed a destructive command.

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const ledger = require('./yandex_p1_164_observation_session.js');

const ROOT = path.resolve(__dirname, '..');
const REAL_ROOT = fs.realpathSync(ROOT);
const WORKER_PATH = path.join(ROOT, 'service-worker.js');
const CONTRACT_SCHEMA = 'webclip-p1-164-admission-contract/v1';
const BINDING_SCHEMA = 'webclip-p1-164-admission-binding/v1';
const KIND = 'publication-revoke-trash';
const MAX_OBSERVATION_BYTES = 256 * 1024;

const CONTRACT_LIMITATIONS = Object.freeze([
  'source-contract-only-not-runtime-execution-evidence',
  'does-not-prove-running-extension-source-sha',
  'does-not-prove-destructive-command-executed',
  'does-not-prove-provider-mutation-causality',
  'does-not-authenticate-private-export-origin',
  'does-not-close-p1-164',
  'does-not-advance-yandex-qcf'
]);

function fail(code, message = code) {
  const error = new Error(message);
  error.code = code;
  throw error;
}

function sha256Text(value) {
  return 'sha256:' + crypto.createHash('sha256').update(String(value), 'utf8').digest('hex');
}

function compact(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function functionSource(source, name) {
  const text = String(source || '');
  const re = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(');
  const match = re.exec(text);
  if (!match) fail('ADMISSION_FUNCTION_MISSING', name);
  const start = match.index;
  const paramsStart = text.indexOf('(', start);
  let paramsDepth = 0;
  let paramsEnd = -1;
  for (let index = paramsStart; index < text.length; index += 1) {
    if (text[index] === '(') paramsDepth += 1;
    else if (text[index] === ')' && --paramsDepth === 0) {
      paramsEnd = index;
      break;
    }
  }
  if (paramsEnd < 0) fail('ADMISSION_FUNCTION_PARSE_FAILED', name);
  const bodyStart = text.indexOf('{', paramsEnd);
  if (bodyStart < 0) fail('ADMISSION_FUNCTION_PARSE_FAILED', name);

  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = bodyStart; index < text.length; index += 1) {
    const ch = text[index];
    const next = text[index + 1];
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === quote) quote = '';
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
    if (ch === '/' && next === '*') {
      const end = text.indexOf('*/', index + 2);
      if (end < 0) fail('ADMISSION_FUNCTION_PARSE_FAILED', name);
      index = end + 1;
      continue;
    }
    if (ch === '/' && next === '/') {
      const end = text.indexOf('\n', index + 2);
      if (end < 0) return text.slice(start);
      index = end;
      continue;
    }
    if (ch === '{') depth += 1;
    else if (ch === '}' && --depth === 0) return text.slice(start, index + 1);
  }
  fail('ADMISSION_FUNCTION_PARSE_FAILED', name);
}

function countLiteral(source, literal) {
  let count = 0;
  let at = 0;
  const text = String(source || '');
  while ((at = text.indexOf(literal, at)) >= 0) {
    count += 1;
    at += literal.length;
  }
  return count;
}

function requireOrder(source, before, after, code) {
  const a = compact(source).indexOf(compact(before));
  const b = compact(source).indexOf(compact(after));
  if (a < 0 || b < 0 || a >= b) fail(code);
}

function requireContains(source, literal, code) {
  if (!compact(source).includes(compact(literal))) fail(code);
}

function exactHeadClean() {
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT, encoding: 'utf8' }).trim();
  if (!/^[0-9a-f]{40}$/.test(head)) fail('ADMISSION_SOURCE_SHA_INVALID');
  const dirty = execFileSync('git', ['status', '--porcelain', '--untracked-files=no'], {
    cwd: ROOT,
    encoding: 'utf8'
  }).trim();
  if (dirty) fail('ADMISSION_TRACKED_WORKTREE_DIRTY');
  return head;
}

function buildAdmissionContract(workerSource, testedSourceSha) {
  const source = String(workerSource || '');
  const sha = String(testedSourceSha || '').trim();
  if (!/^[0-9a-f]{40}$/.test(sha)) fail('ADMISSION_SOURCE_SHA_INVALID');

  const mark = functionSource(source, 'markPendingPublicationRevokeTrashRemoteAdmission');
  const revoke = functionSource(source, 'revokeJournalEntryPublicAccess');
  const move = functionSource(source, 'executePendingPublicationRevokeTrashMove');
  const reconcile = functionSource(source, 'reconcilePendingPublicationRevokeTrashReceipt');

  requireContains(
    mark,
    "const allowed = (expected === 'prepared' && nextValue === 'revoke-admitted-unknown') || (expected === 'revoke-verified' && nextValue === 'move-admitted-unknown')",
    'ADMISSION_TRANSITIONS_INVALID'
  );
  requireContains(mark, 'pendingDestructiveMoveRemoteIdentityStatus(current)', 'ADMISSION_REMOTE_IDENTITY_RECHECK_MISSING');
  requireContains(mark, 'pendingDestructiveMoveJournalAuthorityMatches(current, resetGeneration, journalEntry)', 'ADMISSION_JOURNAL_AUTHORITY_RECHECK_MISSING');
  requireContains(mark, 'const next = { ...current, phase: nextValue, updatedAt: Date.now(), lastError: \'\' }', 'ADMISSION_DURABLE_PHASE_WRITE_MISSING');
  requireContains(mark, 'pending.put(next)', 'ADMISSION_DURABLE_WRITE_MISSING');

  const revokeAdmission = "await markPendingPublicationRevokeTrashRemoteAdmission(detachedReceiptId, 'prepared', 'revoke-admitted-unknown')";
  const revokeCommand = "await yandexApi('/resources/unpublish'";
  requireOrder(revoke, revokeAdmission, revokeCommand, 'ADMISSION_UNPUBLISH_ORDER_INVALID');
  if (countLiteral(revoke, '/resources/unpublish') !== 1) fail('ADMISSION_UNPUBLISH_COMMAND_COUNT_INVALID');
  requireContains(revoke, "method: 'PUT'", 'ADMISSION_UNPUBLISH_METHOD_INVALID');
  requireContains(revoke, 'retryForbidden: true', 'ADMISSION_UNPUBLISH_UNKNOWN_RETRY_FENCE_MISSING');
  requireContains(revoke, 'readYandexPublicationStateByReceipt', 'ADMISSION_UNPUBLISH_OBSERVATION_MISSING');

  const moveAdmission = "await markPendingPublicationRevokeTrashRemoteAdmission(key, 'revoke-verified', 'move-admitted-unknown')";
  const moveCommand = "await yandexApi('/resources/move'";
  requireOrder(move, moveAdmission, moveCommand, 'ADMISSION_MOVE_ORDER_INVALID');
  if (countLiteral(move, '/resources/move') !== 1) fail('ADMISSION_MOVE_COMMAND_COUNT_INVALID');
  requireContains(move, "method: 'POST'", 'ADMISSION_MOVE_METHOD_INVALID');
  requireContains(move, "overwrite: 'false'", 'ADMISSION_MOVE_IMMUTABLE_TARGET_FENCE_MISSING');
  requireContains(move, 'retryForbidden: true', 'ADMISSION_MOVE_UNKNOWN_RETRY_FENCE_MISSING');
  requireContains(move, 'readYandexExactResourceAtReceiptPath', 'ADMISSION_MOVE_OBSERVATION_MISSING');

  if (countLiteral(reconcile, '/resources/unpublish') !== 0) fail('ADMISSION_RECOVERY_REPLAYS_UNPUBLISH');
  if (countLiteral(reconcile, '/resources/move') !== 0) fail('ADMISSION_RECOVERY_REPLAYS_MOVE');
  requireContains(reconcile, "if (current.phase === 'revoke-admitted-unknown')", 'ADMISSION_RECOVERY_REVOKE_PHASE_MISSING');
  requireContains(reconcile, "else if (current?.phase === 'move-admitted-unknown')", 'ADMISSION_RECOVERY_MOVE_PHASE_MISSING');
  requireContains(reconcile, "if (current?.phase === 'revoke-verified')", 'ADMISSION_RECOVERY_FRESH_MOVE_PHASE_MISSING');
  requireContains(reconcile, 'executePendingPublicationRevokeTrashMove(id, context, { recovery: true })', 'ADMISSION_RECOVERY_FRESH_MOVE_OWNER_MISSING');

  const clientIdempotencyTokenUsed = /idempotency[-_ ]?key|clienttoken/i.test(revokeCommand + moveCommand)
    || /idempotency[-_ ]?key|clienttoken/i.test(revoke + move);

  const unsigned = Object.freeze({
    schema: CONTRACT_SCHEMA,
    evidenceClass: 'source-admission-contract-only',
    testedSourceSha: sha,
    sourceFile: 'service-worker.js',
    sourceFileDigest: sha256Text('WEBCLIP_P1_164_ADMISSION_SOURCE\0' + source),
    kind: KIND,
    commands: Object.freeze({
      unpublish: Object.freeze({
        endpoint: '/resources/unpublish',
        method: 'PUT',
        admissionTransition: 'prepared->revoke-admitted-unknown',
        durableAdmissionBeforeCommand: true,
        exactCommandSiteCount: 1,
        unknownSettlementRecovery: 'read-only-observation-no-replay',
        clientIdempotencyTokenUsed: false
      }),
      move: Object.freeze({
        endpoint: '/resources/move',
        method: 'POST',
        admissionTransition: 'revoke-verified->move-admitted-unknown',
        durableAdmissionBeforeCommand: true,
        exactCommandSiteCount: 1,
        immutableTargetOverwrite: false,
        unknownSettlementRecovery: 'read-only-observation-no-replay',
        clientIdempotencyTokenUsed: false
      })
    }),
    admissionStore: Object.freeze({
      durablePhaseWrite: true,
      remoteIdentityRechecked: true,
      journalAuthorityRechecked: true
    }),
    recovery: Object.freeze({
      admittedUnpublishReplayed: false,
      admittedMoveReplayed: false,
      revokeVerifiedMayCreateFreshMoveAdmission: true
    }),
    limitations: Object.freeze([...CONTRACT_LIMITATIONS])
  });

  if (clientIdempotencyTokenUsed) fail('ADMISSION_CLIENT_IDEMPOTENCY_TOKEN_UNEXPECTED');
  return Object.freeze({ ...unsigned, contractDigest: ledger.digestObject(unsigned) });
}

function requiredAdmissionsForPhase(effectivePhase) {
  const phase = String(effectivePhase || '');
  if (phase === 'prepared') return Object.freeze([]);
  if (phase === 'revoke-admitted-unknown' || phase === 'revoke-verified') {
    return Object.freeze(['unpublish']);
  }
  if (phase === 'move-admitted-unknown' || phase === 'remote-verified') {
    return Object.freeze(['unpublish', 'move']);
  }
  fail('ADMISSION_PHASE_INVALID');
}

function bindObservation(contractValue, observationValue) {
  if (!contractValue || contractValue.schema !== CONTRACT_SCHEMA) fail('ADMISSION_CONTRACT_SCHEMA_INVALID');
  const contract = buildAdmissionContract(
    fs.readFileSync(WORKER_PATH, 'utf8'),
    contractValue.testedSourceSha
  );
  if (contract.contractDigest !== contractValue.contractDigest) fail('ADMISSION_CONTRACT_DIGEST_MISMATCH');

  const observation = ledger.validateObservation(observationValue);
  if (observation.testedSourceSha !== contract.testedSourceSha) fail('ADMISSION_OBSERVATION_SOURCE_SHA_MISMATCH');
  const requiredAdmissions = requiredAdmissionsForPhase(observation.effectivePhase);

  return Object.freeze({
    schema: BINDING_SCHEMA,
    evidenceClass: 'source-contract-plus-sanitized-provider-observation',
    testedSourceSha: contract.testedSourceSha,
    contractDigest: contract.contractDigest,
    kind: KIND,
    receiptAnchor: observation.receiptAnchor,
    effectivePhase: observation.effectivePhase,
    requiredAdmissions,
    observedClassification: observation.classification,
    sourceContractSatisfied: true,
    providerStateObserved: true,
    commandExecutionProven: false,
    providerMutationCausalityProven: false,
    runningExtensionSourceProven: false,
    qualificationPass: false,
    limitations: Object.freeze([...CONTRACT_LIMITATIONS])
  });
}

function assertOutsideRepo(filename) {
  const absolute = path.resolve(String(filename || '').trim());
  if (!String(filename || '').trim()) fail('ADMISSION_OBSERVATION_PATH_REQUIRED');
  const relative = path.relative(REAL_ROOT, absolute);
  if (!relative || (!relative.startsWith('..') && !path.isAbsolute(relative))) {
    fail('ADMISSION_OBSERVATION_PATH_INSIDE_REPOSITORY');
  }
  return absolute;
}

function readObservationFile(filename) {
  const raw = assertOutsideRepo(filename);
  let lst;
  try { lst = fs.lstatSync(raw); } catch (_) { fail('ADMISSION_OBSERVATION_FILE_INVALID'); }
  if (!lst.isFile() || lst.isSymbolicLink() || lst.size <= 0 || lst.size > MAX_OBSERVATION_BYTES) {
    fail('ADMISSION_OBSERVATION_FILE_INVALID');
  }
  let resolved;
  try { resolved = fs.realpathSync(raw); } catch (_) { fail('ADMISSION_OBSERVATION_FILE_INVALID'); }
  assertOutsideRepo(resolved);
  let value;
  try { value = JSON.parse(fs.readFileSync(resolved, 'utf8')); } catch (_) { fail('ADMISSION_OBSERVATION_JSON_INVALID'); }
  return ledger.validateObservation(value);
}

function parseArgs(argv) {
  const out = { observation: '', contractOnly: false, help: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help') { out.help = true; continue; }
    if (arg === '--contract-only') { out.contractOnly = true; continue; }
    if (arg === '--observation') { out.observation = String(argv[++index] || ''); continue; }
    fail('ADMISSION_ARGUMENT_INVALID', arg);
  }
  if (out.contractOnly && out.observation) fail('ADMISSION_ARGUMENT_CONFLICT');
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    process.stdout.write(
      'node project_tools/yandex_p1_164_admission_contract.js --contract-only\n'
      + 'node project_tools/yandex_p1_164_admission_contract.js --observation /absolute/private/sanitized-observation.json\n'
    );
    return;
  }
  const head = exactHeadClean();
  const source = fs.readFileSync(WORKER_PATH, 'utf8');
  const contract = buildAdmissionContract(source, head);
  const result = args.contractOnly
    ? contract
    : bindObservation(contract, readObservationFile(args.observation));
  process.stdout.write(JSON.stringify(result, null, 2) + '\n');
}

if (require.main === module) {
  try { main(); }
  catch (error) {
    process.stderr.write(`${String(error?.code || 'ADMISSION_CONTRACT_FAILED')}: ${String(error?.message || 'failed').slice(0, 240)}\n`);
    process.exitCode = 1;
  }
}

module.exports = Object.freeze({
  CONTRACT_SCHEMA,
  BINDING_SCHEMA,
  KIND,
  CONTRACT_LIMITATIONS,
  functionSource,
  buildAdmissionContract,
  requiredAdmissionsForPhase,
  bindObservation,
  assertOutsideRepo,
  parseArgs
});
