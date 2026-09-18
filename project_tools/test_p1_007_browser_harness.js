const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const unpacked = fs.readFileSync(path.join(__dirname, 'browser_p1_007_unpacked_integration.js'), 'utf8');
const managed = fs.readFileSync(path.join(__dirname, 'browser_p1_007_managed_integration.py'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));

assert.strictEqual(manifest.manifest_version, 3, 'P1-007 must keep Manifest V3');
assert.strictEqual(manifest.version, '0.9.8', 'P1-007 must not bump manifest before release QA');

// Normal Chrome/CfT path: actual unpacked MV3 install via current CDP API.
assert(unpacked.includes("'--remote-debugging-pipe'"), 'unpacked browser runner must use CDP pipe');
assert(unpacked.includes("'--enable-unsafe-extension-debugging'"), 'unpacked browser runner must enable the official extension debugging path');
assert(unpacked.includes("cdp.send('Extensions.loadUnpacked'"), 'unpacked runner must load the real extension via Extensions.loadUnpacked');
assert(unpacked.includes("cdp.send('Browser.setDownloadBehavior'"), 'unpacked runner must make browser downloads deterministic');
assert(!unpacked.includes('extensionIdForPath'), 'runner must not guess unpacked extension ids');
assert(!unpacked.includes('--remote-debugging-port'), 'runner must not depend on an externally exposed DevTools TCP port');
assert(unpacked.includes("type: 'WEBCLIP_START_SELECTION'"), 'selection scenario missing from unpacked runner');
assert(unpacked.includes('ensureTopContentScript'), 'selection scenario must use the production guarded injection path');
assert(unpacked.includes("command: 'download'"), 'PDF scenario missing from unpacked runner');
assert(unpacked.includes('WEBCLIP_JOURNAL_LIST'), 'Journal scenario missing from unpacked runner');
assert(unpacked.includes('WEBCLIP_YANDEX_TEST'), 'Yandex mock scenario missing from unpacked runner');
assert(unpacked.includes("localHasToken: Boolean(local?.yandexAuth?.accessToken)"), 'Yandex session-only token assertion missing');

// Policy-safe managed-browser path: real production scripts in Chromium with mocked external boundaries.
assert(managed.includes("content=(ROOT/'content.js').read_text()"), 'managed runner must execute production content.js');
assert(managed.includes("journal_js=(ROOT/'journal.js').read_text()"), 'managed runner must execute production journal.js');
assert(managed.includes("sw=(ROOT/'service-worker.js').read_text()"), 'managed runner must execute production service-worker.js');
assert(managed.includes("page.pdf("), 'managed runner must use the real Chromium PDF renderer');
assert(managed.includes("pdftotext"), 'managed runner must inspect generated PDF text');
assert(managed.includes("P1-007 NOISE MUST NOT ENTER SELECTED PDF") && managed.includes("not in text"), 'selected-only PDF assertion missing');
assert(managed.includes("WEBCLIP_YANDEX_SET_MANUAL_TOKEN") && managed.includes("WEBCLIP_YANDEX_LIST_FOLDERS"), 'managed Yandex integration scenario missing');
assert(managed.includes("new Worker(url)"), 'service-worker browser Worker integration missing');
assert(managed.includes("stores['session']['yandexAuth']['accessToken']"), 'session-only token assertion missing in managed runner');

console.log('PASS P1-007 browser integration harness contract');
