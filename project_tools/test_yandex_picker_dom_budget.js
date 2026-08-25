const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const optionsSource = fs.readFileSync(path.join(root, 'options.js'), 'utf8');
const journalSource = fs.readFileSync(path.join(root, 'journal.js'), 'utf8');

assert(optionsSource.includes('const batchSize = 250;'), 'folder picker must render a bounded DOM batch');
assert(optionsSource.includes("className = 'folder-item folder-load-more'"), 'folder picker must expose incremental rendering');
assert(journalSource.includes('const batchSize = 250;'), 'backup picker must render a bounded DOM batch');
assert(journalSource.includes('if (selectedLabel && selectedLabel !== label)'), 'backup selection must not rescan all rendered rows');
assert(!journalSource.includes("backupPickerList.querySelectorAll('.backup-file-option')"), 'backup selection must not do O(N) DOM query per click');

function element(tag = 'div') {
  return {
    tag, children: [], className: '', textContent: '', type: '', name: '', value: '', disabled: false,
    classList: { add() {}, remove() {} },
    append(...nodes) { this.children.push(...nodes); },
    appendChild(node) { this.children.push(node); },
    addEventListener() {}, remove() {}
  };
}

const start = journalSource.indexOf('function renderYandexBackupPicker');
const end = journalSource.indexOf('async function importSelectedYandexBackup', start);
if (start < 0 || end < 0) throw new Error('renderYandexBackupPicker not found');
const code = journalSource.slice(start, end);
const list = element('list');
list.replaceChildren = function() { this.children = []; };
const context = vm.createContext({
  Math, String,
  currentBackupMonth: new Date(2026, 7, 1),
  selectedYandexBackupPath: '',
  backupPickerProceed: { disabled: true },
  backupPickerList: list,
  backupPickerStatus: { textContent: '' },
  monthKey() { return '08-2026'; },
  formatDate() { return '24.08.2026'; },
  formatBytes() { return '1 КБ'; },
  document: { createElement: element }
});
vm.runInContext(`${code}\nthis.renderForTest = renderYandexBackupPicker;`, context);
context.renderForTest(Array.from({ length: 600 }, (_, i) => ({ name: `b${i}.json`, path: `/b${i}.json`, monthFolder: '08-2026', size: 1024 })));
assert.strictEqual(list.children.length, 251, 'initial backup picker DOM must contain at most 250 rows plus one load-more control');
assert.strictEqual(list.children[250].className, 'backup-load-more');

console.log('Yandex picker DOM budget tests OK');
