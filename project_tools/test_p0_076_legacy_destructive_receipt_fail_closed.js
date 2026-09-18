'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const registry = fs.readFileSync(path.join(ROOT, 'project_docs/RESEARCH_REGISTRY.md'), 'utf8');
const readiness = fs.readFileSync(path.join(ROOT, 'project_docs/RELEASE_READINESS.md'), 'utf8');

let checks = 0;
function ok(value, message) { assert.ok(value, message); checks += 1; }
function eq(actual, expected, message) { assert.strictEqual(actual, expected, message); checks += 1; }

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

const sourceMatch = functionSource(worker, 'pendingDestructiveMoveEntryMatches');
const tokenSource = functionSource(worker, 'pendingDestructiveMoveJournalAuthorityToken');
const authorityMatch = functionSource(worker, 'pendingDestructiveMoveJournalAuthorityMatches');

ok(authorityMatch.includes('pendingDestructiveMoveEntryMatches(receipt, entry)'), 'P0-072 source identity remains mandatory');
ok(authorityMatch.includes('Boolean(token && journalEntryAuthorityMatches'), 'local mutation now requires an exact P0-076 cursor');
ok(!authorityMatch.includes(': true'), 'legacy no-cursor receipt has no permissive local fallback');

const context = vm.createContext({ String, Number, Boolean, Object });
vm.runInContext(
  "const MAX_IMPORTED_ENTRY_ID_CHARS=180;" +
  "const JOURNAL_INITIAL_RESET_GENERATION=1;" +
  "const JOURNAL_INITIAL_ENTRY_REVISION=1;" +
  "function normalizeJournalResetGeneration(v){v=Number(v);return Number.isSafeInteger(v)&&v>=1?v:1;}" +
  "function normalizeJournalEntryRevision(v){v=Number(v);return Number.isSafeInteger(v)&&v>=1?v:1;}" +
  "function normalizeJournalEntryAuthorityToken(value){if(!value||typeof value!=='object'||Array.isArray(value))return null;const entryId=String(value.entryId||'').trim();const resetGeneration=Number(value.resetGeneration);const entryRevision=Number(value.entryRevision);if(!entryId||entryId.length>MAX_IMPORTED_ENTRY_ID_CHARS||!Number.isSafeInteger(resetGeneration)||resetGeneration<1||!Number.isSafeInteger(entryRevision)||entryRevision<1)return null;return {entryId,resetGeneration,entryRevision};}" +
  "function journalEntryAuthorityMatches(resetGeneration,entry,tokenValue){const token=normalizeJournalEntryAuthorityToken(tokenValue);return Boolean(token&&entry&&String(entry.id||'')===token.entryId&&normalizeJournalResetGeneration(resetGeneration)===token.resetGeneration&&normalizeJournalEntryRevision(entry.entryRevision)===token.entryRevision);}" +
  sourceMatch + tokenSource + authorityMatch +
  ";this.api={pendingDestructiveMoveJournalAuthorityToken,pendingDestructiveMoveJournalAuthorityMatches};",
  context
);
const api = context.api;
const entry = { id: 'entry-A', createdAt: 100, destination: 'yandex', resourceId: 'rid-A', entryRevision: 4 };
const legacy = { sourceJournalEntryId: 'entry-A', sourceJournalCreatedAt: 100, sourceResourceId: 'rid-A' };
eq(api.pendingDestructiveMoveJournalAuthorityToken(legacy), null, 'legacy receipt has no invented CAS cursor');
eq(api.pendingDestructiveMoveJournalAuthorityMatches(legacy, 9, entry), false, 'legacy receipt cannot auto-mutate local Journal');
const exact = { ...legacy, sourceJournalResetGeneration: 9, sourceJournalEntryRevision: 4 };
eq(api.pendingDestructiveMoveJournalAuthorityMatches(exact, 9, entry), true, 'new exact receipt can still mutate its current row');
eq(api.pendingDestructiveMoveJournalAuthorityMatches(exact, 9, { ...entry, entryRevision: 5 }), false, 'new exact receipt still fails on newer row revision');

