from pathlib import Path
import re

BASE_SHA = 'ff0f712abb3c9b484312105c61a0bc6068a959f6'

content_path = Path('content.js')
worker_path = Path('service-worker.js')
registry_path = Path('project_docs/PRIORITIES_P0_P1_P2.md')
readme_path = Path('README.md')
qa_path = Path('QA_STATUS_0_9_9.md')

content = content_path.read_text(encoding='utf-8')
worker = worker_path.read_text(encoding='utf-8')
registry = registry_path.read_text(encoding='utf-8')
readme = readme_path.read_text(encoding='utf-8')
qa = qa_path.read_text(encoding='utf-8')

# P1-153: make the top document itself participate in an unconstrained paginated flow.
old_css = """        html, body { background: #fff !important; overflow: visible !important; }\n        body { display: block !important; height: auto !important; max-height: none !important; }"""
new_css = """        html, body {
          background: #fff !important;
          overflow: visible !important;
          position: static !important;
          width: auto !important;
          min-width: 0 !important;
          max-width: none !important;
          height: auto !important;
          min-height: 0 !important;
          max-height: none !important;
          inset: auto !important;
          float: none !important;
          contain: none !important;
          content-visibility: visible !important;
          transform: none !important;
          clip: auto !important;
          clip-path: none !important;
        }
        html { display: block !important; }
        body { display: block !important; }"""
if content.count(old_css) != 1:
    raise SystemExit(f'P1-153 CSS anchor count={content.count(old_css)}')
content = content.replace(old_css, new_css, 1)

# Permanent bounded root-layout diagnostics.
marker = "  function capturePageStructureDiagnostics(phase = 'page') {"
if content.count(marker) != 1:
    raise SystemExit(f'P1-153 capture marker count={content.count(marker)}')
root_helper = r'''  function diagnosticRootLayoutSnapshot(element) {
    if (!element) return null;
    let style = null;
    try { style = (element.ownerDocument?.defaultView || window).getComputedStyle(element); } catch (_) { style = null; }
    let rect = null;
    try { rect = element.getBoundingClientRect(); } catch (_) { rect = null; }
    const boundedNumber = (value) => Math.max(-100_000_000, Math.min(100_000_000, Number(value) || 0));
    const transform = diagnosticBoundedString(style?.transform || '', 160);
    return {
      tag: diagnosticBoundedString(element.localName || '', 16),
      style: {
        display: diagnosticBoundedString(style?.display || '', 80),
        position: diagnosticBoundedString(style?.position || '', 80),
        width: diagnosticBoundedString(style?.width || '', 120),
        minWidth: diagnosticBoundedString(style?.minWidth || '', 120),
        maxWidth: diagnosticBoundedString(style?.maxWidth || '', 120),
        height: diagnosticBoundedString(style?.height || '', 120),
        minHeight: diagnosticBoundedString(style?.minHeight || '', 120),
        maxHeight: diagnosticBoundedString(style?.maxHeight || '', 120),
        overflowX: diagnosticBoundedString(style?.overflowX || '', 80),
        overflowY: diagnosticBoundedString(style?.overflowY || '', 80),
        contain: diagnosticBoundedString(style?.contain || '', 160),
        contentVisibility: diagnosticBoundedString(style?.contentVisibility || '', 80),
        transform: !transform || transform === 'none' ? 'none' : 'present',
        top: diagnosticBoundedString(style?.top || '', 120),
        right: diagnosticBoundedString(style?.right || '', 120),
        bottom: diagnosticBoundedString(style?.bottom || '', 120),
        left: diagnosticBoundedString(style?.left || '', 120),
        clipPath: diagnosticBoundedString(style?.clipPath || '', 160)
      },
      rect: rect ? {
        width: boundedNumber(rect.width),
        height: boundedNumber(rect.height),
        top: boundedNumber(rect.top),
        right: boundedNumber(rect.right),
        bottom: boundedNumber(rect.bottom),
        left: boundedNumber(rect.left)
      } : null,
      scrollWidth: boundedNumber(element.scrollWidth),
      scrollHeight: boundedNumber(element.scrollHeight),
      clientWidth: boundedNumber(element.clientWidth),
      clientHeight: boundedNumber(element.clientHeight),
      offsetWidth: boundedNumber(element.offsetWidth),
      offsetHeight: boundedNumber(element.offsetHeight)
    };
  }

'''
content = content.replace(marker, root_helper + marker, 1)

# Extend the document diagnostics without replacing existing fields.
viewport_pat = re.compile(r"(\s+viewportWidth:\s*Math\.max\([^\n]+\),\n\s+viewportHeight:\s*Math\.max\([^\n]+\))(\n\s*\})")
m = viewport_pat.search(content)
if not m:
    raise SystemExit('P1-153 viewport diagnostics anchor not found')
