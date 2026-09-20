'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const journal = fs.readFileSync(path.join(ROOT, 'journal.js'), 'utf8');
const html = fs.readFileSync(path.join(ROOT, 'journal.html'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'journal.css'), 'utf8');
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

ok(worker.includes('const PENDING_DESTRUCTIVE_MANUAL_LIST_MAX = 50;'), 'manual backlog UI is bounded');

const isManual = functionSource(worker, 'pendingDestructiveMoveIsManual');
ok(isManual.includes("String(item.phase || '') === 'manual-resolution'"), 'explicit manual phase is recognized');
ok(isManual.includes('item.manualResolutionRequired === true'), 'verified manual-required state is recognized');

const markManual = functionSource(worker, 'markPendingDestructiveMoveManualResolution');
ok(markManual.includes('manualResolutionSourcePhase'), 'manual transition preserves the pre-manual remote phase');
ok(markManual.includes("current.phase === 'manual-resolution' ? '' : current.phase"), 'legacy manual receipts do not fabricate a source phase');
ok(markManual.indexOf('manualResolutionSourcePhase') < markManual.indexOf("phase: terminalVerified ? 'remote-verified' : 'manual-resolution'"), 'source phase is derived before the visible manual phase overwrites it');

const sanitize = functionSource(worker, 'pendingDestructiveMoveManualReceiptForUi');
ok(sanitize.includes('if (!pendingDestructiveMoveIsManual(item)) return null'), 'only manual receipts are projected to UI');
for (const field of ['sourcePath', 'targetPath', 'verifiedPath', 'sourceResourceId', 'verifiedResourceId', 'updatedAt', 'manualResolutionAt', 'manualResolutionSourcePhase', 'lastError']) {
  ok(sanitize.includes(field), 'manual projection carries review evidence: ' + field);
}
ok(!sanitize.includes('publicUrl'), 'manual UI projection does not expose public URLs unnecessarily');
ok(!sanitize.includes('accountUid:'), 'manual UI projection does not expose account uid value');

const list = functionSource(worker, 'listPendingDestructiveManualReceipts');
ok(list.includes("JOURNAL_PENDING_DESTRUCTIVE_STORE"), 'manual list reads only destructive receipt store');
ok(list.includes("'readonly'"), 'manual list is read-only');
ok(list.includes("index('updatedAt').openCursor"), 'manual list is stable oldest-first');
ok(list.includes('pendingDestructiveMoveIsManual(item)'), 'manual list filters non-manual receipts');
ok(list.includes('totalManual > receipts.length'), 'manual list reports truncation');
ok(!list.includes('yandexApi('), 'manual list never calls Yandex');
ok(!list.includes('JOURNAL_STORE'), 'manual list never reads/mutates Journal rows');

const dismiss = functionSource(worker, 'dismissPendingDestructiveManualReceipt');
ok(dismiss.includes('pending.get(key)'), 'dismiss rereads exact receipt');
ok(dismiss.includes('pendingDestructiveMoveIsManual(current)'), 'dismiss requires receipt to still be manual');
ok(dismiss.includes('currentUpdatedAt !== expected'), 'dismiss compares exact updatedAt authority');
ok(dismiss.includes('activeDestructiveMoveReceipts.has(key)'), 'dismiss refuses a receipt reclaimed by a live operation');
ok(dismiss.includes('pending.delete(key)'), 'dismiss deletes only the selected pending receipt');
ok(dismiss.includes('manual-resolution-dismissed'), 'manual dismissal leaves operation-log evidence');
ok(dismiss.includes('не изменял Journal или Яндекс Диск'), 'operation log states non-effect boundary');
ok(!dismiss.includes('yandexApi('), 'dismiss never calls Yandex');
ok(!dismiss.includes('JOURNAL_STORE'), 'dismiss never touches Journal rows');
ok(!dismiss.includes('entries.'), 'dismiss has no Journal entry mutation path');

const dispatchWindow = worker.slice(
  worker.indexOf("case 'WEBCLIP_JOURNAL_GET_MANY'"),
  worker.indexOf("case 'WEBCLIP_OPEN_JOURNAL_SAVED_FILE'")
);
for (const type of ['WEBCLIP_JOURNAL_DESTRUCTIVE_MANUAL_LIST', 'WEBCLIP_JOURNAL_DESTRUCTIVE_MANUAL_EXPORT_OBSERVER_PREPARE', 'WEBCLIP_JOURNAL_DESTRUCTIVE_MANUAL_DISMISS']) {
  ok(dispatchWindow.includes("case '" + type + "'"), type + ' runtime endpoint exists');
}
eq((dispatchWindow.match(/assertSaveAsOwnerPage\(sender, 'journal\.html'\)/g) || []).length, 3, 'all three manual endpoints require journal.html owner page');
eq((dispatchWindow.match(/senderKind !== 'extension'/g) || []).length, 4, 'GET_MANY plus all three manual endpoints remain extension-only');

