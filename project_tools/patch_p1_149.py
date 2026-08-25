from pathlib import Path


def replace_block(text, start_marker, end_marker, replacement, label):
    start = text.find(start_marker)
    if start < 0:
        raise RuntimeError(f'{label}: start marker not found')
    end = text.find(end_marker, start)
    if end < 0:
        raise RuntimeError(f'{label}: end marker not found')
    return text[:start] + replacement + text[end:]


def replace_once(text, old, new, label):
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f'{label}: expected 1 anchor, found {count}')
    return text.replace(old, new, 1)


root = Path('.')
content_path = root / 'content.js'
content = content_path.read_text(encoding='utf-8')

new_frame_block = r'''  function rememberFramePrintMutation(element, kind = 'chain') {
    if (!element || (state.changedFrameStyles || []).some((item) => item.element === element)) return null;
    const item = {
      element,
      kind: kind === 'frame' ? 'frame' : 'chain',
      oldStyle: element.getAttribute?.('style') ?? null,
      hadFrameInclude: Boolean(element.hasAttribute?.(FRAME_INCLUDE_ATTR)),
      oldFrameInclude: element.getAttribute?.(FRAME_INCLUDE_ATTR),
      hadFrameChain: Boolean(element.hasAttribute?.(FRAME_CHAIN_ATTR)),
      oldFrameChain: element.getAttribute?.(FRAME_CHAIN_ATTR)
    };
    state.changedFrameStyles.push(item);
    return item;
  }

  function applySelectedFramePrintFlow(element, kind = 'chain', contentHeight = 0) {
    if (!element?.style) return;
    let computed = null;
    try { computed = (element.ownerDocument?.defaultView || window).getComputedStyle(element); } catch (_) { computed = null; }
    const isFrame = kind === 'frame';
    const currentDisplay = String(computed?.display || '').trim();
    const currentOpacity = String(computed?.opacity || '').trim();
    element.style.setProperty('display', isFrame ? 'block' : (currentDisplay && currentDisplay !== 'none' ? currentDisplay : 'block'), 'important');
    element.style.setProperty('visibility', 'visible', 'important');
    element.style.setProperty('opacity', currentOpacity && currentOpacity !== '0' ? currentOpacity : '1', 'important');
    // Selected iframe content must participate in the top-level print flow.
    // Absolute/fixed/sticky frame shells can otherwise keep documentScrollHeight
    // at the viewport height and Chromium prints only the WebClip header.
    element.style.setProperty('position', 'static', 'important');
    element.style.setProperty('float', 'none', 'important');
    element.style.setProperty('inset', 'auto', 'important');
    element.style.setProperty('transform', 'none', 'important');
    element.style.setProperty('clip', 'auto', 'important');
    element.style.setProperty('clip-path', 'none', 'important');
    element.style.setProperty('contain', 'none', 'important');
    element.style.setProperty('content-visibility', 'visible', 'important');
    element.style.setProperty('overflow', 'visible', 'important');
    element.style.setProperty('overflow-x', 'visible', 'important');
    element.style.setProperty('overflow-y', 'visible', 'important');
    element.style.setProperty('max-height', 'none', 'important');
    element.style.setProperty('min-height', '0', 'important');
    element.style.setProperty('min-width', '0', 'important');
    if (isFrame) {
      const height = Math.max(0, Math.min(200000, Math.ceil(Number(contentHeight) || 0)));
      if (height > 0) element.style.setProperty('height', `${height + 4}px`, 'important');
      element.style.setProperty('width', '100%', 'important');
      element.style.setProperty('max-width', '100%', 'important');
      element.style.setProperty('box-sizing', 'border-box', 'important');
      element.style.setProperty('margin-left', '0', 'important');
      element.style.setProperty('margin-right', '0', 'important');
    } else {
      element.style.setProperty('height', 'auto', 'important');
    }
  }

  function restoreFramePrintMutation(item) {
    const element = item?.element;
    if (!element?.setAttribute) return;
    try {
      if (item.oldStyle == null) element.removeAttribute('style');
      else element.setAttribute('style', item.oldStyle);

      if (item.hadFrameInclude) element.setAttribute(FRAME_INCLUDE_ATTR, item.oldFrameInclude ?? '');
      else element.removeAttribute(FRAME_INCLUDE_ATTR);

      if (item.hadFrameChain) element.setAttribute(FRAME_CHAIN_ATTR, item.oldFrameChain ?? '');
      else element.removeAttribute(FRAME_CHAIN_ATTR);
    } catch (_) {}
  }

  function markFrameChainsForPrint() {
    state.changedFrameStyles = [];
    const frames = new Set();
    for (const include of state.includes.values()) {
      for (const frame of getFrameChainForDocument(include.ownerDocument)) frames.add(frame);
    }
    for (const remote of state.remoteFrames.values()) {
      if (!remoteFrameSnapshotCounts(remote).includes || !remote?.element?.isConnected) continue;
      frames.add(remote.element);
      for (const frame of getFrameChainForDocument(remote.element.ownerDocument)) frames.add(frame);
    }
    for (const frame of frames) {
      rememberFramePrintMutation(frame, 'frame');
      frame.setAttribute(FRAME_INCLUDE_ATTR, '1');
      let contentHeight = 0;
      try {
        const childDoc = frame.contentDocument;
        const remote = remoteFrameForElement(frame);
        contentHeight = Math.max(
          remote?.printHeight || 0,
          childDoc?.documentElement?.scrollHeight || 0,
          childDoc?.body?.scrollHeight || 0,
          frame.getBoundingClientRect().height || 0
        );
      } catch (_) {}
      applySelectedFramePrintFlow(frame, 'frame', contentHeight);

      let ancestor = frame.parentElement;
      while (ancestor && ancestor !== frame.ownerDocument.documentElement) {
        if (!(state.changedFrameStyles || []).some((item) => item.element === ancestor)) {
          rememberFramePrintMutation(ancestor, 'chain');
          ancestor.setAttribute(FRAME_CHAIN_ATTR, '1');
          applySelectedFramePrintFlow(ancestor, 'chain');
        } else if (!ancestor.hasAttribute(FRAME_CHAIN_ATTR)) {
          ancestor.setAttribute(FRAME_CHAIN_ATTR, '1');
        }
        ancestor = ancestor.parentElement;
      }
    }
  }

'''

