from pathlib import Path
import re

ROOT = Path('.')


def read(path):
    return (ROOT / path).read_text(encoding='utf-8')


def write(path, text):
    (ROOT / path).write_text(text, encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected 1 anchor, found {count}')
    return text.replace(old, new, 1)


def edit_block(text, start_marker, end_marker, editor, label):
    start = text.find(start_marker)
    if start < 0:
        raise RuntimeError(f'{label}: start marker not found')
    end = text.find(end_marker, start + len(start_marker))
    if end < 0:
        raise RuntimeError(f'{label}: end marker not found')
    block = text[start:end]
    changed = editor(block)
    if changed == block:
        raise RuntimeError(f'{label}: block was not changed')
    return text[:start] + changed + text[end:]


# ---------------------------------------------------------------------------
# P1-147: bounded page/print structure diagnostics for PDF investigations.
# ---------------------------------------------------------------------------
content = read('content.js')
content = replace_once(
    content,
    "  const PDF_RESOURCE_FONT_SPEC_MAX_CHARS = 4_096;\n",
    "  const PDF_RESOURCE_FONT_SPEC_MAX_CHARS = 4_096;\n"
    "  const PAGE_DIAGNOSTICS_MAX_SELECTION_ITEMS = 16;\n"
    "  const PAGE_DIAGNOSTICS_MAX_ANCESTORS = 10;\n"
    "  const PAGE_DIAGNOSTICS_MAX_CLASSES = 8;\n"
    "  const PAGE_DIAGNOSTICS_MAX_STRING_CHARS = 240;\n",
    'content diagnostics constants'
)
content = replace_once(
    content,
    "    printUiHidden: false,\n    printUiPreviousDisplay: ''\n",
    "    printUiHidden: false,\n"
    "    printUiPreviousDisplay: '',\n"
    "    lastBeforePrintDiagnostics: null,\n"
    "    lastAfterPrintDiagnostics: null\n",
    'content diagnostics state'
)
content = replace_once(
    content,
    "  function hideWebClipUiForPrintRender() {\n    if (!state.host?.isConnected || state.printUiHidden) return;\n",
    "  function hideWebClipUiForPrintRender() {\n"
    "    try { state.lastBeforePrintDiagnostics = capturePageStructureDiagnostics('beforeprint'); } catch (_) { state.lastBeforePrintDiagnostics = null; }\n"
    "    if (!state.host?.isConnected || state.printUiHidden) return;\n",
    'beforeprint diagnostics capture'
)
content = replace_once(
    content,
    "    state.printUiHidden = false;\n    state.printUiPreviousDisplay = '';\n  }\n\n  window.addEventListener('beforeprint', hideWebClipUiForPrintRender);\n",
    "    state.printUiHidden = false;\n"
    "    state.printUiPreviousDisplay = '';\n"
    "    try { state.lastAfterPrintDiagnostics = capturePageStructureDiagnostics('afterprint'); } catch (_) { state.lastAfterPrintDiagnostics = null; }\n"
    "  }\n\n"
    "  window.addEventListener('beforeprint', hideWebClipUiForPrintRender);\n",
    'afterprint diagnostics capture'
)
content = replace_once(
    content,
    "    if (message?.type === 'WEBCLIP_PAGE_UPLOAD_PROGRESS') {\n",
    "    if (message?.type === 'WEBCLIP_COLLECT_PRINT_DIAGNOSTICS') {\n"
    "      sendResponse({\n"
    "        ok: true,\n"
    "        diagnostics: {\n"
    "          beforePrint: state.lastBeforePrintDiagnostics,\n"
    "          afterPrint: state.lastAfterPrintDiagnostics,\n"
    "          current: capturePageStructureDiagnostics('post-print-rpc')\n"
    "        }\n"
    "      });\n"
    "      return false;\n"
    "    }\n"
    "    if (message?.type === 'WEBCLIP_PAGE_UPLOAD_PROGRESS') {\n",
    'print diagnostics RPC'
)

diagnostics_functions = r'''  function diagnosticBoundedString(value, maxChars = PAGE_DIAGNOSTICS_MAX_STRING_CHARS) {
    return String(value == null ? '' : value).slice(0, Math.max(0, Number(maxChars) || 0));
  }

  function diagnosticNumber(value, max = 100_000_000) {
    const number = Number(value);
    if (!Number.isFinite(number)) return 0;
    return Math.max(-max, Math.min(max, Math.round(number * 100) / 100));
  }

  function diagnosticClasses(element) {
    try {
      return [...(element?.classList || [])]
        .slice(0, PAGE_DIAGNOSTICS_MAX_CLASSES)
        .map((value) => diagnosticBoundedString(value, 120));
    } catch (_) {
      return [];
    }
  }

  function diagnosticStyleSnapshot(element) {
    if (!element) return {};
    let style = null;
    try { style = (element.ownerDocument?.defaultView || window).getComputedStyle(element); } catch (_) { style = null; }
    if (!style) return {};
    const transform = diagnosticBoundedString(style.transform || '', 160);
    return {
      display: diagnosticBoundedString(style.display, 80),
      visibility: diagnosticBoundedString(style.visibility, 80),
      opacity: diagnosticBoundedString(style.opacity, 40),
      position: diagnosticBoundedString(style.position, 80),
      overflowX: diagnosticBoundedString(style.overflowX, 80),
      overflowY: diagnosticBoundedString(style.overflowY, 80),
      contentVisibility: diagnosticBoundedString(style.contentVisibility, 80),
      contain: diagnosticBoundedString(style.contain, 160),
      transform: !transform || transform === 'none' ? 'none' : 'present'
    };
  }

  function diagnosticAncestorSnapshot(element) {
    const result = [];
    let current = element?.parentElement || null;
    while (current && result.length < PAGE_DIAGNOSTICS_MAX_ANCESTORS) {
      result.push({
        tag: diagnosticBoundedString(current.localName || '', 80),
        id: diagnosticBoundedString(current.id || '', 160),
        classes: diagnosticClasses(current),
        style: diagnosticStyleSnapshot(current)
      });
      current = current.parentElement;
    }
    return result;
  }

  function diagnosticElementSnapshot(element, kind, index) {
    if (!element || element.nodeType !== 1) return null;
    const ownerDoc = element.ownerDocument || document;
    let rect = null;
    try { rect = element.getBoundingClientRect(); } catch (_) { rect = null; }
    let frameDepth = 0;
    try { frameDepth = getFrameChainForDocument(ownerDoc).length; } catch (_) { frameDepth = 0; }
    let textChars = 0;
    try { textChars = String(element.innerText || element.textContent || '').length; } catch (_) { textChars = 0; }
    return {
      kind: kind === 'exclude' ? 'exclude' : 'include',
      index: Math.max(0, Number(index) || 0),
      tag: diagnosticBoundedString(element.localName || '', 80),
      id: diagnosticBoundedString(element.id || '', 160),
      classes: diagnosticClasses(element),
      role: diagnosticBoundedString(element.getAttribute?.('role') || '', 120),
      topDocument: ownerDoc === document,
      frameDepth: Math.max(0, Math.min(32, frameDepth)),
      isBody: element === ownerDoc.body,
      connected: Boolean(element.isConnected),
      childElementCount: Math.max(0, Math.min(1_000_000, Number(element.childElementCount) || 0)),
      textChars: Math.max(0, Math.min(10_000_000, textChars)),
      rect: rect ? {
        x: diagnosticNumber(rect.x),
        y: diagnosticNumber(rect.y),
        width: diagnosticNumber(rect.width),
        height: diagnosticNumber(rect.height)
      } : null,
      scrollWidth: Math.max(0, Math.min(100_000_000, Number(element.scrollWidth) || 0)),
      scrollHeight: Math.max(0, Math.min(100_000_000, Number(element.scrollHeight) || 0)),
      style: diagnosticStyleSnapshot(element),
      ancestors: diagnosticAncestorSnapshot(element)
    };
  }

  function capturePageStructureDiagnostics(phase = 'page') {
    const body = document.body;
    const docEl = document.documentElement;
    let bodyTextChars = 0;
    try { bodyTextChars = String(body?.innerText || body?.textContent || '').length; } catch (_) { bodyTextChars = 0; }
    const localIncludes = [...state.includes.values()];
    const localExcludes = [...state.excludes.values()];
    const items = [];
    for (const [kind, source] of [['include', localIncludes], ['exclude', localExcludes]]) {
      for (const element of source) {
        if (items.length >= PAGE_DIAGNOSTICS_MAX_SELECTION_ITEMS) break;
        const snapshot = diagnosticElementSnapshot(element, kind, items.length);
        if (snapshot) items.push(snapshot);
      }
      if (items.length >= PAGE_DIAGNOSTICS_MAX_SELECTION_ITEMS) break;
    }
    return {
      version: 1,
      phase: diagnosticBoundedString(phase, 80),
      capturedAt: Date.now(),
      document: {
        readyState: diagnosticBoundedString(document.readyState, 40),
        compatMode: diagnosticBoundedString(document.compatMode, 40),
        visibilityState: diagnosticBoundedString(document.visibilityState, 40),
        bodyChildElementCount: Math.max(0, Math.min(1_000_000, Number(body?.childElementCount) || 0)),
        bodyTextChars: Math.max(0, Math.min(10_000_000, bodyTextChars)),
        bodyScrollWidth: Math.max(0, Math.min(100_000_000, Number(body?.scrollWidth) || 0)),
        bodyScrollHeight: Math.max(0, Math.min(100_000_000, Number(body?.scrollHeight) || 0)),
        documentScrollWidth: Math.max(0, Math.min(100_000_000, Number(docEl?.scrollWidth) || 0)),
        documentScrollHeight: Math.max(0, Math.min(100_000_000, Number(docEl?.scrollHeight) || 0)),
        viewportWidth: Math.max(0, Math.min(100_000_000, Number(window.innerWidth) || 0)),
        viewportHeight: Math.max(0, Math.min(100_000_000, Number(window.innerHeight) || 0))
      },
      selection: {
        includeCount: totalIncludeCount(),
        excludeCount: totalExcludeCount(),
        localIncludeCount: localIncludes.length,
        localExcludeCount: localExcludes.length,
        remoteIncludeCount: totalRemoteIncludeCount(),
        remoteExcludeCount: totalRemoteExcludeCount(),
        bodyIncluded: localIncludes.some((element) => element === document.body),
        topDocumentIncludeCount: localIncludes.filter((element) => element?.ownerDocument === document).length,
        frameDocumentCount: Math.max(0, state.frameDocuments.size - 1),
        items,
        itemsTruncated: localIncludes.length + localExcludes.length > items.length
      },
      print: {
        headerConnected: Boolean(document.getElementById(PRINT_HEADER_ID)?.isConnected),
        printStyleDocuments: Math.max(0, state.printStyles.length),
        uiHidden: Boolean(state.printUiHidden),
        remotePreparedCount: Math.max(0, state.remotePrintPrepared.size)
      }
    };
  }

'''
content = replace_once(
    content,
    "  async function prepareForPrint(meta) {\n",
    diagnostics_functions + "  async function prepareForPrint(meta) {\n",
    'content diagnostics functions'
)
content = replace_once(
    content,
    "  async function prepareForPrint(meta) {\n    restoreAfterPrint();\n    await restoreRemoteFramesAfterPrint();\n",
    "  async function prepareForPrint(meta) {\n"
    "    restoreAfterPrint();\n"
    "    state.lastBeforePrintDiagnostics = null;\n"
    "    state.lastAfterPrintDiagnostics = null;\n"
    "    await restoreRemoteFramesAfterPrint();\n",
    'prepare diagnostics reset'
)
content = replace_once(
    content,
    "    wrapUnlinkedImagesForPdf();\n\n    state.printHeader = header;\n",
    "    wrapUnlinkedImagesForPdf();\n\n"
    "    meta.pageAnalysis = capturePageStructureDiagnostics('prepared');\n"
    "    state.printHeader = header;\n",
    'prepared page analysis capture'
)
write('content.js', content)


worker = read('service-worker.js')
worker = replace_once(
    worker,
    "const MAX_PDF_RESOURCE_REPORT_LABEL_CHARS = 500;\n",
    "const MAX_PDF_RESOURCE_REPORT_LABEL_CHARS = 500;\n"
    "const MAX_PAGE_ANALYSIS_JSON_CHARS = 48 * 1024;\n"
    "const MAX_PAGE_ANALYSIS_ITEMS = 16;\n"
    "const MAX_PAGE_ANALYSIS_ANCESTORS = 10;\n",
    'worker diagnostics constants'
)

sanitizer = r'''function pageDiagnosticString(value, maxChars = 240) {
  return boundedContentString(value, Math.max(0, Math.min(1000, Number(maxChars) || 0)));
}

function pageDiagnosticCount(value, max = 100_000_000) {
  const number = Number(value);
  if (!Number.isFinite(number)) return 0;
  return Math.max(0, Math.min(max, Math.round(number * 100) / 100));
}

function sanitizePageDiagnosticStyle(raw) {
  const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
  return {
    display: pageDiagnosticString(source.display, 80),
    visibility: pageDiagnosticString(source.visibility, 80),
    opacity: pageDiagnosticString(source.opacity, 40),
    position: pageDiagnosticString(source.position, 80),
    overflowX: pageDiagnosticString(source.overflowX, 80),
    overflowY: pageDiagnosticString(source.overflowY, 80),
    contentVisibility: pageDiagnosticString(source.contentVisibility, 80),
    contain: pageDiagnosticString(source.contain, 160),
    transform: source.transform === 'present' ? 'present' : 'none'
  };
}

function sanitizePageDiagnosticNode(raw, { ancestor = false } = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const classes = Array.isArray(raw.classes)
    ? raw.classes.slice(0, 8).map((value) => pageDiagnosticString(value, 120))
    : [];
  const safe = {
    tag: pageDiagnosticString(raw.tag, 80),
    id: pageDiagnosticString(raw.id, 160),
    classes,
    style: sanitizePageDiagnosticStyle(raw.style)
  };
  if (ancestor) return safe;
  const rect = raw.rect && typeof raw.rect === 'object' && !Array.isArray(raw.rect) ? raw.rect : null;
  safe.kind = raw.kind === 'exclude' ? 'exclude' : 'include';
  safe.index = pageDiagnosticCount(raw.index, 1000);
  safe.role = pageDiagnosticString(raw.role, 120);
  safe.topDocument = Boolean(raw.topDocument);
  safe.frameDepth = pageDiagnosticCount(raw.frameDepth, 32);
  safe.isBody = Boolean(raw.isBody);
  safe.connected = Boolean(raw.connected);
  safe.childElementCount = pageDiagnosticCount(raw.childElementCount, 1_000_000);
  safe.textChars = pageDiagnosticCount(raw.textChars, 10_000_000);
  safe.rect = rect ? {
    x: Math.max(-100_000_000, Math.min(100_000_000, Number(rect.x) || 0)),
    y: Math.max(-100_000_000, Math.min(100_000_000, Number(rect.y) || 0)),
    width: pageDiagnosticCount(rect.width),
    height: pageDiagnosticCount(rect.height)
  } : null;
  safe.scrollWidth = pageDiagnosticCount(raw.scrollWidth);
  safe.scrollHeight = pageDiagnosticCount(raw.scrollHeight);
  safe.ancestors = Array.isArray(raw.ancestors)
    ? raw.ancestors.slice(0, MAX_PAGE_ANALYSIS_ANCESTORS).map((item) => sanitizePageDiagnosticNode(item, { ancestor: true })).filter(Boolean)
    : [];
  return safe;
}

function sanitizePageStructureDiagnostics(rawDiagnostics) {
  if (!rawDiagnostics || typeof rawDiagnostics !== 'object' || Array.isArray(rawDiagnostics) || Number(rawDiagnostics.version || 0) < 1) return null;
  const raw = rawDiagnostics;
  const doc = raw.document && typeof raw.document === 'object' && !Array.isArray(raw.document) ? raw.document : {};
  const selection = raw.selection && typeof raw.selection === 'object' && !Array.isArray(raw.selection) ? raw.selection : {};
  const print = raw.print && typeof raw.print === 'object' && !Array.isArray(raw.print) ? raw.print : {};
  const safe = {
    version: 1,
    phase: pageDiagnosticString(raw.phase, 80),
    capturedAt: pageDiagnosticCount(raw.capturedAt, Number.MAX_SAFE_INTEGER),
    document: {
      readyState: pageDiagnosticString(doc.readyState, 40),
      compatMode: pageDiagnosticString(doc.compatMode, 40),
      visibilityState: pageDiagnosticString(doc.visibilityState, 40),
      bodyChildElementCount: pageDiagnosticCount(doc.bodyChildElementCount, 1_000_000),
      bodyTextChars: pageDiagnosticCount(doc.bodyTextChars, 10_000_000),
      bodyScrollWidth: pageDiagnosticCount(doc.bodyScrollWidth),
      bodyScrollHeight: pageDiagnosticCount(doc.bodyScrollHeight),
      documentScrollWidth: pageDiagnosticCount(doc.documentScrollWidth),
      documentScrollHeight: pageDiagnosticCount(doc.documentScrollHeight),
      viewportWidth: pageDiagnosticCount(doc.viewportWidth),
      viewportHeight: pageDiagnosticCount(doc.viewportHeight)
    },
    selection: {
      includeCount: pageDiagnosticCount(selection.includeCount, 1000),
      excludeCount: pageDiagnosticCount(selection.excludeCount, 1000),
      localIncludeCount: pageDiagnosticCount(selection.localIncludeCount, 1000),
      localExcludeCount: pageDiagnosticCount(selection.localExcludeCount, 1000),
      remoteIncludeCount: pageDiagnosticCount(selection.remoteIncludeCount, 1000),
      remoteExcludeCount: pageDiagnosticCount(selection.remoteExcludeCount, 1000),
      bodyIncluded: Boolean(selection.bodyIncluded),
      topDocumentIncludeCount: pageDiagnosticCount(selection.topDocumentIncludeCount, 1000),
      frameDocumentCount: pageDiagnosticCount(selection.frameDocumentCount, 256),
      items: Array.isArray(selection.items)
        ? selection.items.slice(0, MAX_PAGE_ANALYSIS_ITEMS).map((item) => sanitizePageDiagnosticNode(item)).filter(Boolean)
        : [],
      itemsTruncated: Boolean(selection.itemsTruncated)
    },
    print: {
      headerConnected: Boolean(print.headerConnected),
      printStyleDocuments: pageDiagnosticCount(print.printStyleDocuments, 256),
      uiHidden: Boolean(print.uiHidden),
      remotePreparedCount: pageDiagnosticCount(print.remotePreparedCount, 256)
    }
  };
  if (jsonSizeChars(safe) > MAX_PAGE_ANALYSIS_JSON_CHARS) {
    safe.selection.items = safe.selection.items.slice(0, 4);
    safe.selection.itemsTruncated = true;
    safe.truncated = true;
  }
  return safe;
}

function sanitizePrintStructureDiagnostics(rawDiagnostics) {
  const raw = rawDiagnostics && typeof rawDiagnostics === 'object' && !Array.isArray(rawDiagnostics) ? rawDiagnostics : {};
  return {
    beforePrint: sanitizePageStructureDiagnostics(raw.beforePrint),
    afterPrint: sanitizePageStructureDiagnostics(raw.afterPrint),
    current: sanitizePageStructureDiagnostics(raw.current),
    unavailable: Boolean(raw.unavailable),
    error: pageDiagnosticString(raw.error, 1000)
  };
}

'''
worker = replace_once(
    worker,
    "function sanitizeContentSaveMeta(rawMeta, sender) {\n",
    sanitizer + "function sanitizeContentSaveMeta(rawMeta, sender) {\n",
    'worker page diagnostics sanitizer'
)
worker = replace_once(
    worker,
    "    selectionSnapshot: sanitizeSelectionSnapshot(raw.selectionSnapshot, { rejectOverflow: true }),\n    resourceReport: sanitizePdfResourceReport(raw.resourceReport)\n",
    "    selectionSnapshot: sanitizeSelectionSnapshot(raw.selectionSnapshot, { rejectOverflow: true }),\n"
    "    resourceReport: sanitizePdfResourceReport(raw.resourceReport),\n"
    "    pageAnalysis: sanitizePageStructureDiagnostics(raw.pageAnalysis)\n",
    'content meta page analysis allowlist'
)

collect_helper = r'''async function collectPrintDiagnosticsForTab(tabId) {
  try {
    const response = await withOperationTimeout(
      chrome.tabs.sendMessage(Number(tabId), { type: 'WEBCLIP_COLLECT_PRINT_DIAGNOSTICS' }),
      5_000,
      'Сбор диагностики структуры страницы после печати'
    );
    if (!response?.ok) {
      return sanitizePrintStructureDiagnostics({ unavailable: true, error: response?.error || 'Content script не вернул диагностику печати.' });
    }
    return sanitizePrintStructureDiagnostics(response.diagnostics || {});
  } catch (error) {
    return sanitizePrintStructureDiagnostics({ unavailable: true, error: normalizeError(error) });
  }
}

'''
worker = replace_once(
    worker,
    "const debuggerActiveTabs = new Set();\n",
    collect_helper + "const debuggerActiveTabs = new Set();\n",
    'worker collect print diagnostics helper'
)


def edit_local_pdf(block):
    block = replace_once(
        block,
        "  meta.resourceReport = resourceReport;\n",
        "  meta.resourceReport = resourceReport;\n"
        "  const pageAnalysis = sanitizePageStructureDiagnostics(meta.pageAnalysis);\n"
        "  meta.pageAnalysis = pageAnalysis;\n",
        'local page analysis init'
    )
    block = replace_once(
        block,
        "    tabId, url: String(meta.url || ''), title: String(meta.title || ''), readingMode: 'read', resourceReport\n",
        "    tabId, url: String(meta.url || ''), title: String(meta.title || ''), readingMode: 'read', resourceReport, pageAnalysis\n",
        'local log meta analysis'
    )
    block = replace_once(
        block,
        "  try {\n    const resourceState = resourceReport.failed",
        "  try {\n"
        "    recordOperationStage(operationId, 'page-analysis', `Анализ структуры страницы перед PDF: Включены ${pageAnalysis?.selection?.includeCount || 0}, Исключены ${pageAnalysis?.selection?.excludeCount || 0}${pageAnalysis?.selection?.bodyIncluded ? '; выбран body' : ''}.`, 6, 'running', { pageAnalysis });\n"
        "    const resourceState = resourceReport.failed",
        'local page-analysis stage'
    )
    block = replace_once(
        block,
        "    let pdfBlob = await generatePdfBlob(tabId);\n    const expectedPdfBytes = pdfBlob.size;\n",
        "    let pdfBlob = await generatePdfBlob(tabId);\n"
        "    const printDiagnostics = await collectPrintDiagnosticsForTab(tabId);\n"
        "    const expectedPdfBytes = pdfBlob.size;\n"
        "    recordOperationStage(operationId, 'copy-save', `Chromium сформировал PDF-копию (${expectedPdfBytes} байт). Фиксируем состояние структуры страницы и передаём копию в Chrome Downloads.`, 52, 'running', { pdfBytes: expectedPdfBytes, pageAnalysis, printDiagnostics, destination: 'download' });\n",
        'local copy-save stage'
    )
    return block

worker = edit_block(
    worker,
    'async function generatePdfAndDownload(tabId, meta, operationId = \'\') {',
    'async function generatePdfAndUploadToYandex(tabId, meta, operationId = \'\') {',
    edit_local_pdf,
    'local pdf diagnostics block'
)


def edit_yandex_pdf(block):
    block = replace_once(
        block,
        "  meta = { ...meta, readingMode, resourceReport };\n",
        "  const pageAnalysis = sanitizePageStructureDiagnostics(meta?.pageAnalysis);\n"
        "  meta = { ...meta, readingMode, resourceReport, pageAnalysis };\n",
        'yandex page analysis init'
    )
    block = replace_once(
        block,
        "    tabId, url: String(meta.url || ''), title: String(meta.title || ''), readingMode, fileCommentPresent: Boolean(String(meta.fileComment || '').trim()), resourceReport\n",
        "    tabId, url: String(meta.url || ''), title: String(meta.title || ''), readingMode, fileCommentPresent: Boolean(String(meta.fileComment || '').trim()), resourceReport, pageAnalysis\n",
        'yandex log meta analysis'
    )
    block = replace_once(
        block,
        "  try {\n    const resourceState = resourceReport.failed",
        "  try {\n"
        "    recordOperationStage(operationId, 'page-analysis', `Анализ структуры страницы перед PDF: Включены ${pageAnalysis?.selection?.includeCount || 0}, Исключены ${pageAnalysis?.selection?.excludeCount || 0}${pageAnalysis?.selection?.bodyIncluded ? '; выбран body' : ''}.`, 12, 'running', { pageAnalysis });\n"
        "    const resourceState = resourceReport.failed",
        'yandex page-analysis stage'
    )
    block = replace_once(
        block,
        "    let pdfBlob = await generatePdfBlob(tabId);\n    filename = buildYandexFilename(meta);\n",
        "    let pdfBlob = await generatePdfBlob(tabId);\n"
        "    const printDiagnostics = await collectPrintDiagnosticsForTab(tabId);\n"
        "    recordOperationStage(operationId, 'copy-save', `Chromium сформировал PDF-копию (${pdfBlob.size} байт). Фиксируем состояние структуры страницы перед сохранением на Яндекс Диск.`, 40, 'running', { pdfBytes: pdfBlob.size, pageAnalysis, printDiagnostics, destination: 'yandex' });\n"
        "    filename = buildYandexFilename(meta);\n",
        'yandex copy-save stage'
    )
    return block

worker = edit_block(
    worker,
    'async function generatePdfAndUploadToYandex(tabId, meta, operationId = \'\') {',
    'async function retryCachedPdfUploadToYandex(tabId, operationId = \'\') {',
    edit_yandex_pdf,
    'yandex pdf diagnostics block'
)

# ---------------------------------------------------------------------------
# P1-148: exact operationId link from Journal record to OperationLog.
# ---------------------------------------------------------------------------
worker = replace_once(
    worker,
    "    journalEntryId,\n    journalCreatedAt: createdAt,\n    meta: {\n",
    "    journalEntryId,\n"
    "    journalCreatedAt: createdAt,\n"
    "    operationId: String(data.operationId || '').slice(0, MAX_OPERATION_ID_CHARS),\n"
    "    meta: {\n",
    'pending journal operationId field'
)

# Inject operationId into each newly-created durable checkpoint data payload.
def checkpoint_patch(block, label):
    block = replace_once(
        block,
        "  const prepared = normalizePendingJournalAppendData(data);\n",
        "  const prepared = normalizePendingJournalAppendData({ ...data, operationId: String(operationId || data?.operationId || '').slice(0, MAX_OPERATION_ID_CHARS) });\n",
        label
    )
    return block

worker = edit_block(worker, 'async function checkpointPendingJournalAppend(data, operationId = \'\') {', 'async function removePendingJournalAppend(', lambda b: checkpoint_patch(b, 'pending append opid'), 'pending append checkpoint block')
worker = edit_block(worker, 'async function checkpointPendingRemoteSaveIntent(data, { expectedPdfBytes = 0, createPublicLinks = false, operationId = \'\' } = {}) {', 'async function getPendingRemoteSave(', lambda b: checkpoint_patch(b, 'remote checkpoint opid'), 'remote checkpoint block')
worker = edit_block(worker, 'async function checkpointPendingLocalDownloadIntent(data, operationId = \'\', blobUrl = \'\', expectedBytes = 0) {', 'async function bindPendingLocalDownloadIntent(', lambda b: checkpoint_patch(b, 'local checkpoint opid'), 'local checkpoint block')

worker = replace_once(
    worker,
    "async function appendJournalEntry({ destination, filename, remotePath = '', folder = '', publicUrl = '', resourceId = '', accountUid = '', rootPath = '', meta = {}, journalEntryId = '', journalCreatedAt = 0 }, options = {}) {\n",
    "async function appendJournalEntry({ destination, filename, remotePath = '', folder = '', publicUrl = '', resourceId = '', accountUid = '', rootPath = '', meta = {}, journalEntryId = '', journalCreatedAt = 0, operationId = '' }, options = {}) {\n",
    'append journal signature operationId'
)
worker = replace_once(
    worker,
    "    operationDateTime: String(meta.localDateTime || ''),\n    destination: destination === 'yandex' ? 'yandex' : 'download',\n",
    "    operationDateTime: String(meta.localDateTime || ''),\n"
    "    operationId: String(operationId || '').slice(0, MAX_OPERATION_ID_CHARS),\n"
    "    destination: destination === 'yandex' ? 'yandex' : 'download',\n",
    'journal entry operationId'
)
worker = replace_once(
    worker,
    "  const importedDayKey = boundedImportString(raw.localDayKey || '', 32).trim();\n  return {\n",
    "  const importedDayKey = boundedImportString(raw.localDayKey || '', 32).trim();\n"
    "  const importedOperationIdRaw = String(raw.operationId || '').trim();\n"
    "  const importedOperationId = importedOperationIdRaw.length <= MAX_OPERATION_ID_CHARS && /^[A-Za-z0-9._:-]+$/.test(importedOperationIdRaw) ? importedOperationIdRaw : '';\n"
    "  return {\n",
    'import journal operationId sanitizer'
)
worker = replace_once(
    worker,
    "    operationDateTime: boundedImportString(raw.operationDateTime || '', MAX_IMPORTED_DATETIME_CHARS),\n    destination: raw.destination === 'yandex' ? 'yandex' : 'download',\n",
    "    operationDateTime: boundedImportString(raw.operationDateTime || '', MAX_IMPORTED_DATETIME_CHARS),\n"
    "    operationId: importedOperationId,\n"
    "    destination: raw.destination === 'yandex' ? 'yandex' : 'download',\n",
    'imported entry operationId field'
)

write('service-worker.js', worker)


journal = read('journal.js')
linked_log_ui = r'''function buildLinkedOperationLog(entry) {
  const operationId = String(entry?.operationId || '').trim();
  const root = document.createElement('section');
  root.className = 'entry-operation-log';
  const label = document.createElement('div');
  label.className = 'entry-operation-log-label';
  const status = document.createElement('div');
  status.className = 'entry-operation-log-status';
  const pre = document.createElement('pre');
  pre.className = 'entry-operation-log-json hidden';
  root.append(label, status, pre);

  let cachedLog = null;
  let loading = null;

  const exactOperationId = /^[A-Za-z0-9._:-]{1,160}$/.test(operationId) ? operationId : '';
  label.textContent = exactOperationId ? `OperationLog: ${exactOperationId}` : 'OperationLog: для этой записи лог не связан.';
  status.textContent = exactOperationId
    ? 'Связь по точному operationId. Лог загружается только по запросу.'
    : 'Старая или импортированная запись без operationId: WebClip не подбирает лог по имени файла или времени.';

  const load = async () => {
    if (cachedLog) return cachedLog;
    if (!exactOperationId) throw new Error('Для этой записи журнала OperationLog не связан.');
    if (!loading) {
      status.textContent = 'Загружаем связанный OperationLog…';
      loading = sendReadOnlyRuntimeMessage(
        { type: 'WEBCLIP_OPERATION_LOG_GET', operationId: exactOperationId },
        30_000,
        'Чтение связанного OperationLog'
      ).then((response) => {
        requireOk(response);
        const log = response?.log || null;
        if (!log || String(log.operationId || '') !== exactOperationId) {
          throw new Error('Связанный OperationLog не найден. Возможно, истёк срок хранения диагностических логов.');
        }
        cachedLog = log;
        status.textContent = `${log.title || 'OperationLog'} · ${log.status || 'unknown'} · событий: ${Number(log.eventCount || log.events?.length || 0)}`;
        pre.textContent = JSON.stringify(log, null, 2);
        return log;
      }).finally(() => { loading = null; });
    }
    return loading;
  };

  const showButton = makeButton('Показать лог', false, async () => {
    if (!exactOperationId) return;
    if (!pre.classList.contains('hidden')) {
      pre.classList.add('hidden');
      showButton.textContent = 'Показать лог';
      return;
    }
    showButton.disabled = true;
    try {
      await load();
      pre.classList.remove('hidden');
      showButton.textContent = 'Скрыть лог';
    } catch (error) {
      status.textContent = error?.message || String(error);
      setStatus(status.textContent, 'error');
    } finally {
      showButton.disabled = false;
    }
  }, 'entry-log-show');

  const copyButton = makeButton('Копировать лог', false, async () => {
    if (!exactOperationId) return;
    copyButton.disabled = true;
    try {
      const log = await load();
      await navigator.clipboard.writeText(JSON.stringify(log, null, 2));
      setStatus(`OperationLog ${exactOperationId} скопирован.`, 'ok');
    } catch (error) {
      status.textContent = error?.message || String(error);
      setStatus(status.textContent, 'error');
    } finally {
      copyButton.disabled = false;
    }
  }, 'entry-log-copy');

  if (!exactOperationId) {
    showButton.disabled = true;
    copyButton.disabled = true;
    showButton.title = copyButton.title = 'Для этой записи operationId не сохранён.';
  }
  return { root, showButton, copyButton };
}

'''
journal = replace_once(
    journal,
    "function buildEntryCard(entry) {\n",
    linked_log_ui + "function buildEntryCard(entry) {\n",
    'journal linked log UI helper'
)
journal = replace_once(
    journal,
    "  const primaryActions = document.createElement('div');\n  primaryActions.className = 'entry-primary-actions';\n",
    "  const primaryActions = document.createElement('div');\n"
    "  primaryActions.className = 'entry-primary-actions';\n"
    "  const linkedOperationLog = buildLinkedOperationLog(entry);\n",
    'journal linked log instance'
)
journal = replace_once(
    journal,
    "  if (later) primaryActions.appendChild(makeButton('Перенести в «Прочитано»', false, () => moveEntryToRead(entry), 'move-read-button'));\n  primaryActions.appendChild(makeButton('Удалить запись', false, () => deleteEntry(entry), 'danger'));\n",
    "  if (later) primaryActions.appendChild(makeButton('Перенести в «Прочитано»', false, () => moveEntryToRead(entry), 'move-read-button'));\n"
    "  primaryActions.append(linkedOperationLog.showButton, linkedOperationLog.copyButton);\n"
    "  primaryActions.appendChild(makeButton('Удалить запись', false, () => deleteEntry(entry), 'danger'));\n",
    'journal linked log buttons'
)
journal = replace_once(
    journal,
    "  if (resourceDetails) card.appendChild(resourceDetails);\n  card.append(selectionDetails);\n",
    "  if (resourceDetails) card.appendChild(resourceDetails);\n"
    "  card.appendChild(linkedOperationLog.root);\n"
    "  card.append(selectionDetails);\n",
    'journal linked log panel append'
)
write('journal.js', journal)

css = read('journal.css')
css_add = """
.entry-operation-log { margin: 10px 0 4px; border: 1px solid #dfe5ec; border-radius: 8px; padding: 8px 10px; background: #fafbfd; }
.entry-operation-log-label { font: 600 12px/1.4 ui-monospace, Consolas, monospace; overflow-wrap: anywhere; color: #3c4043; }
.entry-operation-log-status { margin-top: 4px; color: #5f6368; font-size: 11px; overflow-wrap: anywhere; }
.entry-operation-log-json { margin: 8px 0 0; max-height: 420px; overflow: auto; padding: 10px; border-radius: 7px; background: #202124; color: #f1f3f4; font: 11px/1.4 ui-monospace, Consolas, monospace; white-space: pre-wrap; overflow-wrap: anywhere; }
.entry-operation-log-json.hidden { display: none; }
"""
if '.entry-operation-log {' not in css:
    css += css_add
write('journal.css', css)

# ---------------------------------------------------------------------------
# Deterministic regressions.
# ---------------------------------------------------------------------------
test147 = r'''const fs = require('fs');
const assert = require('assert');
const content = fs.readFileSync('content.js', 'utf8');
const worker = fs.readFileSync('service-worker.js', 'utf8');

assert(content.includes('function capturePageStructureDiagnostics('), 'page diagnostics collector must exist');
assert(content.includes("WEBCLIP_COLLECT_PRINT_DIAGNOSTICS"), 'post-print diagnostics RPC must exist');
assert(content.includes("lastBeforePrintDiagnostics"), 'beforeprint snapshot must be retained');
assert(content.includes("lastAfterPrintDiagnostics"), 'afterprint snapshot must be retained');
assert(content.includes("meta.pageAnalysis = capturePageStructureDiagnostics('prepared')"), 'prepared DOM must be captured before worker PDF request');
assert(content.includes('contentVisibility:'), 'diagnostics must capture content-visibility');
assert(content.includes('contain:'), 'diagnostics must capture CSS contain');
assert(content.includes('bodyIncluded:'), 'diagnostics must identify body selection');
assert(content.includes('textChars:'), 'diagnostics must capture bounded numeric text size rather than page text');

assert(worker.includes('const MAX_PAGE_ANALYSIS_JSON_CHARS = 48 * 1024;'), 'worker diagnostics must have hard JSON budget');
assert(worker.includes('function sanitizePageStructureDiagnostics('), 'content diagnostics need strict worker allowlist');
assert(worker.includes('function sanitizePrintStructureDiagnostics('), 'print snapshots need strict worker allowlist');
assert(worker.includes('async function collectPrintDiagnosticsForTab('), 'worker must collect before/after print snapshots');
assert(worker.includes("'page-analysis'"), 'OperationLog must contain page-analysis stage');
assert(worker.includes("'copy-save'"), 'OperationLog must contain copy-save stage');
assert((worker.match(/'page-analysis'/g) || []).length >= 2, 'local and Yandex PDF paths must log page-analysis');
assert((worker.match(/'copy-save'/g) || []).length >= 2, 'local and Yandex PDF paths must log copy-save');
assert(worker.includes('pdfBytes:'), 'copy-save stage must record generated PDF byte size');
console.log('P1-147 page/copy diagnostics regression PASS');
'''
write('project_tools/test_p1_147_page_copy_diagnostics.js', test147)

test148 = r'''const fs = require('fs');
const assert = require('assert');
const worker = fs.readFileSync('service-worker.js', 'utf8');
const journal = fs.readFileSync('journal.js', 'utf8');

assert(worker.includes("operationId: String(data.operationId || '').slice(0, MAX_OPERATION_ID_CHARS)"), 'durable journal data must preserve operationId');
assert(worker.includes("journalCreatedAt = 0, operationId = ''"), 'appendJournalEntry must accept exact operationId');
assert(worker.includes("operationId: String(operationId || '').slice(0, MAX_OPERATION_ID_CHARS)"), 'journal record must persist bounded operationId');
assert(worker.includes('const importedOperationIdRaw = String(raw.operationId || \'\').trim();'), 'journal import must explicitly sanitize operationId');

assert(journal.includes('function buildLinkedOperationLog(entry)'), 'Journal linked OperationLog UI must exist');
assert(journal.includes("{ type: 'WEBCLIP_OPERATION_LOG_GET', operationId: exactOperationId }"), 'Journal must fetch log by exact operationId');
assert(journal.includes("sendReadOnlyRuntimeMessage("), 'linked log reads must use bounded actual-settlement read RPC helper');
assert(journal.includes("makeButton('Показать лог'"), 'Journal must expose show-log action');
assert(journal.includes("makeButton('Копировать лог'"), 'Journal must expose copy-log action');
assert(journal.includes('WebClip не подбирает лог по имени файла или времени.'), 'old entries must not use fuzzy log matching');
assert(journal.includes("String(log.operationId || '') !== exactOperationId"), 'returned log identity must be verified');
console.log('P1-148 linked Journal OperationLog regression PASS');
'''
write('project_tools/test_p1_148_journal_linked_operation_log.js', test148)

# ---------------------------------------------------------------------------
# Registry / closure evidence.
# ---------------------------------------------------------------------------
priorities = read('project_docs/PRIORITIES_P0_P1_P2.md')
rows = """
| P1-147 | P1 | REGRESSION | PDF OperationLog получил bounded структурную диагностику `page-analysis` и `copy-save`: выбранные Include/Exclude, факт выбора `body`, геометрия, CSS display/visibility/content-visibility/contain/overflow, bounded ancestor chain, frame-depth, размеры документа и beforeprint/afterprint snapshots. Полный текст страницы в diagnostics не сохраняется; worker повторно allowlist-санитизирует payload и ограничивает его 48 KiB. |
| P1-148 | P1 | REGRESSION | Новые Journal entries сохраняют точный bounded `operationId` исходной операции через durable local/Yandex recovery checkpoints. Карточка Journal позволяет `Показать лог` и `Копировать лог` через bounded read-only `WEBCLIP_OPERATION_LOG_GET`; ответ дополнительно сверяется по exact operationId. Старые записи без operationId не связываются эвристически по имени/времени. |
"""
if '| P1-147 |' not in priorities:
    priorities += '\n' + rows
write('project_docs/PRIORITIES_P0_P1_P2.md', priorities)

readme = read('README.md')
if '### Diagnostic WIP — P1-147 / P1-148' not in readme:
    readme += """

### Diagnostic WIP — P1-147 / P1-148

PDF operations now record bounded `page-analysis` and `copy-save` structure diagnostics, including before/after-print snapshots, without recording full page text. New Journal entries retain their exact source `operationId`, and Journal cards can show or copy the associated sanitized OperationLog directly. This diagnostic build remains manifest 0.9.8; it is not the 0.9.9 release-QA gate.
"""
write('README.md', readme)

qa = read('QA_STATUS_0_9_9.md')
if '## 2026-08-25 — P1-147 / P1-148 diagnostic logging' not in qa:
    qa += """

## 2026-08-25 — P1-147 / P1-148 diagnostic logging

- Added bounded page/print structural diagnostics to PDF OperationLog (`page-analysis`, `copy-save`), including exact generated PDF byte size and beforeprint/afterprint snapshots.
- Added exact `operationId` linkage from newly saved Journal entries to sanitized OperationLog; Journal can show/copy the linked log.
- Old Journal entries without `operationId` remain supported and are never fuzzily matched to logs.
- Manifest remains 0.9.8. Real reproduction on `https://its.1c.ru/db/metod8dev/content/2334/hdoc` is intentionally delegated to the diagnostic pre-release/user repro.
"""
write('QA_STATUS_0_9_9.md', qa)

write('P1-147_CLOSURE.md', """# P1-147 closure — PDF page/copy structural diagnostics

Status: **REGRESSION**. Manifest remains **0.9.8 / Manifest V3**.

Every fresh page PDF operation records a bounded `page-analysis` event before Chromium PDF generation and a `copy-save` event after Chromium returns the PDF. Diagnostics contain structural/numeric signals only: selected Include/Exclude descriptors, exact `bodyIncluded`, frame depth, geometry, scroll sizes, computed display/visibility/opacity/position/overflow/content-visibility/contain/transform-presence, bounded ancestor chains, document/viewport dimensions, print-style/header state, and beforeprint/afterprint/post-print snapshots. Full page text is not logged; only numeric text character counts are retained. Content input is re-allowlisted in the service worker and capped at 48 KiB.

Dedicated regression: `project_tools/test_p1_147_page_copy_diagnostics.js`. Real `its.1c.ru` reproduction is the purpose of the requested diagnostic pre-release and remains user/browser evidence, not claimed by the deterministic gate.
""")

write('P1-148_CLOSURE.md', """# P1-148 closure — linked OperationLog in Journal

Status: **REGRESSION**. Manifest remains **0.9.8 / Manifest V3**.

New local/Yandex Journal entries persist the exact bounded `operationId` of their originating save through the existing durable recovery checkpoints. Journal cards expose `Показать лог` and `Копировать лог`; reads use the existing bounded/single-flight read-only runtime RPC and verify that the returned OperationLog has exactly the requested ID. Old/imported entries without an ID are displayed as unlinked and are never matched by filename, timestamp, URL or other heuristics. The OperationLog remains sanitized by the existing OperationLog boundary and subject to its configured retention.

Dedicated regression: `project_tools/test_p1_148_journal_linked_operation_log.js`.
""")

print('P1-147/P1-148 patch applied')
