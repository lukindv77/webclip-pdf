const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const journal = fs.readFileSync(path.join(root, 'journal.js'), 'utf8');

const branchStart = sw.indexOf("if (command === 'journal-export-file')");
const branchEnd = sw.indexOf("if (command === 'journal-export-yandex')", branchStart);
assert(branchStart >= 0 && branchEnd > branchStart, 'context menu export branch not found');
const branch = sw.slice(branchStart, branchEnd);
assert(branch.includes("autoExportFile: '1'"), 'context menu file export must hand ownership to journal page');
assert(!branch.includes('downloadFullJournalExport('), 'contextMenus event must not directly own the long export');
assert(journal.includes("const autoExportFileRequested = params.get('autoExportFile') === '1'"));
assert(journal.includes('if (autoExportFileRequested) await exportJournalToFile();'));
assert(journal.includes("cleanUrl.searchParams.delete('autoExportFile')"), 'one-shot auto export flag must be removed after load');

console.log('Context menu export owner tests OK');
