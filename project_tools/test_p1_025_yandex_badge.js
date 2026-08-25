'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const js = fs.readFileSync(path.join(ROOT, 'journal.js'), 'utf8');
const css = fs.readFileSync(path.join(ROOT, 'journal.css'), 'utf8');

function extractFunction(name) {
  const start = js.indexOf(`function ${name}`);
  assert(start >= 0, `${name} missing`);
  const brace = js.indexOf('{', start);
  let depth = 0;
  for (let i = brace; i < js.length; i++) {
    if (js[i] === '{') depth++;
    else if (js[i] === '}') {
      depth--;
      if (depth === 0) return js.slice(start, i + 1);
    }
  }
  throw new Error(`unterminated ${name}`);
}

const context = { URL };
vm.createContext(context);
vm.runInContext(`${extractFunction('isOpenableYandexPublicUrl')}; this.fn=isOpenableYandexPublicUrl;`, context);
const fn = context.fn;
assert.strictEqual(fn('https://disk.yandex.ru/d/abc'), true);
assert.strictEqual(fn('https://foo.disk.yandex.ru/d/abc'), true);
assert.strictEqual(fn('https://yadi.sk/d/abc'), true);
assert.strictEqual(fn('http://disk.yandex.ru/d/abc'), false);
assert.strictEqual(fn('https://evil.example/disk.yandex.ru/d/abc'), false);
assert.strictEqual(fn('javascript:alert(1)'), false);
assert.strictEqual(fn(''), false);

assert(js.includes("document.createElement(isYandexDestination ? 'button' : 'span')"), 'Yandex destination badge must be a button');
assert(js.includes("destinationBadge.disabled = !canOpenYandexFile"), 'unopenable Yandex badge must be disabled');
assert(js.includes("type: 'WEBCLIP_OPEN_JOURNAL_SAVED_FILE', id: entry.id"), 'badge must use protected service-worker RPC');
assert(!js.includes("publicLink.className = 'yandex-file-link'"), 'legacy standalone Yandex link must be removed');
assert(css.includes('.badge-action'), 'badge action styling missing');
assert(!css.includes('.yandex-file-link'), 'legacy standalone Yandex link CSS must be removed');
console.log(JSON.stringify({ok:true, p1:'P1-025', yandexBadgeAction:true, disabledWithoutValidUrl:true, standaloneLinkRemoved:true}));
