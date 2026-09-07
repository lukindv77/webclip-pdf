'use strict';

const assert = require('assert');

function makeJournal(revision = 'R1', entries = []) {
  return { revision, entries: entries.map((entry) => ({ ...entry })) };
}

function mutateJournal(journal, revision, mutator) {
  const next = makeJournal(revision, journal.entries);
  mutator(next.entries);
  return next;
}

function readMeta(journal) {
  const domains = new Map();
  for (const entry of journal.entries) {
    const domain = entry.domain || 'unknown';
    domains.set(domain, (domains.get(domain) || 0) + 1);
  }
  return {
    sourceRevision: journal.revision,
    total: journal.entries.length,
    domains: [...domains.entries()].sort()
  };
}

function readPage(journal, offset = 0, limit = 2) {
  return {
    sourceRevision: journal.revision,
    total: journal.entries.length,
    entries: journal.entries.slice(offset, offset + limit).map((entry) => ({ ...entry })),
    continuation: { sourceRevision: journal.revision, offset: offset + limit }
  };
}

function compareGroups(a, b) {
  if (b.latest !== a.latest) return b.latest - a.latest;
  return String(a.key).localeCompare(String(b.key));
}

function groupJournal(journal) {
  const byKey = new Map();
  for (const entry of journal.entries) {
    const key = entry.urlKey;
    const current = byKey.get(key) || { key, latest: -Infinity, entries: [] };
    current.latest = Math.max(current.latest, entry.createdAt);
    current.entries.push({ ...entry });
    byKey.set(key, current);
  }
  return [...byKey.values()].sort(compareGroups);
}

function readGroupPage(journal, continuation = null, limit = 2) {
  if (continuation && continuation.sourceRevision !== journal.revision) {
    return { stale: true, sourceRevision: journal.revision, groups: [] };
  }
  const groups = groupJournal(journal);
  let start = 0;
  if (continuation) {
    start = groups.findIndex((group) => group.key === continuation.key && group.latest === continuation.latest) + 1;
    if (start <= 0) return { stale: true, sourceRevision: journal.revision, groups: [] };
  }
  const page = groups.slice(start, start + limit);
  const last = page[page.length - 1] || null;
  return {
    stale: false,
    sourceRevision: journal.revision,
    groups: page,
    continuation: last ? { sourceRevision: journal.revision, key: last.key, latest: last.latest } : null
  };
}

function readGroupChildren(journal, groupKey, expectedRevision) {
  if (expectedRevision !== journal.revision) {
    return { stale: true, sourceRevision: journal.revision, entries: [] };
  }
  return {
    stale: false,
    sourceRevision: journal.revision,
    entries: journal.entries.filter((entry) => entry.urlKey === groupKey).map((entry) => ({ ...entry }))
  };
}

function composeView(meta, page, currentRevision) {
  if (!meta || !page) return { ok: false, reason: 'missing-component' };
  if (meta.sourceRevision !== page.sourceRevision) return { ok: false, reason: 'mixed-source-revision' };
  if (meta.sourceRevision !== currentRevision) return { ok: false, reason: 'source-changed-before-publish' };
  return {
    ok: true,
    sourceRevision: meta.sourceRevision,
    baselineRevision: meta.sourceRevision,
    meta,
    page
  };
}

function boundedCompose(readAttempt, maxAttempts = 3) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = readAttempt(attempt);
    if (result.ok) return { ...result, attempts: attempt };
    if (!['mixed-source-revision', 'source-changed-before-publish'].includes(result.reason)) return { ...result, attempts: attempt };
  }
  return { ok: false, reason: 'view-changed-refresh-required', attempts: maxAttempts };
}