replacement = m.group(1) + ",\n        rootLayout: {\n          html: diagnosticRootLayoutSnapshot(docEl),\n          body: diagnosticRootLayoutSnapshot(body)\n        }" + m.group(2)
content = content[:m.start()] + replacement + content[m.end():]

# Service-worker sanitizer for the permanent root diagnostics.
worker_marker = 'function sanitizePageStructureDiagnostics(rawDiagnostics) {'
if worker.count(worker_marker) != 1:
    raise SystemExit(f'P1-153 worker sanitizer marker count={worker.count(worker_marker)}')
worker_helper = r'''function sanitizePageDiagnosticRootLayout(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const style = raw.style && typeof raw.style === 'object' && !Array.isArray(raw.style) ? raw.style : {};
  const rect = raw.rect && typeof raw.rect === 'object' && !Array.isArray(raw.rect) ? raw.rect : null;
  return {
    tag: pageDiagnosticString(raw.tag, 16),
    style: {
      display: pageDiagnosticString(style.display, 80),
      position: pageDiagnosticString(style.position, 80),
      width: pageDiagnosticString(style.width, 120),
      minWidth: pageDiagnosticString(style.minWidth, 120),
      maxWidth: pageDiagnosticString(style.maxWidth, 120),
      height: pageDiagnosticString(style.height, 120),
      minHeight: pageDiagnosticString(style.minHeight, 120),
      maxHeight: pageDiagnosticString(style.maxHeight, 120),
      overflowX: pageDiagnosticString(style.overflowX, 80),
      overflowY: pageDiagnosticString(style.overflowY, 80),
      contain: pageDiagnosticString(style.contain, 160),
      contentVisibility: pageDiagnosticString(style.contentVisibility, 80),
      transform: style.transform === 'present' ? 'present' : 'none',
      top: pageDiagnosticString(style.top, 120),
      right: pageDiagnosticString(style.right, 120),
      bottom: pageDiagnosticString(style.bottom, 120),
      left: pageDiagnosticString(style.left, 120),
      clipPath: pageDiagnosticString(style.clipPath, 160)
    },
    rect: rect ? {
      width: pageDiagnosticCount(rect.width),
      height: pageDiagnosticCount(rect.height),
      top: pageDiagnosticCount(rect.top),
      right: pageDiagnosticCount(rect.right),
      bottom: pageDiagnosticCount(rect.bottom),
      left: pageDiagnosticCount(rect.left)
    } : null,
    scrollWidth: pageDiagnosticCount(raw.scrollWidth),
    scrollHeight: pageDiagnosticCount(raw.scrollHeight),
    clientWidth: pageDiagnosticCount(raw.clientWidth),
    clientHeight: pageDiagnosticCount(raw.clientHeight),
    offsetWidth: pageDiagnosticCount(raw.offsetWidth),
    offsetHeight: pageDiagnosticCount(raw.offsetHeight)
  };
}

'''
worker = worker.replace(worker_marker, worker_helper + worker_marker, 1)

# Add rootLayout into safe.document after viewportHeight. Keep sanitizer bounded.
worker_viewport_pat = re.compile(r"(\s+viewportWidth:\s*pageDiagnosticCount\(doc\.viewportWidth[^\n]*\),\n\s+viewportHeight:\s*pageDiagnosticCount\(doc\.viewportHeight[^\n]*\))(\n\s*\})")
wm = worker_viewport_pat.search(worker)
if not wm:
    raise SystemExit('P1-153 worker viewport sanitizer anchor not found')
worker_repl = wm.group(1) + ",\n      rootLayout: {\n        html: sanitizePageDiagnosticRootLayout(doc?.rootLayout?.html),\n        body: sanitizePageDiagnosticRootLayout(doc?.rootLayout?.body)\n      }" + wm.group(2)
worker = worker[:wm.start()] + worker_repl + worker[wm.end():]