content = replace_block(
    content,
    '  function markFrameChainsForPrint() {',
    '  function installPrintStylesForSelectionDocuments() {',
    new_frame_block,
    'frame print-flow block'
)

old_restore = r'''    // Временные изменения размеров iframe и служебные frame-маркеры откатываем.
    for (const item of [...(state.changedFrameStyles || [])].reverse()) {
      const el = item.element;
      if (!el?.isConnected) continue;
      try {
        el.removeAttribute(FRAME_INCLUDE_ATTR);
        el.removeAttribute(FRAME_CHAIN_ATTR);
        if (item.kind === 'frame') {
          if (item.oldStyle == null) el.removeAttribute('style');
          else el.setAttribute('style', item.oldStyle);
        }
      } catch (_) {}
    }
    state.changedFrameStyles = [];
'''
new_restore = r'''    // Временную нормализацию выбранных iframe/ancestor chain откатываем
    // строго к исходным inline style/служебным атрибутам.
    for (const item of [...(state.changedFrameStyles || [])].reverse()) {
      restoreFramePrintMutation(item);
    }
    state.changedFrameStyles = [];
'''
content = replace_once(content, old_restore, new_restore, 'restore frame print-flow')
content_path.write_text(content, encoding='utf-8')

# Dedicated P1-149 regression.
test = r'''const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const src = fs.readFileSync('content.js', 'utf8');
for (const needle of [
  'function rememberFramePrintMutation(',
  'function applySelectedFramePrintFlow(',
  'function restoreFramePrintMutation(',
  "element.style.setProperty('position', 'static', 'important')",
  "element.style.setProperty('content-visibility', 'visible', 'important')",
  "element.style.setProperty('clip-path', 'none', 'important')",
  "element.style.setProperty('width', '100%', 'important')",
  "rememberFramePrintMutation(frame, 'frame')",
  "applySelectedFramePrintFlow(frame, 'frame', contentHeight)",
  "rememberFramePrintMutation(ancestor, 'chain')",
  "restoreFramePrintMutation(item);"
]) assert(src.includes(needle), `missing P1-149 contract: ${needle}`);

function extractFunction(name) {
  const marker = `  function ${name}(`;
  const start = src.indexOf(marker);
  assert(start >= 0, `function ${name} not found`);
  let brace = src.indexOf('{', start);
  assert(brace >= 0, `function ${name} body not found`);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let i = brace; i < src.length; i += 1) {
    const ch = src[i];
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
      if (depth === 0) return src.slice(start, i + 1);
    }
  }
  throw new Error(`unterminated function ${name}`);
}

function fakeElement(styleAttr, computed = {}) {
  const attrs = new Map();
  if (styleAttr != null) attrs.set('style', styleAttr);
  const props = new Map();
  return {
    ownerDocument: { defaultView: { getComputedStyle: () => ({ display: 'block', opacity: '1', ...computed }) } },
    style: { setProperty: (name, value, priority) => props.set(name, { value, priority }) },
    attrs,
    props,
    getAttribute(name) { return attrs.has(name) ? attrs.get(name) : null; },
    hasAttribute(name) { return attrs.has(name); },
    setAttribute(name, value) { attrs.set(name, String(value)); },
    removeAttribute(name) { attrs.delete(name); }
  };
}

const sandbox = {
  state: { changedFrameStyles: [] },
  FRAME_INCLUDE_ATTR: 'data-webclip-pdf-frame-include',
  FRAME_CHAIN_ATTR: 'data-webclip-pdf-frame-chain',
  window: { getComputedStyle: () => ({ display: 'block', opacity: '1' }) },
  Math, Number, String, Boolean
};
vm.createContext(sandbox);
for (const name of ['rememberFramePrintMutation', 'applySelectedFramePrintFlow', 'restoreFramePrintMutation']) {
  vm.runInContext(extractFunction(name).replace(/^  /gm, ''), sandbox);
}

const frame = fakeElement('position:absolute;height:120px;overflow:hidden;transform:translateX(10px)', { display: 'inline', opacity: '0.8' });
frame.setAttribute(sandbox.FRAME_INCLUDE_ATTR, 'preexisting');
const receipt = sandbox.rememberFramePrintMutation(frame, 'frame');
assert(receipt && receipt.oldStyle.includes('position:absolute'));
frame.setAttribute(sandbox.FRAME_INCLUDE_ATTR, '1');
sandbox.applySelectedFramePrintFlow(frame, 'frame', 983);
assert.deepStrictEqual(frame.props.get('position'), { value: 'static', priority: 'important' });
assert.deepStrictEqual(frame.props.get('height'), { value: '987px', priority: 'important' });
assert.deepStrictEqual(frame.props.get('width'), { value: '100%', priority: 'important' });
assert.deepStrictEqual(frame.props.get('overflow'), { value: 'visible', priority: 'important' });
assert.deepStrictEqual(frame.props.get('transform'), { value: 'none', priority: 'important' });
assert.deepStrictEqual(frame.props.get('content-visibility'), { value: 'visible', priority: 'important' });
frame.setAttribute('style', 'mutated');
sandbox.restoreFramePrintMutation(receipt);
assert.strictEqual(frame.getAttribute('style'), 'position:absolute;height:120px;overflow:hidden;transform:translateX(10px)');
assert.strictEqual(frame.getAttribute(sandbox.FRAME_INCLUDE_ATTR), 'preexisting');
assert.strictEqual(frame.hasAttribute(sandbox.FRAME_CHAIN_ATTR), false);

const chain = fakeElement('position:fixed;max-height:400px;overflow:auto', { display: 'flex', opacity: '1' });
const chainReceipt = sandbox.rememberFramePrintMutation(chain, 'chain');
chain.setAttribute(sandbox.FRAME_CHAIN_ATTR, '1');
sandbox.applySelectedFramePrintFlow(chain, 'chain', 0);
assert.deepStrictEqual(chain.props.get('display'), { value: 'flex', priority: 'important' });
assert.deepStrictEqual(chain.props.get('position'), { value: 'static', priority: 'important' });
assert.deepStrictEqual(chain.props.get('height'), { value: 'auto', priority: 'important' });
assert.deepStrictEqual(chain.props.get('max-height'), { value: 'none', priority: 'important' });
chain.setAttribute('style', 'mutated-chain');
sandbox.restoreFramePrintMutation(chainReceipt);
assert.strictEqual(chain.getAttribute('style'), 'position:fixed;max-height:400px;overflow:auto');
assert.strictEqual(chain.hasAttribute(sandbox.FRAME_CHAIN_ATTR), false);

console.log('P1-149 selected iframe print-flow normalization/rollback regression PASS');
'''
(root / 'project_tools' / 'test_p1_149_iframe_print_flow.js').write_text(test, encoding='utf-8')

