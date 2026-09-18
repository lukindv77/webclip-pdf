'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');

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
  if (paramsEnd < 0) throw new Error('parameter boundary not found: ' + name);
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
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, i + 1);
    }
  }
  throw new Error('function boundary not found: ' + name);
}

ok(worker.includes('const MAX_PENDING_DESTRUCTIVE_MOVES = 100;'), 'manual/restart destructive ledger remains cardinality bounded');
ok(worker.includes('const PENDING_DESTRUCTIVE_RECONCILE_BATCH = 12;'), 'one maintenance wake processes a bounded destructive batch');

const dispositionSource = functionSource(worker, 'pendingDestructiveMoveRecoveryDisposition');
const context = vm.createContext({ String });
vm.runInContext(dispositionSource + '\nthis.fn=pendingDestructiveMoveRecoveryDisposition;', context);
const disposition = context.fn;

eq(disposition({ phase: 'prepared' }), 'drop-prepared', 'prepared restart receipt is provably pre-admission');
eq(disposition({ phase: 'admitted-unknown' }), 'manual-resolution', 'admitted unknown never auto-retries after restart');
eq(disposition({ phase: 'remote-verified' }), 'finalize-local', 'terminal remote truth may resume local-only finalization');
eq(disposition({ phase: 'manual-resolution' }), 'retain-manual', 'manual receipt remains durable');
eq(disposition({ phase: 'future-phase' }), 'manual-resolution', 'unknown phase fails closed into manual resolution');

const manual = functionSource(worker, 'markPendingDestructiveMoveManualResolution');
ok(manual.includes("phase: terminalVerified ? 'remote-verified' : 'manual-resolution'"), 'terminal verified truth is not downgraded');
ok(manual.includes('manualResolutionRequired: true'), 'manual-resolution requirement is explicit');
ok(manual.includes('manualResolutionAt'), 'manual state has durable timestamp');
ok(manual.includes('manualResolutionTrigger'), 'manual state records restart/maintenance trigger');
ok(manual.includes('lastError:'), 'manual state retains diagnostic reason');

const list = functionSource(worker, 'listPendingDestructiveMovesForRecovery');
ok(list.includes("store().index('updatedAt').openCursor(null, 'next')"), 'restart recovery processes oldest receipts first');
ok(list.includes('out.length >= cap'), 'restart recovery respects batch cap');
ok(list.includes("item.phase === 'manual-resolution' || item.manualResolutionRequired === true"), 'already-manual rows do not starve active work');
ok(list.includes('cursor.continue()'), 'manual rows are skipped without deletion');

const counts = functionSource(worker, 'countPendingDestructiveMovePhases');
ok(counts.includes('manualResolutionRequired === true'), 'phase census counts terminal manual-required rows');
ok(counts.includes('counts.active += 1'), 'phase census reports remaining active work');
ok(counts.includes('counts.manual += 1'), 'phase census reports durable manual backlog');

const verified = functionSource(worker, 'markPendingDestructiveMoveVerified');
ok(verified.includes('verifiedAt'), 'terminal receipt records verification time');
ok(verified.includes('verifiedPath'), 'terminal receipt records path');
ok(verified.includes('verifiedResourceId'), 'terminal receipt records resource identity evidence');
ok(verified.includes('verifiedFilename'), 'terminal ReadLater metadata survives worker death');
ok(verified.includes('verifiedFolder'), 'terminal ReadLater folder survives worker death');
ok(verified.includes('verifiedPublicUrl'), 'terminal ReadLater public metadata survives worker death');
ok(verified.includes('manualResolutionRequired: false'), 'fresh terminal receipt clears manual flag');