# Dedicated deterministic regression.
test_path = Path('project_tools/test_p1_153_root_print_flow.js')
test_path.write_text(r'''const assert = require('assert');
const fs = require('fs');

const content = fs.readFileSync('content.js', 'utf8');
const worker = fs.readFileSync('service-worker.js', 'utf8');

for (const contract of [
  'function diagnosticRootLayoutSnapshot(element)',
  'rootLayout: {',
  'html: diagnosticRootLayoutSnapshot(docEl)',
  'body: diagnosticRootLayoutSnapshot(body)',
  'height: auto !important;',
  'min-height: 0 !important;',
  'max-height: none !important;',
  'position: static !important;',
  'overflow: visible !important;',
  'contain: none !important;',
  'content-visibility: visible !important;',
  'transform: none !important;',
  'clip-path: none !important;'
]) assert(content.includes(contract), `missing content contract: ${contract}`);

assert(/html, body\s*\{[\s\S]*?height:\s*auto !important;[\s\S]*?contain:\s*none !important;[\s\S]*?transform:\s*none !important;[\s\S]*?\}/.test(content), 'root normalization must apply to html and body');
assert(content.includes('for (const style of state.printStyles || [])'), 'print styles must still be removed during rollback');
assert(content.includes('try { style.remove(); } catch (_) {}'), 'print style rollback must remain exact/non-destructive');

for (const contract of [
  'function sanitizePageDiagnosticRootLayout(raw)',
  'html: sanitizePageDiagnosticRootLayout(doc?.rootLayout?.html)',
  'body: sanitizePageDiagnosticRootLayout(doc?.rootLayout?.body)',
  'width: pageDiagnosticString(style.width, 120)',
  'height: pageDiagnosticString(style.height, 120)',
  'scrollHeight: pageDiagnosticCount(raw.scrollHeight)'
]) assert(worker.includes(contract), `missing worker sanitizer contract: ${contract}`);

console.log('P1-153 root document print-flow normalization/permanent diagnostics regression PASS');
''', encoding='utf-8')

closure = r'''# P1-153 Closure — root document print-flow normalization

Status: REGRESSION

## Problem
After P1-152 the selected same-origin iframe body is fully flattened into the top document, but the legacy page root can still remain viewport-height constrained. Real its.1c.ru evidence showed bodyScrollHeight larger than the viewport while documentScrollHeight remained exactly the viewport height, causing Chromium to emit a single clipped PDF page.

## Closure
- The injected print-only stylesheet now normalizes both `html` and `body` into an unconstrained static paginated flow: auto height/width, visible overflow, no contain/transform/clip/inset constraints.
- The normalization is print-preparation CSS only. Existing rollback removes the injected style node, restoring the site's original CSS/inline state without rewriting the page.
- OperationLog diagnostics are permanent product diagnostics, not temporary debug code.
- `pageAnalysis.document.rootLayout` now records bounded computed layout and geometry for both `html` and `body` before/during/after the Chromium print lifecycle.
- Service-worker sanitization explicitly bounds every new root-layout field before OperationLog persistence.

## Evidence
- Dedicated `project_tools/test_p1_153_root_print_flow.js` regression.
- Full JavaScript syntax and deterministic regression gate must pass before closure/release publication.
- Real unmanaged Chrome retest on `https://its.1c.ru/db/metod8dev/content/2334/hdoc` remains the final behavioral verification.
'''
Path('P1-153_CLOSURE.md').write_text(closure, encoding='utf-8')

registry_section = r'''

### P1-153 — REGRESSION — root document print-flow normalization
Real its.1c.ru diagnostics after P1-152 showed complete top-body flattening but `bodyScrollHeight > viewportHeight` while `documentScrollHeight == viewportHeight`. The print-only root CSS now normalizes `html/body` height/position/overflow/contain/transform/clip constraints so Chromium can paginate ordinary top-level flow. Permanent bounded OperationLog diagnostics record `document.rootLayout.html/body`; rollback remains style-node removal only. See `P1-153_CLOSURE.md`.
'''
if '### P1-153 — REGRESSION' not in registry:
    registry += registry_section

readme_section = r'''

### Audit WIP — P1-153
Selected iframe content that has already been flattened to the top document now also receives root `html/body` print-flow normalization. Permanent OperationLog page diagnostics include bounded root computed layout/geometry to diagnose future fixed-height/legacy print failures without a special debug build.
'''
if '### Audit WIP — P1-153' not in readme:
    readme += readme_section

qa_section = r'''

## 2026-08-25 — P1-153
- Root `html/body` print-flow normalization added for legacy viewport-height layouts after confirmed its.1c.ru clipping with a complete P1-152 flattened proxy.
- Permanent bounded OperationLog root diagnostics added; existing page/iframe diagnostics are retained.
- Real unmanaged Chrome its.1c.ru PDF pagination retest remains required.
'''
if '## 2026-08-25 — P1-153' not in qa:
    qa += qa_section

content_path.write_text(content, encoding='utf-8')
worker_path.write_text(worker, encoding='utf-8')
registry_path.write_text(registry, encoding='utf-8')
readme_path.write_text(readme, encoding='utf-8')
qa_path.write_text(qa, encoding='utf-8')
print('P1-153 patch applied')
