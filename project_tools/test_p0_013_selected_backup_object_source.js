'use strict';

const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const journal = fs.readFileSync(path.join(root, 'journal.js'), 'utf8');

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

const list = functionBody(worker, 'listJournalBackupsOnYandex');
const fetchBackup = functionBody(worker, 'fetchJournalBackupFromYandex');
const importSelected = functionBody(journal, 'importSelectedYandexBackup');
const normalizeReceipt = functionBody(worker, 'normalizeJournalImportPreviewReceipt');

check(/selectedYandexBackup(?:Object)?Receipt/.test(journal), 'picker must retain a selected backup object receipt, not only a path');
check(!/let\s+selectedYandexBackupPath\s*=/.test(journal) || /selectedYandexBackup(?:Object)?Receipt/.test(journal), 'path-only selectedYandexBackupPath authority remains');
check(/selectionReceipt|selectedBackupObjectReceipt|remoteObjectReceipt/i.test(importSelected), 'Proceed must send immutable selected-object receipt');
check(!/type:\s*['"]WEBCLIP_JOURNAL_YANDEX_FETCH_BACKUP['"][\s\S]{0,300}\bpath\s*,/.test(importSelected) || /selectionReceipt|selectedBackupObjectReceipt|remoteObjectReceipt/i.test(importSelected), 'FETCH_BACKUP request must not be authorized by path alone');

check(/resource_id|objectGeneration|version|revision/i.test(list), 'LIST must request/return provider object/version evidence used by selection receipt');
check(/accountUid|rootPath|contextGeneration|yandex.*generation/i.test(list + journal), 'selection receipt must bind P0-074 account/root/context generation');

check(/selectionReceipt|selectedBackupObjectReceipt|remoteObjectReceipt/i.test(fetchBackup), 'worker fetch must accept/validate selected-object receipt');
check(/\/resources['"]|\/resources\b/.test(fetchBackup), 'worker fetch must fresh-read resource metadata before requesting download link');
const metadataAt = fetchBackup.search(/yandexApi\(\s*['"]\/resources['"]/);
const downloadAt = fetchBackup.search(/yandexApi\(\s*['"]\/resources\/download['"]/);
check(metadataAt >= 0, 'fresh exact metadata GET is missing from fetch flow');
check(downloadAt >= 0, 'download-link request missing from fetch flow');
check(metadataAt >= 0 && downloadAt >= 0 && metadataAt < downloadAt, 'selected-object verification must happen before /resources/download');
check(/selection-stale|object.*mismatch|generation.*mismatch|receipt.*mismatch/i.test(fetchBackup), 'fetch must fail closed on stale/mismatched selected object');
check(/accountUid|rootPath|contextGeneration|yandex.*generation/i.test(fetchBackup), 'fetch must enforce immutable P0-074 context from selection receipt');

check(/contentSha256/.test(normalizeReceipt), 'existing exact staged content SHA positive control must remain');
check(/stagingGeneration/.test(normalizeReceipt), 'existing staging generation positive control must remain');
check(/remoteSelection|selectionReceipt|selectedObject|remoteObject/i.test(normalizeReceipt), 'staging preview receipt must retain verified remote-selection provenance');

check(!/selectionReceipt[\s\S]{0,500}(accessToken|authorization|signedUrl|downloadHref)/i.test(worker), 'durable selection provenance must not contain token or signed transport capability');

if (failures.length) {
  console.error('P0-013 selected backup object source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}
console.log('P0-013 selected backup object source gate: PASS');
