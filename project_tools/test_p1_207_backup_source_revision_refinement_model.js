'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const registry = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_REGISTRY.md'), 'utf8');
const evidence = fs.readFileSync(path.join(ROOT, 'project_docs', 'RESEARCH_P1_207_BACKUP_SOURCE_REVISION_REFINEMENT_2026-09-11_EVIDENCE.md'), 'utf8');

const BASELINE = '9305c64d1af93fddfdded3d4be27f956cc0839d8';
const SCHEMA = 'webclip-backup-source-revision-refinement/v1';
let checks = 0;
const failures = [];

function check(condition, message) {
  checks += 1;
  if (!condition) failures.push(message);
}

function functionSlice(source, name, maxChars = 70000) {
  const asyncStart = source.indexOf(`async function ${name}(`);
  const syncStart = source.indexOf(`function ${name}(`);
  const start = asyncStart >= 0 ? asyncStart : syncStart;
  if (start < 0) return '';
  return source.slice(start, Math.min(source.length, start + maxChars));
}

const stageOnce = functionSlice(worker, 'stageFullJournalExportOnce', 60000);
const stageWrapper = functionSlice(worker, 'stageFullJournalExport', 10000);
const uploadStaged = functionSlice(worker, 'uploadJournalExportStagedToYandex', 70000);
const recovery = functionSlice(worker, 'recoverPendingJournalBackup', 50000);
const status = functionSlice(worker, 'getJournalBackupStatus', 20000);
const revisionSnapshot = functionSlice(worker, 'journalRevisionSnapshot', 12000);

// Canonical owner and exact research-tranche binding.
check(registry.includes('| P1-207 | ACTIVE | Backup success/freshness must carry exact Journal source revision; finishing backup A after revision B exists does not protect B. |'),
  'P1-207 Registry owner/status drifted');
check(evidence.includes(`Canonical baseline: \`main = ${BASELINE}\``), 'P1-207 evidence baseline mismatch');
check(evidence.includes('No historical branch is imported wholesale.'), 'historical provenance boundary missing');
check(evidence.includes('P1-207 remains ACTIVE'), 'P1-207 ACTIVE boundary missing');
check(evidence.includes('Production/runtime modification: **NONE**'), 'research-only runtime boundary missing');
check(evidence.includes('EXPLICIT_USER_APPROVAL_FOR_RELEASE_POLICY_ACTIVATION'), 'hard release fence missing');
check(manifest.version === '0.9.8', 'manifest version changed during research tranche');

// Current durable source-revision positive controls.
check(worker.includes("const JOURNAL_META_STORE = 'meta';"), 'Journal meta store missing');
check(worker.includes("const JOURNAL_META_REVISION_KEY = 'revision';"), 'Journal revision key missing');
check(Boolean(revisionSnapshot), 'journalRevisionSnapshot() missing');
check(revisionSnapshot.includes('JOURNAL_META_STORE'), 'revision snapshot no longer reads Journal meta store');
check(revisionSnapshot.includes('JOURNAL_META_REVISION_KEY'), 'revision snapshot no longer reads Journal revision key');
check(worker.includes('touchJournalDbRevision'), 'Journal mutation revision writer missing');

// Current staging already has a bounded before/after stability fence.
check(Boolean(stageOnce), 'stageFullJournalExportOnce() missing');
check(stageOnce.includes('revisionBefore'), 'staging no longer captures revisionBefore; refresh research');
check(stageOnce.includes('revisionAfter'), 'staging no longer captures revisionAfter; refresh research');
check(stageOnce.includes('JOURNAL_CHANGED_DURING_EXPORT'), 'staging no longer rejects changed Journal; refresh research');
check(Boolean(stageWrapper), 'stageFullJournalExport() missing');
check(/attempt\s*<\s*2/.test(stageWrapper), 'staging retry bound changed; refresh research');

// Current exact P1-207 gap: source identity is proven but not propagated.
check(!worker.includes('sourceRevision'), 'service-worker.js already carries sourceRevision; P1-207 gap needs revalidation');
check(stageOnce.includes('stagingKey') && stageOnce.includes('chunkCount') && stageOnce.includes('entryCount') && stageOnce.includes('exportedAt'),
  'staged receipt shape changed; refresh research');
