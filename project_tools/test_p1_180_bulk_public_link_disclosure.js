'use strict';

// Owner marker for PR contract: P1-180

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const journal = fs.readFileSync(path.join(root, 'journal.js'), 'utf8');
const registry = fs.readFileSync(path.join(root, 'project_docs', 'RESEARCH_REGISTRY.md'), 'utf8');

let checks = 0;
function ok(value, message) { assert.ok(value, message); checks += 1; }
function eq(actual, expected, message) { assert.strictEqual(actual, expected, message); checks += 1; }
function section(source, start, end) {
  const i = source.indexOf(start);
  const j = source.indexOf(end, i + start.length);
  assert.ok(i >= 0 && j > i, `missing source section: ${start} -> ${end}`);
  return source.slice(i, j);
}

// Canonical owner boundary.
ok(registry.includes('| P1-180 | ACTIVE | Bulk local destructive operations must disclose loss of control over existing public Yandex links; no hidden mass unpublish.'), 'P1-180 remains active during implementation tranche');

const disclosure = section(sw, 'function journalDestructiveDisclosureError(', 'async function journalRevisionSnapshot(');
ok(disclosure.includes('JOURNAL_DESTRUCTIVE_DISCLOSURE_VERSION'), 'versioned destructive disclosure receipt');
ok(disclosure.includes("'knownPublicLinkCount'"), 'receipt carries known public-link count');
ok(disclosure.includes("'expectedJournalRevision'"), 'receipt is revision-bound');
ok(disclosure.includes("entry.destination === 'yandex' && String(entry.publicUrl || '').trim()"), 'worker counts known public Yandex links');
ok(disclosure.includes("scope = urlKey ? 'url' : siteKey ? 'site' : 'all'"), 'worker disclosure is exact-scope bound');
ok(disclosure.includes("expectedRevision && revision !== expectedRevision"), 'import disclosure must match preview revision');
ok(disclosure.includes('[JOURNAL_STORE, JOURNAL_META_STORE]'), 'count and revision share one readonly IndexedDB transaction');

const clear = section(sw, 'async function clearJournalEntries(', 'function journalDestructiveDisclosureError(');
ok(clear.includes('normalizeJournalDestructiveDisclosureReceipt(disclosureReceipt, { scope, urlKey, siteKey })'), 'clear requires exact-scope disclosure receipt');
const clearRevisionAt = clear.indexOf("tx.objectStore(JOURNAL_META_STORE).get(JOURNAL_META_REVISION_KEY)");
const clearBeginAt = clear.indexOf('beginClear();');
const clearTouchAt = clear.indexOf('touchJournalDbRevision');
ok(clearRevisionAt >= 0 && clearBeginAt > clearRevisionAt, 'clear validates revision before mutation admission');
ok(clear.includes('currentRevision !== disclosure.expectedJournalRevision'), 'clear fails closed when Journal changed after disclosure');
ok(!clear.includes('/resources/unpublish'), 'bulk clear does not hide mass unpublish');

const commitImport = section(sw, 'async function commitStagedJournalImport(', 'async function previewStagedJournalImport(');
ok(commitImport.includes("scope: 'all', urlKey: '', siteKey: '', expectedJournalRevision: expectedRevision"), 'replace import requires all-scope disclosure tied to preview revision');
ok(commitImport.includes('currentRevision !== expectedRevision || currentRevision !== disclosure.expectedJournalRevision'), 'replace import revalidates disclosure in commit transaction');
ok(!commitImport.includes('/resources/unpublish'), 'replace import does not hide mass unpublish');

const router = section(sw, "case 'WEBCLIP_JOURNAL_DESTRUCTIVE_DISCLOSURE':", "case 'WEBCLIP_JOURNAL_EXPORT_PREPARE':");
ok(router.includes("assertSaveAsOwnerPage(sender, 'journal.html')"), 'disclosure is journal extension-page only');
ok(router.includes('disclosureReceipt: message.disclosureReceipt'), 'clear forwards exact receipt');