// 1. Current-shaped unsafe composition accepts A metadata with B entries and then baselines B.
{
  const a = makeJournal('A', [
    { id: 'a1', domain: 'a.test', urlKey: 'u1', createdAt: 30 },
    { id: 'a2', domain: 'a.test', urlKey: 'u2', createdAt: 20 }
  ]);
  const metaA = readMeta(a);
  const b = mutateJournal(a, 'B', (entries) => entries.push({ id: 'b1', domain: 'b.test', urlKey: 'u3', createdAt: 40 }));
  const pageB = readPage(b);
  const unsafe = { meta: metaA, page: pageB, baselineRevision: b.revision };
  assert.equal(unsafe.meta.sourceRevision, 'A');
  assert.equal(unsafe.page.sourceRevision, 'B');
  assert.equal(unsafe.baselineRevision, 'B');
}

// 2. A fully coherent view may publish when the data revision is still A.
{
  const a = makeJournal('A', [{ id: 'a1', domain: 'a.test', urlKey: 'u1', createdAt: 10 }]);
  const result = composeView(readMeta(a), readPage(a), a.revision);
  assert.equal(result.ok, true);
  assert.equal(result.sourceRevision, 'A');
  assert.equal(result.baselineRevision, 'A');
}

// 3. Metadata A plus page B is rejected even if the latest UI load generation did not change.
{
  const a = makeJournal('A', [{ id: 'a1', domain: 'a.test', urlKey: 'u1', createdAt: 10 }]);
  const b = mutateJournal(a, 'B', (entries) => entries.push({ id: 'b1', domain: 'b.test', urlKey: 'u2', createdAt: 20 }));
  const result = composeView(readMeta(a), readPage(b), b.revision);
  assert.deepEqual(result, { ok: false, reason: 'mixed-source-revision' });
}

// 4. Meta/page A cannot be labeled B merely because B becomes current before publish.
{
  const a = makeJournal('A', [{ id: 'a1', domain: 'a.test', urlKey: 'u1', createdAt: 10 }]);
  const result = composeView(readMeta(a), readPage(a), 'B');
  assert.deepEqual(result, { ok: false, reason: 'source-changed-before-publish' });
}

// 5. If B happens after a coherent A publish, the rendered baseline remains A so a watcher detects B.
{
  const a = makeJournal('A', [{ id: 'a1', domain: 'a.test', urlKey: 'u1', createdAt: 10 }]);
  const rendered = composeView(readMeta(a), readPage(a), 'A');
  assert.equal(rendered.ok, true);
  const currentRevision = 'B';
  assert.notEqual(currentRevision, rendered.baselineRevision);
}

// 6. Group continuation captured under A cannot enumerate B.
{
  const a = makeJournal('A', [
    { id: '1', urlKey: 'u1', createdAt: 40 },
    { id: '2', urlKey: 'u2', createdAt: 30 },
    { id: '3', urlKey: 'u3', createdAt: 20 }
  ]);
  const page1 = readGroupPage(a, null, 2);
  assert.equal(page1.stale, false);
  const b = mutateJournal(a, 'B', (entries) => entries.push({ id: '4', urlKey: 'u3', createdAt: 50 }));
  const page2 = readGroupPage(b, page1.continuation, 2);
  assert.equal(page2.stale, true);
}

// 7. Ungrouped numeric-offset continuation is also revision-bound.
{
  const a = makeJournal('A', [
    { id: '1', urlKey: 'u1', createdAt: 40 },
    { id: '2', urlKey: 'u2', createdAt: 30 },
    { id: '3', urlKey: 'u3', createdAt: 20 }
  ]);
  const page1 = readPage(a, 0, 2);
  const b = mutateJournal(a, 'B', (entries) => entries.unshift({ id: 'new', urlKey: 'u0', createdAt: 50 }));
  assert.equal(page1.continuation.sourceRevision, 'A');
  assert.notEqual(page1.continuation.sourceRevision, b.revision);
}

// 8. Group expansion must use the revision of the rendered group header.
{
  const a = makeJournal('A', [{ id: '1', urlKey: 'u1', createdAt: 10 }]);
  const header = readGroupPage(a, null, 1).groups[0];
  const b = mutateJournal(a, 'B', (entries) => entries.push({ id: '2', urlKey: 'u1', createdAt: 20 }));
  const children = readGroupChildren(b, header.key, 'A');
  assert.equal(children.stale, true);
}