check(Boolean(uploadStaged), 'uploadJournalExportStagedToYandex() missing');
check(uploadStaged.includes('JOURNAL_BACKUP_PENDING_KEY'), 'durable pending checkpoint missing');
check(uploadStaged.includes("phase: 'prepared'") || worker.includes("phase: 'prepared'"), 'prepared pending phase missing');
check(worker.includes("phase: 'remote-verified'"), 'remote-verified pending phase missing');
check(Boolean(recovery), 'recoverPendingJournalBackup() missing');
check(worker.includes('lastSuccessAt'), 'backup success timestamp positive control missing');
check(Boolean(status), 'getJournalBackupStatus() missing');
check(status.includes('lastSuccessAt'), 'backup status no longer reads lastSuccessAt; refresh research');
check(status.includes('nextDueAt'), 'backup status age calculation changed; refresh research');
check(status.includes('overdue'), 'backup status overdue calculation changed; refresh research');

// External-source and owner-boundary provenance.
check(evidence.includes('https://www.w3.org/TR/IndexedDB/'), 'W3C IndexedDB source missing');
check(evidence.includes('https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle'), 'Chrome MV3 lifecycle source missing');
check(evidence.includes('https://www.sqlite.org/backup.html'), 'SQLite backup comparison missing');
check(evidence.includes('https://www.postgresql.org/docs/18/backup-manifest-wal-ranges.html'), 'PostgreSQL backup-position comparison missing');
check(evidence.includes('P1-207 does not require a new content-digest mechanism'), 'P1-184 scope boundary missing');
check(evidence.includes('does not itself change backup cadence'), 'scheduler cadence scope boundary missing');
check(evidence.includes('Backup artifact manifest is not expanded by this research owner'), 'portable-format scope boundary missing');

// Current-shaped witness: staging A can finish before B exists, while completion time is written after B.
function currentShapedTimestampState({ stagedRevision, currentRevisionAtSuccess, successAt }) {
  return {
    stagedRevision,
    currentRevisionAtSuccess,
    lastSuccessAt: successAt,
    timestampLooksRecent: Boolean(successAt),
    exactCoverageKnown: false
  };
}

{
  const state = currentShapedTimestampState({ stagedRevision: 'A', currentRevisionAtSuccess: 'B', successAt: 5000 });
  check(state.timestampLooksRecent, 'current-shaped timestamp witness did not produce recent success');
  check(state.stagedRevision !== state.currentRevisionAtSuccess, 'current-shaped A/B witness did not diverge');
  check(!state.exactCoverageKnown, 'current-shaped timestamp state unexpectedly knew source coverage');
}

// Target stable staging receipt: publish a source revision only after exact before/after equality.
function stableStage(revisionBefore, revisionAfter, stagingKey = 'stage-1') {
  if (!revisionBefore || revisionBefore !== revisionAfter) {
    return { ok: false, reason: 'journal-changed-during-export' };
  }
  return Object.freeze({ ok: true, stagingKey, sourceRevision: revisionBefore, expectedBytes: 1200, entryCount: 3 });
}

{
  const stage = stableStage('A', 'A');
  check(stage.ok && stage.sourceRevision === 'A', 'stable staging did not retain exact A');
}

{
  const stage = stableStage('A', 'B');
  check(!stage.ok && stage.reason === 'journal-changed-during-export', 'A->B staging was not rejected');
  check(!Object.prototype.hasOwnProperty.call(stage, 'sourceRevision'), 'failed staging incorrectly published sourceRevision');
}

// Durable pending and verified receipts preserve sourceRevision verbatim.
function preparePending(stage, namespaceIdentity = 'N1', settlementGeneration = 1) {
  if (!stage?.ok) return { ok: false, reason: 'unstable-stage' };
  return Object.freeze({
    ok: true,
    phase: 'prepared',
    sourceRevision: stage.sourceRevision,
    stagingKey: stage.stagingKey,
    expectedBytes: stage.expectedBytes,
    namespaceIdentity,
    settlementGeneration
  });
}

function verifyPending(pending, remoteProofAccepted) {
  if (!pending?.ok || !remoteProofAccepted) return { ok: false, reason: 'remote-proof-not-accepted' };
  return Object.freeze({
    ok: true,
    phase: 'remote-verified',
    sourceRevision: pending.sourceRevision,
    namespaceIdentity: pending.namespaceIdentity,
    settlementGeneration: pending.settlementGeneration,
    verifiedAt: 7000
  });
}

function recoverPending(serializedPending, remoteProofAccepted) {
  const pending = JSON.parse(serializedPending);
  return verifyPending(pending, remoteProofAccepted);
}

