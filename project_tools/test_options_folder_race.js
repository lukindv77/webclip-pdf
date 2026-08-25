const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'options.js'), 'utf8');

function extractFunction(text, name, nextName) {
  const start = text.indexOf(`async function ${name}`);
  const end = text.indexOf(`function ${nextName}`, start);
  if (start < 0 || end < 0) throw new Error(`Function not found: ${name}`);
  return text.slice(start, end);
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

function makeFolderList() {
  return {
    innerHTML: '',
    firstElementChild: null,
    children: [],
    replaceChildren() { this.children = []; this.innerHTML = ''; },
    appendChild(node) { this.children.push(node); }
  };
}

(async () => {
  assert(source.includes('let folderBrowseGeneration = 0;'), 'folder picker must track request generation');
  assert(source.includes('if (generation !== folderBrowseGeneration) return;'), 'stale folder responses must be ignored');

  const pending = new Map();
  const folderList = makeFolderList();
  const currentPathEl = { textContent: '' };
  const messages = [];
  const context = vm.createContext({
    console,
    Promise,
    Error,
    String,
    folderList,
    currentPathEl,
    currentBrowsePath: '/',
    folderBrowseGeneration: 0,
    chrome: {
      runtime: {
        sendMessage(message) {
          const item = deferred();
          pending.set(String(message.path), item);
          return item.promise;
        }
      }
    },
    requireOk(response) {
      if (!response?.ok) throw new Error(response?.error || 'failed');
      return response;
    },
    showMessage(message, kind) { messages.push({ message, kind }); },
    sendReadOnlyRuntimeMessage(message) { return context.chrome.runtime.sendMessage(message); },
    document: {
      createElement() {
        return {
          type: '', className: '', textContent: '',
          addEventListener() {}
        };
      }
    }
  });

  const code = extractFunction(source, 'loadFolders', 'joinPath');
  vm.runInContext(`${code}\nthis.loadFoldersForTest = loadFolders;`, context);

  const first = context.loadFoldersForTest('/slow');
  const second = context.loadFoldersForTest('/newest');
  pending.get('/newest').resolve({ ok: true, path: '/newest', folders: [{ name: 'B', path: '/newest/B' }] });
  await second;
  assert.strictEqual(context.currentBrowsePath, '/newest');
  assert.strictEqual(currentPathEl.textContent, '/newest');
  assert.strictEqual(folderList.children.length, 1);
  assert.strictEqual(folderList.children[0].textContent, '📁 B');

  pending.get('/slow').resolve({ ok: true, path: '/slow', folders: [{ name: 'A', path: '/slow/A' }] });
  await first;
  assert.strictEqual(context.currentBrowsePath, '/newest', 'late old response must not roll the picker back');
  assert.strictEqual(currentPathEl.textContent, '/newest');
  assert.strictEqual(folderList.children[0].textContent, '📁 B');

  const staleFailure = context.loadFoldersForTest('/stale-failure');
  const newest = context.loadFoldersForTest('/latest-after-failure');
  pending.get('/latest-after-failure').resolve({ ok: true, path: '/latest-after-failure', folders: [] });
  await newest;
  pending.get('/stale-failure').reject(new Error('old network error'));
  await staleFailure;
  assert.strictEqual(context.currentBrowsePath, '/latest-after-failure');
  assert.strictEqual(messages.length, 0, 'stale errors must not overwrite the latest folder UI with an obsolete error');

  console.log('Options folder navigation stale-response race tests OK');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
