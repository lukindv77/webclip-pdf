const fs = require('fs');
const path = require('path');
const assert = require('assert');
const source = fs.readFileSync(path.resolve(__dirname, '..', 'options.js'), 'utf8');

assert(source.includes("init().catch((error) => showMessage(error?.message || String(error), 'error'));"), 'options init errors must be surfaced');
assert(source.includes("el('openAuthHelp').addEventListener('click', () => runBusy(el('openAuthHelp')"), 'auth-help event must be error-wrapped');
assert(source.includes("el('copyRedirect').addEventListener('click', () => runBusy(el('copyRedirect')"), 'clipboard event must be error-wrapped');
assert(source.includes('if (folderBrowseLoadingGeneration) return;\n    browser.classList.remove'), 'Browse must not launch a parallel folder request');
console.log('Options async error-reporting/single-flight tests OK');