{
  const prepared = preparePending(stableStage('A', 'A'));
  check(prepared.sourceRevision === 'A', 'prepared checkpoint lost source revision A');
  const verified = verifyPending(prepared, true);
  check(verified.sourceRevision === 'A', 'remote-verified checkpoint relabelled source revision');
  const recovered = recoverPending(JSON.stringify(prepared), true);
  check(recovered.sourceRevision === 'A', 'restart recovery did not preserve exact source revision A');
}

// Current Journal may advance while the durable A attempt remains A.
{
  const preparedA = preparePending(stableStage('A', 'A'));
  const currentAfterRestart = 'B';
  const recoveredA = recoverPending(JSON.stringify(preparedA), true);
  check(recoveredA.sourceRevision === 'A', 'recovery relabelled A with current B');
  check(recoveredA.sourceRevision !== currentAfterRestart, 'recovery source unexpectedly equals newer current revision');
}

// Historical success and current protection are intentionally distinct.
function coverageStatus({ receipt, currentRevision, currentNamespace }) {
  const historicalSuccess = Boolean(receipt?.ok && receipt.phase === 'remote-verified' && receipt.sourceRevision);
  const currentJournalProtected = Boolean(
    historicalSuccess &&
    receipt.sourceRevision === currentRevision &&
    receipt.namespaceIdentity === currentNamespace
  );
  return { historicalSuccess, currentJournalProtected };
}

{
  const receiptA = verifyPending(preparePending(stableStage('A', 'A'), 'N1'), true);
  check(coverageStatus({ receipt: receiptA, currentRevision: 'A', currentNamespace: 'N1' }).currentJournalProtected,
    'exact A/N1 receipt did not protect current A/N1');
  const underB = coverageStatus({ receipt: receiptA, currentRevision: 'B', currentNamespace: 'N1' });
  check(underB.historicalSuccess && !underB.currentJournalProtected,
    'verified A was not retained as history or incorrectly protected B');
}

// Namespace identity composes with P1-179; source equality alone is insufficient.
{
  const receipt = verifyPending(preparePending(stableStage('R', 'R'), 'N1'), true);
  const statusN2 = coverageStatus({ receipt, currentRevision: 'R', currentNamespace: 'N2' });
  check(statusN2.historicalSuccess && !statusN2.currentJournalProtected,
    'same source revision incorrectly crossed backup namespace');
}

// Unknown remote settlement cannot claim protection.
{
  const pending = preparePending(stableStage('A', 'A'));
  const unknown = verifyPending(pending, false);
  check(!coverageStatus({ receipt: unknown, currentRevision: 'A', currentNamespace: 'N1' }).currentJournalProtected,
    'unknown remote settlement claimed current protection');
}

// Legacy timestamp-only state cannot be upgraded into exact coverage by guessing current revision.
function legacyCoverage(lastSuccessAt) {
  return { historicalTimestampKnown: Boolean(lastSuccessAt), currentJournalProtected: false };
}

{
  const legacy = legacyCoverage(9000);
  check(legacy.historicalTimestampKnown && !legacy.currentJournalProtected,
    'legacy timestamp-only state incorrectly claimed current source coverage');
}

// Opaque revisions are equality identities only.
function sameSource(a, b) {
  return Boolean(a && b && a === b);
}

{
  check(sameSource('opaque-A', 'opaque-A'), 'exact opaque source equality failed');
  check(!sameSource('opaque-A', 'opaque-B'), 'different opaque revisions compared equal');
  check(!sameSource('2026-09-11:999', '2026-09-11:1000'), 'revision test incorrectly inferred ordering as equality');
}

// Late physical success remains history but cannot regress a newer accepted coverage pointer.
// The model deliberately uses a separate settlement generation; sourceRevision is never ordered.
function acceptCoveragePointer(current, candidate) {
  if (!candidate?.ok) return current;
  if (!current?.ok) return candidate;
  return candidate.settlementGeneration > current.settlementGeneration ? candidate : current;
}

{
  const lateA = verifyPending(preparePending(stableStage('A', 'A'), 'N1', 1), true);
  const newerB = verifyPending(preparePending(stableStage('B', 'B'), 'N1', 2), true);
  const pointerAfterB = acceptCoveragePointer(null, newerB);
  const pointerAfterLateA = acceptCoveragePointer(pointerAfterB, lateA);
  check(pointerAfterLateA.sourceRevision === 'B', 'late older A regressed newer B coverage pointer');
  check(coverageStatus({ receipt: lateA, currentRevision: 'B', currentNamespace: 'N1' }).historicalSuccess,
    'late A stopped being a valid historical success');
}

