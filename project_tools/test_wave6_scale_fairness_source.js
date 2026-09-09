'use strict';
const fs=require('fs');
const assert=require('assert/strict');
const worker=fs.readFileSync('service-worker.js','utf8');
const content=fs.readFileSync('content.js','utf8');
const journal=fs.readFileSync('journal.js','utf8');
const stream=fs.readFileSync('journal-import-stream.js','utf8');

// Intentionally RED on canonical main d4f5b268... . This is target-source acceptance.
assert.match(worker+content,/WorkBudget|OperationBudget|deadlineAt.*nodeBudget|shared.*prepare.*budget/i,'P1-158/P1-167 need shared parent work/deadline budget.');
assert.match(worker,/StorageReservationLedger|storageReservation|reservedBytes/i,'P1-043 needs global storage byte reservation ledger.');
assert.match(worker,/MAX_.*(?:SCRIPT|TAB).*SETTLEMENT|global.*settlement.*cap|settlementAdmission/i,'P1-166 needs one admission cap across unresolved script/tab actual settlements.');
assert.match(worker,/recoveryCursor|fair.*recovery|phaseCredits|roundRobin.*recovery/i,'P1-064/P1-192/P1-208 need durable fair recovery cursors/credits.');
assert.match(worker,/coalesce.*OperationLog|latest.*progress|waitingTurn.*limit|MAX_.*QUEUE.*TURN/i,'P1-173 needs bounded/coalesced waiting-turn admission.');
assert.match(worker,/actionRefresh.*generation|coalesce.*Action|ACTION_REFRESH.*CONCURRENCY|workerPool.*Action/i,'P1-170 needs coalesced generation + bounded Action fanout.');
assert.match(worker,/searchSummary|journalSearchProjection|searchCandidate/i,'P1-009 needs light indexed/summary candidate stage.');
assert.match(journal,/incremental.*domain|render.*chunk|requestIdleCallback|yield.*render/i,'P1-162 needs generation-fenced incremental domain render.');
assert.match(stream,/fillSync|nextSync|peekSync|consumeBuffer|refill/i,'P1-163 parser should await on refill, not per character.');
assert.match(content,/boundedSibling|locatorBudget|MAX_LOCATOR.*SIBLING|locator.*candidate.*budget/i,'P1-168 needs bounded locator creation/scoring.');
assert.match(content,/DISCOVERY_.*BUDGET|discoveryBudget|candidateBudget/i,'P1-160 needs shared discovery budgets/coalescing.');
assert.match(content,/PREPARE_.*BUDGET|prepareBudget|mutationBudget|stringBudget/i,'P1-167 needs one preparation computation budget.');
assert.match(worker,/staging.*lease|ownerGeneration.*staging|stagingOwner/i,'P1-035 staging cleanup needs explicit live owner/lease/generation.');
assert.match(worker,/reservation.*lease|storage.*ownerGeneration/i,'P1-043 stale reservations need exact lease/generation reclaim.');
assert.match(worker,/maintenanceCursor|maintenance.*phase.*cursor|durable.*maintenance/i,'P1-192 long alarm work needs durable progress across wakes.');
assert.match(worker,/remote.*phase.*credit|remoteRecoveryCursor|fair.*remote/i,'P1-208 remote recovery must make fair phase/status progress.');
assert.match(worker,/parentDeadline|remainingDeadline|deadlineAt.*getYandexConfig|getYandexConfig.*deadline/i,'P1-158 prerequisite reads must consume parent deadline.');
assert.match(journal,/lazy.*detail|heavy.*detail|summary.*detail/i,'P1-174 Journal cards should use light summaries and lazy heavy detail.');
console.log('Wave 6 scale/fairness SOURCE gate: PASS');