ok(html.includes('id="destructiveRecoveryPanel"'), 'Journal exposes manual backlog panel');
ok(html.includes('WebClip не знает точный итог'), 'UI states unknown external outcome');
ok(html.includes('Списание удаляет только recovery receipt'), 'UI states dismiss-only semantics');
ok(html.includes('id="refreshDestructiveRecovery"'), 'manual backlog can be explicitly refreshed');

const guidanceSource = functionSource(journal, 'manualDestructiveReceiptRecoveryGuidance');
const guidanceContext = vm.createContext({ String });
vm.runInContext(guidanceSource + '\nthis.guide = manualDestructiveReceiptRecoveryGuidance;', guidanceContext);
const guide = guidanceContext.guide;
ok(guide({ kind: 'publication-revoke-trash', manualResolutionSourcePhase: 'revoke-admitted-unknown' }).includes('Unpublish уже был durably admitted'), 'composite unknown revoke has explicit no-retry guidance');
ok(guide({ kind: 'publication-revoke-trash', manualResolutionSourcePhase: 'revoke-verified' }).includes('move ещё не был durably admitted'), 'composite verified revoke distinguishes not-yet-admitted move');
ok(guide({ kind: 'publication-revoke-trash', manualResolutionSourcePhase: 'move-admitted-unknown' }).includes('Move уже был durably admitted'), 'composite unknown move has explicit no-retry guidance');
ok(guide({ kind: 'publication-revoke', manualResolutionSourcePhase: 'admitted-unknown' }).includes('automatic unpublish retry запрещён'), 'standalone revoke guidance preserves no-replay rule');
ok(guide({ kind: 'trash-move', manualResolutionSourcePhase: 'admitted-unknown' }).includes('automatic move retry запрещён'), 'single move guidance preserves no-replay rule');
ok(guide({ kind: 'publication-revoke-trash', phase: 'manual-resolution' }).includes('legacy receipt'), 'legacy manual receipt stays explicit unknown rather than fabricating phase');

const render = functionSource(journal, 'renderDestructiveRecovery');
for (const field of ['sourcePath', 'targetPath', 'verifiedPath', 'sourceResourceId', 'verifiedResourceId', 'manualResolutionSourcePhase']) {
  ok(render.includes(field), 'UI renders review evidence: ' + field);
}
ok(render.includes('manualDestructiveReceiptRecoveryGuidance(receipt)'), 'UI renders phase-specific recovery guidance');
ok(render.includes('Списать receipt после ручной проверки'), 'UI action requires prior manual check by wording');

const refresh = functionSource(journal, 'refreshDestructiveRecovery');
ok(refresh.includes("type: 'WEBCLIP_JOURNAL_DESTRUCTIVE_MANUAL_LIST'"), 'UI list uses dedicated worker endpoint');
ok(refresh.includes('limit: 50'), 'UI requests bounded manual list');

const uiDismiss = functionSource(journal, 'dismissManualDestructiveReceipt');
ok(uiDismiss.includes('requestDangerousConfirmation'), 'dismiss requires existing 9-digit dangerous confirmation');
ok(uiDismiss.includes('manualDestructiveReceiptRecoveryGuidance(receipt)'), 'dismiss confirmation repeats phase-specific guidance');
ok(uiDismiss.includes('receipt?.updatedAt'), 'UI carries exact receipt version from list');
ok(uiDismiss.includes("type: 'WEBCLIP_JOURNAL_DESTRUCTIVE_MANUAL_DISMISS'"), 'UI uses dedicated dismiss endpoint');
ok(uiDismiss.includes('id,'), 'dismiss request carries exact receipt id');
ok(uiDismiss.includes('updatedAt'), 'dismiss request carries exact updatedAt authority');
ok(uiDismiss.includes('Если есть сомнения'), 'confirmation defaults user toward retaining uncertain receipt');
ok(uiDismiss.includes('не будет обращаться к Яндекс Диску'), 'confirmation states no provider action');
ok(uiDismiss.includes('не изменял Яндекс Диск и Журнал'), 'post-result status states no provider/Journal mutation');

ok(css.includes('.destructive-recovery-panel'), 'manual backlog has dedicated visible styling');
ok(css.includes('.destructive-recovery-card-guidance'), 'phase-specific manual guidance has dedicated visible styling');
ok(css.includes('.destructive-recovery-dismiss'), 'dismiss action has distinct styling');

ok(registry.includes('| P0-072 | ACTIVE |'), 'P0-072 remains ACTIVE');
ok(registry.includes('| P0-076 | DONE |'), 'closed P0-076 remains DONE');
ok(registry.includes('| P1-090 | ACTIVE |'), 'P1-090 exact-object owner remains ACTIVE');
ok(registry.includes('| P1-198 | ACTIVE |'), 'P1-198 physical operation identity remains ACTIVE');
ok(/\*\*NOT READY\.\*\*/.test(readiness), 'release remains NOT READY');

console.log(
  'P0-072 destructive manual-resolution operator path: PASS; checks=' + checks +
  '; list_bounded=true; exact_updated_at=true; extension_owner=true; dangerous_confirm=true;' +
  ' yandex_effect=false; journal_effect=false; operation_log=true; p1_090_separate=true; release_closed=false'
);
