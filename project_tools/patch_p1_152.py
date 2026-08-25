from pathlib import Path

ROOT = Path('.')
content_path = ROOT / 'content.js'
worker_path = ROOT / 'service-worker.js'
priorities_path = ROOT / 'project_docs' / 'PRIORITIES_P0_P1_P2.md'
readme_path = ROOT / 'README.md'
qa_path = ROOT / 'QA_STATUS_0_9_9.md'

content = content_path.read_text(encoding='utf-8')
worker = worker_path.read_text(encoding='utf-8')
priorities = priorities_path.read_text(encoding='utf-8')
readme = readme_path.read_text(encoding='utf-8')
qa = qa_path.read_text(encoding='utf-8')


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected 1 anchor, got {count}')
    return text.replace(old, new, 1)

content = replace_once(
    content,
    "    if (!ownerDoc?.createElement || !sourceBody?.cloneNode || !frame?.parentNode) return null;\n",
    "    if (!ownerDoc?.createElement || !ownerDoc?.body || !sourceBody?.cloneNode || !frame?.parentNode) return null;\n",
    'top body guard'
)

content = replace_once(
    content,
    "    frame.parentNode.insertBefore(proxy, frame);\n    // P1-149 already snapshotted this frame's original inline style. Hide only\n    // the replaced iframe box; the flattened proxy now carries printable flow.\n",
    "    // Mount the flattened copy directly in the top document body rather than\n    // inside the site's iframe shell. Flex/grid/fixed-height/break rules on the\n    // original ancestor chain must not be able to make the proxy atomic or clip\n    // its pagination. The selected-only stylesheet hides the original shell.\n    ownerDoc.body.appendChild(proxy);\n    // P1-149 already snapshotted this frame's original inline style. Hide only\n    // the replaced iframe box; the top-level flattened proxy carries printable flow.\n",
    'top-level proxy mount'
)

content = replace_once(
    content,
    "        mode: 'same-origin-body-proxy',\n        depth: frameDepthForPrintProxy(frame),\n",
    "        mode: 'same-origin-body-proxy',\n        mount: 'top-document-body',\n        depth: frameDepthForPrintProxy(frame),\n",
    'proxy mount diagnostic'
)

content = replace_once(
    content,
    "          mode: String(item?.mode || '').slice(0, 48),\n          depth: Math.max(0, Number(item?.depth) || 0),\n",
    "          mode: String(item?.mode || '').slice(0, 48),\n          mount: String(item?.mount || '').slice(0, 48),\n          depth: Math.max(0, Number(item?.depth) || 0),\n",
    'content diagnostic allowlist'
)

worker = replace_once(
    worker,
    "        mode: pageDiagnosticString(item?.mode, 48),\n        depth: pageDiagnosticCount(item?.depth, 32),\n",
    "        mode: pageDiagnosticString(item?.mode, 48),\n        mount: pageDiagnosticString(item?.mount, 48),\n        depth: pageDiagnosticCount(item?.depth, 32),\n",
    'worker diagnostic allowlist'
)

closure = """# P1-152 closure — top-document mount for flattened iframe print proxy

Status: **REGRESSION**. Manifest remains **0.9.8 / Manifest V3**.

Real `its.1c.ru` evidence after P1-151 proved the flattening itself worked: the linked OperationLog recorded `same-origin-body-proxy`, all 118 cloned elements styled, no style-budget truncation, and the full 3321 source text characters were present. The resulting PDF nevertheless remained one page and stopped at the start of the third example. This means the proxy content was preserved but pagination was still constrained by the original site's iframe ancestor shell.

P1-152 mounts the temporary same-origin selected-body proxy directly under the top document `body`, outside the source iframe's flex/grid/fixed-height/break context. The original iframe remains hidden only for the PDF interval and P1-149 rollback still restores its exact inline state. The selected-only stylesheet already treats every flattened proxy element as printable, so hidden original page shells do not affect proxy layout. `print.flattenedFrames[].mount` records `top-document-body` for real-browser evidence.

Dedicated regression: `project_tools/test_p1_152_top_body_flatten_mount.js`. Real `its.1c.ru` output remains required browser evidence and is not claimed by deterministic CI.
"""
(ROOT / 'P1-152_CLOSURE.md').write_text(closure, encoding='utf-8')

if 'P1-152 | P1 | REGRESSION' not in priorities:
    priorities += "\n| P1-152 | P1 | REGRESSION | Flattened same-origin selected-body iframe proxy монтируется напрямую в top-document `body`, вне исходной iframe ancestor shell; flex/grid/fixed-height/break rules сайта больше не ограничивают пагинацию proxy. Исходный iframe скрывается только на время PDF и восстанавливается существующим exact rollback; OperationLog фиксирует `flattenedFrames[].mount=top-document-body`. |\n"
if 'P1-152 — top-document flattened iframe proxy mount' not in readme:
    readme += "\n### Audit WIP — P1-152 — top-document flattened iframe proxy mount\n\nReal its.1c.ru P1-151 evidence preserved the complete cloned body but Chromium still produced one clipped page. Flattened same-origin selected-body proxies now mount directly under the top document body, outside the source iframe layout shell, and record the mount in OperationLog.\n"
if 'P1-152' not in qa:
    qa += "\n## 2026-08-25 — P1-152\n\n- REGRESSION: flattened same-origin selected-body proxy mounts under top-document body, outside source iframe ancestor layout constraints.\n- Exact iframe rollback remains P1-149-owned; no scroll-position dependency.\n- Real its.1c.ru PDF remains required browser evidence.\n"

priorities_path.write_text(priorities, encoding='utf-8')
readme_path.write_text(readme, encoding='utf-8')
qa_path.write_text(qa, encoding='utf-8')
content_path.write_text(content, encoding='utf-8')
worker_path.write_text(worker, encoding='utf-8')

# Dedicated regression test.
test = r'''const fs = require('fs');
const assert = require('assert');

const content = fs.readFileSync('content.js', 'utf8');
const worker = fs.readFileSync('service-worker.js', 'utf8');

assert(content.includes("ownerDoc.body.appendChild(proxy);"), 'flatten proxy must mount directly under top document body');
assert(!content.includes('frame.parentNode.insertBefore(proxy, frame);'), 'flatten proxy must not remain inside source iframe shell');
assert(content.includes("!ownerDoc?.body"), 'flattening must fail closed when top body is unavailable');
assert(content.includes("mount: 'top-document-body'"), 'content diagnostics must record top-body mount');
assert(content.includes("mount: String(item?.mount || '').slice(0, 48)"), 'content diagnostics must bound mount');
assert(worker.includes("mount: pageDiagnosticString(item?.mount, 48)"), 'worker must allowlist/bound mount diagnostic');
assert(content.includes("frame.style.setProperty('display', 'none', 'important');"), 'original iframe must remain hidden during flattened print');
assert(content.includes('item?.proxy?.remove()'), 'temporary top-level proxies must be removed on rollback');
assert(content.includes('restoreFramePrintMutation(item);'), 'exact frame/ancestor rollback must remain intact');

console.log('P1-152 top-document flattened iframe proxy mount regression PASS');
'''
(ROOT / 'project_tools' / 'test_p1_152_top_body_flatten_mount.js').write_text(test, encoding='utf-8')
print('P1-152 patch applied')
