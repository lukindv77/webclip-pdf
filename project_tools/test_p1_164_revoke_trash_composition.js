'use strict';

// P1-164 direct production regression for the reviewed two-remote-effect
// revoke + Trash protocol. This is deterministic source/model evidence only;
// it does not claim real-provider qualification or release readiness.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const page = fs.readFileSync(path.join(ROOT, 'journal.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'journal.html'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));

let checks = 0;
function ok(value, message) { assert.ok(value, message); checks += 1; }
function eq(actual, expected, message) { assert.equal(actual, expected, message); checks += 1; }
function throwsCode(fn, code, message) {
  assert.throws(fn, (error) => error?.code === code, message);
  checks += 1;
}

function functionSource(source, name) {
  const re = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(');
  const match = re.exec(source);
  if (!match) throw new Error(`function not found: ${name}`);
  const start = match.index;
  const paramsStart = source.indexOf('(', start);
  let parens = 0;
  let paramsEnd = -1;
  for (let i = paramsStart; i < source.length; i += 1) {
    if (source[i] === '(') parens += 1;
    else if (source[i] === ')' && --parens === 0) { paramsEnd = i; break; }
  }
  const bodyStart = source.indexOf('{', paramsEnd);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let i = bodyStart; i < source.length; i += 1) {
    const ch = source[i];
    const next = source[i + 1];
    if (quote) {
      if (escaped) { escaped = false; continue; }
      if (ch === '\\') { escaped = true; continue; }
      if (ch === quote) quote = '';
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') { quote = ch; continue; }
    if (ch === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2);
      if (end < 0) break;
      i = end + 1;
      continue;
    }
    if (ch === '/' && next === '/') {
      const end = source.indexOf('\n', i + 2);
      if (end < 0) return source.slice(start);
      i = end;
      continue;
    }
    if (ch === '{') depth += 1;
    else if (ch === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`function boundary not found: ${name}`);
}

ok(worker.includes("const PUBLICATION_REVOKE_COMPLETION_DELETE_TRASH = 'delete-journal-trash-file';"), 'composite completion has a stable value');
ok(worker.includes("const PUBLICATION_REVOKE_TRASH_KIND = 'publication-revoke-trash';"), 'composite receipt kind has a stable value');

const normalize = functionSource(worker, 'normalizePublicationRevokeCompletionAction');
const normalizeContext = vm.createContext({ String });
vm.runInContext(
  "const PUBLICATION_REVOKE_COMPLETION_CLEAR='clear-public-url';"
  + "const PUBLICATION_REVOKE_COMPLETION_DELETE_KEEP='delete-journal-keep-file';\n"
  + normalize
  + '\nthis.normalize=normalizePublicationRevokeCompletionAction;',
  normalizeContext
);
eq(normalizeContext.normalize('delete-journal-trash-file'), 'delete-journal-trash-file', 'composite completion is reviewed');
eq(normalizeContext.normalize('trash-then-revoke'), '', 'unreviewed command order fails closed');
eq(normalizeContext.normalize('revoke-and-delete'), '', 'ambiguous completion fails closed');

const boundary = functionSource(worker, 'resolveJournalDeletePublicationOutcome');
const boundaryContext = vm.createContext({ String, Boolean, Object, Error });
vm.runInContext(boundary + '\nthis.resolve=resolveJournalDeletePublicationOutcome;', boundaryContext);
const published = { destination: 'yandex', publicUrl: 'https://disk.yandex.ru/d/example' };
const admitted = boundaryContext.resolve(published, 'revoke', 'trash');
eq(admitted.publicationAction, 'revoke', 'explicit revoke is retained');
eq(admitted.publicationOutcome, 'revoke-and-trash-requested', 'two-effect outcome is explicit');
eq(admitted.hasKnownPublicAccess, true, 'known publication remains part of admission');
ok(Object.isFrozen(admitted), 'pre-admission decision is immutable');
throwsCode(() => boundaryContext.resolve(published, 'revoke', 'destroy'), 'WEBCLIP_PUBLICATION_REVOKE_DISK_ACTION_INVALID', 'unsupported file outcome fails closed');

const checkpoint = functionSource(worker, 'checkpointPendingPublicationRevokeIntent');
ok(checkpoint.includes("normalizedCompletionAction === PUBLICATION_REVOKE_COMPLETION_DELETE_TRASH"), 'checkpoint selects composite schema only from exact completion');
ok(checkpoint.includes("kind: compositeTrash ? 'publication-revoke-trash' : 'publication-revoke'"), 'composite and standalone receipts cannot be confused');
ok(checkpoint.includes('targetPath: normalizedTargetPath'), 'immutable target is durable before first admission');
ok(checkpoint.includes('trashMonth:'), 'display month is durable metadata');
ok(checkpoint.includes('sourcePath: normalizedSourcePath'), 'source path is durable');
ok(checkpoint.includes('sourceResourceId:'), 'stable resource identity is durable');
ok(checkpoint.includes('sourcePublicUrl:'), 'exact initial public URL is durable');
ok(checkpoint.includes('sourceJournalResetGeneration'), 'Journal reset generation is durable');
ok(checkpoint.includes('sourceJournalEntryRevision'), 'Journal row revision is durable');
ok(checkpoint.includes('pendingDestructiveMoveRemoteIdentityFields'), 'provider identity envelope is durable');
ok(checkpoint.includes('pendingDestructiveMoveJournalAuthorityMatches'), 'receipt commit rechecks exact Journal authority');
ok(checkpoint.includes("String(current?.publicUrl || '').trim() !== item.sourcePublicUrl"), 'receipt commit rechecks Journal public URL');
ok(checkpoint.includes('pending.add(item)'), 'receipt is committed before remote admission');

const identity = functionSource(worker, 'pendingDestructiveMoveRemoteIdentityStatus');
ok(identity.includes("item.kind === 'publication-revoke-trash'"), 'identity schema recognizes the composite kind');
ok(identity.includes('verifiedPath !== targetPath'), 'terminal path must equal immutable target');
ok(identity.includes('verifiedResourceId !== sourceResourceId'), 'terminal object must keep the original stable identity');
ok(identity.includes("['publication-revoke-trash', 'publication-revoke'].includes(item.kind)"), 'terminal composite state must be private');

const admission = functionSource(worker, 'markPendingPublicationRevokeTrashRemoteAdmission');
ok(admission.includes("expected === 'prepared' && nextValue === 'revoke-admitted-unknown'"), 'first remote admission is explicit');
ok(admission.includes("expected === 'revoke-verified' && nextValue === 'move-admitted-unknown'"), 'second remote admission requires verified revoke');
ok(admission.includes('current.supersededByJournalReset === true'), 'reset blocks a not-yet-admitted remote effect');
ok(admission.includes('pendingDestructiveMoveRemoteIdentityStatus(current)'), 'each admission rechecks durable identity');
ok(admission.includes('pendingDestructiveMoveJournalAuthorityMatches(current, resetGeneration, journalEntry)'), 'each admission rechecks exact Journal authority');
ok(admission.includes('phase: nextValue'), 'admission phase commits durably');

const phase = functionSource(worker, 'markPendingPublicationRevokeTrashPhase');
ok(phase.includes("expected === 'revoke-admitted-unknown' && nextValue === 'revoke-verified'"), 'only the reviewed intermediate observation transition is accepted');
ok(phase.includes("normalizeDiskPath(patch.revokeVerifiedPath || '') !== normalizeDiskPath(current.sourcePath || '')"), 'revoke verification stays on exact source');
ok(phase.includes("String(patch.revokeVerifiedResourceId || '') !== String(current.sourceResourceId || '')"), 'revoke verification keeps stable identity');
ok(phase.includes("String(patch.revokeVerifiedPublicUrl || '').trim()"), 'revoke verification rejects remaining public URL');

const live = functionSource(worker, 'revokeJournalEntryPublicAccess');
const receiptAt = live.indexOf('await checkpointPendingPublicationRevokeIntent');
const revokeAdmissionAt = live.indexOf("markPendingPublicationRevokeTrashRemoteAdmission(detachedReceiptId, 'prepared', 'revoke-admitted-unknown')");
const unpublishAt = live.indexOf("yandexApi('/resources/unpublish'");
const revokeVerifiedAt = live.indexOf("markPendingPublicationRevokeTrashPhase(detachedReceiptId, 'revoke-admitted-unknown', 'revoke-verified'");
const moveResumeAt = live.indexOf('executePendingPublicationRevokeTrashMove(detachedReceiptId, operationContext)');
const localDeleteAt = live.indexOf('finalizeTrashDeleteFromReceipt(detachedReceiptId)');
ok(receiptAt >= 0, 'live path creates composite receipt');
ok(receiptAt < revokeAdmissionAt, 'receipt precedes first remote admission');
ok(revokeAdmissionAt < unpublishAt, 'revoke admission precedes unpublish');
ok(unpublishAt < revokeVerifiedAt, 'private observation precedes intermediate verification');
ok(revokeVerifiedAt < moveResumeAt, 'verified revoke precedes move protocol');
ok(moveResumeAt < localDeleteAt, 'terminal move path precedes local deletion');
eq((live.match(/\/resources\/unpublish/g) || []).length, 1, 'live operation contains one unpublish command site');
ok(!live.includes("'/resources/move'"), 'move command has a separate protocol owner');
ok(live.includes('deleteJournalAndTrashAfterRevoke'), 'composite path is explicit');
ok(live.includes('chooseYandexTrashTarget'), 'immutable target is selected before first admission');
ok(live.includes('ensureYandexFolderTree'), 'target folder is prepared before first admission');
ok(live.includes('if (revokeAdmitted)'), 'post-admission failure retains durable evidence');

const move = functionSource(worker, 'executePendingPublicationRevokeTrashMove');
const sourceProofAt = move.indexOf('readYandexExactResourceAtReceiptPath(receipt, operationContext, sourcePath');
const targetProbeAt = move.indexOf("query: { path: targetPath, fields: 'type,path,resource_id' }");
const moveAdmissionAt = move.indexOf("markPendingPublicationRevokeTrashRemoteAdmission(key, 'revoke-verified', 'move-admitted-unknown')");
const moveCommandAt = move.indexOf("yandexApi('/resources/move'");
const targetVerifyAt = move.indexOf('readYandexExactResourceAtReceiptPath(\n        receipt,\n        operationContext,\n        targetPath');
const terminalAt = move.lastIndexOf('markPendingDestructiveMoveVerified(key');
ok(sourceProofAt >= 0, 'move path re-observes exact private source');
ok(move.includes('if (source.publicUrl)'), 'move admission rejects a public source');
ok(sourceProofAt < targetProbeAt, 'source proof precedes target availability check');
ok(targetProbeAt < moveAdmissionAt, 'immutable target is checked before admission');
ok(moveAdmissionAt < moveCommandAt, 'move admission is durable before POST');
ok(moveCommandAt < targetVerifyAt, 'target observation follows move command');
ok(targetVerifyAt < terminalAt, 'private exact target proof precedes terminal receipt');
eq((move.match(/\/resources\/move/g) || []).length, 1, 'move helper contains one move command site');
ok(!move.includes('/resources/unpublish'), 'move helper cannot replay unpublish');
ok(move.includes("overwrite: 'false'"), 'move cannot overwrite an unrelated target');
ok(move.includes('WEBCLIP_PUBLICATION_REVOKE_TRASH_TARGET_OCCUPIED'), 'occupied immutable target has a stable fail-closed code');
ok(move.includes('retryForbidden: true'), 'unknown move settlement is explicitly non-retriable');
ok(move.includes('WEBCLIP_PUBLICATION_REVOKE_TRASH_MOVE_SETTLEMENT_UNKNOWN'), 'unknown move settlement has a stable code');
ok(move.includes('if (observed.publicUrl)'), 'target must remain private');

const recovery = functionSource(worker, 'reconcilePendingPublicationRevokeTrashReceipt');
ok(recovery.includes("current.phase === 'revoke-admitted-unknown'"), 'restart observes unknown revoke');
ok(recovery.includes('readYandexExactResourceAtReceiptPath(current, context, current.sourcePath'), 'unknown revoke observes exact source');
ok(recovery.includes("current?.phase === 'revoke-verified'"), 'restart can resume only a not-yet-admitted move');
ok(recovery.includes('executePendingPublicationRevokeTrashMove(id, context, { recovery: true })'), 'verified revoke resumes the second distinct effect');
ok(recovery.includes("current?.phase === 'move-admitted-unknown'"), 'restart handles unknown move separately');
ok(recovery.includes('readYandexExactResourceAtReceiptPath(current, context, current.targetPath'), 'unknown move is observation-only');
ok(recovery.includes('Automatic move retry запрещён после durable admission'), 'unknown move cannot be replayed');
ok(!recovery.includes("'/resources/unpublish'"), 'recovery helper contains no unpublish command');
ok(!recovery.includes("'/resources/move'"), 'recovery dispatcher contains no direct move command');

const markManual = functionSource(worker, 'markPendingDestructiveMoveManualResolution');
ok(markManual.includes('manualResolutionSourcePhase'), 'manual fallback preserves which remote phase required operator review');
ok(markManual.includes("current.phase === 'manual-resolution' ? '' : current.phase"), 'legacy manual receipts do not invent an admission phase');

const manualProjection = functionSource(worker, 'pendingDestructiveMoveManualReceiptForUi');
ok(manualProjection.includes('manualResolutionSourcePhase'), 'manual UI projection exposes sanitized pre-manual phase lineage');

const guidance = functionSource(page, 'manualDestructiveReceiptRecoveryGuidance');
const guidanceContext = vm.createContext({ String });
vm.runInContext(guidance + '\nthis.guide=manualDestructiveReceiptRecoveryGuidance;', guidanceContext);
ok(guidanceContext.guide({ kind: 'publication-revoke-trash', manualResolutionSourcePhase: 'revoke-admitted-unknown' }).includes('Unpublish уже был durably admitted'), 'unknown revoke guidance forbids automatic unpublish replay');
ok(guidanceContext.guide({ kind: 'publication-revoke-trash', manualResolutionSourcePhase: 'revoke-verified' }).includes('move ещё не был durably admitted'), 'verified revoke guidance distinguishes safe pre-move boundary');
ok(guidanceContext.guide({ kind: 'publication-revoke-trash', manualResolutionSourcePhase: 'move-admitted-unknown' }).includes('automatic move retry запрещён'), 'unknown move guidance forbids automatic move replay');

const genericRecovery = functionSource(worker, 'reconcilePendingDestructiveMoves');
ok(genericRecovery.includes("kind === 'publication-revoke-trash'"), 'generic restart path recognizes composite receipts');
ok(genericRecovery.includes('reconcilePendingPublicationRevokeTrashReceipt'), 'generic restart path delegates to the phase-aware protocol');
ok(genericRecovery.includes('already-admitted remote команда не повторяется'), 'manual recovery copy preserves the no-replay rule');
ok(genericRecovery.includes("kind === 'trash-move' || kind === 'publication-revoke-trash'"), 'terminal composite receipt reuses atomic Trash local finalizer');
ok(!genericRecovery.includes("'/resources/unpublish'"), 'generic recovery cannot directly unpublish');
ok(!genericRecovery.includes("'/resources/move'"), 'generic recovery cannot directly move');

const finalizer = functionSource(worker, 'finalizeTrashDeleteFromReceipt');
ok(finalizer.includes("!['trash-move', 'publication-revoke-trash'].includes(receipt.kind)"), 'local finalizer accepts only reviewed Trash kinds');
ok(finalizer.includes('pendingDestructiveMoveRemoteIdentityStatus(receipt, { requireTerminal: true })'), 'local finalizer rechecks terminal identity');
ok(finalizer.includes("receipt.kind === 'publication-revoke-trash' && String(receipt.verifiedPublicUrl || '').trim()"), 'local composite finalizer rechecks privacy');
ok(finalizer.includes('[JOURNAL_PENDING_DESTRUCTIVE_STORE, JOURNAL_STORE, JOURNAL_META_STORE]'), 'row deletion and receipt retirement share one transaction');
ok(finalizer.includes('pendingDestructiveMoveJournalAuthorityMatches(receipt, resetGeneration, current)'), 'local deletion uses exact Journal CAS');
ok(finalizer.includes('entries.delete(current.id)'), 'only the authority-matched row is deleted');
ok(finalizer.includes('receipts.delete(key)'), 'terminal receipt retires atomically');
ok(finalizer.includes("beginJournalStatsMutation('delete')"), 'stats repair marker precedes local deletion');

const reset = functionSource(worker, 'pendingDestructiveMoveResetDisposition');
const resetContext = vm.createContext({ String });
vm.runInContext(reset + '\nthis.disposition=pendingDestructiveMoveResetDisposition;', resetContext);
eq(resetContext.disposition({ phase: 'prepared' }), 'drop', 'pre-admission composite intent is reset-cancellable');
eq(resetContext.disposition({ phase: 'revoke-admitted-unknown' }), 'preserve', 'unknown revoke evidence survives reset');
eq(resetContext.disposition({ phase: 'revoke-verified' }), 'drop', 'verified revoke with no second admission is reset-cancellable');
eq(resetContext.disposition({ phase: 'move-admitted-unknown' }), 'preserve', 'unknown move evidence survives reset');
eq(resetContext.disposition({ phase: 'remote-verified' }), 'drop', 'terminal receipt can retire with reset');

const deleteFlow = functionSource(worker, 'deleteJournalEntry');
ok(deleteFlow.includes("action === 'trash'\n        ? PUBLICATION_REVOKE_COMPLETION_DELETE_TRASH"), 'dispatcher selects composite completion only for Trash');
ok(deleteFlow.includes(': PUBLICATION_REVOKE_COMPLETION_DELETE_KEEP'), 'keep-file completion remains distinct');
ok(deleteFlow.includes('diskAction: action'), 'result preserves the selected file outcome');
ok(deleteFlow.includes("trashPath: action === 'trash'"), 'composite result exposes verified target path');

ok(html.includes('отдельно зафиксирована move admission'), 'dialog explains separate move admission');
ok(html.includes('подтверждён private exact объект'), 'dialog explains terminal exact-object proof');
ok(page.includes('const DELETE_REVOKE_TRASH_STAGES = ['), 'UI has dedicated composite progress');
for (const stage of ['locate', 'folder', 'revoke', 'verify-revoke', 'move', 'verify-move', 'journal']) {
  ok(page.includes(`['${stage}',`), `UI is missing composite stage ${stage}`);
}
ok(page.includes('const revokeAllowed = pendingDeleteHasKnownPublicAccess() && diskChoiceReady'), 'revoke is available after either explicit file outcome');
ok(page.includes("diskAction === 'trash' && publicationAction === 'revoke'"), 'UI selects composite progress only for exact choices');
ok(page.includes('publicationAction !== \'revoke\''), 'unsafe record-only fallback is hidden for composite errors');
ok(page.includes('Remote phase до manual-resolution'), 'manual card exposes the preserved remote phase');
ok(page.includes('destructive-recovery-card-guidance'), 'manual card renders phase-specific operator guidance');

function nextAction(phase, observation = '') {
  if (phase === 'prepared') return 'drop-before-admission';
  if (phase === 'revoke-admitted-unknown') return observation === 'private-source' ? 'mark-revoke-verified' : 'manual-no-unpublish-retry';
  if (phase === 'revoke-verified') return 'admit-move-once';
  if (phase === 'move-admitted-unknown') return observation === 'private-target' ? 'mark-remote-verified' : 'manual-no-move-retry';
  if (phase === 'remote-verified') return 'local-finalize';
  return 'manual';
}
eq(nextAction('prepared'), 'drop-before-admission', 'model drops harmless prepared receipt');
eq(nextAction('revoke-admitted-unknown', 'public-source'), 'manual-no-unpublish-retry', 'model never repeats unknown unpublish');
eq(nextAction('revoke-admitted-unknown', 'private-source'), 'mark-revoke-verified', 'model settles first effect by observation');
eq(nextAction('revoke-verified'), 'admit-move-once', 'model issues second effect only before its admission');
eq(nextAction('move-admitted-unknown', 'source-still-present'), 'manual-no-move-retry', 'model never repeats unknown move');
eq(nextAction('move-admitted-unknown', 'private-target'), 'mark-remote-verified', 'model settles second effect by target observation');
eq(nextAction('remote-verified'), 'local-finalize', 'model mutates Journal only after both remote proofs');

eq(manifest.version, '0.9.8', 'bounded tranche does not bump the extension version');
console.log(`P1-164 revoke+Trash two-effect composition: PASS ${checks} checks; unpublish_commands=1; move_commands=1; replay_after_admission=false; release_ready=false`);