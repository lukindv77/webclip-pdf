'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { sourceContract } = require('./research_p0_072_real_chrome_reset_restart.js');

const ROOT = path.resolve(__dirname, '..');
const driver = fs.readFileSync(path.join(ROOT, 'project_tools/browser_p1_007_unpacked_integration.js'), 'utf8');
const harness = fs.readFileSync(path.join(ROOT, 'project_tools/research_p0_072_real_chrome_reset_restart.js'), 'utf8');
const worker = fs.readFileSync(path.join(ROOT, 'service-worker.js'), 'utf8');
const registry = fs.readFileSync(path.join(ROOT, 'project_docs/RESEARCH_REGISTRY.md'), 'utf8');
const readiness = fs.readFileSync(path.join(ROOT, 'project_docs/RELEASE_READINESS.md'), 'utf8');

let checks = 0;
function ok(value, message) { assert.ok(value, message); checks += 1; }
function eq(actual, expected, message) { assert.strictEqual(actual, expected, message); checks += 1; }

ok(driver.includes('async function launchChromium(extensionPath, { profilePath = \'\', preserveProfile = false } = {})'), 'shared Chrome driver accepts explicit persistent profile');
ok(driver.includes("if (signal === 'SIGKILL')"), 'shared Chrome driver can exercise browser-process crash boundary');
ok(driver.includes('if (!keepProfile) await fsp.rm(profile'), 'normal driver cleanup remains bounded');
ok(driver.includes('if (!preserveProfile) await fsp.rm(profile'), 'launch failure respects profile preservation request');
ok(driver.includes('module.exports = Object.freeze({'), 'shared Chrome driver exports reusable primitives');
for (const name of ['sleep', 'waitFor', 'startFixtureServer', 'prepareTestExtension', 'launchChromium', 'js']) {
  ok(driver.includes(name), 'shared driver exposes ' + name);
}
ok(driver.includes('mockYandex = true'), 'existing P1-007 default keeps mocked Yandex behavior');
ok(driver.includes('if (mockYandex)'), 'exact-worker harness can disable only Yandex source rewrite');
ok(driver.includes("if (require.main === module)"), 'existing P1-007 script still runs standalone');
ok(driver.includes("P1-007 real Chromium browser integration OK"), 'existing P1-007 success marker retained');

ok(harness.includes("prepareTestExtension(fixture.origin, fixture.apiBase, { mockYandex: false })"), 'P0-072 harness keeps service-worker bytes exact');
ok(harness.includes("sha256Bytes(copiedWorker)"), 'P0-072 harness hashes copied worker');
ok(harness.includes("sha256Bytes(PRODUCTION.worker)"), 'P0-072 harness binds copied worker to repository worker');
ok(harness.includes("chrome.downloads.onCreated.addListener(listener)"), 'real Chrome creation event is the pause boundary');
ok(harness.includes("chrome.downloads.pause(item.id)"), 'real DownloadItem is paused before late settlement');
ok(harness.includes("downloadAdmissionPhase === 'admitted-unknown'"), 'harness waits for durable admission receipt');
ok(harness.includes("item?.kind === 'download'"), 'harness requires receipt to bind exact numeric DownloadItem');
ok(harness.includes("type: 'WEBCLIP_JOURNAL_CLEAR'"), 'harness performs production Journal clear');
ok(harness.includes("item?.supersededByJournalReset === true"), 'harness proves reset preserves admitted receipt');
ok(harness.includes("chrome.downloads.resume"), 'same real DownloadItem is resumed for late terminal settlement');
ok(harness.includes("terminalA.state, 'complete'"), 'case A requires real late physical completion');
ok(harness.includes("fs.existsSync(terminalA.filename)"), 'case A requires physical file');
ok(harness.includes("'%PDF-'"), 'case A validates physical PDF signature');
ok(harness.includes("signal: 'SIGKILL'"), 'case B kills the entire Chrome process');
ok(harness.includes("profilePath: profile"), 'case B restarts same Chrome profile');
ok(harness.includes("same profile/path must retain exact unpacked extension identity"), 'case B binds same extension identity after restart');
ok(harness.includes("durable superseded receipt after SIGKILL restart"), 'case B requires receipt survival after process crash');
ok(harness.includes("chrome.alarms.create('webclip-operation-log-cleanup'"), 'case B triggers existing production maintenance boundary');
ok(harness.includes("row.kind === 'unknown' && row.recoveryState === 'manual-resolution'"), 'unsettled restart degrades to durable manual-resolution rather than disappearing');
ok(harness.includes("old-generation Journal entry must not be resurrected"), 'restart negative control forbids old-generation resurrection');