// 9. Import replacement reusing identical ids/URLs is still a different source revision.
{
  const a = makeJournal('A', [{ id: 'same', urlKey: 'same-url', createdAt: 10, domain: 'same.test' }]);
  const b = makeJournal('B', [{ id: 'same', urlKey: 'same-url', createdAt: 10, domain: 'same.test' }]);
  assert.deepEqual(readMeta(a).domains, readMeta(b).domains);
  assert.notEqual(a.revision, b.revision);
  assert.equal(composeView(readMeta(a), readPage(b), 'B').ok, false);
}

// 10. Clear between page requests invalidates the old continuation.
{
  const a = makeJournal('A', [
    { id: '1', urlKey: 'u1', createdAt: 20 },
    { id: '2', urlKey: 'u2', createdAt: 10 }
  ]);
  const page1 = readGroupPage(a, null, 1);
  const cleared = makeJournal('B', []);
  assert.equal(readGroupPage(cleared, page1.continuation, 1).stale, true);
}

// 11. One mismatch may converge to B on bounded retry.
{
  const a = makeJournal('A', [{ id: '1', urlKey: 'u1', createdAt: 10 }]);
  const b = mutateJournal(a, 'B', (entries) => entries.push({ id: '2', urlKey: 'u2', createdAt: 20 }));
  const result = boundedCompose((attempt) => {
    if (attempt === 1) return composeView(readMeta(a), readPage(b), 'B');
    return composeView(readMeta(b), readPage(b), 'B');
  }, 3);
  assert.equal(result.ok, true);
  assert.equal(result.sourceRevision, 'B');
  assert.equal(result.attempts, 2);
}

// 12. Continuous churn terminates with a controlled refresh-required state.
{
  const result = boundedCompose(() => ({ ok: false, reason: 'source-changed-before-publish' }), 3);
  assert.deepEqual(result, { ok: false, reason: 'view-changed-refresh-required', attempts: 3 });
}

// 13. UI latest-load generation remains a separate positive control.
{
  let uiGeneration = 1;
  const sourceRevision = 'A';
  const oldUiReceipt = { uiGeneration, sourceRevision };
  uiGeneration += 1;
  assert.notEqual(oldUiReceipt.uiGeneration, uiGeneration);
  assert.equal(oldUiReceipt.sourceRevision, sourceRevision);
}

// 14. Source revision and UI generation are intentionally independent dimensions.
{
  const receipt = { uiGeneration: 7, sourceRevision: 'R42' };
  assert.equal(typeof receipt.uiGeneration, 'number');
  assert.equal(typeof receipt.sourceRevision, 'string');
}

// 15. Rendered revision can be forwarded as expected revision to mutation authority without retargeting.
{
  const a = makeJournal('A', [{ id: '1', urlKey: 'u1', createdAt: 10 }]);
  const rendered = composeView(readMeta(a), readPage(a), 'A');
  const mutationCommand = { entryId: '1', expectedJournalRevision: rendered.sourceRevision };
  assert.equal(mutationCommand.expectedJournalRevision, 'A');
}

// 16. Coherence does not require one unbounded transaction; bounded component receipts suffice when final-fenced.
{
  const a = makeJournal('A', [
    { id: '1', domain: 'a.test', urlKey: 'u1', createdAt: 20 },
    { id: '2', domain: 'a.test', urlKey: 'u2', createdAt: 10 }
  ]);
  const metaReceipt = readMeta(a); // conceptual bounded transaction 1
  const pageReceipt = readPage(a); // conceptual bounded transaction 2
  const final = composeView(metaReceipt, pageReceipt, 'A');
  assert.equal(final.ok, true);
}

console.log('P1-206 Journal composed-view revision model: PASS');
