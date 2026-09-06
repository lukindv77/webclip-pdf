'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const popup = fs.readFileSync(path.join(root, 'popup.js'), 'utf8');

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

const action = functionBody(worker, 'updateActionForTab');
const refresh = functionBody(worker, 'refreshActionForAllTabs');
const enableFrames = functionBody(worker, 'enableFrameAgentsForTab');
const senderGuard = functionBody(worker, 'assertRuntimeMessageSender');
const loadBackup = functionBody(popup, 'loadBackupStatus');
const activeTab = functionBody(popup, 'getActiveSourceTab');

check(/incognito|privacy|private/i.test(action), 'Chrome Action path must classify Incognito/private context before Journal summary access');
check(/getChromeTabBounded|classify.*(?:tab|privacy)|tabPrivacy/i.test(action), 'Chrome Action path needs authoritative bounded tab/privacy classification');
check(/getJournalSummaryForUrl/.test(action), 'positive control: Action still has normal Journal summary behavior');
check(/neutral|incognito|private|privacy/i.test(action), 'private/unknown Action must have an explicit neutral branch');

check(!/updateActionForTab\(tab\.id,\s*tab\.url\s*\|\|\s*['"]['"]\)/.test(refresh) || /incognito|privacy|tabContext/i.test(action), 'global Action refresh must not reduce a full tab to URL-only privacy authority');
check(!/updateActionForTab\(tabId,\s*changeInfo\.url\s*\|\|\s*tab\?\.url\s*\|\|\s*['"]['"]\)/.test(worker) || /incognito|privacy|tabContext/i.test(action), 'tabs.onUpdated URL-only handoff must not bypass privacy classification');

const topBeforeFunctions = popup.slice(0, popup.indexOf('async function loadBackupStatus'));
check(!/\bloadBackupStatus\(\);/.test(topBeforeFunctions), 'popup must not read persistent backup status before active-tab privacy classification');
check(/incognito|privacy|private/i.test(popup), 'popup needs explicit private/Incognito contextual handling');
check(/WEBCLIP_JOURNAL_BACKUP_STATUS/.test(loadBackup), 'positive control: popup normal-context backup status path remains present');
check(/getActiveSourceTab|classify.*privacy|incognito/i.test(loadBackup + activeTab + popup.slice(0, 5000)), 'popup backup-status admission must be source-context aware');

const permissionRequestAt = popup.indexOf('chrome.permissions.request');
check(permissionRequestAt >= 0, 'positive control: explicit optional permission request remains discoverable');
const permissionWindow = permissionRequestAt >= 0 ? popup.slice(Math.max(0, permissionRequestAt - 5000), permissionRequestAt + 1200) : '';
check(/incognito|privacy|private/i.test(permissionWindow), 'optional permission flow must reject/recheck Incognito before chrome.permissions.request');
check(/getActiveSourceTab|chrome\.tabs\.(?:get|query)|fresh|generation/i.test(permissionWindow), 'permission commit admission must be tied to a fresh/current tab or generation check');

check(/incognito|privacy|private/i.test(enableFrames), 'worker frame-agent enabling must independently reject Incognito/unknown target');
check(/getChromeTabBounded|chrome\.tabs\.get|classify.*privacy/i.test(enableFrames), 'worker frame-agent enabling must fresh-read/classify target before executeScript');
check(/executeScriptSingletonBounded/.test(enableFrames), 'positive control: frame-agent worker path remains the guarded execution owner');

check(/sender\?\.tab\?\.incognito/.test(senderGuard), 'existing content-sender Incognito persistence fence must remain present');
check(senderGuard.includes('WEBCLIP_INVALIDATE_PDF_CACHE') && senderGuard.includes('WEBCLIP_OPEN_OPTIONS'), 'existing narrow Incognito content exceptions must remain explicit');
check(/sourceTab\?\.incognito/.test(worker), 'Journal source-tab Incognito fence must remain present');
check(/placementTab\?\.incognito/.test(worker), 'Journal placement-tab Incognito fence must remain present');

if (failures.length) {
  console.error('P0-045 incognito context isolation source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('P0-045 incognito context isolation source gate: PASS');
