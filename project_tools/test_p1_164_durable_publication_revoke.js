'use strict';

// P1-164 direct production regression for durable per-entry Yandex unpublish.
// P0-069 admits bounded revoke+keep deletion and an explicit two-admission revoke+Trash protocol.
// P1-231 requires fresh exact-runtime evidence for these production bytes.

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const page = fs.readFileSync(path.join(ROOT, 'journal.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'journal.html'), 'utf8');

let checks = 0;
function ok(value, message) { assert.ok(value, message); checks += 1; }
function eq(actual, expected, message) { assert.equal(actual, expected, message); checks += 1; }

function functionSource(source, name) {
  const re = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(');
  const match = re.exec(source);
  if (!match) throw new Error('function not found: ' + name);
  const start = match.index;
  const paramsStart = source.indexOf('(', start);
  let parens = 0;
  let paramsEnd = -1;
  for (let i = paramsStart; i < source.length; i += 1) {
    if (source[i] === '(') parens += 1;
    else if (source[i] === ')') {
      parens -= 1;
      if (parens === 0) { paramsEnd = i; break; }
    }
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
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error('function boundary not found: ' + name);
}

const resetDispositionSource = functionSource(worker, 'pendingDestructiveMoveResetDisposition');
const resetContext = vm.createContext({ String });
vm.runInContext(resetDispositionSource + '\nthis.fn=pendingDestructiveMoveResetDisposition;', resetContext);
eq(resetContext.fn({ kind: 'publication-revoke', phase: 'prepared' }), 'drop', 'pre-admission revoke intent may be dropped by reset');
eq(resetContext.fn({ kind: 'publication-revoke', phase: 'admitted-unknown' }), 'preserve', 'admitted revoke survives reset');
eq(resetContext.fn({ kind: 'publication-revoke', phase: 'manual-resolution' }), 'preserve', 'manual revoke evidence survives reset');

const checkpoint = functionSource(worker, 'checkpointPendingPublicationRevokeIntent');
ok(checkpoint.includes("kind: compositeTrash ? 'publication-revoke-trash' : 'publication-revoke'"), 'durable receipt separates standalone and two-effect kinds');
ok(checkpoint.includes("phase: 'prepared'"), 'receipt starts before remote admission');
ok(checkpoint.includes("requestedPublicationOutcome: 'private'"), 'receipt binds the requested private outcome');
ok(checkpoint.includes('completionAction: normalizedCompletionAction'), 'receipt durably binds the reviewed local completion');
ok(checkpoint.includes('sourceJournalResetGeneration'), 'receipt binds Journal reset generation');
ok(checkpoint.includes('sourceJournalEntryRevision'), 'receipt binds Journal row revision');
ok(checkpoint.includes('pendingDestructiveMoveRemoteIdentityFields'), 'receipt persists provider-observed identity authority');
ok(checkpoint.includes("String(current?.publicUrl || '').trim() !== item.sourcePublicUrl"), 'receipt transaction revalidates exact Journal public URL');
ok(checkpoint.includes('count >= MAX_PENDING_DESTRUCTIVE_MOVES'), 'revoke receipts share the bounded destructive ledger');
ok(checkpoint.includes("['read-move', 'trash-move', 'publication-revoke', 'publication-revoke-trash'].includes(existing.kind)"), 'revoke cannot race another destructive effect for the same Journal row');
ok(checkpoint.includes("error.code = 'WEBCLIP_PUBLICATION_REVOKE_ALREADY_PENDING'"), 'concurrent destructive receipt conflict has a stable code');
ok(checkpoint.includes('activeDestructiveMoveReceipts.add(item.id)'), 'live ownership starts only after durable transaction commit');

const identityStatus = functionSource(worker, 'pendingDestructiveMoveRemoteIdentityStatus');
ok(identityStatus.includes("item.kind === 'publication-revoke' && targetPath !== sourcePath"), 'unpublish receipt cannot retarget its exact path');
ok(identityStatus.includes("['publication-revoke-trash', 'publication-revoke'].includes(item.kind)"), 'both terminal revoke kinds reject remaining public_url');

const live = functionSource(worker, 'revokeJournalEntryPublicAccess');
const checkpointAt = live.indexOf('await checkpointPendingPublicationRevokeIntent');
const admissionAt = live.indexOf('await markPendingDestructiveMoveAdmitted');
const commandAt = live.indexOf("await yandexApi('/resources/unpublish'");
const verifyAt = live.indexOf('await readYandexPublicationStateByReceipt');
const terminalAt = live.indexOf('await markPendingDestructiveMoveVerified');
const finalizeAt = live.indexOf('await finalizePublicationRevokeJournalFromReceipt');
ok(checkpointAt >= 0, 'live path creates durable receipt');
ok(checkpointAt < admissionAt, 'durable receipt precedes admission');
ok(admissionAt < commandAt, 'admitted-unknown is durable before unpublish starts');
ok(commandAt < verifyAt, 'authoritative metadata verification follows the command');
ok(verifyAt < terminalAt, 'private observation precedes terminal receipt');
ok(terminalAt < finalizeAt, 'terminal remote truth precedes Journal mutation');
eq((live.match(/\/resources\/unpublish/g) || []).length, 1, 'live operation sends at most one unpublish command');
ok(live.includes("method: 'PUT'"), 'unpublish uses the project-authorized PUT contract');
ok(live.includes('retryForbidden: true'), 'unknown command settlement is logged as non-retriable');
ok(live.includes('observedPublicUrl !== expectedPublicUrl'), 'current provider public_url must match the Journal link');
ok(live.includes("entryResourceId !== String(identityReceipt.resourceId || '')"), 'already-private shortcut requires stable identity continuity');
ok(live.includes('assertDestructiveCommand'), 'exact object is revalidated immediately before admission');
ok(live.includes('if (!observed.publicUrl)'), 'success requires authoritative absence of public_url');
ok(live.includes("error.code = 'WEBCLIP_PUBLICATION_REVOKE_SETTLEMENT_UNKNOWN'"), 'unknown settlement has a stable fail-closed code');
ok(live.includes('if (revokeAdmitted)'), 'error handling distinguishes admitted from prepared state');
ok(live.includes('markPendingDestructiveMoveFailure'), 'admitted error retains durable evidence');
ok(live.includes('removePendingDestructiveMove'), 'pre-admission failure retires harmless intent');
ok(live.includes("publicationOutcome: 'revoked-verified'"), 'result never claims revoke without terminal verification');
ok(live.includes("publicationOutcome: 'already-private-verified'"), 'stale local link can be cleared only after provider observation');

const observe = functionSource(worker, 'readYandexPublicationStateByReceipt');
ok(observe.includes('WebClipYandexOperationContext.proveRecoveryContext'), 'observation is bound to exact account/root namespace');
ok(observe.includes("query: { path: sourcePath, fields: 'name,path,type,size,public_url,resource_id' }"), 'observation requests path, public state and stable identity together');
ok(observe.includes('observedResourceId !== sourceResourceId'), 'observation rejects resource replacement');
ok(observe.includes('observedPath !== sourcePath'), 'observation rejects path retargeting');

const restartObserve = functionSource(worker, 'reconcilePendingPublicationRevokeReceipt');
ok(restartObserve.includes('captureCurrentYandexOperationContext'), 'restart observation obtains current authenticated context');
ok(restartObserve.includes('readYandexPublicationStateByReceipt'), 'restart observes instead of replaying unpublish');
ok(!restartObserve.includes("'/resources/unpublish'"), 'restart helper never repeats unpublish');
ok(restartObserve.includes('if (observed.publicUrl)'), 'still-public state remains unresolved');
ok(restartObserve.includes('markPendingDestructiveMoveVerified'), 'private observation can settle terminal receipt');

const reconcile = functionSource(worker, 'reconcilePendingDestructiveMoves');
ok(reconcile.includes("kind === 'publication-revoke' && item.phase === 'admitted-unknown'"), 'restart path handles unknown revoke explicitly');
ok(reconcile.includes('reconcilePendingPublicationRevokeReceipt'), 'restart path uses observation-only settlement');
ok(reconcile.includes('retryForbidden: true'), 'restart evidence records the no-retry rule');
ok(reconcile.includes('finalizePublicationRevokeJournalFromReceipt(id)'), 'verified restart receipt resumes local-only finalization');
ok(!reconcile.includes("'/resources/unpublish'"), 'generic restart reconciliation never contains unpublish command');

const finalize = functionSource(worker, 'finalizePublicationRevokeJournalFromReceipt');
ok(finalize.includes("receipt.kind !== 'publication-revoke' || receipt.phase !== 'remote-verified'"), 'local finalizer requires correct terminal kind');
ok(finalize.includes('pendingDestructiveMoveRemoteIdentityStatus(receipt, { requireTerminal: true })'), 'local finalizer rechecks terminal identity continuity');
ok(finalize.includes("publicUrl: ''"), 'local finalizer clears the public link');
ok(finalize.includes('resourceId: String(receipt.verifiedResourceId'), 'local finalizer preserves exact resource identity');
ok(finalize.includes('remotePath: normalizeDiskPath(receipt.verifiedPath'), 'local finalizer preserves verified path');
ok(finalize.includes('remoteIdentityProvenance: WebClipYandexRemoteIdentityAuthority.PROVIDER_VERIFIED'), 'local finalizer upgrades identity provenance');
ok(finalize.includes('publicationRevokedAt'), 'local finalizer records verified revoke time');
ok(finalize.includes('pendingDestructiveMoveJournalAuthorityMatches'), 'local mutation is exact generation/revision CAS');
ok(finalize.includes('supersededByJournalReset === true'), 'reset-superseded receipt cannot mutate replacement Journal state');
ok(finalize.includes('PUBLICATION_REVOKE_COMPLETION_DELETE_KEEP'), 'verified receipt can select bounded keep-file Journal deletion');
ok(finalize.includes("[JOURNAL_PENDING_DESTRUCTIVE_STORE, JOURNAL_STORE, JOURNAL_META_STORE]"), 'composed delete and receipt retirement share one IndexedDB transaction');
ok(finalize.includes("beginJournalStatsMutation('delete')"), 'composed local delete opens the crash-repair stats marker first');
ok(finalize.includes('pendingDestructiveMoveJournalAuthorityMatches(receipt, resetGeneration, current)'), 'composed local delete rechecks exact generation/revision CAS');
ok(finalize.includes('entries.delete(current.id)'), 'composed completion deletes only the authority-matched row');
ok(finalize.includes('receipts.delete(key)'), 'composed completion atomically retires its durable receipt');
ok(finalize.indexOf('pendingDestructiveMoveRemoteIdentityStatus(preview, { requireTerminal: true })') < finalize.indexOf("beginJournalStatsMutation('delete')"), 'terminal private identity is rechecked before local mutation admission');

ok(worker.includes("case 'WEBCLIP_JOURNAL_REVOKE_PUBLIC_ACCESS':"), 'runtime exposes a dedicated extension-only command');
ok(worker.includes("assertSaveAsOwnerPage(sender, 'journal.html')"), 'command is restricted to the Journal owner page');
ok(page.includes("makeButton('Отозвать публичную ссылку'"), 'published entry exposes explicit standalone revoke');
ok(page.includes("type: 'WEBCLIP_JOURNAL_REVOKE_PUBLIC_ACCESS'"), 'page sends the dedicated command');
ok(page.includes("result.publicationOutcome === 'already-private-verified'"), 'UI copy is driven by verified worker outcome');
ok(html.includes('value="revoke" disabled'), 'revoke starts disabled until keep-file is deliberately selected');
ok(html.includes('отдельно зафиксирована move admission'), 'delete dialog truthfully explains the second remote admission');
ok(page.includes('deleteRevokePublicAccess.disabled = !revokeAllowed'), 'UI enables revoke only after an explicit file outcome');
ok(page.includes("deleteRevokePublicAccess.checked ? 'revoke' : ''"), 'UI transmits only a deliberate revoke choice');

const deleteBoundary = functionSource(worker, 'resolveJournalDeletePublicationOutcome');
ok(deleteBoundary.includes("normalizedDiskAction === 'trash' ? 'revoke-and-trash-requested' : 'revoke-requested'"), 'P0-069 distinguishes keep and Trash revoke outcomes');
ok(deleteBoundary.includes("publicationOutcome: normalizedDiskAction === 'trash' ? 'revoke-and-trash-requested' : 'revoke-requested'"), 'revoke+Trash has an explicit pre-admission outcome');

console.log(`P1-164 durable publication revoke: PASS ${checks} checks; unpublish_retries=0; delete_keep_composition=true; delete_trash_composition=true; release_ready=false`);