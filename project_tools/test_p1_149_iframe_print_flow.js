const fs = require('fs');
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