const yandexTokens = [
  "yandexExercised: false",
  "p1090Closed: false",
  "p0072Closed: false"
];
for (const token of yandexTokens) ok(harness.includes(token), 'evidence boundary is explicit: ' + token);
ok(!harness.includes("WEBCLIP_YANDEX_SET_MANUAL_TOKEN"), 'P0-072 local Chrome harness never supplies Yandex credentials');
ok(!harness.includes("YANDEX_API_BASE"), 'P0-072 local Chrome harness never rewrites Yandex API');
ok(!harness.includes("yandexApi("), 'P0-072 local Chrome harness never invokes provider helpers directly');

const liveSourceContract = sourceContract();
eq(liveSourceContract.admittedBeforeChromeStart, true, 'live source contract proves durable admission before Chrome start');
eq(liveSourceContract.clearUsesResetFence, true, 'live source contract proves reset fence');
eq(liveSourceContract.supersededCompletionNoResurrection, true, 'live source contract proves superseded completion cannot resurrect Journal');
eq(liveSourceContract.restartRecoveryReadsChrome, true, 'live source contract proves restart recovery reads exact Chrome DownloadItem and finalizes through maintenance wrapper');
eq(liveSourceContract.startupSchedulesDurableMaintenance, true, 'live source contract proves startup schedules durable maintenance');

const startIndex = worker.indexOf('await markPendingLocalDownloadAdmitted(key)');
const chromeIndex = worker.indexOf('chrome.downloads.download({', startIndex);
ok(startIndex >= 0 && chromeIndex > startIndex, 'production source durably admits before real Chrome side effect');
ok(worker.includes('reconcilePendingLocalDownloadStoreForJournalReset(pendingDownloadStore'), 'production clear uses P0-072 reset fence');
ok(!worker.slice(worker.indexOf('async function clearJournalEntries'), worker.indexOf('async function journalRevisionSnapshot')).includes('pendingDownloadStore.clear()'), 'production clear does not blind-clear pending downloads');
ok(worker.includes("chrome.runtime.onStartup.addListener(() =>"), 'production has real browser-start recovery scheduling');
ok(worker.includes("chrome.alarms.create(OPERATION_LOG_CLEANUP_ALARM, { delayInMinutes: 1, periodInMinutes: 60 })"), 'startup schedules durable maintenance alarm');
ok(worker.includes("chrome.downloads.search({ id })"), 'production maintenance reads exact Chrome DownloadItem by id');
ok(worker.includes("if (journalAppend?.cancelled)"), 'terminal completion understands reset-superseded Journal authority');

ok(registry.includes('| P0-072 | ACTIVE |'), 'P0-072 remains ACTIVE before real harness execution is recorded');
ok(registry.includes('| P1-090 | ACTIVE |'), 'P1-090 remains ACTIVE and separate');
ok(registry.includes('| P0-076 | DONE |'), 'P0-076 remains DONE');
ok(/\*\*NOT READY\.\*\*/.test(readiness), 'release remains NOT READY');

eq((harness.match(/realBrowserProcessSigkillRestart: true/g) || []).length, 1, 'harness has one explicit browser crash evidence claim field');
eq((harness.match(/realChromeAutomaticDownload: true/g) || []).length, 1, 'harness has one explicit real Chrome download evidence claim field');

console.log(
  'P0-072 real Chrome reset/restart harness contract: PASS; checks=' + checks +
  '; exact_worker=true; real_download=true; pause_boundary=true; clear_reset=true;' +
  ' sigkill_restart=true; same_profile=true; maintenance=true; no_resurrection=true;' +
  ' yandex=false; p1_090_separate=true; physical_execution_required=true; release_closed=false'
);