const reconcile = functionSource(worker, 'reconcilePendingDestructiveMoves');
ok(reconcile.includes('listPendingDestructiveMovesForRecovery(maxItems)'), 'reconcile uses bounded durable queue');
ok(reconcile.includes("disposition === 'drop-prepared'"), 'prepared path is explicit');
ok(reconcile.includes('removePendingDestructiveMove(id)'), 'prepared receipt is retired without remote work');
ok(reconcile.includes("disposition === 'manual-resolution'"), 'unknown/admitted path is explicit');
ok(reconcile.includes('markPendingDestructiveMoveManualResolution(id, reason, trigger)'), 'admitted unknown becomes durable manual-resolution');
ok(reconcile.includes("kind === 'trash-move'"), 'Trash terminal local finalization is kind-specific');
ok(reconcile.includes('finalizeTrashDeleteFromReceipt(id)'), 'verified Trash resumes local delete only');
ok(reconcile.includes("item.supersededByJournalReset === true"), 'verified ReadLater reset-superseded history is retired without resurrection');
ok(reconcile.includes('finalizeReadMoveJournalFromReceipt(id, {})'), 'superseded ReadLater terminal receipt can be consumed without local patch');
ok(reconcile.includes('verifiedPath'), 'ReadLater restart requires terminal path metadata');
ok(reconcile.includes('verifiedFolder'), 'ReadLater restart requires terminal folder metadata');
ok(reconcile.includes('verifiedFilename'), 'ReadLater restart requires terminal filename metadata');
ok(reconcile.includes('Verified ReadLater receipt не содержит полного terminal local-finalization metadata'), 'legacy/incomplete verified receipt fails closed');
ok(reconcile.includes("readingMode: 'read'"), 'complete terminal ReadLater receipt restores local read state');
ok(reconcile.includes('readMovePendingAt: 0'), 'restart finalize clears old entry checkpoint');
ok(reconcile.includes('countPendingDestructiveMovePhases()'), 'reconcile returns durable backlog truth');
ok(!reconcile.includes('yandexApi('), 'restart reconciliation performs no Yandex request');
ok(!reconcile.includes("'/resources/move'"), 'restart reconciliation never replays destructive move');
ok(!reconcile.includes('findYandexFileForJournalEntry'), 'restart reconciliation does not infer exact remote object from current path');
ok(!reconcile.includes('getValidYandexAccessToken'), 'manual classification requires no auth/network availability');

const readMove = functionSource(worker, 'moveReadLaterEntryToRead');
ok(readMove.includes('filename: moved.name ? normalizeYandexItemNameFromApi(moved.name)'), 'live ReadLater verification persists terminal filename');
ok(readMove.includes('folder: targetFolder'), 'live ReadLater verification persists terminal folder');
ok(readMove.includes('publicUrl: moved.public_url ? normalizeYandexPublicUrlFromApi(moved.public_url)'), 'live ReadLater verification persists terminal public URL');

const trashMove = functionSource(worker, 'moveJournalYandexFileToTrash');
ok(trashMove.includes('filename: moved?.name ? normalizeYandexItemNameFromApi(moved.name) : currentName'), 'live Trash verification persists terminal filename metadata');
ok(trashMove.includes('folder: monthFolder'), 'live Trash verification persists terminal folder metadata');

const maintenance = functionSource(worker, 'runLoggedOperationLogCleanup');
ok(maintenance.includes("runStage('destructive-move-recovery', () => reconcilePendingDestructiveMoves(trigger)"), 'hourly/startup maintenance owns restart reconciliation');
ok(maintenance.includes('destructiveMoves?.manualPending'), 'maintenance reports unresolved manual destructive receipts as partial');
ok(maintenance.includes('destructiveMoves,'), 'maintenance result exposes destructive recovery truth');

const startup = functionSource(worker, 'initializeOperationLogCleanup');
ok(startup.includes("trigger === 'installed' || trigger === 'startup'"), 'browser startup uses durable maintenance scheduling');
ok(startup.includes('delayInMinutes: 1, periodInMinutes: 60'), 'startup schedules near-term alarm and hourly continuation');
ok(!startup.includes('reconcilePendingDestructiveMoves('), 'startup listener does not rely on a long live MV3 promise');

ok(worker.includes("alarm?.name === OPERATION_LOG_CLEANUP_ALARM"), 'maintenance alarm has a service-worker wake handler');
ok(worker.includes("runLoggedOperationLogCleanup('alarm')"), 'alarm wake executes logged maintenance');

console.log(
  'P0-072 destructive restart reconciliation: PASS; checks=' + checks +
  '; batch=12; prepared_drop=true; admitted_manual=true; verified_local_finalize=true;' +
  ' yandex_retry=false; p1_090_exact_object=false; p0_076_full_cas=false;' +
  ' startup_alarm=true; manual_backlog_bounded=true; release_closed=false'
);
