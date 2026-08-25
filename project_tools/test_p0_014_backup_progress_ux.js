#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const journalJs = read('journal.js');
const optionsJs = read('options.js');
const journalHtml = read('journal.html');
const optionsHtml = read('options.html');
const journalCss = read('journal.css');
const optionsCss = read('options.css');
const worker = read('service-worker.js');
const priorities = read('project_docs/PRIORITIES_P0_P1_P2.md');

const stages = [
  'read-journal',
  'serialize',
  'yandex-access',
  'month-folder',
  'upload-url',
  'upload',
  'verify'
];

for (const [label, js, html, css] of [
  ['journal', journalJs, journalHtml, journalCss],
  ['options', optionsJs, optionsHtml, optionsCss]
]) {
  assert(/backupProgressDialog[^>]+aria-modal="true"[^>]+tabindex="-1"/.test(html), `${label}: backup dialog must be modal and programmatically focusable`);
  assert(/Не закрывайте эту вкладку до завершения операции/.test(html), `${label}: missing close-protection warning`);
  assert(/window\.addEventListener\('beforeunload',[\s\S]*?backupProgressActive[\s\S]*?event\.preventDefault\(\)[\s\S]*?event\.returnValue\s*=\s*''/.test(js), `${label}: missing beforeunload protection while backup is active`);
  assert(/function closeBackupProgress\(\)\s*\{\s*if \(backupProgressActive\) return;/.test(js), `${label}: progress dialog can be closed while backup is active`);
  assert(/backupProgressClose\.disabled\s*=\s*true;[\s\S]*?backupProgressClose\.classList\.add\('hidden'\)/.test(js), `${label}: close button must be disabled and hidden while backup is running`);
  assert(/setBackupProgressModalVisible\(true\)/.test(js), `${label}: blocking modal activation helper is not used`);
  assert(/setAttribute\('inert', ''\)/.test(js), `${label}: underlying page must become inert`);
  assert(/setAttribute\('aria-hidden', 'true'\)/.test(js), `${label}: underlying page must be hidden from accessibility tree while modal is active`);
  assert(/backupProgressDialog\.focus\(\{ preventScroll: true \}\)/.test(js), `${label}: focus must move into progress dialog`);
  assert(/removeAttribute\('inert'\)/.test(js), `${label}: inert state must be released after closing modal`);
  assert(/returnFocus\?\.isConnected/.test(js), `${label}: previous focus must be restored after closing modal`);
  assert(/body\.backup-progress-open\s*\{\s*overflow:\s*hidden;\s*\}/.test(css), `${label}: background scrolling must be blocked while modal is visible`);
  for (const stage of stages) {
    assert(js.includes(`['${stage}',`), `${label}: missing visible progress stage ${stage}`);
  }
}

for (const stage of stages) {
  const pattern = new RegExp(`emitJournalBackupProgress\\(operationId, '${stage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`);
  assert(pattern.test(worker), `service worker: missing real progress event for stage ${stage}`);
}

assert(/type:\s*'WEBCLIP_JOURNAL_YANDEX_EXPORT'[\s\S]*?operationId/.test(optionsJs), 'options: manual backup must use an operationId-bound backup request');
assert(/async function exportJournalToYandex\(\)[\s\S]*?showBackupProgress\(operationId\)[\s\S]*?WEBCLIP_JOURNAL_YANDEX_EXPORT/.test(journalJs), 'journal: manual backup must show modal before starting Yandex export');
assert(/\| P0-014 \| P0 \| REGRESSION \|/.test(priorities), 'P0-014 must be marked REGRESSION after local closure checks');

console.log('PASS P0-014 manual backup blocking progress UX regression');
