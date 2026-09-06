'use strict';

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(root, name), 'utf8');
const content = read('content.js');
const worker = read('service-worker.js');
const popupHtml = read('popup.html');
const injectionGuard = read('content-injection-guard.js');
const activationGuard = read('host-control-activation-guard.js');
const printGuard = read('pdf-print-guard.js');
const journalFilter = read('journal-text-filter.js');

const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

function functionBody(source, name) {
  const patterns = [
    `function ${name}(`,
    `async function ${name}(`
  ];
  let start = -1;
  for (const marker of patterns) {
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

const createUiButtonBody = functionBody(content, 'createUiButton');
const onPageClickBody = functionBody(content, 'onPageClick');
const prepareForPrintBody = functionBody(content, 'prepareForPrint');
const showFileCommentDialogBody = functionBody(content, 'showFileCommentDialog');
const whitelistStart = worker.indexOf('const CONTENT_SCRIPT_MESSAGE_TYPES');
const whitelistEnd = whitelistStart >= 0 ? worker.indexOf(']);', whitelistStart) : -1;
const whitelist = whitelistStart >= 0 && whitelistEnd > whitelistStart
  ? worker.slice(whitelistStart, whitelistEnd + 3)
  : '';

check(!/accessToken/i.test(content), 'OAuth/access token must remain absent from content.js');
check(popupHtml.includes('<script src="content-injection-guard.js"></script>'), 'popup must keep content injection guard bootstrap');
check(injectionGuard.includes("HOST_CONTROL_HELPER_FILE = 'host-control-activation-guard.js'"), 'P0-067 host-control guard must remain required before content.js');
check(activationGuard.includes('blockedPageClicks'), 'P0-067 page-owned programmatic-click guard must remain present');
check(journalFilter.includes("importScripts('pdf-print-guard.js'"), 'worker bootstrap must keep P0-071 pdf-print-guard.js');
check(printGuard.includes("method !== 'Page.printToPDF'"), 'P0-071 actual print-cut wrapper must remain present');
check(worker.includes('function assertRuntimeMessageSender'), 'worker runtime sender validation must remain present');

check(/attachShadow\(\{\s*mode:\s*['"]closed['"]\s*\}\)/.test(content), 'page-embedded WebClip UI must use a closed shadow root (or replace this gate with a stronger non-page surface proof)');
check(!/attachShadow\(\{\s*mode:\s*['"]open['"]\s*\}\)/.test(content), 'open WebClip shadow root remains page-readable');
check(createUiButtonBody.includes('event.isTrusted'), 'page-embedded WebClip buttons must reject untrusted activation');
check(onPageClickBody.includes('event.isTrusted'), 'selection click admission must reject untrusted events');
check(!/createElement\(\s*['"]textarea['"]\s*\)/.test(showFileCommentDialogBody), 'private file comment must not be collected in page-hosted WebClip DOM');

check(!content.includes("createUiButton('Скачать PDF'"), 'local PDF admission must move out of page-hosted privileged controls');
check(!content.includes("createUiButton('Отправить на Яндекс Диск'"), 'Yandex save admission must move out of page-hosted privileged controls');
check(!content.includes("createUiButton('Повторить отправку'"), 'Yandex retry admission must move out of page-hosted privileged controls');
check(!content.includes("createUiButton('Скачать этот PDF'"), 'cached-PDF download admission must move out of page-hosted privileged controls');

check(!/\.setAttribute\(\s*INCLUDE_ATTR\s*,/.test(content), 'include authority must not be published as a page element attribute');
check(!/\.setAttribute\(\s*EXCLUDE_ATTR\s*,/.test(content), 'exclude authority must not be published as a page element attribute');

check(!prepareForPrintBody.includes('document.body.insertBefore(header'), 'private/final print header must not be inserted into the live host body before isolation');
check(/createIsolatedPrint(?:Target|Representation)|materializeIsolatedPrintRepresentation|WebClipPrintRepresentationIsolation/.test(worker + content), 'runtime needs an explicit isolated print-representation primitive');

for (const type of ['WEBCLIP_GENERATE_PDF', 'WEBCLIP_SEND_PDF_TO_YANDEX', 'WEBCLIP_RETRY_PDF_TO_YANDEX', 'WEBCLIP_DOWNLOAD_CACHED_PDF']) {
  if (whitelist.includes(`'${type}'`)) {
    const typeAt = worker.indexOf(`case '${type}'`);
    const nextCase = typeAt >= 0 ? worker.indexOf('\n      case ', typeAt + 8) : -1;
    const block = typeAt >= 0 ? worker.slice(typeAt, nextCase > typeAt ? nextCase : typeAt + 3000) : '';
    check(/consumePrivilegedSaveAuthorization|assertPrivilegedSaveConfirmation|consumeExtensionOwnedConfirmation/.test(block), `${type} content path must consume extension-owned privileged confirmation before side effect`);
  }
}

if (failures.length) {
  console.error('P0-075 host control-plane source gate: RED');
  for (const failure of failures) console.error(` - ${failure}`);
  process.exit(1);
}

console.log('P0-075 host control-plane source gate: PASS');
