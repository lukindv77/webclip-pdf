'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(ROOT, name), 'utf8');
const content = read('content.js');
const worker = read('service-worker.js');
const popup = read('popup.js');
const manifest = JSON.parse(read('manifest.json'));
const failures = [];

function requireSource(condition, message) {
  if (!condition) failures.push(message);
}

function around(text, needle, radius = 9000) {
  const index = text.indexOf(needle);
  if (index < 0) return '';
  return text.slice(Math.max(0, index - radius), Math.min(text.length, index + needle.length + radius));
}

// P0-080: explicit content-side authority axes.
for (const [regex, label] of [
  [/contentRealmNonce/i, 'content realm nonce'],
  [/documentActivityGeneration/i, 'document activity generation'],
  [/applicationGeneration/i, 'application generation'],
  [/navigationTransitionGeneration|applicationTransitionGeneration/i, 'navigation/application transition generation'],
  [/selectionRevision/i, 'selection revision']
]) {
  requireSource(regex.test(content), `missing ${label}`);
}

// BFCache/activity ABA must invalidate old review authority.
requireSource(/pagehide/.test(content), 'content authority has no pagehide invalidation signal');
requireSource(/pageshow/.test(content) && /persisted/.test(content), 'content authority has no persisted pageshow/BFCache return invalidation');

// Existing content realm must answer exact source-authority probes.
requireSource(/WEBCLIP_(?:SOURCE_)?AUTHORITY_PROBE|WEBCLIP_SOURCE_GENERATION_PROBE/.test(content),
  'content script has no exact source-authority probe handler');
requireSource(/validate[A-Za-z0-9_]*(?:Selection|Source|Authority)|assert[A-Za-z0-9_]*(?:Selection|Source|Authority)/i.test(content),
  'content script exposes no current-receipt validation primitive');

