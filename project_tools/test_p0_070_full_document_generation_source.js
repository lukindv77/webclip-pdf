'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const read = (name) => fs.readFileSync(path.join(ROOT, name), 'utf8');

const worker = read('service-worker.js');
const content = read('content.js');
const journalTextFilter = read('journal-text-filter.js');
const printGuard = read('pdf-print-guard.js');
const manifest = JSON.parse(read('manifest.json'));

function requireMatch(text, regex, label) {
  if (!regex.test(text)) {
    throw new Error(`P0-070 source gate RED: ${label}`);
  }
}

function requireAny(text, regexes, label) {
  if (!regexes.some((regex) => regex.test(text))) {
    throw new Error(`P0-070 source gate RED: ${label}`);
  }
}

function around(text, needle, radius = 18000) {
  const index = text.indexOf(needle);
  if (index < 0) return '';
  return text.slice(Math.max(0, index - radius), Math.min(text.length, index + needle.length + radius));
}

// Positive control: P0-071 must remain physically wired while P0-070 is added.
requireMatch(
  journalTextFilter,
  /importScripts\([^)]*['"]pdf-print-guard\.js['"]/,
  'P0-071 worker bootstrap must still load pdf-print-guard.js'
);
requireMatch(
  printGuard,
  /method\s*!==\s*['"]Page\.printToPDF['"]/,
  'P0-071 guard must still intercept Page.printToPDF'
);
requireMatch(
  printGuard,
  /Emulation\.setScriptExecutionDisabled['"]?\s*,\s*\{\s*value:\s*true\s*\}/,
  'P0-071 guard must still freeze page script execution at render cut'
);

// Content-to-worker handoff must carry a previously issued P0-080 receipt after preparation.
const contentSave = [
  around(content, 'WEBCLIP_GENERATE_PDF'),
  around(content, 'WEBCLIP_SEND_PDF_TO_YANDEX')
].join('\n');
requireAny(
  contentSave,
  [
    /\bsourceGenerationReceipt\b/,
    /\bselectionAdmissionReceipt\b/,
    /\bcontentSelectionReceipt\b/
  ],
  'save command must carry an exact previously validated selection/source receipt'
);

// Worker save admission must use browser-provided sender document + frame identity.
const localHandler = around(worker, "message?.type === 'WEBCLIP_GENERATE_PDF'");
const yandexHandler = around(worker, "message?.type === 'WEBCLIP_SEND_PDF_TO_YANDEX'");
const saveHandlers = `${localHandler}\n${yandexHandler}`;
requireMatch(
  saveHandlers,
  /sender\??\.documentId|sender\.documentId/,
  'top-level save handler must consume MessageSender.documentId'
);
requireMatch(
  saveHandlers,
  /sender\??\.frameId|sender\.frameId/,
  'top-level save handler must consume MessageSender.frameId'
);
requireAny(
  saveHandlers,
  [
    /frameId[^;\n]{0,120}(?:===|!==)\s*0/,
    /top(?:Level|Frame)[A-Za-z0-9_]*\s*\(/,
    /assert[A-Za-z0-9_]*Top[A-Za-z0-9_]*Frame\s*\(/
  ],
  'top-level save sender/frame contract must be explicit'
);

// A versioned source-generation receipt must exist as production authority.
requireAny(
  worker,
  [
    /\bsourceGenerationReceipt\b/,
    /\bfullDocumentGenerationReceipt\b/,
    /\bcreate[A-Za-z0-9_]*SourceGeneration[A-Za-z0-9_]*Receipt\b/
  ],
  'worker must construct/retain a versioned exact source-generation receipt'
);

// Before native render, target the exact browser document rather than only tabId.
requireAny(
  worker,
  [
    /tabs\.sendMessage\([^)]*\{[\s\S]{0,800}\bdocumentId\s*:/,
    /documentIds\s*:\s*\[[^\]]*\]/,
    /target[A-Za-z0-9_]*ExactDocument\s*\(/
  ],
  'worker must perform an exact-document probe using browser document identity'
);

// Native render window must have an operation-local debugger navigation fence.
requireMatch(
  worker,
  /chrome\.debugger\.onEvent\.(?:addListener|removeListener)|debugger\.onEvent\.(?:addListener|removeListener)/,
  'render path must observe debugger Page-domain navigation events'
);
requireMatch(
  worker,
  /Page\.frameStartedNavigating/,
  'render fence must detect navigation start'
);
requireMatch(
  worker,
  /Page\.frameNavigated/,
  'render fence must detect committed cross-document navigation'
);
requireMatch(
  worker,
  /Page\.navigatedWithinDocument/,
  'render fence must detect same-document navigation'
);
requireAny(
  worker,
  [
    /\bsourceNavigationFence\b/,
    /\brenderNavigationFence\b/,
    /\bfullDocumentGenerationFence\b/,
    /\bsourceGenerationStale\b/
  ],
  'navigation evidence must feed an explicit source/render-generation fence'
);

// Returned bytes may be accepted only after the source fence is proven clean.
requireAny(
  worker,
  [
    /assert[A-Za-z0-9_]*(?:Source|Render)[A-Za-z0-9_]*(?:Current|Clean|Valid)\s*\(/,
    /if\s*\([^)]*(?:sourceNavigationFence|renderNavigationFence|sourceGenerationStale)[^)]*\)\s*(?:throw|return)/,
    /accept[A-Za-z0-9_]*Pdf[A-Za-z0-9_]*Generation\s*\([^)]*(?:source|receipt|fence)/
  ],
  'PDF byte acceptance must be gated on clean source-generation evidence'
);

// Downstream exact bytes/checkpoints must carry source provenance into P0-079 ownership.
requireAny(
  worker,
  [
    /\bpdfGenerationReceipt\b/,
    /\bsealedPdfGeneration\b/,
    /\bsourceReceipt(?:Id|Digest)?\b/
  ],
  'accepted PDF/checkpoint path must retain a source-to-sealed-PDF provenance link'
);

// Caller textual operationId must not be the only source-generation key.
requireMatch(
  worker,
  /\boperationId\b/,
  'operation correlation remains present as a positive control'
);
if (!/\bsourceGenerationReceipt\b|\bfullDocumentGenerationReceipt\b|\bsourceReceipt(?:Id|Digest)?\b/.test(worker)) {
  throw new Error('P0-070 source gate RED: operationId cannot be the sole full-document source authority');
}

// P0-070 can be implemented inside the existing Chrome 118 permission envelope.
const permissions = new Set([...(manifest.permissions || []), ...(manifest.optional_permissions || [])]);
if (permissions.has('webNavigation')) {
  throw new Error('P0-070 source gate RED: do not add webNavigation solely for full-document generation fencing');
}

console.log('P0-070 full-document generation source gate: PASS');
