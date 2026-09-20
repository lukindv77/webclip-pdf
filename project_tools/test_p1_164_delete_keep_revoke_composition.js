'use strict';

// P1-164 / P0-069 direct production regression for the bounded composition:
// revoke one exact Yandex public link, verify privacy, keep the remote file,
// then delete only the exact Journal row. Revoke+Trash remains fail-closed.

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
function throwsCode(fn, code, message) {
  assert.throws(fn, (error) => error?.code === code, message);
  checks += 1;
}

function functionSource(source, name) {
  const marker = new RegExp('(?:async\\s+)?function\\s+' + name + '\\s*\\(').exec(source);
  if (!marker) throw new Error(`function not found: ${name}`);
  const start = marker.index;
  const paramsStart = source.indexOf('(', start);
  let paramsDepth = 0;
  let paramsEnd = -1;
  for (let i = paramsStart; i < source.length; i += 1) {
    if (source[i] === '(') paramsDepth += 1;
    else if (source[i] === ')' && --paramsDepth === 0) { paramsEnd = i; break; }
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
    if (ch === '/' && next === '*') { i = source.indexOf('*/', i + 2) + 1; continue; }
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

ok(worker.includes("const PUBLICATION_REVOKE_COMPLETION_CLEAR = 'clear-public-url';"), 'standalone completion has a stable value');
ok(worker.includes("const PUBLICATION_REVOKE_COMPLETION_DELETE_KEEP = 'delete-journal-keep-file';"), 'composed completion has a stable value');

const normalizeSource = functionSource(worker, 'normalizePublicationRevokeCompletionAction');
const normalizeContext = vm.createContext({ String });
vm.runInContext(
  "const PUBLICATION_REVOKE_COMPLETION_CLEAR='clear-public-url';"
  + "const PUBLICATION_REVOKE_COMPLETION_DELETE_KEEP='delete-journal-keep-file';\n"
  + normalizeSource
  + '\nthis.normalizeForTest=normalizePublicationRevokeCompletionAction;',
  normalizeContext
);
eq(normalizeContext.normalizeForTest(''), 'clear-public-url', 'legacy/standalone receipt defaults to clear-only completion');
eq(normalizeContext.normalizeForTest('clear-public-url'), 'clear-public-url', 'clear-only completion is admitted');
eq(normalizeContext.normalizeForTest('delete-journal-keep-file'), 'delete-journal-keep-file', 'bounded delete completion is admitted');
eq(normalizeContext.normalizeForTest('move-to-trash'), '', 'unreviewed completion fails closed');

const boundarySource = functionSource(worker, 'resolveJournalDeletePublicationOutcome');
const boundaryContext = vm.createContext({ String, Boolean, Object, Error });
vm.runInContext(boundarySource + '\nthis.resolveForTest=resolveJournalDeletePublicationOutcome;', boundaryContext);
const published = { destination: 'yandex', publicUrl: 'https://disk.yandex.ru/d/example' };
const privateEntry = { destination: 'yandex', publicUrl: '' };
throwsCode(() => boundaryContext.resolveForTest(published, '', 'keep'), 'WEBCLIP_PUBLICATION_OUTCOME_REQUIRED', 'published delete still requires an explicit publication choice');
const admitted = boundaryContext.resolveForTest(published, 'revoke', 'keep');
eq(admitted.publicationAction, 'revoke', 'keep-file revoke is admitted');
eq(admitted.publicationOutcome, 'revoke-requested', 'pre-admission outcome is truthful');
ok(Object.isFrozen(admitted), 'publication decision is immutable');
throwsCode(() => boundaryContext.resolveForTest(published, 'revoke', 'trash'), 'WEBCLIP_PUBLICATION_REVOKE_TRASH_UNAVAILABLE', 'revoke plus Trash stays fail-closed');
eq(boundaryContext.resolveForTest(privateEntry, 'revoke', 'trash').publicationAction, 'none', 'already-private entry needs no publication composition');

const checkpoint = functionSource(worker, 'checkpointPendingPublicationRevokeIntent');
const completionValidateAt = checkpoint.indexOf('normalizePublicationRevokeCompletionAction(completionAction)');
const completionPersistAt = checkpoint.indexOf('completionAction: normalizedCompletionAction');
const receiptCommitAt = checkpoint.indexOf('pending.add(item)');
ok(completionValidateAt >= 0, 'completion action is normalized before receipt construction');
ok(completionValidateAt < completionPersistAt && completionPersistAt < receiptCommitAt, 'completion is durable before remote admission');
ok(checkpoint.includes("error.code = 'WEBCLIP_PUBLICATION_REVOKE_COMPLETION_INVALID'"), 'invalid completion has a stable code');
ok(checkpoint.includes('sourceJournalResetGeneration'), 'composition binds Journal reset generation');
ok(checkpoint.includes('sourceJournalEntryRevision'), 'composition binds exact row revision');
ok(checkpoint.includes("String(current?.publicUrl || '').trim() !== item.sourcePublicUrl"), 'receipt commit revalidates exact public URL');

const live = functionSource(worker, 'revokeJournalEntryPublicAccess');
const terminalAt = live.indexOf('await markPendingDestructiveMoveVerified');
const localFinalizeAt = live.indexOf('await finalizePublicationRevokeJournalFromReceipt');
ok(live.includes('options = {}'), 'reviewed revoke primitive accepts an explicit completion option');
ok(live.includes('completionAction: PUBLICATION_REVOKE_COMPLETION_DELETE_KEEP') === false, 'primitive does not silently force delete completion');
ok(live.includes('completionAction\n    });'), 'selected completion is passed into the durable receipt');
ok(live.includes("await yandexApi('/resources/unpublish'"), 'composition uses the single reviewed unpublish command');
eq((live.match(/\/resources\/unpublish/g) || []).length, 1, 'live primitive contains exactly one unpublish command site');
ok(!live.includes("'/resources/move'"), 'keep-file composition cannot move the remote object');
ok(terminalAt >= 0 && terminalAt < localFinalizeAt, 'verified remote privacy precedes local completion');
ok(live.includes('deleteJournalEntryRecordOnlyCas(journalAuthority)'), 'already-private shortcut uses exact CAS deletion');
ok(live.includes("notifyJournalChanged(deleteJournalAfterRevoke ? 'delete' : 'publication-revoke')"), 'result notification reflects the selected completion');

const finalizer = functionSource(worker, 'finalizePublicationRevokeJournalFromReceipt');
const previewAt = finalizer.indexOf('await readPendingDestructiveMoveReceipt(key)');
const identityAt = finalizer.indexOf('pendingDestructiveMoveRemoteIdentityStatus(preview, { requireTerminal: true })');
const authorityAt = finalizer.indexOf('pendingDestructiveMoveJournalAuthorityToken(preview)');
const statsAt = finalizer.indexOf("beginJournalStatsMutation('delete')");
const deleteAt = finalizer.indexOf('entries.delete(current.id)');
const retireAt = finalizer.indexOf('receipts.delete(key)', deleteAt);
ok(previewAt >= 0 && previewAt < identityAt, 'finalizer reads durable receipt before terminal checks');
ok(identityAt < authorityAt && authorityAt < statsAt && statsAt < deleteAt, 'private identity, Journal authority and stats marker precede deletion');
ok(deleteAt < retireAt, 'row deletion and receipt retirement are ordered in one transaction');
ok(finalizer.includes("[JOURNAL_PENDING_DESTRUCTIVE_STORE, JOURNAL_STORE, JOURNAL_META_STORE]"), 'composed local settlement uses one atomic IndexedDB transaction');
ok(finalizer.includes('pendingDestructiveMoveJournalAuthorityMatches(receipt, resetGeneration, current)'), 'transaction rechecks exact generation/revision authority');
ok(finalizer.includes('preview.supersededByJournalReset === true'), 'reset-superseded completion cannot delete replacement state');
ok(finalizer.includes("error.code = 'WEBCLIP_PUBLICATION_REVOKE_DELETE_AUTHORITY_INVALID'"), 'missing legacy Journal authority fails closed');
ok(finalizer.includes('sourceAuthorityLost: true'), 'replacement-row loss is surfaced without deletion');
ok(finalizer.includes("publicUrl: ''"), 'standalone completion remains backward compatible');

const reconcile = functionSource(worker, 'reconcilePendingDestructiveMoves');
ok(reconcile.includes('result?.completionAction === PUBLICATION_REVOKE_COMPLETION_DELETE_KEEP'), 'restart recovery resumes the persisted completion');
ok(reconcile.includes("notifyJournalChanged(deletesJournal ? 'delete' : 'publication-revoke')"), 'restart emits the truthful mutation kind');
ok(!reconcile.includes("'/resources/unpublish'"), 'restart never repeats unpublish');

const deleteFlow = functionSource(worker, 'deleteJournalEntry');
const resolveAt = deleteFlow.indexOf('resolveJournalDeletePublicationOutcome(entry, publicationAction, action)');
const routeAt = deleteFlow.indexOf('await revokeJournalEntryPublicAccess');
const genericLogAt = deleteFlow.indexOf('await startOperationLog');
ok(resolveAt >= 0 && resolveAt < routeAt, 'delete boundary settles composition before durable revoke');
ok(routeAt < genericLogAt, 'composed path has one operation-log owner inside the revoke primitive');
ok(deleteFlow.includes('completionAction: PUBLICATION_REVOKE_COMPLETION_DELETE_KEEP'), 'delete dispatcher requests the exact reviewed completion');

ok(html.includes('Вместе с переносом в Trash этот вариант пока недоступен'), 'dialog discloses the remaining remote-effect boundary');
ok(page.includes('deleteRevokePublicAccess.disabled = !revokeAllowed'), 'UI enables revoke only after keep-file selection');
ok(page.includes('(revokeAllowed && deleteRevokePublicAccess.checked)'), 'UI proceed gate requires an admissible explicit revoke');
ok(page.includes("deleteRevokePublicAccess.checked ? 'revoke' : ''"), 'runtime request carries deliberate revoke');
ok(page.includes('const DELETE_REVOKE_KEEP_STAGES = ['), 'composed progress has truthful stages');
ok(page.includes("['revoke', 'Отзыв публичного доступа']"), 'progress exposes the remote effect');
ok(page.includes("['journal', 'Удаление exact записи локального журнала']"), 'progress exposes the post-verification local effect');

console.log(`P1-164 revoke+keep delete composition: PASS ${checks} checks; remote_commands=1; revoke_trash=false; release_ready=false`);