// Both initial save paths must issue/carry one reviewed receipt, prepare, then validate it before send.
for (const type of ['WEBCLIP_GENERATE_PDF', 'WEBCLIP_SEND_PDF_TO_YANDEX']) {
  const body = around(content, type, 7000);
  requireSource(Boolean(body), `missing ${type} path`);
  requireSource(/prepareForPrint\s*\(/.test(body), `${type} no longer contains expected asynchronous print preparation positive control`);
  requireSource(/selectionAuthorityReceipt|contentSelectionReceipt|reviewReceipt|sourceAuthorityReceipt/i.test(body),
    `${type} does not carry reviewed selection/source authority`);
  requireSource(/validate[A-Za-z0-9_]*(?:Selection|Source|Authority)|assert[A-Za-z0-9_]*(?:Selection|Source|Authority)/i.test(body),
    `${type} has no source-visible final receipt validation near post-prepare send`);
}

// Popup injection/start continuity: keep InjectionResult.documentId and address the immediate command to it.
const ensureTop = around(popup, 'async function ensureTopContentScript', 6500);
requireSource(/executeScript/.test(ensureTop), 'popup top content injection positive control missing');
requireSource(/documentId/.test(ensureTop), 'popup discards InjectionResult.documentId');
const popupStart = around(popup, 'WEBCLIP_START_SELECTION', 6500);
requireSource(/documentId\s*:/.test(popupStart), 'start-selection message is not exact-document targeted');
const popupLater = around(popup, "command: 'read-later'", 6500);
requireSource(/documentId\s*:/.test(popupLater), 'read-later startup message is not exact-document targeted');

// P1-198: correlation and physical identity must be visibly separate.
requireSource(/physicalOperationId|operationInstanceId|workerOperationId/.test(worker),
  'worker has no explicit worker-issued physical operation identity');
requireSource(/clientOperationId|operationCorrelationId|correlationId/.test(worker),
  'worker does not separate caller correlation from physical identity');
requireSource(/sourceGenerationId|sourceGenerationReceipt|fullDocumentGenerationReceipt/.test(worker),
  'worker has no exact source-generation identity/receipt');
requireSource(/renderAttemptId|renderNavigationFence|sourceNavigationFence/.test(worker),
  'worker has no operation-local render-attempt/source fence identity');

// Trusted browser sender envelope.
const localHandler = around(worker, "WEBCLIP_GENERATE_PDF", 10000);
const remoteHandler = around(worker, "WEBCLIP_SEND_PDF_TO_YANDEX", 10000);
const handlers = `${localHandler}\n${remoteHandler}`;
requireSource(/sender\??\.documentId|sender\.documentId/.test(handlers), 'save admission does not consume MessageSender.documentId');
requireSource(/sender\??\.documentLifecycle|sender\.documentLifecycle/.test(handlers), 'save admission does not consume MessageSender.documentLifecycle');
requireSource(/['"]active['"]/.test(handlers), 'save admission does not require active document lifecycle');
requireSource(/sender\??\.frameId|sender\.frameId/.test(handlers), 'save admission does not consume sender.frameId');
requireSource(/frameId[^\n;]{0,150}(?:===|!==)\s*0|assert[A-Za-z0-9_]*Top[A-Za-z0-9_]*Frame/i.test(handlers),
  'active top-level sender contract is not explicit');
requireSource(!/message\.(?:meta\.)?documentId\s*\|\|\s*sender\.documentId/.test(handlers),
  'caller documentId can override/fallback into browser sender document identity');

// Exact existing-content probes must be documentId-targeted.
requireSource(/tabs\.sendMessage\([\s\S]{0,1800}\{[\s\S]{0,500}documentId\s*:/.test(worker),
  'worker has no exact tabs.sendMessage(...,{documentId}) source probe');
requireSource(/WEBCLIP_(?:SOURCE_)?AUTHORITY_PROBE|WEBCLIP_SOURCE_GENERATION_PROBE/.test(worker),
  'worker does not invoke an exact content authority probe');

// Render-window CDP fence around P0-071 guarded print.
requireSource(/chrome\.debugger\.onEvent\.addListener|debugger\.onEvent\.addListener/.test(worker),
  'worker does not install debugger event monitor for source/render fence');
requireSource(/chrome\.debugger\.onDetach\.addListener|debugger\.onDetach\.addListener/.test(worker),
  'worker does not monitor debugger detach before byte acceptance');
requireSource(/Page\.getFrameTree/.test(worker), 'worker does not capture root CDP frame/loader identity');
for (const eventName of ['Page.frameStartedNavigating', 'Page.frameNavigated', 'Page.navigatedWithinDocument', 'Page.frameDetached']) {
  requireSource(worker.includes(eventName), `render fence does not cover ${eventName}`);
}
requireSource(/rootFrameId|mainFrameId|rootLoaderId|mainLoaderId/.test(worker),
  'render fence has no source-visible root frame/loader identity');

// Probe ordering / byte acceptance provenance must be visible.
requireSource(/probeA|preRenderSourceProbe|probeSourceBeforeRender/i.test(worker), 'no source-visible pre-render Probe A');
requireSource(/probeB|armedSourceProbe|probeSourceAfterFence/i.test(worker), 'no source-visible post-fence Probe B');
requireSource(/probeC|preAcceptSourceProbe|probeSourceBeforeByteAcceptance/i.test(worker), 'no source-visible pre-byte-acceptance Probe C');
requireSource(/pdfGeneration|sealedPdfGeneration|pdfGenerationReceipt/.test(worker), 'accepted bytes do not visibly become an exact PDF generation');
requireSource(/sha256|sha-256/i.test(worker), 'accepted PDF provenance does not visibly carry SHA-256');
requireSource(/byteLength|pdfByteLength|expectedPdfBytes/.test(worker), 'accepted PDF provenance does not visibly carry exact byte length');
requireSource(/sourceGenerationId|sourceGenerationReceipt/.test(worker) && /physicalOperationId|operationInstanceId|workerOperationId/.test(worker),
  'PDF provenance does not visibly compose exact source + physical operation identity');

// Do not add webNavigation solely to obtain this source generation proof.
const permissions = new Set([...(manifest.permissions || []), ...(manifest.optional_permissions || [])]);
requireSource(!permissions.has('webNavigation'), 'webNavigation permission was added; protocol should use existing Chrome 118 primitives unless independently justified');

if (failures.length) {
  console.error('Wave 1 trusted save-admission source contract: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('Wave 1 trusted save-admission source contract: PASS');
