'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const worker = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const pageFiles = ['options.js', 'journal.js', 'yandex-auth-help.js', 'popup.js']
  .map((name) => {
    const file = path.join(root, name);
    return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
  })
  .join('\n');
const all = `${worker}\n${pageFiles}`;
const failures = [];

function requireSource(condition, message) {
  if (!condition) failures.push(message);
}

function functionBody(name, maxChars = 30000) {
  const needles = [`async function ${name}`, `function ${name}`];
  let start = -1;
  for (const needle of needles) {
    const candidate = worker.indexOf(needle);
    if (candidate >= 0 && (start < 0 || candidate < start)) start = candidate;
  }
  if (start < 0) return '';
  const candidates = [
    worker.indexOf('\nasync function ', start + 20),
    worker.indexOf('\nfunction ', start + 20),
    worker.indexOf('\nchrome.', start + 20)
  ].filter((x) => x > start);
  const end = candidates.length ? Math.min(...candidates) : Math.min(worker.length, start + maxChars);
  return worker.slice(start, end);
}

const refreshBody = functionBody('reloadOpenExtensionPagesAfterVersionChange');

// Positive controls that should remain visible after the repair.
requireSource(/chrome\.runtime\.getManifest\(\)\.version/.test(worker), 'manifest version detection positive control missing');
requireSource(/chrome\.tabs\.query\(\s*\{\s*\}\s*\)/.test(worker), 'extension-tab enumeration positive control missing');
requireSource(/chrome\.runtime\.getURL\(\s*['"]['"]\s*\)/.test(worker), 'extension-root URL positive control missing');
requireSource(/chrome\.tabs\.reload\(/.test(worker), 'tabs.reload repair positive control missing');
requireSource(/reloadOpenExtensionPagesAfterVersionChange\(\)/.test(worker), 'worker-start refresh reconciliation trigger missing');
requireSource(/runtimeSenderKind\(sender\)|sender\?\.id\s*!==\s*chrome\.runtime\.id|sender\.id\s*===\s*chrome\.runtime\.id/.test(worker), 'existing internal sender classification/ACL positive control missing');

// Target 1: durable state distinguishes pending work from completed version truth.
requireSource(
  /ExtensionPageRefreshState|EXTENSION_PAGE_REFRESH_STATE|webclipExtensionPageRefreshState|pageRefreshState/i.test(worker),
  'no visible durable extension-page refresh state exists beyond the legacy scalar version marker'
);
requireSource(/completedVersion|completedBuildVersion|refreshCompletedVersion/i.test(worker),
  'refresh state has no explicit completed-version truth');
requireSource(/pending[\s\S]{0,800}(?:targetVersion|version)|targetVersion[\s\S]{0,800}pending/i.test(worker),
  'refresh state has no explicit pending target version');
requireSource(/refreshGeneration|pageRefreshGeneration|generation[\s\S]{0,800}targetVersion/i.test(worker),
  'refresh state has no durable repair generation');

// Target 2: the legacy version scalar must not be advanced before enumeration/repair.
if (refreshBody) {
  const queryPos = refreshBody.search(/chrome\.tabs\.query\(/);
  const legacySet = refreshBody.search(/chrome\.storage\.local\.set\(\s*\{\s*\[WEBCLIP_RUNTIME_VERSION_KEY\]/);
  requireSource(!(legacySet >= 0 && queryPos >= 0 && legacySet < queryPos),
    'legacy completed-looking version marker is still written before tabs.query');
}

// Target 3: pending repair is resumable and completion is a distinct operation.
requireSource(/ensure.*(?:Extension)?Page.*Refresh|resume.*Page.*Refresh|reconcile.*Page.*Refresh/i.test(worker),
  'no visible pending extension-page refresh admission/resume helper');
requireSource(/complete.*(?:Extension)?Page.*Refresh|mark.*Page.*Refresh.*Complete|completedVersion/i.test(worker),
  'no explicit extension-page refresh completion transition');
requireSource(/attemptCount|nextAttemptAt|lastError|retry/i.test(worker),
  'no visible bounded retry/diagnostic state for page refresh recovery');

// Target 4: reload settlement is not the final proof; page-side register/ack protocol must exist.
requireSource(/WEBCLIP_(?:EXTENSION_)?PAGE_(?:REFRESH_)?(?:REGISTER|READY|ACK)|EXTENSION_PAGE_REFRESH_(?:REGISTER|ACK)/.test(all),
  'no extension-page refresh registration/ack message protocol is visible');
requireSource(/documentId/.test(worker),
  'worker does not bind extension-page refresh acknowledgement to browser documentId');
requireSource(/sender\??\.documentId|sender\.documentId/.test(worker),
  'worker does not visibly consume MessageSender.documentId for refresh acknowledgement');
requireSource(/pageNonce|refreshChallenge|challenge/.test(all),
  'page refresh acknowledgement has no visible attempt/page freshness nonce or challenge');
requireSource(/pageKind|extensionPagePath|options|journal/.test(worker),
  'page refresh acknowledgement has no visible page-kind/path validation');

// Target 5: page protocol/build identity and repair generation are both part of ack validation.
requireSource(/protocolVersion|pageProtocol|buildVersion|targetVersion/.test(all),
  'page-side acknowledgement has no visible current build/protocol identity');
requireSource(/refreshGeneration|pageRefreshGeneration|generation/.test(pageFiles),
  'page-side refresh acknowledgement has no visible current repair generation binding');

// Target 6: sender ACL remains narrow; a message field cannot self-declare browser identity.
requireSource(/sender\?\.id\s*!==\s*chrome\.runtime\.id|runtimeSenderKind\(sender\)/.test(worker),
  'extension-page refresh path does not visibly retain exact extension sender checks');
requireSource(!/message\.documentId\s*===\s*(?:target|current)/.test(worker) || /sender\??\.documentId/.test(worker),
  'message-supplied documentId appears authoritative without browser sender.documentId');

// Target 7: completion requires acknowledgement/reconciliation, not merely Promise<void> from tabs.reload.
requireSource(/reload-issued|reloadIssued|awaiting-ack|awaitingAck|acked|acknowledged/i.test(worker),
  'reload request and acknowledged current-page state are not visibly distinct');
requireSource(/fresh.*(?:enumerat|query)|reconcile.*(?:tab|page)|chrome\.tabs\.query[\s\S]{0,10000}(?:acked|acknowledged|completedVersion)/i.test(worker),
  'no visible fresh enumeration/reconciliation before global refresh completion');

// Target 8: query/reload errors cannot silently become completed state.
requireSource(!/try\s*\{\s*tabs\s*=\s*await\s+chrome\.tabs\.query\(\{\}\);\s*\}\s*catch\s*\([^)]*\)\s*\{\s*return;\s*\}/.test(refreshBody) ||
  /pending|lastError|retry|incomplete/.test(refreshBody),
  'tabs.query failure is still silently returned without retaining a pending/incomplete repair obligation');
requireSource(!/try\s*\{\s*await\s+chrome\.tabs\.reload\([^)]*\);\s*\}\s*catch\s*\([^)]*\)\s*\{\s*\}/.test(refreshBody) ||
  /pending|lastError|retry|incomplete/.test(refreshBody),
  'individual tabs.reload failure is still swallowed without durable repair truth');

// Target 9: stale generation/page acknowledgements must be fenced.
requireSource(/generation[\s\S]{0,3000}(?:!==|===)[\s\S]{0,1000}(?:current|pending)|pending[\s\S]{0,3000}generation/.test(worker),
  'no visible current-generation fence for late extension-page acknowledgement');
requireSource(/documentId[\s\S]{0,3000}(?:!==|===)|(?:!==|===)[\s\S]{0,1000}documentId/.test(worker),
  'no visible exact documentId comparison for extension-page acknowledgement');

// Target 10: no hot retry loop should be introduced merely to keep a worker alive.
requireSource(!/setInterval\([^\n]{0,300}(?:refresh|reload).*page/i.test(worker),
  'extension-page version repair appears to use a hot setInterval loop');

// Target 11: page-side code must actually participate; worker-only strings are insufficient.
requireSource(/WEBCLIP_(?:EXTENSION_)?PAGE_(?:REFRESH_)?(?:REGISTER|READY|ACK)|EXTENSION_PAGE_REFRESH_(?:REGISTER|ACK)/.test(pageFiles),
  'relevant extension page scripts do not emit/register a current-page refresh acknowledgement');

if (failures.length) {
  console.error('P1-209 extension page version refresh source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('P1-209 extension page version refresh source gate: PASS');