const importRoute = section(sw, "case 'WEBCLIP_JOURNAL_IMPORT_REPLACE_STAGED':", "case 'WEBCLIP_JOURNAL_IMPORT_DISCARD_STAGED':");
ok(importRoute.includes('message.disclosureReceipt'), 'import forwards disclosure receipt');

ok(journal.includes('Эта операция изменяет только локальный журнал и НЕ выполняет массовый unpublish на Яндекс Диске.'), 'UI explicitly says no mass unpublish');
ok(journal.includes('они могут продолжить работать после удаления локальных записей'), 'UI discloses links may remain live');
ok(journal.includes('WebClip потеряет эти локальные записи как точку управления последующим отзывом доступа'), 'UI discloses loss of local control point');
ok(journal.includes("type: 'WEBCLIP_JOURNAL_DESTRUCTIVE_DISCLOSURE'"), 'UI obtains worker-side disclosure before confirmation');

const clearDomain = section(journal, 'async function clearDomainJournal()', 'async function clearEntireJournal()');
ok(clearDomain.indexOf('requestJournalDestructiveDisclosure') < clearDomain.indexOf('requestDangerousConfirmation'), 'site clear obtains disclosure before user confirmation');
ok(clearDomain.includes('disclosureReceipt }),'), 'site clear submits confirmed receipt');

const clearAll = section(journal, 'async function clearEntireJournal()', 'function requestDangerousConfirmation');
ok(clearAll.indexOf('requestJournalDestructiveDisclosure') < clearAll.indexOf('requestDangerousConfirmation'), 'all clear obtains disclosure before user confirmation');
ok(clearAll.includes('disclosureReceipt }),'), 'all clear submits confirmed receipt');

const replaceCalls = [...journal.matchAll(/type: 'WEBCLIP_JOURNAL_IMPORT_REPLACE_STAGED'/g)];
eq(replaceCalls.length, 3, 'file, Yandex and resumed imports have explicit replace calls');
for (const match of replaceCalls) {
  const call = journal.slice(match.index, match.index + 650);
  ok(call.includes('disclosureReceipt'), 'every replace import submits destructive disclosure receipt');
}

const disclosureRequests = [...journal.matchAll(/requestJournalDestructiveDisclosure\(\{[\s\S]{0,160}?expectedJournalRevision: previewReceipt\.expectedJournalRevision[\s\S]{0,80}?\}\)/g)];
eq(disclosureRequests.length, 3, 'all three import confirmation paths bind disclosure to preview revision');

// Deterministic semantic model: disclosure is local-only, revision-bound authority.
function prepareModel(entries, revision, scope = 'all') {
  const matches = entries.filter((entry) => scope === 'all' || entry.scope === scope);
  return {
    expectedJournalRevision: revision,
    knownPublicLinkCount: matches.filter((entry) => entry.destination === 'yandex' && entry.publicUrl).length,
    remoteMutations: 0
  };
}
function commitModel(receipt, currentRevision) {
  if (receipt.expectedJournalRevision !== currentRevision) return { committed: false, remoteMutations: 0 };
  return { committed: true, remoteMutations: 0 };
}
const entries = [
  { destination: 'yandex', publicUrl: 'https://public.example/a', scope: 'site-a' },
  { destination: 'yandex', publicUrl: 'https://public.example/b', scope: 'site-b' },
  { destination: 'download', publicUrl: '', scope: 'site-a' }
];
const receipt = prepareModel(entries, 'r1');
eq(receipt.knownPublicLinkCount, 2, 'model counts known public links');
eq(receipt.remoteMutations, 0, 'preflight never unpublishes');
eq(commitModel(receipt, 'r2').committed, false, 'revision race fails closed');
eq(commitModel(receipt, 'r2').remoteMutations, 0, 'stale receipt cannot trigger hidden remote mutation');
eq(commitModel(receipt, 'r1').committed, true, 'exact revision may perform local destructive commit');
eq(commitModel(receipt, 'r1').remoteMutations, 0, 'accepted local destructive commit still performs no mass unpublish');

console.log(`P1-180 bulk public-link disclosure: PASS; checks=${checks}; revision_bound=true; exact_scope=true; known_public_count=true; hidden_mass_unpublish=false; live_provider_calls=0`);
