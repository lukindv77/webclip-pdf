from pathlib import Path
import re

ROOT = Path('.')
content_path = ROOT / 'content.js'
worker_path = ROOT / 'service-worker.js'
content = content_path.read_text(encoding='utf-8')
worker = worker_path.read_text(encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 anchor, got {count}')
    return text.replace(old, new, 1)

# --- content.js ---
content = replace_once(
    content,
    "  const FRAME_CHAIN_ATTR = 'data-webclip-pdf-frame-chain';\n",
    "  const FRAME_CHAIN_ATTR = 'data-webclip-pdf-frame-chain';\n"
    "  const FLATTENED_FRAME_ATTR = 'data-webclip-pdf-flattened-frame';\n"
    "  const FLATTENED_FRAME_MAX_STYLED_ELEMENTS = 2500;\n"
    "  const FLATTENED_FRAME_STYLE_PROPERTIES = Object.freeze([\n"
    "    'display', 'float', 'clear', 'box-sizing',\n"
    "    'margin-top', 'margin-right', 'margin-bottom', 'margin-left',\n"
    "    'padding-top', 'padding-right', 'padding-bottom', 'padding-left',\n"
    "    'border-top-width', 'border-right-width', 'border-bottom-width', 'border-left-width',\n"
    "    'border-top-style', 'border-right-style', 'border-bottom-style', 'border-left-style',\n"
    "    'border-top-color', 'border-right-color', 'border-bottom-color', 'border-left-color',\n"
    "    'border-radius', 'font-family', 'font-size', 'font-weight', 'font-style', 'line-height',\n"
    "    'color', 'text-align', 'text-decoration-line', 'text-decoration-color', 'text-decoration-style',\n"
    "    'text-indent', 'text-transform', 'white-space', 'word-break', 'overflow-wrap', 'letter-spacing',\n"
    "    'vertical-align', 'list-style-type', 'list-style-position', 'background-color', 'background-image',\n"
    "    'background-repeat', 'background-position', 'background-size', 'border-collapse', 'border-spacing',\n"
    "    'table-layout', 'caption-side'\n"
    "  ]);\n",
    'flatten constants'
)

content = replace_once(
    content,
    "    lastAfterPrintDiagnostics: null,\n    lastFramePrintMeasurements: []\n",
    "    lastAfterPrintDiagnostics: null,\n"
    "    lastFramePrintMeasurements: [],\n"
    "    flattenedFramePrintProxies: [],\n"
    "    lastFlattenedFrameDiagnostics: []\n",
    'flatten state'
)

flatten_helpers = r'''
  function frameDepthForPrintProxy(frame) {
    try {
      const child = frame?.contentDocument;
      if (!child) return 0;
      return Math.max(1, getFrameChainForDocument(child).length);
    } catch (_) {
      return 0;
    }
  }

  function selectedBodyForSameOriginFrame(frame) {
    let childDoc = null;
    try { childDoc = frame?.contentDocument || null; } catch (_) { childDoc = null; }
    if (!childDoc?.body) return null;
    for (const include of state.includes.values()) {
      if (include === childDoc.body) return childDoc.body;
    }
    return null;
  }

  function copyFrameCloneUrlState(source, target) {
    const tag = String(source?.localName || '').toLowerCase();
    try {
      if (tag === 'a' && source.href) target.setAttribute('href', String(source.href).slice(0, PDF_RESOURCE_URL_MAX_CHARS));
      if (tag === 'img') {
        const src = source.currentSrc || source.src || '';
        if (src) target.setAttribute('src', String(src).slice(0, PDF_RESOURCE_URL_MAX_CHARS));
        target.removeAttribute('srcset');
        target.removeAttribute('loading');
        target.style.setProperty('max-width', '100%', 'important');
        target.style.setProperty('height', 'auto', 'important');
      }
      if ((tag === 'video' || tag === 'audio' || tag === 'source') && source.src) {
        target.setAttribute('src', String(source.src).slice(0, PDF_RESOURCE_URL_MAX_CHARS));
      }
      if (tag === 'video' && source.poster) target.setAttribute('poster', String(source.poster).slice(0, PDF_RESOURCE_URL_MAX_CHARS));
    } catch (_) {}
  }

  function copyComputedFrameCloneStyle(source, target) {
    if (!source || !target?.style) return false;
    let computed = null;
    try { computed = source.ownerDocument?.defaultView?.getComputedStyle(source) || null; } catch (_) { computed = null; }
    if (!computed) return false;
    for (const property of FLATTENED_FRAME_STYLE_PROPERTIES) {
      try {
        const value = computed.getPropertyValue(property);
        if (value) target.style.setProperty(property, value, 'important');
      } catch (_) {}
    }
    // The proxy must participate in normal paginated flow. Do not preserve
    // clipping/contain/transform/fixed positioning from the embedded viewport.
    try {
      const position = String(computed.position || '').toLowerCase();
      if (position === 'fixed' || position === 'sticky' || position === 'absolute') {
        target.style.setProperty('position', 'static', 'important');
        target.style.setProperty('inset', 'auto', 'important');
      }
      target.style.setProperty('max-height', 'none', 'important');
      target.style.setProperty('min-height', '0', 'important');
      target.style.setProperty('transform', 'none', 'important');
      target.style.setProperty('contain', 'none', 'important');
      target.style.setProperty('content-visibility', 'visible', 'important');
    } catch (_) {}
    copyFrameCloneUrlState(source, target);
    return true;
  }

  function createFlattenedBodyFramePrintProxy(frame, sourceBody) {
    const ownerDoc = frame?.ownerDocument;
    if (!ownerDoc?.createElement || !sourceBody?.cloneNode || !frame?.parentNode) return null;

    const proxy = ownerDoc.createElement('section');
    proxy.setAttribute(FLATTENED_FRAME_ATTR, '1');
    proxy.setAttribute('data-webclip-frame-depth', String(frameDepthForPrintProxy(frame)));
    try {
      if (sourceBody.className) proxy.className = String(sourceBody.className);
      if (sourceBody.getAttribute?.('dir')) proxy.setAttribute('dir', sourceBody.getAttribute('dir'));
      if (sourceBody.getAttribute?.('lang')) proxy.setAttribute('lang', sourceBody.getAttribute('lang'));
    } catch (_) {}

    for (const node of [...sourceBody.childNodes]) {
      try { proxy.appendChild(node.cloneNode(true)); } catch (_) {}
    }

    const sourceElements = [sourceBody, ...sourceBody.querySelectorAll('*')];
    const targetElements = [proxy, ...proxy.querySelectorAll('*')];
    const cloneElementCount = targetElements.length;
    const styleLimit = Math.min(sourceElements.length, targetElements.length, FLATTENED_FRAME_MAX_STYLED_ELEMENTS);
    let styledElementCount = 0;
    for (let index = 0; index < styleLimit; index += 1) {
      const target = targetElements[index];
      try { target.setAttribute(FLATTENED_FRAME_ATTR, '1'); } catch (_) {}
      if (copyComputedFrameCloneStyle(sourceElements[index], target)) styledElementCount += 1;
    }
    // Even beyond the computed-style budget, keep descendants visible to the
    // top-document selection stylesheet. Browser default styles are safer than
    // silently dropping the tail of a large document.
    for (let index = styleLimit; index < targetElements.length; index += 1) {
      try { targetElements[index].setAttribute(FLATTENED_FRAME_ATTR, '1'); } catch (_) {}
    }

    let removedScripts = 0;
    for (const script of [...proxy.querySelectorAll('script')]) {
      try { script.remove(); removedScripts += 1; } catch (_) {}
    }
    let removedExcludes = 0;
    for (const excluded of [...proxy.querySelectorAll(`[${EXCLUDE_ATTR}]`)]) {
      try { excluded.remove(); removedExcludes += 1; } catch (_) {}
    }

    proxy.style.setProperty('display', 'block', 'important');
    proxy.style.setProperty('position', 'static', 'important');
    proxy.style.setProperty('width', '100%', 'important');
    proxy.style.setProperty('max-width', '100%', 'important');
    proxy.style.setProperty('height', 'auto', 'important');
    proxy.style.setProperty('max-height', 'none', 'important');
    proxy.style.setProperty('overflow', 'visible', 'important');
    proxy.style.setProperty('contain', 'none', 'important');
    proxy.style.setProperty('transform', 'none', 'important');
    proxy.style.setProperty('break-inside', 'auto', 'important');
    proxy.style.setProperty('page-break-inside', 'auto', 'important');

    frame.parentNode.insertBefore(proxy, frame);
    // P1-149 already snapshotted this frame's original inline style. Hide only
    // the replaced iframe box; the flattened proxy now carries printable flow.
    frame.style.setProperty('display', 'none', 'important');

    let sourceTextChars = 0;
    try { sourceTextChars = String(sourceBody.innerText || sourceBody.textContent || '').length; } catch (_) {}
    return {
      frame,
      proxy,
      diagnostics: {
        mode: 'same-origin-body-proxy',
        depth: frameDepthForPrintProxy(frame),
        sameOrigin: true,
        sourceTextChars: Math.max(0, sourceTextChars),
        cloneElementCount: Math.max(0, cloneElementCount),
        styledElementCount: Math.max(0, styledElementCount),
        removedScripts: Math.max(0, removedScripts),
        removedExcludes: Math.max(0, removedExcludes),
        styleBudgetTruncated: cloneElementCount > FLATTENED_FRAME_MAX_STYLED_ELEMENTS
      }
    };
  }

  function flattenSelectedSameOriginBodyFramesForPrint() {
    state.flattenedFramePrintProxies = [];
    state.lastFlattenedFrameDiagnostics = [];
    const unique = new Set();
    for (const item of state.changedFrameStyles || []) {
      const frame = item?.kind === 'frame' ? item.element : null;
      if (!frame || frame.isConnected === false || unique.has(frame)) continue;
      unique.add(frame);
      const selectedBody = selectedBodyForSameOriginFrame(frame);
      if (!selectedBody) continue;
      let created = null;
      try { created = createFlattenedBodyFramePrintProxy(frame, selectedBody); } catch (_) { created = null; }
      if (!created) continue;
      state.flattenedFramePrintProxies.push(created);
      state.lastFlattenedFrameDiagnostics.push(created.diagnostics);
    }
    state.lastFlattenedFrameDiagnostics = state.lastFlattenedFrameDiagnostics.slice(0, PAGE_DIAGNOSTICS_MAX_SELECTION_ITEMS);
    return state.flattenedFramePrintProxies.length;
  }

'''
anchor = "  function stabilizeSelectedFramePrintHeights(reason = 'prepared') {\n"
if content.count(anchor) != 1:
    raise SystemExit(f'flatten helper anchor count={content.count(anchor)}')
content = content.replace(anchor, flatten_helpers + anchor, 1)

content = replace_once(
    content,
    "      if (!frame || frame.isConnected === false || unique.has(frame)) continue;\n",
    "      if (!frame || frame.isConnected === false || unique.has(frame)) continue;\n"
    "      if ((state.flattenedFramePrintProxies || []).some((item) => item?.frame === frame)) continue;\n",
    'skip flattened frame stabilization'
)

content = replace_once(
    content,
    "    stabilizeSelectedFramePrintHeights('prepared');\n\n    meta.pageAnalysis = capturePageStructureDiagnostics('prepared');\n",
    "    stabilizeSelectedFramePrintHeights('prepared');\n"
    "    flattenSelectedSameOriginBodyFramesForPrint();\n\n"
    "    meta.pageAnalysis = capturePageStructureDiagnostics('prepared');\n",
    'flatten prepared call'
)

old_selector = "body *:not(#${PRINT_HEADER_ID}):not(#${PRINT_HEADER_ID} *):not([${INCLUDE_ATTR}]):not([${INCLUDE_ATTR}] *):not(:has([${INCLUDE_ATTR}])):not([${FRAME_INCLUDE_ATTR}]):not(:has([${FRAME_INCLUDE_ATTR}])) {"
new_selector = "body *:not(#${PRINT_HEADER_ID}):not(#${PRINT_HEADER_ID} *):not([${INCLUDE_ATTR}]):not([${INCLUDE_ATTR}] *):not(:has([${INCLUDE_ATTR}])):not([${FRAME_INCLUDE_ATTR}]):not(:has([${FRAME_INCLUDE_ATTR}])):not([${FLATTENED_FRAME_ATTR}]) {"
content = replace_once(content, old_selector, new_selector, 'flatten print visibility selector')

# Add flattened-frame diagnostics after frameMeasurements.
pattern = re.compile(r"(\s+frameMeasurements: \(state\.lastFramePrintMeasurements \|\| \[\]\)\.slice\(0, PAGE_DIAGNOSTICS_MAX_SELECTION_ITEMS\)\.map\(\(item\) => \(\{.*?\n\s+appliedHeight: Math\.max\(0, Number\(item\?\.appliedHeight\) \|\| 0\)\n\s+\}\)\))(\n\s+\}\n\s+\};)", re.S)
match = pattern.search(content)
if not match:
    raise SystemExit('capture diagnostics frameMeasurements block not found')
replacement = match.group(1) + ",\n        flattenedFrames: (state.lastFlattenedFrameDiagnostics || []).slice(0, PAGE_DIAGNOSTICS_MAX_SELECTION_ITEMS).map((item) => ({\n          mode: String(item?.mode || '').slice(0, 48),\n          depth: Math.max(0, Number(item?.depth) || 0),\n          sameOrigin: Boolean(item?.sameOrigin),\n          sourceTextChars: Math.max(0, Number(item?.sourceTextChars) || 0),\n          cloneElementCount: Math.max(0, Number(item?.cloneElementCount) || 0),\n          styledElementCount: Math.max(0, Number(item?.styledElementCount) || 0),\n          removedScripts: Math.max(0, Number(item?.removedScripts) || 0),\n          removedExcludes: Math.max(0, Number(item?.removedExcludes) || 0),\n          styleBudgetTruncated: Boolean(item?.styleBudgetTruncated)\n        }))" + match.group(2)
content = content[:match.start()] + replacement + content[match.end():]

restore_anchor = "    // Временную нормализацию выбранных iframe/ancestor chain откатываем\n"
if content.count(restore_anchor) != 1:
    raise SystemExit(f'restore anchor count={content.count(restore_anchor)}')
restore_block = "    // Flattened same-origin frame proxies are print-only DOM. Remove them\n    // before restoring the exact P1-149 frame/ancestor inline-style snapshots.\n    for (const item of [...(state.flattenedFramePrintProxies || [])].reverse()) {\n      try { item?.proxy?.remove(); } catch (_) {}\n    }\n    state.flattenedFramePrintProxies = [];\n    state.lastFlattenedFrameDiagnostics = [];\n\n"
content = content.replace(restore_anchor, restore_block + restore_anchor, 1)

# --- service-worker.js: allowlist the new bounded diagnostics ---
worker_anchor = "        appliedHeight: pageDiagnosticCount(item?.appliedHeight, 200000)\n      }))"
if worker.count(worker_anchor) != 1:
    raise SystemExit(f'worker frameMeasurements anchor count={worker.count(worker_anchor)}')
worker = worker.replace(
    worker_anchor,
    worker_anchor + ",\n      flattenedFrames: (Array.isArray(print.flattenedFrames) ? print.flattenedFrames : []).slice(0, MAX_PAGE_ANALYSIS_ITEMS).map((item) => ({\n        mode: pageDiagnosticString(item?.mode, 48),\n        depth: pageDiagnosticCount(item?.depth, 32),\n        sameOrigin: Boolean(item?.sameOrigin),\n        sourceTextChars: pageDiagnosticCount(item?.sourceTextChars, 100000000),\n        cloneElementCount: pageDiagnosticCount(item?.cloneElementCount, 100000),\n        styledElementCount: pageDiagnosticCount(item?.styledElementCount, 100000),\n        removedScripts: pageDiagnosticCount(item?.removedScripts, 100000),\n        removedExcludes: pageDiagnosticCount(item?.removedExcludes, 100000),\n        styleBudgetTruncated: Boolean(item?.styleBudgetTruncated)\n      }))",
    1
)

content_path.write_text(content, encoding='utf-8')
worker_path.write_text(worker, encoding='utf-8')

# Dedicated regression contract.
test = r'''const fs = require('fs');
const assert = require('assert');

const content = fs.readFileSync('content.js', 'utf8');
const worker = fs.readFileSync('service-worker.js', 'utf8');

assert(content.includes("const FLATTENED_FRAME_ATTR = 'data-webclip-pdf-flattened-frame';"));
assert(content.includes('function flattenSelectedSameOriginBodyFramesForPrint()'));
assert(content.includes('function createFlattenedBodyFramePrintProxy(frame, sourceBody)'));
assert(content.includes("mode: 'same-origin-body-proxy'"));
assert(content.includes("frame.style.setProperty('display', 'none', 'important')"));
assert(content.includes("proxy.style.setProperty('break-inside', 'auto', 'important')"));
assert(content.includes('flattenSelectedSameOriginBodyFramesForPrint();'));
assert(content.includes(':not([${FLATTENED_FRAME_ATTR}])'));
assert(content.includes('item?.proxy?.remove()'));
assert(content.includes('FLATTENED_FRAME_MAX_STYLED_ELEMENTS = 2500'));
assert(content.includes("proxy.querySelectorAll('script')"));
assert(content.includes('proxy.querySelectorAll(`[${EXCLUDE_ATTR}]`)'));
assert(content.includes('styleBudgetTruncated'));
assert(worker.includes('flattenedFrames: (Array.isArray(print.flattenedFrames)'));
assert(worker.includes('sourceTextChars: pageDiagnosticCount(item?.sourceTextChars'));
assert(worker.includes('styleBudgetTruncated: Boolean(item?.styleBudgetTruncated)'));

// P1-150 remains as a fallback for selected frames that are not flattened.
assert(content.includes('stabilizeSelectedFramePrintHeights'));
// Exact P1-149 rollback remains intact after proxy removal.
assert(content.includes('restoreFramePrintMutation(item)'));

console.log('P1-151 same-origin selected-body iframe flattening regression PASS');
'''
(ROOT / 'project_tools' / 'test_p1_151_iframe_flatten_print.js').write_text(test, encoding='utf-8')

closure = '''# P1-151 closure — flatten same-origin selected iframe body into paginatable print flow\n\nStatus: **REGRESSION**. Manifest remains **0.9.8 / Manifest V3**.\n\nReal `its.1c.ru` evidence after P1-150 proved that height alone cannot close the issue: the selected iframe was measured at 1379 px and expanded to 1427 px, while the top body grew to 1763 px, yet Chromium still emitted a one-page PDF ending after the second example. Scrolling to the bottom did not change output. This identifies the remaining boundary as Chromium pagination of the iframe replaced element, not viewport visibility or height estimation.\n\nFor a same-origin iframe whose selected Include is its `body`, `content.js` now creates a temporary top-document flattened print proxy. The body subtree is cloned into ordinary DOM, scripts and Exclude subtrees are removed, URLs are absolutized from live DOM properties, and a bounded set of print-relevant computed styles is copied for up to 2500 elements. Every proxy element carries a dedicated print marker so the top selection stylesheet keeps it visible. The original iframe is hidden only after P1-149 has snapshotted its inline style. Ordinary DOM in the proxy can fragment across A4 pages; it is not a replaced iframe box.\n\nAfter PDF generation all proxies are removed before the existing exact P1-149 frame/ancestor rollback. P1-150 height stabilization remains as fallback for selected frames not eligible for flattening. OperationLog adds bounded `print.flattenedFrames` diagnostics (mode/depth/text chars/clone and styled element counts/removal counts/style-budget truncation) inside the existing 48 KiB sanitizer budget.\n\nDedicated deterministic contract: `project_tools/test_p1_151_iframe_flatten_print.js`. Real `its.1c.ru` multi-page output remains required browser evidence and is not claimed by deterministic CI.\n'''
(ROOT / 'P1-151_CLOSURE.md').write_text(closure, encoding='utf-8')

# Append docs only once.
registry = ROOT / 'project_docs' / 'PRIORITIES_P0_P1_P2.md'
rtext = registry.read_text(encoding='utf-8')
row = "| P1-151 | P1 | REGRESSION | Same-origin iframe с выбранным `body` перед PDF разворачивается во временный top-document flattened print proxy: scripts/Exclude удаляются, bounded computed styles/URL state переносятся, оригинальный iframe скрывается только на время print, proxy штатно фрагментируется между A4-страницами и затем удаляется до exact P1-149 rollback. P1-150 остаётся fallback для неflattened frames; OperationLog пишет bounded `print.flattenedFrames`. |"
if 'P1-151 |' not in rtext:
    rtext = rtext.rstrip() + '\n' + row + '\n'
registry.write_text(rtext, encoding='utf-8')

readme = ROOT / 'README.md'
text = readme.read_text(encoding='utf-8')
if 'P1-151' not in text:
    text += "\n### Diagnostic WIP — P1-151\n\nReal its.1c.ru retest showed that a correctly sized selected iframe is still clipped as a replaced print element. Same-origin body selections are now flattened into a temporary paginatable top-document proxy with bounded style transfer and exact rollback.\n"
readme.write_text(text, encoding='utf-8')

qa = ROOT / 'QA_STATUS_0_9_9.md'
text = qa.read_text(encoding='utf-8')
if 'P1-151' not in text:
    text += "\n## 2026-08-25 — P1-151\n\n- REGRESSION: same-origin selected-body iframe is flattened into ordinary top-document print flow so Chromium can paginate it across pages.\n- Deterministic source contract added; real its.1c.ru output remains required browser QA.\n"
qa.write_text(text, encoding='utf-8')

print('P1-151 patch applied')