const dispositionSource = functionSource(worker, 'pendingDestructiveMoveRecoveryDisposition');
const dctx = vm.createContext({ String, Boolean });
vm.runInContext(dispositionSource + ';this.fn=pendingDestructiveMoveRecoveryDisposition;', dctx);
eq(dctx.fn({ phase: 'remote-verified', manualResolutionRequired: true }), 'retain-manual', 'verified manual-required receipt cannot loop back into auto-finalize');
eq(dctx.fn({ phase: 'remote-verified' }), 'finalize-local', 'exact current verified receipt remains eligible for local-only finalize');
eq(dctx.fn({ phase: 'admitted-unknown' }), 'manual-resolution', 'unknown external settlement stays manual under P1-090');

const reconcile = functionSource(worker, 'reconcilePendingDestructiveMoves');
const legacyGuard = reconcile.indexOf("item.supersededByJournalReset !== true && !pendingDestructiveMoveJournalAuthorityToken(item)");
const trashFinalize = reconcile.indexOf('finalizeTrashDeleteFromReceipt(id)');
const readFinalize = reconcile.indexOf('finalizeReadMoveJournalFromReceipt(id, {');
ok(legacyGuard >= 0, 'restart reconciliation explicitly detects verified legacy no-cursor receipts');
ok(trashFinalize > legacyGuard, 'legacy guard runs before normal Trash local delete');
ok(readFinalize > legacyGuard, 'legacy guard runs before normal ReadLater local patch');
ok(reconcile.includes('Verified legacy destructive receipt не содержит exact P0-076 Journal authority'), 'legacy manual reason is explicit');
ok(reconcile.includes('markPendingDestructiveMoveManualResolution(id, reason, trigger)'), 'legacy terminal remote evidence is retained as manual-resolution backlog');
ok(reconcile.includes('legacyJournalAuthority: true'), 'operation log distinguishes legacy authority backlog');
ok(reconcile.includes("if (disposition !== 'finalize-local') continue"), 'retain-manual rows are skipped on subsequent recovery passes');

const manual = functionSource(worker, 'markPendingDestructiveMoveManualResolution');
ok(manual.includes("phase: terminalVerified ? 'remote-verified' : 'manual-resolution'"), 'manual policy preserves terminal remote truth');
ok(manual.includes('manualResolutionRequired: true'), 'manual policy retains durable attention flag');
ok(manual.includes('...current'), 'verified paths/resource evidence are preserved rather than reconstructed');

for (const name of ['finalizeReadMoveJournalFromReceipt', 'finalizeTrashDeleteFromReceipt']) {
  const source = functionSource(worker, name);
  const supersededIndex = source.indexOf('receipt.supersededByJournalReset === true');
  const authorityIndex = source.indexOf('pendingDestructiveMoveJournalAuthorityMatches(receipt, resetGeneration, current)');
  ok(supersededIndex >= 0 && authorityIndex > supersededIndex, name + ' may retire reset-superseded history without requiring a legacy cursor');
  ok(source.includes('sourceAuthorityLost: true'), name + ' otherwise refuses stale/missing local authority');
}

const verified = functionSource(worker, 'markPendingDestructiveMoveVerified');
ok(verified.includes('verifiedResourceId'), 'P1-090 remote-object evidence remains durable');
ok(verified.includes('verifiedPath'), 'terminal remote path remains durable');
ok(verified.includes("phase: 'remote-verified'"), 'remote terminal truth remains P0-072 state, not CAS state');

ok(registry.includes('| P0-076 | ACTIVE |'), 'P0-076 remains ACTIVE pending closure audit');
ok(registry.includes('| P0-072 | ACTIVE |'), 'P0-072 remains separate ACTIVE owner');
ok(registry.includes('| P1-090 | ACTIVE |'), 'P1-090 remains separate ACTIVE owner');
ok(/\*\*NOT READY\.\*\*/.test(readiness), 'release readiness remains NOT READY');

console.log(
  'P0-076 legacy destructive receipt fail-closed: PASS; checks=' + checks +
  '; legacy_local_mutation=false; verified_manual=true; superseded_history_retire=true;' +
  ' manual_loop_blocked=true; remote_evidence_preserved=true; p0_072_separate=true; release_closed=false'
);