// Source freshness is not cadence policy. A product policy can report unprotected while still choosing its configured timing.
function policyDecision({ currentJournalProtected, intervalDue, forceDue = false }) {
  return {
    currentJournalProtected,
    runNow: Boolean(forceDue || intervalDue),
    reason: forceDue ? 'explicit-policy' : intervalDue ? 'interval-policy' : 'wait-under-current-policy'
  };
}

{
  const decision = policyDecision({ currentJournalProtected: false, intervalDue: false });
  check(!decision.currentJournalProtected && !decision.runNow,
    'research model incorrectly made source mismatch synonymous with immediate scheduling');
  check(decision.reason === 'wait-under-current-policy', 'cadence-policy separation witness failed');
}

// Clear/import-replace produce new source identity even if visible shape is reused.
{
  const receiptA = verifyPending(preparePending(stableStage('A', 'A'), 'N1'), true);
  const afterClear = coverageStatus({ receipt: receiptA, currentRevision: 'CLEAR-B', currentNamespace: 'N1' });
  const afterReplace = coverageStatus({ receipt: receiptA, currentRevision: 'IMPORT-C', currentNamespace: 'N1' });
  check(!afterClear.currentJournalProtected, 'clear boundary retained old A coverage');
  check(!afterReplace.currentJournalProtected, 'replace-import boundary retained old A coverage');
  check(afterClear.historicalSuccess && afterReplace.historicalSuccess, 'source mutation erased historical success truth');
}

// Notification signal is not authoritative source identity.
{
  const authoritativeDbRevision = 'DB-R42';
  const storageNotification = '1789094808:nonce:append';
  check(authoritativeDbRevision !== storageNotification, 'notification token unexpectedly equals DB source identity');
}

// Crash window: verified pending and committed success receipt carry the same immutable source revision.
function commitSuccess(verified) {
  if (!verified?.ok || verified.phase !== 'remote-verified') return { ok: false };
  return Object.freeze({
    ok: true,
    sourceRevision: verified.sourceRevision,
    namespaceIdentity: verified.namespaceIdentity,
    settlementGeneration: verified.settlementGeneration,
    lastSuccessAt: verified.verifiedAt
  });
}

{
  const verified = verifyPending(preparePending(stableStage('A', 'A')), true);
  const committed = commitSuccess(verified);
  check(committed.sourceRevision === verified.sourceRevision, 'success commit changed source revision across crash window');
  check(Boolean(committed.lastSuccessAt), 'historical success time was lost when adding source provenance');
}

// Bounded stabilization remains bounded under continuous source churn.
function boundedStableStage(sequence, maxAttempts = 2) {
  const attempts = Math.min(sequence.length, maxAttempts);
  for (let i = 0; i < attempts; i += 1) {
    const [before, after] = sequence[i];
    const result = stableStage(before, after, `stage-${i + 1}`);
    if (result.ok) return { ok: true, attempts: i + 1, receipt: result };
  }
  return { ok: false, attempts, reason: 'bounded-stabilization-exhausted' };
}

{
  const churn = boundedStableStage([['A', 'B'], ['B', 'C'], ['C', 'D']], 2);
  check(!churn.ok && churn.attempts === 2 && churn.reason === 'bounded-stabilization-exhausted',
    'continuous churn did not terminate at bounded retry count');
}

{
  const sequence = boundedStableStage([['A', 'B'], ['B', 'B']], 2);
  check(sequence.ok && sequence.attempts === 2 && sequence.receipt.sourceRevision === 'B',
    'bounded retry did not accept the first stable revision');
}

// Research owner does not require portable artifact-schema or remote-digest expansion.
{
  const minimalReceipt = stableStage('R1', 'R1');
  check(minimalReceipt.sourceRevision === 'R1', 'minimal staged source receipt missing');
  check(!Object.prototype.hasOwnProperty.call(minimalReceipt, 'artifactDigest'),
    'model accidentally made artifact digest mandatory for P1-207');
}

if (failures.length) {
  console.error(`P1-207 backup source revision refinement model: FAIL (${failures.length}/${checks})`);
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log(`P1-207 backup source revision refinement model: PASS (${checks} checks, ${SCHEMA})`);
