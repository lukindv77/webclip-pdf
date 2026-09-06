'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

function functionBody(source, name) {
  const markers = [`async function ${name}(`, `function ${name}(`];
  let start = -1;
  for (const marker of markers) {
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

const imported = functionBody(worker, 'normalizeImportedJournalEntry');
const locate = functionBody(worker, 'findYandexFileForJournalEntry');
const trash = functionBody(worker, 'moveJournalYandexFileToTrash');
const markRead = functionBody(worker, 'moveReadLaterEntryToRead');

check(/bindingProvenance|bindingReceipt|remoteBinding|yandexBinding/i.test(worker), 'runtime needs explicit versioned Yandex remote-binding provenance/receipt semantics');
check(/live-verified/.test(worker) && /rebound-verified/.test(worker), 'trusted local binding provenance classes must be explicit');
check(/imported-unverified/.test(imported), 'import must force Yandex remote binding to imported-unverified');
check(/legacy-unverified/.test(worker), 'legacy rows without a trusted receipt must have an explicit unverified interpretation');
check(!/bindingProvenance\s*:\s*(?:boundedImportString\()?raw\./.test(imported), 'import must not accept raw serialized trust/provenance as destructive authority');

check(!/readMovePendingAt\s*:\s*Number\(raw\.readMovePendingAt/.test(imported), 'imported live-looking readMove pending timestamp must not become active recovery authority');
check(!/readMoveSourcePath\s*:\s*normalizeDiskPath\(boundedImportString\(raw\.readMoveSourcePath/.test(imported), 'imported readMove source path must not become active move checkpoint');
check(!/readMoveTargetPath\s*:\s*normalizeDiskPath\(boundedImportString\(raw\.readMoveTargetPath/.test(imported), 'imported readMove target path must not become active move checkpoint');
check(!/readMoveOperationId\s*:\s*boundedImportString\(raw\.readMoveOperationId/.test(imported), 'imported readMove operation id must not become active recovery ownership');

check(/bindingProvenance|bindingReceipt|remoteBinding|assert.*binding|prove.*object/i.test(trash), 'Trash move must check trusted remote binding before destructive locate/move');
check(/bindingProvenance|bindingReceipt|remoteBinding|assert.*binding|prove.*object/i.test(markRead), 'ReadLater move must check trusted remote binding before destructive locate/move');

check(/expectedAccountUid/.test(locate) && /YANDEX_ACCOUNT_MISMATCH/.test(locate), 'existing account mismatch positive control must remain');
check(/expectedRootPath/.test(locate) && /YANDEX_ROOT_PATH_MISMATCH/.test(locate), 'existing root mismatch positive control must remain');
check(/expectedResourceId/.test(locate), 'existing resource identity checks must remain');

const pathOnlyPattern = /if\s*\(expectedPublicUrl\)[^;]*;\s*return\s+true\s*;/s;
check(!pathOnlyPattern.test(locate) || /mode|destructive|readOnly|hint/i.test(locate), 'destructive locate must not inherit unconditional path-only match when no stable identity exists');
check(/exact|prove|identityReceipt|resource.*match|binding/i.test(locate + trash + markRead), 'destructive remote admission needs an explicit exact-object proof boundary');

check(/live-verified|bindingReceipt|remoteBinding/i.test(worker), 'live/rebind path must be able to persist trusted local binding only after proof');

if (failures.length) {
  console.error('P0-022 Yandex binding provenance source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('P0-022 Yandex binding provenance source gate: PASS');
