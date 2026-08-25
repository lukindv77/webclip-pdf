const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');

function section(text, startMarker, endMarker) {
  const start = text.indexOf(startMarker);
  const end = text.indexOf(endMarker, start + startMarker.length);
  if (start < 0 || end < 0) throw new Error(`Markers not found: ${startMarker} -> ${endMarker}`);
  return text.slice(start, end);
}

function normalizeDiskPath(value) {
  let p = String(value || '').replace(/^disk:/, '');
  if (!p.startsWith('/')) p = `/${p}`;
  return p;
}

async function testStreamingProjection() {
  const all = [];
  for (let i = 0; i < 597; i += 1) all.push({ name: `file-${i}`, path: `disk:/file-${i}`, type: 'file' });
  all.splice(50, 0, { name: 'A', path: 'disk:/A', type: 'dir' });
  all.splice(250, 0, { name: 'B', path: 'disk:/B', type: 'dir' });
  all.push({ name: 'C', path: 'disk:/C', type: 'dir' });

  const yandexApi = async (_endpoint, options) => {
    const offset = Number(options.query.offset);
    const limit = Number(options.query.limit);
    return {
      path: 'disk:/',
      _embedded: {
        total: all.length,
        items: all.slice(offset, offset + limit)
      }
    };
  };

  const context = vm.createContext({
    console,
    Promise,
    Error,
    Number,
    Math,
    String,
    Date,
    yandexApi,
    normalizeDiskPath
  });
  const code = section(source, 'async function listYandexDirectoryItems', 'async function listYandexResourceItems');
  vm.runInContext(`${code}\nthis.listForTest = listYandexDirectoryItems;`, context);

  const result = await context.listForTest('/', {
    maxItems: 50000,
    maxCollectedItems: 10,
    collectItem: (item) => item.type === 'dir' ? { name: item.name } : null
  });
  assert.strictEqual(result.scannedItems, all.length);
  assert.strictEqual(result.items.length, 3, 'only matching directory projections should be retained');
  assert.deepStrictEqual(Array.from(result.items, (item) => item.name), ['A', 'B', 'C']);
}

async function testCollectedCap() {
  const yandexApi = async () => ({
    _embedded: {
      total: 3,
      items: [
        { name: '1', type: 'dir' },
        { name: '2', type: 'dir' },
        { name: '3', type: 'dir' }
      ]
    }
  });
  const context = vm.createContext({ console, Promise, Error, Number, Math, String, Date, yandexApi, normalizeDiskPath });
  const code = section(source, 'async function listYandexDirectoryItems', 'async function listYandexResourceItems');
  vm.runInContext(`${code}\nthis.listForTest = listYandexDirectoryItems;`, context);
  await assert.rejects(
    context.listForTest('/', { maxItems: 50000, maxCollectedItems: 2, collectItem: (item) => item }),
    /Безопасный предел результата: 2/
  );
}

(async () => {
  await testStreamingProjection();
  await testCollectedCap();
  assert(source.includes("itemFields: ['name', 'path', 'type']"), 'folder listing must not request unused size/modified/mime metadata');
  assert(source.includes("itemFields: ['name', 'path', 'type', 'size', 'modified']"), 'backup listing should request only metadata used by the backup UI');
  console.log('Yandex listing memory/field projection tests OK');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
