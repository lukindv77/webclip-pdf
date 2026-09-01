const fs = require('fs');
const path = require('path');
const assert = require('assert');

const root = path.resolve(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
const sw = fs.readFileSync(path.join(root, 'service-worker.js'), 'utf8');
const optionsJs = fs.readFileSync(path.join(root, 'options.js'), 'utf8');
const optionsHtml = fs.readFileSync(path.join(root, 'options.html'), 'utf8');

assert(!manifest.permissions.includes('unlimitedStorage'), 'P1-043 must not expand permissions with unlimitedStorage');
assert(sw.includes("case 'WEBCLIP_STORAGE_HEALTH'"), 'storage health must be exposed to trusted extension UI');
assert(sw.includes("if (senderKind !== 'extension') throw new Error('Состояние хранилища доступно только страницам расширения.')"), 'storage health route must keep the runtime trust boundary');
assert(sw.includes('navigator.storage.persisted()'), 'health report must expose current persistence status when supported');
assert(optionsJs.includes('navigator.storage.persist()'), 'persistence must be an explicit user action from an extension page');
assert(optionsHtml.includes('id="storageHealthStatus"') && optionsHtml.includes('id="requestStoragePersistence"'), 'storage health/persistence controls must exist in options UI');
assert.strictEqual(manifest.version, '0.9.8', 'research checkpoint must not bump manifest version');

console.log('Storage health/persist policy tests OK');
