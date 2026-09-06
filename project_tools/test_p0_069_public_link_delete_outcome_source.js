'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const journal = fs.readFileSync(path.join(root, 'journal.js'), 'utf8');
const html = fs.readFileSync(path.join(root, 'journal.html'), 'utf8');

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

function functionBody(source, name) {
  const startCandidates = [`async function ${name}(`, `function ${name}(`];
  let start = -1;
  for (const marker of startCandidates) {
    start = source.indexOf(marker);
    if (start >= 0) break;
  }
  if (start < 0) return '';
  const open = source.indexOf('{', start);
  if (open < 0) return '';
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === quote) quote = '';
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open + 1, i);
    }
  }
  return '';
}

const deleteWorker = functionBody(worker, 'deleteJournalEntry');
const openDelete = functionBody(journal, 'openDeleteDialog');
const confirmDelete = functionBody(journal, 'confirmDeleteEntry');
const runDelete = functionBody(journal, 'runDeleteOperation');

check(deleteWorker.includes('entry.publicUrl') || deleteWorker.includes('publicationState'), 'delete worker must inspect known publication state as an admission input');
check(/publication(?:Choice|Action|Disposition|Outcome)/.test(deleteWorker), 'worker delete contract must carry publication disposition separately from file disposition');
check(/revoke|unpublish|already-private|alreadyPrivate/.test(deleteWorker), 'known-public delete must have an explicit revoke/private outcome path');
check(/explicit-control-relinquishment|keep-public|keepPublic/.test(deleteWorker), 'known-public keep path must encode explicit control relinquishment rather than ordinary keep');
check(/publicationOutcome/.test(deleteWorker), 'successful delete result/log must expose truthful publicationOutcome');
check(/unknown|manual/.test(deleteWorker), 'unknown publication settlement must be represented rather than collapsed into success');
check(/journalMutationAuthority|expectedJournalGeneration|entryGeneration|trusted.*receipt|effectId/i.test(deleteWorker), 'final local delete must be exact Journal-generation/entry/receipt bound');

check(!/action\s*!==\s*['"]keep['"].*action\s*!==\s*['"]trash['"]/.test(deleteWorker), 'legacy keep|trash-only worker admission remains insufficient for public entries');
check(!/if\s*\(isYandex\s*&&\s*action\s*===\s*['"]trash['"]\)\s*moved\s*=\s*await\s*moveJournalYandexFileToTrash/.test(deleteWorker), 'known-public Trash must not jump directly to move before publication outcome');

check(/public|публич|ссылк/i.test(openDelete + html), 'delete UI must disclose public-link state/outcome');
check(/revoke|unpublish|закрыть.*доступ|отозвать.*доступ/i.test(openDelete + html), 'delete UI must offer explicit public-access revoke choice');
check(/keep-public|оставить.*ссылк|сохранить.*публич/i.test(openDelete + html), 'delete UI must distinguish explicitly keeping a public link from merely keeping the file');
check(/control|контрол|управл/i.test(openDelete + html), 'keep-public UI must disclose loss/relinquishment of WebClip control');
check(/publication/i.test(confirmDelete + runDelete) || /public/i.test(confirmDelete + runDelete), 'journal delete request must transmit explicit publication choice');

check(!journal.includes("deleteOnlyAfterError.addEventListener('click', () => runDeleteOperation('keep'))"), 'after-error delete-only fallback must not bypass publication outcome with ordinary keep');
check(!html.includes('<input id="deleteKeepFile" type="radio" name="deleteDiskAction" value="keep">') || /publication/i.test(html), 'file-keep radio alone must not serve as publication acknowledgement');

check(!/unpublish/i.test(worker) || /checkpoint|receipt|phase|recover|reconcile/i.test(worker), 'if runtime adds unpublish, it must be durable/reconciled rather than one fire-and-forget call');

if (failures.length) {
  console.error('P0-069 public-link delete outcome source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('P0-069 public-link delete outcome source gate: PASS');
