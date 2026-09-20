'use strict';

// P0-069 direct production regression for the explicit preserve boundary.
// P1-231 binds the changed runtime bytes to fresh exact-generation evidence.

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const page = fs.readFileSync(path.join(root, 'journal.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'journal.html'), 'utf8');

let checks = 0;
function ok(value, message) { checks += 1; assert.ok(value, message); }
function eq(actual, expected, message) { checks += 1; assert.strictEqual(actual, expected, message); }
function throwsCode(fn, code, message) {
  checks += 1;
  assert.throws(fn, (error) => error?.code === code, message);
}

const helperStart = worker.indexOf('function resolveJournalDeletePublicationOutcome');
const helperEnd = worker.indexOf('async function deleteJournalEntry', helperStart);
ok(helperStart >= 0 && helperEnd > helperStart, 'production publication helper must be present');
const helperSource = worker.slice(helperStart, helperEnd);
const context = vm.createContext({ String, Boolean, Object, Error });
vm.runInContext(`${helperSource}\nthis.resolveForTest = resolveJournalDeletePublicationOutcome;`, context);

const unpublished = { destination: 'yandex', publicUrl: '' };
const published = { destination: 'yandex', publicUrl: 'https://disk.yandex.ru/d/example' };
const local = { destination: 'download', publicUrl: 'https://example.invalid/not-a-yandex-publication' };

let outcome = context.resolveForTest(unpublished, '');
eq(outcome.publicationAction, 'none', 'unpublished entry needs no artificial choice');
eq(outcome.publicationOutcome, 'none', 'unpublished entry has no publication outcome');
eq(outcome.hasKnownPublicAccess, false, 'unpublished entry stays ordinary');

outcome = context.resolveForTest(local, '');
eq(outcome.publicationAction, 'none', 'local download does not acquire Yandex publication semantics');

throwsCode(
  () => context.resolveForTest(published, ''),
  'WEBCLIP_PUBLICATION_OUTCOME_REQUIRED',
  'published delete must fail closed without a publication choice'
);
throwsCode(
  () => context.resolveForTest(published, 'none'),
  'WEBCLIP_PUBLICATION_OUTCOME_REQUIRED',
  'published delete cannot disguise an omitted choice as none'
);
throwsCode(
  () => context.resolveForTest(published, 'revoke', 'trash'),
  'WEBCLIP_PUBLICATION_REVOKE_TRASH_UNAVAILABLE',
  'revoke plus a second remote Trash effect must fail before destructive work'
);

outcome = context.resolveForTest(published, 'revoke', 'keep');
eq(outcome.publicationAction, 'revoke', 'revoke is admitted only when the remote file stays in place');
eq(outcome.publicationOutcome, 'revoke-requested', 'boundary records the requested private outcome before admission');
ok(Object.isFrozen(outcome), 'revoke request outcome is immutable');

outcome = context.resolveForTest(published, 'preserve');
eq(outcome.hasKnownPublicAccess, true, 'known public access is detected');
eq(outcome.publicationAction, 'preserve', 'explicit preserve action is retained');
eq(outcome.publicationOutcome, 'preserved-by-user', 'result records deliberate preservation');
ok(Object.isFrozen(outcome), 'publication outcome is immutable');

const deleteStart = worker.indexOf('async function deleteJournalEntry(id,');
const deleteEnd = worker.indexOf('async function chooseAvailableTargetPath', deleteStart);
ok(deleteStart >= 0 && deleteEnd > deleteStart, 'delete implementation markers must be present');
const deleteSource = worker.slice(deleteStart, deleteEnd);
const resolveCall = deleteSource.indexOf('resolveJournalDeletePublicationOutcome(entry, publicationAction, action)');
const logCall = deleteSource.indexOf('await startOperationLog(');
const moveCall = deleteSource.indexOf('await moveJournalYandexFileToTrash(');
const localDeleteCall = deleteSource.indexOf('await deleteJournalEntryRecordOnlyCas(');
ok(resolveCall >= 0, 'delete path must settle publication choice');
ok(resolveCall < logCall, 'publication choice is settled before operation log admission');
ok(resolveCall < moveCall, 'publication choice is settled before remote move');
ok(resolveCall < localDeleteCall, 'publication choice is settled before local deletion');
ok(deleteSource.includes("publicationOutcome: publication.publicationOutcome"), 'worker returns explicit publication outcome');
ok(deleteSource.includes("publicationAction: publication.publicationAction"), 'worker returns explicit publication action');
ok(deleteSource.includes('PUBLICATION_REVOKE_COMPLETION_DELETE_KEEP'), 'keep-file revoke persists its local-delete completion in the durable receipt path');
ok(deleteSource.includes('await revokeJournalEntryPublicAccess'), 'delete composition reuses the reviewed durable revoke primitive');

const handlerStart = worker.indexOf("case 'WEBCLIP_JOURNAL_DELETE':");
const handlerEnd = worker.indexOf("case 'WEBCLIP_JOURNAL_UPDATE_COMMENT':", handlerStart);
const handlerSource = worker.slice(handlerStart, handlerEnd);
ok(handlerSource.includes("publicationAction: String(message.publicationAction || '')"), 'runtime message carries publication action');

for (const marker of [
  'id="deletePublicationChoices"',
  'id="deletePreservePublicAccess"',
  'value="preserve"',
  'id="deleteRevokePublicAccess"',
  'value="revoke" disabled',
  'любой человек со ссылкой сможет и дальше открыть файл',
  'Вместе с переносом в Trash этот вариант пока недоступен'
]) ok(html.includes(marker), `delete dialog marker missing: ${marker}`);

ok(page.includes("deletePublicationChoices.classList.toggle('hidden', !hasKnownPublicAccess)"), 'publication choice appears only for known published entries');
ok(page.includes('deleteRevokePublicAccess.disabled = !revokeAllowed'), 'revoke choice is enabled only for keep-file composition');
ok(page.includes('(revokeAllowed && deleteRevokePublicAccess.checked)'), 'proceed admits an explicit revoke choice only when keep-file is selected');
ok(page.includes("deleteRevokePublicAccess.checked ? 'revoke' : ''"), 'page derives revoke only from deliberate selection');
ok(page.includes('diskAction, publicationAction, operationId: activeDeleteOperationId'), 'page sends both independent choices');
ok(page.includes("runDeleteOperation('keep', deleteRetryPublicationAction)"), 'fallback record-only delete retains publication choice');
ok(page.includes("result.publicationOutcome === 'preserved-by-user'"), 'success copy is driven by settled worker outcome');
ok(!deleteSource.includes("'/resources/unpublish'"), 'delete dispatcher does not duplicate the single-command revoke implementation');

console.log(`P0-069 explicit preserve boundary tests: PASS ${checks} checks`);