closure = '''# P1-149 closure — selected iframe print-flow normalization\n\nStatus: **REGRESSION**. Manifest remains **0.9.8 / Manifest V3**.\n\nReal diagnostic evidence from `its.1c.ru` showed the only Include was `body` inside a same-origin iframe (`frameDepth=1`, `topDocumentIncludeCount=0`), while the iframe body contained 3324 text chars / 983 px scroll height but the top print document stayed at viewport height. Chromium therefore produced a valid PDF containing only the WebClip header.\n\n`content.js` now snapshots each selected iframe/ancestor-chain inline `style` plus WebClip frame marker attributes, then temporarily normalizes that exact selected chain into normal print flow: frame and ancestors become `position:static`, clipping/contain/transform are neutralized, overflow becomes visible, content-visibility is forced visible, the frame becomes block-level with its measured document height and bounded full width. Ancestor display is preserved from the current screen computed style. After PDF, all inline style and marker attributes are restored exactly. Unrelated page nodes are untouched; Include/Exclude filtering remains unchanged.\n\nDedicated regression: `project_tools/test_p1_149_iframe_print_flow.js`. Real `its.1c.ru` PDF output remains required browser evidence after a new diagnostic build and is not claimed by deterministic CI.\n'''
(root / 'P1-149_CLOSURE.md').write_text(closure, encoding='utf-8')

# Registry/docs updates.
priorities_path = root / 'project_docs' / 'PRIORITIES_P0_P1_P2.md'
priorities = priorities_path.read_text(encoding='utf-8')
row = "| P1-149 | P1 | REGRESSION | Выбранные same-origin/cross-origin iframe chains перед PDF временно нормализуются в normal print flow: frame/ancestor chain получают bounded height/visible overflow, `position:static`, снятие clip/contain/transform/content-visibility; исходные inline styles и служебные frame-attrs восстанавливаются точно после PDF. Это закрывает реальный repro `its.1c.ru`, где единственный Include был `body` внутри iframe, но top document не увеличивал print height и Chromium сохранял только header. |\n"
if 'P1-149 |' in priorities:
    raise RuntimeError('P1-149 already exists')
anchor = "| P1-148 | P1 | REGRESSION | Новые Journal entries сохраняют точный bounded `operationId` исходной операции через durable local/Yandex recovery checkpoints. Карточка Journal позволяет `Показать лог` и `Копировать лог` через bounded read-only `WEBCLIP_OPERATION_LOG_GET`; ответ дополнительно сверяется по exact operationId. Старые записи без operationId не связываются эвристически по имени/времени. |\n"
priorities = replace_once(priorities, anchor, anchor + row, 'priorities P1-149')
priorities_path.write_text(priorities, encoding='utf-8')

readme_path = root / 'README.md'
readme = readme_path.read_text(encoding='utf-8')
readme += '''\n### Audit WIP — P1-149\n\n- Real `its.1c.ru` diagnostic evidence localized the empty-PDF regression to an Include inside a same-origin iframe whose frame shell did not participate in top-level print flow.\n- Selected iframe/ancestor chains are now normalized only for the PDF window and fully rolled back afterward.\n- Dedicated deterministic regression: `project_tools/test_p1_149_iframe_print_flow.js`.\n'''
readme_path.write_text(readme, encoding='utf-8')

qa_path = root / 'QA_STATUS_0_9_9.md'
qa = qa_path.read_text(encoding='utf-8')
qa += '''\n## 2026-08-25 — P1-149\n\n- REGRESSION: selected iframe print-flow normalization implemented after real `its.1c.ru` evidence showed iframe-only Include with a valid-but-header-only PDF.\n- Deterministic regression verifies frame/ancestor normal-flow overrides and exact rollback of inline style + frame markers.\n- Real unmanaged Chrome `its.1c.ru` rerun remains required before release QA can claim closure in-browser.\n'''
qa_path.write_text(qa, encoding='utf-8')

print('P1-149 patch applied')
